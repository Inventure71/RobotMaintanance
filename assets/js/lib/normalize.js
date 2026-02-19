export function normalizeStatus(value) {
  if (value === 'ok' || value === 'warning' || value === 'error') return value;
  return 'warning';
}

export function normalizeTypeId(typeId) {
  return String(typeId || '')
    .trim()
    .toLowerCase();
}

export function normalizeText(value, fallback) {
  const candidate = value == null ? '' : String(value).trim();
  return candidate || fallback;
}
