function createRobotJobsApi({ buildApiUrl, fetchImpl } = {}) {
  function resolveFetchImpl() {
    if (typeof fetchImpl === 'function') return fetchImpl;
    if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
      return globalThis.fetch.bind(globalThis);
    }
    throw new Error('Fetch API is unavailable for /jobs requests.');
  }

  async function readErrorDetail(response) {
    try {
      const payload = await response.json();
      if (payload && typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim();
      }
    } catch (_error) {
      // Fallback to text below.
    }
    try {
      const text = await response.text();
      if (text && text.trim()) return text.trim();
    } catch (_error) {
      // Ignore.
    }
    return `Request failed (${response.status})`;
  }

  async function enqueueJob(robotId, body) {
    const doFetch = resolveFetchImpl();
    const response = await doFetch(buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/jobs`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!response.ok) {
      throw new Error(await readErrorDetail(response));
    }
    return response.json();
  }

  async function stopActiveJob(robotId) {
    const doFetch = resolveFetchImpl();
    const response = await doFetch(buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/jobs/active/stop`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(await readErrorDetail(response));
    }
    return {
      status: response.status,
      body: await response.json(),
    };
  }

  return {
    enqueueJob,
    stopActiveJob,
  };
}

function createRobotJobQueueStore({ normalizeText, jobQueueActivity }) {
  const snapshotsByRobotId = new Map();
  if (!jobQueueActivity || typeof jobQueueActivity.normalizeJobQueueSnapshot !== 'function') {
    throw new Error('JOB_QUEUE_ACTIVITY helper is required.');
  }
  const normalizeSnapshot = (raw) => jobQueueActivity.normalizeJobQueueSnapshot(raw);

  function remember(robotId, snapshot) {
    const normalizedRobotId = normalizeText(robotId, '');
    if (!normalizedRobotId) return normalizeSnapshot(snapshot);
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    snapshotsByRobotId.set(normalizedRobotId, normalizedSnapshot);
    return normalizedSnapshot;
  }

  function applySnapshotToRobot(robot, snapshot) {
    if (!robot || typeof robot !== 'object') return robot;
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const previousActivity = robot.activity && typeof robot.activity === 'object' ? robot.activity : {};
    const mergedActivity = {
      ...previousActivity,
      jobQueueVersion: normalizedSnapshot.jobQueueVersion,
      activeJob: normalizedSnapshot.activeJob,
      queuedJobs: normalizedSnapshot.queuedJobs,
      updatedAt: Math.max(
        Number(previousActivity.updatedAt || 0),
        Number(normalizedSnapshot.activeJob?.updatedAt || 0),
        ...normalizedSnapshot.queuedJobs.map((item) => Number(item?.updatedAt || 0)),
      ),
    };

    return {
      ...robot,
      activity: mergedActivity,
    };
  }

  return {
    remember,
    applySnapshotToRobot,
  };
}

function createRobotJobQueueRenderer({ normalizeText }) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderJobChip(prefix, job) {
    if (!job || typeof job !== 'object') return '';
    const label = escapeHtml(normalizeText(job.label, normalizeText(job.id, 'job')) || 'job');
    const status = escapeHtml(normalizeText(job.status, 'queued'));
    return `<span class="pill robot-job-chip">${prefix}: ${label} (${status})</span>`;
  }

  function renderQueueStrip(activity, options = {}) {
    const payload = activity && typeof activity === 'object' ? activity : {};
    const activeJob = payload.activeJob && typeof payload.activeJob === 'object' ? payload.activeJob : null;
    const queuedJobs = Array.isArray(payload.queuedJobs) ? payload.queuedJobs : [];
    const maxQueued = Number.isFinite(Number(options.maxQueued)) ? Math.max(0, Math.trunc(Number(options.maxQueued))) : 3;
    const includeEmpty = options.includeEmpty === true;

    const chips = [];
    if (activeJob) {
      chips.push(renderJobChip('Active', activeJob));
    }
    queuedJobs.slice(0, maxQueued).forEach((job, index) => {
      chips.push(renderJobChip(`Q${index + 1}`, job));
    });
    if (queuedJobs.length > maxQueued) {
      chips.push(`<span class="pill robot-job-chip">+${queuedJobs.length - maxQueued} more</span>`);
    }

    if (!chips.length && !includeEmpty) return '';
    if (!chips.length) {
      chips.push('<span class="pill robot-job-chip">No queued manual jobs</span>');
    }

    return `<div class="robot-job-queue-strip" data-role="job-queue-strip">${chips.join('')}</div>`;
  }

  function hasStoppableActiveJob(activity) {
    const active = activity && typeof activity === 'object' ? activity.activeJob : null;
    const status = normalizeText(active?.status, '');
    return status === 'running' || status === 'interrupting';
  }

  function renderStopCurrentJobButton(activity, robotId) {
    if (!hasStoppableActiveJob(activity)) return '';
    const status = normalizeText(activity?.activeJob?.status, 'running');
    const normalizedRobotId = escapeHtml(normalizeText(robotId, ''));
    const label = status === 'interrupting' ? 'Stopping current job...' : 'Stop current job';
    const disabled = status === 'interrupting' ? ' disabled' : '';
    return (
      `<button class="button stop-current-job-btn" type="button" data-button-intent="danger" `
      + `data-action="stop-current-job" data-robot-id="${normalizedRobotId}"${disabled}>${label}</button>`
    );
  }

  return {
    renderQueueStrip,
    renderStopCurrentJobButton,
  };
}

