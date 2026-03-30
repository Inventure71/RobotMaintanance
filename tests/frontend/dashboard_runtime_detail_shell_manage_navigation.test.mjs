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

function normalizeStatus(value) {
  const normalized = normalizeText(value, 'warning').toLowerCase();
  if (normalized === 'ok' || normalized === 'warning' || normalized === 'error') return normalized;
  return 'warning';
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
  return context.module.exports.createDetailFeature;
}

function buildRegistryNodes(initialPanel = 'existing-robots') {
  const existingButton = makeNode({
    dataset: { robotRegistryPanelButton: 'existing-robots' },
    classes: initialPanel === 'existing-robots' ? ['active'] : [],
  });
  const existingTypesButton = makeNode({
    dataset: { robotRegistryPanelButton: 'existing-robot-types' },
    classes: initialPanel === 'existing-robot-types' ? ['active'] : [],
  });
  const newRobotButton = makeNode({
    dataset: { robotRegistryPanelButton: 'new-robot' },
    classes: initialPanel === 'new-robot' ? ['active'] : [],
  });
  const newTypeButton = makeNode({
    dataset: { robotRegistryPanelButton: 'new-robot-type' },
    classes: initialPanel === 'new-robot-type' ? ['active'] : [],
  });
  existingButton.setAttribute('aria-selected', initialPanel === 'existing-robots' ? 'true' : 'false');
  existingTypesButton.setAttribute('aria-selected', initialPanel === 'existing-robot-types' ? 'true' : 'false');
  newRobotButton.setAttribute('aria-selected', initialPanel === 'new-robot' ? 'true' : 'false');
  newTypeButton.setAttribute('aria-selected', initialPanel === 'new-robot-type' ? 'true' : 'false');

  const existingPanel = makeNode({
    dataset: { robotRegistryPanel: 'existing-robots' },
    classes: initialPanel === 'existing-robots' ? ['active'] : ['hidden'],
  });
  const existingTypesPanel = makeNode({
    dataset: { robotRegistryPanel: 'existing-robot-types' },
    classes: initialPanel === 'existing-robot-types' ? ['active'] : ['hidden'],
  });
  const newRobotPanel = makeNode({
    dataset: { robotRegistryPanel: 'new-robot' },
    classes: initialPanel === 'new-robot' ? ['active'] : ['hidden'],
  });
  const newTypePanel = makeNode({
    dataset: { robotRegistryPanel: 'new-robot-type' },
    classes: initialPanel === 'new-robot-type' ? ['active'] : ['hidden'],
  });

  return {
    existingButton,
    existingTypesButton,
    newRobotButton,
    newTypeButton,
    existingPanel,
    existingTypesPanel,
    newRobotPanel,
    newTypePanel,
  };
}

function makeEnv(initialPanel = 'existing-robots') {
  const registry = buildRegistryNodes(initialPanel);
  return {
    MANAGE_TABS: ['robots', 'definitions', 'recorder'],
    normalizeText,
    normalizeStatus,
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
    robotRegistryPanelButtons: [registry.existingButton, registry.existingTypesButton, registry.newRobotButton, registry.newTypeButton],
    robotRegistryPanels: [registry.existingPanel, registry.existingTypesPanel, registry.newRobotPanel, registry.newTypePanel],
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
  const createDetailFeature = await loadApi();
  const env = makeEnv('new-robot');
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
  const api = createDetailFeature(makeRuntime(calls), env);

  api.showAddRobotPage({
    tabId: 'robots',
    syncHash: false,
    refreshDefinitions: false,
  });

  assert.equal(env.state.activeRobotRegistryPanel, 'new-robot');
  assert.equal(env.addRobotSection.classList.contains('active'), true);
  assert.equal(env.dashboard.classList.contains('active'), false);
  assert.equal(env.detail.classList.contains('active'), false);
  assert.equal(env.robotRegistryPanelButtons[2].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[2].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[0].classList.contains('hidden'), true);
  assert.equal(env.robotRegistryPanels[1].classList.contains('hidden'), true);
  assert.equal(env.robotRegistryPanels[3].classList.contains('hidden'), true);
  assert.equal(calls.setActiveManageTab.length, 1);
  assert.equal(calls.setActiveManageTab[0][0], 'robots');
});

