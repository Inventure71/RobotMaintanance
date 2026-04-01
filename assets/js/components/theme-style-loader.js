import {
  DEFAULT_DESIGN_SYSTEM_ID,
  DESIGN_SYSTEM_ATTRIBUTE,
  DESIGN_SYSTEM_OPTIONS,
  DESIGN_SYSTEM_STORAGE_KEY,
} from './theme-switcher-component.js';

const VALID_THEME_IDS = new Set(DESIGN_SYSTEM_OPTIONS.map((entry) => entry.id));
const THEME_LOADERS = Object.freeze({
  classic: () => import('../../css/theme-classic-entry.css'),
  swiss: () => import('../../css/theme-swiss-entry.css'),
});

function isStylesheetNode(node) {
  if (!node || typeof node !== 'object') return false;
  const tagName = String(node.tagName || '').trim().toLowerCase();
  if (tagName === 'style') return true;
  return tagName === 'link' && String(node.rel || '').trim().toLowerCase() === 'stylesheet';
}

export function createThemeStyleController(options = {}) {
  const themeLoaders = options.themeLoaders && typeof options.themeLoaders === 'object'
    ? options.themeLoaders
    : THEME_LOADERS;
  const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : null);
  const loadedThemes = new Set();
  const themeStylesheets = new Map();

  function normalizeThemeId(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return VALID_THEME_IDS.has(normalized) ? normalized : DEFAULT_DESIGN_SYSTEM_ID;
  }

  function listStylesheetNodes() {
    if (!documentRef?.querySelectorAll) return [];
    return Array.from(documentRef.querySelectorAll('link[rel="stylesheet"], style')).filter(isStylesheetNode);
  }

  async function captureThemeStylesheets(loader) {
    const beforeNodes = new Set(listStylesheetNodes());
    await loader();
    await Promise.resolve();
    return listStylesheetNodes().filter((node) => !beforeNodes.has(node)).map((node) => ({
      node,
      media: typeof node.media === 'string' ? node.media : '',
    }));
  }

  function setStylesheetRecordActive(record, isActive) {
    const stylesheetNode = record?.node;
    if (!stylesheetNode || typeof stylesheetNode !== 'object') return;
    const activeMedia = record?.media || 'all';
    if ('disabled' in stylesheetNode) {
      stylesheetNode.disabled = !isActive;
    }
    if ('media' in stylesheetNode) {
      stylesheetNode.media = isActive ? activeMedia : 'not all';
    }
  }

  function activateTheme(themeId) {
    themeStylesheets.forEach((records, candidateThemeId) => {
      const isActive = candidateThemeId === themeId;
      records.forEach((record) => {
        setStylesheetRecordActive(record, isActive);
      });
    });
  }

  function resolveInitialThemeId() {
    let stored = '';
    try {
      stored = windowRef?.localStorage?.getItem(DESIGN_SYSTEM_STORAGE_KEY) || '';
    } catch (_error) {
      stored = '';
    }
    const fromAttr =
      documentRef?.documentElement
        ? normalizeThemeId(documentRef.documentElement.getAttribute(DESIGN_SYSTEM_ATTRIBUTE))
        : DEFAULT_DESIGN_SYSTEM_ID;
    const selected = normalizeThemeId(stored || fromAttr);
    if (documentRef?.documentElement) {
      documentRef.documentElement.setAttribute(DESIGN_SYSTEM_ATTRIBUTE, selected);
    }
    return selected;
  }

  async function ensureThemeStyles(themeId) {
    const normalizedTheme = normalizeThemeId(themeId);
    if (!loadedThemes.has(normalizedTheme)) {
      const loader = themeLoaders[normalizedTheme] || themeLoaders[DEFAULT_DESIGN_SYSTEM_ID];
      if (typeof loader === 'function') {
        const records = await captureThemeStylesheets(loader);
        themeStylesheets.set(normalizedTheme, records);
      } else {
        themeStylesheets.set(normalizedTheme, []);
      }
      loadedThemes.add(normalizedTheme);
    }
    activateTheme(normalizedTheme);
    return normalizedTheme;
  }

  async function applyThemeStyles(themeId) {
    const normalizedTheme = normalizeThemeId(themeId);
    await ensureThemeStyles(normalizedTheme);
    if (documentRef?.documentElement) {
      documentRef.documentElement.setAttribute(DESIGN_SYSTEM_ATTRIBUTE, normalizedTheme);
    }
    return normalizedTheme;
  }

  return {
    applyThemeStyles,
    ensureThemeStyles,
    resolveInitialThemeId,
  };
}

const themeStyleController = createThemeStyleController();

export const applyThemeStyles = themeStyleController.applyThemeStyles;
export const ensureThemeStyles = themeStyleController.ensureThemeStyles;
export const resolveInitialThemeId = themeStyleController.resolveInitialThemeId;
