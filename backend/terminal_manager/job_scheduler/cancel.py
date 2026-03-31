from __future__ import annotations

import threading


class JobInterrupted(RuntimeError):
    pass


class CancellationToken:
    def __init__(self) -> None:
        self._interrupted = threading.Event()

    def request_interrupt(self) -> None:
        self._interrupted.set()

    def is_interrupted(self) -> bool:
        return self._interrupted.is_set()

    def throw_if_interrupted(self) -> None:
        if self._interrupted.is_set():
            raise JobInterrupted("Job interruption requested")
