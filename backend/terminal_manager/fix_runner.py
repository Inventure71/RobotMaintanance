from __future__ import annotations

import threading
import time
import uuid
from typing import Any

from fastapi import HTTPException

from ..normalization import normalize_text


class FixRunnerMixin:
    def _new_fix_run_id(self) -> str:
        return f"fixrun-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"

    def _resolve_fix_spec(self, robot_id: str, fix_id: str) -> dict[str, Any]:
        robot_type = self._resolve_robot_type(robot_id)
        fixes = robot_type.get("autoFixes") if isinstance(robot_type, dict) else []
        if not isinstance(fixes, list):
            raise HTTPException(status_code=404, detail=f"Fix '{fix_id}' is not configured for this robot type.")

        normalized_fix_id = normalize_text(fix_id, "")
        for fix in fixes:
            if not isinstance(fix, dict):
                continue
            candidate_id = normalize_text(fix.get("id"), "")
            if candidate_id == normalized_fix_id:
                if fix.get("enabled", True) is False:
                    raise HTTPException(status_code=400, detail=f"Fix '{fix_id}' is disabled.")
                return fix

        raise HTTPException(status_code=404, detail=f"Fix '{fix_id}' is not configured for this robot type.")

    def _record_fix_event(
        self,
        robot_id: str,
        run_id: str,
        event_type: str,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        event = {
            "at": time.time(),
            "type": normalize_text(event_type, "event"),
            "message": normalize_text(message, ""),
            "data": data if isinstance(data, dict) else {},
        }
        with self._lock:
            payload = self._fix_runs.get((robot_id, run_id))
            if not isinstance(payload, dict):
                return
            payload_events = payload.get("events")
            if not isinstance(payload_events, list):
                payload_events = []
                payload["events"] = payload_events
            payload_events.append(event)
            payload["updatedAt"] = time.time()

    def _fix_job_payload(self, robot_id: str, run_id: str) -> dict[str, Any]:
        with self._lock:
            payload = self._fix_runs.get((robot_id, run_id))
            if not isinstance(payload, dict):
                raise HTTPException(status_code=404, detail=f"Fix run '{run_id}' not found for robot '{robot_id}'.")
            copied = dict(payload)
            copied["events"] = [dict(item) for item in payload.get("events", []) if isinstance(item, dict)]
            if isinstance(payload.get("fixResult"), dict):
                copied["fixResult"] = dict(payload["fixResult"])
            if isinstance(payload.get("testRun"), dict):
                copied["testRun"] = dict(payload["testRun"])
            return copied

    def start_fix_job(
        self,
        *,
        robot_id: str,
        fix_id: str,
        page_session_id: str | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_fix_id = normalize_text(fix_id, "")
        if not normalized_robot_id or not normalized_fix_id:
            raise HTTPException(status_code=400, detail="robot_id and fix_id are required")

        fix_spec = self._resolve_fix_spec(normalized_robot_id, normalized_fix_id)
        if self._is_robot_busy(normalized_robot_id):
            raise HTTPException(status_code=409, detail="Robot is busy with another active operation.")

        run_id = self._new_fix_run_id()
        now = time.time()

        fix_params = fix_spec.get("params") if isinstance(fix_spec.get("params"), dict) else {}
        merged_params = dict(fix_params)
        if isinstance(params, dict):
            merged_params.update(params)

        normalized_page_session_id = normalize_text(page_session_id, "")
        if not normalized_page_session_id:
            normalized_page_session_id = f"fix-{normalized_robot_id}-{uuid.uuid4().hex[:8]}"

        payload = {
            "ok": True,
            "robotId": normalized_robot_id,
            "fixId": normalized_fix_id,
            "runId": run_id,
            "status": "queued",
            "createdAt": now,
            "updatedAt": now,
            "startedAt": 0.0,
            "finishedAt": 0.0,
            "events": [],
            "fixResult": None,
            "testRun": None,
            "error": None,
            "pageSessionId": normalized_page_session_id,
        }

        with self._lock:
            self._fix_runs[(normalized_robot_id, run_id)] = payload

        thread = threading.Thread(
            target=self._execute_fix_job,
            kwargs={
                "robot_id": normalized_robot_id,
                "fix_id": normalized_fix_id,
                "run_id": run_id,
                "fix_spec": fix_spec,
                "params": merged_params,
                "page_session_id": normalized_page_session_id,
            },
            daemon=True,
        )
        thread.start()

        return self._fix_job_payload(normalized_robot_id, run_id)

    def get_fix_job(self, *, robot_id: str, run_id: str) -> dict[str, Any]:
        normalized_robot_id = normalize_text(robot_id, "")
        normalized_run_id = normalize_text(run_id, "")
        if not normalized_robot_id or not normalized_run_id:
            raise HTTPException(status_code=400, detail="robot_id and run_id are required")
        return self._fix_job_payload(normalized_robot_id, normalized_run_id)

    def _execute_fix_job(
        self,
        *,
        robot_id: str,
        fix_id: str,
        run_id: str,
        fix_spec: dict[str, Any],
        params: dict[str, Any],
        page_session_id: str,
    ) -> None:
        started_at = time.time()
        with self._lock:
            payload = self._fix_runs.get((robot_id, run_id))
            if not isinstance(payload, dict):
                return
            payload["status"] = "running"
            payload["startedAt"] = started_at
            payload["updatedAt"] = started_at

        self._record_fix_event(robot_id, run_id, "started", f"Fix '{fix_id}' started.")

        self.start_fix_run(robot_id)
        self._set_runtime_activity(robot_id, searching=False, testing=True, phase="fixing")

        try:
            def emit_event(event_type: str, message: str, data: dict[str, Any] | None = None) -> None:
                self._record_fix_event(robot_id, run_id, event_type, message, data)

            def run_command(command: str, timeout_sec: float | None = None) -> str:
                return self.run_command(
                    page_session_id=page_session_id,
                    robot_id=robot_id,
                    command=command,
                    timeout_sec=timeout_sec,
                    source="auto-fix",
                )

            def run_tests(test_ids: list[str]) -> list[dict[str, Any]]:
                normalized = [normalize_text(test_id, "") for test_id in (test_ids or [])]
                normalized = [test_id for test_id in normalized if test_id]
                if not normalized:
                    return []
                return self.run_tests(
                    robot_id=robot_id,
                    page_session_id=page_session_id,
                    test_ids=normalized,
                    dry_run=False,
                )

            definition = {
                "id": normalize_text(fix_spec.get("definitionId"), fix_id),
                "execute": fix_spec.get("execute") if isinstance(fix_spec.get("execute"), list) else [],
                "checks": [],
            }

            execution = self._orchestrate_connector.run_definition(
                definition,
                run_scope=f"fix:{robot_id}:{run_id}",
                run_command=run_command,
                params=params,
                dry_run=False,
                emit_event=emit_event,
                command_cache={},
            )

            post_test_ids = params.get("postTestIds") if isinstance(params.get("postTestIds"), list) else None
            if post_test_ids is None:
                post_test_ids = fix_spec.get("postTestIds") if isinstance(fix_spec.get("postTestIds"), list) else []
            post_test_ids = [normalize_text(test_id, "") for test_id in post_test_ids if normalize_text(test_id, "")]

            if post_test_ids:
                emit_event("post_tests_started", "Running post-fix tests.", {"testIds": post_test_ids})
            test_results = run_tests(post_test_ids)
            if post_test_ids:
                emit_event("post_tests_finished", "Post-fix tests completed.", {"testCount": len(test_results)})

            commands = execution.get("commandsExecuted") if isinstance(execution.get("commandsExecuted"), list) else []
            logs = [str(item.get("output") or "") for item in commands if isinstance(item, dict)]
            fix_result = {
                "status": "ok",
                "details": "Fix run completed.",
                "commandsExecuted": commands,
                "logs": logs,
                "postTestIds": post_test_ids,
            }

            finished_at = time.time()
            with self._lock:
                payload = self._fix_runs.get((robot_id, run_id))
                if not isinstance(payload, dict):
                    return
                payload["status"] = "succeeded"
                payload["fixResult"] = fix_result
                payload["testRun"] = {
                    "results": test_results,
                    "count": len(test_results),
                }
                payload["finishedAt"] = finished_at
                payload["updatedAt"] = finished_at
                payload["error"] = None

            self._record_fix_event(robot_id, run_id, "finished", f"Fix '{fix_id}' completed with status 'succeeded'.")
        except Exception as exc:
            finished_at = time.time()
            error_message = str(exc)
            with self._lock:
                payload = self._fix_runs.get((robot_id, run_id))
                if not isinstance(payload, dict):
                    return
                payload["status"] = "failed"
                payload["error"] = error_message
                payload["finishedAt"] = finished_at
                payload["updatedAt"] = finished_at
            self._record_fix_event(robot_id, run_id, "failed", f"Fix '{fix_id}' failed: {error_message}")
        finally:
            self.finish_fix_run(robot_id)
            self._set_runtime_activity(robot_id, testing=False, phase=None)
