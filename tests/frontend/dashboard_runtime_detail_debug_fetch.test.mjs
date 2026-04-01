import assert from 'node:assert/strict';
import test from 'node:test';

import { createDetailTerminalDebugApi } from '../../assets/js/modules/dashboard/features/detail/domain/createDetailTerminalDebugApi.js';

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...tokens) => tokens.forEach((token) => values.add(token)),
    remove: (...tokens) => tokens.forEach((token) => values.delete(token)),
    contains: (token) => values.has(token),
  };
}

function makeNode({ classes = [] } = {}) {
  const attributes = new Map();
  const children = [];
  return {
    textContent: '',
    className: '',
    children,
    classList: makeClassList(classes),
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    replaceChildren: (...nextChildren) => {
      children.length = 0;
      children.push(...nextChildren);
    },
    setAttribute: (name, value) => {
      attributes.set(name, String(value));
    },
    getAttribute: (name) => attributes.get(name) ?? null,
  };
}

function createApi() {
  const env = {
    testDebugModal: makeNode({ classes: ['hidden'] }),
    testDebugTitle: makeNode(),
    testDebugSummary: makeNode(),
    testDebugBody: makeNode(),
    state: {},
  };
  return {
    env,
    api: createDetailTerminalDebugApi({
      DETAIL_TERMINAL_PRESET_IDS: new Set(),
      PRESET_COMMANDS: [],
      batteryReasonText: () => '',
      bugReportMessageInput: null,
      bugReportModal: null,
      bugReportStatus: null,
      buildApiUrl: (route) => `http://localhost${route}`,
      cancelBugReportButton: null,
      getDefinitionLabel: (_definitions, id) => (id === 'general' ? 'General' : id),
      getRobotBatteryState: () => ({}),
      normalizeText(value, fallback = '') {
        if (value === null || value === undefined) return String(fallback ?? '');
        const text = String(value).trim();
        return text || String(fallback ?? '');
      },
      robotId: (robot) => String(robot?.id || ''),
      setActionButtonLoading: () => {},
      setTerminalActive: () => {},
      state: env.state,
      submitBugReportButton: null,
      syncModalScrollLock: () => {},
      terminal: makeNode(),
      testDebugBody: env.testDebugBody,
      testDebugModal: env.testDebugModal,
      testDebugSummary: env.testDebugSummary,
      testDebugTitle: env.testDebugTitle,
    }),
  };
}

test('openLatestTestDebugModal fetches the latest backend snapshot before rendering', async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.document = {
    createElement: () => makeNode(),
  };
  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        result: {
          status: 'error',
          value: 'read_error',
          details: 'Parser mismatch',
          source: 'manual',
        },
        debug: {
          id: 'general',
          status: 'error',
          value: 'read_error',
          details: 'Parser mismatch',
          errorCode: 'definition_output_missing',
          source: 'executor',
          read: {
            kind: 'contains_string',
            passed: false,
            details: 'Substring not found.',
            missing: ['/scan'],
          },
          runId: 'run-99',
          startedAt: 100,
          finishedAt: 101,
          steps: [],
          session: {
            pageSessionId: 'backend-page',
          },
          timing: {
            totalMs: 87,
          },
        },
      }),
    };
  };

  try {
    const { api, env } = createApi();
    await api.openLatestTestDebugModal(
      {
        id: 'r1',
        name: 'Robot 1',
        testDefinitions: [{ id: 'general', label: 'General' }],
        tests: {
          general: {
            status: 'warning',
            value: 'unknown',
            details: 'stale',
          },
        },
        testDebug: {},
      },
      'general',
    );

    assert.equal(fetchCalls[0], 'http://localhost/api/robots/r1/tests/general/debug');
    assert.match(env.testDebugTitle.textContent, /Robot 1 • General/);
    assert.match(env.testDebugSummary.textContent, /ErrorCode: definition_output_missing/);
    assert.match(env.testDebugSummary.textContent, /CheckEval: contains_string \| fail \| Substring not found\./);
    assert.equal(env.testDebugModal.classList.contains('hidden'), false);
    assert.equal(env.testDebugModal.getAttribute('aria-hidden'), 'false');
    assert.equal(env.state.testDebugModalOpen, true);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});
