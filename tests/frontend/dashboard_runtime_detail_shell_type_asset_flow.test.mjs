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
  return {
    value,
    textContent: '',
    innerHTML: '',
    classList: makeClassList(),
    replaceChildren: () => {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute: () => {},
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
      createElement: () => ({ classList: makeClassList() }),
    },
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.registerDetailShellRuntime;
}

function makeRuntime(calls, env) {
  const runtime = {
    loadRobotsFromBackend: async () => {
      calls.loadRobotsFromBackend += 1;
      return [];
    },
    setRobots: (robots) => {
      env.state.robots = robots;
    },
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
  const editRobotTypeForm = { __formEntries: [['name', 'Rosbot 2 Pro Updated']], resetCalled: 0 };
  editRobotTypeForm.reset = () => {
    editRobotTypeForm.resetCalled += 1;
  };
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
    editRobotTypeLowModelFileInput: { files: [] },
    editRobotTypeHighModelFileInput: { files: [] },
    editRobotTypeClearModelInput: { checked: false },
    editRobotTypeClearModelField: makeNode(),
    editRobotTypeModelStatus: makeNode(),
    editRobotTypeSaveButton: {},
    editRobotTypeStatus: makeNode(),
    editRobotSelect: makeNode(),
    addRobotTypeSelect: makeNode(),
    addRobotTypeForm: { reset: () => {} },
    addRobotTypeMessage: makeNode(),
    addRobotTypeLowModelFileInput: { files: [] },
    addRobotTypeLowModelFileName: makeNode(),
    addRobotTypeHighModelFileInput: { files: [] },
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
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  const runtime = makeRuntime(calls, env);
  const api = registerDetailShellRuntime(runtime, env);

  await api.saveRobotTypeEditsFromForm();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost/api/robot-types/rosbot-2-pro');
  assert.equal(calls.loadRobotsFromBackend, 1);
  assert.equal(env.editRobotTypeStatus.textContent, 'Robot type updated successfully.');
});
