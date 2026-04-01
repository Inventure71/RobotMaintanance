export function createFleetDashboardApi({
  $,
  FIX_MODE_CONTEXT_DASHBOARD,
  dashboard,
  emptyState,
  getScopedTestEntries,
  isUnknownResult,
  hydrateActionButtons,
  invalidateCountdownNodeCache,
  normalizeStatus,
  normalizeText,
  offlineGrid,
  offlineSectionTitle,
  onlineGrid,
  onlineSectionTitle,
  renderFixModeActionsForContext,
  renderRobotTypeGroups,
  sortOnlineRobots,
  state,
  statusFromScore,
  syncFixModePanels,
  syncRobotCard,
  syncSectionToggleButtons,
  updateSelectionSummary,
  robotId,
  getRobotById,
  windowingApi,
}) {
  function getStatusChipTone(statusKey) {
    if (statusKey === 'critical') return { css: 'err', text: 'Critical' };
    if (statusKey === 'warning') return { css: 'warn', text: 'Warning' };
    if (statusKey === 'unknown') return { css: 'neutral', text: 'Unknown' };
    if (statusKey === 'na') return { css: 'neutral', text: 'N/A' };
    return { css: 'ok', text: 'Healthy' };
  }

  function queryCardByRobotId(robotIdValue) {
    const id = robotId(robotIdValue);
    if (!id) return null;
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(id)
        : id.replace(/"/g, '\\"');
    return document.querySelector(`.robot-card[data-robot-id="${escaped}"]`);
  }

  function applyFilters() {
    return state.robots.filter((robot) => {
      const matchesName = robot.name.toLowerCase().includes(state.filter.name.toLowerCase());
      const matchesType = state.filter.type === 'all' || robot.type === state.filter.type;
      const stateKey = statusFromScore(robot);
      let matchesError = true;

      if (state.filter.error === 'healthy') {
        matchesError = stateKey === 'ok';
      } else if (state.filter.error === 'warning') {
        matchesError = stateKey === 'warning';
      } else if (state.filter.error === 'critical') {
        matchesError = stateKey === 'critical';
      } else if (state.filter.error === 'unknown') {
        matchesError = stateKey === 'unknown';
      } else if (state.filter.error === 'error') {
        matchesError = stateKey !== 'ok';
      } else if (state.filter.error !== 'all') {
        const definitionId = normalizeText(state.filter.error, '');
        const scopedEntry = getScopedTestEntries(robot, { scope: 'all' })
          .find((entry) => entry.id === definitionId);
        if (!scopedEntry) {
          matchesError = false;
        } else {
          matchesError = isUnknownResult(scopedEntry.result)
            || normalizeStatus(scopedEntry?.result?.status) !== 'ok';
        }
      }

      return matchesName && matchesType && matchesError;
    });
  }

  function updateKPIs(list) {
    const healthy = list.filter((r) => statusFromScore(r) === 'ok').length;
    const warning = list.filter((r) => statusFromScore(r) === 'warning').length;
    const critical = list.filter((r) => statusFromScore(r) === 'critical').length;
    const unknown = list.filter((r) => statusFromScore(r) === 'unknown').length;
    $('#kpiHealthy').textContent = healthy;
    $('#kpiWarn').textContent = warning;
    $('#kpiCritical').textContent = critical;
    const unknownNode = $('#kpiUnknown');
    if (unknownNode) unknownNode.textContent = unknown;
  }

  function renderDashboard() {
    const visible = applyFilters();
    windowingApi.bindLargeFleetWindowListeners();
    windowingApi.ensureLargeFleetWindowLimits(visible.length);
    const allOnlineRobots = sortOnlineRobots(
      visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok'),
    );
    const allOfflineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');
    windowingApi.setLatestVisibleCounts({
      onlineCount: allOnlineRobots.length,
      offlineCount: allOfflineRobots.length,
    });
    const onlineRobots = windowingApi.applyLargeFleetWindow(allOnlineRobots, 'online');
    const offlineRobots = windowingApi.applyLargeFleetWindow(allOfflineRobots, 'offline');

    if (onlineSectionTitle) {
      onlineSectionTitle.textContent = `Online (${allOnlineRobots.length})`;
    }
    if (offlineSectionTitle) {
      offlineSectionTitle.textContent = `Offline (${allOfflineRobots.length})`;
    }

    if (onlineGrid && offlineGrid) {
      renderRobotTypeGroups(onlineGrid, onlineRobots);
      renderRobotTypeGroups(offlineGrid, offlineRobots);
    }
    invalidateCountdownNodeCache();

    emptyState.classList.toggle('hidden', visible.length > 0);
    updateSelectionSummary();
    syncSectionToggleButtons();
    updateKPIs(state.robots);
    hydrateActionButtons(dashboard);
    syncFixModePanels();
  }

  function applyDashboardMetaFromVisible(visible) {
    const onlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok');
    const offlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');
    if (onlineSectionTitle) {
      onlineSectionTitle.textContent = `Online (${onlineRobots.length})`;
    }
    if (offlineSectionTitle) {
      offlineSectionTitle.textContent = `Offline (${offlineRobots.length})`;
    }
    emptyState.classList.toggle('hidden', visible.length > 0);
    updateSelectionSummary();
    syncSectionToggleButtons();
    updateKPIs(state.robots);
    if (state.fixModeOpen.dashboard) {
      renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
    }
  }

  function patchDashboardForChangedRobots(changedRobotIds) {
    const changedIds = Array.from(changedRobotIds || []).map((id) => robotId(id)).filter(Boolean);
    if (!changedIds.length) return false;
    const visibleRobots = applyFilters();
    const visibleRobotsById = new Map(
      visibleRobots.map((robot) => [robotId(robot), robot]).filter(([id]) => Boolean(id)),
    );
    let requiresFullRender = false;

    changedIds.forEach((id) => {
      const robot = getRobotById(id);
      const existingCard = queryCardByRobotId(id);
      const isVisible = visibleRobotsById.has(id);
      if (!robot) {
        if (existingCard) requiresFullRender = true;
        return;
      }
      if (!isVisible) {
        if (existingCard) requiresFullRender = true;
        return;
      }
      if (!existingCard) {
        if (windowingApi.isWindowingEnabled()) {
          return;
        }
        requiresFullRender = true;
        return;
      }
      const shouldBeOnline = normalizeStatus(robot?.tests?.online?.status) === 'ok';
      const isInOnlineGrid = Boolean(existingCard.closest('#onlineRobotGrid'));
      const isInOfflineGrid = Boolean(existingCard.closest('#offlineRobotGrid'));
      if ((shouldBeOnline && !isInOnlineGrid) || (!shouldBeOnline && !isInOfflineGrid)) {
        requiresFullRender = true;
        return;
      }
      syncRobotCard(existingCard, robot);
    });

    if (requiresFullRender) {
      renderDashboard();
      return false;
    }

    applyDashboardMetaFromVisible(visibleRobots);
    invalidateCountdownNodeCache();
    hydrateActionButtons(dashboard);
    return true;
  }

  return {
    applyFilters,
    updateKPIs,
    renderDashboard,
    applyDashboardMetaFromVisible,
    patchDashboardForChangedRobots,
    getStatusChipTone,
    queryCardByRobotId,
  };
}
