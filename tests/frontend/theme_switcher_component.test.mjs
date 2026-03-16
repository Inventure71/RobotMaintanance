import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DESIGN_SYSTEM_ID,
  DESIGN_SYSTEM_ATTRIBUTE,
  DESIGN_SYSTEM_OPTIONS,
  DESIGN_SYSTEM_STORAGE_KEY,
  initThemeSwitcher,
} from '../../assets/js/components/theme-switcher-component.js';

function createRootElement(initialAttributes = {}) {
  const attributes = new Map(Object.entries(initialAttributes));
  return {
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
  };
}

function createSelectElement() {
  return {
    _options: [],
    _listeners: new Map(),
    _value: '',
    set innerHTML(_value) {
      this._options = [];
    },
    get innerHTML() {
      return '';
    },
    appendChild(option) {
      this._options.push(option);
    },
    addEventListener(type, handler) {
      this._listeners.set(type, handler);
    },
    get value() {
      return this._value;
    },
    set value(nextValue) {
      this._value = String(nextValue);
    },
    dispatchChange(nextValue) {
      this.value = nextValue;
      this._listeners.get('change')?.();
    },
  };
}

function installDomGlobals(storage = {}) {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const writes = [];
  const windowMock = {
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
        writes.push([key, String(value)]);
      },
    },
  };
  const documentMock = {
    createElement(tagName) {
      assert.equal(tagName, 'option');
      return {
        value: '',
        textContent: '',
      };
    },
  };

  global.window = windowMock;
  global.document = documentMock;

  return {
    storage,
    writes,
    restore() {
      global.window = originalWindow;
      global.document = originalDocument;
    },
  };
}

test('theme switcher restores persisted design system and syncs stylesheet state', (t) => {
  const globals = installDomGlobals({
    [DESIGN_SYSTEM_STORAGE_KEY]: 'classic',
  });
  t.after(() => globals.restore());
  const rootElement = createRootElement();
  const selectElement = createSelectElement();
  const swissStylesheet = { disabled: false };

  const switcher = initThemeSwitcher({
    attributeName: DESIGN_SYSTEM_ATTRIBUTE,
    defaultThemeId: DEFAULT_DESIGN_SYSTEM_ID,
    onApply: (designSystemId) => {
      swissStylesheet.disabled = designSystemId !== 'swiss';
    },
    rootElement,
    selectElement,
    storageKey: DESIGN_SYSTEM_STORAGE_KEY,
    themes: DESIGN_SYSTEM_OPTIONS,
  });

  assert.equal(rootElement.getAttribute(DESIGN_SYSTEM_ATTRIBUTE), 'classic');
  assert.equal(selectElement.value, 'classic');
  assert.equal(swissStylesheet.disabled, true);
  assert.deepEqual(
    selectElement._options.map((option) => [option.value, option.textContent]),
    [
      ['swiss', 'Swiss'],
      ['classic', 'Classic'],
    ],
  );
  assert.equal(switcher.getTheme(), 'classic');

  selectElement.dispatchChange('swiss');

  assert.equal(rootElement.getAttribute(DESIGN_SYSTEM_ATTRIBUTE), 'swiss');
  assert.equal(swissStylesheet.disabled, false);
  assert.equal(globals.storage[DESIGN_SYSTEM_STORAGE_KEY], 'swiss');
  assert.deepEqual(globals.writes, [[DESIGN_SYSTEM_STORAGE_KEY, 'swiss']]);
});

test('theme switcher falls back to the configured default when the stored value is invalid', (t) => {
  const globals = installDomGlobals({
    [DESIGN_SYSTEM_STORAGE_KEY]: 'deep-space',
  });
  t.after(() => globals.restore());
  const rootElement = createRootElement({
    [DESIGN_SYSTEM_ATTRIBUTE]: 'deep-space',
  });
  const selectElement = createSelectElement();

  initThemeSwitcher({
    attributeName: DESIGN_SYSTEM_ATTRIBUTE,
    defaultThemeId: DEFAULT_DESIGN_SYSTEM_ID,
    rootElement,
    selectElement,
    storageKey: DESIGN_SYSTEM_STORAGE_KEY,
    themes: DESIGN_SYSTEM_OPTIONS,
  });

  assert.equal(rootElement.getAttribute(DESIGN_SYSTEM_ATTRIBUTE), DEFAULT_DESIGN_SYSTEM_ID);
  assert.equal(selectElement.value, DEFAULT_DESIGN_SYSTEM_ID);
});
