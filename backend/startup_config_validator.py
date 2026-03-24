from __future__ import annotations

import os
import sys
from pathlib import Path

from .config_loader import (
    DEFAULT_COMMAND_PRIMITIVES_DIR,
    DEFAULT_FIX_DEFINITIONS_DIR,
    DEFAULT_ROBOT_TYPES_CONFIG_PATH,
    DEFAULT_ROBOTS_CONFIG_PATH,
    DEFAULT_TEST_DEFINITIONS_DIR,
    RobotCatalog,
)
from .normalization import normalize_text, normalize_type_key


def _required_path(path: Path, *, kind: str) -> None:
    if kind == "file":
        if not path.exists() or not path.is_file():
            raise RuntimeError(f"Missing required config file: {path}")
        return
    if kind == "dir":
        if not path.exists() or not path.is_dir():
            raise RuntimeError(f"Missing required config directory: {path}")
        return
    raise RuntimeError(f"Unsupported required path kind '{kind}'")


def validate_runtime_config(
    *,
    robots_path: Path,
    robot_types_path: Path,
    command_primitives_dir: Path,
    tests_dir: Path,
    fixes_dir: Path,
) -> dict[str, int]:
    _required_path(robots_path, kind="file")
    _required_path(robot_types_path, kind="file")
    _required_path(command_primitives_dir, kind="dir")
    _required_path(tests_dir, kind="dir")
    _required_path(fixes_dir, kind="dir")

    catalog = RobotCatalog.load_from_paths(
        robots_path=robots_path,
        robot_types_path=robot_types_path,
        command_primitives_dir=command_primitives_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )

    errors: list[str] = []
    for robot_id, robot in catalog.robots_by_id.items():
        robot_type_key = normalize_type_key(robot.get("type"))
        if not robot_type_key:
            errors.append(f"Robot '{robot_id}' is missing type")
        elif robot_type_key not in catalog.robot_types_by_id:
            errors.append(f"Robot '{robot_id}' references missing robot type '{robot.get('type')}'")

        host = normalize_text(robot.get("ip"), "")
        if not host:
            errors.append(f"Robot '{robot_id}' is missing ip")

        ssh = robot.get("ssh") if isinstance(robot.get("ssh"), dict) else {}
        username = normalize_text(ssh.get("username"), "")
        password = normalize_text(ssh.get("password"), "")
        if not username or not password:
            errors.append(f"Robot '{robot_id}' is missing ssh username/password")

    if errors:
        raise RuntimeError("Runtime config validation failed:\n- " + "\n- ".join(errors))

    return {
        "robotCount": len(catalog.robots_by_id),
        "robotTypeCount": len(catalog.robot_types_by_id),
        "primitiveCount": len(catalog.command_primitives_by_id),
        "testDefinitionCount": len(catalog.test_definitions_by_id),
        "fixDefinitionCount": len(catalog.fix_definitions_by_id),
    }


def _resolve_paths_from_env() -> dict[str, Path]:
    return {
        "robots_path": Path(os.getenv("ROBOTS_CONFIG_PATH", str(DEFAULT_ROBOTS_CONFIG_PATH))).resolve(),
        "robot_types_path": Path(
            os.getenv("ROBOT_TYPES_CONFIG_PATH", str(DEFAULT_ROBOT_TYPES_CONFIG_PATH))
        ).resolve(),
        "command_primitives_dir": Path(
            os.getenv("COMMAND_PRIMITIVES_DIR", str(DEFAULT_COMMAND_PRIMITIVES_DIR))
        ).resolve(),
        "tests_dir": Path(
            os.getenv("TEST_DEFINITIONS_DIR", str(DEFAULT_TEST_DEFINITIONS_DIR))
        ).resolve(),
        "fixes_dir": Path(
            os.getenv("FIX_DEFINITIONS_DIR", str(DEFAULT_FIX_DEFINITIONS_DIR))
        ).resolve(),
    }


def main() -> int:
    try:
        summary = validate_runtime_config(**_resolve_paths_from_env())
    except Exception as exc:
        print(f"[startup-config] validation failed: {exc}", file=sys.stderr)
        return 1
    print(
        "[startup-config] validation passed: "
        f"robots={summary['robotCount']} "
        f"types={summary['robotTypeCount']} "
        f"primitives={summary['primitiveCount']} "
        f"tests={summary['testDefinitionCount']} "
        f"fixes={summary['fixDefinitionCount']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
