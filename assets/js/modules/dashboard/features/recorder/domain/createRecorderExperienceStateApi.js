export function createRecorderExperienceStateApi(deps) {
  const {
    RECORDER_NOT_STARTED_TOOLTIP,
    RECORDER_START_DISABLED_TOOLTIP,
    applyActionButton,
    clearCheckedMappings,
    clearRecorderOutputForm,
    clearRecorderReadForm,
    envRef,
    getRecorderTerminalTranscript,
    hasRecorderPreviewableDraft,
    isRecorderMetadataReady,
    normalizeRecorderMode,
    normalizeRecorderSimpleStep,
    normalizeText,
    readRecorderLastEditingOutputKey,
    readRecorderLastEditingReadBlockId,
    recorderAddOutputBtn,
    recorderAddReadBtn,
    recorderAddWriteBtn,
    recorderAdvancedWorkspace,
    recorderAssignmentPanel,
    recorderChangeModeButton,
    recorderCheckCountBadge,
    recorderCommandInput,
    recorderCreateNewTestButton,
    recorderDefinitionDescriptionInput,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderExperienceShell,
    recorderLlmPromptPreview,
    recorderLlmSystemDetailsInput,
    recorderLlmTestRequestInput,
    recorderModeBadge,
    recorderModeSelector,
    recorderOutputCountBadge,
    recorderOutputFailDetailsInput,
    recorderOutputIconInput,
    recorderOutputKeyInput,
    recorderOutputLabelInput,
    recorderOutputPassDetailsInput,
    recorderOwnerTagsInput,
    recorderPlatformTagsInput,
    recorderPublishTestButton,
    recorderReadInputRefSelect,
    recorderReadKindSelect,
    recorderReadLinesInput,
    recorderReadNeedleInput,
    recorderReadNeedlesInput,
    recorderReadOutputKeySelect,
    recorderReadRequireAllInput,
    recorderResetExperienceButton,
    recorderRobotSelect,
    recorderRobotTypeTargets,
    recorderRunAtConnectionInput,
    recorderRunCaptureButton,
    recorderSharedTopbar,
    recorderSharedTopbarMain,
    recorderSimpleImportStep,
    recorderSimpleImportNextButton,
    recorderSimplePromptNextButton,
    recorderSimplePromptStep,
    recorderSimplePreviewNextButton,
    recorderSimplePreviewStep,
    recorderSimplePublishStep,
    recorderSimpleSelectRobotField,
    recorderSimpleSelectRobotNextButton,
    recorderSimpleSelectRobotStep,
    recorderSimpleTerminalActions,
    recorderSimpleTerminalNextButton,
    recorderSimpleTerminalStep,
    recorderSimpleTranscriptAcknowledge,
    recorderStateBadge,
    recorderStepCountBadge,
    recorderTerminalPanel,
    recorderTopbarDefinitionWrap,
    recorderTopbarNewDraftWrap,
    recorderTopbarPublishWrap,
    recorderTopbarRobotWrap,
    renderRecorderPreviews,
    renderRecorderRobotTypeTargets,
    requestCloseRecorderLlmImportModal,
    requestCloseRecorderLlmPromptModal,
    requestGetRecorderLlmPromptReadiness,
    requestOpenNewTestDraftEntry,
    requestSetFlowEditorMode,
    requestSetRecorderLlmHelpExpanded,
    setActiveManageTab,
    setManageTabStatus,
    setRecorderButtonDisabledState,
    setRecorderButtonTooltip,
    state,
    syncRecorderReadPopoverVisibility,
    writeRecorderLastEditingOutputKey,
    writeRecorderLastEditingReadBlockId,
  } = deps;

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
    if (normalizedMode === 'advanced' && !preserveDraft) {
      requestOpenNewTestDraftEntry();
      return;
    }
    syncRecorderUiState();
  }

  function resetRecorderTestEntry({ target = 'mode-selector' } = {}) {
    const normalizedTarget = target === 'simple-start' ? 'simple-start' : 'mode-selector';
    state.editingTestSourceId = '';
    requestSetFlowEditorMode('test', { announce: false });
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
    requestSetRecorderLlmHelpExpanded(false);
    requestCloseRecorderLlmPromptModal({ preserveFields: false });
    requestCloseRecorderLlmImportModal({ preserveInput: false });
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
    const promptReadiness = requestGetRecorderLlmPromptReadiness();
    const promptReady = Boolean(promptReadiness?.ok);
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

    const lastOutputKey = readRecorderLastEditingOutputKey();
    if (recorderState.editingOutputKey !== lastOutputKey) {
      const nextOutputKey = recorderState.editingOutputKey || '';
      writeRecorderLastEditingOutputKey(nextOutputKey);
      if (envRef) {
        envRef.recorderLastEditingOutputKey = nextOutputKey;
      }
      if (nextOutputKey) {
        const output = state.workflowRecorder?.getOutput?.(nextOutputKey);
        if (output) {
          if (recorderOutputKeyInput) recorderOutputKeyInput.value = output.key;
          if (recorderOutputLabelInput) recorderOutputLabelInput.value = output.label;
          if (recorderOutputIconInput) recorderOutputIconInput.value = output.icon;
          if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = output.passDetails;
          if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = output.failDetails;
        }
      }
    }

    const lastReadBlockId = readRecorderLastEditingReadBlockId();
    if (recorderState.editingReadBlockId !== lastReadBlockId) {
      const nextReadBlockId = recorderState.editingReadBlockId || '';
      writeRecorderLastEditingReadBlockId(nextReadBlockId);
      if (envRef) {
        envRef.recorderLastEditingReadBlockId = nextReadBlockId;
      }
      if (nextReadBlockId) {
        const block = state.workflowRecorder?.getReadBlock?.(nextReadBlockId);
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

  return {
    resetRecorderTestEntry,
    setRecorderMode,
    setRecorderSimpleStep,
    syncRecorderReadKindFields,
    syncRecorderRobotFieldPlacement,
    syncRecorderUiState,
  };
}
