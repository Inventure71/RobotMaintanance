from __future__ import annotations

import socket
from typing import Any
from queue import Queue

import pytest

from backend.ssh_client import AutomationCommandResult, InteractiveShell


class FakeChannel:
    def __init__(self, ready_sequence=None):
        self.ready_sequence = ready_sequence or []
        self.sent: list[str] = []
        self.closed = False
        self.resize_calls: list[tuple[int, int]] = []

    def settimeout(self, timeout: float | None) -> None:
        self.timeout = timeout

    def recv_ready(self) -> bool:
        if not self.ready_sequence:
            return False
        return bool(self.ready_sequence.pop(0))

    def recv(self, nbytes: int) -> bytes:
        return b""

    def send(self, text: str) -> None:
        self.sent.append(text)
        return len(text)

    def close(self) -> None:
        self.closed = True

    def resize_pty(self, width: int, height: int) -> None:
        self.resize_calls.append((width, height))


class StreamingChannel(FakeChannel):
    def __init__(self, outputs: list[str]):
        super().__init__()
        self.outputs = [item.encode() for item in outputs]

    def recv(self, nbytes: int) -> bytes:
        _ = nbytes
        if self.outputs:
            return self.outputs.pop(0)
        raise socket.timeout()


class PartialSendChannel(FakeChannel):
    def __init__(self, split_at: int):
        super().__init__()
        self.split_at = max(1, int(split_at))

    def send(self, text: str) -> int:
        chunk = str(text or "")[: self.split_at]
        self.sent.append(chunk)
        return len(chunk)


class FakeClient:
    def __init__(self, shell: FakeChannel | None = None):
        self.connected_kwargs: dict[str, Any] | None = None
        self.host_key_policy = None
        self.shell = shell or FakeChannel()
        self.closed = False

    def set_missing_host_key_policy(self, policy: Any) -> None:
        self.host_key_policy = policy

    def connect(self, **kwargs: Any) -> None:
        self.connected_kwargs = kwargs

    def invoke_shell(self, term: str = "xterm-256color", width: int = 160, height: int = 48):
        return self.shell

    def close(self) -> None:
        self.closed = True


def _sent_completion_marker(sent_payload: str) -> str:
    return sent_payload.split("printf '\\n%s\\n' '", 1)[1].split("'", 1)[0]


def _sent_auth_prompt_marker(sent_payload: str) -> str:
    return sent_payload.split("sudo -S -p '", 1)[1].split("'", 1)[0]


def _sent_automation_markers(sent_payload: str) -> tuple[str, str]:
    exit_marker = sent_payload.split("printf '\\n", 1)[1].split("%s\\n'", 1)[0]
    done_marker = sent_payload.rsplit("printf '\\n", 1)[1].split("\\n'", 1)[0]
    return exit_marker, done_marker


def test_connect_calls_paramiko_like_client_methods():
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="10.0.0.5",
        username="robot",
        password="pw",
        port=2222,
        client_factory=lambda: fake_client,
        time_fn=lambda: 0.0,
    )

    try:
        shell.connect()

        assert fake_client.connected_kwargs is not None
        assert fake_client.connected_kwargs["hostname"] == "10.0.0.5"
        assert fake_client.connected_kwargs["port"] == 2222
        assert fake_client.connected_kwargs["username"] == "robot"
        assert fake_client.connected_kwargs["password"] == "pw"
        assert fake_client.host_key_policy is not None
        assert isinstance(shell.chan, FakeChannel)
    finally:
        shell.close()


def test_connect_keeps_startup_banner_output_available():
    fake_channel = StreamingChannel(
        [
            "Last login: Wed Mar 18 09:44:42 2026 from 10.205.1.100\r\n",
            "Husarion banner line 1\r\n",
            "husarion@alexander:~$ ",
        ]
    )
    fake_client = FakeClient(shell=fake_channel)
    shell = InteractiveShell(
        host="10.0.0.5",
        username="robot",
        password="pw",
        port=2222,
        client_factory=lambda: fake_client,
    )
    try:
        shell.connect()
        banner = shell.read(wait_timeout=0.1)
        assert "Last login:" in banner
        assert "husarion@alexander:~$ " in banner
    finally:
        shell.close()


