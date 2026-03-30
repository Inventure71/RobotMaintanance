from __future__ import annotations

import threading
import time

from backend.terminal_manager import TerminalManager
import backend.terminal_manager as tm_module
from backend.ssh_client import AutomationCommandResult


def _manager(auto_monitor: bool = False) -> TerminalManager:
    return TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
        auto_monitor=auto_monitor,
    )


def test_parse_battery_output_extracts_percentage_and_voltage():
    manager = _manager()
    result = manager._parse_battery_output(
        "percentage: 0.82\nvoltage: 12.61\n",
        elapsed_ms=14,
    )

    assert result["status"] == "ok"
    assert result["value"] == "82%"
    assert result["reason"] == "BATTERY_OK"
    assert "12.61V" in result["details"]


def test_parse_battery_output_falls_back_to_voltage_scale_when_percentage_zero():
    manager = _manager()
    result = manager._parse_battery_output(
        "percentage: 0.0\nvoltage: 12.06\n",
        elapsed_ms=10,
    )

    assert result["status"] == "ok"
    assert result["value"] == "70%"
    assert result["reason"] == "BATTERY_OK"
    assert "estimated from voltage" in result["details"]


def test_parse_battery_output_marks_dying_voltage_as_zero_percent():
    manager = _manager()
    result = manager._parse_battery_output(
        "percentage: 0.0\nvoltage: 10.8\n",
        elapsed_ms=10,
    )

    assert result["status"] == "error"
    assert result["value"] == "0%"
    assert result["reason"] == "LOW_BATTERY"
    assert "Critical battery threshold is <= 15%" in result["details"]


def test_parse_battery_output_marks_unreadable_payload_with_explicit_reason():
    manager = _manager()
    result = manager._parse_battery_output(
        "this payload has no parsable battery fields\n",
        elapsed_ms=8,
    )

    assert result["status"] == "warning"
    assert result["value"] == "unknown"
    assert result["reason"] == "BATTERY_UNREADABLE"
    assert "Battery unreadable" in result["details"]


def test_parse_battery_output_handles_ros_battery_with_present_false():
    manager = _manager()
    result = manager._parse_battery_output(
        "voltage: 12.334404945373535\n"
        "temperature: 0.0\n"
        "current: 0.0\n"
        "charge: 0.0\n"
        "capacity: 0.0\n"
        "percentage: 0.0\n"
        "present: False\n",
        elapsed_ms=10,
    )

    assert result["value"] != "unknown"
    assert result["status"] == "ok"


def test_reload_definitions_prunes_runtime_tests_not_in_robot_type_catalog():
    manager = _manager()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {"status": "ok", "value": "reachable", "details": "up", "source": "manual", "checkedAt": 1.0},
            "legacy_removed_check": {
                "status": "error",
                "value": "missing",
                "details": "legacy",
                "source": "manual",
                "checkedAt": 1.0,
            },
            "active_check": {
                "status": "ok",
                "value": "present",
                "details": "active",
                "source": "manual",
                "checkedAt": 1.0,
            },
        },
    )

    manager.reload_definitions(
        robots_by_id=dict(manager.robots_by_id),
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "defaultStatus": "warning"},
                    {"id": "active_check", "defaultStatus": "warning"},
                ],
            }
        },
        command_primitives_by_id={},
        test_definitions_by_id={"active_definition": {"id": "active_definition", "mode": "orchestrate"}},
        check_definitions_by_id={"active_check": {"id": "active_check", "definitionId": "active_definition"}},
        fix_definitions_by_id={},
    )

    runtime = manager.get_runtime_tests("r1")
    assert "online" in runtime
    assert "active_check" in runtime
    assert "legacy_removed_check" not in runtime


def test_auto_monitor_tick_recovers_offline_and_reads_battery(monkeypatch):
    observed = {"connect_calls": 0, "commands": []}

    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            observed["connect_calls"] += 1

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            observed["commands"].append(command)
            return "percentage: 0.75\nvoltage: 12.40\n"

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [],
                "autoMonitor": {
                    "batteryCommand": "custom battery probe",
                },
            }
        },
        auto_monitor=False,
    )
    monkeypatch.setattr(
        manager,
        "probe_transport",
        lambda **_kwargs: type("_Probe", (), {"reused": False, "queue_ms": 0, "connect_ms": 1, "probe_ms": 1})(),
    )
    manager._run_auto_monitor_tick()
    runtime = manager.get_runtime_tests("r1")

    assert runtime["online"]["status"] == "ok"
    assert runtime["battery"]["value"] == "75%"
    assert "custom battery probe" in observed["commands"]
    assert observed["connect_calls"] >= 1


def test_auto_monitor_tick_uses_robot_type_battery_command(monkeypatch):
    observed = {"commands": []}

    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            observed["commands"].append(command)
            return "voltage: 12.33\npercentage: 0.0\n"

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [],
                "autoMonitor": {
                    "batteryCommand": "custom battery probe",
                },
            }
        },
        auto_monitor=False,
    )
    monkeypatch.setattr(
        manager,
        "probe_transport",
        lambda **_kwargs: type("_Probe", (), {"reused": False, "queue_ms": 0, "connect_ms": 1, "probe_ms": 1})(),
    )
    manager._run_auto_recovery_tests = lambda _robot_id: None

    manager._run_auto_monitor_tick()
    assert "custom battery probe" in observed["commands"]


