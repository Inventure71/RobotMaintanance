import { createModelAssetResolver } from '../../../primitives/model-viewer/modelAssetResolver.js';

export function createFleetFeature(context, maybeEnv) {
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

  const MODEL_RESOLUTION_LOW = 'low';
  const MODEL_RESOLUTION_HIGH = 'high';
  const DEFAULT_MODEL_QUALITY_BASE_PATH = 'assets/models';
  const modelAssetResolver = createModelAssetResolver({
    qualityLevels: [
      { id: MODEL_RESOLUTION_LOW, folder: 'LowRes' },
      { id: MODEL_RESOLUTION_HIGH, folder: 'HighRes' },
    ],
  });
  const LARGE_FLEET_WINDOW_THRESHOLD = 160;
  const LARGE_FLEET_WINDOW_INITIAL = 120;
  const LARGE_FLEET_WINDOW_STEP = 80;
  let largeFleetWindowingEnabled = false;
  let onlineRenderLimit = Number.POSITIVE_INFINITY;
  let offlineRenderLimit = Number.POSITIVE_INFINITY;
  let latestOnlineCount = 0;
  let latestOfflineCount = 0;
  let largeFleetWindowListenersBound = false;
  let modelViewerRuntimePromise = null;
  const lazyModelViewerObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry?.isIntersecting) return;
            hydrateLazyModelViewer(entry.target).catch(() => {});
            lazyModelViewerObserver.unobserve(entry.target);
          });
        },
        {
          root: null,
          rootMargin: '240px 0px',
          threshold: 0.01,
        },
      )
      : null;

  const addRecorderOutputVisual = (...args) => runtime.addRecorderOutputVisual(...args);
  const addRecorderReadVisual = (...args) => runtime.addRecorderReadVisual(...args);
  const appendTerminalLine = (...args) => runtime.appendTerminalLine(...args);
  const appendTerminalPayload = (...args) => runtime.appendTerminalPayload(...args);
  const applyMonitorConfig = (...args) => runtime.applyMonitorConfig(...args);
  const applyMonitorConfigFromPayload = (...args) => runtime.applyMonitorConfigFromPayload(...args);
  const applyRecorderMappings = (...args) => runtime.applyRecorderMappings(...args);
  const applyRuntimeRobotPatches = (...args) => runtime.applyRuntimeRobotPatches(...args);
  const batteryReasonText = (...args) => runtime.batteryReasonText(...args);
  const buildFixButtonLabel = (...args) => runtime.buildFixButtonLabel(...args);
  const buildGlobalTestDefinitions = (...args) => runtime.buildGlobalTestDefinitions(...args);
  const buildManageHash = (...args) => runtime.buildManageHash(...args);
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
  const deleteManageFixDefinition = (...args) => runtime.deleteManageFixDefinition(...args);
  const deleteManageTestDefinition = (...args) => runtime.deleteManageTestDefinition(...args);
  const formatConsoleLine = (...args) => runtime.formatConsoleLine(...args);
  const formatEpochSeconds = (...args) => runtime.formatEpochSeconds(...args);
  const formatRawOutput = (...args) => runtime.formatRawOutput(...args);
  const formatTestValue = (...args) => runtime.formatTestValue(...args);
  const getAutoFixesForType = (...args) => runtime.getAutoFixesForType(...args);
  const getConfiguredDefaultTestIds = (...args) => runtime.getConfiguredDefaultTestIds(...args);
  const getDashboardFixCandidates = (...args) => runtime.getDashboardFixCandidates(...args);
  const getDefinitionLabel = (...args) => runtime.getDefinitionLabel(...args);
  const getDetailFixCandidates = (...args) => runtime.getDetailFixCandidates(...args);
  const getDetailTerminalPresets = (...args) => runtime.getDetailTerminalPresets(...args);
  const getFallbackTestIconText = (...args) => runtime.getFallbackTestIconText(...args);
  const getFixModeElements = (...args) => runtime.getFixModeElements(...args);
  const getFleetParallelism = (...args) => runtime.getFleetParallelism(...args);
  const getOnlineCheckCountdownMs = (...args) => runtime.getOnlineCheckCountdownMs(...args);
  const getPersistedManageTab = (...args) => runtime.getPersistedManageTab(...args);
  const getRobotDefinitionsForType = (...args) => runtime.getRobotDefinitionsForType(...args);
  const getRobotIdsForRun = (...args) => runtime.getRobotIdsForRun(...args);
  const getRobotTypeConfig = (...args) => runtime.getRobotTypeConfig(...args);
  const getSelectedMappingTypeIds = (...args) => runtime.getSelectedMappingTypeIds(...args);
  const getSelectedRecorderTypeIds = (...args) => runtime.getSelectedRecorderTypeIds(...args);
  const getTestIconPresentation = (...args) => runtime.getTestIconPresentation(...args);
  const getTimestamp = (...args) => runtime.getTimestamp(...args);
  const getVisibleOfflineRobotIds = (...args) => runtime.getVisibleOfflineRobotIds(...args);
  const getVisibleOnlineRobotIds = (...args) => runtime.getVisibleOnlineRobotIds(...args);
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
  const isManageViewActive = (...args) => runtime.isManageViewActive(...args);
  const isTopicsMonitorMode = (...args) => runtime.isTopicsMonitorMode(...args);
  const loadDefinitionsSummary = (...args) => runtime.loadDefinitionsSummary(...args);
  const loadFleetRuntimeDelta = (...args) => runtime.loadFleetRuntimeDelta(...args);
  const loadFleetStaticState = (...args) => runtime.loadFleetStaticState(...args);
  const loadMonitorConfig = (...args) => runtime.loadMonitorConfig(...args);
  const loadRobotConfig = (...args) => runtime.loadRobotConfig(...args);
  const loadRobotTypeConfig = (...args) => runtime.loadRobotTypeConfig(...args);
  const loadRobotsFromBackend = (...args) => runtime.loadRobotsFromBackend(...args);
  const mergeRuntimeRobotsIntoList = (...args) => runtime.mergeRuntimeRobotsIntoList(...args);
  const normalizeAutoFixDefinition = (...args) => runtime.normalizeAutoFixDefinition(...args);
  const normalizeBatteryReason = (...args) => runtime.normalizeBatteryReason(...args);
  const normalizeDefinitionsSummary = (...args) => runtime.normalizeDefinitionsSummary(...args);
  const normalizeIdList = (...args) => runtime.normalizeIdList(...args);
  const normalizeManageTab = (...args) => runtime.normalizeManageTab(...args);
  const normalizePossibleResult = (...args) => runtime.normalizePossibleResult(...args);
  const normalizeRobotActivity = (...args) => runtime.normalizeRobotActivity(...args);
  const normalizeRobotTests = (...args) => runtime.normalizeRobotTests(...args);
  const normalizeRobotTypeConfig = (...args) => runtime.normalizeRobotTypeConfig(...args);
  const normalizeRuntimeRobotEntry = (...args) => runtime.normalizeRuntimeRobotEntry(...args);
  const normalizeRuntimeTestUpdate = (...args) => runtime.normalizeRuntimeTestUpdate(...args);
  const normalizeStepDebug = (...args) => runtime.normalizeStepDebug(...args);
  const normalizeTestDebugCollection = (...args) => runtime.normalizeTestDebugCollection(...args);
  const normalizeTestDebugResult = (...args) => runtime.normalizeTestDebugResult(...args);
  const normalizeTestDefinition = (...args) => runtime.normalizeTestDefinition(...args);
  const onFilterChange = (...args) => runtime.onFilterChange(...args);
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
  const readRobotField = (...args) => runtime.readRobotField(...args);
  const refreshRobotsFromBackendSnapshot = (...args) => runtime.refreshRobotsFromBackendSnapshot(...args);
  const refreshRuntimeStateFromBackend = (...args) => runtime.refreshRuntimeStateFromBackend(...args);
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
  const stopCurrentJob = (...args) => runtime.stopCurrentJob?.(...args);
  const renderRobotJobQueueStrip = (...args) => runtime.renderRobotJobQueueStrip?.(...args) || '';
  const renderRobotStopCurrentJobButton = (...args) => runtime.renderRobotStopCurrentJobButton?.(...args) || '';
  const runtimeActivityHasSignal = (...args) => runtime.runtimeActivityHasSignal(...args);
  const saveManageFixDefinition = (...args) => runtime.saveManageFixDefinition(...args);
  const saveManageTestDefinition = (...args) => runtime.saveManageTestDefinition(...args);
  const scheduleMonitorParallelismSync = (...args) => runtime.scheduleMonitorParallelismSync(...args);
  const selectAllOfflineRobots = (...args) => runtime.selectAllOfflineRobots(...args);
  const selectAllOnlineRobots = (...args) => runtime.selectAllOnlineRobots(...args);
  const selectAllRobots = (...args) => runtime.selectAllRobots(...args);
  const setActiveManageTab = (...args) => runtime.setActiveManageTab(...args);
  const setAddRobotMessage = (...args) => runtime.setAddRobotMessage(...args);
  const setAddRobotPasswordVisibility = (...args) => runtime.setAddRobotPasswordVisibility(...args);
  const setBugReportStatus = (...args) => runtime.setBugReportStatus(...args);
  const setFixModeStatus = (...args) => runtime.setFixModeStatus(...args);
  const setFleetOnlineButtonState = (...args) => runtime.setFleetOnlineButtonState(...args);
  const setFleetParallelism = (...args) => runtime.setFleetParallelism(...args);
  const setLocationHash = (...args) => runtime.setLocationHash(...args);
  const setManageEditorStatus = (...args) => runtime.setManageEditorStatus(...args);
  const setManageTabStatus = (...args) => runtime.setManageTabStatus(...args);
  const setModelContainerFaultClasses = (...args) => runtime.setModelContainerFaultClasses(...args);
  const setMonitorConfigStatus = (...args) => runtime.setMonitorConfigStatus(...args);
  const setRecorderTerminalActive = (...args) => runtime.setRecorderTerminalActive(...args);
  const setRobotTypeDefinitions = (...args) => runtime.setRobotTypeDefinitions(...args);
  const setRunningButtonState = (...args) => runtime.setRunningButtonState(...args);
  const setTerminalActive = (...args) => runtime.setTerminalActive(...args);
  const setTerminalInactive = (...args) => runtime.setTerminalInactive(...args);
  const showAddRobotPage = (...args) => runtime.showAddRobotPage(...args);
  const showDashboard = (...args) => runtime.showDashboard(...args);
  const slugifyRecorderValue = (...args) => runtime.slugifyRecorderValue(...args);
  const startRuntimeStateSync = (...args) => runtime.startRuntimeStateSync(...args);
  const stopRuntimeStateSync = (...args) => runtime.stopRuntimeStateSync(...args);
  const submitBugReport = (...args) => runtime.submitBugReport(...args);
  const syncFixModePanels = (...args) => runtime.syncFixModePanels(...args);
  const syncFixModeToggleButton = (...args) => runtime.syncFixModeToggleButton(...args);
  const syncFleetParallelismUi = (...args) => runtime.syncFleetParallelismUi(...args);
  const syncModalScrollLock = (...args) => runtime.syncModalScrollLock(...args);
  const syncMonitorConfigUi = (...args) => runtime.syncMonitorConfigUi(...args);
  const syncMonitorParallelismWithFleet = (...args) => runtime.syncMonitorParallelismWithFleet(...args);
  const syncRecorderReadKindFields = (...args) => runtime.syncRecorderReadKindFields(...args);
  const syncRecorderReadPopoverVisibility = (...args) => runtime.syncRecorderReadPopoverVisibility(...args);
  const syncRecorderUiState = (...args) => runtime.syncRecorderUiState(...args);
  const syncSectionToggleButtons = (...args) => runtime.syncSectionToggleButtons(...args);
  const toggleFixMode = (...args) => runtime.toggleFixMode(...args);
  const updateCardRuntimeContent = (...args) => runtime.updateCardRuntimeContent(...args);
  const updateFixMappings = (...args) => runtime.updateFixMappings(...args);
  const updateFleetOnlineSummary = (...args) => runtime.updateFleetOnlineSummary(...args);
  const updateOnlineCheckEstimateFromResults = (...args) => runtime.updateOnlineCheckEstimateFromResults(...args);
  const updateRobotTestState = (...args) => runtime.updateRobotTestState(...args);
  const updateTestMappings = (...args) => runtime.updateTestMappings(...args);

  function normalizeBatteryPercentForSort(rawValue) {
        const text = normalizeText(rawValue, '');
        if (!text) return Number.POSITIVE_INFINITY;
        const explicitPercent = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
        if (explicitPercent) {
          const parsed = Number.parseFloat(explicitPercent[1]);
          return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
        }
        const numeric = Number.parseFloat(text);
        return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
      }

  function getRobotBatteryState(robot) {
        if (robot?.battery && typeof robot.battery === 'object') {
          return robot.battery;
        }
        return robot?.tests?.battery && typeof robot.tests.battery === 'object' ? robot.tests.battery : {};
      }

  function nonBatteryTestEntries(robot) {
        return Object.entries(robot?.tests || {}).filter(([testId]) => normalizeText(testId, '').toLowerCase() !== 'battery');
      }

  function normalizeTagList(raw) {
        const list = Array.isArray(raw) ? raw : [];
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

  function normalizeOwnerTags(raw) {
        const tags = normalizeTagList(raw);
        return tags.length ? tags : ['global'];
      }

  function normalizePlatformTags(raw) {
        return normalizeTagList(raw);
      }

  function getActiveOwnerProfile() {
        return normalizeText(state?.filter?.activeOwnerProfile, '').toLowerCase();
      }

  function getTestDefinitionForRobot(robot, testId) {
        const normalizedId = normalizeText(testId, '');
        const definitions = Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [];
        return definitions.find((definition) => normalizeText(definition?.id, '') === normalizedId) || null;
      }

  function getDefinitionTagMeta(definition = {}, fallback = {}) {
        return {
          ownerTags: normalizeOwnerTags(definition?.ownerTags ?? fallback?.ownerTags),
          platformTags: normalizePlatformTags(definition?.platformTags ?? fallback?.platformTags),
        };
      }

  function hasTagIntersection(candidateTags, selectedTags) {
        if (!Array.isArray(selectedTags) || !selectedTags.length) return true;
        const set = new Set(normalizeTagList(candidateTags));
        return selectedTags.some((tag) => set.has(normalizeText(tag, '').toLowerCase()));
      }

  function matchesDefinitionFilters(definition = {}, fallback = {}) {
        const { ownerTags, platformTags } = getDefinitionTagMeta(definition, fallback);
        const selectedOwnerTags = normalizeTagList(state?.filter?.ownerTags);
        const selectedPlatformTags = normalizeTagList(state?.filter?.platformTags);
        const activeOwnerProfile = getActiveOwnerProfile();
        const effectiveOwnerSelection = selectedOwnerTags.length
          ? selectedOwnerTags
          : (activeOwnerProfile ? [activeOwnerProfile] : ['global']);
        const ownerSelection = Array.from(new Set([...effectiveOwnerSelection, 'global']));
        const matchesOwner = hasTagIntersection(ownerTags, ownerSelection);
        const matchesPlatform = hasTagIntersection(platformTags, selectedPlatformTags);
        return matchesOwner && matchesPlatform;
      }

  function isUnknownResult(testResult) {
        const source = normalizeText(testResult?.source, '');
        const checkedAt = Number(testResult?.checkedAt);
        const hasTimestamp = Number.isFinite(checkedAt) && checkedAt > 0;
        const value = normalizeText(testResult?.value, '').toLowerCase();
        const details = normalizeText(testResult?.details, '').toLowerCase();
        const isDefaultDetail =
          !details
          || details === 'not checked yet'
          || details === 'awaiting check result'
          || details === 'backend populated test';
        if (!value) return true;
        if (value === 'unknown' && (isDefaultDetail || (!hasTimestamp && !source))) return true;
        if (isDefaultDetail && (!hasTimestamp || !source)) return true;
        return false;
      }

  function getScopedTestEntries(robot, options = {}) {
        const scope = normalizeText(options.scope, 'all');
        const activeOwner = normalizeText(options.activeOwner, getActiveOwnerProfile()).toLowerCase();
        const entries = nonBatteryTestEntries(robot).map(([testId, testResult]) => {
          const definition = getTestDefinitionForRobot(robot, testId);
          const tags = getDefinitionTagMeta(definition, testResult);
          return {
            id: normalizeText(testId, ''),
            result: testResult && typeof testResult === 'object' ? testResult : {},
            definition,
            ownerTags: tags.ownerTags,
            platformTags: tags.platformTags,
          };
        });

        return entries.filter((entry) => {
          if (scope === 'global' && !entry.ownerTags.includes('global')) return false;
          if (scope === 'active-user') {
            if (!activeOwner) return false;
            if (!entry.ownerTags.includes(activeOwner)) return false;
          }
          return matchesDefinitionFilters(
            {
              ownerTags: entry.ownerTags,
              platformTags: entry.platformTags,
            },
            entry.result,
          );
        });
      }

  function computeAggregateState(entries) {
        const scopedEntries = Array.isArray(entries) ? entries : [];
        if (!scopedEntries.length) {
          return {
            state: 'unknown',
            hasChecks: false,
            passCount: 0,
            failCount: 0,
            unknownCount: 0,
          };
        }

        const passCount = scopedEntries.reduce(
          (total, entry) => (normalizeStatus(entry?.result?.status) === 'ok' ? total + 1 : total),
          0,
        );
        const failCount = scopedEntries.length - passCount;
        const unknownCount = scopedEntries.reduce(
          (total, entry) => (isUnknownResult(entry?.result) ? total + 1 : total),
          0,
        );
        if (unknownCount > 0) {
          return {
            state: 'unknown',
            hasChecks: true,
            passCount,
            failCount,
            unknownCount,
          };
        }
        if (passCount === 0 && failCount > 0) {
          return {
            state: 'critical',
            hasChecks: true,
            passCount,
            failCount,
            unknownCount,
          };
        }
        if (passCount > 0 && failCount > 0) {
          return {
            state: 'warning',
            hasChecks: true,
            passCount,
            failCount,
            unknownCount,
          };
        }
        return {
          state: 'ok',
          hasChecks: true,
          passCount,
          failCount,
          unknownCount,
        };
      }

  function getRobotAggregate(robot, options = {}) {
        const scopedEntries = getScopedTestEntries(robot, options);
        const aggregate = computeAggregateState(scopedEntries);
        return {
          ...aggregate,
          entries: scopedEntries,
        };
      }

  function getGlobalAggregate(robot) {
        return getRobotAggregate(robot, { scope: 'global' });
      }

  function getActiveUserAggregate(robot) {
        const activeOwner = getActiveOwnerProfile();
        const aggregate = getRobotAggregate(robot, {
          scope: 'active-user',
          activeOwner,
        });
        return {
          ...aggregate,
          activeOwner,
          hasChecks: aggregate.hasChecks && !!activeOwner,
        };
      }

  function statusFromScore(robot) {
        return getGlobalAggregate(robot).state;
      }

  function statusSortRank(robot) {
        const status = statusFromScore(robot);
        if (status === 'critical') return 0;
        if (status === 'warning') return 1;
        if (status === 'unknown') return 2;
        return 3;
      }

  function onlineRobotComparator(a, b) {
        const mode = normalizeText(state.onlineSortMode, ONLINE_SORT_BATTERY);
        if (mode === ONLINE_SORT_NAME) {
          return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
        }
        if (mode === ONLINE_SORT_STATUS) {
          const byStatus = statusSortRank(a) - statusSortRank(b);
          if (byStatus !== 0) return byStatus;
          return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
        }
        const aBattery = normalizeBatteryPercentForSort(getRobotBatteryState(a)?.value);
        const bBattery = normalizeBatteryPercentForSort(getRobotBatteryState(b)?.value);
        if (aBattery !== bBattery) return aBattery - bBattery;
        return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
      }

  function sortOnlineRobots(robots) {
        const list = Array.isArray(robots) ? [...robots] : [];
        list.sort(onlineRobotComparator);
        return list;
      }

  function syncOnlineSortButton() {
        if (!cycleOnlineSortButton) return;
        const mode = ONLINE_SORT_ORDER.includes(state.onlineSortMode) ? state.onlineSortMode : ONLINE_SORT_BATTERY;
        cycleOnlineSortButton.textContent = `Sort robots: ${ONLINE_SORT_LABELS[mode] || ONLINE_SORT_LABELS[ONLINE_SORT_BATTERY]}`;
      }

  function cycleOnlineSortMode() {
        const currentIndex = ONLINE_SORT_ORDER.indexOf(state.onlineSortMode);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ONLINE_SORT_ORDER.length : 0;
        state.onlineSortMode = ONLINE_SORT_ORDER[nextIndex];
        syncOnlineSortButton();
        renderDashboard();
      }

  function normalizeRobotModelBaseUrl(candidate) {
        if (typeof candidate === 'string' && candidate.trim()) {
          const clean = candidate.trim().replace(/^\.\//, '');
          const hasModelExtension = /\.(gltf|glb)(?:\?|#|$)/i.test(clean);
          if (hasModelExtension) {
            return clean;
          }
        }
        return DEFAULT_ROBOT_MODEL_URL;
      }

  function normalizeModelConfig(model) {
        if (!model || typeof model !== 'object') return null;
        const file_name = normalizeText(model.file_name, '').replace(/^\.?\//, '');
        const path_to_quality_folders = normalizeText(model.path_to_quality_folders, '')
          .replace(/^\.?\//, '')
          .replace(/\/+$/, '');
        const asset_version = normalizeText(model.asset_version, '');
        const availableQualitiesRaw = Array.isArray(model.available_qualities)
          ? model.available_qualities
          : Array.isArray(model.availableQualities)
            ? model.availableQualities
            : null;
        const available_qualities = Array.isArray(availableQualitiesRaw)
          ? availableQualitiesRaw
              .map((quality) => normalizeText(quality, '').toLowerCase())
              .filter(
                (quality, index, list) =>
                  (quality === MODEL_RESOLUTION_LOW || quality === MODEL_RESOLUTION_HIGH)
                  && list.indexOf(quality) === index,
              )
          : null;
        if (!file_name && !path_to_quality_folders) return null;
        return {
          file_name,
          path_to_quality_folders,
          ...(asset_version ? { asset_version } : {}),
          ...(available_qualities !== null ? { available_qualities } : {}),
        };
      }

  function appendModelVersionQuery(baseUrl, assetVersion) {
        const normalizedBaseUrl = normalizeRobotModelBaseUrl(baseUrl);
        const version = normalizeText(assetVersion, '');
        if (!normalizedBaseUrl || !version) return normalizedBaseUrl;
        const separator = normalizedBaseUrl.includes('?') ? '&' : '?';
        return `${normalizedBaseUrl}${separator}mv=${encodeURIComponent(version)}`;
      }

  function modelSupportsQuality(model, preferredResolution) {
        if (!model) return false;
        if (!Array.isArray(model.available_qualities)) return true;
        return model.available_qualities.includes(preferredResolution);
      }

  function pickModelConfigForQuality(robotModel, typeModel, preferredResolution) {
        if (modelSupportsQuality(robotModel, preferredResolution)) return robotModel;
        if (modelSupportsQuality(typeModel, preferredResolution)) return typeModel;
        return robotModel || typeModel || null;
      }

  function resolveRobotBaseModelUrl(robot, typeConfig, preferredResolution = MODEL_RESOLUTION_LOW) {
        const robotModel = normalizeModelConfig(robot?.model);
        const typeModel = normalizeModelConfig(typeConfig?.model);
        const effectiveModel = pickModelConfigForQuality(robotModel, typeModel, preferredResolution);
        const fileName = normalizeText(effectiveModel?.file_name, '');
        if (!fileName) return DEFAULT_ROBOT_MODEL_URL;
        const basePath =
          normalizeText(effectiveModel?.path_to_quality_folders, '') ||
          DEFAULT_MODEL_QUALITY_BASE_PATH;
        return appendModelVersionQuery(`${basePath}/${fileName}`, effectiveModel?.asset_version);
      }

  function resolveRobotModelUrl(candidate, preferredResolution = MODEL_RESOLUTION_LOW) {
        const baseUrl = normalizeRobotModelBaseUrl(candidate);
        return modelAssetResolver.getInitialModelUrl(baseUrl, preferredResolution);
      }

      function normalizeRobotData(raw) {
        const entries = Array.isArray(raw) ? raw : [];
        return entries.map((bot) => {
          const botType = bot?.type || 'unknown';
          const typeConfig = getRobotTypeConfig(botType);
          const { tests, definitions } = normalizeRobotTests(bot?.tests, botType);
          const modelUrl = resolveRobotBaseModelUrl(bot, typeConfig, MODEL_RESOLUTION_LOW);
          const robotModel = normalizeModelConfig(bot?.model);
          const activity = normalizeRobotActivity(bot?.activity);
          const battery =
            bot?.battery && typeof bot.battery === 'object'
              ? { ...bot.battery }
              : bot?.tests?.battery && typeof bot.tests.battery === 'object'
                ? { ...bot.tests.battery }
                : null;
          return {
            id: bot?.id || `robot-${Math.random().toString(16).slice(2, 7)}`,
            name: normalizeText(bot?.name, `robot-${Math.random().toString(16).slice(2, 7)}`),
            type: typeConfig?.label || botType || 'Unknown Type',
            typeId: botType,
            ip: normalizeText(bot?.ip, ''),
            username: normalizeText(readRobotField(bot, 'username'), ''),
            password: normalizeText(readRobotField(bot, 'password'), ''),
            modelUrl,
            model: robotModel,
            tests,
            battery,
            testDefinitions: definitions,
            topics: typeConfig?.topics || [],
            autoFixes: typeConfig?.autoFixes || [],
            activity,
            testDebug: normalizeTestDebugCollection(bot?.testDebug),
          };
        });
      }

  function rebuildRobotIndex() {
        const index = new Map();
        state.robots.forEach((robot) => {
          const id = robotId(robot);
          if (!id) return;
          index.set(id, robot);
        });
        state.robotsById = index;
      }

  function setRobots(nextRobots) {
        state.robots = Array.isArray(nextRobots) ? nextRobots : [];
        rebuildRobotIndex();
      }

  function mapRobots(mapper) {
        if (typeof mapper !== 'function') return;
        setRobots(state.robots.map(mapper));
      }

  function robotId(robotOrId) {
        if (typeof robotOrId === 'string' || typeof robotOrId === 'number') {
          return normalizeText(robotOrId, '');
        }
        return normalizeText(robotOrId?.id, '');
      }

  function getRobotById(robotIdValue) {
        const normalized = normalizeText(robotIdValue, '');
        return state.robotsById.get(normalized) || null;
      }

  function getSelectedRobotIds() {
        return state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot))).map((robot) => robotId(robot));
      }

  function getReachableRobotIds() {
        return state.robots
          .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
          .map((robot) => robotId(robot));
      }

  function isRobotSelected(robotIdValue) {
        return state.selectedRobotIds.has(robotId(robotIdValue));
      }

  function isRobotTesting(robotIdValue) {
        const normalizedId = robotId(robotIdValue);
        return state.testingRobotIds.has(normalizedId) || state.autoTestingRobotIds.has(normalizedId);
      }

  function isRobotSearching(robotIdValue) {
        const normalizedId = robotId(robotIdValue);
        return state.searchingRobotIds.has(normalizedId) || state.autoSearchingRobotIds.has(normalizedId);
      }

  function isRobotFixing(robotIdValue) {
        return state.fixingRobotIds.has(robotId(robotIdValue));
      }

  function isRobotBusyForOnlineRefresh(robotIdValue) {
        return isRobotSearching(robotIdValue) || isRobotTesting(robotIdValue) || isRobotFixing(robotIdValue);
      }

  function isRobotAutoSearching(robotIdValue) {
        return state.autoSearchingRobotIds.has(robotId(robotIdValue));
      }

  function setRobotTesting(robotIdValue, isTesting, countdownMs = null) {
        const id = robotId(robotIdValue);
        if (!id) return;
        if (isTesting) {
          state.testingRobotIds.add(id);
          const safeCountdownMs = normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS);
          state.testingCountdowns.set(id, {
            mode: 'scanning',
            expiresAt: Date.now() + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
          startTestingCountdowns();
        } else {
          state.testingRobotIds.delete(id);
          state.testingCountdowns.delete(id);
          if (!state.testingCountdowns.size) {
            stopTestingCountdowns();
          }
        }
        renderDashboard();
        const isDetailActive = detail.classList.contains('active');
        if (!isDetailActive) return;
        if (state.detailRobotId === id) {
          const activeRobot = state.robots.find((item) => robotId(item) === id);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
        }
      }

  function setRobotSearching(robotIdValue, isSearching, countdownMs = null) {
        const id = robotId(robotIdValue);
        if (!id) return;
        if (isSearching) {
          state.searchingRobotIds.add(id);
          const safeCountdownMs = normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS);
          state.testingCountdowns.set(id, {
            mode: 'finding',
            expiresAt: Date.now() + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
          startTestingCountdowns();
        } else {
          state.searchingRobotIds.delete(id);
          state.testingCountdowns.delete(id);
          if (!state.testingCountdowns.size) {
            stopTestingCountdowns();
          }
        }
        renderDashboard();
        const isDetailActive = detail.classList.contains('active');
        if (!isDetailActive) return;
        if (state.detailRobotId === id) {
          const activeRobot = state.robots.find((item) => robotId(item) === id);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
        }
      }

  function setRobotFixing(robotIdValue, isFixing, countdownMs = null) {
        const id = robotId(robotIdValue);
        if (!id) return;
        if (isFixing) {
          state.fixingRobotIds.add(id);
          const safeCountdownMs = normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS * 2);
          state.testingCountdowns.set(id, {
            mode: 'fixing',
            expiresAt: Date.now() + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
          startTestingCountdowns();
        } else {
          state.fixingRobotIds.delete(id);
          state.testingCountdowns.delete(id);
          if (!state.testingCountdowns.size) {
            stopTestingCountdowns();
          }
        }
        renderDashboard();
        const isDetailActive = detail.classList.contains('active');
        if (!isDetailActive) return;
        if (state.detailRobotId === id) {
          const activeRobot = state.robots.find((item) => robotId(item) === id);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
        }
      }

  function estimateTestCountdownMsFromBody(body) {
        const rawCount = Array.isArray(body?.testIds) ? body.testIds.length : 1;
        const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
        return Math.max(
          TEST_COUNTDOWN_MIN_SECONDS * 1000,
          Math.min(count * TEST_STEP_TIMEOUT_MS, TEST_COUNTDOWN_MAX_SECONDS * 1000),
        );
      }

  function normalizeCountdownMs(countdownMs, fallbackMs) {
        const safeDefault = Number.isFinite(fallbackMs) && fallbackMs > 0 ? fallbackMs : TEST_STEP_TIMEOUT_MS;
        const normalizedRaw =
          Number.isFinite(countdownMs) && countdownMs > 0 ? countdownMs : safeDefault;
        return Math.max(
          TEST_COUNTDOWN_MIN_SECONDS * 1000,
          Math.min(normalizedRaw, TEST_COUNTDOWN_MAX_SECONDS * 1000),
        );
      }

  function getCountdownLabel(mode) {
        return TEST_COUNTDOWN_MODE_LABELS[mode] || TEST_COUNTDOWN_MODE_LABELS.scanning;
      }

  function getTestingCountdownText(robotIdValue) {
        const id = robotId(robotIdValue);
        if (!id) return '';
        const countdown = state.testingCountdowns.get(id);
        if (!countdown) {
          if (state.fixingRobotIds.has(id)) return 'Fixing...';
          if (state.autoSearchingRobotIds.has(id)) return 'Finding...';
          if (state.autoTestingRobotIds.has(id)) return 'Scanning...';
          return '';
        }
        return `${getCountdownLabel(countdown.mode)} ${Math.max(0, Math.ceil((countdown.expiresAt - Date.now()) / 1000))}s`;
      }

  function shouldUseCompactAutoSearchIndicator(robotIdValue, isOffline, isSearching = false) {
        const searching = Boolean(isSearching || isRobotSearching(robotIdValue));
        return searching && !isOffline;
      }

  function buildScanOverlayMarkup({ isSearching, isTesting, isFixing = false, compactAutoSearch = false } = {}) {
        if (isFixing) {
          return '<div class="scanning-overlay fixing-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/repairing.webm" type="video/webm" /></video></div>';
        }
        if (isSearching && !compactAutoSearch) {
          return '<div class="scanning-overlay finding-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/finding.webm" type="video/webm" /></video></div>';
        }
        if (isTesting) {
          return '<div class="scanning-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/scanning.webm" type="video/webm" /></video></div>';
        }
        return '';
      }

  function buildConnectionCornerIconMarkup(isOffline, isCheckingOnline = false) {
        if (isOffline) {
          return '<img class="offline-corner-icon" data-role="connection-corner-icon" src="assets/Icons/no-connection.png" alt="No connection" />';
        }
        const cornerClasses = ['connected-corner-icon', isCheckingOnline ? 'blinking' : '']
          .filter(Boolean)
          .join(' ');
        const alt = isCheckingOnline ? 'Checking online' : 'Connected';
        return `<img class="${cornerClasses}" data-role="connection-corner-icon" src="assets/Icons/connected.png" alt="${alt}" />`;
      }

  function shouldEnableModelAutoRotate() {
        try {
          if (window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
          if (window?.matchMedia?.('(max-width: 900px)')?.matches) return false;
          if (navigator?.connection?.saveData) return false;
        } catch (_error) {
          // Fall through to default behavior.
        }
        return true;
      }

  async function ensureModelViewerRuntime() {
        if (!CAN_USE_MODEL_VIEWER) return false;
        if (!modelViewerRuntimePromise) {
          modelViewerRuntimePromise = import('@google/model-viewer')
            .then(() => true)
            .catch(() => false);
        }
        return modelViewerRuntimePromise;
      }

  async function hydrateLazyModelViewer(modelViewer) {
        if (!modelViewer || modelViewer.dataset.lazyHydrating === '1') return;
        const resolvedLazySrc = normalizeText(modelViewer.dataset.lazySrc, '');
        if (!resolvedLazySrc && !normalizeText(modelViewer.getAttribute('src'), '')) return;
        modelViewer.dataset.lazyHydrating = '1';
        const runtimeReady = await ensureModelViewerRuntime();
        if (!runtimeReady || !modelViewer.isConnected) {
          modelViewer.dataset.lazyHydrating = '';
          return;
        }
        if (!normalizeText(modelViewer.getAttribute('src'), '') && resolvedLazySrc) {
          modelViewer.setAttribute('src', resolvedLazySrc);
        }
        const baseModelUrl = normalizeText(modelViewer.dataset.modelResolutionBaseUrl, resolvedLazySrc);
        const preferredResolution = normalizeText(
          modelViewer.dataset.modelResolutionQuality,
          MODEL_RESOLUTION_LOW,
        );
        modelAssetResolver.bindModelViewerSource(modelViewer, baseModelUrl, preferredResolution);
        const modelContainer = modelViewer.closest('[data-role="robot-model-container"]');
        const isOffline = Boolean(modelContainer?.classList?.contains('offline'));
        if (isOffline || !shouldEnableModelAutoRotate()) {
          modelViewer.removeAttribute('auto-rotate');
          modelViewer.removeAttribute('auto-rotate-delay');
          modelViewer.removeAttribute('rotation-per-second');
        } else {
          modelViewer.setAttribute('auto-rotate', '');
          modelViewer.setAttribute('auto-rotate-delay', '0');
          modelViewer.setAttribute('rotation-per-second', '20deg');
        }
        modelViewer.dataset.lazyLoaded = '1';
        modelViewer.dataset.lazyHydrating = '';
        const placeholder = modelViewer.parentElement?.querySelector?.('[data-role="robot-model-placeholder"]');
        if (placeholder) {
          placeholder.classList.add('hidden');
        }
      }

  function registerLazyModelViewersInNode(node) {
        if (!node) return;
        const modelViewers = Array.from(node.querySelectorAll?.('model-viewer[data-lazy-src]') || []);
        modelViewers.forEach((modelViewer) => {
          if (modelViewer.dataset.lazyObserved === '1') {
            return;
          }
          modelViewer.dataset.lazyObserved = '1';
          if (lazyModelViewerObserver) {
            lazyModelViewerObserver.observe(modelViewer);
          } else {
            hydrateLazyModelViewer(modelViewer).catch(() => {});
          }
        });
      }

  function syncModelViewerRotationForContainer(container, isOffline) {
        if (!container) return;
        const modelViewer = container.querySelector('model-viewer');
        if (!modelViewer) return;
        if (!normalizeText(modelViewer.getAttribute('src'), '')) {
          registerLazyModelViewersInNode(container);
          return;
        }
        const baseModelUrl = normalizeText(
          modelViewer.dataset.modelResolutionBaseUrl,
          modelViewer.getAttribute('src'),
        );
        const preferredResolution = normalizeText(
          modelViewer.dataset.modelResolutionQuality,
          MODEL_RESOLUTION_LOW,
        );
        modelAssetResolver.bindModelViewerSource(modelViewer, baseModelUrl, preferredResolution);
        if (isOffline || !shouldEnableModelAutoRotate()) {
          modelViewer.removeAttribute('auto-rotate');
          modelViewer.removeAttribute('auto-rotate-delay');
          modelViewer.removeAttribute('rotation-per-second');
          return;
        }
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.setAttribute('auto-rotate-delay', '0');
        modelViewer.setAttribute('rotation-per-second', '20deg');
      }

  function formatDurationMs(ms) {
        const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
          return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
        }
        return `${seconds}s`;
      }

  function bindLargeFleetWindowListeners() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (largeFleetWindowListenersBound) return;
        largeFleetWindowListenersBound = true;
        window.addEventListener(
          'scroll',
          () => {
            maybeExpandLargeFleetWindow();
          },
          { passive: true },
        );
        window.addEventListener(
          'resize',
          () => {
            maybeExpandLargeFleetWindow();
          },
          { passive: true },
        );
      }

  function resetLargeFleetWindowLimits() {
        onlineRenderLimit = Number.POSITIVE_INFINITY;
        offlineRenderLimit = Number.POSITIVE_INFINITY;
        largeFleetWindowingEnabled = false;
      }

  function ensureLargeFleetWindowLimits(totalVisibleCount) {
        if (totalVisibleCount > LARGE_FLEET_WINDOW_THRESHOLD) {
          if (!largeFleetWindowingEnabled) {
            largeFleetWindowingEnabled = true;
            onlineRenderLimit = LARGE_FLEET_WINDOW_INITIAL;
            offlineRenderLimit = LARGE_FLEET_WINDOW_INITIAL;
          }
          return;
        }
        resetLargeFleetWindowLimits();
      }

  function maybeExpandLargeFleetWindow() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (!largeFleetWindowingEnabled) return;
        const nearPageBottom =
          window.innerHeight + window.scrollY >= Math.max(0, document.documentElement.scrollHeight - 680);
        if (!nearPageBottom) return;
        const nextOnlineLimit = Math.min(latestOnlineCount, onlineRenderLimit + LARGE_FLEET_WINDOW_STEP);
        const nextOfflineLimit = Math.min(latestOfflineCount, offlineRenderLimit + LARGE_FLEET_WINDOW_STEP);
        if (nextOnlineLimit === onlineRenderLimit && nextOfflineLimit === offlineRenderLimit) return;
        onlineRenderLimit = nextOnlineLimit;
        offlineRenderLimit = nextOfflineLimit;
        renderDashboard();
      }

  function applyLargeFleetWindow(list, kind) {
        if (!largeFleetWindowingEnabled) return list;
        const safeList = Array.isArray(list) ? list : [];
        const limit = kind === 'online' ? onlineRenderLimit : offlineRenderLimit;
        return safeList.slice(0, Math.max(0, limit));
      }

  function getMonitorOnlineIntervalMs() {
        return Math.max(
          MONITOR_ONLINE_INTERVAL_MIN_SEC * 1000,
          Math.floor(clampMonitorOnlineInterval(state.monitorOnlineIntervalSec) * 1000),
        );
      }

  function getMonitorBatteryIntervalMs() {
        return Math.max(
          MONITOR_BATTERY_INTERVAL_MIN_SEC * 1000,
          Math.floor(clampMonitorBatteryInterval(state.monitorBatteryIntervalSec) * 1000),
        );
      }

  function getMonitorTopicsIntervalMs() {
        return Math.max(
          MONITOR_TOPICS_INTERVAL_MIN_SEC * 1000,
          Math.floor(clampMonitorTopicsInterval(state.monitorTopicsIntervalSec) * 1000),
        );
      }

  function normalizeCheckedAtMs(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        if (numeric > 1e12) return Math.floor(numeric);
        return Math.floor(numeric * 1000);
      }

  function formatLastFullTestTimestamp(timestampMs) {
        const date = new Date(timestampMs);
        if (!Number.isFinite(date.getTime())) return '--';
        const now = new Date();
        const sameDay = date.toDateString() === now.toDateString();
        const timeLabel = date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        if (sameDay) return timeLabel;
        const dateLabel = date.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        return `${dateLabel} ${timeLabel}`;
      }

  function buildLastFullTestPillLabel(robot, compact = false) {
        const timestampMs = normalizeCheckedAtMs(robot?.activity?.lastFullTestAt);
        const prefix = compact ? 'Full test' : 'Last full test';
        if (!timestampMs) return `${prefix}: --`;
        return `${prefix}: ${formatLastFullTestTimestamp(timestampMs)}`;
      }

  function syncAutoMonitorRefreshState() {
        const summary = {
          hasData: false,
          online: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
          battery: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
          topics: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        };
        const includeTopics = isTopicsMonitorMode(state.monitorMode);
  
        state.robots.forEach((robot) => {
          const tests = robot?.tests || {};
          const onlineTest = tests.online;
          if (
            normalizeText(onlineTest?.source, '') === MONITOR_SOURCE &&
            onlineTest?.checkedAt !== undefined
          ) {
            const timestampMs = normalizeCheckedAtMs(onlineTest.checkedAt);
            if (timestampMs > 0) {
              summary.hasData = true;
              summary.online.checkedRobotCount += 1;
              summary.online.lastCheckedAtMs = Math.max(summary.online.lastCheckedAtMs, timestampMs);
            }
          }
  
          const batteryTest = getRobotBatteryState(robot);
          if (
            normalizeText(batteryTest?.source, '') === MONITOR_SOURCE &&
            batteryTest?.checkedAt !== undefined
          ) {
            const timestampMs = normalizeCheckedAtMs(batteryTest.checkedAt);
            if (timestampMs > 0) {
              summary.hasData = true;
              summary.battery.checkedRobotCount += 1;
              summary.battery.lastCheckedAtMs = Math.max(summary.battery.lastCheckedAtMs, timestampMs);
            }
          }
  
          if (!includeTopics) return;
          let topicsSeenForRobot = false;
          Object.entries(tests).forEach(([testId, result]) => {
            if (testId === 'online' || testId === 'battery') return;
            if (normalizeText(result?.source, '') !== MONITOR_TOPICS_SOURCE) return;
            if (result?.checkedAt === undefined) return;
            const timestampMs = normalizeCheckedAtMs(result.checkedAt);
            if (timestampMs <= 0) return;
            summary.hasData = true;
            summary.topics.lastCheckedAtMs = Math.max(summary.topics.lastCheckedAtMs, timestampMs);
            topicsSeenForRobot = true;
          });
          if (topicsSeenForRobot) {
            summary.topics.checkedRobotCount += 1;
          }
        });
  
        state.autoMonitorRefreshSummary = summary;
      }

  function stopOnlineRefreshStatusTimer() {
        if (!state.onlineRefreshStatusTimer) return;
        window.clearInterval(state.onlineRefreshStatusTimer);
        state.onlineRefreshStatusTimer = null;
      }

  function setFleetOnlineButtonIdleLabel(label, title = '') {
        const runAllButton = $('#runFleetOnline');
        if (!runAllButton) return;
        runAllButton.dataset.idleLabel = label;
        if (!state.isOnlineRefreshInFlight) {
          runAllButton.textContent = label;
        }
        if (title) {
          runAllButton.title = title;
        }
      }

  function updateFleetOnlineRefreshStatus() {
        const runAllButton = $('#runFleetOnline');
        if (!runAllButton) return;
        const autoSummary = state.autoMonitorRefreshSummary || {};
        const now = Date.now();
        const includeTopics = isTopicsMonitorMode(state.monitorMode);
        const onlineNextCandidates = [];
        const topicsNextCandidates = [];
  
        if (autoSummary.online?.lastCheckedAtMs) {
          onlineNextCandidates.push(
            Math.max(0, autoSummary.online.lastCheckedAtMs + getMonitorOnlineIntervalMs() - now),
          );
        }
        if (autoSummary.battery?.lastCheckedAtMs) {
          onlineNextCandidates.push(
            Math.max(0, autoSummary.battery.lastCheckedAtMs + getMonitorBatteryIntervalMs() - now),
          );
        }
        if (includeTopics && autoSummary.topics?.lastCheckedAtMs) {
          topicsNextCandidates.push(
            Math.max(0, autoSummary.topics.lastCheckedAtMs + getMonitorTopicsIntervalMs() - now),
          );
        }
  
        if (!onlineNextCandidates.length && state.onlineRefreshNextAt > 0) {
          onlineNextCandidates.push(Math.max(0, state.onlineRefreshNextAt - now));
        }
  
        const nextOnlineInMs = onlineNextCandidates.length ? Math.min(...onlineNextCandidates) : null;
        const nextTopicsInMs = topicsNextCandidates.length ? Math.min(...topicsNextCandidates) : null;
        const nextCountdownCandidates = [];
        if (nextOnlineInMs !== null) nextCountdownCandidates.push(nextOnlineInMs);
        if (nextTopicsInMs !== null) nextCountdownCandidates.push(nextTopicsInMs);
        const nextRefreshInMs = nextCountdownCandidates.length ? Math.min(...nextCountdownCandidates) : null;
        const nextCountdownLabel = nextRefreshInMs === null ? '--' : formatDurationMs(nextRefreshInMs);
  
        if (!includeTopics) {
          const onlineTitle =
            nextOnlineInMs === null
              ? 'Refresh online state. Next refresh unavailable.'
              : `Refresh online state. Next refresh in ${formatDurationMs(nextOnlineInMs)}.`;
          setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, onlineTitle);
          return;
        }
  
        const onlineLabel =
          nextOnlineInMs === null ? 'online/battery: --' : `online/battery: ${formatDurationMs(nextOnlineInMs)}`;
        const topicsLabel = nextTopicsInMs === null ? 'topics: --' : `topics: ${formatDurationMs(nextTopicsInMs)}`;
        const title = `Refresh online state. Next ${onlineLabel}, ${topicsLabel}.`;
        setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, title);
      }

  function startOnlineRefreshStatusTimer() {
        if (state.onlineRefreshStatusTimer) return;
        state.onlineRefreshStatusTimer = window.setInterval(updateFleetOnlineRefreshStatus, TEST_COUNTDOWN_TICK_MS);
        updateFleetOnlineRefreshStatus();
      }

  function invalidateCountdownNodeCache() {
        state.countdownNodeCache = null;
      }

  function getCountdownNodes() {
        if (
          !Array.isArray(state.countdownNodeCache) ||
          state.countdownNodeCache.some((node) => !node?.isConnected)
        ) {
          state.countdownNodeCache = Array.from(document.querySelectorAll('.scan-countdown'));
        }
        return state.countdownNodeCache;
      }

  function refreshTestingCountdowns() {
        const now = Date.now();
        const nodes = getCountdownNodes();
        let hasActive = false;
        nodes.forEach((node) => {
          const id = normalizeText(node.getAttribute('data-robot-id'), '');
          if (!id) return;
          const countdown = state.testingCountdowns.get(id);
          if (!countdown) return;
          const remaining = countdown.expiresAt - now;
          const mode = countdown.mode || 'scanning';
          if (remaining <= 0) {
            node.textContent = TEST_COUNTDOWN_WARNING_TEXT[mode] || TEST_COUNTDOWN_WARNING_TEXT.scanning;
            node.classList.add('countdown-warning');
          } else {
            node.textContent = `${getCountdownLabel(mode)} ${Math.max(0, Math.ceil(remaining / 1000))}s`;
            node.classList.remove('countdown-warning');
          }
          hasActive = true;
        });
        if (!hasActive && state.testingCountdowns.size === 0) {
          stopTestingCountdowns();
        }
      }

  function startTestingCountdowns() {
        if (state.testingCountdownTimer) return;
        state.testingCountdownTimer = window.setInterval(refreshTestingCountdowns, TEST_COUNTDOWN_TICK_MS);
        refreshTestingCountdowns();
      }

  function stopTestingCountdowns() {
        if (!state.testingCountdownTimer) return;
        window.clearInterval(state.testingCountdownTimer);
        state.testingCountdownTimer = null;
      }

  function setRobotSearchingBulk(robotIds, isSearching, countdownMs = null) {
        const ids = (Array.isArray(robotIds) ? robotIds : []).map((id) => robotId(id)).filter(Boolean);
        if (!ids.length) return;
        const safeCountdownMs = normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS);
  
        ids.forEach((id) => {
          if (isSearching) {
            state.searchingRobotIds.add(id);
            state.testingCountdowns.set(id, {
              mode: 'finding',
              expiresAt: Date.now() + safeCountdownMs,
              totalMs: safeCountdownMs,
            });
          } else {
            state.searchingRobotIds.delete(id);
            state.testingCountdowns.delete(id);
          }
        });
        if (isSearching) {
          startTestingCountdowns();
        } else if (!state.testingCountdowns.size) {
          stopTestingCountdowns();
        }
  
        renderDashboard();
        const isDetailActive = detail.classList.contains('active');
        if (!isDetailActive) return;
        const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
        if (activeRobot) {
          renderDetail(activeRobot);
        }
      }

  function syncAutomatedRobotActivityFromState() {
        const now = Date.now();
        const nextAutoSearching = new Set();
        const nextAutoTesting = new Set();
        const nextAutoActivityIds = new Set();
  
        state.robots.forEach((robot) => {
          const id = robotId(robot);
          if (!id) return;
          const hasLocalPriorityActivity =
            state.testingRobotIds.has(id) ||
            state.searchingRobotIds.has(id) ||
            state.fixingRobotIds.has(id);
          if (hasLocalPriorityActivity) {
            return;
          }
          const activity = normalizeRobotActivity(robot?.activity);
          if (activity.searching) {
            nextAutoSearching.add(id);
            nextAutoActivityIds.add(id);
            const safeCountdownMs = normalizeCountdownMs(ONLINE_CHECK_TIMEOUT_MS, ONLINE_CHECK_TIMEOUT_MS);
            state.testingCountdowns.set(id, {
              mode: 'finding',
              expiresAt: now + safeCountdownMs,
              totalMs: safeCountdownMs,
            });
          }
          if (activity.testing) {
            nextAutoTesting.add(id);
            nextAutoActivityIds.add(id);
            const safeCountdownMs = normalizeCountdownMs(TEST_STEP_TIMEOUT_MS, TEST_STEP_TIMEOUT_MS);
            state.testingCountdowns.set(id, {
              mode: 'scanning',
              expiresAt: now + safeCountdownMs,
              totalMs: safeCountdownMs,
            });
          }
        });
  
        state.autoActivityRobotIds.forEach((id) => {
          if (nextAutoActivityIds.has(id)) return;
          if (
            !state.testingRobotIds.has(id) &&
            !state.searchingRobotIds.has(id) &&
            !state.fixingRobotIds.has(id)
          ) {
            state.testingCountdowns.delete(id);
          }
        });
  
        state.autoSearchingRobotIds = nextAutoSearching;
        state.autoTestingRobotIds = nextAutoTesting;
        state.autoActivityRobotIds = nextAutoActivityIds;
  
        if (state.testingCountdowns.size) {
          startTestingCountdowns();
        } else {
          stopTestingCountdowns();
        }
      }

  function getRobotTypeKey(robotIdValue) {
        const robot = getRobotById(robotIdValue);
        return normalizeTypeId(normalizeText(robot?.typeId, normalizeText(robot?.type, '')));
      }

  function getSingleRobotTypeKeyForIds(list) {
        const ids = (Array.isArray(list) ? list : []).map((id) => robotId(id)).filter(Boolean);
        let lockedTypeKey = '';
        ids.forEach((id) => {
          const typeKey = getRobotTypeKey(id);
          if (!typeKey || lockedTypeKey) return;
          lockedTypeKey = typeKey;
        });
        return lockedTypeKey;
      }

  function hasMixedRobotTypesForIds(list) {
        const ids = (Array.isArray(list) ? list : []).map((id) => robotId(id)).filter(Boolean);
        let lockedTypeKey = '';
        return ids.some((id) => {
          const typeKey = getRobotTypeKey(id);
          if (!typeKey) return false;
          if (!lockedTypeKey) {
            lockedTypeKey = typeKey;
            return false;
          }
          return typeKey !== lockedTypeKey;
        });
      }

  function filterRobotIdsToSingleType(list, options = {}) {
        const ids = Array.from(new Set(
          (Array.isArray(list) ? list : [])
            .map((id) => robotId(id))
            .filter(Boolean),
        ));
        if (!ids.length) {
          return {
            robotIds: [],
            typeKey: '',
            limited: false,
          };
        }

        const preferredTypeKey = normalizeTypeId(options.lockTypeKey || '');
        const selectionTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
        const lockedTypeKey = preferredTypeKey || selectionTypeKey || getSingleRobotTypeKeyForIds(ids);
        if (!lockedTypeKey) {
          return {
            robotIds: ids,
            typeKey: '',
            limited: false,
          };
        }

        const filteredIds = ids.filter((id) => getRobotTypeKey(id) === lockedTypeKey);
        return {
          robotIds: filteredIds,
          typeKey: lockedTypeKey,
          limited: filteredIds.length !== ids.length,
        };
      }

  function setSelectionConstraintMessage(limited) {
        state.selectionConstraintMessage = limited ? 'Selection limited to a single robot type.' : '';
      }

  function setRobotSelection(robotIdValue, selected) {
        const id = robotId(robotIdValue);
        if (!id) return;
        if (selected) {
          const currentTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
          const nextTypeKey = getRobotTypeKey(id);
          if (state.selectedRobotIds.size && currentTypeKey && nextTypeKey && currentTypeKey !== nextTypeKey) {
            state.selectedRobotIds = new Set([id]);
            setSelectionConstraintMessage(true);
          } else {
            const nextSelection = filterRobotIdsToSingleType(
              [...Array.from(state.selectedRobotIds), id],
              { lockTypeKey: currentTypeKey || nextTypeKey },
            );
            state.selectedRobotIds = new Set(nextSelection.robotIds);
            setSelectionConstraintMessage(nextSelection.limited);
          }
        } else {
          state.selectedRobotIds.delete(id);
          if (!state.selectedRobotIds.size) {
            setSelectionConstraintMessage(false);
          }
        }
        updateSelectionSummary();
        syncSelectionUi();
      }

  function selectRobotIds(list, fallbackSelectAll = false) {
        const targetIds = new Set(
          (Array.isArray(list) ? list : [])
            .map((id) => robotId(id))
            .filter(Boolean),
        );
  
        if (fallbackSelectAll && !targetIds.size) {
          state.robots.forEach((robot) => {
            const id = robotId(robot);
            if (id) {
              targetIds.add(id);
            }
          });
        }

        if (!targetIds.size) {
          state.selectedRobotIds = targetIds;
          setSelectionConstraintMessage(false);
          updateSelectionSummary();
          syncSelectionUi();
          return;
        }

        const nextSelection = filterRobotIdsToSingleType(Array.from(targetIds));
        state.selectedRobotIds = new Set(nextSelection.robotIds);
        setSelectionConstraintMessage(nextSelection.limited);
        updateSelectionSummary();
        syncSelectionUi();
      }

  function addRobotIdsToSelection(list) {
        const candidateIds = (Array.isArray(list) ? list : [])
          .map((id) => robotId(id))
          .filter(Boolean);
        if (!candidateIds.length) return;

        const currentTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
        if (state.selectedRobotIds.size && candidateIds.length === 1) {
          const candidateTypeKey = getRobotTypeKey(candidateIds[0]);
          if (currentTypeKey && candidateTypeKey && currentTypeKey !== candidateTypeKey) {
            state.selectedRobotIds = new Set([candidateIds[0]]);
            setSelectionConstraintMessage(true);
            updateSelectionSummary();
            syncSelectionUi();
            return;
          }
        }

        const next = new Set(state.selectedRobotIds);
        candidateIds.forEach((id) => next.add(id));
        const nextSelection = filterRobotIdsToSingleType(Array.from(next), { lockTypeKey: currentTypeKey });
        state.selectedRobotIds = new Set(nextSelection.robotIds);
        setSelectionConstraintMessage(nextSelection.limited);
        updateSelectionSummary();
        syncSelectionUi();
      }

  function removeRobotIdsFromSelection(list) {
        const next = new Set(state.selectedRobotIds);
        (Array.isArray(list) ? list : [])
          .map((id) => robotId(id))
          .filter(Boolean)
          .forEach((id) => next.delete(id));
        state.selectedRobotIds = next;
        updateSelectionSummary();
        syncSelectionUi();
      }

  function areAllRobotIdsSelected(list) {
        const ids = (Array.isArray(list) ? list : [])
          .map((id) => robotId(id))
          .filter(Boolean);
        if (!ids.length) return false;
        return ids.every((id) => state.selectedRobotIds.has(id));
      }

  function updateSelectionSummary() {
        const summary = $('#selectionSummary');
        if (!summary) return;
        const baseSummary = `${state.selectedRobotIds.size} robot(s) selected`;
        const constraintMessage = normalizeText(state.selectionConstraintMessage, '');
        summary.textContent = constraintMessage ? `${baseSummary} - ${constraintMessage}` : baseSummary;
        syncRunSelectedButtonLabel();
        syncGlobalSelectionButton();
        if (state.fixModeOpen.dashboard) {
          renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
        }
      }

  function getRunSelectedButtonIdleLabel() {
        return state.selectedRobotIds.size > 0 ? 'Run selected' : 'Run selected (default online)';
      }

  function syncRunSelectedButtonLabel() {
        const runSelectedButton = $('#runSelectedRobotTests');
        if (!runSelectedButton) return;
        setRunningButtonState(Boolean(state.isTestRunInProgress));
      }

  function syncSelectionUi() {
        const cards = $$('[data-robot-id]');
        cards.forEach((card) => {
          const id = normalizeText(card.getAttribute('data-robot-id'), '');
          if (!id) return;
          const selected = state.selectedRobotIds.has(id);
          card.classList.toggle('selected', selected);
          const button = card.querySelector('[data-action="select-robot"]');
          if (!button) return;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', selected ? 'true' : 'false');
          button.setAttribute('aria-label', selected ? 'Deselect robot' : 'Select robot');
          button.setAttribute('title', selected ? 'Deselect robot' : 'Select robot');
          applyActionButton(button, {
            intent: 'selection',
            pressed: selected,
            label: selected ? '[x]' : '[ ]',
          });
        });
        syncSectionToggleButtons();
        syncGlobalSelectionButton();
      }

  function syncGlobalSelectionButton() {
        const selectAllButton = $('#selectAllRobots');
        if (!selectAllButton) return;
        const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
        const allSelected = areAllRobotIdsSelected(allIds);
        applyActionButton(selectAllButton, {
          intent: 'selection',
          pressed: allSelected,
          label: allSelected ? 'Deselect all robots' : 'Select all robots',
        });
        selectAllButton.classList.toggle('toggle-on', allSelected);
        selectAllButton.setAttribute('aria-pressed', allSelected ? 'true' : 'false');
      }

  function statusChip(status, role = '') {
        const roleAttr = role ? ` data-role="${role}"` : '';
        if (status === 'critical') return `<span class="status-chip err"${roleAttr}>Critical</span>`;
        if (status === 'warning') return `<span class="status-chip warn"${roleAttr}>Warning</span>`;
        if (status === 'unknown') return `<span class="status-chip neutral"${roleAttr}>Unknown</span>`;
        if (status === 'na') return `<span class="status-chip neutral"${roleAttr}>N/A</span>`;
        return `<span class="status-chip ok"${roleAttr}>Healthy</span>`;
      }

  function robotModelMarkup() {
        return `
          <div class="body-core"></div>
          <div class="camera-lens"></div>
          <div class="lidar"></div>
          <div class="wheel front-left"></div>
          <div class="wheel front-right"></div>
          <div class="wheel back-left"></div>
          <div class="wheel back-right"></div>
          <div class="battery"><div class="battery-fill"></div></div>
          <div class="proximity-sensor p1"></div>
          <div class="proximity-sensor p2"></div>
          <div class="proximity-sensor p3"></div>
          <div class="proximity-sensor p4"></div>
          <div class="skull"><span></span></div>`;
      }

  function buildRobotModelMarkup(
        robot,
        isOffline = false,
        preferredResolution = MODEL_RESOLUTION_LOW,
      ) {
        const typeConfig = getRobotTypeConfig(robot?.typeId || robot?.type);
        const baseModelUrl = resolveRobotBaseModelUrl(robot, typeConfig, preferredResolution);
        const modelUrl = modelAssetResolver.getInitialModelUrl(baseModelUrl, preferredResolution);
        if (modelUrl && CAN_USE_MODEL_VIEWER) {
          return `
            <div class="robot-viewer">
              <div class="robot-model-placeholder" data-role="robot-model-placeholder" aria-hidden="true">3D Model</div>
              <model-viewer
                data-lazy-src="${modelUrl}"
                data-model-resolution-base-url="${baseModelUrl}"
                data-model-resolution-quality="${preferredResolution}"
                alt="${robot.name || 'Robot model'}"
                disable-zoom
                camera-controls
                interaction-prompt="none">
              </model-viewer>
            </div>`;
        }
  
        return robotModelMarkup();
      }

  function buildRobotModelContainer(
        robot,
        failureClasses,
        isOffline = false,
        preferredResolution = MODEL_RESOLUTION_LOW,
      ) {
        const modelMarkup = buildRobotModelMarkup(robot, isOffline, preferredResolution);
        const is3D = modelMarkup.includes('model-viewer');
        return is3D
          ? `<div class="robot-model-slot ${failureClasses} ${isOffline ? 'offline' : ''}" data-role="robot-model-container">${modelMarkup}</div>`
          : `<div class="robot-3d ${failureClasses} ${isOffline ? 'offline' : ''}" data-role="robot-model-container">${modelMarkup}</div>`;
      }

  function issueSummary(robot, options = {}) {
        return getScopedTestEntries(robot, options)
          .filter((entry) => normalizeStatus(entry?.result?.status) !== 'ok' && !isUnknownResult(entry?.result))
          .slice(0, 3)
          .map((entry) =>
            getDefinitionLabel(Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [], entry.id),
          );
      }

  function groupRobotsByType(list = []) {
        const groupsByKey = new Map();
        list.forEach((robot) => {
          const typeId = normalizeText(robot?.typeId, normalizeText(robot?.type, ''));
          const label = normalizeText(robot?.type, normalizeText(robot?.typeId, 'Unassigned type'));
          const key = normalizeTypeId(typeId || label || 'unassigned-type');
          if (!groupsByKey.has(key)) {
            groupsByKey.set(key, {
              key,
              label,
              typeId,
              robots: [],
            });
          }
          groupsByKey.get(key).robots.push(robot);
        });
        return Array.from(groupsByKey.values()).sort((left, right) => {
          const byLabel = left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
          if (byLabel !== 0) return byLabel;
          return left.typeId.localeCompare(right.typeId, undefined, { sensitivity: 'base' });
        });
      }

  function buildRobotTypeDivider(group) {
        const divider = document.createElement('div');
        divider.className = 'robot-type-divider';
        divider.setAttribute('data-robot-type-group', group.key);

        const label = document.createElement('span');
        label.className = 'robot-type-divider-label';
        label.textContent = group.label;

        const count = document.createElement('span');
        count.className = 'robot-type-divider-count';
        count.textContent = `${group.robots.length} robot${group.robots.length === 1 ? '' : 's'}`;

        divider.appendChild(label);
        divider.appendChild(count);
        return divider;
      }

  function syncRobotTypeDivider(divider, group) {
        if (!divider) return divider;
        divider.className = 'robot-type-divider';
        divider.setAttribute('data-robot-type-group', group.key);

        let label = divider.querySelector('.robot-type-divider-label');
        if (!label) {
          label = document.createElement('span');
          label.className = 'robot-type-divider-label';
          divider.appendChild(label);
        }
        label.textContent = group.label;

        let count = divider.querySelector('.robot-type-divider-count');
        if (!count) {
          count = document.createElement('span');
          count.className = 'robot-type-divider-count';
          divider.appendChild(count);
        }
        count.textContent = `${group.robots.length} robot${group.robots.length === 1 ? '' : 's'}`;
        return divider;
      }

  function describeRobotCard(robot) {
        const globalAggregate = getGlobalAggregate(robot);
        const activeUserAggregate = getActiveUserAggregate(robot);
        const stateKey = globalAggregate.state;
        const outerStateKey = activeUserAggregate.hasChecks ? activeUserAggregate.state : 'na';
        const innerStateKey = globalAggregate.state;
        const isCritical = stateKey === 'critical';
        const normalizedRobotId = robotId(robot);
        const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
        const selected = isRobotSelected(normalizedRobotId);
        const isTesting = isRobotTesting(normalizedRobotId);
        const isSearching = isRobotSearching(normalizedRobotId);
        const isFixing = isRobotFixing(normalizedRobotId);
        const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
        const isCountingDown = isTesting || isSearching || isFixing;
        const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
        const stateClass = isOffline ? 'state-offline' : `state-${stateKey}`;
        const overlayMarkup = buildScanOverlayMarkup({
          isSearching,
          isTesting,
          isFixing,
          compactAutoSearch,
        });
        const issues = issueSummary(robot, { scope: 'global' });
        const badgeMarkup = issues.map((issue) => `<span class="error-badge">${issue}</span>`).join('');
        const failureClasses = globalAggregate.entries
          .filter((entry) => normalizeStatus(entry?.result?.status) !== 'ok' && !isUnknownResult(entry?.result))
          .map((entry) => `fault-${entry.id}`)
          .join(' ');
        const activeOwnerProfile = normalizeText(activeUserAggregate.activeOwner, '');
        return {
          stateKey,
          outerStateKey,
          innerStateKey,
          outerStateClass: `outer-state-${outerStateKey}`,
          outerVisibilityClass: activeOwnerProfile ? '' : 'outer-scope-hidden',
          innerStateClass: `inner-state-${innerStateKey}`,
          isCritical,
          normalizedRobotId,
          isOffline,
          selected,
          isTesting,
          isSearching,
          isFixing,
          compactAutoSearch,
          isCountingDown,
          testCountdown,
          stateClass,
          overlayMarkup,
          badgeMarkup,
          failureClasses,
          title: robot.name,
          subtitle: robot.type,
          issueSummaryText: issues.join(', ') || 'No active errors',
          batteryState: getRobotBatteryState(robot),
          lastFullTestLabel: buildLastFullTestPillLabel(robot),
        };
      }

  function syncStatusChipNode(node, stateKey) {
        if (!node) return;
        const tone = getStatusChipTone(stateKey);
        node.className = `status-chip ${tone.css}`;
        node.textContent = tone.text;
      }

  function syncSelectRobotButton(button, normalizedRobotId, selected) {
        if (!button) return;
        button.className = `button robot-select-btn ${selected ? 'selected' : ''}`.trim();
        button.type = 'button';
        button.setAttribute('data-action', 'select-robot');
        button.setAttribute('data-button-intent', 'selection');
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        const label = selected ? 'Deselect robot' : 'Select robot';
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        button.textContent = selected ? '[x]' : '[ ]';
        if (normalizedRobotId) {
          button.setAttribute('data-robot-id', normalizedRobotId);
        }
      }

  function createNodeFromMarkup(markup) {
        if (!markup) return null;
        const template = document.createElement('template');
        template.innerHTML = markup.trim();
        return template.content.firstElementChild;
      }

  function syncModelWrapContent(card, robot, descriptor) {
        if (!card) return;
        const modelWrap = card.querySelector('.model-wrap');
        if (!modelWrap) return;

        const badgeStrip = modelWrap.querySelector('[data-role="badge-strip"]');
        if (badgeStrip && badgeStrip.innerHTML !== descriptor.badgeMarkup) {
          badgeStrip.innerHTML = descriptor.badgeMarkup;
        }

        const desiredConnectionMarkup = buildConnectionCornerIconMarkup(
          descriptor.isOffline,
          descriptor.compactAutoSearch,
        );
        const existingConnectionIcon = modelWrap.querySelector('[data-role="connection-corner-icon"]');
        if (existingConnectionIcon) {
          const replacementConnectionIcon = createNodeFromMarkup(desiredConnectionMarkup);
          if (replacementConnectionIcon) {
            existingConnectionIcon.replaceWith(replacementConnectionIcon);
          }
        } else {
          const insertedConnectionIcon = createNodeFromMarkup(desiredConnectionMarkup);
          if (insertedConnectionIcon) {
            modelWrap.insertBefore(insertedConnectionIcon, modelWrap.firstChild);
          }
        }

        const existingCountdown = modelWrap.querySelector('.scan-countdown');
        if (descriptor.isCountingDown) {
          if (existingCountdown) {
            existingCountdown.className = 'scan-countdown';
            existingCountdown.setAttribute('data-robot-id', descriptor.normalizedRobotId);
            existingCountdown.textContent = descriptor.testCountdown;
          } else {
            const countdownNode = document.createElement('div');
            countdownNode.className = 'scan-countdown';
            countdownNode.setAttribute('data-robot-id', descriptor.normalizedRobotId);
            countdownNode.textContent = descriptor.testCountdown;
            const modelContainer = modelWrap.querySelector('[data-role="robot-model-container"]');
            modelWrap.insertBefore(countdownNode, modelContainer || null);
          }
        } else if (existingCountdown) {
          existingCountdown.remove();
        }

        const existingOverlay = modelWrap.querySelector('[data-role="activity-overlay"]');
        if (descriptor.overlayMarkup) {
          const overlayNode = createNodeFromMarkup(descriptor.overlayMarkup);
          if (existingOverlay) {
            if (overlayNode) {
              existingOverlay.replaceWith(overlayNode);
            }
          } else if (overlayNode) {
            modelWrap.appendChild(overlayNode);
          }
        } else if (existingOverlay) {
          existingOverlay.remove();
        }

        const desiredModelContainer = createNodeFromMarkup(
          buildRobotModelContainer(robot, descriptor.failureClasses, descriptor.isOffline),
        );
        const existingModelContainer = modelWrap.querySelector('[data-role="robot-model-container"]');
        const existingUsesModelViewer = Boolean(existingModelContainer?.querySelector?.('model-viewer'));
        const desiredUsesModelViewer = Boolean(desiredModelContainer?.querySelector?.('model-viewer'));
        const existingBaseModelUrl = normalizeText(
          existingModelContainer?.querySelector?.('model-viewer')?.dataset?.modelResolutionBaseUrl,
          '',
        );
        const desiredBaseModelUrl = normalizeText(
          desiredModelContainer?.querySelector?.('model-viewer')?.dataset?.modelResolutionBaseUrl,
          '',
        );
        const shouldReplaceModelContainer =
          !existingModelContainer
          || !desiredModelContainer
          || existingUsesModelViewer !== desiredUsesModelViewer
          || existingBaseModelUrl !== desiredBaseModelUrl;
        if (shouldReplaceModelContainer) {
          if (existingModelContainer && desiredModelContainer) {
            existingModelContainer.replaceWith(desiredModelContainer);
          } else if (!existingModelContainer && desiredModelContainer) {
            modelWrap.appendChild(desiredModelContainer);
          }
        } else {
          existingModelContainer.className = desiredModelContainer.className;
          existingModelContainer.setAttribute('data-role', 'robot-model-container');
        }

        registerLazyModelViewersInNode(card);
        syncModelViewerRotationForContainer(card, descriptor.isOffline);
      }

  function syncRobotCard(card, robot) {
        if (!card) return card;
        const descriptor = describeRobotCard(robot);
        card.className = [
          'robot-card',
          descriptor.isCritical ? 'error' : '',
          descriptor.stateClass,
          descriptor.outerStateClass,
          descriptor.outerVisibilityClass,
          descriptor.innerStateClass,
          descriptor.selected ? 'selected' : '',
          descriptor.isTesting || descriptor.isSearching || descriptor.isFixing ? 'testing' : '',
          descriptor.isOffline ? 'offline' : '',
        ]
          .filter(Boolean)
          .join(' ');
        card.setAttribute('data-robot-id', descriptor.normalizedRobotId);

        const titleNode = card.querySelector('.robot-card-title');
        if (titleNode) {
          titleNode.textContent = descriptor.title;
        }

        const subtitleNode = card.querySelector('.robot-card-sub');
        if (subtitleNode) {
          subtitleNode.textContent = descriptor.subtitle;
        }

        syncStatusChipNode(card.querySelector('[data-role="card-status-chip"]'), descriptor.stateKey);
        syncSelectRobotButton(
          card.querySelector('[data-action="select-robot"]'),
          descriptor.normalizedRobotId,
          descriptor.selected,
        );
        syncModelWrapContent(card, robot, descriptor);

        const issuesPill = card.querySelector('[data-role="issues-pill"]');
        if (issuesPill) {
          issuesPill.textContent = `Issue cluster: ${descriptor.issueSummaryText}`;
        }

        const lastFullTestPill = card.querySelector('[data-role="last-full-test-pill"]');
        if (lastFullTestPill) {
          lastFullTestPill.textContent = descriptor.lastFullTestLabel;
        }

        const batteryHost = card.querySelector('[data-role="summary-battery-pill"]');
        if (batteryHost) {
          batteryHost.innerHTML = renderBatteryPill({
            value: descriptor.batteryState.value,
            status: descriptor.batteryState.status,
            reason: descriptor.batteryState.reason,
            size: 'default',
          });
        }

        hydrateActionButtons(card);
        return card;
      }

  function renderRobotTypeGroups(container, robots) {
        if (!container) return;
        const existingCardsById = new Map();
        const existingDividersByGroup = new Map();
        Array.from(container.children || []).forEach((child) => {
          if (!child) return;
          const childRobotId = normalizeText(child.getAttribute?.('data-robot-id'), '');
          if (childRobotId) {
            existingCardsById.set(childRobotId, child);
            return;
          }
          const childGroupKey = normalizeText(child.getAttribute?.('data-robot-type-group'), '');
          if (childGroupKey) {
            existingDividersByGroup.set(childGroupKey, child);
          }
        });

        const desiredNodes = [];
        groupRobotsByType(robots).forEach((group) => {
          const divider = syncRobotTypeDivider(
            existingDividersByGroup.get(group.key) || buildRobotTypeDivider(group),
            group,
          );
          desiredNodes.push(divider);
          group.robots.forEach((robot) => {
            const normalizedRobotId = robotId(robot);
            const existingCard = existingCardsById.get(normalizedRobotId);
            desiredNodes.push(existingCard ? syncRobotCard(existingCard, robot) : renderCard(robot));
          });
        });

        let cursor = container.firstChild;
        desiredNodes.forEach((node) => {
          if (node !== cursor) {
            container.insertBefore(node, cursor || null);
          }
          cursor = node.nextSibling;
        });

        while (cursor) {
          const next = cursor.nextSibling;
          container.removeChild(cursor);
          cursor = next;
        }
      }

  function renderCard(robot) {
        const descriptor = describeRobotCard(robot);
        const card = document.createElement('article');
        card.className = [
          'robot-card',
          descriptor.isCritical ? 'error' : '',
          descriptor.stateClass,
          descriptor.outerStateClass,
          descriptor.outerVisibilityClass,
          descriptor.innerStateClass,
          descriptor.selected ? 'selected' : '',
          descriptor.isTesting || descriptor.isSearching || descriptor.isFixing ? 'testing' : '',
          descriptor.isOffline ? 'offline' : '',
        ]
          .filter(Boolean)
          .join(' ');
        card.setAttribute('data-robot-id', descriptor.normalizedRobotId);
  
        card.innerHTML = `
          <div class="robot-card-inner-border" aria-hidden="true"></div>
          <div class="glow-bar"></div>
          <div class="robot-card-header">
            <div>
              <h3 class="robot-card-title">${descriptor.title}</h3>
              <p class="robot-card-sub">${descriptor.subtitle}</p>
            </div>
            <div class="robot-card-header-actions">
              ${statusChip(descriptor.stateKey, 'card-status-chip')}
              <button
                class="button robot-select-btn ${descriptor.selected ? 'selected' : ''}"
                type="button"
                data-action="select-robot"
                data-button-intent="selection"
                aria-pressed="${descriptor.selected ? 'true' : 'false'}"
                aria-label="${descriptor.selected ? 'Deselect robot' : 'Select robot'}"
                title="${descriptor.selected ? 'Deselect robot' : 'Select robot'}">
                ${descriptor.selected ? '[x]' : '[ ]'}
              </button>
            </div>
          </div>
          <div class="model-wrap">
            <div class="badge-strip" data-role="badge-strip">${descriptor.badgeMarkup}</div>
            ${buildConnectionCornerIconMarkup(descriptor.isOffline, descriptor.compactAutoSearch)}
            ${descriptor.isCountingDown ? `<div class="scan-countdown" data-robot-id="${descriptor.normalizedRobotId}">${descriptor.testCountdown}</div>` : ''}
            ${buildRobotModelContainer(robot, descriptor.failureClasses, descriptor.isOffline)}
            ${descriptor.overlayMarkup}
          </div>
          <div class="summary">
            <span class="pill" data-role="issues-pill">Issue cluster: ${descriptor.issueSummaryText}</span>
            <span class="pill" data-role="last-full-test-pill">${descriptor.lastFullTestLabel}</span>
            <span data-role="summary-battery-pill">${renderBatteryPill({
              value: descriptor.batteryState.value,
              status: descriptor.batteryState.status,
              reason: descriptor.batteryState.reason,
              size: 'default',
            })}</span>
            <span data-role="card-stop-current-job">${renderRobotStopCurrentJobButton(robot?.activity, descriptor.normalizedRobotId)}</span>
          </div>`.trim().replace(/>\s+</g, '><');
        const queueStripMarkup = renderRobotJobQueueStrip(robot?.activity, { maxQueued: 2 });
        if (queueStripMarkup) {
          const queueNode = document.createElement('div');
          queueNode.setAttribute('data-role', 'card-job-queue-strip');
          queueNode.innerHTML = queueStripMarkup;
          card.appendChild(queueNode);
        } else {
          const emptyQueueNode = document.createElement('div');
          emptyQueueNode.setAttribute('data-role', 'card-job-queue-strip');
          card.appendChild(emptyQueueNode);
        }
  
        card.addEventListener('click', (event) => {
          const stopButton = event.target.closest('[data-action="stop-current-job"]');
          if (stopButton) {
            event.preventDefault();
            event.stopPropagation();
            stopCurrentJob(stopButton.getAttribute('data-robot-id') || descriptor.normalizedRobotId).catch((error) => {
              const message = error instanceof Error ? error.message : String(error);
              appendTerminalLine(`Failed to stop job for ${descriptor.normalizedRobotId}: ${message}`, 'err');
            });
            return;
          }
          const selectButton = event.target.closest('[data-action="select-robot"]');
          if (selectButton) {
            event.preventDefault();
            event.stopPropagation();
                setRobotSelection(descriptor.normalizedRobotId, !isRobotSelected(descriptor.normalizedRobotId));
                return;
              }
  
          openDetail(robot.id);
        });
  
        hydrateActionButtons(card);
        registerLazyModelViewersInNode(card);
        syncModelViewerRotationForContainer(card, descriptor.isOffline);
  
        return card;
      }

  function applyFilters() {
        return state.robots.filter((robot) => {
          const matchesName = robot.name.toLowerCase().includes(state.filter.name.toLowerCase());
          const matchesType = state.filter.type === 'all' || robot.type === state.filter.type;
          const stateKey = statusFromScore(robot);
          let matchesError = true;
  
          if (state.filter.error === 'healthy') {
            matchesError = stateKey === 'ok';
          } else if (state.filter.error === 'warning') {
            matchesError = stateKey === 'warning';
          } else if (state.filter.error === 'critical') {
            matchesError = stateKey === 'critical';
          } else if (state.filter.error === 'unknown') {
            matchesError = stateKey === 'unknown';
          } else if (state.filter.error === 'error') {
            matchesError = stateKey !== 'ok';
          } else if (state.filter.error !== 'all') {
            const definitionId = normalizeText(state.filter.error, '');
            const scopedEntry = getScopedTestEntries(robot, { scope: 'all' })
              .find((entry) => entry.id === definitionId);
            if (!scopedEntry) {
              matchesError = false;
            } else {
              matchesError = isUnknownResult(scopedEntry.result)
                || normalizeStatus(scopedEntry?.result?.status) !== 'ok';
            }
          }

          return matchesName && matchesType && matchesError;
        });
      }

  function updateKPIs(list) {
        const healthy = list.filter((r) => statusFromScore(r) === 'ok').length;
        const warning = list.filter((r) => statusFromScore(r) === 'warning').length;
        const critical = list.filter((r) => statusFromScore(r) === 'critical').length;
        const unknown = list.filter((r) => statusFromScore(r) === 'unknown').length;
        $('#kpiHealthy').textContent = healthy;
        $('#kpiWarn').textContent = warning;
        $('#kpiCritical').textContent = critical;
        const unknownNode = $('#kpiUnknown');
        if (unknownNode) unknownNode.textContent = unknown;
      }

  function renderDashboard() {
        const visible = applyFilters();
        bindLargeFleetWindowListeners();
        ensureLargeFleetWindowLimits(visible.length);
        const allOnlineRobots = sortOnlineRobots(
          visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok'),
        );
        const allOfflineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');
        latestOnlineCount = allOnlineRobots.length;
        latestOfflineCount = allOfflineRobots.length;
        const onlineRobots = applyLargeFleetWindow(allOnlineRobots, 'online');
        const offlineRobots = applyLargeFleetWindow(allOfflineRobots, 'offline');
  
        if (onlineSectionTitle) {
          onlineSectionTitle.textContent = `Online (${allOnlineRobots.length})`;
        }
        if (offlineSectionTitle) {
          offlineSectionTitle.textContent = `Offline (${allOfflineRobots.length})`;
        }
  
        if (onlineGrid && offlineGrid) {
          renderRobotTypeGroups(onlineGrid, onlineRobots);
          renderRobotTypeGroups(offlineGrid, offlineRobots);
        }
        invalidateCountdownNodeCache();
  
        emptyState.classList.toggle('hidden', visible.length > 0);
        updateSelectionSummary();
        syncSectionToggleButtons();
        updateKPIs(state.robots);
        hydrateActionButtons(dashboard);
        syncFixModePanels();
      }

  function applyDashboardMetaFromVisible(visible) {
        const onlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok');
        const offlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');
        if (onlineSectionTitle) {
          onlineSectionTitle.textContent = `Online (${onlineRobots.length})`;
        }
        if (offlineSectionTitle) {
          offlineSectionTitle.textContent = `Offline (${offlineRobots.length})`;
        }
        emptyState.classList.toggle('hidden', visible.length > 0);
        updateSelectionSummary();
        syncSectionToggleButtons();
        updateKPIs(state.robots);
        if (state.fixModeOpen.dashboard) {
          renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
        }
      }

  function patchDashboardForChangedRobots(changedRobotIds) {
        const changedIds = Array.from(changedRobotIds || []).map((id) => robotId(id)).filter(Boolean);
        if (!changedIds.length) return false;
        const visibleRobots = applyFilters();
        const visibleRobotsById = new Map(
          visibleRobots.map((robot) => [robotId(robot), robot]).filter(([id]) => Boolean(id)),
        );
        let requiresFullRender = false;

        changedIds.forEach((id) => {
          const robot = getRobotById(id);
          const existingCard = queryCardByRobotId(id);
          const isVisible = visibleRobotsById.has(id);
          if (!robot) {
            if (existingCard) requiresFullRender = true;
            return;
          }
          if (!isVisible) {
            if (existingCard) requiresFullRender = true;
            return;
          }
          if (!existingCard) {
            if (largeFleetWindowingEnabled) {
              return;
            }
            requiresFullRender = true;
            return;
          }
          const shouldBeOnline = normalizeStatus(robot?.tests?.online?.status) === 'ok';
          const isInOnlineGrid = Boolean(existingCard.closest('#onlineRobotGrid'));
          const isInOfflineGrid = Boolean(existingCard.closest('#offlineRobotGrid'));
          if ((shouldBeOnline && !isInOnlineGrid) || (!shouldBeOnline && !isInOfflineGrid)) {
            requiresFullRender = true;
            return;
          }
          syncRobotCard(existingCard, robot);
        });

        if (requiresFullRender) {
          renderDashboard();
          return false;
        }

        applyDashboardMetaFromVisible(visibleRobots);
        invalidateCountdownNodeCache();
        hydrateActionButtons(dashboard);
        return true;
      }

  function getStatusChipTone(statusKey) {
        if (statusKey === 'critical') return { css: 'err', text: 'Critical' };
        if (statusKey === 'warning') return { css: 'warn', text: 'Warning' };
        if (statusKey === 'unknown') return { css: 'neutral', text: 'Unknown' };
        if (statusKey === 'na') return { css: 'neutral', text: 'N/A' };
        return { css: 'ok', text: 'Healthy' };
      }

  function queryCardByRobotId(robotIdValue) {
        const id = robotId(robotIdValue);
        if (!id) return null;
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(id)
            : id.replace(/"/g, '\\"');
        return document.querySelector(`.robot-card[data-robot-id="${escaped}"]`);
      }

  return {
    init() {},
    normalizeBatteryPercentForSort,
    getRobotBatteryState,
    nonBatteryTestEntries,
    normalizeTagList,
    normalizeOwnerTags,
    normalizePlatformTags,
    getActiveOwnerProfile,
    getTestDefinitionForRobot,
    getDefinitionTagMeta,
    hasTagIntersection,
    matchesDefinitionFilters,
    isUnknownResult,
    getScopedTestEntries,
    computeAggregateState,
    getRobotAggregate,
    getGlobalAggregate,
    getActiveUserAggregate,
    statusFromScore,
    statusSortRank,
    onlineRobotComparator,
    sortOnlineRobots,
    syncOnlineSortButton,
    cycleOnlineSortMode,
    resolveRobotModelUrl,
    normalizeRobotData,
    rebuildRobotIndex,
    setRobots,
    mapRobots,
    robotId,
    getRobotById,
    getSelectedRobotIds,
    getReachableRobotIds,
    isRobotSelected,
    isRobotTesting,
    isRobotSearching,
    isRobotFixing,
    isRobotBusyForOnlineRefresh,
    isRobotAutoSearching,
    setRobotTesting,
    setRobotSearching,
    setRobotFixing,
    estimateTestCountdownMsFromBody,
    normalizeCountdownMs,
    getCountdownLabel,
    getTestingCountdownText,
    shouldUseCompactAutoSearchIndicator,
    buildScanOverlayMarkup,
    buildConnectionCornerIconMarkup,
    syncModelViewerRotationForContainer,
    formatDurationMs,
    getMonitorOnlineIntervalMs,
    getMonitorBatteryIntervalMs,
    getMonitorTopicsIntervalMs,
    normalizeCheckedAtMs,
    formatLastFullTestTimestamp,
    buildLastFullTestPillLabel,
    syncAutoMonitorRefreshState,
    stopOnlineRefreshStatusTimer,
    setFleetOnlineButtonIdleLabel,
    updateFleetOnlineRefreshStatus,
    startOnlineRefreshStatusTimer,
    invalidateCountdownNodeCache,
    getCountdownNodes,
    refreshTestingCountdowns,
    startTestingCountdowns,
    stopTestingCountdowns,
    setRobotSearchingBulk,
    syncAutomatedRobotActivityFromState,
    getRobotTypeKey,
    getSingleRobotTypeKeyForIds,
    hasMixedRobotTypesForIds,
    filterRobotIdsToSingleType,
    setRobotSelection,
    selectRobotIds,
    addRobotIdsToSelection,
    removeRobotIdsFromSelection,
    areAllRobotIdsSelected,
    updateSelectionSummary,
    getRunSelectedButtonIdleLabel,
    syncRunSelectedButtonLabel,
    syncSelectionUi,
    syncGlobalSelectionButton,
    statusChip,
    robotModelMarkup,
    buildRobotModelMarkup,
    buildRobotModelContainer,
    issueSummary,
    groupRobotsByType,
    buildRobotTypeDivider,
    renderRobotTypeGroups,
    renderCard,
    applyFilters,
    updateKPIs,
    renderDashboard,
    applyDashboardMetaFromVisible,
    patchDashboardForChangedRobots,
    getStatusChipTone,
    queryCardByRobotId,
  };
}
