import test from 'node:test';
import assert from 'node:assert/strict';

import { createThemeStyleController } from '../../assets/js/components/theme-style-loader.js';

function createFakeNode({ id, tagName = 'LINK', rel = 'stylesheet', media = 'all' }) {
  return {
    id,
    tagName,
    rel,
    media,
    disabled: false,
  };
}

function createFakeEnvironment() {
  const attributes = new Map();
  const stylesheetNodes = [];
  const storage = new Map();

  return {
    documentRef: {
      documentElement: {
        getAttribute(name) {
          return attributes.get(name) ?? null;
        },
        setAttribute(name, value) {
          attributes.set(name, String(value));
        },
      },
      querySelectorAll(selector) {
        assert.equal(selector, 'link[rel="stylesheet"], style');
        return stylesheetNodes;
      },
    },
    windowRef: {
      localStorage: {
        getItem(key) {
          return storage.get(key) ?? null;
        },
        setItem(key, value) {
          storage.set(key, String(value));
        },
      },
    },
    stylesheetNodes,
  };
}

test('applyThemeStyles deactivates the previously loaded theme stylesheet set', async () => {
  const env = createFakeEnvironment();
  const classicNode = createFakeNode({ id: 'classic' });
  const swissNode = createFakeNode({ id: 'swiss' });

  const controller = createThemeStyleController({
    documentRef: env.documentRef,
    windowRef: env.windowRef,
    themeLoaders: {
      classic: async () => {
        if (!env.stylesheetNodes.includes(classicNode)) {
          env.stylesheetNodes.push(classicNode);
        }
      },
      swiss: async () => {
        if (!env.stylesheetNodes.includes(swissNode)) {
          env.stylesheetNodes.push(swissNode);
        }
      },
    },
  });

  await controller.applyThemeStyles('classic');
  assert.equal(classicNode.disabled, false);
  assert.equal(classicNode.media, 'all');

  await controller.applyThemeStyles('swiss');
  assert.equal(env.documentRef.documentElement.getAttribute('data-design-system'), 'swiss');
  assert.equal(classicNode.disabled, true);
  assert.equal(classicNode.media, 'not all');
  assert.equal(swissNode.disabled, false);
  assert.equal(swissNode.media, 'all');

  await controller.applyThemeStyles('classic');
  assert.equal(env.documentRef.documentElement.getAttribute('data-design-system'), 'classic');
  assert.equal(classicNode.disabled, false);
  assert.equal(classicNode.media, 'all');
  assert.equal(swissNode.disabled, true);
  assert.equal(swissNode.media, 'not all');
  assert.equal(env.stylesheetNodes.length, 2);
});
