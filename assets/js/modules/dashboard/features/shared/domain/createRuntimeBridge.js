export function createRuntimeBridge(runtime, methodNames) {
  return Object.fromEntries(
    (Array.isArray(methodNames) ? methodNames : []).map((name) => [name, (...args) => runtime[name](...args)])
  );
}
