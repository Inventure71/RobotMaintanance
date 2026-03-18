export function normalizeManageTabValue({ normalizeText, manageTabs, tabId }) {
  const normalized = normalizeText(tabId, '').toLowerCase();
  if (normalized === 'tests' || normalized === 'fixes') {
    return 'definitions';
  }
  return manageTabs.includes(normalized) ? normalized : '';
}

export function buildManageHashValue({ normalizeManageTab, manageViewHash, tabId }) {
  const normalized = normalizeManageTab(tabId) || 'robots';
  return normalized === 'robots' ? manageViewHash : `${manageViewHash}/${normalized}`;
}

export function parseManageRouteValue({ normalizeManageTab, normalizeText, manageViewHash, hashValue }) {
  const hash = normalizeText(hashValue, '').replace(/^#/, '');
  if (hash === manageViewHash || hash === 'add-robot') {
    return { isManageRoute: true, tabId: '' };
  }
  if (!hash.startsWith(`${manageViewHash}/`)) {
    return { isManageRoute: false, tabId: '' };
  }
  const tabId = hash.slice(manageViewHash.length + 1);
  return { isManageRoute: true, tabId: normalizeManageTab(tabId) || 'robots' };
}

export function normalizeRobotRegistryPanelValue(normalizeText, panelId) {
  const normalized = normalizeText(panelId, '').toLowerCase();
  if (normalized === 'manage' || normalized === 'existing-robots') return 'existing-robots';
  if (normalized === 'add' || normalized === 'new-robot') return 'new-robot';
  if (normalized === 'robot-types' || normalized === 'existing-robot-types' || normalized === 'types' || normalized === 'type') return 'existing-robot-types';
  if (normalized === 'new-robot-type' || normalized === 'add-type' || normalized === 'new-type') return 'new-robot-type';
  return 'existing-robots';
}
