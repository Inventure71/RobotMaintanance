export function createRecorderTypeTargetsApi(deps) {
  const {
    manageFixRobotTypeTargets,
    manageTestRobotTypeTargets,
    normalizeIdList,
    normalizeText,
    recorderDefinitionIdInput,
    recorderRobotSelect,
    recorderRobotTypeTargets,
    robotId,
    slugifyRecorderValue,
    state,
  } = deps;

  function renderRecorderRobotTypeTargets() {
    if (!recorderRobotTypeTargets) return;
    recorderRobotTypeTargets.replaceChildren();
    const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
      ? state.definitionsSummary.robotTypes
      : [];
    const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
    const sourceDefinitionId = normalizeText(state.editingTestSourceId, '');
    const normalizedDefinitionId = slugifyRecorderValue(definitionId, '');
    const checkIdPrefix = normalizedDefinitionId ? `${normalizedDefinitionId}__` : '';
    const recorderCheckIdsRaw = state.workflowRecorder?.getCheckIdsForDefinition?.(definitionId);
    const recorderCheckIds = Array.isArray(recorderCheckIdsRaw) ? recorderCheckIdsRaw : [];
    const sourceDefinition = Array.isArray(state.definitionsSummary?.tests)
      ? state.definitionsSummary.tests.find((item) => normalizeText(item?.id, '') === sourceDefinitionId)
      : null;
    const sourceCheckIds = Array.isArray(sourceDefinition?.checks)
      ? sourceDefinition.checks.map((check) => normalizeText(check?.id, '')).filter(Boolean)
      : [];
    const sourceCheckIdPrefix = sourceDefinitionId ? `${sourceDefinitionId}__` : '';
    const mappedTypeIds = new Set();

    if (checkIdPrefix || sourceDefinitionId) {
      robotTypes.forEach((typePayload) => {
        const typeId = normalizeText(typePayload?.id, '');
        if (!typeId) return;
        const testRefs = normalizeIdList(typePayload?.testRefs);
        const isMappedByRef = recorderCheckIds.length
          ? recorderCheckIds.some((checkId) => testRefs.includes(checkId))
          : testRefs.some((ref) => ref.startsWith(checkIdPrefix));
        const isMappedBySourceRef = sourceDefinitionId
          ? sourceCheckIds.length
            ? sourceCheckIds.some((checkId) => testRefs.includes(checkId))
            : testRefs.some((ref) => ref.startsWith(sourceCheckIdPrefix))
          : false;
        if (isMappedByRef || isMappedBySourceRef) {
          mappedTypeIds.add(typeId);
        }
      });
    }

    if (!mappedTypeIds.size) {
      const selectedRobotId = normalizeText(recorderRobotSelect?.value, '');
      const selectedRobot = state.robots.find((robot) => robotId(robot) === selectedRobotId);
      const selectedTypeId = normalizeText(selectedRobot?.typeId, '');
      if (selectedTypeId) {
        mappedTypeIds.add(selectedTypeId);
      }
    }

    if (!robotTypes.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No robot types available.';
      recorderRobotTypeTargets.appendChild(empty);
      return;
    }
    robotTypes.forEach((typePayload) => {
      const typeId = normalizeText(typePayload?.id, '');
      if (!typeId) return;
      const label = normalizeText(typePayload?.name, typeId);
      const row = document.createElement('label');
      row.className = 'recorder-type-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = typeId;
      input.checked = mappedTypeIds.has(typeId);
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      recorderRobotTypeTargets.appendChild(row);
    });
  }

  function getSelectedRecorderTypeIds() {
    if (!recorderRobotTypeTargets) return [];
    const selected = Array.from(recorderRobotTypeTargets.querySelectorAll('input[type="checkbox"]:checked'));
    return selected
      .map((input) => normalizeText(input?.value, ''))
      .filter(Boolean);
  }

  function renderTestRobotTypeTargets(testId) {
    if (!manageTestRobotTypeTargets) return;
    manageTestRobotTypeTargets.replaceChildren();
    const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
      ? state.definitionsSummary.robotTypes
      : [];
    const testIdKey = normalizeText(testId, '');
    const testDefinition = Array.isArray(state.definitionsSummary?.tests)
      ? state.definitionsSummary.tests.find((item) => normalizeText(item?.id, '') === testIdKey)
      : null;
    const checkIds = Array.isArray(testDefinition?.checks)
      ? testDefinition.checks
        .map((check) => normalizeText(check?.id, ''))
        .filter(Boolean)
      : [];
    const mappingRefs = normalizeIdList([testIdKey, ...checkIds]);
    const legacyPrefix = testIdKey ? `${testIdKey}__` : '';

    robotTypes.forEach((typePayload) => {
      const typeId = normalizeText(typePayload?.id, '');
      if (!typeId) return;
      const label = normalizeText(typePayload?.name, typeId);
      const testRefs = normalizeIdList(typePayload?.testRefs);
      const isMapped = mappingRefs.some((ref) => testRefs.includes(ref))
        || (legacyPrefix ? testRefs.some((ref) => ref.startsWith(legacyPrefix)) : false);

      const row = document.createElement('label');
      row.className = 'recorder-type-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = typeId;
      input.checked = isMapped;
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      manageTestRobotTypeTargets.appendChild(row);
    });
  }

  function renderFixRobotTypeTargets(fixId) {
    if (!manageFixRobotTypeTargets) return;
    manageFixRobotTypeTargets.replaceChildren();
    const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
      ? state.definitionsSummary.robotTypes
      : [];
    const fixIdKey = normalizeText(fixId, '');
    const sourceFixId = normalizeText(state.editingFixSourceId, '');

    if (!robotTypes.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No robot types available.';
      manageFixRobotTypeTargets.appendChild(empty);
      return;
    }

    robotTypes.forEach((typePayload) => {
      const typeId = normalizeText(typePayload?.id, '');
      if (!typeId) return;
      const label = normalizeText(typePayload?.name, typeId);
      const fixRefs = Array.isArray(typePayload?.fixRefs) ? typePayload.fixRefs : [];
      const isMapped = fixRefs.includes(fixIdKey) || (sourceFixId ? fixRefs.includes(sourceFixId) : false);

      const row = document.createElement('label');
      row.className = 'recorder-type-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = typeId;
      input.checked = isMapped;
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      manageFixRobotTypeTargets.appendChild(row);
    });
  }

  return {
    getSelectedRecorderTypeIds,
    renderFixRobotTypeTargets,
    renderRecorderRobotTypeTargets,
    renderTestRobotTypeTargets,
  };
}
