from __future__ import annotations

import threading
import time

from backend.terminal_manager import TerminalManager
import backend.terminal_manager as tm_module


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
    assert "12.61V" in result["details"]


def test_parse_battery_output_falls_back_to_voltage_scale_when_percentage_zero():
    manager = _manager()
    result = manager._parse_battery_output(
        "percentage: 0.0\nvoltage: 12.06\n",
        elapsed_ms=10,
    )

    assert result["status"] == "ok"
    assert result["value"] == "70%"
    assert "estimated from voltage" in result["details"]


def test_parse_battery_output_marks_dying_voltage_as_zero_percent():
    manager = _manager()
    result = manager._parse_battery_output(
        "percentage: 0.0\nvoltage: 10.8\n",
        elapsed_ms=10,
    )

    assert result["status"] == "error"
    assert result["value"] == "0%"


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

    manager = _manager()
    manager._run_auto_monitor_tick()
    runtime = manager.get_runtime_tests("r1")

    assert runtime["online"]["status"] == "ok"
    assert runtime["battery"]["value"] == "75%"
    assert len(observed["commands"]) == 1
    assert "/battery" in observed["commands"][0]
    assert observed["connect_calls"] == 2


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

    manager._run_auto_monitor_tick()
    assert observed["commands"] == ["custom battery probe"]


def test_auto_monitor_marks_robot_offline_when_battery_command_fails(monkeypatch):
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

    manager = _manager()
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

    assert runtime["online"]["status"] == "error"
    assert runtime["online"]["value"] == "unreachable"
    assert runtime["battery"]["status"] == "error"
    assert runtime["battery"]["value"] == "unavailable"


def test_monitor_config_defaults_and_update():
    manager = _manager()
    default_config = manager.get_monitor_config()
    assert default_config["mode"] == "online_battery"
    assert default_config["topicsIntervalSec"] == 30.0
    assert default_config["parallelism"] == 8

    updated = manager.update_monitor_config(
        mode="online_battery_topics",
        topics_interval_sec=45.0,
        parallelism=12,
    )
    assert updated["mode"] == "online_battery_topics"
    assert updated["topicsIntervalSec"] == 45.0
    assert updated["parallelism"] == 12


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


def test_auto_monitor_triggers_recovery_tests_only_on_offline_to_online_transition():
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
    manager._run_auto_recovery_tests = lambda robot_id: calls.append(robot_id)

    manager._run_auto_monitor_tick()  # First observed state: offline (no transition yet)
    manager._online_next_check_at["r1"] = 0.0
    manager._run_auto_monitor_tick()  # Offline -> online transition
    manager._run_auto_monitor_tick()  # Already online, no additional trigger

    assert calls == ["r1"]


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
