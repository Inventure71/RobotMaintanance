from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable

from ...normalization import normalize_text
from .cancel import CancellationToken, JobInterrupted
from .models import NoActiveUserJobError, StopResult, UserJob
from .state import RobotJobState

LOGGER = logging.getLogger(__name__)

_CTRL_C_SETTLE_SEC = 0.5


@dataclass(slots=True)
class _ActiveHandle:
    token: CancellationToken
    page_session_id: str


class RobotJobCoordinator:
    def __init__(
        self,
        *,
        executor: Any,
        on_snapshot: Callable[[str, dict[str, Any]], None] | None = None,
        close_session: Callable[[str, str], None] | None = None,
        hard_reset_transport: Callable[[str], None] | None = None,
        soft_interrupt_automation: Callable[[str], None] | None = None,
        ctrl_c_settle_sec: float = _CTRL_C_SETTLE_SEC,
    ) -> None:
        self._executor = executor
        self._on_snapshot = on_snapshot
        self._close_session = close_session
        self._hard_reset_transport = hard_reset_transport
        self._soft_interrupt_automation = soft_interrupt_automation
        self._ctrl_c_settle_sec = max(0.0, float(ctrl_c_settle_sec))

        self._registry_lock = threading.Lock()
        self._states: dict[str, RobotJobState] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._workers: dict[str, threading.Thread] = {}
        self._active_handles: dict[str, _ActiveHandle] = {}

    def _get_state_and_lock(self, robot_id: str) -> tuple[RobotJobState, threading.Lock]:
        with self._registry_lock:
            state = self._states.get(robot_id)
            if state is None:
                state = RobotJobState()
                self._states[robot_id] = state
            lock = self._locks.get(robot_id)
            if lock is None:
                lock = threading.Lock()
                self._locks[robot_id] = lock
            return state, lock

    def _emit_snapshot(self, robot_id: str, snapshot: dict[str, Any] | None) -> None:
        if snapshot is None:
            return
        if callable(self._on_snapshot):
            self._on_snapshot(robot_id, snapshot)

    def enqueue_user_job(
        self,
        *,
        robot_id: str,
        kind: str,
        source: str,
        label: str,
        payload: dict[str, Any] | None = None,
        page_session_id: str | None = None,
    ) -> tuple[str, dict[str, Any]]:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_kind = normalize_text(kind, "").lower()
        normalized_source = normalize_text(source, "manual") or "manual"
        normalized_label = normalize_text(label, "") or f"{normalized_kind} job"
        normalized_page_session_id = normalize_text(page_session_id, "") or (
            f"job-{normalized_robot_id}-{uuid.uuid4().hex[:8]}"
        )

        now = time.time()
        job = UserJob(
            id=f"job-{int(now * 1000)}-{uuid.uuid4().hex[:8]}",
            kind=normalized_kind,
            source=normalized_source,
            label=normalized_label,
            page_session_id=normalized_page_session_id,
            payload=dict(payload or {}),
            status="queued",
            enqueued_at=now,
            updated_at=now,
        )

        state, lock = self._get_state_and_lock(normalized_robot_id)
        snapshot: dict[str, Any] | None = None
        should_start_worker = False

        with lock:
            state.enqueue_user_job(job)
            worker = self._workers.get(normalized_robot_id)
            worker_alive = bool(worker is not None and worker.is_alive())
            if state.active_job is None and not worker_alive:
                state.start_next_job()
            snapshot = state.snapshot()

            if not worker_alive:
                worker = threading.Thread(
                    target=self._worker_loop,
                    args=(normalized_robot_id,),
                    daemon=True,
                    name=f"job-coordinator-{normalized_robot_id}",
                )
                self._workers[normalized_robot_id] = worker
                should_start_worker = True

        self._emit_snapshot(normalized_robot_id, snapshot)
        if should_start_worker:
            worker.start()

        return job.id, snapshot or {"activeJob": None, "queuedJobs": [], "lastCompletedJob": None, "jobQueueVersion": 0}

    def get_snapshot(self, robot_id: str) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        state, lock = self._get_state_and_lock(normalized_robot_id)
        with lock:
            return state.snapshot()

    def has_pending_user_work(self, robot_id: str) -> bool:
        normalized_robot_id = normalize_text(robot_id, "")
        if not normalized_robot_id:
            return False
        state, lock = self._get_state_and_lock(normalized_robot_id)
        with lock:
            return state.has_pending_user_work

    def stop_active_job(self, robot_id: str) -> StopResult:
        normalized_robot_id = normalize_text(robot_id, "")
        state, lock = self._get_state_and_lock(normalized_robot_id)

        snapshot: dict[str, Any] | None = None
        already_interrupting = False
        handle: _ActiveHandle | None = None

        with lock:
            active = state.active_job
            if active is None:
                raise NoActiveUserJobError("No active user job")
            if active.status == "interrupting":
                already_interrupting = True
            else:
                state.mark_active_interrupting()
            handle = self._active_handles.get(normalized_robot_id)
            snapshot = state.snapshot()

        self._emit_snapshot(normalized_robot_id, snapshot)

        if handle is not None:
            handle.token.request_interrupt()

            # Send Ctrl-C first so the running process can terminate gracefully
            # before we close the SSH transport.
            if callable(self._soft_interrupt_automation):
                try:
                    self._soft_interrupt_automation(normalized_robot_id)
                except Exception:
                    pass
                if self._ctrl_c_settle_sec > 0:
                    time.sleep(self._ctrl_c_settle_sec)

            if callable(self._close_session):
                try:
                    self._close_session(handle.page_session_id, normalized_robot_id)
                except Exception:
                    pass
            if callable(self._hard_reset_transport):
                try:
                    self._hard_reset_transport(normalized_robot_id)
                except Exception:
                    pass
            LOGGER.info(
                "Job stop issued (robot_id=%s, job_id=%s)",
                normalized_robot_id,
                handle.page_session_id,
            )

        return StopResult(
            snapshot=snapshot or {"activeJob": None, "queuedJobs": [], "lastCompletedJob": None, "jobQueueVersion": 0},
            already_interrupting=already_interrupting,
        )

    def close(self, *, drain_timeout_sec: float = 10.0) -> None:
        """Request a graceful shutdown of all per-robot workers.

        1. Send an interrupt to every active job (Ctrl-C + hard reset).
        2. Wait up to ``drain_timeout_sec`` for worker threads to finish.
        3. Best-effort logging if any worker fails to exit in time.
        """
        with self._registry_lock:
            robots = list(self._states.keys())
            workers = dict(self._workers)

        for robot_id in robots:
            try:
                self.stop_active_job(robot_id)
            except NoActiveUserJobError:
                continue
            except Exception:
                LOGGER.exception(
                    "Job coordinator close: stop_active_job failed (robot_id=%s)",
                    robot_id,
                )
                continue

        deadline = time.time() + max(0.0, float(drain_timeout_sec))
        for robot_id, worker in workers.items():
            if worker is None or not worker.is_alive():
                continue
            remaining = max(0.0, deadline - time.time())
            worker.join(timeout=remaining)
            if worker.is_alive():
                LOGGER.warning(
                    "Job worker did not drain within %.1fs (robot_id=%s); "
                    "proceeding with shutdown",
                    drain_timeout_sec,
                    robot_id,
                )

    def _worker_loop(self, robot_id: str) -> None:
        state, lock = self._get_state_and_lock(robot_id)
        current_thread = threading.current_thread()

        while True:
            snapshot_after_start: dict[str, Any] | None = None
            job: UserJob | None = None
            token: CancellationToken | None = None

            with lock:
                active = state.active_job
                if active is None:
                    active = state.start_next_job()
                    if active is not None:
                        snapshot_after_start = state.snapshot()
                if active is None:
                    live_worker = self._workers.get(robot_id)
                    if live_worker is current_thread:
                        self._workers.pop(robot_id, None)
                    return

                token = CancellationToken()
                if active.status == "interrupting":
                    token.request_interrupt()
                self._active_handles[robot_id] = _ActiveHandle(
                    token=token,
                    page_session_id=active.page_session_id,
                )
                job = active

            self._emit_snapshot(robot_id, snapshot_after_start)

            outcome_status = "failed"
            outcome_metadata: dict[str, Any] = {}
            outcome_error: str | None = None

            job_started_at = time.time()
            LOGGER.info(
                "Job started (robot_id=%s, job_id=%s, kind=%s, label=%r)",
                robot_id,
                job.id if job else "?",
                job.kind if job else "?",
                job.label if job else "?",
            )

            try:
                assert job is not None
                assert token is not None
                outcome = self._executor.execute_job(robot_id=robot_id, job=job, token=token)
                outcome_status = normalize_text(outcome.status, "failed")
                outcome_metadata = dict(outcome.metadata or {})
                outcome_error = normalize_text(outcome.error, "") or None
            except JobInterrupted:
                outcome_status = "interrupted"
            except Exception as exc:
                if token is not None and token.is_interrupted():
                    outcome_status = "interrupted"
                    outcome_error = normalize_text(str(exc), "") or None
                else:
                    outcome_status = "failed"
                    outcome_error = normalize_text(str(exc), "Job execution failed")

            duration_ms = max(0, int((time.time() - job_started_at) * 1000))
            LOGGER.info(
                "Job finished (robot_id=%s, job_id=%s, status=%s, duration_ms=%d%s)",
                robot_id,
                job.id if job else "?",
                outcome_status,
                duration_ms,
                f", error={outcome_error!r}" if outcome_error else "",
            )

            finalize_snapshot: dict[str, Any] | None = None
            with lock:
                current_handle = self._active_handles.get(robot_id)
                if current_handle is not None and current_handle.token is token:
                    self._active_handles.pop(robot_id, None)

                active_after = state.active_job
                if active_after is None:
                    continue

                active_is_interrupting = active_after.status == "interrupting"
                if active_is_interrupting:
                    state.mark_active_interrupted(
                        {
                            **outcome_metadata,
                            **({"error": outcome_error} if outcome_error else {}),
                        }
                    )
                elif outcome_status == "succeeded":
                    state.mark_active_succeeded(outcome_metadata)
                elif outcome_status == "interrupted":
                    state.mark_active_interrupted(outcome_metadata)
                else:
                    state.mark_active_failed(
                        {
                            **outcome_metadata,
                            **({"error": outcome_error} if outcome_error else {}),
                        }
                    )
                finalize_snapshot = state.snapshot()

            self._emit_snapshot(robot_id, finalize_snapshot)
