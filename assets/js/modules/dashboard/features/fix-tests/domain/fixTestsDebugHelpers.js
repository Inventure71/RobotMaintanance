export function createFixTestsDebugHelpers({ normalizeText, normalizeStatus }) {
  function normalizeDebugSession(session, runIdFallback = '') {
    if (!session || typeof session !== 'object') return {};
    return {
      runId: normalizeText(session.runId, runIdFallback),
      robotId: normalizeText(session.robotId, ''),
      pageSessionId: normalizeText(session.pageSessionId, ''),
      runKind: normalizeText(session.runKind, ''),
      transportReused: Boolean(session.transportReused),
      resetPolicy: normalizeText(session.resetPolicy, ''),
    };
  }

  function normalizeDebugTiming(timing) {
    if (!timing || typeof timing !== 'object') return {};
    return {
      queueMs: Number.isFinite(Number(timing.queueMs)) ? Number(timing.queueMs) : 0,
      connectMs: Number.isFinite(Number(timing.connectMs)) ? Number(timing.connectMs) : 0,
      executeMs: Number.isFinite(Number(timing.executeMs)) ? Number(timing.executeMs) : 0,
      totalMs: Number.isFinite(Number(timing.totalMs)) ? Number(timing.totalMs) : 0,
    };
  }

  function normalizeStepDebug(step) {
    if (!step || typeof step !== 'object') return null;
    return {
      id: normalizeText(step.id, 'step'),
      status: normalizeStatus(step.status),
      value: normalizeText(step.value, 'n/a'),
      details: normalizeText(step.details, 'No detail available'),
      ms: Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0,
      output: normalizeText(step.output, ''),
    };
  }

  function normalizeTestDebugResult(result) {
    if (!result || typeof result !== 'object') return null;
    const steps = Array.isArray(result.steps) ? result.steps.map(normalizeStepDebug).filter(Boolean) : [];
    return {
      id: normalizeText(result.id, ''),
      status: normalizeStatus(result.status),
      value: normalizeText(result.value, 'n/a'),
      details: normalizeText(result.details, 'No detail available'),
      reason: normalizeText(result.reason, ''),
      errorCode: normalizeText(result.errorCode, ''),
      source: normalizeText(result.source, ''),
      checkedAt: Number.isFinite(Number(result.checkedAt)) ? Number(result.checkedAt) : 0,
      skipped: Boolean(result.skipped),
      ms: Number.isFinite(Number(result.ms)) ? Number(result.ms) : 0,
      read: result.read && typeof result.read === 'object' ? result.read : {},
      raw: result.raw && typeof result.raw === 'object' ? result.raw : {},
      steps,
    };
  }

  function normalizeTestDebugCollection(rawCollection) {
    if (!rawCollection || typeof rawCollection !== 'object') return {};
    const entries = Array.isArray(rawCollection)
      ? rawCollection.map((entry) => [normalizeText(entry?.id, ''), entry])
      : Object.entries(rawCollection);
    const normalized = {};
    entries.forEach(([rawId, rawValue]) => {
      const base = rawValue && typeof rawValue === 'object' ? rawValue : {};
      const id = normalizeText(rawId, normalizeText(base.id, ''));
      if (!id) return;
      const debugResult = normalizeTestDebugResult({ ...base, id });
      if (!debugResult) return;
      const session = normalizeDebugSession(base.session, normalizeText(base.runId, ''));
      normalized[id] = {
        ...debugResult,
        runId: normalizeText(base.runId, normalizeText(session.runId, '')),
        startedAt: Number.isFinite(Number(base.startedAt)) ? Number(base.startedAt) : 0,
        finishedAt: Number.isFinite(Number(base.finishedAt)) ? Number(base.finishedAt) : 0,
        session,
        timing: normalizeDebugTiming(base.timing),
      };
    });
    return normalized;
  }

  return {
    normalizeDebugSession,
    normalizeDebugTiming,
    normalizeStepDebug,
    normalizeTestDebugResult,
    normalizeTestDebugCollection,
  };
}
