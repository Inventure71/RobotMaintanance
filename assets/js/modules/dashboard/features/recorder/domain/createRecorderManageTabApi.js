export function createRecorderManageTabApi({
  buildManageHash,
  closeRecorderLlmImportModal,
  closeRecorderLlmPromptModal,
  ensureWorkflowRecorderInitialized,
  hideRecorderReadPopover,
  manageTabButtons,
  manageTabPanels,
  normalizeText,
  persistManageTab,
  recorderEditorModeSelector = () => 'test',
  resolveManageTab,
  setLocationHash,
  setRecorderLlmHelpExpanded,
  state,
  syncRecorderUiState,
}) {
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
        ? (tab === normalizedTab && recorderEditorMode === normalizeText(recorderEditorModeSelector(), 'test'))
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

  return {
    setActiveManageTab,
  };
}
