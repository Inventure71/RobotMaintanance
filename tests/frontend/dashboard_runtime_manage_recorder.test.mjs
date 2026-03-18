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
  '../../assets/js/modules/dashboard/features/recorder/controller/createRecorderFeature.js',
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
      node.children.forEach((child) => {
        if (child && typeof child === 'object') {
          child.parentNode = null;
        }
      });
      node.children = [...children];
      node.children.forEach((child) => {
        if (child && typeof child === 'object') {
          child.parentNode = node;
        }
      });
    },
    appendChild: (child) => {
      if (child && child.parentNode && Array.isArray(child.parentNode.children)) {
        child.parentNode.children = child.parentNode.children.filter((candidate) => candidate !== child);
      }
      node.children.push(child);
      if (child && typeof child === 'object') {
        child.parentNode = node;
      }
      return child;
    },
    append: (...children) => {
      children.forEach((child) => {
        node.appendChild(child);
      });
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
      "import { renderRecorderLlmPromptTemplate } from '../../../templates/recorderLlmPromptTemplate.js';",
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
      "import { buildRecorderLlmPromptPayload as buildRecorderLlmPromptPayloadValue, parseRecorderLlmImportPayload as parseRecorderLlmImportPayloadValue, stripRecorderLlmJsonWrapperNoise as stripRecorderLlmJsonWrapperNoiseValue, validateRecorderImportedDefinition as validateRecorderImportedDefinitionValue } from '../domain/recorderLlm.js';",
      `const buildRecorderLlmPromptPayloadValue = ({ normalizeText, renderRecorderLlmPromptTemplate, definitionIdValue, exportDraftContext, buildRobotContext, buildDefinitionContext, systemDetails, userRequest, transcript }) => {
        const definitionId = normalizeText(definitionIdValue, '');
        const draftContext = exportDraftContext?.(definitionId) || {
          started: false, publishReady: false, definitionId, outputCount: 0, writeCount: 0, readCount: 0, outputs: [], execute: [], checks: [], blockingIssues: [],
        };
        return renderRecorderLlmPromptTemplate({
          selectedRobot: buildRobotContext(),
          currentDefinition: buildDefinitionContext(),
          currentRecorderDraft: draftContext,
          recorderTerminalTranscript: transcript,
          userSystemDetails: systemDetails,
          userTestRequest: userRequest,
        });
      };
      const stripRecorderLlmJsonWrapperNoiseValue = (rawValue) => {
        let text = String(rawValue ?? '').trim();
        const fenced = text.match(/^\\\`\\\`\\\`(?:json)?\\s*([\\s\\S]*?)\\s*\\\`\\\`\\\`$/i);
        if (fenced) text = fenced[1].trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          const wrapped = text.slice(firstBrace, lastBrace + 1).trim();
          if (wrapped.startsWith('{') && wrapped.endsWith('}')) text = wrapped;
        }
        return text;
      };
      const parseRecorderLlmImportPayloadValue = (rawValue) => {
        const stripped = stripRecorderLlmJsonWrapperNoiseValue(rawValue);
        if (!stripped) throw new Error('Paste the external LLM JSON result first.');
        let parsed;
        try { parsed = JSON.parse(stripped); } catch (error) { throw new Error(\`LLM result is invalid JSON: \${error instanceof Error ? error.message : String(error)}\`); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('LLM result must be a JSON object.');
        return parsed;
      };
      const validateRecorderImportedDefinitionValue = ({ normalizeText, inferUniformRunAtConnection, allowedReadKinds, baseReadKinds, rawDefinition }) => {
        const validateRecorderReadSpec = ({ readSpec, contextLabel }) => {
          if (!readSpec || typeof readSpec !== 'object' || Array.isArray(readSpec)) throw new Error(\`\${contextLabel} must define a read object.\`);
          const kind = normalizeText(readSpec.kind, '').toLowerCase();
          if (!allowedReadKinds.has(kind)) throw new Error(\`\${contextLabel} uses unsupported read kind '\${kind || 'unknown'}'.\`);
          if (kind === 'all_of') {
            const rules = Array.isArray(readSpec.rules) ? readSpec.rules : [];
            if (!rules.length) throw new Error(\`\${contextLabel} kind 'all_of' must define non-empty rules[].\`);
            return { ...readSpec, kind, rules: rules.map((rule, index) => {
              const validatedRule = validateRecorderReadSpec({ readSpec: rule, contextLabel: \`\${contextLabel} rule \${index + 1}\` });
              if (!baseReadKinds.has(validatedRule.kind)) throw new Error(\`\${contextLabel} rule \${index + 1} must use a base read kind.\`);
              return validatedRule;
            }) };
          }
          if (!normalizeText(readSpec.inputRef, '')) throw new Error(\`\${contextLabel} read.\${kind} must define inputRef.\`);
          if (kind === 'contains_string' && !normalizeText(readSpec.needle, '')) throw new Error(\`\${contextLabel} read.contains_string must define needle.\`);
          if (kind === 'contains_any_string') {
            const needles = Array.isArray(readSpec.needles) ? readSpec.needles.map((item) => normalizeText(item, '')).filter(Boolean) : [];
            if (!needles.length) throw new Error(\`\${contextLabel} read.contains_any_string must define non-empty needles[].\`);
          }
          if (kind === 'contains_lines_unordered') {
            const lines = Array.isArray(readSpec.lines) ? readSpec.lines.map((item) => normalizeText(item, '')).filter(Boolean) : [];
            if (!lines.length) throw new Error(\`\${contextLabel} read.contains_lines_unordered must define non-empty lines[].\`);
          }
          return { ...readSpec, kind };
        };
        const definition = rawDefinition && typeof rawDefinition === 'object' ? rawDefinition : {};
        const definitionId = normalizeText(definition.id, '');
        if (!definitionId) throw new Error('Imported definition must define a top-level id.');
        const label = normalizeText(definition.label, '');
        if (!label) throw new Error('Imported definition must define a top-level label.');
        const mode = normalizeText(definition.mode, '').toLowerCase();
        if (mode !== 'orchestrate') throw new Error(\`Imported definition mode must be 'orchestrate', received '\${mode || 'unknown'}'.\`);
        const execute = Array.isArray(definition.execute) ? definition.execute : [];
        if (!execute.length) throw new Error('Imported definition must define non-empty execute[].');
        const normalizedExecute = execute.map((step, index) => {
          if (!step || typeof step !== 'object' || Array.isArray(step)) throw new Error(\`execute[\${index}] must be an object.\`);
          const command = normalizeText(step.command, '');
          if (!command) throw new Error(\`execute[\${index}] must define command.\`);
          return { ...step, command };
        });
        const checks = Array.isArray(definition.checks) ? definition.checks : [];
        if (!checks.length) throw new Error('Imported definition must define non-empty checks[].');
        const normalizedChecks = checks.map((check, index) => {
          if (!check || typeof check !== 'object' || Array.isArray(check)) throw new Error(\`checks[\${index}] must be an object.\`);
          const checkId = normalizeText(check.id, '');
          if (!checkId) throw new Error(\`checks[\${index}] must define id.\`);
          if (typeof check.runAtConnection !== 'boolean') throw new Error(\`checks[\${index}] must define a top-level boolean runAtConnection.\`);
          if (!check.pass || typeof check.pass !== 'object' || Array.isArray(check.pass)) throw new Error(\`checks[\${index}] must define a pass object.\`);
          if (!check.fail || typeof check.fail !== 'object' || Array.isArray(check.fail)) throw new Error(\`checks[\${index}] must define a fail object.\`);
          return { ...check, id: checkId, read: validateRecorderReadSpec({ readSpec: check.read, contextLabel: \`checks[\${index}]\` }) };
        });
        const uniformRunAtConnection = inferUniformRunAtConnection(normalizedChecks, true);
        if (uniformRunAtConnection === null) throw new Error('Imported definition checks must share one runAtConnection value.');
        return { ...definition, id: definitionId, label, mode: 'orchestrate', execute: normalizedExecute, checks: normalizedChecks };
      };`,
    )
    .replace(
      "import { renderManageEntityList } from '../../features/manage/manageEntityList.js';",
      'const renderManageEntityList = () => {};',
    )
    .replace('export function createRecorderFeature', 'function createRecorderFeature')}\nmodule.exports = { createRecorderFeature };\n`;
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
  return context.module.exports.createRecorderFeature;
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
      dispose() {
        this.disposed = true;
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
    Object.assign(makeNode(), { dataset: { tab: 'definitions' }, classList: makeClassList(['active']) }),
    Object.assign(makeNode(), { dataset: { tab: 'recorder', recorderEditorMode: 'test' }, classList: makeClassList() }),
    Object.assign(makeNode(), { dataset: { tab: 'recorder', recorderEditorMode: 'fix' }, classList: makeClassList() }),
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
    applyActionButton: (button, options = {}) => {
      if (!button) return;
      if (typeof options.label === 'string') {
        button.textContent = options.label;
      }
      if (options.disabled !== undefined) {
        button.disabled = Boolean(options.disabled);
      }
      button.dataset = button.dataset || {};
      if (typeof options.intent === 'string') {
        button.dataset.buttonIntent = options.intent;
      }
    },
    manageDefinitionFilterButtons,
    manageDefinitionsList: makeNode(),
    manageFlowModeButtons,
    manageFlowModeHint: makeNode(),
    manageRecorderTestEditorPanel: { classList: makeClassList(['active']) },
    manageRecorderFixEditorPanel: { classList: makeClassList(['hidden']) },
    recorderExperienceShell: { classList: makeClassList(), dataset: {} },
    recorderModeBadge: makeNode(),
    recorderResetExperienceButton: makeNode(),
    recorderChangeModeButton: makeNode(),
    recorderSelectSimpleModeButton: makeNode(),
    recorderSelectAdvancedModeButton: makeNode(),
    recorderModeSelector: { classList: makeClassList() },
    recorderSharedTopbar: Object.assign(makeNode(), { classList: makeClassList(['hidden']) }),
    recorderSharedTopbarMain: makeNode(),
    recorderTopbarNewDraftWrap: Object.assign(makeNode(), { classList: makeClassList() }),
    recorderTopbarRobotWrap: Object.assign(makeNode(), { classList: makeClassList() }),
    recorderTopbarDefinitionWrap: Object.assign(makeNode(), { classList: makeClassList() }),
    recorderTopbarPublishWrap: Object.assign(makeNode(), { classList: makeClassList() }),
    manageTabButtons,
    manageTabPanels,
    manageFixIdInput: makeNode(),
    manageFixLabelInput: makeNode(),
    manageFixDescriptionInput: makeNode(),
    manageFixExecuteJsonInput: makeNode(),
    manageFixRunAtConnectionInput: { checked: false },
    manageFixRobotTypeTargets: makeNode(),
    manageDeleteFixButton: { style: {}, addEventListener: () => {} },
    recorderDefinitionIdInput: makeNode(),
    recorderDefinitionLabelInput: makeNode(),
    recorderDefinitionDescriptionInput: makeNode(),
    recorderRunAtConnectionInput: { checked: true },
    recorderLastEditingOutputKey: '',
    recorderLastEditingReadBlockId: '',
    recorderRobotTypeTargets: makeNode(),
    recorderWriteBlocks: makeNode(),
    recorderReadBlocks: makeNode(),
    recorderAdvancedPreview: makeNode(),
    recorderSimplePreview: makeNode(),
    recorderAssignmentPanel: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderAdvancedWorkspace: { classList: makeClassList(['hidden']) },
    recorderWritePanel: { classList: makeClassList() },
    recorderOutputsPanel: { classList: makeClassList() },
    recorderReadsPanel: { classList: makeClassList() },
    recorderAdvancedPreviewPanel: { classList: makeClassList() },
    recorderTerminalPanel: { classList: makeClassList(['hidden']) },
    recorderSimpleTerminalActions: { classList: makeClassList(['hidden']) },
    recorderSimpleSelectRobotStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimpleSelectRobotField: makeNode(),
    recorderSimpleSelectRobotNextButton: makeNode(),
    recorderSimpleTerminalStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimplePromptStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimpleImportStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimplePreviewStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimplePublishStep: { classList: makeClassList(['hidden']), querySelector: () => null },
    recorderSimpleTranscriptAcknowledge: { checked: false, addEventListener: () => {} },
    recorderSimpleTerminalNextButton: makeNode(),
    recorderSimplePromptBackButton: makeNode(),
    recorderSimplePromptNextButton: makeNode(),
    recorderSimpleImportBackButton: makeNode(),
    recorderValidateImportButton: makeNode(),
    recorderSimpleImportNextButton: makeNode(),
    recorderSimplePreviewBackButton: makeNode(),
    recorderSimpleEditInAdvancedButton: makeNode(),
    recorderSimplePreviewNextButton: makeNode(),
    recorderSimplePublishBackButton: makeNode(),
    recorderAskLlmButton: makeNode(),
    recorderAskLlmHelpButton: makeNode(),
    recorderLlmHelpPanel: makeNode(),
    recorderPasteLlmResultButton: makeNode(),
    recorderLlmPromptModal: makeNode(),
    recorderLlmPromptCancelButton: makeNode(),
    recorderLlmSystemDetailsInput: makeNode(),
    recorderLlmTestRequestInput: makeNode(),
    recorderLlmPromptPreview: makeNode(),
    recorderLlmPromptStatus: makeNode(),
    recorderLlmImportModal: makeNode(),
    recorderLlmImportCancelButton: makeNode(),
    recorderLlmImportLoadButton: makeNode(),
    recorderLlmImportInput: makeNode(),
    recorderLlmImportStatus: makeNode(),
    recorderPublishTestButton: makeNode(),
    recorderAddOutputBtn: makeNode(),
    recorderAddWriteBtn: makeNode(),
    recorderAddReadBtn: makeNode(),
    recorderRunCaptureButton: makeNode(),
    recorderStateBadge: makeNode(),
    recorderStepCountBadge: makeNode(),
    recorderCheckCountBadge: makeNode(),
    recorderOutputCountBadge: makeNode(),
    recorderCreateNewTestButton: makeNode(),
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
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  const definition = {
    id: 'battery_health',
    label: 'Battery health',
    description: 'Verify the battery topic is present.',
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
  assert.equal(env.recorderDefinitionDescriptionInput.value, 'Verify the battery topic is present.');
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
  const createRecorderFeature = await loadApi();
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
      runAtConnection: true,
    },
  ];
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

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
  const createRecorderFeature = await loadApi();
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
  const api = createRecorderFeature(runtime, env);

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
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  assert.equal(env.manageFixRobotTypeTargets.children.length, 0);

  api.setFlowEditorMode('fix', { announce: false });

  assert.equal(env.state.manageFlowEditorMode, 'fix');
  assert.equal(env.manageFixRobotTypeTargets.children.length, 1);
  assert.equal(env.manageFixRobotTypeTargets.children[0].children[1].textContent, 'Rosbot');
  assert.equal(env.manageRecorderFixEditorPanel.classList.contains('active'), true);
  assert.equal(env.manageRecorderTestEditorPanel.classList.contains('hidden'), true);
});

test('toggleRecorderLlmHelp updates aria-expanded state', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

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
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

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
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.recorderRobotSelect.value = 'rosbot';
  env.recorderDefinitionIdInput.value = 'battery_health';
  env.recorderDefinitionLabelInput.value = 'Battery health';
  env.recorderLlmSystemDetailsInput.value = 'ROS 2 Humble, Ubuntu 22.04, rostopic available';
  env.recorderLlmTestRequestInput.value = 'Verify battery and camera topics are present after startup.';
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

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

test('refreshRecorderLlmPromptPreview fills the manual-copy prompt box and updates status text', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.recorderRobotSelect.value = 'rosbot';
  env.recorderDefinitionIdInput.value = 'battery_health';
  env.recorderDefinitionLabelInput.value = 'Battery health';
  env.recorderLlmSystemDetailsInput.value = 'ROS 2 Humble, Ubuntu 22.04, rostopic available';
  env.recorderLlmTestRequestInput.value = 'Verify battery and camera topics are present after startup.';
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  const result = api.refreshRecorderLlmPromptPreview();

  assert.equal(result.ok, true);
  assert.equal(env.recorderLlmPromptPreview.value, result.promptText);
  assert.equal(env.state.recorderSimplePromptBundle, result.promptText);
  assert.match(env.recorderLlmPromptStatus.textContent, /copy it from the box in the next step/i);
});

test('Simple prompt step auto-generates the prompt and advances to import on Next', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.recorderRobotSelect.value = 'rosbot';
  env.recorderDefinitionIdInput.value = 'battery_health';
  env.recorderDefinitionLabelInput.value = 'Battery health';
  env.recorderLlmSystemDetailsInput.value = 'ROS 2 Humble, Ubuntu 22.04, rostopic available';
  env.recorderLlmTestRequestInput.value = 'Verify battery and camera topics are present after startup.';
  env.state.recorderMode = 'simple';
  env.state.recorderSimpleStep = 'prompt';
  env.recorderCreateNewTestButton = makeNode();
  env.recorderRunCaptureButton = makeNode();
  env.recorderAddOutputBtn = makeNode();
  env.recorderAddWriteBtn = makeNode();
  env.recorderAddReadBtn = makeNode();
  env.recorderPublishTestButton = makeNode();
  env.RobotTerminalComponent = function MockRobotTerminalComponent() {
    this.exportTranscript = () => 'robot@rosbot$ rostopic list\n/battery\n/camera';
    this.dispose = () => {};
  };
  env.WorkflowRecorderComponent = function MockWorkflowRecorderComponent() {
    return {
      ...env.state.workflowRecorder,
      render() {},
    };
  };
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.initWorkflowRecorder();
  api.setRecorderMode('simple', { targetStep: 'prompt' });
  assert.equal(env.recorderSimplePromptNextButton.disabled, false);

  env.recorderSimplePromptNextButton.click();

  assert.equal(env.state.recorderSimpleStep, 'import');
  assert.match(env.recorderLlmPromptPreview.value, /"id": "battery_health"/);
  assert.match(env.recorderLlmPromptStatus.textContent, /copy it from the box in the next step/i);
});

test('loadRecorderLlmImportResult rejects invalid JSON without mutating the current draft', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const currentDraft = { id: 'existing_draft' };
  env.state.workflowRecorder.loaded = currentDraft;
  env.recorderLlmImportInput.value = 'not valid json';
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  const loaded = api.loadRecorderLlmImportResult();

  assert.equal(loaded, false);
  assert.equal(env.state.workflowRecorder.loaded, currentDraft);
  assert.match(env.recorderLlmImportStatus.textContent, /invalid json/i);
});

test('validateRecorderLlmImportInput reports unsupported read kinds explicitly', async () => {
  const createRecorderFeature = await loadApi();
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
  const api = createRecorderFeature(runtime, env);

  const definition = api.validateRecorderLlmImportInput();

  assert.equal(definition, null);
  assert.match(env.recorderLlmImportStatus.textContent, /unsupported read kind/i);
});

test('validateRecorderLlmImportInput reports mixed runAtConnection values explicitly', async () => {
  const createRecorderFeature = await loadApi();
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
  const api = createRecorderFeature(runtime, env);

  const definition = api.validateRecorderLlmImportInput();

  assert.equal(definition, null);
  assert.match(env.recorderLlmImportStatus.textContent, /share one runAtConnection value/i);
});

test('loadRecorderLlmImportResult hydrates valid JSON into the recorder draft', async () => {
  const createRecorderFeature = await loadApi();
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
  const api = createRecorderFeature(runtime, env);

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
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.recorderCommandInput.value = 'echo battery';
  env.recorderRobotSelect.value = 'rosbot';
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

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

test('setRecorderMode simple starts on robot selection before terminal context', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.setRecorderMode('simple', { targetStep: 'select-robot' });

  assert.equal(env.state.recorderMode, 'simple');
  assert.equal(env.state.recorderSimpleStep, 'select-robot');
  assert.equal(env.recorderModeSelector.classList.contains('hidden'), true);
  assert.equal(env.recorderSimpleSelectRobotStep.classList.contains('hidden'), false);
  assert.equal(env.recorderSimpleTerminalStep.classList.contains('hidden'), true);
  assert.equal(env.recorderTerminalPanel.classList.contains('hidden'), true);
  assert.equal(env.recorderSimpleTerminalActions.classList.contains('hidden'), true);
  assert.equal(env.recorderAdvancedWorkspace.classList.contains('hidden'), true);
  assert.equal(env.recorderAssignmentPanel.classList.contains('hidden'), true);
  assert.equal(env.recorderSharedTopbar.classList.contains('hidden'), true);
  assert.equal(env.recorderTopbarRobotWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarDefinitionWrap.classList.contains('hidden'), true);
  assert.equal(env.recorderTopbarPublishWrap.classList.contains('hidden'), true);
  assert.equal(env.recorderTopbarRobotWrap.parentNode, env.recorderSimpleSelectRobotField);
  assert.equal(env.recorderSimpleSelectRobotNextButton.disabled, true);
});

test('setRecorderMode advanced shows the start CTA before a draft exists', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.state.workflowRecorder.started = false;
  env.state.workflowRecorder.getState = () => ({
    started: false,
    writeCount: 0,
    readCount: 0,
    outputCount: 0,
    publishReady: false,
    blockingIssues: ['Click "Start creation of new test" to start a draft.'],
    editingOutputKey: '',
    editingReadBlockId: '',
  });
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.setRecorderMode('advanced');

  assert.equal(env.state.recorderMode, 'advanced');
  assert.equal(env.recorderSharedTopbar.classList.contains('hidden'), false);
  assert.equal(env.recorderAdvancedWorkspace.classList.contains('hidden'), false);
  assert.equal(env.recorderTerminalPanel.classList.contains('hidden'), false);
  assert.equal(env.recorderAssignmentPanel.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarNewDraftWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarPublishWrap.classList.contains('hidden'), true);
  assert.equal(env.recorderCreateNewTestButton.textContent, 'Start creation of new test');
  assert.equal(env.recorderPublishTestButton.textContent, 'Publish test');
});

test('setRecorderMode advanced shows the full manual workspace', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.setRecorderMode('advanced');

  assert.equal(env.state.recorderMode, 'advanced');
  assert.equal(env.recorderSharedTopbar.classList.contains('hidden'), false);
  assert.equal(env.recorderAdvancedWorkspace.classList.contains('hidden'), false);
  assert.equal(env.recorderTerminalPanel.classList.contains('hidden'), false);
  assert.equal(env.recorderSimpleTerminalActions.classList.contains('hidden'), true);
  assert.equal(env.recorderAssignmentPanel.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarNewDraftWrap.classList.contains('hidden'), true);
  assert.equal(env.recorderTopbarRobotWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarDefinitionWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarPublishWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderCreateNewTestButton.textContent, 'Start creation of new test');
  assert.equal(env.recorderPublishTestButton.textContent, 'Publish test');
  assert.equal(env.recorderTopbarRobotWrap.parentNode, env.recorderSharedTopbarMain);
});

test('setRecorderMode simple publish step only shows the publish CTA', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.setRecorderMode('simple', { targetStep: 'publish' });

  assert.equal(env.state.recorderMode, 'simple');
  assert.equal(env.state.recorderSimpleStep, 'publish');
  assert.equal(env.recorderSharedTopbar.classList.contains('hidden'), false);
  assert.equal(env.recorderTopbarNewDraftWrap.classList.contains('hidden'), true);
  assert.equal(env.recorderTopbarPublishWrap.classList.contains('hidden'), false);
  assert.equal(env.recorderCreateNewTestButton.textContent, 'Start creation of new test');
  assert.equal(env.recorderPublishTestButton.textContent, 'Publish test');
});

test('resetRecorderTestEntry clears the current recorder draft and returns to mode selector', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.state.recorderMode = 'advanced';
  env.recorderRobotSelect.value = 'rosbot';
  env.recorderDefinitionIdInput.value = 'battery_health';
  env.recorderDefinitionLabelInput.value = 'Battery health';
  env.recorderLlmSystemDetailsInput.value = 'ROS 2';
  env.recorderLlmTestRequestInput.value = 'Check battery topic';
  env.recorderSimpleTranscriptAcknowledge.checked = true;
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.resetRecorderTestEntry({ target: 'mode-selector' });

  assert.equal(env.state.workflowRecorder.resetCalled, true);
  assert.equal(env.state.recorderTerminalComponent.disposed, true);
  assert.equal(env.state.recorderMode, '');
  assert.equal(env.recorderRobotSelect.value, '');
  assert.equal(env.recorderDefinitionIdInput.value, '');
  assert.equal(env.recorderDefinitionLabelInput.value, '');
  assert.equal(env.recorderLlmSystemDetailsInput.value, '');
  assert.equal(env.recorderLlmTestRequestInput.value, '');
  assert.equal(env.recorderSimpleTranscriptAcknowledge.checked, false);
  assert.equal(env.recorderModeSelector.classList.contains('hidden'), false);
});

test('clicking Test Editor nav resets into mode selector', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.state.activeManageTab = 'recorder';
  env.state.manageFlowEditorMode = 'test';
  env.state.recorderMode = 'advanced';
  env.recorderRobotSelect.value = 'rosbot';
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);
  api.initManageTabs();

  env.manageTabButtons[1].click();

  assert.equal(env.state.workflowRecorder.resetCalled, true);
  assert.equal(env.state.recorderMode, '');
  assert.equal(env.state.recorderSimpleStep, 'select-robot');
  assert.equal(env.recorderRobotSelect.value, '');
  assert.equal(env.recorderModeSelector.classList.contains('hidden'), false);
  assert.equal(env.recorderSimpleSelectRobotStep.classList.contains('hidden'), true);
});

test('clicking Simple mode card always starts at Select Robot step', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.state.recorderMode = '';
  env.state.recorderSimpleStep = 'preview';
  env.recorderCreateNewTestButton = makeNode();
  env.recorderRunCaptureButton = makeNode();
  env.recorderAddOutputBtn = makeNode();
  env.recorderAddReadBtn = makeNode();
  env.recorderPublishTestButton = makeNode();
  env.RobotTerminalComponent = function MockRobotTerminalComponent() {};
  env.WorkflowRecorderComponent = function MockWorkflowRecorderComponent() {
    return {
      ...env.state.workflowRecorder,
      render() {},
    };
  };
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);
  api.initWorkflowRecorder();

  env.recorderSelectSimpleModeButton.click();

  assert.equal(env.state.recorderMode, 'simple');
  assert.equal(env.state.recorderSimpleStep, 'select-robot');
  assert.equal(env.recorderModeSelector.classList.contains('hidden'), true);
  assert.equal(env.recorderSimpleSelectRobotStep.classList.contains('hidden'), false);
  assert.equal(env.recorderSimpleTerminalStep.classList.contains('hidden'), true);
});

test('Simple terminal step enables next when recorder transcript changes', async () => {
  const createRecorderFeature = await loadApi();
  const env = makeEnv();
  env.recorderRobotSelect.value = 'rosbot';
  env.state.recorderMode = 'simple';
  env.state.recorderSimpleStep = 'terminal';
  env.recorderCreateNewTestButton = makeNode();
  env.recorderRunCaptureButton = makeNode();
  env.recorderAddOutputBtn = makeNode();
  env.recorderAddWriteBtn = makeNode();
  env.recorderAddReadBtn = makeNode();
  env.recorderPublishTestButton = makeNode();
  env.RobotTerminalComponent = function MockRobotTerminalComponent(options = {}) {
    this.mode = 'live';
    this._transcript = '';
    this.dispose = () => {};
    this.exportTranscript = () => this._transcript;
    this.pushTranscript = (text) => {
      this._transcript = text;
      options.onTranscriptChange?.(text);
    };
  };
  env.WorkflowRecorderComponent = function MockWorkflowRecorderComponent() {
    return {
      ...env.state.workflowRecorder,
      render() {},
    };
  };
  const runtime = makeRuntime(env.state);
  const api = createRecorderFeature(runtime, env);

  api.initWorkflowRecorder();
  api.setRecorderMode('simple', { targetStep: 'terminal' });
  assert.equal(env.recorderSimpleTerminalNextButton.disabled, true);

  env.state.recorderTerminalComponent.pushTranscript('robot@rosbot$ rostopic list\n/battery');

  assert.equal(env.recorderSimpleTerminalNextButton.disabled, false);
});
