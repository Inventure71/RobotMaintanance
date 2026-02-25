export function normalizeBatteryPercent(raw = '') {
  const text = String(raw || '').trim();
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!match) return Number.POSITIVE_INFINITY;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
