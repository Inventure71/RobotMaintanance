# Robot 3D model assets

Drop all robot models in this folder.

- Supported formats: `.glb` (recommended) and `.gltf` (+ texture folder in the same relative layout).
- Keep model file names stable and versioned, for example:
  - `rosbot-2p-pro.glb`
  - `rosbot-mini-pro-v2.glb`
- Reference models from:
  - `config/robot-types.config.json` with `robotTypes[].model.file_name` (default path is `assets/models`)
  - optional per-robot overrides in `config/robots.config.json` using `model.file_name` and `model.path_to_quality_folders`

Examples:
- `/assets/models/rosbot-2p-pro.glb`
- `/assets/models/fleet-a/rosbot-2p-pro-v2.glb`

If you add textures for `.gltf`, keep textures in a subfolder and keep paths relative to the `.gltf` file.
