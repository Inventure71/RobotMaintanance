export function normalizeTestRunPayload(payload = {}) {
  return {
    dryRun: Boolean(payload.dryRun),
    testIds: Array.isArray(payload.testIds) ? payload.testIds : undefined,
  };
}
