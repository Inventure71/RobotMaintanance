from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend.connectors import OrchestrateConnector, ReadConnector, WriteConnector
from backend.test_executor import TestExecutor


class _FakeShell:
    def __init__(self, responses: dict[str, str] | None = None):
        self.responses = responses or {}
        self.commands: list[str] = []

    def run_command(self, command: str, timeout: float = 0.0) -> str:
        _ = timeout
        self.commands.append(command)
        return self.responses.get(command, "")


def _executor_for_tests(robot_type: dict[str, object], shell: _FakeShell, *, definitions: dict[str, dict]) -> TestExecutor:
    check_defs = {}
    for definition_id, definition in definitions.items():
        for check in definition.get("checks") or []:
            if isinstance(check, dict) and check.get("id"):
                check_defs[str(check["id"])] = {"id": str(check["id"]), "definitionId": definition_id}

    return TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        get_or_connect=lambda _page_session_id, _robot_id: shell,
        close_session=lambda _page_session_id, _robot_id: None,
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        test_definitions_by_id=definitions,
        check_definitions_by_id=check_defs,
        orchestrate_connector=OrchestrateConnector(read=ReadConnector(), write=WriteConnector({})),
    )


def test_definition_load_failure_is_isolated_to_its_test():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "definitionId": "good_def",
                "manualOnly": True,
                "enabled": True,
            },
            {
                "id": "broken",
                "definitionId": "missing_def",
                "manualOnly": True,
                "enabled": True,
            },
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    definitions = {
        "good_def": {
            "id": "good_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo ok", "saveAs": "out"}],
            "checks": [
                {
                    "id": "good",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["good", "broken"])
    by_id = {result["id"]: result for result in results}

    assert by_id["good"]["status"] == "ok"
    assert by_id["broken"]["status"] == "error"
    assert by_id["broken"]["errorCode"] == "definition_not_found"
    assert by_id["broken"]["source"] == "resolver"


def test_missing_output_is_reported_as_definition_output_missing():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "missing-output",
                "definitionId": "bad_def",
                "manualOnly": True,
                "enabled": True,
            }
        ],
    }
    shell = _FakeShell({"echo x": "x"})
    definitions = {
        "bad_def": {
            "id": "bad_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo x", "saveAs": "out"}],
            "checks": [
                {
                    "id": "other-check",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "x"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["missing-output"])
    assert results[0]["status"] == "error"
    assert results[0]["errorCode"] == "definition_output_missing"


def test_mixed_valid_and_invalid_test_ids_return_partial_results():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "definitionId": "good_def",
                "manualOnly": True,
                "enabled": True,
            }
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    definitions = {
        "good_def": {
            "id": "good_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo ok", "saveAs": "out"}],
            "checks": [
                {
                    "id": "good",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

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
                "definitionId": "good_def",
                "manualOnly": True,
                "enabled": True,
            }
        ],
    }
    shell = _FakeShell({"echo ok": "ok"})
    definitions = {
        "good_def": {
            "id": "good_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo ok", "saveAs": "out"}],
            "checks": [
                {
                    "id": "good",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

    with pytest.raises(HTTPException) as exc_info:
        executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["missing"])
    assert exc_info.value.status_code == 400


def test_contains_string_fail_is_stable_and_explicit():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "string-check",
                "definitionId": "string_def",
                "manualOnly": True,
                "enabled": True,
            }
        ],
    }
    shell = _FakeShell({"echo value": "value"})
    definitions = {
        "string_def": {
            "id": "string_def",
            "mode": "orchestrate",
            "execute": [{"id": "s1", "command": "echo value", "saveAs": "out"}],
            "checks": [
                {
                    "id": "string-check",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "missing"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=["string-check"])
    assert results[0]["status"] == "error"
    assert results[0]["value"] == "missing"
