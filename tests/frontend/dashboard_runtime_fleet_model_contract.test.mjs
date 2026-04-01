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
  '../../assets/js/modules/dashboard/features/fleet/runtime/createFleetFeatureRuntime.js',
);
const DERIVED_STATE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetDerivedStateApi.js',
);
const SELECTION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetSelectionApi.js',
);
const MONITOR_ACTIVITY_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetMonitorActivityApi.js',
);
const CARD_RENDERING_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetCardRenderingApi.js',
);
const RUNTIME_STATE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetRuntimeStateApi.js',
);
const MODEL_VIEWER_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetModelViewerApi.js',
);
const WINDOWING_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetWindowingApi.js',
);
const DASHBOARD_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fleet/domain/createFleetDashboardApi.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function normalizeTypeId(value) {
  return normalizeText(value, '').toLowerCase();
}

function normalizeClassName(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  syncFromString(value) {
    this.classes = new Set(String(value || '').split(/\s+/).filter(Boolean));
  }

  syncToElement() {
    this.element._className = Array.from(this.classes).join(' ');
  }

  add(...names) {
    names.filter(Boolean).forEach((name) => this.classes.add(String(name)));
    this.syncToElement();
  }

  toggle(name, force) {
    const normalized = String(name);
    if (force === true) {
      this.classes.add(normalized);
      this.syncToElement();
      return true;
    }
    if (force === false) {
      this.classes.delete(normalized);
      this.syncToElement();
      return false;
    }
    if (this.classes.has(normalized)) {
      this.classes.delete(normalized);
      this.syncToElement();
      return false;
    }
    this.classes.add(normalized);
    this.syncToElement();
    return true;
  }

  contains(name) {
    return this.classes.has(String(name));
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.innerHTML = '';
    this.textContent = '';
    this.title = '';
    this.type = '';
    this._className = '';
    this.parentNode = null;
    this.classList = new FakeClassList(this);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value || '');
    this.classList.syncFromString(this._className);
  }

  appendChild(child) {
    if (child?.parentNode && child.parentNode !== this) {
      child.parentNode.removeChild(child);
    } else if (child?.parentNode === this) {
      this.removeChild(child);
    }
    if (child) {
      child.parentNode = this;
    }
    this.children.push(child);
    return child;
  }

  insertBefore(child, referenceChild) {
    if (!referenceChild) return this.appendChild(child);
    const referenceIndex = this.children.indexOf(referenceChild);
    if (referenceIndex === -1) return this.appendChild(child);
    if (child?.parentNode && child.parentNode !== this) {
      child.parentNode.removeChild(child);
    } else if (child?.parentNode === this) {
      this.removeChild(child);
    }
    if (child) {
      child.parentNode = this;
    }
    this.children.splice(referenceIndex, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index === -1) return child;
    this.children.splice(index, 1);
    if (child) {
      child.parentNode = null;
    }
    return child;
  }

  replaceChildren(...children) {
    this.children.forEach((child) => {
      if (child) {
        child.parentNode = null;
      }
    });
    this.children = [];
    children.forEach((child) => {
      this.appendChild(child);
    });
  }

  setAttribute(name, value) {
    const normalizedValue = String(value);
    this.attributes.set(name, normalizedValue);
    if (name.startsWith('data-')) {
      const dataKey = name
        .slice(5)
        .replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
      this.dataset[dataKey] = normalizedValue;
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(eventName, handler) {
    this.listeners.set(eventName, handler);
  }

  get firstChild() {
    return this.children[0] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    if (index === -1) return null;
    return this.parentNode.children[index + 1] ?? null;
  }

  querySelector() {
    return null;
  }
}

async function withFakeDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
    querySelectorAll: () => [],
  };

  try {
    return await run();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  let prelude = '';
  if (source.includes("import { createFleetDerivedStateApi } from '../domain/createFleetDerivedStateApi.js';")) {
    const derivedStateApiSource = await fs.readFile(DERIVED_STATE_API_PATH, 'utf8');
    prelude = `${derivedStateApiSource.replace(
      'export function createFleetDerivedStateApi',
      'function createFleetDerivedStateApi',
    )}\n`;
  }
  if (source.includes("import { createFleetSelectionApi } from '../domain/createFleetSelectionApi.js';")) {
    const selectionApiSource = await fs.readFile(SELECTION_API_PATH, 'utf8');
    prelude += `${selectionApiSource.replace(
      'export function createFleetSelectionApi',
      'function createFleetSelectionApi',
    )}\n`;
  }
  if (source.includes("import { createFleetMonitorActivityApi } from '../domain/createFleetMonitorActivityApi.js';")) {
    const monitorActivityApiSource = await fs.readFile(MONITOR_ACTIVITY_API_PATH, 'utf8');
    prelude += `${monitorActivityApiSource.replace(
      'export function createFleetMonitorActivityApi',
      'function createFleetMonitorActivityApi',
    )}\n`;
  }
  if (source.includes("import { createFleetCardRenderingApi } from '../domain/createFleetCardRenderingApi.js';")) {
    const cardRenderingApiSource = await fs.readFile(CARD_RENDERING_API_PATH, 'utf8');
    prelude += `${cardRenderingApiSource.replace(
      'export function createFleetCardRenderingApi',
      'function createFleetCardRenderingApi',
    )}\n`;
  }
  if (source.includes("import { createFleetRuntimeStateApi } from '../domain/createFleetRuntimeStateApi.js';")) {
    const runtimeStateApiSource = await fs.readFile(RUNTIME_STATE_API_PATH, 'utf8');
    prelude += `${runtimeStateApiSource.replace(
      'export function createFleetRuntimeStateApi',
      'function createFleetRuntimeStateApi',
    )}\n`;
  }
  if (source.includes("import { createFleetModelViewerApi } from '../domain/createFleetModelViewerApi.js';")) {
    const modelViewerApiSource = await fs.readFile(MODEL_VIEWER_API_PATH, 'utf8');
    prelude += `${modelViewerApiSource.replace(
      'export function createFleetModelViewerApi',
      'function createFleetModelViewerApi',
    )}\n`;
  }
  if (source.includes("import { createFleetWindowingApi } from '../domain/createFleetWindowingApi.js';")) {
    const windowingApiSource = await fs.readFile(WINDOWING_API_PATH, 'utf8');
    prelude += `${windowingApiSource.replace(
      'export function createFleetWindowingApi',
      'function createFleetWindowingApi',
    )}\n`;
  }
  if (source.includes("import { createFleetDashboardApi } from '../domain/createFleetDashboardApi.js';")) {
    const dashboardApiSource = await fs.readFile(DASHBOARD_API_PATH, 'utf8');
    prelude += `${dashboardApiSource.replace(
      'export function createFleetDashboardApi',
      'function createFleetDashboardApi',
    )}\n`;
  }
  const transformed = `${prelude}${source
    .replace(
      "import { createModelAssetResolver } from '../../../primitives/model-viewer/modelAssetResolver.js';",
      "const createModelAssetResolver = () => ({ getInitialModelUrl: (url) => url, bindModelViewerSource: () => {} });",
    )
        .replace(
      "import { createFleetDerivedStateApi } from '../domain/createFleetDerivedStateApi.js';",
      '',
    )
    .replace(
      "import { createFleetSelectionApi } from '../domain/createFleetSelectionApi.js';",
      '',
    )
    .replace(
      "import { createFleetMonitorActivityApi } from '../domain/createFleetMonitorActivityApi.js';",
      '',
    )
    .replace(
      "import { createFleetCardRenderingApi } from '../domain/createFleetCardRenderingApi.js';",
      '',
    )
    .replace(
      "import { createFleetRuntimeStateApi } from '../domain/createFleetRuntimeStateApi.js';",
      '',
    )
    .replace(
      "import { createFleetModelViewerApi } from '../domain/createFleetModelViewerApi.js';",
      '',
    )
    .replace(
      "import { createFleetWindowingApi } from '../domain/createFleetWindowingApi.js';",
      '',
    )
    .replace(
      "import { createFleetDashboardApi } from '../domain/createFleetDashboardApi.js';",
      '',
    )
    .replace(
      'export function createFleetFeature',
      'function createFleetFeature',
    )}\nmodule.exports = { createFleetFeature };\n`;
  const context = {
    console,
    document: globalThis.document,
    window: globalThis.window,
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.createFleetFeature;
}

function makeRuntime(env) {
  const runtime = {
    getDefinitionLabel: (_definitions, id) => normalizeText(id, 'Unknown'),
    getRobotTypeConfig: (typeId) => env.ROBOT_TYPE_BY_ID.get(normalizeTypeId(typeId)) || null,
    normalizeRobotTests: () => ({
      tests: { online: { status: 'ok', value: 'reachable', details: 'ok' } },
      definitions: [],
    }),
    normalizeRobotActivity: (activity = {}) => ({
      searching: Boolean(activity?.searching),
      testing: Boolean(activity?.testing),
      phase: normalizeText(activity?.phase, ''),
    }),
    normalizeTestDebugCollection: () => [],
    readRobotField: (robot, key) => robot?.ssh?.[key] ?? robot?.[key],
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

function makeEnv() {
  const elementsBySelector = new Map([
    ['#kpiHealthy', new FakeElement('span')],
    ['#kpiWarn', new FakeElement('span')],
    ['#kpiCritical', new FakeElement('span')],
    ['#selectionSummary', new FakeElement('div')],
    ['#selectAllRobots', new FakeElement('button')],
    ['#runSelectedRobotTests', new FakeElement('button')],
  ]);
  return {
    CAN_USE_MODEL_VIEWER: true,
    DEFAULT_ROBOT_MODEL_URL: 'assets/models/default.glb',
    FIX_MODE_CONTEXT_DASHBOARD: 'dashboard',
    FIX_MODE_CONTEXT_DETAIL: 'detail',
    ONLINE_SORT_BATTERY: 'battery',
    ONLINE_SORT_LABELS: { battery: 'Battery' },
    ONLINE_SORT_ORDER: ['battery'],
    $: (selector) => elementsBySelector.get(selector) ?? null,
    $$: () => [],
    applyActionButton: () => {},
    dashboard: new FakeElement('section'),
    emptyState: new FakeElement('div'),
    filterError: null,
    filterType: null,
    hydrateActionButtons: () => {},
    normalizeStatus: () => 'ok',
    normalizeText,
    normalizeTypeId,
    offlineGrid: new FakeElement('div'),
    offlineSectionTitle: new FakeElement('h2'),
    onlineGrid: new FakeElement('div'),
    onlineSectionTitle: new FakeElement('h2'),
    renderBatteryPill: ({ value }) => `<span>${normalizeText(value, 'n/a')}</span>`,
    ROBOT_TYPE_BY_ID: new Map([
      [
        'rosbot-2-pro',
        {
          typeId: 'rosbot-2-pro',
          label: 'Rosbot 2 Pro',
          topics: [],
          autoFixes: [],
          model: { file_name: 'rosbot-2-pro.glb', available_qualities: ['low', 'high'] },
        },
      ],
    ]),
    ONLINE_CHECK_TIMEOUT_MS: 3000,
    TEST_STEP_TIMEOUT_MS: 12000,
    TEST_COUNTDOWN_MIN_SECONDS: 3,
    TEST_COUNTDOWN_MAX_SECONDS: 60,
    TEST_COUNTDOWN_TICK_MS: 1000,
    TEST_COUNTDOWN_WARNING_TEXT: {
      scanning: 'Scan timing out',
      finding: 'Find timing out',
      fixing: 'Fix timing out',
    },
    TEST_COUNTDOWN_MODE_LABELS: {
      scanning: 'Scanning',
      finding: 'Finding',
      fixing: 'Fixing',
    },
    state: {
      autoActivityRobotIds: new Set(),
      autoFixingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      automatedRobotActivityById: new Map(),
      filter: { name: '', type: 'all', error: 'all' },
      onlineSortMode: 'battery',
      robots: [],
      robotsById: new Map(),
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      testingCountdowns: new Map(),
      searchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      filter: { name: '', type: 'all', error: 'all', ownerTags: [], platformTags: [], activeOwnerProfile: '' },
      fixModeOpen: { dashboard: false, detail: false },
    },
  };
}

test('syncAutomatedRobotActivityFromState classifies fixing phase as repairing instead of scanning', async () => {
  await withFakeDocument(async () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
      setInterval: () => 1,
      clearInterval: () => {},
    };

    try {
      const createFleetFeature = await loadApi();
      const env = makeEnv();
      const runtime = makeRuntime(env);
      const api = createFleetFeature(runtime, env);

      api.setRobots([
        {
          id: 'robot-fix-1',
          name: 'RepairBot',
          type: 'Rosbot 2 Pro',
          typeId: 'rosbot-2-pro',
          tests: {
            online: { status: 'ok', value: 'reachable', details: 'up' },
          },
          activity: { testing: true, phase: 'fixing' },
        },
      ]);

      api.syncAutomatedRobotActivityFromState();

      assert.equal(env.state.autoFixingRobotIds.has('robot-fix-1'), true);
      assert.equal(env.state.autoTestingRobotIds.has('robot-fix-1'), false);
      assert.equal(api.isRobotFixing('robot-fix-1'), true);
      assert.equal(api.isRobotTesting('robot-fix-1'), false);
      assert.match(api.getTestingCountdownText('robot-fix-1'), /^Fixing \d+s$/);
      assert.match(
        api.buildScanOverlayMarkup({
          isSearching: api.isRobotSearching('robot-fix-1'),
          isTesting: api.isRobotTesting('robot-fix-1'),
          isFixing: api.isRobotFixing('robot-fix-1'),
        }),
        /repairing\.webm/,
      );
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
});

test('normalizeRobotData resolves effective model from overrides then type defaults', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

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

test('normalizeRobotData appends asset version query to bust stale model caches', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  const robots = api.normalizeRobotData([
    {
      id: 'r1',
      name: 'one',
      type: 'rosbot-2-pro',
      ip: 'host-a',
      model: {
        file_name: 'robots/theseus.glb',
        asset_version: '123456',
        available_qualities: ['low'],
      },
    },
  ]);

  assert.equal(robots[0].modelUrl, 'assets/models/robots/theseus.glb?mv=123456');
});

test('buildRobotModelMarkup falls back to type model when robot override lacks requested quality', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  const markup = api.buildRobotModelMarkup(
    {
      id: 'r-low-only',
      name: 'Theseus',
      type: 'rosbot-2-pro',
      typeId: 'rosbot-2-pro',
      model: {
        file_name: 'robots/theseus.glb',
        available_qualities: ['low'],
      },
    },
    false,
    'high',
  );

  assert.match(markup, /src="assets\/models\/rosbot-2-pro\.glb"/);
  assert.match(markup, /data-model-resolution-base-url="assets\/models\/rosbot-2-pro\.glb"/);
});

test('renderDashboard inserts robot-type dividers in both online and offline fleet sections', async () => {
  await withFakeDocument(async () => {
    const createFleetFeature = await loadApi();
    const env = makeEnv();
    env.CAN_USE_MODEL_VIEWER = false;
    env.state.robots = [
      {
        id: 'robot-online-b',
        name: 'Bolt',
        type: 'Carrier',
        typeId: 'carrier',
        tests: {
          online: { status: 'ok', value: 'reachable', details: 'up', source: 'manual', checkedAt: 100 },
          movement: { status: 'ok', value: 'clear', source: 'manual', checkedAt: 101 },
        },
        battery: { value: '42%', status: 'ok', reason: '' },
        activity: {},
      },
      {
        id: 'robot-online-a',
        name: 'Atlas',
        type: 'Inspector',
        typeId: 'inspector',
        tests: {
          online: { status: 'ok', value: 'reachable', details: 'up', source: 'manual', checkedAt: 110 },
          movement: { status: 'warning', value: 'slow', source: 'manual', checkedAt: 111 },
        },
        battery: { value: '58%', status: 'ok', reason: '' },
        activity: {},
      },
      {
        id: 'robot-offline-b',
        name: 'Bravo',
        type: 'Inspector',
        typeId: 'inspector',
        tests: {
          online: { status: 'error', value: 'unreachable', details: 'down', source: 'manual', checkedAt: 120 },
          movement: { status: 'ok', value: 'clear', source: 'manual', checkedAt: 121 },
        },
        battery: { value: '18%', status: 'warning', reason: '' },
        activity: {},
      },
      {
        id: 'robot-offline-a',
        name: 'Courier',
        type: 'Carrier',
        typeId: 'carrier',
        tests: {
          online: { status: 'warning', value: 'unknown', details: 'checking', source: 'manual', checkedAt: 130 },
          movement: { status: 'ok', value: 'clear', source: 'manual', checkedAt: 131 },
        },
        battery: { value: '21%', status: 'warning', reason: '' },
        activity: {},
      },
    ];
    env.normalizeStatus = (value) => normalizeText(value, 'warning').toLowerCase();
    const runtime = makeRuntime(env);
    const api = createFleetFeature(runtime, env);

    api.renderDashboard();

    assert.equal(env.onlineSectionTitle.textContent, 'Online (2)');
    assert.equal(env.offlineSectionTitle.textContent, 'Offline (2)');

    assert.equal(normalizeClassName(env.onlineGrid.children[0].className), 'robot-type-divider');
    assert.equal(normalizeClassName(env.onlineGrid.children[2].className), 'robot-type-divider');
    assert.match(normalizeClassName(env.onlineGrid.children[1].className), /\brobot-card\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[1].className), /\bstate-ok\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[1].className), /\bouter-state-na\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[1].className), /\bouter-scope-hidden\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[1].className), /\binner-state-ok\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[3].className), /\brobot-card\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[3].className), /\bstate-warning\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[3].className), /\bouter-state-na\b/);
    assert.match(normalizeClassName(env.onlineGrid.children[3].className), /\binner-state-warning\b/);
    assert.equal(env.onlineGrid.children[0].children[0].textContent, 'Carrier');
    assert.equal(env.onlineGrid.children[2].children[0].textContent, 'Inspector');
    assert.equal(env.onlineGrid.children[1].getAttribute('data-robot-id'), 'robot-online-b');
    assert.equal(env.onlineGrid.children[3].getAttribute('data-robot-id'), 'robot-online-a');

    assert.equal(normalizeClassName(env.offlineGrid.children[0].className), 'robot-type-divider');
    assert.equal(normalizeClassName(env.offlineGrid.children[2].className), 'robot-type-divider');
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\brobot-card\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\bstate-offline\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\boffline\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\bouter-state-na\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\bouter-scope-hidden\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[1].className), /\binner-state-warning\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[3].className), /\brobot-card\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[3].className), /\bstate-offline\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[3].className), /\boffline\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[3].className), /\bouter-state-na\b/);
    assert.match(normalizeClassName(env.offlineGrid.children[3].className), /\binner-state-warning\b/);
    assert.equal(env.offlineGrid.children[0].children[0].textContent, 'Carrier');
    assert.equal(env.offlineGrid.children[2].children[0].textContent, 'Inspector');
    assert.equal(env.offlineGrid.children[1].getAttribute('data-robot-id'), 'robot-offline-a');
    assert.equal(env.offlineGrid.children[3].getAttribute('data-robot-id'), 'robot-offline-b');
  });
});