def test_auto_monitor_keeps_online_state_when_battery_command_fails(monkeypatch):
    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, _command, timeout):
            _ = timeout
            raise RuntimeError("boom")

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "enabled": True},
                    {"id": "battery", "enabled": True},
                    {"id": "general", "enabled": True},
                ],
                "autoMonitor": {
                    "batteryCommand": "custom battery probe",
                },
            }
        },
        auto_monitor=False,
    )
    fake_shell = FakeShell()

    class FakeRunContext:
        def run_command(self, command: str, timeout_sec: float | None = None, sudo_password: str | None = None):
            return fake_shell.run_automation_command(command, timeout_sec or 12.0, sudo_password=sudo_password)

        def close(self):
            return None

        def metadata_payload(self):
            return {
                "timing": {"queueMs": 0, "connectMs": 0, "executeMs": 0, "totalMs": 0},
                "session": {
                    "runId": "manual-run",
                    "robotId": "r1",
                    "pageSessionId": "manual-session",
                    "runKind": "test",
                    "transportReused": True,
                    "resetPolicy": "run_scoped_shell",
                },
            }

    manager._executor._create_automation_run_context = lambda **_kwargs: FakeRunContext()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "Preloaded online state",
            }
        },
    )

    manager._run_auto_monitor_tick()
    runtime = manager.get_runtime_tests("r1")

    assert runtime["online"]["status"] == "ok"
    assert runtime["online"]["value"] == "reachable"
    assert runtime["battery"]["status"] == "warning"
    assert runtime["battery"]["value"] == "unknown"
    assert "general" not in runtime


def test_refresh_battery_state_does_not_override_online_status(monkeypatch):
    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, _command, timeout):
            _ = timeout
            return "percentage: 0.66\nvoltage: 12.10\n"

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [{"id": "online", "enabled": True}, {"id": "battery", "enabled": True}],
                "autoMonitor": {"batteryCommand": "custom battery probe"},
            }
        },
        auto_monitor=False,
    )
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "error",
                "value": "unreachable",
                "details": "preloaded offline",
                "checkedAt": 10.0,
                "source": "manual",
            }
        },
    )

    manager._refresh_battery_state("r1")
    runtime = manager.get_runtime_tests("r1")

    assert runtime["online"]["status"] == "error"
    assert runtime["online"]["value"] == "unreachable"
    assert runtime["battery"]["status"] == "ok"
    assert runtime["battery"]["value"] == "66%"


def test_auto_monitor_requires_two_consecutive_failures_before_marking_offline(monkeypatch):
    manager = _manager()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "preloaded online",
                "checkedAt": 1.0,
                "source": "manual",
            }
        },
    )
    manager._refresh_battery_state = lambda _robot_id: None
    manager._emit_connection_event_connected = lambda *_args, **_kwargs: None
    manager._emit_connection_event_disconnected = lambda *_args, **_kwargs: None

    probes = iter(
        [
            {
                "status": "error",
                "value": "unreachable",
                "details": "transient timeout #1",
                "checkedAt": 2.0,
                "source": "live",
            },
            {
                "status": "error",
                "value": "unreachable",
                "details": "transient timeout #2",
                "checkedAt": 3.0,
                "source": "live",
            },
        ]
    )
    manager.check_online = lambda **_kwargs: dict(next(probes))

    manager._run_auto_monitor_tick()
    first_runtime = manager.get_runtime_tests("r1")
    assert first_runtime["online"]["status"] == "ok"
    manager._online_next_check_at["r1"] = 0.0

    manager._run_auto_monitor_tick()
    second_runtime = manager.get_runtime_tests("r1")
    assert second_runtime["online"]["status"] == "error"
    assert "timeout #2" in second_runtime["online"]["details"]


def test_auto_monitor_fail_streak_resets_after_success(monkeypatch):
    manager = _manager()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "preloaded online",
                "checkedAt": 1.0,
                "source": "manual",
            }
        },
    )
    manager._refresh_battery_state = lambda _robot_id: None
    manager._emit_connection_event_connected = lambda *_args, **_kwargs: None
    manager._emit_connection_event_disconnected = lambda *_args, **_kwargs: None

    probes = iter(
        [
            {
                "status": "error",
                "value": "unreachable",
                "details": "timeout #1",
                "checkedAt": 2.0,
                "source": "live",
            },
            {
                "status": "ok",
                "value": "reachable",
                "details": "recovered",
                "checkedAt": 3.0,
                "source": "live",
            },
            {
                "status": "error",
                "value": "unreachable",
                "details": "timeout #2",
                "checkedAt": 4.0,
                "source": "live",
            },
        ]
    )
    manager.check_online = lambda **_kwargs: dict(next(probes))

    manager._run_auto_monitor_tick()
    manager._online_next_check_at["r1"] = 0.0
    manager._run_auto_monitor_tick()
    manager._online_next_check_at["r1"] = 0.0
    manager._run_auto_monitor_tick()

    runtime = manager.get_runtime_tests("r1")
    assert runtime["online"]["status"] == "ok"
    assert runtime["online"]["details"] == "recovered"


