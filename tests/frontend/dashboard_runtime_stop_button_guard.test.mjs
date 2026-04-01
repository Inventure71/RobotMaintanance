import assert from 'node:assert/strict';
import test from 'node:test';

import { createDetailTestAndRenderApi } from '../../assets/js/modules/dashboard/features/detail/domain/createDetailTestAndRenderApi.js';
import { createFixTestsRuntimePatchApi } from '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsRuntimePatchApi.js';

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function createMockButton(robotId = 'r1', label = 'Stop') {
  return {
    disabled: false,
    textContent: label,
    _handlers: new Map(),
    addEventListener(type, handler) {
      this._handlers.set(type, handler);
    },
    getAttribute(name) {
      if (name === 'data-robot-id') return robotId;
      return '';
    },
  };
}

function createMockStatusBar(stopButton) {
  return {
    innerHTML: '',
    insertAdjacentHTML() {},
    querySelector(selector) {
      if (selector === '[data-action="stop-current-job"]') {
        return stopButton;
      }
      return null;
    },
  };
}

function createMockElement() {
  return {
    innerHTML: '',
    className: '',
    children: [],
    style: {},
    textContent: '',
    title: '',
    setAttribute() {},
    appendChild(node) {
      this.children.push(node);
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
    querySelector() {
      return null;
    },
    insertAdjacentHTML() {},
  };
}

test('detail render stop click sets local Stopping guard immediately', async () => {
  const stopButton = createMockButton('r1');
  const statusBar = createMockStatusBar(stopButton);
  const model = createMockElement();
  const testList = createMockElement();
  const titleBar = createMockElement();
  const matrixHeaderBar = createMockElement();
  const nodeById = new Map([
    ['#detailModel', model],
    ['#testList', testList],
    ['#detailTitleBar', titleBar],
    ['#detailStatusBar', statusBar],
    ['#detailMatrixHeaderBar', matrixHeaderBar],
  ]);

  let resolveStop;
  const stopPromise = new Promise((resolve) => {
    resolveStop = resolve;
  });
  let stopCalls = 0;

  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return createMockElement();
    },
  };

  try {
    const api = createDetailTestAndRenderApi({
      $: (selector) => nodeById.get(selector) ?? null,
      FIX_MODE_CONTEXT_DETAIL: 'detail',
      POST_CONNECT_TEST_DELAY_MS: 0,
      appendTerminalLine: () => {},
      buildConnectionCornerIconMarkup: () => '',
      buildLastFullTestPillLabel: () => 'Full test: n/a',
      buildRobotModelContainer: () => '<div class="robot-3d"></div>',
      buildScanOverlayMarkup: () => '',
      buildTestPreviewTextForResult: () => '',
      closeTerminalSession: () => {},
      detailMatchesDefinitionFilters: () => true,
      detail: createMockElement(),
      estimateTestCountdownMsFromBody: () => 0,
      getConfiguredDefaultTestIds: () => [],
      getFleetParallelism: () => 1,
      getOnlineCheckCountdownMs: () => 0,
      getRobotById: () => null,
      getRobotIdsForRun: () => [],
      getRobotBatteryState: () => ({ value: 'n/a', status: 'warning' }),
      getTestIconPresentation: () => ({ className: '', value: '' }),
      getTestingCountdownText: () => '',
      hasMixedRobotTypesForIds: () => false,
      hydrateActionButtons: () => {},
      invalidateCountdownNodeCache: () => {},
      isRobotFixing: () => false,
      isRobotSearching: () => false,
      isRobotTesting: () => false,
      mapRobots: () => {},
      nonBatteryTestEntries: () => [],
      normalizeStatus: (value) => normalizeText(value, 'warning').toLowerCase(),
      normalizeText,
      openTestDebugModal: () => {},
      renderBatteryPill: () => '<span>Battery</span>',
      renderDashboard: () => {},
      renderDefinitionOwnerInline: () => '',
      renderFixModeActionsForContext: () => {},
      renderRobotJobQueueStrip: () => '<span>Queue empty</span>',
      renderRobotStopCurrentJobButton: () => '<button data-action="stop-current-job" data-robot-id="r1">Stop</button>',
      robotId: (robot) => normalizeText(robot?.id ?? robot, ''),
      runOneRobotOnlineCheck: async () => {},
      runRobotTestsForRobot: async () => {},
      runtime: {},
      setRobotSearching: () => {},
      setRobotTesting: () => {},
      setRunningButtonState: () => {},
      setTerminalActive: () => {},
      setTerminalInactive: () => {},
      shouldUseCompactAutoSearchIndicator: () => false,
      state: {
        activeTerminalRobotId: '',
        isTestRunInProgress: false,
        fixModeOpen: { detail: false },
        robots: [],
        detailRobotId: 'r1',
      },
      statusChip: () => '<span>Status</span>',
      statusFromScore: () => 'warning',
      stopCurrentJob: async () => {
        stopCalls += 1;
        return stopPromise;
      },
      syncFixModePanels: () => {},
      syncModelViewerRotationForContainer: () => {},
      terminal: null,
      updateOnlineCheckEstimateFromResults: () => {},
      window: globalThis,
    });

    api.renderDetail({
      id: 'r1',
      name: 'AGAMEMNON',
      type: 'Rosbot',
      activity: { activeJob: { status: 'running' }, queuedJobs: [] },
      tests: {},
      testDefinitions: [],
    });

    const clickHandler = stopButton._handlers.get('click');
    assert.equal(typeof clickHandler, 'function');

    const pending = clickHandler({
      preventDefault() {},
      stopPropagation() {},
    });

    assert.equal(stopCalls, 1);
    assert.equal(stopButton.disabled, true);
    assert.equal(stopButton.textContent, 'Stopping...');

    resolveStop({ status: 202 });
    await pending;
  } finally {
    globalThis.document = previousDocument;
  }
});

