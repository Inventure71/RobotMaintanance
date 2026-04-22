from __future__ import annotations

from copy import deepcopy
import time
from typing import Any

from ..normalization import normalize_status, normalize_text

_ACTIVITY_UNSET = object()


class RuntimeStateMixin:
    def _normalize_runtime_job_summary(self, payload: dict[str, Any] | None) -> dict[str, Any] | None:
        if not isinstance(payload, dict):
            return None
        job_id = normalize_text(payload.get("id"), "")
        if not job_id:
            return None
        kind = normalize_text(payload.get("kind"), "").lower()
        status = normalize_text(payload.get("status"), "").lower()
        if kind not in {"test", "fix"}:
            return None
        if status not in {"queued", "running", "interrupting", "succeeded", "failed", "interrupted"}:
            return None

        try:
            enqueued_at = float(payload.get("enqueuedAt") or 0.0)
        except Exception:
            enqueued_at = 0.0
        try:
            started_at = float(payload.get("startedAt") or 0.0)
        except Exception:
            started_at = 0.0
        try:
            updated_at = float(payload.get("updatedAt") or 0.0)
        except Exception:
            updated_at = 0.0

        return {
            "id": job_id,
            "kind": kind,
            "status": status,
            "source": normalize_text(payload.get("source"), "manual") or "manual",
            "label": normalize_text(payload.get("label"), job_id) or job_id,
            "enqueuedAt": enqueued_at if enqueued_at > 0 else 0.0,
            "startedAt": started_at if started_at > 0 else 0.0,
            "updatedAt": updated_at if updated_at > 0 else 0.0,
        }

    def _normalize_runtime_completed_job_summary(self, payload: dict[str, Any] | None) -> dict[str, Any] | None:
        normalized = self._normalize_runtime_job_summary(payload)
        if not normalized:
            return None
        status = normalize_text(normalized.get("status"), "").lower()
        if status not in {"succeeded", "failed", "interrupted"}:
            return None
        metadata = payload.get("metadata") if isinstance(payload, dict) and isinstance(payload.get("metadata"), dict) else {}
        return {
            **normalized,
            "metadata": deepcopy(metadata),
        }

    def _normalize_runtime_queued_jobs(self, payload: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
        raw = payload if isinstance(payload, list) else []
        normalized: list[dict[str, Any]] = []
        for item in raw:
            normalized_item = self._normalize_runtime_job_summary(item)
            if not normalized_item:
                continue
            if normalize_text(normalized_item.get("status"), "") != "queued":
                continue
            normalized.append(normalized_item)
        return normalized

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

    def _record_runtime_test_debug(self, robot_id: str, updates: dict[str, dict[str, Any]]) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            existing = self._runtime_test_debug.get(normalized_robot_id)
            if not isinstance(existing, dict):
                existing = {}
                self._runtime_test_debug[normalized_robot_id] = existing
            for test_id, payload in updates.items():
                normalized_test_id = normalize_text(test_id, "")
                if not normalized_test_id:
                    continue
                if not isinstance(payload, dict):
                    continue
                existing[normalized_test_id] = deepcopy(payload)

    def get_runtime_test_debug(self, robot_id: str) -> dict[str, dict[str, Any]]:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return {}
        with self._lock:
            existing = self._runtime_test_debug.get(normalized_robot_id, {})
            return {
                test_id: deepcopy(payload)
                for test_id, payload in existing.items()
                if isinstance(payload, dict)
            }

    def _build_runtime_activity_payload(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        existing = payload if isinstance(payload, dict) else {}
        try:
            last_full_test_at = float(existing.get("lastFullTestAt") or 0.0)
        except Exception:
            last_full_test_at = 0.0
        try:
            job_queue_version = int(existing.get("jobQueueVersion") or 0)
        except Exception:
            job_queue_version = 0
        active_job = self._normalize_runtime_job_summary(existing.get("activeJob"))
        last_completed_job = self._normalize_runtime_completed_job_summary(existing.get("lastCompletedJob"))
        if active_job and normalize_text(active_job.get("status"), "") not in {"running", "interrupting"}:
            active_job = None
        return {
            "searching": bool(existing.get("searching", False)),
            "testing": bool(existing.get("testing", False)),
            "phase": normalize_text(existing.get("phase"), "") or None,
            "lastFullTestAt": last_full_test_at if last_full_test_at > 0 else 0.0,
            "lastFullTestSource": normalize_text(existing.get("lastFullTestSource"), "") or None,
            "updatedAt": float(existing.get("updatedAt") or 0.0),
            "jobQueueVersion": max(0, job_queue_version),
            "activeJob": active_job,
            "queuedJobs": self._normalize_runtime_queued_jobs(existing.get("queuedJobs")),
            "lastCompletedJob": last_completed_job,
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
            current["jobQueueVersion"] = max(0, int(current.get("jobQueueVersion") or 0))
            current["activeJob"] = self._normalize_runtime_job_summary(current.get("activeJob"))
            current["queuedJobs"] = self._normalize_runtime_queued_jobs(current.get("queuedJobs"))
            current["lastCompletedJob"] = self._normalize_runtime_completed_job_summary(current.get("lastCompletedJob"))
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
            current["jobQueueVersion"] = max(0, int(current.get("jobQueueVersion") or 0))
            current["activeJob"] = self._normalize_runtime_job_summary(current.get("activeJob"))
            current["queuedJobs"] = self._normalize_runtime_queued_jobs(current.get("queuedJobs"))
            current["lastFullTestAt"] = resolved_checked_at
            current["lastFullTestSource"] = normalize_text(source, "") or None
            current["updatedAt"] = now
            if self._runtime_activity.get(normalized_robot_id) != current:
                self._runtime_activity[normalized_robot_id] = current
                self._mark_runtime_robot_dirty_locked(normalized_robot_id)

    def _set_runtime_job_queue_snapshot(
        self,
        robot_id: str,
        *,
        active_job: dict[str, Any] | None,
        queued_jobs: list[dict[str, Any]] | None,
        last_completed_job: dict[str, Any] | None,
        queue_version: int,
    ) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        now = time.time()
        normalized_active_job = self._normalize_runtime_job_summary(active_job)
        if normalized_active_job and normalize_text(normalized_active_job.get("status"), "") not in {
            "running",
            "interrupting",
        }:
            normalized_active_job = None
        normalized_queued_jobs = self._normalize_runtime_queued_jobs(queued_jobs)
        normalized_last_completed_job = self._normalize_runtime_completed_job_summary(last_completed_job)
        safe_queue_version = max(0, int(queue_version or 0))
        with self._lock:
            current = dict(self._runtime_activity.get(normalized_robot_id, {}))
            current["searching"] = bool(current.get("searching", False))
            current["testing"] = bool(current.get("testing", False))
            current["phase"] = normalize_text(current.get("phase"), "") or None
            current["activeJob"] = normalized_active_job
            current["queuedJobs"] = normalized_queued_jobs
            current["lastCompletedJob"] = normalized_last_completed_job
            current["jobQueueVersion"] = safe_queue_version
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

    def get_runtime_metrics(self) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            robot_ids = sorted(set(getattr(self, "robots_by_id", {}).keys()))
            runtime_tests = {
                robot_id: {
                    test_id: dict(payload)
                    for test_id, payload in self._runtime_tests.get(robot_id, {}).items()
                    if isinstance(payload, dict)
                }
                for robot_id in robot_ids
            }
            runtime_activity = {
                robot_id: self._build_runtime_activity_payload(self._runtime_activity.get(robot_id, {}))
                for robot_id in robot_ids
            }

        online_status_by_robot: list[dict[str, Any]] = []
        queue_depth_by_robot: list[dict[str, Any]] = []
        job_status_counts: dict[str, int] = {
            "running": 0,
            "interrupting": 0,
            "queued": 0,
            "succeeded": 0,
            "failed": 0,
            "interrupted": 0,
        }
        robot_counts = {
            "total": len(robot_ids),
            "online": 0,
            "offline": 0,
            "warning": 0,
            "unknown": 0,
        }
        test_status_counts: dict[str, int] = {}

        for robot_id in robot_ids:
            tests = runtime_tests.get(robot_id, {})
            activity = runtime_activity.get(robot_id, {})
            online_payload = tests.get("online") if isinstance(tests, dict) else {}
            online_status = normalize_status((online_payload or {}).get("status"))
            if online_status == "ok":
                online_value = 1
                robot_counts["online"] += 1
            elif online_status == "error":
                online_value = 0
                robot_counts["offline"] += 1
            elif online_status == "warning":
                online_value = -1
                robot_counts["warning"] += 1
            else:
                online_value = -1
                robot_counts["unknown"] += 1

            online_status_by_robot.append(
                {
                    "robotId": robot_id,
                    "value": online_value,
                    "status": online_status,
                    "checkedAt": float((online_payload or {}).get("checkedAt") or 0.0),
                }
            )

            queued_jobs = activity.get("queuedJobs") if isinstance(activity.get("queuedJobs"), list) else []
            active_job = activity.get("activeJob") if isinstance(activity.get("activeJob"), dict) else None
            last_completed_job = (
                activity.get("lastCompletedJob") if isinstance(activity.get("lastCompletedJob"), dict) else None
            )
            queue_depth = len(queued_jobs) + (1 if active_job else 0)
            queue_depth_by_robot.append({"robotId": robot_id, "value": queue_depth})

            for job in [active_job, *queued_jobs, last_completed_job]:
                if not isinstance(job, dict):
                    continue
                status = normalize_text(job.get("status"), "").lower()
                if status:
                    job_status_counts[status] = int(job_status_counts.get(status, 0)) + 1

            for payload in tests.values():
                if not isinstance(payload, dict):
                    continue
                status = normalize_status(payload.get("status"))
                test_status_counts[status] = int(test_status_counts.get(status, 0)) + 1

        total_queue_depth = sum(item["value"] for item in queue_depth_by_robot)
        return {
            "generatedAt": now,
            "robots": robot_counts,
            "jobs": {
                "queueDepth": total_queue_depth,
                "statusCounts": job_status_counts,
            },
            "tests": {
                "statusCounts": test_status_counts,
            },
            "metrics": {
                "vigil_robot_online_status": online_status_by_robot,
                "vigil_job_queue_depth": queue_depth_by_robot,
                "vigil_job_status_total": [
                    {"status": status, "value": count}
                    for status, count in sorted(job_status_counts.items())
                ],
                "vigil_test_status_total": [
                    {"status": status, "value": count}
                    for status, count in sorted(test_status_counts.items())
                ],
            },
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
