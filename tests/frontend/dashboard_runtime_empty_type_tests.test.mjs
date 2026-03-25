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
  '../../assets/js/modules/dashboard/features/monitor-config/controller/createMonitorConfigFeature.js',
);
const FIX_TESTS_MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/controller/createFixTestsFeature.js',
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

async function loadNamedExport(modulePath, exportName, extraContext = {}) {
  const source = await fs.readFile(modulePath, 'utf8');
  const transformed = `${source.replace(
    `export function ${exportName}`,
    `function ${exportName}`,
  )}\nmodule.exports = { ${exportName} };\n`;
  const defaultWindow = {
    addEventListener: () => {},
    clearInterval,
    clearTimeout,
    setInterval,
    setTimeout,
  };
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    window: defaultWindow,
    ...extraContext,
  };
  if (extraContext.window) {
    context.window = {
      ...defaultWindow,
      ...extraContext.window,
    };
  }
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
      robots: [],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
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
  const createMonitorConfigFeature = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'createMonitorConfigFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createMonitorConfigFeature(runtime, env);

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
  assert.deepEqual(Array.from(unknownType.definitions), []);
  assert.deepEqual(Object.keys(unknownType.tests), []);
});

test('getConfiguredDefaultTestIds does not inject global tests for known empty types', async () => {
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createFixTestsFeature(runtime, env);

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
    [],
  );
});

test('getConfiguredDefaultTestIds uses all enabled mapped tests and can include online', async () => {
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createFixTestsFeature(runtime, env);

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

test('updateRobotTestState preserves extended debug metadata for Info modal rendering', async () => {
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
  );
  const env = makeEnv({
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      robots: [{
        id: 'robot-1',
        name: 'Robot 1',
        typeId: 'rosbot',
        tests: {},
        testDebug: {},
      }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
    mapRobots: (updater) => {
      env.state.robots = env.state.robots.map((item) => updater(item));
    },
  });
  const api = createFixTestsFeature(runtime, env);

  api.updateRobotTestState(
    'robot-1',
    [{
      id: 'general',
      status: 'error',
      value: 'read_error',
      details: 'Parser mismatch in expected output.',
      reason: 'validator_fail',
      errorCode: 'definition_output_missing',
      source: 'executor',
      checkedAt: 111.5,
      ms: 320,
      read: { kind: 'contains_string', passed: false },
      steps: [{
        id: 'topics',
        status: 'error',
        value: 'missing_topic',
        details: 'Topic /scan was not present',
        ms: 300,
        output: '/battery\n/camera',
      }],
    }],
    {
      runId: 'run-42',
      startedAt: 100,
      finishedAt: 200,
      session: {
        runId: 'run-42',
        robotId: 'robot-1',
        pageSessionId: 'page-test-1',
        runKind: 'test',
        transportReused: true,
        resetPolicy: 'run_scoped_shell',
      },
      timing: {
        queueMs: 5,
        connectMs: 10,
        executeMs: 300,
        totalMs: 320,
      },
    },
  );

  const robot = env.state.robots[0];
  assert.equal(robot.tests.general.errorCode, 'definition_output_missing');
  assert.equal(robot.tests.general.source, 'executor');
  assert.equal(robot.tests.general.checkedAt, 111.5);
  assert.equal(robot.testDebug.general.errorCode, 'definition_output_missing');
  assert.equal(robot.testDebug.general.source, 'executor');
  assert.equal(robot.testDebug.general.reason, 'validator_fail');
  assert.equal(robot.testDebug.general.read.kind, 'contains_string');
  assert.equal(robot.testDebug.general.session.pageSessionId, 'page-test-1');
  assert.equal(robot.testDebug.general.timing.totalMs, 320);
});

test('runAutoFixForRobot clears local fixing state when the backend reports a terminal failure', async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, method: options.method || 'GET' });
    if ((options.method || 'GET') === 'POST') {
      return {
        ok: true,
        json: async () => ({ runId: 'fix-run-1' }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        status: 'failed',
        error: 'Command timed out after default seconds',
        events: [],
      }),
    };
  };
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
    {
      fetch: fetchMock,
      window: {
        setTimeout: (handler) => {
          if (typeof handler === 'function') handler();
          return 0;
        },
      },
    },
  );
  const env = makeEnv({
    FIX_JOB_POLL_INTERVAL_MS: 0,
    TEST_STEP_TIMEOUT_MS: 1000,
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      robots: [{
        id: 'robot-1',
        name: 'Robot 1',
        typeId: 'rosbot',
        tests: { online: { status: 'ok', value: 'reachable', details: 'Ready' } },
      }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
    getRobotDefinitionsForType: () => [],
    appendTerminalLine: () => {},
    appendTerminalPayload: () => {},
    runOneRobotOnlineCheck: async () => ({ status: 'ok', value: 'reachable', details: 'Ready' }),
    updateOnlineCheckEstimateFromResults: () => {},
    mapRobots: (updater) => {
      env.state.robots = env.state.robots.map((item) => updater(item));
    },
    renderDashboard: () => {},
    renderDetail: () => {},
    setRobotFixing: (robotIdValue, isFixing) => {
      const id = normalizeText(robotIdValue, '');
      if (!id) return;
      if (isFixing) env.state.fixingRobotIds.add(id);
      else env.state.fixingRobotIds.delete(id);
    },
    setRobotTesting: (robotIdValue, isTesting) => {
      const id = normalizeText(robotIdValue, '');
      if (!id) return;
      if (isTesting) env.state.testingRobotIds.add(id);
      else env.state.testingRobotIds.delete(id);
    },
    updateRobotTestState: () => {},
  });
  const api = createFixTestsFeature(runtime, env);

  await assert.rejects(
    api.runAutoFixForRobot(env.state.robots[0], { id: 'flash-fix', label: 'Flash fix' }),
    /Command timed out after default seconds/,
  );

  assert.equal(env.state.fixingRobotIds.has('robot-1'), false);
  assert.equal(env.state.testingRobotIds.has('robot-1'), false);
  assert.deepEqual(
    fetchCalls.map((entry) => entry.method),
    ['POST', 'GET'],
  );
});

