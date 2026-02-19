from __future__ import annotations

import time
from typing import Any

from ..normalization import normalize_status, normalize_text

_ACTIVITY_UNSET = object()


class RuntimeStateMixin:
    def _runtime_source_rank(self, source: str) -> int:
        normalized = normalize_text(source, "").lower()
        return self.RUNTIME_SOURCE_PRIORITY.get(normalized, 0)

    def _checked_at_value(self, payload: dict[str, Any]) -> float:
        try:
            return float(payload.get("checkedAt") or 0.0)
        except Exception:
            return 0.0

    def _should_apply_runtime_update(self, previous: dict[str, Any], incoming: dict[str, Any]) -> bool:
        previous_checked_at = self._checked_at_value(previous)
        incoming_checked_at = self._checked_at_value(incoming)
        if incoming_checked_at > previous_checked_at:
            return True
        if incoming_checked_at < previous_checked_at:
            return False

        previous_rank = self._runtime_source_rank(normalize_text(previous.get("source"), ""))
        incoming_rank = self._runtime_source_rank(normalize_text(incoming.get("source"), ""))
        if incoming_rank > previous_rank:
            return True
        if incoming_rank < previous_rank:
            return False
        return True

    def _record_runtime_tests(self, robot_id: str, updates: dict[str, dict[str, Any]]) -> None:
        with self._lock:
            existing = self._runtime_tests.get(robot_id, {})
            merged = dict(existing)
            for test_id, payload in updates.items():
                if not isinstance(payload, dict):
                    continue
                prior = existing.get(test_id)
                if isinstance(prior, dict) and not self._should_apply_runtime_update(prior, payload):
                    continue
                merged[test_id] = {**(prior if isinstance(prior, dict) else {}), **payload}
            self._runtime_tests[robot_id] = merged
            online_payload = merged.get("online")
            if isinstance(online_payload, dict):
                self._online_cache[robot_id] = {
                    "status": normalize_status(online_payload.get("status")),
                    "value": normalize_text(online_payload.get("value"), "unreachable"),
                    "details": normalize_text(online_payload.get("details"), "No detail available"),
                    "ms": int(online_payload.get("ms") or 0),
                    "checkedAt": float(online_payload.get("checkedAt") or time.time()),
                    "source": normalize_text(online_payload.get("source"), "auto-monitor"),
                }

    def get_runtime_tests(self, robot_id: str) -> dict[str, dict[str, Any]]:
        with self._lock:
            existing = self._runtime_tests.get(robot_id, {})
            return {
                test_id: dict(payload)
                for test_id, payload in existing.items()
                if isinstance(payload, dict)
            }

    def _set_runtime_activity(
        self,
        robot_id: str,
        *,
        searching: bool | None = None,
        testing: bool | None = None,
        phase: Any = _ACTIVITY_UNSET,
    ) -> None:
        now = time.time()
        with self._lock:
            current = dict(self._runtime_activity.get(robot_id, {}))
            current["searching"] = bool(current.get("searching", False))
            current["testing"] = bool(current.get("testing", False))
            current["phase"] = normalize_text(current.get("phase"), "") or None
            if searching is not None:
                current["searching"] = bool(searching)
            if testing is not None:
                current["testing"] = bool(testing)
            if phase is not _ACTIVITY_UNSET:
                current["phase"] = normalize_text(phase, "") or None
            elif not current["searching"] and not current["testing"]:
                current["phase"] = None
            current["updatedAt"] = now
            self._runtime_activity[robot_id] = current

    def get_runtime_activity(self, robot_id: str) -> dict[str, Any]:
        with self._lock:
            existing = dict(self._runtime_activity.get(robot_id, {}))
        return {
            "searching": bool(existing.get("searching", False)),
            "testing": bool(existing.get("testing", False)),
            "phase": normalize_text(existing.get("phase"), "") or None,
            "updatedAt": float(existing.get("updatedAt") or 0.0),
        }
