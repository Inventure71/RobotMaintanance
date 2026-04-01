export function createRecorderTerminalPresetApi(deps) {
  const {
    RECORDER_GENERIC_INFO_CONFIG_URL,
    RECORDER_TERMINAL_PRESET_IDS,
    PRESET_COMMANDS,
    buildRecorderGenericInfoBundleCommand,
    env,
    normalizeRecorderGenericInfoConfig,
    normalizeText,
  } = deps;

  let recorderGenericInfoConfigPromise = null;

  async function loadRecorderGenericInfoConfig() {
    if (typeof env.loadRecorderGenericInfoConfig === 'function') {
      return normalizeRecorderGenericInfoConfig(await env.loadRecorderGenericInfoConfig());
    }
    if (!recorderGenericInfoConfigPromise) {
      const configUrl = normalizeText(RECORDER_GENERIC_INFO_CONFIG_URL, '');
      if (!configUrl) {
        throw new Error('Recorder generic info config URL is not configured.');
      }
      const fetchImpl =
        typeof env.fetch === 'function'
          ? env.fetch.bind(env)
          : typeof fetch === 'function'
            ? fetch.bind(globalThis)
            : null;
      if (!fetchImpl) {
        throw new Error('fetch is not available to load the recorder generic info config.');
      }
      recorderGenericInfoConfigPromise = fetchImpl(configUrl, { cache: 'no-store' })
        .then(async (response) => {
          if (!response?.ok) {
            throw new Error(`Unable to load recorder generic info config (${response?.status || 'unknown'}).`);
          }
          return response.json();
        })
        .then((payload) => normalizeRecorderGenericInfoConfig(payload));
    }
    return recorderGenericInfoConfigPromise;
  }

  async function resolveRecorderTerminalPresetCommand(preset) {
    const presetId = normalizeText(preset?.id, '').toLowerCase();
    if (presetId !== 'generic-info') {
      return normalizeText(preset?.command, '');
    }
    const config = await loadRecorderGenericInfoConfig();
    return buildRecorderGenericInfoBundleCommand(config);
  }

  function getRecorderTerminalPresets() {
    return PRESET_COMMANDS.filter((preset) => {
      const presetId = normalizeText(preset?.id, '').toLowerCase();
      return RECORDER_TERMINAL_PRESET_IDS.has(presetId);
    });
  }

  return {
    getRecorderTerminalPresets,
    resolveRecorderTerminalPresetCommand,
  };
}
