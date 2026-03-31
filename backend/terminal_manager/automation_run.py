from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Callable

from ..ssh_client import AutomationCommandResult, InteractiveShell
from .transport_pool import SshTransportPool


@dataclass
class AutomationRunTiming:
    queue_ms: int = 0
    connect_ms: int = 0
    execute_ms: int = 0
    total_ms: int = 0


class AutomationRunContext:
    def __init__(
        self,
        *,
        pool: SshTransportPool,
        robot_id: str,
        host: str,
        username: str,
        password: str,
        port: int,
        run_kind: str,
        page_session_id: str,
        queue_timeout_sec: float,
        connect_timeout_sec: float,
        execute_timeout_sec: float,
        prompt_regex: str = r"[$#] ",
        term: str = "xterm-256color",
        width: int = 160,
        height: int = 48,
        initial_directory: str | None = None,
        time_fn: Callable[[], float] = time.time,
    ):
        self._pool = pool
        self._robot_id = robot_id
        self._host = host
        self._username = username
        self._password = password
        self._port = int(port)
        self._run_kind = run_kind
        self._page_session_id = page_session_id
        self._queue_timeout_sec = max(0.0, float(queue_timeout_sec))
        self._connect_timeout_sec = max(0.1, float(connect_timeout_sec))
        self._execute_timeout_sec = max(0.1, float(execute_timeout_sec))
        self._prompt_regex = prompt_regex
        self._term = term
        self._width = int(width)
        self._height = int(height)
        self._initial_directory = str(initial_directory or "").strip() or None
        self._time = time_fn

        self._run_id = f"{run_kind}-{robot_id}-{uuid.uuid4().hex[:10]}"
        self._timing = AutomationRunTiming()
        self._transport_reused = False
        self._started_at = self._time()
        self._closed = False
        self._shell: InteractiveShell | None = None

    @property
    def run_id(self) -> str:
        return self._run_id

    def _ensure_open(self) -> None:
        if self._shell is not None:
            return

        acquire_result = self._pool.acquire_client(
            robot_id=self._robot_id,
            host=self._host,
            username=self._username,
            password=self._password,
            port=self._port,
            connect_timeout_sec=self._connect_timeout_sec,
            queue_timeout_sec=self._queue_timeout_sec,
        )
        self._timing.queue_ms += int(acquire_result.queue_ms)
        self._timing.connect_ms += int(acquire_result.connect_ms)
        self._transport_reused = bool(acquire_result.reused)

        shell_connect_started = self._time()
        shell = InteractiveShell(
            host=self._host,
            username=self._username,
            password=self._password,
            port=self._port,
            connect_timeout=self._connect_timeout_sec,
            term=self._term,
            width=self._width,
            height=self._height,
            prompt_regex=self._prompt_regex,
            initial_directory=self._initial_directory,
            connected_client=acquire_result.client,
            owns_client=False,
        )
        try:
            shell.connect()
        except Exception:
            self._pool.hard_reset_robot(self._robot_id)
            raise
        self._timing.connect_ms += max(0, int((self._time() - shell_connect_started) * 1000))
        self._shell = shell

    def run_command(
        self,
        command: str,
        timeout_sec: float | None = None,
        sudo_password: str | None = None,
    ) -> AutomationCommandResult:
        self._ensure_open()
        assert self._shell is not None

        execute_timeout = self._execute_timeout_sec if timeout_sec is None else max(0.1, float(timeout_sec))
        started = self._time()
        try:
            return self._shell.run_automation_command(
                command,
                timeout=execute_timeout,
                sudo_password=sudo_password,
            )
        finally:
            self._timing.execute_ms += max(0, int((self._time() - started) * 1000))

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True

        shell = self._shell
        self._shell = None
        if shell is not None:
            try:
                shell.close()
            except Exception:
                pass

        self._timing.total_ms = max(0, int((self._time() - self._started_at) * 1000))

    def interrupt(self) -> None:
        shell = self._shell
        self._shell = None
        if shell is not None:
            try:
                shell.close()
            except Exception:
                pass
        try:
            self._pool.hard_reset_robot(self._robot_id)
        except Exception:
            pass

    def timing_payload(self) -> dict[str, int]:
        if not self._closed:
            self._timing.total_ms = max(0, int((self._time() - self._started_at) * 1000))
        return {
            "queueMs": int(self._timing.queue_ms),
            "connectMs": int(self._timing.connect_ms),
            "executeMs": int(self._timing.execute_ms),
            "totalMs": int(self._timing.total_ms),
        }

    def session_payload(self) -> dict[str, object]:
        return {
            "runId": self._run_id,
            "robotId": self._robot_id,
            "pageSessionId": self._page_session_id,
            "runKind": self._run_kind,
            "transportReused": bool(self._transport_reused),
            "resetPolicy": "run_scoped_shell",
        }

    def metadata_payload(self) -> dict[str, object]:
        return {
            "timing": self.timing_payload(),
            "session": self.session_payload(),
        }

    def __enter__(self) -> "AutomationRunContext":
        self._ensure_open()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        self.close()
        return None
