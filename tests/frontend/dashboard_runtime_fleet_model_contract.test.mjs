import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeFleetView.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function normalizeTypeId(value) {
  return normalizeText(value, '').toLowerCase();
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      "import { createModelAssetResolver } from '../../primitives/model-viewer/modelAssetResolver.js';",
      "const createModelAssetResolver = () => ({ getInitialModelUrl: (url) => url, bindModelViewerSource: () => {} });",
    )
    .replace(
      'export function registerFleetViewRuntime',
      'function registerFleetViewRuntime',
    )}\nmodule.exports = { registerFleetViewRuntime };\n`;
  const context = {
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.registerFleetViewRuntime;
}

function makeRuntime(env) {
  return {
    getRobotTypeConfig: (typeId) => env.ROBOT_TYPE_BY_ID.get(normalizeTypeId(typeId)) || null,
    normalizeRobotTests: () => ({
      tests: { online: { status: 'ok', value: 'reachable', details: 'ok' } },
      definitions: [],
    }),
    normalizeRobotActivity: () => ({ searching: false, testing: false }),
    normalizeTestDebugCollection: () => [],
    readRobotField: (robot, key) => robot?.ssh?.[key] ?? robot?.[key],
  };
}

function makeEnv() {
  return {
    DEFAULT_ROBOT_MODEL_URL: 'assets/models/default.glb',
    FIX_MODE_CONTEXT_DASHBOARD: 'dashboard',
    FIX_MODE_CONTEXT_DETAIL: 'detail',
    ONLINE_SORT_BATTERY: 'battery',
    ONLINE_SORT_LABELS: { battery: 'Battery' },
    ONLINE_SORT_ORDER: ['battery'],
    normalizeStatus: () => 'ok',
    normalizeText,
    normalizeTypeId,
    ROBOT_TYPE_BY_ID: new Map([
      [
        'rosbot-2-pro',
        {
          typeId: 'rosbot-2-pro',
          label: 'Rosbot 2 Pro',
          topics: [],
          autoFixes: [],
          model: { file_name: 'rosbot-2-pro.glb' },
        },
      ],
    ]),
    state: {
      onlineSortMode: 'battery',
      robots: [],
      robotsById: new Map(),
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      searchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      automatedRobotActivityById: new Map(),
      fixModeOpen: { dashboard: false, detail: false },
    },
  };
}

test('normalizeRobotData resolves effective model from overrides then type defaults', async () => {
  const registerFleetViewRuntime = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = registerFleetViewRuntime(runtime, env);

  const robots = api.normalizeRobotData([
    { id: 'r1', name: 'one', type: 'rosbot-2-pro', ip: 'host-a' },
    {
      id: 'r2',
      name: 'two',
      type: 'rosbot-2-pro',
      ip: 'host-b',
      model: { file_name: 'custom.glb', path_to_quality_folders: 'assets/models/custom' },
    },
    { id: 'r3', name: 'three', type: 'unknown', ip: 'host-c' },
  ]);

  assert.equal(robots[0].modelUrl, 'assets/models/rosbot-2-pro.glb');
  assert.equal(robots[1].modelUrl, 'assets/models/custom/custom.glb');
  assert.equal(robots[2].modelUrl, 'assets/models/default.glb');
});
