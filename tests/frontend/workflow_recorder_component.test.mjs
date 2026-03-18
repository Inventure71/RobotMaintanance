import test from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowRecorderComponent } from '../../assets/js/components/workflow-recorder-component.js';

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

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
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
    value: '',
    disabled: false,
    type: '',
    title: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      children.forEach((child) => this.appendChild(child));
    },
    prepend(...children) {
      this.children = [...children, ...this.children];
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
    click() {
      this.dispatchEvent({ type: 'click' });
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
          child.value = stripTags(content);
        } else if (tag.toLowerCase() === 'button') {
          child.textContent = stripTags(content);
        }
        node.appendChild(child);
        match = controlPattern.exec(innerHtml);
      }
    },
  });

  return node;
}

function withFakeDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => createElement(tagName),
  };
  try {
    return callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

function findByText(root, tagName, text) {
  return root
    .querySelectorAll(tagName)
    .find((node) => normalize(node.textContent) === normalize(text)) || null;
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function buildDefinitionWithRunAtConnection(runAtConnection) {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'ok',
    failDetails: 'fail',
    runAtConnection,
  });
  const write = recorder.addWriteBlock({
    command: 'echo battery',
    outputPayload: { stdout: 'battery ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_string',
    needle: 'battery',
  });

  return recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });
}

test('workflow recorder blocking issues use the start CTA copy', () => {
  const recorder = new WorkflowRecorderComponent({});
  const state = recorder.getState('battery_health');

  assert.equal(state.blockingIssues[0], 'Click "Start creation of new test" to start a draft.');
});

function buildRecorderWithThreeWrites() {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'ok',
    failDetails: 'fail',
  });
  const first = recorder.addWriteBlock({
    command: 'echo one',
    outputPayload: { stdout: 'one ok' },
  });
  const second = recorder.addWriteBlock({
    command: 'echo two',
    outputPayload: { stdout: 'two ok' },
  });
  const third = recorder.addWriteBlock({
    command: 'echo three',
    outputPayload: { stdout: 'three ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: second.saveAs,
    kind: 'contains_string',
    needle: 'two',
  });
  return { recorder, first, second, third };
}

test('workflow recorder emits checks with runAtConnection=true by default', () => {
  const definition = buildDefinitionWithRunAtConnection(undefined);
  assert.equal(definition.checks.length, 1);
  assert.equal(definition.checks[0].runAtConnection, true);
});

test('workflow recorder emits checks with explicit runAtConnection=false', () => {
  const definition = buildDefinitionWithRunAtConnection(false);
  assert.equal(definition.checks.length, 1);
  assert.equal(definition.checks[0].runAtConnection, false);
});

test('workflow recorder can load an existing definition back into editable outputs and blocks', () => {
  const definition = buildDefinitionWithRunAtConnection(false);
  const recorder = new WorkflowRecorderComponent({});

  const loaded = recorder.loadTestDefinition(definition);
  const state = recorder.getState(definition.id);
  const rebuilt = recorder.buildTestDefinition({
    definitionId: definition.id,
    label: definition.label,
  });

  assert.equal(loaded.outputCount, 1);
  assert.equal(state.started, true);
  assert.equal(state.writeCount, 1);
  assert.equal(state.readCount, 1);
  assert.equal(state.outputCount, 1);
  assert.equal(rebuilt.execute.length, 1);
  assert.deepEqual(rebuilt.execute[0], definition.execute[0]);
  assert.deepEqual(rebuilt.checks, definition.checks);
});

test('workflow recorder preserves multi-rule all_of checks when loading an existing definition', () => {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'ok',
    failDetails: 'fail',
  });
  const write = recorder.addWriteBlock({
    command: 'echo battery',
    outputPayload: { stdout: 'battery ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_string',
    needle: 'battery',
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_any_string',
    needles: 'ok,healthy',
  });
  const definition = recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });

  const restored = new WorkflowRecorderComponent({});
  restored.loadTestDefinition(definition);
  const restoredState = restored.getState(definition.id);
  const rebuilt = restored.buildTestDefinition({
    definitionId: definition.id,
    label: definition.label,
  });

  assert.equal(restoredState.outputCount, 1);
  assert.equal(restoredState.readCount, 2);
  assert.equal(rebuilt.checks.length, 1);
  assert.equal(rebuilt.checks[0].read.kind, 'all_of');
  assert.equal(rebuilt.checks[0].read.rules.length, 2);
});