def test_manual_run_persists_runtime_results(monkeypatch):
    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            if command == "echo ok":
                return "ok"
            return ""

        def run_automation_command(self, command, timeout, sudo_password=None):
            _ = sudo_password
            return AutomationCommandResult(
                output=self.run_command(command, timeout),
                exit_code=0,
                timed_out=False,
                used_sudo=False,
                sudo_authenticated=False,
            )

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    definitions = {
        "online_probe": {
            "id": "online_probe",
            "mode": "online_probe",
            "checks": [{"id": "online"}],
        },
        "general_def": {
            "id": "general_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo ok", "saveAs": "out"}],
            "checks": [
                {
                    "id": "general",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    }

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "definitionId": "online_probe", "enabled": True},
                    {
                        "id": "general",
                        "definitionId": "general_def",
                        "enabled": True,
                        "manualOnly": True,
                        "runAtConnection": True,
                    },
                ],
            }
        },
        test_definitions_by_id=definitions,
        check_definitions_by_id={
            "online": {"id": "online", "definitionId": "online_probe"},
            "general": {"id": "general", "definitionId": "general_def"},
        },
        auto_monitor=False,
    )
    fake_shell = FakeShell()

    class FakeRunContext:
        def run_command(self, command: str, timeout_sec: float | None = None, sudo_password: str | None = None):
            return fake_shell.run_automation_command(command, timeout_sec or 12.0, sudo_password=sudo_password)

        def close(self):
            return None

        def metadata_payload(self):
            return {
                "timing": {"queueMs": 0, "connectMs": 0, "executeMs": 0, "totalMs": 0},
                "session": {
                    "runId": "manual-run",
                    "robotId": "r1",
                    "pageSessionId": "manual-session",
                    "runKind": "test",
                    "transportReused": True,
                    "resetPolicy": "run_scoped_shell",
                },
            }

    manager._executor._create_automation_run_context = lambda **_kwargs: FakeRunContext()
    manager.probe_transport = lambda **_kwargs: type(
        "_Probe",
        (),
        {"reused": False, "queue_ms": 0, "connect_ms": 1, "probe_ms": 1},
    )()

    results = manager.run_tests(
        robot_id="r1",
        page_session_id="manual-session",
        test_ids=["general"],
        dry_run=False,
    )
    assert any(result.get("id") == "general" and result.get("status") == "ok" for result in results)

    runtime = manager.get_runtime_tests("r1")
    assert runtime["general"]["status"] == "ok"
    assert runtime["general"]["source"] == "manual"
    assert runtime["online"]["status"] == "ok"
    assert runtime["online"]["source"] == "manual"
    activity = manager.get_runtime_activity("r1")
    assert float(activity["lastFullTestAt"]) > 0
    assert activity["lastFullTestSource"] == "manual"


def test_partial_manual_run_does_not_update_last_full_test_activity(monkeypatch):
    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            if command == "echo general":
                return "ok"
            if command == "echo battery":
                return "ok"
            return ""

        def run_automation_command(self, command, timeout, sudo_password=None):
            _ = sudo_password
            return AutomationCommandResult(
                output=self.run_command(command, timeout),
                exit_code=0,
                timed_out=False,
                used_sudo=False,
                sudo_authenticated=False,
            )

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    definitions = {
        "online_probe": {
            "id": "online_probe",
            "mode": "online_probe",
            "checks": [{"id": "online"}],
        },
        "general_def": {
            "id": "general_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo general", "saveAs": "out"}],
            "checks": [
                {
                    "id": "general",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
        "battery_def": {
            "id": "battery_def",
            "mode": "orchestrate",
            "execute": [{"id": "s2", "command": "echo battery", "saveAs": "out"}],
            "checks": [
                {
                    "id": "battery",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    }

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "definitionId": "online_probe", "enabled": True},
                    {
                        "id": "general",
                        "definitionId": "general_def",
                        "enabled": True,
                        "manualOnly": True,
                        "runAtConnection": True,
                    },
                    {
                        "id": "battery",
                        "definitionId": "battery_def",
                        "enabled": True,
                        "manualOnly": True,
                        "runAtConnection": True,
                    },
                ],
            }
        },
        test_definitions_by_id=definitions,
        check_definitions_by_id={
            "online": {"id": "online", "definitionId": "online_probe"},
            "general": {"id": "general", "definitionId": "general_def"},
            "battery": {"id": "battery", "definitionId": "battery_def"},
        },
        auto_monitor=False,
    )

    manager.run_tests(
        robot_id="r1",
        page_session_id="manual-session",
        test_ids=["general"],
        dry_run=False,
    )

    activity = manager.get_runtime_activity("r1")
    assert activity["lastFullTestAt"] == 0.0
    assert activity["lastFullTestSource"] is None


def test_apply_online_probe_sets_non_online_results_to_warning():
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "enabled": True},
                    {"id": "battery", "enabled": True},
                    {"id": "general", "enabled": True},
                ],
            }
        },
        auto_monitor=False,
    )
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "connected",
                "checkedAt": 10.0,
                "source": "manual",
            },
            "battery": {
                "status": "ok",
                "value": "88%",
                "details": "stable",
                "checkedAt": 10.0,
                "source": "manual",
            },
            "general": {
                "status": "ok",
                "value": "healthy",
                "details": "stable",
                "checkedAt": 10.0,
                "source": "manual",
            },
        },
    )

    transition = manager.apply_online_probe_to_runtime(
        robot_id="r1",
        probe={
            "status": "error",
            "value": "unreachable",
            "details": "network down",
            "checkedAt": 20.0,
            "source": "live",
        },
        source="live",
    )
    assert transition["previousOnlineStatus"] == "ok"
    assert transition["wasOnline"] is True
    assert transition["isOnline"] is False

    runtime = manager.get_runtime_tests("r1")
    assert runtime["online"]["status"] == "error"
    assert runtime["online"]["source"] == "live"
    assert runtime["battery"]["status"] == "warning"
    assert runtime["battery"]["value"] == "unknown"
    assert runtime["battery"]["reason"] == "OFFLINE_STALE"
    assert runtime["general"]["status"] == "warning"
    assert runtime["general"]["value"] == "unknown"
    assert runtime["general"]["reason"] == "OFFLINE_STALE"


def test_monitor_config_defaults_and_update():
    manager = _manager()
    default_config = manager.get_monitor_config()
    assert default_config["mode"] == "online_battery"
    assert default_config["topicsIntervalSec"] == 30.0
    assert default_config["parallelism"] == manager.MONITOR_PARALLELISM_DEFAULT

    updated = manager.update_monitor_config(
        mode="online_battery_topics",
        topics_interval_sec=45.0,
        parallelism=12,
    )
    assert updated["mode"] == "online_battery_topics"
    assert updated["topicsIntervalSec"] == 45.0
    assert updated["parallelism"] == 12


