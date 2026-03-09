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
    recorderRobotTypeTargets,
    recorderFlowBlocks,
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
        if (manageFlowModeHint) {
          manageFlowModeHint.textContent = normalizedMode === 'fix'
            ? 'Fix flow editor active. Adjust metadata, write blocks, and mappings here.'
            : 'Test flow editor active. Use the terminal capture workflow to build or modify tests.';
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
          button.classList.toggle('active', tab === normalizedTab);
        });
        manageTabPanels.forEach((panel) => {
          const tab = normalizeText(panel?.dataset?.tabPanel, '');
          panel.classList.toggle('active', tab === normalizedTab);
        });
        if (normalizedTab === 'recorder') {
          syncRecorderUiState();
        } else {
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
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          setManageEditorStatus(manageTestEditorStatus, `Saved test definition '${testId}' and updated mappings.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Saved test definition '${testId}'.`, 'ok');
          } else {
            setManageTabStatus(
              `Saved test definition '${testId}', but robot views did not refresh. Reload the page if needed.`,
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
              `Deleted test definition '${testId}', but robot views did not refresh. Reload the page if needed.`,
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
              `Saved fix definition '${fixId}', but robot views did not refresh. Reload the page if needed.`,
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
              `Deleted fix definition '${fixId}', but robot views did not refresh. Reload the page if needed.`,
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
        syncRecorderUiState();
        setActiveManageTab('recorder', { syncHash: true, persist: true });
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
        setManageTabStatus('New test draft ready.', 'ok');
      }

  function startNewFixDraft() {
        clearManageFixEditor();
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
  
        const robotSelected = normalizeText(recorderRobotSelect?.value, '') !== '';
        const commandReady = normalizeText(recorderCommandInput?.value, '') !== '';
  
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
          
          if (recorderDefinitionIdInput && !normalizeText(recorderDefinitionIdInput.value, '')) {
            const suggested = slugifyRecorderValue(
              `${robotIdValue}_${normalizeText(capturedStep?.id, 'workflow')}`,
              'recorded_workflow',
            );
            recorderDefinitionIdInput.value = suggested;
          }
          if (recorderDefinitionLabelInput && !normalizeText(recorderDefinitionLabelInput.value, '')) {
            recorderDefinitionLabelInput.value = `Flow workflow (${robotIdValue})`;
          }
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
            setActiveManageTab(normalizeText(button?.dataset?.tab, 'robots'), { syncHash: true, persist: true });
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
        recorderAddReadBtn?.addEventListener('click', () => {
          addRecorderReadVisual();
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
    loadExistingTestIntoRecorder,
    loadExistingFixIntoFlow,
    duplicateManageTestDefinition,
    duplicateManageFixDefinition,
    startNewTestDraft,
    startNewFixDraft,
    syncRecorderReadKindFields,
    syncRecorderUiState,
    runRecorderCommandAndCapture,
    publishRecorderAsTest,
    addRecorderOutputVisual,
    addRecorderReadVisual,
    initManageTabs,
    initWorkflowRecorder,
    onFilterChange,
  };
}
