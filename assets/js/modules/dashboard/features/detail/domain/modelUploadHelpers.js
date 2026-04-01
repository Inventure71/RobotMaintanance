export function syncUploadDropzoneLabel(input, labelNode, emptyLabel = 'No file selected') {
  if (!labelNode) return;
  const file = input?.files?.[0] || null;
  labelNode.textContent = file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB` : emptyLabel;
}

export function normalizeAvailableQualities({ normalizeText, model }) {
  const raw = Array.isArray(model?.available_qualities)
    ? model.available_qualities
    : Array.isArray(model?.availableQualities)
      ? model.availableQualities
      : null;
  if (!Array.isArray(raw)) return null;
  return raw
    .map((quality) => normalizeText(quality, '').toLowerCase())
    .filter(
      (quality, index, list) =>
        (quality === 'low' || quality === 'high') && list.indexOf(quality) === index,
    );
}

export function modelSupportsQuality({ normalizeText, normalizeAvailableQualities, model, quality }) {
  const fileName = normalizeText(model?.file_name, '');
  if (!fileName) return false;
  const availableQualities = normalizeAvailableQualities(model);
  if (!Array.isArray(availableQualities)) return true;
  return availableQualities.includes(quality);
}

export function setSelectOptionLabel({ selectNode, normalizeText, value, label }) {
  if (!selectNode) return;
  const option = Array.from(selectNode.options || []).find((entry) => normalizeText(entry.value, '') === value);
  if (option) option.textContent = label;
}

export function bindUploadDropzone({
  dropzone,
  input,
  labelNode,
  syncUploadDropzoneLabel,
  emptyLabel = 'No file selected',
}) {
  if (!dropzone || !input) return;
  input.addEventListener('change', () => {
    syncUploadDropzoneLabel(input, labelNode, emptyLabel);
  });
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-drag-over');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === 'dragleave' && event.target !== dropzone) return;
      dropzone.classList.remove('is-drag-over');
    });
  });
  dropzone.addEventListener('drop', (event) => {
    const [file] = Array.from(event?.dataTransfer?.files || []);
    if (!file) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      syncUploadDropzoneLabel(input, labelNode, emptyLabel);
    } catch (_error) {
      // Browser fallback: keep native picker path available.
    }
  });
  syncUploadDropzoneLabel(input, labelNode, emptyLabel);
}

export function syncRobotModelOverrideVisibility({
  selectNode,
  fieldNode,
  inputNode,
  labelNode,
  syncUploadDropzoneLabel,
  normalizeText,
  emptyLabel,
}) {
  if (!selectNode || !fieldNode) return;
  const shouldShow = normalizeText(selectNode.value, 'default') === 'override';
  fieldNode.classList.toggle('hidden', !shouldShow);
  if (!shouldShow && inputNode) {
    inputNode.value = '';
    syncUploadDropzoneLabel(inputNode, labelNode, emptyLabel);
  }
}

export function resetRobotOverrideControls({
  syncRobotModelOverrideVisibility,
  syncUploadDropzoneLabel,
  normalizeText,
  lowSelect,
  highSelect,
  lowField,
  highField,
  lowInput,
  highInput,
  lowLabel,
  highLabel,
  lowEmptyLabel,
  highEmptyLabel,
  clearOverrideInput,
  clearOverrideField,
}) {
  if (lowSelect) lowSelect.value = 'default';
  if (highSelect) highSelect.value = 'default';
  if (lowInput) lowInput.value = '';
  if (highInput) highInput.value = '';
  if (clearOverrideInput) clearOverrideInput.checked = false;
  if (clearOverrideField) clearOverrideField.classList.add('hidden');
  if (lowSelect) lowSelect.disabled = false;
  if (highSelect) highSelect.disabled = false;
  syncRobotModelOverrideVisibility({
    selectNode: lowSelect,
    fieldNode: lowField,
    inputNode: lowInput,
    labelNode: lowLabel,
    syncUploadDropzoneLabel,
    normalizeText,
    emptyLabel: lowEmptyLabel,
  });
  syncRobotModelOverrideVisibility({
    selectNode: highSelect,
    fieldNode: highField,
    inputNode: highInput,
    labelNode: highLabel,
    syncUploadDropzoneLabel,
    normalizeText,
    emptyLabel: highEmptyLabel,
  });
  syncUploadDropzoneLabel(lowInput, lowLabel, lowEmptyLabel);
  syncUploadDropzoneLabel(highInput, highLabel, highEmptyLabel);
}

export function createModelUploadHelpers({ normalizeText }) {
  const normalizeAvailableQualitiesBound = (model) => normalizeAvailableQualities({ normalizeText, model });
  const modelSupportsQualityBound = (model, quality) =>
    modelSupportsQuality({
      normalizeText,
      normalizeAvailableQualities: normalizeAvailableQualitiesBound,
      model,
      quality,
    });
  const setSelectOptionLabelBound = (selectNode, value, label) =>
    setSelectOptionLabel({ selectNode, normalizeText, value, label });
  const bindUploadDropzoneBound = (dropzone, input, labelNode, emptyLabel = 'No file selected') =>
    bindUploadDropzone({
      dropzone,
      input,
      labelNode,
      syncUploadDropzoneLabel,
      emptyLabel,
    });
  const syncRobotModelOverrideVisibilityBound = (
    selectNode,
    fieldNode,
    inputNode,
    labelNode,
    emptyLabel,
  ) => syncRobotModelOverrideVisibility({
    selectNode,
    fieldNode,
    inputNode,
    labelNode,
    syncUploadDropzoneLabel,
    normalizeText,
    emptyLabel,
  });
  const resetRobotOverrideControlsBound = (options = {}) =>
    resetRobotOverrideControls({
      syncRobotModelOverrideVisibility: syncRobotModelOverrideVisibilityBound,
      syncUploadDropzoneLabel,
      normalizeText,
      ...options,
    });

  return {
    syncUploadDropzoneLabel,
    normalizeAvailableQualities: normalizeAvailableQualitiesBound,
    modelSupportsQuality: modelSupportsQualityBound,
    setSelectOptionLabel: setSelectOptionLabelBound,
    bindUploadDropzone: bindUploadDropzoneBound,
    syncRobotModelOverrideVisibility: syncRobotModelOverrideVisibilityBound,
    resetRobotOverrideControls: resetRobotOverrideControlsBound,
  };
}
