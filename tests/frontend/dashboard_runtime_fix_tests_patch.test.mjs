import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/controller/createFixTestsFeature.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function makeNode() {
  return {
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {},
    },
    style: {},
    children: [],
    appendChild: () => {},
    replaceChildren: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => '',
  };
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source.replace(
    'export function createFixTestsFeature',
    'function createFixTestsFeature',
  )}\nmodule.exports = { createFixTestsFeature };\n`;
  const context = {
    console,
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.createFixTestsFeature;
}

function makeEnv(state) {
  const env = {
    state,
  };
  return new Proxy(env, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return makeNode();
    },
  });
}

function makeRuntime(state) {
  const runtime = {
    getRobotById: (id) => state.robots.find((robot) => normalizeText(robot?.id, '') === normalizeText(id, '')) || null,
    renderDashboard: () => {
      state.renderDashboardCalls = (state.renderDashboardCalls || 0) + 1;
    },
    robotId: (robot) => normalizeText(robot?.id ?? robot, ''),
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

test('applyRuntimeRobotPatches rerenders the grouped dashboard when runtime robots change', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    detailRobotId: '',
    renderDashboardCalls: 0,
    robots: [
      { id: 'carrier-1' },
      { id: 'inspector-1' },
    ],
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  api.applyRuntimeRobotPatches(new Set(['carrier-1']));

  assert.equal(state.renderDashboardCalls, 1);
});

test('applyRuntimeRobotPatches ignores empty runtime updates', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    detailRobotId: '',
    renderDashboardCalls: 0,
    robots: [{ id: 'carrier-1' }],
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  api.applyRuntimeRobotPatches(new Set());

  assert.equal(state.renderDashboardCalls, 0);
});
