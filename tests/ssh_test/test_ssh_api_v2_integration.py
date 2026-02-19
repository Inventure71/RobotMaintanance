from __future__ import annotations

import os
import shlex
import uuid
import pytest

from backend.ssh_api_v2 import InteractiveShell


def _is_configured() -> bool:
    return bool(
        os.getenv("SSH_TEST_HOST")
        and os.getenv("SSH_TEST_USER")
        and os.getenv("SSH_TEST_PASS")
    )


@pytest.mark.integration
@pytest.mark.skipif(not _is_configured(), reason="SSH integration env vars not set")
def test_remote_command_roundtrip_and_cleanup():
    host = os.environ["SSH_TEST_HOST"]
    username = os.environ["SSH_TEST_USER"]
    password = os.environ["SSH_TEST_PASS"]
    port = int(os.getenv("SSH_TEST_PORT", "22"))

    workdir = f"/tmp/robo_modular_test_{uuid.uuid4().hex}"
    cleanup = f"rm -rf {shlex.quote(workdir)}"
    command = f"mkdir -p {shlex.quote(workdir)} && echo ok > {shlex.quote(workdir + '/marker.txt')} && cat {shlex.quote(workdir + '/marker.txt')}"

    with InteractiveShell(
        host=host,
        username=username,
        password=password,
        port=port,
        prompt_regex=r"[$#] ",
    ) as shell:
        shell.run_command(cleanup)
        result = shell.run_command(command, timeout=20.0)
        assert "ok" in result
        shell.run_command(cleanup)
