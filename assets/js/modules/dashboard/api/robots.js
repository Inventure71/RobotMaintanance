import { fetchJson } from './client.js';

export function loadRobots() {
  return fetchJson('/api/robots');
}

export function createRobot(payload) {
  return fetchJson('/api/robots', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}