test('detail runtime patch stop click sets local Stopping guard immediately', async () => {
  const stopButton = createMockButton('r1');
  const statusBar = createMockStatusBar(stopButton);
  const matrixHeaderBar = createMockElement();
  const testList = createMockElement();
  const modelHost = createMockElement();
  const nodeById = new Map([
    ['#detailStatusBar', statusBar],
    ['#detailMatrixHeaderBar', matrixHeaderBar],
    ['#testList', testList],
    ['#detailModel', modelHost],
  ]);

  let resolveStop;
  const stopPromise = new Promise((resolve) => {
    resolveStop = resolve;
  });
  let stopCalls = 0;

  const api = createFixTestsRuntimePatchApi({
    $: (selector) => nodeById.get(selector) ?? null,
    detail: { classList: { contains: (name) => name === 'active' } },
    state: { detailRobotId: 'r1', robots: [] },
    appendTerminalLine: () => {},
    stopCurrentJob: async () => {
      stopCalls += 1;
      return stopPromise;
    },
    normalizeStatus: (value) => normalizeText(value, 'warning').toLowerCase(),
    normalizeText,
    patchDashboardForChangedRobots: () => true,
    renderDashboard: () => {},
    getRobotById: () => null,
    robotId: (robot) => normalizeText(robot?.id ?? robot, ''),
    nonBatteryTestEntries: () => [],
    statusFromScore: () => 'warning',
    isRobotTesting: () => false,
    isRobotSearching: () => false,
    isRobotFixing: () => false,
    shouldUseCompactAutoSearchIndicator: () => false,
    getTestingCountdownText: () => '',
    getRobotBatteryState: () => ({ value: 'n/a', status: 'warning' }),
    issueSummary: () => [],
    getStatusChipTone: () => ({ css: 'warn', text: 'warning' }),
    renderRobotJobQueueStrip: () => '<span>Queue empty</span>',
    renderRobotStopCurrentJobButton: () => '<button data-action="stop-current-job" data-robot-id="r1">Stop</button>',
    renderBatteryPill: () => '<span>Battery</span>',
    buildLastFullTestPillLabel: () => 'Full test: n/a',
    syncModelViewerRotationForContainer: () => {},
    buildConnectionCornerIconMarkup: () => '',
    buildScanOverlayMarkup: () => '',
    invalidateCountdownNodeCache: () => {},
    buildTestPreviewTextForResult: () => '',
    statusChip: () => '<span>Status</span>',
    setActionButtonLoading: () => {},
    updateFleetOnlineRefreshStatus: () => {},
  });

  api.patchDetailRuntimeContent({
    id: 'r1',
    name: 'AGAMEMNON',
    type: 'Rosbot',
    activity: { activeJob: { status: 'running' }, queuedJobs: [] },
    tests: {},
  });

  const clickHandler = stopButton._handlers.get('click');
  assert.equal(typeof clickHandler, 'function');

  const pending = clickHandler({
    preventDefault() {},
    stopPropagation() {},
  });

  assert.equal(stopCalls, 1);
  assert.equal(stopButton.disabled, true);
  assert.equal(stopButton.textContent, 'Stopping...');

  resolveStop({ status: 202 });
  await pending;
});
