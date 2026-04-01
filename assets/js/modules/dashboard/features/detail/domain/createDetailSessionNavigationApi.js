export function createDetailSessionNavigationApi({
  activateTerminalButton,
  addRobotForm,
  addRobotHighModelField,
  addRobotHighModelFileInput,
  addRobotHighModelFileName,
  addRobotLowModelField,
  addRobotLowModelFileInput,
  addRobotLowModelFileName,
  addRobotOverrideHighModelSelect,
  addRobotOverrideLowModelSelect,
  addRobotSavingHint,
  addRobotSection,
  addRobotTypeForm,
  applyActionButton,
  buildManageHash,
  closeBugReportModal,
  closeTestDebugModal,
  dashboard,
  detail,
  detailTerminalShell,
  fillEditRobotTypeForm,
  getRobotTypeById,
  isManageViewActive,
  loadDefinitionsSummary,
  normalizeText,
  populateAddRobotTypeOptions,
  populateEditRobotSelectOptions,
  recorderTerminalActivationOverlay,
  recorderTerminalPopReadBtn,
  recorderTerminalShell,
  refreshRobotsFromBackendSnapshot,
  renderDashboard,
  renderDetail,
  renderRecorderRobotOptions,
  resetRobotOverrideControls,
  resetRobotTypeBatteryInfoPanels,
  resetRobotTypeUploadInputs,
  resolveManageTab,
  setActiveManageTab,
  setActiveRobotRegistryPanel,
  setAddRobotMessage,
  setAddRobotPasswordVisibility,
  setAddRobotTypeMessage,
  setEditRobotMessage,
  setLocationHash,
  state,
  syncFixModePanels,
  terminal,
  terminalToolbar,
}) {
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

  function showAddRobotPage({
    tabId = '',
    syncHash = true,
    refreshDefinitions = true,
    robotRegistryPanelId = '',
  } = {}) {
    closeTestDebugModal();
    closeBugReportModal();
    closeTerminalSession();
    state.detailRobotId = null;
    state.isCreateRobotInProgress = false;
    state.isEditRobotInProgress = false;
    state.isDeleteRobotInProgress = false;
    setAddRobotMessage('', '');
    setEditRobotMessage('', '');
    setAddRobotTypeMessage('', '');
    if (addRobotSavingHint) {
      addRobotSavingHint.textContent = '';
    }
    if (addRobotForm) {
      addRobotForm.reset();
      setAddRobotPasswordVisibility(false);
    }
    if (addRobotTypeForm) {
      addRobotTypeForm.reset();
      resetRobotTypeUploadInputs();
      resetRobotTypeBatteryInfoPanels();
    }
    resetRobotOverrideControls({
      lowSelect: addRobotOverrideLowModelSelect,
      highSelect: addRobotOverrideHighModelSelect,
      lowField: addRobotLowModelField,
      highField: addRobotHighModelField,
      lowInput: addRobotLowModelFileInput,
      highInput: addRobotHighModelFileInput,
      lowLabel: addRobotLowModelFileName,
      highLabel: addRobotHighModelFileName,
      lowEmptyLabel: 'No low-res override selected',
      highEmptyLabel: 'No high-res override selected',
    });
    detail.classList.remove('active');
    dashboard.classList.remove('active');
    populateAddRobotTypeOptions();
    populateEditRobotSelectOptions(state.selectedManageRobotId);
    renderRecorderRobotOptions();
    const activeTab = resolveManageTab(tabId);
    const requestedRobotRegistryPanel = normalizeText(robotRegistryPanelId, '');
    setActiveManageTab(activeTab, { syncHash: false, persist: true });
    if (activeTab === 'robots' && requestedRobotRegistryPanel) {
      setActiveRobotRegistryPanel(requestedRobotRegistryPanel);
    }
    addRobotSection.classList.add('active');
    if (!state.robots.length) {
      refreshRobotsFromBackendSnapshot();
    }
    syncFixModePanels();
    if (syncHash) {
      setLocationHash(buildManageHash(activeTab));
    }
    if (refreshDefinitions) {
      Promise.resolve(loadDefinitionsSummary()).finally(() => {
        resetRobotTypeBatteryInfoPanels();
        fillEditRobotTypeForm(getRobotTypeById(state.selectedManageRobotTypeId));
      });
    } else {
      resetRobotTypeBatteryInfoPanels();
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
    if (addRobotTypeForm) {
      addRobotTypeForm.reset();
      resetRobotTypeUploadInputs();
      resetRobotTypeBatteryInfoPanels();
    }
    resetRobotOverrideControls({
      lowSelect: addRobotOverrideLowModelSelect,
      highSelect: addRobotOverrideHighModelSelect,
      lowField: addRobotLowModelField,
      highField: addRobotHighModelField,
      lowInput: addRobotLowModelFileInput,
      highInput: addRobotHighModelFileInput,
      lowLabel: addRobotLowModelFileName,
      highLabel: addRobotHighModelFileName,
      lowEmptyLabel: 'No low-res override selected',
      highEmptyLabel: 'No high-res override selected',
    });
    setAddRobotMessage('', '');
    setEditRobotMessage('', '');
    setAddRobotTypeMessage('', '');
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

  return {
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
  };
}
