import { fetchJson } from './client.js';

export function runRobotTests(robotId, payload) {
  return fetchJson(`/api/tests/${encodeURIComponent(robotId)}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export function runOnlineCheck(robotId, payload = {}) {
  return fetchJson(`/api/tests/${encodeURIComponent(robotId)}/online`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