test('workflow recorder exports draft context for prompt bundling', () => {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'Battery found',
    failDetails: 'Battery missing',
  });
  const write = recorder.addWriteBlock({
    command: 'echo battery',
    outputPayload: { stdout: 'battery ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_string',
    needle: 'battery',
  });

  const draft = recorder.exportDraftContext('battery_health');

  assert.equal(draft.started, true);
  assert.equal(draft.publishReady, true);
  assert.equal(draft.definitionId, 'battery_health');
  assert.equal(draft.outputs.length, 1);
  assert.equal(draft.outputs[0].key, 'battery');
  assert.equal(draft.execute.length, 1);
  assert.equal(draft.execute[0].command, 'echo battery');
  assert.equal(draft.checks.length, 1);
  assert.equal(draft.checks[0].checkId, 'battery_health__battery');
  assert.equal(draft.checks[0].read[0].kind, 'contains_string');
});

test('workflow recorder moves the first write down and preserves saveAs bindings', () => {
  const { recorder, first, second, third } = buildRecorderWithThreeWrites();

  const result = recorder.moveWriteBlock(first.id, 1);
  const writeRefs = recorder.getWriteRefs();
  const rebuilt = recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });

  assert.equal(result.moved, true);
  assert.deepEqual(writeRefs.map((item) => item.id), [second.id, first.id, third.id]);
  assert.deepEqual(writeRefs.map((item) => item.saveAs), [second.saveAs, first.saveAs, third.saveAs]);
  assert.deepEqual(rebuilt.execute.map((step) => step.command), ['echo two', 'echo one', 'echo three']);
  assert.equal(rebuilt.checks[0].read.inputRef, second.saveAs);
});

test('workflow recorder can move a middle write down and back up without changing its identity', () => {
  const { recorder, first, second, third } = buildRecorderWithThreeWrites();

  recorder.moveWriteBlock(second.id, 2);
  let writeRefs = recorder.getWriteRefs();
  assert.deepEqual(writeRefs.map((item) => item.id), [first.id, third.id, second.id]);

  recorder.moveWriteBlock(second.id, 1);
  writeRefs = recorder.getWriteRefs();
  const rebuilt = recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });

  assert.deepEqual(writeRefs.map((item) => item.id), [first.id, second.id, third.id]);
  assert.deepEqual(writeRefs.map((item) => item.saveAs), [first.saveAs, second.saveAs, third.saveAs]);
  assert.deepEqual(rebuilt.execute.map((step) => step.saveAs), [first.saveAs, second.saveAs, third.saveAs]);
});

test('workflow recorder can load a definition, move the last write up, and round-trip the reordered execute steps', () => {
  const { recorder } = buildRecorderWithThreeWrites();
  const definition = recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });
  const restored = new WorkflowRecorderComponent({});
  restored.loadTestDefinition(definition);

  restored.moveWriteBlock('step_3', 1);
  const rebuilt = restored.buildTestDefinition({
    definitionId: definition.id,
    label: definition.label,
  });

  assert.deepEqual(rebuilt.execute.map((step) => step.command), ['echo one', 'echo three', 'echo two']);
  assert.deepEqual(rebuilt.checks, definition.checks);
});

