export function createFleetWindowingApi({
  initialSize,
  renderDashboard,
  stepSize,
  threshold,
}) {
  let enabled = false;
  let onlineRenderLimit = Number.POSITIVE_INFINITY;
  let offlineRenderLimit = Number.POSITIVE_INFINITY;
  let latestOnlineCount = 0;
  let latestOfflineCount = 0;
  let listenersBound = false;

  function bindLargeFleetWindowListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (listenersBound) return;
    listenersBound = true;
    window.addEventListener(
      'scroll',
      () => {
        maybeExpandLargeFleetWindow();
      },
      { passive: true },
    );
    window.addEventListener(
      'resize',
      () => {
        maybeExpandLargeFleetWindow();
      },
      { passive: true },
    );
  }

  function resetLargeFleetWindowLimits() {
    onlineRenderLimit = Number.POSITIVE_INFINITY;
    offlineRenderLimit = Number.POSITIVE_INFINITY;
    enabled = false;
  }

  function ensureLargeFleetWindowLimits(totalVisibleCount) {
    if (totalVisibleCount > threshold) {
      if (!enabled) {
        enabled = true;
        onlineRenderLimit = initialSize;
        offlineRenderLimit = initialSize;
      }
      return;
    }
    resetLargeFleetWindowLimits();
  }

  function setLatestVisibleCounts({ onlineCount, offlineCount }) {
    latestOnlineCount = Math.max(0, Number(onlineCount) || 0);
    latestOfflineCount = Math.max(0, Number(offlineCount) || 0);
  }

  function maybeExpandLargeFleetWindow() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!enabled) return;
    const nearPageBottom =
      window.innerHeight + window.scrollY >= Math.max(0, document.documentElement.scrollHeight - 680);
    if (!nearPageBottom) return;
    const nextOnlineLimit = Math.min(latestOnlineCount, onlineRenderLimit + stepSize);
    const nextOfflineLimit = Math.min(latestOfflineCount, offlineRenderLimit + stepSize);
    if (nextOnlineLimit === onlineRenderLimit && nextOfflineLimit === offlineRenderLimit) return;
    onlineRenderLimit = nextOnlineLimit;
    offlineRenderLimit = nextOfflineLimit;
    renderDashboard();
  }

  function applyLargeFleetWindow(list, kind) {
    if (!enabled) return list;
    const safeList = Array.isArray(list) ? list : [];
    const limit = kind === 'online' ? onlineRenderLimit : offlineRenderLimit;
    return safeList.slice(0, Math.max(0, limit));
  }

  function isWindowingEnabled() {
    return enabled;
  }

  return {
    bindLargeFleetWindowListeners,
    resetLargeFleetWindowLimits,
    ensureLargeFleetWindowLimits,
    maybeExpandLargeFleetWindow,
    applyLargeFleetWindow,
    setLatestVisibleCounts,
    isWindowingEnabled,
  };
}
