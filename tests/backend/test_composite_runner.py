from __future__ import annotations

from backend.connectors import OrchestrateConnector, ReadConnector, WriteConnector
from backend.test_executor import TestExecutor


def _test_definitions():
    return {
        "topics_snapshot": {
            "id": "topics_snapshot",
            "mode": "orchestrate",
            "execute": [
                {
                    "id": "fetch",
                    "command": "timeout 12s rostopic list",
                    "saveAs": "topics_raw",
                    "reuseKey": "rostopic_list",
                }
            ],
            "checks": [
                {
                    "id": "battery",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/battery"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "all_present", "details": "Battery topic present"},
                    "fail": {"status": "error", "value": "missing", "details": "Battery topic missing"},
                },
                {
                    "id": "camera",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/camera/color/image_raw", "/camera/depth/image_raw"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "all_present", "details": "Camera topics present"},
                    "fail": {"status": "error", "value": "missing", "details": "Missing camera topics"},
                },
            ],
            "params": {},
        }
    }


def _check_definitions():
    return {
        "battery": {"id": "battery", "definitionId": "topics_snapshot"},
        "camera": {"id": "camera", "definitionId": "topics_snapshot"},
    }


def _orchestrate():
    return OrchestrateConnector(read=ReadConnector(), write=WriteConnector({}))


def test_composite_runner_executes_once_for_multiple_checks():
    observed_commands: list[str] = []

    class FakeShell:
        def run_command(self, command: str, timeout: float = 0.0) -> str:
            _ = timeout
            observed_commands.append(command)
            return "/battery\n/camera/color/image_raw\n/camera/depth/image_raw\n"

    fake_shell = FakeShell()
    close_calls: list[tuple[str, str]] = []
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "battery",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
            {
                "id": "camera",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
        ],
    }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda _page_session_id, _robot_id: fake_shell,
        close_session=lambda page_session_id, robot_id: close_calls.append((page_session_id, robot_id)),
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        test_definitions_by_id=_test_definitions(),
        check_definitions_by_id=_check_definitions(),
        orchestrate_connector=_orchestrate(),
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["battery", "camera"],
    )

    rostopic_calls = [command for command in observed_commands if "rostopic list" in command]
    assert len(rostopic_calls) == 1
    assert len(results) == 2
    by_id = {item["id"]: item for item in results}
    assert by_id["battery"]["status"] == "ok"
    assert by_id["camera"]["status"] == "ok"
    assert by_id["battery"]["raw"]["sharedExecutionId"] == by_id["camera"]["raw"]["sharedExecutionId"]
    assert close_calls == [("page-1", "r1")]


def test_composite_runner_executes_parent_for_single_subcheck_request():
    observed_commands: list[str] = []

    class FakeShell:
        def run_command(self, command: str, timeout: float = 0.0) -> str:
            _ = timeout
            observed_commands.append(command)
            return "/battery\n"

    fake_shell = FakeShell()
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "battery",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
            {
                "id": "camera",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
        ],
    }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda _page_session_id, _robot_id: fake_shell,
        close_session=lambda _page_session_id, _robot_id: None,
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        test_definitions_by_id=_test_definitions(),
        check_definitions_by_id=_check_definitions(),
        orchestrate_connector=_orchestrate(),
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["battery"],
    )

    assert len([command for command in observed_commands if "rostopic list" in command]) == 1
    assert len(results) == 1
    assert results[0]["id"] == "battery"
