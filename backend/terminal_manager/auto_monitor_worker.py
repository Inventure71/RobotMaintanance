from __future__ import annotations

import logging
import threading
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

from ..normalization import normalize_status, normalize_text

LOGGER = logging.getLogger(__name__)


class AutoMonitorWorkerMixin:
    def _debounced_online_probe(self, robot_id: str, probe: dict[str, object]) -> dict[str, object] | None:
        status = normalize_status(probe.get("status"))
        is_online_now = bool(self.get_runtime_probe_state(robot_id).get("isOnline"))
        offline_threshold = max(1, int(getattr(self, "ONLINE_FAILURES_TO_MARK_OFFLINE", 1)))
        online_threshold = max(1, int(getattr(self, "ONLINE_SUCCESSES_TO_MARK_ONLINE", 1)))

        with self._lock:
            fail_streak = int(self._online_failure_streak_by_robot.get(robot_id, 0))
            success_streak = int(self._online_success_streak_by_robot.get(robot_id, 0))

            if status == "ok":
                fail_streak = 0
                success_streak += 1
                self._online_failure_streak_by_robot[robot_id] = fail_streak
                self._online_success_streak_by_robot[robot_id] = success_streak

                if is_online_now:
                    return dict(probe)
                if success_streak >= online_threshold:
                    self._online_success_streak_by_robot[robot_id] = 0
                    return dict(probe)
                return None

            success_streak = 0
            fail_streak += 1
            self._online_failure_streak_by_robot[robot_id] = fail_streak
            self._online_success_streak_by_robot[robot_id] = success_streak

            if not is_online_now:
                return dict(probe)
            if fail_streak >= offline_threshold:
                self._online_failure_streak_by_robot[robot_id] = 0
                return dict(probe)
            return None

    def _shutdown_auto_monitor_executor(self) -> None:
        executor = getattr(self, "_auto_monitor_executor", None)
        self._auto_monitor_executor = None
        self._auto_monitor_executor_workers = 0
        if executor is None:
            return
        try:
            executor.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass

    def _ensure_auto_monitor_executor(self, worker_count: int) -> ThreadPoolExecutor:
        with self._lock:
            existing = getattr(self, "_auto_monitor_executor", None)
            existing_workers = int(getattr(self, "_auto_monitor_executor_workers", 0))
            if existing is not None and existing_workers == worker_count:
                return existing
            if existing is not None:
                try:
                    existing.shutdown(wait=False, cancel_futures=True)
                except Exception:
                    pass
            next_executor = ThreadPoolExecutor(
                max_workers=worker_count,
                thread_name_prefix="auto-monitor",
            )
            self._auto_monitor_executor = next_executor
            self._auto_monitor_executor_workers = worker_count
            return next_executor

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
            self._shutdown_auto_monitor_executor()
            return
        thread.join(timeout=2.0)
        self._auto_monitor_thread = None
        self._shutdown_auto_monitor_executor()

    def _auto_monitor_tick_timeout_sec(self) -> float:
        online_timeout = max(0.0, float(getattr(self, "AUTO_MONITOR_ONLINE_TIMEOUT_SEC", 3.0)))
        min_visible_sec = max(0.0, float(getattr(self, "AUTO_ACTIVITY_MIN_VISIBLE_SEC", 0.0)))
        battery_timeout = max(0.0, float(getattr(self, "AUTO_MONITOR_BATTERY_TIMEOUT_SEC", 8.0)))
        topics_timeout = max(0.0, float(getattr(self, "AUTO_MONITOR_TOPICS_TIMEOUT_SEC", 12.0)))
        topics_setup_timeout = 3.0
        timeout_buffer_sec = 1.0

        total_timeout = online_timeout + min_visible_sec + battery_timeout + timeout_buffer_sec
        if self._topics_monitor_enabled():
            total_timeout += topics_setup_timeout + topics_timeout
        return max(1.0, total_timeout)

    def _auto_monitor_loop(self) -> None:
        while not self._auto_monitor_stop.is_set():
            started = time.time()
            try:
                self._run_auto_monitor_tick()
            except Exception:
                # Monitor is best-effort; do not kill the background thread on one robot failure.
                LOGGER.exception("Auto-monitor loop failure (phase=auto_monitor_loop_tick)")
            elapsed = time.time() - started
            wait_sec = max(0.0, self._auto_monitor_interval_sec - elapsed)
            self._auto_monitor_stop.wait(wait_sec)

    def _run_auto_monitor_for_robot(self, robot_id: str, now: float) -> None:
        if self._auto_monitor_stop.is_set():
            return
        if self._has_foreground_robot_activity(robot_id):
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

        probe_state = self.get_runtime_probe_state(robot_id)
        runtime_activity = self.get_runtime_activity(robot_id)
        is_online = bool(probe_state.get("isOnline"))
        runtime_phase = normalize_text(runtime_activity.get("phase"), "")
        is_testing = bool(runtime_activity.get("testing"))
        if is_testing and runtime_phase != self.ACTIVITY_PHASE_CONNECTION_RETRY:
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
            with self._lock:
                self._online_next_check_at[robot_id] = time.time() + online_interval_sec
            debounced_probe = self._debounced_online_probe(robot_id, online_probe)
            if debounced_probe is not None:
                online_update = self.apply_online_probe_to_runtime(
                    robot_id=robot_id,
                    probe=debounced_probe,
                    source="auto-monitor",
                )
                is_online = bool(online_update.get("isOnline"))
                if is_online and normalize_status(online_update.get("previousOnlineStatus")) != "ok":
                    with self._lock:
                        self._battery_next_check_at[robot_id] = 0.0
                        self._topics_next_check_at[robot_id] = 0.0
                    self._emit_connection_event_connected(
                        robot_id,
                        connected_at=float(online_update.get("checkedAt") or time.time()),
                    )
            else:
                is_online = bool(self.get_runtime_probe_state(robot_id).get("isOnline"))

        if not is_online:
            self._emit_connection_event_disconnected(robot_id)
            self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
            self.close_session(page_session_id=self.AUTO_MONITOR_TEST_PAGE_SESSION_ID, robot_id=robot_id)
            with self._lock:
                self._last_auto_monitor_online_state[robot_id] = False
            return

        if self._has_background_test_activity(robot_id):
            with self._lock:
                self._last_auto_monitor_online_state[robot_id] = True
            return

        if now >= next_battery:
            self._refresh_battery_state(robot_id)
            with self._lock:
                self._battery_next_check_at[robot_id] = time.time() + battery_interval_sec

        if self._topics_monitor_enabled() and now >= next_topics:
            self._refresh_topics_state(robot_id)
            with self._lock:
                self._topics_next_check_at[robot_id] = time.time() + topics_interval_sec

        latest_online = bool(self.get_runtime_probe_state(robot_id).get("isOnline"))
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
            self._shutdown_auto_monitor_executor()
            for robot_id in robot_ids:
                if self._auto_monitor_stop.is_set():
                    return
                try:
                    self._run_auto_monitor_for_robot(robot_id, now)
                except Exception:
                    LOGGER.exception(
                        "Auto-monitor robot failure (phase=run_auto_monitor_tick_sequential, robot_id=%s)",
                        robot_id,
                    )
                    continue
            return

        executor = self._ensure_auto_monitor_executor(worker_count)
        try:
            try:
                futures_by_robot = {
                    executor.submit(self._run_auto_monitor_for_robot, robot_id, now): robot_id
                    for robot_id in robot_ids
                }
            except Exception:
                LOGGER.exception(
                    "Auto-monitor executor submit failure (phase=run_auto_monitor_tick_parallel_submit)"
                )
                self._shutdown_auto_monitor_executor()
                return
            pending = set(futures_by_robot.keys())
            tick_timeout_sec = self._auto_monitor_tick_timeout_sec()
            deadline = time.time() + tick_timeout_sec

            while pending:
                if self._auto_monitor_stop.is_set():
                    return
                remaining = deadline - time.time()
                if remaining <= 0:
                    break
                done, pending = wait(
                    pending,
                    timeout=min(0.25, remaining),
                    return_when=FIRST_COMPLETED,
                )
                for future in done:
                    robot_id = futures_by_robot.get(future, "")
                    try:
                        future.result()
                    except Exception:
                        LOGGER.exception(
                            "Auto-monitor robot failure (phase=run_auto_monitor_tick_parallel, robot_id=%s)",
                            robot_id or "<unknown>",
                        )

            if pending:
                timed_out_robot_ids = sorted(
                    robot_id
                    for future, robot_id in futures_by_robot.items()
                    if future in pending
                )
                LOGGER.warning(
                    "Auto-monitor tick timeout (phase=run_auto_monitor_tick_parallel, timeout_sec=%.2f, "
                    "timed_out_robot_ids=%s)",
                    tick_timeout_sec,
                    ",".join(timed_out_robot_ids) if timed_out_robot_ids else "<unknown>",
                )
                for future in pending:
                    future.cancel()
                self._shutdown_auto_monitor_executor()
        finally:
            if not bool(getattr(self, "_auto_monitor_enabled", False)):
                self._shutdown_auto_monitor_executor()