test('runAutoFixForRobot clears both fixing and testing state if polling aborts after post-tests start', async () => {
  let pollCount = 0;
  const transitions = [];
  const fetchMock = async (_url, options = {}) => {
    if ((options.method || 'GET') === 'POST') {
      return {
        ok: true,
        json: async () => ({ runId: 'fix-run-2' }),
      };
    }
    pollCount += 1;
    if (pollCount === 1) {
      return {
        ok: true,
        json: async () => ({
          status: 'running',
          events: [
            { type: 'post_tests_started', message: 'Post tests started.' },
          ],
        }),
      };
    }
    throw new Error('poll disconnected');
  };
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
    {
      fetch: fetchMock,
      window: {
        setTimeout: (handler) => {
          if (typeof handler === 'function') handler();
          return 0;
        },
      },
    },
  );
  const env = makeEnv({
    FIX_JOB_POLL_INTERVAL_MS: 0,
    TEST_STEP_TIMEOUT_MS: 1000,
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      robots: [{
        id: 'robot-1',
        name: 'Robot 1',
        typeId: 'rosbot',
        tests: { online: { status: 'ok', value: 'reachable', details: 'Ready' } },
      }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
    getRobotDefinitionsForType: () => [{ id: 'general', enabled: true }],
    estimateTestCountdownMsFromBody: () => 5000,
    appendTerminalLine: () => {},
    appendTerminalPayload: () => {},
    runOneRobotOnlineCheck: async () => ({ status: 'ok', value: 'reachable', details: 'Ready' }),
    updateOnlineCheckEstimateFromResults: () => {},
    mapRobots: (updater) => {
      env.state.robots = env.state.robots.map((item) => updater(item));
    },
    renderDashboard: () => {},
    renderDetail: () => {},
    setRobotFixing: (robotIdValue, isFixing) => {
      const id = normalizeText(robotIdValue, '');
      if (!id) return;
      transitions.push({ kind: 'fix', value: isFixing });
      if (isFixing) env.state.fixingRobotIds.add(id);
      else env.state.fixingRobotIds.delete(id);
    },
    setRobotTesting: (robotIdValue, isTesting) => {
      const id = normalizeText(robotIdValue, '');
      if (!id) return;
      transitions.push({ kind: 'test', value: isTesting });
      if (isTesting) env.state.testingRobotIds.add(id);
      else env.state.testingRobotIds.delete(id);
    },
    updateRobotTestState: () => {},
  });
  const api = createFixTestsFeature(runtime, env);

  await assert.rejects(
    api.runAutoFixForRobot(env.state.robots[0], { id: 'flash-fix', label: 'Flash fix' }),
    /poll disconnected/,
  );

  assert.equal(env.state.fixingRobotIds.has('robot-1'), false);
  assert.equal(env.state.testingRobotIds.has('robot-1'), false);
  assert.equal(
    transitions.some((entry) => entry.kind === 'test' && entry.value === true),
    true,
  );
});

test('setRunningButtonState disables the detail Run tests button while the active robot is doing non-interruptible fix work', async () => {
  const runButton = makeButton('Run tests');
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
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
      robots: [{ id: 'robot-1', activity: { testing: true, phase: 'fixing' } }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => [],
    getReachableRobotIds: () => [],
    getRunSelectedButtonIdleLabel: () => 'Run selected (default online)',
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    isRobotTesting: (robotId) =>
      env.state.testingRobotIds.has(robotId) || env.state.autoTestingRobotIds.has(robotId),
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runButton.disabled, true);
  assert.equal(runButton.textContent, 'Run tests');
  assert.equal(runButton.title, 'Fix is already running for this robot.');
});

