from __future__ import annotations

import time
from typing import Any

from ..normalization import normalize_status, normalize_text
from .transport_pool import CircuitOpenError


class OnlineCheckerMixin:
    def _clamp_online_timeout(self, timeout_sec: float | None) -> float:
        timeout = float(timeout_sec) if timeout_sec is not None else self.ONLINE_DEFAULT_TIMEOUT_SEC
        if timeout < self.ONLINE_MIN_TIMEOUT_SEC:
            return self.ONLINE_MIN_TIMEOUT_SEC
        if timeout > self.ONLINE_MAX_TIMEOUT_SEC:
            return self.ONLINE_MAX_TIMEOUT_SEC
        return timeout

    def check_online(
        self,
        robot_id: str,
        timeout_sec: float | None = None,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        now = time.time()
        timeout = self._clamp_online_timeout(timeout_sec)

        with self._lock:
            cached = self._online_cache.get(robot_id)
            if cached and not force_refresh and (now - float(cached.get("checkedAt", 0.0))) <= self.ONLINE_CACHE_TTL_SEC:
                cached_result = dict(cached)
                cached_result["source"] = "cache"
                return cached_result

        start_ms = int(now * 1000)
        host, _username, _password, port = self._resolve_credentials(robot_id)

        try:
            probe = self.probe_transport(
                robot_id=robot_id,
                connect_timeout_sec=timeout,
                queue_timeout_sec=0.0,
            )
            probe_ms = int(getattr(probe, "probe_ms", 0))
            connect_ms = int(getattr(probe, "connect_ms", 0))
            queue_ms = int(getattr(probe, "queue_ms", 0))
            result = {
                "status": "ok",
                "value": "reachable",
                "details": f"SSH connected and authenticated on {host}:{port}.",
                "ms": max(0, int(time.time() * 1000 - start_ms)),
                "checkedAt": time.time(),
                "source": "live",
                "transportReused": bool(getattr(probe, "reused", False)),
                "probeLevel": "transport_channel",
                "timing": {
                    "queueMs": queue_ms,
                    "connectMs": connect_ms,
                    "probeMs": probe_ms,
                    "totalMs": max(0, int(time.time() * 1000 - start_ms)),
                },
            }
        except CircuitOpenError as exc:
            # Circuit is open: return an offline result immediately without
            # attempting any network I/O.
            result = {
                "status": "error",
                "value": "unreachable",
                "details": f"SSH backoff active for {robot_id} ({host}:{port}): {exc}",
                "ms": 0,
                "checkedAt": time.time(),
                "source": "live",
                "transportReused": False,
                "probeLevel": "circuit_open",
                "timing": {
                    "queueMs": 0,
                    "connectMs": 0,
                    "probeMs": 0,
                    "totalMs": 0,
                },
            }
        except Exception as exc:
            result = {
                "status": "error",
                "value": "unreachable",
                "details": f"SSH connect failed for {robot_id} ({host}:{port}): {exc}",
                "ms": max(0, int(time.time() * 1000 - start_ms)),
                "checkedAt": time.time(),
                "source": "live",
                "transportReused": False,
                "probeLevel": "transport_channel",
                "timing": {
                    "queueMs": 0,
                    "connectMs": 0,
                    "probeMs": 0,
                    "totalMs": max(0, int(time.time() * 1000 - start_ms)),
                },
            }

        with self._lock:
            self._online_cache[robot_id] = dict(result)
        return result

    def _online_test_from_probe(self, probe: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": normalize_status(probe.get("status")),
            "value": normalize_text(probe.get("value"), "unreachable"),
            "details": normalize_text(probe.get("details"), "No detail available"),
            "ms": int(probe.get("ms") or 0),
            "checkedAt": float(probe.get("checkedAt") or time.time()),
            "source": "auto-monitor",
        }

    def _offline_battery_state(self, details: str = "Robot offline; cannot read /battery topic.") -> dict[str, Any]:
        return {
            "status": "error",
            "value": "unavailable",
            "details": normalize_text(details, "Robot offline; cannot read /battery topic."),
            "ms": 0,
            "checkedAt": time.time(),
            "source": "auto-monitor",
        }
