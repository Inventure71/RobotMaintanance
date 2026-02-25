import { renderBatteryPill } from '../../../../components/battery-pill-component.js';

export function createBatteryPill(deps = {}) {
  let node = null;

  function mount(root) {
    node = root || document.createElement('span');
    return node;
  }

  function update(props = {}) {
    if (!node) return null;
    node.innerHTML = renderBatteryPill({
      value: props.value,
      status: props.status,
      reason: props.reason,
      size: props.size || 'default',
    });
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
