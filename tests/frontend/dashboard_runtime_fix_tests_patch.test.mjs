import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/runtime/createFixTestsFeatureRuntime.js',
);
const JOB_QUEUE_HELPERS_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/robotJobQueueHelpers.js',
);
const DEBUG_HELPERS_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/fixTestsDebugHelpers.js',
);
const FIX_MODE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsFixModeApi.js',
);
const AUTO_FIX_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsAutoFixApi.js',
);
const RUN_STATE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsRunStateApi.js',
);
const JOB_QUEUE_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsJobQueueApi.js',
);
const RUNTIME_PATCH_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsRuntimePatchApi.js',
);
const SELECTION_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsSelectionApi.js',
);
const ONLINE_CHECKS_API_PATH = path.resolve(
  __dirname,
  '../../assets/js/modules/dashboard/features/fix-tests/domain/createFixTestsOnlineChecksApi.js',
);

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return String(fallback ?? '');
  const text = String(value).trim();
  return text || String(fallback ?? '');
}

function createJobQueueActivityHelpers() {
  const normalizeJobSummary = (job) => {
    if (!job || typeof job !== 'object') return null;
    const id = normalizeText(job.id, '');
    if (!id) return null;
    const status = normalizeText(job.status, '').toLowerCase();
    const kind = normalizeText(job.kind, '').toLowerCase();
    const enqueuedAt = Number(job.enqueuedAt);
    const startedAt = Number(job.startedAt);
    const updatedAt = Number(job.updatedAt);
    return {
      id,
      kind: kind === 'fix' ? 'fix' : 'test',
      status,
      source: normalizeText(job.source, 'manual') || 'manual',
      label: normalizeText(job.label, id),
      enqueuedAt: Number.isFinite(enqueuedAt) && enqueuedAt > 0 ? enqueuedAt : 0,
      startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0,
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  };
  const normalizeQueuedJobs = (jobs) =>
    Array.isArray(jobs)
      ? jobs
          .map((item) => normalizeJobSummary(item))
          .filter((item) => item && normalizeText(item.status, '') === 'queued')
      : [];
  const normalizeCompletedJobSummary = (job) => {
    const normalized = normalizeJobSummary(job);
    if (!normalized) return null;
    if (!['succeeded', 'failed', 'interrupted'].includes(normalized.status)) return null;
    return {
      ...normalized,
      metadata: job?.metadata && typeof job.metadata === 'object' ? job.metadata : {},
    };
  };
  const normalizeJobQueueSnapshot = (raw) => {
    const payload = raw && typeof raw === 'object' ? raw : {};
    const activeJob = normalizeJobSummary(payload.activeJob);
    const version = Number(payload.jobQueueVersion);
    return {
      activeJob:
        activeJob && (activeJob.status === 'running' || activeJob.status === 'interrupting')
          ? activeJob
          : null,
      queuedJobs: normalizeQueuedJobs(payload.queuedJobs),
      lastCompletedJob: normalizeCompletedJobSummary(payload.lastCompletedJob),
      jobQueueVersion: Number.isFinite(version) && version > 0 ? Math.trunc(version) : 0,
    };
  };
  return {
    normalizeJobSummary,
    normalizeCompletedJobSummary,
    normalizeQueuedJobs,
    normalizeJobQueueSnapshot,
  };
}

function makeNode() {
  return {
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {},
    },
    style: {},
    children: [],
    appendChild: () => {},
    replaceChildren: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => '',
  };
}

