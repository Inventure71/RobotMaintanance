from __future__ import annotations

import time
from typing import Any

from fastapi import HTTPException

from ..models import ShellHandle


class SessionStoreMixin:
    DEFAULT_SHELL_INITIAL_DIRECTORY = "~"

    def _idle_sweep_interval_sec(self) -> float:
        configured = float(getattr(self, "IDLE_SWEEP_INTERVAL_SEC", 2.0))
        return max(0.5, configured)

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

    def _resolve_initial_directory(self, robot_id: str) -> str:
        robot = self.robots_by_id.get(robot_id)
        if not isinstance(robot, dict):
            fallback = str(getattr(self, "DEFAULT_SHELL_INITIAL_DIRECTORY", "~") or "~").strip()
            return fallback or "~"

        ssh_cfg = robot.get("ssh") if isinstance(robot.get("ssh"), dict) else {}
        candidates = [
            ssh_cfg.get("initialDirectory"),
            ssh_cfg.get("initialDir"),
            ssh_cfg.get("cwd"),
            robot.get("initialDirectory"),
            robot.get("initialDir"),
            robot.get("cwd"),
        ]
        for raw in candidates:
            value = str(raw or "").strip()
            if value:
                return value

        fallback = str(getattr(self, "DEFAULT_SHELL_INITIAL_DIRECTORY", "~") or "~").strip()
        return fallback or "~"

    def _close_handle(self, key: tuple[str, str]) -> None:
        handle = self._handles.pop(key, None)
        if not handle:
            return
        try:
            handle.shell.close()
        except RuntimeError:
            pass

    def _evict_idle_locked(self, now: float | None = None) -> None:
        sweep_now = now if now is not None else time.time()
        for key, handle in list(self._handles.items()):
            if sweep_now - handle.last_used > self.idle_timeout_sec:
                self._close_handle(key)

    def _maybe_evict_idle_locked(self, now: float | None = None) -> None:
        sweep_now = now if now is not None else time.time()
        next_sweep_at = float(getattr(self, "_next_idle_sweep_at", 0.0))
        if sweep_now < next_sweep_at:
            return
        self._evict_idle_locked(now=sweep_now)
        self._next_idle_sweep_at = sweep_now + self._idle_sweep_interval_sec()

    def get_or_connect(self, page_session_id: str, robot_id: str):
        self._mark_manual_activity(robot_id=robot_id, page_session_id=page_session_id)
        key = (page_session_id, robot_id)
        with self._lock:
            now = time.time()
            self._maybe_evict_idle_locked(now=now)
            existing = self._handles.get(key)
            if existing:
                existing.last_used = now
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
            initial_directory=self._resolve_initial_directory(robot_id),
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
        transport_pool = getattr(self, "_transport_pool", None)
        if transport_pool is not None:
            try:
                transport_pool.close_all()
            except Exception:
                pass
