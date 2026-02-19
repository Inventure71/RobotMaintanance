# Robot 3D model assets

Drop all robot models in this folder.

- Supported formats: `.glb` (recommended) and `.gltf` (+ texture folder in the same relative layout).
- Keep model file names stable and versioned, for example:
  - `rosbot-2p-pro.glb`
  - `rosbot-mini-pro-v2.glb`
- Reference models from `config/robots.config.json` using the `modelUrl` field.

Examples:
- `/assets/models/rosbot-2p-pro.glb`
- `/assets/models/fleet-a/rosbot-2p-pro-v2.glb`

If you add textures for `.gltf`, keep textures in a subfolder and keep paths relative to the `.gltf` file.
