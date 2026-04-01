export function createFleetModelViewerApi({
  CAN_USE_MODEL_VIEWER,
  MODEL_RESOLUTION_LOW,
  modelAssetResolver,
  normalizeText,
}) {
  let modelViewerRuntimePromise = null;
  const lazyModelViewerObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry?.isIntersecting) return;
            hydrateLazyModelViewer(entry.target).catch(() => {});
            lazyModelViewerObserver.unobserve(entry.target);
          });
        },
        {
          root: null,
          rootMargin: '240px 0px',
          threshold: 0.01,
        },
      )
      : null;

  function shouldEnableModelAutoRotate() {
    try {
      if (window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
      if (window?.matchMedia?.('(max-width: 900px)')?.matches) return false;
      if (navigator?.connection?.saveData) return false;
    } catch (_error) {
      // Fall through to default behavior.
    }
    return true;
  }

  async function ensureModelViewerRuntime() {
    if (!CAN_USE_MODEL_VIEWER) return false;
    if (!modelViewerRuntimePromise) {
      modelViewerRuntimePromise = import('@google/model-viewer')
        .then(() => true)
        .catch(() => false);
    }
    return modelViewerRuntimePromise;
  }

  async function hydrateLazyModelViewer(modelViewer) {
    if (!modelViewer || modelViewer.dataset.lazyHydrating === '1') return;
    const resolvedLazySrc = normalizeText(modelViewer.dataset.lazySrc, '');
    if (!resolvedLazySrc && !normalizeText(modelViewer.getAttribute('src'), '')) return;
    modelViewer.dataset.lazyHydrating = '1';
    const runtimeReady = await ensureModelViewerRuntime();
    if (!runtimeReady || !modelViewer.isConnected) {
      modelViewer.dataset.lazyHydrating = '';
      return;
    }
    if (!normalizeText(modelViewer.getAttribute('src'), '') && resolvedLazySrc) {
      modelViewer.setAttribute('src', resolvedLazySrc);
    }
    const baseModelUrl = normalizeText(modelViewer.dataset.modelResolutionBaseUrl, resolvedLazySrc);
    const preferredResolution = normalizeText(
      modelViewer.dataset.modelResolutionQuality,
      MODEL_RESOLUTION_LOW,
    );
    modelAssetResolver.bindModelViewerSource(modelViewer, baseModelUrl, preferredResolution);
    const modelContainer = modelViewer.closest('[data-role="robot-model-container"]');
    const isOffline = Boolean(modelContainer?.classList?.contains('offline'));
    if (isOffline || !shouldEnableModelAutoRotate()) {
      modelViewer.removeAttribute('auto-rotate');
      modelViewer.removeAttribute('auto-rotate-delay');
      modelViewer.removeAttribute('rotation-per-second');
    } else {
      modelViewer.setAttribute('auto-rotate', '');
      modelViewer.setAttribute('auto-rotate-delay', '0');
      modelViewer.setAttribute('rotation-per-second', '20deg');
    }
    modelViewer.dataset.lazyLoaded = '1';
    modelViewer.dataset.lazyHydrating = '';
    const placeholder = modelViewer.parentElement?.querySelector?.('[data-role="robot-model-placeholder"]');
    if (placeholder) {
      placeholder.classList.add('hidden');
    }
  }

  function registerLazyModelViewersInNode(node) {
    if (!node) return;
    const modelViewers = Array.from(node.querySelectorAll?.('model-viewer[data-lazy-src]') || []);
    modelViewers.forEach((modelViewer) => {
      if (modelViewer.dataset.lazyObserved === '1') {
        return;
      }
      modelViewer.dataset.lazyObserved = '1';
      if (lazyModelViewerObserver) {
        lazyModelViewerObserver.observe(modelViewer);
      } else {
        hydrateLazyModelViewer(modelViewer).catch(() => {});
      }
    });
  }

  function syncModelViewerRotationForContainer(container, isOffline) {
    if (!container) return;
    const modelViewer = container.querySelector('model-viewer');
    if (!modelViewer) return;
    if (!normalizeText(modelViewer.getAttribute('src'), '')) {
      registerLazyModelViewersInNode(container);
      return;
    }
    const baseModelUrl = normalizeText(
      modelViewer.dataset.modelResolutionBaseUrl,
      modelViewer.getAttribute('src'),
    );
    const preferredResolution = normalizeText(
      modelViewer.dataset.modelResolutionQuality,
      MODEL_RESOLUTION_LOW,
    );
    modelAssetResolver.bindModelViewerSource(modelViewer, baseModelUrl, preferredResolution);
    if (isOffline || !shouldEnableModelAutoRotate()) {
      modelViewer.removeAttribute('auto-rotate');
      modelViewer.removeAttribute('auto-rotate-delay');
      modelViewer.removeAttribute('rotation-per-second');
      return;
    }
    modelViewer.setAttribute('auto-rotate', '');
    modelViewer.setAttribute('auto-rotate-delay', '0');
    modelViewer.setAttribute('rotation-per-second', '20deg');
  }

  return {
    shouldEnableModelAutoRotate,
    ensureModelViewerRuntime,
    hydrateLazyModelViewer,
    registerLazyModelViewersInNode,
    syncModelViewerRotationForContainer,
  };
}
