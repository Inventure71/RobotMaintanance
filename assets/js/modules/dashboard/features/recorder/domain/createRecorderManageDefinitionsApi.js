export function createRecorderManageDefinitionsApi(deps) {
  const {
    closeRecorderLlmImportModal,
    closeRecorderLlmPromptModal,
    deleteManageFixDefinition,
    deleteManageTestDefinition,
    duplicateManageFixDefinition,
    duplicateManageTestDefinition,
    filterActiveOwner,
    hideRecorderReadPopover,
    loadExistingFixIntoFlow,
    loadExistingTestIntoRecorder,
    manageDefinitionFilterButtons,
    manageDefinitionsList,
    manageFixIdInput,
    manageFixRobotTypeTargets,
    manageFixRunAtConnectionInput,
    manageFlowModeButtons,
    manageRecorderFixEditorPanel,
    manageRecorderTestEditorPanel,
    manageTestRunAtConnectionInput,
    normalizeTagList,
    normalizeText,
    recorderRobotSelect,
    recorderRunAtConnectionInput,
    renderFixRobotTypeTargets,
    renderRecorderRobotTypeTargets,
    resolveCheckRunAtConnection,
    scheduleDelay,
    setManageTabStatus,
    setRecorderLlmHelpExpanded,
    slugifyRecorderValue,
    state,
    syncRecorderUiState,
  } = deps;

function ensureFixRobotTypeTargetsRendered({ force = false } = {}) {
      if (!manageFixRobotTypeTargets) return;
      const hasRenderedOptions = manageFixRobotTypeTargets.querySelectorAll('input[type="checkbox"]').length > 0;
      if (hasRenderedOptions && !force) return;
      renderFixRobotTypeTargets(normalizeText(manageFixIdInput?.value, ''));
    }

function getSelectedMappingTypeIds(container) {
      if (!container) return [];
      const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
      return selected
        .map((input) => normalizeText(input?.value, ''))
        .filter(Boolean);
    }

function getManageDefinitionsFilter() {
      const value = normalizeText(state.manageDefinitionsFilter, '').toLowerCase();
      return value === 'tests' || value === 'fixes' ? value : 'all';
    }

function syncManageDefinitionsFilterButtons() {
      const activeFilter = getManageDefinitionsFilter();
      manageDefinitionFilterButtons?.forEach((button) => {
        const value = normalizeText(button?.dataset?.definitionFilter, 'all').toLowerCase();
        button.classList.toggle('active', value === activeFilter);
      });
    }

function setManageDefinitionsFilter(filter = 'all') {
      const normalized = normalizeText(filter, 'all').toLowerCase();
      state.manageDefinitionsFilter = normalized === 'tests' || normalized === 'fixes' ? normalized : 'all';
      syncManageDefinitionsFilterButtons();
      renderManageDefinitionsList();
    }

function setFlowEditorMode(mode = 'test', { announce = true } = {}) {
      const normalizedMode = normalizeText(mode, 'test').toLowerCase() === 'fix' ? 'fix' : 'test';
      state.manageFlowEditorMode = normalizedMode;
      manageFlowModeButtons?.forEach((button) => {
        const buttonMode = normalizeText(button?.dataset?.flowMode, 'test').toLowerCase();
        button.classList.toggle('active', buttonMode === normalizedMode);
      });
      if (manageRecorderTestEditorPanel) {
        manageRecorderTestEditorPanel.classList.toggle('hidden', normalizedMode !== 'test');
        manageRecorderTestEditorPanel.classList.toggle('active', normalizedMode === 'test');
      }
      if (manageRecorderFixEditorPanel) {
        manageRecorderFixEditorPanel.classList.toggle('hidden', normalizedMode !== 'fix');
        manageRecorderFixEditorPanel.classList.toggle('active', normalizedMode === 'fix');
      }
      if (announce) {
        setManageTabStatus(
          normalizedMode === 'fix' ? 'Fix flow editor ready.' : 'Test flow editor ready.',
          'ok',
        );
      }
      if (normalizedMode === 'test') {
        syncRecorderUiState();
      } else {
        setRecorderLlmHelpExpanded(false);
        closeRecorderLlmPromptModal();
        closeRecorderLlmImportModal();
        ensureFixRobotTypeTargetsRendered();
        hideRecorderReadPopover();
      }
    }

function getManageActiveOwnerProfile() {
      if (filterActiveOwner) {
        return normalizeText(filterActiveOwner.value, '').toLowerCase();
      }
      return normalizeText(state?.filter?.activeOwnerProfile, '').toLowerCase();
    }

function matchesManageDefinitionOwnerScope(definition = {}) {
      const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
      const activeOwnerProfile = getManageActiveOwnerProfile();
      const ownerSelection = activeOwnerProfile
        ? [activeOwnerProfile, 'global']
        : ['global'];
      return ownerSelection.some((tag) => ownerTags.includes(tag));
    }

function buildManageDefinitionsListItems() {
      const tests = Array.isArray(state.definitionsSummary?.tests) ? state.definitionsSummary.tests : [];
      const fixes = Array.isArray(state.definitionsSummary?.fixes) ? state.definitionsSummary.fixes : [];
      const items = [
        ...tests.map((definition) => ({ kind: 'test', definition })),
        ...fixes.map((definition) => ({ kind: 'fix', definition })),
      ];
      const activeFilter = getManageDefinitionsFilter();
      const filtered = items.filter((item) => (
        matchesManageDefinitionOwnerScope(item.definition)
        && (activeFilter === 'all'
          || (activeFilter === 'tests' && item.kind === 'test')
          || (activeFilter === 'fixes' && item.kind === 'fix')
        )
      ));
      return filtered.sort((left, right) => {
        const leftLabel = normalizeText(left?.definition?.label, normalizeText(left?.definition?.id, ''));
        const rightLabel = normalizeText(right?.definition?.label, normalizeText(right?.definition?.id, ''));
        const byLabel = leftLabel.localeCompare(rightLabel);
        if (byLabel !== 0) return byLabel;
        return normalizeText(left?.definition?.id, '').localeCompare(normalizeText(right?.definition?.id, ''));
      });
    }

function buildManageDefinitionMeta(item) {
      const definition = item?.definition || {};
      if (item?.kind === 'fix') {
        const stepCount = Array.isArray(definition?.execute) ? definition.execute.length : 0;
        return `${stepCount} step(s)`;
      }
      const checkCount = Array.isArray(definition?.checks) ? definition.checks.length : 0;
      return `${checkCount} check(s)`;
    }

function buildManageDefinitionTagChips(definition = {}) {
      const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
      const platformTags = normalizeTagList(definition?.platformTags);
      const chips = [];
      ownerTags.forEach((tag) => {
        chips.push({ tone: 'owner', label: `owner:${tag}` });
      });
      platformTags.forEach((tag) => {
        chips.push({ tone: 'platform', label: `platform:${tag}` });
      });
      return chips;
    }

function buildManageDefinitionExportFilename(kind, definitionId) {
      const normalizedKind = kind === 'fix' ? 'fix' : 'test';
      const baseName = slugifyRecorderValue(definitionId, normalizedKind);
      return `${baseName}.${normalizedKind}.json`;
    }

function downloadTextFile({ fileName, textValue, mimeType = 'application/json;charset=utf-8' }) {
      const documentRef = typeof document !== 'undefined' ? document : null;
      const anchor = documentRef?.createElement?.('a');
      const urlApi = (typeof window !== 'undefined' && window?.URL)
        ? window.URL
        : (typeof globalThis !== 'undefined' ? globalThis?.URL : null);
      const BlobCtor = typeof Blob === 'function' ? Blob : null;
      if (!anchor || !BlobCtor || typeof urlApi?.createObjectURL !== 'function') {
        throw new Error('File download is unavailable in this browser.');
      }
      const payload = String(textValue ?? '');
      const blob = new BlobCtor([payload], { type: mimeType });
      const url = urlApi.createObjectURL(blob);
      try {
        anchor.href = url;
        anchor.download = normalizeText(fileName, 'definition.json');
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        documentRef?.body?.appendChild?.(anchor);
        anchor.click?.();
      } finally {
        anchor.remove?.();
        if (typeof urlApi?.revokeObjectURL === 'function') {
          if (scheduleDelay) {
            scheduleDelay(() => {
              urlApi.revokeObjectURL(url);
            }, 0);
          } else {
            urlApi.revokeObjectURL(url);
          }
        }
      }
    }

function normalizeDefinitionExportExecute(definition = {}) {
      return (Array.isArray(definition?.execute) ? definition.execute : []).map((step) => {
        const payload = step && typeof step === 'object' ? step : {};
        return {
          ...payload,
          command: normalizeText(payload.command, ''),
        };
      });
    }

function normalizeDefinitionExportChecks(definition = {}) {
      return (Array.isArray(definition?.checks) ? definition.checks : []).map((check, index) => {
        const payload = check && typeof check === 'object' ? check : {};
        return {
          ...payload,
          id: normalizeText(payload.id, `check_${index + 1}`),
          runAtConnection: resolveCheckRunAtConnection(payload, true),
        };
      });
    }

function buildManageDefinitionExportPayload(item) {
      const definition = item?.definition && typeof item.definition === 'object'
        ? item.definition
        : {};
      const id = normalizeText(definition?.id, '');
      const label = normalizeText(definition?.label, id);
      const ownerTags = normalizeTagList(definition?.ownerTags, { ownerDefault: true });
      const platformTags = normalizeTagList(definition?.platformTags);
      const execute = normalizeDefinitionExportExecute(definition);

      if (item?.kind === 'fix') {
        return {
          id,
          label,
          description: normalizeText(definition?.description, ''),
          enabled: definition?.enabled !== false,
          runAtConnection: Boolean(definition?.runAtConnection),
          ownerTags,
          platformTags,
          execute,
        };
      }

      return {
        id,
        label,
        description: normalizeText(definition?.description, ''),
        enabled: definition?.enabled !== false,
        mode: 'orchestrate',
        ownerTags,
        platformTags,
        execute,
        checks: normalizeDefinitionExportChecks(definition),
      };
    }

async function exportManageDefinitionJson(item) {
      const kind = item?.kind === 'fix' ? 'fix' : 'test';
      const definitionId = normalizeText(item?.definition?.id, '');
      if (!definitionId) return '';
      const payload = buildManageDefinitionExportPayload(item);
      const serialized = JSON.stringify(payload, null, 2);
      try {
        downloadTextFile({
          fileName: buildManageDefinitionExportFilename(kind, definitionId),
          textValue: serialized,
        });
        setManageTabStatus(`Downloaded ${kind} definition '${definitionId}' JSON file.`, 'ok');
        return serialized;
      } catch (error) {
        setManageTabStatus(
          `Unable to export ${kind} definition '${definitionId}': ${error instanceof Error ? error.message : String(error)}`,
          'error',
        );
        return '';
      }
    }

function renderManageDefinitionRow(item) {
      const definition = item?.definition || {};
      const id = normalizeText(definition?.id, '');
      if (!id) return null;
      const kind = item?.kind === 'fix' ? 'fix' : 'test';

      const row = document.createElement('div');
      row.className = 'manage-definition-row manage-list-item';

      const summary = document.createElement('div');
      summary.className = 'manage-definition-summary';

      const titleRow = document.createElement('div');
      titleRow.className = 'manage-definition-title-row';

      const typeChip = document.createElement('span');
      typeChip.className = `manage-definition-chip ${kind}`;
      typeChip.textContent = kind === 'fix' ? 'Fix' : 'Test';

      const title = document.createElement('strong');
      title.className = 'manage-definition-title';
      title.textContent = normalizeText(definition?.label, id);

      titleRow.append(typeChip, title);

      const meta = document.createElement('div');
      meta.className = 'manage-definition-meta';
      meta.textContent = `${id} • ${buildManageDefinitionMeta({ kind, definition })}`;

      summary.append(titleRow, meta);
      const tagChips = buildManageDefinitionTagChips(definition);
      if (tagChips.length) {
        const tagsNode = document.createElement('div');
        tagsNode.className = 'manage-definition-tags';
        tagChips.forEach((tagChip) => {
          const chip = document.createElement('span');
          chip.className = `tag-chip ${tagChip.tone}`;
          chip.textContent = tagChip.label;
          tagsNode.appendChild(chip);
        });
        summary.appendChild(tagsNode);
      }

      const actions = document.createElement('div');
      actions.className = 'manage-definition-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'button button-compact';
      editButton.textContent = 'Edit/View';
      editButton.setAttribute('aria-label', `Edit or view ${kind} definition ${id}`);
      editButton.addEventListener('click', () => {
        if (kind === 'fix') {
          loadExistingFixIntoFlow(definition);
        } else {
          loadExistingTestIntoRecorder(definition);
        }
      });

      const duplicateButton = document.createElement('button');
      duplicateButton.type = 'button';
      duplicateButton.className = 'button button-compact';
      duplicateButton.textContent = 'Duplicate';
      duplicateButton.setAttribute('aria-label', `Duplicate ${kind} definition ${id}`);
      duplicateButton.addEventListener('click', () => {
        if (kind === 'fix') {
          duplicateManageFixDefinition(definition);
        } else {
          duplicateManageTestDefinition(definition);
        }
      });

      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.className = 'button button-compact';
      exportButton.textContent = 'Export JSON';
      exportButton.setAttribute('aria-label', `Export ${kind} definition ${id} as JSON`);
      exportButton.addEventListener('click', async () => {
        await exportManageDefinitionJson({ kind, definition });
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'button button-compact button-danger';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', `Remove ${kind} definition ${id}`);
      removeButton.addEventListener('click', async () => {
        if (kind === 'fix') {
          await deleteManageFixDefinition(id);
        } else {
          await deleteManageTestDefinition(id);
        }
      });

      actions.append(editButton, duplicateButton, exportButton, removeButton);
      row.append(summary, actions);
      return row;
    }

function renderManageDefinitionsList() {
      if (!manageDefinitionsList) return;
      manageDefinitionsList.replaceChildren();
      syncManageDefinitionsFilterButtons();
      const items = buildManageDefinitionsListItems();
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'manage-list-empty';
        const activeFilter = getManageDefinitionsFilter();
        empty.textContent = activeFilter === 'fixes'
          ? 'No fix definitions found.'
          : activeFilter === 'tests'
            ? 'No test definitions found.'
            : 'No definitions found.';
        manageDefinitionsList.appendChild(empty);
        return;
      }
      items.forEach((item) => {
        const row = renderManageDefinitionRow(item);
        if (row) manageDefinitionsList.appendChild(row);
      });
    }

function renderManageTestsList() {
      renderManageDefinitionsList();
    }

function renderManageFixesList() {
      renderManageDefinitionsList();
    }

function renderRecorderRobotOptions() {
      if (!recorderRobotSelect) return;
      const previousValue = normalizeText(recorderRobotSelect.value, '');
      recorderRobotSelect.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select robot';
      recorderRobotSelect.appendChild(placeholder);
      state.robots.forEach((robot) => {
        const id = normalizeText(robot?.id, '');
        if (!id) return;
        const typeLabel = normalizeText(robot?.type, normalizeText(robot?.typeId, 'n/a'));
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${normalizeText(robot?.name, id)} (${typeLabel})`;
        recorderRobotSelect.appendChild(option);
      });
      if (previousValue) {
        recorderRobotSelect.value = previousValue;
      }
      syncRecorderUiState();
    }

function renderManageDefinitions() {
      renderManageDefinitionsList();
      renderRecorderRobotTypeTargets();
      renderRecorderRobotOptions();
      if (manageTestRunAtConnectionInput) {
        manageTestRunAtConnectionInput.checked = Boolean(manageTestRunAtConnectionInput.checked);
      }
      if (recorderRunAtConnectionInput) {
        recorderRunAtConnectionInput.checked = Boolean(recorderRunAtConnectionInput.checked);
      }
      if (manageFixRunAtConnectionInput) {
        manageFixRunAtConnectionInput.checked = Boolean(manageFixRunAtConnectionInput.checked);
      }
      setFlowEditorMode(state.manageFlowEditorMode || 'test', { announce: false });
    }

  return {
    ensureFixRobotTypeTargetsRendered,
    getSelectedMappingTypeIds,
    getManageDefinitionsFilter,
    syncManageDefinitionsFilterButtons,
    setManageDefinitionsFilter,
    setFlowEditorMode,
    getManageActiveOwnerProfile,
    matchesManageDefinitionOwnerScope,
    buildManageDefinitionsListItems,
    buildManageDefinitionMeta,
    buildManageDefinitionTagChips,
    buildManageDefinitionExportFilename,
    downloadTextFile,
    normalizeDefinitionExportExecute,
    normalizeDefinitionExportChecks,
    buildManageDefinitionExportPayload,
    exportManageDefinitionJson,
    renderManageDefinitionRow,
    renderManageDefinitionsList,
    renderManageTestsList,
    renderManageFixesList,
    renderRecorderRobotOptions,
    renderManageDefinitions,
  };
}
