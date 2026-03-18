export function renderRobotRegistryPanel({ buttons, panels, normalizeRobotRegistryPanel, panelId }) {
  const nextPanel = normalizeRobotRegistryPanel(panelId);
  buttons.forEach((button) => {
    const isActive = normalizeRobotRegistryPanel(button?.dataset?.robotRegistryPanelButton) === nextPanel;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  panels.forEach((panel) => {
    const isActive = normalizeRobotRegistryPanel(panel?.dataset?.robotRegistryPanel) === nextPanel;
    panel.classList.toggle('active', isActive);
    panel.classList.toggle('hidden', !isActive);
  });
  return nextPanel;
}
