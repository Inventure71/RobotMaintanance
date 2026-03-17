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
  const attributes = new Map();
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
    removeEventListener: (type, handler) => {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((candidate) => candidate !== handler));
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
      attributes.set(name, nextValue);
      node[name] = nextValue;
    },
    getAttribute: (name) => {
      if (attributes.has(name)) return attributes.get(name);
      return node[name];
    },
    focus: () => {
      node.focused = true;
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
      "import { renderRecorderLlmPromptTemplate } from '../../templates/recorderLlmPromptTemplate.js';",
      `const renderRecorderLlmPromptTemplate = ({ selectedRobot, currentDefinition, currentRecorderDraft, recorderTerminalTranscript, userSystemDetails, userTestRequest }) => ({
        promptVersion: 'recorder-llm-roundtrip.v1',
        instructions: {
          objective: 'Return only ready test-definition JSON for the existing /api/definitions/tests save contract.',
          responseFormat: 'Return a single JSON object with no prose before or after it.',
          mode: 'orchestrate',
          preparation: [
            'SSH into the robot and run the commands you normally use to inspect the system before asking the external LLM for help.',
            'The recorder terminal transcript below must include enough command context for the model to understand what it is checking. This mainly helps the model define the read blocks correctly.',
            'The model should not invent write commands for your system. If the transcript does not show the relevant commands or outputs, the result will be wrong.',
            'It is fine for the terminal transcript to contain more command history than strictly necessary, but it must not contain less than the context needed to understand the workflow.',
            'Use the example response below as the formatting reference. It includes multiple write steps, multiple outputs/checks, and multiple read rules.',
          ],
          requiredTopLevelFields: ['id', 'label', 'mode', 'execute', 'checks'],
          allowedReadKinds: ['contains_string', 'contains_any_string', 'contains_lines_unordered', 'all_of'],
          constraints: [
            'mode must be orchestrate',
            'execute must be a non-empty array',
            'checks must be a non-empty array',
            'each check must define a top-level boolean runAtConnection',
            'all checks must share the same runAtConnection value',
          ],
          fullResponseExample: {
            id: 'topics_snapshot_startup',
            label: 'Topics Snapshot Startup',
            enabled: true,
            mode: 'orchestrate',
            execute: [
              { id: 'step_1', command: 'source /opt/ros/humble/setup.bash && source ~/robot_ws/install/setup.bash', saveAs: 'env_ready' },
              { id: 'step_2', command: 'ros2 topic list', saveAs: 'topics_raw' },
              { id: 'step_3', command: 'ros2 topic echo /battery_state --once', saveAs: 'battery_raw' },
            ],
            checks: [
              {
                id: 'topics_snapshot_startup__topics',
                label: 'Required topics',
                icon: 'T',
                runAtConnection: true,
                manualOnly: true,
                enabled: true,
                defaultStatus: 'warning',
                defaultValue: 'unknown',
                defaultDetails: 'Not checked yet',
                read: {
                  kind: 'all_of',
                  rules: [
                    { kind: 'contains_lines_unordered', inputRef: 'topics_raw', lines: ['/battery_state', '/cmd_vel'], requireAll: true },
                    { kind: 'contains_any_string', inputRef: 'topics_raw', needles: ['/scan', '/lidar/scan'], caseSensitive: false },
                  ],
                },
                pass: { status: 'ok', value: 'all_present', details: 'Required startup topics are present.' },
                fail: { status: 'error', value: 'missing', details: 'One or more required startup topics are missing.' },
              },
              {
                id: 'topics_snapshot_startup__battery',
                label: 'Battery topic payload',
                icon: 'B',
                runAtConnection: true,
                manualOnly: true,
                enabled: true,
                defaultStatus: 'warning',
                defaultValue: 'unknown',
                defaultDetails: 'Not checked yet',
                read: { kind: 'contains_string', inputRef: 'battery_raw', needle: 'voltage', caseSensitive: false },
                pass: { status: 'ok', value: 'present', details: 'Battery payload includes voltage data.' },
                fail: { status: 'error', value: 'missing', details: 'Battery payload did not include voltage data.' },
              },
            ],
          },
        },
        selectedRobot,
        currentDefinition,
        currentRecorderDraft,
        recorderTerminalTranscript,
        userSystemDetails,
        userTestRequest,
      });`,
    )
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
      body: { classList: makeClassList() },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    window: {
      prompt: () => '',
      confirm: () => true,
      navigator: {
        clipboard: {
          writeText: async (value) => {
            context.__copiedText = value;
          },
        },
      },
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
    isRecorderLlmPromptModalOpen: false,
    isRecorderLlmImportModalOpen: false,
    recorderTerminalComponent: {
      exportTranscript() {
        return 'robot@rosbot$ rostopic list\n/battery\n/camera';
      },
    },
    workflowRecorder: {
      started: true,
      loaded: null,
      publishStatus: null,
      lastStatus: null,
      lastWriteEditId: '',
      lastWriteBlock: null,
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
      exportDraftContext(definitionId) {
        return {
          started: true,
          publishReady: true,
          definitionId,
          outputCount: 1,
          writeCount: 1,
          readCount: 1,
          outputs: [{ key: 'battery', label: 'Battery', icon: 'B', runAtConnection: true, readBlockCount: 1 }],
          execute: [{ order: 1, id: 'write_1', command: 'echo battery', saveAs: 'out_1' }],
          checks: [{ outputKey: 'battery', checkId: `${definitionId}__battery`, label: 'Battery', runAtConnection: true, read: [] }],
          blockingIssues: [],
        };
      },
      setPublishStatus(message, tone) {
        this.publishStatus = { message, tone };
      },
      setStatus(message, tone) {
        this.lastStatus = { message, tone };
      },
      addWriteBlock(payload) {
        this.lastWriteBlock = payload;
        return { id: 'write_2', ...payload };
      },
      setWriteEdit(blockId) {
        this.lastWriteEditId = blockId;
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
    recorderAskLlmButton: makeNode(),
    recorderAskLlmHelpButton: makeNode(),
    recorderLlmHelpPanel: makeNode(),
    recorderPasteLlmResultButton: makeNode(),
    recorderLlmPromptModal: makeNode(),
    recorderLlmPromptCancelButton: makeNode(),
    recorderLlmCopyPromptButton: makeNode(),
    recorderLlmSystemDetailsInput: makeNode(),
    recorderLlmTestRequestInput: makeNode(),
    recorderLlmPromptPreview: makeNode(),
    recorderLlmPromptStatus: makeNode(),
    recorderLlmImportModal: makeNode(),
    recorderLlmImportCancelButton: makeNode(),
    recorderLlmImportLoadButton: makeNode(),
    recorderLlmImportInput: makeNode(),
    recorderLlmImportStatus: makeNode(),
    recorderPublishTestButton: {},
    recorderAddOutputBtn: {},
    recorderAddWriteBtn: makeNode(),
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

test('setFlowEditorMode initializes fix robot type targets from definitions summary', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  assert.equal(env.manageFixRobotTypeTargets.children.length, 0);

  api.setFlowEditorMode('fix', { announce: false });

  assert.equal(env.state.manageFlowEditorMode, 'fix');
  assert.equal(env.manageFixRobotTypeTargets.children.length, 1);
  assert.equal(env.manageFixRobotTypeTargets.children[0].children[1].textContent, 'Rosbot');
  assert.equal(env.manageRecorderFixEditorPanel.classList.contains('active'), true);
  assert.equal(env.manageRecorderTestEditorPanel.classList.contains('hidden'), true);
});

test('toggleRecorderLlmHelp updates aria-expanded state', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  api.setRecorderLlmHelpExpanded(false);
  assert.equal(env.recorderAskLlmHelpButton.getAttribute('aria-expanded'), 'false');
  assert.equal(env.recorderLlmHelpPanel.classList.contains('hidden'), true);

  api.toggleRecorderLlmHelp();
  assert.equal(env.recorderAskLlmHelpButton.getAttribute('aria-expanded'), 'true');
  assert.equal(env.recorderLlmHelpPanel.classList.contains('hidden'), false);

  api.toggleRecorderLlmHelp();
  assert.equal(env.recorderAskLlmHelpButton.getAttribute('aria-expanded'), 'false');
  assert.equal(env.recorderLlmHelpPanel.classList.contains('hidden'), true);
});

test('getRecorderLlmPromptBuildResult blocks prompt copy when transcript or required fields are missing', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  env.state.recorderTerminalComponent.exportTranscript = () => '';
  let result = api.getRecorderLlmPromptBuildResult();
  assert.equal(result.ok, false);
  assert.match(result.error, /terminal transcript/i);

  env.state.recorderTerminalComponent.exportTranscript = () => 'robot@rosbot$ rostopic list';
  result = api.getRecorderLlmPromptBuildResult();
  assert.equal(result.ok, false);
  assert.match(result.error, /system \/ stack details/i);

  env.recorderLlmSystemDetailsInput.value = 'ROS 2 Humble on Ubuntu';
  result = api.getRecorderLlmPromptBuildResult();
  assert.equal(result.ok, false);
  assert.match(result.error, /what do you want to test/i);
});

