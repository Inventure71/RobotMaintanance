from __future__ import annotations

import json

from backend.main import TerminalManager


def _manager() -> TerminalManager:
    return TerminalManager(robots_by_id={}, robot_types_by_id={})


def test_topics_presence_accepts_namespaced_matches_and_flags_namespace():
    manager = _manager()
    raw_output = "/robot1/scan\n/robot1/odom\n"

    result = manager._parse_topics_presence(
        raw_output=raw_output,
        expected_topics=["/scan", "/odom"],
    )
    payload = json.loads(result.output)

    assert result.status == "ok"
    assert result.value == "all_present"
    assert payload["namespacePresent"] is True
    assert payload["detectedNamespaces"] == ["/robot1"]
    assert payload["matchedByNamespace"] == {
        "/odom": "/robot1/odom",
        "/scan": "/robot1/scan",
    }


def test_topics_presence_namespace_flag_from_explicit_namespace_check():
    manager = _manager()
    raw_output = "/scan\n/robot1/cmd_vel\n"

    result = manager._parse_topics_presence(
        raw_output=raw_output,
        expected_topics=["/scan"],
        namespace="/robot1",
    )
    payload = json.loads(result.output)

    assert result.status == "ok"
    assert payload["namespace"] == "/robot1"
    assert payload["namespacePresent"] is True
    assert "/robot1" in payload["detectedNamespaces"]
