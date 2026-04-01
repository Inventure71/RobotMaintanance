export function createDetailManageNavigationApi({
  MANAGE_TAB_STORAGE_KEY,
  MANAGE_TABS,
  MANAGE_VIEW_HASH,
  addRobotSection,
  buildManageHashValue,
  normalizeManageTabValue,
  normalizeRobotRegistryPanelValue,
  normalizeText,
  parseManageRouteValue,
  renderRobotRegistryPanel,
  robotRegistryPanelButtons,
  robotRegistryPanels,
  state,
  windowRef,
}) {
  function normalizeManageTab(tabId) {
    return normalizeManageTabValue({
      normalizeText,
      manageTabs: MANAGE_TABS,
      tabId,
    });
  }

  function getPersistedManageTab() {
    try {
      return normalizeManageTab(windowRef.sessionStorage.getItem(MANAGE_TAB_STORAGE_KEY));
    } catch (_error) {
      return '';
    }
  }

  function persistManageTab(tabId) {
    const normalized = normalizeManageTab(tabId);
    if (!normalized) return;
    try {
      windowRef.sessionStorage.setItem(MANAGE_TAB_STORAGE_KEY, normalized);
    } catch (_error) {
      // Best effort persistence.
    }
  }

  function resolveManageTab(tabId = '') {
    return (
      normalizeManageTab(tabId)
      || getPersistedManageTab()
      || normalizeManageTab(state.activeManageTab)
      || 'robots'
    );
  }

  function buildManageHash(tabId) {
    return buildManageHashValue({
      normalizeManageTab,
      manageViewHash: MANAGE_VIEW_HASH,
      tabId,
    });
  }

  function parseManageRoute(hashValue) {
    return parseManageRouteValue({
      normalizeManageTab,
      normalizeText,
      manageViewHash: MANAGE_VIEW_HASH,
      hashValue,
    });
  }

  function setLocationHash(hashValue) {
    const nextHash = normalizeText(hashValue, '').replace(/^#/, '');
    const currentHash = normalizeText(windowRef.location.hash, '').replace(/^#/, '');
    if (currentHash === nextHash) return;
    state.ignoreNextHashChange = true;
    windowRef.location.hash = nextHash ? `#${nextHash}` : '';
  }

  function isManageViewActive() {
    return Boolean(addRobotSection?.classList?.contains('active'));
  }

  function normalizeRobotRegistryPanel(panelId) {
    return normalizeRobotRegistryPanelValue(normalizeText, panelId);
  }

  function setActiveRobotRegistryPanel(panelId = 'existing-robots') {
    state.activeRobotRegistryPanel = renderRobotRegistryPanel({
      buttons: robotRegistryPanelButtons,
      panels: robotRegistryPanels,
      normalizeRobotRegistryPanel,
      panelId,
    });
  }

  function initRobotRegistryPanels() {
    robotRegistryPanelButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveRobotRegistryPanel(button?.dataset?.robotRegistryPanelButton || 'existing-robots');
      });
    });
    setActiveRobotRegistryPanel(state.activeRobotRegistryPanel || 'existing-robots');
  }

  return {
    normalizeManageTab,
    getPersistedManageTab,
    persistManageTab,
    resolveManageTab,
    buildManageHash,
    parseManageRoute,
    setLocationHash,
    isManageViewActive,
    normalizeRobotRegistryPanel,
    setActiveRobotRegistryPanel,
    initRobotRegistryPanels,
  };
}
