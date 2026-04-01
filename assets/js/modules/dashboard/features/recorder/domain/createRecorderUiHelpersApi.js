export function createRecorderUiHelpersApi({
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
  manageTabStatus,
  manageTestRunAtConnectionInput,
  normalizeTagList,
  normalizeText,
  recorderDefinitionIdInput,
  recorderDefinitionLabelInput,
  recorderOutputFailDetailsInput,
  recorderOutputIconInput,
  recorderOutputKeyInput,
  recorderOutputLabelInput,
  recorderOutputPassDetailsInput,
  recorderReadInputRefSelect,
  recorderReadKindSelect,
  recorderReadLinesInput,
  recorderReadNeedleInput,
  recorderReadNeedlesInput,
  recorderReadOutputKeySelect,
  recorderReadRequireAllInput,
  recorderRunAtConnectionInput,
  state,
  syncRecorderReadKindFields,
}) {
  function setManageTabStatus(message = '', tone = '') {
    if (!manageTabStatus) return;
    manageTabStatus.textContent = message;
    manageTabStatus.classList.remove('ok', 'warn', 'error');
    if (tone) {
      manageTabStatus.classList.add(tone);
    }
  }

  function setManageEditorStatus(element, message = '', tone = '') {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('ok', 'warn', 'error');
    if (tone) {
      element.classList.add(tone);
    }
  }

  function normalizeDefinitionsSummary(payload) {
    const safe = payload && typeof payload === 'object' ? payload : {};
    const normalizeDefinitionWithTags = (definition, ownerDefault = true) => {
      const entry = definition && typeof definition === 'object' ? definition : {};
      return {
        ...entry,
        ownerTags: normalizeTagList(entry.ownerTags, { ownerDefault }),
        platformTags: normalizeTagList(entry.platformTags),
      };
    };
    return {
      commandPrimitives: Array.isArray(safe.commandPrimitives) ? safe.commandPrimitives : [],
      tests: Array.isArray(safe.tests) ? safe.tests.map((test) => normalizeDefinitionWithTags(test, true)) : [],
      checks: Array.isArray(safe.checks) ? safe.checks : [],
      fixes: Array.isArray(safe.fixes) ? safe.fixes.map((fix) => normalizeDefinitionWithTags(fix, true)) : [],
      robotTypes: Array.isArray(safe.robotTypes) ? safe.robotTypes : [],
    };
  }

  function getManageTestRunAtConnectionValue() {
    return Boolean(manageTestRunAtConnectionInput?.checked);
  }

  function getRecorderRunAtConnectionDefault() {
    return Boolean(recorderRunAtConnectionInput?.checked);
  }

  function isRecorderMetadataReady() {
    return normalizeText(recorderDefinitionIdInput?.value, '') !== ''
      && normalizeText(recorderDefinitionLabelInput?.value, '') !== '';
  }

  function isRecorderTooltipAnchor(node) {
    if (!node) return false;
    if (typeof node.classList?.contains === 'function' && node.classList.contains('recorder-button-tooltip-anchor')) {
      return true;
    }
    return normalizeText(node.className, '')
      .split(/\s+/)
      .includes('recorder-button-tooltip-anchor');
  }

  function setRecorderButtonTooltip(button, message = '') {
    if (!button) return;
    const tooltip = normalizeText(message, '');
    button.title = tooltip;
    if (button.style) {
      button.style.pointerEvents = tooltip && button.disabled ? 'none' : '';
    }
    const anchor = isRecorderTooltipAnchor(button.parentNode) ? button.parentNode : null;
    if (anchor) {
      anchor.title = tooltip;
    }
  }

  function setRecorderButtonDisabledState(button, disabled, tooltip = '') {
    if (!button) return;
    button.disabled = Boolean(disabled);
    setRecorderButtonTooltip(button, button.disabled ? tooltip : '');
  }

  function clearRecorderOutputForm() {
    if (recorderOutputKeyInput) recorderOutputKeyInput.value = '';
    if (recorderOutputLabelInput) recorderOutputLabelInput.value = '';
    if (recorderOutputIconInput) recorderOutputIconInput.value = '';
    if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = '';
    if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = '';
  }

  function clearRecorderReadForm() {
    if (recorderReadOutputKeySelect) recorderReadOutputKeySelect.value = '';
    if (recorderReadInputRefSelect) recorderReadInputRefSelect.value = '';
    if (recorderReadKindSelect) recorderReadKindSelect.value = 'contains_string';
    if (recorderReadNeedleInput) recorderReadNeedleInput.value = '';
    if (recorderReadNeedlesInput) recorderReadNeedlesInput.value = '';
    if (recorderReadLinesInput) recorderReadLinesInput.value = '';
    if (recorderReadRequireAllInput) recorderReadRequireAllInput.checked = true;
    syncRecorderReadKindFields();
  }

  function clearCheckedMappings(container) {
    if (!container) return;
    Array.from(container.querySelectorAll('input[type="checkbox"]')).forEach((input) => {
      input.checked = false;
    });
  }

  function clearManageFixEditor() {
    state.editingFixSourceId = '';
    if (manageFixIdInput) manageFixIdInput.value = '';
    if (manageFixLabelInput) manageFixLabelInput.value = '';
    if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
    if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
    if (manageFixRunAtConnectionInput) manageFixRunAtConnectionInput.checked = false;
    if (manageFixOwnerTagsInput) manageFixOwnerTagsInput.value = '';
    if (manageFixPlatformTagsInput) manageFixPlatformTagsInput.value = '';
    if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
    if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
    setManageEditorStatus(manageFixEditorStatus, '', '');
  }

  return {
    setManageTabStatus,
    setManageEditorStatus,
    normalizeDefinitionsSummary,
    getManageTestRunAtConnectionValue,
    getRecorderRunAtConnectionDefault,
    isRecorderMetadataReady,
    setRecorderButtonTooltip,
    setRecorderButtonDisabledState,
    clearRecorderOutputForm,
    clearRecorderReadForm,
    clearCheckedMappings,
    clearManageFixEditor,
  };
}