def test_monitor_config_clamps_interval_and_parallelism_bounds():
    manager = _manager()
    updated = manager.update_monitor_config(
        topics_interval_sec=999.0,
        online_interval_sec=0.01,
        battery_interval_sec=999.0,
        parallelism=999,
    )
    assert updated["topicsIntervalSec"] == manager.TOPICS_INTERVAL_MAX_SEC
    assert updated["onlineIntervalSec"] == manager.ONLINE_INTERVAL_MIN_SEC
    assert updated["batteryIntervalSec"] == manager.BATTERY_INTERVAL_MAX_SEC
    assert updated["parallelism"] == manager.MONITOR_PARALLELISM_MAX


def test_runtime_snapshot_since_tracks_versioned_updates_and_clears():
    manager = _manager()
    initial = manager.get_runtime_snapshot_since(0)
    assert initial["version"] == 0
    assert initial["robots"] == []

    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "first",
                "source": "manual",
                "checkedAt": 10.0,
            }
        },
    )
    after_update = manager.get_runtime_snapshot_since(0)
    assert after_update["version"] > 0
    assert after_update["robots"][0]["id"] == "r1"
    assert after_update["robots"][0]["tests"]["online"]["status"] == "ok"

    since_current = manager.get_runtime_snapshot_since(after_update["version"])
    assert since_current["full"] is False
    assert since_current["robots"] == []

    manager.reload_definitions(
        robots_by_id={},
        robot_types_by_id={},
        command_primitives_by_id={},
        test_definitions_by_id={},
        check_definitions_by_id={},
        fix_definitions_by_id={},
    )
    cleared = manager.get_runtime_snapshot_since(after_update["version"])
    assert cleared["version"] > after_update["version"]
    assert any(
        robot["id"] == "r1"
        and robot["tests"] == {}
        and robot["activity"]["searching"] is False
        and robot["activity"]["testing"] is False
        for robot in cleared["robots"]
    )


def test_auto_monitor_topics_mode_runs_topic_snapshot_on_interval(monkeypatch):
    observed = {"commands": []}

    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            observed["commands"].append(command)
            if "rostopic list" in command:
                return "/buttons\n/diagnostics\n/imu\n/joint_states\n/pose\n/rosout\n/rosout_agg\n/tf\n/tf_static\n/cmd_ser\n/cmd_vel\n/odom\n/odom/wheel\n/set_pose\n/velocity\n/scan\n/range/fl\n/range/fr\n/range/rl\n/range/rr\n/camera/color/camera_info\n/camera/color/image_raw\n/camera/depth/camera_info\n/camera/depth/image_raw\n/camera/depth/points\n/camera/depth_registered/points\n/camera/extrinsic/depth_to_color\n/camera/ir/camera_info\n/camera/ir/image_raw\n/camera/reset_device\n"
            return "percentage: 0.82\nvoltage: 12.61\n"

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {
                        "id": "general",
                        "definitionRef": "tests/ros_tests/topics.json",
                        "requiredTopics": ["/buttons"],
                        "enabled": True,
                    }
                ],
            }
        },
        auto_monitor=False,
    )
    monkeypatch.setattr(
        manager,
        "probe_transport",
        lambda **_kwargs: type("_Probe", (), {"reused": False, "queue_ms": 0, "connect_ms": 1, "probe_ms": 1})(),
    )
    manager.update_monitor_config(mode="online_battery_topics", topics_interval_sec=30.0)

    manager._run_auto_monitor_tick()
    manager._run_auto_monitor_tick()

    topic_calls = [command for command in observed["commands"] if "rostopic list" in command]
    assert len(topic_calls) == 1

    runtime = manager.get_runtime_tests("r1")
    assert runtime["general"]["status"] == "ok"
    assert runtime["general"]["source"] == "auto-monitor-topics"


def test_runtime_updates_ignore_stale_checked_at():
    manager = _manager()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "newest payload",
                "checkedAt": 200.0,
                "source": "manual",
            }
        },
    )
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "error",
                "value": "unreachable",
                "details": "stale payload",
                "checkedAt": 100.0,
                "source": "auto-monitor",
            }
        },
    )

    runtime = manager.get_runtime_tests("r1")
    assert runtime["online"]["status"] == "ok"
    assert runtime["online"]["details"] == "newest payload"
    assert runtime["online"]["checkedAt"] == 200.0


def test_runtime_updates_use_source_priority_for_equal_checked_at():
    manager = _manager()
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "warning",
                "value": "unknown",
                "details": "topics snapshot",
                "checkedAt": 300.0,
                "source": "auto-monitor-topics",
            }
        },
    )
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "error",
                "value": "unreachable",
                "details": "plain monitor update",
                "checkedAt": 300.0,
                "source": "auto-monitor",
            }
        },
    )
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "manual update",
                "checkedAt": 300.0,
                "source": "manual",
            }
        },
    )

    runtime = manager.get_runtime_tests("r1")
    assert runtime["online"]["status"] == "ok"
    assert runtime["online"]["details"] == "manual update"
    assert runtime["online"]["source"] == "manual"


def test_auto_monitor_defers_when_recent_manual_activity(monkeypatch):
    observed = {"connect_calls": 0, "commands": []}

    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            observed["connect_calls"] += 1

        def close(self):
            return None

        def run_command(self, command, timeout):
            _ = timeout
            observed["commands"].append(command)
            return "percentage: 0.55\nvoltage: 12.10\n"

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = _manager()
    assert manager.start_test_run("r1", "manual-session") is True
    manager.finish_test_run("r1", "manual-session")

    manager._run_auto_monitor_tick()

    runtime = manager.get_runtime_tests("r1")
    assert runtime == {}
    assert observed["connect_calls"] == 0
    assert observed["commands"] == []


