from .bug_reports import create_bug_reports_router
from .definitions import create_definitions_router
from .fixes import create_fixes_router
from .health import create_health_router
from .monitor import create_monitor_router
from .robots import create_robots_router
from .terminal import create_terminal_router
from .tests import create_tests_router

__all__ = [
    "create_bug_reports_router",
    "create_definitions_router",
    "create_fixes_router",
    "create_health_router",
    "create_monitor_router",
    "create_robots_router",
    "create_terminal_router",
    "create_tests_router",
]
