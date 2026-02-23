from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ..definition_service import DefinitionService
from ..schemas import (
    FixDefinitionUpsertRequest,
    MappingUpdateRequest,
    PrimitiveUpsertRequest,
    RobotTypeMappingPatchRequest,
    TestDefinitionUpsertRequest,
)


def create_definitions_router(definition_service: DefinitionService) -> APIRouter:
    router = APIRouter()

    @router.get("/api/definitions/summary")
    def get_definition_summary() -> dict[str, Any]:
        return definition_service.get_summary()

    @router.post("/api/definitions/reload")
    def reload_definitions() -> dict[str, Any]:
        return definition_service.reload()

    @router.post("/api/definitions/tests")
    def upsert_test_definition(body: TestDefinitionUpsertRequest) -> dict[str, Any]:
        payload = body.model_dump(by_alias=True, exclude_none=True)
        return definition_service.upsert_test(payload)

    @router.post("/api/definitions/fixes")
    def upsert_fix_definition(body: FixDefinitionUpsertRequest) -> dict[str, Any]:
        payload = body.model_dump(exclude_none=True)
        return definition_service.upsert_fix(payload)

    @router.post("/api/definitions/primitives")
    def upsert_command_primitive(body: PrimitiveUpsertRequest) -> dict[str, Any]:
        payload = body.model_dump(exclude_none=True)
        return definition_service.upsert_primitive(payload)

    @router.patch("/api/robot-types/{type_id}/mappings")
    def patch_robot_type_mappings(type_id: str, body: RobotTypeMappingPatchRequest) -> dict[str, Any]:
        return definition_service.patch_robot_type_mapping(
            type_id=type_id,
            test_refs=body.testRefs,
            fix_refs=body.fixRefs,
        )

    @router.delete("/api/definitions/tests/{test_id}")
    def delete_test_definition(test_id: str) -> dict[str, Any]:
        return definition_service.delete_test(test_id)

    @router.delete("/api/definitions/fixes/{fix_id}")
    def delete_fix_definition(fix_id: str) -> dict[str, Any]:
        return definition_service.delete_fix(fix_id)

    @router.put("/api/definitions/tests/{test_id}/mappings")
    def update_test_mappings(test_id: str, body: MappingUpdateRequest) -> dict[str, Any]:
        return definition_service.set_test_mappings(test_id, body.robotTypeIds)

    @router.put("/api/definitions/fixes/{fix_id}/mappings")
    def update_fix_mappings(fix_id: str, body: MappingUpdateRequest) -> dict[str, Any]:
        return definition_service.set_fix_mappings(fix_id, body.robotTypeIds)

    return router
