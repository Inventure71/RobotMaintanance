export function createDataInitRuntimeApi(deps) {
  const {
    MONITOR_SOURCE,
    ROBOTS_CONFIG_URL,
    ROBOT_TYPES_CONFIG_URL,
    RUNTIME_ALLOWED_SOURCES,
    RUNTIME_SYNC_INTERVAL_MS,
    FLEET_RUNTIME_ENDPOINT,
    FLEET_STATIC_ENDPOINT,
    applyRuntimeRobotPatches,
    buildApiUrl,
    isManageViewActive,
    normalizeRobotActivity,
    normalizeRobotData,
    normalizeRobotTests,
    normalizeStatus,
    normalizeText,
    openDetail,
    parseManageRoute,
    reconcileLoadedRobotDefinitions,
    robotId,
    setRobotTypeDefinitions,
    setRobots,
    showAddRobotPage,
    showDashboard,
    state,
    syncAutoMonitorRefreshState,
    syncAutomatedRobotActivityFromState,
  } = deps;

  async function loadRobotConfig() {
    try {
      const response = await fetch(ROBOTS_CONFIG_URL);
      if (!response.ok) throw new Error('config unavailable');
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.robots)) return payload.robots;
      if (Array.isArray(payload?.fleet)) return payload.fleet;
      return [];
    } catch (_error) {
      return [];
    }
  }

  async function loadFleetStaticState() {
    const response = await fetch(buildApiUrl(FLEET_STATIC_ENDPOINT));
    if (!response.ok) throw new Error('fleet static unavailable');
    const payload = await response.json();
    if (!Array.isArray(payload?.robots)) throw new Error('fleet static payload invalid');
    return payload.robots;
  }

  async function loadFleetRuntimeDelta(sinceVersion = 0) {
    const cursor = Math.max(0, Number.isFinite(Number(sinceVersion)) ? Math.trunc(Number(sinceVersion)) : 0);
    const response = await fetch(
      buildApiUrl(`${FLEET_RUNTIME_ENDPOINT}?since=${encodeURIComponent(String(cursor))}`),
    );
    if (!response.ok) throw new Error('fleet runtime unavailable');
    const payload = await response.json();
    const runtimeVersion = Number.isFinite(Number(payload?.version))
      ? Math.max(0, Math.trunc(Number(payload.version)))
      : cursor;
    return {
      version: runtimeVersion,
      full: Boolean(payload?.full),
      robots: Array.isArray(payload?.robots) ? payload.robots : [],
    };
  }

  async function loadRobotTypeConfig() {
    try {
      const response = await fetch(buildApiUrl('/api/robot-types'));
      if (!response.ok) throw new Error('api unavailable');
      const payload = await response.json();
      const nextTypes = setRobotTypeDefinitions(payload);
      reconcileLoadedRobotDefinitions();
      return nextTypes;
    } catch (_error) {
      try {
        const response = await fetch(ROBOT_TYPES_CONFIG_URL);
        if (!response.ok) throw new Error('config unavailable');
        const payload = await response.json();
        const nextTypes = setRobotTypeDefinitions(payload);
        reconcileLoadedRobotDefinitions();
        return nextTypes;
      } catch (_fallbackError) {
        setRobotTypeDefinitions([]);
        reconcileLoadedRobotDefinitions();
        return [];
      }
    }
  }

  function normalizeRuntimeTestUpdate(testId, raw) {
    if (!raw || typeof raw !== 'object') return null;
    const source = normalizeText(raw.source, '');
    if (!RUNTIME_ALLOWED_SOURCES.has(source)) {
      return null;
    }

    return {
      status: normalizeStatus(raw.status),
      value: normalizeText(raw.value, 'n/a'),
      details: normalizeText(raw.details, 'No detail available'),
      reason: normalizeText(raw.reason, ''),
      source,
      checkedAt: Number.isFinite(Number(raw?.checkedAt)) ? Number(raw.checkedAt) : 0,
    };
  }

  function runtimeActivityHasSignal(activity) {
    const normalized = normalizeRobotActivity(activity);
    return Boolean(
      normalized.searching ||
        normalized.testing ||
        normalizeText(normalized.phase, '') ||
        Number(normalized.lastFullTestAt) > 0 ||
        normalizeText(normalized.lastFullTestSource, '') ||
        Number(normalized.updatedAt) > 0 ||
        Number(normalized.jobQueueVersion) > 0 ||
        Boolean(normalized.lastCompletedJob) ||
        Boolean(normalized.activeJob) ||
        (Array.isArray(normalized.queuedJobs) && normalized.queuedJobs.length > 0),
    );
  }

  function normalizeRuntimeRobotEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = normalizeText(raw.id, '');
    if (!id) return null;
    const tests = {};
    let battery = null;
    Object.entries(raw.tests || {}).forEach(([testId, payload]) => {
      const update = normalizeRuntimeTestUpdate(testId, payload);
      if (!update) return;
      if (normalizeText(testId, '').toLowerCase() === 'battery' && normalizeText(update.source, '') === MONITOR_SOURCE) {
        battery = update;
        return;
      }
      tests[testId] = update;
    });
    const activity = normalizeRobotActivity(raw.activity);
    return {
      id,
      tests,
      battery,
      activity,
      hasRuntimeData: Object.keys(tests).length > 0 || Boolean(battery) || runtimeActivityHasSignal(activity),
    };
  }

  function haveRuntimeTestsChanged(previousTests, nextTests) {
    const prev = previousTests && typeof previousTests === 'object' ? previousTests : {};
    const next = nextTests && typeof nextTests === 'object' ? nextTests : {};
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) return true;
    return nextKeys.some((testId) => {
      const prior = prev[testId] || {};
      const nextValue = next[testId] || {};
      return (
        normalizeStatus(prior.status) !== normalizeStatus(nextValue.status) ||
        normalizeText(prior.value, '') !== normalizeText(nextValue.value, '') ||
        normalizeText(prior.details, '') !== normalizeText(nextValue.details, '') ||
        normalizeText(prior.reason, '') !== normalizeText(nextValue.reason, '') ||
        normalizeText(prior.source, '') !== normalizeText(nextValue.source, '') ||
        Number(prior.checkedAt || 0) !== Number(nextValue.checkedAt || 0)
      );
    });
  }

  function resolveRuntimeVersion(rawVersion, fallbackVersion = 0) {
    const fallback = Number.isFinite(Number(fallbackVersion)) ? Math.trunc(Number(fallbackVersion)) : 0;
    const resolved = Number.isFinite(Number(rawVersion)) ? Math.trunc(Number(rawVersion)) : fallback;
    return Math.max(0, resolved);
  }

  function mergeRuntimeRobotsIntoList(currentRobots, runtimeEntries, options = {}) {
    const robots = Array.isArray(currentRobots) ? currentRobots : [];
    const respectLocalPriority = options?.respectLocalPriority !== false;
    const fullSnapshot = options?.fullSnapshot === true;
    const runtimeById = new Map(
      (Array.isArray(runtimeEntries) ? runtimeEntries : [])
        .map((entry) => normalizeRuntimeRobotEntry(entry))
        .filter(Boolean)
        .map((entry) => [entry.id, entry]),
    );
    const changedRobotIds = new Set();
    const merged = robots.map((currentRobot) => {
      const id = robotId(currentRobot);
      if (!id) return currentRobot;
      const runtimeEntry = runtimeById.get(id) || (fullSnapshot
        ? {
            id,
            tests: {},
            activity: normalizeRobotActivity({}),
            hasRuntimeData: false,
          }
        : null);
      if (!runtimeEntry) return currentRobot;

      const hasLocalPriorityActivity =
        respectLocalPriority &&
        (state.testingRobotIds.has(id) || state.searchingRobotIds.has(id) || state.fixingRobotIds.has(id));

      const previousActivity = normalizeRobotActivity(currentRobot?.activity);
      const shouldClearRuntime = !hasLocalPriorityActivity && !runtimeEntry.hasRuntimeData;
      const baseTests = shouldClearRuntime
        ? normalizeRobotTests({}, currentRobot?.typeId).tests
        : currentRobot?.tests || {};
      const previousBattery =
        currentRobot?.battery && typeof currentRobot.battery === 'object'
          ? currentRobot.battery
          : null;
      const nextTests = hasLocalPriorityActivity
        ? currentRobot?.tests || {}
        : {
            ...baseTests,
            ...(runtimeEntry.tests || {}),
          };
      const nextBattery = hasLocalPriorityActivity
        ? previousBattery
        : shouldClearRuntime
          ? null
          : runtimeEntry.battery
            ? runtimeEntry.battery
            : fullSnapshot
              ? null
              : previousBattery;
      const nextActivity = shouldClearRuntime
        ? normalizeRobotActivity({})
        : hasLocalPriorityActivity
          ? {
              ...runtimeEntry.activity,
              searching: previousActivity.searching,
              testing: previousActivity.testing,
              phase: previousActivity.phase,
            }
          : runtimeEntry.activity;

      const previousActiveJob = previousActivity?.activeJob || null;
      const nextActiveJob = nextActivity?.activeJob || null;
      const previousLastCompletedJob = previousActivity?.lastCompletedJob || null;
      const nextLastCompletedJob = nextActivity?.lastCompletedJob || null;
      const previousQueuedJobs = Array.isArray(previousActivity?.queuedJobs) ? previousActivity.queuedJobs : [];
      const nextQueuedJobs = Array.isArray(nextActivity?.queuedJobs) ? nextActivity.queuedJobs : [];
      const jobSummaryChanged = (prior, nextValue) =>
        normalizeText(prior?.id, '') !== normalizeText(nextValue?.id, '')
        || normalizeText(prior?.kind, '') !== normalizeText(nextValue?.kind, '')
        || normalizeText(prior?.status, '') !== normalizeText(nextValue?.status, '')
        || normalizeText(prior?.source, '') !== normalizeText(nextValue?.source, '')
        || normalizeText(prior?.label, '') !== normalizeText(nextValue?.label, '')
        || Number(prior?.enqueuedAt || 0) !== Number(nextValue?.enqueuedAt || 0)
        || Number(prior?.startedAt || 0) !== Number(nextValue?.startedAt || 0)
        || Number(prior?.updatedAt || 0) !== Number(nextValue?.updatedAt || 0)
        || JSON.stringify(prior?.metadata || {}) !== JSON.stringify(nextValue?.metadata || {});
      const queuedJobsChanged = previousQueuedJobs.length !== nextQueuedJobs.length
        || nextQueuedJobs.some((job, index) => jobSummaryChanged(previousQueuedJobs[index], job));

      const activityChanged =
        previousActivity.searching !== nextActivity.searching ||
        previousActivity.testing !== nextActivity.testing ||
        normalizeText(previousActivity.phase, '') !== normalizeText(nextActivity.phase, '') ||
        Number(previousActivity.lastFullTestAt) !== Number(nextActivity.lastFullTestAt) ||
        normalizeText(previousActivity.lastFullTestSource, '') !== normalizeText(nextActivity.lastFullTestSource, '') ||
        Number(previousActivity.updatedAt) !== Number(nextActivity.updatedAt) ||
        Number(previousActivity.jobQueueVersion || 0) !== Number(nextActivity.jobQueueVersion || 0) ||
        jobSummaryChanged(previousActiveJob, nextActiveJob) ||
        jobSummaryChanged(previousLastCompletedJob, nextLastCompletedJob) ||
        queuedJobsChanged;
      const testsChanged = haveRuntimeTestsChanged(currentRobot?.tests || {}, nextTests);
      const batteryChanged =
        normalizeStatus(previousBattery?.status) !== normalizeStatus(nextBattery?.status) ||
        normalizeText(previousBattery?.value, '') !== normalizeText(nextBattery?.value, '') ||
        normalizeText(previousBattery?.details, '') !== normalizeText(nextBattery?.details, '') ||
        normalizeText(previousBattery?.reason, '') !== normalizeText(nextBattery?.reason, '') ||
        normalizeText(previousBattery?.source, '') !== normalizeText(nextBattery?.source, '') ||
        Number(previousBattery?.checkedAt || 0) !== Number(nextBattery?.checkedAt || 0);

      if (!activityChanged && !testsChanged && !batteryChanged) {
        return currentRobot;
      }

      changedRobotIds.add(id);
      return {
        ...currentRobot,
        tests: nextTests,
        battery: nextBattery,
        activity: nextActivity,
      };
    });

    return {
      merged,
      changedRobotIds,
    };
  }

  async function refreshRuntimeStateFromBackend() {
    if (state.isRuntimeSyncInFlight) return;
    state.isRuntimeSyncInFlight = true;
    try {
      const delta = await loadFleetRuntimeDelta(state.runtimeVersion);
      state.runtimeVersion = resolveRuntimeVersion(delta.version, state.runtimeVersion);
      const mergedRuntime = mergeRuntimeRobotsIntoList(state.robots, delta.robots, {
        respectLocalPriority: true,
        fullSnapshot: delta.full,
      });
      if (mergedRuntime.changedRobotIds.size > 0) {
        setRobots(mergedRuntime.merged);
      }
      syncAutomatedRobotActivityFromState();
      syncAutoMonitorRefreshState();
      if (mergedRuntime.changedRobotIds.size > 0) {
        applyRuntimeRobotPatches(mergedRuntime.changedRobotIds);
      }
    } catch (_error) {
      // Keep existing UI state on transient backend fetch failures.
    } finally {
      state.isRuntimeSyncInFlight = false;
    }
  }

  function hasActiveRuntimeWork() {
    return Boolean(
      state.testingRobotIds?.size
      || state.searchingRobotIds?.size
      || state.fixingRobotIds?.size
      || state.autoActivityRobotIds?.size
      || state.isTestRunInProgress
      || state.isOnlineRefreshInFlight
      || state.isAutoFixInProgress,
    );
  }

  function getRuntimeSyncIntervalMs() {
    const activeInterval = Math.max(900, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 0.66));
    const idleVisibleInterval = Math.max(2500, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 1.6));
    const hiddenInterval = Math.max(6000, Math.floor(RUNTIME_SYNC_INTERVAL_MS * 4));
    if (document?.visibilityState === 'hidden') {
      return hiddenInterval;
    }
    if (hasActiveRuntimeWork()) {
      return activeInterval;
    }
    return idleVisibleInterval;
  }

  function scheduleRuntimeStateSync(delayMs = null) {
    if (state.runtimeSyncTimer) {
      window.clearTimeout(state.runtimeSyncTimer);
    }
    const nextDelayMs = Number.isFinite(Number(delayMs))
      ? Math.max(0, Math.floor(Number(delayMs)))
      : getRuntimeSyncIntervalMs();
    state.runtimeSyncTimer = window.setTimeout(async () => {
      state.runtimeSyncTimer = null;
      await refreshRuntimeStateFromBackend();
      scheduleRuntimeStateSync();
    }, nextDelayMs);
  }

  function startRuntimeStateSync() {
    if (state.runtimeSyncTimer) return;
    scheduleRuntimeStateSync(0);
  }

  function stopRuntimeStateSync() {
    if (!state.runtimeSyncTimer) return;
    window.clearTimeout(state.runtimeSyncTimer);
    state.runtimeSyncTimer = null;
  }

  async function loadRobotsFromBackend() {
    const [fleetStatic] = await Promise.all([
      loadFleetStaticState().catch(() => loadRobotConfig()),
      loadRobotTypeConfig(),
    ]);
    const normalizedStatic = normalizeRobotData(Array.isArray(fleetStatic) ? fleetStatic : []);
    try {
      const delta = await loadFleetRuntimeDelta(0);
      state.runtimeVersion = resolveRuntimeVersion(delta.version, 0);
      const mergedRuntime = mergeRuntimeRobotsIntoList(normalizedStatic, delta.robots, {
        respectLocalPriority: false,
        fullSnapshot: delta.full,
      });
      return mergedRuntime.merged;
    } catch (_e) {
      state.runtimeVersion = 0;
      return normalizedStatic;
    }
  }

  function routeFromHash() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      showDashboard({ syncHash: false });
      return;
    }
    const manageRoute = parseManageRoute(hash);
    if (manageRoute.isManageRoute) {
      const shouldCanonicalize = hash === 'add-robot';
      showAddRobotPage({
        tabId: manageRoute.tabId,
        syncHash: shouldCanonicalize,
        refreshDefinitions: !isManageViewActive(),
      });
      return;
    }
    if (!hash.startsWith('robot/')) return;
    const id = hash.split('/')[1];
    if (id) openDetail(id, { syncHash: false });
  }

  function openManageRobotsFromDashboard() {
    showAddRobotPage({
      tabId: 'robots',
      robotRegistryPanelId: 'existing-robots',
    });
  }

  return {
    loadRobotConfig,
    loadFleetStaticState,
    loadFleetRuntimeDelta,
    loadRobotTypeConfig,
    normalizeRuntimeTestUpdate,
    runtimeActivityHasSignal,
    normalizeRuntimeRobotEntry,
    haveRuntimeTestsChanged,
    mergeRuntimeRobotsIntoList,
    refreshRuntimeStateFromBackend,
    startRuntimeStateSync,
    stopRuntimeStateSync,
    loadRobotsFromBackend,
    routeFromHash,
    openManageRobotsFromDashboard,
    scheduleRuntimeStateSync,
  };
}
