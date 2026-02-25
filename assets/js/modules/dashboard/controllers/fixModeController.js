export function createFixModeController(deps = {}) {
  function mount() {}
  function update() {}
  function unmount() {}

  return {
    deps,
    mount,
    update,
    unmount,
  };
}
