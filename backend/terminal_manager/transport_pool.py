from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Callable

import paramiko

from ..ssh_client import ShellClient


@dataclass
class _TransportEntry:
    client: ShellClient
    last_used: float


@dataclass
class TransportAcquireResult:
    client: ShellClient
    reused: bool
    queue_ms: int
    connect_ms: int


@dataclass
class TransportProbeResult:
    reused: bool
    queue_ms: int
    connect_ms: int
    probe_ms: int


class SshTransportPool:
    def __init__(
        self,
        *,
        client_factory: Callable[[], ShellClient] = paramiko.SSHClient,
        idle_ttl_sec: float = 300.0,
        default_connect_timeout_sec: float = 10.0,
        max_failures_before_reset: int = 2,
        time_fn: Callable[[], float] = time.time,
    ):
        self._client_factory = client_factory
        self._idle_ttl_sec = max(1.0, float(idle_ttl_sec))
        self._default_connect_timeout_sec = max(0.1, float(default_connect_timeout_sec))
        self._max_failures_before_reset = max(1, int(max_failures_before_reset))
        self._time = time_fn

        self._lock = threading.Lock()
        self._entries: dict[str, _TransportEntry] = {}
        self._robot_locks: dict[str, threading.Lock] = {}
        self._failure_streaks: dict[str, int] = {}

    def _get_robot_lock(self, robot_id: str) -> threading.Lock:
        with self._lock:
            lock = self._robot_locks.get(robot_id)
            if lock is None:
                lock = threading.Lock()
                self._robot_locks[robot_id] = lock
            return lock

    def _transport_is_active(self, client: ShellClient) -> bool:
        get_transport = getattr(client, "get_transport", None)
        if not callable(get_transport):
            return False
        try:
            transport = get_transport()
        except Exception:
            return False
        if transport is None:
            return False
        is_active = getattr(transport, "is_active", None)
        if not callable(is_active):
            return False
        try:
            return bool(is_active())
        except Exception:
            return False

    @staticmethod
    def _close_client_quietly(client: ShellClient | None) -> None:
        if client is None:
            return
        try:
            client.close()
        except Exception:
            pass

    def _evict_idle_locked(self, now: float) -> None:
        to_evict: list[str] = []
        for robot_id, entry in self._entries.items():
            if (now - float(entry.last_used)) > self._idle_ttl_sec:
                to_evict.append(robot_id)
        for robot_id in to_evict:
            entry = self._entries.pop(robot_id, None)
            if entry is not None:
                self._close_client_quietly(entry.client)

    def _invalidate_locked(self, robot_id: str) -> None:
        entry = self._entries.pop(robot_id, None)
        if entry is not None:
            self._close_client_quietly(entry.client)

    def hard_reset_robot(self, robot_id: str) -> None:
        with self._lock:
            self._invalidate_locked(robot_id)
            self._failure_streaks[robot_id] = 0

    def _connect_client(
        self,
        *,
        host: str,
        username: str,
        password: str,
        port: int,
        connect_timeout_sec: float,
    ) -> ShellClient:
        client = self._client_factory()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs = {
            "hostname": host,
            "port": int(port),
            "username": username,
            "password": password,
            "timeout": connect_timeout_sec,
            "banner_timeout": connect_timeout_sec,
            "auth_timeout": connect_timeout_sec,
            "channel_timeout": connect_timeout_sec,
            "allow_agent": False,
            "look_for_keys": False,
        }
        try:
            client.connect(**connect_kwargs)
        except TypeError:
            connect_kwargs.pop("channel_timeout", None)
            client.connect(**connect_kwargs)
        return client

    def acquire_client(
        self,
        *,
        robot_id: str,
        host: str,
        username: str,
        password: str,
        port: int,
        connect_timeout_sec: float | None = None,
        queue_timeout_sec: float | None = None,
    ) -> TransportAcquireResult:
        timeout = (
            self._default_connect_timeout_sec
            if connect_timeout_sec is None
            else max(0.1, float(connect_timeout_sec))
        )
        queue_timeout = None if queue_timeout_sec is None else max(0.0, float(queue_timeout_sec))

        queue_started = self._time()
        lock = self._get_robot_lock(robot_id)
        if queue_timeout is None:
            acquired = lock.acquire()
        else:
            acquired = lock.acquire(timeout=queue_timeout)
        if not acquired:
            raise TimeoutError(f"queue_timeout while waiting for robot '{robot_id}' transport lock")

        queue_ms = max(0, int((self._time() - queue_started) * 1000))
        try:
            now = self._time()
            with self._lock:
                self._evict_idle_locked(now)
                entry = self._entries.get(robot_id)

            if entry is not None and self._transport_is_active(entry.client):
                with self._lock:
                    fresh_entry = self._entries.get(robot_id)
                    if fresh_entry is not None:
                        fresh_entry.last_used = self._time()
                        self._failure_streaks[robot_id] = 0
                        return TransportAcquireResult(
                            client=fresh_entry.client,
                            reused=True,
                            queue_ms=queue_ms,
                            connect_ms=0,
                        )

            with self._lock:
                self._invalidate_locked(robot_id)

            connect_started = self._time()
            client = self._connect_client(
                host=host,
                username=username,
                password=password,
                port=port,
                connect_timeout_sec=timeout,
            )
            connect_ms = max(0, int((self._time() - connect_started) * 1000))
            with self._lock:
                self._entries[robot_id] = _TransportEntry(client=client, last_used=self._time())
                self._failure_streaks[robot_id] = 0
            return TransportAcquireResult(
                client=client,
                reused=False,
                queue_ms=queue_ms,
                connect_ms=connect_ms,
            )
        except Exception:
            with self._lock:
                streak = int(self._failure_streaks.get(robot_id, 0)) + 1
                self._failure_streaks[robot_id] = streak
                if streak >= self._max_failures_before_reset:
                    self._invalidate_locked(robot_id)
                    self._failure_streaks[robot_id] = 0
            raise
        finally:
            lock.release()

    def probe(
        self,
        *,
        robot_id: str,
        host: str,
        username: str,
        password: str,
        port: int,
        connect_timeout_sec: float | None = None,
        queue_timeout_sec: float | None = None,
    ) -> TransportProbeResult:
        timeout = (
            self._default_connect_timeout_sec
            if connect_timeout_sec is None
            else max(0.1, float(connect_timeout_sec))
        )
        attempts = 2
        last_error: Exception | None = None

        for attempt in range(attempts):
            acquired = self.acquire_client(
                robot_id=robot_id,
                host=host,
                username=username,
                password=password,
                port=port,
                connect_timeout_sec=timeout,
                queue_timeout_sec=queue_timeout_sec,
            )

            probe_started = self._time()
            try:
                get_transport = getattr(acquired.client, "get_transport", None)
                if not callable(get_transport):
                    raise RuntimeError("SSH client does not expose get_transport()")
                transport = get_transport()
                if transport is None:
                    raise RuntimeError("SSH transport is unavailable")
                if hasattr(transport, "is_active") and not bool(transport.is_active()):
                    raise RuntimeError("SSH transport is inactive")

                channel = transport.open_session(timeout=timeout)
                channel.close()

                probe_ms = max(0, int((self._time() - probe_started) * 1000))
                return TransportProbeResult(
                    reused=acquired.reused,
                    queue_ms=acquired.queue_ms,
                    connect_ms=acquired.connect_ms,
                    probe_ms=probe_ms,
                )
            except Exception as exc:
                last_error = exc
                self.hard_reset_robot(robot_id)
                if attempt >= attempts - 1:
                    break

        if last_error is not None:
            raise last_error
        raise RuntimeError(f"Failed to probe SSH transport for '{robot_id}'")

    def close_all(self) -> None:
        with self._lock:
            robot_ids = list(self._entries.keys())
            for robot_id in robot_ids:
                self._invalidate_locked(robot_id)
            self._entries.clear()
            self._failure_streaks.clear()