def test_connection_retry_attempt_uses_dedicated_auto_monitor_test_session():
    manager = _connection_retry_manager()
    observed = {}

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        observed["robot_id"] = robot_id
        observed["page_session_id"] = page_session_id
        observed["test_ids"] = list(test_ids or [])
        observed["dry_run"] = dry_run
        return [{"id": "general", "status": "ok", "value": "ok", "details": "ok", "ms": 1}]

    manager._executor.run_tests = fake_run_tests

    results = manager._run_connection_retry_attempt(
        robot_id="r1",
        test_ids=["general"],
        source="auto-monitor",
    )

    assert observed == {
        "robot_id": "r1",
        "page_session_id": manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID,
        "test_ids": ["general"],
        "dry_run": False,
    }
    assert results[0]["status"] == "ok"


def test_auto_monitor_test_session_does_not_cancel_connection_retry_session(monkeypatch):
    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            return None

        def close(self):
            return None

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = _connection_retry_manager()
    with manager._lock:
        manager._connection_retry_sessions["r1"] = {
            "token": 1,
            "connectedAt": time.time(),
            "cancelled": False,
        }

    manager.get_or_connect(page_session_id=manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, robot_id="r1")

    with manager._lock:
        assert manager._connection_retry_sessions["r1"]["cancelled"] is False


def test_auto_monitor_skips_battery_and_topics_while_connection_retry_is_inflight():
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "enabled": True},
                    {
                        "id": "topics_check",
                        "enabled": True,
                        "requiredTopics": ["/buttons"],
                    },
                ],
                "autoMonitor": {
                    "batteryCommand": "custom battery probe",
                },
            }
        },
        auto_monitor=False,
    )
    manager.update_monitor_config(mode="online_battery_topics")
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "ok",
                "value": "reachable",
                "details": "online",
                "checkedAt": time.time(),
                "source": "auto-monitor",
            }
        },
    )
    manager._online_next_check_at["r1"] = time.time() + 60.0
    manager._battery_next_check_at["r1"] = 0.0
    manager._topics_next_check_at["r1"] = 0.0

    calls = {"battery": 0, "topics": 0}
    manager._refresh_battery_state = lambda _robot_id: calls.__setitem__("battery", calls["battery"] + 1)
    manager._refresh_topics_state = lambda _robot_id: calls.__setitem__("topics", calls["topics"] + 1)
    manager._connection_retry_inflight["r1"] = 1

    manager._run_auto_monitor_tick()

    assert calls == {"battery": 0, "topics": 0}


def test_connection_retry_inflight_counts_as_busy_for_manual_runs():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.2

    with manager._lock:
        manager._connection_retry_sessions["r1"] = {
            "token": 1,
            "connectedAt": time.time(),
            "cancelled": False,
        }
    manager._connection_retry_inflight["r1"] = 1

    closed_sessions: list[tuple[str, str]] = []
    original_close_session = manager.close_session

    def close_session(page_session_id: str, robot_id: str) -> None:
        closed_sessions.append((page_session_id, robot_id))
        original_close_session(page_session_id=page_session_id, robot_id=robot_id)

    manager.close_session = close_session

    def release_retry() -> None:
        time.sleep(0.03)
        with manager._lock:
            manager._connection_retry_inflight.pop("r1", None)

    threading.Thread(target=release_retry, daemon=True).start()

    assert manager.is_robot_busy("r1") is True
    assert manager.start_search_run("r1") is True
    with manager._lock:
        assert "r1" in manager._active_search_runs
        assert manager._connection_retry_sessions["r1"]["cancelled"] is True
    assert closed_sessions == [(manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, "r1")]


def test_start_test_run_cancels_connection_retry_for_manual_takeover():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.2

    with manager._lock:
        manager._connection_retry_sessions["r1"] = {
            "token": 1,
            "connectedAt": time.time(),
            "cancelled": False,
        }
        manager._connection_retry_inflight["r1"] = 1

    closed_sessions: list[tuple[str, str]] = []
    original_close_session = manager.close_session

    def close_session(page_session_id: str, robot_id: str) -> None:
        closed_sessions.append((page_session_id, robot_id))
        original_close_session(page_session_id=page_session_id, robot_id=robot_id)

    manager.close_session = close_session

    def release_retry() -> None:
        time.sleep(0.03)
        with manager._lock:
            manager._connection_retry_inflight.pop("r1", None)

    threading.Thread(target=release_retry, daemon=True).start()

    assert manager.start_test_run("r1", "manual-session") is True
    with manager._lock:
        session = manager._connection_retry_sessions["r1"]
        assert session["cancelled"] is True
        assert ("r1", "manual-session") in manager._active_test_runs
    assert closed_sessions == [(manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, "r1")]


def test_start_test_run_rejects_when_connection_retry_takeover_times_out():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.01

    with manager._lock:
        manager._connection_retry_sessions["r1"] = {
            "token": 1,
            "connectedAt": time.time(),
            "cancelled": False,
        }
        manager._connection_retry_inflight["r1"] = 1
        manager._connection_retry_attempt_owner["r1"] = 1

    manager.close_session = lambda *_args, **_kwargs: None

    assert manager.start_test_run("r1", "manual-session") is False
    with manager._lock:
        assert ("r1", "manual-session") not in manager._active_test_runs
        assert manager._connection_retry_sessions["r1"]["cancelled"] is True


def test_start_test_run_cancels_auto_recovery_for_manual_takeover():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.2

    with manager._lock:
        manager._auto_recovery_test_inflight.add("r1")

    closed_sessions: list[tuple[str, str]] = []
    original_close_session = manager.close_session

    def close_session(page_session_id: str, robot_id: str) -> None:
        closed_sessions.append((page_session_id, robot_id))
        original_close_session(page_session_id=page_session_id, robot_id=robot_id)

    manager.close_session = close_session

    def release_recovery() -> None:
        time.sleep(0.03)
        with manager._lock:
            manager._auto_recovery_test_inflight.discard("r1")

    threading.Thread(target=release_recovery, daemon=True).start()

    assert manager.start_test_run("r1", "manual-session") is True
    with manager._lock:
        assert ("r1", "manual-session") in manager._active_test_runs
        assert "r1" not in manager._auto_recovery_cancel_requested
    assert closed_sessions == [(manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, "r1")]


