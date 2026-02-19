from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.robots import create_robots_router


def test_get_robots_merges_runtime_tests():
    robots_by_id = {
        "r1": {
            "id": "r1",
            "name": "Robot One",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.1",
            "ssh": {"username": "u", "password": "p"},
        }
    }
    robot_types_by_id = {
        "rosbot-2-pro": {
            "id": "rosbot-2-pro",
            "typeId": "rosbot-2-pro",
            "tests": [
                {"id": "online", "defaultStatus": "warning", "defaultValue": "unknown"},
                {"id": "battery", "defaultStatus": "warning", "defaultValue": "unknown"},
            ],
        }
    }

    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=Path("/tmp/robots.config.json"),
            runtime_tests_provider=lambda _robot_id: {
                "online": {"status": "ok", "value": "reachable", "details": "auto"},
                "battery": {"status": "ok", "value": "93%", "details": "auto"},
            },
            runtime_activity_provider=lambda _robot_id: {
                "searching": True,
                "testing": False,
                "phase": "online_probe",
                "updatedAt": 123.0,
            },
        )
    )
    client = TestClient(app)

    response = client.get("/api/robots")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["tests"]["online"]["status"] == "ok"
    assert payload[0]["tests"]["battery"]["value"] == "93%"
    assert payload[0]["activity"]["searching"] is True
    assert payload[0]["activity"]["phase"] == "online_probe"
