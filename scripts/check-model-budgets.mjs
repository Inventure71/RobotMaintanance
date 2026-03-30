import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MODEL_ROOT = path.join(ROOT, 'assets', 'models');
const BUDGETS = {
  LowRes: 1_600_000,
  HighRes: 3_200_000,
};

async function collectModelFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectModelFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.glb') && !entry.name.toLowerCase().endsWith('.gltf')) continue;
    files.push(fullPath);
  }
  return files;
}

function formatBytes(value) {
  return `${(value / (1024 * 1024)).toFixed(2)}MB`;
}

async function main() {
  let hasError = false;
  for (const [qualityFolder, budget] of Object.entries(BUDGETS)) {
    const qualityPath = path.join(MODEL_ROOT, qualityFolder);
    const files = await collectModelFiles(qualityPath);
    for (const filePath of files) {
      const info = await stat(filePath);
      if (info.size > budget) {
        hasError = true;
        const relPath = path.relative(ROOT, filePath);
        console.error(
          `[model-budget] ${relPath} exceeds ${formatBytes(budget)} (actual ${formatBytes(info.size)})`,
        );
      }
    }
  }
  if (hasError) {
    process.exitCode = 1;
    return;
  }
  console.log('[model-budget] All model assets are within configured size budgets.');
}

main().catch((error) => {
  console.error('[model-budget] Failed to validate model budgets.', error);
  process.exitCode = 1;
});
