# VIGIL Execution Contract

VIGIL separates a platform-agnostic SSH orchestration engine from platform-specific robot definitions.

## System Boundary

The core backend does not know ROS, Docker, TIAGO, Rosbot, or a particular Linux distribution as product concepts. It knows how to:

- load robot inventory and robot type mappings
- open SSH sessions to robots
- run ordered shell commands
- evaluate command output through declarative read rules
- serialize user work per robot
- report fleet runtime state

Robot-specific behavior belongs in definitions:

- command primitives
- test definitions
- fix definitions
- robot type mappings
- platform tags and required tools

Keeping this boundary strict is what makes the engine platform agnostic while still allowing specialized checks and repairs.

## Definition Isolation

A test or fix definition is the unit of shell-state isolation.

- One test definition gets one automation shell context.
- One fix definition gets one automation shell context.
- Commands inside a definition run in listed order.
- Shell state inside a definition is shared by later steps in the same definition.
- Shell state does not leak between separate test definitions.
- A fix may run post-tests after its own execute steps finish.

This means commands like `cd`, `source`, exported environment variables, sudo timestamps, temporary files, and background process changes may affect later steps in the same definition. Definition authors must treat `execute[]` as an ordered script, not as independent commands.

## Result Semantics

Each command step records:

- step id
- resolved command
- timeout
- exit code when available
- timeout flag
- output
- elapsed time
- cache use when `reuseKey` is set

A command failure stops evaluation for that definition and returns an execution error for the affected checks. Other definitions in the same requested test run remain isolated and may still execute.

Each check evaluates previously saved command output through its `read` rule and emits a flat result keyed by check id. A single definition may emit many check results from one shared command sequence.

## Concurrency

User jobs are serialized per robot. Different robots may run work concurrently, subject to monitor and fleet-level limits.

Within one robot:

- at most one active user job runs at a time
- additional jobs queue FIFO
- manual stop requests mark the active job interrupting
- the backend first sends Ctrl-C, then closes/reset SSH transport if needed

## Platform Metadata

Definitions should declare platform intent even though the core engine remains generic.

Recommended fields for tests:

- `platformTags`: example `["linux", "ros1", "noetic"]`
- `requires`: example `["bash", "rostopic"]`
- `sideEffects`: `read_only` or `mutating`
- `isolation`: currently `definition_shell`

Recommended fields for fixes:

- `platformTags`: example `["linux", "rosbot-2-pro"]`
- `requires`: example `["bash", "docker"]`
- `sideEffects`: usually `mutating`
- `risk`: `low`, `medium`, `high`, or `destructive`
- `requiresApproval`: `true` for disruptive actions
- `expectedDowntimeSec`: expected robot disruption duration

Credentials intentionally remain in `config/robots.config.json` for the current deployment phase.
