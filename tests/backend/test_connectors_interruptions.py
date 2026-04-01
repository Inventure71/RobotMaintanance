from __future__ import annotations

import pytest

from backend.connectors import OrchestrateConnector, ReadConnector, WriteConnector
from backend.ssh_client import AutomationCommandResult
from backend.terminal_manager.job_scheduler.cancel import JobInterrupted


def test_write_connector_does_not_retry_job_interrupted():
    connector = WriteConnector({})
    calls = {"count": 0}

    def run_command(_command: str, _timeout: float | None) -> AutomationCommandResult:
        calls["count"] += 1
        raise JobInterrupted("stop requested")

    with pytest.raises(JobInterrupted):
        connector.execute_step(
            step={"id": "s1", "command": "echo ok", "retries": 3},
            vars_payload={},
            run_scope="robot:r1",
            command_cache={},
            run_command=run_command,
        )

    assert calls["count"] == 1


def test_orchestrate_connector_preserves_interruption_without_step_failed():
    connector = OrchestrateConnector(read=ReadConnector(), write=WriteConnector({}))
    events: list[str] = []

    def run_command(_command: str, _timeout: float | None) -> AutomationCommandResult:
        raise JobInterrupted("stop requested")

    with pytest.raises(JobInterrupted):
        connector.run_definition(
            {"id": "def", "execute": [{"id": "s1", "command": "echo ok"}], "checks": []},
            run_scope="robot:r1",
            run_command=run_command,
            params={},
            dry_run=False,
            emit_event=lambda event, _message, _payload: events.append(event),
            command_cache={},
            should_cancel=None,
        )

    assert "step_failed" not in events
    assert "step_interrupted" in events
