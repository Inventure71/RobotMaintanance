export function createRobotTypesService({ fetchJson, buildApiUrl }) {
  const api = (path, init) => fetchJson(buildApiUrl(path), init);
  return {
    patchMappings: (typeId, body) => api(`/api/robot-types/${encodeURIComponent(typeId)}/mappings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    setTestMappings: (testId, robotTypeIds) => api(`/api/definitions/tests/${encodeURIComponent(testId)}/mappings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ robotTypeIds }) }),
    setFixMappings: (fixId, robotTypeIds) => api(`/api/definitions/fixes/${encodeURIComponent(fixId)}/mappings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ robotTypeIds }) }),
  };
}
