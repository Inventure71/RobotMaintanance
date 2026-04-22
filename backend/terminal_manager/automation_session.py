from __future__ import annotations

import logging

from .automation_run import AutomationRunContext
from .transport_pool import CircuitOpenError

LOGGER = logging.getLogger(__name__)


class AutomationSessionMixin:
    def _resolve_timeout_value(
        self,
        value: float | None,
        *,
        default: float,
        minimum: float,
        maximum: float,
    ) -> float:
        timeout = default if value is None else float(value)
        if timeout < minimum:
            return minimum
        if timeout > maximum:
            return maximum
        return timeout

    def create_automation_run_context(
        self,
        *,
        robot_id: str,
        page_session_id: str,
        run_kind: str,
        queue_timeout_sec: float | None = None,
        connect_timeout_sec: float | None = None,
        execute_timeout_sec: float | None = None,
    ) -> AutomationRunContext:
        host, username, password, port = self._resolve_credentials(robot_id)
        queue_timeout = self._resolve_timeout_value(
            queue_timeout_sec,
            default=self.AUTOMATION_QUEUE_TIMEOUT_SEC,
            minimum=self.AUTOMATION_QUEUE_TIMEOUT_MIN_SEC,
            maximum=self.AUTOMATION_QUEUE_TIMEOUT_MAX_SEC,
        )
        connect_timeout = self._resolve_timeout_value(
            connect_timeout_sec,
            default=self.AUTOMATION_CONNECT_TIMEOUT_SEC,
            minimum=self.AUTOMATION_CONNECT_TIMEOUT_MIN_SEC,
            maximum=self.AUTOMATION_CONNECT_TIMEOUT_MAX_SEC,
        )
        execute_timeout = self._resolve_timeout_value(
            execute_timeout_sec,
            default=self.AUTOMATION_EXECUTE_TIMEOUT_SEC,
            minimum=self.AUTOMATION_EXECUTE_TIMEOUT_MIN_SEC,
            maximum=self.AUTOMATION_EXECUTE_TIMEOUT_MAX_SEC,
        )
        initial_directory = self._resolve_initial_directory(robot_id)
        return AutomationRunContext(
            pool=self._transport_pool,
            robot_id=robot_id,
            host=host,
            username=username,
            password=password,
            port=port,
            run_kind=run_kind,
            page_session_id=page_session_id,
            queue_timeout_sec=queue_timeout,
            connect_timeout_sec=connect_timeout,
            execute_timeout_sec=execute_timeout,
            prompt_regex=r"[$#] ",
            initial_directory=initial_directory,
            on_opened=self._register_automation_context,
            on_closed=self._unregister_automation_context,
        )

    _USER_JOB_RUN_KINDS = {"fix", "test"}

    def _register_automation_context(self, context: AutomationRunContext) -> None:
        if context.run_kind not in self._USER_JOB_RUN_KINDS:
            return
        registry = getattr(self, "_active_automation_contexts", None)
        if registry is None:
            return
        lock = getattr(self, "_active_automation_lock", None)
        if lock is None:
            registry[context.robot_id] = context
            return
        with lock:
            registry[context.robot_id] = context

    def _unregister_automation_context(self, context: AutomationRunContext) -> None:
        if context.run_kind not in self._USER_JOB_RUN_KINDS:
            return
        registry = getattr(self, "_active_automation_contexts", None)
        if registry is None:
            return
        lock = getattr(self, "_active_automation_lock", None)
        if lock is None:
            if registry.get(context.robot_id) is context:
                registry.pop(context.robot_id, None)
            return
        with lock:
            if registry.get(context.robot_id) is context:
                registry.pop(context.robot_id, None)

    def run_monitor_probe(
        self,
        *,
        robot_id: str,
        commands: list[tuple[str, float | None]],
        run_kind: str = "monitor",
        page_session_id: str | None = None,
        connect_timeout_sec: float | None = None,
    ) -> list[str]:
        """Run one or more commands through a pooled transport for auto-monitor.

        Uses ``AutomationRunContext`` so the probe benefits from connection
        reuse and the transport-pool circuit breaker. A single context is
        shared across all commands, preserving shell state between them.

        Raises ``CircuitOpenError`` if the robot is currently in SSH backoff,
        so callers can skip the probe without producing noisy errors.
        """
        if not commands:
            return []
        session_id = page_session_id or getattr(
            self, "AUTO_MONITOR_PAGE_SESSION_ID", f"monitor-{robot_id}"
        )
        context = self.create_automation_run_context(
            robot_id=robot_id,
            page_session_id=session_id,
            run_kind=run_kind,
            connect_timeout_sec=connect_timeout_sec,
        )
        try:
            outputs: list[str] = []
            for command, timeout_sec in commands:
                result = context.run_command(command, timeout_sec=timeout_sec)
                outputs.append(result.output if result is not None else "")
            return outputs
        except CircuitOpenError:
            raise
        except Exception as exc:
            LOGGER.debug(
                "Monitor probe failed (robot_id=%s, run_kind=%s): %s",
                robot_id,
                run_kind,
                exc,
            )
            raise
        finally:
            try:
                context.close()
            except Exception:
                pass

    def probe_transport(
        self,
        *,
        robot_id: str,
        connect_timeout_sec: float,
        queue_timeout_sec: float | None = None,
    ):
        host, username, password, port = self._resolve_credentials(robot_id)
        queue_timeout = self._resolve_timeout_value(
            queue_timeout_sec,
            default=self.AUTOMATION_QUEUE_TIMEOUT_SEC,
            minimum=self.AUTOMATION_QUEUE_TIMEOUT_MIN_SEC,
            maximum=self.AUTOMATION_QUEUE_TIMEOUT_MAX_SEC,
        )
        return self._transport_pool.probe(
            robot_id=robot_id,
            host=host,
            username=username,
            password=password,
            port=port,
            connect_timeout_sec=connect_timeout_sec,
            queue_timeout_sec=queue_timeout,
        )
