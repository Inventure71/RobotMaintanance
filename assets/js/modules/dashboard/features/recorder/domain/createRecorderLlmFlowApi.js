export function createRecorderLlmFlowApi(deps) {
  const {
    RECORDER_LLM_ALLOWED_READ_KINDS,
    RECORDER_LLM_BASE_READ_KINDS,
    buildRecorderLlmPromptPayloadValue,
    getRecorderRunAtConnectionDefault,
    getSelectedRecorderTypeIds,
    inferUniformRunAtConnection,
    loadExistingTestIntoRecorder,
    normalizeText,
    parseRecorderLlmImportPayloadValue,
    recorderAskLlmHelpButton,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderJsonHelpButton,
    recorderJsonHelpPanel,
    recorderLlmHelpPanel,
    recorderLlmImportInput,
    recorderLlmImportLoadButton,
    recorderLlmImportModal,
    recorderLlmImportStatus,
    recorderLlmPromptModal,
    recorderLlmPromptPreview,
    recorderLlmPromptStatus,
    recorderLlmSystemDetailsInput,
    recorderLlmTestRequestInput,
    recorderRobotSelect,
    recorderSimpleTranscriptAcknowledge,
    renderRecorderLlmPromptTemplate,
    renderRecorderLlmPromptText,
    setRecorderMode,
    setRecorderSimpleStep,
    state,
    stripRecorderLlmJsonWrapperNoiseValue,
    syncModalScrollLock,
    syncRecorderUiState,
    validateRecorderImportedDefinitionValue,
  } = deps;

  let recorderLlmImportedDefinition = null;

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
    } else if (recorderLlmImportLoadButton) {
      recorderLlmImportLoadButton.disabled = !recorderLlmImportedDefinition;
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

  return {
    setRecorderLlmStatus,
    resetRecorderLlmImportState,
    setRecorderLlmModalVisibility,
    closeRecorderLlmPromptModal,
    closeRecorderLlmImportModal,
    setRecorderLlmHelpExpanded,
    toggleRecorderLlmHelp,
    setRecorderJsonHelpExpanded,
    toggleRecorderJsonHelp,
    initAssignmentHelpButtons,
    buildRecorderLlmPromptPayload,
    getRecorderLlmPromptReadiness,
    getRecorderLlmPromptBuildResult,
    refreshRecorderLlmPromptPreview,
    openRecorderLlmPromptModal,
    stripRecorderLlmJsonWrapperNoise,
    parseRecorderLlmImportPayload,
    validateRecorderImportedDefinition,
    validateRecorderLlmImportInput,
    openRecorderLlmImportModal,
    loadRecorderLlmImportResult,
  };
}
