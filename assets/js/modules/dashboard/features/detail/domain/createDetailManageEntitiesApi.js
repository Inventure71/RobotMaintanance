export function createDetailManageEntitiesApi(deps) {
  const {
    addRobotMessage,
    addRobotIpInfo,
    addRobotIpInfoButton,
    addRobotTypeMessage,
    addRobotTypeBatteryInfo,
    addRobotTypeBatteryInfoButton,
    addRobotTypeSelect,
    document,
    editRobotDeleteButton,
    editRobotForm,
    editRobotIpInfo,
    editRobotIpInfoButton,
    editRobotIpInput,
    editRobotList,
    editRobotLowModelField,
    editRobotLowModelFileInput,
    editRobotLowModelFileName,
    editRobotModelStatus,
    editRobotNameInput,
    editRobotOverrideHighModelSelect,
    editRobotOverrideLowModelSelect,
    editRobotPasswordInput,
    editRobotSaveButton,
    editRobotSelect,
    editRobotStatus,
    editRobotSummary,
    editRobotTypeDeleteButton,
    editRobotTypeForm,
    editRobotTypeIdInput,
    editRobotTypeList,
    editRobotTypeManageSelect,
    editRobotTypeNameInput,
    editRobotTypeBatteryCommandInput,
    editRobotTypeSaveButton,
    editRobotTypeSelect,
    editRobotTypeStatus,
    editRobotTypeSummary,
    editRobotUsernameInput,
    editRobotHighModelField,
    editRobotHighModelFileInput,
    editRobotHighModelFileName,
    editRobotClearOverrideInput,
    editRobotClearOverrideField,
    editRobotTypeBatteryInfo,
    editRobotTypeBatteryInfoButton,
    env,
    getRobotById,
    loadDefinitionsSummary,
    modelSupportsQuality,
    normalizeText,
    normalizeTypeId,
    refreshRobotsFromBackendSnapshot,
    renderManageEntityList,
    resetRobotOverrideControls,
    resetRobotTypeUploadInputs,
    robotId,
    state,
    syncEditRobotModelControls,
    syncEditRobotTypeModelControls,
  } = deps;

function setMessageNode(node, message, style = '') {
      if (!node) return;
      const normalizedMessage = normalizeText(message, '');
      node.textContent = normalizedMessage;
      node.classList.remove('error', 'ok', 'warn');
      node.classList.toggle('is-empty', !normalizedMessage);
      if (node.style) {
        node.style.display = normalizedMessage ? '' : 'none';
        node.style.minHeight = normalizedMessage ? '' : '0';
        node.style.margin = normalizedMessage ? '' : '0';
      }
      if (style) node.classList.add(style);
    }

function setCollapsibleTextNode(node, message) {
      if (!node) return;
      const normalizedMessage = normalizeText(message, '');
      node.textContent = normalizedMessage;
      node.classList.toggle('is-empty', !normalizedMessage);
      if (node.style) {
        node.style.display = normalizedMessage ? '' : 'none';
        node.style.minHeight = normalizedMessage ? '' : '0';
        node.style.margin = normalizedMessage ? '' : '0';
      }
    }

function getRobotTypeById(typeId) {
      return env.ROBOT_TYPE_BY_ID.get(normalizeTypeId(typeId)) || null;
    }

function setBatteryInfoExpanded(buttonNode, panelNode, expanded) {
      if (!panelNode) return;
      panelNode.classList.toggle('hidden', !expanded);
      if (buttonNode) {
        buttonNode.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    }

function bindBatteryInfoToggle(buttonNode, panelNode) {
      if (!buttonNode || !panelNode || buttonNode.dataset.infoToggleBound === 'true') return;
      buttonNode.dataset.infoToggleBound = 'true';
      buttonNode.addEventListener('click', () => {
        const expanded = buttonNode.getAttribute('aria-expanded') === 'true';
        setBatteryInfoExpanded(buttonNode, panelNode, !expanded);
      });
    }

function resetRobotTypeBatteryInfoPanels() {
      setBatteryInfoExpanded(addRobotIpInfoButton, addRobotIpInfo, false);
      setBatteryInfoExpanded(addRobotTypeBatteryInfoButton, addRobotTypeBatteryInfo, false);
      setBatteryInfoExpanded(editRobotIpInfoButton, editRobotIpInfo, false);
      setBatteryInfoExpanded(editRobotTypeBatteryInfoButton, editRobotTypeBatteryInfo, false);
    }

function countRobotsForType(typeId) {
      const typeKey = normalizeTypeId(typeId);
      return state.robots.filter((robot) => normalizeTypeId(robot?.typeId || robot?.type) === typeKey).length;
    }

function buildKnownTypeEntries() {
      const seenTypes = new Set();
      return env.ROBOT_TYPES
        .map((typeConfig) => {
          const typeId = normalizeText(typeConfig?.typeId, '');
          const typeKey = normalizeTypeId(typeId);
          if (!typeId || seenTypes.has(typeKey)) return null;
          seenTypes.add(typeKey);
          return {
            typeId,
            label: normalizeText(typeConfig?.label, typeId),
            topics: Array.isArray(typeConfig?.topics) ? typeConfig.topics : [],
            model: typeConfig?.model && typeof typeConfig.model === 'object' ? typeConfig.model : null,
            assignedRobotCount: countRobotsForType(typeId),
          };
        })
        .filter(Boolean);
    }

function populateAddRobotTypeOptions(preferredTypeId = '') {
      const typeEntries = buildKnownTypeEntries();

      if (addRobotTypeSelect) {
        const selectedType = normalizeText(preferredTypeId || addRobotTypeSelect.value, '');
        addRobotTypeSelect.replaceChildren();
        if (!typeEntries.length) {
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = 'No robot types found';
          emptyOption.disabled = true;
          addRobotTypeSelect.appendChild(emptyOption);
        } else {
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select a robot type';
          placeholder.disabled = true;
          addRobotTypeSelect.appendChild(placeholder);
          typeEntries.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.typeId;
            option.textContent = entry.label;
            addRobotTypeSelect.appendChild(option);
          });
          const preferred = addRobotTypeSelect.querySelector(`option[value="${selectedType}"]`)
            || addRobotTypeSelect.querySelector('option:not([value=""])');
          if (preferred) preferred.selected = true;
        }
      }

      if (editRobotTypeSelect) {
        const selectedType = normalizeText(preferredTypeId || editRobotTypeSelect.value, '');
        editRobotTypeSelect.replaceChildren();
        if (!typeEntries.length) {
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = 'No robot types found';
          emptyOption.disabled = true;
          editRobotTypeSelect.appendChild(emptyOption);
        } else {
          typeEntries.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.typeId;
            option.textContent = entry.label;
            editRobotTypeSelect.appendChild(option);
          });
          const preferred = editRobotTypeSelect.querySelector(`option[value="${selectedType}"]`)
            || editRobotTypeSelect.querySelector('option');
          if (preferred) preferred.selected = true;
        }
      }

      populateEditRobotTypeOptions(preferredTypeId || state.selectedManageRobotTypeId);
    }

