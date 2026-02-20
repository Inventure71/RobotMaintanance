from __future__ import annotations

import re
import threading
from typing import Any

from fastapi import HTTPException

from ..connectors import OrchestrateConnector, ReadConnector, WriteConnector
from ..normalization import normalize_type_key
from ..test_executor import TestExecutor
from .activity_guard import ActivityGuardMixin
from .auto_monitor_worker import AutoMonitorWorkerMixin
from .battery_parser import BatteryParserMixin
from .command_runner import CommandRunnerMixin
from .fix_runner import FixRunnerMixin
from .monitor_config import MonitorConfigMixin
from .online_checker import OnlineCheckerMixin
from .runtime_state import RuntimeStateMixin
from .session_store import SessionStoreMixin
from .test_runner import TestRunnerMixin
from .topics_parser import TopicsParserMixin


class TerminalManager(
    ActivityGuardMixin,
    RuntimeStateMixin,
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
    AUTO_MONITOR_ONLINE_TIMEOUT_SEC = 1.0
    AUTO_ACTIVITY_MIN_VISIBLE_SEC = 1.1
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
        self._runtime_activity = {}
        self._monitor_mode = self.MONITOR_MODE_ONLINE_BATTERY
        self._topics_interval_sec = self.TOPICS_INTERVAL_DEFAULT_SEC
        self._online_interval_sec = self.ONLINE_INTERVAL_DEFAULT_SEC
        self._battery_interval_sec = self.BATTERY_INTERVAL_DEFAULT_SEC
        self._monitor_parallelism = self.MONITOR_PARALLELISM_DEFAULT
        self._online_next_check_at = {}
        self._battery_next_check_at = {}
        self._topics_next_check_at = {}
        self._manual_activity_by_robot = {}
        self._manual_defer_until_by_robot = {}
        self._active_test_runs = set()
        self._active_search_runs = set()
        self._active_fix_runs = set()
        self._last_auto_monitor_online_state = {}
        self._auto_recovery_test_inflight = set()
        self._fix_runs: dict[tuple[str, str], dict[str, Any]] = {}
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
            test_definitions_by_id=self._test_definitions_by_id,
            check_definitions_by_id=self._check_definitions_by_id,
            orchestrate_connector=self._orchestrate_connector,
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
