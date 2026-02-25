export function createModalShell(deps = {}) {
  let node = null;

  function mount(root) {
    node = root || null;
    return node;
  }

  function update(props = {}) {
    if (!node) return null;
    node.classList.toggle('active', Boolean(props.open));
    if (props.ariaLabel) {
      node.setAttribute('aria-label', props.ariaLabel);
    }
    return node;
  }

  function unmount() {
    node = null;
  }

  return {
    deps,
    mount,
    update,
    unmount,
  };
}
