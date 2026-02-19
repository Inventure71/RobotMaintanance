from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..normalization import normalize_text
from ..schemas import BugReportRequest, BugReportResponse


def create_bug_reports_router(logs_dir: Path) -> APIRouter:
    router = APIRouter()

    def _bug_file_count(path: Path) -> int:
        return sum(1 for child in path.iterdir() if child.is_file())

    def _next_bug_report_path(path: Path) -> Path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        count = _bug_file_count(path)
        base_name = f"bug_{count}_{timestamp}"
        candidate = path / base_name
        if not candidate.exists():
            return candidate

        # Extremely unlikely guard for same-name collisions.
        suffix = 1
        while True:
            fallback = path / f"{base_name}_{suffix}"
            if not fallback.exists():
                return fallback
            suffix += 1

    @router.post("/api/bug-reports", response_model=BugReportResponse)
    def create_bug_report(body: BugReportRequest) -> BugReportResponse:
        message = normalize_text(body.message, "").strip()
        if not message:
            raise HTTPException(status_code=400, detail="Bug report message cannot be empty")

        logs_dir.mkdir(parents=True, exist_ok=True)
        file_path = _next_bug_report_path(logs_dir)
        payload = (
            f"createdAtUtc: {datetime.now(timezone.utc).isoformat()}\n"
            f"message:\n{message}\n"
        )
        file_path.write_text(payload, encoding="utf-8")

        return BugReportResponse(
            ok=True,
            fileName=file_path.name,
            path=file_path.name,
        )

    return router
