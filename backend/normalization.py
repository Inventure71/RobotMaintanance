from __future__ import annotations

import re
from typing import Any


def normalize_text(value: Any, fallback: str = "") -> str:
    candidate = value if value is not None else ""
    return str(candidate).strip() or fallback


def normalize_status(value: Any) -> str:
    if value in ("ok", "warning", "error"):
        return value
    return "warning"


def normalize_type_key(value: Any) -> str:
    return normalize_text(value).lower()


def safe_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on", "y"}


def strip_ansi(text: str) -> str:
    return re.sub(r"\x1B\[[0-?]*[ -/]*[@-~]", "", text)