test('statusFromScore applies unknown > critical > warning > healthy priority', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  env.normalizeStatus = (value) => normalizeText(value, 'warning').toLowerCase();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  const makeRobot = (tests) => ({
    id: `robot-${Math.random()}`,
    tests,
    testDefinitions: Object.keys(tests)
      .filter((id) => id !== 'battery')
      .map((id) => ({ id, label: id, ownerTags: ['global'], platformTags: ['ros2'] })),
  });

  const unknownRobot = makeRobot({
    online: { status: 'ok', value: 'reachable', details: 'connected', source: 'manual', checkedAt: 10 },
    movement: { status: 'warning', value: 'unknown', details: 'Not checked yet', source: '', checkedAt: 0 },
  });
  const criticalRobot = makeRobot({
    online: { status: 'error', value: 'down', details: 'down', source: 'manual', checkedAt: 10 },
    movement: { status: 'warning', value: 'stuck', details: 'stuck', source: 'manual', checkedAt: 11 },
  });
  const warningRobot = makeRobot({
    online: { status: 'ok', value: 'up', details: 'ok', source: 'manual', checkedAt: 10 },
    movement: { status: 'warning', value: 'slow', details: 'slow', source: 'manual', checkedAt: 11 },
  });
  const healthyRobot = makeRobot({
    online: { status: 'ok', value: 'up', details: 'ok', source: 'manual', checkedAt: 10 },
    movement: { status: 'ok', value: 'clear', details: 'clear', source: 'manual', checkedAt: 11 },
  });

  assert.equal(api.statusFromScore(unknownRobot), 'unknown');
  assert.equal(api.statusFromScore(criticalRobot), 'critical');
  assert.equal(api.statusFromScore(warningRobot), 'warning');
  assert.equal(api.statusFromScore(healthyRobot), 'ok');
});

