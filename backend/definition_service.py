from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from .config_loader import RobotCatalog, load_json_file
from .normalization import normalize_owner_tags, normalize_platform_tags, normalize_text, normalize_type_key


ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


class DefinitionService:
    def __init__(
        self,
        *,
        terminal_manager: Any,
        robots_config_path: Path,
        robot_types_config_path: Path,
        command_primitives_dir: Path,
        tests_dir: Path,
        fixes_dir: Path,
    ) -> None:
        self._terminal_manager = terminal_manager
        self._robots_config_path = Path(robots_config_path)
        self._robot_types_config_path = Path(robot_types_config_path)
        self._command_primitives_dir = Path(command_primitives_dir)
        self._tests_dir = Path(tests_dir)
        self._fixes_dir = Path(fixes_dir)
        self._summary_cache: dict[str, Any] | None = None

    def _invalidate_summary_cache(self) -> None:
        self._summary_cache = None

    @staticmethod
    def _ensure_valid_id(raw_id: str, kind: str) -> str:
        normalized = normalize_text(raw_id, "")
        if not normalized:
            raise HTTPException(status_code=400, detail=f"{kind} id is required.")
        if not ID_PATTERN.fullmatch(normalized):
            raise HTTPException(
                status_code=400,
                detail=f"{kind} id '{normalized}' is invalid. Use only letters, numbers, '.', '_' or '-'.",
            )
        return normalized

    @staticmethod
    def _normalize_string_list(values: list[str] | None) -> list[str]:
        if not isinstance(values, list):
            return []
        out: list[str] = []
        seen: set[str] = set()
        for value in values:
            text = normalize_text(value, "")
            if not text or text in seen:
                continue
            seen.add(text)
            out.append(text)
        return out

    def _get_check_ids_for_test_definition(self, definition_id: str) -> list[str]:
        target_definition_id = normalize_text(definition_id, "")
        if not target_definition_id:
            return []
        check_definitions_by_id = getattr(self._terminal_manager, "_check_definitions_by_id", {}) or {}
        check_ids: list[str] = []
        seen: set[str] = set()
        for check_id, check_payload in check_definitions_by_id.items():
            if not isinstance(check_payload, dict):
                continue
            if normalize_text(check_payload.get("definitionId"), "") != target_definition_id:
                continue
            normalized_check_id = normalize_text(check_id, "")
            if not normalized_check_id or normalized_check_id in seen:
                continue
            seen.add(normalized_check_id)
            check_ids.append(normalized_check_id)
        return check_ids

    def _remove_test_refs_for_definition(
        self,
        refs: list[str],
        *,
        definition_id: str,
        check_ids: set[str],
    ) -> list[str]:
        target_definition_id = normalize_text(definition_id, "")
        if not target_definition_id:
            return self._normalize_string_list(refs)
        legacy_prefix = f"{target_definition_id}__"
        check_definitions_by_id = getattr(self._terminal_manager, "_check_definitions_by_id", {}) or {}
        cleaned: list[str] = []
        for ref in self._normalize_string_list(refs):
            if ref == target_definition_id:
                continue
            if ref in check_ids:
                continue
            if ref.startswith(legacy_prefix):
                continue
            check_payload = check_definitions_by_id.get(ref)
            if isinstance(check_payload, dict):
                if normalize_text(check_payload.get("definitionId"), "") == target_definition_id:
                    continue
            cleaned.append(ref)
        return cleaned

    @staticmethod
    def _write_json(path: Path, payload: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    @staticmethod
    def _serialize_json(payload: Any) -> str:
        return json.dumps(payload, indent=2) + "\n"

    def _safe_apply_file_changes(
        self,
        changes: dict[Path, str | None],
        *,
        failure_prefix: str = "Failed to apply definition",
    ) -> RobotCatalog:
        snapshots = {
            Path(path): Path(path).read_text(encoding="utf-8") if Path(path).exists() else None
            for path in changes.keys()
        }
        try:
            for raw_path, content in changes.items():
                path = Path(raw_path)
                if content is None:
                    if path.exists():
                        path.unlink()
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
            return self._reload_catalog_and_runtime()
        except Exception as exc:
            for path, previous in snapshots.items():
                if previous is None:
                    if path.exists():
                        path.unlink()
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(previous, encoding="utf-8")
            raise HTTPException(status_code=400, detail=f"{failure_prefix}: {exc}") from exc

    def _reload_catalog_and_runtime(self) -> RobotCatalog:
        catalog = RobotCatalog.load_from_paths(
            robots_path=self._robots_config_path,
            robot_types_path=self._robot_types_config_path,
            command_primitives_dir=self._command_primitives_dir,
            tests_dir=self._tests_dir,
            fixes_dir=self._fixes_dir,
        )
        self._terminal_manager.reload_definitions(
            robots_by_id=catalog.robots_by_id,
            robot_types_by_id=catalog.robot_types_by_id,
            command_primitives_by_id=catalog.command_primitives_by_id,
            test_definitions_by_id=catalog.test_definitions_by_id,
            check_definitions_by_id=catalog.check_definitions_by_id,
            fix_definitions_by_id=catalog.fix_definitions_by_id,
        )
        self._invalidate_summary_cache()
        return catalog

    def _safe_write_with_reload(self, path: Path, payload: Any) -> RobotCatalog:
        return self._safe_apply_file_changes(
            {path: self._serialize_json(payload)},
            failure_prefix="Failed to apply definition",
        )

    @staticmethod
    def _load_json_document(path: Path) -> dict[str, Any] | None:
        if not path.exists():
            return None
        payload = load_json_file(path)
        return payload if isinstance(payload, dict) else None

    @staticmethod
    def _extract_check_ids(definition: dict[str, Any] | None) -> list[str]:
        if not isinstance(definition, dict):
            return []
        checks = definition.get("checks") if isinstance(definition.get("checks"), list) else []
        return [
            normalize_text(item.get("id"), "")
            for item in checks
            if isinstance(item, dict) and normalize_text(item.get("id"), "")
        ]

    def _definition_refs_present(
        self,
        refs: list[str],
        *,
        definition_id: str,
        check_ids: set[str],
    ) -> bool:
        target_definition_id = normalize_text(definition_id, "")
        if not target_definition_id:
            return False
        normalized_refs = self._normalize_string_list(refs)
        if target_definition_id in normalized_refs:
            return True
        if check_ids and any(ref in check_ids for ref in normalized_refs):
            return True
        legacy_prefix = f"{target_definition_id}__"
        if any(ref.startswith(legacy_prefix) for ref in normalized_refs):
            return True
        check_definitions_by_id = getattr(self._terminal_manager, "_check_definitions_by_id", {}) or {}
        for ref in normalized_refs:
            check_payload = check_definitions_by_id.get(ref)
            if isinstance(check_payload, dict) and normalize_text(check_payload.get("definitionId"), "") == target_definition_id:
                return True
        return False

    def reload(self) -> dict[str, Any]:
        self._reload_catalog_and_runtime()
        return self.get_summary()

    def get_summary(self) -> dict[str, Any]:
        if self._summary_cache is not None:
            return self._summary_cache

        command_primitives_by_id = getattr(self._terminal_manager, "_command_primitives_by_id", {}) or {}
        test_definitions_by_id = getattr(self._terminal_manager, "_test_definitions_by_id", {}) or {}
        check_definitions_by_id = getattr(self._terminal_manager, "_check_definitions_by_id", {}) or {}
        fix_definitions_by_id = getattr(self._terminal_manager, "_fix_definitions_by_id", {}) or {}
        robot_types_by_id = getattr(self._terminal_manager, "robot_types_by_id", {}) or {}

        tests: list[dict[str, Any]] = []
        for test_definition in test_definitions_by_id.values():
            if not isinstance(test_definition, dict):
                continue
            definition_id = normalize_text(test_definition.get("id"), "")
            if not definition_id:
                continue
            checks = [
                check
                for check in check_definitions_by_id.values()
                if isinstance(check, dict)
                and normalize_text(check.get("definitionId"), "") == definition_id
            ]
            checks.sort(key=lambda item: normalize_text(item.get("id"), ""))
            tests.append(
                {
                    "id": definition_id,
                    "label": normalize_text(test_definition.get("label"), definition_id),
                    "description": normalize_text(test_definition.get("description"), ""),
                    "enabled": bool(test_definition.get("enabled", True)),
                    "ownerTags": normalize_owner_tags(test_definition.get("ownerTags")),
                    "platformTags": normalize_platform_tags(test_definition.get("platformTags")),
                    "mode": normalize_text(test_definition.get("mode"), "orchestrate"),
                    "params": test_definition.get("params") if isinstance(test_definition.get("params"), dict) else {},
                    "execute": test_definition.get("execute") if isinstance(test_definition.get("execute"), list) else [],
                    "checks": checks,
                }
            )
        tests.sort(key=lambda item: item["id"])

        fixes: list[dict[str, Any]] = []
        for fix_definition in fix_definitions_by_id.values():
            if not isinstance(fix_definition, dict):
                continue
            fix_id = normalize_text(fix_definition.get("id"), "")
            if not fix_id:
                continue
            fixes.append(
                {
                    "id": fix_id,
                    "label": normalize_text(fix_definition.get("label"), fix_id),
                    "description": normalize_text(fix_definition.get("description"), ""),
                    "enabled": bool(fix_definition.get("enabled", True)),
                    "ownerTags": normalize_owner_tags(fix_definition.get("ownerTags")),
                    "platformTags": normalize_platform_tags(fix_definition.get("platformTags")),
                    "runAtConnection": bool(fix_definition.get("runAtConnection", False)),
                    "params": fix_definition.get("params") if isinstance(fix_definition.get("params"), dict) else {},
                    "execute": fix_definition.get("execute") if isinstance(fix_definition.get("execute"), list) else [],
                }
            )
        fixes.sort(key=lambda item: item["id"])

        primitives: list[dict[str, Any]] = []
        for primitive in command_primitives_by_id.values():
            if not isinstance(primitive, dict):
                continue
            primitive_id = normalize_text(primitive.get("id"), "")
            if not primitive_id:
                continue
            payload = {
                "id": primitive_id,
                "command": normalize_text(primitive.get("command"), ""),
                "description": normalize_text(primitive.get("description"), ""),
            }
            if primitive.get("timeoutSec") is not None:
                payload["timeoutSec"] = primitive.get("timeoutSec")
            if primitive.get("retries") is not None:
                payload["retries"] = primitive.get("retries")
            primitives.append(payload)
        primitives.sort(key=lambda item: item["id"])

        robot_types: list[dict[str, Any]] = []
        for type_payload in robot_types_by_id.values():
            if not isinstance(type_payload, dict):
                continue
            type_id = normalize_text(type_payload.get("typeId"), "")
            if not type_id:
                continue
            robot_types.append(
                {
                    "id": type_id,
                    "typeKey": normalize_type_key(type_id),
                    "name": normalize_text(type_payload.get("label"), type_id),
                    "testRefs": self._normalize_string_list(type_payload.get("testRefs")),
                    "fixRefs": self._normalize_string_list(type_payload.get("fixRefs")),
                }
            )
        robot_types.sort(key=lambda item: item["id"])

        checks = [
            check
            for check in sorted(
                check_definitions_by_id.values(),
                key=lambda item: normalize_text(item.get("id"), "") if isinstance(item, dict) else "",
            )
            if isinstance(check, dict)
        ]

        summary = {
            "ok": True,
            "commandPrimitives": primitives,
            "tests": tests,
            "checks": checks,
            "fixes": fixes,
            "robotTypes": robot_types,
        }
        self._summary_cache = summary
        return summary

    def upsert_primitive(self, payload: dict[str, Any]) -> dict[str, Any]:
        primitive_id = self._ensure_valid_id(payload.get("id"), "Primitive")
        command = normalize_text(payload.get("command"), "")
        if not command:
            raise HTTPException(status_code=400, detail="Primitive command is required.")

        document: dict[str, Any] = {
            "id": primitive_id,
            "command": command,
            "description": normalize_text(payload.get("description"), ""),
        }
        if payload.get("timeoutSec") is not None:
            document["timeoutSec"] = payload.get("timeoutSec")
        if payload.get("retries") is not None:
            document["retries"] = payload.get("retries")

        path = self._command_primitives_dir / f"{primitive_id}.command.json"
        self._safe_write_with_reload(path, document)
        return {
            "ok": True,
            "id": primitive_id,
            "path": str(path),
            "summary": self.get_summary(),
        }

    def _check_id_conflicts(
        self,
        definition_id: str,
        check_ids: list[str],
        *,
        allowed_definition_ids: set[str] | None = None,
    ) -> None:
        existing_checks = getattr(self._terminal_manager, "_check_definitions_by_id", {}) or {}
        allowed = {normalize_text(item, "") for item in (allowed_definition_ids or set()) if normalize_text(item, "")}
        allowed.add(normalize_text(definition_id, ""))
        for check_id in check_ids:
            existing = existing_checks.get(check_id)
            if not isinstance(existing, dict):
                continue
            existing_definition_id = normalize_text(existing.get("definitionId"), "")
            if existing_definition_id and existing_definition_id not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Check id '{check_id}' is already defined in test "
                        f"'{existing_definition_id}'. Check ids must be globally unique."
                    ),
                )

    def upsert_test(self, payload: dict[str, Any]) -> dict[str, Any]:
        definition_id = self._ensure_valid_id(payload.get("id"), "Test")
        previous_definition_id = normalize_text(payload.get("previousId"), "")
        target_path = self._tests_dir / f"{definition_id}.test.json"
        if not previous_definition_id and target_path.exists():
            previous_definition_id = definition_id
        previous_path = self._tests_dir / f"{previous_definition_id}.test.json" if previous_definition_id else None
        if previous_definition_id and previous_path is not None and not previous_path.exists():
            raise HTTPException(status_code=404, detail=f"Test '{previous_definition_id}' not found.")
        previous_definition = self._load_json_document(previous_path) if previous_path else None
        previous_check_ids = self._extract_check_ids(previous_definition)

        if (
            previous_definition_id
            and previous_definition_id != definition_id
            and target_path.exists()
        ):
            raise HTTPException(status_code=400, detail=f"Test id '{definition_id}' already exists.")

        mode = normalize_text(payload.get("mode"), "orchestrate").lower()
        if mode not in {"orchestrate", "online_probe"}:
            raise HTTPException(status_code=400, detail=f"Unsupported test mode '{mode}'.")

        execute = payload.get("execute") if isinstance(payload.get("execute"), list) else []
        if mode == "orchestrate" and not execute:
            raise HTTPException(status_code=400, detail="Orchestrate tests require non-empty execute steps.")

        checks = payload.get("checks") if isinstance(payload.get("checks"), list) else []
        if not checks:
            raise HTTPException(status_code=400, detail="Test definition must contain checks.")

        check_ids = [normalize_text(item.get("id"), "") for item in checks if isinstance(item, dict)]
        check_ids = [item for item in check_ids if item]
        if len(check_ids) != len(set(check_ids)):
            raise HTTPException(status_code=400, detail="Test definition contains duplicate check ids.")
        self._check_id_conflicts(
            definition_id,
            check_ids,
            allowed_definition_ids={previous_definition_id, definition_id},
        )
        run_at_connection_values = {
            bool(item.get("runAtConnection"))
            for item in checks
            if isinstance(item, dict) and isinstance(item.get("runAtConnection"), bool)
        }
        if len(run_at_connection_values) > 1:
            raise HTTPException(
                status_code=400,
                detail="All checks in a test must share the same runAtConnection value.",
            )

        normalized_checks: list[dict[str, Any]] = []
        for raw_check in checks:
            if not isinstance(raw_check, dict):
                continue
            check_id = self._ensure_valid_id(raw_check.get("id"), "Check")
            check_payload: dict[str, Any] = {"id": check_id}
            metadata: dict[str, Any] = {}
            for key in (
                "label",
                "icon",
                "manualOnly",
                "enabled",
                "runAtConnection",
                "defaultStatus",
                "defaultValue",
                "defaultDetails",
                "possibleResults",
                "params",
            ):
                if key in raw_check:
                    metadata[key] = raw_check.get(key)
            if metadata:
                check_payload["metadata"] = metadata
            if "read" in raw_check:
                check_payload["read"] = raw_check.get("read")
            if "pass" in raw_check:
                check_payload["pass"] = raw_check.get("pass")
            if "fail" in raw_check:
                check_payload["fail"] = raw_check.get("fail")
            normalized_checks.append(check_payload)

        document: dict[str, Any] = {
            "id": definition_id,
            "label": normalize_text(payload.get("label"), definition_id),
            "description": normalize_text(payload.get("description"), ""),
            "enabled": bool(payload.get("enabled", True)),
            "ownerTags": normalize_owner_tags(payload.get("ownerTags")),
            "platformTags": normalize_platform_tags(payload.get("platformTags")),
            "mode": mode,
            "execute": execute,
            "checks": normalized_checks,
            "params": payload.get("params") if isinstance(payload.get("params"), dict) else {},
        }
        if mode == "online_probe":
            document.pop("execute", None)
        elif not document["execute"]:
            raise HTTPException(status_code=400, detail="execute[] is required for orchestrate tests.")

        root_payload, robot_type_entries = self._load_robot_types_document()
        if previous_definition_id:
            old_check_id_set = set(previous_check_ids)
            new_check_ids = self._normalize_string_list(check_ids)
            for entry in robot_type_entries:
                test_refs = self._normalize_string_list(entry.get("testRefs"))
                was_mapped = self._definition_refs_present(
                    test_refs,
                    definition_id=previous_definition_id,
                    check_ids=old_check_id_set,
                )
                next_refs = self._remove_test_refs_for_definition(
                    test_refs,
                    definition_id=previous_definition_id,
                    check_ids=old_check_id_set,
                )
                if was_mapped:
                    next_refs = self._normalize_string_list([*next_refs, *new_check_ids])
                entry["testRefs"] = next_refs

        changes: dict[Path, str | None] = {
            target_path: self._serialize_json(document),
        }
        if previous_definition_id and previous_definition_id != definition_id and previous_path is not None:
            changes[previous_path] = None
        if isinstance(root_payload, dict):
            root_payload["robotTypes"] = robot_type_entries
        changes[self._robot_types_config_path] = self._serialize_json(root_payload)

        self._safe_apply_file_changes(changes, failure_prefix="Failed to apply definition")
        return {
            "ok": True,
            "id": definition_id,
            "path": str(target_path),
            "summary": self.get_summary(),
        }

    def upsert_fix(self, payload: dict[str, Any]) -> dict[str, Any]:
        fix_id = self._ensure_valid_id(payload.get("id"), "Fix")
        previous_fix_id = normalize_text(payload.get("previousId"), "")
        target_path = self._fixes_dir / f"{fix_id}.fix.json"
        if not previous_fix_id and target_path.exists():
            previous_fix_id = fix_id
        previous_path = self._fixes_dir / f"{previous_fix_id}.fix.json" if previous_fix_id else None
        if previous_fix_id and previous_path is not None and not previous_path.exists():
            raise HTTPException(status_code=404, detail=f"Fix '{previous_fix_id}' not found.")
        if previous_fix_id and previous_fix_id != fix_id and target_path.exists():
            raise HTTPException(status_code=400, detail=f"Fix id '{fix_id}' already exists.")

        execute = payload.get("execute") if isinstance(payload.get("execute"), list) else []
        if not execute:
            raise HTTPException(status_code=400, detail="Fix definition requires non-empty execute steps.")

        document: dict[str, Any] = {
            "id": fix_id,
            "label": normalize_text(payload.get("label"), fix_id),
            "enabled": bool(payload.get("enabled", True)),
            "description": normalize_text(payload.get("description"), ""),
            "ownerTags": normalize_owner_tags(payload.get("ownerTags")),
            "platformTags": normalize_platform_tags(payload.get("platformTags")),
            "runAtConnection": bool(payload.get("runAtConnection", False)),
            "execute": execute,
            "params": payload.get("params") if isinstance(payload.get("params"), dict) else {},
        }
        root_payload, robot_type_entries = self._load_robot_types_document()
        if previous_fix_id:
            for entry in robot_type_entries:
                fix_refs = self._normalize_string_list(entry.get("fixRefs"))
                next_fix_refs = [fix_id if ref == previous_fix_id else ref for ref in fix_refs]
                entry["fixRefs"] = self._normalize_string_list(next_fix_refs)

        changes: dict[Path, str | None] = {
            target_path: self._serialize_json(document),
        }
        if previous_fix_id and previous_fix_id != fix_id and previous_path is not None:
            changes[previous_path] = None
        if isinstance(root_payload, dict):
            root_payload["robotTypes"] = robot_type_entries
        changes[self._robot_types_config_path] = self._serialize_json(root_payload)

        self._safe_apply_file_changes(changes, failure_prefix="Failed to apply definition")
        return {
            "ok": True,
            "id": fix_id,
            "path": str(target_path),
            "summary": self.get_summary(),
        }

    def _load_robot_types_document(self) -> tuple[dict[str, Any] | list[dict[str, Any]], list[dict[str, Any]]]:
        if not self._robot_types_config_path.exists():
            return {"version": "3.0", "robotTypes": []}, []

        payload = load_json_file(self._robot_types_config_path)
        if isinstance(payload, list):
            entries = [item for item in payload if isinstance(item, dict)]
            return payload, entries
        if isinstance(payload, dict):
            entries = payload.get("robotTypes") if isinstance(payload.get("robotTypes"), list) else []
            entries = [item for item in entries if isinstance(item, dict)]
            return payload, entries
        return {"version": "3.0", "robotTypes": []}, []

    def patch_robot_type_mapping(
        self,
        *,
        type_id: str,
        test_refs: list[str] | None = None,
        fix_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        target_id = normalize_text(type_id, "")
        if not target_id:
            raise HTTPException(status_code=400, detail="type_id is required.")

        root_payload, robot_type_entries = self._load_robot_types_document()
        target_entry = None
        target_key = normalize_type_key(target_id)
        for entry in robot_type_entries:
            entry_id = normalize_text(entry.get("id") or entry.get("name"), "")
            if normalize_type_key(entry_id) == target_key:
                target_entry = entry
                break

        if not isinstance(target_entry, dict):
            raise HTTPException(status_code=404, detail=f"Robot type '{target_id}' not found.")

        if test_refs is not None:
            target_entry["testRefs"] = self._normalize_string_list(test_refs)
        if fix_refs is not None:
            target_entry["fixRefs"] = self._normalize_string_list(fix_refs)

        if isinstance(root_payload, list):
            next_payload: Any = root_payload
        else:
            next_payload = dict(root_payload)
            next_payload["robotTypes"] = robot_type_entries

        existed = self._robot_types_config_path.exists()
        previous = (
            self._robot_types_config_path.read_text(encoding="utf-8")
            if existed
            else None
        )
        self._write_json(self._robot_types_config_path, next_payload)
        try:
            self._reload_catalog_and_runtime()
        except Exception as exc:
            if existed and previous is not None:
                self._robot_types_config_path.write_text(previous, encoding="utf-8")
            raise HTTPException(status_code=400, detail=f"Failed to apply robot type mapping: {exc}") from exc

        return {
            "ok": True,
            "typeId": normalize_text(target_entry.get("id"), target_id),
            "testRefs": self._normalize_string_list(target_entry.get("testRefs")),
            "fixRefs": self._normalize_string_list(target_entry.get("fixRefs")),
            "summary": self.get_summary(),
        }

    def delete_test(self, test_id: str) -> dict[str, Any]:
        target_id = self._ensure_valid_id(test_id, "Test")
        path = self._tests_dir / f"{target_id}.test.json"
        existing_check_ids = set(self._get_check_ids_for_test_definition(target_id))
        root_payload, robot_type_entries = self._load_robot_types_document()
        changed = False
        for entry in robot_type_entries:
            test_refs = self._normalize_string_list(entry.get("testRefs"))
            next_refs = self._remove_test_refs_for_definition(
                test_refs,
                definition_id=target_id,
                check_ids=existing_check_ids,
            )
            if next_refs != test_refs:
                entry["testRefs"] = next_refs
                changed = True

        existed_test = path.exists()
        previous_test = path.read_text(encoding="utf-8") if existed_test else None
        existed_robot_types = self._robot_types_config_path.exists()
        previous_robot_types = (
            self._robot_types_config_path.read_text(encoding="utf-8")
            if existed_robot_types
            else None
        )
        if existed_test:
            path.unlink()
        if changed:
            if isinstance(root_payload, dict):
                root_payload["robotTypes"] = robot_type_entries
            self._write_json(self._robot_types_config_path, root_payload)

        try:
            self._reload_catalog_and_runtime()
        except Exception as exc:
            if existed_test and previous_test is not None:
                path.write_text(previous_test, encoding="utf-8")
            elif not existed_test and path.exists():
                path.unlink()
            if existed_robot_types and previous_robot_types is not None:
                self._robot_types_config_path.write_text(previous_robot_types, encoding="utf-8")
            raise HTTPException(status_code=400, detail=f"Failed to delete test definition: {exc}") from exc
        return {"ok": True, "id": target_id, "summary": self.get_summary()}

    def delete_fix(self, fix_id: str) -> dict[str, Any]:
        target_id = self._ensure_valid_id(fix_id, "Fix")
        path = self._fixes_dir / f"{target_id}.fix.json"
        
        # Remove from filesystem
        if path.exists():
            path.unlink()
            
        # Cleanup mappings in robot_types.json
        root_payload, robot_type_entries = self._load_robot_types_document()
        changed = False
        for entry in robot_type_entries:
            fix_refs = self._normalize_string_list(entry.get("fixRefs"))
            if target_id in fix_refs:
                entry["fixRefs"] = [r for r in fix_refs if r != target_id]
                changed = True
        
        if changed:
            if isinstance(root_payload, dict):
                root_payload["robotTypes"] = robot_type_entries
            self._write_json(self._robot_types_config_path, root_payload)
            
        self._reload_catalog_and_runtime()
        return {"ok": True, "id": target_id, "summary": self.get_summary()}

    def set_test_mappings(self, test_id: str, robot_type_ids: list[str]) -> dict[str, Any]:
        target_test_id = self._ensure_valid_id(test_id, "Test")
        check_ids = self._get_check_ids_for_test_definition(target_test_id)
        if not check_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot map test '{target_test_id}' because it has no resolved checks.",
            )
        check_id_set = set(check_ids)
        normalized_targets = {normalize_type_key(tid) for tid in robot_type_ids if tid}

        root_payload, robot_type_entries = self._load_robot_types_document()
        for entry in robot_type_entries:
            entry_id = normalize_text(entry.get("id") or entry.get("name"), "")
            type_key = normalize_type_key(entry_id)
            test_refs = self._normalize_string_list(entry.get("testRefs"))
            test_refs = self._remove_test_refs_for_definition(
                test_refs,
                definition_id=target_test_id,
                check_ids=check_id_set,
            )

            if type_key in normalized_targets:
                test_refs = self._normalize_string_list([*test_refs, *check_ids])
            entry["testRefs"] = test_refs

        if isinstance(root_payload, dict):
            root_payload["robotTypes"] = robot_type_entries
        existed = self._robot_types_config_path.exists()
        previous = (
            self._robot_types_config_path.read_text(encoding="utf-8")
            if existed
            else None
        )
        self._write_json(self._robot_types_config_path, root_payload)
        try:
            self._reload_catalog_and_runtime()
        except Exception as exc:
            if existed and previous is not None:
                self._robot_types_config_path.write_text(previous, encoding="utf-8")
            raise HTTPException(status_code=400, detail=f"Failed to apply test mappings: {exc}") from exc
        return {"ok": True, "id": target_test_id, "summary": self.get_summary()}

    def set_fix_mappings(self, fix_id: str, robot_type_ids: list[str]) -> dict[str, Any]:
        target_fix_id = self._ensure_valid_id(fix_id, "Fix")
        normalized_targets = {normalize_type_key(tid) for tid in robot_type_ids if tid}
        
        root_payload, robot_type_entries = self._load_robot_types_document()
        for entry in robot_type_entries:
            entry_id = normalize_text(entry.get("id") or entry.get("name"), "")
            type_key = normalize_type_key(entry_id)
            fix_refs = self._normalize_string_list(entry.get("fixRefs"))
            
            if type_key in normalized_targets:
                if target_fix_id not in fix_refs:
                    fix_refs.append(target_fix_id)
            else:
                if target_fix_id in fix_refs:
                    fix_refs = [r for r in fix_refs if r != target_fix_id]
            entry["fixRefs"] = fix_refs

        if isinstance(root_payload, dict):
            root_payload["robotTypes"] = robot_type_entries
        self._write_json(self._robot_types_config_path, root_payload)
        self._reload_catalog_and_runtime()
        return {"ok": True, "id": target_fix_id, "summary": self.get_summary()}