async function loadApi() {
  const source = await fs.readFile(MODULE_PATH, 'utf8');
  let prelude = '';
  if (source.includes("import { createRobotJobsApi, createRobotJobQueueRenderer, createRobotJobQueueStore } from '../domain/robotJobQueueHelpers.js';")) {
    const queueHelpersSource = await fs.readFile(JOB_QUEUE_HELPERS_PATH, 'utf8');
    prelude += `${queueHelpersSource.replaceAll('export function ', 'function ')}\n`;
  }
  if (source.includes("import { createFixTestsDebugHelpers } from '../domain/fixTestsDebugHelpers.js';")) {
    const debugHelpersSource = await fs.readFile(DEBUG_HELPERS_PATH, 'utf8');
    prelude += `${debugHelpersSource.replace(
      'export function createFixTestsDebugHelpers',
      'function createFixTestsDebugHelpers',
    )}\n`;
  }
  if (source.includes("import { createFixTestsFixModeApi } from '../domain/createFixTestsFixModeApi.js';")) {
    const fixModeApiSource = await fs.readFile(FIX_MODE_API_PATH, 'utf8');
    prelude += `${fixModeApiSource.replace(
      'export function createFixTestsFixModeApi',
      'function createFixTestsFixModeApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsAutoFixApi } from '../domain/createFixTestsAutoFixApi.js';")) {
    const autoFixApiSource = await fs.readFile(AUTO_FIX_API_PATH, 'utf8');
    prelude += `${autoFixApiSource.replace(
      'export function createFixTestsAutoFixApi',
      'function createFixTestsAutoFixApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsRunStateApi } from '../domain/createFixTestsRunStateApi.js';")) {
    const runStateApiSource = await fs.readFile(RUN_STATE_API_PATH, 'utf8');
    prelude += `${runStateApiSource.replace(
      'export function createFixTestsRunStateApi',
      'function createFixTestsRunStateApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsJobQueueApi } from '../domain/createFixTestsJobQueueApi.js';")) {
    const jobQueueApiSource = await fs.readFile(JOB_QUEUE_API_PATH, 'utf8');
    prelude += `${jobQueueApiSource.replace(
      'export function createFixTestsJobQueueApi',
      'function createFixTestsJobQueueApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsRuntimePatchApi } from '../domain/createFixTestsRuntimePatchApi.js';")) {
    const runtimePatchApiSource = await fs.readFile(RUNTIME_PATCH_API_PATH, 'utf8');
    prelude += `${runtimePatchApiSource.replace(
      'export function createFixTestsRuntimePatchApi',
      'function createFixTestsRuntimePatchApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsSelectionApi } from '../domain/createFixTestsSelectionApi.js';")) {
    const selectionApiSource = await fs.readFile(SELECTION_API_PATH, 'utf8');
    prelude += `${selectionApiSource.replace(
      'export function createFixTestsSelectionApi',
      'function createFixTestsSelectionApi',
    )}\n`;
  }
  if (source.includes("import { createFixTestsOnlineChecksApi } from '../domain/createFixTestsOnlineChecksApi.js';")) {
    const onlineChecksApiSource = await fs.readFile(ONLINE_CHECKS_API_PATH, 'utf8');
    prelude += `${onlineChecksApiSource.replace(
      'export function createFixTestsOnlineChecksApi',
      'function createFixTestsOnlineChecksApi',
    )}\n`;
  }
  const transformed = `${prelude}${source
        .replace(
      "import { createRobotJobsApi, createRobotJobQueueRenderer, createRobotJobQueueStore } from '../domain/robotJobQueueHelpers.js';",
      '',
    )
    .replace(
      "import { createFixTestsDebugHelpers } from '../domain/fixTestsDebugHelpers.js';",
      '',
    )
    .replace(
      "import { createFixTestsFixModeApi } from '../domain/createFixTestsFixModeApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsAutoFixApi } from '../domain/createFixTestsAutoFixApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsRunStateApi } from '../domain/createFixTestsRunStateApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsJobQueueApi } from '../domain/createFixTestsJobQueueApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsRuntimePatchApi } from '../domain/createFixTestsRuntimePatchApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsSelectionApi } from '../domain/createFixTestsSelectionApi.js';",
      '',
    )
    .replace(
      "import { createFixTestsOnlineChecksApi } from '../domain/createFixTestsOnlineChecksApi.js';",
      '',
    )
    .replace(
      'export function createFixTestsFeature',
      'function createFixTestsFeature',
    )}\nmodule.exports = { createFixTestsFeature };\n`;
  const context = {
    console,
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(transformed, context, { filename: MODULE_PATH });
  return context.module.exports.createFixTestsFeature;
}

function makeEnv(state) {
  const env = {
    FIX_MODE_CONTEXT_DASHBOARD: 'dashboard',
    FIX_MODE_CONTEXT_DETAIL: 'detail',
    JOB_QUEUE_ACTIVITY: createJobQueueActivityHelpers(),
    normalizeText,
    normalizeTypeId: (value) => normalizeText(value, '').toLowerCase(),
    state,
  };
  return new Proxy(env, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return makeNode();
    },
  });
}

function makeRuntime(state) {
  const normalizeTags = (raw, ownerDefault = false) => {
    const list = Array.isArray(raw) ? raw : [];
    const out = [];
    const seen = new Set();
    list.forEach((item) => {
      const normalized = normalizeText(item, '').toLowerCase();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      out.push(normalized);
    });
    if (ownerDefault && !out.length) return ['global'];
    return out;
  };
  const runtime = {
    getRobotById: (id) => state.robots.find((robot) => normalizeText(robot?.id, '') === normalizeText(id, '')) || null,
    getAutoFixesForType: (typeId) => {
      const key = normalizeText(typeId, '');
      return Array.isArray(state.autoFixesByType?.[key]) ? state.autoFixesByType[key] : [];
    },
    getDefinitionTagMeta: (definition = {}, fallback = {}) => ({
      ownerTags: normalizeTags(definition?.ownerTags ?? fallback?.ownerTags, true),
      platformTags: normalizeTags(definition?.platformTags ?? fallback?.platformTags, false),
    }),
    matchesDefinitionFilters: (definition = {}, fallback = {}) => {
      const ownerTags = normalizeTags(definition?.ownerTags ?? fallback?.ownerTags, true);
      const platformTags = normalizeTags(definition?.platformTags ?? fallback?.platformTags, false);
      const ownerFilter = normalizeTags(state?.filter?.ownerTags, false);
      const platformFilter = normalizeTags(state?.filter?.platformTags, false);
      const effectiveOwnerFilter = ownerFilter.length ? Array.from(new Set([...ownerFilter, 'global'])) : ownerFilter;
      const ownerOk = effectiveOwnerFilter.length === 0 || effectiveOwnerFilter.some((tag) => ownerTags.includes(tag));
      const platformOk = platformFilter.length === 0 || platformFilter.some((tag) => platformTags.includes(tag));
      return ownerOk && platformOk;
    },
    normalizeOwnerTags: (raw) => normalizeTags(raw, true),
    normalizePlatformTags: (raw) => normalizeTags(raw, false),
    renderDashboard: () => {
      state.renderDashboardCalls = (state.renderDashboardCalls || 0) + 1;
    },
    appendTerminalLine: (message, tone) => {
      state.terminalLines = state.terminalLines || [];
      state.terminalLines.push({ message, tone });
    },
    robotId: (robot) => normalizeText(robot?.id ?? robot, ''),
  };
  return new Proxy(runtime, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      return () => {};
    },
  });
}

test('applyRuntimeRobotPatches rerenders the grouped dashboard when runtime robots change', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    detailRobotId: '',
    renderDashboardCalls: 0,
    robots: [
      { id: 'carrier-1' },
      { id: 'inspector-1' },
    ],
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  api.applyRuntimeRobotPatches(new Set(['carrier-1']));

  assert.equal(state.renderDashboardCalls, 1);
});

test('applyRuntimeRobotPatches ignores empty runtime updates', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    detailRobotId: '',
    renderDashboardCalls: 0,
    robots: [{ id: 'carrier-1' }],
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  api.applyRuntimeRobotPatches(new Set());

  assert.equal(state.renderDashboardCalls, 0);
});

test('applyRuntimeRobotPatches reports terminal completion from lastCompletedJob', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    detailRobotId: '',
    renderDashboardCalls: 0,
    robots: [
      {
        id: 'carrier-1',
        name: 'Carrier 1',
        activity: {
          lastCompletedJob: {
            id: 'job-9',
            kind: 'fix',
            status: 'failed',
            source: 'manual',
            label: 'Run fix Flash',
            enqueuedAt: 1,
            startedAt: 2,
            updatedAt: 3,
            metadata: { error: 'step failed' },
          },
        },
      },
    ],
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  api.applyRuntimeRobotPatches(new Set(['carrier-1']));

  assert.equal(state.renderDashboardCalls, 1);
  assert.equal(state.terminalLines.length, 1);
  assert.match(state.terminalLines[0].message, /failed on Carrier 1: step failed/);
  api.applyRuntimeRobotPatches(new Set(['carrier-1']));
  assert.equal(state.terminalLines.length, 1);
});

test('getDashboardFixCandidates filters fixes by owner and platform tags', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    autoFixesByType: {
      rosbot: [
        { id: 'fix_1', label: 'Fix 1', description: '', ownerTags: ['alice'], platformTags: ['ros2'] },
        { id: 'fix_2', label: 'Fix 2', description: '', ownerTags: ['bob'], platformTags: ['ros2'] },
        { id: 'fix_3', label: 'Fix 3', description: '', ownerTags: ['alice'], platformTags: ['ros1'] },
      ],
    },
    detailRobotId: '',
    filter: {
      ownerTags: ['alice'],
      platformTags: ['ros2'],
    },
    robots: [{ id: 'r-1', type: 'Rosbot', typeId: 'rosbot' }],
    selectedRobotIds: new Set(['r-1']),
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  const payload = api.getDashboardFixCandidates();

  assert.equal(payload.selectedCount, 1);
  assert.equal(payload.mixedTypes, false);
  assert.equal(payload.candidates.length, 1);
  assert.equal(payload.candidates[0].id, 'fix_1');
});

test('getDashboardFixCandidates keeps global fixes when filtering by a user owner tag', async () => {
  const createFixTestsFeature = await loadApi();
  const state = {
    autoFixesByType: {
      rosbot: [
        { id: 'fix_global', label: 'Fix Global', description: '', ownerTags: ['global'], platformTags: ['ros2'] },
        { id: 'fix_alice', label: 'Fix Alice', description: '', ownerTags: ['alice'], platformTags: ['ros2'] },
        { id: 'fix_bob', label: 'Fix Bob', description: '', ownerTags: ['bob'], platformTags: ['ros2'] },
      ],
    },
    detailRobotId: '',
    filter: {
      ownerTags: ['alice'],
      platformTags: ['ros2'],
    },
    robots: [{ id: 'r-1', type: 'Rosbot', typeId: 'rosbot' }],
    selectedRobotIds: new Set(['r-1']),
  };
  const env = makeEnv(state);
  const runtime = makeRuntime(state);
  const api = createFixTestsFeature(runtime, env);

  const payload = api.getDashboardFixCandidates();
  const ids = payload.candidates.map((entry) => entry.id).sort().join(',');

  assert.equal(ids, 'fix_alice,fix_global');
});
