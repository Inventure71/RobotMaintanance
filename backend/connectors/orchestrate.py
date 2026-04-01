from __future__ import annotations

from typing import Any, Callable

from ..terminal_manager.job_scheduler.cancel import JobInterrupted
from .read import ReadConnector
from .write import CommandExecutionError, WriteConnector


class OrchestrationExecutionError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        steps: list[dict[str, Any]] | None = None,
        commands_executed: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.steps = list(steps or [])
        self.commands_executed = list(commands_executed or [])


class OrchestrateConnector:
    def __init__(self, *, read: ReadConnector, write: WriteConnector):
        self._read = read
        self._write = write

    @staticmethod
    def _normalize_result_branch(raw: dict[str, Any] | None, *, default_status: str) -> dict[str, str]:
        payload = raw if isinstance(raw, dict) else {}
        return {
            "status": str(payload.get("status") or default_status).strip() or default_status,
            "value": str(payload.get("value") or "n/a").strip() or "n/a",
            "details": str(payload.get("details") or "No detail available").strip() or "No detail available",
        }

    def run_definition(
        self,
        definition: dict[str, Any],
        *,
        run_scope: str,
        run_command: Callable[[str, float | None], Any],
        params: dict[str, Any] | None = None,
        dry_run: bool = False,
        emit_event: Callable[[str, str, dict[str, Any] | None], None] | None = None,
        command_cache: dict[str, str] | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> dict[str, Any]:
        execute_steps = definition.get("execute") if isinstance(definition.get("execute"), list) else []
        checks = definition.get("checks") if isinstance(definition.get("checks"), list) else []

        vars_payload: dict[str, Any] = dict(params or {})
        steps: list[dict[str, Any]] = []
        commands_executed: list[dict[str, Any]] = []
        check_results: dict[str, dict[str, Any]] = {}
        cache = command_cache if isinstance(command_cache, dict) else {}

        if dry_run:
            for check in checks:
                if not isinstance(check, dict):
                    continue
                check_id = str(check.get("id") or "").strip()
                if not check_id:
                    continue
                check_results[check_id] = {
                    "status": "warning",
                    "value": "pending",
                    "details": "Dry-run mode: execution skipped.",
                    "ms": 0,
                }
            return {
                "steps": steps,
                "commandsExecuted": commands_executed,
                "checkResults": check_results,
                "vars": vars_payload,
            }

        for index, raw_step in enumerate(execute_steps):
            if callable(should_cancel) and bool(should_cancel()):
                raise JobInterrupted("Execution interrupted before step execution.")
            if not isinstance(raw_step, dict):
                continue
            step = dict(raw_step)
            if "id" not in step:
                step["id"] = f"step-{index + 1}"

            try:
                result = self._write.execute_step(
                    step=step,
                    vars_payload=vars_payload,
                    run_scope=run_scope,
                    command_cache=cache,
                    run_command=run_command,
                )
                step_record = result.get("step") if isinstance(result.get("step"), dict) else {}
                cmd_record = result.get("command") if isinstance(result.get("command"), dict) else {}
                steps.append(step_record)
                commands_executed.append(cmd_record)
                if callable(emit_event):
                    emit_event(
                        "step_executed",
                        f"Executed step '{step_record.get('id', step.get('id'))}'.",
                        {
                            "step": step_record,
                            "command": cmd_record,
                        },
                    )
            except JobInterrupted:
                if callable(emit_event):
                    emit_event(
                        "step_interrupted",
                        f"Step '{step.get('id')}' interrupted.",
                        {"stepId": step.get("id")},
                    )
                raise
            except Exception as exc:
                error_output = ""
                error_ms = 0
                error_step = {
                    "id": str(step.get("id") or f"step-{index + 1}"),
                    "status": "error",
                    "value": "command_error",
                    "details": str(exc),
                    "ms": 0,
                    "output": "",
                }
                if isinstance(exc, CommandExecutionError):
                    error_output = str(exc.output or "")
                    error_ms = max(0, int(exc.duration_ms))
                    error_step["ms"] = error_ms
                    error_step["output"] = error_output
                steps.append(error_step)
                if isinstance(exc, CommandExecutionError):
                    commands_executed.append(
                        {
                            "id": error_step["id"],
                            "command": exc.command,
                            "timeoutSec": exc.timeout_sec,
                            "output": error_output,
                            "exitCode": exc.exit_code,
                            "ok": False,
                            "durationMs": error_ms,
                            "usedCache": False,
                        }
                    )
                if callable(emit_event):
                    emit_event(
                        "step_failed",
                        f"Step '{error_step['id']}' failed: {exc}",
                        {"step": error_step},
                    )
                raise OrchestrationExecutionError(
                    str(exc),
                    steps=steps,
                    commands_executed=commands_executed,
                ) from exc

        for raw_check in checks:
            if callable(should_cancel) and bool(should_cancel()):
                raise JobInterrupted("Execution interrupted before check evaluation.")
            if not isinstance(raw_check, dict):
                continue
            check_id = str(raw_check.get("id") or "").strip()
            if not check_id:
                continue
            read_spec = raw_check.get("read") if isinstance(raw_check.get("read"), dict) else {}

            evaluation = self._read.evaluate(read_spec, vars_payload)
            passed = bool(evaluation.get("passed"))
            chosen = self._normalize_result_branch(
                raw_check.get("pass") if passed else raw_check.get("fail"),
                default_status="ok" if passed else "error",
            )
            check_results[check_id] = {
                "status": chosen["status"],
                "value": chosen["value"],
                "details": chosen["details"],
                "ms": 0,
                "read": evaluation,
            }
            if callable(emit_event):
                emit_event(
                    "check_evaluated",
                    f"Check '{check_id}' {'passed' if passed else 'failed'}.",
                    {
                        "checkId": check_id,
                        "passed": passed,
                        "result": check_results[check_id],
                    },
                )

        return {
            "steps": steps,
            "commandsExecuted": commands_executed,
            "checkResults": check_results,
            "vars": vars_payload,
        }
