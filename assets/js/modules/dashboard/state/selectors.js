export function getRobotById(state, id) {
  const normalizedId = String(id || '');
  return (state?.robots || []).find((robot) => String(robot?.id || '') === normalizedId) || null;
}

export function getSelectedRobotIds(state) {
  const selected = state?.selectedRobotIds;
  if (!(selected instanceof Set)) return [];
  return Array.from(selected.values());
}
