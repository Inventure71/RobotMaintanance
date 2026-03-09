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
  '../../assets/js/modules/dashboard/controllers/runtime/dashboardRuntimeManageRecorder.js',
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

function makeNode(value = '') {
  const listeners = new Map();
  const node = {
    value,
    checked: false,
    textContent: '',
    innerHTML: '',
    className: '',
    classList: makeClassList(),
    dataset: {},
    children: [],
    style: {},
    disabled: false,
    replaceChildren: (...children) => {
      node.children = [...children];
    },
    appendChild: (child) => {
      node.children.push(child);
      return child;
    },
    append: (...children) => {
      node.children.push(...children);
    },
    addEventListener: (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent: (event) => {
      const handlers = listeners.get(event?.type) || [];
      handlers.forEach((handler) => handler(event));
    },
    click: () => {
      const handlers = listeners.get('click') || [];
      handlers.forEach((handler) => handler({ type: 'click' }));
    },
    setAttribute: (name, nextValue) => {
      node[name] = nextValue;
    },
    querySelectorAll: (selector) => {
      const matches = [];
      const visit = (candidate) => {
        if (!candidate || !Array.isArray(candidate.children)) return;
        candidate.children.forEach((child) => {
          if (selector === 'input[type="checkbox"]' && child.type === 'checkbox') {
            matches.push(child);
          }
          if (selector === 'input[type="checkbox"]:checked' && child.type === 'checkbox' && child.checked) {
            matches.push(child);
          }
          visit(child);
        });
      };
      visit(node);
      return matches;
    },
  };
  return node;
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  const transformed = `${source
    .replace(
      "import { renderManageEntityList } from '../../features/manage/manageEntityList.js';",
      'const renderManageEntityList = () => {};',
    )
    .replace('export function registerManageRecorderRuntime', 'function registerManageRecorderRuntime')}\nmodule.exports = { registerManageRecorderRuntime };\n`;
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    document: {
      createElement: () => makeNode(),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    window: {
      prompt: () => '',
      confirm: () => true,
    },
    confirm: () => true,
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.registerManageRecorderRuntime;
}

function makeRuntime(state) {
  return new Proxy({
    normalizeDefinitionsSummary: (value) => value,
    normalizeIdList: (value) => (Array.isArray(value) ? value.filter(Boolean) : []),
    resolveManageTab: (tabId) => normalizeText(tabId, 'robots'),
    persistManageTab: () => {},
    setLocationHash: (hash) => {
      state.lastHash = hash;
    },
    buildManageHash: (tabId) => `#/manage/${tabId}`,
    applyActionButton: () => {},
    refreshRobotsFromBackendSnapshot: async () => true,
    robotId: (robot) => normalizeText(robot?.id, ''),
  }, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

function makeEnv() {
  const state = {
    definitionsSummary: {
      tests: [],
      fixes: [],
      robotTypes: [
        { id: 'rosbot', name: 'Rosbot', testRefs: ['battery_health__battery'] },
      ],
    },
    robots: [],
    activeManageTab: 'definitions',
    manageDefinitionsFilter: 'all',
    manageFlowEditorMode: 'test',
    workflowRecorder: {
      loaded: null,
      publishStatus: null,
      loadTestDefinition(definition) {
        this.loaded = definition;
        return { outputCount: 1, blockCount: 2 };
      },
      createNewTest() {
        this.created = true;
      },
      reset() {
        this.resetCalled = true;
      },
      getState() {
        return {
          started: true,
          writeCount: 1,
          readCount: 1,
          outputCount: 1,
          publishReady: true,
          blockingIssues: [],
          editingOutputKey: '',
          editingReadBlockId: '',
        };
      },
      setPublishStatus(message, tone) {
        this.publishStatus = { message, tone };
      },
      getCheckIdsForDefinition(definitionId) {
        return [`${definitionId}__battery`];
      },
    },
  };

  const manageTabButtons = [
    { dataset: { tab: 'definitions' }, classList: makeClassList(['active']) },
    { dataset: { tab: 'recorder' }, classList: makeClassList() },
  ];
  const manageTabPanels = [
    { dataset: { tabPanel: 'definitions' }, classList: makeClassList(['active']) },
    { dataset: { tabPanel: 'recorder' }, classList: makeClassList() },
  ];
  const manageDefinitionFilterButtons = [
    { dataset: { definitionFilter: 'all' }, classList: makeClassList(['active']), addEventListener: () => {} },
    { dataset: { definitionFilter: 'tests' }, classList: makeClassList(), addEventListener: () => {} },
    { dataset: { definitionFilter: 'fixes' }, classList: makeClassList(), addEventListener: () => {} },
  ];
  const manageFlowModeButtons = [
    { dataset: { flowMode: 'test' }, classList: makeClassList(['active']), addEventListener: () => {} },
    { dataset: { flowMode: 'fix' }, classList: makeClassList(), addEventListener: () => {} },
  ];

  const env = {
    normalizeText,
    buildApiUrl: (route) => `http://localhost${route}`,
    state,
    applyActionButton: () => {},
    manageDefinitionFilterButtons,
    manageDefinitionsList: makeNode(),
    manageFlowModeButtons,
    manageFlowModeHint: makeNode(),
    manageRecorderTestEditorPanel: { classList: makeClassList(['active']) },
    manageRecorderFixEditorPanel: { classList: makeClassList(['hidden']) },
    manageTabButtons,
    manageTabPanels,
    manageFixIdInput: makeNode(),
    manageFixLabelInput: makeNode(),
    manageFixDescriptionInput: makeNode(),
    manageFixExecuteJsonInput: makeNode(),
    manageFixPostTestsInput: makeNode(),
    manageFixRunAtConnectionInput: { checked: false },
    manageFixRobotTypeTargets: makeNode(),
    manageDeleteFixButton: { style: {}, addEventListener: () => {} },
    recorderDefinitionIdInput: makeNode(),
    recorderDefinitionLabelInput: makeNode(),
    recorderRunAtConnectionInput: { checked: true },
    recorderLastEditingOutputKey: '',
    recorderLastEditingReadBlockId: '',
    recorderRobotTypeTargets: makeNode(),
    recorderPublishTestButton: {},
    recorderAddOutputBtn: {},
    recorderAddReadBtn: {},
    recorderRunCaptureButton: {},
    recorderStateBadge: makeNode(),
    recorderStepCountBadge: makeNode(),
    recorderCheckCountBadge: makeNode(),
    recorderOutputCountBadge: makeNode(),
    recorderCreateNewTestButton: {},
    recorderCommandInput: makeNode(),
    recorderRobotSelect: makeNode(),
    recorderOutputKeyInput: makeNode(),
    recorderOutputLabelInput: makeNode(),
    recorderOutputIconInput: makeNode(),
    recorderOutputPassDetailsInput: makeNode(),
    recorderOutputFailDetailsInput: makeNode(),
    recorderReadOutputKeySelect: makeNode(),
    recorderReadInputRefSelect: makeNode(),
    recorderReadKindSelect: makeNode('contains_string'),
    recorderReadNeedleInput: makeNode(),
    recorderReadNeedlesInput: makeNode(),
    recorderReadLinesInput: makeNode(),
    recorderReadRequireAllInput: { checked: true },
    manageTabStatus: makeNode(),
  };

  return new Proxy(env, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return Array.isArray(prop) ? [] : makeNode();
    },
  });
}

test('loadExistingTestIntoRecorder hydrates the full flow builder and switches to recorder tab', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  const definition = {
    id: 'battery_health',
    label: 'Battery health',
    checks: [
      {
        id: 'battery_health__battery',
        label: 'Battery',
        runAtConnection: false,
        read: {
          kind: 'contains_string',
          inputRef: 'out_1',
          needle: '/battery',
        },
      },
    ],
  };

  api.loadExistingTestIntoRecorder(definition);

  assert.equal(env.state.workflowRecorder.loaded, definition);
  assert.equal(env.recorderDefinitionIdInput.value, 'battery_health');
  assert.equal(env.recorderDefinitionLabelInput.value, 'Battery health');
  assert.equal(env.recorderRunAtConnectionInput.checked, false);
  assert.equal(env.state.activeManageTab, 'recorder');
  assert.equal(env.manageTabPanels[0].classList.contains('active'), false);
  assert.equal(env.manageTabPanels[1].classList.contains('active'), true);
  assert.equal(env.state.lastHash, '#/manage/recorder');
  assert.deepEqual(env.state.workflowRecorder.publishStatus, {
    message: "Loaded 'battery_health' into the full flow builder. Outputs and read blocks are now editable.",
    tone: 'ok',
  });
  assert.equal(env.state.manageFlowEditorMode, 'test');
  assert.equal(env.manageRecorderTestEditorPanel.classList.contains('active'), true);
  assert.equal(env.manageRecorderFixEditorPanel.classList.contains('hidden'), true);
});

test('renderManageDefinitionsList filters entries and edit/view opens fix definitions in the flow editor', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.state.definitionsSummary.tests = [
    { id: 'battery_health', label: 'Battery health', checks: [{ id: 'battery_health__battery' }] },
  ];
  env.state.definitionsSummary.fixes = [
    {
      id: 'flash_fix',
      label: 'Flash fix',
      description: 'Reflash firmware',
      execute: [{ id: 'fix_step_1', command: 'flash' }],
      postTestIds: ['battery_health'],
      runAtConnection: true,
    },
  ];
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  api.renderManageDefinitionsList();
  assert.equal(env.manageDefinitionsList.children.length, 2);

  api.setManageDefinitionsFilter('fixes');
  assert.equal(env.manageDefinitionsList.children.length, 1);

  const fixRow = env.manageDefinitionsList.children[0];
  const actionButtons = fixRow.children[1].children;
  assert.equal(actionButtons.length, 3);
  assert.equal(actionButtons[0].textContent, 'Edit/View');
  actionButtons[0].click();

  assert.equal(env.manageFixIdInput.value, 'flash_fix');
  assert.equal(env.manageFixLabelInput.value, 'Flash fix');
  assert.equal(env.manageFixDescriptionInput.value, 'Reflash firmware');
  assert.equal(env.manageFixRunAtConnectionInput.checked, true);
  assert.equal(env.state.activeManageTab, 'recorder');
  assert.equal(env.state.manageFlowEditorMode, 'fix');
  assert.equal(env.manageRecorderFixEditorPanel.classList.contains('active'), true);
  assert.equal(env.manageRecorderTestEditorPanel.classList.contains('hidden'), true);
});

test('duplicate test action opens a copied recorder draft', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.state.definitionsSummary.tests = [
    {
      id: 'battery_health',
      label: 'Battery health',
      checks: [
        {
          id: 'battery_health__battery',
          label: 'Battery',
          runAtConnection: true,
          read: { kind: 'contains_string', inputRef: 'out_1', needle: '/battery' },
        },
      ],
    },
  ];
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  api.setManageDefinitionsFilter('tests');
  const testRow = env.manageDefinitionsList.children[0];
  const duplicateButton = testRow.children[1].children[1];
  duplicateButton.click();

  assert.equal(env.recorderDefinitionIdInput.value, 'battery_health_copy');
  assert.equal(env.recorderDefinitionLabelInput.value, 'Battery health Copy');
  assert.equal(env.state.activeManageTab, 'recorder');
  assert.equal(env.state.manageFlowEditorMode, 'test');
  assert.deepEqual(env.state.workflowRecorder.publishStatus, {
    message: "Duplicated 'battery_health' into a new test draft. Review the ID and mappings before publishing.",
    tone: 'ok',
  });
});
