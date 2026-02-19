from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from queue import Empty, Queue
from typing import Any, Callable, Optional, Protocol

import paramiko


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
        self.chan.settimeout(0.0)  # non-blocking reads

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
                if self.chan.recv_ready():
                    data = self.chan.recv(4096)
                    if not data:
                        break
                    self._out_queue.put(data.decode(errors="replace"))
                else:
                    self._sleep(0.02)
            except Exception:
                self._sleep(0.05)

    def _is_prompt(self, buf: str) -> bool:
        if self._prompt_detector:
            return bool(self._prompt_detector(buf))
        cleaned = re.sub(r"\x1B\[[0-?]*[ -/]*[@-~]", "", buf).replace("\r", "")
        tail = cleaned[-1024:]
        return bool(re.search(rf"(?:{self.prompt_re.pattern})\s*$", tail))

    def send(self, text: str) -> None:
        """Send raw keystrokes/text (no newline added)."""
        if not self.chan:
            raise RuntimeError("Not connected")
        self.chan.send(text)

    def sendline(self, line: str) -> None:
        """Send a line and press Enter."""
        self.send(line + "\n")

    def read(self, max_chunks: int = 100) -> str:
        """Non-blocking: drain output accumulated so far."""
        chunks = []
        for _ in range(max_chunks):
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

        self.sendline(command)

        buf = ""
        start = self._time()
        while True:
            buf += self.read()
            # Heuristic: if prompt appears at end, command likely finished.
            if self._is_prompt(buf):
                return buf
            if (self._time() - start) > timeout:
                return buf  # return what we got so far (don't hang forever)
            self._sleep(0.05)
