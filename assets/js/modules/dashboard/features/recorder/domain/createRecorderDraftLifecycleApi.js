export function createRecorderDraftLifecycleApi({
  RECORDER_START_DISABLED_TOOLTIP,
  clearCheckedMappings,
  clearManageFixEditor,
  clearRecorderOutputForm,
  clearRecorderReadForm,
  closeRecorderLlmImportModal,
  closeRecorderLlmPromptModal,
  formatTagInputValue,
  inferUniformRunAtConnection,
  manageDeleteFixButton,
  manageFixDescriptionInput,
  manageFixEditorStatus,
  manageFixExecuteJsonInput,
  manageFixIdInput,
  manageFixLabelInput,
  manageFixOwnerTagsInput,
  manageFixPlatformTagsInput,
  manageFixRobotTypeTargets,
  manageFixRunAtConnectionInput,
  normalizeRecorderMode,
  normalizeText,
  recorderDefinitionDescriptionInput,
  recorderDefinitionIdInput,
  recorderDefinitionLabelInput,
  recorderLlmSystemDetailsInput,
  recorderLlmTestRequestInput,
  recorderOwnerTagsInput,
  recorderPlatformTagsInput,
  recorderRobotSelect,
  recorderRobotTypeTargets,
  recorderRunAtConnectionInput,
  recorderSimpleTranscriptAcknowledge,
  renderFixRobotTypeTargets,
  renderRecorderRobotTypeTargets,
  resetRecorderLlmImportState,
  resetRecorderTestEntry,
  setActiveManageTab,
  setFlowEditorMode,
  setManageEditorStatus,
  setManageTabStatus,
  setRecorderLlmHelpExpanded,
  slugifyRecorderValue,
  state,
  syncRecorderUiState,
}) {
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
    if (
      normalizeText(recorderDefinitionIdInput?.value, '') === ''
      || normalizeText(recorderDefinitionLabelInput?.value, '') === ''
    ) {
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

  return {
    resetManageFixEntryForNextDraft,
    loadExistingTestIntoRecorder,
    loadExistingFixIntoFlow,
    duplicateManageTestDefinition,
    duplicateManageFixDefinition,
    openNewTestDraftEntry,
    startNewTestDraft,
    startNewFixDraft,
  };
}
