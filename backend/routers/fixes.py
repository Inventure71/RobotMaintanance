from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi import HTTPException

from ..schemas import FixRunRequest
from ..terminal_manager import TerminalManager


def create_fixes_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()

    @router.post("/api/robots/{robot_id}/fixes/{fix_id}/runs")
    def start_fix_run(robot_id: str, fix_id: str, body: FixRunRequest) -> dict[str, Any]:
        if not hasattr(terminal_manager, "start_fix_job"):
            raise HTTPException(status_code=501, detail="Fix jobs are not supported by this backend.")
        return terminal_manager.start_fix_job(
            robot_id=robot_id,
            fix_id=fix_id,
            page_session_id=body.pageSessionId,
            params=body.params,
        )

    @router.get("/api/robots/{robot_id}/fixes/runs/{run_id}")
    def get_fix_run(robot_id: str, run_id: str) -> dict[str, Any]:
        if not hasattr(terminal_manager, "get_fix_job"):
            raise HTTPException(status_code=501, detail="Fix jobs are not supported by this backend.")
        return terminal_manager.get_fix_job(robot_id=robot_id, run_id=run_id)

    return router
