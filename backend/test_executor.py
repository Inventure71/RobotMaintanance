from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Callable

from fastapi import HTTPException

from .config_loader import PROJECT_ROOT, TEST_DEFINITIONS_DIR, load_json_file
from .models import StepResult
from .normalization import (
    normalize_status,
    normalize_text,
    safe_float,
    safe_int,
    strip_ansi,
    to_bool,
)
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
    ):
        self.robot_types_by_id = robot_types_by_id
        self._resolve_robot_type = resolve_robot_type
        self._resolve_credentials = resolve_credentials
        self._get_or_connect = get_or_connect
        self._close_session = close_session
        self._check_online = check_online
        self._test_definition_cache: dict[str, dict[str, Any]] = {}

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

    def _scoped_cache_key(self, run_scope: str, test_id: str, step_id: str, reuse_output_key: str) -> str:
        return f"{run_scope}:{test_id}:{step_id}:{reuse_output_key}"

    def _load_test_definition(self, definition_ref: str) -> dict[str, Any]:
        if not normalize_text(definition_ref):
            return {}

        ref_path = Path(definition_ref)
        candidates = [
            (TEST_DEFINITIONS_DIR / definition_ref),
            (PROJECT_ROOT / definition_ref),
            (ref_path if ref_path.is_absolute() else None),
        ]

        definition = None
        for candidate in candidates:
            if candidate is None:
                continue
            if candidate.exists():
                candidate = candidate.resolve()
                cached = self._test_definition_cache.get(str(candidate))
                if cached is not None:
                    definition = cached
                    break
                definition = load_json_file(candidate)
                if isinstance(definition, dict):
                    self._test_definition_cache[str(candidate)] = definition
                break

        if not isinstance(definition, dict):
            raise HTTPException(
                status_code=400,
                detail=f"Unable to load test definition from '{definition_ref}'",
            )

        return definition

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

            definition_ref = normalize_text(entry.get("definitionRef"), "")
            file_definition: dict[str, Any] = {}
            if definition_ref:
                try:
                    file_definition = self._load_test_definition(definition_ref)
                except HTTPException as exc:
                    resolution_errors.append(
                        self._build_error_result(
                            test_id=test_id,
                            value="invalid_definition",
                            details=normalize_text(exc.detail, "Unable to load referenced test definition."),
                            error_code="definition_load_error",
                        )
                    )
                    continue

            merged = {**file_definition, **entry}
            merged["id"] = test_id

            if test_id == "topics" and not merged.get("requiredTopics"):
                merged["requiredTopics"] = list(robot_type.get("topics") or [])

            resolved.append(merged)

        unknown_requested = [test_id for test_id in requested_ids if test_id not in matched_requested]
        return resolved, resolution_errors, unknown_requested

    def _run_online_test(self, robot_id: str) -> dict[str, Any]:
        result = self._check_online(robot_id)
        status = normalize_status(result.get("status"))
        details = normalize_text(result.get("details"), "No detail available")
        ms = safe_int(result.get("ms"), 0)
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

    def _parse_topics_presence(
        self,
        raw_output: str,
        expected_topics: list[str],
        namespace: str = "",
    ) -> StepResult:
        output_lines = []
        for line in strip_ansi(raw_output).replace("\r", "").split("\n"):
            candidate = line.strip()
            if not candidate:
                continue
            if candidate.startswith("/"):
                output_lines.append(candidate)

        present = sorted({line for line in output_lines})
        expected = sorted({normalize_text(topic, "") for topic in (expected_topics or []) if normalize_text(topic, "")})
        expected_namespace = normalize_text(namespace, "")
        if expected_namespace and not expected_namespace.startswith("/"):
            expected_namespace = f"/{expected_namespace}"

        matched_by_namespace: dict[str, str] = {}
        detected_namespaces: set[str] = set()
        for topic in expected:
            if topic in present:
                continue
            for listed_topic in present:
                if not listed_topic.endswith(topic) or listed_topic == topic:
                    continue
                namespace_prefix = listed_topic[: -len(topic)]
                if namespace_prefix.endswith("/"):
                    namespace_prefix = namespace_prefix[:-1]
                if not namespace_prefix.startswith("/") or namespace_prefix == "/":
                    continue
                matched_by_namespace[topic] = listed_topic
                detected_namespaces.add(namespace_prefix)
                break

        namespace_present = False
        if expected_namespace:
            namespace_present = any(
                listed_topic == expected_namespace or listed_topic.startswith(f"{expected_namespace}/")
                for listed_topic in present
            )
            if namespace_present:
                detected_namespaces.add(expected_namespace)
        if matched_by_namespace:
            namespace_present = True

        if not expected:
            return StepResult(
                id="topics_presence",
                status="warning",
                value="no_expected_topics",
                details="Robot type does not define required topics.",
                ms=0,
                output=json.dumps(
                    {
                        "expectedTopics": expected,
                        "presentTopics": present,
                        "namespace": expected_namespace,
                        "namespacePresent": namespace_present,
                        "detectedNamespaces": sorted(detected_namespaces),
                    },
                    sort_keys=True,
                ),
            )

        missing = sorted(set(expected) - set(present) - set(matched_by_namespace))
        if missing:
            details = f"Missing topics: {', '.join(missing)}"
            if detected_namespaces:
                details = f"{details}. Namespace(s) detected: {', '.join(sorted(detected_namespaces))}"
            return StepResult(
                id="topics_presence",
                status="error",
                value="missing",
                details=details,
                ms=0,
                output=json.dumps(
                    {
                        "expectedTopics": expected,
                        "presentTopics": present,
                        "missingTopics": missing,
                        "namespace": expected_namespace,
                        "namespacePresent": namespace_present,
                        "detectedNamespaces": sorted(detected_namespaces),
                        "matchedByNamespace": matched_by_namespace,
                    },
                    sort_keys=True,
                ),
            )

        details = "All required topics present"
        if detected_namespaces:
            details = f"{details}. Namespace(s) detected: {', '.join(sorted(detected_namespaces))}"
        elif expected_namespace:
            details = f"{details}. Namespace '{expected_namespace}' not found."

        return StepResult(
            id="topics_presence",
            status="ok",
            value="all_present",
            details=details,
            ms=0,
            output=json.dumps(
                {
                    "expectedTopics": expected,
                    "presentTopics": present,
                    "namespace": expected_namespace,
                    "namespacePresent": namespace_present,
                    "detectedNamespaces": sorted(detected_namespaces),
                    "matchedByNamespace": matched_by_namespace,
                },
                sort_keys=True,
            ),
        )

    def _parse_step_output(
        self,
        raw_output: str,
        parser_spec: dict[str, Any],
        test_spec: dict[str, Any],
    ) -> StepResult:
        parser_type = normalize_text(parser_spec.get("type"), "").lower()
        parser_type = parser_type if parser_type else normalize_text(test_spec.get("parser", {}).get("type"), "")
        parser_spec = parser_spec or test_spec.get("parser") or {}

        if parser_type == "topics_presence":
            return self._parse_topics_presence(
                raw_output=raw_output,
                expected_topics=list(test_spec.get("requiredTopics") or []),
                namespace=normalize_text(parser_spec.get("namespace") or test_spec.get("namespace"), ""),
            )

        cleaned = strip_ansi(raw_output).strip()
        empty_output_policy = normalize_text(
            parser_spec.get("emptyOutputPolicy") or test_spec.get("emptyOutputPolicy"),
            "warning",
        ).lower()
        if empty_output_policy not in {"warning", "error"}:
            empty_output_policy = "warning"

        if parser_type == "json":
            status_field = normalize_text(parser_spec.get("statusField"), "status")
            value_field = normalize_text(parser_spec.get("valueField"), "value")
            details_field = normalize_text(parser_spec.get("detailsField"), "details")
            try:
                payload = json.loads(cleaned)
                if isinstance(payload, str):
                    raise ValueError("String payload")
                status = normalize_status(payload.get(status_field) if isinstance(payload, dict) else "")
                value = normalize_text(payload.get(value_field) if isinstance(payload, dict) else "", "n/a")
                details = normalize_text(payload.get(details_field) if isinstance(payload, dict) else "", "No detail available")
                return StepResult(
                    id="json",
                    status=status,
                    value=value,
                    details=details,
                    ms=0,
                    output=cleaned,
                )
            except Exception:
                return StepResult(
                    id="json",
                    status="error",
                    value="parse_error",
                    details="Parser expected JSON but command output was not valid JSON.",
                    ms=0,
                    output=cleaned,
                )

        if not cleaned:
            is_error = empty_output_policy == "error"
            return StepResult(
                id="raw",
                status="error" if is_error else "warning",
                value="empty",
                details=(
                    "Step produced no output and emptyOutputPolicy is set to error."
                    if is_error
                    else "Step produced no output."
                ),
                ms=0,
                output=cleaned,
            )

        return StepResult(
            id="raw",
            status="ok",
            value="ok",
            details="Command executed.",
            ms=0,
            output=cleaned,
        )

    def _collect_step_result_value(self, step_results: list[StepResult], fallback_status: str) -> tuple[str, str]:
        if not step_results:
            return "unknown", "No step output available."

        if fallback_status == "error":
            first = next((r for r in step_results if r.status == "error"), None)
            if first:
                return first.value, first.details

        if fallback_status == "warning":
            first = next((r for r in step_results if r.status == "warning"), None)
            if first:
                return first.value, first.details

        last = step_results[-1]
        return last.value, last.details

    def _aggregate_status(self, statuses: list[str]) -> str:
        normalized = [normalize_status(s) for s in statuses]
        if "error" in normalized:
            return "error"
        if "warning" in normalized:
            return "warning"
        return "ok"

    def _run_single_test(self, robot_id: str, page_session_id: str, test_spec: dict[str, Any], dry_run: bool) -> dict[str, Any]:
        return self._run_single_test_with_cache(
            robot_id=robot_id,
            page_session_id=page_session_id,
            test_spec=test_spec,
            dry_run=dry_run,
            command_output_cache={},
            run_scope=f"{robot_id}:{page_session_id}:single",
        )

    def _run_single_test_with_cache(
        self,
        robot_id: str,
        page_session_id: str,
        test_spec: dict[str, Any],
        dry_run: bool,
        command_output_cache: dict[str, str],
        run_scope: str,
    ) -> dict[str, Any]:
        test_id = normalize_text(test_spec.get("id"), "test")
        start_ms = int(time.time() * 1000)

        if test_id == "online":
            if dry_run:
                return {
                    "id": "online",
                    "status": "warning",
                    "value": "pending",
                    "details": "Dry-run mode: online check skipped.",
                    "ms": 0,
                    "steps": [],
                }
            return self._run_online_test(robot_id=robot_id)

        if dry_run:
            return {
                "id": test_id,
                "status": "warning",
                "value": "pending",
                "details": "Dry-run mode: definition loaded, command execution skipped.",
                "ms": 0,
                "steps": [],
            }

        raw_steps = test_spec.get("steps") if isinstance(test_spec.get("steps"), list) else []
        if not raw_steps:
            return {
                "id": test_id,
                "status": "error",
                "value": "invalid_definition",
                "details": "Test has no executable steps.",
                "ms": 0,
                "steps": [],
            }

        ordered_steps = sorted(
            [step for step in raw_steps if isinstance(step, dict)],
            key=lambda step: safe_int(step.get("index"), 0),
        )

        shell = self._get_or_connect(page_session_id, robot_id)
        step_results: list[StepResult] = []

        try:
            for step in ordered_steps:
                step_id = normalize_text(step.get("id"), f"step-{len(step_results) + 1}")
                command = normalize_text(step.get("command"), "")
                timeout = safe_float(step.get("timeoutSec"), safe_float(test_spec.get("timeoutSec"), 12.0))
                reuse_output_key = normalize_text(step.get("reuseCommandOutputKey"), "")

                stop_on_failure = to_bool(step.get("stopOnFailure", test_spec.get("stopOnFailure", True)))

                if not command:
                    step_results.append(
                        StepResult(
                            id=step_id,
                            status="warning",
                            value="skipped",
                            details="Step command missing; skipping.",
                            ms=0,
                            output="",
                        )
                    )
                    if stop_on_failure:
                        break
                    continue

                try:
                    self._resolve_credentials(robot_id)
                except HTTPException as exc:
                    parsed = StepResult(
                        id=step_id,
                        status="error",
                        value="robot_unavailable",
                        details=normalize_text(exc.detail, "Robot is no longer available."),
                        ms=0,
                        output="",
                    )
                    step_results.append(parsed)
                    if stop_on_failure:
                        break
                    continue

                try:
                    step_start = int(time.time() * 1000)
                    cache_key = ""
                    if reuse_output_key:
                        cache_key = self._scoped_cache_key(
                            run_scope=run_scope,
                            test_id=test_id,
                            step_id=step_id,
                            reuse_output_key=reuse_output_key,
                        )
                    if cache_key and cache_key in command_output_cache:
                        output = command_output_cache[cache_key]
                    else:
                        output = shell.run_command(command, timeout=timeout)
                        if cache_key:
                            command_output_cache[cache_key] = output
                    parsed = self._parse_step_output(output, step.get("parser") if isinstance(step.get("parser"), dict) else {}, test_spec)
                    parsed = StepResult(
                        id=step_id,
                        status=parsed.status,
                        value=parsed.value,
                        details=parsed.details,
                        ms=max(0, int(time.time() * 1000 - step_start), 1),
                        output=parsed.output,
                    )
                    step_results.append(parsed)
                except Exception as exc:
                    parsed = StepResult(
                        id=step_id,
                        status="error",
                        value="command_error",
                        details=f"Step failed: {exc}",
                        ms=0,
                        output="",
                    )
                    step_results.append(parsed)

                if parsed.status == "error" and stop_on_failure:
                    break

            test_status = self._aggregate_status([r.status for r in step_results])
            test_value, test_details = self._collect_step_result_value(step_results, test_status)
            test_ms = max(0, int(time.time() * 1000 - start_ms))

            return {
                "id": test_id,
                "status": test_status,
                "value": test_value,
                "details": test_details,
                "ms": test_ms,
                "raw": {
                    "requiredTopics": list(test_spec.get("requiredTopics") or []),
                    "stepCount": len(step_results),
                },
                "steps": [
                    {
                        "id": result.id,
                        "status": result.status,
                        "value": result.value,
                        "details": result.details,
                        "ms": result.ms,
                        "output": result.output,
                    }
                    for result in step_results
                ],
            }
        finally:
            pass

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
        try:
            for test_spec in tests:
                try:
                    results.append(
                        self._run_single_test_with_cache(
                            robot_id=robot_id,
                            page_session_id=page_session_id,
                            test_spec=test_spec,
                            dry_run=dry_run,
                            command_output_cache=command_output_cache,
                            run_scope=run_scope,
                        )
                    )
                except HTTPException as exc:
                    test_id = normalize_text(test_spec.get("id"), "test")
                    results.append(
                        {
                            "id": test_id,
                            "status": "error",
                            "value": "execution_error",
                            "details": exc.detail,
                            "errorCode": "execution_error",
                            "source": "executor",
                            "ms": 0,
                            "steps": [],
                        }
                    )
                except Exception as exc:
                    test_id = normalize_text(test_spec.get("id"), "test")
                    results.append(
                        {
                            "id": test_id,
                            "status": "error",
                            "value": "execution_error",
                            "details": f"Test execution failed: {exc}",
                            "errorCode": "execution_error",
                            "source": "executor",
                            "ms": 0,
                            "steps": [],
                        }
                    )
        finally:
            self._close_session(page_session_id, robot_id)
        return results
