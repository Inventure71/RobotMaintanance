from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.monitor import create_monitor_router


def test_monitor_config_get_and_patch():
    class FakeManager:
        def __init__(self):
            self._config = {
                "mode": "online_battery",
                "topicsIntervalSec": 30.0,
                "onlineIntervalSec": 1.0,
                "batteryIntervalSec": 1.0,
                "parallelism": 8,
            }

        def get_monitor_config(self):
            return dict(self._config)

        def update_monitor_config(self, **kwargs):
            mode = kwargs.get("mode")
            if mode:
                self._config["mode"] = mode
            topics_interval = kwargs.get("topics_interval_sec")
            if topics_interval is not None:
                self._config["topicsIntervalSec"] = float(topics_interval)
            parallelism = kwargs.get("parallelism")
            if parallelism is not None:
                self._config["parallelism"] = int(parallelism)
            return dict(self._config)

    app = FastAPI()
    app.include_router(create_monitor_router(FakeManager()))
    client = TestClient(app)

    get_response = client.get("/api/monitor/config")
    assert get_response.status_code == 200
    assert get_response.json()["mode"] == "online_battery"
    assert get_response.json()["topicsIntervalSec"] == 30.0
    assert get_response.json()["parallelism"] == 8

    patch_response = client.patch(
        "/api/monitor/config",
        json={"mode": "online_battery_topics", "topicsIntervalSec": 45, "parallelism": 12},
    )
    assert patch_response.status_code == 200
    payload = patch_response.json()
    assert payload["mode"] == "online_battery_topics"
    assert payload["topicsIntervalSec"] == 45.0
    assert payload["parallelism"] == 12


def test_monitor_config_patch_validates_payload():
    class FakeManager:
        def get_monitor_config(self):
            return {
                "mode": "online_battery",
                "topicsIntervalSec": 30.0,
                "onlineIntervalSec": 1.0,
                "batteryIntervalSec": 1.0,
                "parallelism": 8,
            }

        def update_monitor_config(self, **_kwargs):
            return self.get_monitor_config()

    app = FastAPI()
    app.include_router(create_monitor_router(FakeManager()))
    client = TestClient(app)

    invalid_mode_response = client.patch(
        "/api/monitor/config",
        json={"mode": "bad_mode"},
    )
    assert invalid_mode_response.status_code == 422

    invalid_interval_response = client.patch(
        "/api/monitor/config",
        json={"topicsIntervalSec": 2},
    )
    assert invalid_interval_response.status_code == 422
