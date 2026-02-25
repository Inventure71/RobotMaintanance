export function createTestsService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    runRobotTests: (robotId, body) => api(`/api/robots/${encodeURIComponent(robotId)}/tests/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    runOnlineBatch: (body) => api('/api/robots/online-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  };
}
