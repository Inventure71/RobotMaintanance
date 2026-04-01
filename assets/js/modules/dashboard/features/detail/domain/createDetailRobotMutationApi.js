export function createDetailRobotMutationApi(deps) {
  const {
    addRobotForm,
    addRobotHighModelField,
    addRobotHighModelFileInput,
    addRobotHighModelFileName,
    addRobotLowModelField,
    addRobotLowModelFileInput,
    addRobotLowModelFileName,
    addRobotOverrideHighModelSelect,
    addRobotOverrideLowModelSelect,
    addRobotSavingHint,
    addRobotTypeForm,
    addRobotTypeHighModelFileInput,
    addRobotTypeLowModelFileInput,
    addRobotTypeSaveButton,
    buildApiUrl,
    editRobotClearOverrideInput,
    editRobotDeleteButton,
    editRobotHighModelField,
    editRobotHighModelFileInput,
    editRobotHighModelFileName,
    editRobotIpInput,
    editRobotLowModelField,
    editRobotLowModelFileInput,
    editRobotLowModelFileName,
    editRobotNameInput,
    editRobotOverrideHighModelSelect,
    editRobotOverrideLowModelSelect,
    editRobotPasswordInput,
    editRobotSaveButton,
    editRobotSelect,
    editRobotTypeClearModelInput,
    editRobotTypeDeleteButton,
    editRobotTypeForm,
    editRobotTypeHighModelFileInput,
    editRobotTypeLowModelFileInput,
    editRobotTypeManageSelect,
    editRobotTypeSaveButton,
    editRobotTypeSelect,
    editRobotUsernameInput,
    env,
    getRobotById,
    getRobotTypeById,
    normalizeText,
    normalizeTypeId,
    parseApiErrorMessage,
    populateEditRobotSelectOptions,
    refreshDefinitionDependentViewsAfterRobotTypeMutation,
    refreshRobotsFromBackendSnapshot,
    resetRobotOverrideControls,
    resetRobotTypeBatteryInfoPanels,
    resetRobotTypeUploadInputs,
    setActionButtonLoading,
    setActiveManageTab,
    setActiveRobotRegistryPanel,
    setAddRobotMessage,
    setAddRobotTypeMessage,
    setEditRobotMessage,
    setEditRobotTypeMessage,
    state,
    window,
  } = deps;

async function createRobotFromForm() {
      if (!addRobotForm || state.isCreateRobotInProgress) return;
      const form = new FormData(addRobotForm);
      const name = normalizeText(form.get('name'), '');
      const typeId = normalizeText(form.get('type'), '');
      const ip = normalizeText(form.get('ip'), '');
      const username = normalizeText(form.get('username'), '');
      const password = normalizeText(form.get('password'), '');
      const lowOverrideEnabled = normalizeText(addRobotOverrideLowModelSelect?.value, 'default') === 'override';
      const highOverrideEnabled = normalizeText(addRobotOverrideHighModelSelect?.value, 'default') === 'override';
      const lowModelFile = addRobotLowModelFileInput?.files?.[0] || null;
      const highModelFile = addRobotHighModelFileInput?.files?.[0] || null;

      if (!name || !typeId || !ip || !username || !password) {
        setAddRobotMessage('All fields except model fields are required.', 'error');
        return;
      }
      if (lowOverrideEnabled && !lowModelFile) {
        setAddRobotMessage('Choose a low quality override file or keep the class model.', 'error');
        return;
      }
      if (highOverrideEnabled && !highModelFile) {
        setAddRobotMessage('Choose a high quality override file or keep the class model.', 'error');
        return;
      }

      const knownType = env.ROBOT_TYPES.some(
        (type) => normalizeTypeId(type?.typeId) === normalizeTypeId(typeId),
      );
      if (!knownType) {
        setAddRobotMessage('Selected type is invalid. Choose an existing type.', 'error');
        return;
      }

      state.isCreateRobotInProgress = true;
      const saveButton = addRobotForm.querySelector('button[type="submit"]');
      if (saveButton) {
        setActionButtonLoading(saveButton, true, {
          loadingLabel: 'Saving...',
          idleLabel: 'Save robot',
        });
      }
      if (addRobotSavingHint) {
        addRobotSavingHint.textContent = 'Saving robot...';
      }

      try {
        const payload = new FormData();
        payload.set('name', name);
        payload.set('type', typeId);
        payload.set('ip', ip);
        payload.set('username', username);
        payload.set('password', password);
        if (lowOverrideEnabled && lowModelFile) payload.set('lowModelFile', lowModelFile);
        if (highOverrideEnabled && highModelFile) payload.set('highModelFile', highModelFile);
        const response = await fetch(buildApiUrl('/api/robots'), {
          method: 'POST',
          body: payload,
        });

        if (!response.ok) {
          const responseText = await response.text();
          setAddRobotMessage(responseText || 'Unable to create robot.', 'error');
          return;
        }
        const createdRobot = await response.json();

        setAddRobotMessage('Robot created and written to config.', 'ok');
        await refreshRobotsFromBackendSnapshot();
        populateEditRobotSelectOptions(normalizeText(createdRobot?.id, ''));
        setEditRobotMessage('New robot is ready for review/editing.', 'ok');
        if (editRobotSelect?.value) {
          setActiveManageTab('robots', { syncHash: false, persist: true });
          setActiveRobotRegistryPanel('existing-robots');
        }
        if (addRobotForm) addRobotForm.reset();
        resetRobotOverrideControls({
          lowSelect: addRobotOverrideLowModelSelect,
          highSelect: addRobotOverrideHighModelSelect,
          lowField: addRobotLowModelField,
          highField: addRobotHighModelField,
          lowInput: addRobotLowModelFileInput,
          highInput: addRobotHighModelFileInput,
          lowLabel: addRobotLowModelFileName,
          highLabel: addRobotHighModelFileName,
          lowEmptyLabel: 'No low-res override selected',
          highEmptyLabel: 'No high-res override selected',
        });
      } finally {
        state.isCreateRobotInProgress = false;
        if (saveButton) {
          setActionButtonLoading(saveButton, false, {
            idleLabel: 'Save robot',
          });
        }
        if (addRobotSavingHint) {
          addRobotSavingHint.textContent = '';
        }
      }
    }

async function saveRobotEditsFromForm() {
      const selectedRobotId = normalizeText(editRobotSelect?.value, '');
      if (!selectedRobotId || state.isEditRobotInProgress) return;
      const name = normalizeText(editRobotNameInput?.value, '');
      const type = normalizeText(editRobotTypeSelect?.value, '');
      const ip = normalizeText(editRobotIpInput?.value, '');
      const username = normalizeText(editRobotUsernameInput?.value, '');
      const password = normalizeText(editRobotPasswordInput?.value, '');
      const lowOverrideEnabled = normalizeText(editRobotOverrideLowModelSelect?.value, 'default') === 'override';
      const highOverrideEnabled = normalizeText(editRobotOverrideHighModelSelect?.value, 'default') === 'override';
      const clearModelOverride = Boolean(editRobotClearOverrideInput?.checked);
      const lowModelFile = editRobotLowModelFileInput?.files?.[0] || null;
      const highModelFile = editRobotHighModelFileInput?.files?.[0] || null;
      if (!name || !type || !ip || !username || !password) {
        setEditRobotMessage('All fields except model fields are required.', 'error');
        return;
      }
      if (clearModelOverride && (lowOverrideEnabled || highOverrideEnabled || lowModelFile || highModelFile)) {
        setEditRobotMessage('Choose either override removal or replacement uploads, not both.', 'error');
        return;
      }
      if (lowOverrideEnabled && !lowModelFile) {
        setEditRobotMessage('Choose a low quality override file or keep the class model.', 'error');
        return;
      }
      if (highOverrideEnabled && !highModelFile) {
        setEditRobotMessage('Choose a high quality override file or keep the class model.', 'error');
        return;
      }
      state.isEditRobotInProgress = true;
      if (editRobotSaveButton) {
        setActionButtonLoading(editRobotSaveButton, true, {
          loadingLabel: 'Saving...',
          idleLabel: 'Save changes',
        });
      }
      try {
        const payload = new FormData();
        payload.set('name', name);
        payload.set('type', type);
        payload.set('ip', ip);
        payload.set('username', username);
        payload.set('password', password);
        if (clearModelOverride) payload.set('clearModelOverride', 'true');
        if (lowOverrideEnabled && lowModelFile) payload.set('lowModelFile', lowModelFile);
        if (highOverrideEnabled && highModelFile) payload.set('highModelFile', highModelFile);
        const response = await fetch(buildApiUrl(`/api/robots/${encodeURIComponent(selectedRobotId)}`), {
          method: 'PUT',
          body: payload,
        });
        if (!response.ok) {
          const responseText = await response.text();
          setEditRobotMessage(responseText || 'Unable to update robot.', 'error');
          return;
        }
        setEditRobotMessage('Robot updated successfully.', 'ok');
        await refreshRobotsFromBackendSnapshot();
      } finally {
        state.isEditRobotInProgress = false;
        if (editRobotSaveButton) {
          setActionButtonLoading(editRobotSaveButton, false, { idleLabel: 'Save changes' });
        }
      }
    }

async function deleteSelectedRobotFromForm() {
      const selectedRobotId = normalizeText(editRobotSelect?.value, '');
      if (!selectedRobotId || state.isDeleteRobotInProgress) return;
      const robot = getRobotById(selectedRobotId);
      const label = normalizeText(robot?.name, selectedRobotId);
      if (!window.confirm(`Delete robot "${label}"? This cannot be undone.`)) {
        return;
      }
      state.isDeleteRobotInProgress = true;
      if (editRobotDeleteButton) {
        setActionButtonLoading(editRobotDeleteButton, true, {
          loadingLabel: 'Deleting...',
          idleLabel: 'Delete robot',
        });
      }
      try {
        const response = await fetch(buildApiUrl(`/api/robots/${encodeURIComponent(selectedRobotId)}`), {
          method: 'DELETE',
        });
        if (!response.ok) {
          const responseText = await response.text();
          setEditRobotMessage(responseText || 'Unable to delete robot.', 'error');
          return;
        }
        setEditRobotMessage('Robot deleted from registry.', 'ok');
        await refreshRobotsFromBackendSnapshot();
        populateEditRobotSelectOptions('');
      } finally {
        state.isDeleteRobotInProgress = false;
        if (editRobotDeleteButton) {
          setActionButtonLoading(editRobotDeleteButton, false, { idleLabel: 'Delete robot' });
        }
      }
    }

async function saveRobotTypeEditsFromForm() {
      const selectedTypeId = normalizeText(editRobotTypeManageSelect?.value, '');
      if (!selectedTypeId || state.isEditRobotTypeInProgress) return;
      const form = new FormData(editRobotTypeForm);
      const name = normalizeText(form.get('name'), '');
      const batteryCommand = normalizeText(form.get('batteryCommand'), '');
      const clearModel = Boolean(editRobotTypeClearModelInput?.checked);
      const lowModelFile = editRobotTypeLowModelFileInput?.files?.[0] || null;
      const highModelFile = editRobotTypeHighModelFileInput?.files?.[0] || null;
      if (!name) {
        setEditRobotTypeMessage('Display name is required.', 'error');
        return;
      }
      if (clearModel && (lowModelFile || highModelFile)) {
        setEditRobotTypeMessage('Choose either class model removal or replacement uploads, not both.', 'error');
        return;
      }
      state.isEditRobotTypeInProgress = true;
      if (editRobotTypeSaveButton) {
        setActionButtonLoading(editRobotTypeSaveButton, true, {
          loadingLabel: 'Saving...',
          idleLabel: 'Save type',
        });
      }
      try {
        const payload = new FormData();
        payload.set('name', name);
        payload.set('batteryCommand', batteryCommand);
        if (clearModel) payload.set('clearModel', 'true');
        if (lowModelFile) payload.set('lowModelFile', lowModelFile);
        if (highModelFile) payload.set('highModelFile', highModelFile);
        const response = await fetch(buildApiUrl(`/api/robot-types/${encodeURIComponent(selectedTypeId)}`), {
          method: 'PUT',
          body: payload,
        });
        if (!response.ok) {
          setEditRobotTypeMessage(await parseApiErrorMessage(response, 'Unable to update robot type.'), 'error');
          return;
        }
        setEditRobotTypeMessage('Robot type updated successfully.', 'ok');
        await refreshDefinitionDependentViewsAfterRobotTypeMutation({ preferredTypeId: selectedTypeId });
      } finally {
        state.isEditRobotTypeInProgress = false;
        if (editRobotTypeSaveButton) {
          setActionButtonLoading(editRobotTypeSaveButton, false, { idleLabel: 'Save type' });
        }
      }
    }

async function deleteSelectedRobotTypeFromForm() {
      const selectedTypeId = normalizeText(editRobotTypeManageSelect?.value, '');
      if (!selectedTypeId || state.isDeleteRobotTypeInProgress) return;
      const typeConfig = getRobotTypeById(selectedTypeId);
      const label = normalizeText(typeConfig?.label, selectedTypeId);
      if (!window.confirm(`Delete robot type "${label}"? This cannot be undone.`)) {
        return;
      }
      state.isDeleteRobotTypeInProgress = true;
      if (editRobotTypeDeleteButton) {
        setActionButtonLoading(editRobotTypeDeleteButton, true, {
          loadingLabel: 'Deleting...',
          idleLabel: 'Delete type',
        });
      }
      try {
        const response = await fetch(buildApiUrl(`/api/robot-types/${encodeURIComponent(selectedTypeId)}`), {
          method: 'DELETE',
        });
        if (!response.ok) {
          setEditRobotTypeMessage(await parseApiErrorMessage(response, 'Unable to delete robot type.'), 'error');
          return;
        }
        if (normalizeText(state.selectedManageRobotTypeId, '') === selectedTypeId) {
          state.selectedManageRobotTypeId = '';
        }
        setEditRobotTypeMessage('Robot type deleted.', 'ok');
        await refreshDefinitionDependentViewsAfterRobotTypeMutation();
      } finally {
        state.isDeleteRobotTypeInProgress = false;
        if (editRobotTypeDeleteButton) {
          setActionButtonLoading(editRobotTypeDeleteButton, false, { idleLabel: 'Delete type' });
        }
      }
    }

    async function createRobotTypeFromForm() {
      if (!addRobotTypeForm || state.isCreateRobotTypeInProgress) return;
      const form = new FormData(addRobotTypeForm);
      const name = normalizeText(form.get('name'), '');
      const batteryCommand = normalizeText(form.get('batteryCommand'), '');
      const lowModelFile = addRobotTypeLowModelFileInput?.files?.[0] || null;
      const highModelFile = addRobotTypeHighModelFileInput?.files?.[0] || null;
      if (!name) {
        setAddRobotTypeMessage('Display name is required.', 'error');
        return;
      }
      if (!lowModelFile || !highModelFile) {
        setAddRobotTypeMessage('Both low and high quality model files are required.', 'error');
        return;
      }
      state.isCreateRobotTypeInProgress = true;
      if (addRobotTypeSaveButton) {
        setActionButtonLoading(addRobotTypeSaveButton, true, {
          loadingLabel: 'Creating...',
          idleLabel: 'Create robot type',
        });
      }
      try {
        const payload = new FormData();
        payload.set('name', name);
        payload.set('batteryCommand', batteryCommand);
        payload.set('lowModelFile', lowModelFile);
        payload.set('highModelFile', highModelFile);
        const response = await fetch(buildApiUrl('/api/robot-types'), {
          method: 'POST',
          body: payload,
        });
        if (!response.ok) {
          setAddRobotTypeMessage(await parseApiErrorMessage(response, 'Unable to create robot type.'), 'error');
          return;
        }
        const createdType = await response.json();
        const createdTypeId = normalizeText(createdType?.typeId || createdType?.id, '');
        setAddRobotTypeMessage('Robot type created and saved.', 'ok');
        await refreshDefinitionDependentViewsAfterRobotTypeMutation({ preferredTypeId: createdTypeId });
        if (addRobotTypeForm) addRobotTypeForm.reset();
        resetRobotTypeUploadInputs();
        resetRobotTypeBatteryInfoPanels();
        setActiveRobotRegistryPanel('new-robot-type');
      } finally {
        state.isCreateRobotTypeInProgress = false;
        if (addRobotTypeSaveButton) {
          setActionButtonLoading(addRobotTypeSaveButton, false, { idleLabel: 'Create robot type' });
        }
      }
    }

  return {
    createRobotFromForm,
    saveRobotEditsFromForm,
    deleteSelectedRobotFromForm,
    saveRobotTypeEditsFromForm,
    deleteSelectedRobotTypeFromForm,
    createRobotTypeFromForm,
  };
}
