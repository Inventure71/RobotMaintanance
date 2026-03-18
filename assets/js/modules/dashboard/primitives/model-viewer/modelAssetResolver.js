const DEFAULT_QUALITY_LEVELS = Object.freeze([
  Object.freeze({ id: 'low', folder: 'LowRes' }),
  Object.freeze({ id: 'high', folder: 'HighRes' }),
]);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function normalizeQualityLevels(levels) {
  if (!Array.isArray(levels) || !levels.length) return DEFAULT_QUALITY_LEVELS;
  const normalized = levels
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const id = normalizeText(entry.id, '').toLowerCase();
      const folder = normalizeText(entry.folder, '');
      if (!id || !folder) return null;
      return Object.freeze({ id, folder });
    })
    .filter(Boolean);
  return normalized.length ? Object.freeze(normalized) : DEFAULT_QUALITY_LEVELS;
}

function splitPathSuffix(url) {
  const raw = normalizeText(url, '').replace(/^\.\//, '');
  if (!raw) return { path: '', suffix: '' };
  const queryIndex = raw.indexOf('?');
  const hashIndex = raw.indexOf('#');
  const splitIndex =
    queryIndex === -1
      ? hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);
  if (splitIndex === -1) return { path: raw, suffix: '' };
  return { path: raw.slice(0, splitIndex), suffix: raw.slice(splitIndex) };
}

function buildQualityLookup(qualityLevels) {
  const map = new Map();
  qualityLevels.forEach((level, index) => {
    map.set(level.id.toLowerCase(), index);
    map.set(level.folder.toLowerCase(), index);
  });
  return map;
}

function stripKnownQualityFolder(relativePath, qualityLevels) {
  const segments = relativePath.split('/').filter(Boolean);
  if (!segments.length) return '';
  const first = segments[0].toLowerCase();
  const known = qualityLevels.some(
    (level) => level.id.toLowerCase() === first || level.folder.toLowerCase() === first,
  );
  if (known) {
    return segments.slice(1).join('/');
  }
  return segments.join('/');
}

function buildPathForQuality(baseUrl, level, qualityLevels) {
  const { path, suffix } = splitPathSuffix(baseUrl);
  const modelsMatch = path.match(/^(.*assets\/models\/)(.+)$/i);
  if (!modelsMatch) return `${path}${suffix}`;
  const prefix = normalizeText(modelsMatch[1], '');
  const relative = stripKnownQualityFolder(normalizeText(modelsMatch[2], ''), qualityLevels);
  if (!relative) return `${path}${suffix}`;
  return `${prefix}${level.folder}/${relative}${suffix}`;
}

export function buildModelQualityCandidates(baseUrl, requestedQuality, options = {}) {
  const qualityLevels = normalizeQualityLevels(options.qualityLevels);
  const normalizedBaseUrl = normalizeText(baseUrl, '');
  if (!normalizedBaseUrl) return [];

  const lookup = buildQualityLookup(qualityLevels);
  const requested = normalizeText(requestedQuality, qualityLevels[0].id).toLowerCase();
  const startIndex = lookup.has(requested) ? lookup.get(requested) : 0;

  const candidates = [];
  for (let offset = 0; offset < qualityLevels.length; offset += 1) {
    const index = (startIndex + offset) % qualityLevels.length;
    candidates.push(buildPathForQuality(normalizedBaseUrl, qualityLevels[index], qualityLevels));
  }
  return candidates;
}

export function createModelAssetResolver(options = {}) {
  const qualityLevels = normalizeQualityLevels(options.qualityLevels);
  const fetchImpl =
    typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : typeof fetch === 'function'
        ? fetch.bind(globalThis)
        : null;
  const existsCache = new Map();
  const resolveCache = new Map();

  async function urlExists(url) {
    const normalizedUrl = normalizeText(url, '');
    if (!normalizedUrl || !fetchImpl) return Boolean(normalizedUrl);
    if (existsCache.has(normalizedUrl)) return existsCache.get(normalizedUrl);

    const probePromise = (async () => {
      try {
        const head = await fetchImpl(normalizedUrl, { method: 'HEAD' });
        if (head?.ok) return true;
        if (head && head.status && head.status !== 405 && head.status !== 501) return false;
      } catch (_error) {
        // Fall through to GET probe.
      }
      try {
        const get = await fetchImpl(normalizedUrl, { method: 'GET' });
        return Boolean(get?.ok);
      } catch (_error) {
        return false;
      }
    })();

    existsCache.set(normalizedUrl, probePromise);
    return probePromise;
  }

  function getInitialModelUrl(baseUrl, requestedQuality) {
    const candidates = buildModelQualityCandidates(baseUrl, requestedQuality, { qualityLevels });
    return candidates[0] || normalizeText(baseUrl, '');
  }

  async function resolveModelUrl(baseUrl, requestedQuality) {
    const normalizedBaseUrl = normalizeText(baseUrl, '');
    const normalizedQuality = normalizeText(requestedQuality, qualityLevels[0].id).toLowerCase();
    const cacheKey = `${normalizedQuality}::${normalizedBaseUrl}`;
    if (resolveCache.has(cacheKey)) return resolveCache.get(cacheKey);

    const candidates = buildModelQualityCandidates(normalizedBaseUrl, normalizedQuality, { qualityLevels });
    for (const candidate of candidates) {
      // Stop before looping by probing each candidate exactly once.
      if (await urlExists(candidate)) {
        resolveCache.set(cacheKey, candidate);
        return candidate;
      }
    }

    const fallback = candidates[0] || normalizedBaseUrl;
    resolveCache.set(cacheKey, fallback);
    return fallback;
  }

  function bindModelViewerSource(modelViewer, baseUrl, requestedQuality) {
    if (!modelViewer) return;

    const normalizedBaseUrl = normalizeText(baseUrl, '');
    const normalizedQuality = normalizeText(requestedQuality, qualityLevels[0].id).toLowerCase();
    const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    modelViewer.dataset.modelResolutionToken = requestToken;
    modelViewer.dataset.modelResolutionQuality = normalizedQuality;
    modelViewer.dataset.modelResolutionBaseUrl = normalizedBaseUrl;

    const initialUrl = getInitialModelUrl(normalizedBaseUrl, normalizedQuality);
    if (initialUrl && modelViewer.getAttribute('src') !== initialUrl) {
      modelViewer.setAttribute('src', initialUrl);
    }

    if (!fetchImpl) return;
    resolveModelUrl(normalizedBaseUrl, normalizedQuality).then((resolvedUrl) => {
      if (modelViewer.dataset.modelResolutionToken !== requestToken) return;
      const nextUrl = normalizeText(resolvedUrl, '');
      if (!nextUrl) return;
      if (modelViewer.getAttribute('src') !== nextUrl) {
        modelViewer.setAttribute('src', nextUrl);
      }
    });
  }

  return {
    qualityLevels,
    getInitialModelUrl,
    resolveModelUrl,
    bindModelViewerSource,
  };
}
