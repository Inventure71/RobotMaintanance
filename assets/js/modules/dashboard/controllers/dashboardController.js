import { RobotTerminalComponent } from '../../../components/robot-terminal-component.js';
import { WorkflowRecorderComponent } from '../../../components/workflow-recorder-component.js';
import { renderBatteryPill } from '../../../components/battery-pill-component.js';
import { initVisualFlows } from '../../../components/visual-flows.js';
import {
  applyActionButton,
  createActionButton,
  hydrateActionButtons,
  setActionButtonLoading,
} from '../../../components/action-button-component.js';
import { initThemeSwitcher } from '../../../components/theme-switcher-component.js';
import {
  DEFAULT_TEST_DEFINITIONS,
  PRESET_COMMANDS,
  ROBOTS_CONFIG_URL,
  ROBOT_TYPES_CONFIG_URL,
  DEFAULT_ROBOT_MODEL_URL,
  backendData,
} from '../../../config/app-defaults.js';
import { normalizeStatus, normalizeText, normalizeTypeId } from '../../../lib/normalize.js';
import { $, $$ } from '../../../lib/dom.js';
import { buildApiUrl, createPageSessionId } from '../api/client.js';
import { dashboardRuntimeSource } from './runtime-parts/index.js';

const runtimeFactory = new Function(
  'deps',
  `'use strict';\nconst {RobotTerminalComponent, WorkflowRecorderComponent, renderBatteryPill, initVisualFlows, applyActionButton, createActionButton, hydrateActionButtons, setActionButtonLoading, initThemeSwitcher, DEFAULT_TEST_DEFINITIONS, PRESET_COMMANDS, ROBOTS_CONFIG_URL, ROBOT_TYPES_CONFIG_URL, DEFAULT_ROBOT_MODEL_URL, backendData, normalizeStatus, normalizeText, normalizeTypeId, $, $$, buildApiUrl, createPageSessionId} = deps;\n${dashboardRuntimeSource}\nreturn initDashboardController;`,
);

export function initDashboardController(overrides = {}) {
  const init = runtimeFactory({
    RobotTerminalComponent: RobotTerminalComponent, WorkflowRecorderComponent: WorkflowRecorderComponent, renderBatteryPill: renderBatteryPill, initVisualFlows: initVisualFlows, applyActionButton: applyActionButton, createActionButton: createActionButton, hydrateActionButtons: hydrateActionButtons, setActionButtonLoading: setActionButtonLoading, initThemeSwitcher: initThemeSwitcher, DEFAULT_TEST_DEFINITIONS: DEFAULT_TEST_DEFINITIONS, PRESET_COMMANDS: PRESET_COMMANDS, ROBOTS_CONFIG_URL: ROBOTS_CONFIG_URL, ROBOT_TYPES_CONFIG_URL: ROBOT_TYPES_CONFIG_URL, DEFAULT_ROBOT_MODEL_URL: DEFAULT_ROBOT_MODEL_URL, backendData: backendData, normalizeStatus: normalizeStatus, normalizeText: normalizeText, normalizeTypeId: normalizeTypeId, $: $, $$: $$, buildApiUrl: buildApiUrl, createPageSessionId: createPageSessionId,
    ...overrides,
  });
  return init();
}

export const initDashboardApp = initDashboardController;
