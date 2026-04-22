"""Tests for coordinator soft-interrupt → close-session → hard-reset ordering."""
from __future__ import annotations

import threading
import time

from backend.terminal_manager.job_scheduler.cancel import JobInterrupted
from backend.terminal_manager.job_scheduler.coordinator import RobotJobCoordinator
from backend.terminal_manager.job_scheduler.models import JobExecutionOutcome


def _wait_for(condition, timeout_sec: float = 2.0) -> None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        if condition():
            return
        time.sleep(0.01)
    raise AssertionError("timed out waiting for condition")


def test_stop_fires_soft_interrupt_then_close_then_hard_reset():
    calls: list[tuple[str, str]] = []
    calls_lock = threading.Lock()

    def _record(kind: str, robot_id: str) -> None:
        with calls_lock:
            calls.append((kind, robot_id))

    class BlockingExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job
            started = time.time()
            while (time.time() - started) < 1.0:
                if token.is_interrupted():
                    raise JobInterrupted("stopped")
                time.sleep(0.01)
            return JobExecutionOutcome(status="succeeded", metadata={})

    coordinator = RobotJobCoordinator(
        executor=BlockingExecutor(),
        close_session=lambda psid, rid: _record("close", rid),
        hard_reset_transport=lambda rid: _record("hard_reset", rid),
        soft_interrupt_automation=lambda rid: _record("soft_interrupt", rid),
        ctrl_c_settle_sec=0.0,
    )
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )

    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is not None)

    coordinator.stop_active_job("r1")

    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is None)

    with calls_lock:
        kinds = [kind for kind, _rid in calls]
    assert kinds == ["soft_interrupt", "close", "hard_reset"], (
        f"stop sequence out of order: {kinds}"
    )


def test_stop_without_soft_interrupt_callback_still_tears_down():
    calls: list[str] = []
    calls_lock = threading.Lock()

    def _append(kind: str) -> None:
        with calls_lock:
            calls.append(kind)

    class BlockingExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job
            started = time.time()
            while (time.time() - started) < 1.0:
                if token.is_interrupted():
                    raise JobInterrupted("stopped")
                time.sleep(0.01)
            return JobExecutionOutcome(status="succeeded")

    coordinator = RobotJobCoordinator(
        executor=BlockingExecutor(),
        close_session=lambda psid, rid: _append("close"),
        hard_reset_transport=lambda rid: _append("hard_reset"),
        ctrl_c_settle_sec=0.0,
    )
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )
    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is not None)
    coordinator.stop_active_job("r1")
    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is None)
    with calls_lock:
        assert calls == ["close", "hard_reset"]


def test_soft_interrupt_failure_is_swallowed_and_teardown_continues():
    calls: list[str] = []

    class BlockingExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job
            started = time.time()
            while (time.time() - started) < 1.0:
                if token.is_interrupted():
                    raise JobInterrupted("stopped")
                time.sleep(0.01)
            return JobExecutionOutcome(status="succeeded")

    def _bad_soft(_robot_id: str) -> None:
        raise RuntimeError("shell already closed")

    coordinator = RobotJobCoordinator(
        executor=BlockingExecutor(),
        close_session=lambda psid, rid: calls.append("close"),
        hard_reset_transport=lambda rid: calls.append("hard_reset"),
        soft_interrupt_automation=_bad_soft,
        ctrl_c_settle_sec=0.0,
    )
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )
    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is not None)

    coordinator.stop_active_job("r1")
    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is None)
    assert "close" in calls and "hard_reset" in calls


def test_graceful_close_drains_idle_workers():
    class InstantExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job, token
            return JobExecutionOutcome(status="succeeded")

    coordinator = RobotJobCoordinator(executor=InstantExecutor())
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )
    _wait_for(lambda: coordinator.has_pending_user_work("r1") is False)
    coordinator.close(drain_timeout_sec=2.0)
