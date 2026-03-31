import { createDataInitRuntimeBridge } from '../domain/dataInitRuntimeBridge.js';

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

  const {
    addRecorderOutputVisual,
    addRecorderReadVisual,
    addRobotIdsToSelection,
    appendTerminalLine,
    appendTerminalPayload,
    applyDashboardMetaFromVisible,
    applyFilters,
    applyMonitorConfig,
    applyMonitorConfigFromPayload,
    applyRecorderMappings,
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
    clearRecorderOutputForm,
    clearRecorderReadForm,
    closeBugReportModal,
    closeRecorderTerminalSession,
    closeTerminalSession,
    closeTestDebugModal,
    createRobotFromForm,
    createRobotTypeFromForm,
    cycleOnlineSortMode,
    deleteManageFixDefinition,
    deleteManageTestDefinition,
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
    getSelectedMappingTypeIds,
    getSelectedRecorderTypeIds,
    getSelectedRobotIds,
    getStatusChipTone,
    getTestIconPresentation,
    getTestingCountdownText,
    getTimestamp,
    getVisibleOfflineRobotIds,
    getVisibleOnlineRobotIds,
    hideRecorderReadPopover,
    initAddRobotPasswordToggle,
    initFleetParallelism,
    initManageTabs,
    initMonitorConfigControls,
    initRobotRegistryPanels,
    initRobotOverrideControls,
    initRobotTerminal,
    initRobotTypeUploadInputs,
    initThemeControls,
    initWorkflowRecorder,
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
    loadDefinitionsSummary,
    loadMonitorConfig,
    mapRobots,
    nonBatteryTestEntries,
    normalizeAutoFixDefinition,
    normalizeBatteryPercentForSort,
    normalizeBatteryReason,
    normalizeCheckedAtMs,
    normalizeCountdownMs,
    normalizeDefinitionsSummary,
    normalizeIdList,
    normalizeManageTab,
    normalizePossibleResult,
    normalizeRobotActivity,
    normalizeRobotData,
    normalizeRobotTests,
    normalizeRobotTypeConfig,
    normalizeStepDebug,
    normalizeTestDebugCollection,
    normalizeTestDebugResult,
    normalizeTestDefinition,
    onFilterChange,
    onlineRobotComparator,
    openBugReportModal,
    openDetail,
    openTestDebugModal,
    parseJsonInput,
    parseManageRoute,
    patchDetailRuntimeContent,
    patchRobotTypeMapping,
    persistManageTab,
    populateAddRobotTypeOptions,
    populateEditRobotTypeOptions,
    populateEditRobotSelectOptions,
    populateFilters,
    publishRecorderAsTest,
    queryCardByRobotId,
    readRobotField,
    rebuildRobotIndex,
    reconcileLoadedRobotDefinitions,
    refreshRobotsFromBackendSnapshot,
    refreshTestingCountdowns,
    removeRobotIdsFromSelection,
    renderCard,
    renderDashboard,
    renderDetail,
    renderFixModeActionsForContext,
    renderFixRobotTypeTargets,
    renderManageDefinitions,
    renderManageFixesList,
    renderManageTestsList,
    renderRecorderRobotOptions,
    renderRecorderRobotTypeTargets,
    renderTestRobotTypeTargets,
    resolveManageTab,
    resolveRobotModelUrl,
    robotId,
    robotModelMarkup,
    runAutoFixCandidate,
    runAutoFixForRobot,
    runFallbackChecks,
    runFallbackCommandSimulation,
    runManualTests,
    runOneRobotOnlineCheck,
    runOnlineCheckForAllRobots,
    runRecorderCommandAndCapture,
    runRobotTestsForRobot,
    saveManageFixDefinition,
    saveManageTestDefinition,
    saveRobotEditsFromForm,
    saveRobotTypeEditsFromForm,
    scheduleMonitorParallelismSync,
    selectAllOfflineRobots,
    selectAllOnlineRobots,
    selectAllRobots,
    selectRobotIds,
    setActiveManageTab,
    setAddRobotMessage,
    setEditRobotMessage,
    setEditRobotTypeMessage,
    setAddRobotPasswordVisibility,
    setBugReportStatus,
    setFixModeStatus,
    setFleetOnlineButtonIdleLabel,
    setFleetOnlineButtonState,
    setFleetParallelism,
    setLocationHash,
    setManageEditorStatus,
    setManageTabStatus,
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
    slugifyRecorderValue,
    sortOnlineRobots,
    startOnlineRefreshStatusTimer,
    startTestingCountdowns,
    statusChip,
    statusFromScore,
    statusSortRank,
    stopOnlineRefreshStatusTimer,
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
    syncRecorderReadKindFields,
    syncRecorderReadPopoverVisibility,
    syncRecorderUiState,
    syncRunSelectedButtonLabel,
    syncSectionToggleButtons,
    syncSelectionUi,
    toggleFixMode,
    updateCardRuntimeContent,
    updateFixMappings,
    updateFleetOnlineRefreshStatus,
    updateFleetOnlineSummary,
    updateKPIs,
    updateOnlineCheckEstimateFromResults,
    updateRobotTestState,
    updateSelectionSummary,
    updateTestMappings,
    deleteSelectedRobotFromForm,
    deleteSelectedRobotTypeFromForm,
    fillEditRobotForm,
  } = createDataInitRuntimeBridge(runtime);

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
