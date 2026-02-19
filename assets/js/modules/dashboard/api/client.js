export const API_BASE_URL = (() => {
  const byWindow = typeof window.ROBOT_API_BASE_URL === 'string' ? window.ROBOT_API_BASE_URL.trim() : '';
  const byQuery = new URLSearchParams(window.location.search).get('apiBase') || '';
  const explicit = byWindow || byQuery;
  if (explicit) return explicit.replace(/\/+$/, '');

  if (window.location.port === '3000' || window.location.port === '5500') {
    return 'http://127.0.0.1:8010';
  }

  return `${window.location.protocol}//${window.location.host}`;
})();

export function buildApiUrl(path) {
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function createPageSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `page-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function fetchJson(path, init = undefined) {
  const response = await fetch(buildApiUrl(path), init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return response.json();
}
