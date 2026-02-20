from __future__ import annotations

from backend.connectors import OrchestrateConnector, ReadConnector, WriteConnector
from backend.test_executor import TestExecutor


def test_run_tests_reuses_rostopic_list_output_across_checks_in_same_definition():
    observed_commands: list[str] = []

    class FakeShell:
        def run_command(self, command: str, timeout: float = 0.0) -> str:
            _ = timeout
            observed_commands.append(command)
            if "rostopic list" in command:
                return "/scan\n/cmd_vel\n/odom\n"
            return ""

    fake_shell = FakeShell()
    close_calls: list[tuple[str, str]] = []
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "general",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
            {
                "id": "movement",
                "definitionId": "topics_snapshot",
                "manualOnly": True,
                "enabled": True,
            },
        ],
    }

    definitions = {
        "topics_snapshot": {
            "id": "topics_snapshot",
            "mode": "orchestrate",
            "execute": [
                {
                    "id": "list_topics",
                    "command": "timeout 12s rostopic list",
                    "reuseKey": "rostopic_list",
                    "saveAs": "topics_raw",
                }
            ],
            "checks": [
                {
                    "id": "general",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/scan"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "all_present", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                },
                {
                    "id": "movement",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/cmd_vel", "/odom"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "all_present", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                },
            ],
        }
    }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda _page_session_id, _robot_id: fake_shell,
        close_session=lambda page_session_id, robot_id: close_calls.append((page_session_id, robot_id)),
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        test_definitions_by_id=definitions,
        check_definitions_by_id={
            "general": {"id": "general", "definitionId": "topics_snapshot"},
            "movement": {"id": "movement", "definitionId": "topics_snapshot"},
        },
        orchestrate_connector=OrchestrateConnector(read=ReadConnector(), write=WriteConnector({})),
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["general", "movement"],
    )

    rostopic_calls = [command for command in observed_commands if "rostopic list" in command]
    assert len(rostopic_calls) == 1
    assert len(results) == 2
    assert all(result["status"] == "ok" for result in results)
    assert close_calls == [("page-1", "r1")]