function populateEditRobotTypeOptions(preferredTypeId = '') {
      if (!editRobotTypeManageSelect) return;
      const typeEntries = [...buildKnownTypeEntries()].sort((a, b) => {
        const aLabel = normalizeText(a?.label, '').toLowerCase();
        const bLabel = normalizeText(b?.label, '').toLowerCase();
        return aLabel.localeCompare(bLabel);
      });
      editRobotTypeManageSelect.replaceChildren();
      if (!typeEntries.length) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'No robot types available';
        editRobotTypeManageSelect.appendChild(emptyOption);
        renderManageEntityList({ container: editRobotTypeList, items: [], emptyText: 'No robot types available.' });
        state.selectedManageRobotTypeId = '';
        fillEditRobotTypeForm(null);
        return;
      }
      typeEntries.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.typeId;
        option.textContent = `${entry.label} (${entry.typeId})`;
        editRobotTypeManageSelect.appendChild(option);
      });
      const nextTypeId = preferredTypeId || state.selectedManageRobotTypeId || normalizeText(typeEntries[0]?.typeId, '');
      if (nextTypeId) {
        const option = editRobotTypeManageSelect.querySelector(`option[value="${nextTypeId}"]`)
          || editRobotTypeManageSelect.querySelector('option');
        if (option) option.selected = true;
        state.selectedManageRobotTypeId = normalizeText(option?.value, '');
      }
      renderManageEntityList({
        container: editRobotTypeList,
        items: typeEntries,
        emptyText: 'No robot types available.',
        activeId: state.selectedManageRobotTypeId,
        getId: (entry) => entry.typeId,
        getLabel: (entry) => ({
          title: normalizeText(entry?.label, normalizeText(entry?.typeId, 'Unnamed type')),
          meta: normalizeText(entry?.typeId, ''),
          ariaLabel: `${normalizeText(entry?.label, normalizeText(entry?.typeId, 'Unnamed type'))} ${normalizeText(entry?.typeId, '')}`.trim(),
        }),
        onSelect: (_entry, id) => {
          state.selectedManageRobotTypeId = id;
          if (editRobotTypeManageSelect) editRobotTypeManageSelect.value = id;
          fillEditRobotTypeForm(getRobotTypeById(id));
          setEditRobotTypeMessage('', '');
          populateEditRobotTypeOptions(id);
        },
      });
      fillEditRobotTypeForm(getRobotTypeById(state.selectedManageRobotTypeId));
    }

