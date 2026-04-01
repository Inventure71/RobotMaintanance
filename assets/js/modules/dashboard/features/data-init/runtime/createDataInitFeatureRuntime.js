import { createDataInitRuntimeApi } from '../domain/createDataInitRuntimeApi.js';

export function createDataInitFeature(context, maybeEnv) {
  const runtime = maybeEnv ? context : context?.bridge || context?.runtime || context?.services || {};
  const env = maybeEnv || context?.env || context;
    const {
    $, $$, CAN_USE_MODEL_VIEWER, DEFAULT_ROBOT_MODEL_URL, DEFAULT_TEST_DEFINITIONS, DETAIL_TERMINAL_PRESET_IDS,
    FIX_MODE_CONTEXT_DASHBOARD, FIX_MODE_CONTEXT_DETAIL, FLEET_PARALLELISM_DEFAULT, FLEET_PARALLELISM_MAX,
    FLEET_PARALLELISM_MIN, FLEET_PARALLELISM_STORAGE_KEY, FLEET_RUNTIME_ENDPOINT, FLEET_STATIC_ENDPOINT,
    FORCE_TEXT_TEST_ICONS, LOW_BATTERY_WARNING_PERCENT, MANAGE_TABS, MANAGE_TAB_STORAGE_KEY, MANAGE_VIEW_HASH,
    MODAL_SCROLL_LOCK_CLASS, MONITOR_BATTERY_INTERVAL_DEFAULT_SEC, MONITOR_BATTERY_INTERVAL_MAX_SEC,
    MONITOR_BATTERY_INTERVAL_MIN_SEC, MONITOR_MODE_ONLINE_BATTERY, MONITOR_MODE_ONLINE_BATTERY_TOPICS,
    MONITOR_ONLINE_INTERVAL_DEFAULT_SEC, MONITOR_ONLINE_INTERVAL_MAX_SEC, MONITOR_ONLINE_INTERVAL_MIN_SEC, MONITOR_SOURCE,
    MONITOR_TOPICS_INTERVAL_DEFAULT_SEC, MONITOR_TOPICS_INTERVAL_MAX_SEC, MONITOR_TOPICS_INTERVAL_MIN_SEC,
    MONITOR_TOPICS_SOURCE, ONLINE_CHECK_ESTIMATE_ALPHA, ONLINE_CHECK_TIMEOUT_MS, ONLINE_CHECK_UI_BUFFER_MS,
    ONLINE_CHECK_UI_MAX_MS, ONLINE_CHECK_UI_MIN_MS, ONLINE_SORT_BATTERY, ONLINE_SORT_LABELS, ONLINE_SORT_NAME,
    ONLINE_SORT_ORDER, ONLINE_SORT_STATUS, PRESET_COMMANDS, ROBOTS_CONFIG_URL, ROBOT_TYPES, ROBOT_TYPES_CONFIG_URL,
    ROBOT_TYPE_BY_ID, RUNTIME_ALLOWED_SOURCES, RUNTIME_SYNC_INTERVAL_MS, RobotTerminalComponent, TEST_COUNTDOWN_MAX_SECONDS,
    TEST_COUNTDOWN_MIN_SECONDS, TEST_COUNTDOWN_MODE_LABELS, TEST_COUNTDOWN_TICK_MS, TEST_COUNTDOWN_WARNING_TEXT,
    TEST_DEFINITIONS, TEST_ICON_TEXT_FALLBACKS, TEST_STEP_TIMEOUT_MS, WorkflowRecorderComponent,
    activateRecorderTerminalButton, activateTerminalButton, addRobotForm, addRobotMessage, addRobotPasswordInput,
    addRobotPasswordToggle, addRobotSavingHint, addRobotTypeForm, addRobotSection, addRobotTypeSelect,
    editRobotTypeDeleteButton, editRobotTypeForm, editRobotTypeManageSelect, applyActionButton, bugReportMessageInput,
    bugReportModal, bugReportStatus, buildApiUrl, cancelBugReportButton, createActionButton, createPageSessionId,
    cycleOnlineSortButton, dashboard, dashboardFixModeActions, dashboardFixModePanel, dashboardFixModeStatus,
    dashboardFixModeSummary, detail, editRobotDeleteButton, editRobotForm, editRobotSelect, detailFixModeActions,
    detailFixModePanel, detailFixModeStatus, detailFixModeSummary, detailTerminalShell, emptyState, filterError,
    filterActiveOwner, filterOwnerTags, filterPlatformTags, filterType, hydrateActionButtons, initThemeSwitcher,
    initVisualFlows, manageDeleteFixButton, manageDeleteTestButton, manageFixDescriptionInput, manageFixEditorForm,
    manageFixEditorStatus, manageFixExecuteJsonInput, manageFixIdInput, manageFixLabelInput, manageFixRobotTypeTargets,
    manageFixesList, manageTabButtons, manageTabPanels, manageTabStatus, manageTestChecksJsonInput, manageTestEditorForm,
    manageTestEditorStatus, manageTestExecuteJsonInput, manageTestIdInput, manageTestLabelInput, manageTestRobotTypeTargets,
    manageTestsList, monitorApplyButton, monitorConfigStatus, monitorModeSelect, monitorTopicsIntervalInput, normalizeStatus,
    normalizeText, normalizeTypeId, offlineGrid, offlineSectionTitle, onlineGrid, onlineSectionTitle, recorderAddOutputBtn,
    recorderAddReadBtn, recorderCheckCountBadge, recorderCommandInput, recorderCreateNewTestButton, recorderDefinitionIdInput,
    recorderDefinitionLabelInput, recorderFlowBlocks, recorderLastEditingOutputKey, recorderLastEditingReadBlockId,
    recorderOutputCountBadge, recorderOutputFailDetailsInput, recorderOutputIconInput, recorderOutputKeyInput,
    recorderOutputLabelInput, recorderOutputPassDetailsInput, recorderOutputs, recorderPublishStatus,
    recorderPublishTestButton, recorderReadInputRefSelect, recorderReadKindSelect, recorderReadLinesInput,
    recorderReadNeedleInput, recorderReadNeedlesInput, recorderReadOutputKeySelect, recorderReadRequireAllInput,
    recorderRobotSelect, recorderRunCaptureButton, recorderStateBadge, recorderStatus, recorderStepCountBadge,
    recorderTerminalActivationOverlay, recorderTerminalBadge, recorderTerminalDisplay, recorderTerminalHint,
    recorderTerminalPopReadBtn, recorderTerminalShell, recorderTerminalToolbar, renderBatteryPill, robotRegistryPanelButtons,
    robotRegistryPanels, setActionButtonLoading, state, submitBugReportButton, terminal, terminalBadge, terminalHint,
    terminalToolbar, testDebugBody, testDebugClose, testDebugModal, testDebugSummary, testDebugTitle, themeSelect,
    toggleDashboardFixModeButton, toggleDetailFixModeButton,
  } = env;

  const {
    addRecorderOutputVisual,
    addRecorderReadVisual, addRobotIdsToSelection, appendTerminalLine, appendTerminalPayload, applyDashboardMetaFromVisible,
    applyFilters, applyMonitorConfig, applyMonitorConfigFromPayload, applyRecorderMappings, applyRuntimeRobotPatches,
    areAllRobotIdsSelected, batteryReasonText, buildConnectionCornerIconMarkup, buildFixButtonLabel,
    buildGlobalTestDefinitions, buildLastFullTestPillLabel, buildManageHash, buildRobotModelContainer, buildRobotModelMarkup,
    buildScanOverlayMarkup, buildTestPreviewText, buildTestPreviewTextForResult, clampFleetParallelism,
    clampMonitorBatteryInterval, clampMonitorOnlineInterval, clampMonitorTopicsInterval, clampOnlineCountdownMs,
    clearRecorderOutputForm, clearRecorderReadForm, closeBugReportModal, closeRecorderTerminalSession, closeTerminalSession,
    closeTestDebugModal, createRobotFromForm, createRobotTypeFromForm, cycleOnlineSortMode, deleteManageFixDefinition,
    deleteManageTestDefinition, estimateTestCountdownMsFromBody, formatConsoleLine, formatDurationMs, formatEpochSeconds,
    formatLastFullTestTimestamp, formatRawOutput, formatTestValue, getAutoFixesForType, getConfiguredDefaultTestIds,
    getCountdownLabel, getCountdownNodes, getDashboardFixCandidates, getDefinitionLabel, getDetailFixCandidates,
    getDetailTerminalPresets, getFallbackTestIconText, getFixModeElements, getFleetParallelism, getMonitorBatteryIntervalMs,
    getMonitorOnlineIntervalMs, getMonitorTopicsIntervalMs, getOnlineCheckCountdownMs, getPersistedManageTab,
    getReachableRobotIds, getRobotById, getRobotDefinitionsForType, getRobotIdsForRun, getRobotTypeConfig,
    getRunSelectedButtonIdleLabel, getSelectedMappingTypeIds, getSelectedRecorderTypeIds, getSelectedRobotIds,
    getStatusChipTone, getTestIconPresentation, getTestingCountdownText, getTimestamp, getVisibleOfflineRobotIds,
    getVisibleOnlineRobotIds, hideRecorderReadPopover, initAddRobotPasswordToggle, initFleetParallelism, initManageTabs,
    initMonitorConfigControls, initRobotRegistryPanels, initRobotOverrideControls, initRobotTerminal,
    initRobotTypeUploadInputs, initThemeControls, initWorkflowRecorder, invalidateCountdownNodeCache, isManageViewActive,
    isRobotAutoSearching, isRobotBusyForOnlineRefresh, isRobotFixing, isRobotSearching, isRobotSelected, isRobotTesting,
    isTopicsMonitorMode, issueSummary, loadDefinitionsSummary, loadMonitorConfig, mapRobots, nonBatteryTestEntries,
    normalizeAutoFixDefinition, normalizeBatteryPercentForSort, normalizeBatteryReason, normalizeCheckedAtMs,
    normalizeCountdownMs, normalizeDefinitionsSummary, normalizeIdList, normalizeManageTab, normalizePossibleResult,
    normalizeRobotActivity, normalizeRobotData, normalizeRobotTests, normalizeRobotTypeConfig, normalizeStepDebug,
    normalizeTestDebugCollection, normalizeTestDebugResult, normalizeTestDefinition, onFilterChange, onlineRobotComparator,
    openBugReportModal, openDetail, openTestDebugModal, parseJsonInput, parseManageRoute, patchDetailRuntimeContent,
    patchRobotTypeMapping, persistManageTab, populateAddRobotTypeOptions, populateEditRobotTypeOptions,
    populateEditRobotSelectOptions, populateFilters, publishRecorderAsTest, queryCardByRobotId, readRobotField,
    rebuildRobotIndex, reconcileLoadedRobotDefinitions, refreshRobotsFromBackendSnapshot, refreshTestingCountdowns,
    removeRobotIdsFromSelection, renderCard, renderDashboard, renderDetail, renderFixModeActionsForContext,
    renderFixRobotTypeTargets, renderManageDefinitions, renderManageFixesList, renderManageTestsList,
    renderRecorderRobotOptions, renderRecorderRobotTypeTargets, renderTestRobotTypeTargets, resolveManageTab,
    resolveRobotModelUrl, robotId, robotModelMarkup, runAutoFixCandidate, runAutoFixForRobot, runFallbackChecks,
    runFallbackCommandSimulation, runManualTests, runOneRobotOnlineCheck, runOnlineCheckForAllRobots,
    runRecorderCommandAndCapture, runRobotTestsForRobot, saveManageFixDefinition, saveManageTestDefinition,
    saveRobotEditsFromForm, saveRobotTypeEditsFromForm, scheduleMonitorParallelismSync, selectAllOfflineRobots,
    selectAllOnlineRobots, selectAllRobots, selectRobotIds, setActiveManageTab, setAddRobotMessage, setEditRobotMessage,
    setEditRobotTypeMessage, setAddRobotPasswordVisibility, setBugReportStatus, setFixModeStatus,
    setFleetOnlineButtonIdleLabel, setFleetOnlineButtonState, setFleetParallelism, setLocationHash, setManageEditorStatus,
    setManageTabStatus, setModelContainerFaultClasses, setMonitorConfigStatus, setRecorderTerminalActive, setRobotFixing,
    setRobotSearching, setRobotSearchingBulk, setRobotSelection, setRobotTesting, setRobotTypeDefinitions, setRobots,
    setRunningButtonState, setTerminalActive, setTerminalInactive, shouldUseCompactAutoSearchIndicator, showAddRobotPage,
    showDashboard, slugifyRecorderValue, sortOnlineRobots, startOnlineRefreshStatusTimer, startTestingCountdowns, statusChip,
    statusFromScore, statusSortRank, stopOnlineRefreshStatusTimer, stopTestingCountdowns, submitBugReport,
    syncAutoMonitorRefreshState, syncAutomatedRobotActivityFromState, syncFixModePanels, syncFixModeToggleButton,
    syncFleetParallelismUi, syncGlobalSelectionButton, syncModalScrollLock, syncModelViewerRotationForContainer,
    syncMonitorConfigUi, syncMonitorParallelismWithFleet, syncOnlineSortButton, syncRecorderReadKindFields,
    syncRecorderReadPopoverVisibility, syncRecorderUiState, syncRunSelectedButtonLabel, syncSectionToggleButtons,
    syncSelectionUi, toggleFixMode, updateCardRuntimeContent, updateFixMappings, updateFleetOnlineRefreshStatus,
    updateFleetOnlineSummary, updateKPIs, updateOnlineCheckEstimateFromResults, updateRobotTestState, updateSelectionSummary,
    updateTestMappings, deleteSelectedRobotFromForm, deleteSelectedRobotTypeFromForm, fillEditRobotForm
  } = runtime;

  const {
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
    openManageRobotsFromDashboard,
    scheduleRuntimeStateSync,
  } = createDataInitRuntimeApi({
    MONITOR_SOURCE,
    ROBOTS_CONFIG_URL,
    ROBOT_TYPES_CONFIG_URL,
    RUNTIME_ALLOWED_SOURCES,
    RUNTIME_SYNC_INTERVAL_MS,
    FLEET_RUNTIME_ENDPOINT,
    FLEET_STATIC_ENDPOINT,
    applyRuntimeRobotPatches,
    buildApiUrl,
    isManageViewActive,
    normalizeRobotActivity,
    normalizeRobotData,
    normalizeRobotTests,
    normalizeStatus,
    normalizeText,
    openDetail,
    parseManageRoute,
    reconcileLoadedRobotDefinitions,
    robotId,
    setRobotTypeDefinitions,
    setRobots,
    showAddRobotPage,
    showDashboard,
    state,
    syncAutoMonitorRefreshState,
    syncAutomatedRobotActivityFromState,
  });

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
