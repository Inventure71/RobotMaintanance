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

function makeClassList() {
  const values = new Set();
  return {
    add: (...tokens) => tokens.forEach((token) => values.add(String(token))),
    remove: (...tokens) => tokens.forEach((token) => values.delete(String(token))),
    contains: (token) => values.has(String(token)),
    toggle: (token, force) => {
      const normalized = String(token);
      if (force === undefined) {
        if (values.has(normalized)) {
          values.delete(normalized);
          return false;
        }
        values.add(normalized);
        return true;
      }
      if (force) values.add(normalized);
      else values.delete(normalized);
      return force;
    },
  };
}

function makeButton(label = '') {
  const attributes = new Map();
  return {
    textContent: label,
    title: '',
    disabled: false,
    dataset: {},
    classList: makeClassList(),
    setAttribute: (name, value) => {
      attributes.set(String(name), String(value));
    },
    getAttribute: (name) => attributes.get(String(name)) ?? null,
  };
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

test('getConfiguredDefaultTestIds uses all enabled mapped tests and can include online', async () => {
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
        testDefinitions: [
          { id: 'online', enabled: true, runAtConnection: false },
          { id: 'general', enabled: true, runAtConnection: true },
          { id: 'movement', enabled: true, runAtConnection: false },
          { id: 'disabled-check', enabled: false, runAtConnection: true },
        ],
      },
      true,
    )),
    ['online', 'general', 'movement'],
  );
});

test('setRunningButtonState disables the detail Run tests button while the active robot is auto testing', async () => {
  const runButton = makeButton('Run tests');
  const registerRuntimeFixTestsRuntime = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'registerRuntimeFixTestsRuntime',
  );
  const env = makeEnv({
    $: (selector) => (selector === '#runRobotTests' ? runButton : null),
    applyActionButton: (button, options = {}) => {
      if (typeof options.label === 'string') button.textContent = options.label;
      if (typeof options.title === 'string') button.title = options.title;
      button.disabled = Boolean(options.disabled);
      return button;
    },
    setActionButtonLoading: (button, isLoading, options = {}) => {
      button.textContent = isLoading ? String(options.loadingLabel || 'Working...') : String(options.idleLabel || button.textContent);
      button.disabled = isLoading || options.disabled === true;
    },
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => [],
    getReachableRobotIds: () => [],
    getRunSelectedButtonIdleLabel: () => 'Run selected (default online)',
    isRobotTesting: (robotId) =>
      env.state.testingRobotIds.has(robotId) || env.state.autoTestingRobotIds.has(robotId),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = registerRuntimeFixTestsRuntime(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runButton.disabled, true);
  assert.equal(runButton.textContent, 'Run tests');
  assert.equal(runButton.title, 'Tests are already running for this robot.');
});

test('setRunningButtonState disables Run selected while one of the target robots is already testing', async () => {
  const runSelectedButton = makeButton('Run selected');
  const registerRuntimeFixTestsRuntime = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'registerRuntimeFixTestsRuntime',
  );
  const env = makeEnv({
    $: (selector) => (selector === '#runSelectedRobotTests' ? runSelectedButton : null),
    applyActionButton: (button, options = {}) => {
      if (typeof options.label === 'string') button.textContent = options.label;
      if (typeof options.title === 'string') button.title = options.title;
      button.disabled = Boolean(options.disabled);
      return button;
    },
    setActionButtonLoading: (button, isLoading, options = {}) => {
      button.textContent = isLoading ? String(options.loadingLabel || 'Working...') : String(options.idleLabel || button.textContent);
      button.disabled = isLoading || options.disabled === true;
    },
    state: {
      pageSessionId: 'test-session',
      detailRobotId: '',
      selectedRobotIds: new Set(['robot-1', 'robot-2']),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-2']),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => Array.from(env.state.selectedRobotIds),
    getReachableRobotIds: () => ['robot-1', 'robot-2'],
    getRunSelectedButtonIdleLabel: () => 'Run selected',
    isRobotTesting: (robotId) =>
      env.state.testingRobotIds.has(robotId) || env.state.autoTestingRobotIds.has(robotId),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = registerRuntimeFixTestsRuntime(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runSelectedButton.disabled, true);
  assert.equal(runSelectedButton.textContent, 'Run selected');
  assert.equal(runSelectedButton.title, 'Tests are already running for one or more target robots.');
});

test('setRobotTypeDefinitions preserves robot type test refs and battery command metadata', async () => {
  const registerMonitorConfigRuntime = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'registerMonitorConfigRuntime',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = registerMonitorConfigRuntime(runtime, env);

  api.setRobotTypeDefinitions([
    {
      typeId: 'rosbot-2-pro',
      label: 'Rosbot 2 Pro',
      testRefs: ['battery', 'online'],
      fixRefs: ['flash_fix'],
      autoMonitor: { batteryCommand: 'echo battery state' },
      tests: [{ id: 'battery', label: 'Battery' }],
      autoFixes: [],
      topics: ['/battery'],
    },
  ]);

  const typeConfig = env.ROBOT_TYPE_BY_ID.get('rosbot-2-pro');
  assert.deepEqual(Array.from(typeConfig.testRefs), ['battery', 'online']);
  assert.deepEqual(Array.from(typeConfig.fixRefs), ['flash_fix']);
  assert.equal(typeConfig.batteryCommand, 'echo battery state');
});

test('normalizeTestDefinition preserves enabled manualOnly and runAtConnection metadata', async () => {
  const registerMonitorConfigRuntime = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'registerMonitorConfigRuntime',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = registerMonitorConfigRuntime(runtime, env);

  api.setRobotTypeDefinitions([
    {
      typeId: 'rosbot-2-pro',
      label: 'Rosbot 2 Pro',
      tests: [
        {
          id: 'general',
          label: 'General',
          enabled: false,
          manualOnly: false,
          runAtConnection: true,
        },
      ],
      autoFixes: [],
      topics: [],
    },
  ]);

  const typeConfig = env.ROBOT_TYPE_BY_ID.get('rosbot-2-pro');
  assert.equal(typeConfig.tests[0].enabled, false);
  assert.equal(typeConfig.tests[0].manualOnly, false);
  assert.equal(typeConfig.tests[0].runAtConnection, true);
});
