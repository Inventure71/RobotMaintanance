export function createFixTestsJobQueueApi({
  robotId,
  mapRobots,
  robotJobsApi,
  robotJobQueueStore,
  robotJobQueueRenderer,
  applyRuntimeRobotPatches,
}) {
  function renderRobotJobQueueStrip(activity, options = {}) {
    return robotJobQueueRenderer.renderQueueStrip(activity, options);
  }

  function renderRobotStopCurrentJobButton(activity, robotIdValue) {
    return robotJobQueueRenderer.renderStopCurrentJobButton(activity, robotIdValue);
  }

  function applyRobotJobQueueSnapshot(robotIdValue, snapshot, { repaint = true } = {}) {
    const normalizedRobotId = robotId(robotIdValue);
    if (!normalizedRobotId) return null;
    const normalizedSnapshot = robotJobQueueStore.remember(normalizedRobotId, snapshot);
    mapRobots((item) =>
      robotId(item) === normalizedRobotId
        ? robotJobQueueStore.applySnapshotToRobot(item, normalizedSnapshot)
        : item,
    );
    if (repaint) {
      applyRuntimeRobotPatches(new Set([normalizedRobotId]));
    }
    return normalizedSnapshot;
  }

  async function enqueueRobotJob(robotIdValue, body) {
    const normalizedRobotId = robotId(robotIdValue);
    if (!normalizedRobotId) {
      throw new Error('Robot id is required');
    }
    const payload = await robotJobsApi.enqueueJob(normalizedRobotId, body || {});
    applyRobotJobQueueSnapshot(normalizedRobotId, payload, { repaint: true });
    return payload;
  }

  async function stopCurrentJob(robotIdValue) {
    const normalizedRobotId = robotId(robotIdValue);
    if (!normalizedRobotId) {
      throw new Error('Robot id is required');
    }
    const response = await robotJobsApi.stopActiveJob(normalizedRobotId);
    applyRobotJobQueueSnapshot(normalizedRobotId, response?.body, { repaint: true });
    return response;
  }

  return {
    renderRobotJobQueueStrip,
    renderRobotStopCurrentJobButton,
    applyRobotJobQueueSnapshot,
    enqueueRobotJob,
    stopCurrentJob,
  };
}
