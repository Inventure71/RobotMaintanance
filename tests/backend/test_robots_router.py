from __future__ import annotations

import json
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
            "ssh": {"username": "u", "password": "p", "port": 2222},
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


def test_fleet_static_endpoint_returns_default_test_payloads():
    robots_by_id = {
        "r1": {
            "id": "r1",
            "name": "Robot One",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.1",
            "ssh": {"username": "u", "password": "p", "port": 2222},
        }
    }
    robot_types_by_id = {
        "rosbot-2-pro": {
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
        )
    )
    client = TestClient(app)

    response = client.get("/api/fleet/static")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["robots"]) == 1
    assert payload["robots"][0]["id"] == "r1"
    assert payload["robots"][0]["tests"]["online"]["status"] == "warning"
    assert payload["robots"][0]["tests"]["battery"]["value"] == "unknown"


def test_fleet_runtime_endpoint_uses_versioned_snapshot_provider():
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={"r1": {"id": "r1", "name": "Robot One", "type": "rosbot-2-pro"}},
            robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
            robots_config_path=Path("/tmp/robots.config.json"),
            runtime_snapshot_provider=lambda since: {
                "version": 12,
                "full": since <= 0,
                "robots": [
                    {
                        "id": "r1",
                        "version": 12,
                        "tests": {
                            "online": {
                                "status": "ok",
                                "value": "reachable",
                                "details": "ok",
                                "source": "auto-monitor",
                                "checkedAt": 10.0,
                            }
                        },
                        "activity": {
                            "searching": False,
                            "testing": False,
                            "phase": None,
                            "updatedAt": 10.0,
                        },
                    }
                ],
            },
        )
    )
    client = TestClient(app)

    response = client.get("/api/fleet/runtime?since=7")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == 12
    assert payload["full"] is False
    assert payload["robots"][0]["id"] == "r1"
    assert payload["robots"][0]["version"] == 12
    assert payload["robots"][0]["tests"]["online"]["status"] == "ok"


def test_update_and_delete_robot_persists_config(tmp_path):
    robots_config_path = tmp_path / "robots.config.json"
    robots_by_id = {
        "r1": {
            "id": "r1",
            "name": "Robot One",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.1",
            "ssh": {"username": "u", "password": "p", "port": 2222},
        }
    }
    robot_types_by_id = {
        "rosbot-2-pro": {
            "typeId": "rosbot-2-pro",
            "tests": [],
        }
    }
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=robots_config_path,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robots/r1",
        json={
            "name": "Robot One Updated",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.11",
            "username": "u2",
            "password": "p2",
            "model": {
                "file_name": "robot.glb",
                "path_to_quality_folders": "assets/models",
            },
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["name"] == "Robot One Updated"
    assert updated["ip"] == "10.0.0.11"
    assert updated["ssh"]["username"] == "u2"
    assert updated["ssh"]["port"] == 2222
    assert updated["model"]["file_name"] == "robot.glb"
    assert "modelUrl" not in updated
    payload = json.loads(robots_config_path.read_text(encoding="utf-8"))
    assert payload["robots"][0]["name"] == "Robot One Updated"
    assert payload["robots"][0]["ssh"]["port"] == 2222
    assert payload["robots"][0]["model"]["file_name"] == "robot.glb"
    assert "modelUrl" not in payload["robots"][0]

    deleted = client.delete("/api/robots/r1")
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True
    assert client.get("/api/robots").json() == []


def test_create_robot_type_generates_id_from_name(tmp_path):
    robots_by_id: dict[str, dict[str, object]] = {}
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_types_config_path.write_text(
        json.dumps(
            {
                "version": "3.0",
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot 2 Pro",
                        "testRefs": ["online", "battery"],
                        "fixRefs": ["flash_fix"],
                        "topics": ["/battery"],
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    robot_types_by_id = {
        "rosbot-2-pro": {
            "typeId": "rosbot-2-pro",
            "typeKey": "rosbot-2-pro",
            "label": "Rosbot 2 Pro",
            "topics": ["/battery"],
            "testRefs": ["online", "battery"],
            "fixRefs": ["flash_fix"],
            "tests": [{"id": "online"}],
            "autoFixes": [{"id": "flash_fix"}],
            "autoMonitor": {"batteryCommand": "echo battery"},
        }
    }

    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=robot_types_config_path,
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robot-types",
        json={
            "name": "Rosbot 2 Pro V2",
            "model": {
                "file_name": "rosbot-2-pro-v2.glb",
                "path_to_quality_folders": "assets/models",
            },
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["typeId"] == "rosbot-2-pro-v2"
    assert payload["testRefs"] == []
    assert payload["fixRefs"] == []
    assert payload["model"]["file_name"] == "rosbot-2-pro-v2.glb"

    config_payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    ids = [entry.get("id") for entry in config_payload["robotTypes"]]
    assert "rosbot-2-pro-v2" in ids
    created_entry = next(entry for entry in config_payload["robotTypes"] if entry.get("id") == "rosbot-2-pro-v2")
    assert created_entry["model"]["file_name"] == "rosbot-2-pro-v2.glb"


def test_create_robot_type_requires_model_file_name(tmp_path):
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={},
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=tmp_path / "robot-types.config.json",
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robot-types",
        json={
            "name": "Rosbot 4",
        },
    )
    assert response.status_code == 400
    assert "Model file name is required" in response.json().get("detail", "")


def test_create_robot_accepts_model_override_payload(tmp_path):
    robots_config_path = tmp_path / "robots.config.json"
    robots_by_id: dict[str, dict[str, object]] = {}
    robot_types_by_id = {
        "rosbot-2-pro": {
            "typeId": "rosbot-2-pro",
            "tests": [],
            "model": {"file_name": "rosbot-2-pro.glb"},
        }
    }
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=robots_config_path,
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robots",
        json={
            "name": "Robot Created",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.22",
            "username": "u",
            "password": "p",
            "model": {"file_name": "custom.glb"},
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["model"]["file_name"] == "custom.glb"
    assert "modelUrl" not in created

    config_payload = json.loads(robots_config_path.read_text(encoding="utf-8"))
    assert config_payload["robots"][0]["model"]["file_name"] == "custom.glb"
