export function createRobotSummaryPills(deps = {}) {
  let root = null;
  let props = {};

  function mount(nextRoot) {
    root = nextRoot || null;
    return root;
  }

  function update(nextProps = {}) {
    props = { ...props, ...nextProps };
    return props;
  }

  function unmount() {
    root = null;
    props = {};
  }

  return {
    deps,
    mount,
    update,
    unmount,
  };
}
