import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { FLEET_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createFleetRuntimeBridge(runtime) {
  const bridge = createRuntimeBridge(runtime, FLEET_RUNTIME_METHOD_NAMES);

  return {
    ...bridge,
    stopCurrentJob: (...args) => runtime.stopCurrentJob?.(...args),
    renderRobotJobQueueStrip: (...args) => runtime.renderRobotJobQueueStrip?.(...args) || '',
    renderRobotStopCurrentJobButton: (...args) => runtime.renderRobotStopCurrentJobButton?.(...args) || '',
  };
}
