export function createDetailRefreshApi({
  addRobotPasswordInput,
  addRobotPasswordToggle,
  applyActionButton,
  dashboard,
  detail,
  getRobotById,
  getRobotTypeById,
  haveRuntimeTestsChanged,
  loadRobotsFromBackend,
  mapRobots,
  normalizeRobotTests,
  normalizeText,
  populateAddRobotTypeOptions,
  populateEditRobotSelectOptions,
  populateEditRobotTypeOptions,
  populateFilters,
  reconcileRenderDashboard,
  reconcileRenderDetail,
  renderRecorderRobotOptions,
  robotId,
  setRobots,
  showDashboard,
  state,
  syncAutoMonitorRefreshState,
  syncAutomatedRobotActivityFromState,
}) {
  function reconcileLoadedRobotDefinitions() {
    const changedRobotIds = new Set();
    mapRobots((robot) => {
      const id = robotId(robot);
      if (!id || !robot || typeof robot !== 'object') return robot;

      const typeConfig = getRobotTypeById(robot.typeId);
      const normalized = normalizeRobotTests(robot.tests || {}, robot.typeId);
      const nextDefinitions = Array.isArray(normalized.definitions) ? normalized.definitions : [];
      const nextTests = normalized.tests && typeof normalized.tests === 'object' ? normalized.tests : {};
      const nextTopics = Array.isArray(typeConfig?.topics) ? typeConfig.topics : [];
      const nextAutoFixes = Array.isArray(typeConfig?.autoFixes) ? typeConfig.autoFixes : [];

      const definitionsChanged = JSON.stringify(robot.testDefinitions || []) !== JSON.stringify(nextDefinitions);
      const testsChanged = haveRuntimeTestsChanged(robot.tests || {}, nextTests);
      const topicsChanged = JSON.stringify(robot.topics || []) !== JSON.stringify(nextTopics);
      const autoFixesChanged = JSON.stringify(robot.autoFixes || []) !== JSON.stringify(nextAutoFixes);

      if (!definitionsChanged && !testsChanged && !topicsChanged && !autoFixesChanged) {
        return robot;
      }

      changedRobotIds.add(id);
      return {
        ...robot,
        tests: nextTests,
        testDefinitions: nextDefinitions,
        topics: nextTopics,
        autoFixes: nextAutoFixes,
      };
    });

    if (!changedRobotIds.size) return changedRobotIds;

    if (dashboard.classList.contains('active')) {
      reconcileRenderDashboard();
    }
    if (detail.classList.contains('active')) {
      const activeRobot = getRobotById(state.detailRobotId);
      if (activeRobot) {
        reconcileRenderDetail(activeRobot);
      }
    }
    return changedRobotIds;
  }

  async function refreshRobotsFromBackendSnapshot(options = {}) {
    const preferredManageRobotId = normalizeText(options?.preferredManageRobotId, '');
    const preferredTypeId = normalizeText(options?.preferredTypeId, '');
    const previousSelectedIds = Array.from(state.selectedRobotIds || []);
    const previousDetailRobotId = normalizeText(state.detailRobotId, '');
    const previousManageRobotId = normalizeText(state.selectedManageRobotId, '');
    try {
      const refreshed = await loadRobotsFromBackend();
      setRobots(refreshed);
    } catch (_error) {
      reconcileLoadedRobotDefinitions();
      return false;
    }

    const validRobotIds = new Set(state.robots.map((robot) => robotId(robot)).filter(Boolean));
    state.selectedRobotIds = new Set(previousSelectedIds.filter((id) => validRobotIds.has(id)));
    state.testingRobotIds = new Set(Array.from(state.testingRobotIds).filter((id) => validRobotIds.has(id)));
    state.searchingRobotIds = new Set(Array.from(state.searchingRobotIds).filter((id) => validRobotIds.has(id)));
    state.fixingRobotIds = new Set(Array.from(state.fixingRobotIds).filter((id) => validRobotIds.has(id)));
    state.autoFixingRobotIds = new Set(Array.from(state.autoFixingRobotIds || []).filter((id) => validRobotIds.has(id)));
    state.autoTestingRobotIds = new Set(Array.from(state.autoTestingRobotIds).filter((id) => validRobotIds.has(id)));
    state.autoSearchingRobotIds = new Set(Array.from(state.autoSearchingRobotIds).filter((id) => validRobotIds.has(id)));
    state.autoActivityRobotIds = new Set(Array.from(state.autoActivityRobotIds).filter((id) => validRobotIds.has(id)));

    if (previousDetailRobotId && !validRobotIds.has(previousDetailRobotId)) {
      state.detailRobotId = null;
    }

    syncAutomatedRobotActivityFromState();
    syncAutoMonitorRefreshState();
    populateFilters();
    populateAddRobotTypeOptions(preferredTypeId);
    populateEditRobotSelectOptions(preferredManageRobotId || previousManageRobotId);
    populateEditRobotTypeOptions(preferredTypeId || state.selectedManageRobotTypeId);
    renderRecorderRobotOptions();

    if (dashboard.classList.contains('active')) {
      reconcileRenderDashboard();
    }

    if (detail.classList.contains('active')) {
      const activeRobot = getRobotById(previousDetailRobotId || state.detailRobotId);
      if (activeRobot) {
        reconcileRenderDetail(activeRobot);
      } else {
        showDashboard({ syncHash: false });
      }
    }

    return true;
  }

  function setAddRobotPasswordVisibility(isVisible) {
    if (!addRobotPasswordInput || !addRobotPasswordToggle) return;
    addRobotPasswordInput.type = isVisible ? 'text' : 'password';
    applyActionButton(addRobotPasswordToggle, {
      intent: 'utility',
      label: isVisible ? 'Hide' : 'Show',
    });
    addRobotPasswordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
  }

  function initAddRobotPasswordToggle() {
    if (!addRobotPasswordToggle || !addRobotPasswordInput) return;
    addRobotPasswordToggle.addEventListener('click', () => {
      setAddRobotPasswordVisibility(addRobotPasswordInput.type === 'password');
    });
  }

  return {
    reconcileLoadedRobotDefinitions,
    refreshRobotsFromBackendSnapshot,
    setAddRobotPasswordVisibility,
    initAddRobotPasswordToggle,
  };
}
