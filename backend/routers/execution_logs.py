from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..execution_log_store import ExecutionLogStore


def create_execution_logs_router(execution_log_store: ExecutionLogStore) -> APIRouter:
    router = APIRouter()

    @router.get("/api/execution-logs")
    def list_execution_logs() -> dict:
        return {"logs": execution_log_store.list()}

    @router.get("/api/execution-logs/{filename}")
    def get_execution_log(filename: str) -> dict:
        try:
            return execution_log_store.read(filename)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Execution log not found.") from exc

    return router