export function createFixTestsFeature(context, maybeEnv) {
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
  const applyMonitorConfig = (...args) => runtime.applyMonitorConfig(...args);
  const applyMonitorConfigFromPayload = (...args) => runtime.applyMonitorConfigFromPayload(...args);
  const applyRecorderMappings = (...args) => runtime.applyRecorderMappings(...args);
  const areAllRobotIdsSelected = (...args) => runtime.areAllRobotIdsSelected(...args);
  const batteryReasonText = (...args) => runtime.batteryReasonText(...args);
  const buildConnectionCornerIconMarkup = (...args) => runtime.buildConnectionCornerIconMarkup(...args);
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
  const getCountdownLabel = (...args) => runtime.getCountdownLabel(...args);
  const getCountdownNodes = (...args) => runtime.getCountdownNodes(...args);
  const getDefinitionLabel = (...args) => runtime.getDefinitionLabel(...args);
  const getDetailTerminalPresets = (...args) => runtime.getDetailTerminalPresets(...args);
  const getFallbackTestIconText = (...args) => runtime.getFallbackTestIconText(...args);
  const getFleetParallelism = (...args) => runtime.getFleetParallelism(...args);
  const getMonitorBatteryIntervalMs = (...args) => runtime.getMonitorBatteryIntervalMs(...args);
  const getMonitorOnlineIntervalMs = (...args) => runtime.getMonitorOnlineIntervalMs(...args);
  const getMonitorTopicsIntervalMs = (...args) => runtime.getMonitorTopicsIntervalMs(...args);
  const getOnlineCheckCountdownMs = (...args) => runtime.getOnlineCheckCountdownMs(...args);
  const getPersistedManageTab = (...args) => runtime.getPersistedManageTab(...args);
  const getReachableRobotIds = (...args) => runtime.getReachableRobotIds(...args);
  const getRobotBatteryState = (...args) => runtime.getRobotBatteryState(...args);
  const getRobotById = (...args) => runtime.getRobotById(...args);
  const getRobotDefinitionsForType = (...args) => runtime.getRobotDefinitionsForType(...args);
  const getRobotTypeConfig = (...args) => runtime.getRobotTypeConfig(...args);
  const getDefinitionTagMeta = (...args) => runtime.getDefinitionTagMeta(...args);
  const hasMixedRobotTypesForIds = (...args) => runtime.hasMixedRobotTypesForIds(...args);
  const getRunSelectedButtonIdleLabel = (...args) => runtime.getRunSelectedButtonIdleLabel(...args);
  const getSelectedMappingTypeIds = (...args) => runtime.getSelectedMappingTypeIds(...args);
  const getSelectedRecorderTypeIds = (...args) => runtime.getSelectedRecorderTypeIds(...args);
  const getSelectedRobotIds = (...args) => runtime.getSelectedRobotIds(...args);
  const getStatusChipTone = (...args) => runtime.getStatusChipTone(...args);
  const getTestIconPresentation = (...args) => runtime.getTestIconPresentation(...args);
  const getTestingCountdownText = (...args) => runtime.getTestingCountdownText(...args);
  const getTimestamp = (...args) => runtime.getTimestamp(...args);
  const haveRuntimeTestsChanged = (...args) => runtime.haveRuntimeTestsChanged(...args);
  const hideRecorderReadPopover = (...args) => runtime.hideRecorderReadPopover(...args);
  const initAddRobotPasswordToggle = (...args) => runtime.initAddRobotPasswordToggle(...args);
  const initDashboardController = (...args) => runtime.initDashboardController(...args);
  const initFleetParallelism = (...args) => runtime.initFleetParallelism(...args);
  const initManageTabs = (...args) => runtime.initManageTabs(...args);
  const initMonitorConfigControls = (...args) => runtime.initMonitorConfigControls(...args);
  const initRobotTerminal = (...args) => runtime.initRobotTerminal(...args);
  const initThemeControls = (...args) => runtime.initThemeControls(...args);
  const initWorkflowRecorder = (...args) => runtime.initWorkflowRecorder(...args);
  const invalidateCountdownNodeCache = (...args) => runtime.invalidateCountdownNodeCache(...args);
  const isManageViewActive = (...args) => runtime.isManageViewActive(...args);
  const isRobotAutoSearching = (...args) => runtime.isRobotAutoSearching(...args);
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
  const normalizeOwnerTags = (...args) => runtime.normalizeOwnerTags(...args);
  const normalizePlatformTags = (...args) => runtime.normalizePlatformTags(...args);
  const normalizeManageTab = (...args) => runtime.normalizeManageTab(...args);
  const normalizePossibleResult = (...args) => runtime.normalizePossibleResult(...args);
  const normalizeRobotActivity = (...args) => runtime.normalizeRobotActivity(...args);
  const normalizeRobotData = (...args) => runtime.normalizeRobotData(...args);
  const normalizeRobotTests = (...args) => runtime.normalizeRobotTests(...args);
  const normalizeRobotTypeConfig = (...args) => runtime.normalizeRobotTypeConfig(...args);
  const normalizeRuntimeRobotEntry = (...args) => runtime.normalizeRuntimeRobotEntry(...args);
  const normalizeRuntimeTestUpdate = (...args) => runtime.normalizeRuntimeTestUpdate(...args);
  const normalizeTestDefinition = (...args) => runtime.normalizeTestDefinition(...args);
  const onFilterChange = (...args) => runtime.onFilterChange(...args);
  const onlineRobotComparator = (...args) => runtime.onlineRobotComparator(...args);
  const openBugReportModal = (...args) => runtime.openBugReportModal(...args);
  const openDetail = (...args) => runtime.openDetail(...args);
  const openTestDebugModal = (...args) => runtime.openTestDebugModal(...args);
  const parseJsonInput = (...args) => runtime.parseJsonInput(...args);
  const parseManageRoute = (...args) => runtime.parseManageRoute(...args);
  const patchDashboardForChangedRobots = (...args) => runtime.patchDashboardForChangedRobots?.(...args);
  const patchRobotTypeMapping = (...args) => runtime.patchRobotTypeMapping(...args);
  const persistManageTab = (...args) => runtime.persistManageTab(...args);
  const populateAddRobotTypeOptions = (...args) => runtime.populateAddRobotTypeOptions(...args);
  const populateFilters = (...args) => runtime.populateFilters(...args);
  const publishRecorderAsTest = (...args) => runtime.publishRecorderAsTest(...args);
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
  const runFallbackChecks = (...args) => runtime.runFallbackChecks(...args);
  const runFallbackCommandSimulation = (...args) => runtime.runFallbackCommandSimulation(...args);
  const runManualTests = (...args) => runtime.runManualTests(...args);
  const runRecorderCommandAndCapture = (...args) => runtime.runRecorderCommandAndCapture(...args);
  const runtimeActivityHasSignal = (...args) => runtime.runtimeActivityHasSignal(...args);
  const saveManageFixDefinition = (...args) => runtime.saveManageFixDefinition(...args);
  const saveManageTestDefinition = (...args) => runtime.saveManageTestDefinition(...args);
  const scheduleMonitorParallelismSync = (...args) => runtime.scheduleMonitorParallelismSync(...args);
  const selectRobotIds = (...args) => runtime.selectRobotIds(...args);
  const setActiveManageTab = (...args) => runtime.setActiveManageTab(...args);
  const setAddRobotMessage = (...args) => runtime.setAddRobotMessage(...args);
  const setAddRobotPasswordVisibility = (...args) => runtime.setAddRobotPasswordVisibility(...args);
  const setBugReportStatus = (...args) => runtime.setBugReportStatus(...args);
  const setFleetOnlineButtonIdleLabel = (...args) => runtime.setFleetOnlineButtonIdleLabel(...args);
  const setFleetParallelism = (...args) => runtime.setFleetParallelism(...args);
  const setLocationHash = (...args) => runtime.setLocationHash(...args);
  const setManageEditorStatus = (...args) => runtime.setManageEditorStatus(...args);
  const setManageTabStatus = (...args) => runtime.setManageTabStatus(...args);
  const setMonitorConfigStatus = (...args) => runtime.setMonitorConfigStatus(...args);
  const setRecorderTerminalActive = (...args) => runtime.setRecorderTerminalActive(...args);
  const setRobotFixing = (...args) => runtime.setRobotFixing(...args);
  const setRobotSearching = (...args) => runtime.setRobotSearching(...args);
  const setRobotSearchingBulk = (...args) => runtime.setRobotSearchingBulk(...args);
  const setRobotSelection = (...args) => runtime.setRobotSelection(...args);
  const setRobotTesting = (...args) => runtime.setRobotTesting(...args);
  const setRobotTypeDefinitions = (...args) => runtime.setRobotTypeDefinitions(...args);
  const setRobots = (...args) => runtime.setRobots(...args);
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
  const syncSelectionUi = (...args) => runtime.syncSelectionUi(...args);
  const updateFixMappings = (...args) => runtime.updateFixMappings(...args);
  const updateFleetOnlineRefreshStatus = (...args) => runtime.updateFleetOnlineRefreshStatus(...args);
  const updateKPIs = (...args) => runtime.updateKPIs(...args);
  const updateOnlineCheckEstimateFromResults = (...args) => runtime.updateOnlineCheckEstimateFromResults(...args);
  const updateSelectionSummary = (...args) => runtime.updateSelectionSummary(...args);
  const updateTestMappings = (...args) => runtime.updateTestMappings(...args);
  const matchesDefinitionFilters = (...args) => runtime.matchesDefinitionFilters(...args);

  const robotJobsApi = createRobotJobsApi({ buildApiUrl });
  const robotJobQueueStore = createRobotJobQueueStore({
    normalizeText,
    jobQueueActivity: JOB_QUEUE_ACTIVITY,
  });
  const robotJobQueueRenderer = createRobotJobQueueRenderer({ normalizeText });

  function renderRobotJobQueueStrip(activity, options = {}) {
        return robotJobQueueRenderer.renderQueueStrip(activity, options);
      }

  function renderRobotStopCurrentJobButton(activity, robotIdValue) {
        return robotJobQueueRenderer.renderStopCurrentJobButton(activity, robotIdValue);
      }

  function applyRobotJobQueueSnapshot(robotIdValue, snapshot, { repaint = true } = {}) {
        const normalizedRobotId = robotId(robotIdValue);
        if (!normalizedRobotId) return null;
        const normalizedSnapshot = robotJobQueueStore.remember(normalizedRobotId, snapshot);
        mapRobots((item) =>
          robotId(item) === normalizedRobotId
            ? robotJobQueueStore.applySnapshotToRobot(item, normalizedSnapshot)
            : item,
        );
        if (repaint) {
          applyRuntimeRobotPatches(new Set([normalizedRobotId]));
        }
        return normalizedSnapshot;
      }

  async function enqueueRobotJob(robotIdValue, body) {
        const normalizedRobotId = robotId(robotIdValue);
        if (!normalizedRobotId) {
          throw new Error('Robot id is required');
        }
        const payload = await robotJobsApi.enqueueJob(normalizedRobotId, body || {});
        applyRobotJobQueueSnapshot(normalizedRobotId, payload, { repaint: true });
        return payload;
      }

  async function stopCurrentJob(robotIdValue) {
        const normalizedRobotId = robotId(robotIdValue);
        if (!normalizedRobotId) {
          throw new Error('Robot id is required');
        }
        const response = await robotJobsApi.stopActiveJob(normalizedRobotId);
        applyRobotJobQueueSnapshot(normalizedRobotId, response?.body, { repaint: true });
        return response;
      }

  function setModelContainerFaultClasses(modelContainer, robot, isOffline, includeDetailClass = false) {
        if (!modelContainer) return;
        const failureClasses = nonBatteryTestEntries(robot)
          .filter(([, test]) => normalizeStatus(test?.status) !== 'ok')
          .map(([id]) => `fault-${id}`)
          .join(' ');
        const baseClass = modelContainer.classList.contains('robot-model-slot') ? 'robot-model-slot' : 'robot-3d';
        const detailClass = includeDetailClass ? 'detail-model' : '';
        modelContainer.className = `${baseClass} ${detailClass} ${failureClasses} ${isOffline ? 'offline' : ''}`.trim();
      }

  function updateCardRuntimeContent(card, robot) {
        if (!card || !robot) return;
        const stateKey = statusFromScore(robot);
        const isCritical = stateKey === 'critical';
        const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
        const normalizedRobotId = robotId(robot);
        const isTesting = isRobotTesting(normalizedRobotId);
        const isSearching = isRobotSearching(normalizedRobotId);
        const isFixing = isRobotFixing(normalizedRobotId);
        const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
        const isCountingDown = isTesting || isSearching || isFixing;
        const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
        const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {};
        const issues = issueSummary(robot);
        const issueText = issues.join(', ') || 'No active errors';
  
        card.classList.remove('state-ok', 'state-warning', 'state-critical', 'state-offline');
        card.classList.add(isOffline ? 'state-offline' : `state-${stateKey}`);
        card.classList.toggle('error', isCritical);
        card.classList.toggle('offline', isOffline);
        card.classList.toggle('testing', isTesting || isSearching || isFixing);
  
        const statusChipNode = card.querySelector('[data-role="card-status-chip"]');
        if (statusChipNode) {
          const tone = getStatusChipTone(stateKey);
          statusChipNode.className = `status-chip ${tone.css}`;
          statusChipNode.textContent = tone.text;
        }
  
        const badgeStrip = card.querySelector('[data-role="badge-strip"]');
        if (badgeStrip) {
          badgeStrip.innerHTML = issues.map((item) => `<span class="error-badge">${item}</span>`).join('');
        }
  
        const issuesPill = card.querySelector('[data-role="issues-pill"]');
        if (issuesPill) {
          issuesPill.textContent = `Issue cluster: ${issueText}`;
        }
  
        const movementPill = card.querySelector('[data-role="movement-pill"]');
        if (movementPill) {
          movementPill.textContent = `Movement: ${robot?.tests?.movement?.value || 'n/a'}`;
        }
        const lastFullTestPill = card.querySelector('[data-role="last-full-test-pill"]');
        if (lastFullTestPill) {
          lastFullTestPill.textContent = buildLastFullTestPillLabel(robot);
        }
        const queueStripHost = card.querySelector('[data-role="card-job-queue-strip"]');
        if (queueStripHost) {
          queueStripHost.innerHTML = renderRobotJobQueueStrip(robot?.activity, { maxQueued: 2 });
        }
        const stopJobHost = card.querySelector('[data-role="card-stop-current-job"]');
        if (stopJobHost) {
          stopJobHost.innerHTML = renderRobotStopCurrentJobButton(robot?.activity, normalizedRobotId);
        }
  
        const summaryBatteryHost = card.querySelector('[data-role="summary-battery-pill"]');
        if (summaryBatteryHost) {
          summaryBatteryHost.innerHTML = renderBatteryPill({
            value: batteryState.value,
            status: batteryState.status,
            reason: batteryState.reason,
            size: 'default',
          });
        }
  
        const modelContainer = card.querySelector('.model-wrap .robot-model-slot, .model-wrap .robot-3d');
        setModelContainerFaultClasses(modelContainer, robot, isOffline);
  
        const modelWrap = card.querySelector('.model-wrap');
        syncModelViewerRotationForContainer(modelWrap, isOffline);
        if (modelWrap) {
          const existingConnectionIcon = modelWrap.querySelector('[data-role="connection-corner-icon"]');
          if (existingConnectionIcon) {
            existingConnectionIcon.remove();
          }
          modelWrap.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
        }
  
        if (modelWrap) {
          const existingCountdown = modelWrap.querySelector('.scan-countdown');
          if (isCountingDown) {
            if (existingCountdown) {
              existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
              existingCountdown.textContent = testCountdown;
            } else {
              modelWrap.insertAdjacentHTML(
                'beforeend',
                `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
              );
            }
          } else if (existingCountdown) {
            existingCountdown.remove();
          }
  
          const existingOverlay = modelWrap.querySelector('[data-role="activity-overlay"]');
          const nextOverlayMarkup = buildScanOverlayMarkup({
            isSearching,
            isTesting,
            isFixing,
            compactAutoSearch,
          });
          if (nextOverlayMarkup) {
            if (existingOverlay) {
              existingOverlay.remove();
            }
            modelWrap.insertAdjacentHTML('beforeend', nextOverlayMarkup);
          } else if (existingOverlay) {
            existingOverlay.remove();
          }
        }
        invalidateCountdownNodeCache();
      }

  function patchDetailRuntimeContent(robot) {
        if (!robot || !detail.classList.contains('active')) return;
        if (robotId(robot) !== state.detailRobotId) return;
  
        const statusBar = $('#detailStatusBar');
        const testList = $('#testList');
        const modelHost = $('#detailModel');
        const stateKey = statusFromScore(robot);
        const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {};
        const errorCount = nonBatteryTestEntries(robot).filter(([, t]) => normalizeStatus(t?.status) !== 'ok').length;
        const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
        const normalizedRobotId = robotId(robot);
        const isTesting = isRobotTesting(normalizedRobotId);
        const isSearching = isRobotSearching(normalizedRobotId);
        const isFixing = isRobotFixing(normalizedRobotId);
        const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
        const isCountingDown = isTesting || isSearching || isFixing;
        const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
  
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
            <span class="detail-issue-count">${errorCount} issue(s)</span>`.trim().replace(/>\s+</g, '><');
        }
  
        const modelContainer = modelHost?.querySelector('.robot-model-slot, .robot-3d') || null;
        setModelContainerFaultClasses(modelContainer, robot, isOffline, true);
        syncModelViewerRotationForContainer(modelHost, isOffline);
  
        if (modelHost) {
          const existingOverlay = modelHost.querySelector('[data-role="activity-overlay"]');
          const nextOverlayMarkup = buildScanOverlayMarkup({
            isSearching,
            isTesting,
            isFixing,
            compactAutoSearch,
          });
          if (nextOverlayMarkup) {
            if (existingOverlay) existingOverlay.remove();
            modelHost.insertAdjacentHTML('beforeend', nextOverlayMarkup);
          } else if (existingOverlay) {
            existingOverlay.remove();
          }
  
          const existingCountdown = modelHost.querySelector('.scan-countdown');
          if (isCountingDown) {
            if (existingCountdown) {
              existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
              existingCountdown.textContent = testCountdown;
            } else {
              modelHost.insertAdjacentHTML(
                'beforeend',
                `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
              );
            }
          } else if (existingCountdown) {
            existingCountdown.remove();
          }
  
          const existingConnectionIcon = modelHost.querySelector('[data-role="connection-corner-icon"]');
          if (existingConnectionIcon) {
            existingConnectionIcon.remove();
          }
          modelHost.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
        }
        invalidateCountdownNodeCache();
  
        if (testList) {
          Object.entries(robot.tests || {}).forEach(([testId, result]) => {
            const escaped =
              typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
                ? CSS.escape(testId)
                : testId.replace(/"/g, '\\"');
            const row = testList.querySelector(`.test-row[data-test-id="${escaped}"]`);
            if (!row) return;
            const status = normalizeStatus(result?.status);
            const value = normalizeText(result?.value, 'n/a');
            const details = normalizeText(result?.details, 'No detail available');
            const statusPill = row.querySelector('[data-role="detail-test-status-pill"]');
            if (statusPill) {
              statusPill.textContent = status.toUpperCase();
            }
            const valueNode = row.querySelector('[data-role="detail-test-value"]');
            if (valueNode) {
              const previewText = buildTestPreviewTextForResult(testId, result);
              valueNode.textContent = previewText;
              valueNode.title = previewText;
            }
            const statusChipNode = row.querySelector('[data-role="detail-test-status-chip"]');
            if (statusChipNode) {
              statusChipNode.className = `status-chip ${status === 'ok' ? 'ok' : status === 'warning' ? 'warn' : 'err'}`;
              statusChipNode.textContent = status;
            }
          });
        }
        invalidateCountdownNodeCache();
      }

  function applyRuntimeRobotPatches(changedRobotIds) {
        const changedIds = Array.from(changedRobotIds || []).map((id) => robotId(id)).filter(Boolean);
        if (!changedIds.length) return;

        const patched = Boolean(patchDashboardForChangedRobots(changedIds));
        if (!patched) {
          renderDashboard();
        }
        if (state.detailRobotId) {
          const activeRobot = getRobotById(state.detailRobotId);
          patchDetailRuntimeContent(activeRobot);
        }
      }

  function updateFleetOnlineSummary(onlineNames, offlineNames, skippedNames = []) {
        const summary = $('#fleetOnlineSummary');
        if (!summary) return;
  
        const total = state.robots.length;
        const skippedCount = Array.isArray(skippedNames) ? skippedNames.length : 0;
        summary.style.display = 'block';
        summary.innerHTML = `
          <div style="font-size: 0.92rem; margin-bottom: 0.35rem; opacity: 0.9;">
            Online check complete • ${onlineNames.length} reachable / ${Math.max(0, total - skippedCount)} checked
          </div>
          <div><strong>Reachable:</strong> ${onlineNames.length ? onlineNames.join(', ') : 'none'}</div>
          <div><strong>Unreachable:</strong> ${offlineNames.length ? offlineNames.join(', ') : 'none'}</div>
          <div><strong>Skipped (busy):</strong> ${skippedCount ? skippedNames.join(', ') : 'none'}</div>
        `.trim().replace(/>\s+</g, '><');
        state.onlineRefreshSummary = {
          onlineCount: onlineNames.length,
          offlineCount: offlineNames.length,
          skippedCount,
          totalCount: total,
        };
      }

  function setFleetOnlineButtonState(isRunning) {
        const runAllButton = $('#runFleetOnline');
        if (!runAllButton) return;
        const idleLabel = normalizeText(runAllButton.dataset.idleLabel, 'Refresh online');
        setActionButtonLoading(runAllButton, isRunning, {
          loadingLabel: 'Refreshing...',
          idleLabel,
        });
        if (!isRunning) {
          updateFleetOnlineRefreshStatus();
        }
      }

  function selectAllRobots() {
        const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
        if (areAllRobotIdsSelected(allIds)) {
          selectRobotIds([], false);
          return;
        }
        selectRobotIds(allIds, true);
      }

  function getVisibleOnlineRobotIds() {
        return applyFilters()
          .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
          .map((robot) => robotId(robot));
      }

  function getVisibleOfflineRobotIds() {
        return applyFilters()
          .filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok')
          .map((robot) => robotId(robot));
      }

  function syncSectionToggleButtons() {
        const onlineButton = $('#selectAllOnlineRobots');
        const offlineButton = $('#selectAllOfflineRobots');
  
        const onlineIds = getVisibleOnlineRobotIds();
        const offlineIds = getVisibleOfflineRobotIds();
  
        if (onlineButton) {
          const allOnlineSelected = areAllRobotIdsSelected(onlineIds);
          applyActionButton(onlineButton, {
            intent: 'selection',
            pressed: allOnlineSelected,
            disabled: onlineIds.length === 0,
            label: allOnlineSelected ? 'Deselect all online' : 'Select all online',
            compact: true,
          });
          onlineButton.classList.toggle('toggle-on', allOnlineSelected);
          onlineButton.setAttribute('aria-pressed', allOnlineSelected ? 'true' : 'false');
        }
  
        if (offlineButton) {
          const allOfflineSelected = areAllRobotIdsSelected(offlineIds);
          applyActionButton(offlineButton, {
            intent: 'selection',
            pressed: allOfflineSelected,
            disabled: offlineIds.length === 0,
            label: allOfflineSelected ? 'Deselect all offline' : 'Select all offline',
            compact: true,
          });
          offlineButton.classList.toggle('toggle-on', allOfflineSelected);
          offlineButton.setAttribute('aria-pressed', allOfflineSelected ? 'true' : 'false');
        }
      }

  function selectAllOnlineRobots() {
        const ids = getVisibleOnlineRobotIds();
        if (areAllRobotIdsSelected(ids)) {
          removeRobotIdsFromSelection(ids);
          return;
        }
        addRobotIdsToSelection(ids);
      }

  function selectAllOfflineRobots() {
        const ids = getVisibleOfflineRobotIds();
        if (areAllRobotIdsSelected(ids)) {
          removeRobotIdsFromSelection(ids);
          return;
        }
        addRobotIdsToSelection(ids);
      }

  function getFixModeElements(context) {
        if (context === FIX_MODE_CONTEXT_DETAIL) {
          return {
            panel: detailFixModePanel,
            summary: detailFixModeSummary,
            actions: detailFixModeActions,
            status: detailFixModeStatus,
            toggleButton: toggleDetailFixModeButton,
            active: detail.classList.contains('active'),
          };
        }
        return {
          panel: dashboardFixModePanel,
          summary: dashboardFixModeSummary,
          actions: dashboardFixModeActions,
          status: dashboardFixModeStatus,
          toggleButton: toggleDashboardFixModeButton,
          active: dashboard.classList.contains('active'),
        };
      }

  function setFixModeStatus(context, message = '', tone = '') {
        const elements = getFixModeElements(context);
        if (!elements.status) return;
        elements.status.textContent = message;
        elements.status.classList.remove('ok', 'warn', 'error');
        if (tone) {
          elements.status.classList.add(tone);
        }
      }

  function getDashboardFixCandidates() {
        const selectedRobots = state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot)));
        if (hasMixedRobotTypesForIds(selectedRobots.map((robot) => robotId(robot)))) {
          return {
            selectedCount: selectedRobots.length,
            candidates: [],
            mixedTypes: true,
          };
        }
        const byKey = new Map();
        selectedRobots.forEach((robot) => {
          const typeLabel = normalizeText(robot.type, normalizeText(robot.typeId, 'Unknown type'));
          const typeKey = normalizeTypeId(robot.typeId || typeLabel || '');
          getAutoFixesForType(robot.typeId).forEach((fix) => {
            if (!fixMatchesDefinitionFilters(fix, fix)) return;
            const tagMeta = getDefinitionTagMeta(fix, fix);
            const key = `${typeKey}:${fix.id}`;
            if (!byKey.has(key)) {
              byKey.set(key, {
                key,
                  id: fix.id,
                  label: fix.label,
                  description: fix.description,
                ownerTags: getFixOwnerTags(tagMeta?.ownerTags),
                platformTags: getFixPlatformTags(tagMeta?.platformTags),
                typeLabel,
                robotIds: [],
              });
            }
            byKey.get(key).robotIds.push(robotId(robot));
          });
        });
        return {
          selectedCount: selectedRobots.length,
          candidates: Array.from(byKey.values()).sort((a, b) => {
            const byLabel = a.label.localeCompare(b.label);
            if (byLabel !== 0) return byLabel;
            return a.typeLabel.localeCompare(b.typeLabel);
          }),
          mixedTypes: false,
        };
      }

  function getDetailFixCandidates() {
        const robot = getRobotById(state.detailRobotId);
        if (!robot) {
          return { robot: null, candidates: [] };
        }
        const candidates = getAutoFixesForType(robot.typeId)
          .filter((fix) => fixMatchesDefinitionFilters(fix, fix))
          .map((fix) => {
            const tagMeta = getDefinitionTagMeta(fix, fix);
            return {
              key: `${normalizeTypeId(robot.typeId)}:${fix.id}`,
              id: fix.id,
              label: fix.label,
              description: fix.description,
              ownerTags: getFixOwnerTags(tagMeta?.ownerTags),
              platformTags: getFixPlatformTags(tagMeta?.platformTags),
              typeLabel: robot.type,
              robotIds: [robotId(robot)],
            };
          });
        return { robot, candidates };
      }

  function syncFixModeToggleButton(context) {
        const elements = getFixModeElements(context);
        const open = !!state.fixModeOpen[context];
        if (!elements.toggleButton) return;
        const label = open ? 'Exit fix mode' : 'Enter fix mode';
        applyActionButton(elements.toggleButton, {
          intent: 'fix',
          pressed: open,
          disabled: state.isAutoFixInProgress,
          label,
        });
        elements.toggleButton.setAttribute('aria-pressed', open ? 'true' : 'false');
      }

  function buildFixButtonLabel(candidate, includeTypeLabel = false) {
        const countLabel = candidate.robotIds.length > 1 ? ` (${candidate.robotIds.length})` : '';
        if (!includeTypeLabel) {
          return `${candidate.label}${countLabel}`;
        }
        return `${candidate.label} • ${candidate.typeLabel}${countLabel}`;
      }

  function fixMatchesDefinitionFilters(definition, fallback = {}) {
        const match = matchesDefinitionFilters(definition, fallback);
        if (typeof match === 'boolean') return match;
        return true;
      }

  function getFixOwnerTags(rawTags) {
        const normalized = normalizeOwnerTags(rawTags);
        if (Array.isArray(normalized) && normalized.length) return normalized;
        return ['global'];
      }

  function getFixPlatformTags(rawTags) {
        const normalized = normalizePlatformTags(rawTags);
        if (Array.isArray(normalized)) return normalized;
        return [];
      }

  function buildFixCandidateTagChips(candidate) {
        const chips = [];
        getFixOwnerTags(candidate?.ownerTags).forEach((tag) => {
          const chip = document.createElement('span');
          chip.className = 'tag-chip owner';
          chip.textContent = `owner:${tag}`;
          chips.push(chip);
        });
        return chips;
      }

  function buildFixCandidateActionNode(candidate, actionButton) {
        const entry = document.createElement('div');
        entry.className = 'fix-candidate-entry';
        entry.appendChild(actionButton);
        const chips = buildFixCandidateTagChips(candidate);
        if (chips.length) {
          const chipsWrap = document.createElement('div');
          chipsWrap.className = 'fix-candidate-tag-chips';
          chips.forEach((chip) => chipsWrap.appendChild(chip));
          entry.appendChild(chipsWrap);
        }
        return entry;
      }

  async function runAutoFixForRobot(robot, candidate) {
        if (!robot || !candidate) return;
        const normalizedRobotId = robotId(robot);
  
        const currentOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
        if (currentOnlineStatus !== 'ok') {
          appendTerminalLine(
            `Robot ${robot.name || normalizedRobotId} is not online. Running online check first...`,
            'warn',
          );
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
            throw new Error(`Robot is offline (${onlineStatus.details}).`);
          }
        }

        const payload = await enqueueRobotJob(normalizedRobotId, {
          kind: 'fix',
          fixId: normalizeText(candidate.id, ''),
          pageSessionId: state.pageSessionId,
          source: 'manual',
          label: normalizeText(candidate.label, 'Run fix'),
        });
        const activeStatus = normalizeText(payload?.activeJob?.status, '').toLowerCase();
        const queuedCount = Array.isArray(payload?.queuedJobs) ? payload.queuedJobs.length : 0;
        if (activeStatus === 'running' || activeStatus === 'interrupting') {
          appendTerminalLine(`Started auto-fix "${candidate.label}" on ${robot.name}.`, 'warn');
        } else {
          appendTerminalLine(
            `Queued auto-fix "${candidate.label}" on ${robot.name} (${queuedCount} queued).`,
            'warn',
          );
        }
      }

  async function runAutoFixCandidate(context, candidate) {
        if (state.isAutoFixInProgress || state.isTestRunInProgress || state.isOnlineRefreshInFlight) return;
        const candidateRobotIds = (candidate?.robotIds || []).map((id) => robotId(id)).filter(Boolean);
        if (!candidateRobotIds.length) {
          setFixModeStatus(context, 'No robots available for this fix action.', 'warn');
          return;
        }

        const robotIds = [];
        candidateRobotIds.forEach((targetId) => {
          const availability = getRobotActionAvailability(targetId, 'fix');
          if (availability?.allowed) {
            robotIds.push(targetId);
            return;
          }
          const robot = getRobotById(targetId);
          appendTerminalLine(
            `Skipping fix for ${robot?.name || targetId}: ${availability?.title || 'Robot is busy with another active operation.'}`,
            'warn',
          );
        });
        if (!robotIds.length) {
          setFixModeStatus(
            context,
            summarizeBlockedRobotActionTitle(
              candidateRobotIds.map((targetId) => getRobotActionAvailability(targetId, 'fix')),
              'No robots can run this fix right now.',
            ),
            'warn',
          );
          syncFixModePanels();
          return;
        }
  
        state.isAutoFixInProgress = true;
        syncFixModePanels();
        setFixModeStatus(context, `Running "${candidate.label}" on ${robotIds.length} robot(s)...`, 'warn');
  
        try {
          let successCount = 0;
          let failureCount = 0;
          const workerCount = Math.max(1, Math.min(getFleetParallelism(), robotIds.length));
          setFixModeStatus(
            context,
            `Running "${candidate.label}" on ${robotIds.length} robot(s) with parallelism ${workerCount}...`,
            'warn',
          );
          const queue = [...robotIds];
          const workers = Array.from({ length: workerCount }, () => (async () => {
            while (queue.length) {
              const targetId = queue.shift();
              if (!targetId) break;
              const targetRobot = getRobotById(targetId);
              if (!targetRobot) {
                failureCount += 1;
                continue;
              }
              try {
                await runAutoFixForRobot(targetRobot, candidate);
                successCount += 1;
              } catch (error) {
                failureCount += 1;
                const message = error instanceof Error ? error.message : String(error);
                appendTerminalLine(`Auto-fix failed for ${targetRobot.name}: ${message}`, 'err');
              }
            }
          })());
          await Promise.all(workers);
  
          renderDashboard();
          const activeRobot = getRobotById(state.detailRobotId);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
  
          if (failureCount === 0) {
            setFixModeStatus(context, `Auto-fix "${candidate.label}" completed (${successCount}/${robotIds.length}).`, 'ok');
          } else {
            setFixModeStatus(
              context,
              `Auto-fix "${candidate.label}" completed (${successCount} succeeded, ${failureCount} failed).`,
              'warn',
            );
          }
        } finally {
          state.isAutoFixInProgress = false;
          syncFixModePanels();
        }
      }

  function renderFixModeActionsForContext(context) {
        const elements = getFixModeElements(context);
        if (!elements.actions || !elements.summary) return;
        elements.actions.replaceChildren();
  
        if (context === FIX_MODE_CONTEXT_DETAIL) {
          const detailPayload = getDetailFixCandidates();
          const robot = detailPayload.robot;
          const candidates = detailPayload.candidates;
          if (!robot) {
            elements.summary.textContent = 'Open a robot detail page to use fix mode.';
            const empty = document.createElement('span');
            empty.className = 'fix-mode-empty';
            empty.textContent = 'No robot in context.';
            elements.actions.appendChild(empty);
            return;
          }
          if (!candidates.length) {
            elements.summary.textContent = `${robot.name} has no auto fixes configured.`;
            const empty = document.createElement('span');
            empty.className = 'fix-mode-empty';
            empty.textContent = 'No fixes available for this robot type.';
            elements.actions.appendChild(empty);
            return;
          }
  
          elements.summary.textContent = `${candidates.length} fix action(s) available for ${robot.name}.`;
          candidates.forEach((candidate) => {
            const availability = getRobotActionAvailability(candidate.robotIds[0], 'fix');
            const button = createActionButton({
              intent: 'fix',
              compact: true,
              label: buildFixButtonLabel(candidate, false),
              title: availability?.title || candidate.description || `Run ${candidate.label}`,
              disabled: state.isAutoFixInProgress || availability?.allowed === false,
            });
            button.addEventListener('click', () => {
              runAutoFixCandidate(context, candidate);
            });
            elements.actions.appendChild(buildFixCandidateActionNode(candidate, button));
          });
          return;
        }
  
        const payload = getDashboardFixCandidates();
        const candidates = payload.candidates;
        if (!payload.selectedCount) {
          elements.summary.textContent = 'Select one or more robots to see available fixes.';
          const empty = document.createElement('span');
          empty.className = 'fix-mode-empty';
          empty.textContent = 'No selected robots.';
          elements.actions.appendChild(empty);
          return;
        }
        if (payload.mixedTypes) {
          elements.summary.textContent = 'Fix mode requires selecting robots of the same type.';
          const empty = document.createElement('span');
          empty.className = 'fix-mode-empty';
          empty.textContent = 'Mixed robot types cannot run fixes together.';
          elements.actions.appendChild(empty);
          return;
        }
        if (!candidates.length) {
          elements.summary.textContent = 'No auto fixes are configured for the selected robots.';
          const empty = document.createElement('span');
          empty.className = 'fix-mode-empty';
          empty.textContent = 'Selected types have no fixes.';
          elements.actions.appendChild(empty);
          return;
        }
  
        elements.summary.textContent =
          `${candidates.length} fix action(s) across ${payload.selectedCount} selected robot(s).`;
        candidates.forEach((candidate) => {
          const availabilities = candidate.robotIds.map((targetId) => getRobotActionAvailability(targetId, 'fix'));
          const hasActionableRobot = availabilities.some((entry) => entry.allowed);
          const button = createActionButton({
            intent: 'fix',
            compact: true,
            label: buildFixButtonLabel(candidate, true),
            title:
              hasActionableRobot
                ? (candidate.description || `Run ${candidate.label} for ${candidate.typeLabel}`)
                : summarizeBlockedRobotActionTitle(
                    availabilities,
                    candidate.description || `Run ${candidate.label} for ${candidate.typeLabel}`,
                  ),
            disabled: state.isAutoFixInProgress || !hasActionableRobot,
          });
          button.addEventListener('click', () => {
            runAutoFixCandidate(context, candidate);
          });
          elements.actions.appendChild(buildFixCandidateActionNode(candidate, button));
        });
      }

  function syncFixModePanels() {
        [FIX_MODE_CONTEXT_DASHBOARD, FIX_MODE_CONTEXT_DETAIL].forEach((context) => {
          const elements = getFixModeElements(context);
          const open = !!state.fixModeOpen[context];
          if (elements.panel) {
            const shouldShow = open && elements.active;
            elements.panel.classList.toggle('hidden', !shouldShow);
          }
          syncFixModeToggleButton(context);
          if (open) {
            renderFixModeActionsForContext(context);
          }
        });
      }

  function toggleFixMode(context) {
        if (state.isAutoFixInProgress) return;
        state.fixModeOpen[context] = !state.fixModeOpen[context];
        if (!state.fixModeOpen[context]) {
          setFixModeStatus(context, '');
        }
        syncFixModePanels();
      }

  async function runOnlineCheckForAllRobots() {
        if (!state.robots.length || state.isOnlineRefreshInFlight || state.isAutoFixInProgress) return;
  
        const activeRobotIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
        if (!activeRobotIds.length) return;
        const availabilityById = new Map(
          activeRobotIds.map((id) => [id, getRobotActionAvailability(id, 'online')]),
        );
        const busyRobotIds = activeRobotIds.filter((id) => availabilityById.get(id)?.allowed === false);
        const busyRobotIdSet = new Set(busyRobotIds);
        const eligibleRobotIds = activeRobotIds.filter((id) => !busyRobotIdSet.has(id));
        const skippedNameSet = new Set(
          busyRobotIds
            .map((id) => {
              const robot = getRobotById(id);
              return normalizeText(robot?.name, id);
            })
            .filter(Boolean),
        );
        if (!eligibleRobotIds.length) {
          state.onlineRefreshLastAt = Date.now();
          state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
          startOnlineRefreshStatusTimer();
          updateFleetOnlineSummary([], [], Array.from(skippedNameSet).sort());
          return;
        }
  
        state.isOnlineRefreshInFlight = true;
        setFleetOnlineButtonState(true);
        state.onlineRefreshStartedAt = Date.now();
        state.onlineRefreshNextAt = 0;
        startOnlineRefreshStatusTimer();
        setRobotSearchingBulk(eligibleRobotIds, true, getOnlineCheckCountdownMs());
  
        const onlineNames = [];
        const offlineNames = [];
        try {
          let batchResponse = null;
          try {
            batchResponse = await fetch(buildApiUrl('/api/robots/online-check'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                robotIds: eligibleRobotIds,
                pageSessionId: state.pageSessionId,
                forceRefresh: true,
                timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
                parallelism: getFleetParallelism(),
              }),
            });
          } catch (_error) {
            batchResponse = null;
          }
  
          if (batchResponse && batchResponse.ok) {
            const payload = await batchResponse.json();
            updateOnlineCheckEstimateFromResults(payload?.results);
            const byId = new Map();
            if (Array.isArray(payload?.results)) {
              payload.results.forEach((entry) => {
                const id = normalizeText(entry?.robotId, '');
                if (!id) return;
                byId.set(id, {
                  status: normalizeStatus(entry?.status),
                  value: normalizeText(entry?.value, 'n/a'),
                  details: normalizeText(entry?.details, 'No detail available'),
                  skipped: Boolean(entry?.skipped),
                });
              });
            }
  
            mapRobots((robot) => {
              const normalizedRobotId = robotId(robot);
              if (!normalizedRobotId) return robot;
              const label = normalizeText(robot.name, normalizedRobotId);
              const statusUpdate = byId.get(normalizedRobotId);
              if (!statusUpdate || statusUpdate.skipped) {
                if (busyRobotIdSet.has(normalizedRobotId) || statusUpdate?.skipped) {
                  skippedNameSet.add(label);
                }
                return robot;
              }
              if (statusUpdate.status === 'ok') {
                onlineNames.push(label);
              } else {
                offlineNames.push(label);
              }
              return {
                ...robot,
                tests: {
                  ...(robot.tests || {}),
                  online: statusUpdate,
                },
              };
            });
          } else {
            const fallbackOnlineResults = [];
            const fallbackUpdates = await Promise.all(eligibleRobotIds.map(async (normalizedRobotId) => {
              const robot = getRobotById(normalizedRobotId);
              if (!robot) return null;
              const statusUpdate = await runOneRobotOnlineCheck(robot);
              return {
                robotId: normalizedRobotId,
                statusUpdate,
              };
            }));
            const fallbackById = new Map();
            fallbackUpdates.forEach((entry) => {
              if (!entry) return;
              fallbackById.set(entry.robotId, entry.statusUpdate);
              if (!entry.statusUpdate?.skipped) {
                fallbackOnlineResults.push(entry.statusUpdate);
              }
            });
  
            mapRobots((robot) => {
              const normalizedRobotId = robotId(robot);
              if (!normalizedRobotId) return robot;
              const label = normalizeText(robot.name, normalizedRobotId);
              const statusUpdate = fallbackById.get(normalizedRobotId);
              if (!statusUpdate || statusUpdate.skipped) {
                if (statusUpdate?.skipped) {
                  skippedNameSet.add(label);
                }
                return robot;
              }
              if (statusUpdate.status === 'ok') {
                onlineNames.push(label);
              } else {
                offlineNames.push(label);
              }
              return {
                ...robot,
                tests: {
                  ...(robot.tests || {}),
                  online: {
                    status: statusUpdate.status,
                    value: statusUpdate.value,
                    details: statusUpdate.details,
                  },
                },
              };
            });
  
            updateOnlineCheckEstimateFromResults(fallbackOnlineResults);
          }
  
          renderDashboard();
          updateFleetOnlineSummary(onlineNames, offlineNames, Array.from(skippedNameSet).sort());
        } finally {
          state.isOnlineRefreshInFlight = false;
          setFleetOnlineButtonState(false);
          setRobotSearchingBulk(eligibleRobotIds, false);
          state.onlineRefreshLastAt = Date.now();
          state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
          startOnlineRefreshStatusTimer();
        }
      }

  async function runOneRobotOnlineCheck(robot) {
        const normalizedRobotId = robotId(robot);
        if (!normalizedRobotId) {
          return {
            status: 'error',
            value: 'unreachable',
            details: 'Robot identifier is missing for online check.',
            ms: 0,
          };
        }
  
        try {
          const response = await fetch(
            buildApiUrl('/api/robots/online-check'),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                robotIds: [normalizedRobotId],
                pageSessionId: state.pageSessionId,
                forceRefresh: true,
                timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
                parallelism: getFleetParallelism(),
              }),
            },
          );
          if (!response.ok) {
            const text = await response.text();
            return {
              status: 'error',
              value: 'unreachable',
              details: `HTTP ${response.status}: ${text || 'Unable to run online test'}`,
              ms: 0,
            };
          }
  
          const payload = await response.json();
          const onlineResult = Array.isArray(payload?.results)
            ? payload.results.find((result) => normalizeText(result?.robotId, '') === normalizedRobotId)
            : null;
  
          if (!onlineResult) {
            return {
              status: 'error',
              value: 'unreachable',
              details: 'Backend returned no online test result.',
              ms: 0,
            };
          }
  
          return {
            status: normalizeStatus(onlineResult.status),
            value: normalizeText(onlineResult.value, 'n/a'),
            details: normalizeText(onlineResult.details, 'No detail available'),
            ms: Number.isFinite(Number(onlineResult.ms)) ? Number(onlineResult.ms) : 0,
            skipped: Boolean(onlineResult?.skipped),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            status: 'error',
            value: 'unreachable',
            details: `Unable to run online test: ${message}`,
            ms: 0,
          };
        }
      }

  async function runRobotTestsForRobot(robotId, body) {
        const payload = await enqueueRobotJob(robotId, {
          kind: 'test',
          testIds: Array.isArray(body?.testIds) ? body.testIds : undefined,
          pageSessionId: normalizeText(body?.pageSessionId, state.pageSessionId),
          source: 'manual',
          label: 'Run tests',
          timeoutSec: body?.timeoutSec,
          queueTimeoutSec: body?.queueTimeoutSec,
          connectTimeoutSec: body?.connectTimeoutSec,
          executeTimeoutSec: body?.executeTimeoutSec,
        });
        return {
          robotId,
          runId: normalizeText(payload?.jobId, ''),
          startedAt: Number.isFinite(Number(payload?.activeJob?.startedAt)) ? Number(payload.activeJob.startedAt) : 0,
          finishedAt: 0,
          session: {},
          timing: {},
          results: [],
          activeJob: payload?.activeJob || null,
          queuedJobs: Array.isArray(payload?.queuedJobs) ? payload.queuedJobs : [],
          jobQueueVersion: Number.isFinite(Number(payload?.jobQueueVersion)) ? Number(payload.jobQueueVersion) : 0,
        };
      }

  function getRobotIdsForRun(options = {}, runtimeOptions = {}) {
        const persistSelection = runtimeOptions.persistSelection !== false;
        const selectedIds = getSelectedRobotIds().filter((id) => robotId(id));

        if (selectedIds.length) return selectedIds;
  
        if (options.autoSelectOnlineWhenEmpty) {
          const reachableIds = getReachableRobotIds().filter((id) => robotId(id));
          if (reachableIds.length) {
            if (persistSelection) {
              selectRobotIds(reachableIds);
              return getSelectedRobotIds().filter((id) => robotId(id));
            }
            return reachableIds;
          }
          return [];
        }
  
        if (options.fallbackToActive && state.detailRobotId) {
          return [state.detailRobotId];
        }

        return [];
      }

  function getRobotActionAvailability(robotIdValue, actionKind = 'test') {
        const id = robotId(robotIdValue);
        const robot = getRobotById(id);
        if (!id || !robot) {
          return {
            allowed: false,
            blocked: true,
            preemptableAuto: false,
            title: 'Robot not found.',
          };
        }

        const actionLabel =
          actionKind === 'fix'
            ? 'fix'
            : actionKind === 'online'
              ? 'online check'
              : 'tests';
        const activity = normalizeRobotActivity(robot?.activity);
        const phase = normalizeText(activity?.phase, '');
        const hasQueuedUserWork = Boolean(activity?.activeJob)
          || (Array.isArray(activity?.queuedJobs) && activity.queuedJobs.length > 0);

        if (actionKind !== 'online' && hasQueuedUserWork) {
          return {
            allowed: true,
            blocked: false,
            preemptableAuto: false,
            title: actionKind === 'fix' ? 'Queue fix job' : 'Queue test job',
          };
        }

        if (state.fixingRobotIds.has(id) || phase === 'fixing') {
          return {
            allowed: false,
            blocked: true,
            preemptableAuto: false,
            title: 'Fix is already running for this robot.',
          };
        }
        if (state.testingRobotIds.has(id)) {
          return {
            allowed: false,
            blocked: true,
            preemptableAuto: false,
            title: 'Tests are already running for this robot.',
          };
        }
        if (state.searchingRobotIds.has(id)) {
          return {
            allowed: false,
            blocked: true,
            preemptableAuto: false,
            title: 'Online check is already running for this robot.',
          };
        }

        const autoTesting = state.autoTestingRobotIds.has(id);
        const preemptableAuto = autoTesting && (
          phase === 'connection_retry' || phase === 'full_test_after_recovery'
        );
        if (preemptableAuto) {
          return {
            allowed: true,
            blocked: false,
            preemptableAuto: true,
            title: `Stops automatic recovery tests and runs ${actionLabel}.`,
          };
        }

        if (autoTesting || state.autoSearchingRobotIds.has(id)) {
          return {
            allowed: false,
            blocked: true,
            preemptableAuto: false,
            title: 'Robot is busy with an automatic operation that cannot be interrupted.',
          };
        }

        return {
          allowed: true,
          blocked: false,
          preemptableAuto: false,
          title:
            actionKind === 'fix'
              ? 'Run fix'
              : actionKind === 'online'
                ? 'Run online check'
                : 'Run tests',
        };
      }

  function summarizeBlockedRobotActionTitle(availabilities, fallbackTitle) {
        const titles = Array.from(new Set(
          (Array.isArray(availabilities) ? availabilities : [])
            .map((entry) => normalizeText(entry?.title, ''))
            .filter(Boolean),
        ));
        if (!titles.length) return fallbackTitle;
        if (titles.length === 1) return titles[0];
        return 'Selected robots are busy with operations that cannot be interrupted.';
      }

  function getManualRunButtonState() {
        const detailTargetIds = getRobotIdsForRun(
          { fallbackToActive: true },
          { persistSelection: false },
        );
        const selectedTargetIds = getRobotIdsForRun(
          { fallbackToActive: false, autoSelectOnlineWhenEmpty: true },
          { persistSelection: false },
        );
        const detailAvailability = detailTargetIds.length
          ? getRobotActionAvailability(detailTargetIds[0], 'test')
          : null;
        const hasMixedSelectedTypes = hasMixedRobotTypesForIds(selectedTargetIds);
        const selectedAvailabilities = selectedTargetIds.map((id) => getRobotActionAvailability(id, 'test'));
        const hasSelectedActionableRobot = selectedAvailabilities.some((entry) => entry.allowed);

        return {
          detailDisabled: Boolean(detailAvailability) && !detailAvailability.allowed,
          detailTitle: detailAvailability?.title || 'Run tests',
          selectedDisabled: hasMixedSelectedTypes || (selectedTargetIds.length > 0 && !hasSelectedActionableRobot),
          selectedTitle:
            hasMixedSelectedTypes
              ? 'Selected robots must all share the same type.'
              : selectedTargetIds.length > 0 && !hasSelectedActionableRobot
              ? summarizeBlockedRobotActionTitle(selectedAvailabilities, getRunSelectedButtonIdleLabel())
              : getRunSelectedButtonIdleLabel(),
        };
      }

  function getConfiguredDefaultTestIds(robot, includeOnline = false) {
        const byDefinition =
          Array.isArray(robot?.testDefinitions)
            ? robot.testDefinitions
            : [];
        const testIds = byDefinition
          .filter((item) => item && typeof item === 'object' && item.enabled !== false)
          .map((item) => normalizeText(item?.id, ''))
          .filter((id) => id && (includeOnline || id !== 'online'));
        return Array.from(new Set(testIds)).filter(Boolean);
      }

  function normalizeDebugSession(session, runIdFallback = '') {
        if (!session || typeof session !== 'object') return {};
        return {
          runId: normalizeText(session.runId, runIdFallback),
          robotId: normalizeText(session.robotId, ''),
          pageSessionId: normalizeText(session.pageSessionId, ''),
          runKind: normalizeText(session.runKind, ''),
          transportReused: Boolean(session.transportReused),
          resetPolicy: normalizeText(session.resetPolicy, ''),
        };
      }

  function normalizeDebugTiming(timing) {
        if (!timing || typeof timing !== 'object') return {};
        return {
          queueMs: Number.isFinite(Number(timing.queueMs)) ? Number(timing.queueMs) : 0,
          connectMs: Number.isFinite(Number(timing.connectMs)) ? Number(timing.connectMs) : 0,
          executeMs: Number.isFinite(Number(timing.executeMs)) ? Number(timing.executeMs) : 0,
          totalMs: Number.isFinite(Number(timing.totalMs)) ? Number(timing.totalMs) : 0,
        };
      }

  function normalizeStepDebug(step) {
        if (!step || typeof step !== 'object') return null;
        return {
          id: normalizeText(step.id, 'step'),
          status: normalizeStatus(step.status),
          value: normalizeText(step.value, 'n/a'),
          details: normalizeText(step.details, 'No detail available'),
          ms: Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0,
          output: normalizeText(step.output, ''),
        };
      }

  function normalizeTestDebugResult(result) {
        if (!result || typeof result !== 'object') return null;
        const steps = Array.isArray(result.steps) ? result.steps.map(normalizeStepDebug).filter(Boolean) : [];
        return {
          id: normalizeText(result.id, ''),
          status: normalizeStatus(result.status),
          value: normalizeText(result.value, 'n/a'),
          details: normalizeText(result.details, 'No detail available'),
          reason: normalizeText(result.reason, ''),
          errorCode: normalizeText(result.errorCode, ''),
          source: normalizeText(result.source, ''),
          checkedAt: Number.isFinite(Number(result.checkedAt)) ? Number(result.checkedAt) : 0,
          skipped: Boolean(result.skipped),
          ms: Number.isFinite(Number(result.ms)) ? Number(result.ms) : 0,
          read: result.read && typeof result.read === 'object' ? result.read : {},
          raw: result.raw && typeof result.raw === 'object' ? result.raw : {},
          steps,
        };
      }

  function normalizeTestDebugCollection(rawCollection) {
        if (!rawCollection || typeof rawCollection !== 'object') return {};
        const entries = Array.isArray(rawCollection)
          ? rawCollection.map((entry) => [normalizeText(entry?.id, ''), entry])
          : Object.entries(rawCollection);
        const normalized = {};
        entries.forEach(([rawId, rawValue]) => {
          const base = rawValue && typeof rawValue === 'object' ? rawValue : {};
          const id = normalizeText(rawId, normalizeText(base.id, ''));
          if (!id) return;
          const debugResult = normalizeTestDebugResult({ ...base, id });
          if (!debugResult) return;
          const session = normalizeDebugSession(base.session, normalizeText(base.runId, ''));
          normalized[id] = {
            ...debugResult,
            runId: normalizeText(base.runId, normalizeText(session.runId, '')),
            startedAt: Number.isFinite(Number(base.startedAt)) ? Number(base.startedAt) : 0,
            finishedAt: Number.isFinite(Number(base.finishedAt)) ? Number(base.finishedAt) : 0,
            session,
            timing: normalizeDebugTiming(base.timing),
          };
        });
        return normalized;
      }

  function updateRobotTestState(robotIdValue, results, runMeta = {}) {
        const id = robotId(robotIdValue);
        if (!id) return;
        if (!results.length) return;
        const runSession = normalizeDebugSession(runMeta?.session, normalizeText(runMeta?.runId, ''));
        const runTiming = normalizeDebugTiming(runMeta?.timing);
        const runId = normalizeText(runMeta?.runId, normalizeText(runSession.runId, ''));

        const robot = state.robots.find((item) => robotId(item) === id);
        const updates = { ...(robot?.tests || {}) };
        const debugUpdates = { ...(robot?.testDebug || {}) };
        results.forEach((result) => {
          if (!result || typeof result !== 'object') return;
          const resultId = normalizeText(result.id, '');
          if (!resultId) return;
          updates[resultId] = {
            status: normalizeStatus(result.status),
            value: normalizeText(result.value, 'n/a'),
            details: normalizeText(result.details, 'No detail available'),
            reason: normalizeText(result.reason, ''),
            errorCode: normalizeText(result.errorCode, ''),
            source: normalizeText(result.source, ''),
            checkedAt: Number.isFinite(Number(result.checkedAt)) ? Number(result.checkedAt) : 0,
            skipped: Boolean(result.skipped),
          };
          const debugResult = normalizeTestDebugResult(result);
          if (debugResult) {
            debugUpdates[resultId] = {
              ...debugResult,
              runId,
              startedAt: Number.isFinite(Number(runMeta?.startedAt)) ? Number(runMeta.startedAt) : 0,
              finishedAt: Number.isFinite(Number(runMeta?.finishedAt)) ? Number(runMeta.finishedAt) : 0,
              session: runSession,
              timing: runTiming,
            };
          }
        });
  
        const hasExplicitOnlineResult = results.some(
          (result) => normalizeText(result?.id, '') === 'online',
        );
        const existingOnline = robot?.tests?.online;
        const existingOnlineStatus = normalizeStatus(existingOnline?.status);
        const existingOnlineValue = normalizeText(existingOnline?.value, '').toLowerCase();
        const existingOnlineDetails = normalizeText(existingOnline?.details, '').toLowerCase();
        const existingOnlineCheckedAt = Number(existingOnline?.checkedAt);
        const isPlaceholderOnline =
          existingOnlineStatus === 'warning' &&
          (existingOnlineValue === '' || existingOnlineValue === 'unknown') &&
          (existingOnlineDetails === '' || existingOnlineDetails === 'not checked yet');
        const hasRecentExplicitOnline =
          !!existingOnline &&
          !isPlaceholderOnline &&
          (!Number.isFinite(existingOnlineCheckedAt) || existingOnlineCheckedAt <= 0 || (Date.now() / 1000) - existingOnlineCheckedAt <= 15);
        if (!hasExplicitOnlineResult && !hasRecentExplicitOnline) {
          const nonOnlineResults = results.filter(
            (result) => normalizeText(result?.id, '') !== 'online',
          );
          const anyNonError = nonOnlineResults.some(
            (result) => normalizeStatus(result?.status) !== 'error',
          );
          const allSshFailures =
            nonOnlineResults.length > 0 &&
            nonOnlineResults.every((result) => {
              if (normalizeStatus(result?.status) !== 'error') return false;
              const details = normalizeText(result?.details, '').toLowerCase();
              const value = normalizeText(result?.value, '').toLowerCase();
              return (
                details.includes('ssh') ||
                details.includes('connect') ||
                details.includes('auth') ||
                value === 'execution_error' ||
                value === 'command_error'
              );
            });
  
          if (anyNonError) {
            updates.online = {
              status: 'ok',
              value: 'reachable',
              details: 'Inferred online: at least one test command executed.',
            };
          } else if (allSshFailures) {
            updates.online = {
              status: 'error',
              value: 'unreachable',
              details: 'Inferred offline: test execution failed for SSH/connectivity reasons.',
            };
          }
        }
  
        if (!Object.keys(updates).length) return;
  
        mapRobots((item) =>
          robotId(item) === id
            ? {
                ...item,
                tests: updates,
                testDebug: debugUpdates,
              }
            : item,
        );
      }

  function setRunningButtonState(isRunning) {
        const runButton = $('#runRobotTests');
        const runSelectedButton = $('#runSelectedRobotTests');
        const buttonState = getManualRunButtonState();
  
        if (runButton) {
          if (isRunning) {
            setActionButtonLoading(runButton, true, {
              loadingLabel: 'Running tests...',
              idleLabel: 'Run tests',
            });
          } else {
            applyActionButton(runButton, {
              intent: 'run',
              label: 'Run tests',
              title: buttonState.detailTitle,
              ariaLabel: 'Run tests',
              disabled: buttonState.detailDisabled,
            });
          }
        }
        if (runSelectedButton) {
          if (isRunning) {
            setActionButtonLoading(runSelectedButton, true, {
              loadingLabel: 'Running selected tests...',
              idleLabel: getRunSelectedButtonIdleLabel(),
            });
          } else {
            applyActionButton(runSelectedButton, {
              intent: 'run',
              label: getRunSelectedButtonIdleLabel(),
              title: buttonState.selectedTitle,
              ariaLabel: getRunSelectedButtonIdleLabel(),
              disabled: buttonState.selectedDisabled,
            });
          }
        }
      }

  return {
    init() {},
    setModelContainerFaultClasses,
    updateCardRuntimeContent,
    patchDetailRuntimeContent,
    applyRuntimeRobotPatches,
    updateFleetOnlineSummary,
    setFleetOnlineButtonState,
    selectAllRobots,
    getVisibleOnlineRobotIds,
    getVisibleOfflineRobotIds,
    syncSectionToggleButtons,
    selectAllOnlineRobots,
    selectAllOfflineRobots,
    getFixModeElements,
    setFixModeStatus,
    getDashboardFixCandidates,
    getDetailFixCandidates,
    syncFixModeToggleButton,
    buildFixButtonLabel,
    runAutoFixForRobot,
    runAutoFixCandidate,
    renderFixModeActionsForContext,
    syncFixModePanels,
    toggleFixMode,
    runOnlineCheckForAllRobots,
    runOneRobotOnlineCheck,
    runRobotTestsForRobot,
    enqueueRobotJob,
    stopCurrentJob,
    applyRobotJobQueueSnapshot,
    renderRobotJobQueueStrip,
    renderRobotStopCurrentJobButton,
    getRobotIdsForRun,
    getRobotActionAvailability,
    getConfiguredDefaultTestIds,
    normalizeStepDebug,
    normalizeTestDebugResult,
    normalizeTestDebugCollection,
    updateRobotTestState,
    setRunningButtonState,
  };
}
