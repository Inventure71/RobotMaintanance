export function createRoutingController(deps = {}) {
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
