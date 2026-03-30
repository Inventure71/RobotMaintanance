from __future__ import annotations

from backend.app import create_app


def test_create_app_registers_gzip_middleware() -> None:
    app = create_app()
    middleware_classes = [entry.cls.__name__ for entry in app.user_middleware]
    assert "GZipMiddleware" in middleware_classes
