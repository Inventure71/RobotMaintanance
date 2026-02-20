from __future__ import annotations

import json

import pytest

from backend.config_loader import (
    RobotCatalog,
    load_robot_types_config,
    load_robots_config,
    normalize_robot_types,
)
from backend.definition_loader import load_definition_catalog


def test_load_robots_config_missing_file_returns_empty_list(tmp_path):
    missing = tmp_path / "does-not-exist.json"
    assert load_robots_config(missing) == []


def test_load_robots_config_accepts_array_shape(tmp_path):
    path = tmp_path / "robots.json"
    path.write_text(json.dumps([{"id": "r1", "name": "R1"}]), encoding="utf-8")
    payload = load_robots_config(path)
    assert payload == [{"id": "r1", "name": "R1"}]


def test_load_robot_types_config_ignores_invalid_shape(tmp_path):
    path = tmp_path / "robot-types.json"
    path.write_text(json.dumps({"version": "1.0", "items": []}), encoding="utf-8")
    assert load_robot_types_config(path) == []


def test_load_definition_catalog_supports_directory_shape(tmp_path):
    commands_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"
    commands_dir.mkdir()
    tests_dir.mkdir()
    fixes_dir.mkdir()

    (commands_dir / "rostopic.command.json").write_text(
        json.dumps({"id": "rostopic_list", "command": "timeout 12s rostopic list"}),
        encoding="utf-8",
    )
    (tests_dir / "topics.test.json").write_text(
        json.dumps(
            {
                "id": "topics_snapshot",
                "execute": [{"id": "topics", "command": "$rostopic_list$", "saveAs": "topics_raw"}],
                "checks": [
                    {
                        "id": "battery",
                        "read": {
                            "kind": "contains_lines_unordered",
                            "inputRef": "topics_raw",
                            "lines": ["/battery"],
                            "requireAll": True,
                        },
                        "pass": {"status": "ok", "value": "all_present", "details": "ok"},
                        "fail": {"status": "error", "value": "missing", "details": "missing"},
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    (fixes_dir / "flash.fix.json").write_text(
        json.dumps(
            {
                "id": "flash_fix",
                "execute": [{"id": "down", "command": "echo down"}],
                "postTestIds": ["battery"],
            }
        ),
        encoding="utf-8",
    )

    catalog = load_definition_catalog(
        command_primitives_dir=commands_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )
    assert "rostopic_list" in catalog.command_primitives_by_id
    assert "topics_snapshot" in catalog.test_definitions_by_id
    assert "battery" in catalog.check_definitions_by_id
    assert "flash_fix" in catalog.fix_definitions_by_id


def test_normalize_robot_types_uses_lower_type_key_and_resolves_refs():
    raw_types = [
        {
            "id": "ROSBOT-2-PRO",
            "name": "Rosbot 2 Pro",
            "testRefs": ["online"],
            "fixRefs": ["flash_fix"],
            "testOverrides": {"online": {"enabled": True}},
        }
    ]
    test_definitions = {
        "online_probe": {"id": "online_probe", "mode": "online_probe", "checks": [{"id": "online"}]}
    }
    check_definitions = {
        "online": {
            "id": "online",
            "definitionId": "online_probe",
            "label": "Online",
            "defaultStatus": "warning",
            "defaultValue": "unknown",
            "defaultDetails": "Not checked yet",
            "manualOnly": True,
            "enabled": True,
        }
    }
    fix_definitions = {
        "flash_fix": {
            "id": "flash_fix",
            "label": "Flash fix",
            "description": "desc",
            "enabled": True,
            "execute": [{"id": "down", "command": "echo down"}],
            "postTestIds": ["online"],
            "params": {},
        }
    }

    normalized = normalize_robot_types(raw_types, test_definitions, check_definitions, fix_definitions)
    assert "rosbot-2-pro" in normalized
    assert normalized["rosbot-2-pro"]["typeId"] == "ROSBOT-2-PRO"
    assert [item["id"] for item in normalized["rosbot-2-pro"]["tests"]] == ["online"]
    assert [item["id"] for item in normalized["rosbot-2-pro"]["autoFixes"]] == ["flash_fix"]


def test_normalize_robot_types_keeps_auto_monitor_battery_command():
    raw_types = [
        {
            "id": "rosbot-2-pro",
            "name": "Rosbot 2 Pro",
            "testRefs": ["online"],
            "fixRefs": [],
            "autoMonitor": {"batteryCommand": "custom battery command"},
        }
    ]
    test_definitions = {
        "online_probe": {"id": "online_probe", "mode": "online_probe", "checks": [{"id": "online"}]}
    }
    check_definitions = {
        "online": {
            "id": "online",
            "definitionId": "online_probe",
            "label": "Online",
            "defaultStatus": "warning",
            "defaultValue": "unknown",
            "defaultDetails": "Not checked yet",
            "manualOnly": True,
            "enabled": True,
        }
    }
    normalized = normalize_robot_types(raw_types, test_definitions, check_definitions, {})
    assert normalized["rosbot-2-pro"]["autoMonitor"]["batteryCommand"] == "custom battery command"


def test_normalize_robot_types_raises_on_unknown_references():
    raw_types = [
        {
            "id": "rosbot-2-pro",
            "name": "Rosbot",
            "testRefs": ["missing_test"],
        }
    ]
    with pytest.raises(ValueError):
        normalize_robot_types(raw_types, {}, {}, {})


def test_robot_catalog_load_from_paths_builds_indexes(tmp_path):
    robots_path = tmp_path / "robots.json"
    types_path = tmp_path / "types.json"
    commands_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"
    commands_dir.mkdir()
    tests_dir.mkdir()
    fixes_dir.mkdir()

    robots_path.write_text(
        json.dumps({"robots": [{"id": "r1", "name": "A", "type": "rosbot-2-pro"}]}),
        encoding="utf-8",
    )
    types_path.write_text(
        json.dumps(
            {
                "robotTypes": [
                    {
                        "id": "rosbot-2-pro",
                        "name": "Rosbot",
                        "testRefs": ["online"],
                        "fixRefs": ["flash_fix"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    (commands_dir / "noop.command.json").write_text(
        json.dumps({"id": "noop", "command": "echo noop"}),
        encoding="utf-8",
    )
    (tests_dir / "online.test.json").write_text(
        json.dumps(
            {
                "id": "online_probe",
                "mode": "online_probe",
                "checks": [
                    {
                        "id": "online",
                        "metadata": {
                            "label": "Online",
                            "defaultStatus": "warning",
                            "defaultValue": "unknown",
                            "defaultDetails": "Not checked yet",
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    (fixes_dir / "flash.fix.json").write_text(
        json.dumps(
            {
                "id": "flash_fix",
                "label": "Flash fix",
                "execute": [{"id": "noop", "command": "$noop$"}],
            }
        ),
        encoding="utf-8",
    )

    catalog = RobotCatalog.load_from_paths(
        robots_path=robots_path,
        robot_types_path=types_path,
        command_primitives_dir=commands_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )
    assert "r1" in catalog.robots_by_id
    assert "rosbot-2-pro" in catalog.robot_types_by_id
    assert "online" in catalog.test_catalog_by_id
    assert "flash_fix" in catalog.fix_catalog_by_id
