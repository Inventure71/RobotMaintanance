from __future__ import annotations

import re
import threading
import uuid
from typing import Any

from fastapi import HTTPException

from ..connectors import OrchestrateConnector, ReadConnector, WriteConnector
from ..normalization import normalize_text, normalize_type_key
from ..test_executor import TestExecutor
from .job_scheduler import NoActiveUserJobError, RobotJobCoordinator, RobotJobExecutor
from .activity_guard import ActivityGuardMixin
from .automation_session import AutomationSessionMixin
from .auto_monitor_worker import AutoMonitorWorkerMixin
from .battery_parser import BatteryParserMixin
from .command_runner import CommandRunnerMixin
from .connection_event_runner import ConnectionEventRunnerMixin
from .fix_runner import FixRunnerMixin
from .monitor_config import MonitorConfigMixin
from .online_checker import OnlineCheckerMixin
from .runtime_state import RuntimeStateMixin
from .session_store import SessionStoreMixin
from .test_runner import TestRunnerMixin
from .topics_parser import TopicsParserMixin
from .transport_pool import SshTransportPool


class TerminalManager(
    ActivityGuardMixin,
    ConnectionEventRunnerMixin,
    RuntimeStateMixin,
    AutomationSessionMixin,
    SessionStoreMixin,
    CommandRunnerMixin,
    MonitorConfigMixin,
    OnlineCheckerMixin,
    BatteryParserMixin,
    TopicsParserMixin,
    TestRunnerMixin,
    FixRunnerMixin,
    AutoMonitorWorkerMixin,
):
    MONITOR_MODE_ONLINE_BATTERY = "online_battery"
    MONITOR_MODE_ONLINE_BATTERY_TOPICS = "online_battery_topics"
    MONITOR_MODE_VALUES = {MONITOR_MODE_ONLINE_BATTERY, MONITOR_MODE_ONLINE_BATTERY_TOPICS}

    TERMINAL_CONNECT_TIMEOUT_SEC = 10.0
    ONLINE_CACHE_TTL_SEC = 5.0
    ONLINE_DEFAULT_TIMEOUT_SEC = 3.0
    ONLINE_MIN_TIMEOUT_SEC = 0.5
    ONLINE_MAX_TIMEOUT_SEC = 10.0
    AUTO_MONITOR_INTERVAL_SEC = 1.0
    AUTO_MONITOR_ONLINE_TIMEOUT_SEC = 3.0
    AUTO_ACTIVITY_MIN_VISIBLE_SEC = 1.1
    AUTO_MONITOR_BATTERY_TIMEOUT_SEC = 8.0
    AUTO_MONITOR_TOPICS_TIMEOUT_SEC = 12.0
    AUTO_MONITOR_TOPICS_SETUP_COMMAND = (
        "source /opt/ros/noetic/setup.bash >/dev/null 2>&1 || true; "
        "source ~/ws/devel/setup.bash >/dev/null 2>&1 || true"
    )
    AUTO_MONITOR_TOPICS_COMMAND = "timeout 12s rostopic list"
    AUTO_MONITOR_PAGE_SESSION_ID = "__auto-monitor__"
    AUTO_MONITOR_TEST_PAGE_SESSION_ID = "__auto-monitor-tests__"
    AUTO_MONITOR_BATTERY_COMMAND = (
        "source /opt/ros/noetic/setup.bash >/dev/null 2>&1 || true; "
        "source ~/ws/devel/setup.bash >/dev/null 2>&1 || true; "
        "timeout 6s rostopic echo -n 1 /battery"
    )
    TOPICS_INTERVAL_DEFAULT_SEC = 30.0
    TOPICS_INTERVAL_MIN_SEC = 5.0
    TOPICS_INTERVAL_MAX_SEC = 300.0
    ONLINE_INTERVAL_DEFAULT_SEC = 5.0
    ONLINE_INTERVAL_MIN_SEC = 0.5
    ONLINE_INTERVAL_MAX_SEC = 60.0
    ONLINE_FAILURES_TO_MARK_OFFLINE = 2
    ONLINE_SUCCESSES_TO_MARK_ONLINE = 1
    BATTERY_INTERVAL_DEFAULT_SEC = 2.0
    BATTERY_INTERVAL_MIN_SEC = 0.5
    BATTERY_INTERVAL_MAX_SEC = 60.0
    MONITOR_PARALLELISM_DEFAULT = 4
    MONITOR_PARALLELISM_MIN = 1
    MONITOR_PARALLELISM_MAX = 100
    MANUAL_ACTIVITY_DEFER_SEC = 5.0
    MANUAL_AUTO_FIX_DEFER_SEC = 90.0
    CONNECTION_RETRY_INTERVAL_SEC = 4.0
    CONNECTION_RETRY_WINDOW_SEC = 15.0
    CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 2.0
    IDLE_SWEEP_INTERVAL_SEC = 2.0
    COMMAND_DEFAULT_TIMEOUT_SEC = 20.0
    COMMAND_MIN_TIMEOUT_SEC = 0.5
    COMMAND_MAX_TIMEOUT_SEC = 3600.0
    AUTOMATION_QUEUE_TIMEOUT_SEC = 2.0
    AUTOMATION_QUEUE_TIMEOUT_MIN_SEC = 0.0
    AUTOMATION_QUEUE_TIMEOUT_MAX_SEC = 3600.0
    AUTOMATION_CONNECT_TIMEOUT_SEC = 10.0
    AUTOMATION_CONNECT_TIMEOUT_MIN_SEC = 0.1
    AUTOMATION_CONNECT_TIMEOUT_MAX_SEC = 120.0
    AUTOMATION_EXECUTE_TIMEOUT_SEC = 20.0
    AUTOMATION_EXECUTE_TIMEOUT_MIN_SEC = 0.5
    AUTOMATION_EXECUTE_TIMEOUT_MAX_SEC = 3600.0
    TRANSPORT_POOL_IDLE_TTL_SEC = 300.0
    TRANSPORT_POOL_MAX_FAILURES_BEFORE_RESET = 2
    TRANSPORT_IDLE_SWEEP_INTERVAL_SEC = 60.0
    ACTIVITY_PHASE_ONLINE_PROBE = "online_probe"
    ACTIVITY_PHASE_CONNECTION_RETRY = "connection_retry"
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
        command_primitives_by_id: dict[str, dict[str, Any]] | None = None,
        test_definitions_by_id: dict[str, dict[str, Any]] | None = None,
        check_definitions_by_id: dict[str, dict[str, Any]] | None = None,
        fix_definitions_by_id: dict[str, dict[str, Any]] | None = None,
        idle_timeout_sec: int = 15 * 60,
        auto_monitor: bool = False,
        auto_monitor_interval_sec: float = AUTO_MONITOR_INTERVAL_SEC,
    ):
        self.robots_by_id = robots_by_id
        self.robot_types_by_id = robot_types_by_id
        self.idle_timeout_sec = idle_timeout_sec
        self._handles = {}
        self._online_cache = {}
        self._runtime_tests = {}
        self._runtime_test_debug = {}
        self._runtime_activity = {}
        self._runtime_version = 0
        self._runtime_robot_versions = {}
        self._last_test_run_metadata: dict[tuple[str, str], dict[str, Any]] = {}
        self._monitor_mode = self.MONITOR_MODE_ONLINE_BATTERY
        self._topics_interval_sec = self.TOPICS_INTERVAL_DEFAULT_SEC
        self._online_interval_sec = self.ONLINE_INTERVAL_DEFAULT_SEC
        self._battery_interval_sec = self.BATTERY_INTERVAL_DEFAULT_SEC
        self._monitor_parallelism = self.MONITOR_PARALLELISM_DEFAULT
        self._online_next_check_at = {}
        self._online_failure_streak_by_robot = {}
        self._online_success_streak_by_robot = {}
        self._battery_next_check_at = {}
        self._topics_next_check_at = {}
        self._manual_activity_by_robot = {}
        self._manual_defer_until_by_robot = {}
        self._active_test_runs = set()
        self._active_search_runs = set()
        self._active_fix_runs = set()
        self._last_auto_monitor_online_state = {}
        self._auto_recovery_test_inflight = set()
        self._auto_recovery_cancel_requested = set()
        self._connection_retry_sessions: dict[str, dict[str, Any]] = {}
        self._connection_retry_inflight: dict[str, int] = {}
        self._connection_retry_attempt_owner: dict[str, int] = {}
        self._next_idle_sweep_at = 0.0
        self._last_transport_sweep_at = 0.0
        self._auto_monitor_executor = None
        self._auto_monitor_executor_workers = 0
        self._active_automation_contexts: dict[str, Any] = {}
        self._active_automation_lock = threading.Lock()
        self._command_primitives_by_id = command_primitives_by_id or {}
        self._test_definitions_by_id = test_definitions_by_id or {}
        self._check_definitions_by_id = check_definitions_by_id or {}
        self._fix_definitions_by_id = fix_definitions_by_id or {}
        self._read_connector = ReadConnector()
        self._write_connector = WriteConnector(self._command_primitives_by_id)
        self._orchestrate_connector = OrchestrateConnector(
            read=self._read_connector,
            write=self._write_connector,
        )
        self._lock = threading.Lock()
        self._transport_pool = SshTransportPool(
            idle_ttl_sec=self.TRANSPORT_POOL_IDLE_TTL_SEC,
            default_connect_timeout_sec=self.AUTOMATION_CONNECT_TIMEOUT_SEC,
            max_failures_before_reset=self.TRANSPORT_POOL_MAX_FAILURES_BEFORE_RESET,
        )
        self._auto_monitor_enabled = bool(auto_monitor)
        self._auto_monitor_interval_sec = max(0.2, float(auto_monitor_interval_sec))
        self._auto_monitor_stop = threading.Event()
        self._auto_monitor_thread: threading.Thread | None = None
        self._executor = TestExecutor(
            robot_types_by_id=robot_types_by_id,
            resolve_robot_type=self._resolve_robot_type,
            resolve_credentials=self._resolve_credentials,
            check_online=self.check_online,
            create_automation_run_context=self.create_automation_run_context,
            test_definitions_by_id=self._test_definitions_by_id,
            check_definitions_by_id=self._check_definitions_by_id,
            orchestrate_connector=self._orchestrate_connector,
        )
        self._job_executor = RobotJobExecutor(self)
        self._job_coordinator = RobotJobCoordinator(
            executor=self._job_executor,
            on_snapshot=self._on_robot_job_snapshot,
            close_session=self.close_session,
            hard_reset_transport=self._full_hard_reset_robot,
            soft_interrupt_automation=self._soft_interrupt_active_automation,
        )
        if self._auto_monitor_enabled:
            self._start_auto_monitor()

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

    def _full_hard_reset_robot(self, robot_id: str) -> None:
        """Hard-reset the SSH transport AND close all associated SSH sessions.

        This is a full reset: it invalidates the transport pool entry and closes
        both the auto-monitor and test-session shells so no zombie connections
        remain after a job stop or error.
        """
        self._transport_pool.hard_reset_robot(robot_id)
        try:
            self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
        except Exception:
            pass
        try:
            self.close_session(page_session_id=self.AUTO_MONITOR_TEST_PAGE_SESSION_ID, robot_id=robot_id)
        except Exception:
            pass

    def _soft_interrupt_active_automation(self, robot_id: str) -> None:
        """Send Ctrl-C to any active automation shell for this robot.

        Called before the hard transport reset so the running process has a
        chance to exit cleanly (saves file locks, ROS node deregistration, etc.).
        Uses the automation-context registry which is populated for both test
        and fix paths via ``AutomationRunContext`` open/close callbacks.
        """
        try:
            with self._active_automation_lock:
                active_context = self._active_automation_contexts.get(robot_id)
            if active_context is None:
                return
            soft_interrupt = getattr(active_context, "soft_interrupt", None)
            if callable(soft_interrupt):
                soft_interrupt()
        except Exception:
            pass

    def _on_robot_job_snapshot(self, robot_id: str, snapshot: dict[str, Any]) -> None:
        if not isinstance(snapshot, dict):
            return
        self._set_runtime_job_queue_snapshot(
            robot_id,
            active_job=snapshot.get("activeJob"),
            queued_jobs=snapshot.get("queuedJobs"),
            last_completed_job=snapshot.get("lastCompletedJob"),
            queue_version=int(snapshot.get("jobQueueVersion") or 0),
        )

    def _default_job_label(
        self,
        *,
        robot_id: str,
        kind: str,
        test_ids: list[str] | None = None,
        fix_id: str | None = None,
    ) -> str:
        normalized_kind = normalize_text(kind, "").lower()
        if normalized_kind == "test":
            selected = [normalize_text(test_id, "") for test_id in (test_ids or []) if normalize_text(test_id, "")]
            if len(selected) == 1:
                return f"Run test {selected[0]}"
            if len(selected) > 1:
                return f"Run {len(selected)} tests"
            return "Run tests"
        if normalized_kind == "fix":
            normalized_fix_id = normalize_text(fix_id, "")
            if normalized_fix_id:
                try:
                    fix_spec = self._resolve_fix_spec(robot_id, normalized_fix_id)
                    fix_label = normalize_text(fix_spec.get("label"), "")
                    if fix_label:
                        return f"Run fix {fix_label}"
                except Exception:
                    pass
            return f"Run fix {normalize_text(fix_id, '') or 'job'}"
        return f"Run {normalized_kind or 'job'}"

    def _validate_job_enqueue_payload(self, robot_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        if normalized_robot_id not in self.robots_by_id:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {normalized_robot_id}")

        kind = normalize_text(payload.get("kind"), "").lower()
        if kind not in {"test", "fix"}:
            raise HTTPException(status_code=400, detail="Invalid job kind. Expected 'test' or 'fix'.")

        body = dict(payload)
        if kind == "test":
            raw_test_ids = body.get("testIds") if isinstance(body.get("testIds"), list) else None
            normalized_test_ids = None
            if raw_test_ids is not None:
                normalized_test_ids = [normalize_text(test_id, "") for test_id in raw_test_ids]
                normalized_test_ids = [test_id for test_id in normalized_test_ids if test_id]
                if not normalized_test_ids:
                    raise HTTPException(status_code=400, detail="No tests selected.")
                configured = set(self._configured_test_ids(normalized_robot_id))
                unknown = [test_id for test_id in normalized_test_ids if test_id not in configured]
                if unknown:
                    raise HTTPException(status_code=404, detail=f"Unknown test id(s): {', '.join(unknown)}")
            body["testIds"] = normalized_test_ids
            return body

        fix_id = normalize_text(body.get("fixId"), "")
        if not fix_id:
            raise HTTPException(status_code=400, detail="fixId is required for fix jobs.")
        try:
            self._resolve_fix_spec(normalized_robot_id, fix_id)
        except HTTPException as exc:
            if exc.status_code in {400, 404}:
                raise HTTPException(status_code=404, detail=normalize_text(exc.detail, "Unknown fix id"))
            raise
        raw_post_test_ids = body.get("postTestIds") if isinstance(body.get("postTestIds"), list) else None
        normalized_post_test_ids = None
        if raw_post_test_ids is not None:
            normalized_post_test_ids = []
            seen_post_test_ids: set[str] = set()
            configured = set(self._configured_test_ids(normalized_robot_id))
            unknown: list[str] = []
            for raw_test_id in raw_post_test_ids:
                test_id = normalize_text(raw_test_id, "")
                if not test_id or test_id in seen_post_test_ids:
                    continue
                seen_post_test_ids.add(test_id)
                if test_id not in configured:
                    unknown.append(test_id)
                    continue
                normalized_post_test_ids.append(test_id)
            if unknown:
                raise HTTPException(status_code=404, detail=f"Unknown post-fix test id(s): {', '.join(unknown)}")
        body["fixId"] = fix_id
        body["postTestIds"] = normalized_post_test_ids
        return body

    def enqueue_robot_job(
        self,
        *,
        robot_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        validated = self._validate_job_enqueue_payload(normalized_robot_id, payload)
        normalized_kind = normalize_text(validated.get("kind"), "").lower()
        source = normalize_text(validated.get("source"), "manual") or "manual"
        label = normalize_text(validated.get("label"), "")
        if not label:
            label = self._default_job_label(
                robot_id=normalized_robot_id,
                kind=normalized_kind,
                test_ids=validated.get("testIds") if isinstance(validated.get("testIds"), list) else None,
                fix_id=validated.get("fixId"),
            )
        page_session_id = normalize_text(validated.get("pageSessionId"), "") or (
            f"jobs-{normalized_robot_id}-{uuid.uuid4().hex[:8]}"
        )

        payload_body = {
            "kind": normalized_kind,
            "testIds": validated.get("testIds"),
            "fixId": validated.get("fixId"),
            "params": validated.get("params") if isinstance(validated.get("params"), dict) else {},
            "postTestIds": validated.get("postTestIds") if isinstance(validated.get("postTestIds"), list) else None,
            "timeoutSec": validated.get("timeoutSec"),
            "queueTimeoutSec": validated.get("queueTimeoutSec"),
            "connectTimeoutSec": validated.get("connectTimeoutSec"),
            "executeTimeoutSec": validated.get("executeTimeoutSec"),
        }
        job_id, snapshot = self._job_coordinator.enqueue_user_job(
            robot_id=normalized_robot_id,
            kind=normalized_kind,
            source=source,
            label=label,
            payload=payload_body,
            page_session_id=page_session_id,
        )
        return {
            "jobId": job_id,
            "activeJob": snapshot.get("activeJob"),
            "queuedJobs": snapshot.get("queuedJobs") if isinstance(snapshot.get("queuedJobs"), list) else [],
            "lastCompletedJob": snapshot.get("lastCompletedJob") if isinstance(snapshot.get("lastCompletedJob"), dict) else None,
            "jobQueueVersion": int(snapshot.get("jobQueueVersion") or 0),
        }

    def get_robot_jobs(self, robot_id: str) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        if normalized_robot_id not in self.robots_by_id:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {normalized_robot_id}")
        snapshot = self._job_coordinator.get_snapshot(normalized_robot_id)
        return {
            "activeJob": snapshot.get("activeJob"),
            "queuedJobs": snapshot.get("queuedJobs") if isinstance(snapshot.get("queuedJobs"), list) else [],
            "lastCompletedJob": snapshot.get("lastCompletedJob") if isinstance(snapshot.get("lastCompletedJob"), dict) else None,
            "jobQueueVersion": int(snapshot.get("jobQueueVersion") or 0),
        }

    def stop_active_robot_job(self, robot_id: str) -> tuple[dict[str, Any], bool]:
        normalized_robot_id = normalize_text(robot_id, "")
        if normalized_robot_id not in self.robots_by_id:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {normalized_robot_id}")
        try:
            stop_result = self._job_coordinator.stop_active_job(normalized_robot_id)
        except NoActiveUserJobError as exc:
            raise HTTPException(status_code=409, detail="No active user job.") from exc
        snapshot = stop_result.snapshot if isinstance(stop_result.snapshot, dict) else {}
        return (
            {
                "activeJob": snapshot.get("activeJob"),
                "queuedJobs": snapshot.get("queuedJobs") if isinstance(snapshot.get("queuedJobs"), list) else [],
                "lastCompletedJob": snapshot.get("lastCompletedJob") if isinstance(snapshot.get("lastCompletedJob"), dict) else None,
                "jobQueueVersion": int(snapshot.get("jobQueueVersion") or 0),
            },
            bool(stop_result.already_interrupting),
        )

    def has_pending_user_work(self, robot_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False
        return bool(self._job_coordinator.has_pending_user_work(normalized_robot_id))

    def reload_definitions(
        self,
        *,
        robots_by_id: dict[str, dict[str, Any]] | None = None,
        robot_types_by_id: dict[str, dict[str, Any]],
        command_primitives_by_id: dict[str, dict[str, Any]],
        test_definitions_by_id: dict[str, dict[str, Any]],
        check_definitions_by_id: dict[str, dict[str, Any]],
        fix_definitions_by_id: dict[str, dict[str, Any]],
    ) -> dict[str, int]:
        with self._lock:
            self._last_test_run_metadata.clear()
            if isinstance(robots_by_id, dict):
                self.robots_by_id.clear()
                self.robots_by_id.update(robots_by_id)

            self.robot_types_by_id.clear()
            self.robot_types_by_id.update(robot_types_by_id or {})

            self._command_primitives_by_id = dict(command_primitives_by_id or {})
            self._test_definitions_by_id = dict(test_definitions_by_id or {})
            self._check_definitions_by_id = dict(check_definitions_by_id or {})
            self._fix_definitions_by_id = dict(fix_definitions_by_id or {})

            self._write_connector = WriteConnector(self._command_primitives_by_id)
            self._orchestrate_connector = OrchestrateConnector(
                read=self._read_connector,
                write=self._write_connector,
            )
            self._executor = TestExecutor(
                robot_types_by_id=self.robot_types_by_id,
                resolve_robot_type=self._resolve_robot_type,
                resolve_credentials=self._resolve_credentials,
                check_online=self.check_online,
                create_automation_run_context=self.create_automation_run_context,
                test_definitions_by_id=self._test_definitions_by_id,
                check_definitions_by_id=self._check_definitions_by_id,
                orchestrate_connector=self._orchestrate_connector,
            )

            valid_test_ids_by_robot: dict[str, set[str]] = {}
            for robot_id, robot_payload in self.robots_by_id.items():
                normalized_robot_id = normalize_text(robot_id, "")
                if not normalized_robot_id or not isinstance(robot_payload, dict):
                    continue
                type_key = normalize_type_key(robot_payload.get("type"))
                robot_type = self.robot_types_by_id.get(type_key) if type_key else {}
                raw_tests = robot_type.get("tests") if isinstance(robot_type, dict) else []
                valid_test_ids = {"online"}
                for test_entry in raw_tests if isinstance(raw_tests, list) else []:
                    if not isinstance(test_entry, dict):
                        continue
                    test_id = normalize_text(test_entry.get("id"), "")
                    if test_id:
                        valid_test_ids.add(test_id)
                valid_test_ids_by_robot[normalized_robot_id] = valid_test_ids

            for runtime_robot_id in list(self._runtime_tests.keys()):
                normalized_runtime_robot_id = normalize_text(runtime_robot_id, "")
                valid_test_ids = valid_test_ids_by_robot.get(normalized_runtime_robot_id)
                if not valid_test_ids:
                    removed_tests = self._runtime_tests.pop(runtime_robot_id, None)
                    removed_test_debug = self._runtime_test_debug.pop(runtime_robot_id, None)
                    removed_activity = self._runtime_activity.pop(runtime_robot_id, None)
                    removed_online = self._online_cache.pop(runtime_robot_id, None)
                    if (
                        removed_tests is not None
                        or removed_test_debug is not None
                        or removed_activity is not None
                        or removed_online is not None
                    ):
                        self._mark_runtime_robot_dirty_locked(runtime_robot_id)
                    continue

                existing_tests = self._runtime_tests.get(runtime_robot_id, {})
                existing_test_debug = self._runtime_test_debug.get(runtime_robot_id, {})
                pruned_tests = {
                    normalize_text(test_id, ""): payload
                    for test_id, payload in existing_tests.items()
                    if isinstance(payload, dict) and normalize_text(test_id, "") in valid_test_ids
                }
                pruned_test_debug = {
                    normalize_text(test_id, ""): payload
                    for test_id, payload in existing_test_debug.items()
                    if isinstance(payload, dict) and normalize_text(test_id, "") in valid_test_ids
                }
                tests_changed = pruned_tests != existing_tests
                test_debug_changed = pruned_test_debug != existing_test_debug
                if pruned_tests:
                    self._runtime_tests[runtime_robot_id] = pruned_tests
                else:
                    self._runtime_tests.pop(runtime_robot_id, None)
                if pruned_test_debug:
                    self._runtime_test_debug[runtime_robot_id] = pruned_test_debug
                else:
                    self._runtime_test_debug.pop(runtime_robot_id, None)
                if "online" not in pruned_tests:
                    if self._online_cache.pop(runtime_robot_id, None) is not None:
                        tests_changed = True
                if tests_changed or test_debug_changed:
                    self._mark_runtime_robot_dirty_locked(runtime_robot_id)

            for runtime_robot_id in list(self._runtime_activity.keys()):
                normalized_runtime_robot_id = normalize_text(runtime_robot_id, "")
                if normalized_runtime_robot_id not in valid_test_ids_by_robot:
                    if self._runtime_activity.pop(runtime_robot_id, None) is not None:
                        self._mark_runtime_robot_dirty_locked(runtime_robot_id)

            for runtime_robot_id in list(self._runtime_test_debug.keys()):
                normalized_runtime_robot_id = normalize_text(runtime_robot_id, "")
                if normalized_runtime_robot_id in valid_test_ids_by_robot:
                    continue
                self._runtime_test_debug.pop(runtime_robot_id, None)

        return {
            "robotCount": len(self.robots_by_id),
            "robotTypeCount": len(self.robot_types_by_id),
            "primitiveCount": len(self._command_primitives_by_id),
            "testDefinitionCount": len(self._test_definitions_by_id),
            "checkCount": len(self._check_definitions_by_id),
            "fixCount": len(self._fix_definitions_by_id),
        }
