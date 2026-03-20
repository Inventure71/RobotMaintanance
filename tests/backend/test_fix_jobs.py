from __future__ import annotations

import threading
import time

import pytest

from backend.ssh_client import AutomationCommandResult
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
                        "runAtConnection": True,
                    }
                ],
                "autoFixes": [
                    {
                        "id": "demo_fix",
                        "enabled": True,
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
    observed = {"commands": [], "test_runs": 0, "test_ids": []}

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, sudo_password=None, source=None):
        _ = (page_session_id, robot_id, timeout_sec, sudo_password, source)
        observed["commands"].append(command)
        return AutomationCommandResult(
            output="ok",
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        _ = (robot_id, page_session_id, dry_run)
        observed["test_runs"] += 1
        observed["test_ids"].append(test_ids)
        selected_ids = test_ids or ["general"]
        return [
            {
                "id": selected_ids[0],
                "status": "ok",
                "value": "all_present",
                "details": "ok",
                "ms": 1,
                "steps": [],
            }
        ]

    monkeypatch.setattr(manager, "run_automation_command", fake_run_command)
    monkeypatch.setattr(manager, "run_tests", fake_run_tests)

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    assert started["status"] in {"queued", "running", "succeeded"}

    payload = _wait_for_terminal_status(manager, started["runId"])
    assert payload["status"] == "succeeded"
    assert observed["commands"] == ["echo ok"]
    assert observed["test_runs"] == 1
    assert observed["test_ids"] == [["general"]]
    assert payload["testRun"]["count"] == 1


def test_fix_job_runs_follow_up_step_after_flash_like_command(monkeypatch):
    manager = _manager()
    manager.robot_types_by_id["rosbot-2-pro"]["autoFixes"][0]["execute"] = [
        {"id": "flash", "command": "./flash_firmware.sh"},
        {"id": "docker_up", "command": "docker compose up -d"},
    ]
    observed = {"commands": []}

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, sudo_password=None, source=None):
        _ = (page_session_id, robot_id, timeout_sec, sudo_password, source)
        observed["commands"].append(command)
        output = "flash done" if command == "./flash_firmware.sh" else "stack up"
        return AutomationCommandResult(
            output=output,
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        _ = (robot_id, page_session_id, dry_run)
        selected_ids = test_ids or ["general"]
        return [
            {
                "id": selected_ids[0],
                "status": "ok",
                "value": "all_present",
                "details": "ok",
                "ms": 1,
                "steps": [],
            }
        ]

    monkeypatch.setattr(manager, "run_automation_command", fake_run_command)
    monkeypatch.setattr(manager, "run_tests", fake_run_tests)

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, started["runId"])

    assert payload["status"] == "succeeded"
    assert observed["commands"] == ["./flash_firmware.sh", "docker compose up -d"]


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

    def failing_run_command(*, page_session_id, robot_id, command, timeout_sec=None, sudo_password=None, source=None):
        _ = (page_session_id, robot_id, command, timeout_sec, sudo_password, source)
        raise RuntimeError("boom")

    monkeypatch.setattr(manager, "start_fix_run", wrapped_start)
    monkeypatch.setattr(manager, "finish_fix_run", wrapped_finish)
    monkeypatch.setattr(manager, "run_automation_command", failing_run_command)

    run = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, run["runId"])

    assert payload["status"] == "failed"
    assert started == ["r1"]
    assert finished == ["r1"]
    assert "r1" not in manager._active_fix_runs


def test_fix_job_fails_when_command_exit_code_is_non_zero(monkeypatch):
    manager = _manager()

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, sudo_password=None, source=None):
        _ = (page_session_id, robot_id, command, timeout_sec, sudo_password, source)
        return AutomationCommandResult(
            output="permission denied",
            exit_code=1,
            timed_out=False,
            used_sudo=True,
            sudo_authenticated=True,
        )

    monkeypatch.setattr(manager, "run_automation_command", fake_run_command)

    run = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, run["runId"])

    assert payload["status"] == "failed"
    assert "status 1" in str(payload.get("error") or "")


