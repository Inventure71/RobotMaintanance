export function createDefinitionsService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    getSummary: () => api('/api/definitions/summary'),
    reload: () => api('/api/definitions/reload', { method: 'POST' }),
    upsertTest: (body) => api('/api/definitions/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    upsertFix: (body) => api('/api/definitions/fixes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    deleteTest: (testId) => api(`/api/definitions/tests/${encodeURIComponent(testId)}`, { method: 'DELETE' }),
    deleteFix: (fixId) => api(`/api/definitions/fixes/${encodeURIComponent(fixId)}`, { method: 'DELETE' }),
  };
}
