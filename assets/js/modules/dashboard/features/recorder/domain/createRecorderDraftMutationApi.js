export function createRecorderDraftMutationApi(deps) {
  const {
    RECORDER_NOT_STARTED_TOOLTIP,
    applyRecorderMappings,
    applyRunAtConnection,
    buildApiUrl,
    getRecorderRunAtConnectionDefault,
    getRecorderTerminalPresets,
    loadRobotTypeConfig,
    normalizeDefinitionsSummary,
    normalizeText,
    parseTagInput,
    playPublishSuccessCelebration,
    recorderCommandInput,
    recorderDefinitionDescriptionInput,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderOwnerTagsInput,
    recorderPlatformTagsInput,
    recorderRobotSelect,
    recorderRunCaptureButton,
    refreshRobotsFromBackendSnapshot,
    renderManageDefinitions,
    resetRecorderTestEntry,
    robotTypes,
    setManageTabStatus,
    setRecorderTerminalActive,
    slugifyRecorderValue,
    state,
    syncRecorderUiState,
    windowRef,
  } = deps;

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
        const robot = robotTypes.length ? { id: robotIdValue, name: robotIdValue } : { id: robotIdValue };
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
      const outId = windowRef.prompt('Enter Output Key (e.g. status):');
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
        requireAll: true,
      });
      state.workflowRecorder.setStatus('Added read block. Expand to edit.', 'ok');
    } catch (error) {
      state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  return {
    addRecorderOutputVisual,
    addRecorderReadVisual,
    addRecorderWriteVisual,
    applyRecorderDefinitionDraftDefaults,
    publishRecorderAsTest,
    runRecorderCommandAndCapture,
  };
}
