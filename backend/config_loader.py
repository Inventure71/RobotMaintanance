from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .normalization import normalize_text, normalize_type_key

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROBOTS_CONFIG_PATH = PROJECT_ROOT / "config" / "robots.config.json"
DEFAULT_ROBOT_TYPES_CONFIG_PATH = PROJECT_ROOT / "config" / "robot-types.config.json"
TEST_DEFINITIONS_DIR = PROJECT_ROOT / "tests"
LOGGER = logging.getLogger(__name__)


def load_json_file(path: Path) -> Any:
    payload = path.read_text(encoding="utf-8")
    return json.loads(payload)


def load_robots_config(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    payload = load_json_file(path)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        if isinstance(payload.get("robots"), list):
            return payload["robots"]
        if isinstance(payload.get("fleet"), list):
            return payload["fleet"]
    return []


def load_robot_types_config(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    payload = load_json_file(path)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("robotTypes"), list):
        return payload["robotTypes"]
    return []


def normalize_robot_types(raw_types: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_type_id: dict[str, dict[str, Any]] = {}
    for raw in raw_types:
        if not isinstance(raw, dict):
            continue
        type_id = normalize_text(raw.get("id") or raw.get("name"), "")
        if not type_id:
            continue

        topics = [
            normalize_text(topic, "")
            for topic in (raw.get("topics") or [])
            if normalize_text(topic, "")
        ]
        tests: list[dict[str, Any]] = []
        seen_test_ids: set[str] = set()
        duplicate_test_ids: set[str] = set()
        for test in (raw.get("tests") or []):
            if not isinstance(test, dict):
                continue
            test_id = normalize_text(test.get("id"), "")
            if not test_id:
                continue
            if test_id in seen_test_ids:
                duplicate_test_ids.add(test_id)
                continue
            seen_test_ids.add(test_id)
            tests.append(test)
        if duplicate_test_ids:
            LOGGER.warning(
                "Robot type '%s' defines duplicate test IDs: %s. Keeping first occurrence.",
                type_id,
                ", ".join(sorted(duplicate_test_ids)),
            )
        raw_auto_monitor = raw.get("autoMonitor") if isinstance(raw.get("autoMonitor"), dict) else {}
        auto_monitor = {}
        battery_command = normalize_text(raw_auto_monitor.get("batteryCommand"), "")
        if battery_command:
            auto_monitor["batteryCommand"] = battery_command

        auto_fixes: list[dict[str, Any]] = []
        seen_fix_ids: set[str] = set()
        for raw_fix in (raw.get("autoFixes") or []):
            if not isinstance(raw_fix, dict):
                continue
            fix_id = normalize_text(raw_fix.get("id"), "")
            if not fix_id or fix_id in seen_fix_ids:
                continue
            seen_fix_ids.add(fix_id)
            commands = [
                normalize_text(command, "")
                for command in (raw_fix.get("commands") or [])
                if normalize_text(command, "")
            ]
            test_ids = [
                normalize_text(test_id, "")
                for test_id in (raw_fix.get("testIds") or [])
                if normalize_text(test_id, "")
            ]
            if not commands and not test_ids:
                continue
            auto_fixes.append(
                {
                    "id": fix_id,
                    "label": normalize_text(raw_fix.get("label"), fix_id),
                    "description": normalize_text(raw_fix.get("description"), ""),
                    "commands": commands,
                    "testIds": test_ids,
                }
            )

        normalized = {
            "typeId": type_id,
            "typeKey": normalize_type_key(type_id),
            "label": normalize_text(raw.get("name"), type_id),
            "topics": topics,
            "tests": tests,
            "autoMonitor": auto_monitor,
            "autoFixes": auto_fixes,
        }
        by_type_id[normalized["typeKey"]] = normalized
    return by_type_id


@dataclass
class RobotCatalog:
    robots: list[dict[str, Any]]
    robot_types: list[dict[str, Any]]
    robots_by_id: dict[str, dict[str, Any]]
    robot_types_by_id: dict[str, dict[str, Any]]

    @classmethod
    def load_from_paths(cls, robots_path: Path, robot_types_path: Path) -> "RobotCatalog":
        robots = load_robots_config(robots_path)
        robot_types = load_robot_types_config(robot_types_path)

        robots_by_id: dict[str, dict[str, Any]] = {}
        for robot in robots:
            robot_id = normalize_text(robot.get("id"), "")
            if robot_id:
                robots_by_id[robot_id] = robot

        robot_types_by_id = normalize_robot_types(robot_types)
        return cls(
            robots=robots,
            robot_types=robot_types,
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
        )
