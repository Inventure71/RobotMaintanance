export function createRecorderDefinitionMutationApi(deps) {
  const {
    applyRunAtConnection,
    buildApiUrl,
    clearRecorderOutputForm,
    clearRecorderReadForm,
    confirmFn,
    ensureFixRobotTypeTargetsRendered,
    getManageTestRunAtConnectionValue,
    getSelectedMappingTypeIds,
    getSelectedRecorderTypeIds,
    loadRobotTypeConfig,
    manageDeleteFixButton,
    manageDeleteTestButton,
    manageFixDescriptionInput,
    manageFixEditorStatus,
    manageFixExecuteJsonInput,
    manageFixIdInput,
    manageFixLabelInput,
    manageFixOwnerTagsInput,
    manageFixPlatformTagsInput,
    manageFixRobotTypeTargets,
    manageFixRunAtConnectionInput,
    manageTestChecksJsonInput,
    manageTestEditorStatus,
    manageTestExecuteJsonInput,
    manageTestIdInput,
    manageTestLabelInput,
    manageTestOwnerTagsInput,
    manageTestPlatformTagsInput,
    manageTestRobotTypeTargets,
    manageTestRunAtConnectionInput,
    normalizeDefinitionsSummary,
    normalizeIdList,
    normalizeText,
    parseTagInput,
    playPublishSuccessCelebration,
    recorderDefinitionDescriptionInput,
    recorderDefinitionIdInput,
    recorderDefinitionLabelInput,
    recorderOwnerTagsInput,
    recorderPlatformTagsInput,
    refreshRobotsFromBackendSnapshot,
    renderManageDefinitions,
    renderRecorderRobotTypeTargets,
    resetManageFixEntryForNextDraft,
    resolveCheckRunAtConnection,
    setManageEditorStatus,
    setManageTabStatus,
    state,
  } = deps;

  const confirmDelete = typeof confirmFn === 'function'
    ? confirmFn
    : (typeof globalThis !== 'undefined' && typeof globalThis.confirm === 'function'
      ? globalThis.confirm.bind(globalThis)
      : () => false);

  function parseJsonInput(input, label) {
    const raw = normalizeText(input?.value, '');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error(`${label} must be a JSON array.`);
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function loadDefinitionsSummary() {
    if (state.isManageSummaryLoading) return;
    state.isManageSummaryLoading = true;
    setManageTabStatus('Loading definitions...', 'warn');
    try {
      const response = await fetch(buildApiUrl('/api/definitions/summary'));
      const raw = await response.text();
      const contentType = normalizeText(response.headers?.get('content-type'), '').toLowerCase();
      const trimmedRaw = raw.trim();
      const appearsJson = trimmedRaw.startsWith('{') || trimmedRaw.startsWith('[');
      const expectsJson = contentType.includes('json');
      const shouldParseJson = expectsJson || appearsJson;
      let payload = {};
      let parseError = null;
      if (raw && shouldParseJson) {
        try {
          payload = JSON.parse(raw);
        } catch (error) {
          parseError = error;
        }
      }
      if (!response.ok) {
        if (shouldParseJson && parseError) {
          throw new Error(`Unable to load definitions summary (HTTP ${response.status}).`);
        }
        const fallback = raw || `Unable to load definitions summary (HTTP ${response.status}).`;
        throw new Error(normalizeText(payload?.detail, fallback));
      }
      if (shouldParseJson && parseError) {
        throw new Error('Definitions summary response could not be parsed as JSON.');
      }
      if (!shouldParseJson && raw) {
        throw new Error('Definitions summary response was not JSON.');
      }
      state.definitionsSummary = normalizeDefinitionsSummary(payload);
      if (state.manageFlowEditorMode === 'fix') {
        ensureFixRobotTypeTargetsRendered({ force: true });
      }
      renderManageDefinitions();
      setManageTabStatus('Definitions loaded.', 'ok');
    } catch (error) {
      setManageTabStatus(
        `Definitions load failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    } finally {
      state.isManageSummaryLoading = false;
    }
  }

  async function updateTestMappings(testId, robotTypeIds) {
    const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}/mappings`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotTypeIds }),
    });
    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : {};
    if (!response.ok) {
      throw new Error(normalizeText(body?.detail, raw || 'Unable to update test mappings.'));
    }
    return body;
  }

  async function updateFixMappings(fixId, robotTypeIds) {
    const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}/mappings`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotTypeIds }),
    });
    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : {};
    if (!response.ok) {
      throw new Error(normalizeText(body?.detail, raw || 'Unable to update fix mappings.'));
    }
    return body;
  }

  async function saveManageTestDefinition() {
    if (!manageTestIdInput || !manageTestExecuteJsonInput || !manageTestChecksJsonInput) return;
    setManageEditorStatus(manageTestEditorStatus, 'Saving test definition...', 'warn');
    try {
      const testId = normalizeText(manageTestIdInput.value, '');
      if (!testId) {
        throw new Error('Test definition ID is required.');
      }
      const execute = parseJsonInput(manageTestExecuteJsonInput, 'Execute steps');
      const checksInput = parseJsonInput(manageTestChecksJsonInput, 'Checks').map((check) => ({
        ...(check && typeof check === 'object' ? check : {}),
        runAtConnection: resolveCheckRunAtConnection(check, true),
      }));
      const checks = applyRunAtConnection(
        checksInput,
        getManageTestRunAtConnectionValue(),
      );
      const existingTestDefinition = (Array.isArray(state.definitionsSummary?.tests) ? state.definitionsSummary.tests : [])
        .find((definition) => normalizeText(definition?.id, '') === (normalizeText(state.editingTestSourceId, '') || testId));
      const payload = {
        id: testId,
        previousId: normalizeText(state.editingTestSourceId, '') || undefined,
        label: normalizeText(manageTestLabelInput?.value, testId),
        description: normalizeText(existingTestDefinition?.description, ''),
        mode: 'orchestrate',
        enabled: true,
        ownerTags: parseTagInput(manageTestOwnerTagsInput || recorderOwnerTagsInput),
        platformTags: parseTagInput(manageTestPlatformTagsInput || recorderPlatformTagsInput),
        execute,
        checks,
      };
      const response = await fetch(buildApiUrl('/api/definitions/tests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(normalizeText(body?.detail, raw || 'Unable to save test definition.'));
      }

      const selectedTypeIds = getSelectedMappingTypeIds(manageTestRobotTypeTargets);
      const mappingResult = await updateTestMappings(testId, selectedTypeIds);
      state.editingTestSourceId = testId;
      state.definitionsSummary = normalizeDefinitionsSummary(
        mappingResult?.summary || body?.summary || body,
      );
      await loadRobotTypeConfig();
      renderManageDefinitions();
      const refreshed = await refreshRobotsFromBackendSnapshot();
      setManageEditorStatus(manageTestEditorStatus, `Saved test definition '${testId}' and updated mappings.`, 'ok');
      if (refreshed) {
        setManageTabStatus(`Saved test definition '${testId}'.`, 'ok');
      } else {
        setManageTabStatus(
          `Saved test definition '${testId}'. Local robot test mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
          'warn',
        );
      }
    } catch (error) {
      setManageEditorStatus(
        manageTestEditorStatus,
        error instanceof Error ? error.message : String(error),
        'error',
      );
    }
  }

  async function deleteManageTestDefinition(testIdOverride = '') {
    const testId = normalizeText(testIdOverride, '') || normalizeText(manageTestIdInput?.value, '');
    if (!testId) return;
    if (!confirmDelete(`Are you sure you want to delete test definition '${testId}'? This will also remove it from all robot type mappings.`)) {
      return;
    }
    setManageEditorStatus(manageTestEditorStatus, 'Deleting test definition...', 'warn');
    try {
      const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}`), {
        method: 'DELETE',
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.detail || 'Unable to delete test definition.');
      }
      state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
      renderManageDefinitions();
      const refreshed = await refreshRobotsFromBackendSnapshot();
      const loadedRecorderId = normalizeText(recorderDefinitionIdInput?.value, '');
      if (loadedRecorderId === testId) {
        state.editingTestSourceId = '';
        state.workflowRecorder?.reset?.();
        clearRecorderOutputForm();
        clearRecorderReadForm();
        if (recorderDefinitionIdInput) recorderDefinitionIdInput.value = '';
        if (recorderDefinitionLabelInput) recorderDefinitionLabelInput.value = '';
        if (recorderDefinitionDescriptionInput) recorderDefinitionDescriptionInput.value = '';
        if (recorderOwnerTagsInput) recorderOwnerTagsInput.value = '';
        if (recorderPlatformTagsInput) recorderPlatformTagsInput.value = '';
        renderRecorderRobotTypeTargets();
      }
      if (manageTestIdInput && normalizeText(manageTestIdInput.value, '') === testId) manageTestIdInput.value = '';
      if (manageTestLabelInput) manageTestLabelInput.value = '';
      if (manageTestExecuteJsonInput) manageTestExecuteJsonInput.value = '';
      if (manageTestChecksJsonInput) manageTestChecksJsonInput.value = '';
      if (manageTestRunAtConnectionInput) manageTestRunAtConnectionInput.checked = true;
      if (manageTestOwnerTagsInput) manageTestOwnerTagsInput.value = '';
      if (manageTestPlatformTagsInput) manageTestPlatformTagsInput.value = '';
      if (manageTestRobotTypeTargets) manageTestRobotTypeTargets.replaceChildren();
      if (manageDeleteTestButton) manageDeleteTestButton.style.display = 'none';
      setManageEditorStatus(manageTestEditorStatus, `Deleted test definition '${testId}'.`, 'ok');
      if (refreshed) {
        setManageTabStatus(`Deleted test definition '${testId}'.`, 'ok');
      } else {
        setManageTabStatus(
          `Deleted test definition '${testId}'. Local robot test mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
          'warn',
        );
      }
    } catch (error) {
      setManageEditorStatus(
        manageTestEditorStatus,
        error instanceof Error ? error.message : String(error),
        'error',
      );
    }
  }

  async function saveManageFixDefinition() {
    if (!manageFixIdInput || !manageFixExecuteJsonInput) return;
    setManageEditorStatus(manageFixEditorStatus, 'Saving fix definition...', 'warn');
    try {
      const fixId = normalizeText(manageFixIdInput.value, '');
      if (!fixId) {
        throw new Error('Fix ID is required.');
      }
      const execute = parseJsonInput(manageFixExecuteJsonInput, 'Execute steps');
      const existingFixDefinition = (Array.isArray(state.definitionsSummary?.fixes) ? state.definitionsSummary.fixes : [])
        .find((definition) => normalizeText(definition?.id, '') === (normalizeText(state.editingFixSourceId, '') || fixId));
      const payload = {
        id: fixId,
        previousId: normalizeText(state.editingFixSourceId, '') || undefined,
        label: normalizeText(manageFixLabelInput?.value, fixId),
        description: normalizeText(manageFixDescriptionInput?.value, ''),
        enabled: true,
        runAtConnection: Boolean(manageFixRunAtConnectionInput?.checked),
        ownerTags: parseTagInput(manageFixOwnerTagsInput),
        platformTags: parseTagInput(manageFixPlatformTagsInput),
        postTestIds: Array.isArray(existingFixDefinition?.postTestIds) ? existingFixDefinition.postTestIds : undefined,
        execute,
      };
      const response = await fetch(buildApiUrl('/api/definitions/fixes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(normalizeText(body?.detail, raw || 'Unable to save fix definition.'));
      }

      const selectedTypeIds = getSelectedMappingTypeIds(manageFixRobotTypeTargets);
      const mappingResult = await updateFixMappings(fixId, selectedTypeIds);
      state.editingFixSourceId = fixId;
      state.definitionsSummary = normalizeDefinitionsSummary(
        mappingResult?.summary || body?.summary || body,
      );
      renderManageDefinitions();
      const refreshed = await refreshRobotsFromBackendSnapshot();
      setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}' and updated mappings.`, 'ok');
      void playPublishSuccessCelebration().catch(() => {});
      resetManageFixEntryForNextDraft();
      setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}'. Ready for a new fix draft.`, 'ok');
      if (refreshed) {
        setManageTabStatus(`Saved fix definition '${fixId}'. Fix editor cleared for a new draft.`, 'ok');
      } else {
        setManageTabStatus(
          `Saved fix definition '${fixId}'. Fix editor cleared for a new draft; backend snapshot refresh will catch up automatically.`,
          'warn',
        );
      }
    } catch (error) {
      setManageEditorStatus(
        manageFixEditorStatus,
        error instanceof Error ? error.message : String(error),
        'error',
      );
    }
  }

  async function deleteManageFixDefinition(fixIdOverride = '') {
    const fixId = normalizeText(fixIdOverride, '') || normalizeText(manageFixIdInput?.value, '');
    if (!fixId) return;
    if (!confirmDelete(`Are you sure you want to delete fix definition '${fixId}'? This will also remove it from all robot type mappings.`)) {
      return;
    }
    setManageEditorStatus(manageFixEditorStatus, 'Deleting fix definition...', 'warn');
    try {
      const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}`), {
        method: 'DELETE',
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.detail || 'Unable to delete fix definition.');
      }
      state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
      renderManageDefinitions();
      const refreshed = await refreshRobotsFromBackendSnapshot();
      if (manageFixIdInput && normalizeText(manageFixIdInput.value, '') === fixId) manageFixIdInput.value = '';
      state.editingFixSourceId = '';
      if (manageFixLabelInput) manageFixLabelInput.value = '';
      if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
      if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
      if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
      if (manageFixOwnerTagsInput) manageFixOwnerTagsInput.value = '';
      if (manageFixPlatformTagsInput) manageFixPlatformTagsInput.value = '';
      if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
      if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
      setManageEditorStatus(manageFixEditorStatus, `Deleted fix definition '${fixId}'.`, 'ok');
      if (refreshed) {
        setManageTabStatus(`Deleted fix definition '${fixId}'.`, 'ok');
      } else {
        setManageTabStatus(
          `Deleted fix definition '${fixId}'. Local robot mappings were updated immediately; backend snapshot refresh will catch up automatically.`,
          'warn',
        );
      }
    } catch (error) {
      setManageEditorStatus(
        manageFixEditorStatus,
        error instanceof Error ? error.message : String(error),
        'error',
      );
    }
  }

  async function patchRobotTypeMapping(typeId, testRefs, fixRefs) {
    const payload = {};
    if (Array.isArray(testRefs)) payload.testRefs = normalizeIdList(testRefs);
    if (Array.isArray(fixRefs)) payload.fixRefs = normalizeIdList(fixRefs);
    const response = await fetch(buildApiUrl(`/api/robot-types/${encodeURIComponent(typeId)}/mappings`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : {};
    if (!response.ok) {
      throw new Error(normalizeText(body?.detail, raw || `Unable to patch robot type ${typeId}.`));
    }
    return body;
  }

  async function applyRecorderMappings({ checkIds = [], fixId = '' }) {
    const selectedTypeIds = getSelectedRecorderTypeIds();
    if (!selectedTypeIds.length) return;
    const summaryTypes = Array.isArray(state.definitionsSummary?.robotTypes)
      ? state.definitionsSummary.robotTypes
      : [];
    for (const typeId of selectedTypeIds) {
      const existing = summaryTypes.find((item) => normalizeText(item?.id, '') === typeId) || {};
      const nextTestRefs = normalizeIdList([...(existing.testRefs || []), ...checkIds]);
      const nextFixRefs = fixId
        ? normalizeIdList([...(existing.fixRefs || []), fixId])
        : normalizeIdList(existing.fixRefs || []);
      const patchResult = await patchRobotTypeMapping(typeId, nextTestRefs, nextFixRefs);
      state.definitionsSummary = normalizeDefinitionsSummary(patchResult?.summary || state.definitionsSummary);
    }
  }

  return {
    parseJsonInput,
    loadDefinitionsSummary,
    saveManageTestDefinition,
    deleteManageTestDefinition,
    updateTestMappings,
    updateFixMappings,
    saveManageFixDefinition,
    deleteManageFixDefinition,
    patchRobotTypeMapping,
    applyRecorderMappings,
  };
}
