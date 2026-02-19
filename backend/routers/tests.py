from __future__ import annotations

import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from fastapi import APIRouter
from fastapi import HTTPException

from ..normalization import normalize_status, normalize_text
from ..schemas import OnlineBatchRequest, TestRunRequest
from ..terminal_manager import TerminalManager


def create_tests_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()
    DEFAULT_ONLINE_BATCH_PARALLELISM = 8
    MAX_ONLINE_BATCH_PARALLELISM = 100
    DEFAULT_ONLINE_BATCH_SAFE_PARALLELISM = 16
    ONLINE_BATCH_SAFE_PARALLELISM_ENV = "ROBOT_ONLINE_BATCH_MAX_PARALLELISM"

    def _online_batch_safe_parallelism_cap() -> int:
        raw = os.getenv(ONLINE_BATCH_SAFE_PARALLELISM_ENV, str(DEFAULT_ONLINE_BATCH_SAFE_PARALLELISM))
        try:
            parsed = int(raw)
        except Exception:
            parsed = DEFAULT_ONLINE_BATCH_SAFE_PARALLELISM
        return max(1, min(parsed, MAX_ONLINE_BATCH_PARALLELISM))

    @router.post("/api/robots/{robot_id}/tests/run")
    def run_robot_tests(robot_id: str, body: TestRunRequest) -> dict[str, Any]:
        page_session_id = (body.pageSessionId or f"test-{robot_id}-{uuid.uuid4().hex[:8]}").strip()
        started_at = time.time()
        normalized_test_ids = None
        if body.testIds:
            normalized_test_ids = [normalize_text(test_id, "") for test_id in body.testIds]
            normalized_test_ids = [test_id for test_id in normalized_test_ids if test_id]

        started_run = False
        if hasattr(terminal_manager, "start_test_run"):
            started_run = bool(
                terminal_manager.start_test_run(
                    robot_id=robot_id,
                    page_session_id=page_session_id,
                )
            )
            if not started_run:
                raise HTTPException(
                    status_code=409,
                    detail="A test run is already active for this robot/session.",
                )

        try:
            results = terminal_manager.run_tests(
                robot_id=robot_id,
                page_session_id=page_session_id,
                test_ids=normalized_test_ids or None,
                dry_run=body.dryRun,
            )
        finally:
            if started_run and hasattr(terminal_manager, "finish_test_run"):
                terminal_manager.finish_test_run(
                    robot_id=robot_id,
                    page_session_id=page_session_id,
                )
        finished_at = time.time()
        return {
            "ok": True,
            "robotId": robot_id,
            "runId": f"run-{int(started_at * 1000)}",
            "startedAt": started_at,
            "finishedAt": finished_at,
            "results": results,
        }

    @router.post("/api/robots/online-check")
    def run_online_check_batch(body: OnlineBatchRequest) -> dict[str, Any]:
        page_session_id = (body.pageSessionId or f"online-batch-{uuid.uuid4().hex[:8]}").strip()
        started_at = time.time()
        robot_ids = [normalize_text(robot_id, "") for robot_id in body.robotIds]
        robot_ids = [robot_id for robot_id in robot_ids if robot_id]
        deduped_ids = list(dict.fromkeys(robot_ids))

        def check_one_robot(robot_id: str) -> dict[str, Any]:
            started_search = False
            if hasattr(terminal_manager, "start_search_run"):
                terminal_manager.start_search_run(robot_id=robot_id)
                started_search = True
            try:
                result = terminal_manager.check_online(
                    robot_id=robot_id,
                    timeout_sec=body.timeoutSec,
                    force_refresh=body.forceRefresh,
                )
                return {
                    "robotId": robot_id,
                    "status": normalize_status(result.get("status")),
                    "value": normalize_text(result.get("value"), "unreachable"),
                    "details": normalize_text(result.get("details"), "No detail available"),
                    "ms": int(result.get("ms") or 0),
                    "checkedAt": float(result.get("checkedAt") or time.time()),
                    "source": normalize_text(result.get("source"), "live"),
                }
            except HTTPException as exc:
                return {
                    "robotId": robot_id,
                    "status": "error",
                    "value": "unreachable",
                    "details": normalize_text(exc.detail, "Online check failed"),
                    "ms": 0,
                    "checkedAt": time.time(),
                    "source": "live",
                }
            except Exception as exc:
                return {
                    "robotId": robot_id,
                    "status": "error",
                    "value": "unreachable",
                    "details": f"Online check failed: {exc}",
                    "ms": 0,
                    "checkedAt": time.time(),
                    "source": "live",
                }
            finally:
                if started_search and hasattr(terminal_manager, "finish_search_run"):
                    terminal_manager.finish_search_run(robot_id=robot_id)

        if not deduped_ids:
            results = []
        else:
            requested_parallelism = body.parallelism or DEFAULT_ONLINE_BATCH_PARALLELISM
            bounded_parallelism = max(1, min(int(requested_parallelism), MAX_ONLINE_BATCH_PARALLELISM))
            safe_parallelism_cap = _online_batch_safe_parallelism_cap()
            max_workers = min(bounded_parallelism, safe_parallelism_cap, len(deduped_ids))
            by_id: dict[str, dict[str, Any]] = {}
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_map = {executor.submit(check_one_robot, robot_id): robot_id for robot_id in deduped_ids}
                for future in as_completed(future_map):
                    robot_id = future_map[future]
                    try:
                        by_id[robot_id] = future.result()
                    except Exception as exc:
                        by_id[robot_id] = {
                            "robotId": robot_id,
                            "status": "error",
                            "value": "unreachable",
                            "details": f"Online check failed: {exc}",
                            "ms": 0,
                            "checkedAt": time.time(),
                            "source": "live",
                        }

            # Keep response order stable for clients.
            results = [by_id.get(robot_id) or check_one_robot(robot_id) for robot_id in deduped_ids]

        finished_at = time.time()
        return {
            "ok": True,
            "pageSessionId": page_session_id,
            "startedAt": started_at,
            "finishedAt": finished_at,
            "results": results,
        }

    return router
