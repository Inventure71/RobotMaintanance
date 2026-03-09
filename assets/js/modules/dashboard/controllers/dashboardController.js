import { RobotTerminalComponent } from '../../../components/robot-terminal-component.js';
import { WorkflowRecorderComponent } from '../../../components/workflow-recorder-component.js';
import { renderBatteryPill } from '../../../components/battery-pill-component.js';
import { initVisualFlows } from '../../../components/visual-flows.js';
import {
  applyActionButton,
  createActionButton,
  hydrateActionButtons,
  setActionButtonLoading,
} from '../../../components/action-button-component.js';
import { initThemeSwitcher } from '../../../components/theme-switcher-component.js';
import {
  DEFAULT_TEST_DEFINITIONS,
  PRESET_COMMANDS,
  ROBOTS_CONFIG_URL,
  ROBOT_TYPES_CONFIG_URL,
  DEFAULT_ROBOT_MODEL_URL,
} from '../../../config/app-defaults.js';
import { normalizeStatus, normalizeText, normalizeTypeId } from '../../../lib/normalize.js';
import { $, $$ } from '../../../lib/dom.js';
import { buildApiUrl, createPageSessionId } from '../api/client.js';
import { registerMonitorConfigRuntime } from './runtime/dashboardRuntimeMonitorConfig.js';
import { registerFleetViewRuntime } from './runtime/dashboardRuntimeFleetView.js';
import { registerRuntimeFixTestsRuntime } from './runtime/dashboardRuntimeFixTests.js';
import { registerDetailShellRuntime } from './runtime/dashboardRuntimeDetailShell.js';
import { registerManageRecorderRuntime } from './runtime/dashboardRuntimeManageRecorder.js';
import { registerDataInitRuntime } from './runtime/dashboardRuntimeDataInit.js';

