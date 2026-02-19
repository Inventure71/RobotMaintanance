from __future__ import annotations

from backend.test_executor import TestExecutor


def test_run_tests_reuses_rostopic_list_output_across_tests():
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
                "definitionRef": "tests/ros_tests/topics.json",
                "requiredTopics": ["/scan"],
                "manualOnly": True,
                "enabled": True,
            },
            {
                "id": "movement",
                "definitionRef": "tests/ros_tests/topics.json",
                "requiredTopics": ["/cmd_vel", "/odom"],
                "manualOnly": True,
                "enabled": True,
            },
        ],
    }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda page_session_id, robot_id: fake_shell,
        close_session=lambda page_session_id, robot_id: close_calls.append((page_session_id, robot_id)),
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["general", "movement"],
    )

    rostopic_calls = [command for command in observed_commands if "rostopic list" in command]
    assert len(rostopic_calls) == 2
    assert len(results) == 2
    assert all(any(step["id"] == "list_topics" and step["status"] == "ok" for step in result.get("steps", [])) for result in results)
    assert close_calls == [("page-1", "r1")]
