from __future__ import annotations

import re
import socket
import threading
import time
import uuid
from dataclasses import dataclass
from queue import Empty, Queue
from typing import Any, Callable, Optional, Protocol

import paramiko

from .normalization import strip_terminal_control_sequences


class ShellChannel(Protocol):
    def settimeout(self, timeout: float | None) -> None: ...
    def recv_ready(self) -> bool: ...
    def recv(self, nbytes: int) -> bytes: ...
    def send(self, text: str) -> None: ...
    def close(self) -> None: ...
    def resize_pty(self, width: int, height: int) -> None: ...


class ShellClient(Protocol):
    def set_missing_host_key_policy(self, policy: Any) -> None: ...
    def connect(self, **kwargs: Any) -> None: ...
    def invoke_shell(
        self,
        term: str = ...,
        width: int = ...,
        height: int = ...,
    ) -> ShellChannel: ...
    def close(self) -> None: ...


@dataclass
class ShellOutput:
    text: str


class InteractiveShell:
    """
    Persistent SSH shell session using paramiko.invoke_shell().
    - send() sends raw text (keystrokes)
    - sendline() sends a line + newline
    - read() returns accumulated output (non-blocking)
    - run_command() sends a command and waits for prompt (best-effort)
    """

    READ_BLOCK_TIMEOUT_SEC = 0.2
    COMMAND_DONE_PREFIX = "__CODEX_CMD_DONE__"

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        port: int = 22,
        connect_timeout: float = 10.0,
        term: str = "xterm-256color",
        width: int = 160,
        height: int = 48,
        prompt_regex: str = r"[$#] ",  # typical bash/zsh prompt end
        client_factory: Callable[[], ShellClient] = paramiko.SSHClient,
        sleep_fn: Callable[[float], None] = time.sleep,
        time_fn: Callable[[], float] = time.time,
        prompt_detector: Optional[Callable[[str], bool]] = None,
    ):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.connect_timeout = connect_timeout
        self.term = term
        self.width = width
        self.height = height
        self.prompt_re = re.compile(prompt_regex)
        self._client_factory = client_factory
        self._sleep = sleep_fn
        self._time = time_fn
        self._prompt_detector = prompt_detector

        self.client: Optional[ShellClient] = None
        self.chan: Optional[ShellChannel] = None

        self._out_queue: Queue[str] = Queue()
        self._reader_thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def __enter__(self) -> "InteractiveShell":
        self.connect()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        self.close()
        return None

    def connect(self) -> None:
        self.client = self._client_factory()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            timeout=self.connect_timeout,
            allow_agent=False,
            look_for_keys=False,
        )

        self.chan = self.client.invoke_shell(
            term=self.term,
            width=self.width,
            height=self.height,
        )
        self.chan.settimeout(self.READ_BLOCK_TIMEOUT_SEC)

        self._stop.clear()
        self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self._reader_thread.start()

        # Give it a moment to print banner/prompt.
        self._sleep(0.2)

    def close(self) -> None:
        self._stop.set()
        if self.chan:
            try:
                self.chan.close()
            except Exception:
                pass
            self.chan = None
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None

    def resize_pty(self, width: int, height: int) -> None:
        """Call this when your UI terminal resizes."""
        self.width, self.height = width, height
        if self.chan:
            self.chan.resize_pty(width=width, height=height)

    def _reader_loop(self) -> None:
        assert self.chan is not None
        while not self._stop.is_set():
            try:
                data = self.chan.recv(4096)
                if not data:
                    break
                self._out_queue.put(data.decode(errors="replace"))
            except socket.timeout:
                continue
            except Exception:
                if self._stop.is_set():
                    break
                self._sleep(0.05)

    def _is_prompt(self, buf: str) -> bool:
        if self._prompt_detector:
            return bool(self._prompt_detector(buf))
        cleaned = strip_terminal_control_sequences(buf).replace("\r", "")
        tail = cleaned[-1024:]
        return bool(re.search(rf"(?:{self.prompt_re.pattern})\s*$", tail))

    def _build_completion_marker(self) -> tuple[str, str]:
        marker = f"{self.COMMAND_DONE_PREFIX}{uuid.uuid4().hex}__"
        command = f"printf '\\n%s\\n' '{marker}'"
        return marker, command

    @staticmethod
    def _marker_pattern(marker: str) -> re.Pattern[str]:
        return re.compile(rf"(?:^|[\r\n]){re.escape(marker)}(?:[\r\n]|$)")

    def send(self, text: str) -> None:
        """Send raw keystrokes/text (no newline added)."""
        if not self.chan:
            raise RuntimeError("Not connected")
        self.chan.send(text)

    def sendline(self, line: str) -> None:
        """Send a line and press Enter."""
        self.send(line + "\n")

    def read(self, max_chunks: int = 100, wait_timeout: float = 0.0) -> str:
        """Non-blocking: drain output accumulated so far."""
        chunk_limit = max(1, int(max_chunks))
        chunks = []
        blocking_timeout = max(0.0, float(wait_timeout))
        if blocking_timeout > 0:
            try:
                chunks.append(self._out_queue.get(timeout=blocking_timeout))
            except Empty:
                return ""
        for _ in range(max(0, chunk_limit - len(chunks))):
            try:
                chunks.append(self._out_queue.get_nowait())
            except Empty:
                break
        return "".join(chunks)

    def run_command(self, command: str, timeout: float = 10.0) -> str:
        """
        Send a command and wait until we *think* the prompt is back.
        This is best-effort (prompts differ; interactive programs won't return).
        """
        if not self.chan:
            raise RuntimeError("Not connected")

        # Drain any old output so we only return output from this command onward.
        _ = self.read()
        marker, marker_command = self._build_completion_marker()
        marker_pattern = self._marker_pattern(marker)
        self.send(f"{command}\n{marker_command}\n")

        buf = ""
        start = self._time()
        while True:
            chunk = self.read(wait_timeout=0.05)
            if chunk:
                buf += chunk
                match = marker_pattern.search(buf)
                if match:
                    return buf[: match.start()]
            else:
                self._sleep(0.01)
            if (self._time() - start) > timeout:
                return buf  # return what we got so far (don't hang forever)
