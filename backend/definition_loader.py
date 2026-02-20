from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .normalization import normalize_status, normalize_text


TOKEN_PATTERN = re.compile(r"^\$([A-Za-z0-9_.-]+)\$$")
VALID_READ_KINDS = {"contains_string", "contains_lines_unordered", "contains_any_string"}


@dataclass
class DefinitionCatalog:
    command_primitives_by_id: dict[str, dict[str, Any]]
    test_definitions_by_id: dict[str, dict[str, Any]]
    check_definitions_by_id: dict[str, dict[str, Any]]
    fix_definitions_by_id: dict[str, dict[str, Any]]


def _load_json_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Definition file '{path}' must contain a JSON object")
    return payload


def _load_definition_dir(path: Path, suffix: str) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    out: list[dict[str, Any]] = []
    for file_path in sorted(path.glob(f"*{suffix}")):
        payload = _load_json_object(file_path)
        payload["__file__"] = str(file_path)
        out.append(payload)
    return out


def _collect_command_token(raw_command: Any) -> str | None:
    command = str(raw_command or "").strip()
    match = TOKEN_PATTERN.fullmatch(command)
    if not match:
        return None
    return match.group(1)


def _normalize_possible_results(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "status": normalize_status(entry.get("status")),
                "value": normalize_text(entry.get("value"), "n/a"),
                "details": normalize_text(entry.get("details"), "No detail available"),
            }
        )
    return out


def _normalize_primitive(raw: dict[str, Any]) -> dict[str, Any]:
    primitive_id = normalize_text(raw.get("id"), "")
    if not primitive_id:
        raise ValueError(f"Command primitive in {raw.get('__file__', '<unknown>')} is missing id")

    command = normalize_text(raw.get("command"), "")
    if not command:
        raise ValueError(f"Command primitive '{primitive_id}' has empty command")

    normalized: dict[str, Any] = {
        "id": primitive_id,
        "command": command,
        "description": normalize_text(raw.get("description"), ""),
    }
    if raw.get("timeoutSec") is not None:
        normalized["timeoutSec"] = raw.get("timeoutSec")
    if raw.get("retries") is not None:
        normalized["retries"] = raw.get("retries")
    return normalized


def _normalize_test(raw: dict[str, Any]) -> dict[str, Any]:
    definition_id = normalize_text(raw.get("id"), "")
    if not definition_id:
        raise ValueError(f"Test definition in {raw.get('__file__', '<unknown>')} is missing id")

    mode = normalize_text(raw.get("mode"), "orchestrate").lower()
    if mode not in {"orchestrate", "online_probe"}:
        raise ValueError(f"Test definition '{definition_id}' has unsupported mode '{mode}'")

    execute = raw.get("execute") if isinstance(raw.get("execute"), list) else []
    if mode == "orchestrate" and not execute:
        raise ValueError(f"Test definition '{definition_id}' must define non-empty execute[]")

    checks = raw.get("checks") if isinstance(raw.get("checks"), list) else []
    if not checks:
        raise ValueError(f"Test definition '{definition_id}' must define non-empty checks[]")

    normalized_checks: list[dict[str, Any]] = []
    local_ids: set[str] = set()
    for raw_check in checks:
        if not isinstance(raw_check, dict):
            continue
        check_id = normalize_text(raw_check.get("id"), "")
        if not check_id:
            raise ValueError(f"Test definition '{definition_id}' has check without id")
        if check_id in local_ids:
            raise ValueError(f"Test definition '{definition_id}' has duplicate check id '{check_id}'")
        local_ids.add(check_id)

        read_spec = raw_check.get("read") if isinstance(raw_check.get("read"), dict) else {}
        if mode == "orchestrate":
            kind = normalize_text(read_spec.get("kind"), "")
            if kind not in VALID_READ_KINDS:
                raise ValueError(
                    f"Test definition '{definition_id}' check '{check_id}' has invalid read kind '{kind}'"
                )

        metadata = raw_check.get("metadata") if isinstance(raw_check.get("metadata"), dict) else {}
        default_status = normalize_status(metadata.get("defaultStatus"))
        normalized_checks.append(
            {
                "id": check_id,
                "definitionId": definition_id,
                "label": normalize_text(metadata.get("label"), normalize_text(raw_check.get("label"), check_id)),
                "icon": normalize_text(metadata.get("icon"), normalize_text(raw_check.get("icon"), "⚙️")),
                "manualOnly": bool(metadata.get("manualOnly", True)),
                "enabled": bool(metadata.get("enabled", True)),
                "defaultStatus": default_status,
                "defaultValue": normalize_text(metadata.get("defaultValue"), "unknown"),
                "defaultDetails": normalize_text(metadata.get("defaultDetails"), "Not checked yet"),
                "possibleResults": _normalize_possible_results(metadata.get("possibleResults")),
                "params": metadata.get("params") if isinstance(metadata.get("params"), dict) else {},
                "read": read_spec,
                "pass": raw_check.get("pass") if isinstance(raw_check.get("pass"), dict) else {},
                "fail": raw_check.get("fail") if isinstance(raw_check.get("fail"), dict) else {},
            }
        )

    normalized_execute: list[dict[str, Any]] = []
    for index, raw_step in enumerate(execute):
        if not isinstance(raw_step, dict):
            continue
        step_id = normalize_text(raw_step.get("id"), f"step-{index + 1}")
        command = raw_step.get("command")
        if normalize_text(command, "") == "":
            raise ValueError(f"Test definition '{definition_id}' step '{step_id}' has empty command")
        normalized_step = {
            "id": step_id,
            "command": command,
        }
        for key in ("timeoutSec", "retries", "saveAs", "reuseKey"):
            if key in raw_step:
                normalized_step[key] = raw_step.get(key)
        normalized_execute.append(normalized_step)

    return {
        "id": definition_id,
        "label": normalize_text(raw.get("label"), definition_id),
        "enabled": bool(raw.get("enabled", True)),
        "mode": mode,
        "execute": normalized_execute,
        "checks": normalized_checks,
        "params": raw.get("params") if isinstance(raw.get("params"), dict) else {},
    }


