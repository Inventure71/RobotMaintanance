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
- `model` (optional robot-level override object):
  - `file_name` (optional override)
  - `path_to_quality_folders` (optional override, default `assets/models`)

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

## Directory: `/Users/inventure71/VSProjects/RobotMaintanance/config/terminal-context/`

Recorder/operator terminal bundles (`*.commands.json`).

Example:
```json
{
  "id": "recorder_generic_info",
  "commands": [
    {
      "label": "OS release",
      "command": "cat /etc/os-release",
      "timeoutSec": 5
    }
  ]
}
```

Behavior:
- frontend recorder terminal presets can load these files and expand them into one bounded shell bundle.
- entries are intended for read-only diagnostics and operator/LLM context capture, not mutating actions.

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
  - required `metadata.runAtConnection` (boolean)
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
- fixes do not declare post-test ids; after a fix finishes the robot reruns its assigned test suite

Behavior:
- fixes run via async fix-job endpoints.
- post-tests run once after execute steps complete.

## File: `/Users/inventure71/VSProjects/RobotMaintanance/config/robot-types.config.json`

Robot types reference check/fix IDs only.

Shape:
- `{ "version": "3.0", "robotTypes": [...] }`

Each robot type entry:
- `id`, `name`
- `model` (optional type default object):
  - `file_name` (optional, recommended)
  - `path_to_quality_folders` (optional, default `assets/models`)
- `topics`
- `testRefs`: ordered list of check ids (from test definition `checks[].id`)
- `fixRefs`: ordered list of fix ids
- `testOverrides` (optional): map check id -> override object
- `fixOverrides` (optional): map fix id -> override object
- `autoMonitor` (optional)

Validation:
- unknown `testRefs` or `fixRefs` fail startup.
- overrides are merged on top of definition metadata/params.
- when robot types are created from the UI, the backend stores low/high uploads under `assets/models/LowRes` and `assets/models/HighRes`, then writes the shared renamed file as `model.file_name`.

## Runtime behavior

- Backend loads directories at startup and validates IDs/tokens.
- `POST /api/robots/{robotId}/tests/run` returns flat `results[]` by check id.
- `POST /api/robots/{robotId}/fixes/{fixId}/runs` starts async fix jobs.
- `GET /api/robots/{robotId}/fixes/runs/{runId}` polls job state/events/results.
- On `offline -> online`, backend runs checks flagged `runAtConnection=true`; retries every 5s for up to 60s, and cancels on manual activity or disconnect.
