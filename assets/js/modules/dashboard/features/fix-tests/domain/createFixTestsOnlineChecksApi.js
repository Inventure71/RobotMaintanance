export function createFixTestsOnlineChecksApi({
  state,
  robotId,
  getRobotById,
  getRobotActionAvailability,
  normalizeText,
  normalizeStatus,
  getMonitorOnlineIntervalMs,
  startOnlineRefreshStatusTimer,
  setRobotSearchingBulk,
  getOnlineCheckCountdownMs,
  buildApiUrl,
  ONLINE_CHECK_TIMEOUT_MS,
  getFleetParallelism,
  updateOnlineCheckEstimateFromResults,
  mapRobots,
  renderDashboard,
  updateFleetOnlineSummary,
  setFleetOnlineButtonState,
  enqueueRobotJob,
}) {
  async function runOneRobotOnlineCheck(robot) {
    const normalizedRobotId = robotId(robot);
    if (!normalizedRobotId) {
      return {
        status: 'error',
        value: 'unreachable',
        details: 'Robot identifier is missing for online check.',
        ms: 0,
      };
    }

    try {
      const response = await fetch(
        buildApiUrl('/api/robots/online-check'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            robotIds: [normalizedRobotId],
            pageSessionId: state.pageSessionId,
            forceRefresh: true,
            timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
            parallelism: getFleetParallelism(),
          }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        return {
          status: 'error',
          value: 'unreachable',
          details: `HTTP ${response.status}: ${text || 'Unable to run online test'}`,
          ms: 0,
        };
      }

      const payload = await response.json();
      const onlineResult = Array.isArray(payload?.results)
        ? payload.results.find((result) => normalizeText(result?.robotId, '') === normalizedRobotId)
        : null;

      if (!onlineResult) {
        return {
          status: 'error',
          value: 'unreachable',
          details: 'Backend returned no online test result.',
          ms: 0,
        };
      }

      return {
        status: normalizeStatus(onlineResult.status),
        value: normalizeText(onlineResult.value, 'n/a'),
        details: normalizeText(onlineResult.details, 'No detail available'),
        ms: Number.isFinite(Number(onlineResult.ms)) ? Number(onlineResult.ms) : 0,
        skipped: Boolean(onlineResult?.skipped),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        value: 'unreachable',
        details: `Unable to run online test: ${message}`,
        ms: 0,
      };
    }
  }

  async function runOnlineCheckForAllRobots() {
    if (!state.robots.length || state.isOnlineRefreshInFlight || state.isAutoFixInProgress) return;

    const activeRobotIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
    if (!activeRobotIds.length) return;
    const availabilityById = new Map(
      activeRobotIds.map((id) => [id, getRobotActionAvailability(id, 'online')]),
    );
    const busyRobotIds = activeRobotIds.filter((id) => availabilityById.get(id)?.allowed === false);
    const busyRobotIdSet = new Set(busyRobotIds);
    const eligibleRobotIds = activeRobotIds.filter((id) => !busyRobotIdSet.has(id));
    const skippedNameSet = new Set(
      busyRobotIds
        .map((id) => {
          const robot = getRobotById(id);
          return normalizeText(robot?.name, id);
        })
        .filter(Boolean),
    );
    if (!eligibleRobotIds.length) {
      state.onlineRefreshLastAt = Date.now();
      state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
      startOnlineRefreshStatusTimer();
      updateFleetOnlineSummary([], [], Array.from(skippedNameSet).sort());
      return;
    }

    state.isOnlineRefreshInFlight = true;
    setFleetOnlineButtonState(true);
    state.onlineRefreshStartedAt = Date.now();
    state.onlineRefreshNextAt = 0;
    startOnlineRefreshStatusTimer();
    setRobotSearchingBulk(eligibleRobotIds, true, getOnlineCheckCountdownMs());

    const onlineNames = [];
    const offlineNames = [];
    try {
      let batchResponse = null;
      try {
        batchResponse = await fetch(buildApiUrl('/api/robots/online-check'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            robotIds: eligibleRobotIds,
            pageSessionId: state.pageSessionId,
            forceRefresh: true,
            timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
            parallelism: getFleetParallelism(),
          }),
        });
      } catch (_error) {
        batchResponse = null;
      }

      if (batchResponse && batchResponse.ok) {
        const payload = await batchResponse.json();
        updateOnlineCheckEstimateFromResults(payload?.results);
        const byId = new Map();
        if (Array.isArray(payload?.results)) {
          payload.results.forEach((entry) => {
            const id = normalizeText(entry?.robotId, '');
            if (!id) return;
            byId.set(id, {
              status: normalizeStatus(entry?.status),
              value: normalizeText(entry?.value, 'n/a'),
              details: normalizeText(entry?.details, 'No detail available'),
              skipped: Boolean(entry?.skipped),
            });
          });
        }

        mapRobots((robot) => {
          const normalizedRobotId = robotId(robot);
          if (!normalizedRobotId) return robot;
          const label = normalizeText(robot.name, normalizedRobotId);
          const statusUpdate = byId.get(normalizedRobotId);
          if (!statusUpdate || statusUpdate.skipped) {
            if (busyRobotIdSet.has(normalizedRobotId) || statusUpdate?.skipped) {
              skippedNameSet.add(label);
            }
            return robot;
          }
          if (statusUpdate.status === 'ok') {
            onlineNames.push(label);
          } else {
            offlineNames.push(label);
          }
          return {
            ...robot,
            tests: {
              ...(robot.tests || {}),
              online: statusUpdate,
            },
          };
        });
      } else {
        const fallbackOnlineResults = [];
        const fallbackUpdates = await Promise.all(eligibleRobotIds.map(async (normalizedRobotId) => {
          const robot = getRobotById(normalizedRobotId);
          if (!robot) return null;
          const statusUpdate = await runOneRobotOnlineCheck(robot);
          return {
            robotId: normalizedRobotId,
            statusUpdate,
          };
        }));
        const fallbackById = new Map();
        fallbackUpdates.forEach((entry) => {
          if (!entry) return;
          fallbackById.set(entry.robotId, entry.statusUpdate);
          if (!entry.statusUpdate?.skipped) {
            fallbackOnlineResults.push(entry.statusUpdate);
          }
        });

        mapRobots((robot) => {
          const normalizedRobotId = robotId(robot);
          if (!normalizedRobotId) return robot;
          const label = normalizeText(robot.name, normalizedRobotId);
          const statusUpdate = fallbackById.get(normalizedRobotId);
          if (!statusUpdate || statusUpdate.skipped) {
            if (statusUpdate?.skipped) {
              skippedNameSet.add(label);
            }
            return robot;
          }
          if (statusUpdate.status === 'ok') {
            onlineNames.push(label);
          } else {
            offlineNames.push(label);
          }
          return {
            ...robot,
            tests: {
              ...(robot.tests || {}),
              online: {
                status: statusUpdate.status,
                value: statusUpdate.value,
                details: statusUpdate.details,
              },
            },
          };
        });

        updateOnlineCheckEstimateFromResults(fallbackOnlineResults);
      }

      renderDashboard();
      updateFleetOnlineSummary(onlineNames, offlineNames, Array.from(skippedNameSet).sort());
    } finally {
      state.isOnlineRefreshInFlight = false;
      setFleetOnlineButtonState(false);
      setRobotSearchingBulk(eligibleRobotIds, false);
      state.onlineRefreshLastAt = Date.now();
      state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
      startOnlineRefreshStatusTimer();
    }
  }

  async function runRobotTestsForRobot(robotIdValue, body) {
    const payload = await enqueueRobotJob(robotIdValue, {
      kind: 'test',
      testIds: Array.isArray(body?.testIds) ? body.testIds : undefined,
      pageSessionId: normalizeText(body?.pageSessionId, state.pageSessionId),
      source: 'manual',
      label: 'Run tests',
      timeoutSec: body?.timeoutSec,
      queueTimeoutSec: body?.queueTimeoutSec,
      connectTimeoutSec: body?.connectTimeoutSec,
      executeTimeoutSec: body?.executeTimeoutSec,
    });
    return {
      robotId: robotIdValue,
      runId: normalizeText(payload?.jobId, ''),
      startedAt: Number.isFinite(Number(payload?.activeJob?.startedAt)) ? Number(payload.activeJob.startedAt) : 0,
      finishedAt: 0,
      session: {},
      timing: {},
      results: [],
      activeJob: payload?.activeJob || null,
      queuedJobs: Array.isArray(payload?.queuedJobs) ? payload.queuedJobs : [],
      jobQueueVersion: Number.isFinite(Number(payload?.jobQueueVersion)) ? Number(payload.jobQueueVersion) : 0,
    };
  }

  return {
    runOnlineCheckForAllRobots,
    runOneRobotOnlineCheck,
    runRobotTestsForRobot,
  };
}
