export function readHash() {
  return String(window.location.hash || '').replace(/^#/, '');
}

export function writeHash(hash) {
  const next = String(hash || '').replace(/^#/, '');
  if (readHash() === next) return;
  window.location.hash = next;
}
