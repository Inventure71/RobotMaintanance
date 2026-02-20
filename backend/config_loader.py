from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .definition_loader import load_definition_catalog
from .normalization import normalize_status, normalize_text, normalize_type_key

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROBOTS_CONFIG_PATH = PROJECT_ROOT / "config" / "robots.config.json"
DEFAULT_ROBOT_TYPES_CONFIG_PATH = PROJECT_ROOT / "config" / "robot-types.config.json"
DEFAULT_COMMAND_PRIMITIVES_DIR = PROJECT_ROOT / "config" / "command-primitives"
DEFAULT_TEST_DEFINITIONS_DIR = PROJECT_ROOT / "config" / "tests"
DEFAULT_FIX_DEFINITIONS_DIR = PROJECT_ROOT / "config" / "fixes"
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


def _normalize_possible_results(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "status": normalize_status(item.get("status")),
                "value": normalize_text(item.get("value"), "n/a"),
                "details": normalize_text(item.get("details"), "No detail available"),
            }
        )
    return out


def _merged_params(base: dict[str, Any], override: dict[str, Any], *, reserved_keys: set[str]) -> dict[str, Any]:
    params: dict[str, Any] = {}
    base_params = base.get("params") if isinstance(base.get("params"), dict) else {}
    override_params = override.get("params") if isinstance(override.get("params"), dict) else {}
    params.update(base_params)
    params.update(override_params)

    for key, value in override.items():
        if key in reserved_keys:
            continue
        params[key] = value
    return params


def _resolve_test_entry(
    test_id: str,
    check_definition: dict[str, Any],
    test_definition: dict[str, Any],
    override: dict[str, Any],
) -> dict[str, Any]:
    base = {
        "params": check_definition.get("params") if isinstance(check_definition.get("params"), dict) else {},
    }
    params = _merged_params(
        base,
        override,
        reserved_keys={
            "label",
            "icon",
            "enabled",
            "manualOnly",
            "defaultStatus",
            "defaultValue",
            "defaultDetails",
            "possibleResults",
            "params",
        },
    )

    possible_results = _normalize_possible_results(override.get("possibleResults"))
    if not possible_results:
        possible_results = _normalize_possible_results(check_definition.get("possibleResults"))

    return {
        "id": test_id,
        "definitionId": normalize_text(check_definition.get("definitionId"), ""),
        "definitionMode": normalize_text(test_definition.get("mode"), "orchestrate"),
        "label": normalize_text(override.get("label"), normalize_text(check_definition.get("label"), test_id)),
        "icon": normalize_text(override.get("icon"), normalize_text(check_definition.get("icon"), "⚙️")),
        "manualOnly": bool(override.get("manualOnly", check_definition.get("manualOnly", True))),
        "enabled": bool(override.get("enabled", check_definition.get("enabled", True))),
        "defaultStatus": normalize_status(override.get("defaultStatus") or check_definition.get("defaultStatus")),
        "defaultValue": normalize_text(override.get("defaultValue"), normalize_text(check_definition.get("defaultValue"), "unknown")),
        "defaultDetails": normalize_text(
            override.get("defaultDetails"),
            normalize_text(check_definition.get("defaultDetails"), "Not checked yet"),
        ),
        "possibleResults": possible_results,
        "params": params,
    }


def _resolve_fix_entry(
    fix_id: str,
    fix_definition: dict[str, Any],
    override: dict[str, Any],
) -> dict[str, Any]:
    source = fix_definition if isinstance(fix_definition, dict) else {}
    params = _merged_params(
        source,
        override,
        reserved_keys={"label", "description", "enabled", "params", "postTestIds", "execute"},
    )

    override_post_tests = override.get("postTestIds") if isinstance(override.get("postTestIds"), list) else None
    source_post_tests = source.get("postTestIds") if isinstance(source.get("postTestIds"), list) else []
    post_test_ids = override_post_tests if override_post_tests is not None else source_post_tests
    post_test_ids = [normalize_text(item, "") for item in post_test_ids if normalize_text(item, "")]

    execute_steps = override.get("execute") if isinstance(override.get("execute"), list) else None
    if execute_steps is None:
        execute_steps = source.get("execute") if isinstance(source.get("execute"), list) else []
    execute_steps = [item for item in execute_steps if isinstance(item, dict)]

    return {
        "id": fix_id,
        "definitionId": fix_id,
        "label": normalize_text(override.get("label"), normalize_text(source.get("label"), fix_id)),
        "description": normalize_text(override.get("description"), normalize_text(source.get("description"), "")),
        "enabled": bool(override.get("enabled", source.get("enabled", True))),
        "params": params,
        "postTestIds": post_test_ids,
        "execute": execute_steps,
    }


