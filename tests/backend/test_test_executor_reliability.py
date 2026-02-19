from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend.test_executor import TestExecutor


class _FakeShell:
    def __init__(self, responses: dict[str, str] | None = None):
        self.responses = responses or {}
        self.commands: list[str] = []

    def run_command(self, command: str, timeout: float = 0.0) -> str:
        _ = timeout
        self.commands.append(command)
        return self.responses.get(command, "")


def _executor_for_tests(robot_type: dict[str, object], shell: _FakeShell) -> TestExecutor:
    return TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda _page_session_id, _robot_id: shell,
        close_session=lambda _page_session_id, _robot_id: None,
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
    )


def test_definition_load_failure_is_isolated_to_its_test():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "manualOnly": True,
                "enabled": True,
                "steps": [{"id": "s1", "command": "echo ok"}],
            },
            {
                "id": "broken",
                "manualOnly": True,
                "enabled": True,
                "definitionRef": "tests/ros_tests/does_not_exist.json",
            },
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    executor = _executor_for_tests(robot_type, shell)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["good", "broken"])
    by_id = {result["id"]: result for result in results}

    assert by_id["good"]["status"] == "ok"
    assert by_id["broken"]["status"] == "error"
    assert by_id["broken"]["errorCode"] == "definition_load_error"
    assert by_id["broken"]["source"] == "resolver"


def test_empty_output_policy_error_turns_empty_output_into_failure():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "empty-fails",
                "manualOnly": True,
                "enabled": True,
                "emptyOutputPolicy": "error",
                "steps": [{"id": "s1", "command": "echo nothing"}],
            }
        ],
    }
    shell = _FakeShell({"echo nothing": ""})
    executor = _executor_for_tests(robot_type, shell)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["empty-fails"])
    assert results[0]["status"] == "error"
    assert results[0]["value"] == "empty"
    assert results[0]["steps"][0]["status"] == "error"


def test_mixed_valid_and_invalid_test_ids_return_partial_results():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "manualOnly": True,
                "enabled": True,
                "steps": [{"id": "s1", "command": "echo ok"}],
            }
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    executor = _executor_for_tests(robot_type, shell)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["good", "missing"])
    by_id = {result["id"]: result for result in results}

    assert by_id["good"]["status"] == "ok"
    assert by_id["missing"]["status"] == "error"
    assert by_id["missing"]["errorCode"] == "invalid_test_id"
    assert by_id["missing"]["source"] == "resolver"


def test_all_invalid_test_ids_keep_http_400_behavior():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "manualOnly": True,
                "enabled": True,
                "steps": [{"id": "s1", "command": "echo ok"}],
            }
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    executor = _executor_for_tests(robot_type, shell)

    with pytest.raises(HTTPException) as exc_info:
        executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["missing"])
    assert exc_info.value.status_code == 400


def test_json_parse_error_is_stable_and_explicit():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "json-step",
                "manualOnly": True,
                "enabled": True,
                "steps": [
                    {
                        "id": "parse",
                        "command": "bad-json",
                        "parser": {"type": "json"},
                    }
                ],
            }
        ],
    }
    shell = _FakeShell({"bad-json": "not-json"})
    executor = _executor_for_tests(robot_type, shell)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["json-step"])
    assert results[0]["status"] == "error"
    assert results[0]["steps"][0]["value"] == "parse_error"
