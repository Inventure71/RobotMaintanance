from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from ..schemas import CommandRequest, SessionRequest
from ..terminal_manager import TerminalManager


def create_terminal_router(terminal_manager: TerminalManager) -> APIRouter:
    router = APIRouter()

    @router.post("/api/robots/{robot_id}/terminal/session")
    def start_terminal_session(robot_id: str, body: SessionRequest) -> dict[str, Any]:
        terminal_manager.get_or_connect(page_session_id=body.pageSessionId, robot_id=robot_id)
        return {
            "ok": True,
            "robotId": robot_id,
            "pageSessionId": body.pageSessionId,
            "message": "SSH session connected",
        }

    @router.delete("/api/robots/{robot_id}/terminal/session")
    def close_terminal_session(robot_id: str, pageSessionId: str) -> dict[str, Any]:
        terminal_manager.close_session(page_session_id=pageSessionId, robot_id=robot_id)
        return {"ok": True, "robotId": robot_id, "pageSessionId": pageSessionId}

    @router.post("/api/robots/{robot_id}/terminal")
    def terminal_command(robot_id: str, body: CommandRequest) -> dict[str, Any]:
        page_session_id = (body.pageSessionId or "default-page").strip() or "default-page"
        command = body.command.strip()
        source = str(body.source or "").strip().lower()
        if not command:
            raise HTTPException(status_code=400, detail="Command cannot be empty")

        if source == "auto-fix" and hasattr(terminal_manager, "start_fix_run"):
            terminal_manager.start_fix_run(robot_id=robot_id)
        try:
            output = terminal_manager.run_command(
                page_session_id=page_session_id,
                robot_id=robot_id,
                command=command,
                timeout_sec=body.timeoutSec,
                source=source or None,
            )
        finally:
            if source == "auto-fix" and hasattr(terminal_manager, "finish_fix_run"):
                terminal_manager.finish_fix_run(robot_id=robot_id)
        return {
            "ok": True,
            "robotId": robot_id,
            "pageSessionId": page_session_id,
            "command": command,
            "output": output,
            "exitCode": 0,
        }

    @router.websocket("/api/robots/{robot_id}/terminal/stream")
    async def terminal_stream(
        websocket: WebSocket,
        robot_id: str,
        pageSessionId: str = Query(default="default-page"),
    ) -> None:
        page_session_id = (pageSessionId or "default-page").strip() or "default-page"
        await websocket.accept()

        try:
            terminal_manager.get_or_connect(page_session_id=page_session_id, robot_id=robot_id)
        except HTTPException as exc:
            await websocket.send_json({"type": "error", "message": str(exc.detail)})
            await websocket.close(code=1011)
            return
        except Exception as exc:
            await websocket.send_json({"type": "error", "message": f"SSH connect failed: {exc}"})
            await websocket.close(code=1011)
            return

        initial_output = terminal_manager.read_output(page_session_id=page_session_id, robot_id=robot_id)
        if initial_output:
            await websocket.send_json({"type": "output", "data": initial_output})

        async def sender_loop() -> None:
            while True:
                chunk = terminal_manager.read_output(
                    page_session_id=page_session_id,
                    robot_id=robot_id,
                    max_chunks=200,
                )
                if chunk:
                    await websocket.send_json({"type": "output", "data": chunk})
                    continue
                await asyncio.sleep(0.02)

        async def receiver_loop() -> None:
            while True:
                raw_message = await websocket.receive_text()
                try:
                    payload = json.loads(raw_message)
                except json.JSONDecodeError:
                    payload = {"type": "input", "data": raw_message}

                message_type = str(payload.get("type") or "input").lower()
                if message_type == "input":
                    data = payload.get("data")
                    text = data if isinstance(data, str) else str(data or "")
                    if text:
                        terminal_manager.send_input(
                            page_session_id=page_session_id,
                            robot_id=robot_id,
                            text=text,
                        )
                elif message_type == "resize":
                    try:
                        cols = int(payload.get("cols") or payload.get("width") or 160)
                        rows = int(payload.get("rows") or payload.get("height") or 48)
                    except (TypeError, ValueError):
                        continue
                    if cols > 0 and rows > 0:
                        terminal_manager.resize_terminal(
                            page_session_id=page_session_id,
                            robot_id=robot_id,
                            width=cols,
                            height=rows,
                        )
                elif message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message_type == "close":
                    break

        sender_task = asyncio.create_task(sender_loop())
        receiver_task = asyncio.create_task(receiver_loop())
        try:
            done, pending = await asyncio.wait(
                {sender_task, receiver_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                exc = task.exception()
                if exc:
                    raise exc
        except WebSocketDisconnect:
            return
        except Exception as exc:
            try:
                await websocket.send_json({"type": "error", "message": f"Terminal stream error: {exc}"})
            except Exception:
                pass
            try:
                await websocket.close(code=1011)
            except Exception:
                pass

    return router
