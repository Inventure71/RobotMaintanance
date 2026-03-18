import test from 'node:test';
import assert from 'node:assert/strict';

function createClassList(node) {
  let tokens = new Set();
  const sync = () => {
    node._className = [...tokens].join(' ');
  };
  return {
    setFromString(value) {
      tokens = new Set(String(value || '').split(/\s+/).filter(Boolean));
      sync();
    },
    add: (...values) => {
      values.forEach((value) => {
        String(value || '').split(/\s+/).filter(Boolean).forEach((token) => tokens.add(token));
      });
      sync();
    },
    remove: (...values) => {
      values.forEach((value) => {
        String(value || '').split(/\s+/).filter(Boolean).forEach((token) => tokens.delete(token));
      });
      sync();
    },
    contains: (value) => tokens.has(value),
    toggle: (value, force) => {
      const token = String(value || '').trim();
      if (!token) return false;
      if (force === undefined) {
        if (tokens.has(token)) {
          tokens.delete(token);
          sync();
          return false;
        }
        tokens.add(token);
        sync();
        return true;
      }
      if (force) tokens.add(token);
      else tokens.delete(token);
      sync();
      return Boolean(force);
    },
  };
}

function matchesSelector(node, selector) {
  if (!node || !selector) return false;
  if (selector.startsWith('.')) {
    return node.classList?.contains(selector.slice(1)) || false;
  }
  return String(node.tagName || '').toLowerCase() === selector.toLowerCase();
}

function createElement(tagName = 'div') {
  const listeners = new Map();
  const node = {
    tagName: String(tagName || 'div').toUpperCase(),
    _className: '',
    children: [],
    style: {},
    dataset: {},
    textContent: '',
    disabled: false,
    type: '',
    rows: '',
    title: '',
    appendChild(child) {
      this.children.push(child);
      if (child && typeof child === 'object') child.parentNode = this;
      return child;
    },
    append(...children) {
      children.forEach((child) => this.appendChild(child));
    },
    prepend(...children) {
      this.children = [...children, ...this.children];
      this.children.forEach((child) => {
        if (child && typeof child === 'object') child.parentNode = this;
      });
    },
    replaceChildren(...children) {
      this.children = [];
      children.forEach((child) => this.appendChild(child));
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent(event = {}) {
      const nextEvent = {
        ...event,
        type: event.type || '',
        stopPropagation: typeof event.stopPropagation === 'function' ? event.stopPropagation : () => {},
        preventDefault: typeof event.preventDefault === 'function' ? event.preventDefault : () => {},
      };
      (listeners.get(nextEvent.type) || []).forEach((handler) => handler(nextEvent));
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const matches = [];
      const visit = (candidate) => {
        if (!candidate || !Array.isArray(candidate.children)) return;
        candidate.children.forEach((child) => {
          if (matchesSelector(child, selector)) {
            matches.push(child);
          }
          visit(child);
        });
      };
      visit(this);
      return matches;
    },
  };

  node.classList = createClassList(node);
  Object.defineProperty(node, 'className', {
    get() {
      return this._className;
    },
    set(value) {
      this.classList.setFromString(value);
    },
  });

  let innerHtml = '';
  Object.defineProperty(node, 'innerHTML', {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value || '');
      node.children = [];
      const controlPattern = /<(input|button|select|textarea)\b([^>]*)>([\s\S]*?)<\/\1>|<(input)\b([^>]*)\/?>/gim;
      let match = controlPattern.exec(innerHtml);
      while (match) {
        const tag = match[1] || match[4];
        const attrs = match[2] || match[5] || '';
        const content = match[3] || '';
        const child = createElement(tag);
        const classMatch = attrs.match(/class="([^"]+)"/i);
        if (classMatch) child.className = classMatch[1];
        const valueMatch = attrs.match(/value="([^"]*)"/i);
        if (valueMatch) child.value = valueMatch[1];
        const rowsMatch = attrs.match(/rows="([^"]*)"/i);
        if (rowsMatch) child.rows = rowsMatch[1];
        const typeMatch = attrs.match(/type="([^"]+)"/i);
        if (typeMatch) child.type = typeMatch[1];
        child.disabled = /\bdisabled\b/i.test(attrs);
        if (tag.toLowerCase() === 'textarea') {
          child.value = content.replace(/<[^>]+>/g, '').trim();
        } else if (tag.toLowerCase() === 'button') {
          child.textContent = content.replace(/<[^>]+>/g, '').trim();
        }
        node.appendChild(child);
        match = controlPattern.exec(innerHtml);
      }
    },
  });

  return node;
}

function createTextarea(initialValue = '') {
  const node = Object.assign(Object.create(globalThis.HTMLTextAreaElement.prototype), createElement('textarea'));
  node.value = initialValue;
  return node;
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

test('fix visual flow marks sudo write blocks as risky', async () => {
  const previousDocument = globalThis.document;
  const previousEvent = globalThis.Event;
  const previousSetTimeout = globalThis.setTimeout;
  const previousHTMLTextAreaElement = globalThis.HTMLTextAreaElement;

  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.HTMLTextAreaElement = class HTMLTextAreaElement {};
  Object.defineProperty(globalThis.HTMLTextAreaElement.prototype, 'value', {
    configurable: true,
    get() {
      return this._value || '';
    },
    set(nextValue) {
      this._value = String(nextValue || '');
    },
  });

  const fixExecInput = createTextarea(JSON.stringify([
    { id: 'fix_step_1', command: 'sudo systemctl restart ros' },
    { id: 'fix_step_2', command: 'echo safe' },
  ], null, 2));
  const fixFlowDiv = createElement('div');
  const elementMap = new Map([
    ['manageFixExecuteJson', fixExecInput],
    ['manageFixVisualFlow', fixFlowDiv],
    ['manageFixAddWriteBtn', createElement('button')],
  ]);

  globalThis.document = {
    createElement: (tagName) => createElement(tagName),
    getElementById: (id) => elementMap.get(id) || null,
  };

  try {
    const { initVisualFlows } = await import('../../assets/js/components/visual-flows.js');
    initVisualFlows();

    const writeRows = fixFlowDiv.querySelectorAll('.write-block');
    assert.equal(writeRows.length, 2);

    const riskyRow = writeRows[0];
    assert.equal(riskyRow.classList.contains('flow-block-risk--sudo'), true);
    assert.equal(riskyRow.dataset.riskLevel, 'sudo');
    assert.match(normalize(riskyRow.querySelector('.flow-block-desc')?.textContent), /sudo privileges/i);
    assert.equal(normalize(riskyRow.querySelector('.flow-block-risk-badge')?.textContent), 'sudo risk');

    const safeRow = writeRows[1];
    assert.equal(safeRow.classList.contains('flow-block-risk--sudo'), false);
    assert.equal(safeRow.querySelector('.flow-block-risk-badge'), null);
  } finally {
    globalThis.document = previousDocument;
    globalThis.Event = previousEvent;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.HTMLTextAreaElement = previousHTMLTextAreaElement;
  }
});
