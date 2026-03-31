from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..normalization import normalize_text


class FixRunnerMixin:
    def _resolve_fix_spec(self, robot_id: str, fix_id: str) -> dict[str, Any]:
        robot_type = self._resolve_robot_type(robot_id)
        fixes = robot_type.get("autoFixes") if isinstance(robot_type, dict) else []
        if not isinstance(fixes, list):
            raise HTTPException(status_code=404, detail=f"Fix '{fix_id}' is not configured for this robot type.")

        normalized_fix_id = normalize_text(fix_id, "")
        for fix in fixes:
            if not isinstance(fix, dict):
                continue
            candidate_id = normalize_text(fix.get("id"), "")
            if candidate_id == normalized_fix_id:
                if fix.get("enabled", True) is False:
                    raise HTTPException(status_code=400, detail=f"Fix '{fix_id}' is disabled.")
                return fix

        raise HTTPException(status_code=404, detail=f"Fix '{fix_id}' is not configured for this robot type.")

    def _default_fix_test_ids(self, robot_id: str) -> list[str]:
        robot_type = self._resolve_robot_type(robot_id)
        tests = robot_type.get("tests") if isinstance(robot_type, dict) else []
        if not isinstance(tests, list):
            return []
        return [
            normalize_text(test.get("id"), "")
            for test in tests
            if (
                isinstance(test, dict)
                and test.get("enabled", True) is not False
                and normalize_text(test.get("id"), "")
            )
        ]
