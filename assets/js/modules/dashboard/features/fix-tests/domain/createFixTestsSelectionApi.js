export function createFixTestsSelectionApi({
  $,
  state,
  normalizeStatus,
  applyFilters,
  robotId,
  areAllRobotIdsSelected,
  selectRobotIds,
  addRobotIdsToSelection,
  removeRobotIdsFromSelection,
  applyActionButton,
}) {
  function selectAllRobots() {
    const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
    if (areAllRobotIdsSelected(allIds)) {
      selectRobotIds([], false);
      return;
    }
    selectRobotIds(allIds, true);
  }

  function getVisibleOnlineRobotIds() {
    return applyFilters()
      .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
      .map((robot) => robotId(robot));
  }

  function getVisibleOfflineRobotIds() {
    return applyFilters()
      .filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok')
      .map((robot) => robotId(robot));
  }

  function syncSectionToggleButtons() {
    const onlineButton = $('#selectAllOnlineRobots');
    const offlineButton = $('#selectAllOfflineRobots');

    const onlineIds = getVisibleOnlineRobotIds();
    const offlineIds = getVisibleOfflineRobotIds();

    if (onlineButton) {
      const allOnlineSelected = areAllRobotIdsSelected(onlineIds);
      applyActionButton(onlineButton, {
        intent: 'selection',
        pressed: allOnlineSelected,
        disabled: onlineIds.length === 0,
        label: allOnlineSelected ? 'Deselect all online' : 'Select all online',
        compact: true,
      });
      onlineButton.classList.toggle('toggle-on', allOnlineSelected);
      onlineButton.setAttribute('aria-pressed', allOnlineSelected ? 'true' : 'false');
    }

    if (offlineButton) {
      const allOfflineSelected = areAllRobotIdsSelected(offlineIds);
      applyActionButton(offlineButton, {
        intent: 'selection',
        pressed: allOfflineSelected,
        disabled: offlineIds.length === 0,
        label: allOfflineSelected ? 'Deselect all offline' : 'Select all offline',
        compact: true,
      });
      offlineButton.classList.toggle('toggle-on', allOfflineSelected);
      offlineButton.setAttribute('aria-pressed', allOfflineSelected ? 'true' : 'false');
    }
  }

  function selectAllOnlineRobots() {
    const ids = getVisibleOnlineRobotIds();
    if (areAllRobotIdsSelected(ids)) {
      removeRobotIdsFromSelection(ids);
      return;
    }
    addRobotIdsToSelection(ids);
  }

  function selectAllOfflineRobots() {
    const ids = getVisibleOfflineRobotIds();
    if (areAllRobotIdsSelected(ids)) {
      removeRobotIdsFromSelection(ids);
      return;
    }
    addRobotIdsToSelection(ids);
  }

  return {
    selectAllRobots,
    getVisibleOnlineRobotIds,
    getVisibleOfflineRobotIds,
    syncSectionToggleButtons,
    selectAllOnlineRobots,
    selectAllOfflineRobots,
  };
}
