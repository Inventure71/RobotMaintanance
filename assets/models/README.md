# Robot 3D model assets

Store robot models under the quality folders in this directory:

- `assets/models/LowRes`
- `assets/models/HighRes`

Supported formats:

- `.glb` (recommended)
- `.gltf` with its texture assets kept in the same relative layout

Robot type creation now uploads two files:

- one low-quality model, saved into `LowRes`
- one high-quality model, saved into `HighRes`

The server renames both uploads to the same generated file name based on the robot type ID, then persists that shared file name into `config/robot-types.config.json` as `model.file_name`.

Optional per-robot overrides in `config/robots.config.json` still use:

- `model.file_name`
- `model.path_to_quality_folders`
