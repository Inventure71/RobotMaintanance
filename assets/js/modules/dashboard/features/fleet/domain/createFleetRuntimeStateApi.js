export function createFleetRuntimeStateApi({
  detail,
  ONLINE_CHECK_TIMEOUT_MS,
  TEST_COUNTDOWN_MAX_SECONDS,
  TEST_COUNTDOWN_MIN_SECONDS,
  TEST_COUNTDOWN_MODE_LABELS,
  TEST_STEP_TIMEOUT_MS,
  normalizeStatus,
  normalizeText,
  renderDashboard,
  renderDetail,
  startTestingCountdowns,
  state,
  stopTestingCountdowns,
}) {
  function robotId(robotOrId) {
    if (typeof robotOrId === 'string' || typeof robotOrId === 'number') {
      return normalizeText(robotOrId, '');
    }
    return normalizeText(robotOrId?.id, '');
  }

  function rebuildRobotIndex() {
    const index = new Map();
    state.robots.forEach((robot) => {
      const id = robotId(robot);
      if (!id) return;
      index.set(id, robot);
    });
    state.robotsById = index;
  }

  function setRobots(nextRobots) {
    state.robots = Array.isArray(nextRobots) ? nextRobots : [];
    rebuildRobotIndex();
  }

  function mapRobots(mapper) {
    if (typeof mapper !== 'function') return;
    setRobots(state.robots.map(mapper));
  }

  function getRobotById(robotIdValue) {
    const normalized = normalizeText(robotIdValue, '');
    return state.robotsById.get(normalized) || null;
  }

  function getSelectedRobotIds() {
    return state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot))).map((robot) => robotId(robot));
  }

  function getReachableRobotIds() {
    return state.robots
      .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
      .map((robot) => robotId(robot));
  }

  function isRobotSelected(robotIdValue) {
    return state.selectedRobotIds.has(robotId(robotIdValue));
  }

  function isRobotTesting(robotIdValue) {
    const normalizedId = robotId(robotIdValue);
    return state.testingRobotIds.has(normalizedId) || state.autoTestingRobotIds.has(normalizedId);
  }

  function isRobotSearching(robotIdValue) {
    const normalizedId = robotId(robotIdValue);
    return state.searchingRobotIds.has(normalizedId) || state.autoSearchingRobotIds.has(normalizedId);
  }

  function isRobotFixing(robotIdValue) {
    return state.fixingRobotIds.has(robotId(robotIdValue));
  }

  function isRobotBusyForOnlineRefresh(robotIdValue) {
    return isRobotSearching(robotIdValue) || isRobotTesting(robotIdValue) || isRobotFixing(robotIdValue);
  }

  function isRobotAutoSearching(robotIdValue) {
    return state.autoSearchingRobotIds.has(robotId(robotIdValue));
  }

  function normalizeCountdownMs(countdownMs, fallbackMs) {
    const safeDefault = Number.isFinite(fallbackMs) && fallbackMs > 0 ? fallbackMs : TEST_STEP_TIMEOUT_MS;
    const normalizedRaw =
      Number.isFinite(countdownMs) && countdownMs > 0 ? countdownMs : safeDefault;
    return Math.max(
      TEST_COUNTDOWN_MIN_SECONDS * 1000,
      Math.min(normalizedRaw, TEST_COUNTDOWN_MAX_SECONDS * 1000),
    );
  }

  function withActivityCountdown(robotIdValue, isActive, {
    fallbackMs,
    mode,
    set,
  }) {
    const id = robotId(robotIdValue);
    if (!id) return;
    if (isActive) {
      set.add(id);
      const safeCountdownMs = normalizeCountdownMs(null, fallbackMs);
      state.testingCountdowns.set(id, {
        mode,
        expiresAt: Date.now() + safeCountdownMs,
        totalMs: safeCountdownMs,
      });
      startTestingCountdowns();
    } else {
      set.delete(id);
      state.testingCountdowns.delete(id);
      if (!state.testingCountdowns.size) {
        stopTestingCountdowns();
      }
    }
    renderDashboard();
    if (!detail.classList.contains('active')) return;
    if (state.detailRobotId === id) {
      const activeRobot = state.robots.find((item) => robotId(item) === id);
      if (activeRobot) {
        renderDetail(activeRobot);
      }
    }
  }

  function setRobotTesting(robotIdValue, isTesting, countdownMs = null) {
    withActivityCountdown(robotIdValue, isTesting, {
      fallbackMs: normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS),
      mode: 'scanning',
      set: state.testingRobotIds,
    });
  }

  function setRobotSearching(robotIdValue, isSearching, countdownMs = null) {
    withActivityCountdown(robotIdValue, isSearching, {
      fallbackMs: normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS),
      mode: 'finding',
      set: state.searchingRobotIds,
    });
  }

  function setRobotFixing(robotIdValue, isFixing, countdownMs = null) {
    withActivityCountdown(robotIdValue, isFixing, {
      fallbackMs: normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS * 2),
      mode: 'fixing',
      set: state.fixingRobotIds,
    });
  }

  function estimateTestCountdownMsFromBody(body) {
    const rawCount = Array.isArray(body?.testIds) ? body.testIds.length : 1;
    const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
    return Math.max(
      TEST_COUNTDOWN_MIN_SECONDS * 1000,
      Math.min(count * TEST_STEP_TIMEOUT_MS, TEST_COUNTDOWN_MAX_SECONDS * 1000),
    );
  }

  function getCountdownLabel(mode) {
    return TEST_COUNTDOWN_MODE_LABELS[mode] || TEST_COUNTDOWN_MODE_LABELS.scanning;
  }

  function getTestingCountdownText(robotIdValue) {
    const id = robotId(robotIdValue);
    if (!id) return '';
    const countdown = state.testingCountdowns.get(id);
    if (!countdown) {
      if (state.fixingRobotIds.has(id)) return 'Fixing...';
      if (state.autoSearchingRobotIds.has(id)) return 'Finding...';
      if (state.autoTestingRobotIds.has(id)) return 'Scanning...';
      return '';
    }
    return `${getCountdownLabel(countdown.mode)} ${Math.max(0, Math.ceil((countdown.expiresAt - Date.now()) / 1000))}s`;
  }

  function shouldUseCompactAutoSearchIndicator(robotIdValue, isOffline, isSearching = false) {
    const searching = Boolean(isSearching || isRobotSearching(robotIdValue));
    return searching && !isOffline;
  }

  function buildScanOverlayMarkup({ isSearching, isTesting, isFixing = false, compactAutoSearch = false } = {}) {
    if (isFixing) {
      return '<div class="scanning-overlay fixing-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/repairing.webm" type="video/webm" /></video></div>';
    }
    if (isSearching && !compactAutoSearch) {
      return '<div class="scanning-overlay finding-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/finding.webm" type="video/webm" /></video></div>';
    }
    if (isTesting) {
      return '<div class="scanning-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/scanning.webm" type="video/webm" /></video></div>';
    }
    return '';
  }

  function buildConnectionCornerIconMarkup(isOffline, isCheckingOnline = false) {
    if (isOffline) {
      return '<img class="offline-corner-icon" data-role="connection-corner-icon" src="assets/Icons/no-connection.png" alt="No connection" />';
    }
    const cornerClasses = ['connected-corner-icon', isCheckingOnline ? 'blinking' : '']
      .filter(Boolean)
      .join(' ');
    const alt = isCheckingOnline ? 'Checking online' : 'Connected';
    return `<img class="${cornerClasses}" data-role="connection-corner-icon" src="assets/Icons/connected.png" alt="${alt}" />`;
  }

  function formatDurationMs(ms) {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }

  return {
    rebuildRobotIndex,
    setRobots,
    mapRobots,
    robotId,
    getRobotById,
    getSelectedRobotIds,
    getReachableRobotIds,
    isRobotSelected,
    isRobotTesting,
    isRobotSearching,
    isRobotFixing,
    isRobotBusyForOnlineRefresh,
    isRobotAutoSearching,
    setRobotTesting,
    setRobotSearching,
    setRobotFixing,
    estimateTestCountdownMsFromBody,
    normalizeCountdownMs,
    getCountdownLabel,
    getTestingCountdownText,
    shouldUseCompactAutoSearchIndicator,
    buildScanOverlayMarkup,
    buildConnectionCornerIconMarkup,
    formatDurationMs,
  };
}
