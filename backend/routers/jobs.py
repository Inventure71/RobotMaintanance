from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from ..schemas import JobEnqueueRequest, JobEnqueueResponse, JobSnapshotResponse
from ..terminal_manager import TerminalManager


def create_jobs_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()

    @router.post(
        "/api/robots/{robot_id}/jobs",
        status_code=202,
        response_model=JobEnqueueResponse,
    )
    def enqueue_robot_job(robot_id: str, body: dict[str, Any]) -> dict:
        try:
            request_payload = JobEnqueueRequest.model_validate(body)
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail="Invalid job enqueue request payload.") from exc
        return terminal_manager.enqueue_robot_job(
            robot_id=robot_id,
            payload=request_payload.model_dump(),
        )

    @router.get(
        "/api/robots/{robot_id}/jobs",
        response_model=JobSnapshotResponse,
    )
    def get_robot_jobs(robot_id: str) -> dict:
        return terminal_manager.get_robot_jobs(robot_id)

    @router.post(
        "/api/robots/{robot_id}/jobs/active/stop",
        response_model=JobSnapshotResponse,
    )
    def stop_active_robot_job(robot_id: str):
        snapshot, already_interrupting = terminal_manager.stop_active_robot_job(robot_id)
        status_code = 200 if already_interrupting else 202
        return JSONResponse(status_code=status_code, content=snapshot)

    return router
