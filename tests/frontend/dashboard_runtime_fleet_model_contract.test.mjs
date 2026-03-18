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
  '../../assets/js/modules/dashboard/features/fleet/controller/createFleetFeature.js',
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
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
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

  querySelector() {
    return null;
  }
}

async function withFakeDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
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
  const transformed = `${source
    .replace(
      "import { createModelAssetResolver } from '../../../primitives/model-viewer/modelAssetResolver.js';",
      "const createModelAssetResolver = () => ({ getInitialModelUrl: (url) => url, bindModelViewerSource: () => {} });",
    )
    .replace(
      'export function createFleetFeature',
      'function createFleetFeature',
    )}\nmodule.exports = { createFleetFeature };\n`;
  const context = {
    console,
    document: globalThis.document,
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
    normalizeRobotActivity: () => ({ searching: false, testing: false }),
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
    state: {
      autoActivityRobotIds: new Set(),
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
      fixModeOpen: { dashboard: false, detail: false },
    },
  };
}

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
          online: { status: 'ok', value: 'reachable', details: 'up' },
          movement: { status: 'ok', value: 'clear' },
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
          online: { status: 'ok', value: 'reachable', details: 'up' },
          movement: { status: 'warning', value: 'slow' },
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
          online: { status: 'error', value: 'unreachable', details: 'down' },
          movement: { status: 'ok', value: 'clear' },
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
          online: { status: 'warning', value: 'unknown', details: 'checking' },
          movement: { status: 'ok', value: 'clear' },
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

    assert.deepEqual(
      env.onlineGrid.children.map((child) => normalizeClassName(child.className)),
      ['robot-type-divider', 'robot-card state-ok', 'robot-type-divider', 'robot-card state-warning'],
    );
    assert.equal(env.onlineGrid.children[0].children[0].textContent, 'Carrier');
    assert.equal(env.onlineGrid.children[2].children[0].textContent, 'Inspector');
    assert.equal(env.onlineGrid.children[1].getAttribute('data-robot-id'), 'robot-online-b');
    assert.equal(env.onlineGrid.children[3].getAttribute('data-robot-id'), 'robot-online-a');

    assert.deepEqual(
      env.offlineGrid.children.map((child) => normalizeClassName(child.className)),
      ['robot-type-divider', 'robot-card state-offline offline', 'robot-type-divider', 'robot-card error state-offline offline'],
    );
    assert.equal(env.offlineGrid.children[0].children[0].textContent, 'Carrier');
    assert.equal(env.offlineGrid.children[2].children[0].textContent, 'Inspector');
    assert.equal(env.offlineGrid.children[1].getAttribute('data-robot-id'), 'robot-offline-a');
    assert.equal(env.offlineGrid.children[3].getAttribute('data-robot-id'), 'robot-offline-b');
  });
});
