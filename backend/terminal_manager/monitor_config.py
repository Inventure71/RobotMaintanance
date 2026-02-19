from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from ..normalization import normalize_text


class MonitorConfigMixin:
    def _clamp_interval(self, value: float, min_value: float, max_value: float) -> float:
        if value < min_value:
            return min_value
        if value > max_value:
            return max_value
        return value

    def get_monitor_config(self) -> dict[str, Any]:
        with self._lock:
            return {
                "mode": self._monitor_mode,
                "topicsIntervalSec": float(self._topics_interval_sec),
                "onlineIntervalSec": float(self._online_interval_sec),
                "batteryIntervalSec": float(self._battery_interval_sec),
                "parallelism": int(self._monitor_parallelism),
            }

    def update_monitor_config(
        self,
        *,
        mode: str | None = None,
        topics_interval_sec: float | None = None,
        online_interval_sec: float | None = None,
        battery_interval_sec: float | None = None,
        parallelism: int | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            if mode is not None:
                normalized_mode = normalize_text(mode, "")
                if normalized_mode not in self.MONITOR_MODE_VALUES:
                    raise HTTPException(status_code=400, detail=f"Unsupported monitor mode: {mode}")
                self._monitor_mode = normalized_mode

            if topics_interval_sec is not None:
                self._topics_interval_sec = self._clamp_interval(
                    float(topics_interval_sec),
                    self.TOPICS_INTERVAL_MIN_SEC,
                    self.TOPICS_INTERVAL_MAX_SEC,
                )
            if online_interval_sec is not None:
                self._online_interval_sec = self._clamp_interval(
                    float(online_interval_sec),
                    self.ONLINE_INTERVAL_MIN_SEC,
                    self.ONLINE_INTERVAL_MAX_SEC,
                )
            if battery_interval_sec is not None:
                self._battery_interval_sec = self._clamp_interval(
                    float(battery_interval_sec),
                    self.BATTERY_INTERVAL_MIN_SEC,
                    self.BATTERY_INTERVAL_MAX_SEC,
                )
            if parallelism is not None:
                self._monitor_parallelism = int(
                    self._clamp_interval(
                        float(parallelism),
                        self.MONITOR_PARALLELISM_MIN,
                        self.MONITOR_PARALLELISM_MAX,
                    )
                )

            self._online_next_check_at.clear()
            self._battery_next_check_at.clear()
            self._topics_next_check_at.clear()
            return {
                "mode": self._monitor_mode,
                "topicsIntervalSec": float(self._topics_interval_sec),
                "onlineIntervalSec": float(self._online_interval_sec),
                "batteryIntervalSec": float(self._battery_interval_sec),
                "parallelism": int(self._monitor_parallelism),
            }

    def _topics_monitor_enabled(self) -> bool:
        with self._lock:
            return self._monitor_mode == self.MONITOR_MODE_ONLINE_BATTERY_TOPICS
