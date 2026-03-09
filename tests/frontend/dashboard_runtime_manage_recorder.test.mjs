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
  return {
    value,
    checked: false,
    textContent: '',
    innerHTML: '',
    className: '',
    classList: makeClassList(),
    dataset: {},
    replaceChildren: () => {},
    appendChild: () => {},
    append: () => {},
    querySelectorAll: () => [],
  };
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
      robotTypes: [
        { id: 'rosbot', name: 'Rosbot', testRefs: ['battery_health__battery'] },
      ],
    },
    robots: [],
    activeManageTab: 'tests',
    workflowRecorder: {
      loaded: null,
      publishStatus: null,
      loadTestDefinition(definition) {
        this.loaded = definition;
        return { outputCount: 1, blockCount: 2 };
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
    { dataset: { tab: 'tests' }, classList: makeClassList(['active']) },
    { dataset: { tab: 'recorder' }, classList: makeClassList() },
  ];
  const manageTabPanels = [
    { dataset: { tabPanel: 'tests' }, classList: makeClassList(['active']) },
    { dataset: { tabPanel: 'recorder' }, classList: makeClassList() },
  ];

  const env = {
    normalizeText,
    buildApiUrl: (route) => `http://localhost${route}`,
    state,
    applyActionButton: () => {},
    manageTabButtons,
    manageTabPanels,
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
});
