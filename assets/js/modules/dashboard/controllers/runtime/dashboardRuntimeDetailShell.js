export function registerDetailShellRuntime(runtime, env) {
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
    backendData,
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
    manageDeleteFixButton,
    manageDeleteTestButton,
    manageFixDescriptionInput,
    manageFixEditorForm,
    manageFixEditorStatus,
    manageFixExecuteJsonInput,
    manageFixIdInput,
    manageFixLabelInput,
    manageFixPostTestsInput,
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
  const cycleOnlineSortMode = (...args) => runtime.cycleOnlineSortMode(...args);
  const deleteManageFixDefinition = (...args) => runtime.deleteManageFixDefinition(...args);
  const deleteManageTestDefinition = (...args) => runtime.deleteManageTestDefinition(...args);
  const estimateTestCountdownMsFromBody = (...args) => runtime.estimateTestCountdownMsFromBody(...args);
  const formatDurationMs = (...args) => runtime.formatDurationMs(...args);
  const formatLastFullTestTimestamp = (...args) => runtime.formatLastFullTestTimestamp(...args);
  const formatTestValue = (...args) => runtime.formatTestValue(...args);
  const getAutoFixesForType = (...args) => runtime.getAutoFixesForType(...args);
  const getConfiguredDefaultTestIds = (...args) => runtime.getConfiguredDefaultTestIds(...args);
  const getCountdownLabel = (...args) => runtime.getCountdownLabel(...args);
  const getCountdownNodes = (...args) => runtime.getCountdownNodes(...args);
  const getDashboardFixCandidates = (...args) => runtime.getDashboardFixCandidates(...args);
  const getDefinitionLabel = (...args) => runtime.getDefinitionLabel(...args);
  const getDetailFixCandidates = (...args) => runtime.getDetailFixCandidates(...args);
  const getFallbackTestIconText = (...args) => runtime.getFallbackTestIconText(...args);
  const getFixModeElements = (...args) => runtime.getFixModeElements(...args);
  const getFleetParallelism = (...args) => runtime.getFleetParallelism(...args);
  const getMonitorBatteryIntervalMs = (...args) => runtime.getMonitorBatteryIntervalMs(...args);
  const getMonitorOnlineIntervalMs = (...args) => runtime.getMonitorOnlineIntervalMs(...args);
  const getMonitorTopicsIntervalMs = (...args) => runtime.getMonitorTopicsIntervalMs(...args);
  const getOnlineCheckCountdownMs = (...args) => runtime.getOnlineCheckCountdownMs(...args);
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
  const getVisibleOfflineRobotIds = (...args) => runtime.getVisibleOfflineRobotIds(...args);
  const getVisibleOnlineRobotIds = (...args) => runtime.getVisibleOnlineRobotIds(...args);
  const haveRuntimeTestsChanged = (...args) => runtime.haveRuntimeTestsChanged(...args);
  const initDashboardController = (...args) => runtime.initDashboardController(...args);
  const initFleetParallelism = (...args) => runtime.initFleetParallelism(...args);
  const initManageTabs = (...args) => runtime.initManageTabs(...args);
  const initMonitorConfigControls = (...args) => runtime.initMonitorConfigControls(...args);
  const initThemeControls = (...args) => runtime.initThemeControls(...args);
  const initWorkflowRecorder = (...args) => runtime.initWorkflowRecorder(...args);
  const invalidateCountdownNodeCache = (...args) => runtime.invalidateCountdownNodeCache(...args);
  const isRobotAutoSearching = (...args) => runtime.isRobotAutoSearching(...args);
  const isRobotBusyForOnlineRefresh = (...args) => runtime.isRobotBusyForOnlineRefresh(...args);
  const isRobotFixing = (...args) => runtime.isRobotFixing(...args);
  const isRobotSearching = (...args) => runtime.isRobotSearching(...args);
  const isRobotSelected = (...args) => runtime.isRobotSelected(...args);
  const isRobotTesting = (...args) => runtime.isRobotTesting(...args);
  const isTopicsMonitorMode = (...args) => runtime.isTopicsMonitorMode(...args);
  const issueSummary = (...args) => runtime.issueSummary(...args);
  const loadDefinitionsSummary = (...args) => runtime.loadDefinitionsSummary(...args);
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
  const normalizeDefinitionsSummary = (...args) => runtime.normalizeDefinitionsSummary(...args);
  const normalizeIdList = (...args) => runtime.normalizeIdList(...args);
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
  const onFilterChange = (...args) => runtime.onFilterChange(...args);
  const onlineRobotComparator = (...args) => runtime.onlineRobotComparator(...args);
  const parseJsonInput = (...args) => runtime.parseJsonInput(...args);
  const patchDetailRuntimeContent = (...args) => runtime.patchDetailRuntimeContent(...args);
  const patchRobotTypeMapping = (...args) => runtime.patchRobotTypeMapping(...args);
  const publishRecorderAsTest = (...args) => runtime.publishRecorderAsTest(...args);
  const queryCardByRobotId = (...args) => runtime.queryCardByRobotId(...args);
  const readRobotField = (...args) => runtime.readRobotField(...args);
  const rebuildRobotIndex = (...args) => runtime.rebuildRobotIndex(...args);
  const refreshRuntimeStateFromBackend = (...args) => runtime.refreshRuntimeStateFromBackend(...args);
  const refreshTestingCountdowns = (...args) => runtime.refreshTestingCountdowns(...args);
  const removeRobotIdsFromSelection = (...args) => runtime.removeRobotIdsFromSelection(...args);
  const renderCard = (...args) => runtime.renderCard(...args);
  const renderDashboard = (...args) => runtime.renderDashboard(...args);
  const renderFixModeActionsForContext = (...args) => runtime.renderFixModeActionsForContext(...args);
  const renderFixRobotTypeTargets = (...args) => runtime.renderFixRobotTypeTargets(...args);
  const renderManageDefinitions = (...args) => runtime.renderManageDefinitions(...args);
  const renderManageFixesList = (...args) => runtime.renderManageFixesList(...args);
  const renderManageTestsList = (...args) => runtime.renderManageTestsList(...args);
  const renderRecorderRobotOptions = (...args) => runtime.renderRecorderRobotOptions(...args);
  const renderRecorderRobotTypeTargets = (...args) => runtime.renderRecorderRobotTypeTargets(...args);
  const renderTestRobotTypeTargets = (...args) => runtime.renderTestRobotTypeTargets(...args);
  const resolveRobotModelUrl = (...args) => runtime.resolveRobotModelUrl(...args);
  const robotId = (...args) => runtime.robotId(...args);
  const robotModelMarkup = (...args) => runtime.robotModelMarkup(...args);
  const routeFromHash = (...args) => runtime.routeFromHash(...args);
  const runAutoFixCandidate = (...args) => runtime.runAutoFixCandidate(...args);
  const runAutoFixForRobot = (...args) => runtime.runAutoFixForRobot(...args);
  const runOneRobotOnlineCheck = (...args) => runtime.runOneRobotOnlineCheck(...args);
  const runOnlineCheckForAllRobots = (...args) => runtime.runOnlineCheckForAllRobots(...args);
  const runRecorderCommandAndCapture = (...args) => runtime.runRecorderCommandAndCapture(...args);
  const runRobotTestsForRobot = (...args) => runtime.runRobotTestsForRobot(...args);
  const runtimeActivityHasSignal = (...args) => runtime.runtimeActivityHasSignal(...args);
  const saveManageFixDefinition = (...args) => runtime.saveManageFixDefinition(...args);
  const saveManageTestDefinition = (...args) => runtime.saveManageTestDefinition(...args);
  const scheduleMonitorParallelismSync = (...args) => runtime.scheduleMonitorParallelismSync(...args);
  const selectAllOfflineRobots = (...args) => runtime.selectAllOfflineRobots(...args);
  const selectAllOnlineRobots = (...args) => runtime.selectAllOnlineRobots(...args);
  const selectAllRobots = (...args) => runtime.selectAllRobots(...args);
  const selectRobotIds = (...args) => runtime.selectRobotIds(...args);
  const setActiveManageTab = (...args) => runtime.setActiveManageTab(...args);
  const setFixModeStatus = (...args) => runtime.setFixModeStatus(...args);
  const setFleetOnlineButtonIdleLabel = (...args) => runtime.setFleetOnlineButtonIdleLabel(...args);
  const setFleetOnlineButtonState = (...args) => runtime.setFleetOnlineButtonState(...args);
  const setFleetParallelism = (...args) => runtime.setFleetParallelism(...args);
  const setManageEditorStatus = (...args) => runtime.setManageEditorStatus(...args);
  const setManageTabStatus = (...args) => runtime.setManageTabStatus(...args);
  const setModelContainerFaultClasses = (...args) => runtime.setModelContainerFaultClasses(...args);
  const setMonitorConfigStatus = (...args) => runtime.setMonitorConfigStatus(...args);
  const setRobotFixing = (...args) => runtime.setRobotFixing(...args);
  const setRobotSearching = (...args) => runtime.setRobotSearching(...args);
  const setRobotSearchingBulk = (...args) => runtime.setRobotSearchingBulk(...args);
  const setRobotSelection = (...args) => runtime.setRobotSelection(...args);
  const setRobotTesting = (...args) => runtime.setRobotTesting(...args);
  const setRobotTypeDefinitions = (...args) => runtime.setRobotTypeDefinitions(...args);
  const setRobots = (...args) => runtime.setRobots(...args);
  const setRunningButtonState = (...args) => runtime.setRunningButtonState(...args);
  const shouldUseCompactAutoSearchIndicator = (...args) => runtime.shouldUseCompactAutoSearchIndicator(...args);
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

  function renderDetail(robot) {
        const model = $('#detailModel');
        const testList = $('#testList');
        const titleBar = $('#detailTitleBar');
        const statusBar = $('#detailStatusBar');
  
        if (!robot) return;
  
        const stateKey = statusFromScore(robot);
        const normalizedRobotId = robotId(robot);
        const errorCount = nonBatteryTestEntries(robot).filter(([, t]) => t.status !== 'ok').length;
        const batteryState = robot?.tests?.battery || {};
        const isTesting = isRobotTesting(normalizedRobotId);
        const isSearching = isRobotSearching(normalizedRobotId);
        const isFixing = isRobotFixing(normalizedRobotId);
        const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
        const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
        const isCountingDown = isTesting || isSearching || isFixing;
        const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
  
        if (titleBar) {
          titleBar.innerHTML = `
            <span class="detail-title-main">${robot.name}</span>
            <span class="detail-title-type">(${robot.type})</span>`;
        }
        if (statusBar) {
          statusBar.innerHTML = `
            ${statusChip(stateKey, 'detail-status-chip')}
            ${renderBatteryPill({
              value: batteryState.value,
              status: batteryState.status,
              reason: batteryState.reason,
              size: 'small',
            })}
            <span class="pill" data-role="detail-last-full-test-pill">${buildLastFullTestPillLabel(robot, true)}</span>
            <span class="detail-issue-count">${errorCount} issue(s)</span>`;
        }
  
        const modelMarkup = buildRobotModelContainer(
          robot,
          `detail-model ${nonBatteryTestEntries(robot)
            .filter(([, test]) => test.status !== 'ok')
            .map(([id]) => `fault-${id}`)
            .join(' ')}`,
          isOffline,
        );
        const scanningMarkup = buildScanOverlayMarkup({
          isSearching,
          isTesting,
          isFixing,
          compactAutoSearch,
        });
        const countdownMarkup = isCountingDown
          ? `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`
          : '';
        const connectionIconMarkup = buildConnectionCornerIconMarkup(isOffline, compactAutoSearch);
        model.innerHTML = `${modelMarkup}${scanningMarkup}${countdownMarkup}${connectionIconMarkup}`;
        invalidateCountdownNodeCache();
        syncModelViewerRotationForContainer(model, isOffline);
  
        testList.replaceChildren();
        const definitions = robot?.testDefinitions || env.TEST_DEFINITIONS;
        definitions.forEach((def) => {
          const result = robot.tests[def.id];
          const icon = getTestIconPresentation(def.id, def.icon);
          const previewText = buildTestPreviewTextForResult(def.id, result);
          const row = document.createElement('div');
          row.className = 'test-row';
          row.setAttribute('data-test-id', def.id);
          row.innerHTML = `
            <div class="test-info">
              <span class="test-title">
                <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
                <span class="test-title-label">${def.label}</span>
                <span class="pill" data-role="detail-test-status-pill" style="font-size: 0.72rem; background: rgba(255,255,255,0.05);">${result.status.toUpperCase()}</span>
              </span>
              <span class="test-value" data-role="detail-test-value">${previewText}</span>
            </div>
              <div class="test-actions">
              <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${def.id}" title="Show detailed output">Info</button>
              <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
            </div>`;
          const valueNode = row.querySelector('[data-role="detail-test-value"]');
          if (valueNode) {
            valueNode.title = previewText;
          }
          const infoButton = row.querySelector(`[data-test-id="${def.id}"]`);
          if (infoButton) {
            infoButton.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              openTestDebugModal(robot, def.id);
            });
          }
          testList.appendChild(row);
        });
  
        // Extra tests added by backend but not in the current UI catalog.
        Object.entries(robot.tests)
          .filter(([id]) => !definitions.find((test) => test.id === id))
          .forEach(([id, result]) => {
            const icon = getTestIconPresentation(id, '⚙️');
            const previewText = buildTestPreviewTextForResult(id, result);
            const row = document.createElement('div');
            row.className = 'test-row';
            row.setAttribute('data-test-id', id);
            row.innerHTML = `
              <div class="test-info">
                <span class="test-title">
                  <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
                  <span class="test-title-label">${id}</span>
                  <span class="pill" data-role="detail-test-status-pill" style="font-size: 0.72rem; background: rgba(255,255,255,0.05);">${result.status.toUpperCase()}</span>
                </span>
                <span class="test-value" data-role="detail-test-value">${previewText}</span>
              </div>
              <div class="test-actions">
                <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${id}" title="Show detailed output">Info</button>
                <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
              </div>`;
            const valueNode = row.querySelector('[data-role="detail-test-value"]');
            if (valueNode) {
              valueNode.title = previewText;
            }
            const infoButton = row.querySelector(`[data-test-id="${id}"]`);
            if (infoButton) {
              infoButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openTestDebugModal(robot, id);
              });
            }
            testList.appendChild(row);
          });
  
        const detailId = robotId(robot);
        if (state.activeTerminalRobotId !== detailId) {
          closeTerminalSession();
          setTerminalInactive(robot);
        } else {
          setTerminalActive();
        }
        hydrateActionButtons(detail);
        if (state.fixModeOpen.detail) {
          renderFixModeActionsForContext(FIX_MODE_CONTEXT_DETAIL);
        }
      }

  async function runManualTests(options = {}) {
        if (state.isTestRunInProgress) {
          appendTerminalLine('Test run already in progress. Please wait before running again.', 'warn');
          return;
        }
        if (state.isAutoFixInProgress) {
          appendTerminalLine('Auto-fix run in progress. Wait for it to complete before running tests.', 'warn');
          return;
        }
  
        const runIds = getRobotIdsForRun(options);
        if (!runIds.length) {
          if (options.autoSelectOnlineWhenEmpty) {
            appendTerminalLine('No robots selected and none are currently online. Refresh online status or select robots manually.', 'warn');
          } else {
            appendTerminalLine('No robot selected for tests. Select at least one robot first.', 'warn');
          }
          return;
        }
  
        state.isTestRunInProgress = true;
        setRunningButtonState(true);
  
        try {
          let successCount = 0;
          let failureCount = 0;
          const workerCount = Math.max(1, Math.min(getFleetParallelism(), runIds.length));
          if (terminal) {
            appendTerminalLine(
              `Running selected tests with parallelism ${workerCount} (${runIds.length} robot${runIds.length === 1 ? '' : 's'}).`,
              'warn',
            );
          }
  
          const queue = [...runIds];
          const processOneRobot = async (robotIdValue) => {
            const robot = getRobotById(robotIdValue);
            const normalizedRobotId = robotId(robotIdValue);
            if (!robot || !normalizedRobotId) {
              failureCount += 1;
              if (terminal) {
                appendTerminalLine(`Test run failed for ${robotIdValue}: Robot not found in current state`, 'err');
              }
              return;
            }
  
            const currentOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
            const shouldAutoRunOnlineCheck = currentOnlineStatus !== 'ok';
            if (shouldAutoRunOnlineCheck) {
              if (terminal) {
                appendTerminalLine(
                  `Robot ${robot.name || robotId(robot)} is not online. Running online check first...`,
                  'warn',
                );
              }
  
              setRobotSearching(normalizedRobotId, true, getOnlineCheckCountdownMs());
              const onlineStatus = await runOneRobotOnlineCheck(robot);
              setRobotSearching(normalizedRobotId, false);
              updateOnlineCheckEstimateFromResults([onlineStatus]);
              mapRobots((item) =>
                robotId(item) === normalizedRobotId
                  ? {
                      ...item,
                      tests: {
                        ...(item.tests || {}),
                        online: {
                          status: onlineStatus.status,
                          value: onlineStatus.value,
                          details: onlineStatus.details,
                        },
                      },
                    }
                  : item,
              );
              renderDashboard();
              const activeRobotPostOnline = state.robots.find((item) => robotId(item) === state.detailRobotId);
              if (activeRobotPostOnline) {
                renderDetail(activeRobotPostOnline);
              }
  
              if (normalizeStatus(onlineStatus.status) !== 'ok') {
                failureCount += 1;
                if (terminal) {
                  appendTerminalLine(
                    `Skipping tests for ${robotId(robot)}: robot is offline (${onlineStatus.details}).`,
                    'err',
                  );
                }
                setRobotTesting(normalizedRobotId, false);
                return;
              }
            }
  
            const body = { ...options.body };
            const includeOnline = !!options.includeOnline;
            const hasExplicitTestIds = Array.isArray(body.testIds) && body.testIds.length;
            const defaultTestIds = getConfiguredDefaultTestIds(robot, includeOnline);
  
            if (!hasExplicitTestIds && defaultTestIds.length) {
              body.testIds = defaultTestIds;
            }
            const countdownMs = estimateTestCountdownMsFromBody(body);
  
            if (terminal) {
              appendTerminalLine(`Running tests for ${robot.name}...`, 'warn');
            }
  
            setRobotTesting(normalizedRobotId, true, countdownMs);
            try {
              const result = await runRobotTestsForRobot(robotId(robot), body);
              if (terminal && Array.isArray(body.testIds) && body.testIds.length) {
                appendTerminalLine(`Executed test IDs: ${body.testIds.join(', ')}`, 'ok');
              }
  
              const results = Array.isArray(result?.results) ? result.results : [];
              if (!results.length) {
                failureCount += 1;
                if (terminal) {
                  appendTerminalLine(`No test results returned for ${robotId(robot)}.`, 'err');
                }
                return;
              }
  
              updateRobotTestState(robotId(robot), results, result);
              successCount += 1;
              if (terminal) {
                appendTerminalLine(`Completed tests for ${robotId(robot)}.`, 'ok');
              }
              renderDashboard();
  
              const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
              if (activeRobot) {
                renderDetail(activeRobot);
              }
            } catch (error) {
              failureCount += 1;
              if (terminal) {
                appendTerminalLine(
                  `Test run failed for ${robotId(robot)}: ${error instanceof Error ? error.message : String(error)}`,
                  'err',
                );
              }
            } finally {
              setRobotTesting(normalizedRobotId, false);
            }
          };
  
          const workers = Array.from({ length: workerCount }, () => (async () => {
            while (queue.length) {
              const nextRobotId = queue.shift();
              if (!nextRobotId) break;
              await processOneRobot(nextRobotId);
            }
          })());
          await Promise.all(workers);
  
          if (terminal) {
            if (failureCount === 0) {
              appendTerminalLine(`Test run complete (${successCount}/${runIds.length} robots).`, 'ok');
            } else {
              appendTerminalLine(`Test run complete (${successCount} succeeded, ${failureCount} failed).`, 'warn');
            }
          }
  
          renderDashboard();
  
          const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Test run failed', error);
          appendTerminalLine(`Failed to run tests: ${message}`, 'err');
        } finally {
          state.isTestRunInProgress = false;
          setRunningButtonState(false);
          if (terminal) {
            appendTerminalLine('Ready.', 'ok');
          }
        }
      }

  function normalizeManageTab(tabId) {
        const normalized = normalizeText(tabId, '').toLowerCase();
        return MANAGE_TABS.includes(normalized) ? normalized : '';
      }

  function getPersistedManageTab() {
        try {
          return normalizeManageTab(window.sessionStorage.getItem(MANAGE_TAB_STORAGE_KEY));
        } catch (_error) {
          return '';
        }
      }

  function persistManageTab(tabId) {
        const normalized = normalizeManageTab(tabId);
        if (!normalized) return;
        try {
          window.sessionStorage.setItem(MANAGE_TAB_STORAGE_KEY, normalized);
        } catch (_error) {
          // Best effort persistence.
        }
      }

  function resolveManageTab(tabId = '') {
        return (
          normalizeManageTab(tabId)
          || getPersistedManageTab()
          || normalizeManageTab(state.activeManageTab)
          || 'robots'
        );
      }

  function buildManageHash(tabId) {
        const normalized = normalizeManageTab(tabId) || 'robots';
        return normalized === 'robots' ? MANAGE_VIEW_HASH : `${MANAGE_VIEW_HASH}/${normalized}`;
      }

  function parseManageRoute(hashValue) {
        const hash = normalizeText(hashValue, '').replace(/^#/, '');
        if (hash === MANAGE_VIEW_HASH || hash === 'add-robot') {
          return { isManageRoute: true, tabId: '' };
        }
        if (!hash.startsWith(`${MANAGE_VIEW_HASH}/`)) {
          return { isManageRoute: false, tabId: '' };
        }
        const tabId = hash.slice(MANAGE_VIEW_HASH.length + 1);
        return { isManageRoute: true, tabId: normalizeManageTab(tabId) || 'robots' };
      }

  function setLocationHash(hashValue) {
        const nextHash = normalizeText(hashValue, '').replace(/^#/, '');
        const currentHash = normalizeText(window.location.hash, '').replace(/^#/, '');
        if (currentHash === nextHash) return;
        state.ignoreNextHashChange = true;
        window.location.hash = nextHash ? `#${nextHash}` : '';
      }

  function isManageViewActive() {
        return Boolean(addRobotSection?.classList?.contains('active'));
      }

  function hideRecorderReadPopover() {
        if (recorderTerminalPopReadBtn) {
          recorderTerminalPopReadBtn.style.display = 'none';
        }
      }

  function syncRecorderReadPopoverVisibility() {
        if (
          !isManageViewActive()
          || state.activeManageTab !== 'recorder'
          || !state.recorderTerminalComponent?.terminal
          || !state.workflowRecorder?.started
        ) {
          hideRecorderReadPopover();
          return;
        }
        try {
          const selection = state.recorderTerminalComponent.terminal.getSelection();
          if (selection && selection.trim()) {
            if (recorderTerminalPopReadBtn) recorderTerminalPopReadBtn.style.display = 'block';
            return;
          }
        } catch (_error) {
          // Best effort UI hint.
        }
        hideRecorderReadPopover();
      }

  function closeRecorderTerminalSession() {
        hideRecorderReadPopover();
        if (recorderTerminalShell) {
          recorderTerminalShell.classList.remove('active');
        }
        if (recorderTerminalActivationOverlay) {
          recorderTerminalActivationOverlay.style.display = '';
        }
        if (state.recorderTerminalComponent) {
          state.recorderTerminalComponent.dispose();
        }
      }

  function setRecorderTerminalActive() {
        if (recorderTerminalShell) {
          recorderTerminalShell.classList.add('active');
        }
        if (recorderTerminalActivationOverlay) {
          recorderTerminalActivationOverlay.style.display = 'none';
        }
      }

  function openDetail(id, { syncHash = true } = {}) {
        const robot = state.robots.find((r) => r.id === id);
        if (!robot) return;
        state.detailRobotId = id;
        closeRecorderTerminalSession();
        addRobotSection.classList.remove('active');
        dashboard.classList.remove('active');
        detail.classList.add('active');
        renderDetail(robot);
        syncFixModePanels();
        if (syncHash) {
          setLocationHash(`robot/${id}`);
        }
      }

  function showAddRobotPage({ tabId = '', syncHash = true, refreshDefinitions = true } = {}) {
        closeTestDebugModal();
        closeBugReportModal();
        closeTerminalSession();
        state.detailRobotId = null;
        state.isCreateRobotInProgress = false;
        if (addRobotMessage) {
          addRobotMessage.textContent = '';
          addRobotMessage.classList.remove('error', 'ok', 'warn');
        }
        if (addRobotSavingHint) {
          addRobotSavingHint.textContent = '';
        }
        if (addRobotForm) {
          addRobotForm.reset();
          setAddRobotPasswordVisibility(false);
        }
        detail.classList.remove('active');
        dashboard.classList.remove('active');
        populateAddRobotTypeOptions();
        renderRecorderRobotOptions();
        const activeTab = resolveManageTab(tabId);
        setActiveManageTab(activeTab, { syncHash: false, persist: true });
        addRobotSection.classList.add('active');
        syncFixModePanels();
        if (syncHash) {
          setLocationHash(buildManageHash(activeTab));
        }
        if (refreshDefinitions) {
          loadDefinitionsSummary();
        }
      }

  function showDashboard({ syncHash = true } = {}) {
        closeTestDebugModal();
        closeBugReportModal();
        closeTerminalSession();
        closeRecorderTerminalSession();
        if (addRobotForm) {
          addRobotForm.reset();
        }
        if (addRobotMessage) {
          addRobotMessage.textContent = '';
          addRobotMessage.classList.remove('error', 'ok', 'warn');
        }
        if (addRobotSavingHint) {
          addRobotSavingHint.textContent = '';
        }
        detail.classList.remove('active');
        addRobotSection.classList.remove('active');
        dashboard.classList.add('active');
        state.detailRobotId = null;
        renderDashboard();
        syncFixModePanels();
        if (syncHash) {
          setLocationHash('');
        }
      }

  function closeTerminalSession() {
        if (state.terminalComponent) {
          state.terminalComponent.dispose();
        }
        if (terminal) {
          terminal.classList.add('fallback');
          terminal.textContent = '';
        }
        if (terminalToolbar) {
          terminalToolbar.innerHTML = '';
        }
        state.terminalMode = 'fallback';
        state.activeTerminalRobotId = null;
        setTerminalInactive();
      }

  function setTerminalInactive(robot = null) {
        if (detailTerminalShell) {
          detailTerminalShell.classList.remove('active');
        }
        if (activateTerminalButton) {
          const target = robot?.name || 'robot';
          applyActionButton(activateTerminalButton, {
            intent: 'terminal',
            label: `Connect SSH to ${target}`,
          });
        }
      }

  function setTerminalActive() {
        if (detailTerminalShell) {
          detailTerminalShell.classList.add('active');
        }
      }

  function getTimestamp() {
        return new Date().toLocaleTimeString();
      }

  function appendTerminalLine(line, level = 'ok', fromAuto = false) {
        const safeLine = `[${getTimestamp()}] ${line}`;
  
        const span = document.createElement('span');
        span.className = `line ${level}`;
        if (fromAuto) {
          span.style.opacity = '0.9';
        }
        span.textContent = safeLine;
        terminal.appendChild(span);
        terminal.scrollTop = terminal.scrollHeight;
      }

  async function runFallbackCommandSimulation(robot, command, commandId, reason = '') {
      if (!robot || !robot.id) {
        appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
        return;
      }
  
      const commandText = String(command || '').trim();
      if (!commandText) {
        appendTerminalLine('Fallback blocked: empty command.', 'warn');
        return;
      }
  
      const terminalEndpoint = buildApiUrl(`/api/robots/${encodeURIComponent(robot.id)}/terminal`);
      appendTerminalLine(`$ ${commandText}`, 'warn');
      if (reason) {
        appendTerminalLine(`Terminal hint: ${reason}. Attempting direct command execution.`, 'warn');
      }
  
      try {
        const response = await fetch(terminalEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            robotId: robot.id,
            command: commandText,
            commandId,
            source: 'robot-dashboard-fallback',
          }),
        });
        const responseText = await response.text();
        if (!response.ok) {
          appendTerminalLine(`[HTTP ${response.status}] Terminal API rejected the command.`, 'err');
          if (responseText) appendTerminalLine(responseText, 'err');
          return;
        }
  
        let payload = null;
        try {
          payload = JSON.parse(responseText);
        } catch (_error) {
          payload = null;
        }
  
        if (payload) {
          appendTerminalPayload(payload);
        } else {
          appendTerminalLine(responseText || '[No response text]', responseText ? 'plain' : 'warn');
        }
        return;
      } catch (_error) {
        appendTerminalLine('Direct terminal execution unavailable. Falling back to simulated output.', 'warn');
      }
  
      const map = Object.fromEntries(PRESET_COMMANDS.map((item) => [item.id, item]));
      const friendly = map[commandId]?.label || commandText;
      appendTerminalLine(`Simulating output for ${friendly}.`, 'warn');
      const generalState = robot.tests.general || { status: 'warning', value: 'n/a', details: 'No detail available' };
      const batteryState = robot.tests.battery || { status: 'warning', value: 'n/a', details: 'No detail available' };
      appendTerminalLine(
        formatConsoleLine('general', generalState.status, generalState.value, generalState.details),
        generalState.status === 'error' ? 'err' : generalState.status === 'warning' ? 'warn' : 'ok',
      );
      appendTerminalLine(
        formatConsoleLine('battery', batteryState.status, batteryState.value, batteryState.details),
        batteryState.status === 'error' ? 'err' : batteryState.status === 'warning' ? 'warn' : 'ok',
      );
      appendTerminalLine(`Simulated command result: ${commandText} executed.`, 'warn');
      appendTerminalLine(`Hint: configure /api/robots/{robotId}/terminal`, 'ok');
    }

  function appendTerminalPayload(payload) {
      if (payload === null || payload === undefined) {
        appendTerminalLine('[Empty output]', 'warn');
        return;
      }
      if (typeof payload.stdout === 'string') {
        appendTerminalLine(payload.stdout, 'plain');
      }
      if (typeof payload.stderr === 'string') {
        appendTerminalLine(payload.stderr, 'err');
      }
      if (typeof payload.output === 'string') {
        appendTerminalLine(payload.output, 'plain');
      }
      if (Array.isArray(payload.lines)) {
        appendTerminalLine(payload.lines.join('\n'), 'plain');
      }
      if (payload.result !== undefined) {
        appendTerminalLine(String(payload.result), 'plain');
      }
      if (typeof payload.exitCode === 'number' && payload.exitCode !== 0) {
        appendTerminalLine(`[exit ${payload.exitCode}]`, 'warn');
      }
      if (typeof payload.code === 'number' && payload.code !== 0) {
        appendTerminalLine(`[exit ${payload.code}]`, 'warn');
      }
  
      const hasKnownFields =
        typeof payload.stdout === 'string' ||
        typeof payload.stderr === 'string' ||
        typeof payload.output === 'string' ||
        Array.isArray(payload.lines) ||
        payload.result !== undefined ||
        typeof payload.exitCode === 'number' ||
        typeof payload.code === 'number';
      if (!hasKnownFields) {
        appendTerminalLine(JSON.stringify(payload), 'plain');
      }
    }

  function runFallbackChecks(robot) {
        if (!robot) {
          appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
          return;
        }
        appendTerminalLine('--- Simulated live checks begin ---', 'warn');
        Object.entries(robot.tests).forEach(([key, value]) => {
          appendTerminalLine(formatConsoleLine(key, value.status, value.value, value.details), value.status === 'error' ? 'err' : value.status === 'warning' ? 'warn' : 'ok');
        });
        appendTerminalLine('--- End checks ---', 'warn');
      }

  function getDetailTerminalPresets() {
        return PRESET_COMMANDS.filter((preset) => {
          const presetId = normalizeText(preset?.id, '').toLowerCase();
          return DETAIL_TERMINAL_PRESET_IDS.has(presetId);
        });
      }

  function initRobotTerminal(robot) {
        if (!robot) return;
        if (!state.terminalComponent) return;
        state.terminalComponent.connect(robot, getDetailTerminalPresets());
        state.activeTerminalRobotId = robotId(robot);
        setTerminalActive();
      }

  function formatConsoleLine(key, status, value, details) {
        const map = {
          online: 'network',
          general: 'system',
          battery: 'power',
          movement: 'motion',
          proximity: 'perception',
          lidar: 'perception',
          camera: 'vision',
        };
        const zone = map[key] || 'system';
        if (status === 'ok') {
          return `[OK] ${zone}::${key} => ${value} | ${details}`;
        }
        if (status === 'warning') {
          return `[WARN] ${zone}::${key} => ${value} | ${details}`;
        }
        return `[ERROR] ${zone}::${key} => ${value} | ${details}`;
      }

  function formatEpochSeconds(value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) return 'n/a';
        return new Date(num * 1000).toLocaleString();
      }

  function formatRawOutput(output) {
        const text = normalizeText(output, '');
        if (!text) return '(no output)';
        try {
          const parsed = JSON.parse(text);
          return JSON.stringify(parsed, null, 2);
        } catch (_error) {
          return text;
        }
      }

  function closeTestDebugModal() {
        if (!testDebugModal) return;
        testDebugModal.classList.add('hidden');
        testDebugModal.setAttribute('aria-hidden', 'true');
        state.testDebugModalOpen = false;
        syncModalScrollLock();
      }

  function setBugReportStatus(message = '', tone = '') {
        if (!bugReportStatus) return;
        bugReportStatus.textContent = message;
        bugReportStatus.classList.remove('ok', 'error');
        if (tone) {
          bugReportStatus.classList.add(tone);
        }
      }

  function closeBugReportModal({ force = false } = {}) {
        if (!bugReportModal) return;
        if (state.isBugReportSubmitInProgress && !force) return;
        bugReportModal.classList.add('hidden');
        bugReportModal.setAttribute('aria-hidden', 'true');
        state.isBugReportModalOpen = false;
        syncModalScrollLock();
        setBugReportStatus('', '');
        if (bugReportMessageInput) {
          bugReportMessageInput.value = '';
        }
        if (submitBugReportButton) {
          setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
        }
        if (cancelBugReportButton) {
          cancelBugReportButton.disabled = false;
        }
      }

  function openBugReportModal() {
        if (!bugReportModal) return;
        state.isBugReportModalOpen = true;
        syncModalScrollLock();
        state.isBugReportSubmitInProgress = false;
        setBugReportStatus('', '');
        if (bugReportMessageInput) {
          bugReportMessageInput.value = '';
        }
        if (cancelBugReportButton) {
          cancelBugReportButton.disabled = false;
        }
        if (submitBugReportButton) {
          setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
        }
        bugReportModal.classList.remove('hidden');
        bugReportModal.setAttribute('aria-hidden', 'false');
        if (bugReportMessageInput) {
          bugReportMessageInput.focus();
        }
      }

  async function submitBugReport() {
        if (state.isBugReportSubmitInProgress) return;
        const message = normalizeText(bugReportMessageInput?.value, '').trim();
        if (!message) {
          setBugReportStatus('Please describe the bug before submitting.', 'error');
          if (bugReportMessageInput) {
            bugReportMessageInput.focus();
          }
          return;
        }
  
        state.isBugReportSubmitInProgress = true;
        setBugReportStatus('');
        if (cancelBugReportButton) {
          cancelBugReportButton.disabled = true;
        }
        if (submitBugReportButton) {
          setActionButtonLoading(submitBugReportButton, true, {
            loadingLabel: 'Submitting...',
            idleLabel: 'Submit',
          });
        }
  
        try {
          const response = await fetch(buildApiUrl('/api/bug-reports'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });
          const raw = await response.text();
          let payload = null;
          try {
            payload = raw ? JSON.parse(raw) : null;
          } catch (_error) {
            payload = null;
          }
          if (!response.ok) {
            const details = normalizeText(payload?.detail, raw || 'Unable to save bug report.');
            setBugReportStatus(details, 'error');
            return;
          }
          closeBugReportModal({ force: true });
        } catch (_error) {
          setBugReportStatus('Unable to submit bug report right now.', 'error');
        } finally {
          state.isBugReportSubmitInProgress = false;
          if (cancelBugReportButton) {
            cancelBugReportButton.disabled = false;
          }
          if (submitBugReportButton) {
            setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
          }
        }
      }

  function openTestDebugModal(robot, testId) {
        if (!robot || !testDebugModal || !testDebugTitle || !testDebugSummary || !testDebugBody) return;
  
        const definitions = robot?.testDefinitions || env.TEST_DEFINITIONS;
        const definitionLabel = getDefinitionLabel(definitions, testId);
        const basicResult = robot?.tests?.[testId] || { status: 'warning', value: 'n/a', details: 'No detail available' };
        const debugResult = robot?.testDebug?.[testId] || null;
        const reasonLabel =
          normalizeText(testId, '').toLowerCase() === 'battery'
            ? batteryReasonText(basicResult)
            : '';
  
        testDebugTitle.textContent = `${robot.name} • ${definitionLabel}`;
        testDebugSummary.textContent = `Status: ${basicResult.status} | Value: ${basicResult.value} | Details: ${basicResult.details}${reasonLabel ? ` | Reason: ${reasonLabel}` : ''}`;
        testDebugBody.replaceChildren();
  
        const summaryBlock = document.createElement('pre');
        summaryBlock.className = 'test-debug-pre';
        summaryBlock.textContent = debugResult
          ? [
              `runId: ${normalizeText(debugResult.runId, 'n/a')}`,
              `startedAt: ${formatEpochSeconds(debugResult.startedAt)}`,
              `finishedAt: ${formatEpochSeconds(debugResult.finishedAt)}`,
              `testMs: ${Number.isFinite(Number(debugResult.ms)) ? Number(debugResult.ms) : 0}`,
              `status: ${debugResult.status}`,
              `value: ${debugResult.value}`,
              `details: ${debugResult.details}`,
            ].join('\n')
          : 'No detailed backend output recorded yet for this test. Run tests once from this page.';
        testDebugBody.appendChild(summaryBlock);
  
        if (debugResult && Array.isArray(debugResult.steps) && debugResult.steps.length) {
          debugResult.steps.forEach((step) => {
            const stepSection = document.createElement('section');
            stepSection.className = 'test-debug-step';
  
            const heading = document.createElement('h4');
            heading.className = 'test-debug-step-title';
            heading.textContent = `Step: ${step.id} (${step.status})`;
            stepSection.appendChild(heading);
  
            const details = document.createElement('pre');
            details.className = 'test-debug-pre';
            details.textContent = [
              `value: ${step.value}`,
              `details: ${step.details}`,
              `ms: ${Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0}`,
              'output:',
              formatRawOutput(step.output),
            ].join('\n');
            stepSection.appendChild(details);
            testDebugBody.appendChild(stepSection);
          });
        }
  
        if (debugResult && debugResult.raw && Object.keys(debugResult.raw).length) {
          const rawSection = document.createElement('section');
          rawSection.className = 'test-debug-step';
          const rawTitle = document.createElement('h4');
          rawTitle.className = 'test-debug-step-title';
          rawTitle.textContent = 'Parser metadata';
          rawSection.appendChild(rawTitle);
          const rawPre = document.createElement('pre');
          rawPre.className = 'test-debug-pre';
          rawPre.textContent = JSON.stringify(debugResult.raw, null, 2);
          rawSection.appendChild(rawPre);
          testDebugBody.appendChild(rawSection);
        }
  
        testDebugModal.classList.remove('hidden');
        testDebugModal.setAttribute('aria-hidden', 'false');
        state.testDebugModalOpen = true;
        syncModalScrollLock();
      }

  function populateFilters() {
        const typeOptions = Array.from(new Set(state.robots.map((r) => r.type)));
        const knownTestDefinitions = new Map();
        state.robots.forEach((robot) => {
          const definitions = robot?.testDefinitions || env.TEST_DEFINITIONS;
          definitions.forEach((test) => {
            if (!knownTestDefinitions.has(test.id)) {
              knownTestDefinitions.set(test.id, test);
            }
          });
        });
  
        filterType.innerHTML = `<option value="all">All Types</option>`;
        typeOptions.forEach((type) => {
          const opt = document.createElement('option');
          opt.value = type;
          opt.textContent = type;
          filterType.appendChild(opt);
        });
  
        filterError.innerHTML = `
          <option value="all">All Robots</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warnings</option>
          <option value="critical">Critical</option>
          <option value="error">Any error</option>
        `;
  
        Array.from(knownTestDefinitions.values()).forEach((test) => {
          const option = document.createElement('option');
          option.value = test.id;
          option.textContent = `${test.label} errors`;
          filterError.appendChild(option);
        });
      }

  function populateAddRobotTypeOptions() {
        if (!addRobotTypeSelect) return;
        addRobotTypeSelect.replaceChildren();
  
        if (!env.ROBOT_TYPES.length) {
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = 'No robot types found';
          emptyOption.disabled = true;
          addRobotTypeSelect.appendChild(emptyOption);
          return;
        }
  
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a robot type';
        placeholder.disabled = true;
        addRobotTypeSelect.appendChild(placeholder);
  
        const seenTypes = new Set();
        env.ROBOT_TYPES.forEach((typeConfig) => {
          const typeId = normalizeText(typeConfig?.typeId, '');
          const typeKey = normalizeTypeId(typeId);
          if (!typeId || seenTypes.has(typeKey)) return;
          seenTypes.add(typeKey);
          const option = document.createElement('option');
          option.value = typeConfig.typeId || typeConfig.label || '';
          option.textContent = typeConfig.label || typeConfig.typeId || option.value;
          addRobotTypeSelect.appendChild(option);
        });
  
        const firstOption = addRobotTypeSelect.querySelector('option:not([value=""])');
        if (firstOption) {
          firstOption.selected = true;
        }
      }

  function setAddRobotMessage(message, style = 'warn') {
        if (!addRobotMessage) return;
        addRobotMessage.textContent = message || '';
        addRobotMessage.classList.remove('error', 'ok', 'warn');
        if (style) {
          addRobotMessage.classList.add(style);
        }
      }

  function setAddRobotPasswordVisibility(isVisible) {
        if (!addRobotPasswordInput || !addRobotPasswordToggle) return;
        addRobotPasswordInput.type = isVisible ? 'text' : 'password';
        applyActionButton(addRobotPasswordToggle, {
          intent: 'utility',
          label: isVisible ? 'Hide' : 'Show',
        });
        addRobotPasswordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
      }

  async function createRobotFromForm() {
        if (!addRobotForm || state.isCreateRobotInProgress) return;
        const form = new FormData(addRobotForm);
        const name = normalizeText(form.get('name'), '');
        const typeId = normalizeText(form.get('type'), '');
        const ip = normalizeText(form.get('ip'), '');
        const modelUrl = normalizeText(form.get('modelUrl'), '');
        const username = normalizeText(form.get('username'), '');
        const password = normalizeText(form.get('password'), '');
  
        if (!name || !typeId || !ip || !username || !password) {
          setAddRobotMessage('All fields except model URL are required.', 'error');
          return;
        }
  
        const knownType = env.ROBOT_TYPES.some(
          (type) => normalizeTypeId(type?.typeId) === normalizeTypeId(typeId),
        );
        if (!knownType) {
          setAddRobotMessage('Selected type is invalid. Choose an existing type.', 'error');
          return;
        }
  
        state.isCreateRobotInProgress = true;
        const saveButton = addRobotForm.querySelector('button[type="submit"]');
        if (saveButton) {
          setActionButtonLoading(saveButton, true, {
            loadingLabel: 'Saving...',
            idleLabel: 'Save robot',
          });
        }
        if (addRobotSavingHint) {
          addRobotSavingHint.textContent = 'Saving robot...';
        }
  
        try {
          const response = await fetch(buildApiUrl('/api/robots'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              type: typeId,
              ip,
              modelUrl: modelUrl || undefined,
              username,
              password,
            }),
          });
  
          const responseText = await response.text();
          if (!response.ok) {
            setAddRobotMessage(responseText || 'Unable to create robot.', 'error');
            return;
          }
  
          setAddRobotMessage('Robot created and written to config.', 'ok');
          await refreshRobotsFromBackendSnapshot();
          showDashboard();
        } finally {
          state.isCreateRobotInProgress = false;
          if (saveButton) {
            setActionButtonLoading(saveButton, false, {
              idleLabel: 'Save robot',
            });
          }
          if (addRobotSavingHint) {
            addRobotSavingHint.textContent = '';
          }
        }
      }

  async function refreshRobotsFromBackendSnapshot() {
        const previousSelectedIds = Array.from(state.selectedRobotIds || []);
        const previousDetailRobotId = normalizeText(state.detailRobotId, '');
        try {
          const refreshed = await loadRobotsFromBackend();
          setRobots(refreshed);
        } catch (_error) {
          return false;
        }
  
        const validRobotIds = new Set(state.robots.map((robot) => robotId(robot)).filter(Boolean));
        state.selectedRobotIds = new Set(previousSelectedIds.filter((id) => validRobotIds.has(id)));
        state.testingRobotIds = new Set(Array.from(state.testingRobotIds).filter((id) => validRobotIds.has(id)));
        state.searchingRobotIds = new Set(Array.from(state.searchingRobotIds).filter((id) => validRobotIds.has(id)));
        state.fixingRobotIds = new Set(Array.from(state.fixingRobotIds).filter((id) => validRobotIds.has(id)));
        state.autoTestingRobotIds = new Set(Array.from(state.autoTestingRobotIds).filter((id) => validRobotIds.has(id)));
        state.autoSearchingRobotIds = new Set(Array.from(state.autoSearchingRobotIds).filter((id) => validRobotIds.has(id)));
        state.autoActivityRobotIds = new Set(Array.from(state.autoActivityRobotIds).filter((id) => validRobotIds.has(id)));
  
        if (previousDetailRobotId && !validRobotIds.has(previousDetailRobotId)) {
          state.detailRobotId = null;
        }
  
        syncAutomatedRobotActivityFromState();
        syncAutoMonitorRefreshState();
        populateFilters();
        populateAddRobotTypeOptions();
        renderRecorderRobotOptions();
  
        if (dashboard.classList.contains('active')) {
          renderDashboard();
        }
  
        if (detail.classList.contains('active')) {
          const activeRobot = getRobotById(previousDetailRobotId || state.detailRobotId);
          if (activeRobot) {
            renderDetail(activeRobot);
          } else {
            showDashboard({ syncHash: false });
          }
        }
  
        return true;
      }

  function initAddRobotPasswordToggle() {
        if (!addRobotPasswordToggle || !addRobotPasswordInput) return;
        addRobotPasswordToggle.addEventListener('click', () => {
          setAddRobotPasswordVisibility(addRobotPasswordInput.type === 'password');
        });
      }

  return {
    renderDetail,
    runManualTests,
    normalizeManageTab,
    getPersistedManageTab,
    persistManageTab,
    resolveManageTab,
    buildManageHash,
    parseManageRoute,
    setLocationHash,
    isManageViewActive,
    hideRecorderReadPopover,
    syncRecorderReadPopoverVisibility,
    closeRecorderTerminalSession,
    setRecorderTerminalActive,
    openDetail,
    showAddRobotPage,
    showDashboard,
    closeTerminalSession,
    setTerminalInactive,
    setTerminalActive,
    getTimestamp,
    appendTerminalLine,
    runFallbackCommandSimulation,
    appendTerminalPayload,
    runFallbackChecks,
    getDetailTerminalPresets,
    initRobotTerminal,
    formatConsoleLine,
    formatEpochSeconds,
    formatRawOutput,
    closeTestDebugModal,
    setBugReportStatus,
    closeBugReportModal,
    openBugReportModal,
    submitBugReport,
    openTestDebugModal,
    populateFilters,
    populateAddRobotTypeOptions,
    setAddRobotMessage,
    setAddRobotPasswordVisibility,
    createRobotFromForm,
    refreshRobotsFromBackendSnapshot,
    initAddRobotPasswordToggle,
  };
}
