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


def test_robot_and_type_model_payloads_include_available_qualities(tmp_path):
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes" / "robots").mkdir(parents=True)
    (robot_models_root / "HighRes").mkdir(parents=True)
    (robot_models_root / "LowRes" / "robots" / "theseus.glb").write_bytes(b"low")
    (robot_models_root / "LowRes" / "custom-type.glb").write_bytes(b"type-low")
    (robot_models_root / "HighRes" / "custom-type.glb").write_bytes(b"type-high")

    robots_by_id = {
        "theseus": {
            "id": "theseus",
            "name": "Theseus",
            "type": "custom-type",
            "ip": "10.0.0.9",
            "ssh": {"username": "u", "password": "p"},
            "model": {"file_name": "robots/theseus.glb"},
        }
    }
    robot_types_by_id = {
        "custom-type": {
            "typeId": "custom-type",
            "tests": [],
            "model": {"file_name": "custom-type.glb"},
        }
    }

    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=tmp_path / "robots.config.json",
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    robots_response = client.get("/api/robots")
    assert robots_response.status_code == 200
    robot_model = robots_response.json()[0]["model"]
    assert robot_model["file_name"] == "robots/theseus.glb"
    assert robot_model["available_qualities"] == ["low"]
    assert int(robot_model["asset_version"]) > 0

    types_response = client.get("/api/robot-types")
    assert types_response.status_code == 200
    type_model = types_response.json()[0]["model"]
    assert type_model["file_name"] == "custom-type.glb"
    assert type_model["available_qualities"] == ["low", "high"]
    assert int(type_model["asset_version"]) > 0


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
    robot_models_root = tmp_path / "assets" / "models"
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
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robots/r1",
        data={
            "name": "Robot One Updated",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.11",
            "username": "u2",
            "password": "p2",
        },
        files={
            "lowModelFile": ("robot.glb", b"low-model", "model/gltf-binary"),
            "highModelFile": ("robot.glb", b"high-model", "model/gltf-binary"),
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["name"] == "Robot One Updated"
    assert updated["ip"] == "10.0.0.11"
    assert updated["ssh"]["username"] == "u2"
    assert updated["ssh"]["port"] == 2222
    assert updated["model"]["file_name"] == "robots/r1.glb"
    assert "modelUrl" not in updated
    payload = json.loads(robots_config_path.read_text(encoding="utf-8"))
    assert payload["robots"][0]["name"] == "Robot One Updated"
    assert payload["robots"][0]["ssh"]["port"] == 2222
    assert payload["robots"][0]["model"]["file_name"] == "robots/r1.glb"
    assert "modelUrl" not in payload["robots"][0]

    deleted = client.delete("/api/robots/r1")
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True
    assert client.get("/api/robots").json() == []


def test_create_robot_type_generates_id_from_name(tmp_path):
    robots_by_id: dict[str, dict[str, object]] = {}
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_models_root = tmp_path / "assets" / "models"
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
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robot-types",
        data={
            "name": "Rosbot 2 Pro V2",
            "batteryCommand": "echo battery state",
        },
        files={
            "lowModelFile": ("low.glb", b"low-model", "model/gltf-binary"),
            "highModelFile": ("high.glb", b"high-model", "model/gltf-binary"),
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["typeId"] == "rosbot-2-pro-v2"
    assert payload["testRefs"] == []
    assert payload["fixRefs"] == []
    assert payload["autoMonitor"] == {"batteryCommand": "echo battery state"}
    assert payload["model"]["file_name"] == "rosbot-2-pro-v2.glb"
    assert (robot_models_root / "LowRes" / "rosbot-2-pro-v2.glb").read_bytes() == b"low-model"
    assert (robot_models_root / "HighRes" / "rosbot-2-pro-v2.glb").read_bytes() == b"high-model"

    config_payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    ids = [entry.get("id") for entry in config_payload["robotTypes"]]
    assert "rosbot-2-pro-v2" in ids
    created_entry = next(entry for entry in config_payload["robotTypes"] if entry.get("id") == "rosbot-2-pro-v2")
    assert created_entry["model"]["file_name"] == "rosbot-2-pro-v2.glb"
    assert created_entry["autoMonitor"]["batteryCommand"] == "echo battery state"


def test_create_robot_type_requires_both_model_uploads(tmp_path):
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={},
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=tmp_path / "robot-types.config.json",
            robot_models_root=tmp_path / "assets" / "models",
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robot-types",
        data={
            "name": "Rosbot 4",
        },
        files={
            "lowModelFile": ("low.glb", b"low-model", "model/gltf-binary"),
        },
    )
    assert response.status_code == 400
    assert "High quality model file is required" in response.json().get("detail", "")


def test_update_and_delete_robot_type_persists_config(tmp_path):
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes").mkdir(parents=True)
    (robot_models_root / "HighRes").mkdir(parents=True)
    (robot_models_root / "LowRes" / "rosbot-2-pro.glb").write_bytes(b"low")
    (robot_models_root / "HighRes" / "rosbot-2-pro.glb").write_bytes(b"high")
    robot_types_config_path.write_text(
        json.dumps(
            {
                "version": "3.0",
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot 2 Pro",
                        "testRefs": ["online"],
                        "fixRefs": [],
                        "topics": ["/battery"],
                        "autoMonitor": {"batteryCommand": "echo initial battery"},
                        "model": {
                            "file_name": "rosbot-2-pro.glb",
                            "path_to_quality_folders": "assets/models",
                        },
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={
                "rosbot-2-pro": {
                    "typeId": "rosbot-2-pro",
                    "typeKey": "rosbot-2-pro",
                    "label": "Rosbot 2 Pro",
                    "topics": ["/battery"],
                    "testRefs": ["online"],
                    "fixRefs": [],
                    "tests": [{"id": "online"}],
                    "autoFixes": [],
                    "autoMonitor": {"batteryCommand": "echo initial battery"},
                    "model": {
                        "file_name": "rosbot-2-pro.glb",
                        "path_to_quality_folders": "assets/models",
                    },
                }
            },
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=robot_types_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    update_response = client.put(
        "/api/robot-types/rosbot-2-pro",
        data={
            "name": "Rosbot 2 Pro Updated",
            "batteryCommand": "echo updated battery",
        },
        files={
            "lowModelFile": ("low.glb", b"low-updated", "model/gltf-binary"),
        },
    )
    assert update_response.status_code == 200
    update_payload = update_response.json()
    assert update_payload["label"] == "Rosbot 2 Pro Updated"
    assert update_payload["topics"] == ["/battery"]
    assert update_payload["autoMonitor"] == {"batteryCommand": "echo updated battery"}
    assert (robot_models_root / "LowRes" / "rosbot-2-pro.glb").read_bytes() == b"low-updated"
    assert (robot_models_root / "HighRes" / "rosbot-2-pro.glb").read_bytes() == b"high"

    config_payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    assert config_payload["robotTypes"][0]["name"] == "Rosbot 2 Pro Updated"
    assert config_payload["robotTypes"][0]["topics"] == ["/battery"]
    assert config_payload["robotTypes"][0]["autoMonitor"]["batteryCommand"] == "echo updated battery"

    delete_response = client.delete("/api/robot-types/rosbot-2-pro")
    assert delete_response.status_code == 200
    assert delete_response.json()["ok"] is True
    config_payload_after_delete = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    assert config_payload_after_delete["robotTypes"] == []
    assert not (robot_models_root / "LowRes" / "rosbot-2-pro.glb").exists()
    assert not (robot_models_root / "HighRes" / "rosbot-2-pro.glb").exists()


def test_update_robot_type_can_clear_battery_command(tmp_path):
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes").mkdir(parents=True)
    (robot_models_root / "HighRes").mkdir(parents=True)
    (robot_models_root / "LowRes" / "rosbot-2-pro.glb").write_bytes(b"low")
    (robot_models_root / "HighRes" / "rosbot-2-pro.glb").write_bytes(b"high")
    robot_types_config_path.write_text(
        json.dumps(
            {
                "version": "3.0",
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot 2 Pro",
                        "testRefs": ["battery"],
                        "fixRefs": [],
                        "topics": ["/battery"],
                        "autoMonitor": {"batteryCommand": "echo initial battery"},
                        "model": {
                            "file_name": "rosbot-2-pro.glb",
                            "path_to_quality_folders": "assets/models",
                        },
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={
                "rosbot-2-pro": {
                    "typeId": "rosbot-2-pro",
                    "typeKey": "rosbot-2-pro",
                    "label": "Rosbot 2 Pro",
                    "topics": ["/battery"],
                    "testRefs": ["battery"],
                    "fixRefs": [],
                    "tests": [{"id": "battery"}],
                    "autoFixes": [],
                    "autoMonitor": {"batteryCommand": "echo initial battery"},
                    "model": {
                        "file_name": "rosbot-2-pro.glb",
                        "path_to_quality_folders": "assets/models",
                    },
                }
            },
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=robot_types_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robot-types/rosbot-2-pro",
        data={
            "name": "Rosbot 2 Pro",
            "batteryCommand": "",
        },
    )

    assert response.status_code == 200
    assert response.json()["autoMonitor"] == {}
    config_payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    assert "autoMonitor" not in config_payload["robotTypes"][0]


def test_update_robot_type_replacement_honors_existing_model_subpath(tmp_path):
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes" / "custom").mkdir(parents=True)
    (robot_models_root / "HighRes" / "custom").mkdir(parents=True)
    (robot_models_root / "LowRes" / "custom" / "rosbot-2-pro.glb").write_bytes(b"low")
    (robot_models_root / "HighRes" / "custom" / "rosbot-2-pro.glb").write_bytes(b"high")
    robot_types_config_path.write_text(
        json.dumps(
            {
                "version": "3.0",
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot 2 Pro",
                        "topics": [],
                        "model": {
                            "file_name": "rosbot-2-pro.glb",
                            "path_to_quality_folders": "assets/models/custom",
                        },
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={
                "rosbot-2-pro": {
                    "typeId": "rosbot-2-pro",
                    "typeKey": "rosbot-2-pro",
                    "label": "Rosbot 2 Pro",
                    "topics": [],
                    "testRefs": [],
                    "fixRefs": [],
                    "tests": [],
                    "autoFixes": [],
                    "autoMonitor": {},
                    "model": {
                        "file_name": "rosbot-2-pro.glb",
                        "path_to_quality_folders": "assets/models/custom",
                    },
                }
            },
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=robot_types_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robot-types/rosbot-2-pro",
        data={"name": "Rosbot 2 Pro"},
        files={"lowModelFile": ("low.glb", b"low-updated", "model/gltf-binary")},
    )

    assert response.status_code == 200
    assert (robot_models_root / "LowRes" / "custom" / "rosbot-2-pro.glb").read_bytes() == b"low-updated"
    assert (robot_models_root / "HighRes" / "custom" / "rosbot-2-pro.glb").read_bytes() == b"high"
    assert not (robot_models_root / "LowRes" / "rosbot-2-pro.glb").exists()
    assert response.json()["model"]["path_to_quality_folders"] == "assets/models/custom"


def test_update_robot_type_can_clear_existing_model_and_delete_subpath_assets(tmp_path):
    robot_types_config_path = tmp_path / "robot-types.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes" / "custom").mkdir(parents=True)
    (robot_models_root / "HighRes" / "custom").mkdir(parents=True)
    (robot_models_root / "LowRes" / "custom" / "rosbot-2-pro.glb").write_bytes(b"low")
    (robot_models_root / "HighRes" / "custom" / "rosbot-2-pro.glb").write_bytes(b"high")
    robot_types_config_path.write_text(
        json.dumps(
            {
                "version": "3.0",
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot 2 Pro",
                        "topics": [],
                        "model": {
                            "file_name": "rosbot-2-pro.glb",
                            "path_to_quality_folders": "assets/models/custom",
                        },
                    }
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id={},
            robot_types_by_id={
                "rosbot-2-pro": {
                    "typeId": "rosbot-2-pro",
                    "typeKey": "rosbot-2-pro",
                    "label": "Rosbot 2 Pro",
                    "topics": [],
                    "testRefs": [],
                    "fixRefs": [],
                    "tests": [],
                    "autoFixes": [],
                    "autoMonitor": {},
                    "model": {
                        "file_name": "rosbot-2-pro.glb",
                        "path_to_quality_folders": "assets/models/custom",
                    },
                }
            },
            robots_config_path=tmp_path / "robots.config.json",
            robot_types_config_path=robot_types_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robot-types/rosbot-2-pro",
        data={
            "name": "Rosbot 2 Pro",
            "clearModel": "true",
        },
    )

    assert response.status_code == 200
    assert response.json()["model"] is None
    config_payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
    assert "model" not in config_payload["robotTypes"][0]
    assert not (robot_models_root / "LowRes" / "custom" / "rosbot-2-pro.glb").exists()
    assert not (robot_models_root / "HighRes" / "custom" / "rosbot-2-pro.glb").exists()


def test_create_robot_accepts_model_override_payload(tmp_path):
    robots_config_path = tmp_path / "robots.config.json"
    robot_models_root = tmp_path / "assets" / "models"
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
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.post(
        "/api/robots",
        data={
            "name": "Robot Created",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.22",
            "username": "u",
            "password": "p",
        },
        files={
            "lowModelFile": ("custom.glb", b"low-model", "model/gltf-binary"),
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["model"]["file_name"] == "robots/robot-created.glb"
    assert "modelUrl" not in created

    config_payload = json.loads(robots_config_path.read_text(encoding="utf-8"))
    assert config_payload["robots"][0]["model"]["file_name"] == "robots/robot-created.glb"


def test_create_and_update_robot_override_uploads_are_robot_specific(tmp_path):
    robots_config_path = tmp_path / "robots.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes").mkdir(parents=True)
    (robot_models_root / "HighRes").mkdir(parents=True)
    (robot_models_root / "LowRes" / "rosbot-2-pro.glb").write_bytes(b"class-low")
    (robot_models_root / "HighRes" / "rosbot-2-pro.glb").write_bytes(b"class-high")

    robots_by_id = {
        "robot-one": {
            "id": "robot-one",
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
            "model": {"file_name": "rosbot-2-pro.glb", "path_to_quality_folders": "assets/models"},
        }
    }

    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=robots_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    create_response = client.post(
        "/api/robots",
        data={
            "name": "Robot Created",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.22",
            "username": "u",
            "password": "p",
        },
        files={
            "lowModelFile": ("low.glb", b"robot-low", "model/gltf-binary"),
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["model"]["file_name"] == "robots/robot-created.glb"
    assert (robot_models_root / "LowRes" / "robots" / "robot-created.glb").read_bytes() == b"robot-low"
    assert not (robot_models_root / "HighRes" / "robots" / "robot-created.glb").exists()
    assert (robot_models_root / "LowRes" / "rosbot-2-pro.glb").read_bytes() == b"class-low"
    assert (robot_models_root / "HighRes" / "rosbot-2-pro.glb").read_bytes() == b"class-high"


def test_update_robot_can_clear_existing_override_and_revert_to_class_model(tmp_path):
    robots_config_path = tmp_path / "robots.config.json"
    robot_models_root = tmp_path / "assets" / "models"
    (robot_models_root / "LowRes" / "robots").mkdir(parents=True)
    (robot_models_root / "HighRes" / "robots").mkdir(parents=True)
    (robot_models_root / "LowRes" / "rosbot-2-pro.glb").write_bytes(b"class-low")
    (robot_models_root / "HighRes" / "rosbot-2-pro.glb").write_bytes(b"class-high")
    (robot_models_root / "LowRes" / "robots" / "robot-one.glb").write_bytes(b"override-low")
    (robot_models_root / "HighRes" / "robots" / "robot-one.glb").write_bytes(b"override-high")

    robots_by_id = {
        "robot-one": {
            "id": "robot-one",
            "name": "Robot One",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.1",
            "ssh": {"username": "u", "password": "p", "port": 2222},
            "model": {"file_name": "robots/robot-one.glb"},
        }
    }
    robot_types_by_id = {
        "rosbot-2-pro": {
            "typeId": "rosbot-2-pro",
            "tests": [],
            "model": {"file_name": "rosbot-2-pro.glb", "path_to_quality_folders": "assets/models"},
        }
    }

    app = FastAPI()
    app.include_router(
        create_robots_router(
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            robots_config_path=robots_config_path,
            robot_models_root=robot_models_root,
        )
    )
    client = TestClient(app)

    response = client.put(
        "/api/robots/robot-one",
        data={
            "name": "Robot One",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.1",
            "username": "u",
            "password": "p",
            "clearModelOverride": "true",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] is None
    assert "model" not in json.loads(robots_config_path.read_text(encoding="utf-8"))["robots"][0]
    assert not (robot_models_root / "LowRes" / "robots" / "robot-one.glb").exists()
    assert not (robot_models_root / "HighRes" / "robots" / "robot-one.glb").exists()
    assert (robot_models_root / "LowRes" / "rosbot-2-pro.glb").read_bytes() == b"class-low"
    assert (robot_models_root / "HighRes" / "rosbot-2-pro.glb").read_bytes() == b"class-high"

    update_response = client.put(
        "/api/robots/robot-one",
        data={
            "name": "Robot One Updated",
            "type": "rosbot-2-pro",
            "ip": "10.0.0.11",
            "username": "u2",
            "password": "p2",
        },
        files={
            "highModelFile": ("high.glb", b"robot-high", "model/gltf-binary"),
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["model"]["file_name"] == "robots/robot-one.glb"
    assert (robot_models_root / "HighRes" / "robots" / "robot-one.glb").read_bytes() == b"robot-high"
    assert not (robot_models_root / "LowRes" / "robots" / "robot-one.glb").exists()
    assert (robot_models_root / "LowRes" / "rosbot-2-pro.glb").read_bytes() == b"class-low"
    assert (robot_models_root / "HighRes" / "rosbot-2-pro.glb").read_bytes() == b"class-high"
