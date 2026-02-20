from __future__ import annotations

import re
import time
from typing import Any, Callable


class WriteConnector:
    TOKEN_PATTERN = re.compile(r"^\$([A-Za-z0-9_.-]+)\$$")

    def __init__(self, command_primitives_by_id: dict[str, dict[str, Any]] | None = None):
        self._command_primitives_by_id = command_primitives_by_id or {}

    @staticmethod
    def _resolve_value(raw: Any, vars_payload: dict[str, Any], *, default: Any = None) -> Any:
        if isinstance(raw, dict):
            ref = str(raw.get("ref") or "").strip()
            if ref:
                return vars_payload.get(ref, default)
        return raw if raw is not None else default

    def _resolve_command(self, raw_command: Any, vars_payload: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
        command = str(self._resolve_value(raw_command, vars_payload, default="")).strip()
        if not command:
            raise ValueError("Command is empty")
        match = self.TOKEN_PATTERN.fullmatch(command)
        if not match:
            return command, None

        primitive_id = match.group(1)
        primitive = self._command_primitives_by_id.get(primitive_id)
        if not isinstance(primitive, dict):
            raise ValueError(f"Unknown command primitive '{primitive_id}'")

        resolved_command = str(primitive.get("command") or "").strip()
        if not resolved_command:
            raise ValueError(f"Command primitive '{primitive_id}' has empty command")

        return resolved_command, primitive

    def execute_step(
        self,
        *,
        step: dict[str, Any],
        vars_payload: dict[str, Any],
        run_scope: str,
        command_cache: dict[str, str],
        run_command: Callable[[str, float | None], str],
    ) -> dict[str, Any]:
        if not callable(run_command):
            raise RuntimeError("run_command callback is not configured")

        step_id = str(step.get("id") or "command")
        resolved_command, primitive = self._resolve_command(step.get("command"), vars_payload)

        step_timeout = self._resolve_value(step.get("timeoutSec"), vars_payload, default=None)
        if step_timeout is None and isinstance(primitive, dict):
            step_timeout = self._resolve_value(primitive.get("timeoutSec"), vars_payload, default=None)

        timeout_sec = None
        if step_timeout is not None:
            timeout_sec = float(step_timeout)

        retries_raw = self._resolve_value(step.get("retries"), vars_payload, default=None)
        if retries_raw is None and isinstance(primitive, dict):
            retries_raw = self._resolve_value(primitive.get("retries"), vars_payload, default=0)
        retries = max(0, int(retries_raw or 0))

        reuse_key = str(step.get("reuseKey") or "").strip()
        cache_key = f"{run_scope}:{reuse_key}" if reuse_key else ""

        if cache_key and cache_key in command_cache:
            output = command_cache[cache_key]
            if save_as := str(step.get("saveAs") or "").strip():
                vars_payload[save_as] = output
            return {
                "step": {
                    "id": step_id,
                    "status": "ok",
                    "value": "ok",
                    "details": "Reused cached command output.",
                    "ms": 0,
                    "output": output,
                },
                "command": {
                    "id": step_id,
                    "command": resolved_command,
                    "timeoutSec": timeout_sec,
                    "output": output,
                    "exitCode": 0,
                    "ok": True,
                    "durationMs": 0,
                    "usedCache": True,
                },
            }

        started_at = int(time.time() * 1000)
        last_error: Exception | None = None
        output = ""
        attempts = retries + 1
        for _ in range(attempts):
            try:
                output = run_command(resolved_command, timeout_sec)
                last_error = None
                break
            except Exception as exc:
                last_error = exc

        elapsed = max(0, int(time.time() * 1000 - started_at))
        if last_error is not None:
            raise RuntimeError(f"Command failed: {last_error}")

        if save_as := str(step.get("saveAs") or "").strip():
            vars_payload[save_as] = output
        if cache_key:
            command_cache[cache_key] = output

        return {
            "step": {
                "id": step_id,
                "status": "ok",
                "value": "ok",
                "details": "Command executed.",
                "ms": elapsed,
                "output": output,
            },
            "command": {
                "id": step_id,
                "command": resolved_command,
                "timeoutSec": timeout_sec,
                "output": output,
                "exitCode": 0,
                "ok": True,
                "durationMs": elapsed,
                "usedCache": False,
            },
        }
