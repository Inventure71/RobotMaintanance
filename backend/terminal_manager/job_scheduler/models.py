from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

JobKind = Literal["test", "fix"]
JobStatus = Literal["queued", "running", "interrupting", "succeeded", "failed", "interrupted"]
TerminalJobStatus = Literal["succeeded", "failed", "interrupted"]


class JobStateError(RuntimeError):
    pass


class NoActiveUserJobError(JobStateError):
    pass


@dataclass(slots=True)
class UserJob:
    id: str
    kind: JobKind
    source: str
    label: str
    page_session_id: str
    payload: dict[str, Any] = field(default_factory=dict)
    status: JobStatus = "queued"
    enqueued_at: float = 0.0
    started_at: float = 0.0
    updated_at: float = 0.0

    def summary(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "source": self.source,
            "label": self.label,
            "enqueuedAt": float(self.enqueued_at or 0.0),
            "startedAt": float(self.started_at or 0.0),
            "updatedAt": float(self.updated_at or 0.0),
        }


@dataclass(slots=True)
class CompletedJobRecord:
    job: UserJob
    terminal_status: TerminalJobStatus
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class JobExecutionOutcome:
    status: TerminalJobStatus
    metadata: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


@dataclass(slots=True)
class StopResult:
    snapshot: dict[str, Any]
    already_interrupting: bool