def test_connect_sets_configured_initial_directory():
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="10.0.0.5",
        username="robot",
        password="pw",
        port=2222,
        initial_directory="/home/robot/workspace",
        client_factory=lambda: fake_client,
    )
    observed = {"command": None}

    def fake_run_automation_command(command: str, timeout: float = 10.0, sudo_password=None):
        _ = (timeout, sudo_password)
        observed["command"] = command
        return AutomationCommandResult(
            output="",
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    shell.run_automation_command = fake_run_automation_command  # type: ignore[method-assign]
    try:
        shell.connect()
        command = str(observed["command"] or "")
        assert "__VIGIL_START_DIR='/home/robot/workspace'" in command
        assert 'cd -- "$__VIGIL_START_DIR"' in command
    finally:
        shell.close()


def test_connect_raises_when_initial_directory_cannot_be_set():
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="10.0.0.5",
        username="robot",
        password="pw",
        port=2222,
        initial_directory="/missing/path",
        client_factory=lambda: fake_client,
    )

    def fake_run_automation_command(command: str, timeout: float = 10.0, sudo_password=None):
        _ = (command, timeout, sudo_password)
        return AutomationCommandResult(
            output="bash: cd: /missing/path: No such file or directory",
            exit_code=1,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    shell.run_automation_command = fake_run_automation_command  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="Failed to set initial directory '/missing/path'"):
        shell.connect()


def test_connect_expands_tilde_initial_directory_to_home():
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="10.0.0.5",
        username="robot",
        password="pw",
        port=2222,
        initial_directory="~",
        client_factory=lambda: fake_client,
    )
    observed = {"command": None}

    def fake_run_automation_command(command: str, timeout: float = 10.0, sudo_password=None):
        _ = (timeout, sudo_password)
        observed["command"] = command
        return AutomationCommandResult(
            output="",
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    shell.run_automation_command = fake_run_automation_command  # type: ignore[method-assign]
    try:
        shell.connect()
        command = str(observed["command"] or "")
        assert "__VIGIL_START_DIR='~'" in command
        assert "__VIGIL_LOGIN_HOME" in command
        assert "'~') __VIGIL_START_DIR=\"$__VIGIL_LOGIN_HOME\"" in command
    finally:
        shell.close()


def test_sendline_appends_newline():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        sleep_fn=lambda _: None,
    )
    shell.chan = fake_channel
    shell.client = fake_client

    shell.sendline("status")
    assert fake_channel.sent == ["status\n"]


def test_send_retries_until_full_text_is_written():
    fake_channel = PartialSendChannel(split_at=2)
    fake_client = FakeClient(shell=fake_channel)
    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        sleep_fn=lambda _: None,
    )
    shell.chan = fake_channel
    shell.client = fake_client

    shell.send("husarion\n")

    assert fake_channel.sent == ["hu", "sa", "ri", "on", "\n"]


def test_output_queue_drops_oldest_chunks_when_full():
    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=FakeClient,
        sleep_fn=lambda _: None,
    )
    shell.OUTPUT_QUEUE_MAX_CHUNKS = 2
    shell._out_queue = Queue(maxsize=2)

    shell._enqueue_output_chunk("first")
    shell._enqueue_output_chunk("second")
    shell._enqueue_output_chunk("third")

    assert shell.read(max_chunks=10) == "secondthird"


def test_run_command_returns_prompt_bound_output():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}
    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            completion_marker = _sent_completion_marker(fake_channel.sent[0])
            shell._out_queue.put(f"running\r\n{completion_marker}\r\n$ ")

    shell._sleep = fake_sleep

    output = shell.run_command("echo hi", timeout=1.0)

    assert len(fake_channel.sent) == 1
    assert fake_channel.sent[0].startswith("echo hi\nprintf '\\n%s\\n' '")
    assert "running" in output
    assert "__VIGIL_CMD_DONE__" not in output


