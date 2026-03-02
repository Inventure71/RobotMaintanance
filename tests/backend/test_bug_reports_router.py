from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.bug_reports import create_bug_reports_router


def _build_client(logs_dir: Path) -> TestClient:
    app = FastAPI()
    app.include_router(create_bug_reports_router(logs_dir))
    return TestClient(app)


def test_create_bug_report_writes_file_with_expected_name(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    response = client.post("/api/bug-reports", json={"message": "Robot A1 lost connection"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["fileName"].startswith("bug_")
    assert payload["fileName"].endswith(".log")
    assert Path(payload["path"]).is_absolute() is False

    report_path = logs_dir / payload["path"]
    assert report_path.exists()
    content = report_path.read_text(encoding="utf-8")
    assert "Robot A1 lost connection" in content


def test_create_bug_report_uses_unique_uuid_name(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    first = client.post("/api/bug-reports", json={"message": "First"})
    second = client.post("/api/bug-reports", json={"message": "Second"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["fileName"] != second.json()["fileName"]


def test_create_bug_report_rejects_blank_message(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    response = client.post("/api/bug-reports", json={"message": "   "})

    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]


def test_create_bug_report_rejects_over_max_length(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    response = client.post("/api/bug-reports", json={"message": "x" * 8193})

    assert response.status_code == 422


def test_cleanup_removes_expired_files(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("BUG_REPORT_RETENTION_DAYS", "1")
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    expired = logs_dir / "bug_old.log"
    expired.write_text("expired", encoding="utf-8")
    old_time = (datetime.now(timezone.utc) - timedelta(days=3)).timestamp()
    os.utime(expired, (old_time, old_time))

    client = _build_client(logs_dir)
    response = client.post("/api/bug-reports", json={"message": "fresh"})

    assert response.status_code == 200
    assert not expired.exists()


def test_cleanup_enforces_max_file_count(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("BUG_REPORT_MAX_FILES", "2")
    monkeypatch.setenv("BUG_REPORT_RETENTION_DAYS", "3650")
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    client = _build_client(logs_dir)
    for idx in range(4):
        response = client.post("/api/bug-reports", json={"message": f"report-{idx}"})
        assert response.status_code == 200

    files = sorted(p for p in logs_dir.iterdir() if p.is_file())
    assert len(files) == 2


def test_cleanup_enforces_directory_size_limit(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("BUG_REPORT_MAX_FILES", "100")
    monkeypatch.setenv("BUG_REPORT_RETENTION_DAYS", "3650")
    monkeypatch.setenv("BUG_REPORT_WARN_DIR_BYTES", "100")
    monkeypatch.setenv("BUG_REPORT_MAX_DIR_BYTES", "220")
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    # Seed a larger, older file so the cap removes it first.
    seeded = logs_dir / "bug_seed.log"
    seeded.write_text("x" * 180, encoding="utf-8")
    old_time = (datetime.now(timezone.utc) - timedelta(days=1)).timestamp()
    os.utime(seeded, (old_time, old_time))

    client = _build_client(logs_dir)
    response = client.post("/api/bug-reports", json={"message": "y" * 120})
    assert response.status_code == 200

    files = sorted(p for p in logs_dir.iterdir() if p.is_file())
    assert len(files) >= 1
    assert (logs_dir / response.json()["path"]).exists()
    total_size = sum(p.stat().st_size for p in files)
    assert total_size <= 220
