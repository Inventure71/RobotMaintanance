from __future__ import annotations

import time

from ..normalization import normalize_text


class ActivityGuardMixin:
    def _mark_manual_activity(
        self,
        robot_id: str,
        page_session_id: str | None = None,
        source: str | None = None,
    ) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_session = normalize_text(page_session_id, "")
        normalized_source = normalize_text(source, "").lower()
        if not normalized_robot_id:
            return
        if normalized_session == self.AUTO_MONITOR_PAGE_SESSION_ID:
            return
        now = time.time()
        with self._lock:
            self._manual_activity_by_robot[normalized_robot_id] = now
            if normalized_source == "auto-fix":
                self._manual_defer_until_by_robot[normalized_robot_id] = max(
                    float(self._manual_defer_until_by_robot.get(normalized_robot_id, 0.0)),
                    now + self.MANUAL_AUTO_FIX_DEFER_SEC,
                )

    def _is_manual_activity_recent(self, robot_id: str, now: float) -> bool:
        with self._lock:
            last_activity_at = float(self._manual_activity_by_robot.get(robot_id, 0.0))
            defer_until = float(self._manual_defer_until_by_robot.get(robot_id, 0.0))
        return (now - last_activity_at) <= self.MANUAL_ACTIVITY_DEFER_SEC or now <= defer_until

    def _is_robot_busy(self, robot_id: str) -> bool:
        with self._lock:
            if robot_id in self._active_search_runs:
                return True
            if robot_id in self._active_fix_runs:
                return True
            return any(active_robot_id == robot_id for active_robot_id, _session in self._active_test_runs)

    def start_search_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        self._mark_manual_activity(robot_id=normalized_robot_id, source="manual-search")
        with self._lock:
            self._active_search_runs.add(normalized_robot_id)

    def finish_search_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            self._active_search_runs.discard(normalized_robot_id)

    def start_fix_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        self._mark_manual_activity(robot_id=normalized_robot_id, source="auto-fix")
        with self._lock:
            self._active_fix_runs.add(normalized_robot_id)

    def finish_fix_run(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            self._active_fix_runs.discard(normalized_robot_id)

    def start_test_run(self, robot_id: str, page_session_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_page_session_id = normalize_text(page_session_id, "")
        if not normalized_robot_id or not normalized_page_session_id:
            return False
        with self._lock:
            key = (normalized_robot_id, normalized_page_session_id)
            if key in self._active_test_runs:
                return False
            self._active_test_runs.add(key)
            self._manual_activity_by_robot[normalized_robot_id] = time.time()
            return True

    def finish_test_run(self, robot_id: str, page_session_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_page_session_id = normalize_text(page_session_id, "")
        if not normalized_robot_id or not normalized_page_session_id:
            return
        with self._lock:
            self._active_test_runs.discard((normalized_robot_id, normalized_page_session_id))