test('getRecorderLlmPromptBuildResult emits stable prompt bundle content in recorder order', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.recorderRobotSelect.value = 'rosbot';
  env.recorderDefinitionIdInput.value = 'battery_health';
  env.recorderDefinitionLabelInput.value = 'Battery health';
  env.recorderLlmSystemDetailsInput.value = 'ROS 2 Humble, Ubuntu 22.04, rostopic available';
  env.recorderLlmTestRequestInput.value = 'Verify battery and camera topics are present after startup.';
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  const result = api.getRecorderLlmPromptBuildResult();

  assert.equal(result.ok, true);
  assert.ok(result.promptText.indexOf('"instructions"') < result.promptText.indexOf('"selectedRobot"'));
  assert.ok(result.promptText.indexOf('"selectedRobot"') < result.promptText.indexOf('"currentDefinition"'));
  assert.ok(result.promptText.indexOf('"currentDefinition"') < result.promptText.indexOf('"currentRecorderDraft"'));
  assert.ok(result.promptText.indexOf('"currentRecorderDraft"') < result.promptText.indexOf('"recorderTerminalTranscript"'));
  assert.ok(result.promptText.indexOf('"recorderTerminalTranscript"') < result.promptText.indexOf('"userSystemDetails"'));
  assert.ok(result.promptText.indexOf('"userSystemDetails"') < result.promptText.indexOf('"userTestRequest"'));

  const payload = JSON.parse(result.promptText);
  assert.equal(payload.instructions.mode, 'orchestrate');
  assert.deepEqual(payload.instructions.allowedReadKinds, [
    'contains_string',
    'contains_any_string',
    'contains_lines_unordered',
    'all_of',
  ]);
  assert.equal(payload.instructions.preparation.length, 5);
  assert.match(payload.instructions.preparation[0], /SSH into the robot/i);
  assert.match(payload.instructions.preparation[2], /should not invent write commands/i);
  assert.equal(payload.instructions.fullResponseExample.mode, 'orchestrate');
  assert.equal(payload.instructions.fullResponseExample.execute.length, 3);
  assert.equal(payload.instructions.fullResponseExample.checks.length, 2);
  assert.equal(payload.instructions.fullResponseExample.checks[0].read.kind, 'all_of');
  assert.equal(payload.instructions.fullResponseExample.checks[0].read.rules.length, 2);
  assert.equal(payload.selectedRobot.id, 'rosbot');
  assert.equal(payload.currentDefinition.id, 'battery_health');
  assert.equal(payload.recorderTerminalTranscript, 'robot@rosbot$ rostopic list\n/battery\n/camera');
  assert.equal(payload.userSystemDetails, 'ROS 2 Humble, Ubuntu 22.04, rostopic available');
  assert.equal(payload.userTestRequest, 'Verify battery and camera topics are present after startup.');
});