let TEST_DEFINITIONS = [...DEFAULT_TEST_DEFINITIONS];
let ROBOT_TYPES = [];
let ROBOT_TYPE_BY_ID = new Map();

    const CAN_USE_MODEL_VIEWER = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl =
          probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
        return !!gl;
      } catch (_error) {
        return false;
      }
    })();
    const ONLINE_CHECK_TIMEOUT_MS = 3_000;
    const ONLINE_CHECK_UI_BUFFER_MS = 800;
    const ONLINE_CHECK_UI_MIN_MS = 2_000;
    const ONLINE_CHECK_UI_MAX_MS = 12_000;
    const ONLINE_CHECK_ESTIMATE_ALPHA = 0.35;
    const FLEET_PARALLELISM_MIN = 1;
    const FLEET_PARALLELISM_MAX = 100;
    const FLEET_PARALLELISM_DEFAULT = 8;
    const FLEET_PARALLELISM_STORAGE_KEY = 'fleetParallelism';
    const RUNTIME_SYNC_INTERVAL_MS = 1500;
    const FLEET_STATIC_ENDPOINT = '/api/fleet/static';
    const FLEET_RUNTIME_ENDPOINT = '/api/fleet/runtime';
    const RUNTIME_ALLOWED_SOURCES = new Set(['manual', 'live', 'auto-monitor', 'auto-monitor-topics']);
    const MONITOR_TOPICS_SOURCE = 'auto-monitor-topics';
    const MONITOR_SOURCE = 'auto-monitor';
    const MONITOR_MODE_ONLINE_BATTERY = 'online_battery';
    const MONITOR_MODE_ONLINE_BATTERY_TOPICS = 'online_battery_topics';
    const MONITOR_ONLINE_INTERVAL_DEFAULT_SEC = 2.0;
    const MONITOR_ONLINE_INTERVAL_MIN_SEC = 0.5;
    const MONITOR_ONLINE_INTERVAL_MAX_SEC = 60.0;
    const MONITOR_BATTERY_INTERVAL_DEFAULT_SEC = 2.0;
    const MONITOR_BATTERY_INTERVAL_MIN_SEC = 0.5;
    const MONITOR_BATTERY_INTERVAL_MAX_SEC = 60.0;
    const MONITOR_TOPICS_INTERVAL_DEFAULT_SEC = 30;
    const MONITOR_TOPICS_INTERVAL_MIN_SEC = 5;
    const MONITOR_TOPICS_INTERVAL_MAX_SEC = 300;
    const DETAIL_TERMINAL_PRESET_IDS = new Set(['restart-docker']);
    const TEST_STEP_TIMEOUT_MS = 12_000;
    const TEST_COUNTDOWN_TICK_MS = 1000;
    const TEST_COUNTDOWN_MIN_SECONDS = 3;
    const TEST_COUNTDOWN_MAX_SECONDS = 60;
    const TEST_COUNTDOWN_WARNING_TEXT = {
      scanning: 'Scan timing out',
      finding: 'Find timing out',
      fixing: 'Fix timing out',
    };
    const TEST_COUNTDOWN_MODE_LABELS = {
      scanning: 'Scanning',
      finding: 'Finding',
      fixing: 'Fixing',
    };
    const FIX_MODE_CONTEXT_DASHBOARD = 'dashboard';
    const FIX_MODE_CONTEXT_DETAIL = 'detail';
    const FIX_JOB_POLL_INTERVAL_MS = 1000;
    const MODAL_SCROLL_LOCK_CLASS = 'modal-scroll-lock';
    const MANAGE_VIEW_HASH = 'manage-robots';
    const MANAGE_TABS = ['robots', 'tests', 'fixes', 'recorder'];
    const MANAGE_TAB_STORAGE_KEY = 'dashboard.manageTab';
    const FORCE_TEXT_TEST_ICONS = (() => {
      try {
        const platformHints = [
          normalizeText(window?.navigator?.platform, ''),
          normalizeText(window?.navigator?.userAgent, ''),
          normalizeText(window?.navigator?.userAgentData?.platform, ''),
        ]
          .join(' ')
          .toLowerCase();
        return platformHints.includes('linux');
      } catch (_error) {
        return false;
      }
    })();
    const TEST_ICON_TEXT_FALLBACKS = Object.freeze({
      online: 'NET',
      general: 'GEN',
      movement: 'MOV',
      battery: 'BAT',
      lidar: 'LID',
      proximity: 'PRX',
      camera: 'CAM',
    });
    const LOW_BATTERY_WARNING_PERCENT = 30;
    const ONLINE_SORT_BATTERY = 'battery';
    const ONLINE_SORT_NAME = 'name';
    const ONLINE_SORT_STATUS = 'status';
    const ONLINE_SORT_ORDER = [ONLINE_SORT_BATTERY, ONLINE_SORT_NAME, ONLINE_SORT_STATUS];
    const ONLINE_SORT_LABELS = {
      [ONLINE_SORT_BATTERY]: 'Battery',
      [ONLINE_SORT_NAME]: 'Name',
      [ONLINE_SORT_STATUS]: 'Status',
    };

    const state = {
      robots: [],
      filter: {
        name: '',
        type: 'all',
        error: 'all',
      },
      onlineSortMode: ONLINE_SORT_BATTERY,
      testingRobotIds: new Set(),
      searchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      autoActivityRobotIds: new Set(),
      isTestRunInProgress: false,
      selectedRobotIds: new Set(),
      detailRobotId: null,
      terminalMode: 'fallback',
      terminalComponent: null,
      activeTerminalRobotId: null,
      testDebugModalOpen: false,
      isBugReportModalOpen: false,
      isBugReportSubmitInProgress: false,
      isCreateRobotInProgress: false,
      isEditRobotInProgress: false,
      isDeleteRobotInProgress: false,
      isCreateRobotTypeInProgress: false,
      isEditRobotTypeInProgress: false,
      isDeleteRobotTypeInProgress: false,
      selectedManageRobotId: '',
      selectedManageRobotTypeId: '',
      activeManageTab: 'robots',
      activeRobotRegistryPanel: 'manage',
      definitionsSummary: {
        commandPrimitives: [],
        tests: [],
        checks: [],
        fixes: [],
        robotTypes: [],
      },
      isManageSummaryLoading: false,
      isOnlineRefreshInFlight: false,
      onlineCheckEstimateMs: ONLINE_CHECK_TIMEOUT_MS,
      fleetParallelism: FLEET_PARALLELISM_DEFAULT,
      testingCountdowns: new Map(),
      testingCountdownTimer: null,
      runtimeSyncTimer: null,
      isRuntimeSyncInFlight: false,
      isMonitorConfigApplyInFlight: false,
      isAutoFixInProgress: false,
      fixModeOpen: {
        dashboard: false,
        detail: false,
      },
      monitorMode: MONITOR_MODE_ONLINE_BATTERY,
      monitorOnlineIntervalSec: MONITOR_ONLINE_INTERVAL_DEFAULT_SEC,
      monitorBatteryIntervalSec: MONITOR_BATTERY_INTERVAL_DEFAULT_SEC,
      monitorTopicsIntervalSec: MONITOR_TOPICS_INTERVAL_DEFAULT_SEC,
      monitorParallelism: FLEET_PARALLELISM_DEFAULT,
      monitorParallelismSyncInFlight: false,
      monitorParallelismPendingValue: null,
      monitorParallelismSyncTimer: null,
      onlineRefreshStartedAt: 0,
      onlineRefreshLastAt: 0,
      onlineRefreshNextAt: 0,
      onlineRefreshSummary: {
        onlineCount: 0,
        offlineCount: 0,
        totalCount: 0,
      },
      autoMonitorRefreshSummary: {
        hasData: false,
        online: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        battery: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        topics: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
      },
      pageSessionId: createPageSessionId(),
      onlineRefreshStatusTimer: null,
      workflowRecorder: null,
      recorderTerminalComponent: null,
      ignoreNextHashChange: false,
      recorderSelectionMouseupHandler: null,
      robotsById: new Map(),
      runtimeVersion: 0,
      countdownNodeCache: null,
    };

    const dashboard = $('#dashboard');
    const addRobotSection = $('#addRobot');
    const detail = $('#detail');
    const onlineGrid = $('#onlineRobotGrid');
    const offlineGrid = $('#offlineRobotGrid');
    const onlineSectionTitle = $('#onlineSectionTitle');
    const offlineSectionTitle = $('#offlineSectionTitle');
    const emptyState = $('#emptyState');
    const filterType = $('#filterType');
    const filterError = $('#filterError');
    const cycleOnlineSortButton = $('#cycleOnlineSort');
    const terminal = $('#terminal');
    const detailTerminalShell = terminal?.closest('.terminal-shell') || null;
    const terminalToolbar = $('#terminalToolbar');
    const terminalBadge = $('#terminalModeBadge');
    const terminalHint = $('#terminalHint');
    const activateTerminalButton = $('#activateTerminal');
    const addRobotForm = $('#addRobotForm');
    const addRobotTypeSelect = $('#addRobotType');
    const addRobotMessage = $('#addRobotMessage');
    const addRobotSavingHint = $('#addRobotSavingHint');
    const addRobotPasswordInput = $('#addRobotPassword');
    const addRobotPasswordToggle = $('#toggleAddRobotPassword');
    const addRobotOverrideLowModelSelect = $('#addRobotOverrideLowModelSelect');
    const addRobotOverrideHighModelSelect = $('#addRobotOverrideHighModelSelect');
    const addRobotLowModelField = $('#addRobotLowModelField');
    const addRobotLowModelDropzone = $('#addRobotLowModelDropzone');
    const addRobotLowModelFileInput = $('#addRobotLowModelFile');
    const addRobotLowModelFileName = $('#addRobotLowModelFileName');
    const addRobotHighModelField = $('#addRobotHighModelField');
    const addRobotHighModelDropzone = $('#addRobotHighModelDropzone');
    const addRobotHighModelFileInput = $('#addRobotHighModelFile');
    const addRobotHighModelFileName = $('#addRobotHighModelFileName');
    const editRobotForm = $('#editRobotForm');
    const editRobotList = $('#editRobotList');
    const editRobotSelect = $('#editRobotSelect');
    const editRobotSummary = $('#editRobotSummary');
    const editRobotStatus = $('#editRobotStatus');
    const editRobotNameInput = $('#editRobotName');
    const editRobotTypeSelect = $('#editRobotType');
    const editRobotIpInput = $('#editRobotIp');
    const editRobotOverrideLowModelSelect = $('#editRobotOverrideLowModelSelect');
    const editRobotOverrideHighModelSelect = $('#editRobotOverrideHighModelSelect');
    const editRobotLowModelField = $('#editRobotLowModelField');
    const editRobotLowModelDropzone = $('#editRobotLowModelDropzone');
    const editRobotLowModelFileInput = $('#editRobotLowModelFile');
    const editRobotLowModelFileName = $('#editRobotLowModelFileName');
    const editRobotHighModelField = $('#editRobotHighModelField');
    const editRobotHighModelDropzone = $('#editRobotHighModelDropzone');
    const editRobotHighModelFileInput = $('#editRobotHighModelFile');
    const editRobotHighModelFileName = $('#editRobotHighModelFileName');
    const editRobotModelStatus = $('#editRobotModelStatus');
    const editRobotClearOverrideField = $('#editRobotClearOverrideField');
    const editRobotClearOverrideInput = $('#editRobotClearOverrideInput');
    const editRobotUsernameInput = $('#editRobotUsername');
    const editRobotPasswordInput = $('#editRobotPassword');
    const editRobotSaveButton = $('#editRobotSaveButton');
    const editRobotDeleteButton = $('#editRobotDeleteButton');
    const robotRegistryPanelButtons = $$('[data-robot-registry-panel-button]');
    const robotRegistryPanels = $$('[data-robot-registry-panel]');
    const editRobotTypeManageSelect = $('#editRobotTypeManageSelect');
    const editRobotTypeList = $('#editRobotTypeList');
    const editRobotTypeSummary = $('#editRobotTypeSummary');
    const editRobotTypeStatus = $('#editRobotTypeStatus');
    const editRobotTypeForm = $('#editRobotTypeForm');
    const editRobotTypeIdInput = $('#editRobotTypeId');
    const editRobotTypeNameInput = $('#editRobotTypeName');
    const editRobotTypeLowModelDropzone = $('#editRobotTypeLowModelDropzone');
    const editRobotTypeLowModelFileInput = $('#editRobotTypeLowModelFile');
    const editRobotTypeLowModelFileName = $('#editRobotTypeLowModelFileName');
    const editRobotTypeHighModelDropzone = $('#editRobotTypeHighModelDropzone');
    const editRobotTypeHighModelFileInput = $('#editRobotTypeHighModelFile');
    const editRobotTypeHighModelFileName = $('#editRobotTypeHighModelFileName');
    const editRobotTypeModelStatus = $('#editRobotTypeModelStatus');
    const editRobotTypeClearModelField = $('#editRobotTypeClearModelField');
    const editRobotTypeClearModelInput = $('#editRobotTypeClearModelInput');
    const editRobotTypeSaveButton = $('#editRobotTypeSaveButton');
    const editRobotTypeDeleteButton = $('#editRobotTypeDeleteButton');
    const addRobotTypeForm = $('#addRobotTypeForm');
    const addRobotTypeMessage = $('#addRobotTypeMessage');
    const addRobotTypeNameInput = $('#addRobotTypeName');
    const addRobotTypeLowModelDropzone = $('#addRobotTypeLowModelDropzone');
    const addRobotTypeLowModelFileInput = $('#addRobotTypeLowModelFile');
    const addRobotTypeLowModelFileName = $('#addRobotTypeLowModelFileName');
    const addRobotTypeHighModelDropzone = $('#addRobotTypeHighModelDropzone');
    const addRobotTypeHighModelFileInput = $('#addRobotTypeHighModelFile');
    const addRobotTypeHighModelFileName = $('#addRobotTypeHighModelFileName');
    const addRobotTypeTopicsInput = $('#addRobotTypeTopics');
    const addRobotTypeSaveButton = $('#addRobotTypeSaveButton');
    const manageTabStatus = $('#manageTabStatus');
    const manageTabButtons = $$('[data-tab]');
    const manageTabPanels = $$('[data-tab-panel]');
    const manageTestsList = $('#manageTestsList');
    const manageFixesList = $('#manageFixesList');
    const manageTestEditorForm = $('#manageTestEditorForm');
    const manageTestIdInput = $('#manageTestId');
    const manageTestLabelInput = $('#manageTestLabel');
    const manageTestExecuteJsonInput = $('#manageTestExecuteJson');
    const manageTestChecksJsonInput = $('#manageTestChecksJson');
    const manageTestRunAtConnectionInput = $('#manageTestRunAtConnectionInput');
    const manageTestEditorStatus = $('#manageTestEditorStatus');
    const manageFixEditorForm = $('#manageFixEditorForm');
    const manageFixIdInput = $('#manageFixId');
    const manageFixLabelInput = $('#manageFixLabel');
    const manageFixDescriptionInput = $('#manageFixDescription');
    const manageFixExecuteJsonInput = $('#manageFixExecuteJson');
    const manageFixPostTestsInput = $('#manageFixPostTests');
    const manageFixRunAtConnectionInput = $('#manageFixRunAtConnectionInput');
    const manageFixEditorStatus = $('#manageFixEditorStatus');
    const manageDeleteTestButton = $('#manageDeleteTestButton');
    const manageDeleteFixButton = $('#manageDeleteFixButton');
    const manageTestRobotTypeTargets = $('#manageTestRobotTypeTargets');
    const manageFixRobotTypeTargets = $('#manageFixRobotTypeTargets');
    const recorderCreateNewTestButton = $('#recorderCreateNewTest');
    const recorderRobotSelect = $('#recorderRobotSelect');
    const recorderDefinitionIdInput = $('#recorderDefinitionId');
    const recorderDefinitionLabelInput = $('#recorderDefinitionLabel');
    const recorderRunAtConnectionInput = $('#recorderRunAtConnectionInput');
    const recorderPublishTestButton = $('#recorderPublishTest');
    const recorderStatus = $('#recorderStatus');
    const recorderPublishStatus = $('#recorderPublishStatus');
    const recorderStateBadge = $('#recorderStateBadge');
    const recorderStepCountBadge = $('#recorderStepCount');
    const recorderCheckCountBadge = $('#recorderCheckCount');
    const recorderOutputCountBadge = $('#recorderOutputCount');
    const recorderCommandInput = $('#recorderCommandInput');
    const recorderRunCaptureButton = $('#recorderRunCapture');
    const recorderOutputKeyInput = $('#recorderOutputKey');
    const recorderOutputLabelInput = $('#recorderOutputLabel');
    const recorderOutputIconInput = $('#recorderOutputIcon');
    const recorderOutputPassDetailsInput = $('#recorderOutputPassDetails');
    const recorderOutputFailDetailsInput = $('#recorderOutputFailDetails');
    const recorderAddOutputBtn = $('#recorderAddOutputBtn');
    const recorderReadOutputKeySelect = $('#recorderReadOutputKey');
    const recorderReadInputRefSelect = $('#recorderReadInputRef');
    const recorderReadKindSelect = $('#recorderReadKind');
    const recorderReadNeedleInput = $('#recorderReadNeedle');
    const recorderReadNeedlesInput = $('#recorderReadNeedles');
    const recorderReadLinesInput = $('#recorderReadLines');
    const recorderReadRequireAllInput = $('#recorderReadRequireAll');
    const recorderAddReadBtn = $('#recorderAddReadBtn');
    const recorderOutputs = $('#recorderOutputs');
    const recorderFlowBlocks = $('#recorderFlowBlocks');
    const recorderTerminalDisplay = $('#recorderTerminalDisplay');
    const recorderTerminalShell = recorderTerminalDisplay?.closest('.terminal-shell') || null;
    const recorderTerminalToolbar = $('#recorderTerminalToolbar');
    const recorderTerminalBadge = $('#recorderTerminalBadge');
    const recorderTerminalHint = $('#recorderTerminalHint');
    const recorderTerminalPopReadBtn = $('#recorderTerminalPopReadBtn');
    const activateRecorderTerminalButton = $('#activateRecorderTerminal');
    const recorderTerminalActivationOverlay = $('#recorderTerminalActivationOverlay');

    const toggleDashboardFixModeButton = $('#toggleDashboardFixMode');
    const toggleDetailFixModeButton = $('#toggleDetailFixMode');
    const dashboardFixModePanel = $('#dashboardFixModePanel');
    const dashboardFixModeSummary = $('#dashboardFixModeSummary');
    const dashboardFixModeActions = $('#dashboardFixModeActions');
    const dashboardFixModeStatus = $('#dashboardFixModeStatus');
    const detailFixModePanel = $('#detailFixModePanel');
    const detailFixModeSummary = $('#detailFixModeSummary');
    const detailFixModeActions = $('#detailFixModeActions');
    const detailFixModeStatus = $('#detailFixModeStatus');
    const monitorModeSelect = $('#monitorMode');
    const monitorTopicsIntervalInput = $('#monitorTopicsIntervalSec');
    const monitorApplyButton = $('#applyMonitorConfig');
    const monitorConfigStatus = $('#monitorConfigStatus');
    const themeSelect = $('#themeSelect');
    const testDebugModal = $('#testDebugModal');
    const testDebugTitle = $('#testDebugTitle');
    const testDebugSummary = $('#testDebugSummary');
    const testDebugBody = $('#testDebugBody');
    const testDebugClose = $('#testDebugClose');
    const bugReportModal = $('#bugReportModal');
    const bugReportMessageInput = $('#bugReportMessage');
    const bugReportStatus = $('#bugReportStatus');
    const cancelBugReportButton = $('#cancelBugReport');
    const submitBugReportButton = $('#submitBugReport');

    let recorderLastEditingOutputKey = '';
    let recorderLastEditingReadBlockId = '';

