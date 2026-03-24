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


def normalize_tag_list(value: Any) -> list[str]:
    raw_items: list[Any]
    if isinstance(value, (list, tuple, set)):
        raw_items = list(value)
    else:
        raw_items = []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        normalized = normalize_text(item, "").lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        out.append(normalized)
    return out


def normalize_owner_tags(value: Any) -> list[str]:
    tags = normalize_tag_list(value)
    return tags or ["global"]


def normalize_platform_tags(value: Any) -> list[str]:
    return normalize_tag_list(value)


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


def strip_terminal_control_sequences(text: str) -> str:
    without_osc = re.sub(r"\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)", "", str(text or ""))
    return strip_ansi(without_osc)
