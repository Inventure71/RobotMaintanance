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
                        "runAtConnection": True,
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
                        "runAtConnection": True,
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
            "description": "Capture camera topics for operator review.",
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
                        "runAtConnection": True,
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
    saved = json.loads((tmp_path / "tests" / "camera_snapshot.test.json").read_text(encoding="utf-8"))
    assert saved["description"] == "Capture camera topics for operator review."

    summary = client.get("/api/definitions/summary")
    assert summary.status_code == 200
    checks = summary.json().get("checks", [])
    assert any(item.get("id") == "camera" for item in checks)
    tests = summary.json().get("tests", [])
    saved_test = next(item for item in tests if item.get("id") == "camera_snapshot")
    assert saved_test["description"] == "Capture camera topics for operator review."


def test_create_fix_definition_persists_run_at_connection(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    response = client.post(
        "/api/definitions/fixes",
        json={
            "id": "quick_fix",
            "label": "Quick Fix",
            "description": "Quick repair",
            "enabled": True,
            "runAtConnection": True,
            "execute": [{"id": "repair", "command": "echo repair"}],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["id"] == "quick_fix"

    saved = json.loads((tmp_path / "fixes" / "quick_fix.fix.json").read_text(encoding="utf-8"))
    assert saved["runAtConnection"] is True

    summary = client.get("/api/definitions/summary")
    assert summary.status_code == 200
    fixes = summary.json().get("fixes", [])
    saved_fix = next(item for item in fixes if item.get("id") == "quick_fix")
    assert saved_fix["runAtConnection"] is True


def test_definition_routes_normalize_owner_and_platform_tags(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    test_response = client.post(
        "/api/definitions/tests",
        json={
            "id": "tagged_snapshot",
            "label": "Tagged Snapshot",
            "description": "Tagged test definition",
            "enabled": True,
            "mode": "orchestrate",
            "ownerTags": [" GLOBAL ", "Alice", "alice"],
            "platformTags": [" ROS2 ", "Interbotix", "ros2"],
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "tagged_camera",
                    "label": "Camera",
                    "icon": "📷",
                    "manualOnly": True,
                    "runAtConnection": True,
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
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    )
    assert test_response.status_code == 200

    fix_response = client.post(
        "/api/definitions/fixes",
        json={
            "id": "tagged_fix",
            "label": "Tagged Fix",
            "description": "Tagged fix definition",
            "enabled": True,
            "ownerTags": [" GLOBAL ", "bob", "Bob"],
            "platformTags": [" ROS1 ", "ros1"],
            "runAtConnection": False,
            "execute": [{"id": "repair", "command": "echo repair"}],
        },
    )
    assert fix_response.status_code == 200

    saved_test = json.loads((tmp_path / "tests" / "tagged_snapshot.test.json").read_text(encoding="utf-8"))
    assert saved_test["ownerTags"] == ["global", "alice"]
    assert saved_test["platformTags"] == ["ros2", "interbotix"]

    saved_fix = json.loads((tmp_path / "fixes" / "tagged_fix.fix.json").read_text(encoding="utf-8"))
    assert saved_fix["ownerTags"] == ["global", "bob"]
    assert saved_fix["platformTags"] == ["ros1"]

    summary_response = client.get("/api/definitions/summary")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    summary_test = next(item for item in summary.get("tests", []) if item.get("id") == "tagged_snapshot")
    assert summary_test["ownerTags"] == ["global", "alice"]
    assert summary_test["platformTags"] == ["ros2", "interbotix"]
    summary_fix = next(item for item in summary.get("fixes", []) if item.get("id") == "tagged_fix")
    assert summary_fix["ownerTags"] == ["global", "bob"]
    assert summary_fix["platformTags"] == ["ros1"]

def test_create_test_definition_accepts_all_of_read_kind(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    response = client.post(
        "/api/definitions/tests",
        json={
            "id": "topics_multi_output",
            "label": "Topics Multi Output",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "topics_multi_output__general",
                    "label": "General",
                    "icon": "📡",
                    "manualOnly": True,
                        "runAtConnection": True,
                    "enabled": True,
                    "defaultStatus": "warning",
                    "defaultValue": "unknown",
                    "defaultDetails": "Not checked yet",
                    "read": {
                        "kind": "all_of",
                        "rules": [
                            {
                                "kind": "contains_lines_unordered",
                                "inputRef": "topics_raw",
                                "lines": ["/battery"],
                                "requireAll": True,
                            },
                            {
                                "kind": "contains_string",
                                "inputRef": "topics_raw",
                                "needle": "/camera",
                                "caseSensitive": False,
                            },
                        ],
                    },
                    "pass": {"status": "ok", "value": "all_present", "details": "All checks passed"},
                    "fail": {"status": "error", "value": "missing", "details": "One or more checks failed"},
                }
            ],
        },
    )

    assert response.status_code == 200
    saved = json.loads((tmp_path / "tests" / "topics_multi_output.test.json").read_text(encoding="utf-8"))
    assert saved["checks"][0]["read"]["kind"] == "all_of"
    assert isinstance(saved["checks"][0]["read"]["rules"], list)
    assert len(saved["checks"][0]["read"]["rules"]) == 2


def test_create_test_definition_rejects_mixed_run_at_connection_values(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    response = client.post(
        "/api/definitions/tests",
        json={
            "id": "mixed_run_mode",
            "label": "Mixed Run Mode",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "mixed_run_mode__a",
                    "label": "A",
                    "runAtConnection": True,
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "topics_raw",
                        "needle": "/battery",
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                },
                {
                    "id": "mixed_run_mode__b",
                    "label": "B",
                    "runAtConnection": False,
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "topics_raw",
                        "needle": "/camera",
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                },
            ],
        },
    )
    assert response.status_code == 400
    assert "same runAtConnection value" in response.json().get("detail", "")


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
                    "runAtConnection": True,
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
                    "runAtConnection": True,
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
                    "runAtConnection": True,
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


def test_update_test_mappings_uses_check_ids_and_supports_unmap(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    create_response = client.post(
        "/api/definitions/tests",
        json={
            "id": "camera_snapshot_v2",
            "label": "Camera Snapshot V2",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "camera_snapshot_v2__camera",
                    "label": "Camera",
                    "runAtConnection": True,
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "topics_raw",
                        "needle": "/camera",
                        "caseSensitive": False,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    )
    assert create_response.status_code == 200

    map_response = client.put(
        "/api/definitions/tests/camera_snapshot_v2/mappings",
        json={"robotTypeIds": ["rosbot-lite"]},
    )
    assert map_response.status_code == 200
    summary = map_response.json().get("summary", {})
    robot_types = summary.get("robotTypes", [])
    lite_type = next(item for item in robot_types if item.get("id") == "rosbot-lite")
    assert "camera_snapshot_v2__camera" in lite_type.get("testRefs", [])
    assert "camera_snapshot_v2" not in lite_type.get("testRefs", [])

    unmap_response = client.put(
        "/api/definitions/tests/camera_snapshot_v2/mappings",
        json={"robotTypeIds": []},
    )
    assert unmap_response.status_code == 200
    summary = unmap_response.json().get("summary", {})
    robot_types = summary.get("robotTypes", [])
    lite_type = next(item for item in robot_types if item.get("id") == "rosbot-lite")
    assert "camera_snapshot_v2__camera" not in lite_type.get("testRefs", [])
    assert "camera_snapshot_v2" not in lite_type.get("testRefs", [])


def test_delete_test_removes_mapped_check_refs(tmp_path: Path):
    client, _ = _build_client(tmp_path)
    create_response = client.post(
        "/api/definitions/tests",
        json={
            "id": "delete_probe",
            "label": "Delete Probe",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "delete_probe__camera",
                    "label": "Camera",
                    "runAtConnection": True,
                    "read": {
                        "kind": "contains_string",
                        "inputRef": "topics_raw",
                        "needle": "/camera",
                        "caseSensitive": False,
                    },
                    "pass": {"status": "ok", "value": "present", "details": "found"},
                    "fail": {"status": "error", "value": "missing", "details": "missing"},
                }
            ],
        },
    )
    assert create_response.status_code == 200

    map_response = client.put(
        "/api/definitions/tests/delete_probe/mappings",
        json={"robotTypeIds": ["rosbot-2-pro"]},
    )
    assert map_response.status_code == 200
    mapped_refs = next(
        item for item in map_response.json().get("summary", {}).get("robotTypes", [])
        if item.get("id") == "rosbot-2-pro"
    ).get("testRefs", [])
    assert "delete_probe__camera" in mapped_refs

    delete_response = client.delete("/api/definitions/tests/delete_probe")
    assert delete_response.status_code == 200
    summary = delete_response.json().get("summary", {})
    robot_types = summary.get("robotTypes", [])
    rosbot_type = next(item for item in robot_types if item.get("id") == "rosbot-2-pro")
    assert "delete_probe__camera" not in rosbot_type.get("testRefs", [])
    assert all(not ref.startswith("delete_probe__") for ref in rosbot_type.get("testRefs", []))


def test_upsert_test_supports_renaming_definition_and_checks_with_reference_rewrites(tmp_path: Path):
    client, robot_types_path = _build_client(tmp_path)

    response = client.post(
        "/api/definitions/tests",
        json={
            "id": "topics_snapshot_v2",
            "previousId": "topics_snapshot",
            "label": "Topics Snapshot V2",
            "enabled": True,
            "mode": "orchestrate",
            "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
            "checks": [
                {
                    "id": "battery_health",
                    "label": "Battery Health",
                    "runAtConnection": True,
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

    assert response.status_code == 200
    assert not (tmp_path / "tests" / "topics_snapshot.test.json").exists()
    assert (tmp_path / "tests" / "topics_snapshot_v2.test.json").exists()

    robot_types_payload = json.loads(robot_types_path.read_text(encoding="utf-8"))
    rosbot_type = next(item for item in robot_types_payload["robotTypes"] if item.get("id") == "rosbot-2-pro")
    assert "battery_health" in rosbot_type["testRefs"]
    assert "battery" not in rosbot_type["testRefs"]

    summary = response.json().get("summary", {})
    assert any(item.get("id") == "topics_snapshot_v2" for item in summary.get("tests", []))
    assert not any(item.get("id") == "topics_snapshot" for item in summary.get("tests", []))


def test_upsert_fix_supports_renaming_and_preserves_robot_type_mappings(tmp_path: Path):
    client, robot_types_path = _build_client(tmp_path)

    response = client.post(
        "/api/definitions/fixes",
        json={
            "id": "flash_fix_v2",
            "previousId": "flash_fix",
            "label": "Flash fix v2",
            "description": "Renamed flash fix",
            "enabled": True,
            "runAtConnection": False,
            "execute": [{"id": "noop", "command": "echo flash"}],
        },
    )

    assert response.status_code == 200
    assert not (tmp_path / "fixes" / "flash_fix.fix.json").exists()
    assert (tmp_path / "fixes" / "flash_fix_v2.fix.json").exists()

    robot_types_payload = json.loads(robot_types_path.read_text(encoding="utf-8"))
    rosbot_type = next(item for item in robot_types_payload["robotTypes"] if item.get("id") == "rosbot-2-pro")
    assert "flash_fix_v2" in rosbot_type["fixRefs"]
    assert "flash_fix" not in rosbot_type["fixRefs"]
