from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.config_loader import RobotCatalog
from backend.definition_service import DefinitionService
from backend.routers.definitions import create_definitions_router
from backend.routers.tests import create_tests_router
from backend.terminal_manager import TerminalManager


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _build_client(tmp_path: Path) -> tuple[TestClient, Path]:
    robots_path = tmp_path / "robots.config.json"
    robot_types_path = tmp_path / "robot-types.config.json"
    commands_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"

    _write_json(
        robots_path,
        {
            "version": "1.0",
            "robots": [
                {
                    "id": "r1",
                    "name": "Robot One",
                    "type": "rosbot-2-pro",
                    "ip": "127.0.0.1",
                    "ssh": {"username": "robot", "password": "secret"},
                }
            ],
        },
    )
    _write_json(
        robot_types_path,
        {
            "version": "3.0",
            "robotTypes": [
                {
                    "id": "rosbot-2-pro",
                    "name": "Rosbot 2 Pro",
                    "testRefs": ["online", "battery"],
                    "fixRefs": ["flash_fix"],
                },
                {
                    "id": "rosbot-lite",
                    "name": "Rosbot Lite",
                    "testRefs": ["online"],
                    "fixRefs": [],
                },
            ],
        },
    )
    _write_json(
        commands_dir / "rostopic_list.command.json",
        {
            "id": "rostopic_list",
            "command": "printf '/battery\\n/camera\\n'",
            "description": "Topic snapshot",
        },
    )
    _write_json(
        tests_dir / "online_probe.test.json",
        {
            "id": "online_probe",
            "label": "Online Probe",
            "mode": "online_probe",
            "checks": [
                {
                    "id": "online",
                    "metadata": {
                        "label": "Online",
                        "icon": "🛰️",
                        "manualOnly": True,
                        "defaultStatus": "warning",
                        "defaultValue": "unknown",
                        "defaultDetails": "Not checked yet",
                    },
                }
            ],
        },
    )
    _write_json(
        tests_dir / "topics_snapshot.test.json",
        {
            "id": "topics_snapshot",
            "label": "Topics Snapshot",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "battery",
                    "metadata": {
                        "label": "Battery",
                        "icon": "🔋",
                        "manualOnly": True,
                        "defaultStatus": "warning",
                        "defaultValue": "unknown",
                        "defaultDetails": "Not checked yet",
                    },
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/battery"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "Battery found"},
                    "fail": {"status": "error", "value": "missing", "details": "Battery missing"},
                }
            ],
        },
    )
    _write_json(
        fixes_dir / "flash_fix.fix.json",
        {
            "id": "flash_fix",
            "label": "Flash fix",
            "execute": [{"id": "noop", "command": "echo flash"}],
            "postTestIds": ["battery"],
        },
    )

    catalog = RobotCatalog.load_from_paths(
        robots_path=robots_path,
        robot_types_path=robot_types_path,
        command_primitives_dir=commands_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )
    terminal_manager = TerminalManager(
        robots_by_id=catalog.robots_by_id,
        robot_types_by_id=catalog.robot_types_by_id,
        command_primitives_by_id=catalog.command_primitives_by_id,
        test_definitions_by_id=catalog.test_definitions_by_id,
        check_definitions_by_id=catalog.check_definitions_by_id,
        fix_definitions_by_id=catalog.fix_definitions_by_id,
        auto_monitor=False,
    )
    definition_service = DefinitionService(
        terminal_manager=terminal_manager,
        robots_config_path=robots_path,
        robot_types_config_path=robot_types_path,
        command_primitives_dir=commands_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )

    app = FastAPI()
    app.include_router(create_definitions_router(definition_service))
    app.include_router(create_tests_router(terminal_manager))
    return TestClient(app), robot_types_path


def test_create_test_definition_writes_file_and_reloads(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    response = client.post(
        "/api/definitions/tests",
        json={
            "id": "camera_snapshot",
            "label": "Camera Snapshot",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [
                {"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"},
            ],
            "checks": [
                {
                    "id": "camera",
                    "label": "Camera",
                    "icon": "📷",
                    "manualOnly": True,
                    "enabled": True,
                    "defaultStatus": "warning",
                    "defaultValue": "unknown",
                    "defaultDetails": "Not checked yet",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/camera"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "Camera topics found"},
                    "fail": {"status": "error", "value": "missing", "details": "Camera topics missing"},
                }
            ],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["id"] == "camera_snapshot"
    assert (tmp_path / "tests" / "camera_snapshot.test.json").exists()

    summary = client.get("/api/definitions/summary")
    assert summary.status_code == 200
    checks = summary.json().get("checks", [])
    assert any(item.get("id") == "camera" for item in checks)


def test_create_test_rejects_duplicate_global_check_id(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    response = client.post(
        "/api/definitions/tests",
        json={
            "id": "duplicate_check_test",
            "label": "Duplicate",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "battery",
                    "label": "Battery Duplicate",
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "topics_raw",
                        "needle": "/battery",
                        "caseSensitive": False,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    )
    assert response.status_code == 400
    assert "globally unique" in response.json()["detail"]


def test_patch_robot_type_mapping_updates_only_target_type(tmp_path: Path):
    client, robot_types_path = _build_client(tmp_path)
    create_response = client.post(
        "/api/definitions/tests",
        json={
            "id": "camera_snapshot",
            "label": "Camera Snapshot",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "camera",
                    "label": "Camera",
                    "read": {
                        "kind": "contains_lines_unordered",
                        "inputRef": "topics_raw",
                        "lines": ["/camera"],
                        "requireAll": True,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    )
    assert create_response.status_code == 200

    response = client.patch(
        "/api/robot-types/rosbot-2-pro/mappings",
        json={
            "testRefs": ["online", "battery", "camera"],
            "fixRefs": ["flash_fix"],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["typeId"] == "rosbot-2-pro"
    assert payload["testRefs"] == ["online", "battery", "camera"]

    robot_types_payload = json.loads(robot_types_path.read_text(encoding="utf-8"))
    type_rows = robot_types_payload.get("robotTypes", [])
    target = next(item for item in type_rows if item.get("id") == "rosbot-2-pro")
    untouched = next(item for item in type_rows if item.get("id") == "rosbot-lite")
    assert target.get("testRefs") == ["online", "battery", "camera"]
    assert untouched.get("testRefs") == ["online"]


def test_publish_and_mapping_make_test_immediately_runnable(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    create_response = client.post(
        "/api/definitions/tests",
        json={
            "id": "quick_ping",
            "label": "Quick Ping",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "ping", "command": "echo pong", "saveAs": "ping_raw"}],
            "checks": [
                {
                    "id": "ping_check",
                    "label": "Ping Check",
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "ping_raw",
                        "needle": "pong",
                        "caseSensitive": False,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "pong found"},
                    "fail": {"status": "error", "value": "missing", "details": "pong missing"},
                }
            ],
        },
    )
    assert create_response.status_code == 200

    map_response = client.patch(
        "/api/robot-types/rosbot-2-pro/mappings",
        json={
            "testRefs": ["online", "battery", "ping_check"],
            "fixRefs": ["flash_fix"],
        },
    )
    assert map_response.status_code == 200

    run_response = client.post(
        "/api/robots/r1/tests/run",
        json={"pageSessionId": "p1", "testIds": ["ping_check"], "dryRun": True},
    )
    assert run_response.status_code == 200
    results = run_response.json().get("results", [])
    assert len(results) == 1
    assert results[0]["id"] == "ping_check"
