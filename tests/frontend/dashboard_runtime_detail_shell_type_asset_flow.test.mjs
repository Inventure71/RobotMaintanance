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
  '../../assets/js/modules/dashboard/features/detail/controller/createDetailFeature.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function normalizeTypeId(value) {
  return normalizeText(value, '').toLowerCase();
}

class FakeFormData {
  constructor(source) {
    this.map = new Map(source?.__formEntries || []);
  }

  get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  set(key, value) {
    this.map.set(key, value);
  }
}

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...tokens) => tokens.forEach((token) => values.add(token)),
    remove: (...tokens) => tokens.forEach((token) => values.delete(token)),
    contains: (token) => values.has(token),
    toggle: (token, force) => {
      if (force === undefined) {
        if (values.has(token)) {
          values.delete(token);
          return false;
        }
        values.add(token);
        return true;
      }
      if (force) values.add(token);
      else values.delete(token);
      return force;
    },
  };
}

function makeNode(value = '') {
  const attributes = new Map();
  const listeners = new Map();
  return {
    value,
    textContent: '',
    innerHTML: '',
    classList: makeClassList(),
    replaceChildren: () => {},
    appendChild: () => {},
    append: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (event, handler) => {
      listeners.set(event, handler);
    },
    click: () => {
      const handler = listeners.get('click');
      if (handler) handler();
    },
    setAttribute: (name, nextValue) => {
      attributes.set(name, String(nextValue));
    },
    getAttribute: (name) => attributes.get(name) ?? null,
    dataset: {},
  };
}

