from __future__ import annotations

import time
from typing import Any

from fastapi import HTTPException

from ..normalization import normalize_text, strip_ansi


class BatteryParserMixin:
    def _extract_first_float(self, text: str) -> float | None:
        match = self.FLOAT_PATTERN.search(normalize_text(text, ""))
        if not match:
            return None
        try:
            return float(match.group(0))
        except Exception:
            return None

    def _normalize_percent(self, raw_value: float | None) -> float | None:
        if raw_value is None:
            return None
        value = float(raw_value)
        if value <= 1.0:
            value *= 100.0
        return max(0.0, min(100.0, value))

    def _estimate_percentage_from_voltage(self, voltage_value: float | None) -> float | None:
        if voltage_value is None:
            return None
        empty = self.BATTERY_VOLTAGE_EMPTY
        full = self.BATTERY_VOLTAGE_FULL
        if full <= empty:
            return None
        ratio = (float(voltage_value) - empty) / (full - empty)
        return max(0.0, min(100.0, ratio * 100.0))

    def _battery_command_for_robot(self, robot_id: str) -> str:
        robot_type = self._resolve_robot_type(robot_id)
        auto_monitor = robot_type.get("autoMonitor") if isinstance(robot_type, dict) else {}
        if isinstance(auto_monitor, dict):
            configured = normalize_text(auto_monitor.get("batteryCommand"), "")
            if configured:
                return configured
        return self.AUTO_MONITOR_BATTERY_COMMAND

    def _parse_battery_output(self, raw_output: str, elapsed_ms: int) -> dict[str, Any]:
        checked_at = time.time()
        cleaned = strip_ansi(raw_output).replace("\r", "")
        lowered = cleaned.lower()
        for phrase in (
            "unknown topic",
            "unable to communicate with master",
            "cannot contact",
            "could not contact",
            "no messages received",
        ):
            if phrase in lowered:
                return {
                    "status": "error",
                    "value": "unavailable",
                    "details": "Unable to read /battery topic.",
                    "ms": elapsed_ms,
                    "checkedAt": checked_at,
                    "source": "auto-monitor",
                }

        fields: dict[str, str] = {}
        for raw_line in cleaned.split("\n"):
            line = normalize_text(raw_line, "")
            if not line:
                continue
            match = self.BATTERY_FIELD_PATTERN.match(line)
            if not match:
                continue
            key = normalize_text(match.group(1), "").lower()
            value = normalize_text(match.group(2), "")
            if key and value:
                fields[key] = value

        percentage_raw = None
        for key in ("percentage", "percent", "soc", "state_of_charge", "battery_percent"):
            candidate = self._extract_first_float(fields.get(key, ""))
            if candidate is not None:
                percentage_raw = candidate
                break

        voltage_value = None
        for key in ("voltage", "battery_voltage", "vbat", "volt"):
            candidate = self._extract_first_float(fields.get(key, ""))
            if candidate is not None:
                voltage_value = candidate
                break

        percent_value = self._normalize_percent(percentage_raw)
        if percent_value is None:
            charge_value = self._extract_first_float(fields.get("charge", ""))
            capacity_value = self._extract_first_float(fields.get("capacity", ""))
            if charge_value is not None and capacity_value is not None and capacity_value > 0:
                percent_value = (charge_value / capacity_value) * 100.0
                percent_value = self._normalize_percent(percent_value)
        elif percent_value <= 0.0 and voltage_value is not None:
            percent_value = None

        estimated_from_voltage = False
        if percent_value is None:
            percent_value = self._estimate_percentage_from_voltage(voltage_value)
            estimated_from_voltage = percent_value is not None

        if percent_value is None:
            return {
                "status": "warning",
                "value": "unknown",
                "details": "Read /battery but could not extract percentage or usable voltage.",
                "ms": elapsed_ms,
                "checkedAt": checked_at,
                "source": "auto-monitor",
            }

        if percent_value <= self.LOW_BATTERY_ERROR_PERCENT:
            status = "error"
        elif percent_value <= self.LOW_BATTERY_WARNING_PERCENT:
            status = "warning"
        else:
            status = "ok"

        percent_text = f"{int(round(percent_value))}%"
        details = "Battery percentage from /battery topic."
        if estimated_from_voltage:
            details = (
                f"Battery {percent_text} estimated from voltage "
                f"({self.BATTERY_VOLTAGE_EMPTY:.1f}V=0%, {self.BATTERY_VOLTAGE_FULL:.1f}V=100%)."
            )
        else:
            details = f"Battery {percent_text} from /battery topic."
        if voltage_value is not None:
            details = f"{details} Voltage {voltage_value:.2f}V."

        return {
            "status": status,
            "value": percent_text,
            "details": details,
            "ms": elapsed_ms,
            "checkedAt": checked_at,
            "source": "auto-monitor",
        }

    def _refresh_battery_state(self, robot_id: str) -> None:
        started_ms = int(time.time() * 1000)
        battery_command = self._battery_command_for_robot(robot_id)
        try:
            output = self.run_command(
                page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID,
                robot_id=robot_id,
                command=battery_command,
                timeout_sec=self.AUTO_MONITOR_BATTERY_TIMEOUT_SEC,
            )
        except HTTPException as exc:
            detail = normalize_text(exc.detail, "Unable to read /battery topic.")
            self.close_session(page_session_id=self.AUTO_MONITOR_PAGE_SESSION_ID, robot_id=robot_id)
            self.apply_online_probe_to_runtime(
                robot_id=robot_id,
                probe={
                    "status": "error",
                    "value": "unreachable",
                    "details": detail,
                    "ms": 0,
                    "checkedAt": time.time(),
                    "source": "auto-monitor",
                },
                source="auto-monitor",
            )
            return

        elapsed_ms = max(0, int(time.time() * 1000 - started_ms))
        battery = self._parse_battery_output(output, elapsed_ms)
        self._record_runtime_tests(
            robot_id,
            {
                "online": {
                    "status": "ok",
                    "value": "reachable",
                    "details": "SSH connected and authenticated.",
                    "ms": elapsed_ms,
                    "checkedAt": time.time(),
                    "source": "auto-monitor",
                },
                "battery": battery,
            },
        )
