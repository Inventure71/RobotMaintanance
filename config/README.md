# Robot config contract

This folder contains the shared fleet config consumed by both backend and frontend.

## File: `robots.config.json`

Fleet inventory config:
- contains robot instances deployed in the system
- includes robot identity, SSH credentials, and type reference

- shape: `{ "version": "1.0", "robots": [...] }` (recommended)
- also accepts `{ "fleet": [...] }` or a direct array for backwards compatibility

Each robot entry:
- `id` (required, unique): string
- `name` (required): string
- `type` (required): string
- `ip` (required): robot host/IP address
- `ssh` (optional):
  - `username` (optional): SSH username
  - `password` (optional): SSH password
  - This file keeps runtime credentials in plaintext for development only. In production, replace with a secure secret mechanism.
- `modelUrl` (optional): URL/path to model file

## File: `robot-types.config.json`

Robot type contract:
- defines each robot family
- defines test names and expected results
- stores the required topic set per type

Shape:
- `{ "version": "1.0", "robotTypes": [...] }`
- each robot type contains:
  - `id`: canonical type id used by `robots.config.json`
  - `name`: display name
  - `topics`: full topic list the robot is expected to expose
  - `tests`: list of test definitions:
    - `id`: canonical test id
    - `label`: human label
    - `icon`: optional emoji
    - `requiredTopics`: topic subset checked for this specific test
    - `definitionRef`: optional shared test definition file (for example, topic presence parser)
    - `possibleResults`: possible status/value/detail outcomes
  - `autoFixes` (optional): list of predefined fix actions shown in UI fix mode:
    - `id`: canonical action id
    - `label`: button label
    - `description`: short description shown as tooltip/help
    - `commands`: terminal commands to execute (in order)
    - `testIds`: tests to run after commands (optional)

Example type:
`rosbot-2-pro` is included and configured with test definitions for online, general topics, movement, battery, lidar, camera, and proximity sensors.

If runtime payload is unavailable from `/api/robots`, static config is still used so new robots appear immediately in the UI.

## Adding a new robot (fast path)
1. Add one entry to `robots.config.json`.
2. Ensure `type` matches an existing `robot-types.config.json` `robotTypes[].id` entry.
3. Add model file under `assets/models/` and set `modelUrl` if needed.
