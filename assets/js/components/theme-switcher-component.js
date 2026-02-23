const DEFAULT_THEME_STORAGE_KEY = 'dashboard.theme';

export const APP_THEMES = Object.freeze([
  { id: 'deep-space', label: 'Deep Space' },
  { id: 'arctic-grid', label: 'Arctic Grid' },
  { id: 'ember-signal', label: 'Ember Signal' },
]);

function normalizeThemeId(themeId, themes, fallbackThemeId) {
  const normalized = String(themeId || '').trim().toLowerCase();
  if (!normalized) return fallbackThemeId;
  const match = themes.find((theme) => theme.id === normalized);
  return match ? match.id : fallbackThemeId;
}

function safeReadStorage(storageKey) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch (_error) {
    return null;
  }
}

function safeWriteStorage(storageKey, value) {
  try {
    window.localStorage.setItem(storageKey, String(value || ''));
  } catch (_error) {
    // Best effort persistence.
  }
}

function syncSelectOptions(selectElement, themes) {
  if (!selectElement) return;
  selectElement.innerHTML = '';
  themes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.label;
    selectElement.appendChild(option);
  });
}

export function initThemeSwitcher(options = {}) {
  const themes = Array.isArray(options.themes) && options.themes.length ? options.themes : APP_THEMES;
  const fallbackThemeId = normalizeThemeId(options.defaultThemeId || themes[0]?.id, themes, 'deep-space');
  const storageKey = String(options.storageKey || DEFAULT_THEME_STORAGE_KEY);
  const rootElement = options.rootElement || document.documentElement;
  const selectElement = options.selectElement || null;

  const applyTheme = (nextThemeId, { persist = true, syncSelect = true } = {}) => {
    const resolved = normalizeThemeId(nextThemeId, themes, fallbackThemeId);
    rootElement.setAttribute('data-theme', resolved);
    if (syncSelect && selectElement && selectElement.value !== resolved) {
      selectElement.value = resolved;
    }
    if (persist) {
      safeWriteStorage(storageKey, resolved);
    }
    return resolved;
  };

  const storedThemeId = safeReadStorage(storageKey);
  const initialThemeId = normalizeThemeId(options.initialThemeId || storedThemeId, themes, fallbackThemeId);

  if (selectElement) {
    syncSelectOptions(selectElement, themes);
    selectElement.value = initialThemeId;
    selectElement.addEventListener('change', () => {
      applyTheme(selectElement.value);
    });
  }

  applyTheme(initialThemeId, { persist: false, syncSelect: true });

  return {
    themes,
    getTheme: () => normalizeThemeId(rootElement.getAttribute('data-theme'), themes, fallbackThemeId),
    setTheme: (themeId) => applyTheme(themeId),
  };
}
