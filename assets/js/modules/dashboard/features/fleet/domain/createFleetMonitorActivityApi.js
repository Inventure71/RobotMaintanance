export function createFleetMonitorActivityApi(deps) {
  const {
    $,
    MONITOR_BATTERY_INTERVAL_MIN_SEC,
    MONITOR_ONLINE_INTERVAL_MIN_SEC,
    MONITOR_SOURCE,
    MONITOR_TOPICS_INTERVAL_MIN_SEC,
    MONITOR_TOPICS_SOURCE,
    ONLINE_CHECK_TIMEOUT_MS,
    TEST_COUNTDOWN_TICK_MS,
    TEST_COUNTDOWN_WARNING_TEXT,
    TEST_STEP_TIMEOUT_MS,
    clampMonitorBatteryInterval,
    clampMonitorOnlineInterval,
    clampMonitorTopicsInterval,
    detail,
    formatDurationMs,
    getCountdownLabel,
    getRobotBatteryState,
    isTopicsMonitorMode,
    normalizeCountdownMs,
    normalizeRobotActivity,
    normalizeText,
    renderDashboard,
    renderDetail,
    robotId,
    state,
  } = deps;

  function getMonitorOnlineIntervalMs() {
    return Math.max(
      MONITOR_ONLINE_INTERVAL_MIN_SEC * 1000,
      Math.floor(clampMonitorOnlineInterval(state.monitorOnlineIntervalSec) * 1000),
    );
  }

  function getMonitorBatteryIntervalMs() {
    return Math.max(
      MONITOR_BATTERY_INTERVAL_MIN_SEC * 1000,
      Math.floor(clampMonitorBatteryInterval(state.monitorBatteryIntervalSec) * 1000),
    );
  }

  function getMonitorTopicsIntervalMs() {
    return Math.max(
      MONITOR_TOPICS_INTERVAL_MIN_SEC * 1000,
      Math.floor(clampMonitorTopicsInterval(state.monitorTopicsIntervalSec) * 1000),
    );
  }

  function normalizeCheckedAtMs(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    if (numeric > 1e12) return Math.floor(numeric);
    return Math.floor(numeric * 1000);
  }

  function formatLastFullTestTimestamp(timestampMs) {
    const date = new Date(timestampMs);
    if (!Number.isFinite(date.getTime())) return '--';
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const timeLabel = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    if (sameDay) return timeLabel;
    const dateLabel = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    return `${dateLabel} ${timeLabel}`;
  }

  function buildLastFullTestPillLabel(robot, compact = false) {
    const timestampMs = normalizeCheckedAtMs(robot?.activity?.lastFullTestAt);
    const prefix = compact ? 'Full test' : 'Last full test';
    if (!timestampMs) return `${prefix}: --`;
    return `${prefix}: ${formatLastFullTestTimestamp(timestampMs)}`;
  }

  function syncAutoMonitorRefreshState() {
    const summary = {
      hasData: false,
      online: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
      battery: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
      topics: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
    };
    const includeTopics = isTopicsMonitorMode(state.monitorMode);

    state.robots.forEach((robot) => {
      const tests = robot?.tests || {};
      const onlineTest = tests.online;
      if (
        normalizeText(onlineTest?.source, '') === MONITOR_SOURCE &&
        onlineTest?.checkedAt !== undefined
      ) {
        const timestampMs = normalizeCheckedAtMs(onlineTest.checkedAt);
        if (timestampMs > 0) {
          summary.hasData = true;
          summary.online.checkedRobotCount += 1;
          summary.online.lastCheckedAtMs = Math.max(summary.online.lastCheckedAtMs, timestampMs);
        }
      }

      const batteryTest = getRobotBatteryState(robot);
      if (
        normalizeText(batteryTest?.source, '') === MONITOR_SOURCE &&
        batteryTest?.checkedAt !== undefined
      ) {
        const timestampMs = normalizeCheckedAtMs(batteryTest.checkedAt);
        if (timestampMs > 0) {
          summary.hasData = true;
          summary.battery.checkedRobotCount += 1;
          summary.battery.lastCheckedAtMs = Math.max(summary.battery.lastCheckedAtMs, timestampMs);
        }
      }

      if (!includeTopics) return;
      let topicsSeenForRobot = false;
      Object.entries(tests).forEach(([testId, result]) => {
        if (testId === 'online' || testId === 'battery') return;
        if (normalizeText(result?.source, '') !== MONITOR_TOPICS_SOURCE) return;
        if (result?.checkedAt === undefined) return;
        const timestampMs = normalizeCheckedAtMs(result.checkedAt);
        if (timestampMs <= 0) return;
        summary.hasData = true;
        summary.topics.lastCheckedAtMs = Math.max(summary.topics.lastCheckedAtMs, timestampMs);
        topicsSeenForRobot = true;
      });
      if (topicsSeenForRobot) {
        summary.topics.checkedRobotCount += 1;
      }
    });

    state.autoMonitorRefreshSummary = summary;
  }

  function stopOnlineRefreshStatusTimer() {
    if (!state.onlineRefreshStatusTimer) return;
    window.clearInterval(state.onlineRefreshStatusTimer);
    state.onlineRefreshStatusTimer = null;
  }

  function setFleetOnlineButtonIdleLabel(label, title = '') {
    const runAllButton = $('#runFleetOnline');
    if (!runAllButton) return;
    runAllButton.dataset.idleLabel = label;
    if (!state.isOnlineRefreshInFlight) {
      runAllButton.textContent = label;
    }
    if (title) {
      runAllButton.title = title;
    }
  }

  function updateFleetOnlineRefreshStatus() {
    const runAllButton = $('#runFleetOnline');
    if (!runAllButton) return;
    const autoSummary = state.autoMonitorRefreshSummary || {};
    const now = Date.now();
    const includeTopics = isTopicsMonitorMode(state.monitorMode);
    const onlineNextCandidates = [];
    const topicsNextCandidates = [];

    if (autoSummary.online?.lastCheckedAtMs) {
      onlineNextCandidates.push(
        Math.max(0, autoSummary.online.lastCheckedAtMs + getMonitorOnlineIntervalMs() - now),
      );
    }
    if (autoSummary.battery?.lastCheckedAtMs) {
      onlineNextCandidates.push(
        Math.max(0, autoSummary.battery.lastCheckedAtMs + getMonitorBatteryIntervalMs() - now),
      );
    }
    if (includeTopics && autoSummary.topics?.lastCheckedAtMs) {
      topicsNextCandidates.push(
        Math.max(0, autoSummary.topics.lastCheckedAtMs + getMonitorTopicsIntervalMs() - now),
      );
    }

    if (!onlineNextCandidates.length && state.onlineRefreshNextAt > 0) {
      onlineNextCandidates.push(Math.max(0, state.onlineRefreshNextAt - now));
    }

    const nextOnlineInMs = onlineNextCandidates.length ? Math.min(...onlineNextCandidates) : null;
    const nextTopicsInMs = topicsNextCandidates.length ? Math.min(...topicsNextCandidates) : null;
    const nextCountdownCandidates = [];
    if (nextOnlineInMs !== null) nextCountdownCandidates.push(nextOnlineInMs);
    if (nextTopicsInMs !== null) nextCountdownCandidates.push(nextTopicsInMs);
    const nextRefreshInMs = nextCountdownCandidates.length ? Math.min(...nextCountdownCandidates) : null;
    const nextCountdownLabel = nextRefreshInMs === null ? '--' : formatDurationMs(nextRefreshInMs);

    if (!includeTopics) {
      const onlineTitle =
        nextOnlineInMs === null
          ? 'Refresh online state. Next refresh unavailable.'
          : `Refresh online state. Next refresh in ${formatDurationMs(nextOnlineInMs)}.`;
      setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, onlineTitle);
      return;
    }

    const onlineLabel =
      nextOnlineInMs === null ? 'online/battery: --' : `online/battery: ${formatDurationMs(nextOnlineInMs)}`;
    const topicsLabel = nextTopicsInMs === null ? 'topics: --' : `topics: ${formatDurationMs(nextTopicsInMs)}`;
    const title = `Refresh online state. Next ${onlineLabel}, ${topicsLabel}.`;
    setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, title);
  }

  function startOnlineRefreshStatusTimer() {
    if (state.onlineRefreshStatusTimer) return;
    state.onlineRefreshStatusTimer = window.setInterval(updateFleetOnlineRefreshStatus, TEST_COUNTDOWN_TICK_MS);
    updateFleetOnlineRefreshStatus();
  }

  function invalidateCountdownNodeCache() {
    state.countdownNodeCache = null;
  }

  function getCountdownNodes() {
    if (
      !Array.isArray(state.countdownNodeCache) ||
      state.countdownNodeCache.some((node) => !node?.isConnected)
    ) {
      state.countdownNodeCache = Array.from(document.querySelectorAll('.scan-countdown'));
    }
    return state.countdownNodeCache;
  }

  function refreshTestingCountdowns() {
    const now = Date.now();
    const nodes = getCountdownNodes();
    let hasActive = false;
    nodes.forEach((node) => {
      const id = normalizeText(node.getAttribute('data-robot-id'), '');
      if (!id) return;
      const countdown = state.testingCountdowns.get(id);
      if (!countdown) return;
      const remaining = countdown.expiresAt - now;
      const mode = countdown.mode || 'scanning';
      if (remaining <= 0) {
        node.textContent = TEST_COUNTDOWN_WARNING_TEXT[mode] || TEST_COUNTDOWN_WARNING_TEXT.scanning;
        node.classList.add('countdown-warning');
      } else {
        node.textContent = `${getCountdownLabel(mode)} ${Math.max(0, Math.ceil(remaining / 1000))}s`;
        node.classList.remove('countdown-warning');
      }
      hasActive = true;
    });
    if (!hasActive && state.testingCountdowns.size === 0) {
      stopTestingCountdowns();
    }
  }

  function startTestingCountdowns() {
    if (state.testingCountdownTimer) return;
    state.testingCountdownTimer = window.setInterval(refreshTestingCountdowns, TEST_COUNTDOWN_TICK_MS);
    refreshTestingCountdowns();
  }

  function stopTestingCountdowns() {
    if (!state.testingCountdownTimer) return;
    window.clearInterval(state.testingCountdownTimer);
    state.testingCountdownTimer = null;
  }

  function setRobotSearchingBulk(robotIds, isSearching, countdownMs = null) {
    const ids = (Array.isArray(robotIds) ? robotIds : []).map((id) => robotId(id)).filter(Boolean);
    if (!ids.length) return;
    const safeCountdownMs = normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS);

    ids.forEach((id) => {
      if (isSearching) {
        state.searchingRobotIds.add(id);
        state.testingCountdowns.set(id, {
          mode: 'finding',
          expiresAt: Date.now() + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
      } else {
        state.searchingRobotIds.delete(id);
        state.testingCountdowns.delete(id);
      }
    });
    if (isSearching) {
      startTestingCountdowns();
    } else if (!state.testingCountdowns.size) {
      stopTestingCountdowns();
    }

    renderDashboard();
    const isDetailActive = detail.classList.contains('active');
    if (!isDetailActive) return;
    const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
    if (activeRobot) {
      renderDetail(activeRobot);
    }
  }

  function syncAutomatedRobotActivityFromState() {
    const now = Date.now();
    const nextAutoSearching = new Set();
    const nextAutoTesting = new Set();
    const nextAutoActivityIds = new Set();

    state.robots.forEach((robot) => {
      const id = robotId(robot);
      if (!id) return;
      const hasLocalPriorityActivity =
        state.testingRobotIds.has(id) ||
        state.searchingRobotIds.has(id) ||
        state.fixingRobotIds.has(id);
      if (hasLocalPriorityActivity) {
        return;
      }
      const activity = normalizeRobotActivity(robot?.activity);
      if (activity.searching) {
        nextAutoSearching.add(id);
        nextAutoActivityIds.add(id);
        const safeCountdownMs = normalizeCountdownMs(ONLINE_CHECK_TIMEOUT_MS, ONLINE_CHECK_TIMEOUT_MS);
        state.testingCountdowns.set(id, {
          mode: 'finding',
          expiresAt: now + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
      }
      if (activity.testing) {
        nextAutoTesting.add(id);
        nextAutoActivityIds.add(id);
        const safeCountdownMs = normalizeCountdownMs(TEST_STEP_TIMEOUT_MS, TEST_STEP_TIMEOUT_MS);
        state.testingCountdowns.set(id, {
          mode: 'scanning',
          expiresAt: now + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
      }
    });

    state.autoActivityRobotIds.forEach((id) => {
      if (nextAutoActivityIds.has(id)) return;
      if (
        !state.testingRobotIds.has(id) &&
        !state.searchingRobotIds.has(id) &&
        !state.fixingRobotIds.has(id)
      ) {
        state.testingCountdowns.delete(id);
      }
    });

    state.autoSearchingRobotIds = nextAutoSearching;
    state.autoTestingRobotIds = nextAutoTesting;
    state.autoActivityRobotIds = nextAutoActivityIds;

    if (state.testingCountdowns.size) {
      startTestingCountdowns();
    } else {
      stopTestingCountdowns();
    }
  }

  return {
    buildLastFullTestPillLabel,
    formatLastFullTestTimestamp,
    getCountdownNodes,
    getMonitorBatteryIntervalMs,
    getMonitorOnlineIntervalMs,
    getMonitorTopicsIntervalMs,
    invalidateCountdownNodeCache,
    normalizeCheckedAtMs,
    refreshTestingCountdowns,
    setFleetOnlineButtonIdleLabel,
    setRobotSearchingBulk,
    startOnlineRefreshStatusTimer,
    startTestingCountdowns,
    stopOnlineRefreshStatusTimer,
    stopTestingCountdowns,
    syncAutoMonitorRefreshState,
    syncAutomatedRobotActivityFromState,
    updateFleetOnlineRefreshStatus,
  };
}
