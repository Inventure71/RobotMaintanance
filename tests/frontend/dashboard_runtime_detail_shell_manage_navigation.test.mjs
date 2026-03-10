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

function makeNode({
  value = '',
  dataset = {},
  classes = [],
} = {}) {
  const attributes = new Map();
  return {
    value,
    dataset,
    files: [],
    textContent: '',
    classList: makeClassList(classes),
    setAttribute: (name, nextValue) => {
      attributes.set(name, String(nextValue));
    },
    getAttribute: (name) => attributes.get(name) ?? null,
    replaceChildren: () => {},
    appendChild: () => {},
    append: () => {},
    addEventListener: () => {},
  };
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      "import { renderManageEntityList } from '../../features/manage/manageEntityList.js';",
      'const renderManageEntityList = globalThis.__renderManageEntityListStub;',
    )
    .replace('export function registerDetailShellRuntime', 'function registerDetailShellRuntime')}\nmodule.exports = { registerDetailShellRuntime };\n`;
  const context = {
    console,
    __renderManageEntityListStub: () => {},
    module: { exports: {} },
    exports: {},
    window: {
      confirm: () => true,
      location: { hash: '' },
      sessionStorage: {
        getItem: () => '',
        setItem: () => {},
      },
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

function buildRegistryNodes(initialPanel = 'manage') {
  const manageButton = makeNode({
    dataset: { robotRegistryPanelButton: 'manage' },
    classes: initialPanel === 'manage' ? ['active'] : [],
  });
  const addButton = makeNode({
    dataset: { robotRegistryPanelButton: 'add' },
    classes: initialPanel === 'add' ? ['active'] : [],
  });
  manageButton.setAttribute('aria-selected', initialPanel === 'manage' ? 'true' : 'false');
  addButton.setAttribute('aria-selected', initialPanel === 'add' ? 'true' : 'false');

  const managePanel = makeNode({
    dataset: { robotRegistryPanel: 'manage' },
    classes: initialPanel === 'manage' ? ['active'] : ['hidden'],
  });
  const addPanel = makeNode({
    dataset: { robotRegistryPanel: 'add' },
    classes: initialPanel === 'add' ? ['active'] : ['hidden'],
  });

  return {
    manageButton,
    addButton,
    managePanel,
    addPanel,
  };
}

function makeEnv(initialPanel = 'manage') {
  const registry = buildRegistryNodes(initialPanel);
  return {
    MANAGE_TABS: ['robots', 'definitions', 'recorder'],
    normalizeText,
    ROBOT_TYPES: [],
    state: {
      robots: [{ id: 'robot-1', typeId: 'picker' }],
      detailRobotId: 'robot-1',
      isCreateRobotInProgress: true,
      isEditRobotInProgress: true,
      isDeleteRobotInProgress: true,
      selectedManageRobotId: '',
      selectedManageRobotTypeId: '',
      activeManageTab: 'robots',
      activeRobotRegistryPanel: initialPanel,
    },
    dashboard: makeNode({ classes: ['active'] }),
    detail: makeNode({ classes: ['active'] }),
    addRobotSection: makeNode(),
    addRobotTypeSelect: makeNode(),
    addRobotSavingHint: makeNode(),
    addRobotOverrideLowModelSelect: makeNode({ value: 'override' }),
    addRobotOverrideHighModelSelect: makeNode({ value: 'override' }),
    addRobotLowModelField: makeNode(),
    addRobotHighModelField: makeNode(),
    addRobotLowModelFileInput: makeNode(),
    addRobotHighModelFileInput: makeNode(),
    addRobotLowModelFileName: makeNode(),
    addRobotHighModelFileName: makeNode(),
    robotRegistryPanelButtons: [registry.manageButton, registry.addButton],
    robotRegistryPanels: [registry.managePanel, registry.addPanel],
  };
}

function makeRuntime(calls) {
  const runtime = {
    setAddRobotMessage: (...args) => {
      calls.addRobotMessages.push(args);
    },
    setEditRobotMessage: (...args) => {
      calls.editRobotMessages.push(args);
    },
    setAddRobotTypeMessage: (...args) => {
      calls.addRobotTypeMessages.push(args);
    },
    populateAddRobotTypeOptions: () => {
      calls.populateAddRobotTypeOptions += 1;
    },
    populateEditRobotSelectOptions: (...args) => {
      calls.populateEditRobotSelectOptions.push(args);
    },
    renderRecorderRobotOptions: () => {
      calls.renderRecorderRobotOptions += 1;
    },
    setActiveManageTab: (...args) => {
      calls.setActiveManageTab.push(args);
    },
    syncFixModePanels: () => {
      calls.syncFixModePanels += 1;
    },
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

test('showAddRobotPage preserves the current robot registry subpanel when no override is requested', async () => {
  const registerDetailShellRuntime = await loadApi();
  const env = makeEnv('add');
  const calls = {
    addRobotMessages: [],
    editRobotMessages: [],
    addRobotTypeMessages: [],
    populateAddRobotTypeOptions: 0,
    populateEditRobotSelectOptions: [],
    renderRecorderRobotOptions: 0,
    setActiveManageTab: [],
    syncFixModePanels: 0,
  };
  const api = registerDetailShellRuntime(makeRuntime(calls), env);

  api.showAddRobotPage({
    tabId: 'robots',
    syncHash: false,
    refreshDefinitions: false,
  });

  assert.equal(env.state.activeRobotRegistryPanel, 'add');
  assert.equal(env.addRobotSection.classList.contains('active'), true);
  assert.equal(env.dashboard.classList.contains('active'), false);
  assert.equal(env.detail.classList.contains('active'), false);
  assert.equal(env.robotRegistryPanelButtons[1].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[1].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[0].classList.contains('hidden'), true);
  assert.equal(calls.setActiveManageTab.length, 1);
  assert.equal(calls.setActiveManageTab[0][0], 'robots');
});

test('showAddRobotPage can explicitly force the Manage existing robot registry panel', async () => {
  const registerDetailShellRuntime = await loadApi();
  const env = makeEnv('add');
  const calls = {
    addRobotMessages: [],
    editRobotMessages: [],
    addRobotTypeMessages: [],
    populateAddRobotTypeOptions: 0,
    populateEditRobotSelectOptions: [],
    renderRecorderRobotOptions: 0,
    setActiveManageTab: [],
    syncFixModePanels: 0,
  };
  const api = registerDetailShellRuntime(makeRuntime(calls), env);

  api.showAddRobotPage({
    tabId: 'robots',
    syncHash: false,
    refreshDefinitions: false,
    robotRegistryPanelId: 'manage',
  });

  assert.equal(env.state.activeRobotRegistryPanel, 'manage');
  assert.equal(env.robotRegistryPanelButtons[0].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanelButtons[0].getAttribute('aria-selected'), 'true');
  assert.equal(env.robotRegistryPanelButtons[1].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanelButtons[1].getAttribute('aria-selected'), 'false');
  assert.equal(env.robotRegistryPanels[0].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[0].classList.contains('hidden'), false);
  assert.equal(env.robotRegistryPanels[1].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanels[1].classList.contains('hidden'), true);
});
