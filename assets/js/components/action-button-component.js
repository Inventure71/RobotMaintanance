const SUPPORTED_INTENTS = new Set([
  'run',
  'monitor',
  'selection',
  'navigation',
  'create',
  'terminal',
  'danger',
  'fix',
  'utility',
]);

function normalizeIntent(intent) {
  const value = String(intent || '').trim().toLowerCase();
  return SUPPORTED_INTENTS.has(value) ? value : 'utility';
}

function setIntentClass(button, intent) {
  Array.from(button.classList)
    .filter((name) => name.startsWith('app-button--intent-'))
    .forEach((name) => button.classList.remove(name));
  button.classList.add(`app-button--intent-${intent}`);
}

export function applyActionButton(button, options = {}) {
  if (!button) return null;

  const intent = normalizeIntent(options.intent ?? button.dataset.buttonIntent ?? 'utility');
  const size = String(options.size ?? button.dataset.buttonSize ?? '').trim().toLowerCase();
  const compact =
    options.compact === true ||
    size === 'compact' ||
    button.classList.contains('button-compact');
  const pressed =
    options.pressed === undefined ? button.getAttribute('aria-pressed') === 'true' : !!options.pressed;
  const disabled = options.disabled === undefined ? !!button.disabled : !!options.disabled;
  const loading = options.loading === true;

  button.classList.add('button', 'app-button');
  setIntentClass(button, intent);
  button.classList.toggle('button-compact', compact);
  button.classList.toggle('app-button--compact', compact);
  button.classList.toggle('app-button--pressed', pressed);
  button.classList.toggle('app-button--loading', loading);

  button.dataset.buttonIntent = intent;
  button.dataset.buttonSize = compact ? 'compact' : 'default';

  if (typeof options.label === 'string') {
    button.textContent = options.label;
  }
  if (typeof options.title === 'string') {
    button.title = options.title;
  }
  if (options.ariaLabel !== undefined) {
    button.setAttribute('aria-label', String(options.ariaLabel || ''));
  }
  if (options.type) {
    button.type = options.type;
  }

  button.disabled = disabled;
  return button;
}

export function setActionButtonLoading(button, isLoading, options = {}) {
  if (!button) return;
  const loadingLabel = String(options.loadingLabel || 'Working...');
  if (typeof options.idleLabel === 'string') {
    button.dataset.idleLabel = options.idleLabel;
  } else if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent || '';
  }

  applyActionButton(button, {
    loading: isLoading,
    disabled: isLoading || options.disabled === true,
  });
  button.textContent = isLoading ? loadingLabel : button.dataset.idleLabel;
}

export function createActionButton(options = {}) {
  const button = document.createElement('button');
  button.type = options.type || 'button';
  applyActionButton(button, options);
  return button;
}

export function hydrateActionButtons(root = document) {
  const scope = root || document;
  const candidates = scope.querySelectorAll('.button, [data-button-intent]');
  candidates.forEach((button) => {
    applyActionButton(button);
  });
}
