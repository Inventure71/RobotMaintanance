from __future__ import annotations

import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from fastapi import HTTPException

from .models import ShellHandle, StepResult
from .normalization import normalize_status, normalize_text, normalize_type_key, strip_ansi
from .ssh_client import InteractiveShell
from .test_executor import TestExecutor


class TerminalManager:
    MONITOR_MODE_ONLINE_BATTERY = "online_battery"
    MONITOR_MODE_ONLINE_BATTERY_TOPICS = "online_battery_topics"
    MONITOR_MODE_VALUES = {MONITOR_MODE_ONLINE_BATTERY, MONITOR_MODE_ONLINE_BATTERY_TOPICS}

    TERMINAL_CONNECT_TIMEOUT_SEC = 10.0
    ONLINE_CACHE_TTL_SEC = 5.0
    ONLINE_DEFAULT_TIMEOUT_SEC = 3.0
    ONLINE_MIN_TIMEOUT_SEC = 0.5
    ONLINE_MAX_TIMEOUT_SEC = 10.0
    AUTO_MONITOR_INTERVAL_SEC = 1.0
    AUTO_MONITOR_ONLINE_TIMEOUT_SEC = 1.0
    AUTO_MONITOR_BATTERY_TIMEOUT_SEC = 8.0
    AUTO_MONITOR_TOPICS_TIMEOUT_SEC = 12.0
    AUTO_MONITOR_TOPICS_SETUP_COMMAND = (
        "source /opt/ros/noetic/setup.bash >/dev/null 2>&1 || true; "
        "source ~/ws/devel/setup.bash >/dev/null 2>&1 || true"
    )
    AUTO_MONITOR_TOPICS_COMMAND = "timeout 12s rostopic list"
    AUTO_MONITOR_PAGE_SESSION_ID = "__auto-monitor__"
    AUTO_MONITOR_BATTERY_COMMAND = (
        "source /opt/ros/noetic/setup.bash >/dev/null 2>&1 || true; "
        "source ~/ws/devel/setup.bash >/dev/null 2>&1 || true; "
        "timeout 6s rostopic echo -n 1 /battery"
    )
    TOPICS_INTERVAL_DEFAULT_SEC = 30.0
    TOPICS_INTERVAL_MIN_SEC = 5.0
    TOPICS_INTERVAL_MAX_SEC = 300.0
    ONLINE_INTERVAL_DEFAULT_SEC = 2.0
    ONLINE_INTERVAL_MIN_SEC = 0.5
    ONLINE_INTERVAL_MAX_SEC = 60.0
    BATTERY_INTERVAL_DEFAULT_SEC = 2.0
    BATTERY_INTERVAL_MIN_SEC = 0.5
    BATTERY_INTERVAL_MAX_SEC = 60.0
    MONITOR_PARALLELISM_DEFAULT = 8
    MONITOR_PARALLELISM_MIN = 1
    MONITOR_PARALLELISM_MAX = 100
    MANUAL_ACTIVITY_DEFER_SEC = 5.0
    MANUAL_AUTO_FIX_DEFER_SEC = 90.0
    COMMAND_DEFAULT_TIMEOUT_SEC = 20.0
    COMMAND_MIN_TIMEOUT_SEC = 0.5
    COMMAND_MAX_TIMEOUT_SEC = 3600.0
    ACTIVITY_PHASE_ONLINE_PROBE = "online_probe"
    ACTIVITY_PHASE_FULL_TEST_AFTER_RECOVERY = "full_test_after_recovery"
    ACTIVITY_PHASE_POST_FLASH_RETEST = "post_flash_retest"
    _ACTIVITY_UNSET = object()
    RUNTIME_SOURCE_PRIORITY = {
        "cache": 0,
        "auto-monitor": 1,
        "auto-monitor-topics": 2,
        "manual": 3,
        "live": 3,
    }

    LOW_BATTERY_WARNING_PERCENT = 30.0
    LOW_BATTERY_ERROR_PERCENT = 15.0
    BATTERY_VOLTAGE_EMPTY = 10.8
    BATTERY_VOLTAGE_FULL = 12.6
    FLOAT_PATTERN = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
    BATTERY_FIELD_PATTERN = re.compile(r"^([A-Za-z_][\w./-]*)\s*:\s*(.+)$")

    def __init__(
        self,
        robots_by_id: dict[str, dict[str, Any]],
        robot_types_by_id: dict[str, dict[str, Any]],
        idle_timeout_sec: int = 15 * 60,
        auto_monitor: bool = False,
        auto_monitor_interval_sec: float = AUTO_MONITOR_INTERVAL_SEC,
    ):
        self.robots_by_id = robots_by_id
        self.robot_types_by_id = robot_types_by_id
        self.idle_timeout_sec = idle_timeout_sec
        self._handles: dict[tuple[str, str], ShellHandle] = {}
        self._online_cache: dict[str, dict[str, Any]] = {}
        self._runtime_tests: dict[str, dict[str, dict[str, Any]]] = {}
        self._runtime_activity: dict[str, dict[str, Any]] = {}
        self._monitor_mode = self.MONITOR_MODE_ONLINE_BATTERY
        self._topics_interval_sec = self.TOPICS_INTERVAL_DEFAULT_SEC
        self._online_interval_sec = self.ONLINE_INTERVAL_DEFAULT_SEC
        self._battery_interval_sec = self.BATTERY_INTERVAL_DEFAULT_SEC
        self._monitor_parallelism = self.MONITOR_PARALLELISM_DEFAULT
        self._online_next_check_at: dict[str, float] = {}
        self._battery_next_check_at: dict[str, float] = {}
        self._topics_next_check_at: dict[str, float] = {}
        self._manual_activity_by_robot: dict[str, float] = {}
        self._manual_defer_until_by_robot: dict[str, float] = {}
        self._active_test_runs: set[tuple[str, str]] = set()
        self._active_search_runs: set[str] = set()
        self._active_fix_runs: set[str] = set()
        self._last_auto_monitor_online_state: dict[str, bool] = {}
        self._auto_recovery_test_inflight: set[str] = set()
        self._lock = threading.Lock()
        self._auto_monitor_enabled = bool(auto_monitor)
        self._auto_monitor_interval_sec = max(0.2, float(auto_monitor_interval_sec))
        self._auto_monitor_stop = threading.Event()
        self._auto_monitor_thread: threading.Thread | None = None
        self._executor = TestExecutor(
            robot_types_by_id=robot_types_by_id,
            resolve_robot_type=self._resolve_robot_type,
            resolve_credentials=self._resolve_credentials,
            get_or_connect=self.get_or_connect,
            close_session=self.close_session,
            check_online=self.check_online,
        )
        if self._auto_monitor_enabled:
            self._start_auto_monitor()

    def _resolve_credentials(self, robot_id: str) -> tuple[str, str, str, int]:
        robot = self.robots_by_id.get(robot_id)
        if not robot:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {robot_id}")

        host = str(robot.get("ip") or "").strip()
        ssh_cfg = robot.get("ssh") if isinstance(robot.get("ssh"), dict) else {}
        username = str(ssh_cfg.get("username") or "").strip()
        password = str(ssh_cfg.get("password") or "").strip()
        port = int(ssh_cfg.get("port") or 22)

        if not host:
            raise HTTPException(status_code=400, detail=f"Robot {robot_id} missing 'ip' in config")
        if not username or not password:
            raise HTTPException(
                status_code=400,
                detail=f"Robot {robot_id} missing SSH username/password in config",
            )

        return host, username, password, port

    def _close_handle(self, key: tuple[str, str]) -> None:
        handle = self._handles.pop(key, None)
        if not handle:
            return
        try:
            handle.shell.close()
        except RuntimeError:
            pass

    def _evict_idle_locked(self) -> None:
        now = time.time()
        for key, handle in list(self._handles.items()):
            if now - handle.last_used > self.idle_timeout_sec:
                self._close_handle(key)

    def _resolve_robot_type(self, robot_id: str) -> dict[str, Any]:
        robot = self.robots_by_id.get(robot_id)
        if not robot:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {robot_id}")

        type_key = normalize_type_key(robot.get("type"))
        if not type_key:
            raise HTTPException(status_code=400, detail=f"Robot {robot_id} has no type configured")

        robot_type = self.robot_types_by_id.get(type_key)
        if not robot_type:
            raise HTTPException(status_code=404, detail=f"No robot type config found: {type_key}")

        return robot_type

    def _mark_manual_activity(
        self,
        robot_id: str,
        page_session_id: str | None = None,
        source: str | None = None,
    ) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_session = normalize_text(page_session_id, "")
        normalized_source = normalize_text(source, "").lower()
        if not normalized_robot_id:
            return
        if normalized_session == self.AUTO_MONITOR_PAGE_SESSION_ID:
            return
        now = time.time()
        with self._lock:
            self._manual_activity_by_robot[normalized_robot_id] = now
            if normalized_source == "auto-fix":
                self._manual_defer_until_by_robot[normalized_robot_id] = max(
                    float(self._manual_defer_until_by_robot.get(normalized_robot_id, 0.0)),
                    now + self.MANUAL_AUTO_FIX_DEFER_SEC,
                )

    def _runtime_source_rank(self, source: str) -> int:
        normalized = normalize_text(source, "").lower()
        return self.RUNTIME_SOURCE_PRIORITY.get(normalized, 0)

    def _checked_at_value(self, payload: dict[str, Any]) -> float:
        try:
            return float(payload.get("checkedAt") or 0.0)
        except Exception:
            return 0.0

    def _should_apply_runtime_update(self, previous: dict[str, Any], incoming: dict[str, Any]) -> bool:
        previous_checked_at = self._checked_at_value(previous)
        incoming_checked_at = self._checked_at_value(incoming)
        if incoming_checked_at > previous_checked_at:
            return True
        if incoming_checked_at < previous_checked_at:
            return False

        previous_rank = self._runtime_source_rank(normalize_text(previous.get("source"), ""))
        incoming_rank = self._runtime_source_rank(normalize_text(incoming.get("source"), ""))
        if incoming_rank > previous_rank:
            return True
        if incoming_rank < previous_rank:
            return False
        return True

    def _is_manual_activity_recent(self, robot_id: str, now: float) -> bool:
        with self._lock:
            last_activity_at = float(self._manual_activity_by_robot.get(robot_id, 0.0))
            defer_until = float(self._manual_defer_until_by_robot.get(robot_id, 0.0))
        return (now - last_activity_at) <= self.MANUAL_ACTIVITY_DEFER_SEC or now <= defer_until

    def _is_robot_busy(self, robot_id: str) -> bool:
        with self._lock:
            if robot_id in self._active_search_runs:
                return True
            if robot_id in self._active_fix_runs:
                return True
            return any(active_robot_id == robot_id for active_robot_id, _session in self._active_test_runs)

    def start_search_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        self._mark_manual_activity(robot_id=normalized_robot_id, source="manual-search")
        with self._lock:
            self._active_search_runs.add(normalized_robot_id)

    def finish_search_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            self._active_search_runs.discard(normalized_robot_id)

    def start_fix_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        self._mark_manual_activity(robot_id=normalized_robot_id, source="auto-fix")
        with self._lock:
            self._active_fix_runs.add(normalized_robot_id)

    def finish_fix_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            self._active_fix_runs.discard(normalized_robot_id)

    def start_test_run(self, robot_id: str, page_session_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_page_session_id = normalize_text(page_session_id, "")
        if not normalized_robot_id or not normalized_page_session_id:
            return False
        with self._lock:
            key = (normalized_robot_id, normalized_page_session_id)
            if key in self._active_test_runs:
                return False
            self._active_test_runs.add(key)
            self._manual_activity_by_robot[normalized_robot_id] = time.time()
            return True

    def finish_test_run(self, robot_id: str, page_session_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_page_session_id = normalize_text(page_session_id, "")
        if not normalized_robot_id or not normalized_page_session_id:
            return
        with self._lock:
            self._active_test_runs.discard((normalized_robot_id, normalized_page_session_id))

    def get_or_connect(self, page_session_id: str, robot_id: str) -> InteractiveShell:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        key = (page_session_id, robot_id)
        with self._lock:
            self._evict_idle_locked()
            existing = self._handles.get(key)
            if existing:
                existing.last_used = time.time()
                return existing.shell

        host, username, password, port = self._resolve_credentials(robot_id)

        shell = InteractiveShell(
            host=host,
            username=username,
            password=password,
            port=port,
            connect_timeout=self.TERMINAL_CONNECT_TIMEOUT_SEC,
            prompt_regex=r"[$#] ",
        )
        try:
            shell.connect()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"SSH connect failed for {robot_id} ({host}:{port}): {exc}",
            ) from exc

        with self._lock:
            self._handles[key] = ShellHandle(shell=shell, last_used=time.time())
        return shell

    def run_command(
        self,
        page_session_id: str,
        robot_id: str,
        command: str,
        timeout_sec: float | None = None,
        source: str | None = None,
    ) -> str:
        self._mark_manual_activity(
            robot_id=robot_id,
            page_session_id=page_session_id,
            source=source,
        )
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        timeout = timeout_sec if timeout_sec is not None else self.COMMAND_DEFAULT_TIMEOUT_SEC
        timeout = self._clamp_interval(
            float(timeout),
            self.COMMAND_MIN_TIMEOUT_SEC,
            self.COMMAND_MAX_TIMEOUT_SEC,
        )
        try:
            output = shell.run_command(command, timeout=timeout)
        except Exception as exc:
            self.close_session(page_session_id=page_session_id, robot_id=robot_id)
            raise HTTPException(status_code=500, detail=f"SSH command failed: {exc}") from exc

        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()

        return output

    def send_input(self, page_session_id: str, robot_id: str, text: str) -> None:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        shell.send(text)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()

    def read_output(self, page_session_id: str, robot_id: str, max_chunks: int = 100) -> str:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        output = shell.read(max_chunks=max_chunks)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()
        return output

    def resize_terminal(self, page_session_id: str, robot_id: str, width: int, height: int) -> None:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        shell.resize_pty(width=width, height=height)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()

    def close_session(self, page_session_id: str, robot_id: str) -> None:
        with self._lock:
            self._close_handle((page_session_id, robot_id))

    def close_all(self) -> None:
        self._stop_auto_monitor()
        with self._lock:
            for key in list(self._handles.keys()):
                self._close_handle(key)

    def _clamp_interval(self, value: float, min_value: float, max_value: float) -> float:
        if value < min_value:
            return min_value
        if value > max_value:
            return max_value
        return value

    def get_monitor_config(self) -> dict[str, Any]:
        with self._lock:
            return {
                "mode": self._monitor_mode,
                "topicsIntervalSec": float(self._topics_interval_sec),
                "onlineIntervalSec": float(self._online_interval_sec),
                "batteryIntervalSec": float(self._battery_interval_sec),
                "parallelism": int(self._monitor_parallelism),
            }

    def update_monitor_config(
        self,
        *,
        mode: str | None = None,
        topics_interval_sec: float | None = None,
        online_interval_sec: float | None = None,
        battery_interval_sec: float | None = None,
        parallelism: int | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            if mode is not None:
                normalized_mode = normalize_text(mode, "")
                if normalized_mode not in self.MONITOR_MODE_VALUES:
                    raise HTTPException(status_code=400, detail=f"Unsupported monitor mode: {mode}")
                self._monitor_mode = normalized_mode

            if topics_interval_sec is not None:
                self._topics_interval_sec = self._clamp_interval(
                    float(topics_interval_sec),
                    self.TOPICS_INTERVAL_MIN_SEC,
                    self.TOPICS_INTERVAL_MAX_SEC,
                )
            if online_interval_sec is not None:
                self._online_interval_sec = self._clamp_interval(
                    float(online_interval_sec),
                    self.ONLINE_INTERVAL_MIN_SEC,
                    self.ONLINE_INTERVAL_MAX_SEC,
                )
            if battery_interval_sec is not None:
                self._battery_interval_sec = self._clamp_interval(
                    float(battery_interval_sec),
                    self.BATTERY_INTERVAL_MIN_SEC,
                    self.BATTERY_INTERVAL_MAX_SEC,
                )
            if parallelism is not None:
                self._monitor_parallelism = int(
                    self._clamp_interval(
                        float(parallelism),
                        self.MONITOR_PARALLELISM_MIN,
                        self.MONITOR_PARALLELISM_MAX,
                    )
                )

            # Apply config changes quickly on next monitor tick.
            self._online_next_check_at.clear()
            self._battery_next_check_at.clear()
            self._topics_next_check_at.clear()
            return {
                "mode": self._monitor_mode,
                "topicsIntervalSec": float(self._topics_interval_sec),
                "onlineIntervalSec": float(self._online_interval_sec),
                "batteryIntervalSec": float(self._battery_interval_sec),
                "parallelism": int(self._monitor_parallelism),
            }

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

    def _clamp_online_timeout(self, timeout_sec: float | None) -> float:
        timeout = float(timeout_sec) if timeout_sec is not None else self.ONLINE_DEFAULT_TIMEOUT_SEC
        if timeout < self.ONLINE_MIN_TIMEOUT_SEC:
            return self.ONLINE_MIN_TIMEOUT_SEC
        if timeout > self.ONLINE_MAX_TIMEOUT_SEC:
            return self.ONLINE_MAX_TIMEOUT_SEC
        return timeout

    def check_online(
        self,
        robot_id: str,
        timeout_sec: float | None = None,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        now = time.time()
        timeout = self._clamp_online_timeout(timeout_sec)

        with self._lock:
            cached = self._online_cache.get(robot_id)
            if cached and not force_refresh and (now - float(cached.get("checkedAt", 0.0))) <= self.ONLINE_CACHE_TTL_SEC:
                cached_result = dict(cached)
                cached_result["source"] = "cache"
                return cached_result

        start_ms = int(now * 1000)
        host, username, password, port = self._resolve_credentials(robot_id)
        shell = InteractiveShell(
            host=host,
            username=username,
            password=password,
            port=port,
            connect_timeout=timeout,
            prompt_regex=r"[$#] ",
        )

        try:
            shell.connect()
            result = {
                "status": "ok",
                "value": "reachable",
                "details": f"SSH connected and authenticated on {host}:{port}.",
                "ms": max(0, int(time.time() * 1000 - start_ms)),
                "checkedAt": time.time(),
                "source": "live",
            }
        except Exception as exc:
            result = {
                "status": "error",
                "value": "unreachable",
                "details": f"SSH connect failed for {robot_id} ({host}:{port}): {exc}",
                "ms": max(0, int(time.time() * 1000 - start_ms)),
                "checkedAt": time.time(),
                "source": "live",
            }
        finally:
            try:
                shell.close()
            except Exception:
                pass

        with self._lock:
            self._online_cache[robot_id] = dict(result)
        return result

    def _extract_first_float(self, text: str) -> float | None:
        match = self.FLOAT_PATTERN.search(normalize_text(text, ""))
        if not match:
            return None
        try:
            return float(match.group(0))
        except Exception:
            return None

    def _normalize_percent(self, raw_value: float | None) -> float | None:
        if raw_value is None:
            return None
        value = float(raw_value)
        if value <= 1.0:
            value *= 100.0
        return max(0.0, min(100.0, value))

    def _estimate_percentage_from_voltage(self, voltage_value: float | None) -> float | None:
        if voltage_value is None:
            return None
        empty = self.BATTERY_VOLTAGE_EMPTY
        full = self.BATTERY_VOLTAGE_FULL
        if full <= empty:
            return None
        ratio = (float(voltage_value) - empty) / (full - empty)
        return max(0.0, min(100.0, ratio * 100.0))

    def _online_test_from_probe(self, probe: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": normalize_status(probe.get("status")),
            "value": normalize_text(probe.get("value"), "unreachable"),
            "details": normalize_text(probe.get("details"), "No detail available"),
            "ms": int(probe.get("ms") or 0),
            "checkedAt": float(probe.get("checkedAt") or time.time()),
            "source": "auto-monitor",
        }

    def _offline_battery_state(self, details: str = "Robot offline; cannot read /battery topic.") -> dict[str, Any]:
        return {
            "status": "error",
            "value": "unavailable",
            "details": normalize_text(details, "Robot offline; cannot read /battery topic."),
            "ms": 0,
            "checkedAt": time.time(),
            "source": "auto-monitor",
        }

    def _battery_command_for_robot(self, robot_id: str) -> str:
        robot_type = self._resolve_robot_type(robot_id)
        auto_monitor = robot_type.get("autoMonitor") if isinstance(robot_type, dict) else {}
        if isinstance(auto_monitor, dict):
            configured = normalize_text(auto_monitor.get("batteryCommand"), "")
            if configured:
                return configured
        return self.AUTO_MONITOR_BATTERY_COMMAND

    def _record_runtime_tests(self, robot_id: str, updates: dict[str, dict[str, Any]]) -> None:
        with self._lock:
            existing = self._runtime_tests.get(robot_id, {})
            merged = dict(existing)
            for test_id, payload in updates.items():
                if not isinstance(payload, dict):
                    continue
                prior = existing.get(test_id)
                if isinstance(prior, dict) and not self._should_apply_runtime_update(prior, payload):
                    continue
                merged[test_id] = {**(prior if isinstance(prior, dict) else {}), **payload}
            self._runtime_tests[robot_id] = merged
            online_payload = merged.get("online")
            if isinstance(online_payload, dict):
                self._online_cache[robot_id] = {
                    "status": normalize_status(online_payload.get("status")),
                    "value": normalize_text(online_payload.get("value"), "unreachable"),
                    "details": normalize_text(online_payload.get("details"), "No detail available"),
                    "ms": int(online_payload.get("ms") or 0),
                    "checkedAt": float(online_payload.get("checkedAt") or time.time()),
                    "source": normalize_text(online_payload.get("source"), "auto-monitor"),
                }

    def get_runtime_tests(self, robot_id: str) -> dict[str, dict[str, Any]]:
        with self._lock:
            existing = self._runtime_tests.get(robot_id, {})
            return {
                test_id: dict(payload)
                for test_id, payload in existing.items()
                if isinstance(payload, dict)
            }

    def _set_runtime_activity(
        self,
        robot_id: str,
        *,
        searching: bool | None = None,
        testing: bool | None = None,
        phase: Any = _ACTIVITY_UNSET,
    ) -> None:
        now = time.time()
        with self._lock:
            current = dict(self._runtime_activity.get(robot_id, {}))
            current["searching"] = bool(current.get("searching", False))
            current["testing"] = bool(current.get("testing", False))
            current["phase"] = normalize_text(current.get("phase"), "") or None
            if searching is not None:
                current["searching"] = bool(searching)
            if testing is not None:
                current["testing"] = bool(testing)
            if phase is not self._ACTIVITY_UNSET:
                current["phase"] = normalize_text(phase, "") or None
            elif not current["searching"] and not current["testing"]:
                current["phase"] = None
            current["updatedAt"] = now
            self._runtime_activity[robot_id] = current

    def get_runtime_activity(self, robot_id: str) -> dict[str, Any]:
        with self._lock:
            existing = dict(self._runtime_activity.get(robot_id, {}))
        return {
            "searching": bool(existing.get("searching", False)),
            "testing": bool(existing.get("testing", False)),
            "phase": normalize_text(existing.get("phase"), "") or None,
            "updatedAt": float(existing.get("updatedAt") or 0.0),
        }

    def _auto_recovery_test_ids(self, robot_id: str) -> list[str]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(test_entries, list):
            return []
        ids: list[str] = []
        seen: set[str] = set()
        for entry in test_entries:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id or test_id == "online" or test_id in seen:
                continue
            if entry.get("enabled", True) is False:
                continue
            seen.add(test_id)
            ids.append(test_id)
        return ids

    def _record_runtime_results_from_test_run(
        self,
        robot_id: str,
        results: list[dict[str, Any]],
        *,
        source: str,
    ) -> None:
        now = time.time()
        updates: dict[str, dict[str, Any]] = {}
        non_online_results: list[dict[str, Any]] = []
        for result in results:
            if not isinstance(result, dict):
                continue
            test_id = normalize_text(result.get("id"), "")
            if not test_id:
                continue
            if test_id != "online":
                non_online_results.append(result)
            updates[test_id] = {
                "status": normalize_status(result.get("status")),
                "value": normalize_text(result.get("value"), "n/a"),
                "details": normalize_text(result.get("details"), "No detail available"),
                "ms": int(result.get("ms") or 0),
                "checkedAt": now,
                "source": normalize_text(source, "auto-monitor"),
            }

        if "online" not in updates and non_online_results:
            any_non_error = any(normalize_status(result.get("status")) != "error" for result in non_online_results)
            all_connectivity_failures = all(
                normalize_status(result.get("status")) == "error"
                and (
                    "ssh" in normalize_text(result.get("details"), "").lower()
                    or "connect" in normalize_text(result.get("details"), "").lower()
                    or "auth" in normalize_text(result.get("details"), "").lower()
                    or normalize_text(result.get("value"), "").lower() in {"execution_error", "command_error"}
                )
                for result in non_online_results
            )
            if any_non_error:
                updates["online"] = {
                    "status": "ok",
                    "value": "reachable",
                    "details": "Inferred online: at least one test command executed.",
                    "ms": 0,
                    "checkedAt": now,
                    "source": normalize_text(source, "auto-monitor"),
                }
            elif all_connectivity_failures:
                updates["online"] = {
                    "status": "error",
                    "value": "unreachable",
                    "details": "Inferred offline: automated tests failed for SSH/connectivity reasons.",
                    "ms": 0,
                    "checkedAt": now,
                    "source": normalize_text(source, "auto-monitor"),
                }
        if updates:
            self._record_runtime_tests(robot_id, updates)

    def _run_auto_recovery_tests(self, robot_id: str) -> None:
        with self._lock:
            if robot_id in self._auto_recovery_test_inflight:
                return
            self._auto_recovery_test_inflight.add(robot_id)

        def _runner() -> None:
            self._set_runtime_activity(
                robot_id,
                testing=True,
                phase=self.ACTIVITY_PHASE_FULL_TEST_AFTER_RECOVERY,
            )
            try:
                test_ids = self._auto_recovery_test_ids(robot_id)
                if not test_ids:
                    return
                results = self._executor.run_tests(
                    robot_id=robot_id,
                    page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                    test_ids=test_ids,
                    dry_run=False,
                )
                self._record_runtime_results_from_test_run(
                    robot_id,
                    results if isinstance(results, list) else [],
                    source="auto-monitor",
                )
            except Exception:
                # Recovery tests are best-effort and must not kill monitor flow.
                pass
            finally:
                self._set_runtime_activity(robot_id, testing=False)
                with self._lock:
                    self._auto_recovery_test_inflight.discard(robot_id)

        threading.Thread(target=_runner, daemon=True).start()

    def _parse_battery_output(self, raw_output: str, elapsed_ms: int) -> dict[str, Any]:
        checked_at = time.time()
        cleaned = strip_ansi(raw_output).replace("\r", "")
        lowered = cleaned.lower()
        for phrase in (
            "unknown topic",
            "unable to communicate with master",
            "cannot contact",
            "could not contact",
            "no messages received",
        ):
            if phrase in lowered:
                return {
                    "status": "error",
                    "value": "unavailable",
                    "details": "Unable to read /battery topic.",
                    "ms": elapsed_ms,
                    "checkedAt": checked_at,
                    "source": "auto-monitor",
                }

        fields: dict[str, str] = {}
        for raw_line in cleaned.split("\n"):
            line = normalize_text(raw_line, "")
            if not line:
                continue
            match = self.BATTERY_FIELD_PATTERN.match(line)
            if not match:
                continue
            key = normalize_text(match.group(1), "").lower()
            value = normalize_text(match.group(2), "")
            if key and value:
                fields[key] = value

        percentage_raw = None
        for key in ("percentage", "percent", "soc", "state_of_charge", "battery_percent"):
            candidate = self._extract_first_float(fields.get(key, ""))
            if candidate is not None:
                percentage_raw = candidate
                break

        voltage_value = None
        for key in ("voltage", "battery_voltage", "vbat", "volt"):
            candidate = self._extract_first_float(fields.get(key, ""))
            if candidate is not None:
                voltage_value = candidate
                break

        percent_value = self._normalize_percent(percentage_raw)
        if percent_value is None:
            charge_value = self._extract_first_float(fields.get("charge", ""))
            capacity_value = self._extract_first_float(fields.get("capacity", ""))
            if charge_value is not None and capacity_value is not None and capacity_value > 0:
                percent_value = (charge_value / capacity_value) * 100.0
                percent_value = self._normalize_percent(percent_value)
        elif percent_value <= 0.0 and voltage_value is not None:
            percent_value = None

        estimated_from_voltage = False
        if percent_value is None:
            percent_value = self._estimate_percentage_from_voltage(voltage_value)
            estimated_from_voltage = percent_value is not None

        if percent_value is None:
            return {
                "status": "warning",
                "value": "unknown",
                "details": "Read /battery but could not extract percentage or usable voltage.",
                "ms": elapsed_ms,
                "checkedAt": checked_at,
                "source": "auto-monitor",
            }

        if percent_value <= self.LOW_BATTERY_ERROR_PERCENT:
            status = "error"
        elif percent_value <= self.LOW_BATTERY_WARNING_PERCENT:
            status = "warning"
        else:
            status = "ok"

        percent_text = f"{int(round(percent_value))}%"
        details = "Battery percentage from /battery topic."
        if estimated_from_voltage:
            details = (
                f"Battery {percent_text} estimated from voltage "
                f"({self.BATTERY_VOLTAGE_EMPTY:.1f}V=0%, {self.BATTERY_VOLTAGE_FULL:.1f}V=100%)."
            )
        else:
            details = f"Battery {percent_text} from /battery topic."
        if voltage_value is not None:
            details = f"{details} Voltage {voltage_value:.2f}V."

        return {
            "status": status,
            "value": percent_text,
            "details": details,
            "ms": elapsed_ms,
            "checkedAt": checked_at,
            "source": "auto-monitor",
        }

    def _refresh_battery_state(self, robot_id: str) -> None:
        started_ms = int(time.time() * 1000)
        battery_command = self._battery_command_for_robot(robot_id)
        try:
            output = self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=battery_command,
                timeout_sec=self.AUTO_MONITOR_BATTERY_TIMEOUT_SEC,
            )
        except HTTPException as exc:
            detail = normalize_text(exc.detail, "Unable to read /battery topic.")
            self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
            self._record_runtime_tests(
                robot_id,
                {
                    "online": {
                        "status": "error",
                        "value": "unreachable",
                        "details": detail,
                        "ms": 0,
                        "checkedAt": time.time(),
                        "source": "auto-monitor",
                    },
                    "battery": self._offline_battery_state(details=detail),
                },
            )
            return

        elapsed_ms = max(0, int(time.time() * 1000 - started_ms))
        battery = self._parse_battery_output(output, elapsed_ms)
        self._record_runtime_tests(
            robot_id,
            {
                "online": {
                    "status": "ok",
                    "value": "reachable",
                    "details": "SSH connected and authenticated.",
                    "ms": elapsed_ms,
                    "checkedAt": time.time(),
                    "source": "auto-monitor",
                },
                "battery": battery,
            },
        )

    def _topics_monitor_enabled(self) -> bool:
        with self._lock:
            return self._monitor_mode == self.MONITOR_MODE_ONLINE_BATTERY_TOPICS

    def _build_topics_runtime_error(self, details: str) -> dict[str, Any]:
        return {
            "status": "error",
            "value": "missing",
            "details": normalize_text(details, "Unable to run topic snapshot."),
            "ms": 0,
            "checkedAt": time.time(),
            "source": "auto-monitor-topics",
        }

    def _topic_tests_for_robot(self, robot_id: str) -> list[dict[str, Any]]:
        robot_type = self._resolve_robot_type(robot_id)
        raw_tests = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(raw_tests, list):
            return []

        selected: list[dict[str, Any]] = []
        for entry in raw_tests:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id or test_id in {"online", "battery"}:
                continue
            if entry.get("enabled", True) is False:
                continue
            required_topics = [
                normalize_text(topic, "")
                for topic in (entry.get("requiredTopics") or [])
                if normalize_text(topic, "")
            ]
            if not required_topics:
                continue
            definition_ref = normalize_text(entry.get("definitionRef"), "")
            parser_type = normalize_text(((entry.get("parser") or {}) if isinstance(entry.get("parser"), dict) else {}).get("type"), "")
            if "topics" in definition_ref or parser_type == "topics_presence":
                selected.append(entry)
        return selected

    def _refresh_topics_state(self, robot_id: str) -> None:
        topic_tests = self._topic_tests_for_robot(robot_id)
        if not topic_tests:
            return

        try:
            self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=self.AUTO_MONITOR_TOPICS_SETUP_COMMAND,
                timeout_sec=3.0,
            )
            started_ms = int(time.time() * 1000)
            output = self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=self.AUTO_MONITOR_TOPICS_COMMAND,
                timeout_sec=self.AUTO_MONITOR_TOPICS_TIMEOUT_SEC,
            )
            elapsed_ms = max(0, int(time.time() * 1000 - started_ms))
        except HTTPException as exc:
            details = normalize_text(exc.detail, "Unable to run topic snapshot.")
            updates = {
                normalize_text(entry.get("id"), ""): self._build_topics_runtime_error(details)
                for entry in topic_tests
                if normalize_text(entry.get("id"), "")
            }
            if updates:
                self._record_runtime_tests(robot_id, updates)
            return

        updates: dict[str, dict[str, Any]] = {}
        for entry in topic_tests:
            test_id = normalize_text(entry.get("id"), "")
            if not test_id:
                continue
            namespace = normalize_text(
                ((entry.get("parser") or {}) if isinstance(entry.get("parser"), dict) else {}).get("namespace")
                or entry.get("namespace"),
                "",
            )
            parsed = self._executor._parse_topics_presence(
                raw_output=output,
                expected_topics=[
                    normalize_text(topic, "")
                    for topic in (entry.get("requiredTopics") or [])
                    if normalize_text(topic, "")
                ],
                namespace=namespace,
            )
            updates[test_id] = {
                "status": normalize_status(parsed.status),
                "value": normalize_text(parsed.value, "missing"),
                "details": normalize_text(parsed.details, "Missing required topics."),
                "ms": elapsed_ms,
                "checkedAt": time.time(),
                "source": "auto-monitor-topics",
            }

        if updates:
            self._record_runtime_tests(robot_id, updates)

    def _run_auto_monitor_for_robot(self, robot_id: str, now: float) -> None:
        if self._auto_monitor_stop.is_set():
            return
        if self._is_robot_busy(robot_id):
            return
        if self._is_manual_activity_recent(robot_id, now):
            return

        with self._lock:
            previous_online_state = self._last_auto_monitor_online_state.get(robot_id)
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

        if not is_online:
            if now >= next_online:
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
                    self._set_runtime_activity(robot_id, searching=False)
                online_test = self._online_test_from_probe(online_probe)
                self._record_runtime_tests(robot_id, {"online": online_test})
                with self._lock:
                    self._online_next_check_at[robot_id] = now + online_interval_sec
                if online_test["status"] == "ok":
                    is_online = True
                    with self._lock:
                        self._battery_next_check_at[robot_id] = 0.0
                        self._topics_next_check_at[robot_id] = 0.0

            if not is_online:
                self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
                self._record_runtime_tests(robot_id, {"battery": self._offline_battery_state()})
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
        if previous_online_state is not None and (not previous_online_state) and latest_online:
            self._run_auto_recovery_tests(robot_id)
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

    # Compatibility surface for existing tests that probe parser internals.
    def _parse_topics_presence(
        self,
        raw_output: str,
        expected_topics: list[str],
        namespace: str = "",
    ) -> StepResult:
        return self._executor._parse_topics_presence(raw_output, expected_topics, namespace)

    def run_tests(
        self,
        robot_id: str,
        page_session_id: str,
        test_ids: list[str] | None = None,
        dry_run: bool = False,
    ) -> list[dict[str, Any]]:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        return self._executor.run_tests(
            robot_id=robot_id,
            page_session_id=page_session_id,
            test_ids=test_ids,
            dry_run=dry_run,
        )

    def default_tests(self, robot_id: str) -> dict[str, dict[str, str]]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []

        defaults: dict[str, dict[str, str]] = {}
        for entry in (test_entries or []):
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id:
                continue
            defaults[test_id] = {
                "status": normalize_status(entry.get("defaultStatus")),
                "value": normalize_text(entry.get("defaultValue"), "unknown"),
                "details": normalize_text(entry.get("defaultDetails"), "Not checked yet"),
            }

        if defaults:
            return defaults
        return {
            "online": {"status": "warning", "value": "unknown", "details": "Not checked yet"},
        }
