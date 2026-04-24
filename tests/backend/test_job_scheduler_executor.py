from __future__ import annotations

from backend.terminal_manager.job_scheduler.cancel import CancellationToken
from backend.terminal_manager.job_scheduler.executor import RobotJobExecutor
from backend.terminal_manager.job_scheduler.models import UserJob


class _FakeRunContext:
    def __init__(self) -> None:
        self.closed = False

    def run_command(self, command, timeout_sec=None, sudo_password=None):
        _ = command, timeout_sec, sudo_password
        return {"ok": True}

    def close(self) -> None:
        self.closed = True

    def metadata_payload(self) -> dict[str, object]:
        return {
            "session": {"runKind": "fix"},
            "timing": {"totalMs": 12},
        }


def _job(*, payload: dict[str, object]) -> UserJob:
    return UserJob(
        id="job-1",
        kind="fix",
        source="manual",
        label="Run fix",
        page_session_id="page-1",
        payload=payload,
        status="running",
        enqueued_at=1.0,
        started_at=2.0,
        updated_at=2.0,
    )


def test_fix_executor_honors_definition_post_test_ids():
    calls: dict[str, object] = {"test_ids": None}

    class FakeTerminalManager:
        def _resolve_fix_spec(self, robot_id, fix_id):
            _ = robot_id, fix_id
            return {
                "definitionId": "flash_fix",
                "execute": [{"id": "step-1", "command": "echo ok"}],
                "postTestIds": ["battery"],
            }

        def start_fix_run(self, robot_id):
            _ = robot_id

        def finish_fix_run(self, robot_id):
            _ = robot_id

        def _set_runtime_activity(self, robot_id, **kwargs):
            _ = robot_id, kwargs

        def _resolve_credentials(self, robot_id):
            _ = robot_id
            return ("host", "user", "sudo", 22)

        def create_automation_run_context(self, **kwargs):
            _ = kwargs
            return _FakeRunContext()

        class _orchestrate_connector:
            @staticmethod
            def run_definition(*args, **kwargs):
                _ = args, kwargs
                return {"commandsExecuted": [{"id": "step-1", "ok": True}]}

        def _resolve_post_fix_test_ids(self, robot_id, fix_spec):
            _ = robot_id
            return (list(fix_spec.get("postTestIds") or []), False)

        def run_tests(self, *, test_ids, **kwargs):
            calls["test_ids"] = test_ids
            _ = kwargs
            return [{"id": "battery", "status": "ok"}]

    outcome = RobotJobExecutor(FakeTerminalManager()).execute_job(
        robot_id="r1",
        job=_job(payload={"fixId": "flash_fix"}),
        token=CancellationToken(),
    )

    assert outcome.status == "succeeded"
    assert calls["test_ids"] == ["battery"]
    assert outcome.metadata["postTestIds"] == ["battery"]
    assert outcome.metadata["usedDefaultPostTests"] is False


def test_fix_executor_uses_default_post_tests_when_fix_has_none():
    calls: dict[str, object] = {"test_ids": None}

    class FakeTerminalManager:
        def _resolve_fix_spec(self, robot_id, fix_id):
            _ = robot_id, fix_id
            return {
                "definitionId": "flash_fix",
                "execute": [{"id": "step-1", "command": "echo ok"}],
            }

        def start_fix_run(self, robot_id):
            _ = robot_id

        def finish_fix_run(self, robot_id):
            _ = robot_id

        def _set_runtime_activity(self, robot_id, **kwargs):
            _ = robot_id, kwargs

        def _resolve_credentials(self, robot_id):
            _ = robot_id
            return ("host", "user", "sudo", 22)

        def create_automation_run_context(self, **kwargs):
            _ = kwargs
            return _FakeRunContext()

        class _orchestrate_connector:
            @staticmethod
            def run_definition(*args, **kwargs):
                _ = args, kwargs
                return {"commandsExecuted": [{"id": "step-1", "ok": True}]}

        def _resolve_post_fix_test_ids(self, robot_id, fix_spec):
            _ = robot_id, fix_spec
            return (["online"], True)

        def run_tests(self, *, test_ids, **kwargs):
            calls["test_ids"] = test_ids
            _ = kwargs
            return [{"id": "online", "status": "ok"}]

    outcome = RobotJobExecutor(FakeTerminalManager()).execute_job(
        robot_id="r1",
        job=_job(payload={"fixId": "flash_fix"}),
        token=CancellationToken(),
    )

    assert outcome.status == "succeeded"
    assert calls["test_ids"] == ["online"]
    assert outcome.metadata["postTestIds"] == ["online"]
    assert outcome.metadata["usedDefaultPostTests"] is True