def _normalize_fix(raw: dict[str, Any]) -> dict[str, Any]:
    fix_id = normalize_text(raw.get("id"), "")
    if not fix_id:
        raise ValueError(f"Fix definition in {raw.get('__file__', '<unknown>')} is missing id")

    execute = raw.get("execute") if isinstance(raw.get("execute"), list) else []
    if not execute:
        raise ValueError(f"Fix definition '{fix_id}' must define non-empty execute[]")

    normalized_execute: list[dict[str, Any]] = []
    for index, raw_step in enumerate(execute):
        if not isinstance(raw_step, dict):
            continue
        step_id = normalize_text(raw_step.get("id"), f"step-{index + 1}")
        command = raw_step.get("command")
        if normalize_text(command, "") == "":
            raise ValueError(f"Fix definition '{fix_id}' step '{step_id}' has empty command")

        normalized_step = {
            "id": step_id,
            "command": command,
        }
        for key in ("timeoutSec", "retries", "saveAs", "reuseKey"):
            if key in raw_step:
                normalized_step[key] = raw_step.get(key)
        normalized_execute.append(normalized_step)

    post_test_ids = raw.get("postTestIds") if isinstance(raw.get("postTestIds"), list) else []
    post_test_ids = [normalize_text(item, "") for item in post_test_ids if normalize_text(item, "")]

    return {
        "id": fix_id,
        "label": normalize_text(raw.get("label"), fix_id),
        "description": normalize_text(raw.get("description"), ""),
        "enabled": bool(raw.get("enabled", True)),
        "execute": normalized_execute,
        "postTestIds": post_test_ids,
        "params": raw.get("params") if isinstance(raw.get("params"), dict) else {},
    }


def _validate_command_refs(
    *,
    command_primitives_by_id: dict[str, dict[str, Any]],
    test_definitions_by_id: dict[str, dict[str, Any]],
    fix_definitions_by_id: dict[str, dict[str, Any]],
) -> None:
    def _validate_steps(owner_kind: str, owner_id: str, steps: list[dict[str, Any]]) -> None:
        for step in steps:
            token = _collect_command_token(step.get("command"))
            if token and token not in command_primitives_by_id:
                raise ValueError(
                    f"{owner_kind} '{owner_id}' references unknown command primitive '{token}'"
                )

    for definition_id, definition in test_definitions_by_id.items():
        _validate_steps("Test definition", definition_id, definition.get("execute") or [])
    for fix_id, definition in fix_definitions_by_id.items():
        _validate_steps("Fix definition", fix_id, definition.get("execute") or [])


def load_definition_catalog(
    *,
    command_primitives_dir: Path,
    tests_dir: Path,
    fixes_dir: Path,
) -> DefinitionCatalog:
    primitive_entries = _load_definition_dir(command_primitives_dir, ".command.json")
    test_entries = _load_definition_dir(tests_dir, ".test.json")
    fix_entries = _load_definition_dir(fixes_dir, ".fix.json")

    command_primitives_by_id: dict[str, dict[str, Any]] = {}
    for entry in primitive_entries:
        normalized = _normalize_primitive(entry)
        primitive_id = normalized["id"]
        if primitive_id in command_primitives_by_id:
            raise ValueError(f"Duplicate command primitive id '{primitive_id}'")
        command_primitives_by_id[primitive_id] = normalized

    test_definitions_by_id: dict[str, dict[str, Any]] = {}
    check_definitions_by_id: dict[str, dict[str, Any]] = {}
    for entry in test_entries:
        normalized = _normalize_test(entry)
        definition_id = normalized["id"]
        if definition_id in test_definitions_by_id:
            raise ValueError(f"Duplicate test definition id '{definition_id}'")
        test_definitions_by_id[definition_id] = normalized
        for check in normalized.get("checks") or []:
            check_id = check["id"]
            if check_id in check_definitions_by_id:
                raise ValueError(f"Duplicate check id '{check_id}'")
            check_definitions_by_id[check_id] = check

    fix_definitions_by_id: dict[str, dict[str, Any]] = {}
    for entry in fix_entries:
        normalized = _normalize_fix(entry)
        fix_id = normalized["id"]
        if fix_id in fix_definitions_by_id:
            raise ValueError(f"Duplicate fix definition id '{fix_id}'")
        fix_definitions_by_id[fix_id] = normalized

    _validate_command_refs(
        command_primitives_by_id=command_primitives_by_id,
        test_definitions_by_id=test_definitions_by_id,
        fix_definitions_by_id=fix_definitions_by_id,
    )

    return DefinitionCatalog(
        command_primitives_by_id=command_primitives_by_id,
        test_definitions_by_id=test_definitions_by_id,
        check_definitions_by_id=check_definitions_by_id,
        fix_definitions_by_id=fix_definitions_by_id,
    )
