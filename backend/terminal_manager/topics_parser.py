from __future__ import annotations

import json
import time
from typing import Any

from fastapi import HTTPException

from ..models import StepResult
from ..normalization import normalize_status, normalize_text


class TopicsParserMixin:
    def _build_topics_runtime_error(self, details: str) -> dict[str, Any]:
        return {
            "status": "error",
            "value": "missing",
            "details": normalize_text(details, "Unable to run topic snapshot."),
            "ms": 0,
            "checkedAt": time.time(),
            "source": "auto-monitor-topics",
        }

    def _topic_tests_for_robot(self, robot_id: str) -> list[dict[str, Any]]:
        robot_type = self._resolve_robot_type(robot_id)
        raw_tests = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(raw_tests, list):
            return []

        selected: list[dict[str, Any]] = []
        for entry in raw_tests:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id or test_id in {"online", "battery"}:
                continue
            if entry.get("enabled", True) is False:
                continue
            params = entry.get("params") if isinstance(entry.get("params"), dict) else {}
            required_topics = [
                normalize_text(topic, "")
                for topic in (params.get("requiredTopics") or entry.get("requiredTopics") or [])
                if normalize_text(topic, "")
            ]
            if not required_topics:
                continue
            selected.append(entry)
        return selected

    def _refresh_topics_state(self, robot_id: str) -> None:
        topic_tests = self._topic_tests_for_robot(robot_id)
        if not topic_tests:
            return

        try:
            self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=self.AUTO_MONITOR_TOPICS_SETUP_COMMAND,
                timeout_sec=3.0,
            )
            started_ms = int(time.time() * 1000)
            output = self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=self.AUTO_MONITOR_TOPICS_COMMAND,
                timeout_sec=self.AUTO_MONITOR_TOPICS_TIMEOUT_SEC,
            )
            elapsed_ms = max(0, int(time.time() * 1000 - started_ms))
        except HTTPException as exc:
            details = normalize_text(exc.detail, "Unable to run topic snapshot.")
            updates = {
                normalize_text(entry.get("id"), ""): self._build_topics_runtime_error(details)
                for entry in topic_tests
                if normalize_text(entry.get("id"), "")
            }
            if updates:
                self._record_runtime_tests(robot_id, updates)
            return

        updates: dict[str, dict[str, Any]] = {}
        for entry in topic_tests:
            test_id = normalize_text(entry.get("id"), "")
            if not test_id:
                continue
            params = entry.get("params") if isinstance(entry.get("params"), dict) else {}
            namespace = normalize_text(
                params.get("namespace") or entry.get("namespace"),
                "",
            )
            parsed = self._parse_topics_presence_impl(
                raw_output=output,
                expected_topics=[
                    normalize_text(topic, "")
                    for topic in (params.get("requiredTopics") or entry.get("requiredTopics") or [])
                    if normalize_text(topic, "")
                ],
                namespace=namespace,
            )
            updates[test_id] = {
                "status": normalize_status(parsed.status),
                "value": normalize_text(parsed.value, "missing"),
                "details": normalize_text(parsed.details, "Missing required topics."),
                "ms": elapsed_ms,
                "checkedAt": time.time(),
                "source": "auto-monitor-topics",
            }

        if updates:
            self._record_runtime_tests(robot_id, updates)

    def _parse_topics_presence_impl(
        self,
        raw_output: str,
        expected_topics: list[str],
        namespace: str = "",
    ) -> StepResult:
        output_lines = []
        for line in str(raw_output or "").replace("\r", "").split("\n"):
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
                        "matchedByNamespace": matched_by_namespace,
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

    # Compatibility surface for existing tests that probe parser internals.
    def _parse_topics_presence(
        self,
        raw_output: str,
        expected_topics: list[str],
        namespace: str = "",
    ) -> StepResult:
        return self._parse_topics_presence_impl(raw_output, expected_topics, namespace)
