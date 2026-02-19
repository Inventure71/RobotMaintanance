from __future__ import annotations

import json

from backend.config_loader import (
    RobotCatalog,
    load_robot_types_config,
    load_robots_config,
    normalize_robot_types,
)


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


def test_normalize_robot_types_uses_lower_type_key():
    raw_types = [{"id": "ROSBOT-2-PRO", "name": "Rosbot 2 Pro", "tests": [{"id": "online"}]}]
    normalized = normalize_robot_types(raw_types)
    assert "rosbot-2-pro" in normalized
    assert normalized["rosbot-2-pro"]["typeId"] == "ROSBOT-2-PRO"


def test_normalize_robot_types_keeps_auto_monitor_battery_command():
    raw_types = [
        {
            "id": "rosbot-2-pro",
            "name": "Rosbot 2 Pro",
            "autoMonitor": {"batteryCommand": "custom battery command"},
        }
    ]
    normalized = normalize_robot_types(raw_types)
    assert normalized["rosbot-2-pro"]["autoMonitor"]["batteryCommand"] == "custom battery command"


def test_normalize_robot_types_keeps_auto_fixes():
    raw_types = [
        {
            "id": "rosbot-2-pro",
            "name": "Rosbot 2 Pro",
            "autoFixes": [
                {
                    "id": "restart_navigation",
                    "label": "Restart navigation stack",
                    "description": "Restarts mapping services",
                    "commands": ["sudo systemctl restart navigation"],
                    "testIds": ["online", "movement"],
                }
            ],
        }
    ]
    normalized = normalize_robot_types(raw_types)
    auto_fixes = normalized["rosbot-2-pro"]["autoFixes"]
    assert len(auto_fixes) == 1
    assert auto_fixes[0]["id"] == "restart_navigation"
    assert auto_fixes[0]["commands"] == ["sudo systemctl restart navigation"]
    assert auto_fixes[0]["testIds"] == ["online", "movement"]


def test_normalize_robot_types_warns_on_duplicate_test_ids(caplog):
    raw_types = [
        {
            "id": "rosbot-2-pro",
            "name": "Rosbot 2 Pro",
            "tests": [
                {"id": "online", "enabled": True},
                {"id": "online", "enabled": False},
                {"id": "battery", "enabled": True},
            ],
        }
    ]
    with caplog.at_level("WARNING"):
        normalized = normalize_robot_types(raw_types)

    tests = normalized["rosbot-2-pro"]["tests"]
    assert [test["id"] for test in tests] == ["online", "battery"]
    assert any("duplicate test IDs" in record.message for record in caplog.records)


def test_robot_catalog_load_from_paths_builds_indexes(tmp_path):
    robots_path = tmp_path / "robots.json"
    types_path = tmp_path / "types.json"

    robots_path.write_text(
        json.dumps({"robots": [{"id": "r1", "name": "A", "type": "rosbot-2-pro"}]}),
        encoding="utf-8",
    )
    types_path.write_text(
        json.dumps({"robotTypes": [{"id": "rosbot-2-pro", "name": "Rosbot"}]}),
        encoding="utf-8",
    )

    catalog = RobotCatalog.load_from_paths(robots_path=robots_path, robot_types_path=types_path)
    assert "r1" in catalog.robots_by_id
    assert "rosbot-2-pro" in catalog.robot_types_by_id