async function loadApi(fetchImpl, options = {}) {
  const renderManageEntityListStub = options.renderManageEntityListStub || (() => {});
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      "import { renderManageEntityList } from '../../manage/manageEntityList.js';",
      'const renderManageEntityList = globalThis.__renderManageEntityListStub;',
    )
    .replace(
      "import { buildManageHashValue, normalizeManageTabValue, normalizeRobotRegistryPanelValue, parseManageRouteValue } from '../domain/manageNavigation.js';",
      `const normalizeManageTabValue = ({ normalizeText, manageTabs, tabId }) => {
        const normalized = normalizeText(tabId, '').toLowerCase();
        if (normalized === 'tests' || normalized === 'fixes') return 'definitions';
        return manageTabs.includes(normalized) ? normalized : '';
      };
      const buildManageHashValue = ({ normalizeManageTab, manageViewHash, tabId }) => {
        const normalized = normalizeManageTab(tabId) || 'robots';
        return normalized === 'robots' ? manageViewHash : \`\${manageViewHash}/\${normalized}\`;
      };
      const parseManageRouteValue = ({ normalizeManageTab, normalizeText, manageViewHash, hashValue }) => {
        const hash = normalizeText(hashValue, '').replace(/^#/, '');
        if (hash === manageViewHash || hash === 'add-robot') return { isManageRoute: true, tabId: '' };
        if (!hash.startsWith(\`\${manageViewHash}/\`)) return { isManageRoute: false, tabId: '' };
        const tabId = hash.slice(manageViewHash.length + 1);
        return { isManageRoute: true, tabId: normalizeManageTab(tabId) || 'robots' };
      };
      const normalizeRobotRegistryPanelValue = (normalizeText, panelId) => {
        const normalized = normalizeText(panelId, '').toLowerCase();
        if (normalized === 'manage' || normalized === 'existing-robots') return 'existing-robots';
        if (normalized === 'add' || normalized === 'new-robot') return 'new-robot';
        if (normalized === 'robot-types' || normalized === 'existing-robot-types' || normalized === 'types' || normalized === 'type') return 'existing-robot-types';
        if (normalized === 'new-robot-type' || normalized === 'add-type' || normalized === 'new-type') return 'new-robot-type';
        return 'existing-robots';
      };`,
    )
    .replace(
      "import { renderRobotRegistryPanel } from '../view/robotRegistryView.js';",
      `const renderRobotRegistryPanel = ({ buttons, panels, normalizeRobotRegistryPanel, panelId }) => {
        const nextPanel = normalizeRobotRegistryPanel(panelId);
        buttons.forEach((button) => {
          const isActive = normalizeRobotRegistryPanel(button?.dataset?.robotRegistryPanelButton) === nextPanel;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach((panel) => {
          const isActive = normalizeRobotRegistryPanel(panel?.dataset?.robotRegistryPanel) === nextPanel;
          panel.classList.toggle('active', isActive);
          panel.classList.toggle('hidden', !isActive);
        });
        return nextPanel;
      };`,
    )
    .replace('export function createDetailFeature', 'function createDetailFeature')}\nmodule.exports = { createDetailFeature };\n`;
  const context = {
    console,
    fetch: fetchImpl,
    FormData: FakeFormData,
    __renderManageEntityListStub: renderManageEntityListStub,
    module: { exports: {} },
    exports: {},
    window: {
      confirm: () => true,
      location: { hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    },
    document: {
      createElement: () => makeNode(),
    },
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.createDetailFeature;
}

function makeRuntime(calls, env) {
  const runtime = {
    loadRobotTypeConfig: async () => {
      calls.loadRobotTypeConfig += 1;
      return [];
    },
    loadRobotsFromBackend: async () => {
      calls.loadRobotsFromBackend += 1;
      return [];
    },
    setRobots: (robots) => {
      env.state.robots = robots;
    },
    normalizeIdList: (values) => (Array.isArray(values) ? values.filter(Boolean) : []),
    normalizeDefinitionsSummary: (value) => value,
    getRobotById: () => null,
    getRobotTypeConfig: () => null,
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

function makeEnv() {
  const addRobotTypeLowModelDropzone = makeNode();
  const addRobotTypeLowModelFileInput = makeNode();
  addRobotTypeLowModelFileInput.files = [];
  const addRobotTypeHighModelDropzone = makeNode();
  const addRobotTypeHighModelFileInput = makeNode();
  addRobotTypeHighModelFileInput.files = [];
  const editRobotTypeLowModelDropzone = makeNode();
  const editRobotTypeLowModelFileInput = makeNode();
  editRobotTypeLowModelFileInput.files = [];
  const editRobotTypeHighModelDropzone = makeNode();
  const editRobotTypeHighModelFileInput = makeNode();
  editRobotTypeHighModelFileInput.files = [];
  const editRobotTypeClearModelInput = makeNode();
  editRobotTypeClearModelInput.checked = false;
  const editRobotTypeForm = {
    __formEntries: [
      ['name', 'Rosbot 2 Pro Updated'],
      ['batteryCommand', ''],
    ],
    resetCalled: 0,
  };
  editRobotTypeForm.reset = () => {
    editRobotTypeForm.resetCalled += 1;
  };
  const editRobotTypeBatteryInfoButton = makeNode();
  editRobotTypeBatteryInfoButton.setAttribute('aria-expanded', 'false');
  const addRobotTypeBatteryInfoButton = makeNode();
  addRobotTypeBatteryInfoButton.setAttribute('aria-expanded', 'false');
  const editRobotTypeBatteryInfo = makeNode();
  editRobotTypeBatteryInfo.classList.add('hidden');
  const addRobotTypeBatteryInfo = makeNode();
  addRobotTypeBatteryInfo.classList.add('hidden');
  return {
    normalizeText,
    normalizeTypeId,
    buildApiUrl: (route) => `http://localhost${route}`,
    state: {
      robots: [],
      selectedRobotIds: new Set(),
      testingRobotIds: new Set(),
      searchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      autoActivityRobotIds: new Set(),
      selectedManageRobotId: '',
      selectedManageRobotTypeId: 'rosbot-2-pro',
      detailRobotId: '',
      isEditRobotTypeInProgress: false,
    },
    dashboard: { classList: makeClassList() },
    detail: { classList: makeClassList() },
    editRobotTypeManageSelect: makeNode('rosbot-2-pro'),
    editRobotTypeForm,
    editRobotTypeBatteryCommandInput: makeNode(''),
    editRobotTypeBatteryInfoButton,
    editRobotTypeBatteryInfo,
    editRobotTypeLowModelDropzone,
    editRobotTypeLowModelFileInput,
    editRobotTypeHighModelDropzone,
    editRobotTypeHighModelFileInput,
    editRobotTypeClearModelInput,
    editRobotTypeClearModelField: makeNode(),
    editRobotTypeModelStatus: makeNode(),
    editRobotTypeSaveButton: {},
    editRobotTypeStatus: makeNode(),
    editRobotSelect: makeNode(),
    addRobotTypeSelect: makeNode(),
    addRobotTypeForm: { reset: () => {} },
    addRobotTypeBatteryCommandInput: makeNode(''),
    addRobotTypeBatteryInfoButton,
    addRobotTypeBatteryInfo,
    addRobotTypeMessage: makeNode(),
    addRobotTypeLowModelDropzone,
    addRobotTypeLowModelFileInput,
    addRobotTypeLowModelFileName: makeNode(),
    addRobotTypeHighModelDropzone,
    addRobotTypeHighModelFileInput,
    addRobotTypeHighModelFileName: makeNode(),
    editRobotTypeLowModelFileName: makeNode(),
    editRobotTypeHighModelFileName: makeNode(),
    editRobotTypeSummary: makeNode(),
    editRobotTypeDeleteButton: {},
    filterType: makeNode(),
    filterError: makeNode(),
    editRobotList: makeNode(),
    editRobotSummary: makeNode(),
    editRobotStatus: makeNode(),
    editRobotForm: { reset: () => {} },
    editRobotLowModelFileInput: { files: [] },
    editRobotLowModelFileName: makeNode(),
    editRobotHighModelFileInput: { files: [] },
    editRobotHighModelFileName: makeNode(),
    editRobotOverrideLowModelSelect: makeNode('default'),
    editRobotOverrideHighModelSelect: makeNode('default'),
    editRobotLowModelField: makeNode(),
    editRobotHighModelField: makeNode(),
    editRobotClearOverrideInput: { checked: false },
    editRobotClearOverrideField: makeNode(),
    editRobotModelStatus: makeNode(),
    ROBOT_TYPES: [],
    ROBOT_TYPE_BY_ID: new Map(),
    TEST_DEFINITIONS: [
      { id: 'battery', label: 'Battery' },
      { id: 'online', label: 'Online' },
    ],
    setActionButtonLoading: () => {},
  };
}

