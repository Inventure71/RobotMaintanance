export function createRecorderCelebrationApi({
  cancelDelay,
  fallbackDurationMs,
  normalizeText,
  publishSuccessCelebration,
  publishSuccessCelebrationVideo,
  scheduleDelay,
}) {
  function setPublishSuccessCelebrationVisible(visible) {
    if (!publishSuccessCelebration) return;
    publishSuccessCelebration.classList.toggle('hidden', !visible);
    publishSuccessCelebration.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function resetPublishSuccessCelebration() {
    if (publishSuccessCelebrationVideo) {
      try {
        publishSuccessCelebrationVideo.pause?.();
      } catch (_error) {}
      try {
        publishSuccessCelebrationVideo.currentTime = 0;
      } catch (_error) {}
    }
    setPublishSuccessCelebrationVisible(false);
  }

  function ensurePublishSuccessCelebrationMediaLoaded() {
    if (!publishSuccessCelebrationVideo) return;
    const source = publishSuccessCelebrationVideo.querySelector?.('source[data-src]');
    if (!source) return;
    const currentSrc = normalizeText(source.getAttribute('src'), '');
    const nextSrc = normalizeText(source.getAttribute('data-src'), '');
    if (!currentSrc && nextSrc) {
      source.setAttribute('src', nextSrc);
      publishSuccessCelebrationVideo.load?.();
    }
  }

  async function playPublishSuccessCelebration() {
    if (!publishSuccessCelebration || !publishSuccessCelebrationVideo) return;
    ensurePublishSuccessCelebrationMediaLoaded();
    await new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null && cancelDelay) {
          cancelDelay(timeoutId);
        }
        publishSuccessCelebrationVideo.removeEventListener?.('ended', finish);
        publishSuccessCelebrationVideo.removeEventListener?.('error', finish);
        resetPublishSuccessCelebration();
        resolve();
      };

      setPublishSuccessCelebrationVisible(true);
      try {
        publishSuccessCelebrationVideo.pause?.();
      } catch (_error) {}
      try {
        publishSuccessCelebrationVideo.currentTime = 0;
      } catch (_error) {}

      publishSuccessCelebrationVideo.addEventListener?.('ended', finish);
      publishSuccessCelebrationVideo.addEventListener?.('error', finish);

      const durationMs = Number.isFinite(Number(publishSuccessCelebrationVideo.duration))
        && Number(publishSuccessCelebrationVideo.duration) > 0
        ? Math.ceil(Number(publishSuccessCelebrationVideo.duration) * 1000) + 150
        : fallbackDurationMs;
      if (scheduleDelay) {
        timeoutId = scheduleDelay(finish, durationMs);
      }

      try {
        const playResult = publishSuccessCelebrationVideo.play?.();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch (_error) {}

      if (!scheduleDelay) {
        finish();
      }
    });
  }

  return {
    playPublishSuccessCelebration,
  };
}
