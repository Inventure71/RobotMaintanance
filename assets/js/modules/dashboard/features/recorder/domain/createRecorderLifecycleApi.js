export function createRecorderLifecycleApi(deps) {
  const {
    $,
    ACTIVE_OWNER_PROFILE_STORAGE_KEY,
    RobotTerminalComponent,
    WorkflowRecorderComponent,
    bindRecorderWorkflowUiEvents,
    buildApiUrl,
    deleteManageFixDefinition,
    deleteManageTestDefinition,
    detail,
    filterActiveOwner,
    filterError,
    filterOwnerTags,
    filterPlatformTags,
    filterType,
    getRobotById,
    manageDefinitionFilterButtons,
    manageDeleteFixButton,
    manageDeleteTestButton,
    manageFixRunAtConnectionInput,
    manageFlowModeButtons,
    manageNewFixDefinitionButton,
    manageNewTestDefinitionButton,
    manageTabButtons,
    manageTestRunAtConnectionInput,
    normalizeText,
    openNewTestDraftEntry,
    recorderFlowBlocks,
    recorderOutputs,
    recorderPublishStatus,
    recorderReadBlocks,
    recorderReadInputRefSelect,
    recorderReadOutputKeySelect,
    recorderRunAtConnectionInput,
    recorderStatus,
    recorderTerminalBadge,
    recorderTerminalDisplay,
    recorderTerminalHint,
    recorderTerminalToolbar,
    recorderWriteBlocks,
    renderDashboard,
    renderDetail,
    resetRecorderTestEntry,
    resolveRecorderTerminalPresetCommand,
    setActiveManageTab,
    setFlowEditorMode,
    setManageDefinitionsFilter,
    setManageTabStatus,
    startNewFixDraft,
    state,
    syncRecorderUiState,
    windowRef,
  } = deps;

  let filterRenderDebounceTimer = null;
  let filterRenderRaf = null;

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
          terminalCtor: windowRef.Terminal,
          fitAddonCtor: windowRef.FitAddon ? windowRef.FitAddon.FitAddon : null,
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

    bindRecorderWorkflowUiEvents();
  }

  function ensureWorkflowRecorderInitialized() {
    if (state.isWorkflowRecorderUiInitialized) return;
    initWorkflowRecorder();
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
        windowRef?.localStorage?.setItem(ACTIVE_OWNER_PROFILE_STORAGE_KEY, state.filter.activeOwnerProfile);
      }
    } catch (_error) {
      // Ignore localStorage write failures and keep runtime state in-memory.
    }
    if (filterRenderDebounceTimer) {
      windowRef.clearTimeout(filterRenderDebounceTimer);
    }
    filterRenderDebounceTimer = windowRef.setTimeout(() => {
      filterRenderDebounceTimer = null;
      if (filterRenderRaf !== null) {
        windowRef.cancelAnimationFrame(filterRenderRaf);
      }
      filterRenderRaf = windowRef.requestAnimationFrame(() => {
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
    ensureWorkflowRecorderInitialized,
    initManageTabs,
    initWorkflowRecorder,
    onFilterChange,
  };
}