test('showAddRobotPage can explicitly force the Existing robots registry panel', async () => {
  const createDetailFeature = await loadApi();
  const env = makeEnv('new-robot');
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
  const api = createDetailFeature(makeRuntime(calls), env);

  api.showAddRobotPage({
    tabId: 'robots',
    syncHash: false,
    refreshDefinitions: false,
    robotRegistryPanelId: 'existing-robots',
  });

  assert.equal(env.state.activeRobotRegistryPanel, 'existing-robots');
  assert.equal(env.robotRegistryPanelButtons[0].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanelButtons[0].getAttribute('aria-selected'), 'true');
  assert.equal(env.robotRegistryPanelButtons[1].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanelButtons[1].getAttribute('aria-selected'), 'false');
  assert.equal(env.robotRegistryPanelButtons[2].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanelButtons[3].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanels[0].classList.contains('active'), true);
  assert.equal(env.robotRegistryPanels[0].classList.contains('hidden'), false);
  assert.equal(env.robotRegistryPanels[1].classList.contains('active'), false);
  assert.equal(env.robotRegistryPanels[1].classList.contains('hidden'), true);
  assert.equal(env.robotRegistryPanels[2].classList.contains('hidden'), true);
  assert.equal(env.robotRegistryPanels[3].classList.contains('hidden'), true);
});

test('openTestDebugModal surfaces error code and source in the summary', async () => {
  const createDetailFeature = await loadApi();
  const env = makeEnv('existing-robots');
  env.testDebugModal = makeNode({ classes: ['hidden'] });
  env.testDebugTitle = makeNode();
  env.testDebugSummary = makeNode();
  env.testDebugBody = makeNode();
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
  const api = createDetailFeature(makeRuntime(calls), env);

  api.openTestDebugModal(
    {
      name: 'Robot 1',
      testDefinitions: [{ id: 'general', label: 'General' }],
      tests: {
        general: {
          status: 'error',
          value: 'read_error',
          details: 'Parser mismatch',
          errorCode: 'definition_output_missing',
          source: 'executor',
        },
      },
      testDebug: {
        general: {
          id: 'general',
          status: 'error',
          value: 'read_error',
          details: 'Parser mismatch',
          errorCode: 'definition_output_missing',
          source: 'executor',
          read: {
            kind: 'contains_string',
            passed: false,
            details: 'Substring not found.',
            missing: ['/scan'],
            matched: [],
          },
          runId: 'run-1',
          startedAt: 10,
          finishedAt: 20,
          ms: 50,
          steps: [],
        },
      },
    },
    'general',
  );

  assert.match(env.testDebugSummary.textContent, /ErrorCode: definition_output_missing/);
  assert.match(env.testDebugSummary.textContent, /Source: executor/);
  assert.match(env.testDebugSummary.textContent, /CheckEval: contains_string \| fail \| Substring not found\. \| missing: \/scan/);
  assert.equal(env.testDebugModal.classList.contains('hidden'), false);
  assert.equal(env.testDebugModal.getAttribute('aria-hidden'), 'false');
  assert.equal(env.state.testDebugModalOpen, true);
});

test('runManualTests always runs online precheck and skips execution when probe fails', async () => {
  const createDetailFeature = await loadApi();
  const env = makeEnv('existing-robots');
  const terminalLines = [];
  env.terminal = {
    appendChild: (node) => {
      terminalLines.push(String(node?.textContent || ''));
    },
    scrollTop: 0,
    scrollHeight: 0,
    classList: makeClassList(),
  };
  env.state = {
    pageSessionId: 'page-1',
    robots: [
      {
        id: 'r1',
        name: 'Robot 1',
        typeId: 'picker',
        tests: { online: { status: 'ok', value: 'reachable', details: 'cached green' } },
      },
    ],
    selectedRobotIds: new Set(),
    detailRobotId: '',
    isTestRunInProgress: false,
    isAutoFixInProgress: false,
  };
  const calls = {
    addRobotMessages: [],
    editRobotMessages: [],
    addRobotTypeMessages: [],
    populateAddRobotTypeOptions: 0,
    populateEditRobotSelectOptions: [],
    renderRecorderRobotOptions: 0,
    setActiveManageTab: [],
    syncFixModePanels: 0,
    onlineChecks: 0,
    runRobotTests: 0,
  };
  const runtime = makeRuntime(calls);
  runtime.getRobotIdsForRun = () => ['r1'];
  runtime.hasMixedRobotTypesForIds = () => false;
  runtime.getRobotActionAvailability = () => ({ allowed: true, title: 'Run tests' });
  runtime.getFleetParallelism = () => 1;
  runtime.getRobotById = (id) => env.state.robots.find((robot) => robot.id === id) || null;
  runtime.robotId = (value) => normalizeText(typeof value === 'string' ? value : value?.id, '');
  runtime.runOneRobotOnlineCheck = async () => {
    calls.onlineChecks += 1;
    return { status: 'error', value: 'unreachable', details: 'offline now' };
  };
  runtime.updateOnlineCheckEstimateFromResults = () => {};
  runtime.mapRobots = (updater) => {
    env.state.robots = env.state.robots.map((robot) => updater(robot));
  };
  runtime.renderDashboard = () => {};
  runtime.setRobotSearching = () => {};
  runtime.setRobotTesting = () => {};
  runtime.runRobotTestsForRobot = async () => {
    calls.runRobotTests += 1;
    return { results: [] };
  };
  runtime.getConfiguredDefaultTestIds = () => ['general'];
  runtime.estimateTestCountdownMsFromBody = () => 1000;
  runtime.updateRobotTestState = () => {};
  runtime.setRunningButtonState = () => {};

  const api = createDetailFeature(runtime, env);
  await api.runManualTests({ fallbackToActive: true, body: { testIds: ['general'] } });

  assert.equal(calls.onlineChecks, 1);
  assert.equal(calls.runRobotTests, 0);
  assert.equal(terminalLines.some((line) => line.includes('Skipping tests for r1: robot is offline')), true);
});