def test_start_test_run_rejects_same_robot_across_different_sessions():
    manager = _manager()

    assert manager.start_test_run("r1", "session-a") is True
    assert manager.start_test_run("r1", "session-b") is False

    manager.finish_test_run("r1", "session-a")

    assert manager.start_test_run("r1", "session-b") is True


def test_auto_monitor_emits_connected_event_only_on_offline_to_online_transition():
    manager = _manager()
    manager._refresh_battery_state = lambda _robot_id: None

    probes = iter(
        [
            {
                "status": "error",
                "value": "unreachable",
                "details": "offline",
                "ms": 1,
                "checkedAt": 1.0,
                "source": "live",
            },
            {
                "status": "ok",
                "value": "reachable",
                "details": "online",
                "ms": 1,
                "checkedAt": 2.0,
                "source": "live",
            },
        ]
    )

    manager.check_online = lambda *_args, **_kwargs: next(probes)
    calls = []
    manager._emit_connection_event_connected = lambda robot_id, connected_at=None: calls.append((robot_id, connected_at))

    manager._run_auto_monitor_tick()  # First observed state: offline (no transition yet)
    manager._online_next_check_at["r1"] = 0.0
    manager._run_auto_monitor_tick()  # Offline -> online transition
    manager._run_auto_monitor_tick()  # Already online, no additional trigger

    assert len(calls) == 1
    assert calls[0][0] == "r1"
    assert isinstance(calls[0][1], float)


def test_auto_monitor_emits_connected_event_on_unknown_to_online_transition():
    manager = _manager()
    manager._refresh_battery_state = lambda _robot_id: None

    manager.check_online = lambda *_args, **_kwargs: {
        "status": "ok",
        "value": "reachable",
        "details": "online",
        "ms": 1,
        "checkedAt": time.time(),
        "source": "live",
    }
    calls = []
    manager._emit_connection_event_connected = lambda robot_id, connected_at=None: calls.append((robot_id, connected_at))

    manager._run_auto_monitor_tick()

    assert len(calls) == 1
    assert calls[0][0] == "r1"
    assert isinstance(calls[0][1], float)


def test_auto_recovery_tests_hold_testing_state_for_min_visibility(monkeypatch):
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "enabled": True},
                    {"id": "general", "enabled": True},
                ],
            }
        },
        auto_monitor=False,
    )

    sleep_calls: list[float] = []
    monkeypatch.setattr("backend.terminal_manager.test_runner.time.time", lambda: 1000.0)
    monkeypatch.setattr(
        "backend.terminal_manager.test_runner.time.sleep",
        lambda seconds: sleep_calls.append(float(seconds)),
    )

    manager._executor.run_tests = lambda **_kwargs: [
        {
            "id": "general",
            "status": "ok",
            "value": "all_present",
            "details": "All required topics present",
            "ms": 5,
        }
    ]

    manager._run_auto_recovery_tests("r1")

    deadline = time.time() + 1.0
    while time.time() < deadline:
        with manager._lock:
            inflight = "r1" in manager._auto_recovery_test_inflight
        if not inflight:
            break
        time.sleep(0.01)

    with manager._lock:
        inflight_after = "r1" in manager._auto_recovery_test_inflight
    assert inflight_after is False
    assert sleep_calls
    assert sleep_calls[0] >= manager.AUTO_ACTIVITY_MIN_VISIBLE_SEC

    runtime = manager.get_runtime_tests("r1")
    assert runtime["general"]["status"] == "ok"

    activity = manager.get_runtime_activity("r1")
    assert activity["testing"] is False


