from __future__ import annotations

import time
import uuid
from typing import Any

from ...normalization import normalize_text
from .cancel import CancellationToken, JobInterrupted
from .models import JobExecutionOutcome, UserJob


class RobotJobExecutor:
    def __init__(self, terminal_manager: Any) -> None:
        self._tm = terminal_manager

    def execute_job(self, *, robot_id: str, job: UserJob, token: CancellationToken) -> JobExecutionOutcome:
        started_at = time.time()
        outcome = JobExecutionOutcome(status="failed", error=f"Unsupported job kind: {job.kind}")
        try:
            token.throw_if_interrupted()
            if job.kind == "test":
                outcome = self._execute_test_job(robot_id=robot_id, job=job, token=token)
            elif job.kind == "fix":
                outcome = self._execute_fix_job(robot_id=robot_id, job=job, token=token)
            return outcome
        except JobInterrupted:
            outcome = JobExecutionOutcome(status="interrupted")
            raise
        finally:
            self._write_execution_log(
                robot_id=robot_id,
                job=job,
                outcome=outcome,
                started_at=started_at,
                finished_at=time.time(),
            )

    def _write_execution_log(
        self,
        *,
        robot_id: str,
        job: UserJob,
        outcome: JobExecutionOutcome,
        started_at: float,
        finished_at: float,
    ) -> None:
        record = getattr(self._tm, "_record_execution_log", None)
        if not callable(record):
            return
        payload = {
            "robotId": robot_id,
            "status": normalize_text(outcome.status, "failed"),
            "error": normalize_text(outcome.error, ""),
            "startedAt": float(started_at),
            "finishedAt": float(finished_at),
            "durationMs": max(0, int((finished_at - started_at) * 1000)),
            "job": {
                "id": job.id,
                "kind": job.kind,
                "source": job.source,
                "label": job.label,
                "pageSessionId": job.page_session_id,
                "payload": dict(job.payload or {}),
            },
            "metadata": dict(outcome.metadata or {}),
        }
        try:
            log_ref = record(payload)
        except Exception:
            return
        if isinstance(log_ref, dict):
            outcome.metadata.setdefault("executionLog", log_ref)

    def _execute_test_job(self, *, robot_id: str, job: UserJob, token: CancellationToken) -> JobExecutionOutcome:
        payload = job.payload if isinstance(job.payload, dict) else {}
        raw_test_ids = payload.get("testIds") if isinstance(payload.get("testIds"), list) else None
        test_ids = None
        if isinstance(raw_test_ids, list):
            normalized = [normalize_text(test_id, "") for test_id in raw_test_ids]
            test_ids = [test_id for test_id in normalized if test_id]

        page_session_id = normalize_text(job.page_session_id, "") or f"job-{robot_id}-{uuid.uuid4().hex[:8]}"
        self._tm._set_runtime_activity(robot_id, searching=False, testing=True, phase="testing")
        try:
            results = self._tm.run_tests(
                robot_id=robot_id,
                page_session_id=page_session_id,
                test_ids=test_ids,
                dry_run=False,
                queue_timeout_sec=payload.get("queueTimeoutSec"),
                connect_timeout_sec=payload.get("connectTimeoutSec"),
                execute_timeout_sec=payload.get("executeTimeoutSec") or payload.get("timeoutSec"),
                should_cancel=token.is_interrupted,
            )
            token.throw_if_interrupted()

            metadata = {
                "results": results if isinstance(results, list) else [],
                "session": self._tm.get_last_test_run_metadata(robot_id=robot_id, page_session_id=page_session_id),
            }
            return JobExecutionOutcome(status="succeeded", metadata=metadata)
        finally:
            self._tm._set_runtime_activity(robot_id, testing=False, phase=None)

    def _execute_fix_job(self, *, robot_id: str, job: UserJob, token: CancellationToken) -> JobExecutionOutcome:
        payload = job.payload if isinstance(job.payload, dict) else {}
        fix_id = normalize_text(payload.get("fixId"), "")
        if not fix_id:
            return JobExecutionOutcome(status="failed", error="Missing fixId for fix job")

        params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
        fix_spec = self._tm._resolve_fix_spec(robot_id, fix_id)

        fix_params = fix_spec.get("params") if isinstance(fix_spec.get("params"), dict) else {}
        merged_params = dict(fix_params)
        merged_params.update(params)

        page_session_id = normalize_text(job.page_session_id, "") or f"job-{robot_id}-{uuid.uuid4().hex[:8]}"

        self._tm.start_fix_run(robot_id)
        self._tm._set_runtime_activity(robot_id, searching=False, testing=True, phase="fixing")

        try:
            token.throw_if_interrupted()
            _, _, sudo_password, _ = self._tm._resolve_credentials(robot_id)
            execution: dict[str, Any] = {}
            run_metadata: dict[str, Any] = {}
            run_context = self._tm.create_automation_run_context(
                robot_id=robot_id,
                page_session_id=page_session_id,
                run_kind="fix",
                queue_timeout_sec=payload.get("queueTimeoutSec"),
                connect_timeout_sec=payload.get("connectTimeoutSec"),
                execute_timeout_sec=payload.get("executeTimeoutSec") or payload.get("timeoutSec"),
            )

            def run_command(command: str, timeout_sec: float | None = None):
                token.throw_if_interrupted()
                return run_context.run_command(
                    command,
                    timeout_sec=timeout_sec,
                    sudo_password=sudo_password,
                )

            try:
                definition = {
                    "id": normalize_text(fix_spec.get("definitionId"), fix_id),
                    "execute": fix_spec.get("execute") if isinstance(fix_spec.get("execute"), list) else [],
                    "checks": [],
                }
                execution = self._tm._orchestrate_connector.run_definition(
                    definition,
                    run_scope=f"job-fix:{robot_id}:{job.id}",
                    run_command=run_command,
                    params=merged_params,
                    dry_run=False,
                    emit_event=None,
                    command_cache={},
                    should_cancel=token.is_interrupted,
                )
            finally:
                try:
                    run_context.close()
                finally:
                    run_metadata = run_context.metadata_payload()

            token.throw_if_interrupted()
            raw_payload_post_test_ids = payload.get("postTestIds") if isinstance(payload.get("postTestIds"), list) else None
            if raw_payload_post_test_ids is not None:
                seen_post_test_ids: set[str] = set()
                post_test_ids = []
                for raw_test_id in raw_payload_post_test_ids:
                    test_id = normalize_text(raw_test_id, "")
                    if not test_id or test_id in seen_post_test_ids:
                        continue
                    seen_post_test_ids.add(test_id)
                    post_test_ids.append(test_id)
                used_default_post_tests = False
            else:
                post_test_ids, used_default_post_tests = self._tm._resolve_post_fix_test_ids(robot_id, fix_spec)

            if post_test_ids:
                test_results = self._tm.run_tests(
                    robot_id=robot_id,
                    page_session_id=page_session_id,
                    test_ids=post_test_ids,
                    dry_run=False,
                    queue_timeout_sec=payload.get("queueTimeoutSec"),
                    connect_timeout_sec=payload.get("connectTimeoutSec"),
                    execute_timeout_sec=payload.get("executeTimeoutSec") or payload.get("timeoutSec"),
                    should_cancel=token.is_interrupted,
                )
            else:
                test_results = []
            token.throw_if_interrupted()

            commands = execution.get("commandsExecuted") if isinstance(execution.get("commandsExecuted"), list) else []
            metadata = {
                "fixId": fix_id,
                "commandsExecuted": commands,
                "postTestIds": post_test_ids,
                "usedDefaultPostTests": used_default_post_tests,
                "testRun": {
                    "results": test_results if isinstance(test_results, list) else [],
                    "count": len(test_results if isinstance(test_results, list) else []),
                },
                "session": run_metadata.get("session") if isinstance(run_metadata, dict) else {},
                "timing": run_metadata.get("timing") if isinstance(run_metadata, dict) else {},
            }
            return JobExecutionOutcome(status="succeeded", metadata=metadata)
        except JobInterrupted:
            raise
        except Exception as exc:
            exc_steps = getattr(exc, "steps", None)
            exc_commands = getattr(exc, "commands_executed", None)
            if not isinstance(exc_steps, list) and not isinstance(exc_commands, list):
                return JobExecutionOutcome(status="failed", error=normalize_text(str(exc), "Fix execution failed"))
            metadata = {
                "fixId": fix_id,
                "steps": list(exc_steps or []),
                "commandsExecuted": list(exc_commands or []),
                "session": run_metadata.get("session") if isinstance(run_metadata, dict) else {},
                "timing": run_metadata.get("timing") if isinstance(run_metadata, dict) else {},
            }
            return JobExecutionOutcome(
                status="failed",
                metadata=metadata,
                error=normalize_text(str(exc), "Fix execution failed"),
            )
        finally:
            self._tm.finish_fix_run(robot_id)
            self._tm._set_runtime_activity(robot_id, testing=False, phase=None)