test('setRunningButtonState keeps the detail Run tests button enabled during connection retry auto testing', async () => {
  const runButton = makeButton('Run tests');
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
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
      robots: [{ id: 'robot-1', activity: { testing: true, phase: 'connection_retry' } }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => [],
    getReachableRobotIds: () => [],
    getRunSelectedButtonIdleLabel: () => 'Run selected (default online)',
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    isRobotTesting: (robotId) =>
      env.state.testingRobotIds.has(robotId) || env.state.autoTestingRobotIds.has(robotId),
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runButton.disabled, false);
  assert.equal(runButton.textContent, 'Run tests');
  assert.equal(runButton.title, 'Stops automatic recovery tests and runs tests.');
});

test('setRunningButtonState keeps the detail Run tests button enabled during full test after recovery', async () => {
  const runButton = makeButton('Run tests');
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
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
      robots: [{ id: 'robot-1', activity: { testing: true, phase: 'full_test_after_recovery' } }],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => [],
    getReachableRobotIds: () => [],
    getRunSelectedButtonIdleLabel: () => 'Run selected (default online)',
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runButton.disabled, false);
  assert.equal(runButton.title, 'Stops automatic recovery tests and runs tests.');
});

test('setRunningButtonState keeps Run selected enabled while one of the target robots is auto testing', async () => {
  const runSelectedButton = makeButton('Run selected');
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
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
      robots: [{ id: 'robot-2', activity: { testing: true, phase: 'full_test_after_recovery' } }],
      selectedRobotIds: new Set(['robot-1', 'robot-2']),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-2']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => Array.from(env.state.selectedRobotIds),
    getReachableRobotIds: () => ['robot-1', 'robot-2'],
    getRunSelectedButtonIdleLabel: () => 'Run selected',
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    isRobotTesting: (robotId) =>
      env.state.testingRobotIds.has(robotId) || env.state.autoTestingRobotIds.has(robotId),
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runSelectedButton.disabled, false);
  assert.equal(runSelectedButton.textContent, 'Run selected');
  assert.equal(runSelectedButton.title, 'Run selected');
});

test('setRunningButtonState disables Run selected when all selected robots are in non-interruptible fix work', async () => {
  const runSelectedButton = makeButton('Run selected');
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
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
      robots: [{ id: 'robot-1', activity: { testing: true, phase: 'fixing' } }],
      selectedRobotIds: new Set(['robot-1']),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getSelectedRobotIds: () => Array.from(env.state.selectedRobotIds),
    getReachableRobotIds: () => ['robot-1'],
    getRunSelectedButtonIdleLabel: () => 'Run selected',
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  api.setRunningButtonState(false);

  assert.equal(runSelectedButton.disabled, true);
  assert.equal(runSelectedButton.title, 'Fix is already running for this robot.');
});

test('getRobotActionAvailability treats auto recovery as preemptable for fixes and active fix phase as blocked', async () => {
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
  );
  const env = makeEnv({
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      robots: [
        { id: 'robot-1', activity: { testing: true, phase: 'full_test_after_recovery' } },
        { id: 'robot-2', activity: { testing: true, phase: 'fixing' } },
      ],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1', 'robot-2']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  const autoRecovery = api.getRobotActionAvailability('robot-1', 'fix');
  const fixing = api.getRobotActionAvailability('robot-2', 'fix');

  assert.equal(autoRecovery.allowed, true);
  assert.equal(autoRecovery.preemptableAuto, true);
  assert.equal(autoRecovery.title, 'Stops automatic recovery tests and runs fix.');
  assert.equal(fixing.allowed, false);
  assert.equal(fixing.title, 'Fix is already running for this robot.');
});

test('getRobotActionAvailability treats connection retry as preemptable for online checks', async () => {
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
  );
  const env = makeEnv({
    state: {
      pageSessionId: 'test-session',
      detailRobotId: 'robot-1',
      robots: [
        { id: 'robot-1', activity: { testing: true, phase: 'connection_retry' } },
      ],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(['robot-1']),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    getRobotById: (robotId) => env.state.robots.find((robot) => robot.id === robotId) || null,
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, '') || null,
      lastFullTestAt: 0,
      lastFullTestSource: null,
      updatedAt: 0,
    }),
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  const onlineAvailability = api.getRobotActionAvailability('robot-1', 'online');

  assert.equal(onlineAvailability.allowed, true);
  assert.equal(onlineAvailability.preemptableAuto, true);
  assert.equal(onlineAvailability.title, 'Stops automatic recovery tests and runs online check.');
});

test('setRobotTypeDefinitions preserves robot type test refs and battery command metadata', async () => {
  const createMonitorConfigFeature = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'createMonitorConfigFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createMonitorConfigFeature(runtime, env);

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
  const createMonitorConfigFeature = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'createMonitorConfigFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createMonitorConfigFeature(runtime, env);

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
