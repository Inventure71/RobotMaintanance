import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { DATA_INIT_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createDataInitRuntimeBridge(runtime) {
  return createRuntimeBridge(runtime, DATA_INIT_RUNTIME_METHOD_NAMES);
}