def test_run_command_times_out_and_returns_partial_output():
    fake_client = FakeClient()
    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
    )

    now = {"v": 0.0}
    shell._time = lambda: now.__setitem__("v", now["v"] + 0.3) or now["v"]  # deterministic timeout
    shell.client = fake_client
    shell.chan = FakeChannel()
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            shell._out_queue.put("still running")

    shell._sleep = fake_sleep

    output = shell.run_command("cat /proc/does_not_matter", timeout=0.5)

    assert output == "still running"


def test_run_automation_command_wraps_markers_inside_single_shell_block():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            exit_marker, done_marker = _sent_automation_markers(fake_channel.sent[0])
            shell._out_queue.put(f"ok\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("echo ok", timeout=1.0)

    assert fake_channel.sent[0].startswith("{\necho ok\n__VIGIL_AUTOMATION_STATUS=$?\n")
    assert fake_channel.sent[0].endswith("}\n")
    assert result.output == "ok"
    assert result.exit_code == 0


def test_run_automation_command_supports_multiline_command_wrapper():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            exit_marker, done_marker = _sent_automation_markers(fake_channel.sent[0])
            shell._out_queue.put(f"line1\nline2\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("printf 'line1\\n'\nprintf 'line2\\n'", timeout=1.0)

    assert "{\nprintf 'line1\\n'\nprintf 'line2\\n'\n__VIGIL_AUTOMATION_STATUS=$?\n" in fake_channel.sent[0]
    assert result.output == "line1\nline2"
    assert result.exit_code == 0


def test_run_automation_command_handles_flash_style_transcript():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            wrapped = fake_channel.sent[0]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(
                "[1/3]\n"
                "Initiating firmware flash on the ROSbot's STM32F4 microcontroller.\n"
                "done\n\n"
                "[2/3]\n"
                "Stop rosbot Docker container if it is running\n"
                "rosbot\n\n"
                "[3/3]\n"
                "Flashing the firmware...\n"
                "System architecture: x86_64\n\n"
                "Write-unprotecting flash\n"
                "Done.\n\n"
                "Read-UnProtecting flash\n"
                "Done.\n\n"
                "Write to memory\n"
                "Erasing memory\n"
                "Wrote and verified address 0x08023b1c (100.00%) Done.\n\n"
                "Done.\n"
                "done\n"
                f"{exit_marker}0\n"
                f"{done_marker}\n$ "
            )

    shell._sleep = fake_sleep

    result = shell.run_automation_command("./flash_firmware.sh", timeout=2.0)

    assert result.exit_code == 0
    assert result.output.endswith("done")
    assert "__VIGIL_AUTO_DONE__" not in result.output


def test_run_command_waits_for_prompt_at_end_not_echoed_prompt():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._out_queue.put("husarion@agamemnon:~$ timeout 12s rostopic list\r\n")

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            shell._out_queue.put("/scan\r\n/odom\r\n")
            completion_marker = _sent_completion_marker(fake_channel.sent[0])
            shell._out_queue.put(f"{completion_marker}\r\nhusarion@agamemnon:~$ ")

    shell._sleep = fake_sleep

    output = shell.run_command("timeout 12s rostopic list", timeout=2.0)

    assert len(fake_channel.sent) == 1
    assert fake_channel.sent[0].startswith("timeout 12s rostopic list\nprintf '\\n%s\\n' '")
    assert sleep_calls["count"] >= 1
    assert "/scan" in output
    assert "__VIGIL_CMD_DONE__" not in output


def test_run_command_ignores_late_prompt_noise_until_completion_marker():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        completion_marker = _sent_completion_marker(fake_channel.sent[0])
        if sleep_calls["count"] == 1:
            shell._out_queue.put("husarion@alexander:~$ ")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put("/scan\r\n/odom\r\n")
            shell._out_queue.put(f"{completion_marker}\r\nhusarion@alexander:~$ ")

    shell._sleep = fake_sleep

    output = shell.run_command("timeout 12s rostopic list", timeout=2.0)

    assert sleep_calls["count"] >= 2
    assert "/scan" in output
    assert "__VIGIL_CMD_DONE__" not in output


def test_run_automation_command_returns_exit_code_and_strips_markers():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            wrapped = fake_channel.sent[0]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"hello\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("echo hello", timeout=1.0)

    assert result.output == "hello"
    assert result.exit_code == 0
    assert result.timed_out is False
    assert result.used_sudo is False
    assert result.sudo_authenticated is False


def test_run_automation_command_authenticates_sudo_once():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            prompt_marker = _sent_auth_prompt_marker(fake_channel.sent[0])
            shell._out_queue.put(f"{prompt_marker}\n")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 3:
            wrapped = fake_channel.sent[2]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"flashed\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent[0].startswith("sudo -S -p '")
    assert fake_channel.sent[0].endswith("' -v\n")
    assert "printf" not in fake_channel.sent[0]
    assert fake_channel.sent[1] == "pw\n"
    assert fake_channel.sent[2].startswith("{\nsudo -n rosbot.flash\n")
    assert fake_channel.sent[2].endswith("}\n")
    assert result.output == "flashed"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


def test_run_automation_command_ignores_sudo_marker_in_echoed_command():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        auth_sent = fake_channel.sent[0]
        prompt_marker = _sent_auth_prompt_marker(auth_sent)
        if sleep_calls["count"] == 1:
            shell._out_queue.put(auth_sent)
        elif sleep_calls["count"] == 2:
            shell._out_queue.put(f"{prompt_marker}\n")
        elif sleep_calls["count"] == 3:
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 4:
            wrapped = fake_channel.sent[2]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"done\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent.count("pw\n") == 1
    assert fake_channel.sent[2].startswith("{\nsudo -n rosbot.flash\n")
    assert result.output == "done"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


def test_run_automation_command_waits_for_complete_sudo_prompt_line():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None
    shell.SUDO_PROMPT_SETTLE_SEC = 0.0

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        auth_sent = fake_channel.sent[0]
        prompt_marker = _sent_auth_prompt_marker(auth_sent)
        if sleep_calls["count"] == 1:
            shell._out_queue.put(prompt_marker)
        elif sleep_calls["count"] == 2:
            assert fake_channel.sent == [auth_sent, "pw\n"]
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 3:
            wrapped = fake_channel.sent[2]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"done\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent[1] == "pw\n"
    assert fake_channel.sent[2].startswith("{\nsudo -n rosbot.flash\n")
    assert result.output == "done"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


def test_run_automation_command_waits_for_standalone_sudo_prompt_after_split_echo():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        auth_sent = fake_channel.sent[0]
        prompt_marker = _sent_auth_prompt_marker(auth_sent)
        if sleep_calls["count"] == 1:
            shell._out_queue.put(f"sudo -S -p '{prompt_marker}")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put("' -v\n")
        elif sleep_calls["count"] == 3:
            shell._out_queue.put(prompt_marker)
        elif sleep_calls["count"] == 4:
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 5:
            wrapped = fake_channel.sent[2]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"done\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent.count("pw\n") == 1
    assert result.output == "done"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


def test_run_automation_command_ignores_stale_shell_prompt_before_sudo_prompt():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        auth_sent = fake_channel.sent[0]
        prompt_marker = _sent_auth_prompt_marker(auth_sent)
        if sleep_calls["count"] == 1:
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put(f"\n{prompt_marker}\n")
        elif sleep_calls["count"] == 3 and len(fake_channel.sent) >= 2:
            shell._out_queue.put("$ ")
        elif len(fake_channel.sent) >= 3:
            wrapped = fake_channel.sent[2]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(f"done\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent[1] == "pw\n"
    assert result.output == "done"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


def test_run_automation_command_preserves_output_after_scaffold_echo():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        if sleep_calls["count"] == 1:
            wrapped = fake_channel.sent[0]
            exit_marker, done_marker = _sent_automation_markers(wrapped)
            shell._out_queue.put(
                "{\n"
                "timeout 12s rostopic list\n"
                "/scan\n"
                "/odom\n"
                "__VIGIL_AUTOMATION_STATUS=$?\n"
                f"printf '\\n{exit_marker}%s\\n' \"$__VIGIL_AUTOMATION_STATUS\"\n"
                f"printf '\\n{done_marker}\\n'\n"
                "}\n"
                f"{exit_marker}0\n"
                f"{done_marker}\n$ "
            )

    shell._sleep = fake_sleep

    result = shell.run_automation_command("timeout 12s rostopic list", timeout=1.0)

    assert result.output == "/scan\n/odom"
    assert result.exit_code == 0
    assert result.timed_out is False


def test_run_automation_command_preserves_shell_state_across_calls():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        wrapped = fake_channel.sent[-1]
        exit_marker, done_marker = _sent_automation_markers(wrapped)
        if sleep_calls["count"] == 1:
            shell._out_queue.put(f"{exit_marker}0\n{done_marker}\n$ ")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put(f"/tmp/project\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    first = shell.run_automation_command("cd /tmp/project", timeout=1.0)
    second = shell.run_automation_command("pwd", timeout=1.0)

    assert fake_channel.sent[0].startswith("{\ncd /tmp/project\n__VIGIL_AUTOMATION_STATUS=$?\n")
    assert fake_channel.sent[1].startswith("{\npwd\n__VIGIL_AUTOMATION_STATUS=$?\n")
    assert first.exit_code == 0
    assert second.output == "/tmp/project"
    assert second.exit_code == 0


def test_strip_prompt_prefix_handles_tilde_subdirectories():
    raw = "husarion@alexander:~/husarion_ws$ __VIGIL_AUTOMATION_STATUS=$?"

    assert InteractiveShell._strip_prompt_prefix(raw) == "__VIGIL_AUTOMATION_STATUS=$?"


def test_run_automation_command_rejects_repeated_sudo_prompt():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        prompt_marker = _sent_auth_prompt_marker(fake_channel.sent[0])
        if sleep_calls["count"] == 1:
            shell._out_queue.put(f"{prompt_marker}\n")
        elif sleep_calls["count"] == 2:
            shell._out_queue.put(f"{prompt_marker}\n")

    shell._sleep = fake_sleep

    with pytest.raises(RuntimeError, match="password was rejected"):
        shell.run_automation_command("sudo rosbot.flash", timeout=1.0, sudo_password="pw")


def test_run_automation_command_unwinds_immediately_when_channel_closes():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()

    sleep_calls = {"count": 0}

    def fake_sleep(_: float) -> None:
        sleep_calls["count"] += 1
        fake_channel.closed = True

    shell._sleep = fake_sleep

    with pytest.raises(RuntimeError, match="SSH session closed while waiting for automation command output"):
        shell.run_automation_command("tail -f /var/log/syslog", timeout=30.0)

    assert sleep_calls["count"] >= 1
    assert clock["v"] < 5.0


def test_run_automation_command_unwinds_immediately_when_channel_closes_during_sudo_auth():
    fake_channel = FakeChannel()
    fake_client = FakeClient()
    clock = {"v": 0.0}

    shell = InteractiveShell(
        host="h",
        username="u",
        password="p",
        client_factory=lambda: fake_client,
        time_fn=lambda: clock.__setitem__("v", clock["v"] + 0.1) or clock["v"],
    )
    shell.client = fake_client
    shell.chan = fake_channel
    shell._out_queue = Queue()
    shell._reset_sudo_timestamp = lambda: None

    def fake_sleep(_: float) -> None:
        fake_channel.closed = True

    shell._sleep = fake_sleep

    with pytest.raises(RuntimeError, match="SSH session closed while waiting for sudo authentication"):
        shell.run_automation_command("sudo rosbot.flash", timeout=30.0, sudo_password="pw")
