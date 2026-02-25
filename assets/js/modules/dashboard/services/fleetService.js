export function createFleetService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    getFleetStatic: () => api('/api/fleet/static'),
    getFleetRuntime: (since = 0) => api(`/api/fleet/runtime?since=${encodeURIComponent(String(since))}`),
    getRobotTypes: () => api('/api/robot-types'),
    createRobot: (body) => api('/api/robots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  };
}
