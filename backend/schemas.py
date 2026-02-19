from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RobotCreateRequest(BaseModel):
    id: str | None = Field(default=None, min_length=1)
    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    ip: str = Field(min_length=1)
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    modelUrl: str | None = None


class CommandRequest(BaseModel):
    command: str = Field(min_length=1)
    pageSessionId: str | None = None
    robotId: str | None = None
    commandId: str | None = None
    source: str | None = None
    timeoutSec: float | None = Field(default=None, ge=0.5, le=3600.0)


class SessionRequest(BaseModel):
    pageSessionId: str = Field(min_length=1)


class TestRunRequest(BaseModel):
    pageSessionId: str | None = None
    testIds: list[str] | None = None
    dryRun: bool = False


class OnlineBatchRequest(BaseModel):
    robotIds: list[str] = Field(min_length=1)
    pageSessionId: str | None = None
    forceRefresh: bool = False
    timeoutSec: float | None = None
    parallelism: int | None = Field(default=None, ge=1, le=100)


class MonitorConfigRequest(BaseModel):
    mode: Literal["online_battery", "online_battery_topics"] | None = None
    topicsIntervalSec: float | None = Field(default=None, ge=5.0, le=300.0)
    onlineIntervalSec: float | None = Field(default=None, ge=0.5, le=60.0)
    batteryIntervalSec: float | None = Field(default=None, ge=0.5, le=60.0)
    parallelism: int | None = Field(default=None, ge=1, le=100)


class MonitorConfigResponse(BaseModel):
    mode: Literal["online_battery", "online_battery_topics"]
    topicsIntervalSec: float
    onlineIntervalSec: float
    batteryIntervalSec: float
    parallelism: int


class BugReportRequest(BaseModel):
    message: str = Field(min_length=1)


class BugReportResponse(BaseModel):
    ok: bool
    fileName: str
    path: str
