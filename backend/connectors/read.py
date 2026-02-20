from __future__ import annotations

from typing import Any


class ReadConnector:
    @staticmethod
    def _normalize_bool(value: Any, default: bool = False) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        text = str(value or "").strip().lower()
        if text in {"1", "true", "yes", "on"}:
            return True
        if text in {"0", "false", "no", "off"}:
            return False
        return default

    @staticmethod
    def _resolve_value(raw: Any, vars_payload: dict[str, Any], *, default: Any = None) -> Any:
        if isinstance(raw, dict):
            ref = str(raw.get("ref") or "").strip()
            if ref:
                return vars_payload.get(ref, default)
        if isinstance(raw, str):
            ref_value = vars_payload.get(raw)
            if ref_value is not None:
                return ref_value
        return raw if raw is not None else default

    @staticmethod
    def _normalize_lines(raw_text: str) -> list[str]:
        return [line.strip() for line in str(raw_text or "").replace("\r", "").split("\n") if line.strip()]

    def _evaluate_contains_string(self, read_spec: dict[str, Any], vars_payload: dict[str, Any]) -> dict[str, Any]:
        haystack = str(self._resolve_value(read_spec.get("inputRef"), vars_payload, default=""))
        needle = str(self._resolve_value(read_spec.get("needle"), vars_payload, default=""))
        case_sensitive = self._normalize_bool(read_spec.get("caseSensitive"), default=False)

        if not case_sensitive:
            passed = needle.lower() in haystack.lower()
        else:
            passed = needle in haystack

        return {
            "passed": passed,
            "kind": "contains_string",
            "details": "Substring found." if passed else "Substring not found.",
            "matched": [needle] if passed and needle else [],
            "missing": [] if passed else ([needle] if needle else []),
        }

    def _evaluate_contains_any_string(self, read_spec: dict[str, Any], vars_payload: dict[str, Any]) -> dict[str, Any]:
        haystack = str(self._resolve_value(read_spec.get("inputRef"), vars_payload, default=""))
        needles_raw = self._resolve_value(read_spec.get("needles"), vars_payload, default=[])
        if not isinstance(needles_raw, list):
            needles_raw = []
        needles = [str(item).strip() for item in needles_raw if str(item).strip()]

        case_sensitive = self._normalize_bool(read_spec.get("caseSensitive"), default=False)
        if case_sensitive:
            matched = [needle for needle in needles if needle in haystack]
        else:
            lowered = haystack.lower()
            matched = [needle for needle in needles if needle.lower() in lowered]

        passed = len(matched) > 0 if needles else False
        missing = [needle for needle in needles if needle not in matched]
        return {
            "passed": passed,
            "kind": "contains_any_string",
            "details": "At least one string found." if passed else "No strings found.",
            "matched": matched,
            "missing": missing,
        }

    def _evaluate_contains_lines_unordered(self, read_spec: dict[str, Any], vars_payload: dict[str, Any]) -> dict[str, Any]:
        haystack_raw = self._resolve_value(read_spec.get("inputRef"), vars_payload, default="")
        haystack_lines = self._normalize_lines(str(haystack_raw or ""))
        haystack_set = set(haystack_lines)

        lines_raw = self._resolve_value(read_spec.get("lines"), vars_payload, default=[])
        if not isinstance(lines_raw, list):
            lines_raw = []
        expected_lines = [str(item).strip() for item in lines_raw if str(item).strip()]

        require_all = self._normalize_bool(read_spec.get("requireAll"), default=True)

        matched = [line for line in expected_lines if line in haystack_set]
        missing = [line for line in expected_lines if line not in haystack_set]

        if not expected_lines:
            passed = False
            details = "No expected lines configured."
        elif require_all:
            passed = len(missing) == 0
            details = "Expected lines found." if passed else f"Missing lines: {', '.join(missing)}"
        else:
            passed = len(matched) > 0
            details = "At least one expected line found." if passed else "No expected lines were found."

        return {
            "passed": passed,
            "kind": "contains_lines_unordered",
            "details": details,
            "matched": matched,
            "missing": missing,
            "lineCount": len(haystack_lines),
            "requireAll": require_all,
        }

    def evaluate(self, read_spec: dict[str, Any], vars_payload: dict[str, Any]) -> dict[str, Any]:
        kind = str(read_spec.get("kind") or "").strip().lower()
        if kind == "contains_string":
            return self._evaluate_contains_string(read_spec, vars_payload)
        if kind == "contains_lines_unordered":
            return self._evaluate_contains_lines_unordered(read_spec, vars_payload)
        if kind == "contains_any_string":
            return self._evaluate_contains_any_string(read_spec, vars_payload)
        raise ValueError(f"Unsupported read kind '{kind}'")
