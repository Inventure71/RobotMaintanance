from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend.connectors import OrchestrateConnector, ReadConnector, WriteConnector
from backend.ssh_client import AutomationCommandResult
from backend.test_executor import TestExecutor


class _FakeShell:
    def __init__(self, responses: dict[str, str] | None = None):
        self.responses = responses or {}
        self.commands: list[str] = []

    def run_automation_command(
        self,
        command: str,
        timeout: float = 0.0,
        sudo_password: str | None = None,
    ) -> AutomationCommandResult:
        _ = timeout
        _ = sudo_password
        self.commands.append(command)
        return AutomationCommandResult(
            output=self.responses.get(command, ""),
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )


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
                        "runAtConnection": True,
                "enabled": True,
            },
            {
                "id": "broken",
                "definitionId": "missing_def",
                "manualOnly": True,
                        "runAtConnection": True,
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
                        "runAtConnection": True,
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
                        "runAtConnection": True,
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
                        "runAtConnection": True,
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
                        "runAtConnection": True,
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
    assert results[0]["read"]["kind"] == "contains_string"
    assert results[0]["read"]["passed"] is False
    assert results[0]["read"]["details"] == "Substring not found."
    assert results[0]["read"]["missing"] == ["missing"]


def test_run_tests_without_explicit_ids_executes_all_enabled_mapped_tests():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "online",
                "definitionId": "online_probe",
                "manualOnly": False,
                "runAtConnection": False,
                "enabled": True,
            },
            {
                "id": "automatic-health",
                "definitionId": "auto_def",
                "manualOnly": False,
                "runAtConnection": True,
                "enabled": True,
            },
            {
                "id": "manual-health",
                "definitionId": "manual_def",
                "manualOnly": True,
                "runAtConnection": False,
                "enabled": True,
            },
            {
                "id": "disabled-check",
                "definitionId": "disabled_def",
                "manualOnly": True,
                "runAtConnection": True,
                "enabled": False,
            },
        ],
    }
    shell = _FakeShell(
        {
            "echo auto": "auto",
            "echo manual": "manual",
        }
    )
    definitions = {
        "online_probe": {
            "id": "online_probe",
            "mode": "online_probe",
            "checks": [{"id": "online"}],
        },
        "auto_def": {
            "id": "auto_def",
            "mode": "orchestrate",
            "execute": [{"id": "auto", "command": "echo auto", "saveAs": "out"}],
            "checks": [
                {
                    "id": "automatic-health",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "auto"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
        "manual_def": {
            "id": "manual_def",
            "mode": "orchestrate",
            "execute": [{"id": "manual", "command": "echo manual", "saveAs": "out"}],
            "checks": [
                {
                    "id": "manual-health",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "manual"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
        "disabled_def": {
            "id": "disabled_def",
            "mode": "orchestrate",
            "execute": [{"id": "disabled", "command": "echo disabled", "saveAs": "out"}],
            "checks": [
                {
                    "id": "disabled-check",
                    "read": {"kind": "contains_string", "inputRef": "out", "needle": "disabled"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    }
    executor = _executor_for_tests(robot_type, shell, definitions=definitions)

    results = executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=None)

    by_id = {result["id"]: result for result in results}
    assert set(by_id) == {"online", "automatic-health", "manual-health"}
    assert all(result["status"] == "ok" for result in results)
    assert shell.commands == ["echo auto", "echo manual"]


def test_explicit_empty_test_ids_raise_no_tests_selected():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "good",
                "definitionId": "good_def",
                "manualOnly": True,
                "runAtConnection": True,
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
        executor.run_tests(robot_id="r1", page_session_id="page-1", test_ids=[])
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "No tests selected."


def test_run_tests_isolates_shell_state_between_definitions():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "persistence",
                "definitionId": "test_persistence",
                "manualOnly": True,
                "runAtConnection": True,
                "enabled": True,
            },
            {
                "id": "folder-check",
                "definitionId": "test_test",
                "manualOnly": True,
                "runAtConnection": True,
                "enabled": True,
            },
        ],
    }
    definitions = {
        "test_persistence": {
            "id": "test_persistence",
            "mode": "orchestrate",
            "execute": [
                {"id": "step_1", "command": "cd hydra/"},
                {"id": "step_2", "command": "pwd", "saveAs": "persistence_pwd"},
            ],
            "checks": [
                {
                    "id": "persistence",
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "persistence_pwd",
                        "needle": "/home/husarion/hydra",
                    },
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
        "test_test": {
            "id": "test_test",
            "mode": "orchestrate",
            "execute": [{"id": "step_1", "command": "pwd", "saveAs": "folder_pwd"}],
            "checks": [
                {
                    "id": "folder-check",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "folder_pwd",
                        "lines": ["/home/husarion"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    }

    context_counter = {"value": 0}

    class FakeRunContext:
        def __init__(self):
            context_counter["value"] += 1
            self._context_id = context_counter["value"]
            self._cwd = "/home/husarion"

        def run_command(
            self,
            command: str,
            timeout_sec: float | None = None,
            sudo_password: str | None = None,
        ) -> AutomationCommandResult:
            _ = timeout_sec
            _ = sudo_password
            cmd = str(command or "").strip()
            if cmd.startswith("cd "):
                target = cmd[3:].strip().strip("'\"")
                if target.rstrip("/") == "hydra":
                    self._cwd = "/home/husarion/hydra"
                elif target in {"~", "/home/husarion"}:
                    self._cwd = "/home/husarion"
                output = ""
            elif cmd == "pwd":
                output = self._cwd
            else:
                output = ""

            return AutomationCommandResult(
                output=output,
                exit_code=0,
                timed_out=False,
                used_sudo=False,
                sudo_authenticated=False,
            )

        def close(self) -> None:
            return None

        def metadata_payload(self) -> dict[str, object]:
            return {
                "timing": {"queueMs": 0, "connectMs": 0, "executeMs": 0, "totalMs": 0},
                "session": {
                    "runId": f"definition-{self._context_id}",
                    "robotId": "r1",
                    "pageSessionId": "page-1",
                    "runKind": "test",
                    "transportReused": True,
                    "resetPolicy": "run_scoped_shell",
                },
            }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        create_automation_run_context=lambda **_kwargs: FakeRunContext(),
        test_definitions_by_id=definitions,
        check_definitions_by_id={
            "persistence": {"id": "persistence", "definitionId": "test_persistence"},
            "folder-check": {"id": "folder-check", "definitionId": "test_test"},
        },
        orchestrate_connector=OrchestrateConnector(read=ReadConnector(), write=WriteConnector({})),
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["persistence", "folder-check"],
    )
    by_id = {result["id"]: result for result in results}
    assert by_id["persistence"]["status"] == "ok"
    assert by_id["folder-check"]["status"] == "ok"
    assert context_counter["value"] == 2

    metadata = executor.get_last_run_metadata()
    assert metadata["session"]["resetPolicy"] == "definition_scoped_shell"
    assert metadata["session"]["shellCount"] == 2


def test_command_failure_preserves_step_debug_context_and_run_metadata():
    robot_type = {
        "typeId": "rosbot-2-pro",
        "tests": [
            {
                "id": "broken",
                "definitionId": "broken_def",
                "manualOnly": True,
                "runAtConnection": True,
                "enabled": True,
            }
        ],
    }
    definitions = {
        "broken_def": {
            "id": "broken_def",
            "mode": "orchestrate",
            "execute": [{"id": "fetch_topics", "command": "timeout 12s rostopic list", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "broken",
                    "read": {"kind": "contains_string", "inputRef": "topics_raw", "needle": "/battery"},
                    "pass": {"status": "ok", "value": "ok", "details": "ok"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        }
    }

    class FakeRunContext:
        def run_command(
            self,
            command: str,
            timeout_sec: float | None = None,
            sudo_password: str | None = None,
        ) -> AutomationCommandResult:
            _ = command
            _ = timeout_sec
            _ = sudo_password
            return AutomationCommandResult(
                output="rostopic: command not found",
                exit_code=1,
                timed_out=False,
                used_sudo=False,
                sudo_authenticated=False,
            )

        def close(self) -> None:
            return None

        def metadata_payload(self) -> dict[str, object]:
            return {
                "timing": {"queueMs": 2, "connectMs": 3, "executeMs": 4, "totalMs": 5},
                "session": {
                    "runId": "definition-run-1",
                    "robotId": "r1",
                    "pageSessionId": "page-1",
                    "runKind": "test",
                    "transportReused": False,
                    "resetPolicy": "run_scoped_shell",
                },
            }

    executor = TestExecutor(
        robot_types_by_id={"rosbot-2-pro": robot_type},
        resolve_robot_type=lambda _robot_id: robot_type,
        resolve_credentials=lambda _robot_id: ("10.0.0.1", "u", "p", 22),
        check_online=lambda _robot_id: {"status": "ok", "value": "reachable", "details": "ok", "ms": 1},
        create_automation_run_context=lambda **_kwargs: FakeRunContext(),
        test_definitions_by_id=definitions,
        check_definitions_by_id={"broken": {"id": "broken", "definitionId": "broken_def"}},
        orchestrate_connector=OrchestrateConnector(read=ReadConnector(), write=WriteConnector({})),
    )

    results = executor.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["broken"],
    )

    assert len(results) == 1
    result = results[0]
    assert result["status"] == "error"
    assert result["value"] == "execution_error"
    assert "Step 'fetch_topics' failed" in result["details"]
    assert "rostopic list" in result["details"]
    assert result["ms"] >= 0
    assert len(result["steps"]) == 1
    assert result["steps"][0]["id"] == "fetch_topics"
    assert result["steps"][0]["status"] == "error"
    assert result["steps"][0]["value"] == "command_error"
    assert "rostopic list" in result["steps"][0]["details"]
    assert result["steps"][0]["output"] == "rostopic: command not found"

    metadata = executor.get_last_run_metadata()
    assert metadata["runId"] == "definition-run-1"
    assert metadata["session"]["runId"] == "definition-run-1"
    assert metadata["startedAt"] > 0
    assert metadata["finishedAt"] >= metadata["startedAt"]
