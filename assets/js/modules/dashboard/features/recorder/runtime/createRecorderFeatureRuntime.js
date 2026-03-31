import { renderRecorderLlmPromptTemplate, renderRecorderLlmPromptText } from '../../../templates/recorderLlmPromptTemplate.js';
import { buildRecorderLlmPromptPayload as buildRecorderLlmPromptPayloadValue, parseRecorderLlmImportPayload as parseRecorderLlmImportPayloadValue, stripRecorderLlmJsonWrapperNoise as stripRecorderLlmJsonWrapperNoiseValue, validateRecorderImportedDefinition as validateRecorderImportedDefinitionValue } from '../domain/recorderLlm.js';
import { createRecorderRuntimeBridge } from '../domain/recorderRuntimeBridge.js';

export function createRecorderFeature(context, maybeEnv) {
  const runtime = maybeEnv ? context : context?.bridge || context?.runtime || context?.services || {};
  const env = maybeEnv || context?.env || context;
  const {
    $,
    $$,
    ACTIVE_OWNER_PROFILE_STORAGE_KEY,
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
    RECORDER_GENERIC_INFO_CONFIG_URL,
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
    filterActiveOwner,
    filterOwnerTags,
    filterPlatformTags,
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
    manageFixOwnerTagsInput,
    manageFixPlatformTagsInput,
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
    manageTestOwnerTagsInput,
    manageTestPlatformTagsInput,
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
    recorderDefinitionDescriptionInput,
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
    recorderSimplePromptNextButton,
    recorderSimpleImportBackButton,
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
    recorderOwnerTagsInput,
    recorderOutputs,
    recorderPlatformTagsInput,
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
    recorderLlmSystemDetailsInput,
    recorderLlmTestRequestInput,
    recorderLlmPromptPreview,
    recorderLlmPromptStatus,
    recorderJsonHelpButton,
    recorderJsonHelpPanel,
    recorderLlmImportModal,
    recorderLlmImportCancelButton,
    recorderLlmImportLoadButton,
    recorderLlmImportInput,
    recorderLlmImportStatus,
    publishSuccessCelebration,
    publishSuccessCelebrationVideo,
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
  const RECORDER_START_DISABLED_TOOLTIP = 'Enter Definition ID and Label to enable "Start creation of new test".';
  const RECORDER_NOT_STARTED_TOOLTIP = 'Complete Definition ID and Label, then click "Start creation of new test".';
  const PUBLISH_SUCCESS_CELEBRATION_FALLBACK_MS = 2400;
  const scheduleDelay = typeof globalThis !== 'undefined' && typeof globalThis.setTimeout === 'function'
    ? globalThis.setTimeout.bind(globalThis)
    : null;
  const cancelDelay = typeof globalThis !== 'undefined' && typeof globalThis.clearTimeout === 'function'
    ? globalThis.clearTimeout.bind(globalThis)
    : null;

  const {
    addRobotIdsToSelection,
    appendTerminalLine,
    appendTerminalPayload,
    applyDashboardMetaFromVisible,
    applyFilters,
    applyMonitorConfig,
    applyMonitorConfigFromPayload,
    applyRuntimeRobotPatches,
    areAllRobotIdsSelected,
    batteryReasonText,
    buildConnectionCornerIconMarkup,
    buildFixButtonLabel,
    buildGlobalTestDefinitions,
    buildLastFullTestPillLabel,
    buildManageHash,
    buildRobotModelContainer,
    buildRobotModelMarkup,
    buildScanOverlayMarkup,
    buildTestPreviewText,
    buildTestPreviewTextForResult,
    clampFleetParallelism,
    clampMonitorBatteryInterval,
    clampMonitorOnlineInterval,
    clampMonitorTopicsInterval,
    clampOnlineCountdownMs,
    closeBugReportModal,
    closeRecorderTerminalSession,
    closeTerminalSession,
    closeTestDebugModal,
    createRobotFromForm,
    cycleOnlineSortMode,
    estimateTestCountdownMsFromBody,
    formatConsoleLine,
    formatDurationMs,
    formatEpochSeconds,
    formatLastFullTestTimestamp,
    formatRawOutput,
    formatTestValue,
    getAutoFixesForType,
    getConfiguredDefaultTestIds,
    getCountdownLabel,
    getCountdownNodes,
    getDashboardFixCandidates,
    getDefinitionLabel,
    getDetailFixCandidates,
    getDetailTerminalPresets,
    getFallbackTestIconText,
    getFixModeElements,
    getFleetParallelism,
    getMonitorBatteryIntervalMs,
    getMonitorOnlineIntervalMs,
    getMonitorTopicsIntervalMs,
    getOnlineCheckCountdownMs,
    getPersistedManageTab,
    getReachableRobotIds,
    getRobotById,
    getRobotDefinitionsForType,
    getRobotIdsForRun,
    getRobotTypeConfig,
    getRunSelectedButtonIdleLabel,
    getSelectedRobotIds,
    getStatusChipTone,
    getTestIconPresentation,
    getTestingCountdownText,
    getTimestamp,
    getVisibleOfflineRobotIds,
    getVisibleOnlineRobotIds,
    haveRuntimeTestsChanged,
    hideRecorderReadPopover,
    initAddRobotPasswordToggle,
    initDashboardController,
    initFleetParallelism,
    initMonitorConfigControls,
    initRobotTerminal,
    initThemeControls,
    invalidateCountdownNodeCache,
    isManageViewActive,
    isRobotAutoSearching,
    isRobotBusyForOnlineRefresh,
    isRobotFixing,
    isRobotSearching,
    isRobotSelected,
    isRobotTesting,
    isTopicsMonitorMode,
    issueSummary,
    loadFleetRuntimeDelta,
    loadFleetStaticState,
    loadMonitorConfig,
    loadRobotConfig,
    loadRobotTypeConfig,
    loadRobotsFromBackend,
    mapRobots,
    mergeRuntimeRobotsIntoList,
    nonBatteryTestEntries,
    normalizeAutoFixDefinition,
    normalizeBatteryPercentForSort,
    normalizeBatteryReason,
    normalizeCheckedAtMs,
    normalizeCountdownMs,
    normalizeManageTab,
    normalizePossibleResult,
    normalizeRobotActivity,
    normalizeRobotData,
    normalizeRobotTests,
    normalizeRobotTypeConfig,
    normalizeRuntimeRobotEntry,
    normalizeRuntimeTestUpdate,
    normalizeStepDebug,
    normalizeTestDebugCollection,
    normalizeTestDebugResult,
    normalizeTestDefinition,
    onlineRobotComparator,
    openBugReportModal,
    openDetail,
    openTestDebugModal,
    parseManageRoute,
    patchDetailRuntimeContent,
    persistManageTab,
    populateAddRobotTypeOptions,
    populateFilters,
    queryCardByRobotId,
    readRobotField,
    rebuildRobotIndex,
    refreshRobotsFromBackendSnapshot,
    refreshRuntimeStateFromBackend,
    refreshTestingCountdowns,
    removeRobotIdsFromSelection,
    renderCard,
    renderDashboard,
    renderDetail,
    renderFixModeActionsForContext,
    resolveManageTab,
    resolveRobotModelUrl,
    robotId,
    robotModelMarkup,
    routeFromHash,
    runAutoFixCandidate,
    runAutoFixForRobot,
    runFallbackChecks,
    runFallbackCommandSimulation,
    runManualTests,
    runOneRobotOnlineCheck,
    runOnlineCheckForAllRobots,
    runRobotTestsForRobot,
    runtimeActivityHasSignal,
    scheduleMonitorParallelismSync,
    selectAllOfflineRobots,
    selectAllOnlineRobots,
    selectAllRobots,
    selectRobotIds,
    setAddRobotMessage,
    setAddRobotPasswordVisibility,
    setBugReportStatus,
    setFixModeStatus,
    setFleetOnlineButtonIdleLabel,
    setFleetOnlineButtonState,
    setFleetParallelism,
    setLocationHash,
    setModelContainerFaultClasses,
    setMonitorConfigStatus,
    setRecorderTerminalActive,
    setRobotFixing,
    setRobotSearching,
    setRobotSearchingBulk,
    setRobotSelection,
    setRobotTesting,
    setRobotTypeDefinitions,
    setRobots,
    setRunningButtonState,
    setTerminalActive,
    setTerminalInactive,
    shouldUseCompactAutoSearchIndicator,
    showAddRobotPage,
    showDashboard,
    sortOnlineRobots,
    startOnlineRefreshStatusTimer,
    startRuntimeStateSync,
    startTestingCountdowns,
    statusChip,
    statusFromScore,
    statusSortRank,
    stopOnlineRefreshStatusTimer,
    stopRuntimeStateSync,
    stopTestingCountdowns,
    submitBugReport,
    syncAutoMonitorRefreshState,
    syncAutomatedRobotActivityFromState,
    syncFixModePanels,
    syncFixModeToggleButton,
    syncFleetParallelismUi,
    syncGlobalSelectionButton,
    syncModalScrollLock,
    syncModelViewerRotationForContainer,
    syncMonitorConfigUi,
    syncMonitorParallelismWithFleet,
    syncOnlineSortButton,
    syncRecorderReadPopoverVisibility,
    syncRunSelectedButtonLabel,
    syncSectionToggleButtons,
    syncSelectionUi,
    toggleFixMode,
    updateCardRuntimeContent,
    updateFleetOnlineRefreshStatus,
    updateFleetOnlineSummary,
    updateKPIs,
    updateOnlineCheckEstimateFromResults,
    updateRobotTestState,
    updateSelectionSummary,
  } = createRecorderRuntimeBridge(runtime);

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
        const normalizeDefinitionWithTags = (definition, ownerDefault = true) => {
          const entry = definition && typeof definition === 'object' ? definition : {};
          return {
            ...entry,
            ownerTags: normalizeTagList(entry.ownerTags, { ownerDefault }),
            platformTags: normalizeTagList(entry.platformTags),
          };
        };
        return {
          commandPrimitives: Array.isArray(safe.commandPrimitives) ? safe.commandPrimitives : [],
          tests: Array.isArray(safe.tests) ? safe.tests.map((test) => normalizeDefinitionWithTags(test, true)) : [],
          checks: Array.isArray(safe.checks) ? safe.checks : [],
          fixes: Array.isArray(safe.fixes) ? safe.fixes.map((fix) => normalizeDefinitionWithTags(fix, true)) : [],
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

  function normalizeTagList(values, options = {}) {
        const ownerDefault = options.ownerDefault === true;
        const list = Array.isArray(values)
          ? values
          : typeof values === 'string'
            ? values.split(/[\n,]+/g)
            : [];
        const seen = new Set();
        const out = [];
        list.forEach((item) => {
          const normalized = normalizeText(item, '').toLowerCase();
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          out.push(normalized);
        });
        if (ownerDefault && !out.length) {
          return ['global'];
        }
        return out;
      }

  function parseTagInput(inputElement, options = {}) {
        if (!inputElement) {
          return options.ownerDefault ? ['global'] : [];
        }
        return normalizeTagList(inputElement.value, options);
      }

  function formatTagInputValue(tags, options = {}) {
        const hideGlobalDefault = options.hideGlobalDefault !== false;
        const normalized = normalizeTagList(tags, { ownerDefault: options.ownerDefault === true });
        if (hideGlobalDefault && normalized.length === 1 && normalized[0] === 'global') {
          return '';
        }
        return normalized.join(', ');
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

  function isRecorderMetadataReady() {
        return normalizeText(recorderDefinitionIdInput?.value, '') !== ''
          && normalizeText(recorderDefinitionLabelInput?.value, '') !== '';
      }

  function isRecorderTooltipAnchor(node) {
        if (!node) return false;
        if (typeof node.classList?.contains === 'function' && node.classList.contains('recorder-button-tooltip-anchor')) {
          return true;
        }
        return normalizeText(node.className, '')
          .split(/\s+/)
          .includes('recorder-button-tooltip-anchor');
      }

  function setRecorderButtonTooltip(button, message = '') {
        if (!button) return;
        const tooltip = normalizeText(message, '');
        button.title = tooltip;
        if (button.style) {
          button.style.pointerEvents = tooltip && button.disabled ? 'none' : '';
        }
        const anchor = isRecorderTooltipAnchor(button.parentNode) ? button.parentNode : null;
        if (anchor) {
          anchor.title = tooltip;
        }
      }

  function setRecorderButtonDisabledState(button, disabled, tooltip = '') {
        if (!button) return;
        button.disabled = Boolean(disabled);
        setRecorderButtonTooltip(button, button.disabled ? tooltip : '');
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

  const RECORDER_TERMINAL_PRESET_IDS = new Set(['generic-info']);
  let recorderGenericInfoConfigPromise = null;
  let filterRenderDebounceTimer = null;
  let filterRenderRaf = null;

  function quoteRecorderShellValue(value) {
        return `'${String(value ?? '').replace(/'/g, `'"'"'`)}'`;
      }

  function normalizeRecorderGenericInfoConfig(rawConfig) {
        const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
        const commands = Array.isArray(config.commands) ? config.commands : [];
        const normalizedCommands = commands
          .map((entry, index) => {
            const label = normalizeText(entry?.label, `Command ${index + 1}`);
            const command = normalizeText(entry?.command, '');
            const timeoutSec = Number(entry?.timeoutSec);
            if (!command) return null;
            return {
              label,
              command,
              timeoutSec: Number.isFinite(timeoutSec) && timeoutSec > 0 ? Math.floor(timeoutSec) : 10,
            };
          })
          .filter(Boolean);
        if (!normalizedCommands.length) {
          throw new Error('Recorder generic info config has no runnable commands.');
        }
        return {
          id: normalizeText(config.id, 'recorder_generic_info'),
          label: normalizeText(config.label, 'Recorder generic info'),
          commands: normalizedCommands,
        };
      }

  function buildRecorderGenericInfoBundleCommand(rawConfig) {
        const config = normalizeRecorderGenericInfoConfig(rawConfig);
        const scriptLines = [
          'set +e',
          `printf '%s\\n' ${quoteRecorderShellValue(`=== ${config.label} ===`)}`,
          `printf '%s\\n' ${quoteRecorderShellValue('Read-only diagnostics for recorder and external LLM context.')}`,
          'run_block() {',
          '  local label="$1"',
          '  local timeout_sec="$2"',
          '  local command="$3"',
          `  printf '\\n===== %s =====\\n' "$label"`,
          '  timeout "${timeout_sec}s" bash -lc "$command"',
          '  local status=$?',
          '  if [ "$status" -eq 124 ]; then',
          `    printf '[timeout after %ss]\\n' "$timeout_sec"`,
          '  elif [ "$status" -ne 0 ]; then',
          `    printf '[exit %s]\\n' "$status"`,
          '  fi',
          '}',
          ...config.commands.map((entry) => (
            `run_block ${quoteRecorderShellValue(entry.label)} ${quoteRecorderShellValue(entry.timeoutSec)} ${quoteRecorderShellValue(entry.command)}`
          )),
        ];
        return `bash -lc ${quoteRecorderShellValue(scriptLines.join('\n'))}`;
      }

  async function loadRecorderGenericInfoConfig() {
        if (typeof env.loadRecorderGenericInfoConfig === 'function') {
          return normalizeRecorderGenericInfoConfig(await env.loadRecorderGenericInfoConfig());
        }
        if (!recorderGenericInfoConfigPromise) {
          const configUrl = normalizeText(RECORDER_GENERIC_INFO_CONFIG_URL, '');
          if (!configUrl) {
            throw new Error('Recorder generic info config URL is not configured.');
          }
          const fetchImpl =
            typeof env.fetch === 'function'
              ? env.fetch.bind(env)
              : typeof fetch === 'function'
                ? fetch.bind(globalThis)
                : null;
          if (!fetchImpl) {
            throw new Error('fetch is not available to load the recorder generic info config.');
          }
          recorderGenericInfoConfigPromise = fetchImpl(configUrl, { cache: 'no-store' })
            .then(async (response) => {
              if (!response?.ok) {
                throw new Error(`Unable to load recorder generic info config (${response?.status || 'unknown'}).`);
              }
              return response.json();
            })
            .then((payload) => normalizeRecorderGenericInfoConfig(payload));
        }
        return recorderGenericInfoConfigPromise;
      }

  async function resolveRecorderTerminalPresetCommand(preset) {
        const presetId = normalizeText(preset?.id, '').toLowerCase();
        if (presetId !== 'generic-info') {
          return normalizeText(preset?.command, '');
        }
        const config = await loadRecorderGenericInfoConfig();
        return buildRecorderGenericInfoBundleCommand(config);
      }

  function getRecorderTerminalPresets() {
        return PRESET_COMMANDS.filter((preset) => {
          const presetId = normalizeText(preset?.id, '').toLowerCase();
          return RECORDER_TERMINAL_PRESET_IDS.has(presetId);
        });
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
          if (!preserveDraft) {
            openNewTestDraftEntry();
            return;
          }
        }
        syncRecorderUiState();
      }

  function resetRecorderTestEntry({ target = 'mode-selector' } = {}) {
        const normalizedTarget = target === 'simple-start' ? 'simple-start' : 'mode-selector';
        state.editingTestSourceId = '';
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
        if (recorderDefinitionDescriptionInput) {
          recorderDefinitionDescriptionInput.value = '';
        }
        if (recorderRunAtConnectionInput) {
          recorderRunAtConnectionInput.checked = true;
        }
        if (recorderOwnerTagsInput) {
          recorderOwnerTagsInput.value = '';
        }
        if (recorderPlatformTagsInput) {
          recorderPlatformTagsInput.value = '';
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

  function setRecorderJsonHelpExpanded(expanded) {
        const open = Boolean(expanded);
        if (recorderJsonHelpButton) {
          recorderJsonHelpButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (recorderJsonHelpPanel) {
          recorderJsonHelpPanel.classList.toggle('hidden', !open);
          recorderJsonHelpPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
      }

  function toggleRecorderJsonHelp() {
        const expanded = recorderJsonHelpButton?.getAttribute('aria-expanded') === 'true';
        setRecorderJsonHelpExpanded(!expanded);
      }

  function setAssignmentHelpExpanded(button, panel, expanded) {
        if (!button || !panel) return;
        const open = Boolean(expanded);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.classList.toggle('hidden', !open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      }

  function initAssignmentHelpButtons() {
        if (typeof document === 'undefined' || !document?.querySelectorAll) return;
        const buttons = Array.from(document.querySelectorAll('.assignment-help-button[data-help-target]'));
        const pairs = buttons.map((button) => {
          const targetId = normalizeText(button?.dataset?.helpTarget, '');
          const panel = targetId && document.getElementById ? document.getElementById(targetId) : null;
          if (!panel) return null;
          setAssignmentHelpExpanded(button, panel, false);
          return { button, panel };
        }).filter(Boolean);

        pairs.forEach(({ button, panel }) => {
          if (button.dataset.assignmentHelpBound === 'true') return;
          button.dataset.assignmentHelpBound = 'true';
          button.addEventListener('click', () => {
            const isOpen = button.getAttribute('aria-expanded') === 'true';
            pairs.forEach((pair) => {
              if (pair.button !== button) {
                setAssignmentHelpExpanded(pair.button, pair.panel, false);
              }
            });
            setAssignmentHelpExpanded(button, panel, !isOpen);
          });
        });
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

  function getRecorderLlmPromptReadiness() {
        const transcript = getRecorderTerminalTranscript();
        const allowEmptyTranscript = Boolean(recorderSimpleTranscriptAcknowledge?.checked);
        if (!transcript && !allowEmptyTranscript) {
          return {
            ok: false,
            error: 'Recorder terminal transcript is required. Activate the recorder terminal and run "Run generic info commands" or the commands you need first.',
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
        return {
          ok: true,
          transcript,
          systemDetails,
          userRequest,
        };
      }

  function buildRecorderLlmPromptPayload({ systemDetails, userRequest, transcript }) {
        return buildRecorderLlmPromptPayloadValue({
          normalizeText,
          renderRecorderLlmPromptTemplate,
          definitionIdValue: recorderDefinitionIdInput?.value,
          exportDraftContext: state.workflowRecorder?.exportDraftContext?.bind(state.workflowRecorder),
          buildRobotContext: buildRecorderLlmRobotContext,
          buildDefinitionContext: buildRecorderLlmDefinitionContext,
          systemDetails,
          userRequest,
          transcript,
        });
      }

  function getRecorderLlmPromptBuildResult() {
        const readiness = getRecorderLlmPromptReadiness();
        if (!readiness.ok) {
          return readiness;
        }
        const { transcript, systemDetails, userRequest } = readiness;
        const payload = buildRecorderLlmPromptPayload({ systemDetails, userRequest, transcript });
        return {
          ok: true,
          payload,
          promptText: renderRecorderLlmPromptText(payload),
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
          result.ok ? 'Prompt ready. Copy it from the box in the next step and paste it into your external LLM.' : result.error,
          result.ok ? 'ok' : 'warn',
        );
        syncRecorderUiState();
        return result;
      }

  function openRecorderLlmPromptModal() {
        setRecorderMode('simple', { targetStep: 'prompt' });
        refreshRecorderLlmPromptPreview();
        recorderLlmSystemDetailsInput?.focus?.();
      }

  function stripRecorderLlmJsonWrapperNoise(rawValue) {
        return stripRecorderLlmJsonWrapperNoiseValue(rawValue);
      }

  function parseRecorderLlmImportPayload(rawValue) {
        return parseRecorderLlmImportPayloadValue(rawValue);
      }

  function validateRecorderImportedDefinition(rawDefinition) {
        return validateRecorderImportedDefinitionValue({
          normalizeText,
          inferUniformRunAtConnection,
          allowedReadKinds: RECORDER_LLM_ALLOWED_READ_KINDS,
          baseReadKinds: RECORDER_LLM_BASE_READ_KINDS,
          rawDefinition,
        });
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
        const sourceDefinitionId = normalizeText(state.editingTestSourceId, '');
        const normalizedDefinitionId = slugifyRecorderValue(definitionId, '');
        const checkIdPrefix = normalizedDefinitionId ? `${normalizedDefinitionId}__` : '';
        const recorderCheckIdsRaw = state.workflowRecorder?.getCheckIdsForDefinition?.(definitionId);
        const recorderCheckIds = Array.isArray(recorderCheckIdsRaw) ? recorderCheckIdsRaw : [];
        const sourceDefinition = Array.isArray(state.definitionsSummary?.tests)
          ? state.definitionsSummary.tests.find((item) => normalizeText(item?.id, '') === sourceDefinitionId)
          : null;
        const sourceCheckIds = Array.isArray(sourceDefinition?.checks)
          ? sourceDefinition.checks.map((check) => normalizeText(check?.id, '')).filter(Boolean)
          : [];
        const sourceCheckIdPrefix = sourceDefinitionId ? `${sourceDefinitionId}__` : '';
        const mappedTypeIds = new Set();
  
        if (checkIdPrefix || sourceDefinitionId) {
          robotTypes.forEach((typePayload) => {
            const typeId = normalizeText(typePayload?.id, '');
            if (!typeId) return;
            const testRefs = normalizeIdList(typePayload?.testRefs);
            const isMappedByRef = recorderCheckIds.length
              ? recorderCheckIds.some((checkId) => testRefs.includes(checkId))
              : testRefs.some((ref) => ref.startsWith(checkIdPrefix));
            const isMappedBySourceRef = sourceDefinitionId
              ? sourceCheckIds.length
                ? sourceCheckIds.some((checkId) => testRefs.includes(checkId))
                : testRefs.some((ref) => ref.startsWith(sourceCheckIdPrefix))
              : false;
            if (isMappedByRef || isMappedBySourceRef) {
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
        const sourceFixId = normalizeText(state.editingFixSourceId, '');

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
          const isMapped = fixRefs.includes(fixIdKey) || (sourceFixId ? fixRefs.includes(sourceFixId) : false);
  
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

  function getManageActiveOwnerProfile() {
        if (filterActiveOwner) {
          return normalizeText(filterActiveOwner.value, '').toLowerCase();
        }
        return normalizeText(state?.filter?.activeOwnerProfile, '').toLowerCase();
      }

  function matchesManageDefinitionOwnerScope(definition = {}) {
        const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
        const activeOwnerProfile = getManageActiveOwnerProfile();
        const ownerSelection = activeOwnerProfile
          ? [activeOwnerProfile, 'global']
          : ['global'];
        return ownerSelection.some((tag) => ownerTags.includes(tag));
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
          matchesManageDefinitionOwnerScope(item.definition)
          && (activeFilter === 'all'
            || (activeFilter === 'tests' && item.kind === 'test')
            || (activeFilter === 'fixes' && item.kind === 'fix')
          )
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
          return `${stepCount} step(s)`;
        }
        const checkCount = Array.isArray(definition?.checks) ? definition.checks.length : 0;
        return `${checkCount} check(s)`;
      }

  function buildManageDefinitionTagChips(definition = {}) {
        const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
        const platformTags = normalizeTagList(definition?.platformTags);
        const chips = [];
        ownerTags.forEach((tag) => {
          chips.push({ tone: 'owner', label: `owner:${tag}` });
        });
        platformTags.forEach((tag) => {
          chips.push({ tone: 'platform', label: `platform:${tag}` });
        });
        return chips;
      }

  function buildManageDefinitionExportFilename(kind, definitionId) {
        const normalizedKind = kind === 'fix' ? 'fix' : 'test';
        const baseName = slugifyRecorderValue(definitionId, normalizedKind);
        return `${baseName}.${normalizedKind}.json`;
      }

  function downloadTextFile({ fileName, textValue, mimeType = 'application/json;charset=utf-8' }) {
        const documentRef = typeof document !== 'undefined' ? document : null;
        const anchor = documentRef?.createElement?.('a');
        const urlApi = (typeof window !== 'undefined' && window?.URL)
          ? window.URL
          : (typeof globalThis !== 'undefined' ? globalThis?.URL : null);
        const BlobCtor = typeof Blob === 'function' ? Blob : null;
        if (!anchor || !BlobCtor || typeof urlApi?.createObjectURL !== 'function') {
          throw new Error('File download is unavailable in this browser.');
        }
        const payload = String(textValue ?? '');
        const blob = new BlobCtor([payload], { type: mimeType });
        const url = urlApi.createObjectURL(blob);
        try {
          anchor.href = url;
          anchor.download = normalizeText(fileName, 'definition.json');
          anchor.rel = 'noopener';
          anchor.style.display = 'none';
          documentRef?.body?.appendChild?.(anchor);
          anchor.click?.();
        } finally {
          anchor.remove?.();
          if (typeof urlApi?.revokeObjectURL === 'function') {
            if (scheduleDelay) {
              scheduleDelay(() => {
                urlApi.revokeObjectURL(url);
              }, 0);
            } else {
              urlApi.revokeObjectURL(url);
            }
          }
        }
      }

  function normalizeDefinitionExportExecute(definition = {}) {
        return (Array.isArray(definition?.execute) ? definition.execute : []).map((step) => {
          const payload = step && typeof step === 'object' ? step : {};
          return {
            ...payload,
            command: normalizeText(payload.command, ''),
          };
        });
      }

  function normalizeDefinitionExportChecks(definition = {}) {
        return (Array.isArray(definition?.checks) ? definition.checks : []).map((check, index) => {
          const payload = check && typeof check === 'object' ? check : {};
          return {
            ...payload,
            id: normalizeText(payload.id, `check_${index + 1}`),
            runAtConnection: resolveCheckRunAtConnection(payload, true),
          };
        });
      }

  function buildManageDefinitionExportPayload(item) {
        const definition = item?.definition && typeof item.definition === 'object'
          ? item.definition
          : {};
        const id = normalizeText(definition?.id, '');
        const label = normalizeText(definition?.label, id);
        const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
        const platformTags = normalizeTagList(definition?.platformTags);
        const execute = normalizeDefinitionExportExecute(definition);

        if (item?.kind === 'fix') {
          return {
            id,
            label,
            description: normalizeText(definition?.description, ''),
            enabled: definition?.enabled !== false,
            runAtConnection: Boolean(definition?.runAtConnection),
            ownerTags,
            platformTags,
            execute,
          };
        }

        return {
          id,
          label,
          description: normalizeText(definition?.description, ''),
          enabled: definition?.enabled !== false,
          mode: 'orchestrate',
          ownerTags,
          platformTags,
          execute,
          checks: normalizeDefinitionExportChecks(definition),
        };
      }

  async function exportManageDefinitionJson(item) {
        const kind = item?.kind === 'fix' ? 'fix' : 'test';
        const definitionId = normalizeText(item?.definition?.id, '');
        if (!definitionId) return '';
        const payload = buildManageDefinitionExportPayload(item);
        const serialized = JSON.stringify(payload, null, 2);
        try {
          downloadTextFile({
            fileName: buildManageDefinitionExportFilename(kind, definitionId),
            textValue: serialized,
          });
          setManageTabStatus(`Downloaded ${kind} definition '${definitionId}' JSON file.`, 'ok');
          return serialized;
        } catch (error) {
          setManageTabStatus(
            `Unable to export ${kind} definition '${definitionId}': ${error instanceof Error ? error.message : String(error)}`,
            'error',
          );
          return '';
        }
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
        const tagChips = buildManageDefinitionTagChips(definition);
        if (tagChips.length) {
          const tagsNode = document.createElement('div');
          tagsNode.className = 'manage-definition-tags';
          tagChips.forEach((tagChip) => {
            const chip = document.createElement('span');
            chip.className = `tag-chip ${tagChip.tone}`;
            chip.textContent = tagChip.label;
            tagsNode.appendChild(chip);
          });
          summary.appendChild(tagsNode);
        }

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

        const exportButton = document.createElement('button');
        exportButton.type = 'button';
        exportButton.className = 'button button-compact';
        exportButton.textContent = 'Export JSON';
        exportButton.setAttribute('aria-label', `Export ${kind} definition ${id} as JSON`);
        exportButton.addEventListener('click', async () => {
          await exportManageDefinitionJson({ kind, definition });
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

        actions.append(editButton, duplicateButton, exportButton, removeButton);
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
          const typeLabel = normalizeText(robot?.type, normalizeText(robot?.typeId, 'n/a'));
          const option = document.createElement('option');
          option.value = id;
          option.textContent = `${normalizeText(robot?.name, id)} (${typeLabel})`;
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
          ensureWorkflowRecorderInitialized();
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
          const existingTestDefinition = (Array.isArray(state.definitionsSummary?.tests) ? state.definitionsSummary.tests : [])
            .find((definition) => normalizeText(definition?.id, '') === (normalizeText(state.editingTestSourceId, '') || testId));
          const payload = {
            id: testId,
            previousId: normalizeText(state.editingTestSourceId, '') || undefined,
            label: normalizeText(manageTestLabelInput?.value, testId),
            description: normalizeText(existingTestDefinition?.description, ''),
            mode: 'orchestrate',
            enabled: true,
            ownerTags: parseTagInput(manageTestOwnerTagsInput || recorderOwnerTagsInput),
            platformTags: parseTagInput(manageTestPlatformTagsInput || recorderPlatformTagsInput),
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
          state.editingTestSourceId = testId;
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
            state.editingTestSourceId = '';
            state.workflowRecorder?.reset?.();
            clearRecorderOutputForm();
            clearRecorderReadForm();
            if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = '';
            if (recorderDefinitionLabelInput) recorderDefinitionLabelInput.value = '';
            if (recorderDefinitionDescriptionInput) recorderDefinitionDescriptionInput.value = '';
            if (recorderOwnerTagsInput) recorderOwnerTagsInput.value = '';
            if (recorderPlatformTagsInput) recorderPlatformTagsInput.value = '';
            renderRecorderRobotTypeTargets();
          }
          if (manageTestIdInput && normalizeText(manageTestIdInput.value, '') === testId) manageTestIdInput.value = '';
          if (manageTestLabelInput) manageTestLabelInput.value = '';
          if (manageTestExecuteJsonInput) manageTestExecuteJsonInput.value = '';
          if (manageTestChecksJsonInput) manageTestChecksJsonInput.value = '';
          if (manageTestRunAtConnectionInput) manageTestRunAtConnectionInput.checked = true;
          if (manageTestOwnerTagsInput) manageTestOwnerTagsInput.value = '';
          if (manageTestPlatformTagsInput) manageTestPlatformTagsInput.value = '';
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
          const payload = {
            id: fixId,
            previousId: normalizeText(state.editingFixSourceId, '') || undefined,
            label: normalizeText(manageFixLabelInput?.value, fixId),
            description: normalizeText(manageFixDescriptionInput?.value, ''),
            enabled: true,
            runAtConnection: Boolean(manageFixRunAtConnectionInput?.checked),
            ownerTags: parseTagInput(manageFixOwnerTagsInput),
            platformTags: parseTagInput(manageFixPlatformTagsInput),
            execute,
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
          state.editingFixSourceId = fixId;
          state.definitionsSummary = normalizeDefinitionsSummary(
            mappingResult?.summary || body?.summary || body,
          );
          renderManageDefinitions();
          const refreshed = await refreshRobotsFromBackendSnapshot();
          setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}' and updated mappings.`, 'ok');
          void playPublishSuccessCelebration().catch(() => {});
          resetManageFixEntryForNextDraft();
          setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}'. Ready for a new fix draft.`, 'ok');
          if (refreshed) {
            setManageTabStatus(`Saved fix definition '${fixId}'. Fix editor cleared for a new draft.`, 'ok');
          } else {
            setManageTabStatus(
              `Saved fix definition '${fixId}'. Fix editor cleared for a new draft; backend snapshot refresh will catch up automatically.`,
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
          state.editingFixSourceId = '';
          if (manageFixLabelInput) manageFixLabelInput.value = '';
          if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
          if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
          if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
          if (manageFixOwnerTagsInput) manageFixOwnerTagsInput.value = '';
          if (manageFixPlatformTagsInput) manageFixPlatformTagsInput.value = '';
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
        state.editingFixSourceId = '';
        if (manageFixIdInput) manageFixIdInput.value = '';
        if (manageFixLabelInput) manageFixLabelInput.value = '';
        if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
        if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
        if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
        if (manageFixOwnerTagsInput) manageFixOwnerTagsInput.value = '';
        if (manageFixPlatformTagsInput) manageFixPlatformTagsInput.value = '';
        if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
        if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
        setManageEditorStatus(manageFixEditorStatus, '', '');
      }

  function setPublishSuccessCelebrationVisible(visible) {
        if (!publishSuccessCelebration) return;
        publishSuccessCelebration.classList.toggle('hidden', !visible);
        publishSuccessCelebration.setAttribute('aria-hidden', visible ? 'false' : 'true');
      }

  function resetPublishSuccessCelebration() {
        if (publishSuccessCelebrationVideo) {
          try {
            publishSuccessCelebrationVideo.pause?.();
          } catch (_error) {}
          try {
            publishSuccessCelebrationVideo.currentTime = 0;
          } catch (_error) {}
        }
        setPublishSuccessCelebrationVisible(false);
      }

  function ensurePublishSuccessCelebrationMediaLoaded() {
        if (!publishSuccessCelebrationVideo) return;
        const source = publishSuccessCelebrationVideo.querySelector?.('source[data-src]');
        if (!source) return;
        const currentSrc = normalizeText(source.getAttribute('src'), '');
        const nextSrc = normalizeText(source.getAttribute('data-src'), '');
        if (!currentSrc && nextSrc) {
          source.setAttribute('src', nextSrc);
          publishSuccessCelebrationVideo.load?.();
        }
      }

  async function playPublishSuccessCelebration() {
        if (!publishSuccessCelebration || !publishSuccessCelebrationVideo) return;
        ensurePublishSuccessCelebrationMediaLoaded();
        await new Promise((resolve) => {
          let settled = false;
          let timeoutId = null;
          const finish = () => {
            if (settled) return;
            settled = true;
            if (timeoutId !== null && cancelDelay) {
              cancelDelay(timeoutId);
            }
            publishSuccessCelebrationVideo.removeEventListener?.('ended', finish);
            publishSuccessCelebrationVideo.removeEventListener?.('error', finish);
            resetPublishSuccessCelebration();
            resolve();
          };

          setPublishSuccessCelebrationVisible(true);
          try {
            publishSuccessCelebrationVideo.pause?.();
          } catch (_error) {}
          try {
            publishSuccessCelebrationVideo.currentTime = 0;
          } catch (_error) {}

          publishSuccessCelebrationVideo.addEventListener?.('ended', finish);
          publishSuccessCelebrationVideo.addEventListener?.('error', finish);

          const durationMs = Number.isFinite(Number(publishSuccessCelebrationVideo.duration))
            && Number(publishSuccessCelebrationVideo.duration) > 0
            ? Math.ceil(Number(publishSuccessCelebrationVideo.duration) * 1000) + 150
            : PUBLISH_SUCCESS_CELEBRATION_FALLBACK_MS;
          if (scheduleDelay) {
            timeoutId = scheduleDelay(finish, durationMs);
          }

          try {
            const playResult = publishSuccessCelebrationVideo.play?.();
            if (playResult && typeof playResult.catch === 'function') {
              playResult.catch(() => {});
            }
          } catch (_error) {}

          if (!scheduleDelay) {
            finish();
          }
        });
      }

  function resetManageFixEntryForNextDraft() {
        clearManageFixEditor();
        setFlowEditorMode('fix', { announce: false });
        setActiveManageTab('recorder', { syncHash: true, persist: true });
        renderFixRobotTypeTargets('');
        clearCheckedMappings(manageFixRobotTypeTargets);
      }

  function loadExistingTestIntoRecorder(testDefinition) {
        if (!state.workflowRecorder || !testDefinition) return;
        const definitionId = normalizeText(testDefinition?.id, '');
        const definitionLabel = normalizeText(testDefinition?.label, definitionId);
        state.editingTestSourceId = definitionId;
        setFlowEditorMode('test', { announce: false });
        setRecorderLlmHelpExpanded(false);
        resetRecorderLlmImportState();
        state.workflowRecorder.loadTestDefinition(testDefinition);
        clearRecorderOutputForm();
        clearRecorderReadForm();
        if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = definitionId;
        if (recorderDefinitionLabelInput) recorderDefinitionLabelInput.value = definitionLabel;
        if (recorderDefinitionDescriptionInput) {
          recorderDefinitionDescriptionInput.value = normalizeText(testDefinition?.description, '');
        }
        if (recorderRunAtConnectionInput) {
          const uniform = inferUniformRunAtConnection(Array.isArray(testDefinition?.checks) ? testDefinition.checks : [], true);
          recorderRunAtConnectionInput.checked = uniform !== null ? uniform : true;
        }
        if (recorderOwnerTagsInput) {
          recorderOwnerTagsInput.value = formatTagInputValue(testDefinition?.ownerTags, {
            ownerDefault: true,
            hideGlobalDefault: true,
          });
        }
        if (recorderPlatformTagsInput) {
          recorderPlatformTagsInput.value = formatTagInputValue(testDefinition?.platformTags);
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
        state.editingFixSourceId = duplicate ? '' : sourceId;
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
        if (manageFixRunAtConnectionInput) {
          manageFixRunAtConnectionInput.checked = Boolean(fixDefinition?.runAtConnection);
        }
        if (manageFixOwnerTagsInput) {
          manageFixOwnerTagsInput.value = formatTagInputValue(fixDefinition?.ownerTags, {
            ownerDefault: true,
            hideGlobalDefault: true,
          });
        }
        if (manageFixPlatformTagsInput) {
          manageFixPlatformTagsInput.value = formatTagInputValue(fixDefinition?.platformTags);
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
        state.editingTestSourceId = '';
        if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = nextId;
        if (recorderDefinitionLabelInput) {
          recorderDefinitionLabelInput.value = `${normalizeText(testDefinition?.label, sourceId)} Copy`;
        }
        if (recorderDefinitionDescriptionInput) {
          recorderDefinitionDescriptionInput.value = normalizeText(testDefinition?.description, '');
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

  function openNewTestDraftEntry() {
        resetRecorderTestEntry({ target: 'mode-selector' });
        state.recorderMode = 'advanced';
        state.recorderSimpleStep = 'select-robot';
        state.workflowRecorder?.setStatus?.(RECORDER_START_DISABLED_TOOLTIP, 'warn');
        setManageTabStatus('Enter Definition ID and Label to enable draft creation.', 'ok');
        syncRecorderUiState();
      }

  function startNewTestDraft() {
        if (!state.workflowRecorder) return;
        if (!isRecorderMetadataReady()) {
          state.workflowRecorder.setStatus(RECORDER_START_DISABLED_TOOLTIP, 'warn');
          syncRecorderUiState();
          return;
        }
        state.editingTestSourceId = '';
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
        if (recorderDefinitionIdInput && !normalizeText(recorderDefinitionIdInput.value, '')) {
          recorderDefinitionIdInput.value = suggestedId;
        }
        if (recorderDefinitionLabelInput && !normalizeText(recorderDefinitionLabelInput.value, '')) {
          recorderDefinitionLabelInput.value = robotIdValue ? `Flow workflow (${robotIdValue})` : 'Recorded workflow';
        }
        if (recorderDefinitionDescriptionInput && !normalizeText(recorderDefinitionDescriptionInput.value, '')) {
          recorderDefinitionDescriptionInput.value = '';
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
        syncRecorderUiState();
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
        const metadataReady = isRecorderMetadataReady();
        const transcriptReady = normalizeText(getRecorderTerminalTranscript(), '') !== '';
        const transcriptBypass = Boolean(recorderSimpleTranscriptAcknowledge?.checked);
        const promptReady = getRecorderLlmPromptReadiness().ok;
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
            label: 'Start creation of new test',
            disabled: !recorderState.started && !metadataReady,
            title: !recorderState.started && !metadataReady ? RECORDER_START_DISABLED_TOOLTIP : '',
          });
          setRecorderButtonTooltip(
            recorderCreateNewTestButton,
            !recorderState.started && !metadataReady ? RECORDER_START_DISABLED_TOOLTIP : '',
          );
        }
        if (recorderRunCaptureButton) {
          setRecorderButtonDisabledState(
            recorderRunCaptureButton,
            !(recorderState.started && robotSelected && commandReady),
            !recorderState.started ? RECORDER_NOT_STARTED_TOOLTIP : '',
          );
        }
        if (recorderAddOutputBtn) {
          setRecorderButtonDisabledState(
            recorderAddOutputBtn,
            !recorderState.started,
            !recorderState.started ? RECORDER_NOT_STARTED_TOOLTIP : '',
          );
        }
        if (recorderAddWriteBtn) {
          setRecorderButtonDisabledState(
            recorderAddWriteBtn,
            !recorderState.started,
            !recorderState.started ? RECORDER_NOT_STARTED_TOOLTIP : '',
          );
        }
        if (recorderAddReadBtn) {
          const readDisabled = !(
            recorderState.started
            && Number(recorderState.outputCount || 0) > 0
            && Number(recorderState.writeCount || 0) > 0
          );
          setRecorderButtonDisabledState(
            recorderAddReadBtn,
            readDisabled,
            !recorderState.started ? RECORDER_NOT_STARTED_TOOLTIP : '',
          );
        }
        if (recorderPublishTestButton) {
          applyActionButton(recorderPublishTestButton, {
            intent: 'create',
            label: 'Publish test',
            disabled: !recorderState.publishReady,
          });
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
        const showStartDraft = showTopbar && showAdvanced && !recorderState.started;
        const showPublishTest = showTopbar && recorderState.started;
        if (recorderSharedTopbar) {
          recorderSharedTopbar.classList.toggle('hidden', !showTopbar);
        }
        if (recorderTopbarNewDraftWrap) {
          recorderTopbarNewDraftWrap.classList.toggle('hidden', !showStartDraft);
        }
        if (recorderTopbarRobotWrap) {
          recorderTopbarRobotWrap.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'select-robot')));
        }
        if (recorderTopbarDefinitionWrap) {
          recorderTopbarDefinitionWrap.classList.toggle('hidden', !(showAdvanced || (showSimple && simpleStep === 'publish')));
        }
        if (recorderTopbarPublishWrap) {
          recorderTopbarPublishWrap.classList.toggle('hidden', !showPublishTest);
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
        if (recorderSimplePromptNextButton) {
          recorderSimplePromptNextButton.disabled = !promptReady;
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
          state.workflowRecorder.setStatus(RECORDER_NOT_STARTED_TOOLTIP, 'warn');
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
            await state.recorderTerminalComponent?.connect(robot, getRecorderTerminalPresets());
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
            description: normalizeText(recorderDefinitionDescriptionInput?.value, ''),
          });
          definition.checks = applyRunAtConnection(
            definition.checks,
            getRecorderRunAtConnectionDefault(),
          );
          definition.ownerTags = parseTagInput(recorderOwnerTagsInput);
          definition.platformTags = parseTagInput(recorderPlatformTagsInput);
  
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
          void playPublishSuccessCelebration().catch(() => {});
          resetRecorderTestEntry({ target: 'mode-selector' });
          setManageTabStatus('Recorder test published. Choose a mode to start again.', 'ok');
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
          openNewTestDraftEntry();
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

  function ensureWorkflowRecorderInitialized() {
        if (state.isWorkflowRecorderUiInitialized) return;
        initWorkflowRecorder();
      }

  function initWorkflowRecorder() {
        if (state.isWorkflowRecorderUiInitialized) return;
        if (!state.workflowRecorder && typeof WorkflowRecorderComponent === 'function') {
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
        }
        state.workflowRecorder?.render?.();
        if (recorderRunAtConnectionInput) {
          recorderRunAtConnectionInput.checked = Boolean(recorderRunAtConnectionInput.checked);
        }
  
        if (typeof RobotTerminalComponent === 'function') {
          try {
            state.recorderTerminalComponent = new RobotTerminalComponent({
              terminalElement: recorderTerminalDisplay,
              toolbarElement: recorderTerminalToolbar,
              badgeElement: recorderTerminalBadge,
              hintElement: recorderTerminalHint,
              terminalCtor: window.Terminal,
              fitAddonCtor: window.FitAddon ? window.FitAddon.FitAddon : null,
              endpointBuilder: (robotId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal`),
              resolvePresetCommand: resolveRecorderTerminalPresetCommand,
              onPresetLaunch: (preset) => {
                if (normalizeText(preset?.id, '').toLowerCase() === 'generic-info') {
                  state.workflowRecorder?.setStatus?.(
                    'Running generic info bundle. Let it finish, then add any robot-specific commands you still need.',
                    'warn',
                  );
                }
              },
              onTranscriptChange: () => {
                syncRecorderUiState();
              },
            });
          } catch (error) {
            console.warn('Recorder terminal init failed', error);
          }
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
          state.recorderTerminalComponent?.connect(robot, getRecorderTerminalPresets());
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
        recorderSimplePromptNextButton?.addEventListener('click', () => {
          const result = refreshRecorderLlmPromptPreview();
          if (result.ok) {
            setRecorderSimpleStep('import');
          }
        });
        recorderSimpleImportBackButton?.addEventListener('click', () => {
          setRecorderSimpleStep('prompt');
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
        recorderJsonHelpButton?.addEventListener('click', () => {
          toggleRecorderJsonHelp();
        });
        recorderPasteLlmResultButton?.addEventListener('click', () => {
          openRecorderLlmImportModal();
        });
        recorderLlmPromptCancelButton?.addEventListener('click', () => {
          closeRecorderLlmPromptModal();
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
        recorderDefinitionLabelInput?.addEventListener('input', () => {
          syncRecorderUiState();
        });
        clearRecorderOutputForm();
        clearRecorderReadForm();
        setRecorderLlmHelpExpanded(false);
        setRecorderJsonHelpExpanded(false);
        initAssignmentHelpButtons();
        resetRecorderLlmImportState({ clearInput: true });
        if (recorderLlmPromptPreview) recorderLlmPromptPreview.value = '';
        setRecorderLlmStatus(recorderLlmPromptStatus, '', '');
        state.recorderSimplePromptBundle = '';
        setManageDefinitionsFilter(state.manageDefinitionsFilter || 'all');
        setFlowEditorMode(state.manageFlowEditorMode || 'test', { announce: false });
        state.isWorkflowRecorderUiInitialized = true;
        syncRecorderUiState();
      }

  function onFilterChange() {
        state.filter.name = $('#searchName').value;
        state.filter.type = filterType.value;
        state.filter.error = filterError.value;
        const activeOwnerProfile = normalizeText(filterActiveOwner?.value, '').toLowerCase();
        const selectedOwnerTags = filterOwnerTags
          ? Array.from(filterOwnerTags.selectedOptions || []).map((option) => normalizeText(option?.value, '').toLowerCase()).filter(Boolean)
          : [];
        state.filter.ownerTags = selectedOwnerTags.length
          ? selectedOwnerTags
          : (activeOwnerProfile ? [activeOwnerProfile] : []);
        state.filter.platformTags = filterPlatformTags
          ? Array.from(filterPlatformTags.selectedOptions || []).map((option) => normalizeText(option?.value, '').toLowerCase()).filter(Boolean)
          : [];
        state.filter.activeOwnerProfile = activeOwnerProfile;
        try {
          if (ACTIVE_OWNER_PROFILE_STORAGE_KEY) {
            window?.localStorage?.setItem(ACTIVE_OWNER_PROFILE_STORAGE_KEY, state.filter.activeOwnerProfile);
          }
        } catch (_error) {
          // Ignore localStorage write failures and keep runtime state in-memory.
        }
        if (filterRenderDebounceTimer) {
          window.clearTimeout(filterRenderDebounceTimer);
        }
        filterRenderDebounceTimer = window.setTimeout(() => {
          filterRenderDebounceTimer = null;
          if (filterRenderRaf !== null) {
            window.cancelAnimationFrame(filterRenderRaf);
          }
          filterRenderRaf = window.requestAnimationFrame(() => {
            filterRenderRaf = null;
            renderDashboard();
            if (detail?.classList?.contains?.('active') && state.detailRobotId) {
              const activeRobot = getRobotById(state.detailRobotId);
              if (activeRobot) {
                renderDetail(activeRobot);
              }
            }
          });
        }, 90);
      }

  return {
    init() {},
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
    buildManageDefinitionExportPayload,
    exportManageDefinitionJson,
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
    setRecorderJsonHelpExpanded,
    toggleRecorderJsonHelp,
    buildRecorderLlmPromptPayload,
    getRecorderLlmPromptBuildResult,
    refreshRecorderLlmPromptPreview,
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
