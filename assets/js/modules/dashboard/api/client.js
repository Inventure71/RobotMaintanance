function isLikelyLocalFrontendDevPort(port) {
  const normalized = String(port || '').trim();
  if (!normalized) return false;

  if (normalized === '3000' || normalized === '5500' || normalized === '5173') {
    return true;
  }

  const numeric = Number.parseInt(normalized, 10);
  return Number.isInteger(numeric) && numeric >= 8080 && numeric <= 8099;
}

function resolveApiBaseUrl(windowRef) {
  const byWindow =
    typeof windowRef?.ROBOT_API_BASE_URL === 'string' ? windowRef.ROBOT_API_BASE_URL.trim() : '';
  const byQuery = new URLSearchParams(windowRef?.location?.search || '').get('apiBase') || '';
  const explicit = byWindow || byQuery;
  if (explicit) return explicit.replace(/\/+$/, '');

  const location = windowRef?.location || {};
  const port = String(location.port || '').trim();

  if (isLikelyLocalFrontendDevPort(port)) {
    return 'http://127.0.0.1:8010';
  }

  if (port === '5000') {
    return `${location.protocol}//${location.hostname}:5010`;
  }

  return `${location.protocol}//${location.host}`;
}

export const API_BASE_URL = resolveApiBaseUrl(window);
export { resolveApiBaseUrl };

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
