"""Tests for SshTransportPool's circuit breaker with exponential backoff."""
from __future__ import annotations

import pytest

from backend.terminal_manager.transport_pool import (
    CircuitOpenError,
    SshTransportPool,
    _BACKOFF_SCHEDULE,
)


class _FakeTime:
    """Monotonic fake clock controllable from tests."""

    def __init__(self, start: float = 1000.0) -> None:
        self.now = float(start)

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += float(seconds)


class _FailingClientFactory:
    """Produces paramiko-like clients that always fail to connect."""

    def __init__(self, error: Exception | None = None) -> None:
        self._error = error or OSError("host unreachable")
        self.call_count = 0

    def __call__(self):  # matches paramiko.SSHClient() signature
        return _FakeFailingClient(self._error, on_connect=self._record)

    def _record(self) -> None:
        self.call_count += 1


class _FakeFailingClient:
    def __init__(self, error: Exception, *, on_connect) -> None:
        self._error = error
        self._on_connect = on_connect

    def set_missing_host_key_policy(self, _policy) -> None:
        return None

    def connect(self, **_kwargs) -> None:
        self._on_connect()
        raise self._error

    def close(self) -> None:
        return None

    def get_transport(self):
        return None


def _credentials() -> dict[str, object]:
    return {
        "host": "10.0.0.1",
        "username": "pi",
        "password": "secret",
        "port": 22,
        "connect_timeout_sec": 0.1,
    }


def test_circuit_breaker_opens_after_first_failure_with_initial_backoff():
    fake_time = _FakeTime()
    factory = _FailingClientFactory()
    pool = SshTransportPool(
        client_factory=factory,
        idle_ttl_sec=60.0,
        default_connect_timeout_sec=0.1,
        time_fn=fake_time,
    )

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())

    assert factory.call_count == 1

    with pytest.raises(CircuitOpenError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert factory.call_count == 1, "circuit breaker should block attempt"


def test_circuit_breaker_backoff_escalates_exponentially():
    fake_time = _FakeTime()
    factory = _FailingClientFactory()
    pool = SshTransportPool(
        client_factory=factory,
        idle_ttl_sec=60.0,
        default_connect_timeout_sec=0.1,
        time_fn=fake_time,
    )

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    fake_time.advance(_BACKOFF_SCHEDULE[0] + 0.01)

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert factory.call_count == 2

    with pytest.raises(CircuitOpenError):
        pool.acquire_client(robot_id="r1", **_credentials())

    fake_time.advance(_BACKOFF_SCHEDULE[1] + 0.01)

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert factory.call_count == 3

    fake_time.advance(_BACKOFF_SCHEDULE[2] + 0.01)
    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert factory.call_count == 4
    fake_time.advance(_BACKOFF_SCHEDULE[2] - 1.0)
    with pytest.raises(CircuitOpenError):
        pool.acquire_client(robot_id="r1", **_credentials())


def test_hard_reset_clears_circuit_breaker():
    fake_time = _FakeTime()
    factory = _FailingClientFactory()
    pool = SshTransportPool(
        client_factory=factory,
        idle_ttl_sec=60.0,
        default_connect_timeout_sec=0.1,
        time_fn=fake_time,
    )

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert pool.is_circuit_open("r1") is True

    pool.hard_reset_robot("r1")
    assert pool.is_circuit_open("r1") is False

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert factory.call_count == 2


def test_isolated_circuit_state_per_robot():
    fake_time = _FakeTime()
    factory = _FailingClientFactory()
    pool = SshTransportPool(
        client_factory=factory,
        idle_ttl_sec=60.0,
        default_connect_timeout_sec=0.1,
        time_fn=fake_time,
    )

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert pool.is_circuit_open("r1") is True
    assert pool.is_circuit_open("r2") is False


def test_successful_acquire_resets_failure_count():
    fake_time = _FakeTime()

    class _GoodClient:
        def __init__(self) -> None:
            self._active = True

        def set_missing_host_key_policy(self, _policy) -> None:
            return None

        def connect(self, **_kwargs) -> None:
            return None

        def close(self) -> None:
            self._active = False

        def get_transport(self):
            class _T:
                def __init__(self, outer):
                    self._outer = outer

                def is_active(self) -> bool:
                    return bool(self._outer._active)

            return _T(self)

    attempt = {"count": 0}

    def factory():
        attempt["count"] += 1
        if attempt["count"] == 1:
            class _Bad:
                def set_missing_host_key_policy(self, _p):
                    pass

                def connect(self, **_k):
                    raise OSError("boom")

                def close(self):
                    pass

                def get_transport(self):
                    return None

            return _Bad()
        return _GoodClient()

    pool = SshTransportPool(
        client_factory=factory,
        idle_ttl_sec=60.0,
        default_connect_timeout_sec=0.1,
        time_fn=fake_time,
    )

    with pytest.raises(OSError):
        pool.acquire_client(robot_id="r1", **_credentials())
    assert pool.is_circuit_open("r1") is True
    fake_time.advance(_BACKOFF_SCHEDULE[0] + 0.01)

    result = pool.acquire_client(robot_id="r1", **_credentials())
    assert result.reused is False
    assert pool.is_circuit_open("r1") is False
