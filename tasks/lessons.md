# Lessons

- When adding automated runtime overlays, preserve explicit local actions as priority: local `testing/searching/fixing` state must not be overwritten by backend auto-monitor payload merges.
- For long multi-step auto-fix flows, model UI phases separately (`fixing` then `testing`) so operators can see what stage is running and avoid ambiguous "scanning" status.
- When users flag missing parallel behavior, verify both execution concurrency and per-robot state update timing paths; serial-looking UI can also be caused by merge/priority logic, not only backend worker count.
