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
  '../../assets/js/modules/dashboard/features/detail/runtime/createDetailFeatureRuntime.js',
);
const MANAGE_ENTITIES_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailManageEntitiesApi.js',
);
const ROBOT_MUTATION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailRobotMutationApi.js',
);
const TEST_AND_RENDER_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailTestAndRenderApi.js',
);
const TERMINAL_DEBUG_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailTerminalDebugApi.js',
);
const MODEL_CONTROLS_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailModelControlsApi.js',
);
const FILTERS_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailFiltersApi.js',
);
const DEFINITION_OWNER_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailDefinitionOwnerApi.js',
);
const MANAGE_NAVIGATION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailManageNavigationApi.js',
);
const REFRESH_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailRefreshApi.js',
);
const SESSION_NAVIGATION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/detail/domain/createDetailSessionNavigationApi.js',
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
  let prelude = '';
  if (source.includes("import { createDetailManageEntitiesApi } from '../domain/createDetailManageEntitiesApi.js';")) {
    const manageEntitiesApiSource = await fs.readFile(MANAGE_ENTITIES_API_PATH, 'utf8');
    prelude += `${manageEntitiesApiSource.replace(
      'export function createDetailManageEntitiesApi',
      'function createDetailManageEntitiesApi',
    )}\n`;
  }
  if (source.includes("import { createDetailRobotMutationApi } from '../domain/createDetailRobotMutationApi.js';")) {
    const robotMutationApiSource = await fs.readFile(ROBOT_MUTATION_API_PATH, 'utf8');
    prelude += `${robotMutationApiSource.replace(
      'export function createDetailRobotMutationApi',
      'function createDetailRobotMutationApi',
    )}\n`;
  }
  if (source.includes("import { createDetailTestAndRenderApi } from '../domain/createDetailTestAndRenderApi.js';")) {
    const testAndRenderApiSource = await fs.readFile(TEST_AND_RENDER_API_PATH, 'utf8');
    prelude += `${testAndRenderApiSource.replace(
      'export function createDetailTestAndRenderApi',
      'function createDetailTestAndRenderApi',
    )}\n`;
  }
  if (source.includes("import { createDetailTerminalDebugApi } from '../domain/createDetailTerminalDebugApi.js';")) {
    const terminalDebugApiSource = await fs.readFile(TERMINAL_DEBUG_API_PATH, 'utf8');
    prelude += `${terminalDebugApiSource.replace(
      'export function createDetailTerminalDebugApi',
      'function createDetailTerminalDebugApi',
    )}\n`;
  }
  if (source.includes("import { createDetailModelControlsApi } from '../domain/createDetailModelControlsApi.js';")) {
    const modelControlsApiSource = await fs.readFile(MODEL_CONTROLS_API_PATH, 'utf8');
    prelude += `${modelControlsApiSource.replace(
      'export function createDetailModelControlsApi',
      'function createDetailModelControlsApi',
    )}\n`;
  }
  if (source.includes("import { createDetailFiltersApi } from '../domain/createDetailFiltersApi.js';")) {
    const filtersApiSource = await fs.readFile(FILTERS_API_PATH, 'utf8');
    prelude += `${filtersApiSource.replace(
      'export function createDetailFiltersApi',
      'function createDetailFiltersApi',
    )}\n`;
  }
  if (source.includes("import { createDetailDefinitionOwnerApi } from '../domain/createDetailDefinitionOwnerApi.js';")) {
    const definitionOwnerApiSource = await fs.readFile(DEFINITION_OWNER_API_PATH, 'utf8');
    prelude += `${definitionOwnerApiSource.replace(
      'export function createDetailDefinitionOwnerApi',
      'function createDetailDefinitionOwnerApi',
    )}\n`;
  }
  if (source.includes("import { createDetailManageNavigationApi } from '../domain/createDetailManageNavigationApi.js';")) {
    const manageNavigationApiSource = await fs.readFile(MANAGE_NAVIGATION_API_PATH, 'utf8');
    prelude += `${manageNavigationApiSource.replace(
      'export function createDetailManageNavigationApi',
      'function createDetailManageNavigationApi',
    )}\n`;
  }
  if (source.includes("import { createDetailRefreshApi } from '../domain/createDetailRefreshApi.js';")) {
    const refreshApiSource = await fs.readFile(REFRESH_API_PATH, 'utf8');
    prelude += `${refreshApiSource.replace(
      'export function createDetailRefreshApi',
      'function createDetailRefreshApi',
    )}\n`;
  }
  if (source.includes("import { createDetailSessionNavigationApi } from '../domain/createDetailSessionNavigationApi.js';")) {
    const sessionNavigationApiSource = await fs.readFile(SESSION_NAVIGATION_API_PATH, 'utf8');
    prelude += `${sessionNavigationApiSource.replace(
      'export function createDetailSessionNavigationApi',
      'function createDetailSessionNavigationApi',
    )}\n`;
  }
  const transformed = `${prelude}${source
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
      /import\s*\{[\s\S]*?\}\s*from\s*'\.\.\/domain\/modelUploadHelpers\.js';/,
      `const syncUploadDropzoneLabelValue = (input, labelNode, emptyLabel = 'No file selected') => {
        if (!labelNode) return;
        const file = input?.files?.[0] || null;
        labelNode.textContent = file ? \`\${file.name} • \${(file.size / 1024 / 1024).toFixed(2)} MB\` : emptyLabel;
      };
      const normalizeAvailableQualitiesValue = ({ normalizeText, model }) => {
        const raw = Array.isArray(model?.available_qualities)
          ? model.available_qualities
          : Array.isArray(model?.availableQualities)
            ? model.availableQualities
            : null;
        if (!Array.isArray(raw)) return null;
        return raw.map((quality) => normalizeText(quality, '').toLowerCase())
          .filter((quality, index, list) => (quality === 'low' || quality === 'high') && list.indexOf(quality) === index);
      };
      const modelSupportsQualityValue = ({ normalizeText, normalizeAvailableQualities, model, quality }) => {
        const fileName = normalizeText(model?.file_name, '');
        if (!fileName) return false;
        const availableQualities = normalizeAvailableQualities(model);
        if (!Array.isArray(availableQualities)) return true;
        return availableQualities.includes(quality);
      };
      const setSelectOptionLabelValue = ({ selectNode, normalizeText, value, label }) => {
        if (!selectNode) return;
        const option = Array.from(selectNode.options || []).find((entry) => normalizeText(entry.value, '') === value);
        if (option) option.textContent = label;
      };
      const bindUploadDropzoneValue = ({ dropzone, input, labelNode, syncUploadDropzoneLabel, emptyLabel = 'No file selected' }) => {
        if (!dropzone || !input) return;
        input.addEventListener('change', () => {
          syncUploadDropzoneLabel(input, labelNode, emptyLabel);
        });
        syncUploadDropzoneLabel(input, labelNode, emptyLabel);
      };
      const syncRobotModelOverrideVisibilityValue = ({ selectNode, fieldNode, inputNode, labelNode, syncUploadDropzoneLabel, normalizeText, emptyLabel }) => {
        if (!selectNode || !fieldNode) return;
        const shouldShow = normalizeText(selectNode.value, 'default') === 'override';
        fieldNode.classList.toggle('hidden', !shouldShow);
        if (!shouldShow && inputNode) {
          inputNode.value = '';
          syncUploadDropzoneLabel(inputNode, labelNode, emptyLabel);
        }
      };
      const resetRobotOverrideControlsValue = ({
        syncRobotModelOverrideVisibility,
        syncUploadDropzoneLabel,
        normalizeText,
        lowSelect,
        highSelect,
        lowField,
        highField,
        lowInput,
        highInput,
        lowLabel,
        highLabel,
        lowEmptyLabel,
        highEmptyLabel,
        clearOverrideInput,
        clearOverrideField,
      }) => {
        if (lowSelect) lowSelect.value = 'default';
        if (highSelect) highSelect.value = 'default';
        if (lowInput) lowInput.value = '';
        if (highInput) highInput.value = '';
        if (clearOverrideInput) clearOverrideInput.checked = false;
        if (clearOverrideField) clearOverrideField.classList.add('hidden');
        if (lowSelect) lowSelect.disabled = false;
        if (highSelect) highSelect.disabled = false;
        syncRobotModelOverrideVisibility({ selectNode: lowSelect, fieldNode: lowField, inputNode: lowInput, labelNode: lowLabel, syncUploadDropzoneLabel, normalizeText, emptyLabel: lowEmptyLabel });
        syncRobotModelOverrideVisibility({ selectNode: highSelect, fieldNode: highField, inputNode: highInput, labelNode: highLabel, syncUploadDropzoneLabel, normalizeText, emptyLabel: highEmptyLabel });
        syncUploadDropzoneLabel(lowInput, lowLabel, lowEmptyLabel);
        syncUploadDropzoneLabel(highInput, highLabel, highEmptyLabel);
      };
      const createModelUploadHelpers = ({ normalizeText }) => {
        const normalizeAvailableQualities = (model) => normalizeAvailableQualitiesValue({ normalizeText, model });
        const modelSupportsQuality = (model, quality) =>
          modelSupportsQualityValue({ normalizeText, normalizeAvailableQualities, model, quality });
        const setSelectOptionLabel = (selectNode, value, label) =>
          setSelectOptionLabelValue({ selectNode, normalizeText, value, label });
        const bindUploadDropzone = (dropzone, input, labelNode, emptyLabel = 'No file selected') =>
          bindUploadDropzoneValue({ dropzone, input, labelNode, syncUploadDropzoneLabel: syncUploadDropzoneLabelValue, emptyLabel });
        const syncRobotModelOverrideVisibility = (selectNode, fieldNode, inputNode, labelNode, emptyLabel) =>
          syncRobotModelOverrideVisibilityValue({
            selectNode,
            fieldNode,
            inputNode,
            labelNode,
            syncUploadDropzoneLabel: syncUploadDropzoneLabelValue,
            normalizeText,
            emptyLabel,
          });
        const resetRobotOverrideControls = (options = {}) =>
          resetRobotOverrideControlsValue({
            syncRobotModelOverrideVisibility,
            syncUploadDropzoneLabel: syncUploadDropzoneLabelValue,
            normalizeText,
            ...options,
          });
        return {
          syncUploadDropzoneLabel: syncUploadDropzoneLabelValue,
          normalizeAvailableQualities,
          modelSupportsQuality,
          setSelectOptionLabel,
          bindUploadDropzone,
          syncRobotModelOverrideVisibility,
          resetRobotOverrideControls,
        };
      };`,
    )
        .replace(
      "import { createDetailManageEntitiesApi } from '../domain/createDetailManageEntitiesApi.js';",
      '',
    )
    .replace(
      "import { createDetailRobotMutationApi } from '../domain/createDetailRobotMutationApi.js';",
      '',
    )
    .replace(
      "import { createDetailTestAndRenderApi } from '../domain/createDetailTestAndRenderApi.js';",
      '',
    )
    .replace(
      "import { createDetailTerminalDebugApi } from '../domain/createDetailTerminalDebugApi.js';",
      '',
    )
    .replace(
      "import { createDetailModelControlsApi } from '../domain/createDetailModelControlsApi.js';",
      '',
    )
    .replace(
      "import { createDetailFiltersApi } from '../domain/createDetailFiltersApi.js';",
      '',
    )
    .replace(
      "import { createDetailDefinitionOwnerApi } from '../domain/createDetailDefinitionOwnerApi.js';",
      '',
    )
    .replace(
      "import { createDetailManageNavigationApi } from '../domain/createDetailManageNavigationApi.js';",
      '',
    )
    .replace(
      "import { createDetailRefreshApi } from '../domain/createDetailRefreshApi.js';",
      '',
    )
    .replace(
      "import { createDetailSessionNavigationApi } from '../domain/createDetailSessionNavigationApi.js';",
      '',
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
    loadDefinitionsSummary: async () => {
      calls.loadDefinitionsSummary += 1;
      return {};
    },
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
    robotRegistryPanelButtons: [],
    robotRegistryPanels: [],
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

test('saveRobotTypeEditsFromForm refreshes robot snapshot and definitions after successful type update', async () => {
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
    loadDefinitionsSummary: 0,
    loadRobotTypeConfig: 0,
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  const runtime = makeRuntime(calls, env);
  const api = createDetailFeature(runtime, env);

  await api.saveRobotTypeEditsFromForm();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost/api/robot-types/rosbot-2-pro');
  assert.equal(calls.loadDefinitionsSummary, 1);
  assert.equal(calls.loadRobotsFromBackend, 1);
  assert.equal(env.editRobotTypeStatus.textContent, 'Robot type updated successfully.');
});

test('createRobotTypeFromForm refreshes definitions so new types appear immediately in manage mappings', async () => {
  const fetchCalls = [];
  const createDetailFeature = await loadApi(async (url, init = {}) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      json: async () => ({ typeId: 'tiago' }),
      text: async () => '',
    };
  });
  const calls = {
    loadDefinitionsSummary: 0,
    loadRobotTypeConfig: 0,
    loadRobotsFromBackend: 0,
  };
  const env = makeEnv();
  env.addRobotTypeForm = {
    __formEntries: [
      ['name', 'TIAGo'],
      ['batteryCommand', 'ros2 topic echo /battery'],
    ],
    resetCalled: 0,
    reset() {
      this.resetCalled += 1;
    },
  };
  env.addRobotTypeLowModelFileInput.files = [{ name: 'tiago-low.glb' }];
  env.addRobotTypeHighModelFileInput.files = [{ name: 'tiago-high.glb' }];
  const runtime = makeRuntime(calls, env);
  const api = createDetailFeature(runtime, env);

  await api.createRobotTypeFromForm();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://localhost/api/robot-types');
  assert.equal(calls.loadDefinitionsSummary, 1);
  assert.equal(calls.loadRobotsFromBackend, 1);
  assert.equal(env.addRobotTypeMessage.textContent, 'Robot type created and saved.');
  assert.equal(env.addRobotTypeForm.resetCalled, 1);
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
    loadDefinitionsSummary: 0,
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
    loadDefinitionsSummary: 0,
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
