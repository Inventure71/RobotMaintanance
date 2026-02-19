from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..normalization import normalize_status


class AutoMonitorWorkerMixin:
    def _start_auto_monitor(self) -> None:
        if self._auto_monitor_thread is not None:
            return
        self._auto_monitor_stop.clear()
        self._auto_monitor_thread = threading.Thread(target=self._auto_monitor_loop, daemon=True)
        self._auto_monitor_thread.start()

    def _stop_auto_monitor(self) -> None:
        self._auto_monitor_stop.set()
        thread = self._auto_monitor_thread
        if thread is None:
            return
        thread.join(timeout=2.0)
        self._auto_monitor_thread = None

    def _auto_monitor_loop(self) -> None:
        while not self._auto_monitor_stop.is_set():
            started = time.time()
            try:
                self._run_auto_monitor_tick()
            except Exception:
                # Monitor is best-effort; do not kill the background thread on one robot failure.
                pass
            elapsed = time.time() - started
            wait_sec = max(0.0, self._auto_monitor_interval_sec - elapsed)
            self._auto_monitor_stop.wait(wait_sec)

    def _run_auto_monitor_for_robot(self, robot_id: str, now: float) -> None:
        if self._auto_monitor_stop.is_set():
            return
        if self._is_robot_busy(robot_id):
            return
        if self._is_manual_activity_recent(robot_id, now):
            return

        with self._lock:
            next_online = float(self._online_next_check_at.get(robot_id, 0.0))
            next_battery = float(self._battery_next_check_at.get(robot_id, 0.0))
            next_topics = float(self._topics_next_check_at.get(robot_id, 0.0))
            online_interval_sec = float(self._online_interval_sec)
            battery_interval_sec = float(self._battery_interval_sec)
            topics_interval_sec = float(self._topics_interval_sec)

        runtime_tests = self.get_runtime_tests(robot_id)
        runtime_activity = self.get_runtime_activity(robot_id)
        online_payload = runtime_tests.get("online", {})
        is_online = normalize_status(online_payload.get("status")) == "ok"
        if bool(runtime_activity.get("testing")):
            with self._lock:
                self._last_auto_monitor_online_state[robot_id] = is_online
            return

        if now >= next_online:
            probe_started = time.time()
            self._set_runtime_activity(
                robot_id,
                searching=True,
                phase=self.ACTIVITY_PHASE_ONLINE_PROBE,
            )
            try:
                online_probe = self.check_online(
                    robot_id=robot_id,
                    timeout_sec=self.AUTO_MONITOR_ONLINE_TIMEOUT_SEC,
                    force_refresh=True,
                )
            finally:
                # Keep searching state visible long enough for the 1s UI poll loop.
                elapsed = time.time() - probe_started
                min_visible_sec = max(0.0, float(self.AUTO_ACTIVITY_MIN_VISIBLE_SEC))
                if elapsed < min_visible_sec:
                    time.sleep(min_visible_sec - elapsed)
                self._set_runtime_activity(robot_id, searching=False)
            online_update = self.apply_online_probe_to_runtime(
                robot_id=robot_id,
                probe=online_probe,
                source="auto-monitor",
            )
            with self._lock:
                self._online_next_check_at[robot_id] = now + online_interval_sec
            is_online = bool(online_update.get("isOnline"))
            if is_online and normalize_status(online_update.get("previousOnlineStatus")) != "ok":
                with self._lock:
                    self._battery_next_check_at[robot_id] = 0.0
                    self._topics_next_check_at[robot_id] = 0.0
                self._run_auto_recovery_tests(robot_id)

        if not is_online:
            self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
            with self._lock:
                self._last_auto_monitor_online_state[robot_id] = False
            return

        if now >= next_battery:
            self._refresh_battery_state(robot_id)
            with self._lock:
                self._battery_next_check_at[robot_id] = now + battery_interval_sec

        if self._topics_monitor_enabled() and now >= next_topics:
            self._refresh_topics_state(robot_id)
            with self._lock:
                self._topics_next_check_at[robot_id] = now + topics_interval_sec

        latest_runtime = self.get_runtime_tests(robot_id)
        latest_online = normalize_status((latest_runtime.get("online") or {}).get("status")) == "ok"
        with self._lock:
            self._last_auto_monitor_online_state[robot_id] = latest_online

    def _run_auto_monitor_tick(self) -> None:
        now = time.time()
        robot_ids = list(self.robots_by_id.keys())
        if not robot_ids:
            return

        with self._lock:
            configured_parallelism = int(self._monitor_parallelism)
        worker_count = max(1, min(configured_parallelism, len(robot_ids)))

        if worker_count == 1:
            for robot_id in robot_ids:
                if self._auto_monitor_stop.is_set():
                    return
                try:
                    self._run_auto_monitor_for_robot(robot_id, now)
                except Exception:
                    continue
            return

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = [executor.submit(self._run_auto_monitor_for_robot, robot_id, now) for robot_id in robot_ids]
            for future in as_completed(futures):
                if self._auto_monitor_stop.is_set():
                    return
                try:
                    future.result()
                except Exception:
                    continue
