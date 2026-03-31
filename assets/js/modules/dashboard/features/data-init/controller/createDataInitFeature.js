export function createDataInitFeature(context, maybeEnv) {
  const runtime = maybeEnv ? context : context?.bridge || context?.runtime || context?.services || {};
  const env = maybeEnv || context?.env || context;
  const {
    $,
    $$,
    CAN_USE_MODEL_VIEWER,
    DEFAULT_ROBOT_MODEL_URL,
    DEFAULT_TEST_DEFINITIONS,
    DETAIL_TERMINAL_PRESET_IDS,
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
    addRobotTypeForm,
    addRobotSection,
    addRobotTypeSelect,
    editRobotTypeDeleteButton,
    editRobotTypeForm,
    editRobotTypeManageSelect,
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
    editRobotSelect,
    detailFixModeActions,
    detailFixModePanel,
    detailFixModeStatus,
    detailFixModeSummary,
    detailTerminalShell,
    emptyState,
    filterError,
    filterActiveOwner,
    filterOwnerTags,
    filterPlatformTags,
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
  } = env;

  const addRecorderOutputVisual = (...args) => runtime.addRecorderOutputVisual(...args);
  const addRecorderReadVisual = (...args) => runtime.addRecorderReadVisual(...args);
  const addRobotIdsToSelection = (...args) => runtime.addRobotIdsToSelection(...args);
  const appendTerminalLine = (...args) => runtime.appendTerminalLine(...args);
  const appendTerminalPayload = (...args) => runtime.appendTerminalPayload(...args);
  const applyDashboardMetaFromVisible = (...args) => runtime.applyDashboardMetaFromVisible(...args);
  const applyFilters = (...args) => runtime.applyFilters(...args);
  const applyMonitorConfig = (...args) => runtime.applyMonitorConfig(...args);
  const applyMonitorConfigFromPayload = (...args) => runtime.applyMonitorConfigFromPayload(...args);
  const applyRecorderMappings = (...args) => runtime.applyRecorderMappings(...args);
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
  const clearRecorderOutputForm = (...args) => runtime.clearRecorderOutputForm(...args);
  const clearRecorderReadForm = (...args) => runtime.clearRecorderReadForm(...args);
  const closeBugReportModal = (...args) => runtime.closeBugReportModal(...args);
  const closeRecorderTerminalSession = (...args) => runtime.closeRecorderTerminalSession(...args);
  const closeTerminalSession = (...args) => runtime.closeTerminalSession(...args);
  const closeTestDebugModal = (...args) => runtime.closeTestDebugModal(...args);
  const createRobotFromForm = (...args) => runtime.createRobotFromForm(...args);
  const createRobotTypeFromForm = (...args) => runtime.createRobotTypeFromForm(...args);
  const cycleOnlineSortMode = (...args) => runtime.cycleOnlineSortMode(...args);
  const deleteManageFixDefinition = (...args) => runtime.deleteManageFixDefinition(...args);
  const deleteManageTestDefinition = (...args) => runtime.deleteManageTestDefinition(...args);
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
  const getSelectedMappingTypeIds = (...args) => runtime.getSelectedMappingTypeIds(...args);
  const getSelectedRecorderTypeIds = (...args) => runtime.getSelectedRecorderTypeIds(...args);
  const getSelectedRobotIds = (...args) => runtime.getSelectedRobotIds(...args);
  const getStatusChipTone = (...args) => runtime.getStatusChipTone(...args);
  const getTestIconPresentation = (...args) => runtime.getTestIconPresentation(...args);
  const getTestingCountdownText = (...args) => runtime.getTestingCountdownText(...args);
  const getTimestamp = (...args) => runtime.getTimestamp(...args);
  const getVisibleOfflineRobotIds = (...args) => runtime.getVisibleOfflineRobotIds(...args);
  const getVisibleOnlineRobotIds = (...args) => runtime.getVisibleOnlineRobotIds(...args);
  const hideRecorderReadPopover = (...args) => runtime.hideRecorderReadPopover(...args);
  const initAddRobotPasswordToggle = (...args) => runtime.initAddRobotPasswordToggle(...args);
  const initFleetParallelism = (...args) => runtime.initFleetParallelism(...args);
  const initManageTabs = (...args) => runtime.initManageTabs(...args);
  const initMonitorConfigControls = (...args) => runtime.initMonitorConfigControls(...args);
  const initRobotRegistryPanels = (...args) => runtime.initRobotRegistryPanels(...args);
  const initRobotOverrideControls = (...args) => runtime.initRobotOverrideControls(...args);
  const initRobotTerminal = (...args) => runtime.initRobotTerminal(...args);
  const initRobotTypeUploadInputs = (...args) => runtime.initRobotTypeUploadInputs(...args);
  const initThemeControls = (...args) => runtime.initThemeControls(...args);
  const initWorkflowRecorder = (...args) => runtime.initWorkflowRecorder(...args);
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
  const loadDefinitionsSummary = (...args) => runtime.loadDefinitionsSummary(...args);
  const loadMonitorConfig = (...args) => runtime.loadMonitorConfig(...args);
  const mapRobots = (...args) => runtime.mapRobots(...args);
  const nonBatteryTestEntries = (...args) => runtime.nonBatteryTestEntries(...args);
  const normalizeAutoFixDefinition = (...args) => runtime.normalizeAutoFixDefinition(...args);
  const normalizeBatteryPercentForSort = (...args) => runtime.normalizeBatteryPercentForSort(...args);
  const normalizeBatteryReason = (...args) => runtime.normalizeBatteryReason(...args);
  const normalizeCheckedAtMs = (...args) => runtime.normalizeCheckedAtMs(...args);
  const normalizeCountdownMs = (...args) => runtime.normalizeCountdownMs(...args);
  const normalizeDefinitionsSummary = (...args) => runtime.normalizeDefinitionsSummary(...args);
  const normalizeIdList = (...args) => runtime.normalizeIdList(...args);
  const normalizeManageTab = (...args) => runtime.normalizeManageTab(...args);
  const normalizePossibleResult = (...args) => runtime.normalizePossibleResult(...args);
  const normalizeRobotActivity = (...args) => runtime.normalizeRobotActivity(...args);
  const normalizeRobotData = (...args) => runtime.normalizeRobotData(...args);
  const normalizeRobotTests = (...args) => runtime.normalizeRobotTests(...args);
  const normalizeRobotTypeConfig = (...args) => runtime.normalizeRobotTypeConfig(...args);
  const normalizeStepDebug = (...args) => runtime.normalizeStepDebug(...args);
  const normalizeTestDebugCollection = (...args) => runtime.normalizeTestDebugCollection(...args);
  const normalizeTestDebugResult = (...args) => runtime.normalizeTestDebugResult(...args);
  const normalizeTestDefinition = (...args) => runtime.normalizeTestDefinition(...args);
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
  const populateEditRobotTypeOptions = (...args) => runtime.populateEditRobotTypeOptions(...args);
  const populateEditRobotSelectOptions = (...args) => runtime.populateEditRobotSelectOptions(...args);
  const populateFilters = (...args) => runtime.populateFilters(...args);
  const publishRecorderAsTest = (...args) => runtime.publishRecorderAsTest(...args);
  const queryCardByRobotId = (...args) => runtime.queryCardByRobotId(...args);
  const readRobotField = (...args) => runtime.readRobotField(...args);
  const rebuildRobotIndex = (...args) => runtime.rebuildRobotIndex(...args);
  const reconcileLoadedRobotDefinitions = (...args) => runtime.reconcileLoadedRobotDefinitions(...args);
  const refreshRobotsFromBackendSnapshot = (...args) => runtime.refreshRobotsFromBackendSnapshot(...args);
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
  const runAutoFixCandidate = (...args) => runtime.runAutoFixCandidate(...args);
  const runAutoFixForRobot = (...args) => runtime.runAutoFixForRobot(...args);
  const runFallbackChecks = (...args) => runtime.runFallbackChecks(...args);
  const runFallbackCommandSimulation = (...args) => runtime.runFallbackCommandSimulation(...args);
  const runManualTests = (...args) => runtime.runManualTests(...args);
  const runOneRobotOnlineCheck = (...args) => runtime.runOneRobotOnlineCheck(...args);
  const runOnlineCheckForAllRobots = (...args) => runtime.runOnlineCheckForAllRobots(...args);
  const runRecorderCommandAndCapture = (...args) => runtime.runRecorderCommandAndCapture(...args);
  const runRobotTestsForRobot = (...args) => runtime.runRobotTestsForRobot(...args);
  const saveManageFixDefinition = (...args) => runtime.saveManageFixDefinition(...args);
  const saveManageTestDefinition = (...args) => runtime.saveManageTestDefinition(...args);
  const saveRobotEditsFromForm = (...args) => runtime.saveRobotEditsFromForm(...args);
  const saveRobotTypeEditsFromForm = (...args) => runtime.saveRobotTypeEditsFromForm(...args);
  const scheduleMonitorParallelismSync = (...args) => runtime.scheduleMonitorParallelismSync(...args);
  const selectAllOfflineRobots = (...args) => runtime.selectAllOfflineRobots(...args);
  const selectAllOnlineRobots = (...args) => runtime.selectAllOnlineRobots(...args);
  const selectAllRobots = (...args) => runtime.selectAllRobots(...args);
  const selectRobotIds = (...args) => runtime.selectRobotIds(...args);
  const setActiveManageTab = (...args) => runtime.setActiveManageTab(...args);
  const setAddRobotMessage = (...args) => runtime.setAddRobotMessage(...args);
  const setEditRobotMessage = (...args) => runtime.setEditRobotMessage(...args);
  const setEditRobotTypeMessage = (...args) => runtime.setEditRobotTypeMessage(...args);
  const setAddRobotPasswordVisibility = (...args) => runtime.setAddRobotPasswordVisibility(...args);
  const setBugReportStatus = (...args) => runtime.setBugReportStatus(...args);
  const setFixModeStatus = (...args) => runtime.setFixModeStatus(...args);
  const setFleetOnlineButtonIdleLabel = (...args) => runtime.setFleetOnlineButtonIdleLabel(...args);
  const setFleetOnlineButtonState = (...args) => runtime.setFleetOnlineButtonState(...args);
  const setFleetParallelism = (...args) => runtime.setFleetParallelism(...args);
  const setLocationHash = (...args) => runtime.setLocationHash(...args);
  const setManageEditorStatus = (...args) => runtime.setManageEditorStatus(...args);
  const setManageTabStatus = (...args) => runtime.setManageTabStatus(...args);
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
  const slugifyRecorderValue = (...args) => runtime.slugifyRecorderValue(...args);
  const sortOnlineRobots = (...args) => runtime.sortOnlineRobots(...args);
  const startOnlineRefreshStatusTimer = (...args) => runtime.startOnlineRefreshStatusTimer(...args);
  const startTestingCountdowns = (...args) => runtime.startTestingCountdowns(...args);
  const statusChip = (...args) => runtime.statusChip(...args);
  const statusFromScore = (...args) => runtime.statusFromScore(...args);
  const statusSortRank = (...args) => runtime.statusSortRank(...args);
  const stopOnlineRefreshStatusTimer = (...args) => runtime.stopOnlineRefreshStatusTimer(...args);
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
  const updateOnlineCheckEstimateFromResults = (...args) => runtime.updateOnlineCheckEstimateFromResults(...args);
  const updateRobotTestState = (...args) => runtime.updateRobotTestState(...args);
  const updateSelectionSummary = (...args) => runtime.updateSelectionSummary(...args);
  const updateTestMappings = (...args) => runtime.updateTestMappings(...args);
  const deleteSelectedRobotFromForm = (...args) => runtime.deleteSelectedRobotFromForm(...args);
  const deleteSelectedRobotTypeFromForm = (...args) => runtime.deleteSelectedRobotTypeFromForm(...args);
  const fillEditRobotForm = (...args) => runtime.fillEditRobotForm(...args);

  async function loadRobotConfig() {
        try {
          const response = await fetch(ROBOTS_CONFIG_URL);
          if (!response.ok) throw new Error('config unavailable');
          const payload = await response.json();
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.robots)) return payload.robots;
          if (Array.isArray(payload?.fleet)) return payload.fleet;
          return [];
        } catch (_error) {
          return [];
        }
      }

  async function loadFleetStaticState() {
        const response = await fetch(buildApiUrl(FLEET_STATIC_ENDPOINT));
        if (!response.ok) throw new Error('fleet static unavailable');
        const payload = await response.json();
        if (!Array.isArray(payload?.robots)) throw new Error('fleet static payload invalid');
        return payload.robots;
      }

  async function loadFleetRuntimeDelta(sinceVersion = 0) {
        const cursor = Math.max(0, Number.isFinite(Number(sinceVersion)) ? Math.trunc(Number(sinceVersion)) : 0);
        const response = await fetch(
          buildApiUrl(`${FLEET_RUNTIME_ENDPOINT}?since=${encodeURIComponent(String(cursor))}`),
        );
        if (!response.ok) throw new Error('fleet runtime unavailable');
        const payload = await response.json();
        const runtimeVersion = Number.isFinite(Number(payload?.version))
          ? Math.max(0, Math.trunc(Number(payload.version)))
          : cursor;
        return {
          version: runtimeVersion,
          full: Boolean(payload?.full),
          robots: Array.isArray(payload?.robots) ? payload.robots : [],
        };
      }

  async function loadRobotTypeConfig() {
        try {
          const response = await fetch(buildApiUrl('/api/robot-types'));
          if (!response.ok) throw new Error('api unavailable');
          const payload = await response.json();
          const nextTypes = setRobotTypeDefinitions(payload);
          reconcileLoadedRobotDefinitions();
          return nextTypes;
        } catch (_error) {
          try {
            const response = await fetch(ROBOT_TYPES_CONFIG_URL);
            if (!response.ok) throw new Error('config unavailable');
            const payload = await response.json();
            const nextTypes = setRobotTypeDefinitions(payload);
            reconcileLoadedRobotDefinitions();
            return nextTypes;
          } catch (_fallbackError) {
            setRobotTypeDefinitions([]);
            reconcileLoadedRobotDefinitions();
            return [];
          }
        }
      }

  function normalizeRuntimeTestUpdate(testId, raw) {
        if (!raw || typeof raw !== 'object') return null;
        const source = normalizeText(raw.source, '');
        if (!RUNTIME_ALLOWED_SOURCES.has(source)) {
          return null;
        }
  
        return {
          status: normalizeStatus(raw.status),
          value: normalizeText(raw.value, 'n/a'),
          details: normalizeText(raw.details, 'No detail available'),
          reason: normalizeText(raw.reason, ''),
          source,
          checkedAt: Number.isFinite(Number(raw?.checkedAt)) ? Number(raw.checkedAt) : 0,
        };
      }

  function runtimeActivityHasSignal(activity) {
        const normalized = normalizeRobotActivity(activity);
        return Boolean(
          normalized.searching ||
            normalized.testing ||
            normalizeText(normalized.phase, '') ||
            Number(normalized.lastFullTestAt) > 0 ||
            normalizeText(normalized.lastFullTestSource, '') ||
            Number(normalized.updatedAt) > 0 ||
            Number(normalized.jobQueueVersion) > 0 ||
            Boolean(normalized.activeJob) ||
            (Array.isArray(normalized.queuedJobs) && normalized.queuedJobs.length > 0),
        );
      }

  function normalizeRuntimeRobotEntry(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = normalizeText(raw.id, '');
        if (!id) return null;
        const tests = {};
        let battery = null;
        Object.entries(raw.tests || {}).forEach(([testId, payload]) => {
          const update = normalizeRuntimeTestUpdate(testId, payload);
          if (!update) return;
          if (normalizeText(testId, '').toLowerCase() === 'battery' && normalizeText(update.source, '') === MONITOR_SOURCE) {
            battery = update;
            return;
          }
          tests[testId] = update;
        });
        const activity = normalizeRobotActivity(raw.activity);
        return {
          id,
          tests,
          battery,
          activity,
          hasRuntimeData: Object.keys(tests).length > 0 || Boolean(battery) || runtimeActivityHasSignal(activity),
        };
      }

  function haveRuntimeTestsChanged(previousTests, nextTests) {
        const prev = previousTests && typeof previousTests === 'object' ? previousTests : {};
        const next = nextTests && typeof nextTests === 'object' ? nextTests : {};
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) return true;
        return nextKeys.some((testId) => {
          const prior = prev[testId] || {};
          const nextValue = next[testId] || {};
          return (
            normalizeStatus(prior.status) !== normalizeStatus(nextValue.status) ||
            normalizeText(prior.value, '') !== normalizeText(nextValue.value, '') ||
            normalizeText(prior.details, '') !== normalizeText(nextValue.details, '') ||
            normalizeText(prior.reason, '') !== normalizeText(nextValue.reason, '') ||
            normalizeText(prior.source, '') !== normalizeText(nextValue.source, '') ||
            Number(prior.checkedAt || 0) !== Number(nextValue.checkedAt || 0)
          );
        });
      }

  function resolveRuntimeVersion(rawVersion, fallbackVersion = 0) {
        const fallback = Number.isFinite(Number(fallbackVersion)) ? Math.trunc(Number(fallbackVersion)) : 0;
        const resolved = Number.isFinite(Number(rawVersion)) ? Math.trunc(Number(rawVersion)) : fallback;
        return Math.max(0, resolved);
      }

  function mergeRuntimeRobotsIntoList(currentRobots, runtimeEntries, options = {}) {
        const robots = Array.isArray(currentRobots) ? currentRobots : [];
        const respectLocalPriority = options?.respectLocalPriority !== false;
        const fullSnapshot = options?.fullSnapshot === true;
        const runtimeById = new Map(
          (Array.isArray(runtimeEntries) ? runtimeEntries : [])
            .map((entry) => normalizeRuntimeRobotEntry(entry))
            .filter(Boolean)
            .map((entry) => [entry.id, entry]),
        );
        const changedRobotIds = new Set();
        const merged = robots.map((currentRobot) => {
          const id = robotId(currentRobot);
          if (!id) return currentRobot;
          const runtimeEntry = runtimeById.get(id) || (fullSnapshot
            ? {
                id,
                tests: {},
                activity: normalizeRobotActivity({}),
                hasRuntimeData: false,
              }
            : null);
          if (!runtimeEntry) return currentRobot;
  
          const hasLocalPriorityActivity =
            respectLocalPriority &&
            (state.testingRobotIds.has(id) || state.searchingRobotIds.has(id) || state.fixingRobotIds.has(id));
  
          const previousActivity = normalizeRobotActivity(currentRobot?.activity);
          const shouldClearRuntime = !hasLocalPriorityActivity && !runtimeEntry.hasRuntimeData;
          const baseTests = shouldClearRuntime
            ? normalizeRobotTests({}, currentRobot?.typeId).tests
            : currentRobot?.tests || {};
          const previousBattery =
            currentRobot?.battery && typeof currentRobot.battery === 'object'
              ? currentRobot.battery
              : null;
          const nextTests = hasLocalPriorityActivity
            ? currentRobot?.tests || {}
            : {
                ...baseTests,
                ...(runtimeEntry.tests || {}),
              };
          const nextBattery = hasLocalPriorityActivity
            ? previousBattery
            : shouldClearRuntime
              ? null
              : runtimeEntry.battery
                ? runtimeEntry.battery
                : fullSnapshot
                  ? null
                  : previousBattery;
          const nextActivity = shouldClearRuntime
            ? normalizeRobotActivity({})
            : hasLocalPriorityActivity
              ? {
                  ...runtimeEntry.activity,
                  searching: previousActivity.searching,
                  testing: previousActivity.testing,
                  phase: previousActivity.phase,
                }
              : runtimeEntry.activity;

          const previousActiveJob = previousActivity?.activeJob || null;
          const nextActiveJob = nextActivity?.activeJob || null;
          const previousQueuedJobs = Array.isArray(previousActivity?.queuedJobs) ? previousActivity.queuedJobs : [];
          const nextQueuedJobs = Array.isArray(nextActivity?.queuedJobs) ? nextActivity.queuedJobs : [];
          const jobSummaryChanged = (prior, nextValue) =>
            normalizeText(prior?.id, '') !== normalizeText(nextValue?.id, '')
            || normalizeText(prior?.kind, '') !== normalizeText(nextValue?.kind, '')
            || normalizeText(prior?.status, '') !== normalizeText(nextValue?.status, '')
            || normalizeText(prior?.source, '') !== normalizeText(nextValue?.source, '')
            || normalizeText(prior?.label, '') !== normalizeText(nextValue?.label, '')
            || Number(prior?.enqueuedAt || 0) !== Number(nextValue?.enqueuedAt || 0)
            || Number(prior?.startedAt || 0) !== Number(nextValue?.startedAt || 0)
            || Number(prior?.updatedAt || 0) !== Number(nextValue?.updatedAt || 0);
          const queuedJobsChanged = previousQueuedJobs.length !== nextQueuedJobs.length
            || nextQueuedJobs.some((job, index) => jobSummaryChanged(previousQueuedJobs[index], job));
  
          const activityChanged =
            previousActivity.searching !== nextActivity.searching ||
            previousActivity.testing !== nextActivity.testing ||
            normalizeText(previousActivity.phase, '') !== normalizeText(nextActivity.phase, '') ||
            Number(previousActivity.lastFullTestAt) !== Number(nextActivity.lastFullTestAt) ||
            normalizeText(previousActivity.lastFullTestSource, '') !== normalizeText(nextActivity.lastFullTestSource, '') ||
            Number(previousActivity.updatedAt) !== Number(nextActivity.updatedAt) ||
            Number(previousActivity.jobQueueVersion || 0) !== Number(nextActivity.jobQueueVersion || 0) ||
            jobSummaryChanged(previousActiveJob, nextActiveJob) ||
            queuedJobsChanged;
          const testsChanged = haveRuntimeTestsChanged(currentRobot?.tests || {}, nextTests);
          const batteryChanged =
            normalizeStatus(previousBattery?.status) !== normalizeStatus(nextBattery?.status) ||
            normalizeText(previousBattery?.value, '') !== normalizeText(nextBattery?.value, '') ||
            normalizeText(previousBattery?.details, '') !== normalizeText(nextBattery?.details, '') ||
            normalizeText(previousBattery?.reason, '') !== normalizeText(nextBattery?.reason, '') ||
            normalizeText(previousBattery?.source, '') !== normalizeText(nextBattery?.source, '') ||
            Number(previousBattery?.checkedAt || 0) !== Number(nextBattery?.checkedAt || 0);

          if (!activityChanged && !testsChanged && !batteryChanged) {
            return currentRobot;
          }

          changedRobotIds.add(id);
          return {
            ...currentRobot,
            tests: nextTests,
            battery: nextBattery,
            activity: nextActivity,
          };
        });
  
        return {
          merged,
          changedRobotIds,
        };
      }

  async function refreshRuntimeStateFromBackend() {
        if (state.isRuntimeSyncInFlight) return;
        state.isRuntimeSyncInFlight = true;
        try {
          const delta = await loadFleetRuntimeDelta(state.runtimeVersion);
          state.runtimeVersion = resolveRuntimeVersion(delta.version, state.runtimeVersion);
          const mergedRuntime = mergeRuntimeRobotsIntoList(state.robots, delta.robots, {
            respectLocalPriority: true,
            fullSnapshot: delta.full,
          });
          if (mergedRuntime.changedRobotIds.size > 0) {
            setRobots(mergedRuntime.merged);
          }
          syncAutomatedRobotActivityFromState();
          syncAutoMonitorRefreshState();
          if (mergedRuntime.changedRobotIds.size > 0) {
            applyRuntimeRobotPatches(mergedRuntime.changedRobotIds);
          }
        } catch (_error) {
          // Keep existing UI state on transient backend fetch failures.
        } finally {
          state.isRuntimeSyncInFlight = false;
        }
      }

  function hasActiveRuntimeWork() {
        return Boolean(
          state.testingRobotIds?.size
          || state.searchingRobotIds?.size
          || state.fixingRobotIds?.size
          || state.autoActivityRobotIds?.size
          || state.isTestRunInProgress
          || state.isOnlineRefreshInFlight
          || state.isAutoFixInProgress,
        );
      }

  function getRuntimeSyncIntervalMs() {
        const activeInterval = Math.max(900, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 0.66));
        const idleVisibleInterval = Math.max(2500, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 1.6));
        const hiddenInterval = Math.max(6000, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 4));
        if (document?.visibilityState === 'hidden') {
          return hiddenInterval;
        }
        if (hasActiveRuntimeWork()) {
          return activeInterval;
        }
        return idleVisibleInterval;
      }

  function scheduleRuntimeStateSync(delayMs = null) {
        if (state.runtimeSyncTimer) {
          window.clearTimeout(state.runtimeSyncTimer);
        }
        const nextDelayMs = Number.isFinite(Number(delayMs))
          ? Math.max(0, Math.floor(Number(delayMs)))
          : getRuntimeSyncIntervalMs();
        state.runtimeSyncTimer = window.setTimeout(async () => {
          state.runtimeSyncTimer = null;
          await refreshRuntimeStateFromBackend();
          scheduleRuntimeStateSync();
        }, nextDelayMs);
      }

  function startRuntimeStateSync() {
        if (state.runtimeSyncTimer) return;
        scheduleRuntimeStateSync(0);
      }

  function stopRuntimeStateSync() {
        if (!state.runtimeSyncTimer) return;
        window.clearTimeout(state.runtimeSyncTimer);
        state.runtimeSyncTimer = null;
      }

  async function loadRobotsFromBackend() {
        const [fleetStatic] = await Promise.all([
          loadFleetStaticState().catch(() => loadRobotConfig()),
          loadRobotTypeConfig(),
        ]);
        const normalizedStatic = normalizeRobotData(Array.isArray(fleetStatic) ? fleetStatic : []);
        try {
          const delta = await loadFleetRuntimeDelta(0);
          state.runtimeVersion = resolveRuntimeVersion(delta.version, 0);
          const mergedRuntime = mergeRuntimeRobotsIntoList(normalizedStatic, delta.robots, {
            respectLocalPriority: false,
            fullSnapshot: delta.full,
          });
          return mergedRuntime.merged;
        } catch (_e) {
          state.runtimeVersion = 0;
          return normalizedStatic;
        }
      }

  function routeFromHash() {
        const hash = window.location.hash.replace(/^#/, '');
        if (!hash) {
          showDashboard({ syncHash: false });
          return;
        }
        const manageRoute = parseManageRoute(hash);
        if (manageRoute.isManageRoute) {
          const shouldCanonicalize = hash === 'add-robot';
          showAddRobotPage({
            tabId: manageRoute.tabId,
            syncHash: shouldCanonicalize,
            refreshDefinitions: !isManageViewActive(),
          });
          return;
        }
        if (!hash.startsWith('robot/')) return;
        const id = hash.split('/')[1];
        if (id) openDetail(id, { syncHash: false });
      }

  function openManageRobotsFromDashboard() {
        showAddRobotPage({
          tabId: 'robots',
          robotRegistryPanelId: 'existing-robots',
        });
      }

  function initDashboardController() {
        hydrateActionButtons(document);
        initThemeControls();
        syncModalScrollLock();
        try {
          state.terminalComponent = new RobotTerminalComponent({
            terminalElement: terminal,
            toolbarElement: terminalToolbar,
            badgeElement: terminalBadge,
            hintElement: terminalHint,
            terminalCtor: window.Terminal,
            fitAddonCtor: window.FitAddon ? window.FitAddon.FitAddon : null,
            endpointBuilder: (robotId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal`),
            onFallbackMode: runFallbackChecks,
            onFallbackCommand: (robot, command, commandId, reason) =>
              runFallbackCommandSimulation(robot, command, commandId, reason),
            onModeChange: (mode) => {
              state.terminalMode = mode;
            },
            showReconnectButton: true,
            showRebuildButton: true,
            showFullscreenButton: false,
          });
        } catch (error) {
          console.error('Terminal component initialization failed, falling back to compatibility mode.', error);
          state.terminalComponent = {
            mode: 'fallback',
            connect: (robot) => {
              if (!robot) return;
              if (terminalBadge) terminalBadge.className = 'terminal-status warn';
              if (terminalBadge) terminalBadge.textContent = 'Terminal fallback mode';
              if (terminalHint) terminalHint.textContent = 'Command endpoint not found. Using fallback simulation.';
              if (terminal) terminal.classList.add('fallback');
              runFallbackChecks(robot);
            },
            dispose: () => {
              state.terminalMode = 'fallback';
              if (terminalBadge) terminalBadge.className = 'terminal-status warn';
              if (terminalBadge) terminalBadge.textContent = 'Terminal component error';
              if (terminalHint) terminalHint.textContent = 'Command endpoint not found. Using fallback simulation.';
            },
            fit: () => {},
            runCommand: async () => {},
          };
        }
  
        Promise.resolve()
          .then(loadRobotsFromBackend)
          .then((robots) => {
            setRobots(robots);
            syncAutomatedRobotActivityFromState();
            syncAutoMonitorRefreshState();
            populateFilters();
            populateAddRobotTypeOptions();
            populateEditRobotSelectOptions();
            renderRecorderRobotOptions();
            renderDashboard();
            routeFromHash();
            syncFixModePanels();
          })
          .catch(() => {
            setRobots([]);
            syncAutomatedRobotActivityFromState();
            syncAutoMonitorRefreshState();
            populateFilters();
            populateAddRobotTypeOptions();
            populateEditRobotSelectOptions();
            renderRecorderRobotOptions();
            renderDashboard();
            routeFromHash();
            syncFixModePanels();
          });
  
        $('#searchName').addEventListener('input', onFilterChange);
        filterType.addEventListener('change', onFilterChange);
        filterError.addEventListener('change', onFilterChange);
        filterOwnerTags?.addEventListener('change', onFilterChange);
        filterPlatformTags?.addEventListener('change', onFilterChange);
        filterActiveOwner?.addEventListener('change', onFilterChange);
        syncOnlineSortButton();
        cycleOnlineSortButton?.addEventListener('click', () => {
          cycleOnlineSortMode();
        });
        $('#backToFleet').addEventListener('click', showDashboard);
        $('#openAddRobot')?.addEventListener('click', openManageRobotsFromDashboard);
        $('#openBugReport')?.addEventListener('click', openBugReportModal);
        $('#openBugReportFloating')?.addEventListener('click', openBugReportModal);
        $('#backFromAddRobot')?.addEventListener('click', showDashboard);
        initManageTabs();
        initRobotRegistryPanels();
        initRobotOverrideControls();
        initWorkflowRecorder();
        initRobotTypeUploadInputs();
        initVisualFlows();
        if (addRobotForm) {
          addRobotForm.addEventListener('submit', (event) => {
            event.preventDefault();
            createRobotFromForm();
          });
        }
        if (editRobotSelect) {
          editRobotSelect.addEventListener('change', () => {
            const selectedId = normalizeText(editRobotSelect.value, '');
            state.selectedManageRobotId = selectedId;
            populateEditRobotSelectOptions(selectedId);
            setEditRobotMessage('', '');
          });
        }
        if (editRobotForm) {
          editRobotForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveRobotEditsFromForm();
          });
        }
        if (editRobotDeleteButton) {
          editRobotDeleteButton.addEventListener('click', () => {
            deleteSelectedRobotFromForm();
          });
        }
        if (editRobotTypeManageSelect) {
          editRobotTypeManageSelect.addEventListener('change', () => {
            const selectedTypeId = normalizeText(editRobotTypeManageSelect.value, '');
            state.selectedManageRobotTypeId = selectedTypeId;
            populateEditRobotTypeOptions(selectedTypeId);
            setEditRobotTypeMessage('', '');
          });
        }
        if (editRobotTypeForm) {
          editRobotTypeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveRobotTypeEditsFromForm();
          });
        }
        if (editRobotTypeDeleteButton) {
          editRobotTypeDeleteButton.addEventListener('click', () => {
            deleteSelectedRobotTypeFromForm();
          });
        }
        if (addRobotTypeForm) {
          addRobotTypeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            createRobotTypeFromForm();
          });
        }
        if (manageTestEditorForm) {
          manageTestEditorForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveManageTestDefinition();
          });
        }
        if (manageFixEditorForm) {
          manageFixEditorForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveManageFixDefinition();
          });
        }
        initFleetParallelism();
        initMonitorConfigControls();
        initAddRobotPasswordToggle();
        if (activateTerminalButton) {
          activateTerminalButton.addEventListener('click', () => {
            const robot = state.robots.find((r) => robotId(r) === state.detailRobotId);
            if (!robot) return;
            initRobotTerminal(robot);
          });
        }
        if (toggleDashboardFixModeButton) {
          toggleDashboardFixModeButton.addEventListener('click', () => {
            toggleFixMode(FIX_MODE_CONTEXT_DASHBOARD);
          });
        }
        if (toggleDetailFixModeButton) {
          toggleDetailFixModeButton.addEventListener('click', () => {
            toggleFixMode(FIX_MODE_CONTEXT_DETAIL);
          });
        }
  
        window.addEventListener('hashchange', () => {
          if (state.ignoreNextHashChange) {
            state.ignoreNextHashChange = false;
            return;
          }
          if (!window.location.hash) {
            showDashboard({ syncHash: false });
            return;
          }
          routeFromHash();
        });
  
        window.addEventListener('resize', () => {
          if (state.terminalComponent && state.terminalMode === 'live') {
            state.terminalComponent.fit();
          }
        });
        if (testDebugClose) {
          testDebugClose.addEventListener('click', closeTestDebugModal);
        }
        if (testDebugModal) {
          testDebugModal.addEventListener('click', (event) => {
            if (event.target === testDebugModal || event.target?.dataset?.action === 'close-modal') {
              closeTestDebugModal();
            }
          });
        }
        if (cancelBugReportButton) {
          cancelBugReportButton.addEventListener('click', closeBugReportModal);
        }
        if (submitBugReportButton) {
          submitBugReportButton.addEventListener('click', submitBugReport);
        }
        if (bugReportModal) {
          bugReportModal.addEventListener('click', (event) => {
            if (event.target === bugReportModal) {
              closeBugReportModal();
            }
          });
        }
        document.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape') return;
          if (state.testDebugModalOpen) {
            closeTestDebugModal();
          }
          if (state.isBugReportModalOpen) {
            closeBugReportModal();
          }
        });
  
        const selectAllRobotsButton = $('#selectAllRobots');
        if (selectAllRobotsButton) {
          selectAllRobotsButton.addEventListener('click', () => {
            selectAllRobots();
          });
        }
  
        $('#selectAllOnlineRobots').addEventListener('click', () => {
          selectAllOnlineRobots();
        });
  
        $('#selectAllOfflineRobots').addEventListener('click', () => {
          selectAllOfflineRobots();
        });
  
        $('#runFleetOnline').addEventListener('click', () => {
          runOnlineCheckForAllRobots();
        });
  
        $('#runRobotTests').addEventListener('click', () => {
          if (!state.detailRobotId) return;
          runManualTests({ fallbackToActive: true });
        });
  
        $('#runSelectedRobotTests').addEventListener('click', () => {
          runManualTests({ fallbackToActive: false, autoSelectOnlineWhenEmpty: true });
        });
  
        startRuntimeStateSync();
        document.addEventListener('visibilitychange', () => {
          if (state.runtimeSyncTimer) {
            scheduleRuntimeStateSync(0);
          }
        });
        window.addEventListener('beforeunload', () => {
          stopRuntimeStateSync();
          stopOnlineRefreshStatusTimer();
        });
      }

  return {
    init: initDashboardController,
    loadRobotConfig,
    loadFleetStaticState,
    loadFleetRuntimeDelta,
    loadRobotTypeConfig,
    normalizeRuntimeTestUpdate,
    runtimeActivityHasSignal,
    normalizeRuntimeRobotEntry,
    haveRuntimeTestsChanged,
    mergeRuntimeRobotsIntoList,
    refreshRuntimeStateFromBackend,
    startRuntimeStateSync,
    stopRuntimeStateSync,
    loadRobotsFromBackend,
    routeFromHash,
    initDashboardController,
  };
}