test('applyFilters keeps robots visible when only active owner profile is selected', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.activeOwnerProfile = 'alice';
  api.setRobots([
    {
      id: 'r1',
      name: 'Alpha',
      type: 'Rosbot',
      typeId: 'rosbot',
      tests: {
        online: { status: 'ok', value: 'up', details: 'ok', source: 'manual', checkedAt: 10 },
      },
      testDefinitions: [{ id: 'online', label: 'Online', ownerTags: ['global'], platformTags: ['ros2'] }],
    },
    {
      id: 'r2',
      name: 'Beta',
      type: 'Rosbot',
      typeId: 'rosbot',
      tests: {
        online: { status: 'warning', value: 'slow', details: 'slow', source: 'manual', checkedAt: 11 },
      },
      testDefinitions: [{ id: 'online', label: 'Online', ownerTags: ['global'], platformTags: ['ros2'] }],
    },
  ]);

  const visible = api.applyFilters();
  assert.equal(visible.length, 2);
});

test('getActiveUserAggregate excludes global-only tests from user outer scope', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.activeOwnerProfile = 'alice';
  const aggregate = api.getActiveUserAggregate({
    id: 'r1',
    tests: {
      online: { status: 'warning', value: 'unknown', details: 'unknown', source: 'manual', checkedAt: 11 },
      movement: { status: 'warning', value: 'blocked', details: 'blocked', source: 'manual', checkedAt: 12 },
    },
    testDefinitions: [
      { id: 'online', label: 'Online', ownerTags: ['global'], platformTags: ['ros2'] },
      { id: 'movement', label: 'Movement', ownerTags: ['global'], platformTags: ['ros2'] },
    ],
  });

  assert.equal(aggregate.hasChecks, false);
  assert.equal(aggregate.entries.length, 0);
  assert.equal(aggregate.state, 'unknown');
});

