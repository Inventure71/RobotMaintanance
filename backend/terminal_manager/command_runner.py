from __future__ import annotations

import time

from fastapi import HTTPException


class CommandRunnerMixin:
    def run_command(
        self,
        page_session_id: str,
        robot_id: str,
        command: str,
        timeout_sec: float | None = None,
        source: str | None = None,
    ) -> str:
        self._mark_manual_activity(
            robot_id=robot_id,
            page_session_id=page_session_id,
            source=source,
        )
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        timeout = timeout_sec if timeout_sec is not None else self.COMMAND_DEFAULT_TIMEOUT_SEC
        timeout = self._clamp_interval(
            float(timeout),
            self.COMMAND_MIN_TIMEOUT_SEC,
            self.COMMAND_MAX_TIMEOUT_SEC,
        )
        try:
            output = shell.run_command(command, timeout=timeout)
        except Exception as exc:
            self.close_session(page_session_id=page_session_id, robot_id=robot_id)
            raise HTTPException(status_code=500, detail=f"SSH command failed: {exc}") from exc

        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()

        return output

    def send_input(self, page_session_id: str, robot_id: str, text: str) -> None:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        shell.send(text)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()

    def read_output(self, page_session_id: str, robot_id: str, max_chunks: int = 100) -> str:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        output = shell.read(max_chunks=max_chunks)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()
        return output

    def resize_terminal(self, page_session_id: str, robot_id: str, width: int, height: int) -> None:
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        shell = self.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        shell.resize_pty(width=width, height=height)
        with self._lock:
            key = (page_session_id, robot_id)
            handle = self._handles.get(key)
            if handle:
                handle.last_used = time.time()
