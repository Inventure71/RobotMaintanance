export function createDetailModelControlsApi(deps) {
  const {
    addRobotHighModelDropzone,
    addRobotHighModelField,
    addRobotHighModelFileInput,
    addRobotHighModelFileName,
    addRobotIpInfo,
    addRobotIpInfoButton,
    addRobotLowModelDropzone,
    addRobotLowModelField,
    addRobotLowModelFileInput,
    addRobotLowModelFileName,
    addRobotOverrideHighModelSelect,
    addRobotOverrideLowModelSelect,
    addRobotTypeBatteryInfo,
    addRobotTypeBatteryInfoButton,
    addRobotTypeHighModelDropzone,
    addRobotTypeHighModelFileInput,
    addRobotTypeHighModelFileName,
    addRobotTypeLowModelDropzone,
    addRobotTypeLowModelFileInput,
    addRobotTypeLowModelFileName,
    bindBatteryInfoToggle,
    bindUploadDropzone,
    editRobotClearOverrideField,
    editRobotClearOverrideInput,
    editRobotHighModelDropzone,
    editRobotHighModelField,
    editRobotHighModelFileInput,
    editRobotHighModelFileName,
    editRobotIpInfo,
    editRobotIpInfoButton,
    editRobotLowModelDropzone,
    editRobotLowModelField,
    editRobotLowModelFileInput,
    editRobotLowModelFileName,
    editRobotModelStatus,
    editRobotOverrideHighModelSelect,
    editRobotOverrideLowModelSelect,
    editRobotSelect,
    editRobotTypeBatteryInfo,
    editRobotTypeBatteryInfoButton,
    editRobotTypeClearModelField,
    editRobotTypeClearModelInput,
    editRobotTypeHighModelDropzone,
    editRobotTypeHighModelFileInput,
    editRobotTypeHighModelFileName,
    editRobotTypeLowModelDropzone,
    editRobotTypeLowModelFileInput,
    editRobotTypeLowModelFileName,
    editRobotTypeManageSelect,
    editRobotTypeModelStatus,
    getRobotById,
    getRobotTypeById,
    getRobotTypeConfig,
    modelSupportsQuality,
    normalizeText,
    resetRobotOverrideControls,
    setSelectOptionLabel,
    syncRobotModelOverrideVisibility,
    syncUploadDropzoneLabel,
  } = deps;

  function resetRobotTypeUploadInputs() {
    syncUploadDropzoneLabel(addRobotTypeLowModelFileInput, addRobotTypeLowModelFileName);
    syncUploadDropzoneLabel(addRobotTypeHighModelFileInput, addRobotTypeHighModelFileName);
    if (editRobotTypeClearModelInput) editRobotTypeClearModelInput.checked = false;
    if (editRobotTypeClearModelField) editRobotTypeClearModelField.classList.add('hidden');
    if (editRobotTypeLowModelFileInput) editRobotTypeLowModelFileInput.disabled = false;
    if (editRobotTypeHighModelFileInput) editRobotTypeHighModelFileInput.disabled = false;
    syncUploadDropzoneLabel(editRobotTypeLowModelFileInput, editRobotTypeLowModelFileName, 'Keep existing low-res file');
    syncUploadDropzoneLabel(editRobotTypeHighModelFileInput, editRobotTypeHighModelFileName, 'Keep existing high-res file');
    if (editRobotTypeModelStatus) editRobotTypeModelStatus.textContent = 'Type model status unavailable.';
  }

  function syncEditRobotTypeModelControls(typeConfig) {
    const hasModel = Boolean(normalizeText(typeConfig?.model?.file_name, ''));
    const clearModel = Boolean(editRobotTypeClearModelInput?.checked) && hasModel;
    const lowStatus = modelSupportsQuality(typeConfig?.model, 'low')
      ? normalizeText(typeConfig?.model?.file_name, 'configured')
      : 'No low-res file configured';
    const highStatus = modelSupportsQuality(typeConfig?.model, 'high')
      ? normalizeText(typeConfig?.model?.file_name, 'configured')
      : 'No high-res file configured';

    if (editRobotTypeClearModelField) {
      editRobotTypeClearModelField.classList.toggle('hidden', !hasModel);
    }
    if (editRobotTypeClearModelInput && !hasModel) {
      editRobotTypeClearModelInput.checked = false;
    }
    if (editRobotTypeLowModelFileInput) editRobotTypeLowModelFileInput.disabled = clearModel;
    if (editRobotTypeHighModelFileInput) editRobotTypeHighModelFileInput.disabled = clearModel;

    if (clearModel) {
      if (editRobotTypeLowModelFileInput) editRobotTypeLowModelFileInput.value = '';
      if (editRobotTypeHighModelFileInput) editRobotTypeHighModelFileInput.value = '';
      syncUploadDropzoneLabel(
        editRobotTypeLowModelFileInput,
        editRobotTypeLowModelFileName,
        'Class low-res file will be removed on save',
      );
      syncUploadDropzoneLabel(
        editRobotTypeHighModelFileInput,
        editRobotTypeHighModelFileName,
        'Class high-res file will be removed on save',
      );
      if (editRobotTypeModelStatus) {
        editRobotTypeModelStatus.textContent =
          'Class model will be removed on save. Robots without overrides will use the default viewer.';
      }
      return;
    }

    syncUploadDropzoneLabel(editRobotTypeLowModelFileInput, editRobotTypeLowModelFileName, lowStatus);
    syncUploadDropzoneLabel(editRobotTypeHighModelFileInput, editRobotTypeHighModelFileName, highStatus);
    if (editRobotTypeModelStatus) {
      editRobotTypeModelStatus.textContent = '';
    }
  }

  function syncEditRobotModelControls(robot) {
    const typeConfig = getRobotTypeConfig(robot?.typeId || robot?.type);
    const robotModel = robot?.model && typeof robot.model === 'object' ? robot.model : null;
    const typeModel = typeConfig?.model && typeof typeConfig.model === 'object' ? typeConfig.model : null;
    const hasOverride = Boolean(normalizeText(robotModel?.file_name, ''));
    const removeOverride = Boolean(editRobotClearOverrideInput?.checked) && hasOverride;
    const lowUsesOverride = hasOverride && modelSupportsQuality(robotModel, 'low');
    const highUsesOverride = hasOverride && modelSupportsQuality(robotModel, 'high');
    const lowStatus = lowUsesOverride
      ? normalizeText(robotModel?.file_name, 'configured')
      : modelSupportsQuality(typeModel, 'low')
        ? normalizeText(typeModel?.file_name, 'configured')
        : 'No low-res file configured';
    const highStatus = highUsesOverride
      ? normalizeText(robotModel?.file_name, 'configured')
      : modelSupportsQuality(typeModel, 'high')
        ? normalizeText(typeModel?.file_name, 'configured')
        : 'No high-res file configured';

    setSelectOptionLabel(
      editRobotOverrideLowModelSelect,
      'default',
      lowUsesOverride ? 'Keep current override' : 'Keep class model',
    );
    setSelectOptionLabel(
      editRobotOverrideHighModelSelect,
      'default',
      highUsesOverride ? 'Keep current override' : 'Keep class model',
    );
    setSelectOptionLabel(
      editRobotOverrideLowModelSelect,
      'override',
      lowUsesOverride ? 'Replace current override' : 'Upload override',
    );
    setSelectOptionLabel(
      editRobotOverrideHighModelSelect,
      'override',
      highUsesOverride ? 'Replace current override' : 'Upload override',
    );

    if (editRobotModelStatus) {
      editRobotModelStatus.textContent = removeOverride
        ? 'Override will be removed on save. This robot will use the class low/high model files.'
        : '';
    }
    if (editRobotClearOverrideField) {
      editRobotClearOverrideField.classList.toggle('hidden', !hasOverride);
    }
    if (editRobotClearOverrideInput && !hasOverride) {
      editRobotClearOverrideInput.checked = false;
    }
    if (editRobotOverrideLowModelSelect) editRobotOverrideLowModelSelect.disabled = removeOverride;
    if (editRobotOverrideHighModelSelect) editRobotOverrideHighModelSelect.disabled = removeOverride;

    const lowEmptyLabel = lowUsesOverride
      ? `Keep current low-res override (${normalizeText(robotModel?.file_name, 'configured')})`
      : lowStatus;
    const highEmptyLabel = highUsesOverride
      ? `Keep current high-res override (${normalizeText(robotModel?.file_name, 'configured')})`
      : highStatus;

    if (removeOverride) {
      if (editRobotOverrideLowModelSelect) editRobotOverrideLowModelSelect.value = 'default';
      if (editRobotOverrideHighModelSelect) editRobotOverrideHighModelSelect.value = 'default';
    }

    syncRobotModelOverrideVisibility(
      editRobotOverrideLowModelSelect,
      editRobotLowModelField,
      editRobotLowModelFileInput,
      editRobotLowModelFileName,
      lowEmptyLabel,
    );
    syncRobotModelOverrideVisibility(
      editRobotOverrideHighModelSelect,
      editRobotHighModelField,
      editRobotHighModelFileInput,
      editRobotHighModelFileName,
      highEmptyLabel,
    );

    if (normalizeText(editRobotOverrideLowModelSelect?.value, 'default') !== 'override') {
      syncUploadDropzoneLabel(editRobotLowModelFileInput, editRobotLowModelFileName, lowEmptyLabel);
    }
    if (normalizeText(editRobotOverrideHighModelSelect?.value, 'default') !== 'override') {
      syncUploadDropzoneLabel(editRobotHighModelFileInput, editRobotHighModelFileName, highEmptyLabel);
    }
  }

  function initRobotOverrideControls() {
    bindUploadDropzone(
      addRobotLowModelDropzone,
      addRobotLowModelFileInput,
      addRobotLowModelFileName,
      'No low-res override selected',
    );
    bindUploadDropzone(
      addRobotHighModelDropzone,
      addRobotHighModelFileInput,
      addRobotHighModelFileName,
      'No high-res override selected',
    );
    bindUploadDropzone(
      editRobotLowModelDropzone,
      editRobotLowModelFileInput,
      editRobotLowModelFileName,
      'Keep class low-res model',
    );
    bindUploadDropzone(
      editRobotHighModelDropzone,
      editRobotHighModelFileInput,
      editRobotHighModelFileName,
      'Keep class high-res model',
    );
    addRobotOverrideLowModelSelect?.addEventListener('change', () => {
      syncRobotModelOverrideVisibility(
        addRobotOverrideLowModelSelect,
        addRobotLowModelField,
        addRobotLowModelFileInput,
        addRobotLowModelFileName,
        'No low-res override selected',
      );
    });
    addRobotOverrideHighModelSelect?.addEventListener('change', () => {
      syncRobotModelOverrideVisibility(
        addRobotOverrideHighModelSelect,
        addRobotHighModelField,
        addRobotHighModelFileInput,
        addRobotHighModelFileName,
        'No high-res override selected',
      );
    });
    editRobotOverrideLowModelSelect?.addEventListener('change', () => {
      syncEditRobotModelControls(getRobotById(editRobotSelect?.value));
    });
    editRobotOverrideHighModelSelect?.addEventListener('change', () => {
      syncEditRobotModelControls(getRobotById(editRobotSelect?.value));
    });
    editRobotClearOverrideInput?.addEventListener('change', () => {
      syncEditRobotModelControls(getRobotById(editRobotSelect?.value));
    });
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
  }

  function initRobotTypeUploadInputs() {
    bindUploadDropzone(addRobotTypeLowModelDropzone, addRobotTypeLowModelFileInput, addRobotTypeLowModelFileName);
    bindUploadDropzone(addRobotTypeHighModelDropzone, addRobotTypeHighModelFileInput, addRobotTypeHighModelFileName);
    bindUploadDropzone(
      editRobotTypeLowModelDropzone,
      editRobotTypeLowModelFileInput,
      editRobotTypeLowModelFileName,
      'Keep existing low-res file',
    );
    bindUploadDropzone(
      editRobotTypeHighModelDropzone,
      editRobotTypeHighModelFileInput,
      editRobotTypeHighModelFileName,
      'Keep existing high-res file',
    );
    editRobotTypeClearModelInput?.addEventListener('change', () => {
      syncEditRobotTypeModelControls(getRobotTypeById(editRobotTypeManageSelect?.value));
    });
    bindBatteryInfoToggle(addRobotIpInfoButton, addRobotIpInfo);
    bindBatteryInfoToggle(editRobotIpInfoButton, editRobotIpInfo);
    bindBatteryInfoToggle(addRobotTypeBatteryInfoButton, addRobotTypeBatteryInfo);
    bindBatteryInfoToggle(editRobotTypeBatteryInfoButton, editRobotTypeBatteryInfo);
    resetRobotTypeUploadInputs();
  }

  return {
    initRobotOverrideControls,
    initRobotTypeUploadInputs,
    resetRobotTypeUploadInputs,
    syncEditRobotModelControls,
    syncEditRobotTypeModelControls,
  };
}