test('getActiveUserAggregate only uses selected user tests when both user and global exist', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.activeOwnerProfile = 'alice';
  const aggregate = api.getActiveUserAggregate({
    id: 'r2',
    tests: {
      online: { status: 'warning', value: 'unknown', details: 'unknown', source: 'manual', checkedAt: 21 },
      movement: { status: 'warning', value: 'blocked', details: 'blocked', source: 'manual', checkedAt: 22 },
      camera: { status: 'ok', value: 'clear', details: 'clear', source: 'manual', checkedAt: 23 },
    },
    testDefinitions: [
      { id: 'online', label: 'Online', ownerTags: ['global'], platformTags: ['ros2'] },
      { id: 'movement', label: 'Movement', ownerTags: ['global'], platformTags: ['ros2'] },
      { id: 'camera', label: 'Camera', ownerTags: ['alice'], platformTags: ['ros2'] },
    ],
  });

  assert.equal(aggregate.hasChecks, true);
  assert.equal(aggregate.entries.length, 1);
  assert.equal(aggregate.entries[0].id, 'camera');
  assert.equal(aggregate.state, 'ok');
});

test('matchesDefinitionFilters uses OR within fields and AND across owner/platform', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.ownerTags = ['alice', 'bob'];
  env.state.filter.platformTags = ['ros2'];

  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['alice'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['bob'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['charlie'], platformTags: ['ros2'] },
      {},
    ),
    false,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['alice'], platformTags: ['ros1'] },
      {},
    ),
    false,
  );
});

