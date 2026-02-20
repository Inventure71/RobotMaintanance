from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.fixes import create_fixes_router


def test_fix_router_starts_job_and_polls_status():
    class FakeManager:
        def __init__(self):
            self.started = []

        def start_fix_job(self, robot_id, fix_id, page_session_id=None, params=None):
            self.started.append((robot_id, fix_id, page_session_id, params))
            return {
                "ok": True,
                "robotId": robot_id,
                "fixId": fix_id,
                "runId": "run-1",
                "status": "queued",
            }

        def get_fix_job(self, robot_id, run_id):
            return {
                "ok": True,
                "robotId": robot_id,
                "runId": run_id,
                "status": "succeeded",
                "events": [],
                "fixResult": {"status": "ok"},
            }

    app = FastAPI()
    manager = FakeManager()
    app.include_router(create_fixes_router(manager))
    client = TestClient(app)

    start = client.post(
        "/api/robots/r1/fixes/flash_fix/runs",
        json={
            "pageSessionId": "page-1",
            "params": {"postDelaySec": 5},
        },
    )
    assert start.status_code == 200
    assert start.json()["runId"] == "run-1"
    assert manager.started == [("r1", "flash_fix", "page-1", {"postDelaySec": 5})]

    poll = client.get("/api/robots/r1/fixes/runs/run-1")
    assert poll.status_code == 200
    assert poll.json()["status"] == "succeeded"
