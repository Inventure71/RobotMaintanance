from __future__ import annotations

from typing import Any, Literal

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


class FixRunRequest(BaseModel):
    pageSessionId: str | None = None
    params: dict[str, Any] | None = None


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


class DefinitionCheckReadSpec(BaseModel):
    kind: str = Field(min_length=1)
    inputRef: str | None = None
    needle: str | None = None
    needles: list[str] | None = None
    lines: list[str] | None = None
    requireAll: bool | None = None
    caseSensitive: bool | None = None


class DefinitionCheckResultSpec(BaseModel):
    status: str = Field(min_length=1)
    value: str = Field(min_length=1)
    details: str = Field(min_length=1)


class DefinitionCheckSpec(BaseModel):
    id: str = Field(min_length=1)
    label: str | None = None
    icon: str | None = None
    manualOnly: bool | None = None
    enabled: bool | None = None
    defaultStatus: str | None = None
    defaultValue: str | None = None
    defaultDetails: str | None = None
    possibleResults: list[dict[str, str]] | None = None
    params: dict[str, Any] | None = None
    read: DefinitionCheckReadSpec | None = None
    pass_result: DefinitionCheckResultSpec = Field(alias="pass")
    fail_result: DefinitionCheckResultSpec = Field(alias="fail")

    model_config = {
        "populate_by_name": True,
    }


class DefinitionExecuteStep(BaseModel):
    id: str | None = None
    command: str = Field(min_length=1)
    timeoutSec: Any | None = None
    retries: Any | None = None
    saveAs: str | None = None
    reuseKey: str | None = None


class TestDefinitionUpsertRequest(BaseModel):
    id: str = Field(min_length=1)
    label: str | None = None
    mode: Literal["orchestrate", "online_probe"] = "orchestrate"
    enabled: bool = True
    execute: list[DefinitionExecuteStep] | None = None
    checks: list[DefinitionCheckSpec] = Field(min_length=1)
    params: dict[str, Any] | None = None


class FixDefinitionUpsertRequest(BaseModel):
    id: str = Field(min_length=1)
    label: str | None = None
    description: str | None = None
    enabled: bool = True
    execute: list[DefinitionExecuteStep] = Field(min_length=1)
    postTestIds: list[str] | None = None
    params: dict[str, Any] | None = None


class PrimitiveUpsertRequest(BaseModel):
    id: str = Field(min_length=1)
    command: str = Field(min_length=1)
    timeoutSec: float | None = Field(default=None, ge=0.1, le=3600.0)
    retries: int | None = Field(default=None, ge=0, le=10)
    description: str | None = None


class RobotTypeMappingPatchRequest(BaseModel):
    testRefs: list[str] | None = None
    fixRefs: list[str] | None = None
