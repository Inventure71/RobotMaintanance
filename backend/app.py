from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config_loader import (
    DEFAULT_COMMAND_PRIMITIVES_DIR,
    DEFAULT_FIX_DEFINITIONS_DIR,
    DEFAULT_ROBOT_TYPES_CONFIG_PATH,
    DEFAULT_ROBOTS_CONFIG_PATH,
    DEFAULT_TEST_DEFINITIONS_DIR,
    PROJECT_ROOT,
    RobotCatalog,
)
from .definition_service import DefinitionService
from .routers import (
    create_bug_reports_router,
    create_definitions_router,
    create_fixes_router,
    create_health_router,
    create_monitor_router,
    create_robots_router,
    create_terminal_router,
    create_tests_router,
)
from .terminal_manager import TerminalManager


def create_app() -> FastAPI:
    config_path = Path(os.getenv("ROBOTS_CONFIG_PATH", str(DEFAULT_ROBOTS_CONFIG_PATH))).resolve()
    robot_types_path = Path(
        os.getenv("ROBOT_TYPES_CONFIG_PATH", str(DEFAULT_ROBOT_TYPES_CONFIG_PATH))
    ).resolve()
    command_primitives_dir = Path(
        os.getenv("COMMAND_PRIMITIVES_DIR", str(DEFAULT_COMMAND_PRIMITIVES_DIR))
    ).resolve()
    tests_dir = Path(
        os.getenv("TEST_DEFINITIONS_DIR", str(DEFAULT_TEST_DEFINITIONS_DIR))
    ).resolve()
    fixes_dir = Path(
        os.getenv("FIX_DEFINITIONS_DIR", str(DEFAULT_FIX_DEFINITIONS_DIR))
    ).resolve()
    logs_path = Path(os.getenv("BUG_REPORTS_DIR", str(PROJECT_ROOT / "logs"))).resolve()

    catalog = RobotCatalog.load_from_paths(
        robots_path=config_path,
        robot_types_path=robot_types_path,
        command_primitives_dir=command_primitives_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )
    terminal_manager = TerminalManager(
        robots_by_id=catalog.robots_by_id,
        robot_types_by_id=catalog.robot_types_by_id,
        command_primitives_by_id=catalog.command_primitives_by_id,
        test_definitions_by_id=catalog.test_definitions_by_id,
        check_definitions_by_id=catalog.check_definitions_by_id,
        fix_definitions_by_id=catalog.fix_definitions_by_id,
        auto_monitor=True,
    )
    definition_service = DefinitionService(
        terminal_manager=terminal_manager,
        robots_config_path=config_path,
        robot_types_config_path=robot_types_path,
        command_primitives_dir=command_primitives_dir,
        tests_dir=tests_dir,
        fixes_dir=fixes_dir,
    )

    app = FastAPI(title="Robot Maintenance SSH API v2", version="2.2")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(create_health_router())
    app.include_router(
        create_robots_router(
            catalog.robots_by_id,
            catalog.robot_types_by_id,
            config_path,
            runtime_tests_provider=terminal_manager.get_runtime_tests,
            runtime_activity_provider=terminal_manager.get_runtime_activity,
        )
    )
    app.include_router(create_monitor_router(terminal_manager))
    app.include_router(create_terminal_router(terminal_manager))
    app.include_router(create_tests_router(terminal_manager))
    app.include_router(create_fixes_router(terminal_manager))
    app.include_router(create_definitions_router(definition_service))
    app.include_router(create_bug_reports_router(logs_path))

    @app.on_event("shutdown")
    def _on_shutdown() -> None:
        terminal_manager.close_all()

    return app


app = create_app()
