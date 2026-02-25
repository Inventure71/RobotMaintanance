export function createFixesService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    startFixRun: (robotId, fixId, body) => api(`/api/robots/${encodeURIComponent(robotId)}/fixes/${encodeURIComponent(fixId)}/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }),
    getFixRun: (robotId, runId) => api(`/api/robots/${encodeURIComponent(robotId)}/fixes/runs/${encodeURIComponent(runId)}`),
  };
}