def test_test_executor_writes_execution_log_for_test_jobs():
    logs = []

    class FakeTerminalManager:
        def _set_runtime_activity(self, robot_id, **kwargs):
            _ = robot_id, kwargs

        def run_tests(self, **kwargs):
            _ = kwargs
            return [
                {
                    "id": "battery",
                    "status": "error",
                    "value": "execution_error",
                    "details": "Unable to communicate with master",
                    "steps": [{"id": "step_2", "output": "ERROR: Unable to communicate with master!"}],
                }
            ]

        def get_last_test_run_metadata(self, **kwargs):
            _ = kwargs
            return {"runId": "test-r1-1", "session": {"runKind": "test"}}

        def _record_execution_log(self, payload):
            logs.append(payload)
            return {"file": "latest.json"}

    job = UserJob(
        id="job-test-1",
        kind="test",
        source="manual",
        label="Run tests",
        page_session_id="page-1",
        payload={"testIds": ["battery"]},
        status="running",
    )

    outcome = RobotJobExecutor(FakeTerminalManager()).execute_job(
        robot_id="r1",
        job=job,
        token=CancellationToken(),
    )

    assert outcome.status == "succeeded"
    assert outcome.metadata["executionLog"]["file"] == "latest.json"
    assert logs[0]["job"]["kind"] == "test"
    assert logs[0]["metadata"]["results"][0]["steps"][0]["output"] == "ERROR: Unable to communicate with master!"


def test_fix_executor_writes_execution_log_for_failed_fix_steps():
    logs = []

    class FakeTerminalManager:
        def _resolve_fix_spec(self, robot_id, fix_id):
            _ = robot_id, fix_id
            return {
                "definitionId": "flash_fix",
                "execute": [{"id": "step-1", "command": "flash"}],
            }

        def start_fix_run(self, robot_id):
            _ = robot_id

        def finish_fix_run(self, robot_id):
            _ = robot_id

        def _set_runtime_activity(self, robot_id, **kwargs):
            _ = robot_id, kwargs

        def _resolve_credentials(self, robot_id):
            _ = robot_id
            return ("host", "user", "sudo", 22)

        def create_automation_run_context(self, **kwargs):
            _ = kwargs
            return _FakeRunContext()

        class _orchestrate_connector:
            @staticmethod
            def run_definition(*args, **kwargs):
                _ = args, kwargs
                from backend.connectors.orchestrate import OrchestrationExecutionError

                raise OrchestrationExecutionError(
                    "Step 'step-1' failed",
                    steps=[{"id": "step-1", "status": "error", "output": "flash failed"}],
                    commands_executed=[{"id": "step-1", "command": "flash", "ok": False}],
                )

        def _record_execution_log(self, payload):
            logs.append(payload)
            return {"file": "failed-fix.json"}

    outcome = RobotJobExecutor(FakeTerminalManager()).execute_job(
        robot_id="r1",
        job=_job(payload={"fixId": "flash_fix"}),
        token=CancellationToken(),
    )

    assert outcome.status == "failed"
    assert outcome.metadata["executionLog"]["file"] == "failed-fix.json"
    assert logs[0]["status"] == "failed"
    assert logs[0]["metadata"]["steps"][0]["output"] == "flash failed"
