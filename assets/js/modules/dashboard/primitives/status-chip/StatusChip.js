import { normalizeStatus } from '../../../../lib/normalize.js';

export function createStatusChip(deps = {}) {
  let node = null;

  function mount(root) {
    node = root || document.createElement('span');
    node.classList.add('status-chip');
    return node;
  }

  function update(props = {}) {
    if (!node) return null;
    const status = normalizeStatus(props.status);
    node.classList.remove('ok', 'warn', 'err');
    if (status === 'ok') node.classList.add('ok');
    else if (status === 'error') node.classList.add('err');
    else node.classList.add('warn');
    node.textContent = props.label || (status === 'ok' ? 'Healthy' : status === 'error' ? 'Critical' : 'Warning');
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