test('workflow recorder renders move controls only for writes and preserves write editor state after a move', () => {
  withFakeDocument(() => {
    const blocksEl = createElement('div');
    const recorder = new WorkflowRecorderComponent({ blocksEl });
    recorder.createNewTest();
    recorder.addOrUpdateOutput({
      key: 'battery',
      label: 'Battery',
      icon: 'B',
      passDetails: 'ok',
      failDetails: 'fail',
    });
    const first = recorder.addWriteBlock({
      command: 'echo one',
      outputPayload: { stdout: 'one ok' },
    });
    recorder.addWriteBlock({
      command: 'echo two',
      outputPayload: { stdout: 'two ok' },
    });
    recorder.addOrUpdateReadBlock({
      outputKey: 'battery',
      inputRef: first.saveAs,
      kind: 'contains_string',
      needle: 'one',
    });

    const sectionTitles = blocksEl.querySelectorAll('h3').map((node) => normalize(node.textContent));
    assert.deepEqual(sectionTitles, ['Execution Steps', 'Checks / Validations']);

    const writeRows = blocksEl.querySelectorAll('.write-block');
    const readRows = blocksEl.querySelectorAll('.read-block');
    assert.equal(writeRows.length, 2);
    assert.equal(readRows.length, 1);

    const firstWriteButtons = writeRows[0].children[0].querySelectorAll('button');
    assert.deepEqual(firstWriteButtons.map((button) => button.textContent), ['Move up', 'Move down', 'Edit', 'Remove']);
    assert.equal(firstWriteButtons[0].disabled, true);
    assert.equal(firstWriteButtons[1].disabled, false);

    const secondWriteButtons = writeRows[1].children[0].querySelectorAll('button');
    assert.equal(secondWriteButtons[0].disabled, false);
    assert.equal(secondWriteButtons[1].disabled, true);

    const readButtons = readRows[0].children[0].querySelectorAll('button').map((button) => button.textContent);
    assert.deepEqual(readButtons, ['Edit', 'Remove']);

    firstWriteButtons[2].click();
    assert.equal(recorder.getState().editingWriteBlockId, 'write_1');

    firstWriteButtons[1].click();

    const reorderedWriteRows = blocksEl.querySelectorAll('.write-block');
    const movedRowTitle = findByText(reorderedWriteRows[1], 'div', 'STEP 2 · WRITE echo one');
    assert.ok(movedRowTitle);
    const movedRowButtons = reorderedWriteRows[1].children[0].querySelectorAll('button');
    assert.equal(movedRowButtons[2].textContent, 'Close');
    assert.equal(recorder.getState().editingWriteBlockId, 'write_1');
  });
});

test('workflow recorder marks sudo write blocks as risky in the rendered UI', () => {
  withFakeDocument(() => {
    const blocksEl = createElement('div');
    const recorder = new WorkflowRecorderComponent({ blocksEl });
    recorder.createNewTest();
    recorder.addOrUpdateOutput({
      key: 'filesystem',
      label: 'Filesystem',
      icon: 'F',
      passDetails: 'ok',
      failDetails: 'fail',
    });
    recorder.addWriteBlock({
      command: 'sudo ls /root',
      outputPayload: { stdout: 'secret.txt' },
    });
    recorder.addWriteBlock({
      command: 'ls /tmp',
      outputPayload: { stdout: 'cache' },
    });

    const writeRows = blocksEl.querySelectorAll('.write-block');
    assert.equal(writeRows.length, 2);

    const riskyRow = writeRows[0];
    assert.equal(riskyRow.classList.contains('flow-block-risk--sudo'), true);
    assert.equal(riskyRow.dataset.riskLevel, 'sudo');
    assert.equal(riskyRow.dataset.riskyCommand, 'true');
    assert.match(normalize(riskyRow.querySelector('.flow-block-desc')?.textContent), /sudo privileges/i);

    const riskBadge = riskyRow.querySelector('.flow-block-risk-badge');
    assert.ok(riskBadge);
    assert.equal(normalize(riskBadge.textContent), 'sudo risk');

    const safeRow = writeRows[1];
    assert.equal(safeRow.classList.contains('flow-block-risk--sudo'), false);
    assert.equal(safeRow.querySelector('.flow-block-risk-badge'), null);
  });
});
