# Robot Maintenance

Robot Maintenance is a fleet operations platform for SSH-managed robots.  
It provides a FastAPI backend and a browser dashboard for diagnostics, terminal access, and recovery workflows.

## Overview

The system is designed for operational reliability and fast maintenance cycles:

- Centralized fleet status: online connectivity, battery, topics, and runtime activity
- Interactive remote operations through per-robot SSH terminals
- Definition-driven diagnostics and fixes (JSON-based, versionable, and reloadable)
- Robot-type mapping so capabilities can be rolled out consistently by platform

## Key Capabilities

### SSH Session Management

- Persistent interactive shells are implemented with Paramiko `invoke_shell()` in `backend/ssh_client.py`.
- Sessions are scoped by `pageSessionId` and `robotId`, enabling stable terminal context per UI view.
- The shell layer supports prompt-aware command execution, non-blocking output reads, and PTY resize.

### Integrated Live Terminal

- The dashboard terminal (`assets/js/components/robot-terminal-component.js`) supports:
  - bidirectional WebSocket streaming
  - interactive input forwarding
  - terminal resize synchronization
  - command presets for common maintenance actions
- Terminal API surface:
  - `POST /api/robots/{robot_id}/terminal/session`
  - `DELETE /api/robots/{robot_id}/terminal/session`
  - `POST /api/robots/{robot_id}/terminal`
  - `WS /api/robots/{robot_id}/terminal/stream`

### Definition-First Tests and Fixes

- Command primitives: `config/command-primitives/*.command.json`
- Test definitions: `config/tests/*.test.json`
- Fix definitions: `config/fixes/*.fix.json`
- Robot-type mappings: `config/robot-types.config.json`

Definitions are validated at startup and on reload, including ID references and primitive tokens.

### Auto-Monitor Runtime Engine

- `TerminalManager` continuously collects online/battery/topic signals.
- Busy-state handling avoids conflicting checks during active test/fix/search workflows.
- Runtime snapshots and deltas are available from `/api/fleet/runtime`.

## System Architecture

- Backend (`backend/`):
  - FastAPI routers for robots, terminal, tests, fixes, monitor, definitions, and bug reports
  - orchestration and runtime control in `backend/terminal_manager/`
- Frontend (`index.html`, `assets/js`, `assets/css`):
  - modular dashboard controllers, services, and UI primitives
- Configuration (`config/`):
  - fleet catalog, robot types, test/fix definitions, and command primitives
- Test suites (`tests/`):
  - backend unit tests, frontend runtime tests, and SSH integration tests

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js + npm (for Vite frontend dev server)
- SSH reachability to target robots

### Run the Platform

```bash
./start.sh
```

Startup flow (`scripts/start_robot_maintenance.sh`):
- optional safe git fast-forward update
- virtual environment bootstrap when required
- dependency installation from `backend/requirements.txt`
- dependency installation from `package.json`
- backend launch via `uvicorn`
- frontend launch via `vite` (`npm run dev`)

Default ports:
- backend: `8010`
- frontend: `8080` (auto-increments if occupied)

Supported environment overrides:
- `BACKEND_PORT`, `FRONTEND_PORT`, `HOST`
- `SKIP_GIT_UPDATE=1`
- `GIT_UPDATE_REMOTE`, `GIT_UPDATE_BRANCH`

## Docker Deployment (No Nginx Proxy)

This repository supports a two-image deployment model:

- backend image (FastAPI) exposed on server port `5010`
- frontend image (static dashboard) exposed on server port `5000`

The frontend is already configured so opening `http://<server-ip>:5000` automatically targets backend `http://<server-ip>:5010`.

### Build and Push Images (local machine or CI)

```bash
docker login <registry>

docker build -f Dockerfile.backend -t <registry>/robot-maintenance-backend:<tag> .
docker build -f Dockerfile.frontend -t <registry>/robot-maintenance-frontend:<tag> .

docker push <registry>/robot-maintenance-backend:<tag>
docker push <registry>/robot-maintenance-frontend:<tag>
```

### Server Deployment (pull and run only)

1. Copy `docker-compose.server.yml` to the server.
2. Create `.env.server` on the server (or rename `.env.server.example`) with:

```bash
BACKEND_IMAGE=<registry>/robot-maintenance-backend:<tag>
FRONTEND_IMAGE=<registry>/robot-maintenance-frontend:<tag>
```

3. Deploy:

```bash
docker login <registry>
docker compose --env-file .env.server -f docker-compose.server.yml pull
docker compose --env-file .env.server -f docker-compose.server.yml up -d
```

4. Access:

```text
http://<server-ip>:5000
```

## Development and Testing

### Backend Tests

```bash
PYTHONPATH=. pytest -q
```

`pytest.ini` excludes integration tests by default (`-m "not integration"`).

### SSH Integration Tests

```bash
SSH_TEST_HOST=... SSH_TEST_USER=... SSH_TEST_PASS=... SSH_TEST_PORT=22 \
PYTHONPATH=. pytest -q -m integration tests/ssh_test/test_ssh_api_v2_integration.py
```

### Frontend Runtime Tests

```bash
node --test tests/frontend/dashboard_runtime_data_init.test.mjs
```

## Adding New Diagnostic Tests

Recommended workflow (file-based, version-controlled):

1. Create `config/tests/<name>.test.json` with:
   - `id`
   - `mode` (`orchestrate` or `online_probe`)
   - `execute[]` steps
   - `checks[]` definitions
   - each `checks[].metadata` must include boolean `runAtConnection`
2. Add any referenced primitives under `config/command-primitives/`.
3. Add new check IDs to `testRefs` in `config/robot-types.config.json`.
4. Reload definitions: `POST /api/definitions/reload`.
5. Execute test run:

```bash
curl -X POST "http://localhost:8010/api/robots/<robot_id>/tests/run" \
  -H "Content-Type: application/json" \
  -d '{"pageSessionId":"manual-run","testIds":["<check_id>"],"dryRun":false}'
```

UI workflow is also supported through the Manage/Recorder flow builder for creating and mapping generated checks.

Auto connection retry behavior:
- On `offline -> online`, the backend runs checks flagged `runAtConnection=true`.
- If any selected check fails, it retries every `2.5` seconds for up to `60` seconds from reconnect.
- Retries stop immediately on manual activity or disconnect.

Manual/API test-run online precheck:
- `POST /api/robots/{robot_id}/tests/run` performs a forced online probe before running any non-`online` checks.
- If the robot is offline, the endpoint returns `200` with structured results: current `online` status plus skipped non-online checks (`reason=OFFLINE_PRECHECK`, `skipped=true`).
- `online`-only runs remain allowed.

## Adding New Fixes

1. Create `config/fixes/<name>.fix.json` (`id`, `label`, `description`, `enabled`, `execute[]`, optional `postTestIds`).
2. Add fix IDs to `fixRefs` in `config/robot-types.config.json`.
3. Reload definitions: `POST /api/definitions/reload`.
4. Start a fix run:

```bash
curl -X POST "http://localhost:8010/api/robots/<robot_id>/fixes/<fix_id>/runs" \
  -H "Content-Type: application/json" \
  -d '{"pageSessionId":"manual-fix","params":{}}'
```

## Configuration Reference

See `config/README.md` for the complete configuration contract and validation rules.

## Extra
Useful website https://optimizeglb.com/dashboard
