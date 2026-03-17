export const DESIGN_SYSTEM_ATTRIBUTE = 'data-design-system';
export const DESIGN_SYSTEM_STORAGE_KEY = 'dashboard.designSystem';
export const DEFAULT_DESIGN_SYSTEM_ID = 'classic';
export const DESIGN_SYSTEM_OPTIONS = Object.freeze([
  { id: 'swiss', label: 'Swiss' },
  { id: 'classic', label: 'Classic' },
]);

function normalizeOptionId(optionId, options, fallbackOptionId) {
  const normalized = String(optionId || '').trim().toLowerCase();
  if (!normalized) return fallbackOptionId;
  const match = options.find((option) => option.id === normalized);
  return match ? match.id : fallbackOptionId;
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

function syncSelectOptions(selectElement, options) {
  if (!selectElement) return;
  selectElement.innerHTML = '';
  options.forEach((optionConfig) => {
    const optionElement = document.createElement('option');
    optionElement.value = optionConfig.id;
    optionElement.textContent = optionConfig.label;
    selectElement.appendChild(optionElement);
  });
}

export function initThemeSwitcher(options = {}) {
  const availableOptions =
    Array.isArray(options.themes) && options.themes.length ? options.themes : DESIGN_SYSTEM_OPTIONS;
  const fallbackOptionId = normalizeOptionId(
    options.defaultThemeId || availableOptions[0]?.id,
    availableOptions,
    DEFAULT_DESIGN_SYSTEM_ID,
  );
  const storageKey = String(options.storageKey || DESIGN_SYSTEM_STORAGE_KEY);
  const attributeName = String(options.attributeName || DESIGN_SYSTEM_ATTRIBUTE);
  const rootElement = options.rootElement || document.documentElement;
  const selectElement = options.selectElement || null;
  const onApply = typeof options.onApply === 'function' ? options.onApply : null;

  const applyTheme = (nextOptionId, { persist = true, syncSelect = true } = {}) => {
    const resolvedOptionId = normalizeOptionId(nextOptionId, availableOptions, fallbackOptionId);
    rootElement.setAttribute(attributeName, resolvedOptionId);
    if (syncSelect && selectElement && selectElement.value !== resolvedOptionId) {
      selectElement.value = resolvedOptionId;
    }
    if (persist) {
      safeWriteStorage(storageKey, resolvedOptionId);
    }
    if (onApply) {
      onApply(resolvedOptionId, {
        attributeName,
        rootElement,
        selectElement,
      });
    }
    return resolvedOptionId;
  };

  const storedOptionId = safeReadStorage(storageKey);
  const rootOptionId = rootElement?.getAttribute?.(attributeName);
  const initialOptionId = normalizeOptionId(
    options.initialThemeId || rootOptionId || storedOptionId,
    availableOptions,
    fallbackOptionId,
  );

  if (selectElement) {
    syncSelectOptions(selectElement, availableOptions);
    selectElement.value = initialOptionId;
    selectElement.addEventListener('change', () => {
      applyTheme(selectElement.value);
    });
  }

  applyTheme(initialOptionId, { persist: false, syncSelect: true });

  return {
    themes: availableOptions,
    getTheme: () => normalizeOptionId(rootElement.getAttribute(attributeName), availableOptions, fallbackOptionId),
    setTheme: (themeId) => applyTheme(themeId),
  };
}
