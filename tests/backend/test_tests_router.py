from __future__ import annotations

import threading
import time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.tests import create_tests_router


def test_tests_run_rejects_duplicate_active_robot_session():
    class FakeManager:
        def start_test_run(self, robot_id, page_session_id):
            _ = robot_id
            _ = page_session_id
            return False

        def finish_test_run(self, robot_id, page_session_id):
            _ = robot_id
            _ = page_session_id
            return None

        def run_tests(self, *_args, **_kwargs):
            return []

        def check_online(self, *_args, **_kwargs):
            return {
                "status": "ok",
                "value": "reachable",
                "details": "ok",
                "ms": 1,
                "checkedAt": time.time(),
                "source": "live",
            }

    app = FastAPI()
    app.include_router(create_tests_router(FakeManager()))
    client = TestClient(app)

    response = client.post(
        "/api/robots/r1/tests/run",
        json={"pageSessionId": "p1", "testIds": ["general"]},
    )
    assert response.status_code == 409
    assert "already active" in response.json()["detail"]


def test_online_batch_uses_safe_parallelism_cap(monkeypatch):
    class FakeManager:
        def __init__(self):
            self.thread_ids: set[int] = set()

        def start_test_run(self, *_args, **_kwargs):
            return True

        def finish_test_run(self, *_args, **_kwargs):
            return None

        def run_tests(self, *_args, **_kwargs):
            return []

        def check_online(self, robot_id, timeout_sec=None, force_refresh=False):
            _ = timeout_sec
            _ = force_refresh
            self.thread_ids.add(threading.get_ident())
            return {
                "status": "ok",
                "value": "reachable",
                "details": f"{robot_id} ok",
                "ms": 1,
                "checkedAt": time.time(),
                "source": "live",
            }

    monkeypatch.setenv("ROBOT_ONLINE_BATCH_MAX_PARALLELISM", "2")
    fake_manager = FakeManager()
    app = FastAPI()
    app.include_router(create_tests_router(fake_manager))
    client = TestClient(app)

    response = client.post(
        "/api/robots/online-check",
        json={
            "robotIds": ["r1", "r2", "r3", "r4"],
            "parallelism": 64,
            "forceRefresh": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert len(payload["results"]) == 4
    assert len(fake_manager.thread_ids) <= 2
