from __future__ import annotations

from dataclasses import dataclass

from .ssh_client import InteractiveShell


@dataclass
class ShellHandle:
    shell: InteractiveShell
    last_used: float


@dataclass
class StepResult:
    id: str
    status: str
    value: str
    details: str
    ms: int
    output: str
