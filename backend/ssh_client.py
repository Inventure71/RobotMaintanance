from __future__ import annotations

import re
import socket
import threading
import time
import uuid
from dataclasses import dataclass
from queue import Empty, Full, Queue
from typing import Any, Callable, Optional, Protocol

import paramiko

from .normalization import strip_terminal_control_sequences


class ShellChannel(Protocol):
    def settimeout(self, timeout: float | None) -> None: ...
    def recv_ready(self) -> bool: ...
    def recv(self, nbytes: int) -> bytes: ...
    def send(self, text: str) -> int | None: ...
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


@dataclass
class AutomationCommandResult:
    output: str
    exit_code: int | None
    timed_out: bool
    used_sudo: bool
    sudo_authenticated: bool


class InteractiveShell:
    """
    Persistent SSH shell session using paramiko.invoke_shell().
    - send() sends raw text (keystrokes)
    - sendline() sends a line + newline
    - read() returns accumulated output (non-blocking)
    - run_command() sends a command and waits for prompt (best-effort)
    """

    READ_BLOCK_TIMEOUT_SEC = 0.2
    STARTUP_DRAIN_MAX_SEC = 3.0
    STARTUP_DRAIN_IDLE_SEC = 0.25
    STARTUP_DRAIN_QUIET_WINDOWS = 2
    OUTPUT_QUEUE_MAX_CHUNKS = 1024
    SUDO_PROMPT_SETTLE_SEC = 0.05
    SUDO_RESET_TIMEOUT_SEC = 2.0
    SUDO_RESET_QUIET_SEC = 0.1
    COMMAND_DONE_PREFIX = "__CODEX_CMD_DONE__"
    AUTOMATION_DONE_PREFIX = "__CODEX_AUTO_DONE__"
    AUTOMATION_EXIT_PREFIX = "__CODEX_AUTO_EXIT__"
    SUDO_PROMPT_PREFIX = "__CODEX_SUDO_PROMPT__"
    AUTOMATION_STATUS_LINE = "__CODEX_AUTOMATION_STATUS=$?"
    SUDO_FAILURE_PHRASES = (
        "sorry, try again.",
        "sudo: a password is required",
        "sudo: 1 incorrect password attempt",
        "sudo: 3 incorrect password attempts",
        "is not in the sudoers file",
    )
    PROMPT_PREFIX_RE = re.compile(
        r"^(?:\([^)\n]+\)\s+)?"
        r"[\w.-]+@(?:terminal|[\w.-]+:(?:~(?:/\S*)?|/\S*))"
        r"[#$]\s+"
    )

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

        queue_limit = max(1, int(getattr(self, "OUTPUT_QUEUE_MAX_CHUNKS", 1024)))
        self._out_queue: Queue[str] = Queue(maxsize=queue_limit)
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

        self._drain_startup_output()

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
                self._enqueue_output_chunk(data.decode(errors="replace"))
            except socket.timeout:
                continue
            except Exception:
                if self._stop.is_set():
                    break
                self._sleep(0.05)

    def _enqueue_output_chunk(self, chunk: str) -> None:
        text = str(chunk or "")
        if not text:
            return
        while not self._stop.is_set():
            try:
                self._out_queue.put_nowait(text)
                return
            except Full:
                try:
                    self._out_queue.get_nowait()
                except Empty:
                    continue

    def _drain_startup_output(self) -> None:
        max_wait = max(0.0, float(getattr(self, "STARTUP_DRAIN_MAX_SEC", 0.0)))
        quiet_window = max(0.01, float(getattr(self, "STARTUP_DRAIN_IDLE_SEC", 0.15)))
        quiet_windows = max(1, int(getattr(self, "STARTUP_DRAIN_QUIET_WINDOWS", 2)))
        if max_wait <= 0:
            return

        deadline = self._time() + max_wait
        saw_output = False
        quiet_count = 0
        while True:
            remaining = max(0.0, deadline - self._time())
            if remaining <= 0:
                return
            if self.read(wait_timeout=min(quiet_window, remaining)):
                saw_output = True
                quiet_count = 0
                continue
            if not saw_output:
                return
            quiet_count += 1
            if quiet_count >= quiet_windows:
                return

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
    def _build_marker(prefix: str) -> str:
        return f"{prefix}{uuid.uuid4().hex}__"

    @staticmethod
    def _marker_pattern(marker: str) -> re.Pattern[str]:
        return re.compile(rf"(?:^|[\r\n]){re.escape(marker)}(?:[\r\n]|$)")

    @staticmethod
    def _contains_sudo_prefix(command: str) -> bool:
        return bool(re.match(r"^\s*sudo(?:\s|$)", str(command or "")))

    @staticmethod
    def _strip_marker_lines(text: str, markers: list[str]) -> str:
        if not text:
            return ""
        cleaned = []
        for raw_line in str(text).replace("\r", "").split("\n"):
            if any(marker and marker in raw_line for marker in markers):
                continue
            cleaned.append(raw_line)
        return "\n".join(cleaned).strip("\n")

    def _strip_trailing_prompt_lines(self, text: str) -> str:
        lines = str(text or "").replace("\r", "").split("\n")
        while lines and self._is_prompt(lines[-1]):
            lines.pop()
        return "\n".join(lines).strip("\n")

    @staticmethod
    def _strip_prompt_prefix(raw_line: str) -> str:
        match = InteractiveShell.PROMPT_PREFIX_RE.match(str(raw_line or ""))
        if not match:
            return str(raw_line or "")
        return str(raw_line or "")[match.end() :]

    @classmethod
    def _is_scaffold_line(cls, raw_line: str, scaffold_lines: list[str]) -> bool:
        stripped = str(raw_line or "").strip()
        if not stripped:
            return False

        normalized = cls._strip_prompt_prefix(raw_line).strip()
        scaffold_set = {item for item in scaffold_lines if item}

        if stripped in scaffold_set or normalized in scaffold_set:
            return True
        if stripped.startswith("> ") and stripped[2:].strip() in scaffold_set:
            return True
        if normalized.startswith("> ") and normalized[2:].strip() in scaffold_set:
            return True
        return False

    @classmethod
    def _strip_leading_scaffold_lines(cls, text: str, scaffold_lines: list[str]) -> str:
        lines = str(text or "").replace("\r", "").split("\n")
        while lines and cls._is_scaffold_line(lines[0], scaffold_lines):
            lines.pop(0)

        filtered = [
            line
            for line in lines
            if not cls._is_scaffold_line(line, [cls.AUTOMATION_STATUS_LINE])
        ]
        return "\n".join(filtered).strip("\n")

    def _reset_sudo_timestamp(self) -> None:
        if not self.chan:
            return
        try:
            _ = self.read()
            self.sendline("sudo -k")

            buf = ""
            deadline = self._time() + max(
                0.1, float(getattr(self, "SUDO_RESET_TIMEOUT_SEC", 2.0))
            )
            while self._time() < deadline:
                chunk = self.read(wait_timeout=0.05)
                if chunk:
                    buf += strip_terminal_control_sequences(chunk).replace("\r", "")
                    if self._is_prompt(buf):
                        break
                    continue
                self._sleep(0.01)

            quiet_deadline = self._time() + max(
                0.0, float(getattr(self, "SUDO_RESET_QUIET_SEC", 0.0))
            )
            while self._time() < quiet_deadline:
                if not self.read(wait_timeout=min(0.05, quiet_deadline - self._time())):
                    break
        except Exception:
            pass

    @staticmethod
    def _replace_sudo_prefix(command: str, replacement: str) -> str:
        return re.sub(
            r"^(\s*)sudo(?=\s|$)",
            rf"\1{replacement}",
            str(command or ""),
            count=1,
        )

    @staticmethod
    def _inject_sudo_prompt(command: str, prompt_marker: str) -> str:
        return InteractiveShell._replace_sudo_prefix(command, f"sudo -S -p '{prompt_marker}'")

    @staticmethod
    def _inject_noninteractive_sudo(command: str) -> str:
        return InteractiveShell._replace_sudo_prefix(command, "sudo -n")

    @staticmethod
    def _sudo_prompt_visible(text: str, prompt_marker: str) -> bool:
        if not prompt_marker:
            return False
        cleaned = str(text or "").replace("\r", "")
        return bool(
            re.search(rf"(?:^|[\n]){re.escape(prompt_marker)}[ \t]*(?:\n|$)", cleaned)
        )

    def _authenticate_sudo_in_pty(self, sudo_password: str, timeout: float) -> bool:
        if not self.chan:
            raise RuntimeError("Not connected")

        _ = self.read()
        prompt_marker = self._build_marker(self.SUDO_PROMPT_PREFIX)
        self.sendline(f"sudo -S -p '{prompt_marker}' -v")

        buf = ""
        start = self._time()
        password_sent = False
        while True:
            chunk = self.read(wait_timeout=0.05)
            if chunk:
                buf += chunk
                cleaned = strip_terminal_control_sequences(buf).replace("\r", "")
                lowered = cleaned.lower()

                if self._sudo_prompt_visible(cleaned, prompt_marker):
                    if password_sent:
                        raise RuntimeError("sudo authentication failed: password was rejected")
                    settle_timeout = min(
                        max(0.0, float(getattr(self, "SUDO_PROMPT_SETTLE_SEC", 0.0))),
                        max(0.0, timeout - (self._time() - start)),
                    )
                    if settle_timeout > 0:
                        settled_chunk = self.read(wait_timeout=settle_timeout)
                        if settled_chunk:
                            buf += settled_chunk
                            cleaned = strip_terminal_control_sequences(buf).replace("\r", "")
                            lowered = cleaned.lower()
                    if any(phrase in lowered for phrase in self.SUDO_FAILURE_PHRASES):
                        raise RuntimeError("sudo authentication failed")
                    self.sendline(str(sudo_password or ""))
                    password_sent = True
                    buf = ""
                    continue

                if any(phrase in lowered for phrase in self.SUDO_FAILURE_PHRASES):
                    raise RuntimeError("sudo authentication failed")

                if password_sent and self._is_prompt(cleaned):
                    return password_sent
            else:
                self._sleep(0.01)

            if (self._time() - start) > timeout:
                raise RuntimeError("sudo authentication timed out")

    def run_automation_command(
        self,
        command: str,
        timeout: float = 10.0,
        sudo_password: str | None = None,
    ) -> AutomationCommandResult:
        if not self.chan:
            raise RuntimeError("Not connected")

        timeout_value = max(0.1, float(timeout))
        used_sudo = self._contains_sudo_prefix(command)
        if used_sudo and not sudo_password:
            raise RuntimeError("sudo command requires a sudo password")
        sudo_authenticated = False
        command_to_run = command
        if used_sudo:
            self._reset_sudo_timestamp()
            sudo_authenticated = self._authenticate_sudo_in_pty(
                sudo_password=str(sudo_password or ""),
                timeout=min(timeout_value, 10.0),
            )
            command_to_run = self._inject_noninteractive_sudo(command)

        _ = self.read()
        exit_marker = self._build_marker(self.AUTOMATION_EXIT_PREFIX)
        done_marker = self._build_marker(self.AUTOMATION_DONE_PREFIX)
        done_pattern = self._marker_pattern(done_marker)
        exit_pattern = re.compile(rf"{re.escape(exit_marker)}(?P<exit>-?\d+)")
        wrapped_command = (
            f"{command_to_run}\n"
            "__CODEX_AUTOMATION_STATUS=$?\n"
            f"printf '\\n{exit_marker}%s\\n' \"$__CODEX_AUTOMATION_STATUS\"\n"
            f"printf '\\n{done_marker}\\n'\n"
        )
        self.send(wrapped_command)

        buf = ""
        start = self._time()
        timed_out = False
        while True:
            chunk = self.read(wait_timeout=0.05)
            if chunk:
                buf += chunk
                cleaned = strip_terminal_control_sequences(buf).replace("\r", "")
                lowered = cleaned.lower()

                if any(phrase in lowered for phrase in self.SUDO_FAILURE_PHRASES):
                    raise RuntimeError("sudo authentication failed")

                if done_pattern.search(cleaned):
                    buf = cleaned
                    break
            else:
                self._sleep(0.01)
            if (self._time() - start) > timeout_value:
                timed_out = True
                break

        match = exit_pattern.search(buf)
        exit_code = None
        if match:
            try:
                exit_code = int(match.group("exit"))
            except Exception:
                exit_code = None

        output = self._strip_marker_lines(
            strip_terminal_control_sequences(buf).replace("\r", ""),
            [exit_marker, done_marker],
        )
        scaffold_lines = [line for line in str(command_to_run or "").replace("\r", "").split("\n") if line]
        scaffold_lines.append(self.AUTOMATION_STATUS_LINE)
        output = self._strip_leading_scaffold_lines(output, scaffold_lines)
        output = self._strip_trailing_prompt_lines(output)

        if used_sudo:
            self._reset_sudo_timestamp()

        return AutomationCommandResult(
            output=output,
            exit_code=exit_code,
            timed_out=timed_out,
            used_sudo=used_sudo,
            sudo_authenticated=sudo_authenticated,
        )

    def send(self, text: str) -> None:
        """Send raw keystrokes/text (no newline added)."""
        if not self.chan:
            raise RuntimeError("Not connected")
        remaining = str(text or "")
        while remaining:
            written = self.chan.send(remaining)
            if written is None:
                return
            if written <= 0:
                raise RuntimeError("SSH send failed")
            remaining = remaining[written:]

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
