import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { RECORDER_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createRecorderRuntimeBridge(runtime) {
  return createRuntimeBridge(runtime, RECORDER_RUNTIME_METHOD_NAMES);
}
