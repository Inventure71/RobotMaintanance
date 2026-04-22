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


def test_coordinator_executes_jobs_fifo_and_tracks_pending_predicate():
    execution_order: list[str] = []

    class FakeExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = token
            execution_order.append(f"{robot_id}:{job.id}")
            return JobExecutionOutcome(status="succeeded", metadata={})

    coordinator = RobotJobCoordinator(executor=FakeExecutor())

    assert coordinator.has_pending_user_work("r1") is False

    first_id, _ = coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )
    second_id, _ = coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job2",
        payload={},
        page_session_id="p2",
    )

    _wait_for(lambda: coordinator.has_pending_user_work("r1") is False)
    assert execution_order == [f"r1:{first_id}", f"r1:{second_id}"]


def test_coordinator_stop_is_idempotent_and_terminalizes_as_interrupted():
    class BlockingExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job
            started = time.time()
            while (time.time() - started) < 1.0:
                if token.is_interrupted():
                    raise JobInterrupted("stopped")
                time.sleep(0.01)
            return JobExecutionOutcome(status="succeeded", metadata={})

    coordinator = RobotJobCoordinator(executor=BlockingExecutor())
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )

    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is not None)

    first_stop = coordinator.stop_active_job("r1")
    assert first_stop.already_interrupting is False
    assert first_stop.snapshot["activeJob"]["status"] == "interrupting"

    second_stop = coordinator.stop_active_job("r1")
    assert second_stop.already_interrupting is True
    assert second_stop.snapshot["activeJob"]["status"] == "interrupting"

    _wait_for(lambda: coordinator.get_snapshot("r1").get("activeJob") is None)
    assert coordinator.has_pending_user_work("r1") is False


def test_coordinator_isolates_work_per_robot():
    executions: list[tuple[str, str]] = []

    class FakeExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = token
            executions.append((robot_id, job.id))
            return JobExecutionOutcome(status="succeeded", metadata={})

    coordinator = RobotJobCoordinator(executor=FakeExecutor())
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )
    coordinator.enqueue_user_job(
        robot_id="r2",
        kind="fix",
        source="manual",
        label="job2",
        payload={"fixId": "f1"},
        page_session_id="p2",
    )

    _wait_for(lambda: coordinator.has_pending_user_work("r1") is False)
    _wait_for(lambda: coordinator.has_pending_user_work("r2") is False)

    robots = {robot_id for robot_id, _job_id in executions}
    assert robots == {"r1", "r2"}


def test_coordinator_handles_twenty_robots_without_cross_talk():
    executions: list[tuple[str, str]] = []
    lock = threading.Lock()

    class FakeExecutor:
        def execute_job(self, *, robot_id, job, token):
            token.throw_if_interrupted()
            time.sleep(0.01)
            with lock:
                executions.append((robot_id, job.id))
            return JobExecutionOutcome(status="succeeded", metadata={"robotId": robot_id})

    coordinator = RobotJobCoordinator(executor=FakeExecutor())
    robot_ids = [f"r{i:02d}" for i in range(20)]
    enqueued_by_robot = {}

    for robot_id in robot_ids:
        job_id, _ = coordinator.enqueue_user_job(
            robot_id=robot_id,
            kind="test",
            source="manual",
            label=f"test {robot_id}",
            payload={"testIds": ["online"]},
            page_session_id=f"page-{robot_id}",
        )
        enqueued_by_robot[robot_id] = job_id

    for robot_id in robot_ids:
        _wait_for(lambda robot_id=robot_id: coordinator.has_pending_user_work(robot_id) is False)

    assert sorted(executions) == sorted(enqueued_by_robot.items())
    for robot_id, job_id in enqueued_by_robot.items():
        snapshot = coordinator.get_snapshot(robot_id)
        assert snapshot["activeJob"] is None
        assert snapshot["queuedJobs"] == []
        assert snapshot["lastCompletedJob"]["id"] == job_id
        assert snapshot["lastCompletedJob"]["metadata"]["robotId"] == robot_id


def test_coordinator_marks_interrupted_when_token_is_set_during_teardown_error():
    class TeardownExecutor:
        def execute_job(self, *, robot_id, job, token):
            _ = robot_id, job
            token.request_interrupt()
            raise RuntimeError("transport closed during teardown")

    coordinator = RobotJobCoordinator(executor=TeardownExecutor())
    coordinator.enqueue_user_job(
        robot_id="r1",
        kind="test",
        source="manual",
        label="job1",
        payload={},
        page_session_id="p1",
    )

    _wait_for(lambda: coordinator.has_pending_user_work("r1") is False)

    state = coordinator._states["r1"]
    assert state._history
    assert state._history[-1].terminal_status == "interrupted"
