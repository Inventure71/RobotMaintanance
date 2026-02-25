export function createPill(deps = {}) {
  let node = null;

  function mount(root) {
    node = root || document.createElement('span');
    node.classList.add('pill');
    return node;
  }

  function update(props = {}) {
    if (!node) return null;
    node.textContent = String(props.text || '');
    if (props.title) node.title = String(props.title);
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
