export function createMonitorService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    getConfig: () => api('/api/monitor/config'),
    patchConfig: (body) => api('/api/monitor/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  };
}
