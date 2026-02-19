import { fetchJson } from './client.js';

export function loadMonitorConfig() {
  return fetchJson('/api/monitor/config');
}

export function updateMonitorConfig(payload) {
  return fetchJson('/api/monitor/config', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}
