import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const MODULE_PATH = path.resolve(
  '/Users/inventure71/VSProjects/RobotMaintanance/assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeDataInit.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function normalizeStatus(value) {
  const normalized = normalizeText(value, 'warning').toLowerCase();
  if (normalized === 'ok' || normalized === 'warning' || normalized === 'error') return normalized;
  return 'warning';
}

function normalizeRobotActivity(raw = {}) {
  return {
    searching: Boolean(raw?.searching),
    testing: Boolean(raw?.testing),
    phase: normalizeText(raw?.phase, ''),
    lastFullTestAt: Number.isFinite(Number(raw?.lastFullTestAt)) ? Number(raw.lastFullTestAt) : 0,
    lastFullTestSource: normalizeText(raw?.lastFullTestSource, ''),
    updatedAt: Number.isFinite(Number(raw?.updatedAt)) ? Number(raw.updatedAt) : 0,
  };
}

function normalizeRobotTests(raw = {}) {
  const online = raw?.online && typeof raw.online === 'object' ? raw.online : {};
  return {
    tests: {
      online: {
        status: normalizeStatus(online.status),
        value: normalizeText(online.value, 'unknown'),
        details: normalizeText(online.details, 'Not checked yet'),
        reason: normalizeText(online.reason, ''),
        source: normalizeText(online.source, 'live'),
        checkedAt: Number.isFinite(Number(online.checkedAt)) ? Number(online.checkedAt) : 0,
      },
    },
  };
}

function makeRuntime(env) {
  const runtime = {
    applyRuntimeRobotPatches: () => {},
    normalizeRobotActivity,
    normalizeRobotTests,
    robotId: (robot) => normalizeText(robot?.id, ''),
    setRobots: (robots) => {
      env.state.robots = robots;
    },
    syncAutoMonitorRefreshState: () => {},
    syncAutomatedRobotActivityFromState: () => {},
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

function makeEnv(state) {
  return {
    FLEET_RUNTIME_ENDPOINT: '/api/fleet/runtime',
    FLEET_STATIC_ENDPOINT: '/api/fleet/static',
    ROBOTS_CONFIG_URL: '/robots.config.json',
    ROBOT_TYPES_CONFIG_URL: '/robot-types.config.json',
    RUNTIME_ALLOWED_SOURCES: new Set(['live', 'manual', 'auto-monitor', 'auto-monitor-topics']),
    backendData: [],
    buildApiUrl: (route) => `http://localhost${route}`,
    normalizeStatus,
    normalizeText,
    setRobotTypeDefinitions: () => [],
    state,
  };
}

async function loadApi(fetchImpl) {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source.replace(
    'export function registerDataInitRuntime',
    'function registerDataInitRuntime',
  )}\nmodule.exports = { registerDataInitRuntime };\n`;
  const context = {
    console,
    fetch: fetchImpl,
    module: { exports: {} },
    exports: {},
    window: {
      addEventListener: () => {},
      clearInterval,
      setInterval,
      setTimeout,
    },
  };
  vm.runInNewContext(transformed, context, {
    filename: MODULE_PATH,
  });
  return context.module.exports.registerDataInitRuntime;
}

test('refreshRuntimeStateFromBackend accepts zero runtime version', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      json: async () => ({ version: 0, full: false, robots: [] }),
    };
  };

  const registerDataInitRuntime = await loadApi(fetchImpl);
  const state = {
    fixingRobotIds: new Set(),
    isRuntimeSyncInFlight: false,
    robots: [],
    runtimeVersion: 27,
    searchingRobotIds: new Set(),
    testingRobotIds: new Set(),
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(env);

  const api = registerDataInitRuntime(runtime, env);
  await api.refreshRuntimeStateFromBackend();

  assert.equal(state.runtimeVersion, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /since=27/);
});

test('mergeRuntimeRobotsIntoList clears omitted robots in full snapshots', async () => {
  const registerDataInitRuntime = await loadApi(async () => ({ ok: false }));
  const state = {
    fixingRobotIds: new Set(),
    robots: [],
    runtimeVersion: 0,
    searchingRobotIds: new Set(),
    testingRobotIds: new Set(),
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(env);

  const api = registerDataInitRuntime(runtime, env);
  const existingRobot = {
    id: 'r-1',
    typeId: 'picker',
    tests: {
      online: {
        status: 'ok',
        value: 'online',
        details: 'Connected',
        reason: '',
        source: 'live',
        checkedAt: 123,
      },
    },
    activity: {
      searching: true,
      testing: true,
      phase: 'testing',
      lastFullTestAt: 100,
      lastFullTestSource: 'auto-monitor',
      updatedAt: 101,
    },
  };

  const fullSnapshotResult = api.mergeRuntimeRobotsIntoList([existingRobot], [], {
    fullSnapshot: true,
    respectLocalPriority: true,
  });

  assert.equal(fullSnapshotResult.changedRobotIds.has('r-1'), true);
  assert.equal(fullSnapshotResult.merged[0].tests.online.status, 'warning');
  assert.equal(fullSnapshotResult.merged[0].activity.searching, false);
  assert.equal(fullSnapshotResult.merged[0].activity.testing, false);
  assert.equal(fullSnapshotResult.merged[0].activity.phase, '');

  const deltaResult = api.mergeRuntimeRobotsIntoList([existingRobot], [], {
    fullSnapshot: false,
    respectLocalPriority: true,
  });

  assert.equal(deltaResult.changedRobotIds.size, 0);
  assert.equal(deltaResult.merged[0], existingRobot);
});
