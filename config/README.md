# Robot Config Contract

This folder contains fleet and behavior configuration for the connector-first execution model.

## File: `/Users/inventure71/VSProjects/RobotMaintanance/config/robots.config.json`

Fleet inventory config.

Accepted shapes:
- `{ "version": "1.0", "robots": [...] }` (recommended)
- `{ "fleet": [...] }`
- direct array

Each robot entry:
- `id` (required, unique)
- `name` (required)
- `type` (required): references `/Users/inventure71/VSProjects/RobotMaintanance/config/robot-types.config.json` `robotTypes[].id`
- `ip` (required)
- `ssh` (optional): `username`, `password`, `port`
- `modelUrl` (optional)

## Directory: `/Users/inventure71/VSProjects/RobotMaintanance/config/command-primitives/`

Reusable command primitives (`*.command.json`).

Example:
```json
{
  "id": "rostopic_list",
  "command": "timeout 12s rostopic list",
  "timeoutSec": 12,
  "description": "ROS topic snapshot"
}
```

Runtime rule:
- command string of the form `$name$` in test/fix steps resolves through this directory.
- unknown `$name$` tokens fail startup.

## Directory: `/Users/inventure71/VSProjects/RobotMaintanance/config/tests/`

Self-contained test definitions (`*.test.json`).

Contract:
- `id`
- `mode`: `orchestrate` (default) or `online_probe`
- `execute[]`: command steps (`id`, `command`, optional `timeoutSec`, `retries`, `saveAs`, `reuseKey`)
- `checks[]`: each check has:
  - `id` (global check id used by dashboard/API)
  - `read` (`contains_string`, `contains_lines_unordered`, `contains_any_string`)
  - `pass` and `fail` result payloads
  - optional `metadata` (`label`, `icon`, defaults, `possibleResults`, `params`)

Behavior:
- one test definition can emit many independent check results.
- orchestrator executes `execute[]` once and fans out flat results per check id.

## Directory: `/Users/inventure71/VSProjects/RobotMaintanance/config/fixes/`

Self-contained fix definitions (`*.fix.json`).

Contract:
- `id`, `label`, `description`, `enabled`
- `execute[]` (same step shape as tests)
- optional `params`
- optional `postTestIds[]` (check ids)

Behavior:
- fixes run via async fix-job endpoints.
- post-tests run once after execute steps complete.

## File: `/Users/inventure71/VSProjects/RobotMaintanance/config/robot-types.config.json`

Robot types reference check/fix IDs only.

Shape:
- `{ "version": "3.0", "robotTypes": [...] }`

Each robot type entry:
- `id`, `name`
- `topics`
- `testRefs`: ordered list of check ids (from test definition `checks[].id`)
- `fixRefs`: ordered list of fix ids
- `testOverrides` (optional): map check id -> override object
- `fixOverrides` (optional): map fix id -> override object
- `autoMonitor` (optional)

Validation:
- unknown `testRefs`, `fixRefs`, or fix `postTestIds` fail startup.
- overrides are merged on top of definition metadata/params.

## Runtime behavior

- Backend loads directories at startup and validates IDs/tokens.
- `POST /api/robots/{robotId}/tests/run` returns flat `results[]` by check id.
- `POST /api/robots/{robotId}/fixes/{fixId}/runs` starts async fix jobs.
- `GET /api/robots/{robotId}/fixes/runs/{runId}` polls job state/events/results.
