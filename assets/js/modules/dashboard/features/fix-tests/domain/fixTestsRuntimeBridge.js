import { createRuntimeBridge } from '../../shared/domain/createRuntimeBridge.js';
import { FIX_TESTS_RUNTIME_METHOD_NAMES } from '../../shared/domain/runtimeBridgeMethodNames.js';

export function createFixTestsRuntimeBridge(runtime) {
  const bridge = createRuntimeBridge(runtime, FIX_TESTS_RUNTIME_METHOD_NAMES);

  return {
    ...bridge,
    patchDashboardForChangedRobots: (...args) => runtime.patchDashboardForChangedRobots?.(...args),
  };
}
