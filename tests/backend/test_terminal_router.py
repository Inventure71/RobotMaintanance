from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.routers.terminal import create_terminal_router


def test_terminal_stream_websocket_forwards_output_input_and_resize():
    class FakeManager:
        def __init__(self):
            self.connected = []
            self.inputs = []
            self.resizes = []
            self._chunks = ["robot@host:~$ "]

        def get_or_connect(self, page_session_id, robot_id):
            self.connected.append((page_session_id, robot_id))
            return object()

        def read_output(self, page_session_id, robot_id, max_chunks=100):
            _ = max_chunks
            self.connected.append((page_session_id, robot_id))
            if self._chunks:
                return self._chunks.pop(0)
            return ""

        def send_input(self, page_session_id, robot_id, text):
            self.inputs.append((page_session_id, robot_id, text))

        def resize_terminal(self, page_session_id, robot_id, width, height):
            self.resizes.append((page_session_id, robot_id, width, height))

    app = FastAPI()
    manager = FakeManager()
    app.include_router(create_terminal_router(manager))
    client = TestClient(app)

    with client.websocket_connect("/api/robots/r1/terminal/stream?pageSessionId=page-1") as ws:
        first = ws.receive_json()
        assert first["type"] == "output"
        assert first["data"] == "robot@host:~$ "

        ws.send_text(json.dumps({"type": "input", "data": "rostopic echo /battery\n"}))
        ws.send_text(json.dumps({"type": "resize", "cols": 140, "rows": 45}))
        ws.send_text(json.dumps({"type": "close"}))

    assert ("page-1", "r1", "rostopic echo /battery\n") in manager.inputs
    assert ("page-1", "r1", 140, 45) in manager.resizes


def test_terminal_stream_websocket_returns_error_when_connect_fails():
    class FakeManager:
        def get_or_connect(self, page_session_id, robot_id):
            raise HTTPException(status_code=502, detail=f"SSH connect failed for {robot_id}")

        def read_output(self, page_session_id, robot_id, max_chunks=100):
            _ = (page_session_id, robot_id, max_chunks)
            return ""

        def send_input(self, page_session_id, robot_id, text):
            _ = (page_session_id, robot_id, text)

        def resize_terminal(self, page_session_id, robot_id, width, height):
            _ = (page_session_id, robot_id, width, height)

    app = FastAPI()
    app.include_router(create_terminal_router(FakeManager()))
    client = TestClient(app)

    with client.websocket_connect("/api/robots/r1/terminal/stream?pageSessionId=page-1") as ws:
        payload = ws.receive_json()
        assert payload["type"] == "error"
        assert "SSH connect failed for r1" in payload["message"]


def test_terminal_command_passes_timeout_to_manager():
    class FakeManager:
        def __init__(self):
            self.calls = []

        def run_command(self, page_session_id, robot_id, command, timeout_sec=None, source=None):
            self.calls.append((page_session_id, robot_id, command, timeout_sec, source))
            return "ok"

    app = FastAPI()
    manager = FakeManager()
    app.include_router(create_terminal_router(manager))
    client = TestClient(app)

    response = client.post(
        "/api/robots/r1/terminal",
        json={
            "pageSessionId": "page-1",
            "command": "./flash_firmware.sh",
            "timeoutSec": 900,
        },
    )
    assert response.status_code == 200
    assert manager.calls == [("page-1", "r1", "./flash_firmware.sh", 900.0, None)]


def test_terminal_command_wraps_auto_fix_with_fix_run_markers():
    class FakeManager:
        def __init__(self):
            self.started = []
            self.finished = []
            self.calls = []

        def start_fix_run(self, robot_id):
            self.started.append(robot_id)

        def finish_fix_run(self, robot_id):
            self.finished.append(robot_id)

        def run_command(self, page_session_id, robot_id, command, timeout_sec=None, source=None):
            self.calls.append((page_session_id, robot_id, command, timeout_sec, source))
            return "ok"

    app = FastAPI()
    manager = FakeManager()
    app.include_router(create_terminal_router(manager))
    client = TestClient(app)

    response = client.post(
        "/api/robots/r1/terminal",
        json={
            "pageSessionId": "page-1",
            "command": "docker compose down",
            "source": "auto-fix",
        },
    )
    assert response.status_code == 200
    assert manager.started == ["r1"]
    assert manager.finished == ["r1"]
    assert manager.calls == [("page-1", "r1", "docker compose down", None, "auto-fix")]
