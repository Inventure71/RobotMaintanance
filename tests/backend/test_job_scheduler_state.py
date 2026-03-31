from __future__ import annotations

import time

import pytest

from backend.terminal_manager.job_scheduler.models import JobStateError, UserJob
from backend.terminal_manager.job_scheduler.state import RobotJobState


def _job(job_id: str) -> UserJob:
    now = time.time()
    return UserJob(
        id=job_id,
        kind="test",
        source="manual",
        label=job_id,
        page_session_id=f"page-{job_id}",
        status="queued",
        enqueued_at=now,
        updated_at=now,
    )


def test_state_enforces_transition_legality_and_queue_versioning():
    state = RobotJobState()
    assert state.queue_version == 0

    state.enqueue_user_job(_job("job-1"))
    assert state.queue_version == 1
    assert state.snapshot()["queuedJobs"][0]["status"] == "queued"

    state.start_next_job()
    assert state.queue_version == 2
    assert state.snapshot()["activeJob"]["status"] == "running"
    assert state.snapshot()["queuedJobs"] == []

    state.mark_active_interrupting()
    assert state.queue_version == 3
    assert state.snapshot()["activeJob"]["status"] == "interrupting"

    state.mark_active_interrupted({"reason": "operator stop"})
    assert state.queue_version == 4
    assert state.snapshot()["activeJob"] is None

    with pytest.raises(JobStateError):
        state.mark_active_succeeded()


def test_state_enforces_fifo_ordering():
    state = RobotJobState()
    state.enqueue_user_job(_job("job-1"))
    state.enqueue_user_job(_job("job-2"))

    first = state.start_next_job()
    assert first is not None
    assert first.id == "job-1"
    state.mark_active_succeeded()

    second = state.start_next_job()
    assert second is not None
    assert second.id == "job-2"
    state.mark_active_succeeded()

    assert state.snapshot()["queuedJobs"] == []
    assert state.snapshot()["activeJob"] is None
