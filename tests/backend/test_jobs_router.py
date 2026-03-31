from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.routers.jobs import create_jobs_router


def test_jobs_router_enqueues_and_reads_snapshot():
    class FakeManager:
        def __init__(self):
            self.received = None

        def enqueue_robot_job(self, *, robot_id, payload):
            self.received = (robot_id, payload)
            return {
                "jobId": "job-1",
                "activeJob": {
                    "id": "job-1",
                    "kind": "test",
                    "status": "running",
                    "source": "manual",
                    "label": "Run tests",
                    "enqueuedAt": 1.0,
                    "startedAt": 1.1,
                    "updatedAt": 1.1,
                },
                "queuedJobs": [],
                "jobQueueVersion": 2,
            }

        def get_robot_jobs(self, robot_id):
            _ = robot_id
            return {
                "activeJob": None,
                "queuedJobs": [],
                "jobQueueVersion": 2,
            }

        def stop_active_robot_job(self, robot_id):
            _ = robot_id
            return ({"activeJob": None, "queuedJobs": [], "jobQueueVersion": 2}, False)

    manager = FakeManager()
    app = FastAPI()
    app.include_router(create_jobs_router(manager))
    client = TestClient(app)

    enqueue = client.post(
        "/api/robots/r1/jobs",
        json={"kind": "test", "testIds": ["general"]},
    )
    assert enqueue.status_code == 202
    assert enqueue.json()["jobId"] == "job-1"
    assert manager.received is not None
    assert manager.received[0] == "r1"

    get_snapshot = client.get("/api/robots/r1/jobs")
    assert get_snapshot.status_code == 200
    assert get_snapshot.json()["jobQueueVersion"] == 2


def test_jobs_router_returns_400_for_invalid_enqueue_payload():
    class FakeManager:
        def enqueue_robot_job(self, *, robot_id, payload):
            _ = robot_id, payload
            raise AssertionError("enqueue_robot_job must not be called")

        def get_robot_jobs(self, robot_id):
            _ = robot_id
            return {"activeJob": None, "queuedJobs": [], "jobQueueVersion": 0}

        def stop_active_robot_job(self, robot_id):
            _ = robot_id
            return ({"activeJob": None, "queuedJobs": [], "jobQueueVersion": 0}, False)

    app = FastAPI()
    app.include_router(create_jobs_router(FakeManager()))
    client = TestClient(app)

    response = client.post(
        "/api/robots/r1/jobs",
        json={},
    )
    assert response.status_code == 400


def test_jobs_router_stop_semantics_202_200_and_409():
    class FakeManager:
        def __init__(self):
            self.calls = 0

        def enqueue_robot_job(self, *, robot_id, payload):
            _ = robot_id, payload
            return {"jobId": "job-1", "activeJob": None, "queuedJobs": [], "jobQueueVersion": 0}

        def get_robot_jobs(self, robot_id):
            _ = robot_id
            return {"activeJob": None, "queuedJobs": [], "jobQueueVersion": 0}

        def stop_active_robot_job(self, robot_id):
            _ = robot_id
            self.calls += 1
            if self.calls == 1:
                return (
                    {
                        "activeJob": {
                            "id": "job-1",
                            "kind": "test",
                            "status": "interrupting",
                            "source": "manual",
                            "label": "Run tests",
                            "enqueuedAt": 1.0,
                            "startedAt": 1.1,
                            "updatedAt": 1.2,
                        },
                        "queuedJobs": [],
                        "jobQueueVersion": 3,
                    },
                    False,
                )
            if self.calls == 2:
                return (
                    {
                        "activeJob": {
                            "id": "job-1",
                            "kind": "test",
                            "status": "interrupting",
                            "source": "manual",
                            "label": "Run tests",
                            "enqueuedAt": 1.0,
                            "startedAt": 1.1,
                            "updatedAt": 1.2,
                        },
                        "queuedJobs": [],
                        "jobQueueVersion": 3,
                    },
                    True,
                )
            raise HTTPException(status_code=409, detail="No active user job.")

    manager = FakeManager()
    app = FastAPI()
    app.include_router(create_jobs_router(manager))
    client = TestClient(app)

    first = client.post("/api/robots/r1/jobs/active/stop")
    assert first.status_code == 202
    assert first.json()["activeJob"]["status"] == "interrupting"

    second = client.post("/api/robots/r1/jobs/active/stop")
    assert second.status_code == 200
    assert second.json()["activeJob"]["status"] == "interrupting"

    third = client.post("/api/robots/r1/jobs/active/stop")
    assert third.status_code == 409
