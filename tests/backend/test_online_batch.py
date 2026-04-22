from __future__ import annotations

import time

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.models import ShellHandle
from backend.routers.tests import create_tests_router
from backend.terminal_manager import TerminalManager
import backend.terminal_manager as tm_module


def test_check_online_uses_cache_and_force_refresh(monkeypatch):
    connect_calls = {"count": 0}

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    def fake_probe_transport(*, robot_id, connect_timeout_sec, queue_timeout_sec=None):
        _ = (robot_id, connect_timeout_sec, queue_timeout_sec)
        connect_calls["count"] += 1
        return type(
            "_Probe",
            (),
            {"reused": connect_calls["count"] > 1, "queue_ms": 0, "connect_ms": 1, "probe_ms": 1},
        )()

    monkeypatch.setattr(manager, "probe_transport", fake_probe_transport)

    first = manager.check_online("r1")
    second = manager.check_online("r1")
    third = manager.check_online("r1", force_refresh=True)

    assert first["status"] == "ok"
    assert first["source"] == "live"
    assert second["source"] == "cache"
    assert third["source"] == "live"
    assert connect_calls["count"] == 2


def test_runtime_metrics_reports_online_status_and_queue_depth():
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            },
            "r2": {
                "id": "r2",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.2",
                "ssh": {"username": "u", "password": "p", "port": 22},
            },
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )
    manager._record_runtime_tests(
        "r1",
        {"online": {"status": "ok", "value": "reachable", "details": "ok", "checkedAt": 10.0}},
    )
    manager._set_runtime_job_queue_snapshot(
        "r1",
        active_job={
            "id": "job-1",
            "kind": "test",
            "status": "running",
            "source": "manual",
            "label": "Run tests",
            "enqueuedAt": 1.0,
            "startedAt": 2.0,
            "updatedAt": 2.0,
        },
        queued_jobs=[
            {
                "id": "job-2",
                "kind": "fix",
                "status": "queued",
                "source": "manual",
                "label": "Run fix",
                "enqueuedAt": 3.0,
                "startedAt": 0.0,
                "updatedAt": 3.0,
            }
        ],
        last_completed_job=None,
        queue_version=2,
    )

    metrics = manager.get_runtime_metrics()

    assert metrics["robots"]["total"] == 2
    assert metrics["robots"]["online"] == 1
    assert metrics["jobs"]["queueDepth"] == 2
    queue_depths = {
        item["robotId"]: item["value"]
        for item in metrics["metrics"]["vigil_job_queue_depth"]
    }
    assert queue_depths == {"r1": 2, "r2": 0}


