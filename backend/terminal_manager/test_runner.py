from __future__ import annotations

import threading
import time
from typing import Any

from ..normalization import normalize_status, normalize_text


class TestRunnerMixin:
    def _auto_recovery_test_ids(self, robot_id: str) -> list[str]:
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
            if not test_id or test_id == "online" or test_id in seen:
                continue
            if entry.get("enabled", True) is False:
                continue
            seen.add(test_id)
            ids.append(test_id)
        return ids

    def _record_runtime_results_from_test_run(
        self,
        robot_id: str,
        results: list[dict[str, Any]],
        *,
        source: str,
    ) -> None:
        now = time.time()
        updates: dict[str, dict[str, Any]] = {}
        non_online_results: list[dict[str, Any]] = []
        for result in results:
            if not isinstance(result, dict):
                continue
            test_id = normalize_text(result.get("id"), "")
            if not test_id:
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

    def _run_auto_recovery_tests(self, robot_id: str) -> None:
        with self._lock:
            if robot_id in self._auto_recovery_test_inflight:
                return
            self._auto_recovery_test_inflight.add(robot_id)

        def _runner() -> None:
            self._set_runtime_activity(
                robot_id,
                testing=True,
                phase=self.ACTIVITY_PHASE_FULL_TEST_AFTER_RECOVERY,
            )
            try:
                test_ids = self._auto_recovery_test_ids(robot_id)
                if not test_ids:
                    return
                results = self._executor.run_tests(
                    robot_id=robot_id,
                    page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                    test_ids=test_ids,
                    dry_run=False,
                )
                self._record_runtime_results_from_test_run(
                    robot_id,
                    results if isinstance(results, list) else [],
                    source="auto-monitor",
                )
            except Exception:
                pass
            finally:
                self._set_runtime_activity(robot_id, testing=False)
                with self._lock:
                    self._auto_recovery_test_inflight.discard(robot_id)

        threading.Thread(target=_runner, daemon=True).start()

    def run_tests(
        self,
        robot_id: str,
        page_session_id: str,
        test_ids: list[str] | None = None,
        dry_run: bool = False,
    ) -> list[dict[str, Any]]:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        return self._executor.run_tests(
            robot_id=robot_id,
            page_session_id=page_session_id,
            test_ids=test_ids,
            dry_run=dry_run,
        )

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
