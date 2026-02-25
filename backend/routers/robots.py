from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, HTTPException

from ..schemas import RobotCreateRequest
from ..normalization import normalize_status, normalize_type_key
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
    runtime_tests_provider: Callable[[str], dict[str, dict[str, Any]]] | None = None,
    runtime_activity_provider: Callable[[str], dict[str, Any]] | None = None,
    runtime_snapshot_provider: Callable[[int], dict[str, Any]] | None = None,
) -> APIRouter:
    router = APIRouter()

    def _write_config() -> None:
        payload = {
            "version": "1.0",
            "robots": list(robots_by_id.values()),
        }
        robots_config_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

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

    @router.get("/api/robot-types")
    def get_robot_types() -> list[dict[str, Any]]:
        return list(robot_types_by_id.values())

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
            "modelUrl": robot.get("modelUrl"),
            "tests": _default_tests_for_robot(robot),
        }

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
    def create_robot(payload: RobotCreateRequest) -> dict[str, Any]:
        robot_type_key = normalize_type_key(payload.type)
        robot_type = robot_types_by_id.get(robot_type_key)
        if robot_type is None:
            raise HTTPException(status_code=400, detail="Invalid robot type")

        provided_id = normalize_text(payload.id, "")
        robot_id = provided_id or _generate_robot_id(normalize_text(payload.name, "robot"))
        if robot_id in robots_by_id:
            if provided_id:
                raise HTTPException(status_code=409, detail="Robot id already exists")
            raise HTTPException(status_code=409, detail="Unable to generate unique robot id")

        robot_entry: dict[str, Any] = {
            "id": robot_id,
            "name": normalize_text(payload.name),
            "type": normalize_text(robot_type.get("typeId", payload.type)),
            "ip": normalize_text(payload.ip),
            "ssh": {
                "username": normalize_text(payload.username),
                "password": normalize_text(payload.password),
            },
        }

        model_url = normalize_text(payload.modelUrl, "")
        if model_url:
            robot_entry["modelUrl"] = model_url

        robots_by_id[robot_id] = robot_entry
        _write_config()
        return robot_entry

    return router
