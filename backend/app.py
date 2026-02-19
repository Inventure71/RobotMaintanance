from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config_loader import (
    DEFAULT_ROBOT_TYPES_CONFIG_PATH,
    DEFAULT_ROBOTS_CONFIG_PATH,
    RobotCatalog,
)
from .routers import (
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

    catalog = RobotCatalog.load_from_paths(
        robots_path=config_path,
        robot_types_path=robot_types_path,
    )
    terminal_manager = TerminalManager(
        robots_by_id=catalog.robots_by_id,
        robot_types_by_id=catalog.robot_types_by_id,
        auto_monitor=True,
    )

    app = FastAPI(title="Robot Maintenance SSH API v2", version="2.1")
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

    @app.on_event("shutdown")
    def _on_shutdown() -> None:
        terminal_manager.close_all()

    return app


app = create_app()
