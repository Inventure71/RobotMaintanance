from __future__ import annotations

import time
from typing import Any

from ..normalization import normalize_status, normalize_text

_ACTIVITY_UNSET = object()


class RuntimeStateMixin:
    def _mark_runtime_robot_dirty_locked(self, robot_id: str) -> int:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return int(getattr(self, "_runtime_version", 0))
        next_version = int(getattr(self, "_runtime_version", 0)) + 1
        self._runtime_version = next_version
        self._runtime_robot_versions[normalized_robot_id] = next_version
        return next_version

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
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            existing = self._runtime_tests.get(normalized_robot_id)
            if not isinstance(existing, dict):
                existing = {}
                self._runtime_tests[normalized_robot_id] = existing
            changed = False
            for test_id, payload in updates.items():
                normalized_test_id = normalize_text(test_id, "")
                if not normalized_test_id:
                    continue
                if not isinstance(payload, dict):
                    continue
                prior = existing.get(normalized_test_id)
                if isinstance(prior, dict) and not self._should_apply_runtime_update(prior, payload):
                    continue
                next_payload = dict(prior) if isinstance(prior, dict) else {}
                next_payload.update(payload)
                if isinstance(prior, dict) and prior == next_payload:
                    continue
                existing[normalized_test_id] = next_payload
                changed = True

            online_payload = existing.get("online")
            if isinstance(online_payload, dict):
                next_online_cache = {
                    "status": normalize_status(online_payload.get("status")),
                    "value": normalize_text(online_payload.get("value"), "unreachable"),
                    "details": normalize_text(online_payload.get("details"), "No detail available"),
                    "ms": int(online_payload.get("ms") or 0),
                    "checkedAt": float(online_payload.get("checkedAt") or time.time()),
                    "source": normalize_text(online_payload.get("source"), "auto-monitor"),
                }
                if self._online_cache.get(normalized_robot_id) != next_online_cache:
                    self._online_cache[normalized_robot_id] = next_online_cache
                    changed = True

            if changed:
                self._mark_runtime_robot_dirty_locked(normalized_robot_id)

    def get_runtime_tests(self, robot_id: str) -> dict[str, dict[str, Any]]:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return {}
        with self._lock:
            existing = self._runtime_tests.get(normalized_robot_id, {})
            return {
                test_id: dict(payload)
                for test_id, payload in existing.items()
                if isinstance(payload, dict)
            }

    def _build_runtime_activity_payload(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        existing = payload if isinstance(payload, dict) else {}
        try:
            last_full_test_at = float(existing.get("lastFullTestAt") or 0.0)
        except Exception:
            last_full_test_at = 0.0
        return {
            "searching": bool(existing.get("searching", False)),
            "testing": bool(existing.get("testing", False)),
            "phase": normalize_text(existing.get("phase"), "") or None,
            "lastFullTestAt": last_full_test_at if last_full_test_at > 0 else 0.0,
            "lastFullTestSource": normalize_text(existing.get("lastFullTestSource"), "") or None,
            "updatedAt": float(existing.get("updatedAt") or 0.0),
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
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            current = dict(self._runtime_activity.get(normalized_robot_id, {}))
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
            if self._runtime_activity.get(normalized_robot_id) != current:
                self._runtime_activity[normalized_robot_id] = current
                self._mark_runtime_robot_dirty_locked(normalized_robot_id)

    def _record_last_full_test_activity(
        self,
        robot_id: str,
        *,
        checked_at: float | None = None,
        source: str | None = None,
    ) -> None:
        now = time.time()
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        try:
            resolved_checked_at = float(checked_at or now)
        except Exception:
            resolved_checked_at = now
        resolved_checked_at = resolved_checked_at if resolved_checked_at > 0 else now

        with self._lock:
            current = dict(self._runtime_activity.get(normalized_robot_id, {}))
            current["searching"] = bool(current.get("searching", False))
            current["testing"] = bool(current.get("testing", False))
            current["phase"] = normalize_text(current.get("phase"), "") or None
            current["lastFullTestAt"] = resolved_checked_at
            current["lastFullTestSource"] = normalize_text(source, "") or None
            current["updatedAt"] = now
            if self._runtime_activity.get(normalized_robot_id) != current:
                self._runtime_activity[normalized_robot_id] = current
                self._mark_runtime_robot_dirty_locked(normalized_robot_id)

    def get_runtime_activity(self, robot_id: str) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return self._build_runtime_activity_payload({})
        with self._lock:
            existing = self._runtime_activity.get(normalized_robot_id, {})
            return self._build_runtime_activity_payload(existing)

    def get_runtime_snapshot_since(self, since_version: int = 0) -> dict[str, Any]:
        try:
            since = int(since_version)
        except Exception:
            since = 0
        since = max(0, since)

        with self._lock:
            current_version = int(getattr(self, "_runtime_version", 0))
            full = since <= 0 or since > current_version
            if full:
                candidate_ids = set(self._runtime_tests.keys())
                candidate_ids.update(self._runtime_activity.keys())
                candidate_ids.update(self._runtime_robot_versions.keys())
            else:
                candidate_ids = {
                    robot_id
                    for robot_id, version in self._runtime_robot_versions.items()
                    if int(version) > since
                }

            robots: list[dict[str, Any]] = []
            for robot_id in sorted(candidate_ids):
                tests = self._runtime_tests.get(robot_id, {})
                activity = self._runtime_activity.get(robot_id, {})
                robots.append(
                    {
                        "id": robot_id,
                        "version": int(self._runtime_robot_versions.get(robot_id, current_version)),
                        "tests": {
                            test_id: dict(payload)
                            for test_id, payload in tests.items()
                            if isinstance(payload, dict)
                        },
                        "activity": self._build_runtime_activity_payload(activity),
                    }
                )

        return {
            "version": current_version,
            "full": full,
            "robots": robots,
        }

    def get_runtime_probe_state(self, robot_id: str) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return {"isOnline": False, "isTesting": False}
        with self._lock:
            tests = self._runtime_tests.get(normalized_robot_id, {})
            activity = self._runtime_activity.get(normalized_robot_id, {})
            online_payload = tests.get("online") if isinstance(tests, dict) else {}
            is_online = normalize_status((online_payload or {}).get("status")) == "ok"
            is_testing = bool((activity or {}).get("testing"))
            return {
                "isOnline": is_online,
                "isTesting": is_testing,
            }
