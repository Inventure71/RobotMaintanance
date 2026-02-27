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
DEFAULT_MODEL_QUALITY_BASE_PATH = "assets/models"


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


def _normalize_model_path(raw_path: Any, fallback: str = DEFAULT_MODEL_QUALITY_BASE_PATH) -> str:
    path = normalize_text(raw_path, fallback).replace("\\", "/")
    path = path.strip().strip("/")
    if path.startswith("./"):
        path = path[2:]
    return path or fallback


def _normalize_model_file_name(raw_name: Any) -> str:
    file_name = normalize_text(raw_name, "").replace("\\", "/")
    file_name = file_name.strip().lstrip("/")
    if file_name.startswith("./"):
        file_name = file_name[2:]
    if not file_name:
        return ""
    if not file_name.lower().endswith((".glb", ".gltf")):
        return ""
    return file_name


def normalize_model_block(
    raw_model: Any,
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
    include_default_path: bool = False,
) -> dict[str, str] | None:
    if not isinstance(raw_model, dict):
        return None
    file_name = _normalize_model_file_name(raw_model.get("file_name"))
    raw_path = normalize_text(raw_model.get("path_to_quality_folders"), "")
    path = _normalize_model_path(raw_path, default_path) if raw_path else ""

    if not file_name and not path:
        return None
    if file_name and not path:
        path = _normalize_model_path(default_path, default_path)

    model: dict[str, str] = {}
    if file_name:
        model["file_name"] = file_name
    if path and (include_default_path or path != _normalize_model_path(default_path, default_path)):
        model["path_to_quality_folders"] = path
    return model or None


def parse_legacy_model_url(
    model_url: Any,
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
) -> dict[str, str] | None:
    raw = normalize_text(model_url, "").replace("\\", "/")
    if not raw:
        return None
    if raw.startswith("./"):
        raw = raw[2:]
    raw = raw.lstrip("/")
    split_index = len(raw)
    for marker in ("?", "#"):
        marker_index = raw.find(marker)
        if marker_index >= 0:
            split_index = min(split_index, marker_index)
    path_only = raw[:split_index]
    if not path_only.lower().endswith((".glb", ".gltf")):
        return None
    marker = "assets/models/"
    marker_index = path_only.lower().find(marker)
    if marker_index < 0:
        return None
    relative = path_only[marker_index + len(marker) :]
    lowered = relative.lower()
    if lowered.startswith("lowres/"):
        relative = relative[7:]
    elif lowered.startswith("highres/"):
        relative = relative[8:]
    file_name = _normalize_model_file_name(relative)
    if not file_name:
        return None
    return {
        "file_name": file_name,
        "path_to_quality_folders": _normalize_model_path(default_path, default_path),
    }


def resolve_effective_model(
    robot: dict[str, Any],
    robot_type: dict[str, Any],
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
) -> dict[str, str] | None:
    robot_model = normalize_model_block(
        robot.get("model"),
        default_path=default_path,
        include_default_path=True,
    ) or {}
    type_model = normalize_model_block(
        robot_type.get("model"),
        default_path=default_path,
        include_default_path=True,
    ) or {}

    file_name = normalize_text(robot_model.get("file_name"), "") or normalize_text(type_model.get("file_name"), "")
    file_name = _normalize_model_file_name(file_name)
    if not file_name:
        return None

    path = (
        normalize_text(robot_model.get("path_to_quality_folders"), "")
        or normalize_text(type_model.get("path_to_quality_folders"), "")
        or default_path
    )
    normalized_path = _normalize_model_path(path, default_path)
    return {
        "file_name": file_name,
        "path_to_quality_folders": normalized_path,
    }


def build_model_base_url(model: Any, *, default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH) -> str:
    normalized = normalize_model_block(model, default_path=default_path, include_default_path=True)
    if not normalized or not normalized.get("file_name"):
        return ""
    path = normalize_text(normalized.get("path_to_quality_folders"), "") or _normalize_model_path(default_path, default_path)
    return f"{path.rstrip('/')}/{normalized['file_name'].lstrip('/')}"


