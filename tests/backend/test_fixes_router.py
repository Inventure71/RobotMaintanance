from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.fixes import create_fixes_router


def test_fix_router_start_endpoint_returns_410_gone() -> None:
    app = FastAPI()
    app.include_router(create_fixes_router(object()))
    client = TestClient(app)

    response = client.post(
        "/api/robots/r1/fixes/flash_fix/runs",
        json={"pageSessionId": "page-1"},
    )
    assert response.status_code == 410
    assert response.json()["detail"] == "Manual runs moved to /api/robots/{robotId}/jobs"


def test_fix_router_legacy_poll_endpoint_is_not_registered() -> None:
    app = FastAPI()
    app.include_router(create_fixes_router(object()))
    client = TestClient(app)

    response = client.get("/api/robots/r1/fixes/runs/run-1")
    assert response.status_code == 404
