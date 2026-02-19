from __future__ import annotations

import time
from typing import Any

from fastapi import HTTPException

from ..models import ShellHandle
class SessionStoreMixin:
    def _resolve_credentials(self, robot_id: str) -> tuple[str, str, str, int]:
        robot = self.robots_by_id.get(robot_id)
        if not robot:
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {robot_id}")

        host = str(robot.get("ip") or "").strip()
        ssh_cfg = robot.get("ssh") if isinstance(robot.get("ssh"), dict) else {}
        username = str(ssh_cfg.get("username") or "").strip()
        password = str(ssh_cfg.get("password") or "").strip()
        port = int(ssh_cfg.get("port") or 22)

        if not host:
            raise HTTPException(status_code=400, detail=f"Robot {robot_id} missing 'ip' in config")
        if not username or not password:
            raise HTTPException(
                status_code=400,
                detail=f"Robot {robot_id} missing SSH username/password in config",
            )

        return host, username, password, port

    def _close_handle(self, key: tuple[str, str]) -> None:
        handle = self._handles.pop(key, None)
        if not handle:
            return
        try:
            handle.shell.close()
        except RuntimeError:
            pass

    def _evict_idle_locked(self) -> None:
        now = time.time()
        for key, handle in list(self._handles.items()):
            if now - handle.last_used > self.idle_timeout_sec:
                self._close_handle(key)

    def get_or_connect(self, page_session_id: str, robot_id: str):
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        key = (page_session_id, robot_id)
        with self._lock:
            self._evict_idle_locked()
            existing = self._handles.get(key)
            if existing:
                existing.last_used = time.time()
                return existing.shell

        host, username, password, port = self._resolve_credentials(robot_id)

        from . import InteractiveShell

        shell = InteractiveShell(
            host=host,
            username=username,
            password=password,
            port=port,
            connect_timeout=self.TERMINAL_CONNECT_TIMEOUT_SEC,
            prompt_regex=r"[$#] ",
        )
        try:
            shell.connect()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"SSH connect failed for {robot_id} ({host}:{port}): {exc}",
            ) from exc

        with self._lock:
            self._handles[key] = ShellHandle(shell=shell, last_used=time.time())
        return shell

    def close_session(self, page_session_id: str, robot_id: str) -> None:
        with self._lock:
            self._close_handle((page_session_id, robot_id))

    def close_all(self) -> None:
        self._stop_auto_monitor()
        with self._lock:
            for key in list(self._handles.keys()):
                self._close_handle(key)
