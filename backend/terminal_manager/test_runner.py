from __future__ import annotations

import threading
import time
from typing import Any

from ..normalization import normalize_status, normalize_text


class TestRunnerMixin:
    def _has_background_test_activity(self, robot_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False

        with self._lock:
            if normalized_robot_id in self._auto_recovery_test_inflight:
                return True
            return normalized_robot_id in self._connection_retry_inflight

    def _configured_test_ids(self, robot_id: str) -> list[str]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(test_entries, list):
            return []
        ids: list[str] = []
        seen: set[str] = set()
        for entry in test_entries:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id or test_id in seen:
                continue
            if entry.get("enabled", True) is False:
                continue
            seen.add(test_id)
            ids.append(test_id)
        return ids

    def _auto_recovery_test_ids(self, robot_id: str) -> list[str]:
        return [test_id for test_id in self._configured_test_ids(robot_id) if test_id != "online"]

    def _selected_tests_all_ok(self, selected_test_ids: list[str], results: list[dict[str, Any]]) -> bool:
        expected = [normalize_text(test_id, "") for test_id in selected_test_ids if normalize_text(test_id, "")]
        if not expected:
            return True

        by_id: dict[str, str] = {}
        for result in results:
            if not isinstance(result, dict):
                continue
            test_id = normalize_text(result.get("id"), "")
            if not test_id:
                continue
            by_id[test_id] = normalize_status(result.get("status"))

        for test_id in expected:
            if by_id.get(test_id) != "ok":
                return False
        return True

    def _run_connection_retry_attempt(
        self,
        *,
        robot_id: str,
        test_ids: list[str],
        source: str = "auto-monitor",
        phase: str | None = None,
        manage_runtime_activity: bool = True,
        should_commit: Any = None,
    ) -> list[dict[str, Any]]:
        started_at = time.time()
        activity_phase = normalize_text(phase, "") or self.ACTIVITY_PHASE_CONNECTION_RETRY
        if manage_runtime_activity:
            self._set_runtime_activity(
                robot_id,
                searching=False,
                testing=True,
                phase=activity_phase,
            )

        try:
            if not test_ids:
                return []
            results = self._executor.run_tests(
                robot_id=robot_id,
                page_session_id=self.AUTO_MONITOR_TEST_PAGE_SESSION_ID,
                test_ids=test_ids,
                dry_run=False,
            )
            normalized_results = results if isinstance(results, list) else []
            if callable(should_commit) and not bool(should_commit()):
                return normalized_results
            self._record_runtime_results_from_test_run(
                robot_id,
                normalized_results,
                source=source,
            )
            return normalized_results
        except Exception as exc:
            return [
                {
                    "id": normalize_text(test_id, "test"),
                    "status": "error",
                    "value": "execution_error",
                    "details": normalize_text(str(exc), "Connection retry test execution failed."),
                    "ms": 0,
                    "steps": [],
                }
                for test_id in test_ids
                if normalize_text(test_id, "")
            ]
        finally:
            elapsed = time.time() - started_at
            min_visible_sec = max(0.0, float(self.AUTO_ACTIVITY_MIN_VISIBLE_SEC))
            if elapsed < min_visible_sec:
                time.sleep(min_visible_sec - elapsed)
            if manage_runtime_activity:
                self._set_runtime_activity(robot_id, testing=False)

    def _is_auto_recovery_cancel_requested(self, robot_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False
        with self._lock:
            return normalized_robot_id in getattr(self, "_auto_recovery_cancel_requested", set())

    def cancel_auto_recovery_for_manual_takeover(
        self,
        robot_id: str,
        *,
        wait_timeout_sec: float | None = None,
    ) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False

        with self._lock:
            inflight = normalized_robot_id in self._auto_recovery_test_inflight
        if not inflight:
            with self._lock:
                self._auto_recovery_cancel_requested.discard(normalized_robot_id)
            return True
        with self._lock:
            self._auto_recovery_cancel_requested.add(normalized_robot_id)

        self.close_session(
            page_session_id=self.AUTO_MONITOR_TEST_PAGE_SESSION_ID,
            robot_id=normalized_robot_id,
        )
        timeout_sec = wait_timeout_sec
        if timeout_sec is None:
            timeout_sec = float(getattr(self, "CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC", 2.0))
        deadline = time.time() + max(0.0, float(timeout_sec))
        while True:
            with self._lock:
                still_inflight = normalized_robot_id in self._auto_recovery_test_inflight
            if not still_inflight:
                with self._lock:
                    self._auto_recovery_cancel_requested.discard(normalized_robot_id)
                return True
            if time.time() >= deadline:
                return False
            time.sleep(0.01)

    def _runtime_non_online_test_ids(self, robot_id: str) -> list[str]:
        configured_non_online = [test_id for test_id in self._configured_test_ids(robot_id) if test_id != "online"]
        runtime_non_online = [
            test_id
            for test_id in self.get_runtime_tests(robot_id).keys()
            if normalize_text(test_id, "") and normalize_text(test_id, "") != "online"
        ]
        return list(dict.fromkeys([*configured_non_online, *runtime_non_online]))

    def _record_runtime_results_from_test_run(
        self,
        robot_id: str,
        results: list[dict[str, Any]],
        *,
        source: str,
    ) -> None:
        now = time.time()
        valid_test_ids = set(self._configured_test_ids(robot_id))
        updates: dict[str, dict[str, Any]] = {}
        non_online_results: list[dict[str, Any]] = []
        for result in results:
            if not isinstance(result, dict):
                continue
            test_id = normalize_text(result.get("id"), "")
            if not test_id:
                continue
            if test_id not in valid_test_ids:
                continue
            if test_id != "online":
                non_online_results.append(result)
            updates[test_id] = {
                "status": normalize_status(result.get("status")),
                "value": normalize_text(result.get("value"), "n/a"),
                "details": normalize_text(result.get("details"), "No detail available"),
                "ms": int(result.get("ms") or 0),
                "checkedAt": now,
                "source": normalize_text(source, "auto-monitor"),
            }

        if "online" not in updates and non_online_results:
            any_non_error = any(normalize_status(result.get("status")) != "error" for result in non_online_results)
            all_connectivity_failures = all(
                normalize_status(result.get("status")) == "error"
                and (
                    "ssh" in normalize_text(result.get("details"), "").lower()
                    or "connect" in normalize_text(result.get("details"), "").lower()
                    or "auth" in normalize_text(result.get("details"), "").lower()
                    or normalize_text(result.get("value"), "").lower() in {"execution_error", "command_error"}
                )
                for result in non_online_results
            )
            if any_non_error:
                updates["online"] = {
                    "status": "ok",
                    "value": "reachable",
                    "details": "Inferred online: at least one test command executed.",
                    "ms": 0,
                    "checkedAt": now,
                    "source": normalize_text(source, "auto-monitor"),
                }
            elif all_connectivity_failures:
                updates["online"] = {
                    "status": "error",
                    "value": "unreachable",
                    "details": "Inferred offline: automated tests failed for SSH/connectivity reasons.",
                    "ms": 0,
                    "checkedAt": now,
                    "source": normalize_text(source, "auto-monitor"),
                }
        if updates:
            self._record_runtime_tests(robot_id, updates)
            configured_non_online_ids = {
                test_id for test_id in self._configured_test_ids(robot_id) if test_id != "online"
            }
            updated_non_online_ids = {test_id for test_id in updates.keys() if test_id != "online"}
            if configured_non_online_ids and configured_non_online_ids.issubset(updated_non_online_ids):
                last_full_test_checked_at = max(
                    float(payload.get("checkedAt") or now)
                    for test_id, payload in updates.items()
                    if test_id != "online" and isinstance(payload, dict)
                )
                self._record_last_full_test_activity(
                    robot_id,
                    checked_at=last_full_test_checked_at,
                    source=source,
                )

    def apply_online_probe_to_runtime(
        self,
        robot_id: str,
        probe: dict[str, Any],
        *,
        source: str | None = None,
    ) -> dict[str, Any]:
        now = time.time()
        runtime_before = self.get_runtime_tests(robot_id)
        previous_online_status = normalize_status((runtime_before.get("online") or {}).get("status"))
        previous_online = previous_online_status == "ok"

        checked_at = float(probe.get("checkedAt") or now)
        normalized_source = normalize_text(source or probe.get("source"), "live")
        status = normalize_status(probe.get("status"))
        ms = int(probe.get("ms") or 0)
        details = normalize_text(probe.get("details"), "No detail available")
        value_fallback = "reachable" if status == "ok" else "unreachable"

        updates: dict[str, dict[str, Any]] = {
            "online": {
                "status": status,
                "value": normalize_text(probe.get("value"), value_fallback),
                "details": details,
                "ms": ms,
                "checkedAt": checked_at,
                "source": normalized_source,
            }
        }
        if status != "ok":
            stale_details = "Robot offline; non-online results are stale until tests rerun."
            for test_id in self._runtime_non_online_test_ids(robot_id):
                updates[test_id] = {
                    "status": "warning",
                    "value": "unknown",
                    "reason": "OFFLINE_STALE",
                    "details": stale_details,
                    "ms": ms,
                    "checkedAt": checked_at,
                    "source": normalized_source,
                }

        self._record_runtime_tests(robot_id, updates)
        return {
            "previousOnlineStatus": previous_online_status,
            "wasOnline": previous_online,
            "isOnline": status == "ok",
            "checkedAt": checked_at,
            "source": normalized_source,
        }

    def _run_auto_recovery_tests(self, robot_id: str, *, source: str = "auto-monitor") -> None:
        with self._lock:
            if robot_id in self._auto_recovery_test_inflight:
                return
            self._auto_recovery_cancel_requested.discard(robot_id)
            self._auto_recovery_test_inflight.add(robot_id)

        def _runner() -> None:
            try:
                test_ids = self._auto_recovery_test_ids(robot_id)
                if not test_ids:
                    return
                if self._is_auto_recovery_cancel_requested(robot_id):
                    return
                self._run_connection_retry_attempt(
                    robot_id=robot_id,
                    test_ids=test_ids,
                    source=source,
                    phase=self.ACTIVITY_PHASE_FULL_TEST_AFTER_RECOVERY,
                    should_commit=lambda: not self._is_auto_recovery_cancel_requested(robot_id),
                )
            except Exception:
                pass
            finally:
                with self._lock:
                    self._auto_recovery_test_inflight.discard(robot_id)
                    self._auto_recovery_cancel_requested.discard(robot_id)

        threading.Thread(target=_runner, daemon=True).start()

    def trigger_recovery_tests(self, robot_id: str, *, source: str = "auto-monitor") -> None:
        self._run_auto_recovery_tests(robot_id, source=source)

    def run_tests(
        self,
        robot_id: str,
        page_session_id: str,
        test_ids: list[str] | None = None,
        dry_run: bool = False,
        queue_timeout_sec: float | None = None,
        connect_timeout_sec: float | None = None,
        execute_timeout_sec: float | None = None,
    ) -> list[dict[str, Any]]:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        results = self._executor.run_tests(
            robot_id=robot_id,
            page_session_id=page_session_id,
            test_ids=test_ids,
            dry_run=dry_run,
            queue_timeout_sec=queue_timeout_sec,
            connect_timeout_sec=connect_timeout_sec,
            execute_timeout_sec=execute_timeout_sec,
        )
        if hasattr(self._executor, "get_last_run_metadata"):
            metadata = self._executor.get_last_run_metadata()
            with self._lock:
                self._last_test_run_metadata[(robot_id, page_session_id)] = metadata
        self._record_runtime_results_from_test_run(
            robot_id=robot_id,
            results=results if isinstance(results, list) else [],
            source="manual",
        )
        return results

    def get_last_test_run_metadata(self, robot_id: str, page_session_id: str) -> dict[str, Any]:
        with self._lock:
            payload = self._last_test_run_metadata.get((robot_id, page_session_id))
        if isinstance(payload, dict):
            return dict(payload)
        return {}

    def default_tests(self, robot_id: str) -> dict[str, dict[str, str]]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []

        defaults: dict[str, dict[str, str]] = {}
        for entry in (test_entries or []):
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id:
                continue
            defaults[test_id] = {
                "status": normalize_status(entry.get("defaultStatus")),
                "value": normalize_text(entry.get("defaultValue"), "unknown"),
                "details": normalize_text(entry.get("defaultDetails"), "Not checked yet"),
            }

        if defaults:
            return defaults
        return {
            "online": {"status": "warning", "value": "unknown", "details": "Not checked yet"},
        }
