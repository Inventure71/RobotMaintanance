from __future__ import annotations

import os

from .app import app, create_app
from .terminal_manager import TerminalManager

__all__ = ["app", "create_app", "TerminalManager"]


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8010"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
