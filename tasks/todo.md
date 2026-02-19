# TODO
- [x] Review repo to map relevant files for online/offline transitions, automation, and UI indications
- [x] Analyze code paths and scripts to identify root causes for slow transitions, missing automatic tests, UI feedback gaps, and flash firmware reliability
- [x] Implement backend activity model for automated searching/testing state and expose it via `/api/robots`
- [x] Implement offline->online auto-recovery full-test execution (excluding `online`) with single-flight guard
- [x] Add per-command terminal timeout support (`timeoutSec`) through schema/router/manager
- [x] Replace robot type auto-fixes with single `flash_fix` sequence and update frontend auto-fix execution logic (flash timeout + 15s post-up wait + full retest excluding `online`)
- [x] Improve frontend freshness: force-refresh fleet online batch and remove runtime-sync blocking during active operations
- [x] Map backend runtime activity into dashboard searching/testing overlays
- [x] Add/update backend tests covering recovery auto-tests, terminal timeout passthrough, and activity payload
- [x] Run targeted test suite and document verification results

## Current Task: Raspberry Pi Startup + Cleanup
- [x] Define cleanup scope and remove generated/local clutter from workspace
- [x] Add/update ignore rules so clutter does not reappear in tracked project state
- [x] Create a startup script that launches backend, serves UI, and opens browser to Pi IP URL
- [x] Verify script syntax and startup behavior locally
- [x] Document verification results in review notes

# Review
- Implemented: backend runtime `activity` model, auto-recovery tests on offline->online transition, per-command timeout API plumbing, flash-fix config + UI flow updates, and runtime polling freshness changes.
- Follow-up: auto-monitor now runs per-robot checks in parallel workers and auto-fix now runs robots in parallel workers; monitor parallelism is synced from Fleet slider through monitor config API.
- Follow-up: auto-search UI now uses compact corner indicator when robot is already online, full auto searching/testing overlays remain visible, and model rotation is explicitly synced on online/offline transitions.
- Follow-up: auto-monitor now skips redundant online probes while automated testing is active and re-probes when tests imply connectivity failure.
- Follow-up: auto-fix now shows dedicated fixing animation state in UI, then switches to testing animation only for retest phase; monitor runtime merges are suppressed while local search/test/fix is active so manual tests and auto-fix take precedence.
- Verification: `PYTHONPATH=. pytest tests/backend -q` -> 50 passed.
- Notes: warnings are pre-existing FastAPI `on_event` deprecation and pytest class collection warning for `TestExecutor` naming.
- Implemented: workspace cleanup of generated artifacts (`__pycache__`, `.DS_Store`) plus new ignore rules in `.gitignore`.
- Implemented: `scripts/start_robot_maintenance.sh` to launch backend (`uvicorn`) + frontend static server (`http.server`), auto-detect Pi IP, and open browser with `apiBase` query param.
- Verification: `bash -n scripts/start_robot_maintenance.sh` passed; smoke run started backend and frontend, opened URL, and wrote logs under `.run/`.
- Notes: startup script now auto-selects an available frontend port if default is occupied and exits early when backend port is already in use.
