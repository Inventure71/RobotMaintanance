import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { DETAIL_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createDetailRuntimeBridge(runtime) {
  const bridge = createRuntimeBridge(runtime, DETAIL_RUNTIME_METHOD_NAMES);

  return {
    ...bridge,
    stopCurrentJob: (...args) => runtime.stopCurrentJob?.(...args),
    renderRobotJobQueueStrip: (...args) => runtime.renderRobotJobQueueStrip?.(...args) || '',
    renderRobotStopCurrentJobButton: (...args) => runtime.renderRobotStopCurrentJobButton?.(...args) || '',
  };
}