def _minimize_robot_override_model(
    robot_model: dict[str, str] | None,
    type_model: dict[str, str] | None,
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
) -> dict[str, str] | None:
    if not robot_model:
        return None
    out: dict[str, str] = {}
    robot_file = normalize_text(robot_model.get("file_name"), "")
    type_file = normalize_text((type_model or {}).get("file_name"), "")
    if robot_file and robot_file != type_file:
        out["file_name"] = robot_file

    robot_path = normalize_text(robot_model.get("path_to_quality_folders"), "")
    type_path = normalize_text((type_model or {}).get("path_to_quality_folders"), "") or _normalize_model_path(default_path, default_path)
    if robot_path and robot_path != type_path:
        out["path_to_quality_folders"] = robot_path
    return out or None


def migrate_robot_models_to_type_defaults(
    robots: list[dict[str, Any]],
    robot_types: list[dict[str, Any]],
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], bool, bool]:
    default_path_normalized = _normalize_model_path(default_path, default_path)
    next_robots: list[dict[str, Any]] = []
    next_types: list[dict[str, Any]] = [dict(item) for item in robot_types if isinstance(item, dict)]
    type_by_key: dict[str, dict[str, Any]] = {}
    for entry in next_types:
        type_id = normalize_text(entry.get("id"), "")
        if type_id:
            type_by_key[normalize_type_key(type_id)] = entry

    derived_by_type: dict[str, list[dict[str, str]]] = {}
    for robot in robots:
        if not isinstance(robot, dict):
            continue
        robot_out = dict(robot)
        robot_type_key = normalize_type_key(robot_out.get("type"))
        explicit_model = normalize_model_block(
            robot_out.get("model"),
            default_path=default_path_normalized,
            include_default_path=True,
        )
        if not explicit_model:
            explicit_model = parse_legacy_model_url(
                robot_out.get("modelUrl"),
                default_path=default_path_normalized,
            )
        if explicit_model and explicit_model.get("file_name"):
            derived_by_type.setdefault(robot_type_key, []).append(explicit_model)
        if explicit_model:
            robot_out["model"] = explicit_model
        else:
            robot_out.pop("model", None)
        robot_out.pop("modelUrl", None)
        next_robots.append(robot_out)

    for robot_type in next_types:
        type_id = normalize_text(robot_type.get("id"), "")
        if not type_id:
            continue
        type_key = normalize_type_key(type_id)
        type_model = normalize_model_block(
            robot_type.get("model"),
            default_path=default_path_normalized,
            include_default_path=True,
        )
        derived = derived_by_type.get(type_key, [])
        if not type_model:
            file_names = {normalize_text(item.get("file_name"), "") for item in derived if normalize_text(item.get("file_name"), "")}
            paths = {
                normalize_text(item.get("path_to_quality_folders"), "")
                for item in derived
                if normalize_text(item.get("path_to_quality_folders"), "")
            }
            inferred_file = file_names.pop() if len(file_names) == 1 else ""
            inferred_path = paths.pop() if len(paths) == 1 else ""
            if inferred_file:
                type_model = {"file_name": inferred_file}
                if inferred_path and inferred_path != default_path_normalized:
                    type_model["path_to_quality_folders"] = inferred_path

        normalized_type_model = normalize_model_block(
            type_model,
            default_path=default_path_normalized,
            include_default_path=False,
        )
        if normalized_type_model:
            robot_type["model"] = normalized_type_model
        else:
            robot_type.pop("model", None)

    for robot in next_robots:
        type_entry = type_by_key.get(normalize_type_key(robot.get("type")), {})
        type_model = normalize_model_block(
            type_entry.get("model"),
            default_path=default_path_normalized,
            include_default_path=True,
        )
        robot_model = normalize_model_block(
            robot.get("model"),
            default_path=default_path_normalized,
            include_default_path=True,
        )
        minimized = _minimize_robot_override_model(
            robot_model,
            type_model,
            default_path=default_path_normalized,
        )
        if minimized:
            robot["model"] = minimized
        else:
            robot.pop("model", None)

    robots_changed = json.dumps(robots, sort_keys=True) != json.dumps(next_robots, sort_keys=True)
    types_changed = json.dumps(robot_types, sort_keys=True) != json.dumps(next_types, sort_keys=True)
    return next_robots, next_types, robots_changed, types_changed


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
            "runAtConnection",
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

    run_at_connection = (
        override.get("runAtConnection")
        if "runAtConnection" in override
        else check_definition.get("runAtConnection")
    )
    if not isinstance(run_at_connection, bool):
        raise ValueError(f"Test '{test_id}' must define boolean runAtConnection")

    return {
        "id": test_id,
        "definitionId": normalize_text(check_definition.get("definitionId"), ""),
        "definitionMode": normalize_text(test_definition.get("mode"), "orchestrate"),
        "label": normalize_text(override.get("label"), normalize_text(check_definition.get("label"), test_id)),
        "icon": normalize_text(override.get("icon"), normalize_text(check_definition.get("icon"), "⚙️")),
        "manualOnly": bool(override.get("manualOnly", check_definition.get("manualOnly", True))),
        "enabled": bool(override.get("enabled", check_definition.get("enabled", True))),
        "runAtConnection": run_at_connection,
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
        reserved_keys={"label", "description", "enabled", "runAtConnection", "params", "postTestIds", "execute"},
    )

    override_post_tests = override.get("postTestIds") if isinstance(override.get("postTestIds"), list) else None
    source_post_tests = source.get("postTestIds") if isinstance(source.get("postTestIds"), list) else []
    post_test_ids = override_post_tests if override_post_tests is not None else source_post_tests
    post_test_ids = [normalize_text(item, "") for item in post_test_ids if normalize_text(item, "")]

    execute_steps = override.get("execute") if isinstance(override.get("execute"), list) else None
    if execute_steps is None:
        execute_steps = source.get("execute") if isinstance(source.get("execute"), list) else []
    execute_steps = [item for item in execute_steps if isinstance(item, dict)]
    run_at_connection = (
        override.get("runAtConnection")
        if "runAtConnection" in override
        else source.get("runAtConnection", False)
    )
    if not isinstance(run_at_connection, bool):
        raise ValueError(f"Fix '{fix_id}' must define boolean runAtConnection")

    return {
        "id": fix_id,
        "definitionId": fix_id,
        "label": normalize_text(override.get("label"), normalize_text(source.get("label"), fix_id)),
        "description": normalize_text(override.get("description"), normalize_text(source.get("description"), "")),
        "enabled": bool(override.get("enabled", source.get("enabled", True))),
        "runAtConnection": run_at_connection,
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
        model = normalize_model_block(raw.get("model"), default_path=DEFAULT_MODEL_QUALITY_BASE_PATH, include_default_path=False)

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
            "model": model,
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
        robots_payload = load_json_file(robots_path) if robots_path.exists() else {"version": "1.0", "robots": []}
        robot_types_payload = (
            load_json_file(robot_types_path)
            if robot_types_path.exists()
            else {"version": "3.0", "robotTypes": []}
        )
        robots = load_robots_config(robots_path)
        robot_types = load_robot_types_config(robot_types_path)
        migrated_robots, migrated_robot_types, robots_changed, robot_types_changed = migrate_robot_models_to_type_defaults(
            robots,
            robot_types,
            default_path=DEFAULT_MODEL_QUALITY_BASE_PATH,
        )
        if robots_changed:
            robots_version = "1.0"
            if isinstance(robots_payload, dict):
                robots_version = normalize_text(robots_payload.get("version"), "1.0")
            robots_path.write_text(
                json.dumps({"version": robots_version, "robots": migrated_robots}, indent=2) + "\n",
                encoding="utf-8",
            )
        if robot_types_changed:
            robot_types_version = "3.0"
            if isinstance(robot_types_payload, dict):
                robot_types_version = normalize_text(robot_types_payload.get("version"), "3.0")
            robot_types_path.write_text(
                json.dumps({"version": robot_types_version, "robotTypes": migrated_robot_types}, indent=2) + "\n",
                encoding="utf-8",
            )
        robots = migrated_robots
        robot_types = migrated_robot_types

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
