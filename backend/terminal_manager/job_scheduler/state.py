from __future__ import annotations

import time
from typing import Any

from .models import CompletedJobRecord, JobStateError, TerminalJobStatus, UserJob

_MAX_HISTORY = 50


class RobotJobState:
    def __init__(self) -> None:
        self._active: UserJob | None = None
        self._queue: list[UserJob] = []
        self._history: list[CompletedJobRecord] = []
        self._queue_version = 0

    @staticmethod
    def _assert_queued(job: UserJob) -> None:
        if job.status != "queued":
            raise JobStateError(f"Queued job invariant violated: expected queued, got {job.status}")

    @staticmethod
    def _assert_active_status(job: UserJob) -> None:
        if job.status not in {"running", "interrupting"}:
            raise JobStateError(
                "Active job invariant violated: active status must be running or interrupting "
                f"(got {job.status})"
            )

    def _next_queue_version(self) -> int:
        self._queue_version += 1
        return self._queue_version

    def enqueue_user_job(self, job: UserJob) -> None:
        self._assert_queued(job)
        now = time.time()
        job.enqueued_at = float(job.enqueued_at or now)
        job.started_at = 0.0
        job.updated_at = float(job.updated_at or job.enqueued_at)
        self._queue.append(job)
        self._next_queue_version()

    def start_next_job(self) -> UserJob | None:
        if self._active is not None:
            self._assert_active_status(self._active)
            raise JobStateError("Cannot start next job while an active job exists")
        if not self._queue:
            return None

        next_job = self._queue.pop(0)
        self._assert_queued(next_job)
        now = time.time()
        next_job.status = "running"
        next_job.started_at = now
        next_job.updated_at = now
        self._active = next_job
        self._next_queue_version()
        return next_job

    def mark_active_interrupting(self) -> UserJob:
        if self._active is None:
            raise JobStateError("Cannot mark interrupting: no active job")
        if self._active.status == "interrupting":
            return self._active
        if self._active.status != "running":
            raise JobStateError(
                "Illegal transition: stop request requires running active job "
                f"(got {self._active.status})"
            )
        self._active.status = "interrupting"
        self._active.updated_at = time.time()
        self._next_queue_version()
        return self._active

    def _finalize_active(self, terminal_status: TerminalJobStatus, metadata: dict[str, Any] | None = None) -> UserJob:
        active = self._active
        if active is None:
            raise JobStateError("Cannot finalize: no active job")
        if active.status not in {"running", "interrupting"}:
            raise JobStateError(
                "Illegal transition: finalize requires active job in running|interrupting "
                f"(got {active.status})"
            )

        active.status = terminal_status
        active.updated_at = time.time()
        self._history.append(
            CompletedJobRecord(
                job=active,
                terminal_status=terminal_status,
                metadata=dict(metadata or {}),
            )
        )
        if len(self._history) > _MAX_HISTORY:
            self._history = self._history[-_MAX_HISTORY:]
        self._active = None
        self._next_queue_version()
        return active

    def mark_active_succeeded(self, metadata: dict[str, Any] | None = None) -> UserJob:
        return self._finalize_active("succeeded", metadata)

    def mark_active_failed(self, metadata: dict[str, Any] | None = None) -> UserJob:
        return self._finalize_active("failed", metadata)

    def mark_active_interrupted(self, metadata: dict[str, Any] | None = None) -> UserJob:
        return self._finalize_active("interrupted", metadata)

    @property
    def active_job(self) -> UserJob | None:
        if self._active is None:
            return None
        self._assert_active_status(self._active)
        return self._active

    @property
    def queued_jobs(self) -> list[UserJob]:
        for job in self._queue:
            self._assert_queued(job)
        return list(self._queue)

    @property
    def queue_version(self) -> int:
        return int(self._queue_version)

    @property
    def has_pending_user_work(self) -> bool:
        return self.active_job is not None or bool(self._queue)

    @property
    def last_completed_job(self) -> dict[str, Any] | None:
        if not self._history:
            return None
        return self._history[-1].summary()

    def snapshot(self) -> dict[str, Any]:
        return {
            "activeJob": self.active_job.summary() if self.active_job is not None else None,
            "queuedJobs": [job.summary() for job in self.queued_jobs],
            "lastCompletedJob": self.last_completed_job,
            "jobQueueVersion": int(self._queue_version),
        }
