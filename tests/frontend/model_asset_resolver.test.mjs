import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const MODULE_PATH = path.resolve(
  '/Users/inventure71/VSProjects/RobotMaintanance/assets/js/modules/dashboard/primitives/model-viewer/modelAssetResolver.js',
);

async function loadModule() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      'export function buildModelQualityCandidates',
      'function buildModelQualityCandidates',
    )
    .replace('export function createModelAssetResolver', 'function createModelAssetResolver')}
module.exports = { buildModelQualityCandidates, createModelAssetResolver };
`;
  const context = {
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(transformed, context, {
    filename: MODULE_PATH,
  });
  return context.module.exports;
}

test('buildModelQualityCandidates cycles from requested quality', async () => {
  const { buildModelQualityCandidates } = await loadModule();
  const lowFirst = Array.from(buildModelQualityCandidates('assets/models/rosbot-2-pro.glb', 'low'));
  const highFirst = Array.from(buildModelQualityCandidates('assets/models/rosbot-2-pro.glb', 'high'));

  assert.deepEqual(lowFirst, [
    'assets/models/LowRes/rosbot-2-pro.glb',
    'assets/models/HighRes/rosbot-2-pro.glb',
  ]);
  assert.deepEqual(highFirst, [
    'assets/models/HighRes/rosbot-2-pro.glb',
    'assets/models/LowRes/rosbot-2-pro.glb',
  ]);
});

test('buildModelQualityCandidates normalizes incoming quality-prefixed paths', async () => {
  const { buildModelQualityCandidates } = await loadModule();
  const candidates = Array.from(
    buildModelQualityCandidates('assets/models/HighRes/fleet/robot.glb', 'low'),
  );

  assert.deepEqual(candidates, [
    'assets/models/LowRes/fleet/robot.glb',
    'assets/models/HighRes/fleet/robot.glb',
  ]);
});

test('resolveModelUrl probes each quality once and stops before looping', async () => {
  const calls = [];
  const { createModelAssetResolver } = await loadModule();
  const resolver = createModelAssetResolver({
    fetchImpl: async (url, init = {}) => {
      calls.push(`${init.method || 'GET'} ${url}`);
      if (String(url).includes('/LowRes/')) {
        return { ok: false, status: 404 };
      }
      return { ok: true, status: 200 };
    },
  });

  const resolved = await resolver.resolveModelUrl('assets/models/rosbot-2-pro.glb', 'low');
  assert.equal(resolved, 'assets/models/HighRes/rosbot-2-pro.glb');
  assert.deepEqual(calls, [
    'HEAD assets/models/LowRes/rosbot-2-pro.glb',
    'HEAD assets/models/HighRes/rosbot-2-pro.glb',
  ]);
});

test('resolveModelUrl falls back to first candidate when none exists', async () => {
  const calls = [];
  const { createModelAssetResolver } = await loadModule();
  const resolver = createModelAssetResolver({
    fetchImpl: async (url, init = {}) => {
      calls.push(`${init.method || 'GET'} ${url}`);
      return { ok: false, status: 404 };
    },
  });

  const resolved = await resolver.resolveModelUrl('assets/models/rosbot-2-pro.glb', 'high');
  assert.equal(resolved, 'assets/models/HighRes/rosbot-2-pro.glb');
  assert.deepEqual(calls, [
    'HEAD assets/models/HighRes/rosbot-2-pro.glb',
    'HEAD assets/models/LowRes/rosbot-2-pro.glb',
  ]);
});
