"""Tests for completed-job history retention cap in RobotJobState."""
from __future__ import annotations

import time

from backend.terminal_manager.job_scheduler.models import UserJob
from backend.terminal_manager.job_scheduler.state import RobotJobState, _MAX_HISTORY


def _queued(job_id: str) -> UserJob:
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


def test_history_caps_at_max_entries_and_preserves_most_recent():
    state = RobotJobState()
    total = _MAX_HISTORY + 25

    for i in range(total):
        state.enqueue_user_job(_queued(f"job-{i:04d}"))
        active = state.start_next_job()
        assert active is not None
        state.mark_active_succeeded({"index": i})

    assert len(state._history) == _MAX_HISTORY  # noqa: SLF001

    first_retained = state._history[0].job.id  # noqa: SLF001
    last_retained = state._history[-1].job.id  # noqa: SLF001
    expected_first_index = total - _MAX_HISTORY
    assert first_retained == f"job-{expected_first_index:04d}"
    assert last_retained == f"job-{total - 1:04d}"


def test_history_below_cap_is_not_truncated():
    state = RobotJobState()
    for i in range(5):
        state.enqueue_user_job(_queued(f"job-{i}"))
        state.start_next_job()
        state.mark_active_succeeded()

    assert len(state._history) == 5  # noqa: SLF001
    assert state.last_completed_job is not None
    assert state.last_completed_job["id"] == "job-4"


def test_history_cap_survives_mixed_terminal_statuses():
    state = RobotJobState()
    for i in range(_MAX_HISTORY + 10):
        state.enqueue_user_job(_queued(f"job-{i}"))
        state.start_next_job()
        if i % 3 == 0:
            state.mark_active_failed({"error": "boom"})
        elif i % 3 == 1:
            state.mark_active_interrupting()
            state.mark_active_interrupted({"reason": "user"})
        else:
            state.mark_active_succeeded()

    assert len(state._history) == _MAX_HISTORY  # noqa: SLF001
