import { applyActionButton } from '../../../../components/action-button-component.js';

export function createActionButton(deps = {}) {
  let node = null;

  function mount(root) {
    node = root || null;
    return node;
  }

  function update(props = {}) {
    if (!node) return null;
    applyActionButton(node, props);
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
