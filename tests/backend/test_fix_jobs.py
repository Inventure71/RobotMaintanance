from __future__ import annotations

import time

import pytest

from backend.terminal_manager import TerminalManager


def _manager() -> TerminalManager:
    return TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={
            "rosbot-2-pro": {
                "typeId": "rosbot-2-pro",
                "tests": [
                    {
                        "id": "general",
                        "definitionId": "general_def",
                        "enabled": True,
                        "manualOnly": True,
                    }
                ],
                "autoFixes": [
                    {
                        "id": "demo_fix",
                        "enabled": True,
                        "params": {"postTestIds": ["general"]},
                        "execute": [{"id": "cmd", "command": "echo ok"}],
                    }
                ],
            }
        },
        test_definitions_by_id={
            "general_def": {
                "id": "general_def",
                "mode": "orchestrate",
                "execute": [{"id": "t1", "command": "echo ok", "saveAs": "out"}],
                "checks": [
                    {
                        "id": "general",
                        "read": {"kind": "contains_string", "inputRef": "out", "needle": "ok"},
                        "pass": {"status": "ok", "value": "ok", "details": "ok"},
                        "fail": {"status": "error", "value": "missing", "details": "missing"},
                    }
                ],
            }
        },
        check_definitions_by_id={
            "general": {"id": "general", "definitionId": "general_def"},
        },
        auto_monitor=False,
    )


def _wait_for_terminal_status(manager: TerminalManager, run_id: str, timeout_sec: float = 2.0) -> dict:
    started = time.time()
    while True:
        payload = manager.get_fix_job(robot_id="r1", run_id=run_id)
        if payload["status"] in {"succeeded", "failed", "cancelled"}:
            return payload
        if time.time() - started > timeout_sec:
            raise TimeoutError(f"Timed out waiting for run {run_id}")
        time.sleep(0.01)


def test_fix_job_succeeds_and_runs_post_tests_once(monkeypatch):
    manager = _manager()
    observed = {"commands": [], "test_runs": 0}

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, source=None):
        _ = (page_session_id, robot_id, timeout_sec, source)
        observed["commands"].append(command)
        return "ok"

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        _ = (robot_id, page_session_id, dry_run)
        observed["test_runs"] += 1
        return [
            {
                "id": test_ids[0],
                "status": "ok",
                "value": "all_present",
                "details": "ok",
                "ms": 1,
                "steps": [],
            }
        ]

    monkeypatch.setattr(manager, "run_command", fake_run_command)
    monkeypatch.setattr(manager, "run_tests", fake_run_tests)

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    assert started["status"] in {"queued", "running", "succeeded"}

    payload = _wait_for_terminal_status(manager, started["runId"])
    assert payload["status"] == "succeeded"
    assert observed["commands"] == ["echo ok"]
    assert observed["test_runs"] == 1
    assert payload["testRun"]["count"] == 1


def test_fix_job_failure_still_finishes_fix_run(monkeypatch):
    manager = _manager()

    started: list[str] = []
    finished: list[str] = []

    original_start = manager.start_fix_run
    original_finish = manager.finish_fix_run

    def wrapped_start(robot_id: str):
        started.append(robot_id)
        return original_start(robot_id)

    def wrapped_finish(robot_id: str):
        finished.append(robot_id)
        return original_finish(robot_id)

    def failing_run_command(*, page_session_id, robot_id, command, timeout_sec=None, source=None):
        _ = (page_session_id, robot_id, command, timeout_sec, source)
        raise RuntimeError("boom")

    monkeypatch.setattr(manager, "start_fix_run", wrapped_start)
    monkeypatch.setattr(manager, "finish_fix_run", wrapped_finish)
    monkeypatch.setattr(manager, "run_command", failing_run_command)

    run = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, run["runId"])

    assert payload["status"] == "failed"
    assert started == ["r1"]
    assert finished == ["r1"]
    assert "r1" not in manager._active_fix_runs


def test_fix_job_rejects_start_when_robot_is_busy():
    manager = _manager()
    manager.start_search_run("r1")
    with pytest.raises(Exception) as exc_info:
        manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    manager.finish_search_run("r1")
    assert getattr(exc_info.value, "status_code", None) == 409


def test_fix_job_emits_post_test_events(monkeypatch):
    manager = _manager()

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, source=None):
        _ = (page_session_id, robot_id, command, timeout_sec, source)
        return "ok"

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        _ = (robot_id, page_session_id, dry_run)
        return [
            {
                "id": test_ids[0],
                "status": "ok",
                "value": "all_present",
                "details": "ok",
                "ms": 1,
                "steps": [],
            }
        ]

    monkeypatch.setattr(manager, "run_command", fake_run_command)
    monkeypatch.setattr(manager, "run_tests", fake_run_tests)

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, started["runId"])

    assert payload["status"] == "succeeded"
    events = payload.get("events") if isinstance(payload.get("events"), list) else []
    event_types = [str(item.get("type")) for item in events if isinstance(item, dict)]
    assert "post_tests_started" in event_types
    assert "post_tests_finished" in event_types
