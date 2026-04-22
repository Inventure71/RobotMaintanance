from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .definition_loader import load_definition_catalog
from .normalization import (
    normalize_owner_tags,
    normalize_platform_tags,
    normalize_status,
    normalize_text,
    normalize_type_key,
)

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


def _normalize_legacy_model_url(
    raw_model_url: Any,
    *,
    default_path: str = DEFAULT_MODEL_QUALITY_BASE_PATH,
) -> dict[str, str] | None:
    model_url = normalize_text(raw_model_url, "").replace("\\", "/")
    model_url = model_url.split("?", 1)[0].split("#", 1)[0].strip()
    if model_url.startswith("./"):
        model_url = model_url[2:]
    model_url = model_url.lstrip("/")
    if not model_url:
        return None

    if "/" in model_url:
        path_part, file_name_part = model_url.rsplit("/", 1)
    else:
        path_part, file_name_part = "", model_url

    file_name = _normalize_model_file_name(file_name_part)
    if not file_name:
        return None
    path = _normalize_model_path(path_part or default_path, default_path)
    return {
        "file_name": file_name,
        "path_to_quality_folders": path,
    }


def load_robots_config(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    payload = load_json_file(path)
    robots: list[dict[str, Any]] = []
    if isinstance(payload, list):
        robots = payload
    elif isinstance(payload, dict):
        if isinstance(payload.get("robots"), list):
            robots = payload["robots"]
        elif isinstance(payload.get("fleet"), list):
            robots = payload["fleet"]
    for robot in robots:
        if not isinstance(robot, dict):
            continue
        if "modelUrl" not in robot:
            continue
        robot_id = normalize_text(robot.get("id"), "unknown")
        has_model_block = isinstance(robot.get("model"), dict)
        if not has_model_block:
            legacy_model = _normalize_legacy_model_url(
                robot.get("modelUrl"),
                default_path=DEFAULT_MODEL_QUALITY_BASE_PATH,
            )
            if legacy_model:
                robot["model"] = legacy_model
        robot.pop("modelUrl", None)
        LOGGER.warning(
            "Robot '%s' uses deprecated modelUrl; normalizing to model.file_name/path_to_quality_folders.",
            robot_id,
        )
    if robots:
        return robots
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
            "ownerTags",
            "platformTags",
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
    owner_tags_source = (
        override.get("ownerTags")
        if "ownerTags" in override
        else check_definition.get("ownerTags", test_definition.get("ownerTags"))
    )
    platform_tags_source = (
        override.get("platformTags")
        if "platformTags" in override
        else check_definition.get("platformTags", test_definition.get("platformTags"))
    )

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
        "ownerTags": normalize_owner_tags(owner_tags_source),
        "platformTags": normalize_platform_tags(platform_tags_source),
        "requires": [
            normalize_text(item, "")
            for item in (test_definition.get("requires") if isinstance(test_definition.get("requires"), list) else [])
            if normalize_text(item, "")
        ],
        "sideEffects": normalize_text(test_definition.get("sideEffects"), "read_only"),
        "isolation": normalize_text(test_definition.get("isolation"), "definition_shell"),
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
        reserved_keys={
            "label",
            "description",
            "enabled",
            "runAtConnection",
            "ownerTags",
            "platformTags",
            "params",
            "postTestIds",
            "execute",
        },
    )

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
    owner_tags_source = override.get("ownerTags") if "ownerTags" in override else source.get("ownerTags")
    platform_tags_source = override.get("platformTags") if "platformTags" in override else source.get("platformTags")
    post_test_ids_source = override.get("postTestIds") if "postTestIds" in override else source.get("postTestIds")
    post_test_ids = None
    if isinstance(post_test_ids_source, list):
        post_test_ids = []
        seen_post_test_ids: set[str] = set()
        for raw_test_id in post_test_ids_source:
            test_id = normalize_text(raw_test_id, "")
            if not test_id or test_id in seen_post_test_ids:
                continue
            seen_post_test_ids.add(test_id)
            post_test_ids.append(test_id)

    payload = {
        "id": fix_id,
        "definitionId": fix_id,
        "label": normalize_text(override.get("label"), normalize_text(source.get("label"), fix_id)),
        "description": normalize_text(override.get("description"), normalize_text(source.get("description"), "")),
        "enabled": bool(override.get("enabled", source.get("enabled", True))),
        "runAtConnection": run_at_connection,
        "ownerTags": normalize_owner_tags(owner_tags_source),
        "platformTags": normalize_platform_tags(platform_tags_source),
        "requires": [
            normalize_text(item, "")
            for item in (source.get("requires") if isinstance(source.get("requires"), list) else [])
            if normalize_text(item, "")
        ],
        "sideEffects": normalize_text(override.get("sideEffects"), normalize_text(source.get("sideEffects"), "mutating")),
        "risk": normalize_text(override.get("risk"), normalize_text(source.get("risk"), "medium")),
        "requiresApproval": bool(override.get("requiresApproval", source.get("requiresApproval", False))),
        "params": params,
        "execute": execute_steps,
    }
    if source.get("expectedDowntimeSec") is not None or override.get("expectedDowntimeSec") is not None:
        try:
            payload["expectedDowntimeSec"] = float(
                override.get("expectedDowntimeSec", source.get("expectedDowntimeSec"))
            )
        except Exception:
            payload["expectedDowntimeSec"] = 0.0
    if post_test_ids is not None:
        payload["postTestIds"] = post_test_ids
    return payload


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
