export function setDetailVisible(panel, visible) {
  if (!panel) return;
  panel.classList.toggle('hidden', !visible);
}