def normalize_robot_types(
    raw_types: list[dict[str, Any]],
    test_definitions_by_id: dict[str, dict[str, Any]],
    check_definitions_by_id: dict[str, dict[str, Any]],
    fix_definitions_by_id: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    by_type_id: dict[str, dict[str, Any]] = {}

    for raw in raw_types:
        if not isinstance(raw, dict):
            continue

        type_id = normalize_text(raw.get("id") or raw.get("name"), "")
        if not type_id:
            continue

        topics = [normalize_text(topic, "") for topic in (raw.get("topics") or []) if normalize_text(topic, "")]

        raw_test_refs = raw.get("testRefs") if isinstance(raw.get("testRefs"), list) else []
        raw_fix_refs = raw.get("fixRefs") if isinstance(raw.get("fixRefs"), list) else []

        test_refs: list[str] = []
        seen_test_refs: set[str] = set()
        for test_ref in raw_test_refs:
            normalized_ref = normalize_text(test_ref, "")
            if not normalized_ref or normalized_ref in seen_test_refs:
                continue
            seen_test_refs.add(normalized_ref)
            test_refs.append(normalized_ref)

        fix_refs: list[str] = []
        seen_fix_refs: set[str] = set()
        for fix_ref in raw_fix_refs:
            normalized_ref = normalize_text(fix_ref, "")
            if not normalized_ref or normalized_ref in seen_fix_refs:
                continue
            seen_fix_refs.add(normalized_ref)
            fix_refs.append(normalized_ref)

        raw_test_overrides = raw.get("testOverrides") if isinstance(raw.get("testOverrides"), dict) else {}
        raw_fix_overrides = raw.get("fixOverrides") if isinstance(raw.get("fixOverrides"), dict) else {}

        tests: list[dict[str, Any]] = []
        for test_id in test_refs:
            check_definition = check_definitions_by_id.get(test_id)
            if not isinstance(check_definition, dict):
                raise ValueError(f"Robot type '{type_id}' references unknown test id '{test_id}'")

            definition_id = normalize_text(check_definition.get("definitionId"), "")
            test_definition = test_definitions_by_id.get(definition_id)
            if not isinstance(test_definition, dict):
                raise ValueError(f"Test '{test_id}' references unknown definition '{definition_id}'")

            override = raw_test_overrides.get(test_id) if isinstance(raw_test_overrides.get(test_id), dict) else {}
            tests.append(
                _resolve_test_entry(
                    test_id=test_id,
                    check_definition=check_definition,
                    test_definition=test_definition,
                    override=override,
                )
            )

        auto_fixes: list[dict[str, Any]] = []
        for fix_id in fix_refs:
            fix_definition = fix_definitions_by_id.get(fix_id)
            if not isinstance(fix_definition, dict):
                raise ValueError(f"Robot type '{type_id}' references unknown fix id '{fix_id}'")
            override = raw_fix_overrides.get(fix_id) if isinstance(raw_fix_overrides.get(fix_id), dict) else {}
            resolved_fix = _resolve_fix_entry(fix_id, fix_definition, override)
            for post_test_id in resolved_fix.get("postTestIds") or []:
                if post_test_id not in check_definitions_by_id:
                    raise ValueError(
                        f"Fix '{fix_id}' references unknown postTestId '{post_test_id}' in robot type '{type_id}'"
                    )
            auto_fixes.append(resolved_fix)

        raw_auto_monitor = raw.get("autoMonitor") if isinstance(raw.get("autoMonitor"), dict) else {}
        auto_monitor = {}
        battery_command = normalize_text(raw_auto_monitor.get("batteryCommand"), "")
        if battery_command:
            auto_monitor["batteryCommand"] = battery_command

        normalized = {
            "typeId": type_id,
            "typeKey": normalize_type_key(type_id),
            "label": normalize_text(raw.get("name"), type_id),
            "topics": topics,
            "testRefs": list(test_refs),
            "fixRefs": list(fix_refs),
            "testOverrides": raw_test_overrides,
            "fixOverrides": raw_fix_overrides,
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
    command_primitives_by_id: dict[str, dict[str, Any]]
    test_definitions_by_id: dict[str, dict[str, Any]]
    check_definitions_by_id: dict[str, dict[str, Any]]
    fix_definitions_by_id: dict[str, dict[str, Any]]
    test_catalog_by_id: dict[str, dict[str, Any]]
    fix_catalog_by_id: dict[str, dict[str, Any]]

    @classmethod
    def load_from_paths(
        cls,
        robots_path: Path,
        robot_types_path: Path,
        command_primitives_dir: Path = DEFAULT_COMMAND_PRIMITIVES_DIR,
        tests_dir: Path = DEFAULT_TEST_DEFINITIONS_DIR,
        fixes_dir: Path = DEFAULT_FIX_DEFINITIONS_DIR,
    ) -> "RobotCatalog":
        robots = load_robots_config(robots_path)
        robot_types = load_robot_types_config(robot_types_path)

        definitions = load_definition_catalog(
            command_primitives_dir=command_primitives_dir,
            tests_dir=tests_dir,
            fixes_dir=fixes_dir,
        )

        robots_by_id: dict[str, dict[str, Any]] = {}
        for robot in robots:
            robot_id = normalize_text(robot.get("id"), "")
            if robot_id:
                robots_by_id[robot_id] = robot

        robot_types_by_id = normalize_robot_types(
            robot_types,
            definitions.test_definitions_by_id,
            definitions.check_definitions_by_id,
            definitions.fix_definitions_by_id,
        )

        return cls(
            robots=robots,
            robot_types=robot_types,
            robots_by_id=robots_by_id,
            robot_types_by_id=robot_types_by_id,
            command_primitives_by_id=definitions.command_primitives_by_id,
            test_definitions_by_id=definitions.test_definitions_by_id,
            check_definitions_by_id=definitions.check_definitions_by_id,
            fix_definitions_by_id=definitions.fix_definitions_by_id,
            test_catalog_by_id=definitions.check_definitions_by_id,
            fix_catalog_by_id=definitions.fix_definitions_by_id,
        )
