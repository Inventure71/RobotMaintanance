export function formatDurationMs(ms = 0) {
  const totalSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function formatEpochSeconds(value = 0) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return 'n/a';
  return new Date(ts * 1000).toLocaleString();
}
