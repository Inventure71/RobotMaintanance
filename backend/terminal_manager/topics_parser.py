from __future__ import annotations

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
            required_topics = [
                normalize_text(topic, "")
                for topic in (entry.get("requiredTopics") or [])
                if normalize_text(topic, "")
            ]
            if not required_topics:
                continue
            definition_ref = normalize_text(entry.get("definitionRef"), "")
            parser_type = normalize_text(((entry.get("parser") or {}) if isinstance(entry.get("parser"), dict) else {}).get("type"), "")
            if "topics" in definition_ref or parser_type == "topics_presence":
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
            namespace = normalize_text(
                ((entry.get("parser") or {}) if isinstance(entry.get("parser"), dict) else {}).get("namespace")
                or entry.get("namespace"),
                "",
            )
            parsed = self._executor._parse_topics_presence(
                raw_output=output,
                expected_topics=[
                    normalize_text(topic, "")
                    for topic in (entry.get("requiredTopics") or [])
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

    # Compatibility surface for existing tests that probe parser internals.
    def _parse_topics_presence(
        self,
        raw_output: str,
        expected_topics: list[str],
        namespace: str = "",
    ) -> StepResult:
        return self._executor._parse_topics_presence(raw_output, expected_topics, namespace)
