from __future__ import annotations

import pytest

from backend.connectors.read import ReadConnector


def test_all_of_read_passes_when_all_rules_pass() -> None:
    connector = ReadConnector()
    result = connector.evaluate(
        {
            "kind": "all_of",
            "rules": [
                {"kind": "contains_string", "inputRef": "out", "needle": "battery"},
                {
                    "kind": "contains_lines_unordered",
                    "inputRef": "out",
                    "lines": ["/battery", "/scan"],
                    "requireAll": True,
                },
            ],
        },
        {"out": "/battery\n/scan\n"},
    )

    assert result["kind"] == "all_of"
    assert result["passed"] is True
    assert result["passedRules"] == 2
    assert result["failedRules"] == 0


def test_all_of_read_fails_when_any_rule_fails() -> None:
    connector = ReadConnector()
    result = connector.evaluate(
        {
            "kind": "all_of",
            "rules": [
                {"kind": "contains_string", "inputRef": "out", "needle": "battery"},
                {"kind": "contains_string", "inputRef": "out", "needle": "camera"},
            ],
        },
        {"out": "/battery\n/scan\n"},
    )

    assert result["kind"] == "all_of"
    assert result["passed"] is False
    assert result["passedRules"] == 1
    assert result["failedRules"] == 1
    assert result["totalRules"] == 2


def test_all_of_read_rejects_unsupported_nested_kind() -> None:
    connector = ReadConnector()
    with pytest.raises(ValueError):
        connector.evaluate(
            {
                "kind": "all_of",
                "rules": [
                    {"kind": "unknown_kind", "inputRef": "out"},
                ],
            },
            {"out": "hello"},
        )


def test_contains_lines_unordered_ignores_prompt_and_ansi_noise() -> None:
    connector = ReadConnector()
    result = connector.evaluate(
        {
            "kind": "contains_lines_unordered",
            "inputRef": "out",
            "lines": ["/battery", "/scan"],
            "requireAll": True,
        },
        {
            "out": (
                "\x1b]0;robot@host: ~\x07"
                "robot@host:~$ timeout 12s rostopic list\r\n"
                "\x1b[32m/battery\x1b[0m\r\n"
                "/scan\r\n"
                "robot@host:~$ \r\n"
            )
        },
    )

    assert result["kind"] == "contains_lines_unordered"
    assert result["passed"] is True
    assert result["missing"] == []
