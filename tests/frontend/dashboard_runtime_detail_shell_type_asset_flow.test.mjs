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
  '../../assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeDetailShell.js',
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

async function loadApi(fetchImpl) {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      "import { renderManageEntityList } from '../../features/manage/manageEntityList.js';",
      'const renderManageEntityList = () => {};',
    )
    .replace('export function registerDetailShellRuntime', 'function registerDetailShellRuntime')}\nmodule.exports = { registerDetailShellRuntime };\n`;
  const context = {
    console,
    fetch: fetchImpl,
    FormData: FakeFormData,
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
  return context.module.exports.registerDetailShellRuntime;
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
  const registerDetailShellRuntime = await loadApi(async (url, init = {}) => {
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
  const api = registerDetailShellRuntime(runtime, env);

  await api.saveRobotTypeEditsFromForm();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost/api/robot-types/rosbot-2-pro');
  assert.equal(calls.loadRobotTypeConfig, 1);
  assert.equal(calls.loadRobotsFromBackend, 1);
  assert.equal(env.editRobotTypeStatus.textContent, 'Robot type updated successfully.');
});

test('initRobotTypeUploadInputs toggles the battery info panel', async () => {
  const fetchCalls = [];
  const registerDetailShellRuntime = await loadApi(async (url, init = {}) => {
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
  const api = registerDetailShellRuntime(runtime, env);

  api.initRobotTypeUploadInputs();
  env.addRobotTypeBatteryInfoButton.click();

  assert.equal(fetchCalls.length, 0);
  assert.equal(env.addRobotTypeBatteryInfoButton.getAttribute('aria-expanded'), 'true');
  assert.equal(env.addRobotTypeBatteryInfo.classList.contains('hidden'), false);

  env.addRobotTypeBatteryInfoButton.click();

  assert.equal(env.addRobotTypeBatteryInfoButton.getAttribute('aria-expanded'), 'false');
  assert.equal(env.addRobotTypeBatteryInfo.classList.contains('hidden'), true);
});
