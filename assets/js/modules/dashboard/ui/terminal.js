export function appendTerminalLine(container, line) {
  if (!container) return;
  const div = document.createElement('div');
  div.textContent = String(line || '');
  container.appendChild(div);
}
