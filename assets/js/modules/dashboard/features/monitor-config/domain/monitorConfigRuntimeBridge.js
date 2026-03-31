import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { MONITOR_CONFIG_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createMonitorConfigRuntimeBridge(runtime) {
  return createRuntimeBridge(runtime, MONITOR_CONFIG_RUNTIME_METHOD_NAMES);
}
