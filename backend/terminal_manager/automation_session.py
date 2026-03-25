from __future__ import annotations

from .automation_run import AutomationRunContext


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
        )

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