def test_auto_monitor_tick_uses_parallel_workers_from_monitor_parallelism():
    manager = TerminalManager(
        robots_by_id={
            "r1": {"id": "r1", "type": "rosbot-2-pro", "ip": "10.0.0.1", "ssh": {"username": "u", "password": "p", "port": 22}},
            "r2": {"id": "r2", "type": "rosbot-2-pro", "ip": "10.0.0.2", "ssh": {"username": "u", "password": "p", "port": 22}},
            "r3": {"id": "r3", "type": "rosbot-2-pro", "ip": "10.0.0.3", "ssh": {"username": "u", "password": "p", "port": 22}},
            "r4": {"id": "r4", "type": "rosbot-2-pro", "ip": "10.0.0.4", "ssh": {"username": "u", "password": "p", "port": 22}},
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
        auto_monitor=False,
    )
    manager.update_monitor_config(parallelism=4)
    seen_thread_ids: set[int] = set()

    def fake_check_online(*_args, **_kwargs):
        seen_thread_ids.add(threading.get_ident())
        time.sleep(0.05)
        return {
            "status": "error",
            "value": "unreachable",
            "details": "offline",
            "ms": 1,
            "checkedAt": time.time(),
            "source": "live",
        }

    manager.check_online = fake_check_online
    manager._run_auto_monitor_tick()

    assert len(seen_thread_ids) > 1


def test_auto_monitor_tick_times_out_pending_parallel_future_and_recovers(caplog):
    manager = TerminalManager(
        robots_by_id={
            "r1": {"id": "r1", "type": "rosbot-2-pro", "ip": "10.0.0.1", "ssh": {"username": "u", "password": "p", "port": 22}},
            "r2": {"id": "r2", "type": "rosbot-2-pro", "ip": "10.0.0.2", "ssh": {"username": "u", "password": "p", "port": 22}},
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
        auto_monitor=False,
    )
    manager.update_monitor_config(parallelism=2)
    manager._auto_monitor_enabled = True
    manager._auto_monitor_tick_timeout_sec = lambda: 0.02

    from concurrent.futures import Future

    class FakeExecutor:
        def submit(self, _fn, robot_id, _now):
            future = Future()
            if robot_id == "r1":
                future.set_result(None)
            return future

    manager._ensure_auto_monitor_executor = lambda _worker_count: FakeExecutor()
    shutdown_calls: list[float] = []
    manager._shutdown_auto_monitor_executor = lambda: shutdown_calls.append(time.time())

    caplog.set_level("WARNING")

    started_first = time.time()
    manager._run_auto_monitor_tick()
    elapsed_first = time.time() - started_first

    started_second = time.time()
    manager._run_auto_monitor_tick()
    elapsed_second = time.time() - started_second

    assert elapsed_first < 0.3
    assert elapsed_second < 0.3
    assert len(shutdown_calls) == 2
    assert "Auto-monitor tick timeout" in caplog.text
    assert "r2" in caplog.text


def test_auto_monitor_tick_logs_parallel_robot_future_failures(caplog):
    manager = TerminalManager(
        robots_by_id={
            "r1": {"id": "r1", "type": "rosbot-2-pro", "ip": "10.0.0.1", "ssh": {"username": "u", "password": "p", "port": 22}},
            "r2": {"id": "r2", "type": "rosbot-2-pro", "ip": "10.0.0.2", "ssh": {"username": "u", "password": "p", "port": 22}},
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
        auto_monitor=False,
    )
    manager.update_monitor_config(parallelism=2)
    manager._auto_monitor_enabled = True

    from concurrent.futures import Future

    class FakeExecutor:
        def submit(self, _fn, robot_id, _now):
            future = Future()
            if robot_id == "r2":
                future.set_exception(RuntimeError("boom"))
            else:
                future.set_result(None)
            return future

    manager._ensure_auto_monitor_executor = lambda _worker_count: FakeExecutor()
    caplog.set_level("ERROR")

    manager._run_auto_monitor_tick()

    assert "phase=run_auto_monitor_tick_parallel" in caplog.text
    assert "robot_id=r2" in caplog.text


def test_auto_monitor_loop_logs_tick_exception(caplog):
    manager = _manager()

    def raise_and_stop():
        manager._auto_monitor_stop.set()
        raise RuntimeError("tick failed")

    manager._run_auto_monitor_tick = raise_and_stop
    caplog.set_level("ERROR")

    manager._auto_monitor_loop()

    assert "Auto-monitor loop failure" in caplog.text
    assert "phase=auto_monitor_loop_tick" in caplog.text


def test_refresh_battery_state_sanitizes_carriage_returns_in_configured_command():
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [{"id": "online", "enabled": True}, {"id": "battery", "enabled": True}],
                "autoMonitor": {
                    "batteryCommand": "source /opt/ros/jazzy/setup.bash >/dev/null 2>&1 || true; \\\r\n"
                    "source ~/ws/install/setup.bash >/dev/null 2>&1 || true; \\\r\n"
                    "timeout 6s ros2 topic echo --once /battery\r",
                },
            }
        },
        auto_monitor=False,
    )

    captured_commands: list[str] = []

    def fake_run_command(*, page_session_id: str, robot_id: str, command: str, timeout_sec: float | None = None, source: str | None = None):
        _ = page_session_id, robot_id, timeout_sec, source
        captured_commands.append(command)
        return "percentage: 0.66\nvoltage: 12.10\n"

    manager.run_command = fake_run_command

    manager._refresh_battery_state("r1")

    assert captured_commands
    assert "\r" not in captured_commands[0]


def test_auto_monitor_skips_online_probe_while_auto_testing_active():
    manager = _manager()
    manager._set_runtime_activity("r1", testing=True, phase="full_test_after_recovery")
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "warning",
                "value": "unknown",
                "details": "pending",
                "checkedAt": time.time(),
                "source": "auto-monitor",
            }
        },
    )

    observed = {"check_calls": 0}

    def fake_check_online(*_args, **_kwargs):
        observed["check_calls"] += 1
        return {
            "status": "ok",
            "value": "reachable",
            "details": "online",
            "ms": 1,
            "checkedAt": time.time(),
            "source": "live",
        }

    manager.check_online = fake_check_online
    manager._run_auto_monitor_tick()

    assert observed["check_calls"] == 0


def test_auto_monitor_keeps_online_probe_running_during_connection_retry_phase():
    manager = _connection_retry_manager()
    manager._set_runtime_activity("r1", testing=True, phase="connection_retry")
    manager._record_runtime_tests(
        "r1",
        {
            "online": {
                "status": "warning",
                "value": "unknown",
                "details": "pending",
                "checkedAt": time.time(),
                "source": "auto-monitor",
            }
        },
    )
    manager._connection_retry_inflight["r1"] = 1

    observed = {"check_calls": 0}

    def fake_check_online(*_args, **_kwargs):
        observed["check_calls"] += 1
        return {
            "status": "ok",
            "value": "reachable",
            "details": "online",
            "ms": 1,
            "checkedAt": time.time(),
            "source": "live",
        }

    manager.check_online = fake_check_online
    manager._run_auto_monitor_tick()

    assert observed["check_calls"] == 1


def test_auto_monitor_skips_checks_while_search_run_active():
    manager = _manager()
    manager.start_search_run("r1")
    observed = {"check_calls": 0}

    def fake_check_online(*_args, **_kwargs):
        observed["check_calls"] += 1
        return {
            "status": "ok",
            "value": "reachable",
            "details": "online",
            "ms": 1,
            "checkedAt": time.time(),
            "source": "live",
        }

    manager.check_online = fake_check_online
    manager._run_auto_monitor_tick()
    manager.finish_search_run("r1")

    assert observed["check_calls"] == 0


