import { RobotTerminalComponent } from '../../components/robot-terminal-component.js';
import { WorkflowRecorderComponent } from '../../components/workflow-recorder-component.js';
import { renderBatteryPill } from '../../components/battery-pill-component.js';
import { initVisualFlows } from '../../components/visual-flows.js';
import {
  applyActionButton,
  createActionButton,
  hydrateActionButtons,
  setActionButtonLoading,
} from '../../components/action-button-component.js';
import { initThemeSwitcher } from '../../components/theme-switcher-component.js';
import {
  DEFAULT_TEST_DEFINITIONS,
  PRESET_COMMANDS,
  ROBOTS_CONFIG_URL,
  ROBOT_TYPES_CONFIG_URL,
  DEFAULT_ROBOT_MODEL_URL,
  backendData,
} from '../../config/app-defaults.js';
import { normalizeStatus, normalizeText, normalizeTypeId } from '../../lib/normalize.js';
import { $, $$ } from '../../lib/dom.js';
import { buildApiUrl, createPageSessionId } from './api/client.js';

let TEST_DEFINITIONS = [...DEFAULT_TEST_DEFINITIONS];
let ROBOT_TYPES = [];
let ROBOT_TYPE_BY_ID = new Map();

    const CAN_USE_MODEL_VIEWER = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl =
          probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
        return !!gl;
      } catch (_error) {
        return false;
      }
    })();
    const ONLINE_CHECK_TIMEOUT_MS = 3_000;
    const ONLINE_CHECK_UI_BUFFER_MS = 800;
    const ONLINE_CHECK_UI_MIN_MS = 2_000;
    const ONLINE_CHECK_UI_MAX_MS = 12_000;
    const ONLINE_CHECK_ESTIMATE_ALPHA = 0.35;
    const FLEET_PARALLELISM_MIN = 1;
    const FLEET_PARALLELISM_MAX = 100;
    const FLEET_PARALLELISM_DEFAULT = 8;
    const FLEET_PARALLELISM_STORAGE_KEY = 'fleetParallelism';
    const RUNTIME_SYNC_INTERVAL_MS = 1000;
    const RUNTIME_ALLOWED_SOURCES = new Set(['manual', 'live', 'auto-monitor', 'auto-monitor-topics']);
    const MONITOR_TOPICS_SOURCE = 'auto-monitor-topics';
    const MONITOR_SOURCE = 'auto-monitor';
    const MONITOR_MODE_ONLINE_BATTERY = 'online_battery';
    const MONITOR_MODE_ONLINE_BATTERY_TOPICS = 'online_battery_topics';
    const MONITOR_ONLINE_INTERVAL_DEFAULT_SEC = 2.0;
    const MONITOR_ONLINE_INTERVAL_MIN_SEC = 0.5;
    const MONITOR_ONLINE_INTERVAL_MAX_SEC = 60.0;
    const MONITOR_BATTERY_INTERVAL_DEFAULT_SEC = 2.0;
    const MONITOR_BATTERY_INTERVAL_MIN_SEC = 0.5;
    const MONITOR_BATTERY_INTERVAL_MAX_SEC = 60.0;
    const MONITOR_TOPICS_INTERVAL_DEFAULT_SEC = 30;
    const MONITOR_TOPICS_INTERVAL_MIN_SEC = 5;
    const MONITOR_TOPICS_INTERVAL_MAX_SEC = 300;
    const DETAIL_TERMINAL_PRESET_IDS = new Set(['restart-docker']);
    const TEST_STEP_TIMEOUT_MS = 12_000;
    const TEST_COUNTDOWN_TICK_MS = 1000;
    const TEST_COUNTDOWN_MIN_SECONDS = 3;
    const TEST_COUNTDOWN_MAX_SECONDS = 60;
    const TEST_COUNTDOWN_WARNING_TEXT = {
      scanning: 'Scan timing out',
      finding: 'Find timing out',
      fixing: 'Fix timing out',
    };
    const TEST_COUNTDOWN_MODE_LABELS = {
      scanning: 'Scanning',
      finding: 'Finding',
      fixing: 'Fixing',
    };
    const FIX_MODE_CONTEXT_DASHBOARD = 'dashboard';
    const FIX_MODE_CONTEXT_DETAIL = 'detail';
    const FIX_JOB_POLL_INTERVAL_MS = 1000;
    const MODAL_SCROLL_LOCK_CLASS = 'modal-scroll-lock';
    const MANAGE_VIEW_HASH = 'manage-robots';
    const MANAGE_TABS = ['robots', 'tests', 'fixes', 'recorder'];
    const MANAGE_TAB_STORAGE_KEY = 'dashboard.manageTab';
    const FORCE_TEXT_TEST_ICONS = (() => {
      try {
        const platformHints = [
          normalizeText(window?.navigator?.platform, ''),
          normalizeText(window?.navigator?.userAgent, ''),
          normalizeText(window?.navigator?.userAgentData?.platform, ''),
        ]
          .join(' ')
          .toLowerCase();
        return platformHints.includes('linux');
      } catch (_error) {
        return false;
      }
    })();
    const TEST_ICON_TEXT_FALLBACKS = Object.freeze({
      online: 'NET',
      general: 'GEN',
      movement: 'MOV',
      battery: 'BAT',
      lidar: 'LID',
      proximity: 'PRX',
      camera: 'CAM',
    });
    const LOW_BATTERY_WARNING_PERCENT = 30;
    const ONLINE_SORT_BATTERY = 'battery';
    const ONLINE_SORT_NAME = 'name';
    const ONLINE_SORT_STATUS = 'status';
    const ONLINE_SORT_ORDER = [ONLINE_SORT_BATTERY, ONLINE_SORT_NAME, ONLINE_SORT_STATUS];
    const ONLINE_SORT_LABELS = {
      [ONLINE_SORT_BATTERY]: 'Battery',
      [ONLINE_SORT_NAME]: 'Name',
      [ONLINE_SORT_STATUS]: 'Status',
    };

    function clampOnlineCountdownMs(valueMs) {
      const numeric = Number.isFinite(valueMs) ? valueMs : ONLINE_CHECK_TIMEOUT_MS;
      return Math.max(ONLINE_CHECK_UI_MIN_MS, Math.min(numeric, ONLINE_CHECK_UI_MAX_MS));
    }

    function getOnlineCheckCountdownMs() {
      const baseMs = Math.max(ONLINE_CHECK_TIMEOUT_MS, state.onlineCheckEstimateMs || ONLINE_CHECK_TIMEOUT_MS);
      return clampOnlineCountdownMs(baseMs + ONLINE_CHECK_UI_BUFFER_MS);
    }

    function updateOnlineCheckEstimateFromResults(results) {
      const list = Array.isArray(results) ? results : [];
      const observedMaxMs = list.reduce((maxMs, entry) => {
        const numericMs = Number(entry?.ms);
        if (!Number.isFinite(numericMs) || numericMs <= 0) return maxMs;
        return Math.max(maxMs, numericMs);
      }, 0);
      if (!observedMaxMs) return;

      const prevMs = Number.isFinite(state.onlineCheckEstimateMs) ? state.onlineCheckEstimateMs : ONLINE_CHECK_TIMEOUT_MS;
      const nextMs =
        prevMs * (1 - ONLINE_CHECK_ESTIMATE_ALPHA) + observedMaxMs * ONLINE_CHECK_ESTIMATE_ALPHA;
      state.onlineCheckEstimateMs = clampOnlineCountdownMs(nextMs);
    }

    function clampFleetParallelism(value) {
      const numeric = Number.isFinite(Number(value)) ? Math.round(Number(value)) : FLEET_PARALLELISM_DEFAULT;
      return Math.max(FLEET_PARALLELISM_MIN, Math.min(numeric, FLEET_PARALLELISM_MAX));
    }

    function getFleetParallelism() {
      return clampFleetParallelism(state.fleetParallelism);
    }

    function syncFleetParallelismUi() {
      const slider = $('#fleetParallelism');
      const valueLabel = $('#fleetParallelismValue');
      const value = getFleetParallelism();
      if (slider) {
        slider.value = String(value);
      }
      if (valueLabel) {
        valueLabel.textContent = String(value);
      }
    }

    function setFleetParallelism(value, persist = false) {
      state.fleetParallelism = clampFleetParallelism(value);
      syncFleetParallelismUi();
      scheduleMonitorParallelismSync();
      if (!persist) return;
      try {
        window.localStorage.setItem(FLEET_PARALLELISM_STORAGE_KEY, String(state.fleetParallelism));
      } catch (_error) {
        // Best effort persistence.
      }
    }

    function initFleetParallelism() {
      let initialValue = FLEET_PARALLELISM_DEFAULT;
      try {
        const stored = window.localStorage.getItem(FLEET_PARALLELISM_STORAGE_KEY);
        if (stored != null) {
          initialValue = clampFleetParallelism(stored);
        }
      } catch (_error) {
        initialValue = FLEET_PARALLELISM_DEFAULT;
      }
      setFleetParallelism(initialValue);

      const slider = $('#fleetParallelism');
      if (!slider) return;
      slider.addEventListener('input', () => {
        setFleetParallelism(slider.value);
      });
      slider.addEventListener('change', () => {
        setFleetParallelism(slider.value, true);
      });
    }

    function clampMonitorTopicsInterval(value) {
      const numeric = Number.isFinite(Number(value))
        ? Math.round(Number(value))
        : MONITOR_TOPICS_INTERVAL_DEFAULT_SEC;
      return Math.max(
        MONITOR_TOPICS_INTERVAL_MIN_SEC,
        Math.min(numeric, MONITOR_TOPICS_INTERVAL_MAX_SEC),
      );
    }

    function clampMonitorBatteryInterval(value) {
      const numeric = Number.isFinite(Number(value)) ? Number(value) : MONITOR_BATTERY_INTERVAL_DEFAULT_SEC;
      return Math.max(
        MONITOR_BATTERY_INTERVAL_MIN_SEC,
        Math.min(numeric, MONITOR_BATTERY_INTERVAL_MAX_SEC),
      );
    }

    function clampMonitorOnlineInterval(value) {
      const numeric = Number.isFinite(Number(value)) ? Number(value) : MONITOR_ONLINE_INTERVAL_DEFAULT_SEC;
      return Math.max(
        MONITOR_ONLINE_INTERVAL_MIN_SEC,
        Math.min(numeric, MONITOR_ONLINE_INTERVAL_MAX_SEC),
      );
    }

    function isTopicsMonitorMode(mode) {
      return normalizeText(mode, '') === MONITOR_MODE_ONLINE_BATTERY_TOPICS;
    }

    function setMonitorConfigStatus(message = '', tone = '') {
      if (!monitorConfigStatus) return;
      monitorConfigStatus.textContent = message;
      monitorConfigStatus.classList.remove('ok', 'warn', 'error');
      if (tone) {
        monitorConfigStatus.classList.add(tone);
      }
    }

    function syncMonitorConfigUi() {
      if (monitorModeSelect) {
        monitorModeSelect.value = state.monitorMode;
      }
      if (monitorTopicsIntervalInput) {
        monitorTopicsIntervalInput.value = String(state.monitorTopicsIntervalSec);
        monitorTopicsIntervalInput.disabled = !isTopicsMonitorMode(state.monitorMode);
      }
      if (monitorApplyButton) {
        applyActionButton(monitorApplyButton, {
          intent: 'monitor',
          compact: true,
          disabled: state.isMonitorConfigApplyInFlight,
          label: state.isMonitorConfigApplyInFlight ? 'Applying...' : 'Apply',
        });
      }
    }

    function applyMonitorConfigFromPayload(payload) {
      const mode = normalizeText(payload?.mode, MONITOR_MODE_ONLINE_BATTERY);
      state.monitorMode =
        mode === MONITOR_MODE_ONLINE_BATTERY_TOPICS
          ? MONITOR_MODE_ONLINE_BATTERY_TOPICS
          : MONITOR_MODE_ONLINE_BATTERY;
      state.monitorOnlineIntervalSec = clampMonitorOnlineInterval(payload?.onlineIntervalSec);
      state.monitorBatteryIntervalSec = clampMonitorBatteryInterval(payload?.batteryIntervalSec);
      state.monitorTopicsIntervalSec = clampMonitorTopicsInterval(payload?.topicsIntervalSec);
      state.monitorParallelism = clampFleetParallelism(payload?.parallelism);
      syncAutoMonitorRefreshState();
      syncMonitorConfigUi();
    }

    async function loadMonitorConfig() {
      try {
        const response = await fetch(buildApiUrl('/api/monitor/config'));
        if (!response.ok) throw new Error('Monitor config unavailable');
        const payload = await response.json();
        applyMonitorConfigFromPayload(payload);
      } catch (_error) {
        syncMonitorConfigUi();
      }
      syncAutoMonitorRefreshState();
      startOnlineRefreshStatusTimer();
      scheduleMonitorParallelismSync();
    }

    async function applyMonitorConfig() {
      if (state.isMonitorConfigApplyInFlight) return;
      state.isMonitorConfigApplyInFlight = true;
      syncMonitorConfigUi();
      setMonitorConfigStatus('Applying monitor config...', 'warn');
      try {
        const response = await fetch(buildApiUrl('/api/monitor/config'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: state.monitorMode,
            batteryIntervalSec: clampMonitorBatteryInterval(state.monitorBatteryIntervalSec),
            topicsIntervalSec: clampMonitorTopicsInterval(state.monitorTopicsIntervalSec),
            parallelism: getFleetParallelism(),
          }),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Unable to apply monitor config');
        }
        const payload = await response.json();
        applyMonitorConfigFromPayload(payload);
        setMonitorConfigStatus('Monitor config saved.', 'ok');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMonitorConfigStatus(`Monitor config update failed: ${message}`, 'error');
      } finally {
        state.isMonitorConfigApplyInFlight = false;
        syncMonitorConfigUi();
      }
    }

    function initMonitorConfigControls() {
      if (!monitorModeSelect || !monitorTopicsIntervalInput || !monitorApplyButton) return;

      monitorModeSelect.addEventListener('change', () => {
        state.monitorMode = isTopicsMonitorMode(monitorModeSelect.value)
          ? MONITOR_MODE_ONLINE_BATTERY_TOPICS
          : MONITOR_MODE_ONLINE_BATTERY;
        syncMonitorConfigUi();
      });

      monitorTopicsIntervalInput.addEventListener('input', () => {
        state.monitorTopicsIntervalSec = clampMonitorTopicsInterval(monitorTopicsIntervalInput.value);
      });

      monitorApplyButton.addEventListener('click', () => {
        applyMonitorConfig();
      });

      syncMonitorConfigUi();
      loadMonitorConfig();
    }

    function initThemeControls() {
      initThemeSwitcher({
        selectElement: themeSelect,
        rootElement: document.documentElement,
        defaultThemeId: 'deep-space',
      });
    }

    function scheduleMonitorParallelismSync() {
      if (state.monitorParallelismSyncTimer) {
        window.clearTimeout(state.monitorParallelismSyncTimer);
      }
      state.monitorParallelismSyncTimer = window.setTimeout(() => {
        state.monitorParallelismSyncTimer = null;
        syncMonitorParallelismWithFleet();
      }, 150);
    }

    async function syncMonitorParallelismWithFleet() {
      const targetParallelism = getFleetParallelism();
      if (state.monitorParallelismSyncInFlight) {
        state.monitorParallelismPendingValue = targetParallelism;
        return;
      }
      if (state.monitorParallelism === targetParallelism) return;

      state.monitorParallelismSyncInFlight = true;
      try {
        let nextTarget = targetParallelism;
        while (Number.isFinite(nextTarget)) {
          const response = await fetch(buildApiUrl('/api/monitor/config'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parallelism: clampFleetParallelism(nextTarget),
            }),
          });
          if (!response.ok) {
            break;
          }
          const payload = await response.json();
          applyMonitorConfigFromPayload(payload);
          const pending = state.monitorParallelismPendingValue;
          state.monitorParallelismPendingValue = null;
          if (pending === null || pending === undefined) {
            break;
          }
          const clampedPending = clampFleetParallelism(pending);
          if (clampedPending === state.monitorParallelism) {
            break;
          }
          nextTarget = clampedPending;
        }
      } catch (_error) {
        // Best effort sync; next slider interaction will retry.
      } finally {
        state.monitorParallelismSyncInFlight = false;
      }
    }

    function normalizePossibleResult(raw) {
      if (!raw || typeof raw !== 'object') return null;
      return {
        status: normalizeStatus(raw.status),
        value: normalizeText(raw.value, 'n/a'),
        details: normalizeText(raw.details, 'No detail available'),
      };
    }

    function normalizeTestDefinition(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const id = normalizeText(raw.id, '');
      if (!id) return null;

      const possibleResults = Array.isArray(raw.possibleResults)
        ? raw.possibleResults.map(normalizePossibleResult).filter(Boolean)
        : [];
      const fallback = possibleResults[0] || { status: 'warning', value: 'n/a', details: 'Awaiting check result' };

      return {
        id,
        label: normalizeText(raw.label, id),
        icon: normalizeText(raw.icon, '⚙️'),
        okText: normalizeText(raw.okText, 'Healthy'),
        failText: normalizeText(raw.failText, 'Needs attention'),
        possibleResults,
        defaultStatus: normalizeStatus(raw.defaultStatus),
        defaultValue: normalizeText(raw.defaultValue, fallback.value),
        defaultDetails: normalizeText(raw.defaultDetails, fallback.details),
      };
    }

    function normalizeAutoFixDefinition(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const id = normalizeText(raw.id, '');
      if (!id) return null;

      const postTestIds = Array.isArray(raw.postTestIds)
        ? raw.postTestIds.map((item) => normalizeText(item, '')).filter(Boolean)
        : [];

      return {
        id,
        label: normalizeText(raw.label, id),
        description: normalizeText(raw.description, ''),
        postTestIds,
      };
    }

    function normalizeRobotActivity(raw) {
      if (!raw || typeof raw !== 'object') {
        return {
          searching: false,
          testing: false,
          phase: null,
          lastFullTestAt: 0,
          lastFullTestSource: null,
          updatedAt: 0,
        };
      }
      const phase = normalizeText(raw.phase, '');
      const updatedAt = Number(raw.updatedAt);
      const lastFullTestAt = Number(raw.lastFullTestAt);
      const lastFullTestSource = normalizeText(raw.lastFullTestSource, '');
      return {
        searching: Boolean(raw.searching),
        testing: Boolean(raw.testing),
        phase: phase || null,
        lastFullTestAt: Number.isFinite(lastFullTestAt) && lastFullTestAt > 0 ? lastFullTestAt : 0,
        lastFullTestSource: lastFullTestSource || null,
        updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
      };
    }

    function normalizeRobotTypeConfig(payload) {
      const list = Array.isArray(payload?.robotTypes)
        ? payload.robotTypes
        : Array.isArray(payload)
          ? payload
          : [];

      return list
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const typeId = normalizeText(entry.typeId, normalizeText(entry.id, normalizeText(entry.name, '')));
          if (!typeId) return null;

          const tests = Array.isArray(entry.tests)
            ? entry.tests.map(normalizeTestDefinition).filter(Boolean)
            : [];
          const autoFixes = Array.isArray(entry.autoFixes)
            ? entry.autoFixes.map(normalizeAutoFixDefinition).filter(Boolean)
            : [];

          const topics = Array.isArray(entry.topics)
            ? entry.topics.map((topic) => normalizeText(topic, '')).filter(Boolean)
            : [];

          return {
            typeId,
            typeKey: normalizeTypeId(typeId),
            label: normalizeText(entry.label, normalizeText(entry.name, typeId)),
            topics,
            tests,
            autoFixes,
          };
        })
        .filter(Boolean);
    }

    function buildGlobalTestDefinitions(robotTypes) {
      const definitions = new Map();
      DEFAULT_TEST_DEFINITIONS.forEach((def) => {
        definitions.set(def.id, { ...def });
      });
      robotTypes.forEach((typeConfig) => {
        (typeConfig.tests || []).forEach((def) => {
          definitions.set(def.id, { ...definitions.get(def.id), ...def });
        });
      });
      return Array.from(definitions.values());
    }

    function setRobotTypeDefinitions(payload) {
      const normalized = normalizeRobotTypeConfig(payload);
      const byId = new Map();
      normalized.forEach((entry) => {
        byId.set(entry.typeKey, entry);
        byId.set(normalizeTypeId(entry.label), entry);
      });
      ROBOT_TYPES = normalized;
      ROBOT_TYPE_BY_ID = byId;
      TEST_DEFINITIONS = buildGlobalTestDefinitions(normalized);
      return ROBOT_TYPES;
    }

    function getRobotTypeConfig(typeId) {
      return ROBOT_TYPE_BY_ID.get(normalizeTypeId(typeId)) || null;
    }

    function getRobotDefinitionsForType(typeId) {
      const typeCfg = getRobotTypeConfig(typeId);
      return typeCfg?.tests && typeCfg.tests.length ? typeCfg.tests : DEFAULT_TEST_DEFINITIONS;
    }

    function getAutoFixesForType(typeId) {
      const typeCfg = getRobotTypeConfig(typeId);
      return Array.isArray(typeCfg?.autoFixes) ? typeCfg.autoFixes : [];
    }

    function formatTestValue(rawTests, id, def) {
      const result = rawTests && typeof rawTests[id] === 'object' ? rawTests[id] : null;
      return {
        status: result ? normalizeStatus(result.status) : normalizeStatus(def.defaultStatus),
        value: normalizeText(result ? result.value : def.defaultValue, def.defaultValue),
        details: normalizeText(result ? result.details : def.defaultDetails, def.defaultDetails),
        reason: normalizeText(result?.reason, ''),
      };
    }

    function normalizeRobotTests(rawTests, typeId) {
      const definitions = getRobotDefinitionsForType(typeId);
      const safeInput = rawTests && typeof rawTests === 'object' ? rawTests : {};
      const tests = {};

      definitions.forEach((def) => {
        tests[def.id] = formatTestValue(safeInput, def.id, def);
      });

      Object.entries(safeInput).forEach(([id, raw]) => {
        if (!tests[id] && raw && typeof raw === 'object') {
          tests[id] = {
            status: normalizeStatus(raw.status),
            value: normalizeText(raw.value, 'n/a'),
            details: normalizeText(raw.details, 'Backend populated test'),
            reason: normalizeText(raw.reason, ''),
          };
        }
      });

      return { tests, definitions };
    }

    function getDefinitionLabel(definitions, id) {
      return definitions.find((def) => def.id === id)?.label || id;
    }

    function getFallbackTestIconText(testId) {
      const normalizedId = normalizeText(testId, '').toLowerCase();
      const mapped = TEST_ICON_TEXT_FALLBACKS[normalizedId];
      if (mapped) return mapped;
      if (!normalizedId) return 'TST';
      return normalizedId.replace(/[^a-z0-9]+/g, '').slice(0, 3).toUpperCase() || 'TST';
    }

    function getTestIconPresentation(testId, rawIcon) {
      const icon = normalizeText(rawIcon, '');
      const shouldUseTextFallback = FORCE_TEXT_TEST_ICONS || !icon || icon === '[]';
      if (shouldUseTextFallback) {
        return {
          value: getFallbackTestIconText(testId),
          className: 'test-icon test-icon-fallback',
        };
      }
      return {
        value: icon,
        className: 'test-icon',
      };
    }

    function normalizeBatteryReason(reason) {
      return normalizeText(reason, '').toUpperCase();
    }

    function batteryReasonText(result, options = {}) {
      const reason = normalizeBatteryReason(result?.reason);
      if (reason === 'LOW_BATTERY') {
        if (options.short) return 'Low battery';
        return `Low battery (<${LOW_BATTERY_WARNING_PERCENT}%)`;
      }
      if (reason === 'BATTERY_UNREADABLE') {
        if (options.short) return 'Battery unreadable';
        return 'Battery unreadable';
      }
      if (reason === 'OFFLINE_STALE') {
        if (options.short) return 'Battery stale';
        return 'Battery stale (offline)';
      }
      return '';
    }

    function buildTestPreviewText(value, details, options = {}) {
      const prefix = normalizeText(options.prefix, '');
      const base = `${normalizeText(value, 'n/a')} • ${normalizeText(details, 'No detail available')}`;
      return prefix ? `${prefix} • ${base}` : base;
    }

    function buildTestPreviewTextForResult(testId, result) {
      const prefix =
        normalizeText(testId, '').toLowerCase() === 'battery'
          ? batteryReasonText(result)
          : '';
      return buildTestPreviewText(result?.value, result?.details, { prefix });
    }

    function syncModalScrollLock() {
      if (!document?.body) return;
      const shouldLock = state.testDebugModalOpen || state.isBugReportModalOpen;
      document.body.classList.toggle(MODAL_SCROLL_LOCK_CLASS, shouldLock);
    }

    function readRobotField(robot, key) {
      if (robot && robot.ssh && typeof robot.ssh === 'object') {
        return robot.ssh[key];
      }
      return robot?.[key];
    }

    const state = {
      robots: [],
      filter: {
        name: '',
        type: 'all',
        error: 'all',
      },
      onlineSortMode: ONLINE_SORT_BATTERY,
      testingRobotIds: new Set(),
      searchingRobotIds: new Set(),
      fixingRobotIds: new Set(),
      autoTestingRobotIds: new Set(),
      autoSearchingRobotIds: new Set(),
      autoActivityRobotIds: new Set(),
      isTestRunInProgress: false,
      selectedRobotIds: new Set(),
      detailRobotId: null,
      terminalMode: 'fallback',
      terminalComponent: null,
      activeTerminalRobotId: null,
      testDebugModalOpen: false,
      isBugReportModalOpen: false,
      isBugReportSubmitInProgress: false,
      isCreateRobotInProgress: false,
      activeManageTab: 'robots',
      definitionsSummary: {
        commandPrimitives: [],
        tests: [],
        checks: [],
        fixes: [],
        robotTypes: [],
      },
      isManageSummaryLoading: false,
      isOnlineRefreshInFlight: false,
      onlineCheckEstimateMs: ONLINE_CHECK_TIMEOUT_MS,
      fleetParallelism: FLEET_PARALLELISM_DEFAULT,
      testingCountdowns: new Map(),
      testingCountdownTimer: null,
      runtimeSyncTimer: null,
      isRuntimeSyncInFlight: false,
      isMonitorConfigApplyInFlight: false,
      isAutoFixInProgress: false,
      fixModeOpen: {
        dashboard: false,
        detail: false,
      },
      monitorMode: MONITOR_MODE_ONLINE_BATTERY,
      monitorOnlineIntervalSec: MONITOR_ONLINE_INTERVAL_DEFAULT_SEC,
      monitorBatteryIntervalSec: MONITOR_BATTERY_INTERVAL_DEFAULT_SEC,
      monitorTopicsIntervalSec: MONITOR_TOPICS_INTERVAL_DEFAULT_SEC,
      monitorParallelism: FLEET_PARALLELISM_DEFAULT,
      monitorParallelismSyncInFlight: false,
      monitorParallelismPendingValue: null,
      monitorParallelismSyncTimer: null,
      onlineRefreshStartedAt: 0,
      onlineRefreshLastAt: 0,
      onlineRefreshNextAt: 0,
      onlineRefreshSummary: {
        onlineCount: 0,
        offlineCount: 0,
        totalCount: 0,
      },
      autoMonitorRefreshSummary: {
        hasData: false,
        online: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        battery: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        topics: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
      },
      pageSessionId: createPageSessionId(),
      onlineRefreshStatusTimer: null,
      workflowRecorder: null,
      recorderTerminalComponent: null,
      ignoreNextHashChange: false,
      recorderSelectionMouseupHandler: null,
    };

    const dashboard = $('#dashboard');
    const addRobotSection = $('#addRobot');
    const detail = $('#detail');
    const onlineGrid = $('#onlineRobotGrid');
    const offlineGrid = $('#offlineRobotGrid');
    const onlineSectionTitle = $('#onlineSectionTitle');
    const offlineSectionTitle = $('#offlineSectionTitle');
    const emptyState = $('#emptyState');
    const filterType = $('#filterType');
    const filterError = $('#filterError');
    const cycleOnlineSortButton = $('#cycleOnlineSort');
    const terminal = $('#terminal');
    const detailTerminalShell = terminal?.closest('.terminal-shell') || null;
    const terminalToolbar = $('#terminalToolbar');
    const terminalBadge = $('#terminalModeBadge');
    const terminalHint = $('#terminalHint');
    const activateTerminalButton = $('#activateTerminal');
    const addRobotForm = $('#addRobotForm');
    const addRobotTypeSelect = $('#addRobotType');
    const addRobotMessage = $('#addRobotMessage');
    const addRobotSavingHint = $('#addRobotSavingHint');
    const addRobotPasswordInput = $('#addRobotPassword');
    const addRobotPasswordToggle = $('#toggleAddRobotPassword');
    const manageTabStatus = $('#manageTabStatus');
    const manageTabButtons = $$('[data-tab]');
    const manageTabPanels = $$('[data-tab-panel]');
    const manageTestsList = $('#manageTestsList');
    const manageFixesList = $('#manageFixesList');
    const manageTestEditorForm = $('#manageTestEditorForm');
    const manageTestIdInput = $('#manageTestId');
    const manageTestLabelInput = $('#manageTestLabel');
    const manageTestExecuteJsonInput = $('#manageTestExecuteJson');
    const manageTestChecksJsonInput = $('#manageTestChecksJson');
    const manageTestEditorStatus = $('#manageTestEditorStatus');
    const manageFixEditorForm = $('#manageFixEditorForm');
    const manageFixIdInput = $('#manageFixId');
    const manageFixLabelInput = $('#manageFixLabel');
    const manageFixDescriptionInput = $('#manageFixDescription');
    const manageFixExecuteJsonInput = $('#manageFixExecuteJson');
    const manageFixPostTestsInput = $('#manageFixPostTests');
    const manageFixEditorStatus = $('#manageFixEditorStatus');
    const manageDeleteTestButton = $('#manageDeleteTestButton');
    const manageDeleteFixButton = $('#manageDeleteFixButton');
    const manageTestRobotTypeTargets = $('#manageTestRobotTypeTargets');
    const manageFixRobotTypeTargets = $('#manageFixRobotTypeTargets');
    const recorderCreateNewTestButton = $('#recorderCreateNewTest');
    const recorderRobotSelect = $('#recorderRobotSelect');
    const recorderDefinitionIdInput = $('#recorderDefinitionId');
    const recorderDefinitionLabelInput = $('#recorderDefinitionLabel');
    const recorderPublishTestButton = $('#recorderPublishTest');
    const recorderStatus = $('#recorderStatus');
    const recorderPublishStatus = $('#recorderPublishStatus');
    const recorderStateBadge = $('#recorderStateBadge');
    const recorderStepCountBadge = $('#recorderStepCount');
    const recorderCheckCountBadge = $('#recorderCheckCount');
    const recorderOutputCountBadge = $('#recorderOutputCount');
    const recorderCommandInput = $('#recorderCommandInput');
    const recorderRunCaptureButton = $('#recorderRunCapture');
    const recorderOutputKeyInput = $('#recorderOutputKey');
    const recorderOutputLabelInput = $('#recorderOutputLabel');
    const recorderOutputIconInput = $('#recorderOutputIcon');
    const recorderOutputPassDetailsInput = $('#recorderOutputPassDetails');
    const recorderOutputFailDetailsInput = $('#recorderOutputFailDetails');
    const recorderAddOutputBtn = $('#recorderAddOutputBtn');
    const recorderReadOutputKeySelect = $('#recorderReadOutputKey');
    const recorderReadInputRefSelect = $('#recorderReadInputRef');
    const recorderReadKindSelect = $('#recorderReadKind');
    const recorderReadNeedleInput = $('#recorderReadNeedle');
    const recorderReadNeedlesInput = $('#recorderReadNeedles');
    const recorderReadLinesInput = $('#recorderReadLines');
    const recorderReadRequireAllInput = $('#recorderReadRequireAll');
    const recorderAddReadBtn = $('#recorderAddReadBtn');
    const recorderOutputs = $('#recorderOutputs');
    const recorderFlowBlocks = $('#recorderFlowBlocks');
    const recorderTerminalDisplay = $('#recorderTerminalDisplay');
    const recorderTerminalShell = recorderTerminalDisplay?.closest('.terminal-shell') || null;
    const recorderTerminalToolbar = $('#recorderTerminalToolbar');
    const recorderTerminalBadge = $('#recorderTerminalBadge');
    const recorderTerminalHint = $('#recorderTerminalHint');
    const recorderTerminalPopReadBtn = $('#recorderTerminalPopReadBtn');
    const activateRecorderTerminalButton = $('#activateRecorderTerminal');
    const recorderTerminalActivationOverlay = $('#recorderTerminalActivationOverlay');

    const toggleDashboardFixModeButton = $('#toggleDashboardFixMode');
    const toggleDetailFixModeButton = $('#toggleDetailFixMode');
    const dashboardFixModePanel = $('#dashboardFixModePanel');
    const dashboardFixModeSummary = $('#dashboardFixModeSummary');
    const dashboardFixModeActions = $('#dashboardFixModeActions');
    const dashboardFixModeStatus = $('#dashboardFixModeStatus');
    const detailFixModePanel = $('#detailFixModePanel');
    const detailFixModeSummary = $('#detailFixModeSummary');
    const detailFixModeActions = $('#detailFixModeActions');
    const detailFixModeStatus = $('#detailFixModeStatus');
    const monitorModeSelect = $('#monitorMode');
    const monitorTopicsIntervalInput = $('#monitorTopicsIntervalSec');
    const monitorApplyButton = $('#applyMonitorConfig');
    const monitorConfigStatus = $('#monitorConfigStatus');
    const themeSelect = $('#themeSelect');
    const testDebugModal = $('#testDebugModal');
    const testDebugTitle = $('#testDebugTitle');
    const testDebugSummary = $('#testDebugSummary');
    const testDebugBody = $('#testDebugBody');
    const testDebugClose = $('#testDebugClose');
    const bugReportModal = $('#bugReportModal');
    const bugReportMessageInput = $('#bugReportMessage');
    const bugReportStatus = $('#bugReportStatus');
    const cancelBugReportButton = $('#cancelBugReport');
    const submitBugReportButton = $('#submitBugReport');

    function normalizeBatteryPercentForSort(rawValue) {
      const text = normalizeText(rawValue, '');
      if (!text) return Number.POSITIVE_INFINITY;
      const explicitPercent = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
      if (explicitPercent) {
        const parsed = Number.parseFloat(explicitPercent[1]);
        return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
      }
      const numeric = Number.parseFloat(text);
      return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
    }

    function nonBatteryTestEntries(robot) {
      return Object.entries(robot?.tests || {}).filter(([testId]) => normalizeText(testId, '').toLowerCase() !== 'battery');
    }

    function statusFromScore(robot) {
      const statuses = nonBatteryTestEntries(robot).map(([, test]) => test.status);
      const critical = statuses.some((x) => x === 'error');
      const warning = statuses.some((x) => x === 'warning');
      if (critical) return 'critical';
      if (warning) return 'warning';
      return 'ok';
    }

    function statusSortRank(robot) {
      const status = statusFromScore(robot);
      if (status === 'critical') return 0;
      if (status === 'warning') return 1;
      return 2;
    }

    function onlineRobotComparator(a, b) {
      const mode = normalizeText(state.onlineSortMode, ONLINE_SORT_BATTERY);
      if (mode === ONLINE_SORT_NAME) {
        return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
      }
      if (mode === ONLINE_SORT_STATUS) {
        const byStatus = statusSortRank(a) - statusSortRank(b);
        if (byStatus !== 0) return byStatus;
        return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
      }
      const aBattery = normalizeBatteryPercentForSort(a?.tests?.battery?.value);
      const bBattery = normalizeBatteryPercentForSort(b?.tests?.battery?.value);
      if (aBattery !== bBattery) return aBattery - bBattery;
      return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
    }

    function sortOnlineRobots(robots) {
      const list = Array.isArray(robots) ? [...robots] : [];
      list.sort(onlineRobotComparator);
      return list;
    }

    function syncOnlineSortButton() {
      if (!cycleOnlineSortButton) return;
      const mode = ONLINE_SORT_ORDER.includes(state.onlineSortMode) ? state.onlineSortMode : ONLINE_SORT_BATTERY;
      cycleOnlineSortButton.textContent = `Sort robots: ${ONLINE_SORT_LABELS[mode] || ONLINE_SORT_LABELS[ONLINE_SORT_BATTERY]}`;
    }

    function cycleOnlineSortMode() {
      const currentIndex = ONLINE_SORT_ORDER.indexOf(state.onlineSortMode);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ONLINE_SORT_ORDER.length : 0;
      state.onlineSortMode = ONLINE_SORT_ORDER[nextIndex];
      syncOnlineSortButton();
      renderDashboard();
    }

    function resolveRobotModelUrl(candidate) {
      if (typeof candidate === 'string' && candidate.trim()) {
        const clean = candidate.trim().replace(/^\.\//, '');
        const hasModelExtension = /\.(gltf|glb)(?:\?|#|$)/i.test(clean);
        const isAssetsModelPath =
          clean.includes('assets/models/') ||
          clean.includes('/assets/models/');

        if (isAssetsModelPath && hasModelExtension) {
          return clean;
        }
      }
      return DEFAULT_ROBOT_MODEL_URL;
    }

    function normalizeRobotData(raw) {
      const entries = Array.isArray(raw) ? raw : [];
      return entries.map((bot) => {
        const botType = bot?.type || 'unknown';
        const modelUrlCandidate = bot?.modelUrl || bot?.modelUrlPath || bot?.model?.url || bot?.model?.file || bot?.model?.path;
        const typeConfig = getRobotTypeConfig(botType);
        const { tests, definitions } = normalizeRobotTests(bot?.tests, botType);
        const modelUrl = resolveRobotModelUrl(modelUrlCandidate);
        const activity = normalizeRobotActivity(bot?.activity);
        return {
          id: bot?.id || `robot-${Math.random().toString(16).slice(2, 7)}`,
          name: normalizeText(bot?.name, `robot-${Math.random().toString(16).slice(2, 7)}`),
          type: typeConfig?.label || botType || 'Unknown Type',
          typeId: botType,
          ip: normalizeText(bot?.ip, ''),
          username: normalizeText(readRobotField(bot, 'username'), ''),
          password: normalizeText(readRobotField(bot, 'password'), ''),
          modelUrl,
          model: bot?.model || null,
          tests,
          testDefinitions: definitions,
          topics: typeConfig?.topics || [],
          autoFixes: typeConfig?.autoFixes || [],
          activity,
          testDebug: normalizeTestDebugCollection(bot?.testDebug),
        };
      });
    }

    function robotId(robotOrId) {
      if (typeof robotOrId === 'string' || typeof robotOrId === 'number') {
        return normalizeText(robotOrId, '');
      }
      return normalizeText(robotOrId?.id, '');
    }

    function getRobotById(robotIdValue) {
      const normalized = normalizeText(robotIdValue, '');
      return state.robots.find((robot) => robotId(robot) === normalized) || null;
    }

    function getSelectedRobotIds() {
      return state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot))).map((robot) => robotId(robot));
    }

    function getReachableRobotIds() {
      return state.robots
        .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
        .map((robot) => robotId(robot));
    }

    function isRobotSelected(robotIdValue) {
      return state.selectedRobotIds.has(robotId(robotIdValue));
    }

    function isRobotTesting(robotIdValue) {
      const normalizedId = robotId(robotIdValue);
      return state.testingRobotIds.has(normalizedId) || state.autoTestingRobotIds.has(normalizedId);
    }

    function isRobotSearching(robotIdValue) {
      const normalizedId = robotId(robotIdValue);
      return state.searchingRobotIds.has(normalizedId) || state.autoSearchingRobotIds.has(normalizedId);
    }

    function isRobotFixing(robotIdValue) {
      return state.fixingRobotIds.has(robotId(robotIdValue));
    }

    function isRobotBusyForOnlineRefresh(robotIdValue) {
      return isRobotSearching(robotIdValue) || isRobotTesting(robotIdValue) || isRobotFixing(robotIdValue);
    }

    function isRobotAutoSearching(robotIdValue) {
      return state.autoSearchingRobotIds.has(robotId(robotIdValue));
    }

    function setRobotTesting(robotIdValue, isTesting, countdownMs = null) {
      const id = robotId(robotIdValue);
      if (!id) return;
      if (isTesting) {
        state.testingRobotIds.add(id);
        const safeCountdownMs = normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS);
        state.testingCountdowns.set(id, {
          mode: 'scanning',
          expiresAt: Date.now() + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
        startTestingCountdowns();
      } else {
        state.testingRobotIds.delete(id);
        state.testingCountdowns.delete(id);
        if (!state.testingCountdowns.size) {
          stopTestingCountdowns();
        }
      }
      renderDashboard();
      const isDetailActive = detail.classList.contains('active');
      if (!isDetailActive) return;
      if (state.detailRobotId === id) {
        const activeRobot = state.robots.find((item) => robotId(item) === id);
        if (activeRobot) {
          renderDetail(activeRobot);
        }
      }
    }

    function setRobotSearching(robotIdValue, isSearching, countdownMs = null) {
      const id = robotId(robotIdValue);
      if (!id) return;
      if (isSearching) {
        state.searchingRobotIds.add(id);
        const safeCountdownMs = normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS);
        state.testingCountdowns.set(id, {
          mode: 'finding',
          expiresAt: Date.now() + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
        startTestingCountdowns();
      } else {
        state.searchingRobotIds.delete(id);
        state.testingCountdowns.delete(id);
        if (!state.testingCountdowns.size) {
          stopTestingCountdowns();
        }
      }
      renderDashboard();
      const isDetailActive = detail.classList.contains('active');
      if (!isDetailActive) return;
      if (state.detailRobotId === id) {
        const activeRobot = state.robots.find((item) => robotId(item) === id);
        if (activeRobot) {
          renderDetail(activeRobot);
        }
      }
    }

    function setRobotFixing(robotIdValue, isFixing, countdownMs = null) {
      const id = robotId(robotIdValue);
      if (!id) return;
      if (isFixing) {
        state.fixingRobotIds.add(id);
        const safeCountdownMs = normalizeCountdownMs(countdownMs, TEST_STEP_TIMEOUT_MS * 2);
        state.testingCountdowns.set(id, {
          mode: 'fixing',
          expiresAt: Date.now() + safeCountdownMs,
          totalMs: safeCountdownMs,
        });
        startTestingCountdowns();
      } else {
        state.fixingRobotIds.delete(id);
        state.testingCountdowns.delete(id);
        if (!state.testingCountdowns.size) {
          stopTestingCountdowns();
        }
      }
      renderDashboard();
      const isDetailActive = detail.classList.contains('active');
      if (!isDetailActive) return;
      if (state.detailRobotId === id) {
        const activeRobot = state.robots.find((item) => robotId(item) === id);
        if (activeRobot) {
          renderDetail(activeRobot);
        }
      }
    }

    function estimateTestCountdownMsFromBody(body) {
      const rawCount = Array.isArray(body?.testIds) ? body.testIds.length : 1;
      const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
      return Math.max(
        TEST_COUNTDOWN_MIN_SECONDS * 1000,
        Math.min(count * TEST_STEP_TIMEOUT_MS, TEST_COUNTDOWN_MAX_SECONDS * 1000),
      );
    }

    function normalizeCountdownMs(countdownMs, fallbackMs) {
      const safeDefault = Number.isFinite(fallbackMs) && fallbackMs > 0 ? fallbackMs : TEST_STEP_TIMEOUT_MS;
      const normalizedRaw =
        Number.isFinite(countdownMs) && countdownMs > 0 ? countdownMs : safeDefault;
      return Math.max(
        TEST_COUNTDOWN_MIN_SECONDS * 1000,
        Math.min(normalizedRaw, TEST_COUNTDOWN_MAX_SECONDS * 1000),
      );
    }

    function getCountdownLabel(mode) {
      return TEST_COUNTDOWN_MODE_LABELS[mode] || TEST_COUNTDOWN_MODE_LABELS.scanning;
    }

    function getTestingCountdownText(robotIdValue) {
      const id = robotId(robotIdValue);
      if (!id) return '';
      const countdown = state.testingCountdowns.get(id);
      if (!countdown) {
        if (state.fixingRobotIds.has(id)) return 'Fixing...';
        if (state.autoSearchingRobotIds.has(id)) return 'Finding...';
        if (state.autoTestingRobotIds.has(id)) return 'Scanning...';
        return '';
      }
      return `${getCountdownLabel(countdown.mode)} ${Math.max(0, Math.ceil((countdown.expiresAt - Date.now()) / 1000))}s`;
    }

    function shouldUseCompactAutoSearchIndicator(robotIdValue, isOffline, isSearching = false) {
      const searching = Boolean(isSearching || isRobotSearching(robotIdValue));
      return searching && !isOffline;
    }

    function buildScanOverlayMarkup({ isSearching, isTesting, isFixing = false, compactAutoSearch = false } = {}) {
      if (isFixing) {
        return '<div class="scanning-overlay fixing-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/repairing.webm" type="video/webm" /></video></div>';
      }
      if (isSearching && !compactAutoSearch) {
        return '<div class="scanning-overlay finding-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/finding.webm" type="video/webm" /></video></div>';
      }
      if (isTesting) {
        return '<div class="scanning-overlay" data-role="activity-overlay"><video autoplay muted loop playsinline><source src="assets/animations/scanning.webm" type="video/webm" /></video></div>';
      }
      return '';
    }

    function buildConnectionCornerIconMarkup(isOffline, isCheckingOnline = false) {
      if (isOffline) {
        return '<img class="offline-corner-icon" data-role="connection-corner-icon" src="assets/Icons/no-connection.png" alt="No connection" />';
      }
      const blinkingClass = isCheckingOnline ? ' blinking' : '';
      const alt = isCheckingOnline ? 'Checking online' : 'Connected';
      return `<img class="connected-corner-icon${blinkingClass}" data-role="connection-corner-icon" src="assets/Icons/connected.png" alt="${alt}" />`;
    }

    function syncModelViewerRotationForContainer(container, isOffline) {
      if (!container) return;
      const modelViewer = container.querySelector('model-viewer');
      if (!modelViewer) return;
      if (isOffline) {
        modelViewer.removeAttribute('auto-rotate');
        modelViewer.removeAttribute('auto-rotate-delay');
        modelViewer.removeAttribute('rotation-per-second');
        return;
      }
      modelViewer.setAttribute('auto-rotate', '');
      modelViewer.setAttribute('auto-rotate-delay', '0');
      modelViewer.setAttribute('rotation-per-second', '20deg');
    }

    function formatDurationMs(ms) {
      const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes > 0) {
        return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
      }
      return `${seconds}s`;
    }

    function getMonitorOnlineIntervalMs() {
      return Math.max(
        MONITOR_ONLINE_INTERVAL_MIN_SEC * 1000,
        Math.floor(clampMonitorOnlineInterval(state.monitorOnlineIntervalSec) * 1000),
      );
    }

    function getMonitorBatteryIntervalMs() {
      return Math.max(
        MONITOR_BATTERY_INTERVAL_MIN_SEC * 1000,
        Math.floor(clampMonitorBatteryInterval(state.monitorBatteryIntervalSec) * 1000),
      );
    }

    function getMonitorTopicsIntervalMs() {
      return Math.max(
        MONITOR_TOPICS_INTERVAL_MIN_SEC * 1000,
        Math.floor(clampMonitorTopicsInterval(state.monitorTopicsIntervalSec) * 1000),
      );
    }

    function normalizeCheckedAtMs(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      if (numeric > 1e12) return Math.floor(numeric);
      return Math.floor(numeric * 1000);
    }

    function formatLastFullTestTimestamp(timestampMs) {
      const date = new Date(timestampMs);
      if (!Number.isFinite(date.getTime())) return '--';
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      const timeLabel = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      if (sameDay) return timeLabel;
      const dateLabel = date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
      return `${dateLabel} ${timeLabel}`;
    }

    function buildLastFullTestPillLabel(robot, compact = false) {
      const timestampMs = normalizeCheckedAtMs(robot?.activity?.lastFullTestAt);
      const prefix = compact ? 'Full test' : 'Last full test';
      if (!timestampMs) return `${prefix}: --`;
      return `${prefix}: ${formatLastFullTestTimestamp(timestampMs)}`;
    }

    function syncAutoMonitorRefreshState() {
      const summary = {
        hasData: false,
        online: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        battery: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
        topics: { lastCheckedAtMs: 0, checkedRobotCount: 0 },
      };
      const includeTopics = isTopicsMonitorMode(state.monitorMode);

      state.robots.forEach((robot) => {
        const tests = robot?.tests || {};
        const onlineTest = tests.online;
        if (
          normalizeText(onlineTest?.source, '') === MONITOR_SOURCE &&
          onlineTest?.checkedAt !== undefined
        ) {
          const timestampMs = normalizeCheckedAtMs(onlineTest.checkedAt);
          if (timestampMs > 0) {
            summary.hasData = true;
            summary.online.checkedRobotCount += 1;
            summary.online.lastCheckedAtMs = Math.max(summary.online.lastCheckedAtMs, timestampMs);
          }
        }

        const batteryTest = tests.battery;
        if (
          normalizeText(batteryTest?.source, '') === MONITOR_SOURCE &&
          batteryTest?.checkedAt !== undefined
        ) {
          const timestampMs = normalizeCheckedAtMs(batteryTest.checkedAt);
          if (timestampMs > 0) {
            summary.hasData = true;
            summary.battery.checkedRobotCount += 1;
            summary.battery.lastCheckedAtMs = Math.max(summary.battery.lastCheckedAtMs, timestampMs);
          }
        }

        if (!includeTopics) return;
        let topicsSeenForRobot = false;
        Object.entries(tests).forEach(([testId, result]) => {
          if (testId === 'online' || testId === 'battery') return;
          if (normalizeText(result?.source, '') !== MONITOR_TOPICS_SOURCE) return;
          if (result?.checkedAt === undefined) return;
          const timestampMs = normalizeCheckedAtMs(result.checkedAt);
          if (timestampMs <= 0) return;
          summary.hasData = true;
          summary.topics.lastCheckedAtMs = Math.max(summary.topics.lastCheckedAtMs, timestampMs);
          topicsSeenForRobot = true;
        });
        if (topicsSeenForRobot) {
          summary.topics.checkedRobotCount += 1;
        }
      });

      state.autoMonitorRefreshSummary = summary;
    }

    function stopOnlineRefreshStatusTimer() {
      if (!state.onlineRefreshStatusTimer) return;
      window.clearInterval(state.onlineRefreshStatusTimer);
      state.onlineRefreshStatusTimer = null;
    }

    function setFleetOnlineButtonIdleLabel(label, title = '') {
      const runAllButton = $('#runFleetOnline');
      if (!runAllButton) return;
      runAllButton.dataset.idleLabel = label;
      if (!state.isOnlineRefreshInFlight) {
        runAllButton.textContent = label;
      }
      if (title) {
        runAllButton.title = title;
      }
    }

    function updateFleetOnlineRefreshStatus() {
      const runAllButton = $('#runFleetOnline');
      if (!runAllButton) return;
      const autoSummary = state.autoMonitorRefreshSummary || {};
      const now = Date.now();
      const includeTopics = isTopicsMonitorMode(state.monitorMode);
      const onlineNextCandidates = [];
      const topicsNextCandidates = [];

      if (autoSummary.online?.lastCheckedAtMs) {
        onlineNextCandidates.push(
          Math.max(0, autoSummary.online.lastCheckedAtMs + getMonitorOnlineIntervalMs() - now),
        );
      }
      if (autoSummary.battery?.lastCheckedAtMs) {
        onlineNextCandidates.push(
          Math.max(0, autoSummary.battery.lastCheckedAtMs + getMonitorBatteryIntervalMs() - now),
        );
      }
      if (includeTopics && autoSummary.topics?.lastCheckedAtMs) {
        topicsNextCandidates.push(
          Math.max(0, autoSummary.topics.lastCheckedAtMs + getMonitorTopicsIntervalMs() - now),
        );
      }

      if (!onlineNextCandidates.length && state.onlineRefreshNextAt > 0) {
        onlineNextCandidates.push(Math.max(0, state.onlineRefreshNextAt - now));
      }

      const nextOnlineInMs = onlineNextCandidates.length ? Math.min(...onlineNextCandidates) : null;
      const nextTopicsInMs = topicsNextCandidates.length ? Math.min(...topicsNextCandidates) : null;
      const nextCountdownCandidates = [];
      if (nextOnlineInMs !== null) nextCountdownCandidates.push(nextOnlineInMs);
      if (nextTopicsInMs !== null) nextCountdownCandidates.push(nextTopicsInMs);
      const nextRefreshInMs = nextCountdownCandidates.length ? Math.min(...nextCountdownCandidates) : null;
      const nextCountdownLabel = nextRefreshInMs === null ? '--' : formatDurationMs(nextRefreshInMs);

      if (!includeTopics) {
        const onlineTitle =
          nextOnlineInMs === null
            ? 'Refresh online state. Next refresh unavailable.'
            : `Refresh online state. Next refresh in ${formatDurationMs(nextOnlineInMs)}.`;
        setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, onlineTitle);
        return;
      }

      const onlineLabel =
        nextOnlineInMs === null ? 'online/battery: --' : `online/battery: ${formatDurationMs(nextOnlineInMs)}`;
      const topicsLabel = nextTopicsInMs === null ? 'topics: --' : `topics: ${formatDurationMs(nextTopicsInMs)}`;
      const title = `Refresh online state. Next ${onlineLabel}, ${topicsLabel}.`;
      setFleetOnlineButtonIdleLabel(`Refresh online (${nextCountdownLabel})`, title);
    }

    function startOnlineRefreshStatusTimer() {
      if (state.onlineRefreshStatusTimer) return;
      state.onlineRefreshStatusTimer = window.setInterval(updateFleetOnlineRefreshStatus, TEST_COUNTDOWN_TICK_MS);
      updateFleetOnlineRefreshStatus();
    }

    function refreshTestingCountdowns() {
      const now = Date.now();
      const nodes = document.querySelectorAll('.scan-countdown');
      let hasActive = false;
      nodes.forEach((node) => {
        const id = normalizeText(node.getAttribute('data-robot-id'), '');
        if (!id) return;
        const countdown = state.testingCountdowns.get(id);
        if (!countdown) return;
        const remaining = countdown.expiresAt - now;
        const mode = countdown.mode || 'scanning';
        if (remaining <= 0) {
          node.textContent = TEST_COUNTDOWN_WARNING_TEXT[mode] || TEST_COUNTDOWN_WARNING_TEXT.scanning;
          node.classList.add('countdown-warning');
        } else {
          node.textContent = `${getCountdownLabel(mode)} ${Math.max(0, Math.ceil(remaining / 1000))}s`;
          node.classList.remove('countdown-warning');
        }
        hasActive = true;
      });
      if (!hasActive && state.testingCountdowns.size === 0) {
        stopTestingCountdowns();
      }
    }

    function startTestingCountdowns() {
      if (state.testingCountdownTimer) return;
      state.testingCountdownTimer = window.setInterval(refreshTestingCountdowns, TEST_COUNTDOWN_TICK_MS);
      refreshTestingCountdowns();
    }

    function stopTestingCountdowns() {
      if (!state.testingCountdownTimer) return;
      window.clearInterval(state.testingCountdownTimer);
      state.testingCountdownTimer = null;
    }

    function setRobotSearchingBulk(robotIds, isSearching, countdownMs = null) {
      const ids = (Array.isArray(robotIds) ? robotIds : []).map((id) => robotId(id)).filter(Boolean);
      if (!ids.length) return;
      const safeCountdownMs = normalizeCountdownMs(countdownMs, ONLINE_CHECK_TIMEOUT_MS);

      ids.forEach((id) => {
        if (isSearching) {
          state.searchingRobotIds.add(id);
          state.testingCountdowns.set(id, {
            mode: 'finding',
            expiresAt: Date.now() + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
        } else {
          state.searchingRobotIds.delete(id);
          state.testingCountdowns.delete(id);
        }
      });
      if (isSearching) {
        startTestingCountdowns();
      } else if (!state.testingCountdowns.size) {
        stopTestingCountdowns();
      }

      renderDashboard();
      const isDetailActive = detail.classList.contains('active');
      if (!isDetailActive) return;
      const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
      if (activeRobot) {
        renderDetail(activeRobot);
      }
    }

    function syncAutomatedRobotActivityFromState() {
      const now = Date.now();
      const nextAutoSearching = new Set();
      const nextAutoTesting = new Set();
      const nextAutoActivityIds = new Set();

      state.robots.forEach((robot) => {
        const id = robotId(robot);
        if (!id) return;
        const hasLocalPriorityActivity =
          state.testingRobotIds.has(id) ||
          state.searchingRobotIds.has(id) ||
          state.fixingRobotIds.has(id);
        if (hasLocalPriorityActivity) {
          return;
        }
        const activity = normalizeRobotActivity(robot?.activity);
        if (activity.searching) {
          nextAutoSearching.add(id);
          nextAutoActivityIds.add(id);
          const safeCountdownMs = normalizeCountdownMs(ONLINE_CHECK_TIMEOUT_MS, ONLINE_CHECK_TIMEOUT_MS);
          state.testingCountdowns.set(id, {
            mode: 'finding',
            expiresAt: now + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
        }
        if (activity.testing) {
          nextAutoTesting.add(id);
          nextAutoActivityIds.add(id);
          const safeCountdownMs = normalizeCountdownMs(TEST_STEP_TIMEOUT_MS, TEST_STEP_TIMEOUT_MS);
          state.testingCountdowns.set(id, {
            mode: 'scanning',
            expiresAt: now + safeCountdownMs,
            totalMs: safeCountdownMs,
          });
        }
      });

      state.autoActivityRobotIds.forEach((id) => {
        if (nextAutoActivityIds.has(id)) return;
        if (
          !state.testingRobotIds.has(id) &&
          !state.searchingRobotIds.has(id) &&
          !state.fixingRobotIds.has(id)
        ) {
          state.testingCountdowns.delete(id);
        }
      });

      state.autoSearchingRobotIds = nextAutoSearching;
      state.autoTestingRobotIds = nextAutoTesting;
      state.autoActivityRobotIds = nextAutoActivityIds;

      if (state.testingCountdowns.size) {
        startTestingCountdowns();
      } else {
        stopTestingCountdowns();
      }
    }

    function setRobotSelection(robotIdValue, selected) {
      const id = robotId(robotIdValue);
      if (!id) return;
      if (selected) {
        state.selectedRobotIds.add(id);
      } else {
        state.selectedRobotIds.delete(id);
      }
      updateSelectionSummary();
      syncSelectionUi();
    }

    function selectRobotIds(list, fallbackSelectAll = false) {
      const targetIds = new Set(
        (Array.isArray(list) ? list : [])
          .map((id) => robotId(id))
          .filter(Boolean),
      );

      if (fallbackSelectAll && !targetIds.size) {
        state.robots.forEach((robot) => {
          const id = robotId(robot);
          if (id) {
            targetIds.add(id);
          }
        });
      }

      state.selectedRobotIds = targetIds;
      updateSelectionSummary();
      syncSelectionUi();
    }

    function addRobotIdsToSelection(list) {
      const next = new Set(state.selectedRobotIds);
      (Array.isArray(list) ? list : [])
        .map((id) => robotId(id))
        .filter(Boolean)
        .forEach((id) => next.add(id));
      state.selectedRobotIds = next;
      updateSelectionSummary();
      syncSelectionUi();
    }

    function removeRobotIdsFromSelection(list) {
      const next = new Set(state.selectedRobotIds);
      (Array.isArray(list) ? list : [])
        .map((id) => robotId(id))
        .filter(Boolean)
        .forEach((id) => next.delete(id));
      state.selectedRobotIds = next;
      updateSelectionSummary();
      syncSelectionUi();
    }

    function areAllRobotIdsSelected(list) {
      const ids = (Array.isArray(list) ? list : [])
        .map((id) => robotId(id))
        .filter(Boolean);
      if (!ids.length) return false;
      return ids.every((id) => state.selectedRobotIds.has(id));
    }

    function updateSelectionSummary() {
      const summary = $('#selectionSummary');
      if (!summary) return;
      summary.textContent = `${state.selectedRobotIds.size} robot(s) selected`;
      syncRunSelectedButtonLabel();
      syncGlobalSelectionButton();
      if (state.fixModeOpen.dashboard) {
        renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
      }
    }

    function getRunSelectedButtonIdleLabel() {
      return state.selectedRobotIds.size > 0 ? 'Run selected' : 'Run selected (default online)';
    }

    function syncRunSelectedButtonLabel() {
      const runSelectedButton = $('#runSelectedRobotTests');
      if (!runSelectedButton) return;
      if (state.isTestRunInProgress) return;
      applyActionButton(runSelectedButton, {
        intent: 'run',
        label: getRunSelectedButtonIdleLabel(),
      });
    }

    function syncSelectionUi() {
      const cards = $$('[data-robot-id]');
      cards.forEach((card) => {
        const id = normalizeText(card.getAttribute('data-robot-id'), '');
        if (!id) return;
        const selected = state.selectedRobotIds.has(id);
        card.classList.toggle('selected', selected);
        const button = card.querySelector('[data-action="select-robot"]');
        if (!button) return;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        button.setAttribute('aria-label', selected ? 'Deselect robot' : 'Select robot');
        button.setAttribute('title', selected ? 'Deselect robot' : 'Select robot');
        applyActionButton(button, {
          intent: 'selection',
          pressed: selected,
          label: selected ? '[x]' : '[ ]',
        });
      });
      syncSectionToggleButtons();
      syncGlobalSelectionButton();
    }

    function syncGlobalSelectionButton() {
      const selectAllButton = $('#selectAllRobots');
      if (!selectAllButton) return;
      const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
      const allSelected = areAllRobotIdsSelected(allIds);
      applyActionButton(selectAllButton, {
        intent: 'selection',
        pressed: allSelected,
        label: allSelected ? 'Deselect all robots' : 'Select all robots',
      });
      selectAllButton.classList.toggle('toggle-on', allSelected);
      selectAllButton.setAttribute('aria-pressed', allSelected ? 'true' : 'false');
    }

    function statusChip(status, role = '') {
      const roleAttr = role ? ` data-role="${role}"` : '';
      if (status === 'critical') return `<span class="status-chip err"${roleAttr}>Critical</span>`;
      if (status === 'warning') return `<span class="status-chip warn"${roleAttr}>Warning</span>`;
      return `<span class="status-chip ok"${roleAttr}>Healthy</span>`;
    }

    function robotModelMarkup() {
      return `
        <div class="body-core"></div>
        <div class="camera-lens"></div>
        <div class="lidar"></div>
        <div class="wheel front-left"></div>
        <div class="wheel front-right"></div>
        <div class="wheel back-left"></div>
        <div class="wheel back-right"></div>
        <div class="battery"><div class="battery-fill"></div></div>
        <div class="proximity-sensor p1"></div>
        <div class="proximity-sensor p2"></div>
        <div class="proximity-sensor p3"></div>
        <div class="proximity-sensor p4"></div>
        <div class="skull"><span></span></div>`;
    }

    function buildRobotModelMarkup(robot, isOffline = false) {
      const modelUrl = resolveRobotModelUrl(robot?.modelUrl);
      if (modelUrl && CAN_USE_MODEL_VIEWER) {
        return `
          <div class="robot-viewer">
            <model-viewer
              src="${modelUrl}"
              alt="${robot.name || 'Robot model'}"
              ${isOffline ? '' : 'auto-rotate'}
              ${isOffline ? '' : 'auto-rotate-delay="0"'}
              ${isOffline ? '' : 'rotation-per-second="20deg"'}
              disable-zoom
              camera-controls
              interaction-prompt="none">
            </model-viewer>
          </div>`;
      }

      return robotModelMarkup();
    }

    function buildRobotModelContainer(robot, failureClasses, isOffline = false) {
      const modelMarkup = buildRobotModelMarkup(robot, isOffline);
      const is3D = modelMarkup.includes('model-viewer');
      return is3D
        ? `<div class="robot-model-slot ${failureClasses} ${isOffline ? 'offline' : ''}">${modelMarkup}</div>`
        : `<div class="robot-3d ${failureClasses} ${isOffline ? 'offline' : ''}">${modelMarkup}</div>`;
    }

    function issueSummary(robot) {
      const testDefinitions = robot?.testDefinitions || TEST_DEFINITIONS;
      return nonBatteryTestEntries(robot)
        .filter(([, test]) => test.status !== 'ok')
        .slice(0, 3)
        .map(([id]) => getDefinitionLabel(testDefinitions, id));
    }

    function renderCard(robot) {
      const stateKey = statusFromScore(robot);
      const isCritical = stateKey === 'critical';
      const normalizedRobotId = robotId(robot);
      const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
      const selected = isRobotSelected(normalizedRobotId);
      const isTesting = isRobotTesting(normalizedRobotId);
      const isSearching = isRobotSearching(normalizedRobotId);
      const isFixing = isRobotFixing(normalizedRobotId);
      const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
      const isCountingDown = isTesting || isSearching || isFixing;
      const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
      const stateClass = isOffline ? 'state-offline' : `state-${stateKey}`;
      const overlayMarkup = buildScanOverlayMarkup({
        isSearching,
        isTesting,
        isFixing,
        compactAutoSearch,
      });
      const card = document.createElement('article');
      card.className = `robot-card ${isCritical ? 'error' : ''} ${stateClass} ${selected ? 'selected' : ''} ${
        isTesting || isSearching || isFixing ? 'testing' : ''
      } ${isOffline ? 'offline' : ''}`.trim();
      card.setAttribute('data-robot-id', normalizedRobotId);
      const issues = issueSummary(robot);
      const list = issues.map((i) => `<span class="error-badge">${i}</span>`).join('');

      const failureClasses = nonBatteryTestEntries(robot)
        .filter(([, test]) => test.status !== 'ok')
        .map(([id]) => `fault-${id}`)
        .join(' ');

      const title = robot.name;
      const tests = issueSummary(robot).join(', ') || 'No active errors';
      const batteryState = robot?.tests?.battery || {};
      const lastFullTestLabel = buildLastFullTestPillLabel(robot);

      card.innerHTML = `
        <div class="glow-bar"></div>
        <div class="robot-card-header">
          <div>
            <h3 class="robot-card-title">${title}</h3>
            <p class="robot-card-sub">${robot.type}</p>
          </div>
          ${statusChip(stateKey, 'card-status-chip')}
          <button
            class="button robot-select-btn ${selected ? 'selected' : ''}"
            type="button"
            data-action="select-robot"
            data-button-intent="selection"
            aria-pressed="${selected ? 'true' : 'false'}"
            aria-label="${selected ? 'Deselect robot' : 'Select robot'}"
            title="${selected ? 'Deselect robot' : 'Select robot'}">
            ${selected ? '[x]' : '[ ]'}
          </button>
        </div>
        <div class="model-wrap">
          <div class="badge-strip" data-role="badge-strip">${list}</div>
          ${buildConnectionCornerIconMarkup(isOffline, compactAutoSearch)}
          ${isCountingDown ? `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>` : ''}
          ${buildRobotModelContainer(robot, failureClasses, isOffline)}
          ${overlayMarkup}
        </div>
        <div class="summary">
          <span class="pill" data-role="issues-pill">Issue cluster: ${tests}</span>
          <span class="pill" data-role="movement-pill">Movement: ${robot.tests.movement?.value || 'n/a'}</span>
          <span class="pill" data-role="last-full-test-pill">${lastFullTestLabel}</span>
          <span data-role="summary-battery-pill">${renderBatteryPill({
            value: batteryState.value,
            status: batteryState.status,
            reason: batteryState.reason,
            size: 'default',
          })}</span>
        </div>`;

      card.addEventListener('click', (event) => {
        const selectButton = event.target.closest('[data-action="select-robot"]');
        if (selectButton) {
          event.preventDefault();
          event.stopPropagation();
              setRobotSelection(normalizedRobotId, !isRobotSelected(normalizedRobotId));
              return;
            }

        openDetail(robot.id);
      });

      hydrateActionButtons(card);

      return card;
    }

    function applyFilters() {
      return state.robots.filter((robot) => {
        const matchesName = robot.name.toLowerCase().includes(state.filter.name.toLowerCase());
        const matchesType = state.filter.type === 'all' || robot.type === state.filter.type;
        const stateKey = statusFromScore(robot);
        let matchesError = true;

        if (state.filter.error === 'healthy') {
          matchesError = stateKey === 'ok';
        } else if (state.filter.error === 'warning') {
          matchesError = stateKey === 'warning';
        } else if (state.filter.error === 'critical') {
          matchesError = stateKey === 'critical';
        } else if (state.filter.error === 'error') {
          matchesError = stateKey !== 'ok';
        } else if (state.filter.error !== 'all') {
          const def = state.filter.error;
          matchesError = Object.keys(robot.tests).some(
            (k) => k === def && robot.tests[k].status !== 'ok',
          );
        }

        return matchesName && matchesType && matchesError;
      });
    }

    function updateKPIs(list) {
      const healthy = list.filter((r) => statusFromScore(r) === 'ok').length;
      const warning = list.filter((r) => statusFromScore(r) === 'warning').length;
      const critical = list.filter((r) => statusFromScore(r) === 'critical').length;
      $('#kpiHealthy').textContent = healthy;
      $('#kpiWarn').textContent = warning;
      $('#kpiCritical').textContent = critical;
    }

    function renderDashboard() {
      const visible = applyFilters();
      const onlineRobots = sortOnlineRobots(
        visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok'),
      );
      const offlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');

      if (onlineSectionTitle) {
        onlineSectionTitle.textContent = `Online (${onlineRobots.length})`;
      }
      if (offlineSectionTitle) {
        offlineSectionTitle.textContent = `Offline (${offlineRobots.length})`;
      }

      if (onlineGrid && offlineGrid) {
        onlineGrid.replaceChildren();
        offlineGrid.replaceChildren();
        onlineRobots.forEach((robot) => {
          onlineGrid.appendChild(renderCard(robot));
        });
        offlineRobots.forEach((robot) => {
          offlineGrid.appendChild(renderCard(robot));
        });
      }

      emptyState.classList.toggle('hidden', visible.length > 0);
      updateSelectionSummary();
      syncSectionToggleButtons();
      updateKPIs(state.robots);
      hydrateActionButtons(dashboard);
      syncFixModePanels();
    }

    function applyDashboardMetaFromVisible(visible) {
      const onlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok');
      const offlineRobots = visible.filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok');
      if (onlineSectionTitle) {
        onlineSectionTitle.textContent = `Online (${onlineRobots.length})`;
      }
      if (offlineSectionTitle) {
        offlineSectionTitle.textContent = `Offline (${offlineRobots.length})`;
      }
      emptyState.classList.toggle('hidden', visible.length > 0);
      updateSelectionSummary();
      syncSectionToggleButtons();
      updateKPIs(state.robots);
      if (state.fixModeOpen.dashboard) {
        renderFixModeActionsForContext(FIX_MODE_CONTEXT_DASHBOARD);
      }
    }

    function getStatusChipTone(statusKey) {
      if (statusKey === 'critical') return { css: 'err', text: 'Critical' };
      if (statusKey === 'warning') return { css: 'warn', text: 'Warning' };
      return { css: 'ok', text: 'Healthy' };
    }

    function queryCardByRobotId(robotIdValue) {
      const id = robotId(robotIdValue);
      if (!id) return null;
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(id)
          : id.replace(/"/g, '\\"');
      return document.querySelector(`.robot-card[data-robot-id="${escaped}"]`);
    }

    function setModelContainerFaultClasses(modelContainer, robot, isOffline, includeDetailClass = false) {
      if (!modelContainer) return;
      const failureClasses = nonBatteryTestEntries(robot)
        .filter(([, test]) => normalizeStatus(test?.status) !== 'ok')
        .map(([id]) => `fault-${id}`)
        .join(' ');
      const baseClass = modelContainer.classList.contains('robot-model-slot') ? 'robot-model-slot' : 'robot-3d';
      const detailClass = includeDetailClass ? 'detail-model' : '';
      modelContainer.className = `${baseClass} ${detailClass} ${failureClasses} ${isOffline ? 'offline' : ''}`.trim();
    }

    function updateCardRuntimeContent(card, robot) {
      if (!card || !robot) return;
      const stateKey = statusFromScore(robot);
      const isCritical = stateKey === 'critical';
      const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
      const normalizedRobotId = robotId(robot);
      const isTesting = isRobotTesting(normalizedRobotId);
      const isSearching = isRobotSearching(normalizedRobotId);
      const isFixing = isRobotFixing(normalizedRobotId);
      const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
      const isCountingDown = isTesting || isSearching || isFixing;
      const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
      const batteryState = robot?.tests?.battery || {};
      const issues = issueSummary(robot);
      const issueText = issues.join(', ') || 'No active errors';

      card.classList.remove('state-ok', 'state-warning', 'state-critical', 'state-offline');
      card.classList.add(isOffline ? 'state-offline' : `state-${stateKey}`);
      card.classList.toggle('error', isCritical);
      card.classList.toggle('offline', isOffline);
      card.classList.toggle('testing', isTesting || isSearching || isFixing);

      const statusChipNode = card.querySelector('[data-role="card-status-chip"]');
      if (statusChipNode) {
        const tone = getStatusChipTone(stateKey);
        statusChipNode.className = `status-chip ${tone.css}`;
        statusChipNode.textContent = tone.text;
      }

      const badgeStrip = card.querySelector('[data-role="badge-strip"]');
      if (badgeStrip) {
        badgeStrip.innerHTML = issues.map((item) => `<span class="error-badge">${item}</span>`).join('');
      }

      const issuesPill = card.querySelector('[data-role="issues-pill"]');
      if (issuesPill) {
        issuesPill.textContent = `Issue cluster: ${issueText}`;
      }

      const movementPill = card.querySelector('[data-role="movement-pill"]');
      if (movementPill) {
        movementPill.textContent = `Movement: ${robot?.tests?.movement?.value || 'n/a'}`;
      }
      const lastFullTestPill = card.querySelector('[data-role="last-full-test-pill"]');
      if (lastFullTestPill) {
        lastFullTestPill.textContent = buildLastFullTestPillLabel(robot);
      }

      const summaryBatteryHost = card.querySelector('[data-role="summary-battery-pill"]');
      if (summaryBatteryHost) {
        summaryBatteryHost.innerHTML = renderBatteryPill({
          value: batteryState.value,
          status: batteryState.status,
          reason: batteryState.reason,
          size: 'default',
        });
      }

      const modelContainer = card.querySelector('.model-wrap .robot-model-slot, .model-wrap .robot-3d');
      setModelContainerFaultClasses(modelContainer, robot, isOffline);

      const modelWrap = card.querySelector('.model-wrap');
      syncModelViewerRotationForContainer(modelWrap, isOffline);
      if (modelWrap) {
        const existingConnectionIcon = modelWrap.querySelector('[data-role="connection-corner-icon"]');
        if (existingConnectionIcon) {
          existingConnectionIcon.remove();
        }
        modelWrap.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
      }

      if (modelWrap) {
        const existingCountdown = modelWrap.querySelector('.scan-countdown');
        if (isCountingDown) {
          if (existingCountdown) {
            existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
            existingCountdown.textContent = testCountdown;
          } else {
            modelWrap.insertAdjacentHTML(
              'beforeend',
              `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
            );
          }
        } else if (existingCountdown) {
          existingCountdown.remove();
        }

        const existingOverlay = modelWrap.querySelector('[data-role="activity-overlay"]');
        const nextOverlayMarkup = buildScanOverlayMarkup({
          isSearching,
          isTesting,
          isFixing,
          compactAutoSearch,
        });
        if (nextOverlayMarkup) {
          if (existingOverlay) {
            existingOverlay.remove();
          }
          modelWrap.insertAdjacentHTML('beforeend', nextOverlayMarkup);
        } else if (existingOverlay) {
          existingOverlay.remove();
        }
      }
    }

    function patchDetailRuntimeContent(robot) {
      if (!robot || !detail.classList.contains('active')) return;
      if (robotId(robot) !== state.detailRobotId) return;

      const statusBar = $('#detailStatusBar');
      const testList = $('#testList');
      const modelHost = $('#detailModel');
      const stateKey = statusFromScore(robot);
      const batteryState = robot?.tests?.battery || {};
      const errorCount = nonBatteryTestEntries(robot).filter(([, t]) => normalizeStatus(t?.status) !== 'ok').length;
      const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
      const normalizedRobotId = robotId(robot);
      const isTesting = isRobotTesting(normalizedRobotId);
      const isSearching = isRobotSearching(normalizedRobotId);
      const isFixing = isRobotFixing(normalizedRobotId);
      const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
      const isCountingDown = isTesting || isSearching || isFixing;
      const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';

      if (statusBar) {
        statusBar.innerHTML = `
          ${statusChip(stateKey, 'detail-status-chip')}
          ${renderBatteryPill({
            value: batteryState.value,
            status: batteryState.status,
            reason: batteryState.reason,
            size: 'small',
          })}
          <span class="pill" data-role="detail-last-full-test-pill">${buildLastFullTestPillLabel(robot, true)}</span>
          <span class="detail-issue-count">${errorCount} issue(s)</span>`;
      }

      const modelContainer = modelHost?.querySelector('.robot-model-slot, .robot-3d') || null;
      setModelContainerFaultClasses(modelContainer, robot, isOffline, true);
      syncModelViewerRotationForContainer(modelHost, isOffline);

      if (modelHost) {
        const existingOverlay = modelHost.querySelector('[data-role="activity-overlay"]');
        const nextOverlayMarkup = buildScanOverlayMarkup({
          isSearching,
          isTesting,
          isFixing,
          compactAutoSearch,
        });
        if (nextOverlayMarkup) {
          if (existingOverlay) existingOverlay.remove();
          modelHost.insertAdjacentHTML('beforeend', nextOverlayMarkup);
        } else if (existingOverlay) {
          existingOverlay.remove();
        }

        const existingCountdown = modelHost.querySelector('.scan-countdown');
        if (isCountingDown) {
          if (existingCountdown) {
            existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
            existingCountdown.textContent = testCountdown;
          } else {
            modelHost.insertAdjacentHTML(
              'beforeend',
              `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
            );
          }
        } else if (existingCountdown) {
          existingCountdown.remove();
        }

        const existingConnectionIcon = modelHost.querySelector('[data-role="connection-corner-icon"]');
        if (existingConnectionIcon) {
          existingConnectionIcon.remove();
        }
        modelHost.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
      }

      if (testList) {
        Object.entries(robot.tests || {}).forEach(([testId, result]) => {
          const escaped =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
              ? CSS.escape(testId)
              : testId.replace(/"/g, '\\"');
          const row = testList.querySelector(`.test-row[data-test-id="${escaped}"]`);
          if (!row) return;
          const status = normalizeStatus(result?.status);
          const value = normalizeText(result?.value, 'n/a');
          const details = normalizeText(result?.details, 'No detail available');
          const statusPill = row.querySelector('[data-role="detail-test-status-pill"]');
          if (statusPill) {
            statusPill.textContent = status.toUpperCase();
          }
          const valueNode = row.querySelector('[data-role="detail-test-value"]');
          if (valueNode) {
            const previewText = buildTestPreviewTextForResult(testId, result);
            valueNode.textContent = previewText;
            valueNode.title = previewText;
          }
          const statusChipNode = row.querySelector('[data-role="detail-test-status-chip"]');
          if (statusChipNode) {
            statusChipNode.className = `status-chip ${status === 'ok' ? 'ok' : status === 'warning' ? 'warn' : 'err'}`;
            statusChipNode.textContent = status;
          }
        });
      }
    }

    function applyRuntimeRobotPatches(changedRobotIds) {
      const changedIds = Array.from(changedRobotIds || []).map((id) => robotId(id)).filter(Boolean);
      if (!changedIds.length) return;

      const visibleList = applyFilters();
      const visibleIds = new Set(visibleList.map((robot) => robotId(robot)));

      changedIds.forEach((id) => {
        const robot = getRobotById(id);
        const currentCard = queryCardByRobotId(id);
        const shouldBeVisible = visibleIds.has(id);
        if (!shouldBeVisible) {
          if (currentCard) currentCard.remove();
          return;
        }

        const isOnline = normalizeStatus(robot?.tests?.online?.status) === 'ok';
        const targetGrid = isOnline ? onlineGrid : offlineGrid;
        let card = currentCard;
        if (!card) {
          card = renderCard(robot);
        }
        updateCardRuntimeContent(card, robot);
        if (targetGrid && card.parentElement !== targetGrid) {
          targetGrid.appendChild(card);
        }
      });

      if (onlineGrid) {
        const sortedOnlineIds = sortOnlineRobots(
          visibleList.filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok'),
        )
          .map((robot) => robotId(robot))
          .filter(Boolean);
        sortedOnlineIds.forEach((id) => {
          const card = queryCardByRobotId(id);
          if (card && card.parentElement === onlineGrid) {
            onlineGrid.appendChild(card);
          }
        });
      }

      applyDashboardMetaFromVisible(visibleList);
      if (state.detailRobotId) {
        const activeRobot = getRobotById(state.detailRobotId);
        patchDetailRuntimeContent(activeRobot);
      }
    }

    function updateFleetOnlineSummary(onlineNames, offlineNames, skippedNames = []) {
      const summary = $('#fleetOnlineSummary');
      if (!summary) return;

      const total = state.robots.length;
      const skippedCount = Array.isArray(skippedNames) ? skippedNames.length : 0;
      summary.style.display = 'block';
      summary.innerHTML = `
        <div style="font-size: 0.92rem; margin-bottom: 0.35rem; opacity: 0.9;">
          Online check complete • ${onlineNames.length} reachable / ${Math.max(0, total - skippedCount)} checked
        </div>
        <div><strong>Reachable:</strong> ${onlineNames.length ? onlineNames.join(', ') : 'none'}</div>
        <div><strong>Unreachable:</strong> ${offlineNames.length ? offlineNames.join(', ') : 'none'}</div>
        <div><strong>Skipped (busy):</strong> ${skippedCount ? skippedNames.join(', ') : 'none'}</div>
      `;
      state.onlineRefreshSummary = {
        onlineCount: onlineNames.length,
        offlineCount: offlineNames.length,
        skippedCount,
        totalCount: total,
      };
    }

    function setFleetOnlineButtonState(isRunning) {
      const runAllButton = $('#runFleetOnline');
      if (!runAllButton) return;
      const idleLabel = normalizeText(runAllButton.dataset.idleLabel, 'Refresh online');
      setActionButtonLoading(runAllButton, isRunning, {
        loadingLabel: 'Refreshing...',
        idleLabel,
      });
      if (!isRunning) {
        updateFleetOnlineRefreshStatus();
      }
    }

    function selectAllRobots() {
      const allIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
      if (areAllRobotIdsSelected(allIds)) {
        selectRobotIds([], false);
        return;
      }
      selectRobotIds(allIds, true);
    }

    function getVisibleOnlineRobotIds() {
      return applyFilters()
        .filter((robot) => normalizeStatus(robot?.tests?.online?.status) === 'ok')
        .map((robot) => robotId(robot));
    }

    function getVisibleOfflineRobotIds() {
      return applyFilters()
        .filter((robot) => normalizeStatus(robot?.tests?.online?.status) !== 'ok')
        .map((robot) => robotId(robot));
    }

    function syncSectionToggleButtons() {
      const onlineButton = $('#selectAllOnlineRobots');
      const offlineButton = $('#selectAllOfflineRobots');

      const onlineIds = getVisibleOnlineRobotIds();
      const offlineIds = getVisibleOfflineRobotIds();

      if (onlineButton) {
        const allOnlineSelected = areAllRobotIdsSelected(onlineIds);
        applyActionButton(onlineButton, {
          intent: 'selection',
          pressed: allOnlineSelected,
          disabled: onlineIds.length === 0,
          label: allOnlineSelected ? 'Deselect all online' : 'Select all online',
          compact: true,
        });
        onlineButton.classList.toggle('toggle-on', allOnlineSelected);
        onlineButton.setAttribute('aria-pressed', allOnlineSelected ? 'true' : 'false');
      }

      if (offlineButton) {
        const allOfflineSelected = areAllRobotIdsSelected(offlineIds);
        applyActionButton(offlineButton, {
          intent: 'selection',
          pressed: allOfflineSelected,
          disabled: offlineIds.length === 0,
          label: allOfflineSelected ? 'Deselect all offline' : 'Select all offline',
          compact: true,
        });
        offlineButton.classList.toggle('toggle-on', allOfflineSelected);
        offlineButton.setAttribute('aria-pressed', allOfflineSelected ? 'true' : 'false');
      }
    }

    function selectAllOnlineRobots() {
      const ids = getVisibleOnlineRobotIds();
      if (areAllRobotIdsSelected(ids)) {
        removeRobotIdsFromSelection(ids);
        return;
      }
      addRobotIdsToSelection(ids);
    }

    function selectAllOfflineRobots() {
      const ids = getVisibleOfflineRobotIds();
      if (areAllRobotIdsSelected(ids)) {
        removeRobotIdsFromSelection(ids);
        return;
      }
      addRobotIdsToSelection(ids);
    }

    function getFixModeElements(context) {
      if (context === FIX_MODE_CONTEXT_DETAIL) {
        return {
          panel: detailFixModePanel,
          summary: detailFixModeSummary,
          actions: detailFixModeActions,
          status: detailFixModeStatus,
          toggleButton: toggleDetailFixModeButton,
          active: detail.classList.contains('active'),
        };
      }
      return {
        panel: dashboardFixModePanel,
        summary: dashboardFixModeSummary,
        actions: dashboardFixModeActions,
        status: dashboardFixModeStatus,
        toggleButton: toggleDashboardFixModeButton,
        active: dashboard.classList.contains('active'),
      };
    }

    function setFixModeStatus(context, message = '', tone = '') {
      const elements = getFixModeElements(context);
      if (!elements.status) return;
      elements.status.textContent = message;
      elements.status.classList.remove('ok', 'warn', 'error');
      if (tone) {
        elements.status.classList.add(tone);
      }
    }

    function getDashboardFixCandidates() {
      const selectedRobots = state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot)));
      const byKey = new Map();
      selectedRobots.forEach((robot) => {
        const typeLabel = normalizeText(robot.type, normalizeText(robot.typeId, 'Unknown type'));
        const typeKey = normalizeTypeId(robot.typeId || typeLabel || '');
        getAutoFixesForType(robot.typeId).forEach((fix) => {
          const key = `${typeKey}:${fix.id}`;
          if (!byKey.has(key)) {
            byKey.set(key, {
              key,
                id: fix.id,
                label: fix.label,
                description: fix.description,
              postTestIds: fix.postTestIds || [],
              typeLabel,
              robotIds: [],
            });
          }
          byKey.get(key).robotIds.push(robotId(robot));
        });
      });
      return {
        selectedCount: selectedRobots.length,
        candidates: Array.from(byKey.values()).sort((a, b) => {
          const byLabel = a.label.localeCompare(b.label);
          if (byLabel !== 0) return byLabel;
          return a.typeLabel.localeCompare(b.typeLabel);
        }),
      };
    }

    function getDetailFixCandidates() {
      const robot = getRobotById(state.detailRobotId);
      if (!robot) {
        return { robot: null, candidates: [] };
      }
      const candidates = getAutoFixesForType(robot.typeId).map((fix) => ({
        key: `${normalizeTypeId(robot.typeId)}:${fix.id}`,
        id: fix.id,
        label: fix.label,
        description: fix.description,
        postTestIds: fix.postTestIds || [],
        typeLabel: robot.type,
        robotIds: [robotId(robot)],
      }));
      return { robot, candidates };
    }

    function syncFixModeToggleButton(context) {
      const elements = getFixModeElements(context);
      const open = !!state.fixModeOpen[context];
      if (!elements.toggleButton) return;
      const label = open ? 'Exit fix mode' : 'Enter fix mode';
      applyActionButton(elements.toggleButton, {
        intent: 'fix',
        pressed: open,
        disabled: state.isAutoFixInProgress,
        label,
      });
      elements.toggleButton.setAttribute('aria-pressed', open ? 'true' : 'false');
    }

    function buildFixButtonLabel(candidate, includeTypeLabel = false) {
      const countLabel = candidate.robotIds.length > 1 ? ` (${candidate.robotIds.length})` : '';
      if (!includeTypeLabel) {
        return `${candidate.label}${countLabel}`;
      }
      return `${candidate.label} • ${candidate.typeLabel}${countLabel}`;
    }

    async function runAutoFixForRobot(robot, candidate) {
      if (!robot || !candidate) return;
      const normalizedRobotId = robotId(robot);
      const configuredPostTestIds = Array.isArray(candidate.postTestIds) ? candidate.postTestIds : [];
      let sawPostTests = false;

      const currentOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
      if (currentOnlineStatus !== 'ok') {
        appendTerminalLine(
          `Robot ${robot.name || normalizedRobotId} is not online. Running online check first...`,
          'warn',
        );
        setRobotSearching(normalizedRobotId, true, getOnlineCheckCountdownMs());
        const onlineStatus = await runOneRobotOnlineCheck(robot);
        setRobotSearching(normalizedRobotId, false);
        updateOnlineCheckEstimateFromResults([onlineStatus]);
        state.robots = state.robots.map((item) =>
          robotId(item) === normalizedRobotId
            ? {
                ...item,
                tests: {
                  ...(item.tests || {}),
                  online: {
                    status: onlineStatus.status,
                    value: onlineStatus.value,
                    details: onlineStatus.details,
                  },
                },
              }
            : item,
        );
        renderDashboard();
        const activeRobotPostOnline = state.robots.find((item) => robotId(item) === state.detailRobotId);
        if (activeRobotPostOnline) {
          renderDetail(activeRobotPostOnline);
        }
        if (normalizeStatus(onlineStatus.status) !== 'ok') {
          throw new Error(`Robot is offline (${onlineStatus.details}).`);
        }
      }

      setRobotFixing(normalizedRobotId, true, TEST_STEP_TIMEOUT_MS * 2);
      setRobotTesting(normalizedRobotId, false);

      let runId = '';
      let cursor = 0;
      let finalPayload = null;

      const startResponse = await fetch(buildApiUrl(`/api/robots/${encodeURIComponent(normalizedRobotId)}/fixes/${encodeURIComponent(candidate.id)}/runs`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSessionId: state.pageSessionId,
        }),
      });
      if (!startResponse.ok) {
        const message = await startResponse.text();
        throw new Error(message || `HTTP ${startResponse.status}`);
      }
      const startPayload = await startResponse.json();
      runId = normalizeText(startPayload?.runId, '');
      if (!runId) {
        throw new Error('Fix run did not return a runId');
      }

      appendTerminalLine(`Started auto-fix "${candidate.label}" on ${robot.name} (run ${runId}).`, 'warn');

      while (true) {
        const response = await fetch(
          buildApiUrl(`/api/robots/${encodeURIComponent(normalizedRobotId)}/fixes/runs/${encodeURIComponent(runId)}`),
          { method: 'GET' },
        );
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        const payload = await response.json();
        finalPayload = payload;

        const events = Array.isArray(payload?.events) ? payload.events : [];
        const unseen = events.slice(cursor);
        cursor = events.length;
        unseen.forEach((event) => {
          const message = normalizeText(event?.message, '');
          if (message) {
            const tone = normalizeText(event?.type, '').includes('failed') ? 'err' : 'warn';
            appendTerminalLine(message, tone);
          }
          const eventData = event?.data;
          if (eventData && typeof eventData === 'object' && eventData.output !== undefined) {
            appendTerminalPayload(eventData.output);
          }
          if (normalizeText(event?.type, '') === 'post_tests_started') {
            sawPostTests = true;
            setRobotFixing(normalizedRobotId, false);
            setRobotTesting(
              normalizedRobotId,
              true,
              estimateTestCountdownMsFromBody({ testIds: configuredPostTestIds }),
            );
          }
          if (normalizeText(event?.type, '') === 'post_tests_finished') {
            setRobotTesting(normalizedRobotId, false);
          }
        });

        const status = normalizeText(payload?.status, '').toLowerCase();
        if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, FIX_JOB_POLL_INTERVAL_MS));
      }

      if (sawPostTests) {
        setRobotTesting(normalizedRobotId, false);
      }
      setRobotFixing(normalizedRobotId, false);

      const status = normalizeText(finalPayload?.status, '').toLowerCase();
      if (status !== 'succeeded') {
        const errorMessage = normalizeText(finalPayload?.error, `Auto-fix failed with status: ${status || 'unknown'}`);
        throw new Error(errorMessage);
      }

      const testResults = Array.isArray(finalPayload?.testRun?.results) ? finalPayload.testRun.results : [];
      if (testResults.length) {
        updateRobotTestState(normalizedRobotId, testResults, finalPayload?.testRun || {});
      }
    }

    async function runAutoFixCandidate(context, candidate) {
      if (state.isAutoFixInProgress || state.isTestRunInProgress || state.isOnlineRefreshInFlight) return;
      const robotIds = (candidate?.robotIds || []).map((id) => robotId(id)).filter(Boolean);
      if (!robotIds.length) {
        setFixModeStatus(context, 'No robots available for this fix action.', 'warn');
        return;
      }

      state.isAutoFixInProgress = true;
      syncFixModePanels();
      setFixModeStatus(context, `Running "${candidate.label}" on ${robotIds.length} robot(s)...`, 'warn');

      try {
        let successCount = 0;
        let failureCount = 0;
        const workerCount = Math.max(1, Math.min(getFleetParallelism(), robotIds.length));
        setFixModeStatus(
          context,
          `Running "${candidate.label}" on ${robotIds.length} robot(s) with parallelism ${workerCount}...`,
          'warn',
        );
        const queue = [...robotIds];
        const workers = Array.from({ length: workerCount }, () => (async () => {
          while (queue.length) {
            const targetId = queue.shift();
            if (!targetId) break;
            const targetRobot = getRobotById(targetId);
            if (!targetRobot) {
              failureCount += 1;
              continue;
            }
            try {
              await runAutoFixForRobot(targetRobot, candidate);
              successCount += 1;
            } catch (error) {
              failureCount += 1;
              const message = error instanceof Error ? error.message : String(error);
              appendTerminalLine(`Auto-fix failed for ${targetRobot.name}: ${message}`, 'err');
            }
          }
        })());
        await Promise.all(workers);

        renderDashboard();
        const activeRobot = getRobotById(state.detailRobotId);
        if (activeRobot) {
          renderDetail(activeRobot);
        }

        if (failureCount === 0) {
          setFixModeStatus(context, `Auto-fix "${candidate.label}" completed (${successCount}/${robotIds.length}).`, 'ok');
        } else {
          setFixModeStatus(
            context,
            `Auto-fix "${candidate.label}" completed (${successCount} succeeded, ${failureCount} failed).`,
            'warn',
          );
        }
      } finally {
        state.isAutoFixInProgress = false;
        syncFixModePanels();
      }
    }

    function renderFixModeActionsForContext(context) {
      const elements = getFixModeElements(context);
      if (!elements.actions || !elements.summary) return;
      elements.actions.replaceChildren();

      if (context === FIX_MODE_CONTEXT_DETAIL) {
        const detailPayload = getDetailFixCandidates();
        const robot = detailPayload.robot;
        const candidates = detailPayload.candidates;
        if (!robot) {
          elements.summary.textContent = 'Open a robot detail page to use fix mode.';
          const empty = document.createElement('span');
          empty.className = 'fix-mode-empty';
          empty.textContent = 'No robot in context.';
          elements.actions.appendChild(empty);
          return;
        }
        if (!candidates.length) {
          elements.summary.textContent = `${robot.name} has no auto fixes configured.`;
          const empty = document.createElement('span');
          empty.className = 'fix-mode-empty';
          empty.textContent = 'No fixes available for this robot type.';
          elements.actions.appendChild(empty);
          return;
        }

        elements.summary.textContent = `${candidates.length} fix action(s) available for ${robot.name}.`;
        candidates.forEach((candidate) => {
          const button = createActionButton({
            intent: 'fix',
            compact: true,
            label: buildFixButtonLabel(candidate, false),
            title: candidate.description || `Run ${candidate.label}`,
            disabled: state.isAutoFixInProgress,
          });
          button.addEventListener('click', () => {
            runAutoFixCandidate(context, candidate);
          });
          elements.actions.appendChild(button);
        });
        return;
      }

      const payload = getDashboardFixCandidates();
      const candidates = payload.candidates;
      if (!payload.selectedCount) {
        elements.summary.textContent = 'Select one or more robots to see available fixes.';
        const empty = document.createElement('span');
        empty.className = 'fix-mode-empty';
        empty.textContent = 'No selected robots.';
        elements.actions.appendChild(empty);
        return;
      }
      if (!candidates.length) {
        elements.summary.textContent = 'No auto fixes are configured for the selected robots.';
        const empty = document.createElement('span');
        empty.className = 'fix-mode-empty';
        empty.textContent = 'Selected types have no fixes.';
        elements.actions.appendChild(empty);
        return;
      }

      elements.summary.textContent =
        `${candidates.length} fix action(s) across ${payload.selectedCount} selected robot(s).`;
      candidates.forEach((candidate) => {
        const button = createActionButton({
          intent: 'fix',
          compact: true,
          label: buildFixButtonLabel(candidate, true),
          title: candidate.description || `Run ${candidate.label} for ${candidate.typeLabel}`,
          disabled: state.isAutoFixInProgress,
        });
        button.addEventListener('click', () => {
          runAutoFixCandidate(context, candidate);
        });
        elements.actions.appendChild(button);
      });
    }

    function syncFixModePanels() {
      [FIX_MODE_CONTEXT_DASHBOARD, FIX_MODE_CONTEXT_DETAIL].forEach((context) => {
        const elements = getFixModeElements(context);
        const open = !!state.fixModeOpen[context];
        if (elements.panel) {
          const shouldShow = open && elements.active;
          elements.panel.classList.toggle('hidden', !shouldShow);
        }
        syncFixModeToggleButton(context);
        if (open) {
          renderFixModeActionsForContext(context);
        }
      });
    }

    function toggleFixMode(context) {
      if (state.isAutoFixInProgress) return;
      state.fixModeOpen[context] = !state.fixModeOpen[context];
      if (!state.fixModeOpen[context]) {
        setFixModeStatus(context, '');
      }
      syncFixModePanels();
    }

    async function runOnlineCheckForAllRobots() {
      if (!state.robots.length || state.isOnlineRefreshInFlight || state.isAutoFixInProgress) return;

      const activeRobotIds = state.robots.map((robot) => robotId(robot)).filter(Boolean);
      if (!activeRobotIds.length) return;
      const busyRobotIds = activeRobotIds.filter((id) => isRobotBusyForOnlineRefresh(id));
      const busyRobotIdSet = new Set(busyRobotIds);
      const eligibleRobotIds = activeRobotIds.filter((id) => !busyRobotIdSet.has(id));
      const skippedNameSet = new Set(
        busyRobotIds
          .map((id) => {
            const robot = getRobotById(id);
            return normalizeText(robot?.name, id);
          })
          .filter(Boolean),
      );
      if (!eligibleRobotIds.length) {
        state.onlineRefreshLastAt = Date.now();
        state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
        startOnlineRefreshStatusTimer();
        updateFleetOnlineSummary([], [], Array.from(skippedNameSet).sort());
        return;
      }

      state.isOnlineRefreshInFlight = true;
      setFleetOnlineButtonState(true);
      state.onlineRefreshStartedAt = Date.now();
      state.onlineRefreshNextAt = 0;
      startOnlineRefreshStatusTimer();
      setRobotSearchingBulk(eligibleRobotIds, true, getOnlineCheckCountdownMs());

      const onlineNames = [];
      const offlineNames = [];
      try {
        let batchResponse = null;
        try {
          batchResponse = await fetch(buildApiUrl('/api/robots/online-check'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              robotIds: eligibleRobotIds,
              pageSessionId: state.pageSessionId,
              forceRefresh: true,
              timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
              parallelism: getFleetParallelism(),
            }),
          });
        } catch (_error) {
          batchResponse = null;
        }

        if (batchResponse && batchResponse.ok) {
          const payload = await batchResponse.json();
          updateOnlineCheckEstimateFromResults(payload?.results);
          const byId = new Map();
          if (Array.isArray(payload?.results)) {
            payload.results.forEach((entry) => {
              const id = normalizeText(entry?.robotId, '');
              if (!id) return;
              byId.set(id, {
                status: normalizeStatus(entry?.status),
                value: normalizeText(entry?.value, 'n/a'),
                details: normalizeText(entry?.details, 'No detail available'),
                skipped: Boolean(entry?.skipped),
              });
            });
          }

          state.robots = state.robots.map((robot) => {
            const normalizedRobotId = robotId(robot);
            if (!normalizedRobotId) return robot;
            const label = normalizeText(robot.name, normalizedRobotId);
            const statusUpdate = byId.get(normalizedRobotId);
            if (!statusUpdate || statusUpdate.skipped) {
              if (busyRobotIdSet.has(normalizedRobotId) || statusUpdate?.skipped) {
                skippedNameSet.add(label);
              }
              return robot;
            }
            if (statusUpdate.status === 'ok') {
              onlineNames.push(label);
            } else {
              offlineNames.push(label);
            }
            return {
              ...robot,
              tests: {
                ...(robot.tests || {}),
                online: statusUpdate,
              },
            };
          });
        } else {
          const fallbackOnlineResults = [];
          const fallbackUpdates = await Promise.all(eligibleRobotIds.map(async (normalizedRobotId) => {
            const robot = getRobotById(normalizedRobotId);
            if (!robot) return null;
            const statusUpdate = await runOneRobotOnlineCheck(robot);
            return {
              robotId: normalizedRobotId,
              statusUpdate,
            };
          }));
          const fallbackById = new Map();
          fallbackUpdates.forEach((entry) => {
            if (!entry) return;
            fallbackById.set(entry.robotId, entry.statusUpdate);
            if (!entry.statusUpdate?.skipped) {
              fallbackOnlineResults.push(entry.statusUpdate);
            }
          });

          state.robots = state.robots.map((robot) => {
            const normalizedRobotId = robotId(robot);
            if (!normalizedRobotId) return robot;
            const label = normalizeText(robot.name, normalizedRobotId);
            const statusUpdate = fallbackById.get(normalizedRobotId);
            if (!statusUpdate || statusUpdate.skipped) {
              if (statusUpdate?.skipped) {
                skippedNameSet.add(label);
              }
              return robot;
            }
            if (statusUpdate.status === 'ok') {
              onlineNames.push(label);
            } else {
              offlineNames.push(label);
            }
            return {
              ...robot,
              tests: {
                ...(robot.tests || {}),
                online: {
                  status: statusUpdate.status,
                  value: statusUpdate.value,
                  details: statusUpdate.details,
                },
              },
            };
          });

          updateOnlineCheckEstimateFromResults(fallbackOnlineResults);
        }

        renderDashboard();
        updateFleetOnlineSummary(onlineNames, offlineNames, Array.from(skippedNameSet).sort());
      } finally {
        state.isOnlineRefreshInFlight = false;
        setFleetOnlineButtonState(false);
        setRobotSearchingBulk(eligibleRobotIds, false);
        state.onlineRefreshLastAt = Date.now();
        state.onlineRefreshNextAt = state.onlineRefreshLastAt + getMonitorOnlineIntervalMs();
        startOnlineRefreshStatusTimer();
      }
    }

    async function runOneRobotOnlineCheck(robot) {
      const normalizedRobotId = robotId(robot);
      if (!normalizedRobotId) {
        return {
          status: 'error',
          value: 'unreachable',
          details: 'Robot identifier is missing for online check.',
          ms: 0,
        };
      }

      try {
        const response = await fetch(
          buildApiUrl('/api/robots/online-check'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              robotIds: [normalizedRobotId],
              pageSessionId: state.pageSessionId,
              forceRefresh: true,
              timeoutSec: ONLINE_CHECK_TIMEOUT_MS / 1000,
              parallelism: getFleetParallelism(),
            }),
          },
        );
        if (!response.ok) {
          const text = await response.text();
          return {
            status: 'error',
            value: 'unreachable',
            details: `HTTP ${response.status}: ${text || 'Unable to run online test'}`,
            ms: 0,
          };
        }

        const payload = await response.json();
        const onlineResult = Array.isArray(payload?.results)
          ? payload.results.find((result) => normalizeText(result?.robotId, '') === normalizedRobotId)
          : null;

        if (!onlineResult) {
          return {
            status: 'error',
            value: 'unreachable',
            details: 'Backend returned no online test result.',
            ms: 0,
          };
        }

        return {
          status: normalizeStatus(onlineResult.status),
          value: normalizeText(onlineResult.value, 'n/a'),
          details: normalizeText(onlineResult.details, 'No detail available'),
          ms: Number.isFinite(Number(onlineResult.ms)) ? Number(onlineResult.ms) : 0,
          skipped: Boolean(onlineResult?.skipped),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          status: 'error',
          value: 'unreachable',
          details: `Unable to run online test: ${message}`,
          ms: 0,
        };
      }
    }

    async function runRobotTestsForRobot(robotId, body) {
      const response = await fetch(buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/tests/run`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(body || {}),
          pageSessionId: normalizeText(body?.pageSessionId, state.pageSessionId),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to execute tests');
      }

      const payload = await response.json();
      return {
        robotId,
        runId: normalizeText(payload?.runId, ''),
        startedAt: Number.isFinite(Number(payload?.startedAt)) ? Number(payload.startedAt) : 0,
        finishedAt: Number.isFinite(Number(payload?.finishedAt)) ? Number(payload.finishedAt) : 0,
        results: Array.isArray(payload?.results) ? payload.results : [],
      };
    }

    function getRobotIdsForRun(options = {}) {
      const selectedIds = getSelectedRobotIds().filter((id) => robotId(id));

      if (selectedIds.length) return selectedIds;

      if (options.autoSelectOnlineWhenEmpty) {
        const reachableIds = getReachableRobotIds().filter((id) => robotId(id));
        if (reachableIds.length) {
          selectRobotIds(reachableIds);
          return reachableIds;
        }
        return [];
      }

      if (options.fallbackToActive && state.detailRobotId) {
        return [state.detailRobotId];
      }

      return [];
    }

    function getConfiguredDefaultTestIds(robot, includeOnline = false) {
      const byDefinition =
        Array.isArray(robot?.testDefinitions) && robot.testDefinitions.length
          ? robot.testDefinitions
          : TEST_DEFINITIONS;
      const fromDefinitions = byDefinition
        .map((item) => normalizeText(item?.id, ''))
        .filter(Boolean);

      const fromCurrentTests = Object.keys(robot?.tests || {}).map((id) => normalizeText(id, ''));
      const candidates = new Set([...fromDefinitions, ...fromCurrentTests]);
      const testIds = Array.from(candidates).filter((id) => id && (includeOnline || id !== 'online'));
      if (testIds.length) return testIds;
      return TEST_DEFINITIONS
        .map((item) => normalizeText(item?.id, ''))
        .filter((id) => id && (includeOnline || id !== 'online'));
    }

    function normalizeStepDebug(step) {
      if (!step || typeof step !== 'object') return null;
      return {
        id: normalizeText(step.id, 'step'),
        status: normalizeStatus(step.status),
        value: normalizeText(step.value, 'n/a'),
        details: normalizeText(step.details, 'No detail available'),
        ms: Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0,
        output: normalizeText(step.output, ''),
      };
    }

    function normalizeTestDebugResult(result) {
      if (!result || typeof result !== 'object') return null;
      const steps = Array.isArray(result.steps) ? result.steps.map(normalizeStepDebug).filter(Boolean) : [];
      return {
        id: normalizeText(result.id, ''),
        status: normalizeStatus(result.status),
        value: normalizeText(result.value, 'n/a'),
        details: normalizeText(result.details, 'No detail available'),
        ms: Number.isFinite(Number(result.ms)) ? Number(result.ms) : 0,
        raw: result.raw && typeof result.raw === 'object' ? result.raw : {},
        steps,
      };
    }

    function normalizeTestDebugCollection(rawCollection) {
      if (!rawCollection || typeof rawCollection !== 'object') return {};
      const entries = Array.isArray(rawCollection)
        ? rawCollection.map((entry) => [normalizeText(entry?.id, ''), entry])
        : Object.entries(rawCollection);
      const normalized = {};
      entries.forEach(([rawId, rawValue]) => {
        const base = rawValue && typeof rawValue === 'object' ? rawValue : {};
        const id = normalizeText(rawId, normalizeText(base.id, ''));
        if (!id) return;
        const debugResult = normalizeTestDebugResult({ ...base, id });
        if (!debugResult) return;
        normalized[id] = {
          ...debugResult,
          runId: normalizeText(base.runId, ''),
          startedAt: Number.isFinite(Number(base.startedAt)) ? Number(base.startedAt) : 0,
          finishedAt: Number.isFinite(Number(base.finishedAt)) ? Number(base.finishedAt) : 0,
        };
      });
      return normalized;
    }

    function updateRobotTestState(robotIdValue, results, runMeta = {}) {
      const id = robotId(robotIdValue);
      if (!id) return;
      if (!results.length) return;

      const robot = state.robots.find((item) => robotId(item) === id);
      const updates = { ...(robot?.tests || {}) };
      const debugUpdates = { ...(robot?.testDebug || {}) };
      results.forEach((result) => {
        if (!result || typeof result !== 'object') return;
        const resultId = normalizeText(result.id, '');
        if (!resultId) return;
        updates[resultId] = {
          status: normalizeStatus(result.status),
          value: normalizeText(result.value, 'n/a'),
          details: normalizeText(result.details, 'No detail available'),
          reason: normalizeText(result.reason, ''),
        };
        const debugResult = normalizeTestDebugResult(result);
        if (debugResult) {
          debugUpdates[resultId] = {
            ...debugResult,
            runId: normalizeText(runMeta.runId, ''),
            startedAt: Number.isFinite(Number(runMeta.startedAt)) ? Number(runMeta.startedAt) : 0,
            finishedAt: Number.isFinite(Number(runMeta.finishedAt)) ? Number(runMeta.finishedAt) : 0,
          };
        }
      });

      const hasExplicitOnlineResult = results.some(
        (result) => normalizeText(result?.id, '') === 'online',
      );
      const existingOnline = robot?.tests?.online;
      const existingOnlineStatus = normalizeStatus(existingOnline?.status);
      const existingOnlineValue = normalizeText(existingOnline?.value, '').toLowerCase();
      const existingOnlineDetails = normalizeText(existingOnline?.details, '').toLowerCase();
      const existingOnlineCheckedAt = Number(existingOnline?.checkedAt);
      const isPlaceholderOnline =
        existingOnlineStatus === 'warning' &&
        (existingOnlineValue === '' || existingOnlineValue === 'unknown') &&
        (existingOnlineDetails === '' || existingOnlineDetails === 'not checked yet');
      const hasRecentExplicitOnline =
        !!existingOnline &&
        !isPlaceholderOnline &&
        (!Number.isFinite(existingOnlineCheckedAt) || existingOnlineCheckedAt <= 0 || (Date.now() / 1000) - existingOnlineCheckedAt <= 15);
      if (!hasExplicitOnlineResult && !hasRecentExplicitOnline) {
        const nonOnlineResults = results.filter(
          (result) => normalizeText(result?.id, '') !== 'online',
        );
        const anyNonError = nonOnlineResults.some(
          (result) => normalizeStatus(result?.status) !== 'error',
        );
        const allSshFailures =
          nonOnlineResults.length > 0 &&
          nonOnlineResults.every((result) => {
            if (normalizeStatus(result?.status) !== 'error') return false;
            const details = normalizeText(result?.details, '').toLowerCase();
            const value = normalizeText(result?.value, '').toLowerCase();
            return (
              details.includes('ssh') ||
              details.includes('connect') ||
              details.includes('auth') ||
              value === 'execution_error' ||
              value === 'command_error'
            );
          });

        if (anyNonError) {
          updates.online = {
            status: 'ok',
            value: 'reachable',
            details: 'Inferred online: at least one test command executed.',
          };
        } else if (allSshFailures) {
          updates.online = {
            status: 'error',
            value: 'unreachable',
            details: 'Inferred offline: test execution failed for SSH/connectivity reasons.',
          };
        }
      }

      if (!Object.keys(updates).length) return;

      state.robots = state.robots.map((item) =>
        robotId(item) === id
          ? {
              ...item,
              tests: updates,
              testDebug: debugUpdates,
            }
          : item,
      );
    }

    function setRunningButtonState(isRunning) {
      const runButton = $('#runRobotTests');
      const runSelectedButton = $('#runSelectedRobotTests');

      if (runButton) {
        setActionButtonLoading(runButton, isRunning, {
          loadingLabel: 'Running tests...',
          idleLabel: 'Run tests',
        });
      }
      if (runSelectedButton) {
        setActionButtonLoading(runSelectedButton, isRunning, {
          loadingLabel: 'Running selected tests...',
          idleLabel: getRunSelectedButtonIdleLabel(),
        });
      }
    }

    function renderDetail(robot) {
      const model = $('#detailModel');
      const testList = $('#testList');
      const titleBar = $('#detailTitleBar');
      const statusBar = $('#detailStatusBar');

      if (!robot) return;

      const stateKey = statusFromScore(robot);
      const normalizedRobotId = robotId(robot);
      const errorCount = nonBatteryTestEntries(robot).filter(([, t]) => t.status !== 'ok').length;
      const batteryState = robot?.tests?.battery || {};
      const isTesting = isRobotTesting(normalizedRobotId);
      const isSearching = isRobotSearching(normalizedRobotId);
      const isFixing = isRobotFixing(normalizedRobotId);
      const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
      const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
      const isCountingDown = isTesting || isSearching || isFixing;
      const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';

      if (titleBar) {
        titleBar.innerHTML = `
          <span class="detail-title-main">${robot.name}</span>
          <span class="detail-title-type">(${robot.type})</span>`;
      }
      if (statusBar) {
        statusBar.innerHTML = `
          ${statusChip(stateKey, 'detail-status-chip')}
          ${renderBatteryPill({
            value: batteryState.value,
            status: batteryState.status,
            reason: batteryState.reason,
            size: 'small',
          })}
          <span class="pill" data-role="detail-last-full-test-pill">${buildLastFullTestPillLabel(robot, true)}</span>
          <span class="detail-issue-count">${errorCount} issue(s)</span>`;
      }

      const modelMarkup = buildRobotModelContainer(
        robot,
        `detail-model ${nonBatteryTestEntries(robot)
          .filter(([, test]) => test.status !== 'ok')
          .map(([id]) => `fault-${id}`)
          .join(' ')}`,
        isOffline,
      );
      const scanningMarkup = buildScanOverlayMarkup({
        isSearching,
        isTesting,
        isFixing,
        compactAutoSearch,
      });
      const countdownMarkup = isCountingDown
        ? `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`
        : '';
      const connectionIconMarkup = buildConnectionCornerIconMarkup(isOffline, compactAutoSearch);
      model.innerHTML = `${modelMarkup}${scanningMarkup}${countdownMarkup}${connectionIconMarkup}`;
      syncModelViewerRotationForContainer(model, isOffline);

      testList.replaceChildren();
      const definitions = robot?.testDefinitions || TEST_DEFINITIONS;
      definitions.forEach((def) => {
        const result = robot.tests[def.id];
        const icon = getTestIconPresentation(def.id, def.icon);
        const previewText = buildTestPreviewTextForResult(def.id, result);
        const row = document.createElement('div');
        row.className = 'test-row';
        row.setAttribute('data-test-id', def.id);
        row.innerHTML = `
          <div class="test-info">
            <span class="test-title">
              <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
              <span class="test-title-label">${def.label}</span>
              <span class="pill" data-role="detail-test-status-pill" style="font-size: 0.72rem; background: rgba(255,255,255,0.05);">${result.status.toUpperCase()}</span>
            </span>
            <span class="test-value" data-role="detail-test-value">${previewText}</span>
          </div>
            <div class="test-actions">
            <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${def.id}" title="Show detailed output">Info</button>
            <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
          </div>`;
        const valueNode = row.querySelector('[data-role="detail-test-value"]');
        if (valueNode) {
          valueNode.title = previewText;
        }
        const infoButton = row.querySelector(`[data-test-id="${def.id}"]`);
        if (infoButton) {
          infoButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openTestDebugModal(robot, def.id);
          });
        }
        testList.appendChild(row);
      });

      // Extra tests added by backend but not in the current UI catalog.
      Object.entries(robot.tests)
        .filter(([id]) => !definitions.find((test) => test.id === id))
        .forEach(([id, result]) => {
          const icon = getTestIconPresentation(id, '⚙️');
          const previewText = buildTestPreviewTextForResult(id, result);
          const row = document.createElement('div');
          row.className = 'test-row';
          row.setAttribute('data-test-id', id);
          row.innerHTML = `
            <div class="test-info">
              <span class="test-title">
                <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
                <span class="test-title-label">${id}</span>
                <span class="pill" data-role="detail-test-status-pill" style="font-size: 0.72rem; background: rgba(255,255,255,0.05);">${result.status.toUpperCase()}</span>
              </span>
              <span class="test-value" data-role="detail-test-value">${previewText}</span>
            </div>
            <div class="test-actions">
              <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${id}" title="Show detailed output">Info</button>
              <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
            </div>`;
          const valueNode = row.querySelector('[data-role="detail-test-value"]');
          if (valueNode) {
            valueNode.title = previewText;
          }
          const infoButton = row.querySelector(`[data-test-id="${id}"]`);
          if (infoButton) {
            infoButton.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              openTestDebugModal(robot, id);
            });
          }
          testList.appendChild(row);
        });

      const detailId = robotId(robot);
      if (state.activeTerminalRobotId !== detailId) {
        closeTerminalSession();
        setTerminalInactive(robot);
      } else {
        setTerminalActive();
      }
      hydrateActionButtons(detail);
      if (state.fixModeOpen.detail) {
        renderFixModeActionsForContext(FIX_MODE_CONTEXT_DETAIL);
      }
    }

    async function runManualTests(options = {}) {
      if (state.isTestRunInProgress) {
        appendTerminalLine('Test run already in progress. Please wait before running again.', 'warn');
        return;
      }
      if (state.isAutoFixInProgress) {
        appendTerminalLine('Auto-fix run in progress. Wait for it to complete before running tests.', 'warn');
        return;
      }

      const runIds = getRobotIdsForRun(options);
      if (!runIds.length) {
        if (options.autoSelectOnlineWhenEmpty) {
          appendTerminalLine('No robots selected and none are currently online. Refresh online status or select robots manually.', 'warn');
        } else {
          appendTerminalLine('No robot selected for tests. Select at least one robot first.', 'warn');
        }
        return;
      }

      state.isTestRunInProgress = true;
      setRunningButtonState(true);

      try {
        let successCount = 0;
        let failureCount = 0;
        const workerCount = Math.max(1, Math.min(getFleetParallelism(), runIds.length));
        if (terminal) {
          appendTerminalLine(
            `Running selected tests with parallelism ${workerCount} (${runIds.length} robot${runIds.length === 1 ? '' : 's'}).`,
            'warn',
          );
        }

        const queue = [...runIds];
        const processOneRobot = async (robotIdValue) => {
          const robot = getRobotById(robotIdValue);
          const normalizedRobotId = robotId(robotIdValue);
          if (!robot || !normalizedRobotId) {
            failureCount += 1;
            if (terminal) {
              appendTerminalLine(`Test run failed for ${robotIdValue}: Robot not found in current state`, 'err');
            }
            return;
          }

          const currentOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
          const shouldAutoRunOnlineCheck = currentOnlineStatus !== 'ok';
          if (shouldAutoRunOnlineCheck) {
            if (terminal) {
              appendTerminalLine(
                `Robot ${robot.name || robotId(robot)} is not online. Running online check first...`,
                'warn',
              );
            }

            setRobotSearching(normalizedRobotId, true, getOnlineCheckCountdownMs());
            const onlineStatus = await runOneRobotOnlineCheck(robot);
            setRobotSearching(normalizedRobotId, false);
            updateOnlineCheckEstimateFromResults([onlineStatus]);
            state.robots = state.robots.map((item) =>
              robotId(item) === normalizedRobotId
                ? {
                    ...item,
                    tests: {
                      ...(item.tests || {}),
                      online: {
                        status: onlineStatus.status,
                        value: onlineStatus.value,
                        details: onlineStatus.details,
                      },
                    },
                  }
                : item,
            );
            renderDashboard();
            const activeRobotPostOnline = state.robots.find((item) => robotId(item) === state.detailRobotId);
            if (activeRobotPostOnline) {
              renderDetail(activeRobotPostOnline);
            }

            if (normalizeStatus(onlineStatus.status) !== 'ok') {
              failureCount += 1;
              if (terminal) {
                appendTerminalLine(
                  `Skipping tests for ${robotId(robot)}: robot is offline (${onlineStatus.details}).`,
                  'err',
                );
              }
              setRobotTesting(normalizedRobotId, false);
              return;
            }
          }

          const body = { ...options.body };
          const includeOnline = !!options.includeOnline;
          const hasExplicitTestIds = Array.isArray(body.testIds) && body.testIds.length;
          const defaultTestIds = getConfiguredDefaultTestIds(robot, includeOnline);

          if (!hasExplicitTestIds && defaultTestIds.length) {
            body.testIds = defaultTestIds;
          }
          const countdownMs = estimateTestCountdownMsFromBody(body);

          if (terminal) {
            appendTerminalLine(`Running tests for ${robot.name}...`, 'warn');
          }

          setRobotTesting(normalizedRobotId, true, countdownMs);
          try {
            const result = await runRobotTestsForRobot(robotId(robot), body);
            if (terminal && Array.isArray(body.testIds) && body.testIds.length) {
              appendTerminalLine(`Executed test IDs: ${body.testIds.join(', ')}`, 'ok');
            }

            const results = Array.isArray(result?.results) ? result.results : [];
            if (!results.length) {
              failureCount += 1;
              if (terminal) {
                appendTerminalLine(`No test results returned for ${robotId(robot)}.`, 'err');
              }
              return;
            }

            updateRobotTestState(robotId(robot), results, result);
            successCount += 1;
            if (terminal) {
              appendTerminalLine(`Completed tests for ${robotId(robot)}.`, 'ok');
            }
            renderDashboard();

            const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
            if (activeRobot) {
              renderDetail(activeRobot);
            }
          } catch (error) {
            failureCount += 1;
            if (terminal) {
              appendTerminalLine(
                `Test run failed for ${robotId(robot)}: ${error instanceof Error ? error.message : String(error)}`,
                'err',
              );
            }
          } finally {
            setRobotTesting(normalizedRobotId, false);
          }
        };

        const workers = Array.from({ length: workerCount }, () => (async () => {
          while (queue.length) {
            const nextRobotId = queue.shift();
            if (!nextRobotId) break;
            await processOneRobot(nextRobotId);
          }
        })());
        await Promise.all(workers);

        if (terminal) {
          if (failureCount === 0) {
            appendTerminalLine(`Test run complete (${successCount}/${runIds.length} robots).`, 'ok');
          } else {
            appendTerminalLine(`Test run complete (${successCount} succeeded, ${failureCount} failed).`, 'warn');
          }
        }

        renderDashboard();

        const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
        if (activeRobot) {
          renderDetail(activeRobot);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Test run failed', error);
        appendTerminalLine(`Failed to run tests: ${message}`, 'err');
      } finally {
        state.isTestRunInProgress = false;
        setRunningButtonState(false);
        if (terminal) {
          appendTerminalLine('Ready.', 'ok');
        }
      }
    }

    function normalizeManageTab(tabId) {
      const normalized = normalizeText(tabId, '').toLowerCase();
      return MANAGE_TABS.includes(normalized) ? normalized : '';
    }

    function getPersistedManageTab() {
      try {
        return normalizeManageTab(window.sessionStorage.getItem(MANAGE_TAB_STORAGE_KEY));
      } catch (_error) {
        return '';
      }
    }

    function persistManageTab(tabId) {
      const normalized = normalizeManageTab(tabId);
      if (!normalized) return;
      try {
        window.sessionStorage.setItem(MANAGE_TAB_STORAGE_KEY, normalized);
      } catch (_error) {
        // Best effort persistence.
      }
    }

    function resolveManageTab(tabId = '') {
      return (
        normalizeManageTab(tabId)
        || getPersistedManageTab()
        || normalizeManageTab(state.activeManageTab)
        || 'robots'
      );
    }

    function buildManageHash(tabId) {
      const normalized = normalizeManageTab(tabId) || 'robots';
      return normalized === 'robots' ? MANAGE_VIEW_HASH : `${MANAGE_VIEW_HASH}/${normalized}`;
    }

    function parseManageRoute(hashValue) {
      const hash = normalizeText(hashValue, '').replace(/^#/, '');
      if (hash === MANAGE_VIEW_HASH || hash === 'add-robot') {
        return { isManageRoute: true, tabId: '' };
      }
      if (!hash.startsWith(`${MANAGE_VIEW_HASH}/`)) {
        return { isManageRoute: false, tabId: '' };
      }
      const tabId = hash.slice(MANAGE_VIEW_HASH.length + 1);
      return { isManageRoute: true, tabId: normalizeManageTab(tabId) || 'robots' };
    }

    function setLocationHash(hashValue) {
      const nextHash = normalizeText(hashValue, '').replace(/^#/, '');
      const currentHash = normalizeText(window.location.hash, '').replace(/^#/, '');
      if (currentHash === nextHash) return;
      state.ignoreNextHashChange = true;
      window.location.hash = nextHash ? `#${nextHash}` : '';
    }

    function isManageViewActive() {
      return Boolean(addRobotSection?.classList?.contains('active'));
    }

    function hideRecorderReadPopover() {
      if (recorderTerminalPopReadBtn) {
        recorderTerminalPopReadBtn.style.display = 'none';
      }
    }

    function syncRecorderReadPopoverVisibility() {
      if (
        !isManageViewActive()
        || state.activeManageTab !== 'recorder'
        || !state.recorderTerminalComponent?.terminal
        || !state.workflowRecorder?.started
      ) {
        hideRecorderReadPopover();
        return;
      }
      try {
        const selection = state.recorderTerminalComponent.terminal.getSelection();
        if (selection && selection.trim()) {
          if (recorderTerminalPopReadBtn) recorderTerminalPopReadBtn.style.display = 'block';
          return;
        }
      } catch (_error) {
        // Best effort UI hint.
      }
      hideRecorderReadPopover();
    }

    function closeRecorderTerminalSession() {
      hideRecorderReadPopover();
      if (recorderTerminalShell) {
        recorderTerminalShell.classList.remove('active');
      }
      if (recorderTerminalActivationOverlay) {
        recorderTerminalActivationOverlay.style.display = '';
      }
      if (state.recorderTerminalComponent) {
        state.recorderTerminalComponent.dispose();
      }
    }

    function setRecorderTerminalActive() {
      if (recorderTerminalShell) {
        recorderTerminalShell.classList.add('active');
      }
      if (recorderTerminalActivationOverlay) {
        recorderTerminalActivationOverlay.style.display = 'none';
      }
    }

    function openDetail(id, { syncHash = true } = {}) {
      const robot = state.robots.find((r) => r.id === id);
      if (!robot) return;
      state.detailRobotId = id;
      closeRecorderTerminalSession();
      addRobotSection.classList.remove('active');
      dashboard.classList.remove('active');
      detail.classList.add('active');
      renderDetail(robot);
      syncFixModePanels();
      if (syncHash) {
        setLocationHash(`robot/${id}`);
      }
    }

    function showAddRobotPage({ tabId = '', syncHash = true, refreshDefinitions = true } = {}) {
      closeTestDebugModal();
      closeBugReportModal();
      closeTerminalSession();
      state.detailRobotId = null;
      state.isCreateRobotInProgress = false;
      if (addRobotMessage) {
        addRobotMessage.textContent = '';
        addRobotMessage.classList.remove('error', 'ok', 'warn');
      }
      if (addRobotSavingHint) {
        addRobotSavingHint.textContent = '';
      }
      if (addRobotForm) {
        addRobotForm.reset();
        setAddRobotPasswordVisibility(false);
      }
      detail.classList.remove('active');
      dashboard.classList.remove('active');
      populateAddRobotTypeOptions();
      renderRecorderRobotOptions();
      const activeTab = resolveManageTab(tabId);
      setActiveManageTab(activeTab, { syncHash: false, persist: true });
      addRobotSection.classList.add('active');
      syncFixModePanels();
      if (syncHash) {
        setLocationHash(buildManageHash(activeTab));
      }
      if (refreshDefinitions) {
        loadDefinitionsSummary();
      }
    }

    function showDashboard({ syncHash = true } = {}) {
      closeTestDebugModal();
      closeBugReportModal();
      closeTerminalSession();
      closeRecorderTerminalSession();
      if (addRobotForm) {
        addRobotForm.reset();
      }
      if (addRobotMessage) {
        addRobotMessage.textContent = '';
        addRobotMessage.classList.remove('error', 'ok', 'warn');
      }
      if (addRobotSavingHint) {
        addRobotSavingHint.textContent = '';
      }
      detail.classList.remove('active');
      addRobotSection.classList.remove('active');
      dashboard.classList.add('active');
      state.detailRobotId = null;
      renderDashboard();
      syncFixModePanels();
      if (syncHash) {
        setLocationHash('');
      }
    }

    function closeTerminalSession() {
      if (state.terminalComponent) {
        state.terminalComponent.dispose();
      }
      if (terminal) {
        terminal.classList.add('fallback');
        terminal.textContent = '';
      }
      if (terminalToolbar) {
        terminalToolbar.innerHTML = '';
      }
      state.terminalMode = 'fallback';
      state.activeTerminalRobotId = null;
      setTerminalInactive();
    }

    function setTerminalInactive(robot = null) {
      if (detailTerminalShell) {
        detailTerminalShell.classList.remove('active');
      }
      if (activateTerminalButton) {
        const target = robot?.name || 'robot';
        applyActionButton(activateTerminalButton, {
          intent: 'terminal',
          label: `Connect SSH to ${target}`,
        });
      }
    }

    function setTerminalActive() {
      if (detailTerminalShell) {
        detailTerminalShell.classList.add('active');
      }
    }

    function getTimestamp() {
      return new Date().toLocaleTimeString();
    }

    function appendTerminalLine(line, level = 'ok', fromAuto = false) {
      const safeLine = `[${getTimestamp()}] ${line}`;

      const span = document.createElement('span');
      span.className = `line ${level}`;
      if (fromAuto) {
        span.style.opacity = '0.9';
      }
      span.textContent = safeLine;
      terminal.appendChild(span);
      terminal.scrollTop = terminal.scrollHeight;
    }

  async function runFallbackCommandSimulation(robot, command, commandId, reason = '') {
    if (!robot || !robot.id) {
      appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
      return;
    }

    const commandText = String(command || '').trim();
    if (!commandText) {
      appendTerminalLine('Fallback blocked: empty command.', 'warn');
      return;
    }

    const terminalEndpoint = buildApiUrl(`/api/robots/${encodeURIComponent(robot.id)}/terminal`);
    appendTerminalLine(`$ ${commandText}`, 'warn');
    if (reason) {
      appendTerminalLine(`Terminal hint: ${reason}. Attempting direct command execution.`, 'warn');
    }

    try {
      const response = await fetch(terminalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: robot.id,
          command: commandText,
          commandId,
          source: 'robot-dashboard-fallback',
        }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        appendTerminalLine(`[HTTP ${response.status}] Terminal API rejected the command.`, 'err');
        if (responseText) appendTerminalLine(responseText, 'err');
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(responseText);
      } catch (_error) {
        payload = null;
      }

      if (payload) {
        appendTerminalPayload(payload);
      } else {
        appendTerminalLine(responseText || '[No response text]', responseText ? 'plain' : 'warn');
      }
      return;
    } catch (_error) {
      appendTerminalLine('Direct terminal execution unavailable. Falling back to simulated output.', 'warn');
    }

    const map = Object.fromEntries(PRESET_COMMANDS.map((item) => [item.id, item]));
    const friendly = map[commandId]?.label || commandText;
    appendTerminalLine(`Simulating output for ${friendly}.`, 'warn');
    const generalState = robot.tests.general || { status: 'warning', value: 'n/a', details: 'No detail available' };
    const batteryState = robot.tests.battery || { status: 'warning', value: 'n/a', details: 'No detail available' };
    appendTerminalLine(
      formatConsoleLine('general', generalState.status, generalState.value, generalState.details),
      generalState.status === 'error' ? 'err' : generalState.status === 'warning' ? 'warn' : 'ok',
    );
    appendTerminalLine(
      formatConsoleLine('battery', batteryState.status, batteryState.value, batteryState.details),
      batteryState.status === 'error' ? 'err' : batteryState.status === 'warning' ? 'warn' : 'ok',
    );
    appendTerminalLine(`Simulated command result: ${commandText} executed.`, 'warn');
    appendTerminalLine(`Hint: configure /api/robots/{robotId}/terminal`, 'ok');
  }

  function appendTerminalPayload(payload) {
    if (payload === null || payload === undefined) {
      appendTerminalLine('[Empty output]', 'warn');
      return;
    }
    if (typeof payload.stdout === 'string') {
      appendTerminalLine(payload.stdout, 'plain');
    }
    if (typeof payload.stderr === 'string') {
      appendTerminalLine(payload.stderr, 'err');
    }
    if (typeof payload.output === 'string') {
      appendTerminalLine(payload.output, 'plain');
    }
    if (Array.isArray(payload.lines)) {
      appendTerminalLine(payload.lines.join('\n'), 'plain');
    }
    if (payload.result !== undefined) {
      appendTerminalLine(String(payload.result), 'plain');
    }
    if (typeof payload.exitCode === 'number' && payload.exitCode !== 0) {
      appendTerminalLine(`[exit ${payload.exitCode}]`, 'warn');
    }
    if (typeof payload.code === 'number' && payload.code !== 0) {
      appendTerminalLine(`[exit ${payload.code}]`, 'warn');
    }

    const hasKnownFields =
      typeof payload.stdout === 'string' ||
      typeof payload.stderr === 'string' ||
      typeof payload.output === 'string' ||
      Array.isArray(payload.lines) ||
      payload.result !== undefined ||
      typeof payload.exitCode === 'number' ||
      typeof payload.code === 'number';
    if (!hasKnownFields) {
      appendTerminalLine(JSON.stringify(payload), 'plain');
    }
  }

    function runFallbackChecks(robot) {
      if (!robot) {
        appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
        return;
      }
      appendTerminalLine('--- Simulated live checks begin ---', 'warn');
      Object.entries(robot.tests).forEach(([key, value]) => {
        appendTerminalLine(formatConsoleLine(key, value.status, value.value, value.details), value.status === 'error' ? 'err' : value.status === 'warning' ? 'warn' : 'ok');
      });
      appendTerminalLine('--- End checks ---', 'warn');
    }

    function getDetailTerminalPresets() {
      return PRESET_COMMANDS.filter((preset) => {
        const presetId = normalizeText(preset?.id, '').toLowerCase();
        return DETAIL_TERMINAL_PRESET_IDS.has(presetId);
      });
    }

    function initRobotTerminal(robot) {
      if (!robot) return;
      if (!state.terminalComponent) return;
      state.terminalComponent.connect(robot, getDetailTerminalPresets());
      state.activeTerminalRobotId = robotId(robot);
      setTerminalActive();
    }

    function formatConsoleLine(key, status, value, details) {
      const map = {
        online: 'network',
        general: 'system',
        battery: 'power',
        movement: 'motion',
        proximity: 'perception',
        lidar: 'perception',
        camera: 'vision',
      };
      const zone = map[key] || 'system';
      if (status === 'ok') {
        return `[OK] ${zone}::${key} => ${value} | ${details}`;
      }
      if (status === 'warning') {
        return `[WARN] ${zone}::${key} => ${value} | ${details}`;
      }
      return `[ERROR] ${zone}::${key} => ${value} | ${details}`;
    }

    function formatEpochSeconds(value) {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) return 'n/a';
      return new Date(num * 1000).toLocaleString();
    }

    function formatRawOutput(output) {
      const text = normalizeText(output, '');
      if (!text) return '(no output)';
      try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch (_error) {
        return text;
      }
    }

    function closeTestDebugModal() {
      if (!testDebugModal) return;
      testDebugModal.classList.add('hidden');
      testDebugModal.setAttribute('aria-hidden', 'true');
      state.testDebugModalOpen = false;
      syncModalScrollLock();
    }

    function setBugReportStatus(message = '', tone = '') {
      if (!bugReportStatus) return;
      bugReportStatus.textContent = message;
      bugReportStatus.classList.remove('ok', 'error');
      if (tone) {
        bugReportStatus.classList.add(tone);
      }
    }

    function closeBugReportModal({ force = false } = {}) {
      if (!bugReportModal) return;
      if (state.isBugReportSubmitInProgress && !force) return;
      bugReportModal.classList.add('hidden');
      bugReportModal.setAttribute('aria-hidden', 'true');
      state.isBugReportModalOpen = false;
      syncModalScrollLock();
      setBugReportStatus('', '');
      if (bugReportMessageInput) {
        bugReportMessageInput.value = '';
      }
      if (submitBugReportButton) {
        setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
      }
      if (cancelBugReportButton) {
        cancelBugReportButton.disabled = false;
      }
    }

    function openBugReportModal() {
      if (!bugReportModal) return;
      state.isBugReportModalOpen = true;
      syncModalScrollLock();
      state.isBugReportSubmitInProgress = false;
      setBugReportStatus('', '');
      if (bugReportMessageInput) {
        bugReportMessageInput.value = '';
      }
      if (cancelBugReportButton) {
        cancelBugReportButton.disabled = false;
      }
      if (submitBugReportButton) {
        setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
      }
      bugReportModal.classList.remove('hidden');
      bugReportModal.setAttribute('aria-hidden', 'false');
      if (bugReportMessageInput) {
        bugReportMessageInput.focus();
      }
    }

    async function submitBugReport() {
      if (state.isBugReportSubmitInProgress) return;
      const message = normalizeText(bugReportMessageInput?.value, '').trim();
      if (!message) {
        setBugReportStatus('Please describe the bug before submitting.', 'error');
        if (bugReportMessageInput) {
          bugReportMessageInput.focus();
        }
        return;
      }

      state.isBugReportSubmitInProgress = true;
      setBugReportStatus('');
      if (cancelBugReportButton) {
        cancelBugReportButton.disabled = true;
      }
      if (submitBugReportButton) {
        setActionButtonLoading(submitBugReportButton, true, {
          loadingLabel: 'Submitting...',
          idleLabel: 'Submit',
        });
      }

      try {
        const response = await fetch(buildApiUrl('/api/bug-reports'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        const raw = await response.text();
        let payload = null;
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch (_error) {
          payload = null;
        }
        if (!response.ok) {
          const details = normalizeText(payload?.detail, raw || 'Unable to save bug report.');
          setBugReportStatus(details, 'error');
          return;
        }
        closeBugReportModal({ force: true });
      } catch (_error) {
        setBugReportStatus('Unable to submit bug report right now.', 'error');
      } finally {
        state.isBugReportSubmitInProgress = false;
        if (cancelBugReportButton) {
          cancelBugReportButton.disabled = false;
        }
        if (submitBugReportButton) {
          setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
        }
      }
    }

    function openTestDebugModal(robot, testId) {
      if (!robot || !testDebugModal || !testDebugTitle || !testDebugSummary || !testDebugBody) return;

      const definitions = robot?.testDefinitions || TEST_DEFINITIONS;
      const definitionLabel = getDefinitionLabel(definitions, testId);
      const basicResult = robot?.tests?.[testId] || { status: 'warning', value: 'n/a', details: 'No detail available' };
      const debugResult = robot?.testDebug?.[testId] || null;
      const reasonLabel =
        normalizeText(testId, '').toLowerCase() === 'battery'
          ? batteryReasonText(basicResult)
          : '';

      testDebugTitle.textContent = `${robot.name} • ${definitionLabel}`;
      testDebugSummary.textContent = `Status: ${basicResult.status} | Value: ${basicResult.value} | Details: ${basicResult.details}${reasonLabel ? ` | Reason: ${reasonLabel}` : ''}`;
      testDebugBody.replaceChildren();

      const summaryBlock = document.createElement('pre');
      summaryBlock.className = 'test-debug-pre';
      summaryBlock.textContent = debugResult
        ? [
            `runId: ${normalizeText(debugResult.runId, 'n/a')}`,
            `startedAt: ${formatEpochSeconds(debugResult.startedAt)}`,
            `finishedAt: ${formatEpochSeconds(debugResult.finishedAt)}`,
            `testMs: ${Number.isFinite(Number(debugResult.ms)) ? Number(debugResult.ms) : 0}`,
            `status: ${debugResult.status}`,
            `value: ${debugResult.value}`,
            `details: ${debugResult.details}`,
          ].join('\n')
        : 'No detailed backend output recorded yet for this test. Run tests once from this page.';
      testDebugBody.appendChild(summaryBlock);

      if (debugResult && Array.isArray(debugResult.steps) && debugResult.steps.length) {
        debugResult.steps.forEach((step) => {
          const stepSection = document.createElement('section');
          stepSection.className = 'test-debug-step';

          const heading = document.createElement('h4');
          heading.className = 'test-debug-step-title';
          heading.textContent = `Step: ${step.id} (${step.status})`;
          stepSection.appendChild(heading);

          const details = document.createElement('pre');
          details.className = 'test-debug-pre';
          details.textContent = [
            `value: ${step.value}`,
            `details: ${step.details}`,
            `ms: ${Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0}`,
            'output:',
            formatRawOutput(step.output),
          ].join('\n');
          stepSection.appendChild(details);
          testDebugBody.appendChild(stepSection);
        });
      }

      if (debugResult && debugResult.raw && Object.keys(debugResult.raw).length) {
        const rawSection = document.createElement('section');
        rawSection.className = 'test-debug-step';
        const rawTitle = document.createElement('h4');
        rawTitle.className = 'test-debug-step-title';
        rawTitle.textContent = 'Parser metadata';
        rawSection.appendChild(rawTitle);
        const rawPre = document.createElement('pre');
        rawPre.className = 'test-debug-pre';
        rawPre.textContent = JSON.stringify(debugResult.raw, null, 2);
        rawSection.appendChild(rawPre);
        testDebugBody.appendChild(rawSection);
      }

      testDebugModal.classList.remove('hidden');
      testDebugModal.setAttribute('aria-hidden', 'false');
      state.testDebugModalOpen = true;
      syncModalScrollLock();
    }

    function populateFilters() {
      const typeOptions = Array.from(new Set(state.robots.map((r) => r.type)));
      const knownTestDefinitions = new Map();
      state.robots.forEach((robot) => {
        const definitions = robot?.testDefinitions || TEST_DEFINITIONS;
        definitions.forEach((test) => {
          if (!knownTestDefinitions.has(test.id)) {
            knownTestDefinitions.set(test.id, test);
          }
        });
      });

      filterType.innerHTML = `<option value="all">All Types</option>`;
      typeOptions.forEach((type) => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        filterType.appendChild(opt);
      });

      filterError.innerHTML = `
        <option value="all">All Robots</option>
        <option value="healthy">Healthy</option>
        <option value="warning">Warnings</option>
        <option value="critical">Critical</option>
        <option value="error">Any error</option>
      `;

      Array.from(knownTestDefinitions.values()).forEach((test) => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = `${test.label} errors`;
        filterError.appendChild(option);
      });
    }

    function populateAddRobotTypeOptions() {
      if (!addRobotTypeSelect) return;
      addRobotTypeSelect.replaceChildren();

      if (!ROBOT_TYPES.length) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'No robot types found';
        emptyOption.disabled = true;
        addRobotTypeSelect.appendChild(emptyOption);
        return;
      }

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a robot type';
      placeholder.disabled = true;
      addRobotTypeSelect.appendChild(placeholder);

      const seenTypes = new Set();
      ROBOT_TYPES.forEach((typeConfig) => {
        const typeId = normalizeText(typeConfig?.typeId, '');
        const typeKey = normalizeTypeId(typeId);
        if (!typeId || seenTypes.has(typeKey)) return;
        seenTypes.add(typeKey);
        const option = document.createElement('option');
        option.value = typeConfig.typeId || typeConfig.label || '';
        option.textContent = typeConfig.label || typeConfig.typeId || option.value;
        addRobotTypeSelect.appendChild(option);
      });

      const firstOption = addRobotTypeSelect.querySelector('option:not([value=""])');
      if (firstOption) {
        firstOption.selected = true;
      }
    }

    function setAddRobotMessage(message, style = 'warn') {
      if (!addRobotMessage) return;
      addRobotMessage.textContent = message || '';
      addRobotMessage.classList.remove('error', 'ok', 'warn');
      if (style) {
        addRobotMessage.classList.add(style);
      }
    }

    function setAddRobotPasswordVisibility(isVisible) {
      if (!addRobotPasswordInput || !addRobotPasswordToggle) return;
      addRobotPasswordInput.type = isVisible ? 'text' : 'password';
      applyActionButton(addRobotPasswordToggle, {
        intent: 'utility',
        label: isVisible ? 'Hide' : 'Show',
      });
      addRobotPasswordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
    }

    async function createRobotFromForm() {
      if (!addRobotForm || state.isCreateRobotInProgress) return;
      const form = new FormData(addRobotForm);
      const name = normalizeText(form.get('name'), '');
      const typeId = normalizeText(form.get('type'), '');
      const ip = normalizeText(form.get('ip'), '');
      const modelUrl = normalizeText(form.get('modelUrl'), '');
      const username = normalizeText(form.get('username'), '');
      const password = normalizeText(form.get('password'), '');

      if (!name || !typeId || !ip || !username || !password) {
        setAddRobotMessage('All fields except model URL are required.', 'error');
        return;
      }

      const knownType = ROBOT_TYPES.some(
        (type) => normalizeTypeId(type?.typeId) === normalizeTypeId(typeId),
      );
      if (!knownType) {
        setAddRobotMessage('Selected type is invalid. Choose an existing type.', 'error');
        return;
      }

      state.isCreateRobotInProgress = true;
      const saveButton = addRobotForm.querySelector('button[type="submit"]');
      if (saveButton) {
        setActionButtonLoading(saveButton, true, {
          loadingLabel: 'Saving...',
          idleLabel: 'Save robot',
        });
      }
      if (addRobotSavingHint) {
        addRobotSavingHint.textContent = 'Saving robot...';
      }

      try {
        const response = await fetch(buildApiUrl('/api/robots'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            type: typeId,
            ip,
            modelUrl: modelUrl || undefined,
            username,
            password,
          }),
        });

        const responseText = await response.text();
        if (!response.ok) {
          setAddRobotMessage(responseText || 'Unable to create robot.', 'error');
          return;
        }

        setAddRobotMessage('Robot created and written to config.', 'ok');
        await refreshRobotsFromBackendSnapshot();
        showDashboard();
      } finally {
        state.isCreateRobotInProgress = false;
        if (saveButton) {
          setActionButtonLoading(saveButton, false, {
            idleLabel: 'Save robot',
          });
        }
        if (addRobotSavingHint) {
          addRobotSavingHint.textContent = '';
        }
      }
    }

    async function refreshRobotsFromBackendSnapshot() {
      const previousSelectedIds = Array.from(state.selectedRobotIds || []);
      const previousDetailRobotId = normalizeText(state.detailRobotId, '');
      try {
        const refreshed = await loadRobotsFromBackend();
        state.robots = refreshed;
      } catch (_error) {
        return false;
      }

      const validRobotIds = new Set(state.robots.map((robot) => robotId(robot)).filter(Boolean));
      state.selectedRobotIds = new Set(previousSelectedIds.filter((id) => validRobotIds.has(id)));
      state.testingRobotIds = new Set(Array.from(state.testingRobotIds).filter((id) => validRobotIds.has(id)));
      state.searchingRobotIds = new Set(Array.from(state.searchingRobotIds).filter((id) => validRobotIds.has(id)));
      state.fixingRobotIds = new Set(Array.from(state.fixingRobotIds).filter((id) => validRobotIds.has(id)));
      state.autoTestingRobotIds = new Set(Array.from(state.autoTestingRobotIds).filter((id) => validRobotIds.has(id)));
      state.autoSearchingRobotIds = new Set(Array.from(state.autoSearchingRobotIds).filter((id) => validRobotIds.has(id)));
      state.autoActivityRobotIds = new Set(Array.from(state.autoActivityRobotIds).filter((id) => validRobotIds.has(id)));

      if (previousDetailRobotId && !validRobotIds.has(previousDetailRobotId)) {
        state.detailRobotId = null;
      }

      syncAutomatedRobotActivityFromState();
      syncAutoMonitorRefreshState();
      populateFilters();
      populateAddRobotTypeOptions();
      renderRecorderRobotOptions();

      if (dashboard.classList.contains('active')) {
        renderDashboard();
      }

      if (detail.classList.contains('active')) {
        const activeRobot = getRobotById(previousDetailRobotId || state.detailRobotId);
        if (activeRobot) {
          renderDetail(activeRobot);
        } else {
          showDashboard({ syncHash: false });
        }
      }

      return true;
    }

    function initAddRobotPasswordToggle() {
      if (!addRobotPasswordToggle || !addRobotPasswordInput) return;
      addRobotPasswordToggle.addEventListener('click', () => {
        setAddRobotPasswordVisibility(addRobotPasswordInput.type === 'password');
      });
    }

    function setManageTabStatus(message = '', tone = '') {
      if (!manageTabStatus) return;
      manageTabStatus.textContent = message;
      manageTabStatus.classList.remove('ok', 'warn', 'error');
      if (tone) {
        manageTabStatus.classList.add(tone);
      }
    }

    function setManageEditorStatus(element, message = '', tone = '') {
      if (!element) return;
      element.textContent = message;
      element.classList.remove('ok', 'warn', 'error');
      if (tone) {
        element.classList.add(tone);
      }
    }

    function normalizeDefinitionsSummary(payload) {
      const safe = payload && typeof payload === 'object' ? payload : {};
      return {
        commandPrimitives: Array.isArray(safe.commandPrimitives) ? safe.commandPrimitives : [],
        tests: Array.isArray(safe.tests) ? safe.tests : [],
        checks: Array.isArray(safe.checks) ? safe.checks : [],
        fixes: Array.isArray(safe.fixes) ? safe.fixes : [],
        robotTypes: Array.isArray(safe.robotTypes) ? safe.robotTypes : [],
      };
    }

    function normalizeIdList(values) {
      const list = Array.isArray(values) ? values : [];
      const seen = new Set();
      const out = [];
      list.forEach((item) => {
        const normalized = normalizeText(item, '');
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      });
      return out;
    }

    function slugifyRecorderValue(value, fallback = '') {
      const slug = normalizeText(value, '')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, '_')
        .replace(/^_+|_+$/g, '');
      return slug || fallback;
    }

    function renderRecorderRobotTypeTargets() {
      if (!recorderRobotTypeTargets) return;
      recorderRobotTypeTargets.replaceChildren();
      const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
        ? state.definitionsSummary.robotTypes
        : [];
      const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
      const normalizedDefinitionId = slugifyRecorderValue(definitionId, '');
      const checkIdPrefix = normalizedDefinitionId ? `${normalizedDefinitionId}__` : '';
      const recorderCheckIdsRaw = state.workflowRecorder?.getCheckIdsForDefinition?.(definitionId);
      const recorderCheckIds = Array.isArray(recorderCheckIdsRaw) ? recorderCheckIdsRaw : [];
      const mappedTypeIds = new Set();

      if (checkIdPrefix) {
        robotTypes.forEach((typePayload) => {
          const typeId = normalizeText(typePayload?.id, '');
          if (!typeId) return;
          const testRefs = normalizeIdList(typePayload?.testRefs);
          const isMappedByRef = recorderCheckIds.length
            ? recorderCheckIds.some((checkId) => testRefs.includes(checkId))
            : testRefs.some((ref) => ref.startsWith(checkIdPrefix));
          if (isMappedByRef) {
            mappedTypeIds.add(typeId);
          }
        });
      }

      if (!mappedTypeIds.size) {
        const selectedRobotId = normalizeText(recorderRobotSelect?.value, '');
        const selectedRobot = state.robots.find((robot) => robotId(robot) === selectedRobotId);
        const selectedTypeId = normalizeText(selectedRobot?.typeId, '');
        if (selectedTypeId) {
          mappedTypeIds.add(selectedTypeId);
        }
      }

      if (!robotTypes.length) {
        const empty = document.createElement('div');
        empty.className = 'manage-list-empty';
        empty.textContent = 'No robot types available.';
        recorderRobotTypeTargets.appendChild(empty);
        return;
      }
      robotTypes.forEach((typePayload) => {
        const typeId = normalizeText(typePayload?.id, '');
        if (!typeId) return;
        const label = normalizeText(typePayload?.name, typeId);
        const row = document.createElement('label');
        row.className = 'recorder-type-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = typeId;
        input.checked = mappedTypeIds.has(typeId);
        const text = document.createElement('span');
        text.textContent = label;
        row.append(input, text);
        recorderRobotTypeTargets.appendChild(row);
      });
    }

    function getSelectedRecorderTypeIds() {
      if (!recorderRobotTypeTargets) return [];
      const selected = Array.from(recorderRobotTypeTargets.querySelectorAll('input[type="checkbox"]:checked'));
      return selected
        .map((input) => normalizeText(input?.value, ''))
        .filter(Boolean);
    }

    function renderTestRobotTypeTargets(testId) {
      if (!manageTestRobotTypeTargets) return;
      manageTestRobotTypeTargets.replaceChildren();
      const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
        ? state.definitionsSummary.robotTypes
        : [];
      const testIdKey = normalizeText(testId, '');
      const testDefinition = Array.isArray(state.definitionsSummary?.tests)
        ? state.definitionsSummary.tests.find((item) => normalizeText(item?.id, '') === testIdKey)
        : null;
      const checkIds = Array.isArray(testDefinition?.checks)
        ? testDefinition.checks
          .map((check) => normalizeText(check?.id, ''))
          .filter(Boolean)
        : [];
      const mappingRefs = normalizeIdList([testIdKey, ...checkIds]);
      const legacyPrefix = testIdKey ? `${testIdKey}__` : '';
      
      robotTypes.forEach((typePayload) => {
        const typeId = normalizeText(typePayload?.id, '');
        if (!typeId) return;
        const label = normalizeText(typePayload?.name, typeId);
        const testRefs = normalizeIdList(typePayload?.testRefs);
        const isMapped = mappingRefs.some((ref) => testRefs.includes(ref))
          || (legacyPrefix ? testRefs.some((ref) => ref.startsWith(legacyPrefix)) : false);

        const row = document.createElement('label');
        row.className = 'recorder-type-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = typeId;
        input.checked = isMapped;
        const text = document.createElement('span');
        text.textContent = label;
        row.append(input, text);
        manageTestRobotTypeTargets.appendChild(row);
      });
    }

    function renderFixRobotTypeTargets(fixId) {
      if (!manageFixRobotTypeTargets) return;
      manageFixRobotTypeTargets.replaceChildren();
      const robotTypes = Array.isArray(state.definitionsSummary?.robotTypes)
        ? state.definitionsSummary.robotTypes
        : [];
      const fixIdKey = normalizeText(fixId, '');
      
      robotTypes.forEach((typePayload) => {
        const typeId = normalizeText(typePayload?.id, '');
        if (!typeId) return;
        const label = normalizeText(typePayload?.name, typeId);
        const fixRefs = Array.isArray(typePayload?.fixRefs) ? typePayload.fixRefs : [];
        const isMapped = fixRefs.includes(fixIdKey);

        const row = document.createElement('label');
        row.className = 'recorder-type-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = typeId;
        input.checked = isMapped;
        const text = document.createElement('span');
        text.textContent = label;
        row.append(input, text);
        manageFixRobotTypeTargets.appendChild(row);
      });
    }

    function getSelectedMappingTypeIds(container) {
      if (!container) return [];
      const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
      return selected
        .map((input) => normalizeText(input?.value, ''))
        .filter(Boolean);
    }

    function renderManageTestsList() {
      if (!manageTestsList) return;
      manageTestsList.replaceChildren();
      const tests = Array.isArray(state.definitionsSummary?.tests) ? state.definitionsSummary.tests : [];
      if (!tests.length) {
        const empty = document.createElement('div');
        empty.className = 'manage-list-empty';
        empty.textContent = 'No test definitions found.';
        manageTestsList.appendChild(empty);
        return;
      }
      tests
        .slice()
        .sort((a, b) => normalizeText(a?.id, '').localeCompare(normalizeText(b?.id, '')))
        .forEach((testDefinition) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'manage-list-item';
          const id = normalizeText(testDefinition?.id, '');
          const label = normalizeText(testDefinition?.label, id);
          const checkCount = Array.isArray(testDefinition?.checks) ? testDefinition.checks.length : 0;
          row.textContent = `${label} (${id}) • ${checkCount} check(s)`;
          row.addEventListener('click', () => {
            if (manageTestIdInput) manageTestIdInput.value = id;
            if (manageTestLabelInput) manageTestLabelInput.value = label;
            if (manageTestExecuteJsonInput) {
              const execute = Array.isArray(testDefinition?.execute) ? testDefinition.execute : [];
              manageTestExecuteJsonInput.value = JSON.stringify(execute, null, 2);
            }
            if (manageTestChecksJsonInput) {
              const checks = Array.isArray(testDefinition?.checks) ? testDefinition.checks : [];
              const editableChecks = checks.map((check) => ({
                id: normalizeText(check?.id, ''),
                label: normalizeText(check?.label, ''),
                icon: normalizeText(check?.icon, ''),
                read: check?.read || {},
                pass: check?.pass || { status: 'ok', value: 'present', details: 'Check passed.' },
                fail: check?.fail || { status: 'error', value: 'missing', details: 'Check failed.' },
              }));
              manageTestChecksJsonInput.value = JSON.stringify(editableChecks, null, 2);
            }
            renderTestRobotTypeTargets(id);
            if (manageDeleteTestButton) manageDeleteTestButton.style.display = 'inline-block';
            setManageEditorStatus(manageTestEditorStatus, `Loaded ${id} into editor.`, 'ok');
          });
          manageTestsList.appendChild(row);
        });
    }

    function renderManageFixesList() {
      if (!manageFixesList) return;
      manageFixesList.replaceChildren();
      const fixes = Array.isArray(state.definitionsSummary?.fixes) ? state.definitionsSummary.fixes : [];
      if (!fixes.length) {
        const empty = document.createElement('div');
        empty.className = 'manage-list-empty';
        empty.textContent = 'No fix definitions found.';
        manageFixesList.appendChild(empty);
        return;
      }
      fixes
        .slice()
        .sort((a, b) => normalizeText(a?.id, '').localeCompare(normalizeText(b?.id, '')))
        .forEach((fixDefinition) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'manage-list-item';
          const id = normalizeText(fixDefinition?.id, '');
          const label = normalizeText(fixDefinition?.label, id);
          row.textContent = `${label} (${id})`;
          row.addEventListener('click', () => {
            if (manageFixIdInput) manageFixIdInput.value = id;
            if (manageFixLabelInput) manageFixLabelInput.value = label;
            if (manageFixDescriptionInput) {
              manageFixDescriptionInput.value = normalizeText(fixDefinition?.description, '');
            }
            if (manageFixExecuteJsonInput) {
              const execute = Array.isArray(fixDefinition?.execute) ? fixDefinition.execute : [];
              manageFixExecuteJsonInput.value = JSON.stringify(execute, null, 2);
            }
            if (manageFixPostTestsInput) {
              const postTests = Array.isArray(fixDefinition?.postTestIds) ? fixDefinition.postTestIds : [];
              manageFixPostTestsInput.value = postTests.join(', ');
            }
            renderFixRobotTypeTargets(id);
            if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'inline-block';
            setManageEditorStatus(manageFixEditorStatus, `Loaded ${id} into editor.`, 'ok');
          });
          manageFixesList.appendChild(row);
        });
    }

    function renderRecorderRobotOptions() {
      if (!recorderRobotSelect) return;
      const previousValue = normalizeText(recorderRobotSelect.value, '');
      recorderRobotSelect.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select robot';
      recorderRobotSelect.appendChild(placeholder);
      state.robots.forEach((robot) => {
        const id = normalizeText(robot?.id, '');
        if (!id) return;
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${normalizeText(robot?.name, id)} (${id})`;
        recorderRobotSelect.appendChild(option);
      });
      if (previousValue) {
        recorderRobotSelect.value = previousValue;
      }
      syncRecorderUiState();
    }

    function renderManageDefinitions() {
      renderManageTestsList();
      renderManageFixesList();
      renderRecorderRobotTypeTargets();
      renderRecorderRobotOptions();
    }

    async function loadDefinitionsSummary() {
      if (state.isManageSummaryLoading) return;
      state.isManageSummaryLoading = true;
      setManageTabStatus('Loading definitions...', 'warn');
      try {
        const response = await fetch(buildApiUrl('/api/definitions/summary'));
        const raw = await response.text();
        const contentType = normalizeText(response.headers?.get('content-type'), '').toLowerCase();
        const trimmedRaw = raw.trim();
        const appearsJson = trimmedRaw.startsWith('{') || trimmedRaw.startsWith('[');
        const expectsJson = contentType.includes('json');
        const shouldParseJson = expectsJson || appearsJson;
        let payload = {};
        let parseError = null;
        if (raw && shouldParseJson) {
          try {
            payload = JSON.parse(raw);
          } catch (error) {
            parseError = error;
          }
        }
        if (!response.ok) {
          if (shouldParseJson && parseError) {
            throw new Error(`Unable to load definitions summary (HTTP ${response.status}).`);
          }
          const fallback = raw || `Unable to load definitions summary (HTTP ${response.status}).`;
          throw new Error(normalizeText(payload?.detail, fallback));
        }
        if (shouldParseJson && parseError) {
          throw new Error('Definitions summary response could not be parsed as JSON.');
        }
        if (!shouldParseJson && raw) {
          throw new Error('Definitions summary response was not JSON.');
        }
        state.definitionsSummary = normalizeDefinitionsSummary(payload);
        renderManageDefinitions();
        setManageTabStatus('Definitions loaded.', 'ok');
      } catch (error) {
        setManageTabStatus(
          `Definitions load failed: ${error instanceof Error ? error.message : String(error)}`,
          'error',
        );
      } finally {
        state.isManageSummaryLoading = false;
      }
    }

    function setActiveManageTab(tabId, { syncHash = false, persist = true } = {}) {
      const normalizedTab = resolveManageTab(tabId);
      state.activeManageTab = normalizedTab;
      if (persist) {
        persistManageTab(normalizedTab);
      }
      manageTabButtons.forEach((button) => {
        const tab = normalizeText(button?.dataset?.tab, '');
        button.classList.toggle('active', tab === normalizedTab);
      });
      manageTabPanels.forEach((panel) => {
        const tab = normalizeText(panel?.dataset?.tabPanel, '');
        panel.classList.toggle('active', tab === normalizedTab);
      });
      if (normalizedTab === 'recorder') {
        syncRecorderUiState();
      } else {
        hideRecorderReadPopover();
      }
      if (syncHash) {
        setLocationHash(buildManageHash(normalizedTab));
      }
    }

    function parseJsonInput(input, label) {
      const raw = normalizeText(input?.value, '');
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          throw new Error(`${label} must be a JSON array.`);
        }
        return parsed;
      } catch (error) {
        throw new Error(
          `${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    async function saveManageTestDefinition() {
      if (!manageTestIdInput || !manageTestExecuteJsonInput || !manageTestChecksJsonInput) return;
      setManageEditorStatus(manageTestEditorStatus, 'Saving test definition...', 'warn');
      try {
        const testId = normalizeText(manageTestIdInput.value, '');
        if (!testId) {
          throw new Error('Test definition ID is required.');
        }
        const execute = parseJsonInput(manageTestExecuteJsonInput, 'Execute steps');
        const checks = parseJsonInput(manageTestChecksJsonInput, 'Checks');
        const payload = {
          id: testId,
          label: normalizeText(manageTestLabelInput?.value, testId),
          mode: 'orchestrate',
          enabled: true,
          execute,
          checks,
        };
        const response = await fetch(buildApiUrl('/api/definitions/tests'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || 'Unable to save test definition.'));
        }

        const selectedTypeIds = getSelectedMappingTypeIds(manageTestRobotTypeTargets);
        const mappingResult = await updateTestMappings(testId, selectedTypeIds);
        state.definitionsSummary = normalizeDefinitionsSummary(
          mappingResult?.summary || body?.summary || body,
        );
        renderManageDefinitions();
        const refreshed = await refreshRobotsFromBackendSnapshot();
        setManageEditorStatus(manageTestEditorStatus, `Saved test definition '${testId}' and updated mappings.`, 'ok');
        if (refreshed) {
          setManageTabStatus(`Saved test definition '${testId}'.`, 'ok');
        } else {
          setManageTabStatus(
            `Saved test definition '${testId}', but robot views did not refresh. Reload the page if needed.`,
            'warn',
          );
        }
      } catch (error) {
        setManageEditorStatus(
          manageTestEditorStatus,
          error instanceof Error ? error.message : String(error),
          'error',
        );
      }
    }

    async function deleteManageTestDefinition() {
      if (!manageTestIdInput) return;
      const testId = normalizeText(manageTestIdInput.value, '');
      if (!testId) return;
      if (!confirm(`Are you sure you want to delete test definition '${testId}'? This will also remove it from all robot type mappings.`)) {
        return;
      }
      setManageEditorStatus(manageTestEditorStatus, 'Deleting test definition...', 'warn');
      try {
        const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}`), {
          method: 'DELETE',
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.detail || 'Unable to delete test definition.');
        }
        state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
        renderManageDefinitions();
        const refreshed = await refreshRobotsFromBackendSnapshot();
        if (manageTestIdInput) manageTestIdInput.value = '';
        if (manageTestLabelInput) manageTestLabelInput.value = '';
        if (manageTestExecuteJsonInput) manageTestExecuteJsonInput.value = '';
        if (manageTestChecksJsonInput) manageTestChecksJsonInput.value = '';
        if (manageTestRobotTypeTargets) manageTestRobotTypeTargets.replaceChildren();
        if (manageDeleteTestButton) manageDeleteTestButton.style.display = 'none';
        setManageEditorStatus(manageTestEditorStatus, `Deleted test definition '${testId}'.`, 'ok');
        if (refreshed) {
          setManageTabStatus(`Deleted test definition '${testId}'.`, 'ok');
        } else {
          setManageTabStatus(
            `Deleted test definition '${testId}', but robot views did not refresh. Reload the page if needed.`,
            'warn',
          );
        }
      } catch (error) {
        setManageEditorStatus(
          manageTestEditorStatus,
          error instanceof Error ? error.message : String(error),
          'error',
        );
      }
    }

    async function updateTestMappings(testId, robotTypeIds) {
      const response = await fetch(buildApiUrl(`/api/definitions/tests/${encodeURIComponent(testId)}/mappings`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotTypeIds }),
      });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(normalizeText(body?.detail, raw || 'Unable to update test mappings.'));
      }
      return body;
    }

    async function updateFixMappings(fixId, robotTypeIds) {
      const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}/mappings`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotTypeIds }),
      });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(normalizeText(body?.detail, raw || 'Unable to update fix mappings.'));
      }
      return body;
    }

    async function saveManageFixDefinition() {
      if (!manageFixIdInput || !manageFixExecuteJsonInput) return;
      setManageEditorStatus(manageFixEditorStatus, 'Saving fix definition...', 'warn');
      try {
        const fixId = normalizeText(manageFixIdInput.value, '');
        if (!fixId) {
          throw new Error('Fix ID is required.');
        }
        const execute = parseJsonInput(manageFixExecuteJsonInput, 'Execute steps');
        const postTests = normalizeIdList(
          normalizeText(manageFixPostTestsInput?.value, '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        );
        const payload = {
          id: fixId,
          label: normalizeText(manageFixLabelInput?.value, fixId),
          description: normalizeText(manageFixDescriptionInput?.value, ''),
          enabled: true,
          execute,
          postTestIds: postTests,
        };
        const response = await fetch(buildApiUrl('/api/definitions/fixes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || 'Unable to save fix definition.'));
        }

        const selectedTypeIds = getSelectedMappingTypeIds(manageFixRobotTypeTargets);
        const mappingResult = await updateFixMappings(fixId, selectedTypeIds);
        state.definitionsSummary = normalizeDefinitionsSummary(
          mappingResult?.summary || body?.summary || body,
        );
        renderManageDefinitions();
        const refreshed = await refreshRobotsFromBackendSnapshot();
        setManageEditorStatus(manageFixEditorStatus, `Saved fix definition '${fixId}' and updated mappings.`, 'ok');
        if (refreshed) {
          setManageTabStatus(`Saved fix definition '${fixId}'.`, 'ok');
        } else {
          setManageTabStatus(
            `Saved fix definition '${fixId}', but robot views did not refresh. Reload the page if needed.`,
            'warn',
          );
        }
      } catch (error) {
        setManageEditorStatus(
          manageFixEditorStatus,
          error instanceof Error ? error.message : String(error),
          'error',
        );
      }
    }

    async function deleteManageFixDefinition() {
      if (!manageFixIdInput) return;
      const fixId = normalizeText(manageFixIdInput.value, '');
      if (!fixId) return;
      if (!confirm(`Are you sure you want to delete fix definition '${fixId}'? This will also remove it from all robot type mappings.`)) {
        return;
      }
      setManageEditorStatus(manageFixEditorStatus, 'Deleting fix definition...', 'warn');
      try {
        const response = await fetch(buildApiUrl(`/api/definitions/fixes/${encodeURIComponent(fixId)}`), {
          method: 'DELETE',
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.detail || 'Unable to delete fix definition.');
        }
        state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
        renderManageDefinitions();
        const refreshed = await refreshRobotsFromBackendSnapshot();
        if (manageFixIdInput) manageFixIdInput.value = '';
        if (manageFixLabelInput) manageFixLabelInput.value = '';
        if (manageFixDescriptionInput) manageFixDescriptionInput.value = '';
        if (manageFixExecuteJsonInput) manageFixExecuteJsonInput.value = '';
        if (manageFixPostTestsInput) manageFixPostTestsInput.value = '';
        if (manageFixRobotTypeTargets) manageFixRobotTypeTargets.replaceChildren();
        if (manageDeleteFixButton) manageDeleteFixButton.style.display = 'none';
        setManageEditorStatus(manageFixEditorStatus, `Deleted fix definition '${fixId}'.`, 'ok');
        if (refreshed) {
          setManageTabStatus(`Deleted fix definition '${fixId}'.`, 'ok');
        } else {
          setManageTabStatus(
            `Deleted fix definition '${fixId}', but robot views did not refresh. Reload the page if needed.`,
            'warn',
          );
        }
      } catch (error) {
        setManageEditorStatus(
          manageFixEditorStatus,
          error instanceof Error ? error.message : String(error),
          'error',
        );
      }
    }

    async function patchRobotTypeMapping(typeId, testRefs, fixRefs) {
      const payload = {};
      if (Array.isArray(testRefs)) payload.testRefs = normalizeIdList(testRefs);
      if (Array.isArray(fixRefs)) payload.fixRefs = normalizeIdList(fixRefs);
      const response = await fetch(buildApiUrl(`/api/robot-types/${encodeURIComponent(typeId)}/mappings`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      const body = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(normalizeText(body?.detail, raw || `Unable to patch robot type ${typeId}.`));
      }
      return body;
    }

    async function applyRecorderMappings({ checkIds = [], fixId = '' }) {
      const selectedTypeIds = getSelectedRecorderTypeIds();
      if (!selectedTypeIds.length) return;
      const summaryTypes = Array.isArray(state.definitionsSummary?.robotTypes)
        ? state.definitionsSummary.robotTypes
        : [];
      for (const typeId of selectedTypeIds) {
        const existing = summaryTypes.find((item) => normalizeText(item?.id, '') === typeId) || {};
        const nextTestRefs = normalizeIdList([...(existing.testRefs || []), ...checkIds]);
        const nextFixRefs = fixId
          ? normalizeIdList([...(existing.fixRefs || []), fixId])
          : normalizeIdList(existing.fixRefs || []);
        const patchResult = await patchRobotTypeMapping(typeId, nextTestRefs, nextFixRefs);
        state.definitionsSummary = normalizeDefinitionsSummary(patchResult?.summary || state.definitionsSummary);
      }
    }

    let recorderLastEditingOutputKey = '';
    let recorderLastEditingReadBlockId = '';

    function clearRecorderOutputForm() {
      if (recorderOutputKeyInput) recorderOutputKeyInput.value = '';
      if (recorderOutputLabelInput) recorderOutputLabelInput.value = '';
      if (recorderOutputIconInput) recorderOutputIconInput.value = '';
      if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = '';
      if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = '';
    }

    function clearRecorderReadForm() {
      if (recorderReadOutputKeySelect) recorderReadOutputKeySelect.value = '';
      if (recorderReadInputRefSelect) recorderReadInputRefSelect.value = '';
      if (recorderReadKindSelect) recorderReadKindSelect.value = 'contains_string';
      if (recorderReadNeedleInput) recorderReadNeedleInput.value = '';
      if (recorderReadNeedlesInput) recorderReadNeedlesInput.value = '';
      if (recorderReadLinesInput) recorderReadLinesInput.value = '';
      if (recorderReadRequireAllInput) recorderReadRequireAllInput.checked = true;
      syncRecorderReadKindFields();
    }

    function syncRecorderReadKindFields() {
      const kind = normalizeText(recorderReadKindSelect?.value, 'contains_string');
      const isString = kind === 'contains_string';
      const isAny = kind === 'contains_any_string';
      const isLines = kind === 'contains_lines_unordered';
      if (recorderReadNeedleInput) recorderReadNeedleInput.disabled = !isString;
      if (recorderReadNeedlesInput) recorderReadNeedlesInput.disabled = !isAny;
      if (recorderReadLinesInput) recorderReadLinesInput.disabled = !isLines;
      if (recorderReadRequireAllInput) recorderReadRequireAllInput.disabled = !isLines;
    }

    function syncRecorderUiState() {
      const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
      const recorder = state.workflowRecorder;
      const recorderState = recorder && typeof recorder.getState === 'function'
        ? recorder.getState(definitionId)
        : {
            started: false,
            writeCount: 0,
            readCount: 0,
            outputCount: 0,
            publishReady: false,
            blockingIssues: [],
            editingOutputKey: '',
            editingReadBlockId: '',
          };

      const robotSelected = normalizeText(recorderRobotSelect?.value, '') !== '';
      const commandReady = normalizeText(recorderCommandInput?.value, '') !== '';

      if (recorderStateBadge) {
        recorderStateBadge.textContent = recorderState.started ? 'Draft active' : 'Draft idle';
        recorderStateBadge.classList.toggle('active', !!recorderState.started);
      }
      if (recorderStepCountBadge) {
        recorderStepCountBadge.textContent = `${Number(recorderState.writeCount || 0)} write block${Number(recorderState.writeCount || 0) === 1 ? '' : 's'}`;
      }
      if (recorderCheckCountBadge) {
        recorderCheckCountBadge.textContent = `${Number(recorderState.readCount || 0)} read block${Number(recorderState.readCount || 0) === 1 ? '' : 's'}`;
      }
      if (recorderOutputCountBadge) {
        recorderOutputCountBadge.textContent = `${Number(recorderState.outputCount || 0)} output${Number(recorderState.outputCount || 0) === 1 ? '' : 's'}`;
      }

      if (recorderCreateNewTestButton) {
        applyActionButton(recorderCreateNewTestButton, {
          intent: 'create',
          label: 'Create new test',
        });
      }
      if (recorderRunCaptureButton) {
        recorderRunCaptureButton.disabled = !(recorderState.started && robotSelected && commandReady);
      }
      if (recorderAddOutputBtn) {
        recorderAddOutputBtn.disabled = !recorderState.started;
      }
      if (recorderAddReadBtn) {
        recorderAddReadBtn.disabled = !(
          recorderState.started
          && Number(recorderState.outputCount || 0) > 0
          && Number(recorderState.writeCount || 0) > 0
        );
      }
      if (recorderPublishTestButton) {
        recorderPublishTestButton.disabled = !(recorderState.publishReady && robotSelected);
      }

      if (recorderState.editingOutputKey !== recorderLastEditingOutputKey) {
        recorderLastEditingOutputKey = recorderState.editingOutputKey || '';
        if (recorderLastEditingOutputKey) {
          const output = state.workflowRecorder?.getOutput?.(recorderLastEditingOutputKey);
          if (output) {
            if (recorderOutputKeyInput) recorderOutputKeyInput.value = output.key;
            if (recorderOutputLabelInput) recorderOutputLabelInput.value = output.label;
            if (recorderOutputIconInput) recorderOutputIconInput.value = output.icon;
            if (recorderOutputPassDetailsInput) recorderOutputPassDetailsInput.value = output.passDetails;
            if (recorderOutputFailDetailsInput) recorderOutputFailDetailsInput.value = output.failDetails;
          }
        }
      }

      if (recorderState.editingReadBlockId !== recorderLastEditingReadBlockId) {
        recorderLastEditingReadBlockId = recorderState.editingReadBlockId || '';
        if (recorderLastEditingReadBlockId) {
          const block = state.workflowRecorder?.getReadBlock?.(recorderLastEditingReadBlockId);
          if (block) {
            if (recorderReadOutputKeySelect) recorderReadOutputKeySelect.value = block.outputKey;
            if (recorderReadInputRefSelect) recorderReadInputRefSelect.value = normalizeText(block.read?.inputRef, '');
            if (recorderReadKindSelect) recorderReadKindSelect.value = normalizeText(block.read?.kind, 'contains_string');
            if (recorderReadNeedleInput) recorderReadNeedleInput.value = normalizeText(block.read?.needle, '');
            if (recorderReadNeedlesInput) {
              const needles = Array.isArray(block.read?.needles) ? block.read.needles : [];
              recorderReadNeedlesInput.value = needles.join(',');
            }
            if (recorderReadLinesInput) {
              const lines = Array.isArray(block.read?.lines) ? block.read.lines : [];
              recorderReadLinesInput.value = lines.join('\n');
            }
            if (recorderReadRequireAllInput) {
              recorderReadRequireAllInput.checked = Boolean(block.read?.requireAll ?? true);
            }
          }
        }
      }

      syncRecorderReadKindFields();
      syncRecorderReadPopoverVisibility();
    }

    async function runRecorderCommandAndCapture() {
      if (!state.workflowRecorder) return;
      const robotIdValue = normalizeText(recorderRobotSelect?.value, '');
      const command = normalizeText(recorderCommandInput?.value, '');
      if (!robotIdValue) {
        state.workflowRecorder.setStatus('Select a robot first.', 'error');
        return;
      }
      if (!state.workflowRecorder.started) {
        state.workflowRecorder.setStatus('Click "Create new test" first.', 'warn');
        return;
      }
      if (!command) {
        state.workflowRecorder.setStatus('Command is required.', 'error');
        return;
      }

      setRecorderTerminalActive();
      if (recorderRunCaptureButton) {
        recorderRunCaptureButton.disabled = true;
      }
      state.workflowRecorder.setStatus('Running command in SSH session...', 'warn');
      try {
        if (!state.recorderTerminalComponent || state.recorderTerminalComponent.mode !== 'live') {
          const robot = ROBOT_TYPES.length ? { id: robotIdValue, name: robotIdValue } : { id: robotIdValue };
          await state.recorderTerminalComponent?.connect(robot);
        }
        
        await state.recorderTerminalComponent?.runCommand(command);

        const capturedStep = state.workflowRecorder.addWriteBlock({
          command,
          outputPayload: { stdout: '[Output streaming in terminal session]' },
        });
        
        if (recorderDefinitionIdInput && !normalizeText(recorderDefinitionIdInput.value, '')) {
          const suggested = slugifyRecorderValue(
            `${robotIdValue}_${normalizeText(capturedStep?.id, 'workflow')}`,
            'recorded_workflow',
          );
          recorderDefinitionIdInput.value = suggested;
        }
        if (recorderDefinitionLabelInput && !normalizeText(recorderDefinitionLabelInput.value, '')) {
          recorderDefinitionLabelInput.value = `Flow workflow (${robotIdValue})`;
        }
        if (recorderCommandInput) recorderCommandInput.value = '';
        state.workflowRecorder.setStatus('Write block added. Check terminal for output.', 'ok');
      } catch (error) {
        state.workflowRecorder.setStatus(
          `Run failed: ${error instanceof Error ? error.message : String(error)}`,
          'error',
        );
      } finally {
        if (recorderRunCaptureButton) {
          recorderRunCaptureButton.disabled = false;
        }
        syncRecorderUiState();
      }
    }

    async function publishRecorderAsTest() {
      if (!state.workflowRecorder) return;
      state.workflowRecorder.setPublishStatus('Publishing test...', 'warn');
      try {
        const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
        const definition = state.workflowRecorder.buildTestDefinition({
          definitionId,
          label: normalizeText(recorderDefinitionLabelInput?.value, ''),
        });

        const response = await fetch(buildApiUrl('/api/definitions/tests'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(definition),
        });
        const raw = await response.text();
        const body = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(normalizeText(body?.detail, raw || 'Unable to publish test definition.'));
        }
        state.definitionsSummary = normalizeDefinitionsSummary(body?.summary || body);
        await applyRecorderMappings({
          checkIds: state.workflowRecorder.getCheckIdsForDefinition(definitionId),
          fixId: '',
        });
        renderManageDefinitions();
        state.workflowRecorder.setPublishStatus('Test definition published and mapped to selected robot types.', 'ok');
        setManageTabStatus('Recorder test published.', 'ok');
      } catch (error) {
        state.workflowRecorder.setPublishStatus(
          error instanceof Error ? error.message : String(error),
          'error',
        );
      }
    }

    function addRecorderOutputVisual() {
      if (!state.workflowRecorder || !state.workflowRecorder.started) return;
      try {
        const outId = window.prompt("Enter Output Key (e.g. status):");
        if (!outId || !outId.trim()) return;
        state.workflowRecorder.addOrUpdateOutput({
          key: normalizeText(outId, ''),
          label: normalizeText(outId, ''),
          icon: '💾',
          passDetails: 'Passed',
          failDetails: 'Failed',
        });
        state.workflowRecorder.setStatus('Added output block. Expand to edit.', 'ok');
      } catch (error) {
        state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
      }
    }

    function addRecorderReadVisual() {
      if (!state.workflowRecorder || !state.workflowRecorder.started) return;
      try {
        state.workflowRecorder.clearReadEdit();
        const outputs = state.workflowRecorder.getOutputKeys();
        if (!outputs.length) {
          state.workflowRecorder.setStatus('You must create an Output block first.', 'error');
          return;
        }
        const key = outputs[0];
        const latestWrite = state.workflowRecorder.getWriteRefs().pop();
        const ref = latestWrite ? latestWrite.saveAs : '';
        
        state.workflowRecorder.addOrUpdateReadBlock({
          outputKey: key,
          inputRef: ref,
          kind: 'contains_string',
          needle: 'success text',
          needles: '',
          lines: '',
          requireAll: true
        });
        state.workflowRecorder.setStatus('Added read block. Expand to edit.', 'ok');
      } catch (error) {
        state.workflowRecorder.setStatus(error instanceof Error ? error.message : String(error), 'error');
      }
    }

    function initManageTabs() {
      manageTabButtons.forEach((button) => {
        button.addEventListener('click', () => {
          setActiveManageTab(normalizeText(button?.dataset?.tab, 'robots'), { syncHash: true, persist: true });
        });
      });
      if (manageDeleteTestButton) {
        manageDeleteTestButton.addEventListener('click', deleteManageTestDefinition);
      }
      if (manageDeleteFixButton) {
        manageDeleteFixButton.addEventListener('click', deleteManageFixDefinition);
      }
    }

    function initWorkflowRecorder() {
      state.workflowRecorder = new WorkflowRecorderComponent({
        terminalOutputEl: null,
        outputsEl: recorderOutputs,
        blocksEl: recorderFlowBlocks,
        outputSelectEl: recorderReadOutputKeySelect,
        inputRefSelectEl: recorderReadInputRefSelect,
        statusEl: recorderStatus,
        publishStatusEl: recorderPublishStatus,
        onStateChange: () => {
          syncRecorderUiState();
        },
      });
      state.workflowRecorder.render();

      try {
        state.recorderTerminalComponent = new RobotTerminalComponent({
          terminalElement: recorderTerminalDisplay,
          toolbarElement: recorderTerminalToolbar,
          badgeElement: recorderTerminalBadge,
          hintElement: recorderTerminalHint,
          terminalCtor: window.Terminal,
          fitAddonCtor: window.FitAddon ? window.FitAddon.FitAddon : null,
          endpointBuilder: (robotId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal`),
        });
      } catch (error) {
        console.warn('Recorder terminal init failed', error);
      }

      if (state.recorderSelectionMouseupHandler) {
        document.removeEventListener('mouseup', state.recorderSelectionMouseupHandler);
      }
      state.recorderSelectionMouseupHandler = () => {
        syncRecorderReadPopoverVisibility();
      };
      document.addEventListener('mouseup', state.recorderSelectionMouseupHandler);

      recorderTerminalPopReadBtn?.addEventListener('click', () => {
        if (!state.recorderTerminalComponent?.terminal || !state.workflowRecorder?.started) return;
        try {
          const selection = state.recorderTerminalComponent.terminal.getSelection();
          if (selection && selection.trim()) {
            state.workflowRecorder.clearReadEdit();
            const outputs = state.workflowRecorder.getOutputKeys();
            if (!outputs.length) {
              state.workflowRecorder.setStatus('Create an Output Block first to bind terminal selections to.', 'warn');
              return;
            }
            const lines = selection.trim().split('\n').map(s => s.trim()).filter(Boolean);
            const latestWrite = state.workflowRecorder.getWriteRefs().pop();
            const ref = latestWrite ? latestWrite.saveAs : '';

            let kind = 'contains_string';
            let needle = '';
            let linesStr = '';

            if (lines.length > 1) {
              kind = 'contains_lines_unordered';
              linesStr = lines.join('\n');
            } else if (lines.length === 1) {
              kind = 'contains_string';
              needle = lines[0];
            }
            state.workflowRecorder.addOrUpdateReadBlock({
               outputKey: outputs[0],
               inputRef: ref,
               kind: kind,
               needle: needle,
               needles: '',
               lines: linesStr,
               requireAll: true
            });
            state.workflowRecorder.setStatus('Read block created from terminal selection. Expand to edit.', 'ok');
            hideRecorderReadPopover();
            state.recorderTerminalComponent.terminal.clearSelection();
          }
        } catch (_e) {}
      });

      activateRecorderTerminalButton?.addEventListener('click', () => {
        const rId = normalizeText(recorderRobotSelect?.value, '');
        if (!rId) {
          state.workflowRecorder.setStatus('Select a robot first.', 'error');
          return;
        }
        const robot = ROBOT_TYPES.length ? { id: rId, name: rId } : { id: rId };
        state.recorderTerminalComponent?.connect(robot);
        setRecorderTerminalActive();
      });

      recorderCreateNewTestButton?.addEventListener('click', () => {
        const robotIdValue = normalizeText(recorderRobotSelect?.value, '');
        if (!robotIdValue) {
          state.workflowRecorder.setStatus('Select a robot first.', 'error');
          return;
        }
        state.workflowRecorder.createNewTest();
        clearRecorderOutputForm();
        clearRecorderReadForm();
        if (recorderDefinitionIdInput) {
          recorderDefinitionIdInput.value = slugifyRecorderValue(`${robotIdValue}_flow`, 'recorded_workflow');
        }
        if (recorderDefinitionLabelInput) {
          recorderDefinitionLabelInput.value = `Flow workflow (${robotIdValue})`;
        }
        renderRecorderRobotTypeTargets();
      });
      recorderRunCaptureButton?.addEventListener('click', () => {
        runRecorderCommandAndCapture();
      });
      recorderCommandInput?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        runRecorderCommandAndCapture();
      });
      recorderAddOutputBtn?.addEventListener('click', () => {
        addRecorderOutputVisual();
      });
      recorderAddReadBtn?.addEventListener('click', () => {
        addRecorderReadVisual();
      });
      recorderReadKindSelect?.addEventListener('change', () => {
        syncRecorderReadKindFields();
      });
      recorderPublishTestButton?.addEventListener('click', () => {
        publishRecorderAsTest();
      });
      recorderRobotSelect?.addEventListener('change', () => {
        renderRecorderRobotTypeTargets();
        syncRecorderUiState();
      });
      recorderCommandInput?.addEventListener('input', () => {
        syncRecorderUiState();
      });
      recorderDefinitionIdInput?.addEventListener('input', () => {
        renderRecorderRobotTypeTargets();
        syncRecorderUiState();
      });
      clearRecorderOutputForm();
      clearRecorderReadForm();
      syncRecorderUiState();
    }

    function onFilterChange() {
      state.filter.name = $('#searchName').value;
      state.filter.type = filterType.value;
      state.filter.error = filterError.value;
      renderDashboard();
    }

    async function loadRobotConfig() {
      try {
        const response = await fetch(ROBOTS_CONFIG_URL);
        if (!response.ok) throw new Error('config unavailable');
        const payload = await response.json();
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.robots)) return payload.robots;
        if (Array.isArray(payload?.fleet)) return payload.fleet;
        return [];
      } catch (_error) {
        return [];
      }
    }

    async function loadRobotTypeConfig() {
      try {
        const response = await fetch(buildApiUrl('/api/robot-types'));
        if (!response.ok) throw new Error('api unavailable');
        const payload = await response.json();
        return setRobotTypeDefinitions(payload);
      } catch (_error) {
        try {
          const response = await fetch(ROBOT_TYPES_CONFIG_URL);
          if (!response.ok) throw new Error('config unavailable');
          const payload = await response.json();
          return setRobotTypeDefinitions(payload);
        } catch (_fallbackError) {
          setRobotTypeDefinitions([]);
          return [];
        }
      }
    }

    function mergeRobotPayload(staticList, liveList) {
      const liveMap = new Map((liveList || []).map((robot) => [robot.id, robot]));
      const mergedRaw = [];
      const seen = new Set();

      (staticList || []).forEach((staticRobot) => {
        const raw = { ...staticRobot };
        if (!raw.id) return;
        seen.add(raw.id);
        const live = liveMap.get(raw.id);
        const mergedRobot = live ? { ...raw, ...live } : raw;
        mergedRobot.tests = {
          ...(raw.tests || {}),
          ...(live?.tests || {}),
        };
        mergedRaw.push(mergedRobot);
      });

      (liveList || []).forEach((liveRobot) => {
        if (!liveRobot.id || seen.has(liveRobot.id)) return;
        mergedRaw.push(liveRobot);
      });

      return normalizeRobotData(mergedRaw);
    }

    async function loadRobotRuntimeState() {
      const response = await fetch(buildApiUrl('/api/robots'));
      if (!response.ok) throw new Error('backend response not ok');
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('backend payload not array');
      return payload;
    }

    function normalizeRuntimeTestUpdate(testId, raw) {
      if (!raw || typeof raw !== 'object') return null;
      const source = normalizeText(raw.source, '');
      if (!RUNTIME_ALLOWED_SOURCES.has(source)) {
        return null;
      }

      return {
        status: normalizeStatus(raw.status),
        value: normalizeText(raw.value, 'n/a'),
        details: normalizeText(raw.details, 'No detail available'),
        reason: normalizeText(raw.reason, ''),
        source,
        checkedAt: Number.isFinite(Number(raw?.checkedAt)) ? Number(raw.checkedAt) : 0,
      };
    }

    function mergeRuntimeRobotsIntoState(liveList) {
      const rawLiveList = Array.isArray(liveList) ? liveList : [];
      const rawLiveById = new Map(rawLiveList.map((robot) => [robotId(robot), robot]));
      const normalizedLive = normalizeRobotData(rawLiveList);
      const liveById = new Map(normalizedLive.map((robot) => [robotId(robot), robot]));
      const merged = [];
      const seen = new Set();
      const changedRobotIds = new Set();

      state.robots.forEach((currentRobot) => {
        const id = robotId(currentRobot);
        if (!id) return;
        seen.add(id);
        const liveRobot = liveById.get(id);
        if (!liveRobot) {
          merged.push(currentRobot);
          return;
        }
        const hasLocalPriorityActivity =
          state.testingRobotIds.has(id) ||
          state.searchingRobotIds.has(id) ||
          state.fixingRobotIds.has(id);
        const rawLiveRobot = rawLiveById.get(id) || {};

        const runtimeUpdates = {};
        if (!hasLocalPriorityActivity) {
          Object.entries(rawLiveRobot.tests || {}).forEach(([testId, raw]) => {
            const update = normalizeRuntimeTestUpdate(testId, raw);
            if (!update) return;
            runtimeUpdates[testId] = update;
          });
        }

        const nextTests = {
          ...(currentRobot.tests || {}),
          ...runtimeUpdates,
        };
        const runtimeChanged = Object.entries(runtimeUpdates).some(([testId, update]) => {
          const prior = currentRobot?.tests?.[testId] || {};
          return (
            normalizeStatus(prior.status) !== update.status ||
            normalizeText(prior.value, '') !== update.value ||
            normalizeText(prior.details, '') !== update.details ||
            normalizeText(prior.reason, '') !== update.reason
          );
        });
        const previousActivity = normalizeRobotActivity(currentRobot?.activity);
        const nextActivity = hasLocalPriorityActivity
          ? previousActivity
          : normalizeRobotActivity(liveRobot?.activity);
        const activityChanged =
          previousActivity.searching !== nextActivity.searching ||
          previousActivity.testing !== nextActivity.testing ||
          normalizeText(previousActivity.phase, '') !== normalizeText(nextActivity.phase, '') ||
          Number(previousActivity.lastFullTestAt) !== Number(nextActivity.lastFullTestAt) ||
          normalizeText(previousActivity.lastFullTestSource, '') !== normalizeText(nextActivity.lastFullTestSource, '') ||
          Number(previousActivity.updatedAt) !== Number(nextActivity.updatedAt);

        const mergedTestDebug = {
          ...normalizeTestDebugCollection(currentRobot?.testDebug),
          ...normalizeTestDebugCollection(rawLiveRobot?.testDebug || liveRobot?.testDebug),
        };
        const nextRobot = {
          ...currentRobot,
          ...liveRobot,
          tests: nextTests,
          activity: nextActivity,
          testDebug: mergedTestDebug,
          testDefinitions:
            Array.isArray(currentRobot.testDefinitions) && currentRobot.testDefinitions.length
              ? currentRobot.testDefinitions
              : liveRobot.testDefinitions,
        };
        if (runtimeChanged || activityChanged) {
          changedRobotIds.add(id);
        }
        merged.push(nextRobot);
      });

      normalizedLive.forEach((liveRobot) => {
        const id = robotId(liveRobot);
        if (!id || seen.has(id)) return;
        merged.push(liveRobot);
        changedRobotIds.add(id);
      });

      return {
        merged,
        changedRobotIds,
      };
    }

    async function refreshRuntimeStateFromBackend() {
      if (state.isRuntimeSyncInFlight) return;
      state.isRuntimeSyncInFlight = true;
      try {
        const live = await loadRobotRuntimeState();
        const mergedRuntime = mergeRuntimeRobotsIntoState(live);
        state.robots = mergedRuntime.merged;
        syncAutomatedRobotActivityFromState();
        syncAutoMonitorRefreshState();
        if (mergedRuntime.changedRobotIds.size > 0) {
          applyRuntimeRobotPatches(mergedRuntime.changedRobotIds);
        }
      } catch (_error) {
        // Keep existing UI state on transient backend fetch failures.
      } finally {
        state.isRuntimeSyncInFlight = false;
      }
    }

    function startRuntimeStateSync() {
      if (state.runtimeSyncTimer) return;
      state.runtimeSyncTimer = window.setInterval(() => {
        refreshRuntimeStateFromBackend();
      }, RUNTIME_SYNC_INTERVAL_MS);
    }

    function stopRuntimeStateSync() {
      if (!state.runtimeSyncTimer) return;
      window.clearInterval(state.runtimeSyncTimer);
      state.runtimeSyncTimer = null;
    }

    async function loadRobotsFromBackend() {
      const [config, _robotTypes] = await Promise.all([loadRobotConfig(), loadRobotTypeConfig()]);
      try {
        const live = await loadRobotRuntimeState();
        if (config.length) {
          return mergeRobotPayload(config, live);
        }
        return normalizeRobotData(live);
      } catch (_e) {
        if (config.length) {
          return normalizeRobotData(config);
        }
        return normalizeRobotData(backendData);
      }
    }

    function routeFromHash() {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) {
        showDashboard({ syncHash: false });
        return;
      }
      const manageRoute = parseManageRoute(hash);
      if (manageRoute.isManageRoute) {
        const shouldCanonicalize = hash === 'add-robot';
        showAddRobotPage({
          tabId: manageRoute.tabId,
          syncHash: shouldCanonicalize,
          refreshDefinitions: !isManageViewActive(),
        });
        return;
      }
      if (!hash.startsWith('robot/')) return;
      const id = hash.split('/')[1];
      if (id) openDetail(id, { syncHash: false });
    }

    export function initDashboardApp() {
      hydrateActionButtons(document);
      initThemeControls();
      syncModalScrollLock();
      try {
        state.terminalComponent = new RobotTerminalComponent({
          terminalElement: terminal,
          toolbarElement: terminalToolbar,
          badgeElement: terminalBadge,
          hintElement: terminalHint,
          terminalCtor: window.Terminal,
          fitAddonCtor: window.FitAddon ? window.FitAddon.FitAddon : null,
          endpointBuilder: (robotId) => buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/terminal`),
          onFallbackMode: runFallbackChecks,
          onFallbackCommand: (robot, command, commandId, reason) =>
            runFallbackCommandSimulation(robot, command, commandId, reason),
          onModeChange: (mode) => {
            state.terminalMode = mode;
          },
          showReconnectButton: true,
          showRebuildButton: true,
          showFullscreenButton: false,
        });
      } catch (error) {
        console.error('Terminal component initialization failed, falling back to compatibility mode.', error);
        state.terminalComponent = {
          mode: 'fallback',
          connect: (robot) => {
            if (!robot) return;
            if (terminalBadge) terminalBadge.className = 'terminal-status warn';
            if (terminalBadge) terminalBadge.textContent = 'Terminal fallback mode';
            if (terminalHint) terminalHint.textContent = 'Command endpoint not found. Using fallback simulation.';
            if (terminal) terminal.classList.add('fallback');
            runFallbackChecks(robot);
          },
          dispose: () => {
            state.terminalMode = 'fallback';
            if (terminalBadge) terminalBadge.className = 'terminal-status warn';
            if (terminalBadge) terminalBadge.textContent = 'Terminal component error';
            if (terminalHint) terminalHint.textContent = 'Command endpoint not found. Using fallback simulation.';
          },
          fit: () => {},
          runCommand: async () => {},
        };
      }

      Promise.resolve()
        .then(loadRobotsFromBackend)
        .then((robots) => {
          state.robots = robots;
          syncAutomatedRobotActivityFromState();
          syncAutoMonitorRefreshState();
          populateFilters();
          populateAddRobotTypeOptions();
          renderRecorderRobotOptions();
          renderDashboard();
          routeFromHash();
          syncFixModePanels();
        })
        .catch(() => {
          state.robots = normalizeRobotData(backendData);
          syncAutomatedRobotActivityFromState();
          syncAutoMonitorRefreshState();
          populateFilters();
          populateAddRobotTypeOptions();
          renderRecorderRobotOptions();
          renderDashboard();
          routeFromHash();
          syncFixModePanels();
        });

      $('#searchName').addEventListener('input', onFilterChange);
      filterType.addEventListener('change', onFilterChange);
      filterError.addEventListener('change', onFilterChange);
      syncOnlineSortButton();
      cycleOnlineSortButton?.addEventListener('click', () => {
        cycleOnlineSortMode();
      });
      $('#backToFleet').addEventListener('click', showDashboard);
      $('#openAddRobot')?.addEventListener('click', showAddRobotPage);
      $('#openBugReport')?.addEventListener('click', openBugReportModal);
      $('#openBugReportFloating')?.addEventListener('click', openBugReportModal);
      $('#backFromAddRobot')?.addEventListener('click', showDashboard);
      initManageTabs();
      initWorkflowRecorder();
      initVisualFlows();
      if (addRobotForm) {
        addRobotForm.addEventListener('submit', (event) => {
          event.preventDefault();
          createRobotFromForm();
        });
      }
      if (manageTestEditorForm) {
        manageTestEditorForm.addEventListener('submit', (event) => {
          event.preventDefault();
          saveManageTestDefinition();
        });
      }
      if (manageFixEditorForm) {
        manageFixEditorForm.addEventListener('submit', (event) => {
          event.preventDefault();
          saveManageFixDefinition();
        });
      }
      initFleetParallelism();
      initMonitorConfigControls();
      initAddRobotPasswordToggle();
      if (activateTerminalButton) {
        activateTerminalButton.addEventListener('click', () => {
          const robot = state.robots.find((r) => robotId(r) === state.detailRobotId);
          if (!robot) return;
          initRobotTerminal(robot);
        });
      }
      if (toggleDashboardFixModeButton) {
        toggleDashboardFixModeButton.addEventListener('click', () => {
          toggleFixMode(FIX_MODE_CONTEXT_DASHBOARD);
        });
      }
      if (toggleDetailFixModeButton) {
        toggleDetailFixModeButton.addEventListener('click', () => {
          toggleFixMode(FIX_MODE_CONTEXT_DETAIL);
        });
      }

      window.addEventListener('hashchange', () => {
        if (state.ignoreNextHashChange) {
          state.ignoreNextHashChange = false;
          return;
        }
        if (!window.location.hash) {
          showDashboard({ syncHash: false });
          return;
        }
        routeFromHash();
      });

      window.addEventListener('resize', () => {
        if (state.terminalComponent && state.terminalMode === 'live') {
          state.terminalComponent.fit();
        }
      });
      if (testDebugClose) {
        testDebugClose.addEventListener('click', closeTestDebugModal);
      }
      if (testDebugModal) {
        testDebugModal.addEventListener('click', (event) => {
          if (event.target === testDebugModal || event.target?.dataset?.action === 'close-modal') {
            closeTestDebugModal();
          }
        });
      }
      if (cancelBugReportButton) {
        cancelBugReportButton.addEventListener('click', closeBugReportModal);
      }
      if (submitBugReportButton) {
        submitBugReportButton.addEventListener('click', submitBugReport);
      }
      if (bugReportModal) {
        bugReportModal.addEventListener('click', (event) => {
          if (event.target === bugReportModal) {
            closeBugReportModal();
          }
        });
      }
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (state.testDebugModalOpen) {
          closeTestDebugModal();
        }
        if (state.isBugReportModalOpen) {
          closeBugReportModal();
        }
      });

      $('#selectAllRobots').addEventListener('click', () => {
        selectAllRobots();
      });

      $('#selectAllOnlineRobots').addEventListener('click', () => {
        selectAllOnlineRobots();
      });

      $('#selectAllOfflineRobots').addEventListener('click', () => {
        selectAllOfflineRobots();
      });

      $('#runFleetOnline').addEventListener('click', () => {
        runOnlineCheckForAllRobots();
      });

      $('#runRobotTests').addEventListener('click', () => {
        if (!state.detailRobotId) return;
        runManualTests({ fallbackToActive: true });
      });

      $('#runSelectedRobotTests').addEventListener('click', () => {
        runManualTests({ fallbackToActive: false, autoSelectOnlineWhenEmpty: true });
      });

      startRuntimeStateSync();
      window.addEventListener('beforeunload', () => {
        stopRuntimeStateSync();
        stopOnlineRefreshStatusTimer();
      });
    }
