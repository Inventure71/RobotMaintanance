import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONITOR_MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeMonitorConfig.js',
);
const FIX_TESTS_MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeFixTests.js',
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

function normalizeTypeId(value) {
  return normalizeText(value, '').toLowerCase();
}

async function loadNamedExport(modulePath, exportName) {
  const source = await fs.readFile(modulePath, 'utf8');
  const transformed = `${source.replace(
    `export function ${exportName}`,
    `function ${exportName}`,
  )}\nmodule.exports = { ${exportName} };\n`;
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    window: {
      addEventListener: () => {},
      clearInterval,
      clearTimeout,
      setInterval,
      setTimeout,
    },
  };
  vm.runInNewContext(transformed, context, { filename: modulePath });
  return context.module.exports[exportName];
}

function makeEnv(overrides = {}) {
  const defaultTestDefinitions = [
    {
      id: 'online',
      label: 'Online',
      icon: '[]',
      defaultStatus: 'warning',
      defaultValue: 'unknown',
      defaultDetails: 'Not checked yet',
    },
    {
      id: 'general',
      label: 'General Topics',
      icon: '[]',
      defaultStatus: 'warning',
      defaultValue: 'n/a',
      defaultDetails: 'No detail available',
    },
  ];
  const base = {
    DEFAULT_TEST_DEFINITIONS: defaultTestDefinitions,
    TEST_DEFINITIONS: defaultTestDefinitions,
    ROBOT_TYPES: [],
    ROBOT_TYPE_BY_ID: new Map(),
    TEST_ICON_TEXT_FALLBACKS: {},
    LOW_BATTERY_WARNING_PERCENT: 20,
    normalizeStatus,
    normalizeText,
    normalizeTypeId,
    buildApiUrl: (route) => `http://localhost${route}`,
    state: {
      pageSessionId: 'test-session',
    },
  };
  return new Proxy({ ...base, ...overrides }, {
    get(target, prop) {
      return Object.prototype.hasOwnProperty.call(target, prop) ? target[prop] : undefined;
    },
  });
}

function makeRuntime(overrides = {}) {
  return new Proxy({ ...overrides }, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

test('normalizeRobotTests preserves empty definitions for known robot types', async () => {
  const registerMonitorConfigRuntime = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'registerMonitorConfigRuntime',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = registerMonitorConfigRuntime(runtime, env);

  api.setRobotTypeDefinitions([
    {
      typeId: 'empty-type',
      label: 'Empty Type',
      tests: [],
      autoFixes: [],
      topics: [],
    },
  ]);

  const emptyType = api.normalizeRobotTests({}, 'empty-type');
  assert.deepEqual(Array.from(emptyType.definitions), []);
  assert.deepEqual({ ...emptyType.tests }, {});

  const unknownType = api.normalizeRobotTests({}, 'unknown-type');
  assert.deepEqual(
    unknownType.definitions.map((definition) => definition.id),
    ['online', 'general'],
  );
  assert.deepEqual(Object.keys(unknownType.tests), ['online', 'general']);
});

test('getConfiguredDefaultTestIds does not inject global tests for known empty types', async () => {
  const registerRuntimeFixTestsRuntime = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'registerRuntimeFixTestsRuntime',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = registerRuntimeFixTestsRuntime(runtime, env);

  assert.deepEqual(
    Array.from(api.getConfiguredDefaultTestIds(
      {
        testDefinitions: [],
        tests: {
          online: { status: 'warning', value: 'unknown', details: 'Not checked yet' },
        },
      },
      false,
    )),
    [],
  );

  assert.deepEqual(
    Array.from(api.getConfiguredDefaultTestIds(
      {
        tests: {},
      },
      false,
    )),
    ['general'],
  );
});
