import assert from 'node:assert/strict';
import test from 'node:test';

import { renderManageEntityList } from '../../assets/js/modules/dashboard/features/manage/manageEntityList.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.title = '';
    this.type = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(event, handler) {
    this.listeners.set(event, handler);
  }
}

function withFakeDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
  };

  try {
    run();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test('renderManageEntityList renders split title and meta content when provided', () => {
  withFakeDocument(() => {
    const container = new FakeElement('div');

    renderManageEntityList({
      container,
      items: [{ id: 'robot-01', name: 'Atlas', type: 'Inspector' }],
      getId: (item) => item.id,
      getLabel: (item) => ({
        title: item.name,
        meta: item.type,
        ariaLabel: `${item.name} ${item.type}`,
      }),
      activeId: 'robot-01',
    });

    assert.equal(container.children.length, 1);
    const row = container.children[0];
    assert.equal(row.className, 'manage-list-item active');
    assert.equal(row.getAttribute('aria-label'), 'Atlas Inspector');
    assert.equal(row.title, 'Atlas Inspector');
    assert.equal(row.children.length, 2);
    assert.equal(row.children[0].className, 'manage-list-item-title');
    assert.equal(row.children[0].textContent, 'Atlas');
    assert.equal(row.children[1].className, 'manage-list-item-meta');
    assert.equal(row.children[1].textContent, 'Inspector');
  });
});

test('renderManageEntityList keeps legacy string labels working', () => {
  withFakeDocument(() => {
    const container = new FakeElement('div');

    renderManageEntityList({
      container,
      items: [{ id: 'robot-02' }],
      getId: (item) => item.id,
      getLabel: () => 'Legacy Label',
    });

    assert.equal(container.children.length, 1);
    const row = container.children[0];
    assert.equal(row.className, 'manage-list-item');
    assert.equal(row.getAttribute('aria-label'), 'Legacy Label');
    assert.equal(row.children.length, 1);
    assert.equal(row.children[0].className, 'manage-list-item-title');
    assert.equal(row.children[0].textContent, 'Legacy Label');
  });
});

test('renderManageEntityList preserves scroll position when rerendering the list', () => {
  withFakeDocument(() => {
    const container = new FakeElement('div');
    container.scrollTop = 184;
    container.scrollLeft = 12;

    renderManageEntityList({
      container,
      items: [
        { id: 'robot-01', name: 'Atlas' },
        { id: 'robot-02', name: 'Bolt' },
      ],
      getId: (item) => item.id,
      getLabel: (item) => item.name,
      activeId: 'robot-02',
    });

    assert.equal(container.scrollTop, 184);
    assert.equal(container.scrollLeft, 12);
  });
});
