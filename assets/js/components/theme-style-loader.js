import {
  DEFAULT_DESIGN_SYSTEM_ID,
  DESIGN_SYSTEM_ATTRIBUTE,
  DESIGN_SYSTEM_OPTIONS,
  DESIGN_SYSTEM_STORAGE_KEY,
} from './theme-switcher-component.js';

const VALID_THEME_IDS = new Set(DESIGN_SYSTEM_OPTIONS.map((entry) => entry.id));
const THEME_LOADERS = {
  classic: () => import('../../css/theme-classic-entry.css'),
  swiss: () => import('../../css/theme-swiss-entry.css'),
};
const loadedThemes = new Set();

function normalizeThemeId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_THEME_IDS.has(normalized) ? normalized : DEFAULT_DESIGN_SYSTEM_ID;
}

export function resolveInitialThemeId() {
  let stored = '';
  try {
    stored = window?.localStorage?.getItem(DESIGN_SYSTEM_STORAGE_KEY) || '';
  } catch (_error) {
    stored = '';
  }
  const fromAttr =
    typeof document !== 'undefined'
      ? normalizeThemeId(document.documentElement.getAttribute(DESIGN_SYSTEM_ATTRIBUTE))
      : DEFAULT_DESIGN_SYSTEM_ID;
  const selected = normalizeThemeId(stored || fromAttr);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(DESIGN_SYSTEM_ATTRIBUTE, selected);
  }
  return selected;
}

export async function ensureThemeStyles(themeId) {
  const normalizedTheme = normalizeThemeId(themeId);
  if (loadedThemes.has(normalizedTheme)) {
    return normalizedTheme;
  }
  const loader = THEME_LOADERS[normalizedTheme] || THEME_LOADERS[DEFAULT_DESIGN_SYSTEM_ID];
  await loader();
  loadedThemes.add(normalizedTheme);
  return normalizedTheme;
}

export async function applyThemeStyles(themeId) {
  const normalizedTheme = normalizeThemeId(themeId);
  await ensureThemeStyles(normalizedTheme);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(DESIGN_SYSTEM_ATTRIBUTE, normalizedTheme);
  }
  return normalizedTheme;
}

