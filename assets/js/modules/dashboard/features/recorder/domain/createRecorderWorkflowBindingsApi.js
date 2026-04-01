export function createRecorderWorkflowBindingsApi(deps) {
  const {
    activateRecorderTerminalButton,
    addRecorderOutputVisual,
    addRecorderReadVisual,
    addRecorderWriteVisual,
    clearRecorderOutputForm,
    clearRecorderReadForm,
    closeRecorderLlmImportModal,
    closeRecorderLlmPromptModal,
    documentRef,
    getRecorderTerminalPresets,
    hideRecorderReadPopover,
    initAssignmentHelpButtons,
    loadRecorderLlmImportResult,
    normalizeText,
    openRecorderLlmImportModal,
    openRecorderLlmPromptModal,
    publishRecorderAsTest,
    recorderAddOutputBtn,
    recorderAddReadBtn,
    recorderAddWriteBtn,
    recorderAskLlmButton,
    recorderAskLlmHelpButton,
    recorderChangeModeButton,
    recorderCommandInput,
    recorderCreateNewTestButton,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderJsonHelpButton,
    recorderLlmImportCancelButton,
    recorderLlmImportInput,
    recorderLlmImportLoadButton,
    recorderLlmImportModal,
    recorderLlmPromptCancelButton,
    recorderLlmPromptModal,
    recorderLlmPromptPreview,
    recorderLlmPromptStatus,
    recorderLlmSystemDetailsInput,
    recorderLlmTestRequestInput,
    recorderPasteLlmResultButton,
    recorderPublishTestButton,
    recorderReadKindSelect,
    recorderResetExperienceButton,
    recorderRobotSelect,
    recorderRunCaptureButton,
    recorderSelectAdvancedModeButton,
    recorderSelectSimpleModeButton,
    recorderSimpleEditInAdvancedButton,
    recorderSimpleImportBackButton,
    recorderSimpleImportNextButton,
    recorderSimplePreviewBackButton,
    recorderSimplePreviewNextButton,
    recorderSimplePromptBackButton,
    recorderSimplePromptNextButton,
    recorderSimplePublishBackButton,
    recorderSimpleSelectRobotNextButton,
    recorderSimpleTerminalNextButton,
    recorderSimpleTranscriptAcknowledge,
    recorderTerminalPopReadBtn,
    refreshRecorderLlmPromptPreview,
    renderRecorderRobotTypeTargets,
    resetRecorderLlmImportState,
    resetRecorderTestEntry,
    runRecorderCommandAndCapture,
    setFlowEditorMode,
    setManageDefinitionsFilter,
    setRecorderJsonHelpExpanded,
    setRecorderLlmHelpExpanded,
    setRecorderLlmStatus,
    setRecorderMode,
    setRecorderSimpleStep,
    setRecorderTerminalActive,
    startNewTestDraft,
    state,
    syncRecorderReadKindFields,
    syncRecorderReadPopoverVisibility,
    syncRecorderUiState,
    toggleRecorderJsonHelp,
    toggleRecorderLlmHelp,
    validateRecorderLlmImportInput,
    windowRef,
    robotTypes,
  } = deps;

  function bindRecorderWorkflowUiEvents() {
    if (state.recorderSelectionMouseupHandler) {
      documentRef.removeEventListener('mouseup', state.recorderSelectionMouseupHandler);
    }
    state.recorderSelectionMouseupHandler = () => {
      syncRecorderReadPopoverVisibility();
    };
    documentRef.addEventListener('mouseup', state.recorderSelectionMouseupHandler);

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
          const lines = selection.trim().split('\n').map((s) => s.trim()).filter(Boolean);
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
            kind,
            needle,
            needles: '',
            lines: linesStr,
            requireAll: true,
          });
          state.workflowRecorder.setStatus('Read block created from terminal selection. Expand to edit.', 'ok');
          hideRecorderReadPopover();
          state.recorderTerminalComponent.terminal.clearSelection();
        }
      } catch (_error) {
        // Best effort helper.
      }
    });

    activateRecorderTerminalButton?.addEventListener('click', () => {
      const rId = normalizeText(recorderRobotSelect?.value, '');
      if (!rId) {
        state.workflowRecorder.setStatus('Select a robot first.', 'error');
        return;
      }
      const robot = robotTypes.length ? { id: rId, name: rId } : { id: rId };
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
    documentRef.addEventListener('keydown', (event) => {
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

  return {
    bindRecorderWorkflowUiEvents,
  };
}
