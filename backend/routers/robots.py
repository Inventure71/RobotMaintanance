from __future__ import annotations

import json
import re
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

    @router.get("/api/robots")
    def get_robots() -> list[dict[str, Any]]:
        out = []
        for robot in robots_by_id.values():
            robot_id = normalize_text(robot.get("id"), "")
            robot_type = robot_types_by_id.get(normalize_type_key(robot.get("type")), {})
            test_entries = robot_type.get("tests") if isinstance(robot_type, dict) else []
            tests = _default_tests(test_entries if isinstance(test_entries, list) else [])
            if runtime_tests_provider and robot_id:
                runtime_tests = runtime_tests_provider(robot_id)
                if isinstance(runtime_tests, dict):
                    tests = {**tests, **runtime_tests}
            activity = None
            if runtime_activity_provider and robot_id:
                runtime_activity = runtime_activity_provider(robot_id)
                if isinstance(runtime_activity, dict):
                    activity = runtime_activity
            out.append(
                {
                    "id": robot_id,
                    "name": robot.get("name"),
                    "type": robot.get("type"),
                    "ip": robot.get("ip"),
                    "ssh": robot.get("ssh") or {},
                    "modelUrl": robot.get("modelUrl"),
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