const runtimeEnv = {
  $,
  $$,
  CAN_USE_MODEL_VIEWER,
  DEFAULT_ROBOT_MODEL_URL,
  DEFAULT_TEST_DEFINITIONS,
  DETAIL_TERMINAL_PRESET_IDS,
  FIX_JOB_POLL_INTERVAL_MS,
  FIX_MODE_CONTEXT_DASHBOARD,
  FIX_MODE_CONTEXT_DETAIL,
  FLEET_PARALLELISM_DEFAULT,
  FLEET_PARALLELISM_MAX,
  FLEET_PARALLELISM_MIN,
  FLEET_PARALLELISM_STORAGE_KEY,
  FLEET_RUNTIME_ENDPOINT,
  FLEET_STATIC_ENDPOINT,
  FORCE_TEXT_TEST_ICONS,
  LOW_BATTERY_WARNING_PERCENT,
  MANAGE_TABS,
  MANAGE_TAB_STORAGE_KEY,
  MANAGE_VIEW_HASH,
  MODAL_SCROLL_LOCK_CLASS,
  MONITOR_BATTERY_INTERVAL_DEFAULT_SEC,
  MONITOR_BATTERY_INTERVAL_MAX_SEC,
  MONITOR_BATTERY_INTERVAL_MIN_SEC,
  MONITOR_MODE_ONLINE_BATTERY,
  MONITOR_MODE_ONLINE_BATTERY_TOPICS,
  MONITOR_ONLINE_INTERVAL_DEFAULT_SEC,
  MONITOR_ONLINE_INTERVAL_MAX_SEC,
  MONITOR_ONLINE_INTERVAL_MIN_SEC,
  MONITOR_SOURCE,
  MONITOR_TOPICS_INTERVAL_DEFAULT_SEC,
  MONITOR_TOPICS_INTERVAL_MAX_SEC,
  MONITOR_TOPICS_INTERVAL_MIN_SEC,
  MONITOR_TOPICS_SOURCE,
  ONLINE_CHECK_ESTIMATE_ALPHA,
  ONLINE_CHECK_TIMEOUT_MS,
  ONLINE_CHECK_UI_BUFFER_MS,
  ONLINE_CHECK_UI_MAX_MS,
  ONLINE_CHECK_UI_MIN_MS,
  ONLINE_SORT_BATTERY,
  ONLINE_SORT_LABELS,
  ONLINE_SORT_NAME,
  ONLINE_SORT_ORDER,
  ONLINE_SORT_STATUS,
  PRESET_COMMANDS,
  ROBOTS_CONFIG_URL,
  ROBOT_TYPES,
  ROBOT_TYPES_CONFIG_URL,
  ROBOT_TYPE_BY_ID,
  RUNTIME_ALLOWED_SOURCES,
  RUNTIME_SYNC_INTERVAL_MS,
  RobotTerminalComponent,
  TEST_COUNTDOWN_MAX_SECONDS,
  TEST_COUNTDOWN_MIN_SECONDS,
  TEST_COUNTDOWN_MODE_LABELS,
  TEST_COUNTDOWN_TICK_MS,
  TEST_COUNTDOWN_WARNING_TEXT,
  TEST_DEFINITIONS,
  TEST_ICON_TEXT_FALLBACKS,
  TEST_STEP_TIMEOUT_MS,
  WorkflowRecorderComponent,
  activateRecorderTerminalButton,
  activateTerminalButton,
  addRobotForm,
  addRobotMessage,
  addRobotPasswordInput,
  addRobotPasswordToggle,
  addRobotSavingHint,
  addRobotOverrideLowModelSelect,
  addRobotOverrideHighModelSelect,
  addRobotLowModelField,
  addRobotLowModelDropzone,
  addRobotLowModelFileInput,
  addRobotLowModelFileName,
  addRobotHighModelField,
  addRobotHighModelDropzone,
  addRobotHighModelFileInput,
  addRobotHighModelFileName,
  addRobotTypeForm,
  addRobotTypeMessage,
  addRobotTypeNameInput,
  addRobotTypeLowModelDropzone,
  addRobotTypeLowModelFileInput,
  addRobotTypeLowModelFileName,
  addRobotTypeHighModelDropzone,
  addRobotTypeHighModelFileInput,
  addRobotTypeHighModelFileName,
  addRobotTypeSaveButton,
  addRobotTypeTopicsInput,
  addRobotSection,
  addRobotTypeSelect,
  applyActionButton,
  bugReportMessageInput,
  bugReportModal,
  bugReportStatus,
  buildApiUrl,
  cancelBugReportButton,
  createActionButton,
  createPageSessionId,
  cycleOnlineSortButton,
  dashboard,
  dashboardFixModeActions,
  dashboardFixModePanel,
  dashboardFixModeStatus,
  dashboardFixModeSummary,
  detail,
  editRobotDeleteButton,
  editRobotForm,
  editRobotList,
  editRobotIpInput,
  editRobotOverrideLowModelSelect,
  editRobotOverrideHighModelSelect,
  editRobotLowModelField,
  editRobotLowModelDropzone,
  editRobotLowModelFileInput,
  editRobotLowModelFileName,
  editRobotHighModelField,
  editRobotHighModelDropzone,
  editRobotHighModelFileInput,
  editRobotHighModelFileName,
  editRobotModelStatus,
  editRobotClearOverrideField,
  editRobotClearOverrideInput,
  editRobotNameInput,
  editRobotPasswordInput,
  editRobotSaveButton,
  editRobotSelect,
  editRobotStatus,
  editRobotSummary,
  editRobotTypeSelect,
  editRobotTypeManageSelect,
  editRobotTypeList,
  editRobotTypeSummary,
  editRobotTypeStatus,
  editRobotTypeForm,
  editRobotTypeIdInput,
  editRobotTypeNameInput,
  editRobotTypeLowModelDropzone,
  editRobotTypeLowModelFileInput,
  editRobotTypeLowModelFileName,
  editRobotTypeHighModelDropzone,
  editRobotTypeHighModelFileInput,
  editRobotTypeHighModelFileName,
  editRobotTypeModelStatus,
  editRobotTypeClearModelField,
  editRobotTypeClearModelInput,
  editRobotTypeSaveButton,
  editRobotTypeDeleteButton,
  editRobotUsernameInput,
  detailFixModeActions,
  detailFixModePanel,
  detailFixModeStatus,
  detailFixModeSummary,
  detailTerminalShell,
  emptyState,
  filterError,
  filterType,
  hydrateActionButtons,
  initThemeSwitcher,
  initVisualFlows,
  manageDeleteFixButton,
  manageDeleteTestButton,
  manageFixDescriptionInput,
  manageFixEditorForm,
  manageFixEditorStatus,
  manageFixExecuteJsonInput,
  manageFixIdInput,
  manageFixLabelInput,
  manageFixPostTestsInput,
  manageFixRunAtConnectionInput,
  manageFixRobotTypeTargets,
  manageFixesList,
  manageTabButtons,
  manageTabPanels,
  manageTabStatus,
  manageTestChecksJsonInput,
  manageTestEditorForm,
  manageTestEditorStatus,
  manageTestExecuteJsonInput,
  manageTestIdInput,
  manageTestLabelInput,
  manageTestRunAtConnectionInput,
  manageTestRobotTypeTargets,
  manageTestsList,
  monitorApplyButton,
  monitorConfigStatus,
  monitorModeSelect,
  monitorTopicsIntervalInput,
  normalizeStatus,
  normalizeText,
  normalizeTypeId,
  offlineGrid,
  offlineSectionTitle,
  onlineGrid,
  onlineSectionTitle,
  recorderAddOutputBtn,
  recorderAddReadBtn,
  recorderCheckCountBadge,
  recorderCommandInput,
  recorderCreateNewTestButton,
  recorderDefinitionIdInput,
  recorderDefinitionLabelInput,
  recorderRunAtConnectionInput,
  recorderFlowBlocks,
  recorderLastEditingOutputKey,
  recorderLastEditingReadBlockId,
  recorderOutputCountBadge,
  recorderOutputFailDetailsInput,
  recorderOutputIconInput,
  recorderOutputKeyInput,
  recorderOutputLabelInput,
  recorderOutputPassDetailsInput,
  recorderOutputs,
  recorderPublishStatus,
  recorderPublishTestButton,
  recorderReadInputRefSelect,
  recorderReadKindSelect,
  recorderReadLinesInput,
  recorderReadNeedleInput,
  recorderReadNeedlesInput,
  recorderReadOutputKeySelect,
  recorderReadRequireAllInput,
  recorderRobotSelect,
  recorderRunCaptureButton,
  recorderStateBadge,
  recorderStatus,
  recorderStepCountBadge,
  recorderTerminalActivationOverlay,
  recorderTerminalBadge,
  recorderTerminalDisplay,
  recorderTerminalHint,
  recorderTerminalPopReadBtn,
  recorderTerminalShell,
  recorderTerminalToolbar,
  renderBatteryPill,
  robotRegistryPanelButtons,
  robotRegistryPanels,
  setActionButtonLoading,
  state,
  submitBugReportButton,
  terminal,
  terminalBadge,
  terminalHint,
  terminalToolbar,
  testDebugBody,
  testDebugClose,
  testDebugModal,
  testDebugSummary,
  testDebugTitle,
  themeSelect,
  toggleDashboardFixModeButton,
  toggleDetailFixModeButton,
};

const runtime = {};
Object.assign(runtime, registerMonitorConfigRuntime(runtime, runtimeEnv));
Object.assign(runtime, registerFleetViewRuntime(runtime, runtimeEnv));
Object.assign(runtime, registerRuntimeFixTestsRuntime(runtime, runtimeEnv));
Object.assign(runtime, registerDetailShellRuntime(runtime, runtimeEnv));
Object.assign(runtime, registerManageRecorderRuntime(runtime, runtimeEnv));
Object.assign(runtime, registerDataInitRuntime(runtime, runtimeEnv));

const initDashboardController = runtime.initDashboardController;
const initDashboardApp = initDashboardController;

export { initDashboardController };
export { initDashboardApp };
