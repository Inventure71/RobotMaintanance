from __future__ import annotations

from fastapi import APIRouter
from fastapi import HTTPException

from ..schemas import FixRunRequest
from ..terminal_manager import TerminalManager


def create_fixes_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()
    manual_runs_moved_detail = "Manual runs moved to /api/robots/{robotId}/jobs"

    @router.post("/api/robots/{robot_id}/fixes/{fix_id}/runs")
    def start_fix_run(robot_id: str, fix_id: str, body: FixRunRequest) -> dict[str, str]:
        _ = terminal_manager, robot_id, fix_id, body
        raise HTTPException(status_code=410, detail=manual_runs_moved_detail)

    return router