test('saveRobotTypeEditsFromForm refreshes robot snapshot after successful type update', async () => {
  const fetchCalls = [];
  const createDetailFeature = await loadApi(async (url, init = {}) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      json: async () => ({}),
      text: async () => '',
    };
  });
  const calls = {
    loadRobotTypeConfig: 0,
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  const runtime = makeRuntime(calls, env);
  const api = createDetailFeature(runtime, env);

  await api.saveRobotTypeEditsFromForm();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost/api/robot-types/rosbot-2-pro');
  assert.equal(calls.loadRobotTypeConfig, 1);
  assert.equal(calls.loadRobotsFromBackend, 1);
  assert.equal(env.editRobotTypeStatus.textContent, 'Robot type updated successfully.');
});

test('initRobotTypeUploadInputs toggles the battery info panel', async () => {
  const fetchCalls = [];
  const createDetailFeature = await loadApi(async (url, init = {}) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      json: async () => ({}),
      text: async () => '',
    };
  });
  const calls = {
    loadRobotTypeConfig: 0,
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  const runtime = makeRuntime(calls, env);
  const api = createDetailFeature(runtime, env);

  api.initRobotTypeUploadInputs();
  env.addRobotTypeBatteryInfoButton.click();

  assert.equal(fetchCalls.length, 0);
  assert.equal(env.addRobotTypeBatteryInfoButton.getAttribute('aria-expanded'), 'true');
  assert.equal(env.addRobotTypeBatteryInfo.classList.contains('hidden'), false);

  env.addRobotTypeBatteryInfoButton.click();

  assert.equal(env.addRobotTypeBatteryInfoButton.getAttribute('aria-expanded'), 'false');
  assert.equal(env.addRobotTypeBatteryInfo.classList.contains('hidden'), true);
});

test('populateEditRobotSelectOptions passes split robot name and type metadata to the Robot Catalog list', async () => {
  const manageListCalls = [];
  const createDetailFeature = await loadApi(
    async () => ({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    }),
    {
      renderManageEntityListStub: (payload) => {
        manageListCalls.push(payload);
      },
    },
  );
  const calls = {
    loadRobotTypeConfig: 0,
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  env.state.robots = [
    {
      id: 'robot-01',
      name: 'Atlas',
      type: 'Inspector',
      typeId: 'inspector',
    },
  ];
  const runtime = makeRuntime(calls, env);
  runtime.getRobotById = (id) => env.state.robots.find((robot) => robot.id === id) || null;
  const api = createDetailFeature(runtime, env);

  api.populateEditRobotSelectOptions('robot-01');

  assert.ok(manageListCalls.length >= 1);
  const lastCall = manageListCalls.at(-1);
  const label = lastCall.getLabel(env.state.robots[0]);
  assert.equal(label.title, 'Atlas');
  assert.equal(label.meta, 'Inspector');
  assert.equal(label.ariaLabel, 'Atlas Inspector');
});
