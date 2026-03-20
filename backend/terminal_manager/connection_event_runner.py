from __future__ import annotations

import threading
import time

from ..normalization import normalize_text


class ConnectionEventRunnerMixin:
    def _has_connection_retry_activity_locked(self, robot_id: str) -> bool:
        return robot_id in self._connection_retry_inflight

    def _emit_connection_event_connected(self, robot_id: str, connected_at: float | None = None) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return

        now = time.time()
        try:
            resolved_connected_at = float(connected_at) if connected_at is not None else now
        except Exception:
            resolved_connected_at = now
        if resolved_connected_at <= 0:
            resolved_connected_at = now

        with self._lock:
            existing = self._connection_retry_sessions.get(normalized_robot_id, {})
            next_token = int(existing.get("token", 0)) + 1
            self._connection_retry_sessions[normalized_robot_id] = {
                "token": next_token,
                "connectedAt": resolved_connected_at,
                "cancelled": False,
            }

        self._start_connection_retry_session(normalized_robot_id, token=next_token, connected_at=resolved_connected_at)

    def _emit_connection_event_disconnected(self, robot_id: str) -> None:
        self._cancel_connection_retry_session(robot_id)

    def _emit_connection_event_manual_activity(self, robot_id: str) -> None:
        self._cancel_connection_retry_session(robot_id)

    def _cancel_connection_retry_session(self, robot_id: str) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return

        now = time.time()
        with self._lock:
            existing = self._connection_retry_sessions.get(normalized_robot_id, {})
            next_token = int(existing.get("token", 0)) + 1
            connected_at = float(existing.get("connectedAt") or now)
            self._connection_retry_sessions[normalized_robot_id] = {
                "token": next_token,
                "connectedAt": connected_at,
                "cancelled": True,
            }

    def cancel_connection_retry_for_manual_takeover(
        self,
        robot_id: str,
        *,
        wait_timeout_sec: float | None = None,
    ) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False

        self._cancel_connection_retry_session(normalized_robot_id)
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
                inflight = normalized_robot_id in self._connection_retry_inflight
                owner = self._connection_retry_attempt_owner.get(normalized_robot_id)
            if not inflight and owner is None:
                return True
            if time.time() >= deadline:
                return False
            time.sleep(0.01)

    def _start_connection_retry_session(self, robot_id: str, *, token: int, connected_at: float) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return

        with self._lock:
            self._connection_retry_inflight[normalized_robot_id] = int(token)

        threading.Thread(
            target=self._run_connection_retry_loop,
            args=(normalized_robot_id, int(token), float(connected_at)),
            daemon=True,
            name=f"connection-retry-{normalized_robot_id}",
        ).start()

    def _is_connection_retry_session_active(self, robot_id: str, token: int) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False

        with self._lock:
            session = self._connection_retry_sessions.get(normalized_robot_id)
            if not isinstance(session, dict):
                return False
            if int(session.get("token", 0)) != int(token):
                return False
            return not bool(session.get("cancelled", False))

    def _acquire_connection_retry_attempt_slot(self, robot_id: str, token: int) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False

        with self._lock:
            session = self._connection_retry_sessions.get(normalized_robot_id)
            if not isinstance(session, dict):
                return False
            if int(session.get("token", 0)) != int(token):
                return False
            if bool(session.get("cancelled", False)):
                return False

            owner = self._connection_retry_attempt_owner.get(normalized_robot_id)
            if owner is not None and int(owner) != int(token):
                return False

            self._connection_retry_attempt_owner[normalized_robot_id] = int(token)
            return True

    def _release_connection_retry_attempt_slot(self, robot_id: str, token: int) -> None:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return
        with self._lock:
            owner = self._connection_retry_attempt_owner.get(normalized_robot_id)
            if owner is not None and int(owner) == int(token):
                self._connection_retry_attempt_owner.pop(normalized_robot_id, None)

    def _select_connection_test_ids(self, robot_id: str) -> list[str]:
        robot_type = self._resolve_robot_type(robot_id)
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(test_entries, list):
            return []

        test_ids: list[str] = []
        seen: set[str] = set()
        for entry in test_entries:
            if not isinstance(entry, dict):
                continue
            test_id = normalize_text(entry.get("id"), "")
            if not test_id or test_id in seen:
                continue
            if test_id == "online":
                continue
            if entry.get("enabled", True) is False:
                continue
            if not isinstance(entry.get("runAtConnection"), bool):
                continue
            if entry.get("runAtConnection") is not True:
                continue
            seen.add(test_id)
            test_ids.append(test_id)
        return test_ids

    def _run_connection_retry_loop(self, robot_id: str, token: int, connected_at: float) -> None:
        should_clear_runtime_activity = False
        try:
            test_ids = self._select_connection_test_ids(robot_id)
            if not test_ids:
                return

            should_clear_runtime_activity = True
            self._set_runtime_activity(
                robot_id,
                searching=False,
                testing=True,
                phase=self.ACTIVITY_PHASE_CONNECTION_RETRY,
            )
            deadline = float(connected_at) + float(self.CONNECTION_RETRY_WINDOW_SEC)
            while self._is_connection_retry_session_active(robot_id, token):
                now = time.time()
                if now >= deadline:
                    return
                if hasattr(self, "_has_foreground_robot_activity") and self._has_foreground_robot_activity(robot_id):
                    self._cancel_connection_retry_session(robot_id)
                    return

                if not self._acquire_connection_retry_attempt_slot(robot_id, token):
                    if not self._is_connection_retry_session_active(robot_id, token):
                        return
                    time.sleep(0.05)
                    continue

                try:
                    if not self._is_connection_retry_session_active(robot_id, token):
                        continue
                    results = self._run_connection_retry_attempt(
                        robot_id=robot_id,
                        test_ids=test_ids,
                        source="auto-monitor",
                        phase=self.ACTIVITY_PHASE_CONNECTION_RETRY,
                        manage_runtime_activity=False,
                        should_commit=lambda: self._is_connection_retry_session_active(robot_id, token),
                    )
                    if not self._is_connection_retry_session_active(robot_id, token):
                        continue
                    if self._selected_tests_all_ok(test_ids, results):
                        return
                finally:
                    self._release_connection_retry_attempt_slot(robot_id, token)

                remaining = max(0.0, deadline - time.time())
                if remaining <= 0.0:
                    return
                sleep_sec = min(float(self.CONNECTION_RETRY_INTERVAL_SEC), remaining)
                wake_at = time.time() + sleep_sec
                while time.time() < wake_at:
                    if not self._is_connection_retry_session_active(robot_id, token):
                        return
                    time.sleep(min(0.2, max(0.0, wake_at - time.time())))
        finally:
            clear_runtime_activity = False
            with self._lock:
                inflight_token = int(self._connection_retry_inflight.get(robot_id, 0))
                owner = self._connection_retry_attempt_owner.get(robot_id)
                session = self._connection_retry_sessions.get(robot_id)
                session_token = int(session.get("token", 0)) if isinstance(session, dict) else 0
                clear_runtime_activity = should_clear_runtime_activity and (
                    inflight_token == int(token)
                    or (owner is not None and int(owner) == int(token))
                    or session_token == int(token)
                )
                if inflight_token == int(token):
                    self._connection_retry_inflight.pop(robot_id, None)
                if owner is not None and int(owner) == int(token):
                    self._connection_retry_attempt_owner.pop(robot_id, None)
            if clear_runtime_activity:
                self._set_runtime_activity(robot_id, testing=False)
