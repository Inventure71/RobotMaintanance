export function clampInterval(value, min, max, fallback) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.max(min, Math.min(numeric, max));
}
