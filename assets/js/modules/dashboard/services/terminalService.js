export function createTerminalService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    openSession: (robotId, body) => api(`/api/robots/${encodeURIComponent(robotId)}/terminal/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    closeSession: (robotId, pageSessionId) => api(`/api/robots/${encodeURIComponent(robotId)}/terminal/session?pageSessionId=${encodeURIComponent(pageSessionId)}`, { method: 'DELETE' }),
    runCommand: (robotId, body) => api(`/api/robots/${encodeURIComponent(robotId)}/terminal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    buildStreamUrl: (robotId, pageSessionId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal/stream?pageSessionId=${encodeURIComponent(pageSessionId)}`),
  };
}
