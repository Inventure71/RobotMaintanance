from __future__ import annotations

import importlib

from fastapi.testclient import TestClient

from backend.app import create_app

app_module = importlib.import_module("backend.app")


def test_create_app_registers_gzip_middleware() -> None:
    app = create_app()
    middleware_classes = [entry.cls.__name__ for entry in app.user_middleware]
    assert "GZipMiddleware" in middleware_classes


def test_create_app_defers_auto_monitor_start_until_startup(monkeypatch) -> None:
    started: list[str] = []

    def fake_start(self) -> None:
        started.append("started")

    monkeypatch.setattr(app_module.TerminalManager, "_start_auto_monitor", fake_start)

    app = create_app()
    assert started == []

    with TestClient(app):
        assert started == ["started"]
