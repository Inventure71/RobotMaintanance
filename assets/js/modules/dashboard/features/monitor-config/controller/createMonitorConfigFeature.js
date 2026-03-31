export function createMonitorConfigFeature(context, maybeEnv) {
  const runtime = maybeEnv ? context : context?.bridge || context?.runtime || context?.services || {};
  const env = maybeEnv || context?.env || context;
  const {
    $,
    $$,
    CAN_USE_MODEL_VIEWER,
    DEFAULT_ROBOT_MODEL_URL,
    DEFAULT_TEST_DEFINITIONS,
    DETAIL_TERMINAL_PRESET_IDS,
    JOB_QUEUE_ACTIVITY,
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
    applyThemeStyles,
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
    DEFAULT_DESIGN_SYSTEM_ID,
    DESIGN_SYSTEM_ATTRIBUTE,
    DESIGN_SYSTEM_OPTIONS,
    DESIGN_SYSTEM_STORAGE_KEY,
    manageDeleteFixButton,
    manageDeleteTestButton,
    manageFixDescriptionInput,
    manageFixEditorForm,
    manageFixEditorStatus,
    manageFixExecuteJsonInput,
    manageFixIdInput,
    manageFixLabelInput,
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

  const addRecorderOutputVisual = (...args) => runtime.addRecorderOutputVisual(...args);
  const addRecorderReadVisual = (...args) => runtime.addRecorderReadVisual(...args);
  const addRobotIdsToSelection = (...args) => runtime.addRobotIdsToSelection(...args);
  const appendTerminalLine = (...args) => runtime.appendTerminalLine(...args);
  const appendTerminalPayload = (...args) => runtime.appendTerminalPayload(...args);
  const applyDashboardMetaFromVisible = (...args) => runtime.applyDashboardMetaFromVisible(...args);
  const applyFilters = (...args) => runtime.applyFilters(...args);
  const applyRecorderMappings = (...args) => runtime.applyRecorderMappings(...args);
  const applyRuntimeRobotPatches = (...args) => runtime.applyRuntimeRobotPatches(...args);
  const areAllRobotIdsSelected = (...args) => runtime.areAllRobotIdsSelected(...args);
  const buildConnectionCornerIconMarkup = (...args) => runtime.buildConnectionCornerIconMarkup(...args);
  const buildFixButtonLabel = (...args) => runtime.buildFixButtonLabel(...args);
  const buildLastFullTestPillLabel = (...args) => runtime.buildLastFullTestPillLabel(...args);
  const buildManageHash = (...args) => runtime.buildManageHash(...args);
  const buildRobotModelContainer = (...args) => runtime.buildRobotModelContainer(...args);
  const buildRobotModelMarkup = (...args) => runtime.buildRobotModelMarkup(...args);
  const buildScanOverlayMarkup = (...args) => runtime.buildScanOverlayMarkup(...args);
  const clearRecorderOutputForm = (...args) => runtime.clearRecorderOutputForm(...args);
  const clearRecorderReadForm = (...args) => runtime.clearRecorderReadForm(...args);
  const closeBugReportModal = (...args) => runtime.closeBugReportModal(...args);
  const closeRecorderTerminalSession = (...args) => runtime.closeRecorderTerminalSession(...args);
  const closeTerminalSession = (...args) => runtime.closeTerminalSession(...args);
  const closeTestDebugModal = (...args) => runtime.closeTestDebugModal(...args);
  const createRobotFromForm = (...args) => runtime.createRobotFromForm(...args);
  const cycleOnlineSortMode = (...args) => runtime.cycleOnlineSortMode(...args);
  const deleteManageFixDefinition = (...args) => runtime.deleteManageFixDefinition(...args);
  const deleteManageTestDefinition = (...args) => runtime.deleteManageTestDefinition(...args);
  const estimateTestCountdownMsFromBody = (...args) => runtime.estimateTestCountdownMsFromBody(...args);
  const formatConsoleLine = (...args) => runtime.formatConsoleLine(...args);
  const formatDurationMs = (...args) => runtime.formatDurationMs(...args);
  const formatEpochSeconds = (...args) => runtime.formatEpochSeconds(...args);
  const formatLastFullTestTimestamp = (...args) => runtime.formatLastFullTestTimestamp(...args);
  const formatRawOutput = (...args) => runtime.formatRawOutput(...args);
  const getConfiguredDefaultTestIds = (...args) => runtime.getConfiguredDefaultTestIds(...args);
  const getCountdownLabel = (...args) => runtime.getCountdownLabel(...args);
  const getCountdownNodes = (...args) => runtime.getCountdownNodes(...args);
  const getDashboardFixCandidates = (...args) => runtime.getDashboardFixCandidates(...args);
  const getDetailFixCandidates = (...args) => runtime.getDetailFixCandidates(...args);
  const getDetailTerminalPresets = (...args) => runtime.getDetailTerminalPresets(...args);
  const getFixModeElements = (...args) => runtime.getFixModeElements(...args);
  const getMonitorBatteryIntervalMs = (...args) => runtime.getMonitorBatteryIntervalMs(...args);
  const getMonitorOnlineIntervalMs = (...args) => runtime.getMonitorOnlineIntervalMs(...args);
  const getMonitorTopicsIntervalMs = (...args) => runtime.getMonitorTopicsIntervalMs(...args);
  const getPersistedManageTab = (...args) => runtime.getPersistedManageTab(...args);
  const getReachableRobotIds = (...args) => runtime.getReachableRobotIds(...args);
  const getRobotById = (...args) => runtime.getRobotById(...args);
  const getRobotIdsForRun = (...args) => runtime.getRobotIdsForRun(...args);
  const getRunSelectedButtonIdleLabel = (...args) => runtime.getRunSelectedButtonIdleLabel(...args);
  const getSelectedMappingTypeIds = (...args) => runtime.getSelectedMappingTypeIds(...args);
  const getSelectedRecorderTypeIds = (...args) => runtime.getSelectedRecorderTypeIds(...args);
  const getSelectedRobotIds = (...args) => runtime.getSelectedRobotIds(...args);
  const getStatusChipTone = (...args) => runtime.getStatusChipTone(...args);
  const getTestingCountdownText = (...args) => runtime.getTestingCountdownText(...args);
  const getTimestamp = (...args) => runtime.getTimestamp(...args);
  const getVisibleOfflineRobotIds = (...args) => runtime.getVisibleOfflineRobotIds(...args);
  const getVisibleOnlineRobotIds = (...args) => runtime.getVisibleOnlineRobotIds(...args);
  const haveRuntimeTestsChanged = (...args) => runtime.haveRuntimeTestsChanged(...args);
  const hideRecorderReadPopover = (...args) => runtime.hideRecorderReadPopover(...args);
  const initAddRobotPasswordToggle = (...args) => runtime.initAddRobotPasswordToggle(...args);
  const initDashboardController = (...args) => runtime.initDashboardController(...args);
  const initManageTabs = (...args) => runtime.initManageTabs(...args);
  const initRobotTerminal = (...args) => runtime.initRobotTerminal(...args);
  const initWorkflowRecorder = (...args) => runtime.initWorkflowRecorder(...args);
  const invalidateCountdownNodeCache = (...args) => runtime.invalidateCountdownNodeCache(...args);
  const isManageViewActive = (...args) => runtime.isManageViewActive(...args);
  const isRobotAutoSearching = (...args) => runtime.isRobotAutoSearching(...args);
  const isRobotBusyForOnlineRefresh = (...args) => runtime.isRobotBusyForOnlineRefresh(...args);
  const isRobotFixing = (...args) => runtime.isRobotFixing(...args);
  const isRobotSearching = (...args) => runtime.isRobotSearching(...args);
  const isRobotSelected = (...args) => runtime.isRobotSelected(...args);
  const isRobotTesting = (...args) => runtime.isRobotTesting(...args);
  const issueSummary = (...args) => runtime.issueSummary(...args);
  const loadDefinitionsSummary = (...args) => runtime.loadDefinitionsSummary(...args);
  const loadFleetRuntimeDelta = (...args) => runtime.loadFleetRuntimeDelta(...args);
  const loadFleetStaticState = (...args) => runtime.loadFleetStaticState(...args);
  const loadRobotConfig = (...args) => runtime.loadRobotConfig(...args);
  const loadRobotTypeConfig = (...args) => runtime.loadRobotTypeConfig(...args);
  const loadRobotsFromBackend = (...args) => runtime.loadRobotsFromBackend(...args);
  const mapRobots = (...args) => runtime.mapRobots(...args);
  const mergeRuntimeRobotsIntoList = (...args) => runtime.mergeRuntimeRobotsIntoList(...args);
  const nonBatteryTestEntries = (...args) => runtime.nonBatteryTestEntries(...args);
  const normalizeBatteryPercentForSort = (...args) => runtime.normalizeBatteryPercentForSort(...args);
  const normalizeCheckedAtMs = (...args) => runtime.normalizeCheckedAtMs(...args);
  const normalizeCountdownMs = (...args) => runtime.normalizeCountdownMs(...args);
  const normalizeDefinitionsSummary = (...args) => runtime.normalizeDefinitionsSummary(...args);
  const normalizeIdList = (...args) => runtime.normalizeIdList(...args);
  const normalizeManageTab = (...args) => runtime.normalizeManageTab(...args);
  const normalizeRobotData = (...args) => runtime.normalizeRobotData(...args);
  const normalizeRuntimeRobotEntry = (...args) => runtime.normalizeRuntimeRobotEntry(...args);
  const normalizeRuntimeTestUpdate = (...args) => runtime.normalizeRuntimeTestUpdate(...args);
  const normalizeStepDebug = (...args) => runtime.normalizeStepDebug(...args);
  const normalizeTestDebugCollection = (...args) => runtime.normalizeTestDebugCollection(...args);
  const normalizeTestDebugResult = (...args) => runtime.normalizeTestDebugResult(...args);
  const onFilterChange = (...args) => runtime.onFilterChange(...args);
  const onlineRobotComparator = (...args) => runtime.onlineRobotComparator(...args);
  const openBugReportModal = (...args) => runtime.openBugReportModal(...args);
  const openDetail = (...args) => runtime.openDetail(...args);
  const openTestDebugModal = (...args) => runtime.openTestDebugModal(...args);
  const parseJsonInput = (...args) => runtime.parseJsonInput(...args);
  const parseManageRoute = (...args) => runtime.parseManageRoute(...args);
  const patchDetailRuntimeContent = (...args) => runtime.patchDetailRuntimeContent(...args);
  const patchRobotTypeMapping = (...args) => runtime.patchRobotTypeMapping(...args);
  const persistManageTab = (...args) => runtime.persistManageTab(...args);
  const populateAddRobotTypeOptions = (...args) => runtime.populateAddRobotTypeOptions(...args);
  const populateFilters = (...args) => runtime.populateFilters(...args);
  const publishRecorderAsTest = (...args) => runtime.publishRecorderAsTest(...args);
  const queryCardByRobotId = (...args) => runtime.queryCardByRobotId(...args);
  const rebuildRobotIndex = (...args) => runtime.rebuildRobotIndex(...args);
  const refreshRobotsFromBackendSnapshot = (...args) => runtime.refreshRobotsFromBackendSnapshot(...args);
  const refreshRuntimeStateFromBackend = (...args) => runtime.refreshRuntimeStateFromBackend(...args);
  const refreshTestingCountdowns = (...args) => runtime.refreshTestingCountdowns(...args);
  const removeRobotIdsFromSelection = (...args) => runtime.removeRobotIdsFromSelection(...args);
  const renderCard = (...args) => runtime.renderCard(...args);
  const renderDashboard = (...args) => runtime.renderDashboard(...args);
  const renderDetail = (...args) => runtime.renderDetail(...args);
  const renderFixModeActionsForContext = (...args) => runtime.renderFixModeActionsForContext(...args);
  const renderFixRobotTypeTargets = (...args) => runtime.renderFixRobotTypeTargets(...args);
  const renderManageDefinitions = (...args) => runtime.renderManageDefinitions(...args);
  const renderManageFixesList = (...args) => runtime.renderManageFixesList(...args);
  const renderManageTestsList = (...args) => runtime.renderManageTestsList(...args);
  const renderRecorderRobotOptions = (...args) => runtime.renderRecorderRobotOptions(...args);
  const renderRecorderRobotTypeTargets = (...args) => runtime.renderRecorderRobotTypeTargets(...args);
  const renderTestRobotTypeTargets = (...args) => runtime.renderTestRobotTypeTargets(...args);
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
  const runRecorderCommandAndCapture = (...args) => runtime.runRecorderCommandAndCapture(...args);
  const runRobotTestsForRobot = (...args) => runtime.runRobotTestsForRobot(...args);
  const runtimeActivityHasSignal = (...args) => runtime.runtimeActivityHasSignal(...args);
  const saveManageFixDefinition = (...args) => runtime.saveManageFixDefinition(...args);
  const saveManageTestDefinition = (...args) => runtime.saveManageTestDefinition(...args);
  const selectAllOfflineRobots = (...args) => runtime.selectAllOfflineRobots(...args);
  const selectAllOnlineRobots = (...args) => runtime.selectAllOnlineRobots(...args);
  const selectAllRobots = (...args) => runtime.selectAllRobots(...args);
  const selectRobotIds = (...args) => runtime.selectRobotIds(...args);
  const setActiveManageTab = (...args) => runtime.setActiveManageTab(...args);
  const setAddRobotMessage = (...args) => runtime.setAddRobotMessage(...args);
  const setAddRobotPasswordVisibility = (...args) => runtime.setAddRobotPasswordVisibility(...args);
  const setBugReportStatus = (...args) => runtime.setBugReportStatus(...args);
  const setFixModeStatus = (...args) => runtime.setFixModeStatus(...args);
  const setFleetOnlineButtonIdleLabel = (...args) => runtime.setFleetOnlineButtonIdleLabel(...args);
  const setFleetOnlineButtonState = (...args) => runtime.setFleetOnlineButtonState(...args);
  const setLocationHash = (...args) => runtime.setLocationHash(...args);
  const setManageEditorStatus = (...args) => runtime.setManageEditorStatus(...args);
  const setManageTabStatus = (...args) => runtime.setManageTabStatus(...args);
  const setModelContainerFaultClasses = (...args) => runtime.setModelContainerFaultClasses(...args);
  const setRecorderTerminalActive = (...args) => runtime.setRecorderTerminalActive(...args);
  const setRobotFixing = (...args) => runtime.setRobotFixing(...args);
  const setRobotSearching = (...args) => runtime.setRobotSearching(...args);
  const setRobotSearchingBulk = (...args) => runtime.setRobotSearchingBulk(...args);
  const setRobotSelection = (...args) => runtime.setRobotSelection(...args);
  const setRobotTesting = (...args) => runtime.setRobotTesting(...args);
  const setRobots = (...args) => runtime.setRobots(...args);
  const setRunningButtonState = (...args) => runtime.setRunningButtonState(...args);
  const setTerminalActive = (...args) => runtime.setTerminalActive(...args);
  const setTerminalInactive = (...args) => runtime.setTerminalInactive(...args);
  const shouldUseCompactAutoSearchIndicator = (...args) => runtime.shouldUseCompactAutoSearchIndicator(...args);
  const showAddRobotPage = (...args) => runtime.showAddRobotPage(...args);
  const showDashboard = (...args) => runtime.showDashboard(...args);
  const slugifyRecorderValue = (...args) => runtime.slugifyRecorderValue(...args);
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
  const syncGlobalSelectionButton = (...args) => runtime.syncGlobalSelectionButton(...args);
  const syncModelViewerRotationForContainer = (...args) => runtime.syncModelViewerRotationForContainer(...args);
  const syncOnlineSortButton = (...args) => runtime.syncOnlineSortButton(...args);
  const syncRecorderReadKindFields = (...args) => runtime.syncRecorderReadKindFields(...args);
  const syncRecorderReadPopoverVisibility = (...args) => runtime.syncRecorderReadPopoverVisibility(...args);
  const syncRecorderUiState = (...args) => runtime.syncRecorderUiState(...args);
  const syncRunSelectedButtonLabel = (...args) => runtime.syncRunSelectedButtonLabel(...args);
  const syncSectionToggleButtons = (...args) => runtime.syncSectionToggleButtons(...args);
  const syncSelectionUi = (...args) => runtime.syncSelectionUi(...args);
  const toggleFixMode = (...args) => runtime.toggleFixMode(...args);
  const updateCardRuntimeContent = (...args) => runtime.updateCardRuntimeContent(...args);
  const updateFixMappings = (...args) => runtime.updateFixMappings(...args);
  const updateFleetOnlineRefreshStatus = (...args) => runtime.updateFleetOnlineRefreshStatus(...args);
  const updateFleetOnlineSummary = (...args) => runtime.updateFleetOnlineSummary(...args);
  const updateKPIs = (...args) => runtime.updateKPIs(...args);
  const updateRobotTestState = (...args) => runtime.updateRobotTestState(...args);
  const updateSelectionSummary = (...args) => runtime.updateSelectionSummary(...args);
  const updateTestMappings = (...args) => runtime.updateTestMappings(...args);

  function clampOnlineCountdownMs(valueMs) {
        const numeric = Number.isFinite(valueMs) ? valueMs : ONLINE_CHECK_TIMEOUT_MS;
        return Math.max(ONLINE_CHECK_UI_MIN_MS, Math.min(numeric, ONLINE_CHECK_UI_MAX_MS));
      }

  function getOnlineCheckCountdownMs() {
        const baseMs = Math.max(ONLINE_CHECK_TIMEOUT_MS, state.onlineCheckEstimateMs || ONLINE_CHECK_TIMEOUT_MS);
        return clampOnlineCountdownMs(baseMs + ONLINE_CHECK_UI_BUFFER_MS);
      }

  function updateOnlineCheckEstimateFromResults(results) {
        const list = Array.isArray(results) ? results : [];
        const observedMaxMs = list.reduce((maxMs, entry) => {
          const numericMs = Number(entry?.ms);
          if (!Number.isFinite(numericMs) || numericMs <= 0) return maxMs;
          return Math.max(maxMs, numericMs);
        }, 0);
        if (!observedMaxMs) return;
  
        const prevMs = Number.isFinite(state.onlineCheckEstimateMs) ? state.onlineCheckEstimateMs : ONLINE_CHECK_TIMEOUT_MS;
        const nextMs =
          prevMs * (1 - ONLINE_CHECK_ESTIMATE_ALPHA) + observedMaxMs * ONLINE_CHECK_ESTIMATE_ALPHA;
        state.onlineCheckEstimateMs = clampOnlineCountdownMs(nextMs);
      }

  function clampFleetParallelism(value) {
        const numeric = Number.isFinite(Number(value)) ? Math.round(Number(value)) : FLEET_PARALLELISM_DEFAULT;
        return Math.max(FLEET_PARALLELISM_MIN, Math.min(numeric, FLEET_PARALLELISM_MAX));
      }

  function getFleetParallelism() {
        return clampFleetParallelism(state.fleetParallelism);
      }

  function syncFleetParallelismUi() {
        const slider = $('#fleetParallelism');
        const valueLabel = $('#fleetParallelismValue');
        const value = getFleetParallelism();
        if (slider) {
          slider.value = String(value);
        }
        if (valueLabel) {
          valueLabel.textContent = String(value);
        }
      }

  function setFleetParallelism(value, persist = false) {
        state.fleetParallelism = clampFleetParallelism(value);
        syncFleetParallelismUi();
        scheduleMonitorParallelismSync();
        if (!persist) return;
        try {
          window.localStorage.setItem(FLEET_PARALLELISM_STORAGE_KEY, String(state.fleetParallelism));
        } catch (_error) {
          // Best effort persistence.
        }
      }

  function initFleetParallelism() {
        let initialValue = FLEET_PARALLELISM_DEFAULT;
        try {
          const stored = window.localStorage.getItem(FLEET_PARALLELISM_STORAGE_KEY);
          if (stored != null) {
            initialValue = clampFleetParallelism(stored);
          }
        } catch (_error) {
          initialValue = FLEET_PARALLELISM_DEFAULT;
        }
        setFleetParallelism(initialValue);
  
        const slider = $('#fleetParallelism');
        if (!slider) return;
        slider.addEventListener('input', () => {
          setFleetParallelism(slider.value);
        });
        slider.addEventListener('change', () => {
          setFleetParallelism(slider.value, true);
        });
      }

  function clampMonitorTopicsInterval(value) {
        const numeric = Number.isFinite(Number(value))
          ? Math.round(Number(value))
          : MONITOR_TOPICS_INTERVAL_DEFAULT_SEC;
        return Math.max(
          MONITOR_TOPICS_INTERVAL_MIN_SEC,
          Math.min(numeric, MONITOR_TOPICS_INTERVAL_MAX_SEC),
        );
      }

  function clampMonitorBatteryInterval(value) {
        const numeric = Number.isFinite(Number(value)) ? Number(value) : MONITOR_BATTERY_INTERVAL_DEFAULT_SEC;
        return Math.max(
          MONITOR_BATTERY_INTERVAL_MIN_SEC,
          Math.min(numeric, MONITOR_BATTERY_INTERVAL_MAX_SEC),
        );
      }

  function clampMonitorOnlineInterval(value) {
        const numeric = Number.isFinite(Number(value)) ? Number(value) : MONITOR_ONLINE_INTERVAL_DEFAULT_SEC;
        return Math.max(
          MONITOR_ONLINE_INTERVAL_MIN_SEC,
          Math.min(numeric, MONITOR_ONLINE_INTERVAL_MAX_SEC),
        );
      }

  function isTopicsMonitorMode(mode) {
        return normalizeText(mode, '') === MONITOR_MODE_ONLINE_BATTERY_TOPICS;
      }

  function setMonitorConfigStatus(message = '', tone = '') {
        if (!monitorConfigStatus) return;
        monitorConfigStatus.textContent = message;
        monitorConfigStatus.classList.remove('ok', 'warn', 'error');
        if (tone) {
          monitorConfigStatus.classList.add(tone);
        }
      }

  function syncMonitorConfigUi() {
        if (monitorModeSelect) {
          monitorModeSelect.value = state.monitorMode;
        }
        if (monitorTopicsIntervalInput) {
          monitorTopicsIntervalInput.value = String(state.monitorTopicsIntervalSec);
          monitorTopicsIntervalInput.disabled = !isTopicsMonitorMode(state.monitorMode);
        }
        if (monitorApplyButton) {
          applyActionButton(monitorApplyButton, {
            intent: 'monitor',
            compact: true,
            disabled: state.isMonitorConfigApplyInFlight,
            label: state.isMonitorConfigApplyInFlight ? 'Applying...' : 'Apply',
          });
        }
      }

  function applyMonitorConfigFromPayload(payload) {
        const mode = normalizeText(payload?.mode, MONITOR_MODE_ONLINE_BATTERY);
        state.monitorMode =
          mode === MONITOR_MODE_ONLINE_BATTERY_TOPICS
            ? MONITOR_MODE_ONLINE_BATTERY_TOPICS
            : MONITOR_MODE_ONLINE_BATTERY;
        state.monitorOnlineIntervalSec = clampMonitorOnlineInterval(payload?.onlineIntervalSec);
        state.monitorBatteryIntervalSec = clampMonitorBatteryInterval(payload?.batteryIntervalSec);
        state.monitorTopicsIntervalSec = clampMonitorTopicsInterval(payload?.topicsIntervalSec);
        state.monitorParallelism = clampFleetParallelism(payload?.parallelism);
        syncAutoMonitorRefreshState();
        syncMonitorConfigUi();
      }

  async function loadMonitorConfig() {
        try {
          const response = await fetch(buildApiUrl('/api/monitor/config'));
          if (!response.ok) throw new Error('Monitor config unavailable');
          const payload = await response.json();
          applyMonitorConfigFromPayload(payload);
        } catch (_error) {
          syncMonitorConfigUi();
        }
        syncAutoMonitorRefreshState();
        startOnlineRefreshStatusTimer();
        scheduleMonitorParallelismSync();
      }

  async function applyMonitorConfig() {
        if (state.isMonitorConfigApplyInFlight) return;
        state.isMonitorConfigApplyInFlight = true;
        syncMonitorConfigUi();
        setMonitorConfigStatus('Applying monitor config...', 'warn');
        try {
          const response = await fetch(buildApiUrl('/api/monitor/config'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: state.monitorMode,
              batteryIntervalSec: clampMonitorBatteryInterval(state.monitorBatteryIntervalSec),
              topicsIntervalSec: clampMonitorTopicsInterval(state.monitorTopicsIntervalSec),
              parallelism: getFleetParallelism(),
            }),
          });
          if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Unable to apply monitor config');
          }
          const payload = await response.json();
          applyMonitorConfigFromPayload(payload);
          setMonitorConfigStatus('Monitor config saved.', 'ok');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setMonitorConfigStatus(`Monitor config update failed: ${message}`, 'error');
        } finally {
          state.isMonitorConfigApplyInFlight = false;
          syncMonitorConfigUi();
        }
      }

  function initMonitorConfigControls() {
        if (!monitorModeSelect || !monitorTopicsIntervalInput || !monitorApplyButton) return;
  
        monitorModeSelect.addEventListener('change', () => {
          state.monitorMode = isTopicsMonitorMode(monitorModeSelect.value)
            ? MONITOR_MODE_ONLINE_BATTERY_TOPICS
            : MONITOR_MODE_ONLINE_BATTERY;
          syncMonitorConfigUi();
        });
  
        monitorTopicsIntervalInput.addEventListener('input', () => {
          state.monitorTopicsIntervalSec = clampMonitorTopicsInterval(monitorTopicsIntervalInput.value);
        });
  
        monitorApplyButton.addEventListener('click', () => {
          applyMonitorConfig();
        });
  
        syncMonitorConfigUi();
        loadMonitorConfig();
      }

  function initThemeControls() {
        initThemeSwitcher({
          selectElement: themeSelect,
          rootElement: document.documentElement,
          attributeName: DESIGN_SYSTEM_ATTRIBUTE,
          defaultThemeId: DEFAULT_DESIGN_SYSTEM_ID,
          storageKey: DESIGN_SYSTEM_STORAGE_KEY,
          themes: DESIGN_SYSTEM_OPTIONS,
          onApply: (designSystemId) => {
            applyThemeStyles(designSystemId).catch(() => {});
          },
        });
      }

  function scheduleMonitorParallelismSync() {
        if (state.monitorParallelismSyncTimer) {
          window.clearTimeout(state.monitorParallelismSyncTimer);
        }
        state.monitorParallelismSyncTimer = window.setTimeout(() => {
          state.monitorParallelismSyncTimer = null;
          syncMonitorParallelismWithFleet();
        }, 150);
      }

  async function syncMonitorParallelismWithFleet() {
        const targetParallelism = getFleetParallelism();
        if (state.monitorParallelismSyncInFlight) {
          state.monitorParallelismPendingValue = targetParallelism;
          return;
        }
        if (state.monitorParallelism === targetParallelism) return;
  
        state.monitorParallelismSyncInFlight = true;
        try {
          let nextTarget = targetParallelism;
          while (Number.isFinite(nextTarget)) {
            const response = await fetch(buildApiUrl('/api/monitor/config'), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                parallelism: clampFleetParallelism(nextTarget),
              }),
            });
            if (!response.ok) {
              break;
            }
            const payload = await response.json();
            applyMonitorConfigFromPayload(payload);
            const pending = state.monitorParallelismPendingValue;
            state.monitorParallelismPendingValue = null;
            if (pending === null || pending === undefined) {
              break;
            }
            const clampedPending = clampFleetParallelism(pending);
            if (clampedPending === state.monitorParallelism) {
              break;
            }
            nextTarget = clampedPending;
          }
        } catch (_error) {
          // Best effort sync; next slider interaction will retry.
        } finally {
          state.monitorParallelismSyncInFlight = false;
        }
      }

  function normalizePossibleResult(raw) {
        if (!raw || typeof raw !== 'object') return null;
        return {
          status: normalizeStatus(raw.status),
          value: normalizeText(raw.value, 'n/a'),
          details: normalizeText(raw.details, 'No detail available'),
        };
      }

  function normalizeTagList(value) {
        const list = Array.isArray(value) ? value : [];
        const seen = new Set();
        const out = [];
        list.forEach((item) => {
          const normalized = normalizeText(item, '').toLowerCase();
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          out.push(normalized);
        });
        return out;
      }

  function normalizeOwnerTags(value) {
        const tags = normalizeTagList(value);
        return tags.length ? tags : ['global'];
      }

  function normalizePlatformTags(value) {
        return normalizeTagList(value);
      }

  function normalizeTestDefinition(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = normalizeText(raw.id, '');
        if (!id) return null;
  
        const possibleResults = Array.isArray(raw.possibleResults)
          ? raw.possibleResults.map(normalizePossibleResult).filter(Boolean)
          : [];
        const fallback = possibleResults[0] || { status: 'warning', value: 'n/a', details: 'Awaiting check result' };
  
        return {
          id,
          label: normalizeText(raw.label, id),
          icon: normalizeText(raw.icon, '⚙️'),
          okText: normalizeText(raw.okText, 'Healthy'),
          failText: normalizeText(raw.failText, 'Needs attention'),
          enabled: raw.enabled !== false,
          manualOnly: raw.manualOnly !== false,
          runAtConnection: raw.runAtConnection === true,
          possibleResults,
          defaultStatus: normalizeStatus(raw.defaultStatus),
          defaultValue: normalizeText(raw.defaultValue, fallback.value),
          defaultDetails: normalizeText(raw.defaultDetails, fallback.details),
          ownerTags: normalizeOwnerTags(raw.ownerTags),
          platformTags: normalizePlatformTags(raw.platformTags),
        };
      }

  function normalizeAutoFixDefinition(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = normalizeText(raw.id, '');
        if (!id) return null;
        return {
          id,
          label: normalizeText(raw.label, id),
          description: normalizeText(raw.description, ''),
          ownerTags: normalizeOwnerTags(raw.ownerTags),
          platformTags: normalizePlatformTags(raw.platformTags),
        };
      }

  function normalizeRobotActivity(raw) {
        if (!JOB_QUEUE_ACTIVITY || typeof JOB_QUEUE_ACTIVITY.normalizeJobQueueSnapshot !== 'function') {
          throw new Error('JOB_QUEUE_ACTIVITY helper is required.');
        }

        if (!raw || typeof raw !== 'object') {
          return {
            searching: false,
            testing: false,
            phase: null,
            lastFullTestAt: 0,
            lastFullTestSource: null,
            updatedAt: 0,
            jobQueueVersion: 0,
            activeJob: null,
            queuedJobs: [],
          };
        }
        const phase = normalizeText(raw.phase, '');
        const updatedAt = Number(raw.updatedAt);
        const lastFullTestAt = Number(raw.lastFullTestAt);
        const lastFullTestSource = normalizeText(raw.lastFullTestSource, '');
        const queueSnapshot = JOB_QUEUE_ACTIVITY.normalizeJobQueueSnapshot(raw);
        return {
          searching: Boolean(raw.searching),
          testing: Boolean(raw.testing),
          phase: phase || null,
          lastFullTestAt: Number.isFinite(lastFullTestAt) && lastFullTestAt > 0 ? lastFullTestAt : 0,
          lastFullTestSource: lastFullTestSource || null,
          updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
          jobQueueVersion: queueSnapshot.jobQueueVersion,
          activeJob: queueSnapshot.activeJob,
          queuedJobs: queueSnapshot.queuedJobs,
        };
      }

  function normalizeRobotTypeConfig(payload) {
        const list = Array.isArray(payload?.robotTypes)
          ? payload.robotTypes
          : Array.isArray(payload)
            ? payload
            : [];
  
        return list
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const typeId = normalizeText(entry.typeId, normalizeText(entry.id, normalizeText(entry.name, '')));
            if (!typeId) return null;
  
            const tests = Array.isArray(entry.tests)
              ? entry.tests.map(normalizeTestDefinition).filter(Boolean)
              : [];
            const autoFixes = Array.isArray(entry.autoFixes)
              ? entry.autoFixes.map(normalizeAutoFixDefinition).filter(Boolean)
              : [];
  
            const topics = Array.isArray(entry.topics)
              ? entry.topics.map((topic) => normalizeText(topic, '')).filter(Boolean)
              : [];
            const testRefs = Array.isArray(entry.testRefs)
              ? entry.testRefs.map((testId) => normalizeText(testId, '')).filter(Boolean)
              : [];
            const fixRefs = Array.isArray(entry.fixRefs)
              ? entry.fixRefs.map((fixId) => normalizeText(fixId, '')).filter(Boolean)
              : [];
            const batteryCommand = normalizeText(entry?.autoMonitor?.batteryCommand, '');
            const rawModel = entry.model && typeof entry.model === 'object' ? entry.model : {};
            const modelFileName = normalizeText(rawModel.file_name, '');
            const modelPath = normalizeText(rawModel.path_to_quality_folders, '');
            const assetVersion = normalizeText(rawModel.asset_version, '');
            const availableQualitiesRaw = Array.isArray(rawModel.available_qualities)
              ? rawModel.available_qualities
              : Array.isArray(rawModel.availableQualities)
                ? rawModel.availableQualities
                : null;
            const availableQualities = Array.isArray(availableQualitiesRaw)
              ? availableQualitiesRaw
                  .map((quality) => normalizeText(quality, '').toLowerCase())
                  .filter(
                    (quality, index, list) =>
                      (quality === 'low' || quality === 'high') && list.indexOf(quality) === index,
                  )
              : null;
            const model =
              modelFileName || modelPath
                ? {
                    file_name: modelFileName,
                    path_to_quality_folders: modelPath,
                    ...(assetVersion ? { asset_version: assetVersion } : {}),
                    ...(availableQualities !== null ? { available_qualities: availableQualities } : {}),
                  }
                : null;
  
            return {
              typeId,
              typeKey: normalizeTypeId(typeId),
              label: normalizeText(entry.label, normalizeText(entry.name, typeId)),
              topics,
              testRefs,
              fixRefs,
              batteryCommand,
              tests,
              autoFixes,
              model,
            };
          })
          .filter(Boolean);
      }

  function buildGlobalTestDefinitions(robotTypes) {
        const definitions = new Map();
        DEFAULT_TEST_DEFINITIONS.forEach((def) => {
          definitions.set(def.id, { ...def });
        });
        robotTypes.forEach((typeConfig) => {
          (typeConfig.tests || []).forEach((def) => {
            definitions.set(def.id, { ...definitions.get(def.id), ...def });
          });
        });
        return Array.from(definitions.values());
      }

  function setRobotTypeDefinitions(payload) {
        const normalized = normalizeRobotTypeConfig(payload);
        const byId = new Map();
        normalized.forEach((entry) => {
          byId.set(entry.typeKey, entry);
          byId.set(normalizeTypeId(entry.label), entry);
        });
        env.ROBOT_TYPES = normalized;
        env.ROBOT_TYPE_BY_ID = byId;
        env.TEST_DEFINITIONS = buildGlobalTestDefinitions(normalized);
        return env.ROBOT_TYPES;
      }

  function getRobotTypeConfig(typeId) {
        return env.ROBOT_TYPE_BY_ID.get(normalizeTypeId(typeId)) || null;
      }

  function getRobotDefinitionsForType(typeId) {
        const typeCfg = getRobotTypeConfig(typeId);
        if (typeCfg) {
          return Array.isArray(typeCfg.tests) ? typeCfg.tests : [];
        }
        return [];
      }

  function getAutoFixesForType(typeId) {
        const typeCfg = getRobotTypeConfig(typeId);
        return Array.isArray(typeCfg?.autoFixes) ? typeCfg.autoFixes : [];
      }

  function formatTestValue(rawTests, id, def) {
        const result = rawTests && typeof rawTests[id] === 'object' ? rawTests[id] : null;
      return {
          status: result ? normalizeStatus(result.status) : normalizeStatus(def.defaultStatus),
          value: normalizeText(result ? result.value : def.defaultValue, def.defaultValue),
          details: normalizeText(result ? result.details : def.defaultDetails, def.defaultDetails),
          reason: normalizeText(result?.reason, ''),
          source: normalizeText(result?.source, ''),
          checkedAt: Number.isFinite(Number(result?.checkedAt)) ? Number(result.checkedAt) : 0,
        };
      }

  function normalizeRobotTests(rawTests, typeId) {
        const definitions = getRobotDefinitionsForType(typeId);
        const safeInput = rawTests && typeof rawTests === 'object' ? rawTests : {};
        const tests = {};
  
        definitions.forEach((def) => {
          tests[def.id] = formatTestValue(safeInput, def.id, def);
        });
  
        Object.entries(safeInput).forEach(([id, raw]) => {
          if (!tests[id] && raw && typeof raw === 'object') {
            tests[id] = {
              status: normalizeStatus(raw.status),
              value: normalizeText(raw.value, 'n/a'),
              details: normalizeText(raw.details, 'Backend populated test'),
              reason: normalizeText(raw.reason, ''),
              source: normalizeText(raw.source, ''),
              checkedAt: Number.isFinite(Number(raw?.checkedAt)) ? Number(raw.checkedAt) : 0,
            };
          }
        });
  
        return { tests, definitions };
      }

  function getDefinitionLabel(definitions, id) {
        return definitions.find((def) => def.id === id)?.label || id;
      }

  function getFallbackTestIconText(testId) {
        const normalizedId = normalizeText(testId, '').toLowerCase();
        const mapped = TEST_ICON_TEXT_FALLBACKS[normalizedId];
        if (mapped) return mapped;
        if (!normalizedId) return 'TST';
        return normalizedId.replace(/[^a-z0-9]+/g, '').slice(0, 3).toUpperCase() || 'TST';
      }

  function getTestIconPresentation(testId, rawIcon) {
        const icon = normalizeText(rawIcon, '');
        const shouldUseTextFallback = FORCE_TEXT_TEST_ICONS || !icon || icon === '[]';
        if (shouldUseTextFallback) {
          return {
            value: getFallbackTestIconText(testId),
            className: 'test-icon test-icon-fallback',
          };
        }
        return {
          value: icon,
          className: 'test-icon',
        };
      }

  function normalizeBatteryReason(reason) {
        return normalizeText(reason, '').toUpperCase();
      }

  function batteryReasonText(result, options = {}) {
        const reason = normalizeBatteryReason(result?.reason);
        if (reason === 'LOW_BATTERY') {
          if (options.short) return 'Low battery';
          return `Low battery (<${LOW_BATTERY_WARNING_PERCENT}%)`;
        }
        if (reason === 'BATTERY_UNREADABLE') {
          if (options.short) return 'Battery unreadable';
          return 'Battery unreadable';
        }
        if (reason === 'OFFLINE_STALE') {
          if (options.short) return 'Battery stale';
          return 'Battery stale (offline)';
        }
        return '';
      }

  function buildTestPreviewText(value, details, options = {}) {
        const prefix = normalizeText(options.prefix, '');
        const base = `${normalizeText(value, 'n/a')} • ${normalizeText(details, 'No detail available')}`;
        return prefix ? `${prefix} • ${base}` : base;
      }

  function buildTestPreviewTextForResult(testId, result) {
        const prefix =
          normalizeText(testId, '').toLowerCase() === 'battery'
            ? batteryReasonText(result)
            : '';
        return buildTestPreviewText(result?.value, result?.details, { prefix });
      }

  function syncModalScrollLock() {
        if (!document?.body) return;
        const shouldLock = state.testDebugModalOpen
          || state.isBugReportModalOpen
          || state.isRecorderLlmPromptModalOpen
          || state.isRecorderLlmImportModalOpen;
        document.body.classList.toggle(MODAL_SCROLL_LOCK_CLASS, shouldLock);
      }

  function readRobotField(robot, key) {
        if (robot && robot.ssh && typeof robot.ssh === 'object') {
          return robot.ssh[key];
        }
        return robot?.[key];
      }

  return {
    init() {},
    clampOnlineCountdownMs,
    getOnlineCheckCountdownMs,
    updateOnlineCheckEstimateFromResults,
    clampFleetParallelism,
    getFleetParallelism,
    syncFleetParallelismUi,
    setFleetParallelism,
    initFleetParallelism,
    clampMonitorTopicsInterval,
    clampMonitorBatteryInterval,
    clampMonitorOnlineInterval,
    isTopicsMonitorMode,
    setMonitorConfigStatus,
    syncMonitorConfigUi,
    applyMonitorConfigFromPayload,
    loadMonitorConfig,
    applyMonitorConfig,
    initMonitorConfigControls,
    initThemeControls,
    scheduleMonitorParallelismSync,
    syncMonitorParallelismWithFleet,
    normalizePossibleResult,
    normalizeTestDefinition,
    normalizeAutoFixDefinition,
    normalizeRobotActivity,
    normalizeRobotTypeConfig,
    buildGlobalTestDefinitions,
    setRobotTypeDefinitions,
    getRobotTypeConfig,
    getRobotDefinitionsForType,
    getAutoFixesForType,
    formatTestValue,
    normalizeRobotTests,
    getDefinitionLabel,
    getFallbackTestIconText,
    getTestIconPresentation,
    normalizeBatteryReason,
    batteryReasonText,
    buildTestPreviewText,
    buildTestPreviewTextForResult,
    syncModalScrollLock,
    readRobotField,
  };
}
