export function createFleetSelectionApi(deps) {
  const {
    FIX_MODE_CONTEXT_DASHBOARD,
    $,
    $$,
    applyActionButton,
    getRobotById,
    normalizeText,
    normalizeTypeId,
    renderFixModeActionsForContext,
    robotId,
    setRunningButtonState,
    state,
    syncSectionToggleButtons,
  } = deps;

  function getRobotTypeKey(robotIdValue) {
    const robot = getRobotById(robotIdValue);
    return normalizeTypeId(normalizeText(robot?.typeId, normalizeText(robot?.type, '')));
  }

  function getSingleRobotTypeKeyForIds(list) {
    const ids = (Array.isArray(list) ? list : []).map((id) => robotId(id)).filter(Boolean);
    let lockedTypeKey = '';
    ids.forEach((id) => {
      const typeKey = getRobotTypeKey(id);
      if (!typeKey || lockedTypeKey) return;
      lockedTypeKey = typeKey;
    });
    return lockedTypeKey;
  }

  function hasMixedRobotTypesForIds(list) {
    const ids = (Array.isArray(list) ? list : []).map((id) => robotId(id)).filter(Boolean);
    let lockedTypeKey = '';
    return ids.some((id) => {
      const typeKey = getRobotTypeKey(id);
      if (!typeKey) return false;
      if (!lockedTypeKey) {
        lockedTypeKey = typeKey;
        return false;
      }
      return typeKey !== lockedTypeKey;
    });
  }

  function filterRobotIdsToSingleType(list, options = {}) {
    const ids = Array.from(new Set(
      (Array.isArray(list) ? list : [])
        .map((id) => robotId(id))
        .filter(Boolean),
    ));
    if (!ids.length) {
      return {
        robotIds: [],
        typeKey: '',
        limited: false,
      };
    }

    const preferredTypeKey = normalizeTypeId(options.lockTypeKey || '');
    const selectionTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
    const lockedTypeKey = preferredTypeKey || selectionTypeKey || getSingleRobotTypeKeyForIds(ids);
    if (!lockedTypeKey) {
      return {
        robotIds: ids,
        typeKey: '',
        limited: false,
      };
    }

    const filteredIds = ids.filter((id) => getRobotTypeKey(id) === lockedTypeKey);
    return {
      robotIds: filteredIds,
      typeKey: lockedTypeKey,
      limited: filteredIds.length !== ids.length,
    };
  }

  function setSelectionConstraintMessage(limited) {
    state.selectionConstraintMessage = limited ? 'Selection limited to a single robot type.' : '';
  }

  function setRobotSelection(robotIdValue, selected) {
    const id = robotId(robotIdValue);
    if (!id) return;
    if (selected) {
      const currentTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
      const nextTypeKey = getRobotTypeKey(id);
      if (state.selectedRobotIds.size && currentTypeKey && nextTypeKey && currentTypeKey !== nextTypeKey) {
        state.selectedRobotIds = new Set([id]);
        setSelectionConstraintMessage(true);
      } else {
        const nextSelection = filterRobotIdsToSingleType(
          [...Array.from(state.selectedRobotIds), id],
          { lockTypeKey: currentTypeKey || nextTypeKey },
        );
        state.selectedRobotIds = new Set(nextSelection.robotIds);
        setSelectionConstraintMessage(nextSelection.limited);
      }
    } else {
      state.selectedRobotIds.delete(id);
      if (!state.selectedRobotIds.size) {
        setSelectionConstraintMessage(false);
      }
    }
    updateSelectionSummary();
    syncSelectionUi();
  }

  function selectRobotIds(list, fallbackSelectAll = false) {
    const targetIds = new Set(
      (Array.isArray(list) ? list : [])
        .map((id) => robotId(id))
        .filter(Boolean),
    );

    if (fallbackSelectAll && !targetIds.size) {
      state.robots.forEach((robot) => {
        const id = robotId(robot);
        if (id) {
          targetIds.add(id);
        }
      });
    }

    if (!targetIds.size) {
      state.selectedRobotIds = targetIds;
      setSelectionConstraintMessage(false);
      updateSelectionSummary();
      syncSelectionUi();
      return;
    }

    const nextSelection = filterRobotIdsToSingleType(Array.from(targetIds));
    state.selectedRobotIds = new Set(nextSelection.robotIds);
    setSelectionConstraintMessage(nextSelection.limited);
    updateSelectionSummary();
    syncSelectionUi();
  }

  function addRobotIdsToSelection(list) {
    const candidateIds = (Array.isArray(list) ? list : [])
      .map((id) => robotId(id))
      .filter(Boolean);
    if (!candidateIds.length) return;

    const currentTypeKey = getSingleRobotTypeKeyForIds(Array.from(state.selectedRobotIds));
    if (state.selectedRobotIds.size && candidateIds.length === 1) {
      const candidateTypeKey = getRobotTypeKey(candidateIds[0]);
      if (currentTypeKey && candidateTypeKey && currentTypeKey !== candidateTypeKey) {
        state.selectedRobotIds = new Set([candidateIds[0]]);
        setSelectionConstraintMessage(true);
        updateSelectionSummary();
        syncSelectionUi();
        return;
      }
    }

    const next = new Set(state.selectedRobotIds);
    candidateIds.forEach((id) => next.add(id));
    const nextSelection = filterRobotIdsToSingleType(Array.from(next), { lockTypeKey: currentTypeKey });
    state.selectedRobotIds = new Set(nextSelection.robotIds);
    setSelectionConstraintMessage(nextSelection.limited);
    updateSelectionSummary();
    syncSelectionUi();
  }

  function removeRobotIdsFromSelection(list) {
    const next = new Set(state.selectedRobotIds);
    (Array.isArray(list) ? list : [])
      .map((id) => robotId(id))
      .filter(Boolean)
      .forEach((id) => next.delete(id));
    state.selectedRobotIds = next;
    updateSelectionSummary();
    syncSelectionUi();
  }

  function areAllRobotIdsSelected(list) {
    const ids = (Array.isArray(list) ? list : [])
      .map((id) => robotId(id))
      .filter(Boolean);
    if (!ids.length) return false;
    return ids.every((id) => state.selectedRobotIds.has(id));
  }

  function updateSelectionSummary() {
    const summary = $('#selectionSummary');
    if (!summary) return;
    const baseSummary = `${state.selectedRobotIds.size} robot(s) selected`;
    const constraintMessage = normalizeText(state.selectionConstraintMessage, '');
    summary.textContent = constraintMessage ? `${baseSummary} - ${constraintMessage}` : baseSummary;
    syncRunSelectedButtonLabel();
    syncGlobalSelectionButton();
    if (state.fixModeOpen.dashboard) {
      renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
    }
  }

  function getRunSelectedButtonIdleLabel() {
    return state.selectedRobotIds.size > 0 ? 'Run selected' : 'Run selected (default online)';
  }

  function syncRunSelectedButtonLabel() {
    const runSelectedButton = $('#runSelectedRobotTests');
    if (!runSelectedButton) return;
    setRunningButtonState(Boolean(state.isTestRunInProgress));
  }

  function syncSelectionUi() {
    const cards = $$('[data-robot-id]');
    cards.forEach((card) => {
      const id = normalizeText(card.getAttribute('data-robot-id'), '');
      if (!id) return;
      const selected = state.selectedRobotIds.has(id);
      card.classList.toggle('selected', selected);
      const button = card.querySelector('[data-action="select-robot"]');
      if (!button) return;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('aria-label', selected ? 'Deselect robot' : 'Select robot');
      button.setAttribute('title', selected ? 'Deselect robot' : 'Select robot');
      applyActionButton(button, {
        intent: 'selection',
        pressed: selected,
        label: selected ? '[x]' : '[ ]',
      });
    });
    syncSectionToggleButtons();
    syncGlobalSelectionButton();
  }

  function syncGlobalSelectionButton() {
    const selectAllButton = $('#selectAllRobots');
    if (!selectAllButton) return;
    const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
    const allSelected = areAllRobotIdsSelected(allIds);
    applyActionButton(selectAllButton, {
      intent: 'selection',
      pressed: allSelected,
      label: allSelected ? 'Deselect all robots' : 'Select all robots',
    });
    selectAllButton.classList.toggle('toggle-on', allSelected);
    selectAllButton.setAttribute('aria-pressed', allSelected ? 'true' : 'false');
  }

  return {
    addRobotIdsToSelection,
    areAllRobotIdsSelected,
    filterRobotIdsToSingleType,
    getRobotTypeKey,
    getRunSelectedButtonIdleLabel,
    getSingleRobotTypeKeyForIds,
    hasMixedRobotTypesForIds,
    removeRobotIdsFromSelection,
    selectRobotIds,
    setRobotSelection,
    syncGlobalSelectionButton,
    syncRunSelectedButtonLabel,
    syncSelectionUi,
    updateSelectionSummary,
  };
}