test('loadRecorderLlmImportResult rejects invalid JSON without mutating the current draft', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  const currentDraft = { id: 'existing_draft' };
  env.state.workflowRecorder.loaded = currentDraft;
  env.recorderLlmImportInput.value = 'not valid json';
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  const loaded = api.loadRecorderLlmImportResult();

  assert.equal(loaded, false);
  assert.equal(env.state.workflowRecorder.loaded, currentDraft);
  assert.match(env.recorderLlmImportStatus.textContent, /invalid json/i);
});

test('validateRecorderLlmImportInput reports unsupported read kinds explicitly', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.recorderLlmImportInput.value = JSON.stringify({
    id: 'battery_health',
    label: 'Battery health',
    mode: 'orchestrate',
    execute: [{ id: 'step_1', command: 'echo battery', saveAs: 'out_1' }],
    checks: [
      {
        id: 'battery_health__battery',
        label: 'Battery',
        runAtConnection: true,
        read: { kind: 'regex', inputRef: 'out_1', pattern: 'battery' },
        pass: { details: 'ok' },
        fail: { details: 'fail' },
      },
    ],
  });
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  const definition = api.validateRecorderLlmImportInput();

  assert.equal(definition, null);
  assert.match(env.recorderLlmImportStatus.textContent, /unsupported read kind/i);
});

