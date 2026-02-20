from __future__ import annotations

import time
import uuid
from typing import Any, Callable

from fastapi import HTTPException

from .connectors import OrchestrateConnector, ReadConnector, WriteConnector
from .normalization import normalize_status, normalize_text
from .ssh_client import InteractiveShell


class TestExecutor:
    RESOLVER_SOURCE = "resolver"

    def __init__(
        self,
        robot_types_by_id: dict[str, dict[str, Any]],
        resolve_robot_type: Callable[[str], dict[str, Any]],
        resolve_credentials: Callable[[str], tuple[str, str, str, int]],
        get_or_connect: Callable[[str, str], InteractiveShell],
        close_session: Callable[[str, str], None],
        check_online: Callable[[str], dict[str, Any]],
        test_definitions_by_id: dict[str, dict[str, Any]] | None = None,
        check_definitions_by_id: dict[str, dict[str, Any]] | None = None,
        orchestrate_connector: OrchestrateConnector | None = None,
    ):
        self.robot_types_by_id = robot_types_by_id
        self._resolve_robot_type = resolve_robot_type
        self._resolve_credentials = resolve_credentials
        self._get_or_connect = get_or_connect
        self._close_session = close_session
        self._check_online = check_online
        self._test_definitions_by_id = test_definitions_by_id or {}
        self._check_definitions_by_id = check_definitions_by_id or {}
        self._orchestrate = orchestrate_connector or OrchestrateConnector(
            read=ReadConnector(),
            write=WriteConnector({}),
        )

    def _build_error_result(
        self,
        *,
        test_id: str,
        value: str,
        details: str,
        error_code: str,
        source: str = RESOLVER_SOURCE,
    ) -> dict[str, Any]:
        return {
            "id": normalize_text(test_id, "test"),
            "status": "error",
            "value": normalize_text(value, "execution_error"),
            "details": normalize_text(details, "Test resolution failed."),
            "errorCode": normalize_text(error_code, "resolution_error"),
            "source": normalize_text(source, self.RESOLVER_SOURCE),
            "ms": 0,
            "steps": [],
        }

    def _resolve_tests(
        self,
        robot_id: str,
        test_ids: list[str] | None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") or []
        if not isinstance(test_entries, list):
            return [], [], []

        requested_ids: list[str] = []
        requested: set[str] = set()
        for test_id in (test_ids or []):
            normalized_test_id = normalize_text(test_id, "")
            if not normalized_test_id or normalized_test_id in requested:
                continue
            requested.add(normalized_test_id)
            requested_ids.append(normalized_test_id)

        resolved: list[dict[str, Any]] = []
        resolution_errors: list[dict[str, Any]] = []
        matched_requested: set[str] = set()

        for entry in test_entries:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id:
                continue

            if requested:
                if test_id not in requested:
                    continue
                matched_requested.add(test_id)
            else:
                if entry.get("manualOnly", True) is False:
                    continue

            if entry.get("enabled", True) is False:
                continue

            definition_id = normalize_text(entry.get("definitionId"), "")
            if not definition_id:
                resolution_errors.append(
                    self._build_error_result(
                        test_id=test_id,
                        value="invalid_definition",
                        details="Test has no definitionId configured.",
                        error_code="definition_not_set",
                    )
                )
                continue

            if definition_id not in self._test_definitions_by_id:
                resolution_errors.append(
                    self._build_error_result(
                        test_id=test_id,
                        value="invalid_definition",
                        details=f"No test definition found for id '{definition_id}'.",
                        error_code="definition_not_found",
                    )
                )
                continue

            merged = dict(entry)
            merged["id"] = test_id
            merged["definitionId"] = definition_id
            merged["params"] = dict(merged.get("params") if isinstance(merged.get("params"), dict) else {})
            resolved.append(merged)

        unknown_requested = [test_id for test_id in requested_ids if test_id not in matched_requested]
        return resolved, resolution_errors, unknown_requested

    def _run_online_test(self, robot_id: str) -> dict[str, Any]:
        result = self._check_online(robot_id)
        status = normalize_status(result.get("status"))
        details = normalize_text(result.get("details"), "No detail available")
        ms = int(result.get("ms") or 0)
        value = normalize_text(result.get("value"), "reachable" if status == "ok" else "unreachable")

        return {
            "id": "online",
            "status": status,
            "value": value,
            "details": details,
            "ms": ms,
            "checkedAt": result.get("checkedAt"),
            "source": normalize_text(result.get("source"), "live"),
            "steps": [
                {
                    "id": "connect",
                    "status": status,
                    "value": "connected" if status == "ok" else "connect_failed",
                    "details": details,
                    "ms": ms,
                    "output": "",
                }
            ],
        }

    def _normalize_check_output_result(
        self,
        *,
        test_spec: dict[str, Any],
        output_payload: dict[str, Any],
        steps: list[dict[str, Any]],
        definition_id: str,
        shared_execution_id: str,
        total_ms: int,
    ) -> dict[str, Any]:
        test_id = normalize_text(test_spec.get("id"), "test")
        status = normalize_status(output_payload.get("status"))
        value = normalize_text(output_payload.get("value"), normalize_text(test_spec.get("defaultValue"), "n/a"))
        details = normalize_text(
            output_payload.get("details"), normalize_text(test_spec.get("defaultDetails"), "No detail available")
        )
        ms = int(output_payload.get("ms") or total_ms)

        normalized_steps = []
        for step in steps:
            if not isinstance(step, dict):
                continue
            normalized_steps.append(
                {
                    "id": normalize_text(step.get("id"), "step"),
                    "status": normalize_status(step.get("status")),
                    "value": normalize_text(step.get("value"), "n/a"),
                    "details": normalize_text(step.get("details"), "No detail available"),
                    "ms": int(step.get("ms") or 0),
                    "output": step.get("output", ""),
                }
            )

        return {
            "id": test_id,
            "status": status,
            "value": value,
            "details": details,
            "ms": ms,
            "raw": {
                "definitionId": definition_id,
                "sharedExecutionId": shared_execution_id,
                "orchestrationRunId": shared_execution_id,
                "stepCount": len(normalized_steps),
            },
            "steps": normalized_steps,
        }

    def _execute_definition_once(
        self,
        *,
        robot_id: str,
        page_session_id: str,
        definition_id: str,
        check_specs: list[dict[str, Any]],
        dry_run: bool,
        command_output_cache: dict[str, str],
        run_scope: str,
    ) -> dict[str, Any]:
        definition = self._test_definitions_by_id.get(definition_id)
        if not isinstance(definition, dict):
            raise HTTPException(status_code=400, detail=f"Unknown definition '{definition_id}'")

        mode = normalize_text(definition.get("mode"), "orchestrate")
        shared_execution_id = f"def-{definition_id}-{uuid.uuid4().hex[:8]}"

        if mode == "online_probe":
            check_ids = [normalize_text(check.get("id"), "") for check in (definition.get("checks") or []) if isinstance(check, dict)]
            check_ids = [check_id for check_id in check_ids if check_id]
            if dry_run:
                outputs = {
                    check_id: {
                        "status": "warning",
                        "value": "pending",
                        "details": "Dry-run mode: online check skipped.",
                        "ms": 0,
                    }
                    for check_id in check_ids
                }
                return {
                    "outputs": outputs,
                    "steps": [],
                    "sharedExecutionId": shared_execution_id,
                    "ms": 0,
                }

            online_result = self._run_online_test(robot_id)
            outputs = {
                check_id: {
                    "status": online_result.get("status"),
                    "value": online_result.get("value"),
                    "details": online_result.get("details"),
                    "ms": online_result.get("ms"),
                }
                for check_id in check_ids
            }
            return {
                "outputs": outputs,
                "steps": list(online_result.get("steps") or []),
                "sharedExecutionId": shared_execution_id,
                "ms": int(online_result.get("ms") or 0),
            }

        shell = self._get_or_connect(page_session_id, robot_id)
        started = int(time.time() * 1000)

        merged_params: dict[str, Any] = {}
        definition_params = definition.get("params") if isinstance(definition.get("params"), dict) else {}
        merged_params.update(definition_params)
        if len(check_specs) == 1:
            one_params = check_specs[0].get("params") if isinstance(check_specs[0].get("params"), dict) else {}
            merged_params.update(one_params)
        merged_params["requestedCheckIds"] = [normalize_text(item.get("id"), "") for item in check_specs]

        def _run_command(command: str, timeout_sec: float | None) -> str:
            self._resolve_credentials(robot_id)
            timeout = timeout_sec if timeout_sec is not None else 12.0
            return shell.run_command(command, timeout=float(timeout))

        orchestrated = self._orchestrate.run_definition(
            definition,
            run_scope=f"{run_scope}:{definition_id}",
            run_command=_run_command,
            params=merged_params,
            dry_run=dry_run,
            command_cache=command_output_cache,
        )
        total_ms = max(0, int(time.time() * 1000 - started))

        return {
            "outputs": orchestrated.get("checkResults") if isinstance(orchestrated.get("checkResults"), dict) else {},
            "steps": orchestrated.get("steps") if isinstance(orchestrated.get("steps"), list) else [],
            "sharedExecutionId": shared_execution_id,
            "ms": total_ms,
        }

    def run_tests(
        self,
        robot_id: str,
        page_session_id: str,
        test_ids: list[str] | None = None,
        dry_run: bool = False,
    ) -> list[dict[str, Any]]:
        tests, resolution_errors, unknown_requested = self._resolve_tests(robot_id, test_ids)
        if test_ids and not tests:
            raise HTTPException(status_code=400, detail="No matching tests found for this robot type.")
        if not tests and not resolution_errors:
            raise HTTPException(status_code=400, detail="No manual tests available for this robot type.")

        results: list[dict[str, Any]] = []
        for unknown_test_id in unknown_requested:
            results.append(
                self._build_error_result(
                    test_id=unknown_test_id,
                    value="invalid_test_id",
                    details=f"Requested test id '{unknown_test_id}' is not configured for this robot type.",
                    error_code="invalid_test_id",
                )
            )
        results.extend(resolution_errors)

        command_output_cache: dict[str, str] = {}
        run_scope = f"{robot_id}:{page_session_id}:{int(time.time() * 1000)}"

        definition_groups: dict[str, list[dict[str, Any]]] = {}
        for spec in tests:
            definition_id = normalize_text(spec.get("definitionId"), "")
            if definition_id:
                definition_groups.setdefault(definition_id, []).append(spec)

        try:
            for definition_id, grouped_specs in definition_groups.items():
                try:
                    execution = self._execute_definition_once(
                        robot_id=robot_id,
                        page_session_id=page_session_id,
                        definition_id=definition_id,
                        check_specs=grouped_specs,
                        dry_run=dry_run,
                        command_output_cache=command_output_cache,
                        run_scope=run_scope,
                    )
                except HTTPException as exc:
                    for spec in grouped_specs:
                        results.append(
                            {
                                "id": normalize_text(spec.get("id"), "test"),
                                "status": "error",
                                "value": "execution_error",
                                "details": exc.detail,
                                "errorCode": "execution_error",
                                "source": "executor",
                                "ms": 0,
                                "steps": [],
                            }
                        )
                    continue
                except Exception as exc:
                    for spec in grouped_specs:
                        results.append(
                            {
                                "id": normalize_text(spec.get("id"), "test"),
                                "status": "error",
                                "value": "execution_error",
                                "details": f"Test execution failed: {exc}",
                                "errorCode": "execution_error",
                                "source": "executor",
                                "ms": 0,
                                "steps": [],
                            }
                        )
                    continue

                outputs = execution.get("outputs") if isinstance(execution.get("outputs"), dict) else {}
                steps = execution.get("steps") if isinstance(execution.get("steps"), list) else []
                shared_execution_id = normalize_text(
                    execution.get("sharedExecutionId"),
                    f"def-{definition_id}-{uuid.uuid4().hex[:8]}",
                )
                total_ms = int(execution.get("ms") or 0)

                for spec in grouped_specs:
                    test_id = normalize_text(spec.get("id"), "test")
                    payload = outputs.get(test_id)
                    if not isinstance(payload, dict):
                        results.append(
                            self._build_error_result(
                                test_id=test_id,
                                value="missing_output",
                                details=f"Definition '{definition_id}' did not emit output '{test_id}'.",
                                error_code="definition_output_missing",
                                source="executor",
                            )
                        )
                        continue
                    results.append(
                        self._normalize_check_output_result(
                            test_spec=spec,
                            output_payload=payload,
                            steps=steps,
                            definition_id=definition_id,
                            shared_execution_id=shared_execution_id,
                            total_ms=total_ms,
                        )
                    )
        finally:
            self._close_session(page_session_id, robot_id)

        return results
