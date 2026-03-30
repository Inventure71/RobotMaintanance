from __future__ import annotations

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
                    {"id": "online", "enabled": True},
                    {"id": "general", "enabled": True},
                ],
            }
        },
        auto_monitor=False,
    )


def test_run_tests_offline_precheck_blocks_mixed_selection(monkeypatch):
    manager = _manager()
    execute_calls = {"count": 0}

    def fake_executor_run_tests(**_kwargs):
        execute_calls["count"] += 1
        return [{"id": "general", "status": "ok", "value": "ready", "details": "ok", "ms": 3, "steps": []}]

    monkeypatch.setattr(manager._executor, "run_tests", fake_executor_run_tests)
    monkeypatch.setattr(
        manager,
        "check_online",
        lambda **_kwargs: {
            "status": "error",
            "value": "unreachable",
            "details": "connect timeout",
            "ms": 7,
            "checkedAt": 111.0,
            "source": "live",
        },
    )

    results = manager.run_tests(
        robot_id="r1",
        page_session_id="page-1",
        test_ids=["online", "general"],
    )

    assert execute_calls["count"] == 0
    assert [result["id"] for result in results] == ["online", "general"]
    assert results[0]["status"] == "error"
    assert results[1]["status"] == "warning"
    assert results[1]["value"] == "skipped"
    assert results[1]["reason"] == "OFFLINE_PRECHECK"
    assert results[1]["skipped"] is True


def test_run_tests_offline_precheck_blocks_non_online_selection(monkeypatch):
    manager = _manager()
    execute_calls = {"count": 0}

    def fake_executor_run_tests(**_kwargs):
        execute_calls["count"] += 1
        return [{"id": "general", "status": "ok", "value": "ready", "details": "ok", "ms": 3, "steps": []}]

    monkeypatch.setattr(manager._executor, "run_tests", fake_executor_run_tests)
    monkeypatch.setattr(
        manager,
        "check_online",
        lambda **_kwargs: {
            "status": "error",
            "value": "unreachable",
            "details": "offline",
            "ms": 5,
            "checkedAt": 222.0,
            "source": "live",
        },
    )

    results = manager.run_tests(
        robot_id="r1",
        page_session_id="page-2",
        test_ids=["general"],
    )

    assert execute_calls["count"] == 0
    assert [result["id"] for result in results] == ["online", "general"]
    assert results[0]["status"] == "error"
    assert results[1]["value"] == "skipped"
    assert results[1]["reason"] == "OFFLINE_PRECHECK"


def test_run_tests_online_only_does_not_trigger_precheck(monkeypatch):
    manager = _manager()
    execute_calls = {"count": 0}
    check_calls = {"count": 0}

    def fake_executor_run_tests(**_kwargs):
        execute_calls["count"] += 1
        return [{"id": "online", "status": "ok", "value": "reachable", "details": "ok", "ms": 4, "steps": []}]

    def fake_check_online(**_kwargs):
        check_calls["count"] += 1
        return {"status": "ok", "value": "reachable", "details": "ok", "ms": 1, "checkedAt": 300.0, "source": "live"}

    monkeypatch.setattr(manager._executor, "run_tests", fake_executor_run_tests)
    monkeypatch.setattr(manager, "check_online", fake_check_online)

    results = manager.run_tests(
        robot_id="r1",
        page_session_id="page-3",
        test_ids=["online"],
    )

    assert execute_calls["count"] == 1
    assert check_calls["count"] == 0
    assert len(results) == 1
    assert results[0]["id"] == "online"
    assert results[0]["status"] == "ok"


def test_run_tests_online_precheck_allows_mixed_execution(monkeypatch):
    manager = _manager()
    execute_calls = {"count": 0}
    check_calls = {"count": 0}

    def fake_executor_run_tests(**_kwargs):
        execute_calls["count"] += 1
        return [{"id": "general", "status": "ok", "value": "ready", "details": "ok", "ms": 4, "steps": []}]

    def fake_check_online(**_kwargs):
        check_calls["count"] += 1
        return {
            "status": "ok",
            "value": "reachable",
            "details": "ssh up",
            "ms": 3,
            "checkedAt": 444.0,
            "source": "live",
        }

    monkeypatch.setattr(manager._executor, "run_tests", fake_executor_run_tests)
    monkeypatch.setattr(manager, "check_online", fake_check_online)

    results = manager.run_tests(
        robot_id="r1",
        page_session_id="page-4",
        test_ids=["general"],
    )

    assert check_calls["count"] == 1
    assert execute_calls["count"] == 1
    assert [result["id"] for result in results] == ["general"]