def test_fix_job_rejects_start_when_robot_is_busy():
    manager = _manager()
    manager.start_search_run("r1")
    with pytest.raises(Exception) as exc_info:
        manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    manager.finish_search_run("r1")
    assert getattr(exc_info.value, "status_code", None) == 409


def test_fix_job_cancels_connection_retry_before_start(monkeypatch):
    manager = _manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.2

    with manager._lock:
        manager._connection_retry_sessions["r1"] = {
            "token": 1,
            "connectedAt": time.time(),
            "cancelled": False,
        }
        manager._connection_retry_inflight["r1"] = 1

    closed_sessions: list[tuple[str, str]] = []
    original_close_session = manager.close_session

    def close_session(page_session_id: str, robot_id: str) -> None:
        closed_sessions.append((page_session_id, robot_id))
        original_close_session(page_session_id=page_session_id, robot_id=robot_id)

    monkeypatch.setattr(manager, "close_session", close_session)

    def release_retry() -> None:
        time.sleep(0.03)
        with manager._lock:
            manager._connection_retry_inflight.pop("r1", None)

    threading.Thread(target=release_retry, daemon=True).start()

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")

    assert started["status"] in {"queued", "running", "succeeded"}
    with manager._lock:
        assert manager._connection_retry_sessions["r1"]["cancelled"] is True
    assert closed_sessions == [(manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, "r1")]


def test_fix_job_cancels_auto_recovery_before_start(monkeypatch):
    manager = _manager()
    manager.CONNECTION_RETRY_MANUAL_TAKEOVER_WAIT_SEC = 0.2

    with manager._lock:
        manager._auto_recovery_test_inflight.add("r1")

    closed_sessions: list[tuple[str, str]] = []
    original_close_session = manager.close_session

    def close_session(page_session_id: str, robot_id: str) -> None:
        closed_sessions.append((page_session_id, robot_id))
        original_close_session(page_session_id=page_session_id, robot_id=robot_id)

    monkeypatch.setattr(manager, "close_session", close_session)

    def release_recovery() -> None:
        time.sleep(0.03)
        with manager._lock:
            manager._auto_recovery_test_inflight.discard("r1")

    threading.Thread(target=release_recovery, daemon=True).start()

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")

    assert started["status"] in {"queued", "running", "succeeded"}
    assert closed_sessions == [(manager.AUTO_MONITOR_TEST_PAGE_SESSION_ID, "r1")]


def test_fix_job_emits_post_test_events(monkeypatch):
    manager = _manager()

    def fake_run_command(*, page_session_id, robot_id, command, timeout_sec=None, sudo_password=None, source=None):
        _ = (page_session_id, robot_id, command, timeout_sec, sudo_password, source)
        return AutomationCommandResult(
            output="ok",
            exit_code=0,
            timed_out=False,
            used_sudo=False,
            sudo_authenticated=False,
        )

    def fake_run_tests(*, robot_id, page_session_id, test_ids=None, dry_run=False):
        _ = (robot_id, page_session_id, dry_run)
        selected_ids = test_ids or ["general"]
        return [
            {
                "id": selected_ids[0],
                "status": "ok",
                "value": "all_present",
                "details": "ok",
                "ms": 1,
                "steps": [],
            }
        ]

    monkeypatch.setattr(manager, "run_automation_command", fake_run_command)
    monkeypatch.setattr(manager, "run_tests", fake_run_tests)

    started = manager.start_fix_job(robot_id="r1", fix_id="demo_fix")
    payload = _wait_for_terminal_status(manager, started["runId"])

    assert payload["status"] == "succeeded"
    events = payload.get("events") if isinstance(payload.get("events"), list) else []
    event_types = [str(item.get("type")) for item in events if isinstance(item, dict)]
    assert "post_tests_started" in event_types
    assert "post_tests_finished" in event_types
