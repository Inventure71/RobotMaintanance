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

    class FakeShell:
        def __init__(self, **_kwargs):
            pass

        def connect(self):
            connect_calls["count"] += 1

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

    first = manager.check_online("r1")
    second = manager.check_online("r1")
    third = manager.check_online("r1", force_refresh=True)

    assert first["status"] == "ok"
    assert first["source"] == "live"
    assert second["source"] == "cache"
    assert third["source"] == "live"
    assert connect_calls["count"] == 2


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
    observed = {"connect_timeout": None, "connect_calls": 0}

    class FakeShell:
        def __init__(self, **kwargs):
            observed["connect_timeout"] = kwargs.get("connect_timeout")

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


def test_terminal_manager_stream_helpers_use_existing_shell_handle():
    class FakeShell:
        def __init__(self):
            self.sent = []
            self.resize_calls = []
            self.read_calls = []

        def send(self, text):
            self.sent.append(text)

        def read(self, max_chunks=100):
            self.read_calls.append(max_chunks)
            return "stream output"

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
    output = manager.read_output("p1", "r1", max_chunks=12)
    manager.resize_terminal("p1", "r1", width=120, height=40)

    assert shell.sent == ["echo test\n"]
    assert output == "stream output"
    assert shell.read_calls == [12]
    assert shell.resize_calls == [(120, 40)]
    assert manager._handles[("p1", "r1")].last_used > 0.0
