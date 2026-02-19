from __future__ import annotations

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
    assert payload["fileName"].startswith("bug_0_")
    assert Path(payload["path"]).is_absolute() is False

    report_path = logs_dir / payload["path"]
    assert report_path.exists()
    content = report_path.read_text(encoding="utf-8")
    assert "Robot A1 lost connection" in content


def test_create_bug_report_uses_directory_file_count_in_name(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    first = client.post("/api/bug-reports", json={"message": "First"})
    second = client.post("/api/bug-reports", json={"message": "Second"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["fileName"].startswith("bug_0_")
    assert second.json()["fileName"].startswith("bug_1_")


def test_create_bug_report_rejects_blank_message(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    client = _build_client(logs_dir)

    response = client.post("/api/bug-reports", json={"message": "   "})

    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]