def test_runtime_snapshot_keeps_twenty_robot_results_isolated():
    robots = {
        f"r{i:02d}": {
            "id": f"r{i:02d}",
            "type": "rosbot-2-pro",
            "ip": f"10.0.0.{i}",
            "ssh": {"username": "u", "password": "p", "port": 22},
        }
        for i in range(20)
    }
    manager = TerminalManager(
        robots_by_id=robots,
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    for i, robot_id in enumerate(robots):
        status = "ok" if i % 2 == 0 else "error"
        manager._record_runtime_tests(
            robot_id,
            {
                "online": {
                    "status": status,
                    "value": "reachable" if status == "ok" else "unreachable",
                    "details": f"{robot_id} status",
                    "checkedAt": 100.0 + i,
                    "source": "manual",
                },
                "custom_check": {
                    "status": status,
                    "value": f"value-{robot_id}",
                    "details": f"details-{robot_id}",
                    "checkedAt": 100.0 + i,
                    "source": "manual",
                },
            },
        )

    snapshot = manager.get_runtime_snapshot_since(0)
    by_robot = {robot["id"]: robot for robot in snapshot["robots"]}

    assert len(by_robot) == 20
    for i in range(20):
        robot_id = f"r{i:02d}"
        expected_status = "ok" if i % 2 == 0 else "error"
        assert by_robot[robot_id]["tests"]["online"]["status"] == expected_status
        assert by_robot[robot_id]["tests"]["custom_check"]["value"] == f"value-{robot_id}"
        assert by_robot[robot_id]["tests"]["custom_check"]["details"] == f"details-{robot_id}"

    metrics = manager.get_runtime_metrics()
    assert metrics["robots"]["total"] == 20
    assert metrics["robots"]["online"] == 10
    assert metrics["robots"]["offline"] == 10


def test_online_batch_endpoint_returns_mixed_results():
    class FakeManager:
        def run_tests(self, *_args, **_kwargs):  # pragma: no cover - not used here
            return []

        def check_online(self, robot_id, timeout_sec=None, force_refresh=False):
            _ = timeout_sec
            _ = force_refresh
            if robot_id == "r1":
                return {
                    "status": "ok",
                    "value": "reachable",
                    "details": "SSH connected and authenticated on 10.0.0.1:22.",
                    "ms": 12,
                    "checkedAt": 100.0,
                    "source": "live",
                }
            raise HTTPException(status_code=404, detail=f"Unknown robot id: {robot_id}")

    app = FastAPI()
    app.include_router(create_tests_router(FakeManager()))
    client = TestClient(app)

    response = client.post(
        "/api/robots/online-check",
        json={
            "robotIds": ["r1", "missing"],
            "pageSessionId": "page-abc",
            "forceRefresh": False,
            "timeoutSec": 2.5,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["pageSessionId"] == "page-abc"
    assert len(payload["results"]) == 2
    assert payload["results"][0]["robotId"] == "r1"
    assert payload["results"][0]["status"] == "ok"
    assert payload["results"][1]["robotId"] == "missing"
    assert payload["results"][1]["status"] == "error"


def test_get_or_connect_uses_terminal_connect_timeout(monkeypatch):
    observed = {"connect_timeout": None, "initial_directory": None, "connect_calls": 0}

    class FakeShell:
        def __init__(self, **kwargs):
            observed["connect_timeout"] = kwargs.get("connect_timeout")
            observed["initial_directory"] = kwargs.get("initial_directory")

        def connect(self):
            observed["connect_calls"] += 1

        def close(self):
            return None

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    shell = manager.get_or_connect(page_session_id="p1", robot_id="r1")

    assert shell is not None
    assert observed["connect_calls"] == 1
    assert observed["connect_timeout"] == TerminalManager.TERMINAL_CONNECT_TIMEOUT_SEC
    assert observed["initial_directory"] == "~"


def test_get_or_connect_uses_robot_configured_initial_directory(monkeypatch):
    observed = {"initial_directory": None}

    class FakeShell:
        def __init__(self, **kwargs):
            observed["initial_directory"] = kwargs.get("initial_directory")

        def connect(self):
            return None

        def close(self):
            return None

    monkeypatch.setattr(tm_module, "InteractiveShell", FakeShell)

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {
                    "username": "u",
                    "password": "p",
                    "port": 22,
                    "cwd": "/home/u/ros2_ws",
                },
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    manager.get_or_connect(page_session_id="p1", robot_id="r1")

    assert observed["initial_directory"] == "/home/u/ros2_ws"


def test_create_automation_run_context_uses_same_initial_directory_policy():
    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {
                    "username": "u",
                    "password": "p",
                    "port": 22,
                    "cwd": "/home/u/ros2_ws",
                },
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    run_context = manager.create_automation_run_context(
        robot_id="r1",
        page_session_id="p1",
        run_kind="test",
    )
    try:
        assert run_context._initial_directory == "/home/u/ros2_ws"
    finally:
        run_context.close()


def test_terminal_manager_stream_helpers_use_existing_shell_handle():
    class FakeShell:
        def __init__(self):
            self.sent = []
            self.resize_calls = []
            self.read_calls = []
            self.run_calls = []

        def send(self, text):
            self.sent.append(text)

        def read(self, max_chunks=100, wait_timeout=0.0):
            self.read_calls.append((max_chunks, wait_timeout))
            return "stream output"

        def run_command(self, command, timeout=0.0):
            self.run_calls.append((command, timeout))
            return "ok"

        def resize_pty(self, width, height):
            self.resize_calls.append((width, height))

        def close(self):
            return None

    manager = TerminalManager(
        robots_by_id={
            "r1": {
                "id": "r1",
                "type": "rosbot-2-pro",
                "ip": "10.0.0.1",
                "ssh": {"username": "u", "password": "p", "port": 22},
            }
        },
        robot_types_by_id={"rosbot-2-pro": {"typeId": "rosbot-2-pro", "tests": []}},
    )

    shell = FakeShell()
    manager._handles[("p1", "r1")] = ShellHandle(shell=shell, last_used=time.time())

    manager.send_input("p1", "r1", "echo test\n")
    output = manager.read_output("p1", "r1", max_chunks=12, wait_timeout_sec=0.4)
    manager.resize_terminal("p1", "r1", width=120, height=40)
    manager.run_command("p1", "r1", "echo hi", timeout_sec=9999.0)
    manager.run_command("p1", "r1", "echo low", timeout_sec=0.01)

    assert shell.sent == ["echo test\n"]
    assert output == "stream output"
    assert shell.read_calls == [(12, 0.4)]
    assert shell.resize_calls == [(120, 40)]
    assert shell.run_calls[0][1] == manager.COMMAND_MAX_TIMEOUT_SEC
    assert shell.run_calls[1][1] == manager.COMMAND_MIN_TIMEOUT_SEC
    assert manager._handles[("p1", "r1")].last_used > 0.0
