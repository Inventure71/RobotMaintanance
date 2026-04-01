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
  '../../assets/js/modules/dashboard/features/monitor-config/runtime/createMonitorConfigFeatureRuntime.js',
);
const MONITOR_DOMAIN_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/monitor-config/domain/createMonitorConfigDomainApi.js',
);
const FIX_TESTS_MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/runtime/createFixTestsFeatureRuntime.js',
);
const FIX_TESTS_JOB_QUEUE_HELPERS_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/robotJobQueueHelpers.js',
);
const FIX_TESTS_DEBUG_HELPERS_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/fixTestsDebugHelpers.js',
);
const FIX_TESTS_FIX_MODE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsFixModeApi.js',
);
const FIX_TESTS_AUTO_FIX_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsAutoFixApi.js',
);
const FIX_TESTS_RUN_STATE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsRunStateApi.js',
);
const FIX_TESTS_JOB_QUEUE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsJobQueueApi.js',
);
const FIX_TESTS_RUNTIME_PATCH_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsRuntimePatchApi.js',
);
const FIX_TESTS_SELECTION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsSelectionApi.js',
);
const FIX_TESTS_ONLINE_CHECKS_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsOnlineChecksApi.js',
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

function createJobQueueActivityHelpers() {
  const normalizeJobSummary = (job) => {
    if (!job || typeof job !== 'object') return null;
    const id = normalizeText(job.id, '');
    if (!id) return null;
    const status = normalizeText(job.status, '').toLowerCase();
    const kind = normalizeText(job.kind, '').toLowerCase();
    const enqueuedAt = Number(job.enqueuedAt);
    const startedAt = Number(job.startedAt);
    const updatedAt = Number(job.updatedAt);
    return {
      id,
      kind: kind === 'fix' ? 'fix' : 'test',
      status,
      source: normalizeText(job.source, 'manual') || 'manual',
      label: normalizeText(job.label, id),
      enqueuedAt: Number.isFinite(enqueuedAt) && enqueuedAt > 0 ? enqueuedAt : 0,
      startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0,
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  };
  const normalizeQueuedJobs = (jobs) =>
    Array.isArray(jobs)
      ? jobs
          .map((item) => normalizeJobSummary(item))
          .filter((item) => item && normalizeText(item.status, '') === 'queued')
      : [];
  const normalizeJobQueueSnapshot = (raw) => {
    const payload = raw && typeof raw === 'object' ? raw : {};
    const activeJob = normalizeJobSummary(payload.activeJob);
    const version = Number(payload.jobQueueVersion);
    return {
      activeJob:
        activeJob && (activeJob.status === 'running' || activeJob.status === 'interrupting')
          ? activeJob
          : null,
      queuedJobs: normalizeQueuedJobs(payload.queuedJobs),
      jobQueueVersion: Number.isFinite(version) && version > 0 ? Math.trunc(version) : 0,
    };
  };
  return {
    normalizeJobSummary,
    normalizeQueuedJobs,
    normalizeJobQueueSnapshot,
  };
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
  let prelude = '';
  if (source.includes("import { createMonitorConfigDomainApi } from '../domain/createMonitorConfigDomainApi.js';")) {
    const domainApiSource = await fs.readFile(MONITOR_DOMAIN_API_PATH, 'utf8');
    prelude = `${domainApiSource.replace(
      'export function createMonitorConfigDomainApi',
      'function createMonitorConfigDomainApi',
    )}\n`;
  }
  if (source.includes("import { createRobotJobsApi, createRobotJobQueueRenderer, createRobotJobQueueStore } from '../domain/robotJobQueueHelpers.js';")) {
    const queueHelpersSource = await fs.readFile(FIX_TESTS_JOB_QUEUE_HELPERS_PATH, 'utf8');
    prelude += `${queueHelpersSource.replaceAll('export function ', 'function ')}\n`;
  }
  if (source.includes("import { createFixTestsDebugHelpers } from '../domain/fixTestsDebugHelpers.js';")) {
    const debugHelpersSource = await fs.readFile(FIX_TESTS_DEBUG_HELPERS_PATH, 'utf8');
    prelude += `${debugHelpersSource.replace(
      'export function createFixTestsDebugHelpers',
      'function createFixTestsDebugHelpers',
    )}\n`;
  }
  if (source.includes("import { createFixTestsFixModeApi } from '../domain/createFixTestsFixModeApi.js';")) {
    const fixModeApiSource = await fs.readFile(FIX_TESTS_FIX_MODE_API_PATH, 'utf8');
    prelude += `${fixModeApiSource.replace(
      'export function createFixTestsFixModeApi',
      'function createFixTestsFixModeApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsAutoFixApi } from '../domain/createFixTestsAutoFixApi.js';")) {
    const autoFixApiSource = await fs.readFile(FIX_TESTS_AUTO_FIX_API_PATH, 'utf8');
    prelude += `${autoFixApiSource.replace(
      'export function createFixTestsAutoFixApi',
      'function createFixTestsAutoFixApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsRunStateApi } from '../domain/createFixTestsRunStateApi.js';")) {
    const runStateApiSource = await fs.readFile(FIX_TESTS_RUN_STATE_API_PATH, 'utf8');
    prelude += `${runStateApiSource.replace(
      'export function createFixTestsRunStateApi',
      'function createFixTestsRunStateApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsJobQueueApi } from '../domain/createFixTestsJobQueueApi.js';")) {
    const jobQueueApiSource = await fs.readFile(FIX_TESTS_JOB_QUEUE_API_PATH, 'utf8');
    prelude += `${jobQueueApiSource.replace(
      'export function createFixTestsJobQueueApi',
      'function createFixTestsJobQueueApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsRuntimePatchApi } from '../domain/createFixTestsRuntimePatchApi.js';")) {
    const runtimePatchApiSource = await fs.readFile(FIX_TESTS_RUNTIME_PATCH_API_PATH, 'utf8');
    prelude += `${runtimePatchApiSource.replace(
      'export function createFixTestsRuntimePatchApi',
      'function createFixTestsRuntimePatchApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsSelectionApi } from '../domain/createFixTestsSelectionApi.js';")) {
    const selectionApiSource = await fs.readFile(FIX_TESTS_SELECTION_API_PATH, 'utf8');
    prelude += `${selectionApiSource.replace(
      'export function createFixTestsSelectionApi',
      'function createFixTestsSelectionApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsOnlineChecksApi } from '../domain/createFixTestsOnlineChecksApi.js';")) {
    const onlineChecksApiSource = await fs.readFile(FIX_TESTS_ONLINE_CHECKS_API_PATH, 'utf8');
    prelude += `${onlineChecksApiSource.replace(
      'export function createFixTestsOnlineChecksApi',
      'function createFixTestsOnlineChecksApi',
    )}\n`;
  }
  const transformed = `${prelude}${source
        .replace(
      "import { createMonitorConfigDomainApi } from '../domain/createMonitorConfigDomainApi.js';",
      '',
    )
        .replace(
      "import { createRobotJobsApi, createRobotJobQueueRenderer, createRobotJobQueueStore } from '../domain/robotJobQueueHelpers.js';",
      '',
    )
    .replace(
      "import { createFixTestsDebugHelpers } from '../domain/fixTestsDebugHelpers.js';",
      '',
    )
    .replace(
      "import { createFixTestsFixModeApi } from '../domain/createFixTestsFixModeApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsAutoFixApi } from '../domain/createFixTestsAutoFixApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsRunStateApi } from '../domain/createFixTestsRunStateApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsJobQueueApi } from '../domain/createFixTestsJobQueueApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsRuntimePatchApi } from '../domain/createFixTestsRuntimePatchApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsSelectionApi } from '../domain/createFixTestsSelectionApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsOnlineChecksApi } from '../domain/createFixTestsOnlineChecksApi.js';",
      '',
    )
    .replace(
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
    JOB_QUEUE_ACTIVITY: createJobQueueActivityHelpers(),
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

test('runAutoFixForRobot enqueues via /jobs and does not toggle local fix/test flags', async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, method: options.method || 'GET', body: options.body });
    if ((options.method || 'GET') === 'POST') {
      return {
        ok: true,
        json: async () => ({
          jobId: 'job-fix-1',
          activeJob: {
            id: 'job-fix-1',
            kind: 'fix',
            status: 'running',
            source: 'manual',
            label: 'Flash fix',
            enqueuedAt: 100,
            startedAt: 110,
            updatedAt: 110,
          },
          queuedJobs: [],
          jobQueueVersion: 2,
        }),
      };
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

  await api.runAutoFixForRobot(env.state.robots[0], { id: 'flash-fix', label: 'Flash fix' });

  assert.equal(env.state.fixingRobotIds.has('robot-1'), false);
  assert.equal(env.state.testingRobotIds.has('robot-1'), false);
  assert.deepEqual(
    fetchCalls.map((entry) => entry.method),
    ['POST'],
  );
  const payload = JSON.parse(String(fetchCalls[0].body || '{}'));
  assert.equal(payload.kind, 'fix');
  assert.equal(payload.fixId, 'flash-fix');
});

test('runAutoFixForRobot surfaces enqueue failures and preserves local fix/test flags', async () => {
  const transitions = [];
  const fetchMock = async (url, options = {}) => {
    assert.equal(options.method || 'GET', 'POST');
    assert.equal(String(url).endsWith('/api/robots/robot-1/jobs'), true);
    if ((options.method || 'GET') === 'POST') {
      return {
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Robot has an active user job.' }),
        text: async () => 'Robot has an active user job.',
      };
    }
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
    /Robot has an active user job/,
  );

  assert.equal(env.state.fixingRobotIds.has('robot-1'), false);
  assert.equal(env.state.testingRobotIds.has('robot-1'), false);
  assert.equal(
    transitions.length,
    0,
  );
});

test('setRunningButtonState keeps the detail Run tests button enabled and queueing while the active robot is fixing', async () => {
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

  assert.equal(runButton.disabled, false);
  assert.equal(runButton.textContent, 'Run tests');
  assert.equal(runButton.title, 'Queue test job');
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

test('setRunningButtonState keeps the detail Run tests button enabled during recovery phase with transient local searching state', async () => {
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
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(['robot-1']),
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

test('setRunningButtonState keeps Run selected enabled and queueing when selected robots are in fix work', async () => {
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

  assert.equal(runSelectedButton.disabled, false);
  assert.equal(runSelectedButton.title, 'Run selected');
});

test('getRobotActionAvailability treats auto recovery as preemptable for fixes and active fix phase as queueable', async () => {
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
  assert.equal(fixing.allowed, true);
  assert.equal(fixing.title, 'Queue fix job');
});

test('getRobotActionAvailability prioritizes recovery phase over transient local busy flags', async () => {
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
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(['robot-1']),
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

  const availability = api.getRobotActionAvailability('robot-1', 'fix');

  assert.equal(availability.allowed, true);
  assert.equal(availability.preemptableAuto, true);
  assert.equal(availability.title, 'Stops automatic recovery tests and runs fix.');
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

test('normalizeRobotActivity keeps queue fields with safe defaults', async () => {
  const createMonitorConfigFeature = await loadNamedExport(
    MONITOR_MODULE_PATH,
    'createMonitorConfigFeature',
  );
  const env = makeEnv();
  const runtime = makeRuntime();
  const api = createMonitorConfigFeature(runtime, env);

  const empty = api.normalizeRobotActivity(null);
  assert.equal(empty.jobQueueVersion, 0);
  assert.equal(empty.activeJob, null);
  assert.deepEqual(Array.from(empty.queuedJobs), []);

  const normalized = api.normalizeRobotActivity({
    jobQueueVersion: 3,
    activeJob: {
      id: 'job-1',
      kind: 'test',
      status: 'running',
      source: 'manual',
      label: 'Run tests',
      enqueuedAt: 10,
      startedAt: 11,
      updatedAt: 12,
    },
    queuedJobs: [
      {
        id: 'job-2',
        kind: 'fix',
        status: 'queued',
        source: 'manual',
        label: 'Run fix',
        enqueuedAt: 11,
        startedAt: 0,
        updatedAt: 12,
      },
    ],
  });
  assert.equal(normalized.jobQueueVersion, 3);
  assert.equal(normalized.activeJob.id, 'job-1');
  assert.equal(normalized.queuedJobs.length, 1);
  assert.equal(normalized.queuedJobs[0].status, 'queued');
});

test('runRobotTestsForRobot enqueues through /jobs endpoint', async () => {
  const calls = [];
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
    {
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return {
          ok: true,
          status: 202,
          json: async () => ({
            jobId: 'job-1',
            activeJob: null,
            queuedJobs: [],
            jobQueueVersion: 1,
          }),
        };
      },
    },
  );
  const env = makeEnv({
    state: {
      pageSessionId: 'session-1',
      robots: [],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
    },
  });
  const runtime = makeRuntime({
    mapRobots: () => {},
    applyRuntimeRobotPatches: () => {},
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
  });
  const api = createFixTestsFeature(runtime, env);

  await api.runRobotTestsForRobot('r1', { testIds: ['general'] });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/robots\/r1\/jobs$/);
  assert.equal(calls[0].init.method, 'POST');
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.kind, 'test');
  assert.deepEqual(payload.testIds, ['general']);
});

test('runAutoFixForRobot enqueues fix through /jobs endpoint', async () => {
  const calls = [];
  const createFixTestsFeature = await loadNamedExport(
    FIX_TESTS_MODULE_PATH,
    'createFixTestsFeature',
    {
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return {
          ok: true,
          status: 202,
          json: async () => ({
            jobId: 'job-fix-1',
            activeJob: null,
            queuedJobs: [],
            jobQueueVersion: 2,
          }),
        };
      },
    },
  );
  const env = makeEnv({
    state: {
      pageSessionId: 'session-1',
      robots: [],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      searchingRobotIds: new Set(),
      detailRobotId: null,
    },
  });
  const runtime = makeRuntime({
    appendTerminalLine: () => {},
    updateOnlineCheckEstimateFromResults: () => {},
    renderDashboard: () => {},
    renderDetail: () => {},
    mapRobots: () => {},
    applyRuntimeRobotPatches: () => {},
    runOneRobotOnlineCheck: async () => ({ status: 'ok', value: 'reachable', details: 'ok', ms: 1 }),
    setRobotSearching: () => {},
    setRobotTesting: () => {},
    robotId: (value) => normalizeText(typeof value === 'string' ? value : value?.id, ''),
    getRobotDefinitionsForType: () => [],
  });
  const api = createFixTestsFeature(runtime, env);

  await api.runAutoFixForRobot(
    {
      id: 'r1',
      name: 'Robot 1',
      typeId: 'type-a',
      tests: { online: { status: 'ok', value: 'reachable', details: 'ok' } },
    },
    { id: 'flash_fix', label: 'Flash fix' },
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/robots\/r1\/jobs$/);
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.kind, 'fix');
  assert.equal(payload.fixId, 'flash_fix');
});