function populateEditRobotSelectOptions(preferredRobotId = '') {
      if (!editRobotSelect) return;
      const robots = [...state.robots].sort((a, b) => {
        const aName = normalizeText(a?.name, '').toLowerCase();
        const bName = normalizeText(b?.name, '').toLowerCase();
        return aName.localeCompare(bName);
      });
      editRobotSelect.replaceChildren();
      if (!robots.length) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'No robots available';
        editRobotSelect.appendChild(emptyOption);
        renderManageEntityList({ container: editRobotList, items: [], emptyText: 'No robots available.' });
        state.selectedManageRobotId = '';
        fillEditRobotForm(null);
        return;
      }
      robots.forEach((robot) => {
        const id = robotId(robot);
        if (!id) return;
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${normalizeText(robot.name, id)} (${normalizeText(robot.type, 'n/a')})`;
        editRobotSelect.appendChild(option);
      });
      const nextId = preferredRobotId || state.selectedManageRobotId || robotId(robots[0]);
      if (nextId) {
        const option = editRobotSelect.querySelector(`option[value="${nextId}"]`) || editRobotSelect.querySelector('option');
        if (option) option.selected = true;
        state.selectedManageRobotId = normalizeText(option?.value, '');
      }
      renderManageEntityList({
        container: editRobotList,
        items: robots,
        emptyText: 'No robots available.',
        activeId: state.selectedManageRobotId,
        getId: (robot) => robotId(robot),
        getLabel: (robot) => {
          const id = robotId(robot);
          const typeLabel = normalizeText(robot?.type, normalizeText(robot?.typeId, 'n/a'));
          const name = normalizeText(robot?.name, id);
          return {
            title: name,
            meta: typeLabel,
            ariaLabel: `${name} ${typeLabel}`.trim(),
          };
        },
        onSelect: (_robot, id) => {
          state.selectedManageRobotId = id;
          if (editRobotSelect) editRobotSelect.value = id;
          fillEditRobotForm(getRobotById(id));
          setEditRobotMessage('', '');
          populateEditRobotSelectOptions(id);
        },
      });
      fillEditRobotForm(getRobotById(state.selectedManageRobotId));
    }

function fillEditRobotTypeForm(typeConfig) {
      if (!editRobotTypeForm) return;
      if (!typeConfig) {
        if (editRobotTypeIdInput) editRobotTypeIdInput.value = '';
        if (editRobotTypeNameInput) editRobotTypeNameInput.value = '';
        if (editRobotTypeBatteryCommandInput) editRobotTypeBatteryCommandInput.value = '';
        if (editRobotTypeForm) editRobotTypeForm.reset();
        resetRobotTypeUploadInputs();
        resetRobotTypeBatteryInfoPanels();
        setCollapsibleTextNode(editRobotTypeSummary, 'Select a robot type to view details.');
        if (editRobotTypeSaveButton) editRobotTypeSaveButton.disabled = true;
        if (editRobotTypeDeleteButton) editRobotTypeDeleteButton.disabled = true;
        return;
      }
      const typeId = normalizeText(typeConfig.typeId, '');
      const assignedRobotCount = countRobotsForType(typeId);
      if (editRobotTypeForm) editRobotTypeForm.reset();
      if (editRobotTypeIdInput) editRobotTypeIdInput.value = typeId;
      if (editRobotTypeNameInput) editRobotTypeNameInput.value = normalizeText(typeConfig.label, typeId);
      if (editRobotTypeBatteryCommandInput) {
        editRobotTypeBatteryCommandInput.value = normalizeText(typeConfig?.batteryCommand, '');
      }
      resetRobotTypeUploadInputs();
      resetRobotTypeBatteryInfoPanels();
      if (editRobotTypeSummary) {
        const modelFileName = normalizeText(typeConfig?.model?.file_name, 'no model');
        const lowAvailable = modelSupportsQuality(typeConfig?.model, 'low') ? 'configured' : 'missing';
        const highAvailable = modelSupportsQuality(typeConfig?.model, 'high') ? 'configured' : 'missing';
        const batteryState = normalizeText(typeConfig?.batteryCommand, '') ? 'configured' : 'off';
        setCollapsibleTextNode(editRobotTypeSummary, '');
      }
      syncEditRobotTypeModelControls(typeConfig);
      if (editRobotTypeSaveButton) editRobotTypeSaveButton.disabled = false;
      if (editRobotTypeDeleteButton) {
        editRobotTypeDeleteButton.disabled = false;
      }
    }

function fillEditRobotForm(robot) {
      if (!editRobotForm) return;
      if (!robot) {
        if (editRobotNameInput) editRobotNameInput.value = '';
        if (editRobotIpInput) editRobotIpInput.value = '';
        if (editRobotForm) editRobotForm.reset();
        resetRobotOverrideControls({
          lowSelect: editRobotOverrideLowModelSelect,
          highSelect: editRobotOverrideHighModelSelect,
          lowField: editRobotLowModelField,
          highField: editRobotHighModelField,
          lowInput: editRobotLowModelFileInput,
          highInput: editRobotHighModelFileInput,
        lowLabel: editRobotLowModelFileName,
        highLabel: editRobotHighModelFileName,
        lowEmptyLabel: 'Keep class low-res model',
        highEmptyLabel: 'Keep class high-res model',
        clearOverrideInput: editRobotClearOverrideInput,
        clearOverrideField: editRobotClearOverrideField,
      });
        if (editRobotUsernameInput) editRobotUsernameInput.value = '';
        if (editRobotPasswordInput) editRobotPasswordInput.value = '';
        setCollapsibleTextNode(editRobotSummary, 'Select a robot to view details.');
        if (editRobotModelStatus) editRobotModelStatus.textContent = 'Robot currently uses the class model.';
        if (editRobotSaveButton) editRobotSaveButton.disabled = true;
        if (editRobotDeleteButton) editRobotDeleteButton.disabled = true;
        return;
      }
      if (editRobotForm) editRobotForm.reset();
      if (editRobotNameInput) editRobotNameInput.value = normalizeText(robot.name, '');
      if (editRobotTypeSelect) {
        editRobotTypeSelect.value = normalizeText(robot.typeId, normalizeText(robot.type, ''));
      }
      if (editRobotIpInput) editRobotIpInput.value = normalizeText(robot.ip, '');
      resetRobotOverrideControls({
        lowSelect: editRobotOverrideLowModelSelect,
        highSelect: editRobotOverrideHighModelSelect,
        lowField: editRobotLowModelField,
        highField: editRobotHighModelField,
        lowInput: editRobotLowModelFileInput,
        highInput: editRobotHighModelFileInput,
        lowLabel: editRobotLowModelFileName,
        highLabel: editRobotHighModelFileName,
        lowEmptyLabel: 'Keep class low-res model',
        highEmptyLabel: 'Keep class high-res model',
        clearOverrideInput: editRobotClearOverrideInput,
        clearOverrideField: editRobotClearOverrideField,
      });
      syncEditRobotModelControls(robot);
      if (editRobotUsernameInput) editRobotUsernameInput.value = normalizeText(robot?.ssh?.username, '');
      if (editRobotPasswordInput) editRobotPasswordInput.value = normalizeText(robot?.ssh?.password, '');
      if (editRobotSummary) {
        const hasOverride = Boolean(normalizeText(robot?.model?.file_name, ''));
        setCollapsibleTextNode(editRobotSummary, '');
      }
      if (editRobotSaveButton) editRobotSaveButton.disabled = false;
      if (editRobotDeleteButton) editRobotDeleteButton.disabled = false;
    }

function setAddRobotMessage(message, style = 'warn') {
      setMessageNode(addRobotMessage, message, style);
    }

function setEditRobotMessage(message, style = 'warn') {
      setMessageNode(editRobotStatus, message, style);
    }

function setEditRobotTypeMessage(message, style = 'warn') {
      setMessageNode(editRobotTypeStatus, message, style);
    }

function setAddRobotTypeMessage(message, style = 'warn') {
      setMessageNode(addRobotTypeMessage, message, style);
    }

async function parseApiErrorMessage(response, fallbackMessage) {
      const raw = await response.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = normalizeText(parsed?.detail, raw);
      } catch (_error) {
        // Keep raw text.
      }
      return normalizeText(message, fallbackMessage);
    }

async function refreshDefinitionDependentViewsAfterRobotTypeMutation({ preferredTypeId = '' } = {}) {
      const refreshed = await refreshRobotsFromBackendSnapshot({ preferredTypeId });
      await loadDefinitionsSummary();
      return refreshed;
    }


  return {
    setMessageNode,
    setCollapsibleTextNode,
    getRobotTypeById,
    setBatteryInfoExpanded,
    bindBatteryInfoToggle,
    resetRobotTypeBatteryInfoPanels,
    countRobotsForType,
    buildKnownTypeEntries,
    populateAddRobotTypeOptions,
    populateEditRobotTypeOptions,
    populateEditRobotSelectOptions,
    fillEditRobotTypeForm,
    fillEditRobotForm,
    setAddRobotMessage,
    setEditRobotMessage,
    setEditRobotTypeMessage,
    setAddRobotTypeMessage,
    parseApiErrorMessage,
    refreshDefinitionDependentViewsAfterRobotTypeMutation,
  };
}
