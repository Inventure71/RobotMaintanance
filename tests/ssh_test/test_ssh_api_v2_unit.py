from __future__ import annotations

from typing import Any
from queue import Queue

import pytest

from backend.ssh_client import InteractiveShell


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

    def close(self) -> None:
        self.closed = True

    def resize_pty(self, width: int, height: int) -> None:
        self.resize_calls.append((width, height))


class FakeClient:
    def __init__(self):
        self.connected_kwargs: dict[str, Any] | None = None
        self.host_key_policy = None
        self.shell = FakeChannel()
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
    assert "__CODEX_CMD_DONE__" not in output


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
    assert "__CODEX_CMD_DONE__" not in output


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
    assert "__CODEX_CMD_DONE__" not in output


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
            exit_marker = wrapped.split("printf '\\n", 1)[1].split("%s\\n'", 1)[0]
            done_marker = wrapped.rsplit("printf '\\n", 1)[1].split("\\n'", 1)[0]
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
            prompt_marker = fake_channel.sent[0].split("sudo -S -p '", 1)[1].split("'", 1)[0]
            shell._out_queue.put(prompt_marker)
        elif sleep_calls["count"] == 2:
            shell._out_queue.put("$ ")
        elif sleep_calls["count"] == 3:
            wrapped = fake_channel.sent[2]
            exit_marker = wrapped.split("printf '\\n", 1)[1].split("%s\\n'", 1)[0]
            done_marker = wrapped.rsplit("printf '\\n", 1)[1].split("\\n'", 1)[0]
            shell._out_queue.put(f"flashed\n{exit_marker}0\n{done_marker}\n$ ")

    shell._sleep = fake_sleep

    result = shell.run_automation_command("sudo rosbot.flash", timeout=2.0, sudo_password="pw")

    assert fake_channel.sent[0].startswith("sudo -S -p '")
    assert fake_channel.sent[1] == "pw\n"
    assert "sudo rosbot.flash" in fake_channel.sent[2]
    assert result.output == "flashed"
    assert result.exit_code == 0
    assert result.used_sudo is True
    assert result.sudo_authenticated is True


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
        prompt_marker = fake_channel.sent[0].split("sudo -S -p '", 1)[1].split("'", 1)[0]
        if sleep_calls["count"] == 1:
            shell._out_queue.put(prompt_marker)
        elif sleep_calls["count"] == 2:
            shell._out_queue.put(prompt_marker)

    shell._sleep = fake_sleep

    with pytest.raises(RuntimeError, match="password was rejected"):
        shell.run_automation_command("sudo rosbot.flash", timeout=1.0, sudo_password="pw")
