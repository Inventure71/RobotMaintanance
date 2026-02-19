from __future__ import annotations

from fastapi import APIRouter

from ..schemas import MonitorConfigRequest, MonitorConfigResponse
from ..terminal_manager import TerminalManager


def create_monitor_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()

    @router.get("/api/monitor/config", response_model=MonitorConfigResponse)
    def get_monitor_config() -> MonitorConfigResponse:
        config = terminal_manager.get_monitor_config()
        return MonitorConfigResponse(
            mode=config["mode"],
            topicsIntervalSec=float(config["topicsIntervalSec"]),
            onlineIntervalSec=float(config["onlineIntervalSec"]),
            batteryIntervalSec=float(config["batteryIntervalSec"]),
            parallelism=int(config["parallelism"]),
        )

    @router.patch("/api/monitor/config", response_model=MonitorConfigResponse)
    def update_monitor_config(body: MonitorConfigRequest) -> MonitorConfigResponse:
        config = terminal_manager.update_monitor_config(
            mode=body.mode,
            topics_interval_sec=body.topicsIntervalSec,
            online_interval_sec=body.onlineIntervalSec,
            battery_interval_sec=body.batteryIntervalSec,
            parallelism=body.parallelism,
        )
        return MonitorConfigResponse(
            mode=config["mode"],
            topicsIntervalSec=float(config["topicsIntervalSec"]),
            onlineIntervalSec=float(config["onlineIntervalSec"]),
            batteryIntervalSec=float(config["batteryIntervalSec"]),
            parallelism=int(config["parallelism"]),
        )

    return router
