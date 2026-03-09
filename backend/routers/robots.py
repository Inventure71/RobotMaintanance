from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config_loader import DEFAULT_MODEL_QUALITY_BASE_PATH, normalize_model_block
from ..schemas import RobotCreateRequest, RobotUpdateRequest
from ..normalization import normalize_status, normalize_type_key, to_bool
from ..normalization import normalize_text


def _default_tests(test_entries: list[dict[str, Any]] | None = None) -> dict[str, dict[str, str]]:
    defaults: dict[str, dict[str, str]] = {}
    for entry in (test_entries or []):
        if not isinstance(entry, dict):
            continue
        test_id = str(entry.get("id") or "").strip()
        if not test_id:
            continue
        defaults[test_id] = {
            "status": normalize_status(entry.get("defaultStatus")),
            "value": str(entry.get("defaultValue") or "unknown").strip() or "unknown",
            "details": str(entry.get("defaultDetails") or "Not checked yet").strip() or "Not checked yet",
        }

    if defaults:
        return defaults

    return {
        "online": {"status": "warning", "value": "unknown", "details": "Not checked yet"},
    }


def create_robots_router(
    robots_by_id: dict[str, dict[str, Any]],
    robot_types_by_id: dict[str, dict[str, Any]],
    robots_config_path: Path,
    robot_types_config_path: Path | None = None,
    robot_models_root: Path | None = None,
    runtime_tests_provider: Callable[[str], dict[str, dict[str, Any]]] | None = None,
    runtime_activity_provider: Callable[[str], dict[str, Any]] | None = None,
    runtime_snapshot_provider: Callable[[int], dict[str, Any]] | None = None,
) -> APIRouter:
    router = APIRouter()
    quality_folders = {
        "low": "LowRes",
        "high": "HighRes",
    }

    def _write_config() -> None:
        payload = {
            "version": "1.0",
            "robots": list(robots_by_id.values()),
        }
        robots_config_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    def _load_robot_types_document() -> tuple[dict[str, Any] | list[dict[str, Any]], list[dict[str, Any]]]:
        if robot_types_config_path is None or not robot_types_config_path.exists():
            return {"version": "3.0", "robotTypes": []}, []

        payload = json.loads(robot_types_config_path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            entries = [item for item in payload if isinstance(item, dict)]
            return payload, entries
        if isinstance(payload, dict):
            entries = payload.get("robotTypes") if isinstance(payload.get("robotTypes"), list) else []
            entries = [item for item in entries if isinstance(item, dict)]
            return payload, entries
        return {"version": "3.0", "robotTypes": []}, []

    def _write_robot_types_config(root_payload: dict[str, Any] | list[dict[str, Any]], entries: list[dict[str, Any]]) -> None:
        if robot_types_config_path is None:
            return
        if isinstance(root_payload, list):
            next_payload: Any = entries
        else:
            next_payload = dict(root_payload)
            next_payload["robotTypes"] = entries
        robot_types_config_path.write_text(json.dumps(next_payload, indent=2) + "\n", encoding="utf-8")

    def _normalize_robot_id(raw: str) -> str:
        cleaned = normalize_text(raw, "")
        cleaned = cleaned.strip().lower()
        cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
        cleaned = re.sub(r"-+", "-", cleaned)
        return cleaned.strip("-") or "robot"

    def _generate_robot_id(base: str) -> str:
        normalized_id = _normalize_robot_id(base)
        if normalized_id not in robots_by_id:
            return normalized_id

        counter = 2
        while f"{normalized_id}-{counter}" in robots_by_id:
            counter += 1
        return f"{normalized_id}-{counter}"

    def _generate_robot_type_id(base: str) -> str:
        normalized_id = _normalize_robot_id(base)
        normalized_key = normalize_type_key(normalized_id)
        if normalized_key not in robot_types_by_id:
            return normalized_id

        counter = 2
        while normalize_type_key(f"{normalized_id}-{counter}") in robot_types_by_id:
            counter += 1
        return f"{normalized_id}-{counter}"

    def _normalize_topics(topics_in: list[str] | tuple[str, ...] | str | None) -> list[str]:
        if isinstance(topics_in, str):
            raw_topics = re.split(r"[\n,]+", topics_in)
        elif isinstance(topics_in, (list, tuple)):
            raw_topics = list(topics_in)
        else:
            raw_topics = []
        topics: list[str] = []
        seen_topics: set[str] = set()
        for topic in raw_topics:
            normalized_topic = normalize_text(topic, "")
            if not normalized_topic or normalized_topic in seen_topics:
                continue
            seen_topics.add(normalized_topic)
            topics.append(normalized_topic)
        return topics

    def _build_normalized_robot_type_entry(raw_entry: dict[str, Any]) -> dict[str, Any]:
        type_id = normalize_text(raw_entry.get("id"), "")
        type_key = normalize_type_key(type_id)
        existing = robot_types_by_id.get(type_key) if type_key else {}
        if not isinstance(existing, dict):
            existing = {}
        raw_auto_monitor = raw_entry.get("autoMonitor") if isinstance(raw_entry.get("autoMonitor"), dict) else {}
        battery_command = normalize_text(raw_auto_monitor.get("batteryCommand"), "")
        auto_monitor = {}
        if battery_command:
            auto_monitor["batteryCommand"] = battery_command
        return {
            "typeId": type_id,
            "typeKey": type_key,
            "label": normalize_text(raw_entry.get("name"), type_id),
            "topics": _normalize_topics(raw_entry.get("topics") if isinstance(raw_entry.get("topics"), list) else []),
            "testRefs": list(raw_entry.get("testRefs")) if isinstance(raw_entry.get("testRefs"), list) else [],
            "fixRefs": list(raw_entry.get("fixRefs")) if isinstance(raw_entry.get("fixRefs"), list) else [],
            "tests": list(existing.get("tests")) if isinstance(existing.get("tests"), list) else [],
            "autoFixes": list(existing.get("autoFixes")) if isinstance(existing.get("autoFixes"), list) else [],
            "autoMonitor": auto_monitor,
            "model": _build_response_model(raw_entry.get("model")),
        }

    def _normalize_model_quality_list(raw_qualities: Any) -> list[str] | None:
        if not isinstance(raw_qualities, list):
            return None
        normalized: list[str] = []
        for quality in raw_qualities:
            quality_id = normalize_text(quality, "").lower()
            if quality_id not in quality_folders or quality_id in normalized:
                continue
            normalized.append(quality_id)
        return normalized

    def _build_model_asset_path(model: dict[str, Any], quality_id: str) -> Path | None:
        if robot_models_root is None:
            return None
        quality_folder = quality_folders.get(quality_id)
        if not quality_folder:
            return None
        normalized_model = normalize_model_block(model, include_default_path=True)
        if not normalized_model:
            return None
        file_name = normalize_text(normalized_model.get("file_name"), "")
        if not file_name:
            return None

        model_path = normalize_text(
            normalized_model.get("path_to_quality_folders"),
            DEFAULT_MODEL_QUALITY_BASE_PATH,
        ).strip("/")
        base_path = DEFAULT_MODEL_QUALITY_BASE_PATH.strip("/")
        relative_path = ""
        if model_path and model_path != base_path:
            if model_path.startswith(f"{base_path}/"):
                relative_path = model_path[len(base_path) + 1 :]
            else:
                relative_path = model_path

        target = robot_models_root / quality_folder
        if relative_path:
            target = target / relative_path
        return target / file_name

    def _detect_model_available_qualities(model: dict[str, Any] | None) -> list[str] | None:
        normalized_model = normalize_model_block(model, include_default_path=True)
        if not normalized_model or robot_models_root is None:
            return None

        available: list[str] = []
        for quality_id in quality_folders:
            asset_path = _build_model_asset_path(normalized_model, quality_id)
            if asset_path and asset_path.exists():
                available.append(quality_id)
        return available

    def _detect_model_asset_version(model: dict[str, Any] | None) -> int | None:
        normalized_model = normalize_model_block(model, include_default_path=True)
        if not normalized_model or robot_models_root is None:
            return None

        versions: list[int] = []
        for quality_id in quality_folders:
            asset_path = _build_model_asset_path(normalized_model, quality_id)
            if asset_path and asset_path.exists():
                try:
                    versions.append(int(asset_path.stat().st_mtime_ns))
                except OSError:
                    continue
        if not versions:
            return None
        return max(versions)

    def _build_response_model(model: dict[str, Any] | None) -> dict[str, Any] | None:
        normalized_model = normalize_model_block(model)
        if not normalized_model:
            return None

        available_qualities = _detect_model_available_qualities(normalized_model)
        asset_version = _detect_model_asset_version(normalized_model)
        response_model: dict[str, Any] = dict(normalized_model)
        if available_qualities is not None:
            response_model["available_qualities"] = available_qualities
        if asset_version is not None:
            response_model["asset_version"] = asset_version
        return response_model

    def _validate_model_upload(upload: UploadFile | None, label: str) -> tuple[bytes, str]:
        if upload is None:
            raise HTTPException(status_code=400, detail=f"{label} file is required")
        raw_name = normalize_text(upload.filename, "")
        suffix = Path(raw_name).suffix.lower()
        if suffix not in {".glb", ".gltf"}:
            raise HTTPException(status_code=400, detail=f"{label} must be a .glb or .gltf file")
        data = upload.file.read()
        if not data:
            raise HTTPException(status_code=400, detail=f"{label} is empty")
        return data, suffix

    def _store_robot_type_model_uploads(
        *,
        type_id: str,
        low_model_file: UploadFile | None,
        high_model_file: UploadFile | None,
    ) -> dict[str, str]:
        if robot_models_root is None:
            raise HTTPException(status_code=500, detail="Robot models root is not configured")

        low_bytes, low_suffix = _validate_model_upload(low_model_file, "Low quality model")
        high_bytes, high_suffix = _validate_model_upload(high_model_file, "High quality model")
        if low_suffix != high_suffix:
            raise HTTPException(status_code=400, detail="Low and high quality model files must use the same extension")

        stored_file_name = f"{_normalize_robot_id(type_id)}{low_suffix}"
        low_dir = robot_models_root / "LowRes"
        high_dir = robot_models_root / "HighRes"
        low_dir.mkdir(parents=True, exist_ok=True)
        high_dir.mkdir(parents=True, exist_ok=True)
        (low_dir / stored_file_name).write_bytes(low_bytes)
        (high_dir / stored_file_name).write_bytes(high_bytes)

        return {
            "file_name": stored_file_name,
            "path_to_quality_folders": DEFAULT_MODEL_QUALITY_BASE_PATH,
        }

    def _write_model_asset_payload(
        *,
        model: dict[str, Any],
        quality_id: str,
        payload: tuple[bytes, str] | None,
    ) -> None:
        if payload is None:
            return
        target_path = _build_model_asset_path(model, quality_id)
        if target_path is None:
            raise HTTPException(status_code=500, detail="Robot models root is not configured")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(payload[0])

    def _replace_robot_type_model_uploads(
        *,
        type_id: str,
        existing_model: dict[str, Any] | None,
        low_model_file: UploadFile | None,
        high_model_file: UploadFile | None,
    ) -> dict[str, str] | None:
        normalized_existing = normalize_model_block(existing_model, include_default_path=True)
        existing_file_name = normalize_text(normalized_existing.get("file_name"), "") if normalized_existing else ""
        existing_path = (
            normalize_text(normalized_existing.get("path_to_quality_folders"), DEFAULT_MODEL_QUALITY_BASE_PATH)
            if normalized_existing
            else DEFAULT_MODEL_QUALITY_BASE_PATH
        )
        current_suffix = Path(existing_file_name).suffix.lower() if existing_file_name else ""

        low_payload: tuple[bytes, str] | None = None
        high_payload: tuple[bytes, str] | None = None
        if low_model_file is not None:
            low_payload = _validate_model_upload(low_model_file, "Low quality model")
        if high_model_file is not None:
            high_payload = _validate_model_upload(high_model_file, "High quality model")
        if low_payload is None and high_payload is None:
            return normalize_model_block(existing_model)

        requested_suffixes = {payload[1] for payload in (low_payload, high_payload) if payload is not None}
        if len(requested_suffixes) > 1:
            raise HTTPException(status_code=400, detail="Replacement model uploads must use the same extension")
        next_suffix = next(iter(requested_suffixes), current_suffix)
        if not next_suffix:
            raise HTTPException(status_code=400, detail="Robot type has no existing model file to replace")

        if current_suffix and next_suffix != current_suffix and (low_payload is None or high_payload is None):
            raise HTTPException(
                status_code=400,
                detail="Change both low and high model files together when switching file extension",
            )

        next_file_name = f"{_normalize_robot_id(type_id)}{next_suffix}"
        next_model = {
            "file_name": next_file_name,
            "path_to_quality_folders": existing_path or DEFAULT_MODEL_QUALITY_BASE_PATH,
        }
        _write_model_asset_payload(model=next_model, quality_id="low", payload=low_payload)
        _write_model_asset_payload(model=next_model, quality_id="high", payload=high_payload)
        if normalized_existing and (
            existing_file_name != next_file_name
            or normalize_text(normalized_existing.get("path_to_quality_folders"), DEFAULT_MODEL_QUALITY_BASE_PATH)
            != normalize_text(next_model.get("path_to_quality_folders"), DEFAULT_MODEL_QUALITY_BASE_PATH)
        ):
            for quality_id in quality_folders:
                old_path = _build_model_asset_path(normalized_existing, quality_id)
                if old_path and old_path.exists():
                    old_path.unlink()
        return normalize_model_block(next_model)

    def _delete_managed_robot_type_model_files(type_id: str, model: dict[str, Any] | None) -> None:
        if robot_models_root is None or not isinstance(model, dict):
            return
        normalized_model = normalize_model_block(model, include_default_path=True)
        if not normalized_model:
            return
        file_name = normalize_text(normalized_model.get("file_name"), "")
        if not file_name:
            return
        if Path(file_name).stem != _normalize_robot_id(type_id):
            return
        for quality_id in quality_folders:
            target = _build_model_asset_path(normalized_model, quality_id)
            if target and target.exists():
                target.unlink()

    @router.get("/api/robot-types")
    def get_robot_types() -> list[dict[str, Any]]:
        return [
            {
                **entry,
                "model": _build_response_model(entry.get("model") if isinstance(entry.get("model"), dict) else None),
            }
            for entry in robot_types_by_id.values()
        ]

    def _default_tests_for_robot(robot: dict[str, Any]) -> dict[str, dict[str, str]]:
        robot_type = robot_types_by_id.get(normalize_type_key(robot.get("type")), {})
        test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []
        return _default_tests(test_entries if isinstance(test_entries, list) else [])

    def _build_static_robot_payload(robot: dict[str, Any]) -> dict[str, Any]:
        robot_id = normalize_text(robot.get("id"), "")
        return {
            "id": robot_id,
            "name": robot.get("name"),
            "type": robot.get("type"),
            "ip": robot.get("ip"),
            "ssh": robot.get("ssh") or {},
            "model": _build_response_model(robot.get("model") if isinstance(robot.get("model"), dict) else None),
            "tests": _default_tests_for_robot(robot),
        }

    def _build_robot_entry(
        *,
        robot_id: str,
        name: str,
        robot_type: dict[str, Any],
        robot_type_fallback: str,
        ip: str,
        username: str,
        password: str,
        model: dict[str, Any] | None,
        existing_robot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        existing_ssh = existing_robot.get("ssh") if isinstance(existing_robot, dict) and isinstance(existing_robot.get("ssh"), dict) else {}
        existing_port_raw = existing_ssh.get("port") if isinstance(existing_ssh, dict) else None
        try:
            existing_port = int(existing_port_raw)
        except Exception:
            existing_port = None
        robot_entry: dict[str, Any] = {
            "id": robot_id,
            "name": normalize_text(name),
            "type": normalize_text(robot_type.get("typeId", robot_type_fallback)),
            "ip": normalize_text(ip),
            "ssh": {
                "username": normalize_text(username),
                "password": normalize_text(password),
            },
        }
        if isinstance(existing_port, int) and existing_port > 0:
            robot_entry["ssh"]["port"] = existing_port
        normalized_model = normalize_model_block(model)
        if normalized_model:
            robot_entry["model"] = normalized_model
        return robot_entry

    def _robot_override_model_file_name(robot_id: str, suffix: str) -> str:
        return f"robots/{_normalize_robot_id(robot_id)}{suffix}"

    def _build_robot_override_model(
        *,
        robot_id: str,
        existing_model: dict[str, Any] | None,
        low_model_file: UploadFile | None,
        high_model_file: UploadFile | None,
    ) -> dict[str, str] | None:
        normalized_existing = normalize_model_block(existing_model, include_default_path=True)
        existing_file_name = normalize_text(normalized_existing.get("file_name"), "") if normalized_existing else ""
        current_suffix = Path(existing_file_name).suffix.lower() if existing_file_name else ""
        low_payload = _validate_model_upload(low_model_file, "Low quality model") if low_model_file is not None else None
        high_payload = _validate_model_upload(high_model_file, "High quality model") if high_model_file is not None else None
        if low_payload is None and high_payload is None:
            return normalize_model_block(existing_model)

        requested_suffixes = {payload[1] for payload in (low_payload, high_payload) if payload is not None}
        if len(requested_suffixes) > 1:
            raise HTTPException(status_code=400, detail="Low and high quality model files must use the same extension")
        next_suffix = next(iter(requested_suffixes), current_suffix)
        if not next_suffix:
            raise HTTPException(status_code=400, detail="Unable to determine override model file extension")

        next_file_name = _robot_override_model_file_name(robot_id, next_suffix)
        if robot_models_root is None:
            raise HTTPException(status_code=500, detail="Robot models root is not configured")
        low_dir = robot_models_root / "LowRes" / "robots"
        high_dir = robot_models_root / "HighRes" / "robots"
        low_dir.mkdir(parents=True, exist_ok=True)
        high_dir.mkdir(parents=True, exist_ok=True)
        if low_payload is not None:
            (low_dir / Path(next_file_name).name).write_bytes(low_payload[0])
        if high_payload is not None:
            (high_dir / Path(next_file_name).name).write_bytes(high_payload[0])
        if existing_file_name and existing_file_name != next_file_name and existing_file_name.startswith("robots/"):
            for folder in (low_dir, high_dir):
                old_path = folder / Path(existing_file_name).name
                if old_path.exists():
                    old_path.unlink()
        return normalize_model_block(
            {
                "file_name": next_file_name,
                "path_to_quality_folders": DEFAULT_MODEL_QUALITY_BASE_PATH,
            }
        )

    def _delete_managed_robot_override_files(model: dict[str, Any] | None) -> None:
        if robot_models_root is None or not isinstance(model, dict):
            return
        normalized_model = normalize_model_block(model, include_default_path=True)
        if not normalized_model:
            return
        file_name = normalize_text(normalized_model.get("file_name"), "")
        if not file_name.startswith("robots/"):
            return
        for folder in ("LowRes", "HighRes"):
            target = robot_models_root / folder / "robots" / Path(file_name).name
            if target.exists():
                target.unlink()

    @router.get("/api/fleet/static")
    def get_fleet_static() -> dict[str, Any]:
        return {"robots": [_build_static_robot_payload(robot) for robot in robots_by_id.values()]}

    @router.get("/api/fleet/runtime")
    def get_fleet_runtime(since: int = 0) -> dict[str, Any]:
        safe_since = max(0, int(since or 0))
        if runtime_snapshot_provider:
            snapshot = runtime_snapshot_provider(safe_since)
            if isinstance(snapshot, dict):
                version = int(snapshot.get("version") or 0)
                robots_payload = snapshot.get("robots") if isinstance(snapshot.get("robots"), list) else []
                return {
                    "version": version,
                    "full": bool(snapshot.get("full", safe_since <= 0)),
                    "robots": [
                        {
                            "id": normalize_text(robot_payload.get("id"), ""),
                            "version": int(robot_payload.get("version") or 0),
                            "tests": robot_payload.get("tests")
                            if isinstance(robot_payload.get("tests"), dict)
                            else {},
                            "activity": robot_payload.get("activity")
                            if isinstance(robot_payload.get("activity"), dict)
                            else {},
                        }
                        for robot_payload in robots_payload
                        if isinstance(robot_payload, dict) and normalize_text(robot_payload.get("id"), "")
                    ],
                }

        # Fallback for non-versioned providers.
        out: list[dict[str, Any]] = []
        for robot in robots_by_id.values():
            robot_id = normalize_text(robot.get("id"), "")
            if not robot_id:
                continue
            runtime_tests = runtime_tests_provider(robot_id) if runtime_tests_provider else {}
            runtime_activity = runtime_activity_provider(robot_id) if runtime_activity_provider else {}
            if isinstance(runtime_tests, dict) or isinstance(runtime_activity, dict):
                out.append(
                    {
                        "id": robot_id,
                        "version": 0,
                        "tests": runtime_tests if isinstance(runtime_tests, dict) else {},
                        "activity": runtime_activity if isinstance(runtime_activity, dict) else {},
                    }
                )
        return {
            "version": int(time.time() * 1000),
            "full": True,
            "robots": out,
        }

    @router.get("/api/robots")
    def get_robots() -> list[dict[str, Any]]:
        runtime_by_robot_id: dict[str, dict[str, Any]] = {}
        if runtime_snapshot_provider:
            snapshot = runtime_snapshot_provider(0)
            if isinstance(snapshot, dict):
                for payload in snapshot.get("robots") if isinstance(snapshot.get("robots"), list) else []:
                    if not isinstance(payload, dict):
                        continue
                    robot_id = normalize_text(payload.get("id"), "")
                    if not robot_id:
                        continue
                    runtime_by_robot_id[robot_id] = payload

        out = []
        for robot in robots_by_id.values():
            base_payload = _build_static_robot_payload(robot)
            robot_id = normalize_text(base_payload.get("id"), "")

            tests = dict(base_payload.get("tests") or {})
            activity = None
            runtime_payload = runtime_by_robot_id.get(robot_id, {})
            runtime_tests = runtime_payload.get("tests") if isinstance(runtime_payload, dict) else {}
            runtime_activity = runtime_payload.get("activity") if isinstance(runtime_payload, dict) else {}

            if not isinstance(runtime_tests, dict) and runtime_tests_provider and robot_id:
                runtime_tests = runtime_tests_provider(robot_id)
            if not isinstance(runtime_activity, dict) and runtime_activity_provider and robot_id:
                runtime_activity = runtime_activity_provider(robot_id)

            if isinstance(runtime_tests, dict):
                tests.update(runtime_tests)
            if isinstance(runtime_activity, dict):
                activity = runtime_activity

            out.append(
                {
                    **base_payload,
                    "tests": tests,
                    "activity": activity,
                }
            )
        return out

    @router.post("/api/robots", status_code=201)
    async def create_robot(
        name: str = Form(...),
        type: str = Form(...),
        ip: str = Form(...),
        username: str = Form(...),
        password: str = Form(...),
        provided_id: str | None = Form(default=None, alias="id"),
        low_model_file: UploadFile | None = File(default=None, alias="lowModelFile"),
        high_model_file: UploadFile | None = File(default=None, alias="highModelFile"),
    ) -> dict[str, Any]:
        robot_type_key = normalize_type_key(type)
        robot_type = robot_types_by_id.get(robot_type_key)
        if robot_type is None:
            raise HTTPException(status_code=400, detail="Invalid robot type")

        normalized_provided_id = normalize_text(provided_id, "")
        robot_id = normalized_provided_id or _generate_robot_id(normalize_text(name, "robot"))
        if robot_id in robots_by_id:
            if normalized_provided_id:
                raise HTTPException(status_code=409, detail="Robot id already exists")
            raise HTTPException(status_code=409, detail="Unable to generate unique robot id")

        model_payload = _build_robot_override_model(
            robot_id=robot_id,
            existing_model=None,
            low_model_file=low_model_file,
            high_model_file=high_model_file,
        )
        robot_entry = _build_robot_entry(
            robot_id=robot_id,
            name=normalize_text(name, ""),
            robot_type=robot_type,
            robot_type_fallback=normalize_text(type, ""),
            ip=normalize_text(ip, ""),
            username=normalize_text(username, ""),
            password=normalize_text(password, ""),
            model=model_payload,
        )

        robots_by_id[robot_id] = robot_entry
        _write_config()
        return {
            **robot_entry,
            "model": _build_response_model(robot_entry.get("model") if isinstance(robot_entry.get("model"), dict) else None),
        }

    @router.put("/api/robots/{robot_id}")
    async def update_robot(
        robot_id: str,
        name: str = Form(...),
        type: str = Form(...),
        ip: str = Form(...),
        username: str = Form(...),
        password: str = Form(...),
        clear_model_override: str | None = Form(default=None, alias="clearModelOverride"),
        low_model_file: UploadFile | None = File(default=None, alias="lowModelFile"),
        high_model_file: UploadFile | None = File(default=None, alias="highModelFile"),
    ) -> dict[str, Any]:
        target_id = normalize_text(robot_id, "")
        existing = robots_by_id.get(target_id)
        if existing is None:
            raise HTTPException(status_code=404, detail=f"Robot '{target_id}' not found")

        robot_type_key = normalize_type_key(type)
        robot_type = robot_types_by_id.get(robot_type_key)
        if robot_type is None:
            raise HTTPException(status_code=400, detail="Invalid robot type")

        should_clear_model_override = to_bool(clear_model_override) if clear_model_override is not None else False
        if should_clear_model_override and (low_model_file is not None or high_model_file is not None):
            raise HTTPException(
                status_code=400,
                detail="Choose either override removal or replacement uploads, not both",
            )

        existing_model = existing.get("model") if isinstance(existing.get("model"), dict) else None
        if should_clear_model_override:
            _delete_managed_robot_override_files(existing_model)
            model_payload = None
        else:
            model_payload = _build_robot_override_model(
                robot_id=target_id,
                existing_model=existing_model,
                low_model_file=low_model_file,
                high_model_file=high_model_file,
            )
            if model_payload is None and isinstance(existing.get("model"), dict):
                model_payload = existing.get("model")
        updated = _build_robot_entry(
            robot_id=target_id,
            name=normalize_text(name, ""),
            robot_type=robot_type,
            robot_type_fallback=normalize_text(type, ""),
            ip=normalize_text(ip, ""),
            username=normalize_text(username, ""),
            password=normalize_text(password, ""),
            model=model_payload,
            existing_robot=existing,
        )
        robots_by_id[target_id] = updated
        _write_config()
        return {
            **updated,
            "model": _build_response_model(updated.get("model") if isinstance(updated.get("model"), dict) else None),
        }

    @router.delete("/api/robots/{robot_id}")
    def delete_robot(robot_id: str) -> dict[str, Any]:
        target_id = normalize_text(robot_id, "")
        if target_id not in robots_by_id:
            raise HTTPException(status_code=404, detail=f"Robot '{target_id}' not found")
        removed = robots_by_id.pop(target_id, None)
        if isinstance(removed, dict):
            _delete_managed_robot_override_files(removed.get("model") if isinstance(removed.get("model"), dict) else None)
        _write_config()
        return {"ok": True, "id": target_id}

    @router.put("/api/robot-types/{type_id}")
    def update_robot_type(
        type_id: str,
        name: str = Form(...),
        topics: str | None = Form(default=None),
        battery_command: str | None = Form(default=None, alias="batteryCommand"),
        clear_model: str | None = Form(default=None, alias="clearModel"),
        low_model_file: UploadFile | None = File(default=None, alias="lowModelFile"),
        high_model_file: UploadFile | None = File(default=None, alias="highModelFile"),
    ) -> dict[str, Any]:
        if robot_types_config_path is None:
            raise HTTPException(status_code=500, detail="Robot types config path is not configured")

        target_id = normalize_text(type_id, "")
        target_key = normalize_type_key(target_id)
        existing = robot_types_by_id.get(target_key)
        if existing is None:
            raise HTTPException(status_code=404, detail=f"Robot type '{target_id}' not found")

        root_payload, entries = _load_robot_types_document()
        entry_index = next(
            (index for index, entry in enumerate(entries) if normalize_type_key(entry.get("id")) == target_key),
            -1,
        )
        if entry_index < 0:
            raise HTTPException(status_code=404, detail=f"Robot type '{target_id}' not found in config")

        raw_entry = dict(entries[entry_index])
        normalized_name = normalize_text(name, target_id)
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Display name is required")
        raw_entry["name"] = normalized_name
        if topics is not None:
            raw_entry["topics"] = _normalize_topics(topics)
        if battery_command is not None:
            normalized_battery_command = normalize_text(battery_command, "")
            auto_monitor = dict(raw_entry.get("autoMonitor")) if isinstance(raw_entry.get("autoMonitor"), dict) else {}
            if normalized_battery_command:
                auto_monitor["batteryCommand"] = normalized_battery_command
            else:
                auto_monitor.pop("batteryCommand", None)
            if auto_monitor:
                raw_entry["autoMonitor"] = auto_monitor
            else:
                raw_entry.pop("autoMonitor", None)
        existing_model = raw_entry.get("model") if isinstance(raw_entry.get("model"), dict) else existing.get("model")
        should_clear_model = to_bool(clear_model) if clear_model is not None else False
        if should_clear_model and (low_model_file is not None or high_model_file is not None):
            raise HTTPException(
                status_code=400,
                detail="Choose either class model removal or replacement uploads, not both",
            )
        if should_clear_model:
            _delete_managed_robot_type_model_files(target_id, existing_model if isinstance(existing_model, dict) else None)
            raw_entry.pop("model", None)
        else:
            next_model = _replace_robot_type_model_uploads(
                type_id=target_id,
                existing_model=existing_model,
                low_model_file=low_model_file,
                high_model_file=high_model_file,
            )
            if next_model:
                raw_entry["model"] = next_model
        entries[entry_index] = raw_entry
        _write_robot_types_config(root_payload, entries)

        normalized_entry = _build_normalized_robot_type_entry(raw_entry)
        robot_types_by_id[target_key] = normalized_entry
        return normalized_entry

    @router.delete("/api/robot-types/{type_id}")
    def delete_robot_type(type_id: str) -> dict[str, Any]:
        if robot_types_config_path is None:
            raise HTTPException(status_code=500, detail="Robot types config path is not configured")

        target_id = normalize_text(type_id, "")
        target_key = normalize_type_key(target_id)
        existing = robot_types_by_id.get(target_key)
        if existing is None:
            raise HTTPException(status_code=404, detail=f"Robot type '{target_id}' not found")

        assigned_robot_ids = [
            normalize_text(robot.get("id"), "")
            for robot in robots_by_id.values()
            if normalize_type_key(robot.get("type")) == target_key
        ]
        if assigned_robot_ids:
            raise HTTPException(
                status_code=409,
                detail=f"Robot type '{target_id}' is assigned to existing robots and cannot be deleted",
            )

        root_payload, entries = _load_robot_types_document()
        remaining_entries = [
            entry for entry in entries if normalize_type_key(entry.get("id")) != target_key
        ]
        _write_robot_types_config(root_payload, remaining_entries)
        _delete_managed_robot_type_model_files(target_id, existing.get("model") if isinstance(existing, dict) else None)
        robot_types_by_id.pop(target_key, None)
        return {"ok": True, "id": target_id}

    @router.post("/api/robot-types", status_code=201)
    def create_robot_type(
        name: str = Form(...),
        topics: str | None = Form(default=None),
        battery_command: str | None = Form(default=None, alias="batteryCommand"),
        requested_id: str | None = Form(default=None, alias="id"),
        low_model_file: UploadFile | None = File(default=None, alias="lowModelFile"),
        high_model_file: UploadFile | None = File(default=None, alias="highModelFile"),
    ) -> dict[str, Any]:
        if robot_types_config_path is None:
            raise HTTPException(status_code=500, detail="Robot types config path is not configured")

        normalized_requested_id = normalize_text(requested_id, "")
        normalized_name = normalize_text(name, "")
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Display name is required")
        type_id = normalized_requested_id or _generate_robot_type_id(normalized_name)
        type_key = normalize_type_key(type_id)
        if type_key in robot_types_by_id:
            raise HTTPException(status_code=409, detail=f"Robot type '{type_id}' already exists")

        model = _store_robot_type_model_uploads(
            type_id=type_id,
            low_model_file=low_model_file,
            high_model_file=high_model_file,
        )
        normalized_topics = _normalize_topics(topics)
        normalized_battery_command = normalize_text(battery_command, "")

        raw_entry: dict[str, Any] = {
            "id": type_id,
            "name": normalized_name,
            "testRefs": [],
            "fixRefs": [],
            "topics": normalized_topics,
            "model": model,
        }
        if normalized_battery_command:
            raw_entry["autoMonitor"] = {
                "batteryCommand": normalized_battery_command,
            }

        root_payload, entries = _load_robot_types_document()
        entries.append(raw_entry)
        _write_robot_types_config(root_payload, entries)

        normalized_entry = _build_normalized_robot_type_entry(raw_entry)
        robot_types_by_id[type_key] = normalized_entry
        return normalized_entry

    return router