test('validateRecorderLlmImportInput reports mixed runAtConnection values explicitly', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.recorderLlmImportInput.value = JSON.stringify({
    id: 'battery_health',
    label: 'Battery health',
    mode: 'orchestrate',
    execute: [{ id: 'step_1', command: 'echo battery', saveAs: 'out_1' }],
    checks: [
      {
        id: 'battery_health__battery',
        label: 'Battery',
        runAtConnection: true,
        read: { kind: 'contains_string', inputRef: 'out_1', needle: 'battery' },
        pass: { details: 'ok' },
        fail: { details: 'fail' },
      },
      {
        id: 'battery_health__camera',
        label: 'Camera',
        runAtConnection: false,
        read: { kind: 'contains_string', inputRef: 'out_1', needle: 'camera' },
        pass: { details: 'ok' },
        fail: { details: 'fail' },
      },
    ],
  });
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  const definition = api.validateRecorderLlmImportInput();

  assert.equal(definition, null);
  assert.match(env.recorderLlmImportStatus.textContent, /share one runAtConnection value/i);
});

test('loadRecorderLlmImportResult hydrates valid JSON into the recorder draft', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.recorderLlmImportInput.value = [
    '```json',
    JSON.stringify({
      id: 'battery_health',
      label: 'Battery health',
      mode: 'orchestrate',
      execute: [{ id: 'step_1', command: 'echo battery', saveAs: 'out_1' }],
      checks: [
        {
          id: 'battery_health__battery',
          label: 'Battery',
          icon: 'B',
          runAtConnection: false,
          read: { kind: 'contains_string', inputRef: 'out_1', needle: 'battery' },
          pass: { details: 'Battery found' },
          fail: { details: 'Battery missing' },
        },
      ],
    }, null, 2),
    '```',
  ].join('\n');
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  api.openRecorderLlmImportModal();
  const validated = api.validateRecorderLlmImportInput();
  const loaded = api.loadRecorderLlmImportResult();

  assert.equal(validated.id, 'battery_health');
  assert.equal(loaded, true);
  assert.equal(env.state.workflowRecorder.loaded.id, 'battery_health');
  assert.equal(env.recorderDefinitionIdInput.value, 'battery_health');
  assert.equal(env.recorderDefinitionLabelInput.value, 'Battery health');
  assert.equal(env.recorderRunAtConnectionInput.checked, false);
  assert.equal(env.state.activeManageTab, 'recorder');
  assert.equal(env.state.manageFlowEditorMode, 'test');
  assert.equal(env.state.isRecorderLlmImportModalOpen, false);
  assert.deepEqual(env.state.workflowRecorder.publishStatus, {
    message: "Imported 'battery_health' into the recorder draft. Review before publishing.",
    tone: 'ok',
  });
});

test('addRecorderWriteVisual adds a manual write block and seeds recorder draft metadata', async () => {
  const registerManageRecorderRuntime = await loadApi();
  const env = makeEnv();
  env.recorderCommandInput.value = 'echo battery';
  env.recorderRobotSelect.value = 'rosbot';
  const runtime = makeRuntime(env.state);
  const api = registerManageRecorderRuntime(runtime, env);

  api.addRecorderWriteVisual();

  assert.equal(env.state.workflowRecorder.lastWriteBlock.command, 'echo battery');
  assert.equal(
    env.state.workflowRecorder.lastWriteBlock.outputPayload.stdout,
    '[Manual write block. Edit command or capture live output later.]',
  );
  assert.equal(env.state.workflowRecorder.lastWriteEditId, 'write_2');
  assert.equal(env.recorderDefinitionIdInput.value, 'rosbot_write_2');
  assert.equal(env.recorderDefinitionLabelInput.value, 'Flow workflow (rosbot)');
  assert.equal(env.recorderCommandInput.value, '');
  assert.deepEqual(env.state.workflowRecorder.lastStatus, {
    message: 'Write block added. Expand to edit.',
    tone: 'ok',
  });
});