def test_auto_monitor_skips_checks_while_fix_run_active():
    manager = _manager()
    manager.start_fix_run("r1")
    observed = {"check_calls": 0}

    def fake_check_online(*_args, **_kwargs):
        observed["check_calls"] += 1
        return {
            "status": "ok",
            "value": "reachable",
            "details": "online",
            "ms": 1,
            "checkedAt": time.time(),
            "source": "live",
        }

    manager.check_online = fake_check_online
    manager._run_auto_monitor_tick()
    manager.finish_fix_run("r1")

    assert observed["check_calls"] == 0


def _connection_retry_manager() -> TerminalManager:
    return TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {"id": "online", "enabled": True, "runAtConnection": False},
                    {"id": "general", "enabled": True, "runAtConnection": True},
                ],
            }
        },
        auto_monitor=False,
    )


def test_connection_event_runner_retries_until_selected_tests_pass():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.01
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.2

    attempts: list[int] = []
    results = [
        [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}],
        [{"id": "general", "status": "ok", "value": "present", "details": "ok", "ms": 1}],
    ]

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        attempts.append(len(attempts) + 1)
        return results.pop(0) if results else [{"id": "general", "status": "ok"}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())

    deadline = time.time() + 1.0
    while time.time() < deadline:
        with manager._lock:
            inflight = "r1" in manager._connection_retry_inflight
        if not inflight:
            break
        time.sleep(0.01)

    assert attempts == [1, 2]
    with manager._lock:
        assert "r1" not in manager._connection_retry_inflight


def test_connection_event_runner_keeps_retry_activity_visible_between_attempts():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.08
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.25
    manager.AUTO_ACTIVITY_MIN_VISIBLE_SEC = 0.0

    first_attempt_started = threading.Event()

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        first_attempt_started.set()
        return [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())

    assert first_attempt_started.wait(1.0) is True
    time.sleep(0.03)
    activity = manager.get_runtime_activity("r1")
    assert activity["testing"] is True
    assert activity["phase"] == manager.ACTIVITY_PHASE_CONNECTION_RETRY

    manager._emit_connection_event_manual_activity("r1")
    deadline = time.time() + 1.0
    while time.time() < deadline:
        with manager._lock:
            inflight = "r1" in manager._connection_retry_inflight
        if not inflight:
            break
        time.sleep(0.01)


def test_connection_event_runner_cancels_on_manual_activity():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.05
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.5

    attempts: list[int] = []

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        attempts.append(len(attempts) + 1)
        return [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())

    deadline = time.time() + 1.0
    while time.time() < deadline and not attempts:
        time.sleep(0.01)

    manager._emit_connection_event_manual_activity("r1")
    attempts_after_cancel = len(attempts)
    time.sleep(0.2)
    assert len(attempts) == attempts_after_cancel


def test_connection_event_runner_stops_retrying_when_manual_test_is_active():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.02
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.5

    attempts: list[int] = []

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        attempts.append(len(attempts) + 1)
        with manager._lock:
            manager._active_test_runs.add(("r1", "manual-session"))
        return [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())

    deadline = time.time() + 1.0
    while time.time() < deadline:
        with manager._lock:
            inflight = "r1" in manager._connection_retry_inflight
        if not inflight:
            break
        time.sleep(0.01)

    assert attempts == [1]
    with manager._lock:
        assert "r1" not in manager._connection_retry_inflight


def test_connection_event_runner_cancels_on_disconnect():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.05
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.5

    attempts: list[int] = []

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        attempts.append(len(attempts) + 1)
        return [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())

    deadline = time.time() + 1.0
    while time.time() < deadline and not attempts:
        time.sleep(0.01)

    manager._emit_connection_event_disconnected("r1")
    attempts_after_cancel = len(attempts)
    time.sleep(0.2)
    assert len(attempts) == attempts_after_cancel


def test_connection_event_runner_reconnect_replaces_prior_token():
    manager = _connection_retry_manager()
    manager.CONNECTION_RETRY_INTERVAL_SEC = 0.05
    manager.CONNECTION_RETRY_WINDOW_SEC = 0.5

    active_attempts = 0
    max_active_attempts = 0
    lock = threading.Lock()

    def fake_attempt(*, robot_id, test_ids, source="auto-monitor", phase=None, manage_runtime_activity=True, should_commit=None):
        _ = robot_id, test_ids, source, phase, manage_runtime_activity, should_commit
        nonlocal active_attempts, max_active_attempts
        with lock:
            active_attempts += 1
            max_active_attempts = max(max_active_attempts, active_attempts)
        time.sleep(0.06)
        with lock:
            active_attempts -= 1
        return [{"id": "general", "status": "error", "value": "missing", "details": "missing", "ms": 1}]

    manager._run_connection_retry_attempt = fake_attempt
    manager._emit_connection_event_connected("r1", connected_at=time.time())
    with manager._lock:
        first_token = int((manager._connection_retry_sessions.get("r1") or {}).get("token", 0))

    time.sleep(0.01)
    manager._emit_connection_event_connected("r1", connected_at=time.time())
    with manager._lock:
        second_token = int((manager._connection_retry_sessions.get("r1") or {}).get("token", 0))
        inflight_token = int(manager._connection_retry_inflight.get("r1", 0))

    assert second_token > first_token
    assert inflight_token == second_token

    deadline = time.time() + 1.0
    while time.time() < deadline:
        with manager._lock:
            inflight = "r1" in manager._connection_retry_inflight
        if not inflight:
            break
        time.sleep(0.01)
    assert max_active_attempts == 1


def test_connection_retry_attempt_returns_explicit_error_results_on_executor_failure():
    manager = _connection_retry_manager()

    def fail_run_tests(**_kwargs):
        raise RuntimeError("retry explosion")

    manager._executor.run_tests = fail_run_tests

    results = manager._run_connection_retry_attempt(
        robot_id="r1",
        test_ids=["general"],
        source="auto-monitor",
    )

    assert results == [
        {
            "id": "general",
            "status": "error",
            "value": "execution_error",
            "details": "retry explosion",
            "ms": 0,
            "steps": [],
        }
    ]
