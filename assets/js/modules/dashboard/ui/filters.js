export function normalizeFilterValue(value, fallback = 'all') {
  const text = String(value || '').trim();
  return text || fallback;
}
