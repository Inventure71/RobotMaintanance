import { renderRecorderLlmPromptTemplate } from '../../templates/recorderLlmPromptTemplate.js';

export function registerManageRecorderRuntime(runtime, env) {
  const {
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
    manageDefinitionFilterButtons,
    manageDefinitionsList,
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
    manageFlowModeButtons,
    manageFlowModeHint,
    manageNewFixDefinitionButton,
    manageNewTestDefinitionButton,
    manageRecorderFixEditorPanel,
    manageRecorderTestEditorPanel,
    recorderExperienceShell,
    recorderModeBadge,
    recorderResetExperienceButton,
    recorderChangeModeButton,
    recorderSelectSimpleModeButton,
    recorderSelectAdvancedModeButton,
    recorderModeSelector,
    recorderSharedTopbar,
    recorderSharedTopbarMain,
    recorderTopbarNewDraftWrap,
    recorderTopbarRobotWrap,
    recorderTopbarDefinitionWrap,
    recorderTopbarPublishWrap,
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
    recorderAddWriteBtn,
    recorderAddReadBtn,
    recorderCheckCountBadge,
    recorderCommandInput,
    recorderCreateNewTestButton,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderRunAtConnectionInput,
    recorderRobotTypeTargets,
    recorderFlowBlocks,
    recorderWriteBlocks,
    recorderReadBlocks,
    recorderAdvancedPreview,
    recorderSimplePreview,
    recorderAssignmentPanel,
    recorderAdvancedWorkspace,
    recorderWritePanel,
    recorderOutputsPanel,
    recorderReadsPanel,
    recorderAdvancedPreviewPanel,
    recorderTerminalPanel,
    recorderSimpleTerminalActions,
    recorderSimpleSelectRobotStep,
    recorderSimpleSelectRobotField,
    recorderSimpleSelectRobotNextButton,
    recorderSimpleTerminalStep,
    recorderSimplePromptStep,
    recorderSimpleImportStep,
    recorderSimplePreviewStep,
    recorderSimplePublishStep,
    recorderSimpleTranscriptAcknowledge,
    recorderSimpleTerminalNextButton,
    recorderSimplePromptBackButton,
    recorderGeneratePromptButton,
    recorderSimplePromptNextButton,
    recorderSimpleImportBackButton,
    recorderValidateImportButton,
    recorderSimpleImportNextButton,
    recorderSimplePreviewBackButton,
    recorderSimpleEditInAdvancedButton,
    recorderSimplePreviewNextButton,
    recorderSimplePublishBackButton,
    recorderLastEditingOutputKey: initialRecorderLastEditingOutputKey,
    recorderLastEditingReadBlockId: initialRecorderLastEditingReadBlockId,
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
    recorderAskLlmButton,
    recorderAskLlmHelpButton,
    recorderLlmHelpPanel,
    recorderPasteLlmResultButton,
    recorderLlmPromptModal,
    recorderLlmPromptCancelButton,
    recorderLlmCopyPromptButton,
    recorderLlmSystemDetailsInput,
    recorderLlmTestRequestInput,
    recorderLlmPromptPreview,
    recorderLlmPromptStatus,
    recorderLlmImportModal,
    recorderLlmImportCancelButton,
    recorderLlmImportLoadButton,
    recorderLlmImportInput,
    recorderLlmImportStatus,
    recorderTerminalActivationOverlay,
    recorderTerminalBadge,
    recorderTerminalDisplay,
    recorderTerminalHint,
    recorderTerminalPopReadBtn,
    recorderTerminalShell,
    recorderTerminalToolbar,
    renderBatteryPill,
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
  } = env;
  let recorderLastEditingOutputKey = normalizeText(initialRecorderLastEditingOutputKey, '');
  let recorderLastEditingReadBlockId = normalizeText(initialRecorderLastEditingReadBlockId, '');
  let recorderLlmImportedDefinition = null;
  const RECORDER_SIMPLE_STEPS = ['select-robot', 'terminal', 'prompt', 'import', 'preview', 'publish'];
  state.recorderMode = normalizeText(state.recorderMode, '').toLowerCase();
  state.recorderSimpleStep = RECORDER_SIMPLE_STEPS.includes(normalizeText(state.recorderSimpleStep, ''))
    ? normalizeText(state.recorderSimpleStep, '')
    : 'terminal';
  state.recorderSimplePromptBundle = state.recorderSimplePromptBundle || '';
  state.recorderSimpleImportValidated = state.recorderSimpleImportValidated || null;
  state.recorderModeLocalState = state.recorderModeLocalState && typeof state.recorderModeLocalState === 'object'
    ? state.recorderModeLocalState
    : {};

  const RECORDER_LLM_BASE_READ_KINDS = new Set(['contains_string', 'contains_any_string', 'contains_lines_unordered']);
  const RECORDER_LLM_ALLOWED_READ_KINDS = new Set([...RECORDER_LLM_BASE_READ_KINDS, 'all_of']);

  const addRobotIdsToSelection = (...args) => runtime.addRobotIdsToSelection(...args);
  const appendTerminalLine = (...args) => runtime.appendTerminalLine(...args);
  const appendTerminalPayload = (...args) => runtime.appendTerminalPayload(...args);
  const applyDashboardMetaFromVisible = (...args) => runtime.applyDashboardMetaFromVisible(...args);
  const applyFilters = (...args) => runtime.applyFilters(...args);
  const applyMonitorConfig = (...args) => runtime.applyMonitorConfig(...args);
  const applyMonitorConfigFromPayload = (...args) => runtime.applyMonitorConfigFromPayload(...args);
  const applyRuntimeRobotPatches = (...args) => runtime.applyRuntimeRobotPatches(...args);
  const areAllRobotIdsSelected = (...args) => runtime.areAllRobotIdsSelected(...args);
  const batteryReasonText = (...args) => runtime.batteryReasonText(...args);
  const buildConnectionCornerIconMarkup = (...args) => runtime.buildConnectionCornerIconMarkup(...args);
  const buildFixButtonLabel = (...args) => runtime.buildFixButtonLabel(...args);
  const buildGlobalTestDefinitions = (...args) => runtime.buildGlobalTestDefinitions(...args);
  const buildLastFullTestPillLabel = (...args) => runtime.buildLastFullTestPillLabel(...args);
  const buildManageHash = (...args) => runtime.buildManageHash(...args);
  const buildRobotModelContainer = (...args) => runtime.buildRobotModelContainer(...args);
  const buildRobotModelMarkup = (...args) => runtime.buildRobotModelMarkup(...args);
  const buildScanOverlayMarkup = (...args) => runtime.buildScanOverlayMarkup(...args);
  const buildTestPreviewText = (...args) => runtime.buildTestPreviewText(...args);
  const buildTestPreviewTextForResult = (...args) => runtime.buildTestPreviewTextForResult(...args);
  const clampFleetParallelism = (...args) => runtime.clampFleetParallelism(...args);
  const clampMonitorBatteryInterval = (...args) => runtime.clampMonitorBatteryInterval(...args);
  const clampMonitorOnlineInterval = (...args) => runtime.clampMonitorOnlineInterval(...args);
  const clampMonitorTopicsInterval = (...args) => runtime.clampMonitorTopicsInterval(...args);
  const clampOnlineCountdownMs = (...args) => runtime.clampOnlineCountdownMs(...args);
  const closeBugReportModal = (...args) => runtime.closeBugReportModal(...args);
  const closeRecorderTerminalSession = (...args) => runtime.closeRecorderTerminalSession(...args);
  const closeTerminalSession = (...args) => runtime.closeTerminalSession(...args);
  const closeTestDebugModal = (...args) => runtime.closeTestDebugModal(...args);
  const createRobotFromForm = (...args) => runtime.createRobotFromForm(...args);
  const cycleOnlineSortMode = (...args) => runtime.cycleOnlineSortMode(...args);
  const estimateTestCountdownMsFromBody = (...args) => runtime.estimateTestCountdownMsFromBody(...args);
  const formatConsoleLine = (...args) => runtime.formatConsoleLine(...args);
  const formatDurationMs = (...args) => runtime.formatDurationMs(...args);
  const formatEpochSeconds = (...args) => runtime.formatEpochSeconds(...args);
  const formatLastFullTestTimestamp = (...args) => runtime.formatLastFullTestTimestamp(...args);
  const formatRawOutput = (...args) => runtime.formatRawOutput(...args);
  const formatTestValue = (...args) => runtime.formatTestValue(...args);
  const getAutoFixesForType = (...args) => runtime.getAutoFixesForType(...args);
  const getConfiguredDefaultTestIds = (...args) => runtime.getConfiguredDefaultTestIds(...args);
  const getCountdownLabel = (...args) => runtime.getCountdownLabel(...args);
  const getCountdownNodes = (...args) => runtime.getCountdownNodes(...args);
  const getDashboardFixCandidates = (...args) => runtime.getDashboardFixCandidates(...args);
  const getDefinitionLabel = (...args) => runtime.getDefinitionLabel(...args);
  const getDetailFixCandidates = (...args) => runtime.getDetailFixCandidates(...args);
  const getDetailTerminalPresets = (...args) => runtime.getDetailTerminalPresets(...args);
  const getFallbackTestIconText = (...args) => runtime.getFallbackTestIconText(...args);
  const getFixModeElements = (...args) => runtime.getFixModeElements(...args);
  const getFleetParallelism = (...args) => runtime.getFleetParallelism(...args);
  const getMonitorBatteryIntervalMs = (...args) => runtime.getMonitorBatteryIntervalMs(...args);
  const getMonitorOnlineIntervalMs = (...args) => runtime.getMonitorOnlineIntervalMs(...args);
  const getMonitorTopicsIntervalMs = (...args) => runtime.getMonitorTopicsIntervalMs(...args);
  const getOnlineCheckCountdownMs = (...args) => runtime.getOnlineCheckCountdownMs(...args);
  const getPersistedManageTab = (...args) => runtime.getPersistedManageTab(...args);
  const getReachableRobotIds = (...args) => runtime.getReachableRobotIds(...args);
  const getRobotById = (...args) => runtime.getRobotById(...args);
  const getRobotDefinitionsForType = (...args) => runtime.getRobotDefinitionsForType(...args);
  const getRobotIdsForRun = (...args) => runtime.getRobotIdsForRun(...args);
  const getRobotTypeConfig = (...args) => runtime.getRobotTypeConfig(...args);
  const getRunSelectedButtonIdleLabel = (...args) => runtime.getRunSelectedButtonIdleLabel(...args);
  const getSelectedRobotIds = (...args) => runtime.getSelectedRobotIds(...args);
  const getStatusChipTone = (...args) => runtime.getStatusChipTone(...args);
  const getTestIconPresentation = (...args) => runtime.getTestIconPresentation(...args);
  const getTestingCountdownText = (...args) => runtime.getTestingCountdownText(...args);
  const getTimestamp = (...args) => runtime.getTimestamp(...args);
  const getVisibleOfflineRobotIds = (...args) => runtime.getVisibleOfflineRobotIds(...args);
  const getVisibleOnlineRobotIds = (...args) => runtime.getVisibleOnlineRobotIds(...args);
  const haveRuntimeTestsChanged = (...args) => runtime.haveRuntimeTestsChanged(...args);
  const hideRecorderReadPopover = (...args) => runtime.hideRecorderReadPopover(...args);
  const initAddRobotPasswordToggle = (...args) => runtime.initAddRobotPasswordToggle(...args);
  const initDashboardController = (...args) => runtime.initDashboardController(...args);
  const initFleetParallelism = (...args) => runtime.initFleetParallelism(...args);
  const initMonitorConfigControls = (...args) => runtime.initMonitorConfigControls(...args);
  const initRobotTerminal = (...args) => runtime.initRobotTerminal(...args);
  const initThemeControls = (...args) => runtime.initThemeControls(...args);
  const invalidateCountdownNodeCache = (...args) => runtime.invalidateCountdownNodeCache(...args);
  const isManageViewActive = (...args) => runtime.isManageViewActive(...args);
  const isRobotAutoSearching = (...args) => runtime.isRobotAutoSearching(...args);
  const isRobotBusyForOnlineRefresh = (...args) => runtime.isRobotBusyForOnlineRefresh(...args);
  const isRobotFixing = (...args) => runtime.isRobotFixing(...args);
  const isRobotSearching = (...args) => runtime.isRobotSearching(...args);
  const isRobotSelected = (...args) => runtime.isRobotSelected(...args);
  const isRobotTesting = (...args) => runtime.isRobotTesting(...args);
  const isTopicsMonitorMode = (...args) => runtime.isTopicsMonitorMode(...args);
  const issueSummary = (...args) => runtime.issueSummary(...args);
  const loadFleetRuntimeDelta = (...args) => runtime.loadFleetRuntimeDelta(...args);
  const loadFleetStaticState = (...args) => runtime.loadFleetStaticState(...args);
  const loadMonitorConfig = (...args) => runtime.loadMonitorConfig(...args);
  const loadRobotConfig = (...args) => runtime.loadRobotConfig(...args);
  const loadRobotTypeConfig = (...args) => runtime.loadRobotTypeConfig(...args);
  const loadRobotsFromBackend = (...args) => runtime.loadRobotsFromBackend(...args);
  const mapRobots = (...args) => runtime.mapRobots(...args);
  const mergeRuntimeRobotsIntoList = (...args) => runtime.mergeRuntimeRobotsIntoList(...args);
  const nonBatteryTestEntries = (...args) => runtime.nonBatteryTestEntries(...args);
  const normalizeAutoFixDefinition = (...args) => runtime.normalizeAutoFixDefinition(...args);
  const normalizeBatteryPercentForSort = (...args) => runtime.normalizeBatteryPercentForSort(...args);
  const normalizeBatteryReason = (...args) => runtime.normalizeBatteryReason(...args);
  const normalizeCheckedAtMs = (...args) => runtime.normalizeCheckedAtMs(...args);
  const normalizeCountdownMs = (...args) => runtime.normalizeCountdownMs(...args);
  const normalizeManageTab = (...args) => runtime.normalizeManageTab(...args);
  const normalizePossibleResult = (...args) => runtime.normalizePossibleResult(...args);
  const normalizeRobotActivity = (...args) => runtime.normalizeRobotActivity(...args);
  const normalizeRobotData = (...args) => runtime.normalizeRobotData(...args);
  const normalizeRobotTests = (...args) => runtime.normalizeRobotTests(...args);
  const normalizeRobotTypeConfig = (...args) => runtime.normalizeRobotTypeConfig(...args);
  const normalizeRuntimeRobotEntry = (...args) => runtime.normalizeRuntimeRobotEntry(...args);
  const normalizeRuntimeTestUpdate = (...args) => runtime.normalizeRuntimeTestUpdate(...args);
  const normalizeStepDebug = (...args) => runtime.normalizeStepDebug(...args);
  const normalizeTestDebugCollection = (...args) => runtime.normalizeTestDebugCollection(...args);
  const normalizeTestDebugResult = (...args) => runtime.normalizeTestDebugResult(...args);
  const normalizeTestDefinition = (...args) => runtime.normalizeTestDefinition(...args);
  const onlineRobotComparator = (...args) => runtime.onlineRobotComparator(...args);
  const openBugReportModal = (...args) => runtime.openBugReportModal(...args);
  const openDetail = (...args) => runtime.openDetail(...args);
  const openTestDebugModal = (...args) => runtime.openTestDebugModal(...args);
  const parseManageRoute = (...args) => runtime.parseManageRoute(...args);
  const patchDetailRuntimeContent = (...args) => runtime.patchDetailRuntimeContent(...args);
  const persistManageTab = (...args) => runtime.persistManageTab(...args);
  const populateAddRobotTypeOptions = (...args) => runtime.populateAddRobotTypeOptions(...args);
  const populateFilters = (...args) => runtime.populateFilters(...args);
  const queryCardByRobotId = (...args) => runtime.queryCardByRobotId(...args);
  const readRobotField = (...args) => runtime.readRobotField(...args);
  const rebuildRobotIndex = (...args) => runtime.rebuildRobotIndex(...args);
  const refreshRobotsFromBackendSnapshot = (...args) => runtime.refreshRobotsFromBackendSnapshot(...args);
  const refreshRuntimeStateFromBackend = (...args) => runtime.refreshRuntimeStateFromBackend(...args);
  const refreshTestingCountdowns = (...args) => runtime.refreshTestingCountdowns(...args);
  const removeRobotIdsFromSelection = (...args) => runtime.removeRobotIdsFromSelection(...args);
  const renderCard = (...args) => runtime.renderCard(...args);
  const renderDashboard = (...args) => runtime.renderDashboard(...args);
  const renderDetail = (...args) => runtime.renderDetail(...args);
  const renderFixModeActionsForContext = (...args) => runtime.renderFixModeActionsForContext(...args);
  const resolveManageTab = (...args) => runtime.resolveManageTab(...args);
  const resolveRobotModelUrl = (...args) => runtime.resolveRobotModelUrl(...args);
  const robotId = (...args) => runtime.robotId(...args);
  const robotModelMarkup = (...args) => runtime.robotModelMarkup(...args);
  const routeFromHash = (...args) => runtime.routeFromHash(...args);
  const runAutoFixCandidate = (...args) => runtime.runAutoFixCandidate(...args);
  const runAutoFixForRobot = (...args) => runtime.runAutoFixForRobot(...args);
  const runFallbackChecks = (...args) => runtime.runFallbackChecks(...args);
  const runFallbackCommandSimulation = (...args) => runtime.runFallbackCommandSimulation(...args);
  const runManualTests = (...args) => runtime.runManualTests(...args);
  const runOneRobotOnlineCheck = (...args) => runtime.runOneRobotOnlineCheck(...args);
  const runOnlineCheckForAllRobots = (...args) => runtime.runOnlineCheckForAllRobots(...args);
  const runRobotTestsForRobot = (...args) => runtime.runRobotTestsForRobot(...args);
  const runtimeActivityHasSignal = (...args) => runtime.runtimeActivityHasSignal(...args);
  const scheduleMonitorParallelismSync = (...args) => runtime.scheduleMonitorParallelismSync(...args);
  const selectAllOfflineRobots = (...args) => runtime.selectAllOfflineRobots(...args);
  const selectAllOnlineRobots = (...args) => runtime.selectAllOnlineRobots(...args);
  const selectAllRobots = (...args) => runtime.selectAllRobots(...args);
  const selectRobotIds = (...args) => runtime.selectRobotIds(...args);
  const setAddRobotMessage = (...args) => runtime.setAddRobotMessage(...args);
  const setAddRobotPasswordVisibility = (...args) => runtime.setAddRobotPasswordVisibility(...args);
  const setBugReportStatus = (...args) => runtime.setBugReportStatus(...args);
  const setFixModeStatus = (...args) => runtime.setFixModeStatus(...args);
  const setFleetOnlineButtonIdleLabel = (...args) => runtime.setFleetOnlineButtonIdleLabel(...args);
  const setFleetOnlineButtonState = (...args) => runtime.setFleetOnlineButtonState(...args);
  const setFleetParallelism = (...args) => runtime.setFleetParallelism(...args);
  const setLocationHash = (...args) => runtime.setLocationHash(...args);
  const setModelContainerFaultClasses = (...args) => runtime.setModelContainerFaultClasses(...args);
  const setMonitorConfigStatus = (...args) => runtime.setMonitorConfigStatus(...args);
  const setRecorderTerminalActive = (...args) => runtime.setRecorderTerminalActive(...args);
  const setRobotFixing = (...args) => runtime.setRobotFixing(...args);
  const setRobotSearching = (...args) => runtime.setRobotSearching(...args);
  const setRobotSearchingBulk = (...args) => runtime.setRobotSearchingBulk(...args);
  const setRobotSelection = (...args) => runtime.setRobotSelection(...args);
  const setRobotTesting = (...args) => runtime.setRobotTesting(...args);
  const setRobotTypeDefinitions = (...args) => runtime.setRobotTypeDefinitions(...args);
  const setRobots = (...args) => runtime.setRobots(...args);
  const setRunningButtonState = (...args) => runtime.setRunningButtonState(...args);
  const setTerminalActive = (...args) => runtime.setTerminalActive(...args);
  const setTerminalInactive = (...args) => runtime.setTerminalInactive(...args);
  const shouldUseCompactAutoSearchIndicator = (...args) => runtime.shouldUseCompactAutoSearchIndicator(...args);
  const showAddRobotPage = (...args) => runtime.showAddRobotPage(...args);
  const showDashboard = (...args) => runtime.showDashboard(...args);
  const sortOnlineRobots = (...args) => runtime.sortOnlineRobots(...args);
  const startOnlineRefreshStatusTimer = (...args) => runtime.startOnlineRefreshStatusTimer(...args);
  const startRuntimeStateSync = (...args) => runtime.startRuntimeStateSync(...args);
  const startTestingCountdowns = (...args) => runtime.startTestingCountdowns(...args);
  const statusChip = (...args) => runtime.statusChip(...args);
  const statusFromScore = (...args) => runtime.statusFromScore(...args);
  const statusSortRank = (...args) => runtime.statusSortRank(...args);
  const stopOnlineRefreshStatusTimer = (...args) => runtime.stopOnlineRefreshStatusTimer(...args);
  const stopRuntimeStateSync = (...args) => runtime.stopRuntimeStateSync(...args);
  const stopTestingCountdowns = (...args) => runtime.stopTestingCountdowns(...args);
  const submitBugReport = (...args) => runtime.submitBugReport(...args);
  const syncAutoMonitorRefreshState = (...args) => runtime.syncAutoMonitorRefreshState(...args);
  const syncAutomatedRobotActivityFromState = (...args) => runtime.syncAutomatedRobotActivityFromState(...args);
  const syncFixModePanels = (...args) => runtime.syncFixModePanels(...args);
  const syncFixModeToggleButton = (...args) => runtime.syncFixModeToggleButton(...args);
  const syncFleetParallelismUi = (...args) => runtime.syncFleetParallelismUi(...args);
  const syncGlobalSelectionButton = (...args) => runtime.syncGlobalSelectionButton(...args);
  const syncModalScrollLock = (...args) => runtime.syncModalScrollLock(...args);
  const syncModelViewerRotationForContainer = (...args) => runtime.syncModelViewerRotationForContainer(...args);
  const syncMonitorConfigUi = (...args) => runtime.syncMonitorConfigUi(...args);
  const syncMonitorParallelismWithFleet = (...args) => runtime.syncMonitorParallelismWithFleet(...args);
  const syncOnlineSortButton = (...args) => runtime.syncOnlineSortButton(...args);
  const syncRecorderReadPopoverVisibility = (...args) => runtime.syncRecorderReadPopoverVisibility(...args);
  const syncRunSelectedButtonLabel = (...args) => runtime.syncRunSelectedButtonLabel(...args);
  const syncSectionToggleButtons = (...args) => runtime.syncSectionToggleButtons(...args);
  const syncSelectionUi = (...args) => runtime.syncSelectionUi(...args);
  const toggleFixMode = (...args) => runtime.toggleFixMode(...args);
  const updateCardRuntimeContent = (...args) => runtime.updateCardRuntimeContent(...args);
  const updateFleetOnlineRefreshStatus = (...args) => runtime.updateFleetOnlineRefreshStatus(...args);
  const updateFleetOnlineSummary = (...args) => runtime.updateFleetOnlineSummary(...args);
  const updateKPIs = (...args) => runtime.updateKPIs(...args);
  const updateOnlineCheckEstimateFromResults = (...args) => runtime.updateOnlineCheckEstimateFromResults(...args);
  const updateRobotTestState = (...args) => runtime.updateRobotTestState(...args);
  const updateSelectionSummary = (...args) => runtime.updateSelectionSummary(...args);

  function setManageTabStatus(message = '', tone = '') {
        if (!manageTabStatus) return;
        manageTabStatus.textContent = message;
        manageTabStatus.classList.remove('ok', 'warn', 'error');
        if (tone) {
          manageTabStatus.classList.add(tone);
        }
      }

  function setManageEditorStatus(element, message = '', tone = '') {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('ok', 'warn', 'error');
        if (tone) {
          element.classList.add(tone);
        }
      }

  function normalizeDefinitionsSummary(payload) {
        const safe = payload && typeof payload === 'object' ? payload : {};
        return {
          commandPrimitives: Array.isArray(safe.commandPrimitives) ? safe.commandPrimitives : [],
          tests: Array.isArray(safe.tests) ? safe.tests : [],
          checks: Array.isArray(safe.checks) ? safe.checks : [],
          fixes: Array.isArray(safe.fixes) ? safe.fixes : [],
          robotTypes: Array.isArray(safe.robotTypes) ? safe.robotTypes : [],
        };
      }

  function normalizeIdList(values) {
        const list = Array.isArray(values) ? values : [];
        const seen = new Set();
        const out = [];
        list.forEach((item) => {
          const normalized = normalizeText(item, '');
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          out.push(normalized);
        });
      return out;
      }

  function resolveCheckRunAtConnection(check, fallback = true) {
        if (typeof check?.runAtConnection === 'boolean') {
          return check.runAtConnection;
        }
        if (typeof check?.metadata?.runAtConnection === 'boolean') {
          return check.metadata.runAtConnection;
        }
        return Boolean(fallback);
      }

  function applyRunAtConnection(entries, runAtConnection) {
        const list = Array.isArray(entries) ? entries : [];
        const value = Boolean(runAtConnection);
        return list.map((entry) => ({
          ...(entry && typeof entry === 'object' ? entry : {}),
          runAtConnection: value,
        }));
      }

  function inferUniformRunAtConnection(entries, fallback = true) {
        const list = Array.isArray(entries) ? entries : [];
        if (!list.length) return Boolean(fallback);
        const values = list.map((entry) => resolveCheckRunAtConnection(entry, fallback));
        const first = values[0];
        const mixed = values.some((value) => value !== first);
        if (mixed) return null;
        return first;
      }

  function getManageTestRunAtConnectionValue() {
        return Boolean(manageTestRunAtConnectionInput?.checked);
      }

  function getRecorderRunAtConnectionDefault() {
        return Boolean(recorderRunAtConnectionInput?.checked);
      }

  function slugifyRecorderValue(value, fallback = '') {
        const slug = normalizeText(value, '')
          .toLowerCase()
          .replace(/[^a-z0-9_.-]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return slug || fallback;
      }

  function setRecorderLlmStatus(element, message = '', tone = '') {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('ok', 'warn', 'error');
        if (tone) {
          element.classList.add(tone);
        }
      }

  function resetRecorderLlmImportState({ clearInput = false } = {}) {
        recorderLlmImportedDefinition = null;
        state.recorderSimpleImportValidated = null;
        if (clearInput && recorderLlmImportInput) {
          recorderLlmImportInput.value = '';
        }
        if (recorderLlmImportLoadButton) {
          recorderLlmImportLoadButton.disabled = true;
        }
        setRecorderLlmStatus(recorderLlmImportStatus, '', '');
      }

  function normalizeRecorderMode(mode = '') {
        const normalized = normalizeText(mode, '').toLowerCase();
        return normalized === 'simple' || normalized === 'advanced' ? normalized : '';
      }

  function normalizeRecorderSimpleStep(step = '') {
        const normalized = normalizeText(step, '').toLowerCase();
        return RECORDER_SIMPLE_STEPS.includes(normalized) ? normalized : 'terminal';
      }

  function getRecorderDraftContext() {
        const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
        return state.workflowRecorder?.exportDraftContext?.(definitionId) || {
          started: false,
          publishReady: false,
          definitionId,
          outputCount: 0,
          writeCount: 0,
          readCount: 0,
          outputs: [],
          execute: [],
          checks: [],
          blockingIssues: [],
        };
      }

  function hasRecorderPreviewableDraft() {
        const draft = getRecorderDraftContext();
        return Boolean(
          draft.started
          && (draft.outputCount > 0 || draft.writeCount > 0 || draft.readCount > 0),
        );
      }

  function buildRecorderPreview(target) {
        if (!target) return;
        target.replaceChildren();
        const draft = getRecorderDraftContext();
        if (!draft.started) {
          const empty = document.createElement('div');
          empty.className = 'manage-list-empty';
          empty.textContent = 'No recorder draft yet.';
          target.appendChild(empty);
          return;
        }

        const header = document.createElement('div');
        header.className = 'recorder-preview-header';
        const title = document.createElement('h3');
        title.className = 'recorder-preview-title';
        title.textContent = draft.definitionId || 'Draft preview';
        const meta = document.createElement('p');
        meta.className = 'recorder-preview-copy';
        meta.textContent = `${draft.writeCount} write block${draft.writeCount === 1 ? '' : 's'}, ${draft.readCount} read block${draft.readCount === 1 ? '' : 's'}, ${draft.outputCount} output${draft.outputCount === 1 ? '' : 's'}`;
        header.append(title, meta);
        target.appendChild(header);

        const sections = [
          {
            titleText: 'Outputs',
            rows: draft.outputs.map((output) => `${output.label} (${output.key}) · ${output.readBlockCount} read block${output.readBlockCount === 1 ? '' : 's'}`),
          },
          {
            titleText: 'Execute',
            rows: draft.execute.map((step) => `${step.order}. ${step.command} → ${step.saveAs}`),
          },
          {
            titleText: 'Checks',
            rows: draft.checks.map((check) => {
              const readRules = Array.isArray(check.read) ? check.read : [];
              return `${check.label} (${check.outputKey}) · ${readRules.length} rule${readRules.length === 1 ? '' : 's'}`;
            }),
          },
        ];

        sections.forEach((sectionData) => {
          const section = document.createElement('section');
          section.className = 'recorder-preview-section';
          const sectionTitle = document.createElement('h4');
          sectionTitle.className = 'recorder-preview-section-title';
          sectionTitle.textContent = sectionData.titleText;
          section.appendChild(sectionTitle);
          if (!sectionData.rows.length) {
            const empty = document.createElement('div');
            empty.className = 'recorder-preview-empty';
            empty.textContent = `No ${sectionData.titleText.toLowerCase()} yet.`;
            section.appendChild(empty);
          } else {
            const list = document.createElement('div');
            list.className = 'recorder-preview-list';
            sectionData.rows.forEach((rowText) => {
              const row = document.createElement('div');
              row.className = 'recorder-preview-row';
              row.textContent = rowText;
              list.appendChild(row);
            });
            section.appendChild(list);
          }
          target.appendChild(section);
        });

        const issuesSection = document.createElement('section');
        issuesSection.className = 'recorder-preview-section';
        const issuesTitle = document.createElement('h4');
        issuesTitle.className = 'recorder-preview-section-title';
        issuesTitle.textContent = 'Blocking Issues';
        issuesSection.appendChild(issuesTitle);
        const issues = Array.isArray(draft.blockingIssues) ? draft.blockingIssues : [];
        if (!issues.length) {
          const ok = document.createElement('div');
          ok.className = 'recorder-preview-empty ok';
          ok.textContent = 'No blocking issues.';
          issuesSection.appendChild(ok);
        } else {
          const list = document.createElement('div');
          list.className = 'recorder-preview-list';
          issues.forEach((issue) => {
            const row = document.createElement('div');
            row.className = 'recorder-preview-row recorder-preview-row-error';
            row.textContent = issue;
            list.appendChild(row);
          });
          issuesSection.appendChild(list);
        }
        target.appendChild(issuesSection);
      }

  function renderRecorderPreviews() {
        buildRecorderPreview(recorderAdvancedPreview);
        buildRecorderPreview(recorderSimplePreview);
      }

  function setRecorderSimpleStep(step = 'terminal', { focus = false } = {}) {
        state.recorderSimpleStep = normalizeRecorderSimpleStep(step);
        syncRecorderUiState();
        if (focus) {
          const headings = {
            'select-robot': recorderSimpleSelectRobotStep?.querySelector?.('h2'),
            terminal: recorderSimpleTerminalStep?.querySelector?.('h2'),
            prompt: recorderSimplePromptStep?.querySelector?.('h2'),
            import: recorderSimpleImportStep?.querySelector?.('h2'),
            preview: recorderSimplePreviewStep?.querySelector?.('h2'),
            publish: recorderAssignmentPanel?.querySelector?.('h3'),
          };
          headings[state.recorderSimpleStep]?.focus?.();
        }
      }

  function setRecorderMode(mode = '', { preserveDraft = true, targetStep = '' } = {}) {
        const normalizedMode = normalizeRecorderMode(mode);
        state.recorderMode = normalizedMode;
        if (!normalizedMode) {
          syncRecorderUiState();
          return;
        }
        if (normalizedMode === 'simple') {
          state.recorderSimpleStep = normalizeRecorderSimpleStep(
            targetStep || (hasRecorderPreviewableDraft() ? 'preview' : 'select-robot'),
          );
        }
        if (normalizedMode === 'advanced') {
          if (!preserveDraft || !state.workflowRecorder?.started) {
            startNewTestDraft();
            return;
          }
        }
        syncRecorderUiState();
      }

  function resetRecorderTestEntry({ target = 'mode-selector' } = {}) {
        const normalizedTarget = target === 'simple-start' ? 'simple-start' : 'mode-selector';
        setFlowEditorMode('test', { announce: false });
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        state.workflowRecorder?.reset?.();
        state.workflowRecorder?.setStatus?.('', '');
        state.workflowRecorder?.setPublishStatus?.('', '');
        state.recorderTerminalComponent?.dispose?.();
        if (recorderRobotSelect) {
          recorderRobotSelect.value = '';
        }
        if (recorderDefinitionIdInput) {
          recorderDefinitionIdInput.value = '';
        }
        if (recorderDefinitionLabelInput) {
          recorderDefinitionLabelInput.value = '';
        }
        if (recorderRunAtConnectionInput) {
          recorderRunAtConnectionInput.checked = true;
        }
        clearRecorderOutputForm();
        clearRecorderReadForm();
        clearCheckedMappings(recorderRobotTypeTargets);
        renderRecorderRobotTypeTargets();
        setRecorderLlmHelpExpanded(false);
        closeRecorderLlmPromptModal({ preserveFields: false });
        closeRecorderLlmImportModal({ preserveInput: false });
        if (recorderLlmPromptPreview) recorderLlmPromptPreview.value = '';
        if (recorderLlmSystemDetailsInput) recorderLlmSystemDetailsInput.value = '';
        if (recorderLlmTestRequestInput) recorderLlmTestRequestInput.value = '';
        if (recorderSimpleTranscriptAcknowledge) recorderSimpleTranscriptAcknowledge.checked = false;
        state.recorderSimplePromptBundle = '';
        state.recorderSimpleImportValidated = null;
        if (normalizedTarget === 'simple-start') {
          state.recorderMode = 'simple';
          state.recorderSimpleStep = 'select-robot';
          setManageTabStatus('Test editor reset. Select a robot to start again.', 'ok');
        } else {
          state.recorderMode = '';
          state.recorderSimpleStep = 'select-robot';
          setManageTabStatus('Recorder reset. Choose a mode to start again.', 'ok');
        }
        syncRecorderUiState();
      }

  function setRecorderLlmModalVisibility(modal, open, stateKey) {
        if (!modal) return;
        modal.classList.toggle('hidden', !open);
        modal.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (stateKey) {
          state[stateKey] = Boolean(open);
        }
        syncModalScrollLock();
      }

  function closeRecorderLlmPromptModal({ preserveFields = true } = {}) {
        setRecorderLlmModalVisibility(recorderLlmPromptModal, false, 'isRecorderLlmPromptModalOpen');
        setRecorderLlmStatus(recorderLlmPromptStatus, '', '');
        if (!preserveFields) {
          if (recorderLlmSystemDetailsInput) recorderLlmSystemDetailsInput.value = '';
          if (recorderLlmTestRequestInput) recorderLlmTestRequestInput.value = '';
          if (recorderLlmPromptPreview) recorderLlmPromptPreview.value = '';
          state.recorderSimplePromptBundle = '';
        }
      }

  function closeRecorderLlmImportModal({ preserveInput = true } = {}) {
        setRecorderLlmModalVisibility(recorderLlmImportModal, false, 'isRecorderLlmImportModalOpen');
        if (!preserveInput) {
          resetRecorderLlmImportState({ clearInput: true });
        } else {
          if (recorderLlmImportLoadButton) {
            recorderLlmImportLoadButton.disabled = !recorderLlmImportedDefinition;
          }
        }
      }

  function setRecorderLlmHelpExpanded(expanded) {
        const open = Boolean(expanded);
        if (recorderAskLlmHelpButton) {
          recorderAskLlmHelpButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (recorderLlmHelpPanel) {
          recorderLlmHelpPanel.classList.toggle('hidden', !open);
          recorderLlmHelpPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
      }

  function toggleRecorderLlmHelp() {
        const expanded = recorderAskLlmHelpButton?.getAttribute('aria-expanded') === 'true';
        setRecorderLlmHelpExpanded(!expanded);
      }

  function buildRecorderLlmRobotContext() {
        const robotIdValue = normalizeText(recorderRobotSelect?.value, '');
        const robot = state.robots.find((entry) => normalizeText(entry?.id, '') === robotIdValue);
        return {
          id: robotIdValue,
          name: normalizeText(robot?.name, robotIdValue),
          typeId: normalizeText(robot?.typeId ?? robot?.type, ''),
        };
      }

  function buildRecorderLlmDefinitionContext() {
        return {
          id: normalizeText(recorderDefinitionIdInput?.value, ''),
          label: normalizeText(recorderDefinitionLabelInput?.value, ''),
          runAtConnectionDefault: getRecorderRunAtConnectionDefault(),
          mappedRobotTypeIds: getSelectedRecorderTypeIds(),
        };
      }

  function getRecorderTerminalTranscript() {
        return normalizeText(state.recorderTerminalComponent?.exportTranscript?.(), '');
      }

  function buildRecorderLlmPromptPayload({ systemDetails, userRequest, transcript }) {
        const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
        const draftContext = state.workflowRecorder?.exportDraftContext?.(definitionId) || {
          started: false,
          publishReady: false,
          definitionId,
          outputCount: 0,
          writeCount: 0,
          readCount: 0,
          outputs: [],
          execute: [],
          checks: [],
          blockingIssues: [],
        };
        return renderRecorderLlmPromptTemplate({
          selectedRobot: buildRecorderLlmRobotContext(),
          currentDefinition: buildRecorderLlmDefinitionContext(),
          currentRecorderDraft: draftContext,
          recorderTerminalTranscript: transcript,
          userSystemDetails: systemDetails,
          userTestRequest: userRequest,
        });
      }

  function getRecorderLlmPromptBuildResult() {
        const transcript = getRecorderTerminalTranscript();
        const allowEmptyTranscript = Boolean(recorderSimpleTranscriptAcknowledge?.checked);
        if (!transcript && !allowEmptyTranscript) {
          return {
            ok: false,
            error: 'Recorder terminal transcript is required. Run or rebuild the visible recorder terminal session first.',
          };
        }
        const systemDetails = normalizeText(recorderLlmSystemDetailsInput?.value, '');
        if (!systemDetails) {
          return {
            ok: false,
            error: 'System / stack details are required.',
          };
        }
        const userRequest = normalizeText(recorderLlmTestRequestInput?.value, '');
        if (!userRequest) {
          return {
            ok: false,
            error: 'What do you want to test? is required.',
          };
        }
        const payload = buildRecorderLlmPromptPayload({ systemDetails, userRequest, transcript });
        return {
          ok: true,
          payload,
          promptText: JSON.stringify(payload, null, 2),
        };
      }

  function refreshRecorderLlmPromptPreview() {
        const result = getRecorderLlmPromptBuildResult();
        if (recorderLlmPromptPreview) {
          recorderLlmPromptPreview.value = result.ok ? result.promptText : '';
        }
        state.recorderSimplePromptBundle = result.ok ? result.promptText : '';
        setRecorderLlmStatus(
          recorderLlmPromptStatus,
          result.ok ? 'Prompt bundle ready.' : result.error,
          result.ok ? 'ok' : 'warn',
        );
        syncRecorderUiState();
        return result;
      }

  async function copyRecorderLlmPrompt() {
        const result = refreshRecorderLlmPromptPreview();
        if (!result.ok) {
          return false;
        }
        const clipboard = window?.navigator?.clipboard;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
          setRecorderLlmStatus(recorderLlmPromptStatus, 'Clipboard access is unavailable in this browser.', 'error');
          return false;
        }
        try {
          await clipboard.writeText(result.promptText);
          setRecorderLlmStatus(recorderLlmPromptStatus, 'Prompt bundle copied to clipboard.', 'ok');
          return true;
        } catch (error) {
          setRecorderLlmStatus(
            recorderLlmPromptStatus,
            `Clipboard copy failed: ${error instanceof Error ? error.message : String(error)}`,
            'error',
          );
          return false;
        }
      }

  function openRecorderLlmPromptModal() {
        setRecorderMode('simple', { targetStep: 'prompt' });
        refreshRecorderLlmPromptPreview();
        recorderLlmSystemDetailsInput?.focus?.();
      }

  function stripRecorderLlmJsonWrapperNoise(rawValue) {
        let text = String(rawValue ?? '').trim();
        const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        if (fenced) {
          text = fenced[1].trim();
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          const wrapped = text.slice(firstBrace, lastBrace + 1).trim();
          if (wrapped.startsWith('{') && wrapped.endsWith('}')) {
            text = wrapped;
          }
        }
        return text;
      }

  function parseRecorderLlmImportPayload(rawValue) {
        const stripped = stripRecorderLlmJsonWrapperNoise(rawValue);
        if (!stripped) {
          throw new Error('Paste the external LLM JSON result first.');
        }
        let parsed;
        try {
          parsed = JSON.parse(stripped);
        } catch (error) {
          throw new Error(`LLM result is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('LLM result must be a JSON object.');
        }
        return parsed;
      }

  function validateRecorderReadSpec(readSpec, contextLabel = 'check') {
        if (!readSpec || typeof readSpec !== 'object' || Array.isArray(readSpec)) {
          throw new Error(`${contextLabel} must define a read object.`);
        }
        const kind = normalizeText(readSpec.kind, '').toLowerCase();
        if (!RECORDER_LLM_ALLOWED_READ_KINDS.has(kind)) {
          throw new Error(`${contextLabel} uses unsupported read kind '${kind || 'unknown'}'.`);
        }
        if (kind === 'all_of') {
          const rules = Array.isArray(readSpec.rules) ? readSpec.rules : [];
          if (!rules.length) {
            throw new Error(`${contextLabel} kind 'all_of' must define non-empty rules[].`);
          }
          return {
            ...readSpec,
            kind,
            rules: rules.map((rule, index) => {
              const validatedRule = validateRecorderReadSpec(rule, `${contextLabel} rule ${index + 1}`);
              if (!RECORDER_LLM_BASE_READ_KINDS.has(validatedRule.kind)) {
                throw new Error(`${contextLabel} rule ${index + 1} must use a base read kind.`);
              }
              return validatedRule;
            }),
          };
        }
        if (!normalizeText(readSpec.inputRef, '')) {
          throw new Error(`${contextLabel} read.${kind} must define inputRef.`);
        }
        if (kind === 'contains_string' && !normalizeText(readSpec.needle, '')) {
          throw new Error(`${contextLabel} read.contains_string must define needle.`);
        }
        if (kind === 'contains_any_string') {
          const needles = Array.isArray(readSpec.needles) ? readSpec.needles.map((item) => normalizeText(item, '')).filter(Boolean) : [];
          if (!needles.length) {
            throw new Error(`${contextLabel} read.contains_any_string must define non-empty needles[].`);
          }
        }
        if (kind === 'contains_lines_unordered') {
          const lines = Array.isArray(readSpec.lines) ? readSpec.lines.map((item) => normalizeText(item, '')).filter(Boolean) : [];
          if (!lines.length) {
            throw new Error(`${contextLabel} read.contains_lines_unordered must define non-empty lines[].`);
          }
        }
        return {
          ...readSpec,
          kind,
        };
      }

  function validateRecorderImportedDefinition(rawDefinition) {
        const definition = rawDefinition && typeof rawDefinition === 'object' ? rawDefinition : {};
        const definitionId = normalizeText(definition.id, '');
        if (!definitionId) {
          throw new Error('Imported definition must define a top-level id.');
        }
        const label = normalizeText(definition.label, '');
        if (!label) {
          throw new Error('Imported definition must define a top-level label.');
        }
        const mode = normalizeText(definition.mode, '').toLowerCase();
        if (mode !== 'orchestrate') {
          throw new Error(`Imported definition mode must be 'orchestrate', received '${mode || 'unknown'}'.`);
        }
        const execute = Array.isArray(definition.execute) ? definition.execute : [];
        if (!execute.length) {
          throw new Error('Imported definition must define non-empty execute[].');
        }
        const normalizedExecute = execute.map((step, index) => {
          if (!step || typeof step !== 'object' || Array.isArray(step)) {
            throw new Error(`execute[${index}] must be an object.`);
          }
          const command = normalizeText(step.command, '');
          if (!command) {
            throw new Error(`execute[${index}] must define command.`);
          }
          return {
            ...step,
            command,
          };
        });
        const checks = Array.isArray(definition.checks) ? definition.checks : [];
        if (!checks.length) {
          throw new Error('Imported definition must define non-empty checks[].');
        }
        const normalizedChecks = checks.map((check, index) => {
          if (!check || typeof check !== 'object' || Array.isArray(check)) {
            throw new Error(`checks[${index}] must be an object.`);
          }
          const checkId = normalizeText(check.id, '');
          if (!checkId) {
            throw new Error(`checks[${index}] must define id.`);
          }
          if (typeof check.runAtConnection !== 'boolean') {
            throw new Error(`checks[${index}] must define a top-level boolean runAtConnection.`);
          }
          if (!check.pass || typeof check.pass !== 'object' || Array.isArray(check.pass)) {
            throw new Error(`checks[${index}] must define a pass object.`);
          }
          if (!check.fail || typeof check.fail !== 'object' || Array.isArray(check.fail)) {
            throw new Error(`checks[${index}] must define a fail object.`);
          }
          return {
            ...check,
            id: checkId,
            read: validateRecorderReadSpec(check.read, `checks[${index}]`),
          };
        });
        const uniformRunAtConnection = inferUniformRunAtConnection(normalizedChecks, true);
        if (uniformRunAtConnection === null) {
          throw new Error('Imported definition checks must share one runAtConnection value.');
        }
        return {
          ...definition,
          id: definitionId,
          label,
          mode: 'orchestrate',
          execute: normalizedExecute,
          checks: normalizedChecks,
        };
      }

  function validateRecorderLlmImportInput() {
        try {
          const parsed = parseRecorderLlmImportPayload(recorderLlmImportInput?.value);
          recorderLlmImportedDefinition = validateRecorderImportedDefinition(parsed);
          state.recorderSimpleImportValidated = recorderLlmImportedDefinition;
          if (recorderLlmImportLoadButton) {
            recorderLlmImportLoadButton.disabled = false;
          }
          setRecorderLlmStatus(recorderLlmImportStatus, 'Valid recorder test JSON. Ready to load.', 'ok');
          syncRecorderUiState();
          return recorderLlmImportedDefinition;
        } catch (error) {
          recorderLlmImportedDefinition = null;
          state.recorderSimpleImportValidated = null;
          if (recorderLlmImportLoadButton) {
            recorderLlmImportLoadButton.disabled = true;
          }
          setRecorderLlmStatus(
            recorderLlmImportStatus,
            error instanceof Error ? error.message : String(error),
            'error',
          );
          syncRecorderUiState();
          return null;
        }
      }

  function openRecorderLlmImportModal() {
        resetRecorderLlmImportState();
        setRecorderMode('simple', { targetStep: 'import' });
        recorderLlmImportInput?.focus?.();
      }

  function loadRecorderLlmImportResult() {
        const definition = recorderLlmImportedDefinition || validateRecorderLlmImportInput();
        if (!definition) return false;
        loadExistingTestIntoRecorder(definition);
        state.recorderSimpleImportValidated = definition;
        state.workflowRecorder?.setPublishStatus?.(
          `Imported '${normalizeText(definition.id, 'definition')}' into the recorder draft. Review before publishing.`,
          'ok',
        );
        setRecorderSimpleStep('preview');
        return true;
      }

  function renderRecorderRobotTypeTargets() {
        if (!recorderRobotTypeTargets) return;
        recorderRobotTypeTargets.replaceChildren();
        const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
          ? state.definitionsSummary.robotTypes
          : [];
        const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
        const normalizedDefinitionId = slugifyRecorderValue(definitionId, '');
        const checkIdPrefix = normalizedDefinitionId ? `${normalizedDefinitionId}__` : '';
        const recorderCheckIdsRaw = state.workflowRecorder?.getCheckIdsForDefinition?.(definitionId);
        const recorderCheckIds = Array.isArray(recorderCheckIdsRaw) ? recorderCheckIdsRaw : [];
        const mappedTypeIds = new Set();
  
        if (checkIdPrefix) {
          robotTypes.forEach((typePayload) => {
            const typeId = normalizeText(typePayload?.id, '');
            if (!typeId) return;
            const testRefs = normalizeIdList(typePayload?.testRefs);
            const isMappedByRef = recorderCheckIds.length
              ? recorderCheckIds.some((checkId) => testRefs.includes(checkId))
              : testRefs.some((ref) => ref.startsWith(checkIdPrefix));
            if (isMappedByRef) {
              mappedTypeIds.add(typeId);
            }
          });
        }
  
        if (!mappedTypeIds.size) {
          const selectedRobotId = normalizeText(recorderRobotSelect?.value, '');
          const selectedRobot = state.robots.find((robot) => robotId(robot) === selectedRobotId);
          const selectedTypeId = normalizeText(selectedRobot?.typeId, '');
          if (selectedTypeId) {
            mappedTypeIds.add(selectedTypeId);
          }
        }
  
        if (!robotTypes.length) {
          const empty = document.createElement('div');
          empty.className = 'manage-list-empty';
          empty.textContent = 'No robot types available.';
          recorderRobotTypeTargets.appendChild(empty);
          return;
        }
        robotTypes.forEach((typePayload) => {
          const typeId = normalizeText(typePayload?.id, '');
          if (!typeId) return;
          const label = normalizeText(typePayload?.name, typeId);
          const row = document.createElement('label');
          row.className = 'recorder-type-option';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = typeId;
          input.checked = mappedTypeIds.has(typeId);
          const text = document.createElement('span');
          text.textContent = label;
          row.append(input, text);
          recorderRobotTypeTargets.appendChild(row);
        });
      }

  function getSelectedRecorderTypeIds() {
        if (!recorderRobotTypeTargets) return [];
        const selected = Array.from(recorderRobotTypeTargets.querySelectorAll('input[type="checkbox"]:checked'));
        return selected
          .map((input) => normalizeText(input?.value, ''))
          .filter(Boolean);
      }

  function renderTestRobotTypeTargets(testId) {
        if (!manageTestRobotTypeTargets) return;
        manageTestRobotTypeTargets.replaceChildren();
        const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
          ? state.definitionsSummary.robotTypes
          : [];
        const testIdKey = normalizeText(testId, '');
        const testDefinition = Array.isArray(state.definitionsSummary?.tests)
          ? state.definitionsSummary.tests.find((item) => normalizeText(item?.id, '') === testIdKey)
          : null;
        const checkIds = Array.isArray(testDefinition?.checks)
          ? testDefinition.checks
            .map((check) => normalizeText(check?.id, ''))
            .filter(Boolean)
          : [];
        const mappingRefs = normalizeIdList([testIdKey, ...checkIds]);
        const legacyPrefix = testIdKey ? `${testIdKey}__` : '';
        
        robotTypes.forEach((typePayload) => {
          const typeId = normalizeText(typePayload?.id, '');
          if (!typeId) return;
          const label = normalizeText(typePayload?.name, typeId);
          const testRefs = normalizeIdList(typePayload?.testRefs);
          const isMapped = mappingRefs.some((ref) => testRefs.includes(ref))
            || (legacyPrefix ? testRefs.some((ref) => ref.startsWith(legacyPrefix)) : false);
  
          const row = document.createElement('label');
          row.className = 'recorder-type-option';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = typeId;
          input.checked = isMapped;
          const text = document.createElement('span');
          text.textContent = label;
          row.append(input, text);
          manageTestRobotTypeTargets.appendChild(row);
        });
      }

  function renderFixRobotTypeTargets(fixId) {
        if (!manageFixRobotTypeTargets) return;
        manageFixRobotTypeTargets.replaceChildren();
        const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
          ? state.definitionsSummary.robotTypes
          : [];
        const fixIdKey = normalizeText(fixId, '');

        if (!robotTypes.length) {
          const empty = document.createElement('div');
          empty.className = 'manage-list-empty';
          empty.textContent = 'No robot types available.';
          manageFixRobotTypeTargets.appendChild(empty);
          return;
        }
        
        robotTypes.forEach((typePayload) => {
          const typeId = normalizeText(typePayload?.id, '');
          if (!typeId) return;
          const label = normalizeText(typePayload?.name, typeId);
          const fixRefs = Array.isArray(typePayload?.fixRefs) ? typePayload.fixRefs : [];
          const isMapped = fixRefs.includes(fixIdKey);
  
          const row = document.createElement('label');
          row.className = 'recorder-type-option';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = typeId;
          input.checked = isMapped;
          const text = document.createElement('span');
          text.textContent = label;
          row.append(input, text);
          manageFixRobotTypeTargets.appendChild(row);
        });
      }

  function ensureFixRobotTypeTargetsRendered({ force = false } = {}) {
        if (!manageFixRobotTypeTargets) return;
        const hasRenderedOptions = manageFixRobotTypeTargets.querySelectorAll('input[type="checkbox"]').length > 0;
        if (hasRenderedOptions && !force) return;
        renderFixRobotTypeTargets(normalizeText(manageFixIdInput?.value, ''));
      }

  function getSelectedMappingTypeIds(container) {
        if (!container) return [];
        const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
        return selected
          .map((input) => normalizeText(input?.value, ''))
          .filter(Boolean);
      }

  function getManageDefinitionsFilter() {
        const value = normalizeText(state.manageDefinitionsFilter, '').toLowerCase();
        return value === 'tests' || value === 'fixes' ? value : 'all';
      }

  function syncManageDefinitionsFilterButtons() {
        const activeFilter = getManageDefinitionsFilter();
        manageDefinitionFilterButtons?.forEach((button) => {
          const value = normalizeText(button?.dataset?.definitionFilter, 'all').toLowerCase();
          button.classList.toggle('active', value === activeFilter);
        });
      }

  function setManageDefinitionsFilter(filter = 'all') {
        const normalized = normalizeText(filter, 'all').toLowerCase();
        state.manageDefinitionsFilter = normalized === 'tests' || normalized === 'fixes' ? normalized : 'all';
        syncManageDefinitionsFilterButtons();
        renderManageDefinitionsList();
      }

  function setFlowEditorMode(mode = 'test', { announce = true } = {}) {
        const normalizedMode = normalizeText(mode, 'test').toLowerCase() === 'fix' ? 'fix' : 'test';
        state.manageFlowEditorMode = normalizedMode;
        manageFlowModeButtons?.forEach((button) => {
          const buttonMode = normalizeText(button?.dataset?.flowMode, 'test').toLowerCase();
          button.classList.toggle('active', buttonMode === normalizedMode);
        });
        if (manageRecorderTestEditorPanel) {
          manageRecorderTestEditorPanel.classList.toggle('hidden', normalizedMode !== 'test');
          manageRecorderTestEditorPanel.classList.toggle('active', normalizedMode === 'test');
        }
        if (manageRecorderFixEditorPanel) {
          manageRecorderFixEditorPanel.classList.toggle('hidden', normalizedMode !== 'fix');
          manageRecorderFixEditorPanel.classList.toggle('active', normalizedMode === 'fix');
        }
        if (announce) {
          setManageTabStatus(
            normalizedMode === 'fix' ? 'Fix flow editor ready.' : 'Test flow editor ready.',
            'ok',
          );
        }
        if (normalizedMode === 'test') {
          syncRecorderUiState();
        } else {
          setRecorderLlmHelpExpanded(false);
          closeRecorderLlmPromptModal();
          closeRecorderLlmImportModal();
          ensureFixRobotTypeTargetsRendered();
          hideRecorderReadPopover();
        }
      }

  function buildManageDefinitionsListItems() {
        const tests = Array.isArray(state.definitionsSummary?.tests) ? state.definitionsSummary.tests : [];
        const fixes = Array.isArray(state.definitionsSummary?.fixes) ? state.definitionsSummary.fixes : [];
        const items = [
          ...tests.map((definition) => ({ kind: 'test', definition })),
          ...fixes.map((definition) => ({ kind: 'fix', definition })),
        ];
        const activeFilter = getManageDefinitionsFilter();
        const filtered = items.filter((item) => (
          activeFilter === 'all'
            || (activeFilter === 'tests' && item.kind === 'test')
            || (activeFilter === 'fixes' && item.kind === 'fix')
        ));
        return filtered.sort((left, right) => {
          const leftLabel = normalizeText(left?.definition?.label, normalizeText(left?.definition?.id, ''));
          const rightLabel = normalizeText(right?.definition?.label, normalizeText(right?.definition?.id, ''));
          const byLabel = leftLabel.localeCompare(rightLabel);
          if (byLabel !== 0) return byLabel;
          return normalizeText(left?.definition?.id, '').localeCompare(normalizeText(right?.definition?.id, ''));
        });
      }

  function buildManageDefinitionMeta(item) {
        const definition = item?.definition || {};
        if (item?.kind === 'fix') {
          const stepCount = Array.isArray(definition?.execute) ? definition.execute.length : 0;
          const postTests = Array.isArray(definition?.postTestIds) ? definition.postTestIds.length : 0;
          return `${stepCount} step(s) • ${postTests} post-test(s)`;
        }
        const checkCount = Array.isArray(definition?.checks) ? definition.checks.length : 0;
        return `${checkCount} check(s)`;
      }

  function renderManageDefinitionRow(item) {
        const definition = item?.definition || {};
        const id = normalizeText(definition?.id, '');
        if (!id) return null;
        const kind = item?.kind === 'fix' ? 'fix' : 'test';

        const row = document.createElement('div');
        row.className = 'manage-definition-row manage-list-item';

        const summary = document.createElement('div');
        summary.className = 'manage-definition-summary';

        const titleRow = document.createElement('div');
        titleRow.className = 'manage-definition-title-row';

        const typeChip = document.createElement('span');
        typeChip.className = `manage-definition-chip ${kind}`;
        typeChip.textContent = kind === 'fix' ? 'Fix' : 'Test';

        const title = document.createElement('strong');
        title.className = 'manage-definition-title';
        title.textContent = normalizeText(definition?.label, id);

        titleRow.append(typeChip, title);

        const meta = document.createElement('div');
        meta.className = 'manage-definition-meta';
        meta.textContent = `${id} • ${buildManageDefinitionMeta({ kind, definition })}`;

        summary.append(titleRow, meta);

        const actions = document.createElement('div');
        actions.className = 'manage-definition-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'button button-compact';
        editButton.textContent = 'Edit/View';
        editButton.setAttribute('aria-label', `Edit or view ${kind} definition ${id}`);
        editButton.addEventListener('click', () => {
          if (kind === 'fix') {
            loadExistingFixIntoFlow(definition);
          } else {
            loadExistingTestIntoRecorder(definition);
          }
        });

        const duplicateButton = document.createElement('button');
        duplicateButton.type = 'button';
        duplicateButton.className = 'button button-compact';
        duplicateButton.textContent = 'Duplicate';
        duplicateButton.setAttribute('aria-label', `Duplicate ${kind} definition ${id}`);
        duplicateButton.addEventListener('click', () => {
          if (kind === 'fix') {
            duplicateManageFixDefinition(definition);
          } else {
            duplicateManageTestDefinition(definition);
          }
        });

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'button button-compact button-danger';
        removeButton.textContent = 'Remove';
        removeButton.setAttribute('aria-label', `Remove ${kind} definition ${id}`);
        removeButton.addEventListener('click', async () => {
          if (kind === 'fix') {
            await deleteManageFixDefinition(id);
          } else {
            await deleteManageTestDefinition(id);
          }
        });

        actions.append(editButton, duplicateButton, removeButton);
        row.append(summary, actions);
        return row;
      }

  function renderManageDefinitionsList() {
        if (!manageDefinitionsList) return;
        manageDefinitionsList.replaceChildren();
        syncManageDefinitionsFilterButtons();
        const items = buildManageDefinitionsListItems();
        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'manage-list-empty';
          const activeFilter = getManageDefinitionsFilter();
          empty.textContent = activeFilter === 'fixes'
            ? 'No fix definitions found.'
            : activeFilter === 'tests'
              ? 'No test definitions found.'
              : 'No definitions found.';
          manageDefinitionsList.appendChild(empty);
          return;
        }
        items.forEach((item) => {
          const row = renderManageDefinitionRow(item);
          if (row) manageDefinitionsList.appendChild(row);
        });
      }

  function renderManageTestsList() {
        renderManageDefinitionsList();
      }

  function renderManageFixesList() {
        renderManageDefinitionsList();
      }

  function renderRecorderRobotOptions() {
        if (!recorderRobotSelect) return;
        const previousValue = normalizeText(recorderRobotSelect.value, '');
        recorderRobotSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select robot';
        recorderRobotSelect.appendChild(placeholder);
        state.robots.forEach((robot) => {
          const id = normalizeText(robot?.id, '');
          if (!id) return;
          const option = document.createElement('option');
          option.value = id;
          option.textContent = `${normalizeText(robot?.name, id)} (${id})`;
          recorderRobotSelect.appendChild(option);
        });
        if (previousValue) {
          recorderRobotSelect.value = previousValue;
        }
        syncRecorderUiState();
      }

  function renderManageDefinitions() {
        renderManageDefinitionsList();
        renderRecorderRobotTypeTargets();
        renderRecorderRobotOptions();
        if (manageTestRunAtConnectionInput) {
          manageTestRunAtConnectionInput.checked = Boolean(manageTestRunAtConnectionInput.checked);
        }
        if (recorderRunAtConnectionInput) {
          recorderRunAtConnectionInput.checked = Boolean(recorderRunAtConnectionInput.checked);
        }
        if (manageFixRunAtConnectionInput) {
          manageFixRunAtConnectionInput.checked = Boolean(manageFixRunAtConnectionInput.checked);
        }
        setFlowEditorMode(state.manageFlowEditorMode || 'test', { announce: false });
      }

  async function loadDefinitionsSummary() {
        if (state.isManageSummaryLoading) return;
        state.isManageSummaryLoading = true;
        setManageTabStatus('Loading definitions...', 'warn');
        try {
          const response = await fetch(buildApiUrl('/api/definitions/summary'));
          const raw = await response.text();
          const contentType = normalizeText(response.headers?.get('content-type'), '').toLowerCase();
          const trimmedRaw = raw.trim();
          const appearsJson = trimmedRaw.startsWith('{') || trimmedRaw.startsWith('[');
          const expectsJson = contentType.includes('json');
          const shouldParseJson = expectsJson || appearsJson;
          let payload = {};
          let parseError = null;
          if (raw && shouldParseJson) {
            try {
              payload = JSON.parse(raw);
            } catch (error) {
              parseError = error;
            }
          }
          if (!response.ok) {
            if (shouldParseJson && parseError) {
              throw new Error(`Unable to load definitions summary (HTTP ${response.status}).`);
            }
            const fallback = raw || `Unable to load definitions summary (HTTP ${response.status}).`;
            throw new Error(normalizeText(payload?.detail, fallback));
          }
          if (shouldParseJson && parseError) {
            throw new Error('Definitions summary response could not be parsed as JSON.');
          }
          if (!shouldParseJson && raw) {
            throw new Error('Definitions summary response was not JSON.');
          }
          state.definitionsSummary = normalizeDefinitionsSummary(payload);
          if (state.manageFlowEditorMode === 'fix') {
            ensureFixRobotTypeTargetsRendered({ force: true });
          }
          renderManageDefinitions();
          setManageTabStatus('Definitions loaded.', 'ok');
        } catch (error) {
          setManageTabStatus(
            `Definitions load failed: ${error instanceof Error ? error.message : String(error)}`,
            'error',
          );
        } finally {
          state.isManageSummaryLoading = false;
        }
      }

  function setActiveManageTab(tabId, { syncHash = false, persist = true } = {}) {
        const normalizedTab = resolveManageTab(tabId);
        state.activeManageTab = normalizedTab;
        if (persist) {
          persistManageTab(normalizedTab);
        }
        manageTabButtons.forEach((button) => {
          const tab = normalizeText(button?.dataset?.tab, '');
          const recorderEditorMode = normalizeText(button?.dataset?.recorderEditorMode, '');
          const isRecorderButton = tab === 'recorder' && (recorderEditorMode === 'test' || recorderEditorMode === 'fix');
          const isActive = isRecorderButton
            ? (tab === normalizedTab && recorderEditorMode === normalizeText(state.manageFlowEditorMode, 'test'))
            : tab === normalizedTab;
          button.classList.toggle('active', isActive);
        });
        manageTabPanels.forEach((panel) => {
          const tab = normalizeText(panel?.dataset?.tabPanel, '');
          panel.classList.toggle('active', tab === normalizedTab);
        });
        if (normalizedTab === 'recorder') {
          syncRecorderUiState();
        } else {
          setRecorderLlmHelpExpanded(false);
          closeRecorderLlmPromptModal();
          closeRecorderLlmImportModal();
          hideRecorderReadPopover();
        }
        if (syncHash) {
          setLocationHash(buildManageHash(normalizedTab));
        }
      }

  function parseJsonInput(input, label) {
        const raw = normalizeText(input?.value, '');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            throw new Error(`${label} must be a JSON array.`);
          }
          return parsed;
        } catch (error) {
          throw new Error(
            `${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

  async function saveManageTestDefinition() {
        if (!manageTestIdInput || !manageTestExecuteJsonInput || !manageTestChecksJsonInput) return;
        setManageEditorStatus(manageTestEditorStatus, 'Saving test definition...', 'warn');
        try {
          const testId = normalizeText(manageTestIdInput.value, '');
          if (!testId) {
            throw new Error('Test definition ID is required.');
          }
          const execute = parseJsonInput(manageTestExecuteJsonInput, 'Execute steps');
          const checksInput = parseJsonInput(manageTestChecksJsonInput, 'Checks').map((check) => ({
            ...(check && typeof check === 'object' ? check : {}),
            runAtConnection: resolveCheckRunAtConnection(check, true),
          }));
          const checks = applyRunAtConnection(
            checksInput,
            getManageTestRunAtConnectionValue(),
          );
          const payload = {
            id: testId,
            label: normalizeText(manageTestLabelInput?.value, testId),
            mode: 'orchestrate',
            enabled: true,
            execute,
            checks,
          };
          const response = await fetch(buildApiUrl('/api/definitions/tests'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const raw = await response.text();
          const body = raw ? JSON.parse(raw) : {};
          if (!response.ok) {
            throw new Error(normalizeText(body?.detail, raw || 'Unable to save test definition.'));
          }
  
          const selectedTypeIds = getSelectedMappingTypeIds(manageTestRobotTypeTargets);
          const mappingResult = await updateTestMappings(testId, selectedTypeIds);
          state.definitionsSummary = normalizeDefinitionsSummary(
            mappingResult?.summary || body?.summary || body,
          );
          await loadRobotTypeConfig();
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          setManageEditorStatus(manageTestEditorStatus, `Saved test definition '${testId}' and updated mappings.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Saved test definition '${testId}'.`, 'ok');
          } else {
            setManageTabStatus(
              `Saved test definition '${testId}'. Local robot test mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
              'warn',
            );
          }
        } catch (error) {
          setManageEditorStatus(
            manageTestEditorStatus,
            error instanceof Error ? error.message : String(error),
            'error',
          );
        }
      }

  async function deleteManageTestDefinition(testIdOverride = '') {
        const testId = normalizeText(testIdOverride, '') || normalizeText(manageTestIdInput?.value, '');
        if (!testId) return;
        if (!confirm(`Are you sure you want to delete test definition '${testId}'? This will also remove it from all robot type mappings.`)) {
          return;
        }
        setManageEditorStatus(manageTestEditorStatus, 'Deleting test definition...', 'warn');
        try {
          const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}`), {
            method: 'DELETE',
          });
          const body = await response.json();
          if (!response.ok) {
            throw new Error(body?.detail || 'Unable to delete test definition.');
          }
          state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          const loadedRecorderId = normalizeText(recorderDefinitionIdInput?.value, '');
          if (loadedRecorderId === testId) {
            state.workflowRecorder?.reset?.();
            clearRecorderOutputForm();
            clearRecorderReadForm();
            if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = '';
            if (recorderDefinitionLabelInput) recorderDefinitionLabelInput.value = '';
            renderRecorderRobotTypeTargets();
          }
          if (manageTestIdInput && normalizeText(manageTestIdInput.value, '') === testId) manageTestIdInput.value = '';
          if (manageTestLabelInput) manageTestLabelInput.value = '';
          if (manageTestExecuteJsonInput) manageTestExecuteJsonInput.value = '';
          if (manageTestChecksJsonInput) manageTestChecksJsonInput.value = '';
          if (manageTestRunAtConnectionInput) manageTestRunAtConnectionInput.checked = true;
          if (manageTestRobotTypeTargets) manageTestRobotTypeTargets.replaceChildren();
          if (manageDeleteTestButton) manageDeleteTestButton.style.display = 'none';
          setManageEditorStatus(manageTestEditorStatus, `Deleted test definition '${testId}'.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Deleted test definition '${testId}'.`, 'ok');
          } else {
            setManageTabStatus(
              `Deleted test definition '${testId}'. Local robot test mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
              'warn',
            );
          }
        } catch (error) {
          setManageEditorStatus(
            manageTestEditorStatus,
            error instanceof Error ? error.message : String(error),
            'error',
          );
        }
      }

  async function updateTestMappings(testId, robotTypeIds) {
        const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}/mappings`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robotTypeIds }),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || 'Unable to update test mappings.'));
        }
        return body;
      }

  async function updateFixMappings(fixId, robotTypeIds) {
        const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}/mappings`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robotTypeIds }),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || 'Unable to update fix mappings.'));
        }
        return body;
      }

  async function saveManageFixDefinition() {
        if (!manageFixIdInput || !manageFixExecuteJsonInput) return;
        setManageEditorStatus(manageFixEditorStatus, 'Saving fix definition...', 'warn');
        try {
          const fixId = normalizeText(manageFixIdInput.value, '');
          if (!fixId) {
            throw new Error('Fix ID is required.');
          }
          const execute = parseJsonInput(manageFixExecuteJsonInput, 'Execute steps');
          const postTests = normalizeIdList(
            normalizeText(manageFixPostTestsInput?.value, '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          );
          const payload = {
            id: fixId,
            label: normalizeText(manageFixLabelInput?.value, fixId),
            description: normalizeText(manageFixDescriptionInput?.value, ''),
            enabled: true,
            runAtConnection: Boolean(manageFixRunAtConnectionInput?.checked),
            execute,
            postTestIds: postTests,
          };
          const response = await fetch(buildApiUrl('/api/definitions/fixes'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const raw = await response.text();
          const body = raw ? JSON.parse(raw) : {};
          if (!response.ok) {
            throw new Error(normalizeText(body?.detail, raw || 'Unable to save fix definition.'));
          }
  
          const selectedTypeIds = getSelectedMappingTypeIds(manageFixRobotTypeTargets);
          const mappingResult = await updateFixMappings(fixId, selectedTypeIds);
          state.definitionsSummary = normalizeDefinitionsSummary(
            mappingResult?.summary || body?.summary || body,
          );
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}' and updated mappings.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Saved fix definition '${fixId}'.`, 'ok');
          } else {
            setManageTabStatus(
              `Saved fix definition '${fixId}'. Local robot mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
              'warn',
            );
          }
        } catch (error) {
          setManageEditorStatus(
            manageFixEditorStatus,
            error instanceof Error ? error.message : String(error),
            'error',
          );
        }
      }

  async function deleteManageFixDefinition(fixIdOverride = '') {
        const fixId = normalizeText(fixIdOverride, '') || normalizeText(manageFixIdInput?.value, '');
        if (!fixId) return;
        if (!confirm(`Are you sure you want to delete fix definition '${fixId}'? This will also remove it from all robot type mappings.`)) {
          return;
        }
        setManageEditorStatus(manageFixEditorStatus, 'Deleting fix definition...', 'warn');
        try {
          const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}`), {
            method: 'DELETE',
          });
          const body = await response.json();
          if (!response.ok) {
            throw new Error(body?.detail || 'Unable to delete fix definition.');
          }
          state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          if (manageFixIdInput && normalizeText(manageFixIdInput.value, '') === fixId) manageFixIdInput.value = '';
          if (manageFixLabelInput) manageFixLabelInput.value = '';
          if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
          if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
          if (manageFixPostTestsInput) manageFixPostTestsInput.value = '';
          if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
          if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
          if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
          setManageEditorStatus(manageFixEditorStatus, `Deleted fix definition '${fixId}'.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Deleted fix definition '${fixId}'.`, 'ok');
          } else {
            setManageTabStatus(
              `Deleted fix definition '${fixId}'. Local robot mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
              'warn',
            );
          }
        } catch (error) {
          setManageEditorStatus(
            manageFixEditorStatus,
            error instanceof Error ? error.message : String(error),
            'error',
          );
        }
      }

  async function patchRobotTypeMapping(typeId, testRefs, fixRefs) {
        const payload = {};
        if (Array.isArray(testRefs)) payload.testRefs = normalizeIdList(testRefs);
        if (Array.isArray(fixRefs)) payload.fixRefs = normalizeIdList(fixRefs);
        const response = await fetch(buildApiUrl(`/api/robot-types/${encodeURIComponent(typeId)}/mappings`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || `Unable to patch robot type ${typeId}.`));
        }
        return body;
      }

  async function applyRecorderMappings({ checkIds = [], fixId = '' }) {
        const selectedTypeIds = getSelectedRecorderTypeIds();
        if (!selectedTypeIds.length) return;
        const summaryTypes = Array.isArray(state.definitionsSummary?.robotTypes)
          ? state.definitionsSummary.robotTypes
          : [];
        for (const typeId of selectedTypeIds) {
          const existing = summaryTypes.find((item) => normalizeText(item?.id, '') === typeId) || {};
          const nextTestRefs = normalizeIdList([...(existing.testRefs || []), ...checkIds]);
          const nextFixRefs = fixId
            ? normalizeIdList([...(existing.fixRefs || []), fixId])
            : normalizeIdList(existing.fixRefs || []);
          const patchResult = await patchRobotTypeMapping(typeId, nextTestRefs, nextFixRefs);
          state.definitionsSummary = normalizeDefinitionsSummary(patchResult?.summary || state.definitionsSummary);
        }
      }

  function clearRecorderOutputForm() {
        if (recorderOutputKeyInput) recorderOutputKeyInput.value = '';
        if (recorderOutputLabelInput) recorderOutputLabelInput.value = '';
        if (recorderOutputIconInput) recorderOutputIconInput.value = '';
        if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = '';
        if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = '';
      }

  function clearRecorderReadForm() {
        if (recorderReadOutputKeySelect) recorderReadOutputKeySelect.value = '';
        if (recorderReadInputRefSelect) recorderReadInputRefSelect.value = '';
        if (recorderReadKindSelect) recorderReadKindSelect.value = 'contains_string';
        if (recorderReadNeedleInput) recorderReadNeedleInput.value = '';
        if (recorderReadNeedlesInput) recorderReadNeedlesInput.value = '';
        if (recorderReadLinesInput) recorderReadLinesInput.value = '';
        if (recorderReadRequireAllInput) recorderReadRequireAllInput.checked = true;
        syncRecorderReadKindFields();
      }

  function clearCheckedMappings(container) {
        if (!container) return;
        Array.from(container.querySelectorAll('input[type="checkbox"]')).forEach((input) => {
          input.checked = false;
        });
      }

  function clearManageFixEditor() {
        if (manageFixIdInput) manageFixIdInput.value = '';
        if (manageFixLabelInput) manageFixLabelInput.value = '';
        if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
        if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
        if (manageFixPostTestsInput) manageFixPostTestsInput.value = '';
        if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
        if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
        if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
        setManageEditorStatus(manageFixEditorStatus, '', '');
      }

  function loadExistingTestIntoRecorder(testDefinition) {
        if (!state.workflowRecorder || !testDefinition) return;
        const definitionId = normalizeText(testDefinition?.id, '');
        const definitionLabel = normalizeText(testDefinition?.label, definitionId);
        setFlowEditorMode('test', { announce: false });
        setRecorderLlmHelpExpanded(false);
        resetRecorderLlmImportState();
        state.workflowRecorder.loadTestDefinition(testDefinition);
        clearRecorderOutputForm();
        clearRecorderReadForm();
        if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = definitionId;
        if (recorderDefinitionLabelInput) recorderDefinitionLabelInput.value = definitionLabel;
        if (recorderRunAtConnectionInput) {
          const uniform = inferUniformRunAtConnection(Array.isArray(testDefinition?.checks) ? testDefinition.checks : [], true);
          recorderRunAtConnectionInput.checked = uniform !== null ? uniform : true;
        }
        renderRecorderRobotTypeTargets();
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        if (normalizeRecorderMode(state.recorderMode) === 'simple') {
          state.recorderSimpleImportValidated = testDefinition;
          state.recorderSimpleStep = 'preview';
        } else {
          state.recorderMode = 'advanced';
        }
        syncRecorderUiState();
        state.workflowRecorder.setPublishStatus(
          `Loaded '${definitionId}' into the full flow builder. Outputs and read blocks are now editable.`,
          'ok',
        );
      }

  function loadExistingFixIntoFlow(fixDefinition, { duplicate = false } = {}) {
        if (!fixDefinition) return;
        const sourceId = normalizeText(fixDefinition?.id, '');
        const nextId = duplicate
          ? slugifyRecorderValue(`${sourceId}_copy`, 'copied_fix')
          : sourceId;
        const nextLabel = duplicate
          ? `${normalizeText(fixDefinition?.label, sourceId)} Copy`
          : normalizeText(fixDefinition?.label, sourceId);
        setFlowEditorMode('fix', { announce: false });
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        if (manageFixIdInput) manageFixIdInput.value = nextId;
        if (manageFixLabelInput) manageFixLabelInput.value = nextLabel;
        if (manageFixDescriptionInput) {
          manageFixDescriptionInput.value = normalizeText(fixDefinition?.description, '');
        }
        if (manageFixExecuteJsonInput) {
          const execute = Array.isArray(fixDefinition?.execute) ? fixDefinition.execute : [];
          manageFixExecuteJsonInput.value = JSON.stringify(execute, null, 2);
        }
        if (manageFixPostTestsInput) {
          const postTests = Array.isArray(fixDefinition?.postTestIds) ? fixDefinition.postTestIds : [];
          manageFixPostTestsInput.value = postTests.join(', ');
        }
        if (manageFixRunAtConnectionInput) {
          manageFixRunAtConnectionInput.checked = Boolean(fixDefinition?.runAtConnection);
        }
        renderFixRobotTypeTargets(nextId);
        if (duplicate) {
          clearCheckedMappings(manageFixRobotTypeTargets);
          if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
          setManageEditorStatus(
            manageFixEditorStatus,
            `Duplicated '${sourceId}' into a new fix draft. Review the ID and mappings before saving.`,
            'ok',
          );
          setManageTabStatus(`Duplicating fix '${sourceId}' in the flow editor.`, 'ok');
          return;
        }
        if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'inline-block';
        setManageEditorStatus(manageFixEditorStatus, `Loaded fix definition '${sourceId}'.`, 'ok');
        setManageTabStatus(`Loaded ${sourceId} into the flow editor.`, 'ok');
      }

  function duplicateManageTestDefinition(testDefinition) {
        if (!testDefinition || !state.workflowRecorder) return;
        const sourceId = normalizeText(testDefinition?.id, '');
        const nextId = slugifyRecorderValue(`${sourceId}_copy`, 'copied_test');
        loadExistingTestIntoRecorder(testDefinition);
        if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = nextId;
        if (recorderDefinitionLabelInput) {
          recorderDefinitionLabelInput.value = `${normalizeText(testDefinition?.label, sourceId)} Copy`;
        }
        renderRecorderRobotTypeTargets();
        clearCheckedMappings(recorderRobotTypeTargets);
        state.workflowRecorder.setPublishStatus(
          `Duplicated '${sourceId}' into a new test draft. Review the ID and mappings before publishing.`,
          'ok',
        );
        setManageTabStatus(`Duplicating test '${sourceId}' in the flow editor.`, 'ok');
      }

  function duplicateManageFixDefinition(fixDefinition) {
        loadExistingFixIntoFlow(fixDefinition, { duplicate: true });
      }

  function startNewTestDraft() {
        if (!state.workflowRecorder) return;
        setFlowEditorMode('test', { announce: false });
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        setRecorderLlmHelpExpanded(false);
        closeRecorderLlmPromptModal();
        closeRecorderLlmImportModal({ preserveInput: false });
        state.workflowRecorder.createNewTest();
        clearRecorderOutputForm();
        clearRecorderReadForm();
        const robotIdValue = normalizeText(recorderRobotSelect?.value, '');
        const suggestedId = robotIdValue
          ? slugifyRecorderValue(`${robotIdValue}_flow`, 'recorded_workflow')
          : 'recorded_workflow';
        if (recorderDefinitionIdInput) {
          recorderDefinitionIdInput.value = suggestedId;
        }
        if (recorderDefinitionLabelInput) {
          recorderDefinitionLabelInput.value = robotIdValue ? `Flow workflow (${robotIdValue})` : 'Recorded workflow';
        }
        renderRecorderRobotTypeTargets();
        if (!robotIdValue) {
          clearCheckedMappings(recorderRobotTypeTargets);
        }
        state.recorderMode = normalizeRecorderMode(state.recorderMode) || 'advanced';
        state.recorderSimpleStep = 'select-robot';
        state.recorderSimplePromptBundle = '';
        if (recorderLlmSystemDetailsInput) recorderLlmSystemDetailsInput.value = '';
        if (recorderLlmTestRequestInput) recorderLlmTestRequestInput.value = '';
        if (recorderSimpleTranscriptAcknowledge) recorderSimpleTranscriptAcknowledge.checked = false;
        resetRecorderLlmImportState({ clearInput: true });
        setManageTabStatus('New test draft ready.', 'ok');
      }

  function startNewFixDraft() {
        clearManageFixEditor();
        setRecorderLlmHelpExpanded(false);
        closeRecorderLlmPromptModal();
        closeRecorderLlmImportModal({ preserveInput: false });
        setFlowEditorMode('fix', { announce: false });
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        if (manageFixIdInput) manageFixIdInput.value = 'new_fix';
        if (manageFixLabelInput) manageFixLabelInput.value = 'New Fix';
        renderFixRobotTypeTargets('');
        clearCheckedMappings(manageFixRobotTypeTargets);
        setManageTabStatus('New fix draft ready.', 'ok');
      }

  function syncRecorderReadKindFields() {
        const kind = normalizeText(recorderReadKindSelect?.value, 'contains_string');
        const isString = kind === 'contains_string';
        const isAny = kind === 'contains_any_string';
        const isLines = kind === 'contains_lines_unordered';
        if (recorderReadNeedleInput) recorderReadNeedleInput.disabled = !isString;
        if (recorderReadNeedlesInput) recorderReadNeedlesInput.disabled = !isAny;
        if (recorderReadLinesInput) recorderReadLinesInput.disabled = !isLines;
        if (recorderReadRequireAllInput) recorderReadRequireAllInput.disabled = !isLines;
      }

  function placeRecorderRobotField(target) {
        if (!target || !recorderTopbarRobotWrap || recorderTopbarRobotWrap.parentNode === target) return;
        target.appendChild(recorderTopbarRobotWrap);
      }

  function syncRecorderRobotFieldPlacement(recorderMode, simpleStep) {
        const isSimpleSelectRobotStep = recorderMode === 'simple' && simpleStep === 'select-robot';
        if (isSimpleSelectRobotStep && recorderSimpleSelectRobotField) {
          placeRecorderRobotField(recorderSimpleSelectRobotField);
          return;
        }
        if (recorderSharedTopbarMain) {
          placeRecorderRobotField(recorderSharedTopbarMain);
        }
      }

  function syncRecorderUiState() {
        const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
        const recorder = state.workflowRecorder;
        const recorderState = recorder && typeof recorder.getState === 'function'
          ? recorder.getState(definitionId)
          : {
              started: false,
              writeCount: 0,
              readCount: 0,
              outputCount: 0,
              publishReady: false,
              blockingIssues: [],
              editingOutputKey: '',
              editingReadBlockId: '',
            };
        const recorderMode = normalizeRecorderMode(state.recorderMode);
        const simpleStep = normalizeRecorderSimpleStep(state.recorderSimpleStep);
        const robotSelected = normalizeText(recorderRobotSelect?.value, '') !== '';
        const commandReady = normalizeText(recorderCommandInput?.value, '') !== '';
        const transcriptReady = normalizeText(getRecorderTerminalTranscript(), '') !== '';
        const transcriptBypass = Boolean(recorderSimpleTranscriptAcknowledge?.checked);
        const promptReady = normalizeText(state.recorderSimplePromptBundle, '') !== '';
        const importReady = Boolean(state.recorderSimpleImportValidated);
  
        if (recorderStateBadge) {
          recorderStateBadge.textContent = recorderState.started ? 'Draft active' : 'Draft idle';
          recorderStateBadge.classList.toggle('active', !!recorderState.started);
        }
        if (recorderStepCountBadge) {
          recorderStepCountBadge.textContent = `${Number(recorderState.writeCount || 0)} write block${Number(recorderState.writeCount || 0) === 1 ? '' : 's'}`;
        }
        if (recorderCheckCountBadge) {
          recorderCheckCountBadge.textContent = `${Number(recorderState.readCount || 0)} read block${Number(recorderState.readCount || 0) === 1 ? '' : 's'}`;
        }
        if (recorderOutputCountBadge) {
          recorderOutputCountBadge.textContent = `${Number(recorderState.outputCount || 0)} output${Number(recorderState.outputCount || 0) === 1 ? '' : 's'}`;
        }
  
        if (recorderCreateNewTestButton) {
          applyActionButton(recorderCreateNewTestButton, {
            intent: 'create',
            label: 'Create new test',
          });
        }
        if (recorderRunCaptureButton) {
          recorderRunCaptureButton.disabled = !(recorderState.started && robotSelected && commandReady);
        }
        if (recorderAddOutputBtn) {
          recorderAddOutputBtn.disabled = !recorderState.started;
        }
        if (recorderAddWriteBtn) {
          recorderAddWriteBtn.disabled = !recorderState.started;
        }
        if (recorderAddReadBtn) {
          recorderAddReadBtn.disabled = !(
            recorderState.started
            && Number(recorderState.outputCount || 0) > 0
            && Number(recorderState.writeCount || 0) > 0
          );
        }
        if (recorderPublishTestButton) {
          recorderPublishTestButton.disabled = !recorderState.publishReady;
        }

        if (recorderModeSelector) {
          recorderModeSelector.classList.toggle('hidden', !!recorderMode);
        }
        if (recorderModeBadge) {
          recorderModeBadge.classList.toggle('hidden', !recorderMode);
          recorderModeBadge.textContent = recorderMode ? `${recorderMode[0].toUpperCase()}${recorderMode.slice(1)} mode` : 'Mode not selected';
        }
        if (recorderResetExperienceButton) {
          recorderResetExperienceButton.classList.toggle('hidden', !recorderMode);
        }
        if (recorderChangeModeButton) {
          recorderChangeModeButton.classList.toggle('hidden', !recorderMode);
        }
        if (recorderExperienceShell) {
          recorderExperienceShell.dataset.recorderMode = recorderMode || 'unselected';
          recorderExperienceShell.dataset.recorderSimpleStep = simpleStep;
        }

        syncRecorderRobotFieldPlacement(recorderMode, simpleStep);

        const showSimple = recorderMode === 'simple';
        const showAdvanced = recorderMode === 'advanced';
        const showTopbar = showAdvanced || (showSimple && simpleStep === 'publish');
        if (recorderSharedTopbar) {
          recorderSharedTopbar.classList.toggle('hidden', !showTopbar);
        }
        if (recorderTopbarNewDraftWrap) {
          recorderTopbarNewDraftWrap.classList.toggle('hidden', !showAdvanced);
        }
        if (recorderTopbarRobotWrap) {
          recorderTopbarRobotWrap.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'select-robot')));
        }
        if (recorderTopbarDefinitionWrap) {
          recorderTopbarDefinitionWrap.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'publish')));
        }
        if (recorderTopbarPublishWrap) {
          recorderTopbarPublishWrap.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'publish')));
        }

        if (recorderSimpleSelectRobotStep) {
          recorderSimpleSelectRobotStep.classList.toggle('hidden', !(showSimple && simpleStep === 'select-robot'));
        }
        if (recorderSimpleTerminalStep) {
          recorderSimpleTerminalStep.classList.toggle('hidden', !(showSimple && simpleStep === 'terminal'));
        }
        if (recorderSimplePromptStep) {
          recorderSimplePromptStep.classList.toggle('hidden', !(showSimple && simpleStep === 'prompt'));
        }
        if (recorderSimpleImportStep) {
          recorderSimpleImportStep.classList.toggle('hidden', !(showSimple && simpleStep === 'import'));
        }
        if (recorderSimplePreviewStep) {
          recorderSimplePreviewStep.classList.toggle('hidden', !(showSimple && simpleStep === 'preview'));
        }
        if (recorderSimplePublishStep) {
          recorderSimplePublishStep.classList.toggle('hidden', !(showSimple && simpleStep === 'publish'));
        }
        if (recorderAdvancedWorkspace) {
          recorderAdvancedWorkspace.classList.toggle('hidden', !showAdvanced);
        }
        if (recorderTerminalPanel) {
          recorderTerminalPanel.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'terminal')));
        }
        if (recorderSimpleTerminalActions) {
          recorderSimpleTerminalActions.classList.toggle('hidden', !(showSimple && simpleStep === 'terminal'));
        }
        if (recorderAssignmentPanel) {
          recorderAssignmentPanel.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'publish')));
        }

        if (recorderSimpleTerminalNextButton) {
          recorderSimpleTerminalNextButton.disabled = !(robotSelected && (transcriptReady || transcriptBypass));
        }
        if (recorderSimpleSelectRobotNextButton) {
          recorderSimpleSelectRobotNextButton.disabled = !robotSelected;
        }
        if (recorderGeneratePromptButton) {
          recorderGeneratePromptButton.disabled = false;
        }
        if (recorderSimplePromptNextButton) {
          recorderSimplePromptNextButton.disabled = !promptReady;
        }
        if (recorderLlmCopyPromptButton) {
          recorderLlmCopyPromptButton.disabled = !promptReady;
        }
        if (recorderValidateImportButton) {
          recorderValidateImportButton.disabled = normalizeText(recorderLlmImportInput?.value, '') === '';
        }
        if (recorderSimpleImportNextButton) {
          recorderSimpleImportNextButton.disabled = !importReady;
        }
        if (recorderSimplePreviewNextButton) {
          recorderSimplePreviewNextButton.disabled = !hasRecorderPreviewableDraft();
        }

        renderRecorderPreviews();
  
        if (recorderState.editingOutputKey !== recorderLastEditingOutputKey) {
          recorderLastEditingOutputKey = recorderState.editingOutputKey || '';
          env.recorderLastEditingOutputKey = recorderLastEditingOutputKey;
          if (recorderLastEditingOutputKey) {
            const output = state.workflowRecorder?.getOutput?.(recorderLastEditingOutputKey);
            if (output) {
              if (recorderOutputKeyInput) recorderOutputKeyInput.value = output.key;
              if (recorderOutputLabelInput) recorderOutputLabelInput.value = output.label;
              if (recorderOutputIconInput) recorderOutputIconInput.value = output.icon;
              if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = output.passDetails;
              if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = output.failDetails;
            }
          }
        }
  
        if (recorderState.editingReadBlockId !== recorderLastEditingReadBlockId) {
          recorderLastEditingReadBlockId = recorderState.editingReadBlockId || '';
          env.recorderLastEditingReadBlockId = recorderLastEditingReadBlockId;
          if (recorderLastEditingReadBlockId) {
            const block = state.workflowRecorder?.getReadBlock?.(recorderLastEditingReadBlockId);
            if (block) {
              if (recorderReadOutputKeySelect) recorderReadOutputKeySelect.value = block.outputKey;
              if (recorderReadInputRefSelect) recorderReadInputRefSelect.value = normalizeText(block.read?.inputRef, '');
              if (recorderReadKindSelect) recorderReadKindSelect.value = normalizeText(block.read?.kind, 'contains_string');
              if (recorderReadNeedleInput) recorderReadNeedleInput.value = normalizeText(block.read?.needle, '');
              if (recorderReadNeedlesInput) {
                const needles = Array.isArray(block.read?.needles) ? block.read.needles : [];
                recorderReadNeedlesInput.value = needles.join(',');
              }
              if (recorderReadLinesInput) {
                const lines = Array.isArray(block.read?.lines) ? block.read.lines : [];
                recorderReadLinesInput.value = lines.join('\n');
              }
              if (recorderReadRequireAllInput) {
                recorderReadRequireAllInput.checked = Boolean(block.read?.requireAll ?? true);
              }
            }
          }
        }

        syncRecorderReadKindFields();
        syncRecorderReadPopoverVisibility();
      }

  async function runRecorderCommandAndCapture() {
        if (!state.workflowRecorder) return;
        const robotIdValue = normalizeText(recorderRobotSelect?.value, '');
        const command = normalizeText(recorderCommandInput?.value, '');
        if (!robotIdValue) {
          state.workflowRecorder.setStatus('Select a robot first.', 'error');
          return;
        }
        if (!state.workflowRecorder.started) {
          state.workflowRecorder.setStatus('Click "Create new test" first.', 'warn');
          return;
        }
        if (!command) {
          state.workflowRecorder.setStatus('Command is required.', 'error');
          return;
        }
  
        setRecorderTerminalActive();
        if (recorderRunCaptureButton) {
          recorderRunCaptureButton.disabled = true;
        }
        state.workflowRecorder.setStatus('Running command in SSH session...', 'warn');
        try {
          if (!state.recorderTerminalComponent || state.recorderTerminalComponent.mode !== 'live') {
            const robot = env.ROBOT_TYPES.length ? { id: robotIdValue, name: robotIdValue } : { id: robotIdValue };
            await state.recorderTerminalComponent?.connect(robot);
          }
          
          await state.recorderTerminalComponent?.runCommand(command);
  
          const capturedStep = state.workflowRecorder.addWriteBlock({
            command,
            outputPayload: { stdout: '[Output streaming in terminal session]' },
          });
          
          applyRecorderDefinitionDraftDefaults(robotIdValue, capturedStep);
          if (recorderCommandInput) recorderCommandInput.value = '';
          state.workflowRecorder.setStatus('Write block added. Check terminal for output.', 'ok');
        } catch (error) {
          state.workflowRecorder.setStatus(
            `Run failed: ${error instanceof Error ? error.message : String(error)}`,
            'error',
          );
        } finally {
          if (recorderRunCaptureButton) {
            recorderRunCaptureButton.disabled = false;
          }
          syncRecorderUiState();
        }
      }

  function applyRecorderDefinitionDraftDefaults(robotIdValue, capturedStep) {
        if (recorderDefinitionIdInput && !normalizeText(recorderDefinitionIdInput.value, '')) {
          const suggested = slugifyRecorderValue(
            `${normalizeText(robotIdValue, 'workflow')}_${normalizeText(capturedStep?.id, 'workflow')}`,
            'recorded_workflow',
          );
          recorderDefinitionIdInput.value = suggested;
        }
        if (recorderDefinitionLabelInput && !normalizeText(recorderDefinitionLabelInput.value, '')) {
          recorderDefinitionLabelInput.value = robotIdValue
            ? `Flow workflow (${robotIdValue})`
            : 'Recorded workflow';
        }
      }

  function addRecorderWriteVisual() {
        if (!state.workflowRecorder || !state.workflowRecorder.started) return;
        try {
          const manualCommand = normalizeText(recorderCommandInput?.value, 'echo "New Command"');
          const capturedStep = state.workflowRecorder.addWriteBlock({
            command: manualCommand,
            outputPayload: { stdout: '[Manual write block. Edit command or capture live output later.]' },
          });
          state.workflowRecorder.setWriteEdit?.(capturedStep?.id);
          applyRecorderDefinitionDraftDefaults(normalizeText(recorderRobotSelect?.value, ''), capturedStep);
          if (recorderCommandInput) recorderCommandInput.value = '';
          state.workflowRecorder.setStatus('Write block added. Expand to edit.', 'ok');
        } catch (error) {
          state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
        } finally {
          syncRecorderUiState();
        }
      }

  async function publishRecorderAsTest() {
        if (!state.workflowRecorder) return;
        state.workflowRecorder.setPublishStatus('Publishing test...', 'warn');
        try {
          const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
          const definition = state.workflowRecorder.buildTestDefinition({
            definitionId,
            label: normalizeText(recorderDefinitionLabelInput?.value, ''),
          });
          definition.checks = applyRunAtConnection(
            definition.checks,
            getRecorderRunAtConnectionDefault(),
          );
  
          const response = await fetch(buildApiUrl('/api/definitions/tests'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(definition),
          });
          const raw = await response.text();
          const body = raw ? JSON.parse(raw) : {};
          if (!response.ok) {
            throw new Error(normalizeText(body?.detail, raw || 'Unable to publish test definition.'));
          }
          state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
          await applyRecorderMappings({
            checkIds: state.workflowRecorder.getCheckIdsForDefinition(definitionId),
            fixId: '',
          });
          await loadRobotTypeConfig();
          await refreshRobotsFromBackendSnapshot();
          renderManageDefinitions();
          state.workflowRecorder.setPublishStatus('Test definition published and mapped to selected robot types.', 'ok');
          setManageTabStatus('Recorder test published.', 'ok');
        } catch (error) {
          state.workflowRecorder.setPublishStatus(
            error instanceof Error ? error.message : String(error),
            'error',
          );
        }
      }

  function addRecorderOutputVisual() {
        if (!state.workflowRecorder || !state.workflowRecorder.started) return;
        try {
          const outId = window.prompt("Enter Output Key (e.g. status):");
          if (!outId || !outId.trim()) return;
          state.workflowRecorder.addOrUpdateOutput({
            key: normalizeText(outId, ''),
            label: normalizeText(outId, ''),
            icon: '💾',
            passDetails: 'Passed',
            failDetails: 'Failed',
            runAtConnection: getRecorderRunAtConnectionDefault(),
          });
          state.workflowRecorder.setStatus('Added output block. Expand to edit.', 'ok');
        } catch (error) {
          state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
        }
      }

  function addRecorderReadVisual() {
        if (!state.workflowRecorder || !state.workflowRecorder.started) return;
        try {
          state.workflowRecorder.clearReadEdit();
          const outputs = state.workflowRecorder.getOutputKeys();
          if (!outputs.length) {
            state.workflowRecorder.setStatus('You must create an Output block first.', 'error');
            return;
          }
          const key = outputs[0];
          const latestWrite = state.workflowRecorder.getWriteRefs().pop();
          const ref = latestWrite ? latestWrite.saveAs : '';
          
          state.workflowRecorder.addOrUpdateReadBlock({
            outputKey: key,
            inputRef: ref,
            kind: 'contains_string',
            needle: 'success text',
            needles: '',
            lines: '',
            requireAll: true
          });
          state.workflowRecorder.setStatus('Added read block. Expand to edit.', 'ok');
        } catch (error) {
          state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
        }
      }

  function initManageTabs() {
        manageTabButtons.forEach((button) => {
          button.addEventListener('click', () => {
            const nextTab = normalizeText(button?.dataset?.tab, 'robots');
            const recorderEditorMode = normalizeText(button?.dataset?.recorderEditorMode, '');
            if (nextTab === 'recorder' && recorderEditorMode === 'test') {
              resetRecorderTestEntry({ target: 'mode-selector' });
              return;
            }
            if (nextTab === 'recorder' && recorderEditorMode === 'fix') {
              setFlowEditorMode(recorderEditorMode, { announce: false });
            }
            setActiveManageTab(nextTab, { syncHash: true, persist: true });
          });
        });
        manageDefinitionFilterButtons?.forEach((button) => {
          button.addEventListener('click', () => {
            setManageDefinitionsFilter(normalizeText(button?.dataset?.definitionFilter, 'all'));
          });
        });
        manageFlowModeButtons?.forEach((button) => {
          button.addEventListener('click', () => {
            const mode = normalizeText(button?.dataset?.flowMode, 'test');
            setFlowEditorMode(mode);
            setActiveManageTab('recorder', { syncHash: true, persist: true });
          });
        });
        manageNewTestDefinitionButton?.addEventListener('click', () => {
          startNewTestDraft();
        });
        manageNewFixDefinitionButton?.addEventListener('click', () => {
          startNewFixDraft();
        });
        if (manageTestRunAtConnectionInput) {
          manageTestRunAtConnectionInput.checked = Boolean(manageTestRunAtConnectionInput.checked);
        }
        if (manageFixRunAtConnectionInput) {
          manageFixRunAtConnectionInput.checked = Boolean(manageFixRunAtConnectionInput.checked);
        }
        if (manageDeleteTestButton) {
          manageDeleteTestButton.addEventListener('click', deleteManageTestDefinition);
        }
        if (manageDeleteFixButton) {
          manageDeleteFixButton.addEventListener('click', deleteManageFixDefinition);
        }
      }

  function initWorkflowRecorder() {
        state.workflowRecorder = new WorkflowRecorderComponent({
          terminalOutputEl: null,
          outputsEl: recorderOutputs,
          blocksEl: recorderFlowBlocks,
          writeBlocksEl: recorderWriteBlocks,
          readBlocksEl: recorderReadBlocks,
          outputSelectEl: recorderReadOutputKeySelect,
          inputRefSelectEl: recorderReadInputRefSelect,
          statusEl: recorderStatus,
          publishStatusEl: recorderPublishStatus,
          onStatusChange: (message, tone) => setManageTabStatus(message, tone),
          onPublishStatusChange: (message, tone) => setManageTabStatus(message, tone),
          onStateChange: () => {
            syncRecorderUiState();
          },
        });
        state.workflowRecorder.render();
        if (recorderRunAtConnectionInput) {
          recorderRunAtConnectionInput.checked = Boolean(recorderRunAtConnectionInput.checked);
        }
  
        try {
          state.recorderTerminalComponent = new RobotTerminalComponent({
            terminalElement: recorderTerminalDisplay,
            toolbarElement: recorderTerminalToolbar,
            badgeElement: recorderTerminalBadge,
            hintElement: recorderTerminalHint,
            terminalCtor: window.Terminal,
            fitAddonCtor: window.FitAddon ? window.FitAddon.FitAddon : null,
            endpointBuilder: (robotId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal`),
            onTranscriptChange: () => {
              syncRecorderUiState();
            },
          });
        } catch (error) {
          console.warn('Recorder terminal init failed', error);
        }
  
        if (state.recorderSelectionMouseupHandler) {
          document.removeEventListener('mouseup', state.recorderSelectionMouseupHandler);
        }
        state.recorderSelectionMouseupHandler = () => {
          syncRecorderReadPopoverVisibility();
        };
        document.addEventListener('mouseup', state.recorderSelectionMouseupHandler);
  
        recorderTerminalPopReadBtn?.addEventListener('click', () => {
          if (!state.recorderTerminalComponent?.terminal || !state.workflowRecorder?.started) return;
          try {
            const selection = state.recorderTerminalComponent.terminal.getSelection();
            if (selection && selection.trim()) {
              state.workflowRecorder.clearReadEdit();
              const outputs = state.workflowRecorder.getOutputKeys();
              if (!outputs.length) {
                state.workflowRecorder.setStatus('Create an Output Block first to bind terminal selections to.', 'warn');
                return;
              }
              const lines = selection.trim().split('\n').map(s => s.trim()).filter(Boolean);
              const latestWrite = state.workflowRecorder.getWriteRefs().pop();
              const ref = latestWrite ? latestWrite.saveAs : '';
  
              let kind = 'contains_string';
              let needle = '';
              let linesStr = '';
  
              if (lines.length > 1) {
                kind = 'contains_lines_unordered';
                linesStr = lines.join('\n');
              } else if (lines.length === 1) {
                kind = 'contains_string';
                needle = lines[0];
              }
              state.workflowRecorder.addOrUpdateReadBlock({
                 outputKey: outputs[0],
                 inputRef: ref,
                 kind: kind,
                 needle: needle,
                 needles: '',
                 lines: linesStr,
                 requireAll: true
              });
              state.workflowRecorder.setStatus('Read block created from terminal selection. Expand to edit.', 'ok');
              hideRecorderReadPopover();
              state.recorderTerminalComponent.terminal.clearSelection();
            }
          } catch (_e) {}
        });
  
        activateRecorderTerminalButton?.addEventListener('click', () => {
          const rId = normalizeText(recorderRobotSelect?.value, '');
          if (!rId) {
            state.workflowRecorder.setStatus('Select a robot first.', 'error');
            return;
          }
          const robot = env.ROBOT_TYPES.length ? { id: rId, name: rId } : { id: rId };
          state.recorderTerminalComponent?.connect(robot);
          setRecorderTerminalActive();
        });
  
        recorderCreateNewTestButton?.addEventListener('click', () => {
          startNewTestDraft();
        });
        recorderRunCaptureButton?.addEventListener('click', () => {
          runRecorderCommandAndCapture();
        });
        recorderCommandInput?.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          runRecorderCommandAndCapture();
        });
        recorderAddOutputBtn?.addEventListener('click', () => {
          addRecorderOutputVisual();
        });
        recorderAddWriteBtn?.addEventListener('click', () => {
          addRecorderWriteVisual();
        });
        recorderAddReadBtn?.addEventListener('click', () => {
          addRecorderReadVisual();
        });
        recorderSelectSimpleModeButton?.addEventListener('click', () => {
          setRecorderMode('simple', { targetStep: 'select-robot' });
        });
        recorderSelectAdvancedModeButton?.addEventListener('click', () => {
          setRecorderMode('advanced');
        });
        recorderChangeModeButton?.addEventListener('click', () => {
          setRecorderMode('');
        });
        recorderResetExperienceButton?.addEventListener('click', () => {
          resetRecorderTestEntry({ target: 'mode-selector' });
        });
        recorderSimpleSelectRobotNextButton?.addEventListener('click', () => {
          if (normalizeText(recorderRobotSelect?.value, '')) {
            setRecorderSimpleStep('terminal');
          }
        });
        recorderSimpleTerminalNextButton?.addEventListener('click', () => {
          setRecorderSimpleStep('prompt');
        });
        recorderSimplePromptBackButton?.addEventListener('click', () => {
          setRecorderSimpleStep('terminal');
        });
        recorderGeneratePromptButton?.addEventListener('click', () => {
          refreshRecorderLlmPromptPreview();
        });
        recorderSimplePromptNextButton?.addEventListener('click', () => {
          if (normalizeText(state.recorderSimplePromptBundle, '')) {
            setRecorderSimpleStep('import');
          }
        });
        recorderSimpleImportBackButton?.addEventListener('click', () => {
          setRecorderSimpleStep('prompt');
        });
        recorderValidateImportButton?.addEventListener('click', () => {
          validateRecorderLlmImportInput();
        });
        recorderSimpleImportNextButton?.addEventListener('click', () => {
          if (state.recorderSimpleImportValidated) {
            loadRecorderLlmImportResult();
          }
        });
        recorderSimplePreviewBackButton?.addEventListener('click', () => {
          setRecorderSimpleStep('import');
        });
        recorderSimpleEditInAdvancedButton?.addEventListener('click', () => {
          setRecorderMode('advanced');
        });
        recorderSimplePreviewNextButton?.addEventListener('click', () => {
          setRecorderSimpleStep('publish');
        });
        recorderSimplePublishBackButton?.addEventListener('click', () => {
          setRecorderSimpleStep('preview');
        });
        recorderAskLlmButton?.addEventListener('click', () => {
          openRecorderLlmPromptModal();
        });
        recorderAskLlmHelpButton?.addEventListener('click', () => {
          toggleRecorderLlmHelp();
        });
        recorderPasteLlmResultButton?.addEventListener('click', () => {
          openRecorderLlmImportModal();
        });
        recorderLlmPromptCancelButton?.addEventListener('click', () => {
          closeRecorderLlmPromptModal();
        });
        recorderLlmCopyPromptButton?.addEventListener('click', () => {
          copyRecorderLlmPrompt();
        });
        recorderLlmSystemDetailsInput?.addEventListener('input', () => {
          state.recorderSimplePromptBundle = '';
          setRecorderLlmStatus(recorderLlmPromptStatus, '', '');
          syncRecorderUiState();
        });
        recorderLlmTestRequestInput?.addEventListener('input', () => {
          state.recorderSimplePromptBundle = '';
          setRecorderLlmStatus(recorderLlmPromptStatus, '', '');
          syncRecorderUiState();
        });
        recorderSimpleTranscriptAcknowledge?.addEventListener('change', () => {
          syncRecorderUiState();
        });
        recorderLlmImportCancelButton?.addEventListener('click', () => {
          closeRecorderLlmImportModal({ preserveInput: false });
        });
        recorderLlmImportInput?.addEventListener('input', () => {
          state.recorderSimpleImportValidated = null;
          validateRecorderLlmImportInput();
        });
        recorderLlmImportLoadButton?.addEventListener('click', () => {
          loadRecorderLlmImportResult();
        });
        recorderLlmPromptModal?.addEventListener('click', (event) => {
          if (event.target === recorderLlmPromptModal) {
            closeRecorderLlmPromptModal();
          }
        });
        recorderLlmImportModal?.addEventListener('click', (event) => {
          if (event.target === recorderLlmImportModal) {
            closeRecorderLlmImportModal({ preserveInput: false });
          }
        });
        document.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape') return;
          if (state.isRecorderLlmPromptModalOpen) {
            closeRecorderLlmPromptModal();
          }
          if (state.isRecorderLlmImportModalOpen) {
            closeRecorderLlmImportModal({ preserveInput: false });
          }
        });
        recorderReadKindSelect?.addEventListener('change', () => {
          syncRecorderReadKindFields();
        });
        recorderPublishTestButton?.addEventListener('click', () => {
          publishRecorderAsTest();
        });
        recorderRobotSelect?.addEventListener('change', () => {
          renderRecorderRobotTypeTargets();
          syncRecorderUiState();
        });
        recorderCommandInput?.addEventListener('input', () => {
          syncRecorderUiState();
        });
        recorderDefinitionIdInput?.addEventListener('input', () => {
          renderRecorderRobotTypeTargets();
          syncRecorderUiState();
        });
        clearRecorderOutputForm();
        clearRecorderReadForm();
        setRecorderLlmHelpExpanded(false);
        resetRecorderLlmImportState({ clearInput: true });
        if (recorderLlmPromptPreview) recorderLlmPromptPreview.value = '';
        setRecorderLlmStatus(recorderLlmPromptStatus, '', '');
        state.recorderSimplePromptBundle = '';
        setManageDefinitionsFilter(state.manageDefinitionsFilter || 'all');
        setFlowEditorMode(state.manageFlowEditorMode || 'test', { announce: false });
        syncRecorderUiState();
      }

  function onFilterChange() {
        state.filter.name = $('#searchName').value;
        state.filter.type = filterType.value;
        state.filter.error = filterError.value;
        renderDashboard();
      }

  return {
    setManageTabStatus,
    setManageEditorStatus,
    normalizeDefinitionsSummary,
    normalizeIdList,
    slugifyRecorderValue,
    renderRecorderRobotTypeTargets,
    getSelectedRecorderTypeIds,
    renderTestRobotTypeTargets,
    renderFixRobotTypeTargets,
    getSelectedMappingTypeIds,
    getManageDefinitionsFilter,
    setManageDefinitionsFilter,
    setFlowEditorMode,
    renderManageDefinitionsList,
    renderManageTestsList,
    renderManageFixesList,
    renderRecorderRobotOptions,
    renderManageDefinitions,
    loadDefinitionsSummary,
    setActiveManageTab,
    parseJsonInput,
    saveManageTestDefinition,
    deleteManageTestDefinition,
    updateTestMappings,
    updateFixMappings,
    saveManageFixDefinition,
    deleteManageFixDefinition,
    patchRobotTypeMapping,
    applyRecorderMappings,
    clearRecorderOutputForm,
    clearRecorderReadForm,
    clearManageFixEditor,
    setRecorderMode,
    setRecorderSimpleStep,
    setRecorderLlmHelpExpanded,
    toggleRecorderLlmHelp,
    buildRecorderLlmPromptPayload,
    getRecorderLlmPromptBuildResult,
    refreshRecorderLlmPromptPreview,
    copyRecorderLlmPrompt,
    openRecorderLlmPromptModal,
    closeRecorderLlmPromptModal,
    stripRecorderLlmJsonWrapperNoise,
    parseRecorderLlmImportPayload,
    validateRecorderImportedDefinition,
    validateRecorderLlmImportInput,
    openRecorderLlmImportModal,
    closeRecorderLlmImportModal,
    loadRecorderLlmImportResult,
    loadExistingTestIntoRecorder,
    loadExistingFixIntoFlow,
    duplicateManageTestDefinition,
    duplicateManageFixDefinition,
    resetRecorderTestEntry,
    startNewTestDraft,
    startNewFixDraft,
    syncRecorderReadKindFields,
    syncRecorderUiState,
    runRecorderCommandAndCapture,
    publishRecorderAsTest,
    addRecorderOutputVisual,
    addRecorderWriteVisual,
    addRecorderReadVisual,
    initManageTabs,
    initWorkflowRecorder,
    onFilterChange,
  };
}
