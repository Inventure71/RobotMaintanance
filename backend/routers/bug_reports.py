from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..normalization import normalize_text
from ..schemas import BugReportRequest, BugReportResponse


def create_bug_reports_router(logs_dir: Path) -> APIRouter:
    router = APIRouter()
    logger = logging.getLogger(__name__)
    max_files = max(1, int(os.getenv("BUG_REPORT_MAX_FILES", "2000")))
    retention_days = max(1, int(os.getenv("BUG_REPORT_RETENTION_DAYS", "30")))
    warn_dir_bytes = max(1, int(os.getenv("BUG_REPORT_WARN_DIR_BYTES", str(40 * 1024 * 1024))))
    max_dir_bytes = max(warn_dir_bytes, int(os.getenv("BUG_REPORT_MAX_DIR_BYTES", str(100 * 1024 * 1024))))

    def _next_bug_report_path(path: Path) -> Path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        return path / f"bug_{timestamp}_{uuid4().hex}.log"

    def _iter_report_files(path: Path) -> list[Path]:
        if not path.exists():
            return []
        files = [child for child in path.iterdir() if child.is_file() and child.name.startswith("bug_")]
        files.sort(key=lambda p: p.stat().st_mtime)
        return files

    def _dir_size_bytes(path: Path) -> int:
        total = 0
        for file_path in _iter_report_files(path):
            total += file_path.stat().st_size
        return total

    def _cleanup_reports(path: Path) -> None:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=retention_days)
        files = _iter_report_files(path)

        # First pass: age-based cleanup.
        for file_path in files:
            modified = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
            if modified < cutoff:
                try:
                    file_path.unlink(missing_ok=True)
                except OSError:
                    logger.warning("Failed to delete expired bug report file: %s", file_path)

        files = _iter_report_files(path)
        # Second pass: hard cap by count.
        overflow = len(files) - max_files
        if overflow > 0:
            for file_path in files[:overflow]:
                try:
                    file_path.unlink(missing_ok=True)
                except OSError:
                    logger.warning("Failed to delete overflow bug report file: %s", file_path)

    def _enforce_size_cap(path: Path) -> None:
        files = _iter_report_files(path)
        total = _dir_size_bytes(path)
        if total > warn_dir_bytes:
            logger.warning(
                "Bug reports directory size warning: %d bytes (warn threshold: %d bytes).",
                total,
                warn_dir_bytes,
            )

        while total > max_dir_bytes and len(files) > 1:
            oldest = files.pop(0)
            oldest_size = oldest.stat().st_size
            try:
                oldest.unlink(missing_ok=True)
            except OSError:
                logger.warning("Failed to delete bug report while enforcing size cap: %s", oldest)
                break
            total -= oldest_size

    @router.post("/api/bug-reports", response_model=BugReportResponse)
    def create_bug_report(body: BugReportRequest) -> BugReportResponse:
        message = normalize_text(body.message, "").strip()
        if not message:
            raise HTTPException(status_code=400, detail="Bug report message cannot be empty")

        logs_dir.mkdir(parents=True, exist_ok=True)
        _cleanup_reports(logs_dir)
        file_path = _next_bug_report_path(logs_dir)
        payload = (
            f"createdAtUtc: {datetime.now(timezone.utc).isoformat()}\n"
            f"message:\n{message}\n"
        )
        file_path.write_text(payload, encoding="utf-8")
        _cleanup_reports(logs_dir)
        _enforce_size_cap(logs_dir)

        return BugReportResponse(
            ok=True,
            fileName=file_path.name,
            path=file_path.name,
        )

    return router
