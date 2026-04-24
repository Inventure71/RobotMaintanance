from __future__ import annotations

import json
import re
import threading
import time
from pathlib import Path
from typing import Any

from .normalization import normalize_text


class ExecutionLogStore:
    def __init__(self, root_dir: Path | str, *, max_logs: int = 5) -> None:
        self._root_dir = Path(root_dir)
        self._max_logs = max(1, int(max_logs))
        self._lock = threading.Lock()

    @staticmethod
    def _safe_token(value: str, fallback: str) -> str:
        normalized = normalize_text(value, fallback)
        token = re.sub(r"[^A-Za-z0-9_.-]+", "-", normalized).strip(".-")
        return token or fallback

    def _prune_locked(self) -> None:
        files = [path for path in self._root_dir.glob("*.json") if path.is_file()]
        files.sort(key=lambda path: (path.stat().st_mtime, path.name), reverse=True)
        for stale_path in files[self._max_logs :]:
            try:
                stale_path.unlink()
            except FileNotFoundError:
                continue

    def write(self, payload: dict[str, Any]) -> dict[str, Any]:
        now = time.time()
        job = payload.get("job") if isinstance(payload.get("job"), dict) else {}
        robot_id = self._safe_token(str(payload.get("robotId") or ""), "robot")
        kind = self._safe_token(str(job.get("kind") or payload.get("kind") or ""), "job")
        job_id = self._safe_token(str(job.get("id") or payload.get("jobId") or ""), "run")
        filename = f"{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime(now))}-{robot_id}-{kind}-{job_id}.json"

        with self._lock:
            self._root_dir.mkdir(parents=True, exist_ok=True)
            path = self._root_dir / filename
            enriched = {
                "loggedAt": now,
                **payload,
            }
            path.write_text(json.dumps(enriched, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            self._prune_locked()
        return {
            "file": filename,
            "path": str(path),
            "loggedAt": now,
        }

    def list(self) -> list[dict[str, Any]]:
        if not self._root_dir.exists():
            return []
        files = [path for path in self._root_dir.glob("*.json") if path.is_file()]
        files.sort(key=lambda path: (path.stat().st_mtime, path.name), reverse=True)
        entries: list[dict[str, Any]] = []
        for path in files[: self._max_logs]:
            stat = path.stat()
            entries.append(
                {
                    "file": path.name,
                    "path": str(path),
                    "modifiedAt": float(stat.st_mtime),
                    "bytes": int(stat.st_size),
                }
            )
        return entries

    def read(self, filename: str) -> dict[str, Any]:
        safe_name = Path(filename).name
        if safe_name != filename or not safe_name.endswith(".json"):
            raise FileNotFoundError(filename)
        path = self._root_dir / safe_name
        if not path.is_file():
            raise FileNotFoundError(filename)
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return {"payload": payload}
        return payload