test('matchesDefinitionFilters defaults to global owner scope when no owner is selected', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.ownerTags = [];
  env.state.filter.activeOwnerProfile = '';
  env.state.filter.platformTags = [];

  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['global'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['alice'], platformTags: ['ros2'] },
      {},
    ),
    false,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['global', 'alice'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
});

test('matchesDefinitionFilters includes active user and global when active owner is selected', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.ownerTags = [];
  env.state.filter.activeOwnerProfile = 'alice';
  env.state.filter.platformTags = [];

  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['global'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['alice'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['bob'], platformTags: ['ros2'] },
      {},
    ),
    false,
  );
});

test('matchesDefinitionFilters includes global definitions when a specific owner is selected', async () => {
  const createFleetFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env);
  const api = createFleetFeature(runtime, env);

  env.state.filter.ownerTags = ['alice'];
  env.state.filter.platformTags = [];

  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['global'], platformTags: ['ros2'] },
      {},
    ),
    true,
  );
  assert.equal(
    api.matchesDefinitionFilters(
      { ownerTags: ['bob'], platformTags: ['ros2'] },
      {},
    ),
    false,
  );
});

test('renderDashboard reuses existing robot card nodes on repeated runtime renders', async () => {
  await withFakeDocument(async () => {
    const createFleetFeature = await loadApi();
    const env = makeEnv();
    env.CAN_USE_MODEL_VIEWER = false;
    env.normalizeStatus = (value) => normalizeText(value, 'warning').toLowerCase();
    const runtime = makeRuntime(env);
    const api = createFleetFeature(runtime, env);

    api.setRobots([
      {
        id: 'robot-online-a',
        name: 'Atlas',
        type: 'Inspector',
        typeId: 'inspector',
        tests: {
          online: { status: 'ok', value: 'reachable', details: 'up' },
          movement: { status: 'warning', value: 'slow' },
        },
        battery: { value: '58%', status: 'ok', reason: '' },
        activity: {},
      },
    ]);
    api.renderDashboard();

    const firstCard = env.onlineGrid.children.find(
      (child) => child?.getAttribute?.('data-robot-id') === 'robot-online-a',
    );

    api.setRobots([
      {
        id: 'robot-online-a',
        name: 'Atlas',
        type: 'Inspector',
        typeId: 'inspector',
        tests: {
          online: { status: 'ok', value: 'reachable', details: 'up' },
          movement: { status: 'ok', value: 'clear' },
        },
        battery: { value: '61%', status: 'ok', reason: '' },
        activity: { testing: true },
      },
    ]);
    api.renderDashboard();

    const secondCard = env.onlineGrid.children.find(
      (child) => child?.getAttribute?.('data-robot-id') === 'robot-online-a',
    );

    assert.ok(firstCard);
    assert.equal(secondCard, firstCard);
    assert.equal(
      env.onlineGrid.children.filter((child) => child?.getAttribute?.('data-robot-id') === 'robot-online-a').length,
      1,
    );
  });
});
