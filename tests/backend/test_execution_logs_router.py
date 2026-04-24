from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.execution_log_store import ExecutionLogStore
from backend.routers.execution_logs import create_execution_logs_router


def test_execution_logs_router_lists_and_reads_latest_logs(tmp_path):
    store = ExecutionLogStore(tmp_path, max_logs=5)
    ref = store.write(
        {
            "robotId": "r1",
            "status": "failed",
            "job": {"id": "job-1", "kind": "test", "label": "Run tests"},
            "metadata": {"results": [{"id": "battery", "status": "error"}]},
        }
    )

    app = FastAPI()
    app.include_router(create_execution_logs_router(store))
    client = TestClient(app)

    listed = client.get("/api/execution-logs")
    assert listed.status_code == 200
    assert listed.json()["logs"][0]["file"] == ref["file"]

    fetched = client.get(f"/api/execution-logs/{ref['file']}")
    assert fetched.status_code == 200
    assert fetched.json()["metadata"]["results"][0]["id"] == "battery"
