"""Tests for InteractiveShell session-level sudo authentication reuse.

These tests avoid real SSH by constructing a shell with stubbed IO helpers.
"""
from __future__ import annotations

import types
from unittest.mock import MagicMock

from backend.ssh_client import InteractiveShell


class _FakeChannel:
    def __init__(self) -> None:
        self.closed = False

    def settimeout(self, _v) -> None:
        return None

    def close(self) -> None:
        self.closed = True


def _make_shell_with_stubs() -> InteractiveShell:
    """Build an InteractiveShell instance with only the bits needed for run_automation_command."""
    shell = InteractiveShell(
        host="10.0.0.1",
        username="pi",
        password="secret",
        port=22,
        connect_timeout=0.1,
        start_reader_thread=False,
    )
    shell.chan = _FakeChannel()

    shell._drain_channel = MagicMock(name="_drain_channel")
    shell.send = MagicMock(name="send")
    shell._reset_sudo_timestamp = MagicMock(name="_reset_sudo_timestamp")
    shell._authenticate_sudo_in_pty = MagicMock(name="_authenticate_sudo_in_pty")

    original_wrap = shell._build_automation_command_wrapper

    def _fake_wrap(command, *, exit_marker, done_marker):
        wrapped = (
            f"{command}\n"
            f"echo {exit_marker}$?\n"
            f"echo {done_marker}\n"
        )
        return wrapped, []

    shell._build_automation_command_wrapper = _fake_wrap  # type: ignore[assignment]
    # Keep the real _strip helpers so output shape is correct.
    _ = original_wrap

    return shell


def _install_done_marker_reader(shell: InteractiveShell) -> list[str]:
    """Feed a single chunk containing the done+exit markers then EOF.

    Returns a list of commands seen by `send` so tests can assert wrapping.
    """
    sent_commands: list[str] = []

    def _fake_send(text: str) -> None:
        sent_commands.append(str(text))

    shell.send = _fake_send  # type: ignore[assignment]

    state = {"calls": 0}

    def _fake_read_chunk(_wait: float) -> str:
        state["calls"] += 1
        if state["calls"] == 1:
            last_sent = sent_commands[-1] if sent_commands else ""
            exit_marker = ""
            done_marker = ""
            for line in last_sent.splitlines():
                if "__VIGIL_AUTO_EXIT__" in line and exit_marker == "":
                    exit_marker = line.replace("echo ", "").strip() + "0"
                if "__VIGIL_AUTO_DONE__" in line and done_marker == "":
                    done_marker = line.replace("echo ", "").strip()
            chunk = f"\n{exit_marker}\n{done_marker}\n"
            chunk = chunk.replace("$?", "")
            return chunk
        return ""

    shell._read_chunk = _fake_read_chunk  # type: ignore[assignment]
    return sent_commands


def test_sudo_authenticates_only_once_per_session():
    shell = _make_shell_with_stubs()
    _install_done_marker_reader(shell)

    r1 = shell.run_automation_command("sudo ls /root", timeout=1.0, sudo_password="pw")
    r2 = shell.run_automation_command("sudo whoami", timeout=1.0, sudo_password="pw")
    r3 = shell.run_automation_command("sudo -u www ls /", timeout=1.0, sudo_password="pw")

    assert r1.used_sudo and r1.sudo_authenticated
    assert r2.used_sudo and r2.sudo_authenticated
    assert r3.used_sudo and r3.sudo_authenticated
    assert shell._authenticate_sudo_in_pty.call_count == 1  # type: ignore[union-attr]
    assert shell._reset_sudo_timestamp.call_count == 1  # type: ignore[union-attr]
    assert shell._sudo_authenticated is True


def test_non_sudo_commands_do_not_authenticate():
    shell = _make_shell_with_stubs()
    _install_done_marker_reader(shell)

    result = shell.run_automation_command("ls /tmp", timeout=1.0, sudo_password="pw")

    assert result.used_sudo is False
    assert result.sudo_authenticated is False
    assert shell._authenticate_sudo_in_pty.called is False  # type: ignore[union-attr]
    assert shell._sudo_authenticated is False


def test_sudo_without_password_raises_on_first_use():
    shell = _make_shell_with_stubs()
    _install_done_marker_reader(shell)

    try:
        shell.run_automation_command("sudo reboot", timeout=1.0, sudo_password=None)
    except RuntimeError as exc:
        assert "sudo" in str(exc).lower()
    else:
        raise AssertionError("Expected RuntimeError for sudo without password")

    assert shell._sudo_authenticated is False


def test_reconnect_resets_sudo_session_state():
    shell = _make_shell_with_stubs()
    _install_done_marker_reader(shell)

    shell.run_automation_command("sudo ls", timeout=1.0, sudo_password="pw")
    assert shell._sudo_authenticated is True

    def _fake_connect(self) -> None:
        self._sudo_authenticated = False

    shell.connect = types.MethodType(_fake_connect, shell)
    shell.connect()
    assert shell._sudo_authenticated is False
