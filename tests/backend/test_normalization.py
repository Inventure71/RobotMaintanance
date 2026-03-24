from __future__ import annotations

from backend.normalization import (
    normalize_owner_tags,
    normalize_platform_tags,
    normalize_status,
    normalize_tag_list,
    normalize_text,
    normalize_type_key,
    safe_float,
    safe_int,
    strip_ansi,
    to_bool,
)


def test_normalize_text_handles_none_and_whitespace():
    assert normalize_text(None, "x") == "x"
    assert normalize_text("   ", "x") == "x"
    assert normalize_text(" abc ") == "abc"


def test_normalize_status_falls_back_to_warning():
    assert normalize_status("ok") == "ok"
    assert normalize_status("warning") == "warning"
    assert normalize_status("error") == "error"
    assert normalize_status("bad") == "warning"


def test_normalize_type_key_lowercases():
    assert normalize_type_key(" ROSBOT-2-PRO ") == "rosbot-2-pro"


def test_normalize_tag_list_dedupes_and_lowercases():
    assert normalize_tag_list([" ROS2 ", "ros2", "", "Interbotix"]) == ["ros2", "interbotix"]


def test_normalize_owner_tags_defaults_to_global():
    assert normalize_owner_tags([]) == ["global"]
    assert normalize_owner_tags(None) == ["global"]
    assert normalize_owner_tags([" Alice ", "alice"]) == ["alice"]


def test_normalize_platform_tags_allows_empty_list():
    assert normalize_platform_tags([]) == []
    assert normalize_platform_tags([" ROS2 ", "ros2", ""]) == ["ros2"]


def test_safe_number_parsers_fallback():
    assert safe_float("1.25", 0.0) == 1.25
    assert safe_float("bad", 2.0) == 2.0
    assert safe_int("42", 0) == 42
    assert safe_int("bad", 7) == 7


def test_to_bool_variants():
    assert to_bool(True) is True
    assert to_bool("true") is True
    assert to_bool("YES") is True
    assert to_bool("0") is False


def test_strip_ansi_removes_escape_codes():
    assert strip_ansi("\x1b[31mred\x1b[0m") == "red"
