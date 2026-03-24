from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.startup_config_validator import validate_runtime_config


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def test_validate_runtime_config_passes_for_minimal_valid_setup(tmp_path: Path):
    robots_path = tmp_path / "robots.config.json"
    robot_types_path = tmp_path / "robot-types.config.json"
    command_primitives_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"
    command_primitives_dir.mkdir()
    tests_dir.mkdir()
    fixes_dir.mkdir()

    _write_json(
        robots_path,
        {
            "version": "1.0",
            "robots": [
                {
                    "id": "r1",
                    "type": "type-a",
                    "ip": "10.0.0.1",
                    "ssh": {"username": "u", "password": "p", "port": 22},
                }
            ],
        },
    )
    _write_json(
        robot_types_path,
        {
            "version": "3.0",
            "robotTypes": [
                {
                    "id": "type-a",
                    "name": "Type A",
                    "testRefs": [],
                    "fixRefs": [],
                }
            ],
        },
    )

    summary = validate_runtime_config(
        robots_path=robots_path,
        robot_types_path=robot_types_path,
        command_primitives_dir=command_primitives_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )

    assert summary["robotCount"] == 1
    assert summary["robotTypeCount"] == 1


def test_validate_runtime_config_fails_when_robot_type_is_missing(tmp_path: Path):
    robots_path = tmp_path / "robots.config.json"
    robot_types_path = tmp_path / "robot-types.config.json"
    command_primitives_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"
    command_primitives_dir.mkdir()
    tests_dir.mkdir()
    fixes_dir.mkdir()

    _write_json(
        robots_path,
        {
            "version": "1.0",
            "robots": [
                {
                    "id": "r1",
                    "type": "type-a",
                    "ip": "10.0.0.1",
                    "ssh": {"username": "u", "password": "p"},
                }
            ],
        },
    )
    _write_json(
        robot_types_path,
        {
            "version": "3.0",
            "robotTypes": [
                {
                    "id": "type-b",
                    "name": "Type B",
                    "testRefs": [],
                    "fixRefs": [],
                }
            ],
        },
    )

    with pytest.raises(RuntimeError, match="references missing robot type"):
        validate_runtime_config(
            robots_path=robots_path,
            robot_types_path=robot_types_path,
            command_primitives_dir=command_primitives_dir,
            tests_dir=tests_dir,
            fixes_dir=fixes_dir,
        )


def test_validate_runtime_config_fails_when_required_file_is_missing(tmp_path: Path):
    robots_path = tmp_path / "robots.config.json"
    robot_types_path = tmp_path / "robot-types.config.json"
    command_primitives_dir = tmp_path / "command-primitives"
    tests_dir = tmp_path / "tests"
    fixes_dir = tmp_path / "fixes"
    command_primitives_dir.mkdir()
    tests_dir.mkdir()
    fixes_dir.mkdir()
    _write_json(robots_path, {"version": "1.0", "robots": []})

    with pytest.raises(RuntimeError, match="Missing required config file"):
        validate_runtime_config(
            robots_path=robots_path,
            robot_types_path=robot_types_path,
            command_primitives_dir=command_primitives_dir,
            tests_dir=tests_dir,
            fixes_dir=fixes_dir,
        )
