import test from 'node:test';
import assert from 'node:assert/strict';

import { RobotTerminalComponent } from '../../assets/js/components/robot-terminal-component.js';

function makeClassList() {
  const values = new Set();
  return {
    add: (...tokens) => tokens.forEach((token) => values.add(token)),
    remove: (...tokens) => tokens.forEach((token) => values.delete(token)),
    contains: (token) => values.has(token),
    toggle: (token, force) => {
      if (force === undefined) {
        if (values.has(token)) {
          values.delete(token);
          return false;
        }
        values.add(token);
        return true;
      }
      if (force) values.add(token);
      else values.delete(token);
      return force;
    },
  };
}

function makeNode() {
  return {
    children: [],
    classList: makeClassList(),
    textContent: '',
    scrollTop: 0,
    scrollHeight: 0,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelectorAll() {
      return [];
    },
  };
}

test('robot terminal component exports streamed transcript in visible order', () => {
  const component = new RobotTerminalComponent({});
  const written = [];
  component.terminal = {
    write(value) {
      written.push(value);
    },
  };

  component._writeLine('connected', 'ok');
  component._handleStreamMessage(JSON.stringify({ type: 'output', data: 'line one\nline two' }));

  assert.match(component.exportTranscript(), /connected/);
  assert.match(component.exportTranscript(), /line one\nline two/);
  assert.ok(written.length > 0);
});

test('robot terminal component captures fallback transcript output', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        className: '',
        textContent: '',
      };
    },
  };

  try {
    const terminalElement = makeNode();
    const component = new RobotTerminalComponent({ terminalElement });

    component._writeFallbackLine('fallback output', 'warn');

    assert.match(component.exportTranscript(), /fallback output/);
    assert.equal(terminalElement.children.length, 2);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('robot terminal component resets transcript on dispose', () => {
  const component = new RobotTerminalComponent({
    badgeElement: { textContent: '', classList: makeClassList() },
    hintElement: { textContent: '', classList: makeClassList() },
  });
  component.terminal = {
    dispose() {},
  };
  component._appendTranscript('before dispose');

  component.dispose();

  assert.equal(component.exportTranscript(), '');
});

test('robot terminal component emits transcript updates when output changes', () => {
  const updates = [];
  const component = new RobotTerminalComponent({
    onTranscriptChange(nextTranscript) {
      updates.push(nextTranscript);
    },
  });
  component.terminal = {
    write() {},
  };

  component._writeLine('line one', 'ok');
  component.resetTranscript();

  assert.equal(updates[0], 'line one\n');
  assert.equal(updates.at(-1), '');
});