test('runManualTests runs tests after successful online precheck', async () => {
  const createDetailFeature = await loadApi();
  const env = makeEnv('existing-robots');
  const terminalLines = [];
  env.terminal = {
    appendChild: (node) => {
      terminalLines.push(String(node?.textContent || ''));
    },
    scrollTop: 0,
    scrollHeight: 0,
    classList: makeClassList(),
  };
  env.state = {
    pageSessionId: 'page-2',
    robots: [
      {
        id: 'r1',
        name: 'Robot 1',
        typeId: 'picker',
        tests: { online: { status: 'ok', value: 'reachable', details: 'cached green' } },
      },
    ],
    selectedRobotIds: new Set(),
    detailRobotId: '',
    isTestRunInProgress: false,
    isAutoFixInProgress: false,
  };
  const calls = {
    addRobotMessages: [],
    editRobotMessages: [],
    addRobotTypeMessages: [],
    populateAddRobotTypeOptions: 0,
    populateEditRobotSelectOptions: [],
    renderRecorderRobotOptions: 0,
    setActiveManageTab: [],
    syncFixModePanels: 0,
    onlineChecks: 0,
    runRobotTests: 0,
  };
  const runtime = makeRuntime(calls);
  runtime.getRobotIdsForRun = () => ['r1'];
  runtime.hasMixedRobotTypesForIds = () => false;
  runtime.getRobotActionAvailability = () => ({ allowed: true, title: 'Run tests' });
  runtime.getFleetParallelism = () => 1;
  runtime.getRobotById = (id) => env.state.robots.find((robot) => robot.id === id) || null;
  runtime.robotId = (value) => normalizeText(typeof value === 'string' ? value : value?.id, '');
  runtime.runOneRobotOnlineCheck = async () => {
    calls.onlineChecks += 1;
    return { status: 'ok', value: 'reachable', details: 'live probe ok' };
  };
  runtime.updateOnlineCheckEstimateFromResults = () => {};
  runtime.mapRobots = (updater) => {
    env.state.robots = env.state.robots.map((robot) => updater(robot));
  };
  runtime.renderDashboard = () => {};
  runtime.setRobotSearching = () => {};
  runtime.setRobotTesting = () => {};
  runtime.runRobotTestsForRobot = async () => {
    calls.runRobotTests += 1;
    return {
      results: [
        { id: 'general', status: 'ok', value: 'good', details: 'done' },
      ],
    };
  };
  runtime.getConfiguredDefaultTestIds = () => ['general'];
  runtime.estimateTestCountdownMsFromBody = () => 1000;
  runtime.updateRobotTestState = () => {};
  runtime.setRunningButtonState = () => {};

  const api = createDetailFeature(runtime, env);
  await api.runManualTests({ fallbackToActive: true, body: { testIds: ['general'] } });

  assert.equal(calls.onlineChecks, 1);
  assert.equal(calls.runRobotTests, 1);
  assert.equal(terminalLines.some((line) => line.includes('Running online precheck for Robot 1')), true);
});
