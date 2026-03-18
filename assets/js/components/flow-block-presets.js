function applyRowLayoutStyles(row) {
  row.style.display = 'flex';
  row.style.flexDirection = 'column';
  row.style.alignItems = 'stretch';
}

export function commandUsesSudo(rawCommand) {
  return /^\s*sudo(?:\s|$)/i.test(String(rawCommand || ''));
}

function buildHeader({
  icon = '',
  title = '',
  description = '',
  removeLabel = 'Remove',
  onRemove = null,
  actionButtons = [],
}) {
  const header = document.createElement('div');
  header.style.display = 'grid';
  header.style.gridTemplateColumns = 'auto 1fr auto';
  header.style.gap = '16px';
  header.style.alignItems = 'center';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'flow-block-icon';
  iconWrap.textContent = icon;

  const content = document.createElement('div');
  content.className = 'flow-block-content';

  const titleNode = document.createElement('div');
  titleNode.className = 'flow-block-title';
  titleNode.textContent = title;

  const descriptionNode = document.createElement('div');
  descriptionNode.className = 'flow-block-desc';
  descriptionNode.textContent = description;

  content.append(titleNode, descriptionNode);

  const actionWrap = document.createElement('div');
  actionWrap.className = 'flow-block-actions';

  actionButtons
    .filter((action) => action && typeof action === 'object')
    .forEach((action) => {
      const button = document.createElement('button');
      button.className = `button button-compact ${String(action.className || '').trim()}`.trim();
      button.textContent = String(action.label || 'Action');
      button.type = 'button';
      button.disabled = Boolean(action.disabled);
      if (action.title) button.title = String(action.title);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (button.disabled || typeof action.onClick !== 'function') return;
        action.onClick();
      });
      actionWrap.append(button);
    });

  let removeBtn = null;
  if (typeof onRemove === 'function') {
    removeBtn = document.createElement('button');
    removeBtn.className = 'button button-compact';
    removeBtn.textContent = removeLabel;
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      onRemove();
    });
    actionWrap.append(removeBtn);
  }

  header.append(iconWrap, content, actionWrap);
  return { header, actionWrap, removeBtn };
}

export function createFlowBlockContainer() {
  const container = document.createElement('div');
  container.className = 'flow-block-container';
  return container;
}

export function createFlowEmptyState(text = 'No blocks in flow yet.') {
  const empty = document.createElement('div');
  empty.className = 'manage-list-empty';
  empty.textContent = text;
  return empty;
}

export function createFlowBlockPreset({
  variant = 'read',
  icon = '',
  title = '',
  description = '',
  actionButtons = [],
  actionLayout = 'inline',
  riskLevel = '',
  riskLabel = '',
  riskTitle = '',
  onRemove = null,
  removeLabel = 'Remove',
  onToggle = null,
  renderEditor = null,
  startOpen = false,
  editButtonPlacement = 'start',
}) {
  const normalizedVariant = String(variant || 'read').toLowerCase() === 'write' ? 'write' : 'read';
  const normalizedRiskLevel = String(riskLevel || '').trim().toLowerCase();
  const row = document.createElement('div');
  row.className = `flow-block ${normalizedVariant}-block`;
  applyRowLayoutStyles(row);

  const { header, actionWrap, removeBtn } = buildHeader({
    icon,
    title,
    description,
    removeLabel,
    onRemove,
    actionButtons,
  });

  if (actionWrap && actionLayout === 'two-column') {
    actionWrap.classList.add('flow-block-actions--two-column');
  }

  if (normalizedRiskLevel) {
    row.classList.add('flow-block-risk', `flow-block-risk--${normalizedRiskLevel}`);
    row.dataset.riskLevel = normalizedRiskLevel;
    row.dataset.riskyCommand = 'true';

    const content = header.querySelector('.flow-block-content');
    if (content) {
      const badge = document.createElement('div');
      badge.className = 'flow-block-risk-badge';
      badge.textContent = String(riskLabel || `${normalizedRiskLevel} risk`);
      if (riskTitle) badge.title = String(riskTitle);
      content.appendChild(badge);
    }
  }

  const editor = document.createElement('div');
  editor.className = 'flow-block-editor-modal';
  editor.style.display = 'none';
  const hasEditor = typeof renderEditor === 'function';
  let editBtn = null;

  if (hasEditor && actionWrap) {
    editBtn = document.createElement('button');
    editBtn.className = 'button button-compact';
    editBtn.textContent = 'Edit';
    editBtn.type = 'button';
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setEditing(!isEditing);
    });
    if (editButtonPlacement === 'before-remove' && removeBtn) {
      const existingChildren = Array.from(actionWrap.children || []).filter((child) => child !== removeBtn);
      actionWrap.replaceChildren(...existingChildren, editBtn, removeBtn);
    } else {
      actionWrap.prepend(editBtn);
    }
  }

  let isEditing = false;
  const setEditing = (nextEditing) => {
    const next = Boolean(nextEditing);
    if (next === isEditing) return;
    isEditing = next;
    editor.style.display = next ? 'grid' : 'none';
    if (editBtn) {
      editBtn.textContent = next ? 'Close' : 'Edit';
    }
    if (typeof onToggle === 'function') {
      onToggle(next);
    }
  };

  header.addEventListener('click', () => {
    if (!hasEditor) return;
    setEditing(!isEditing);
  });

  if (hasEditor) {
    renderEditor(editor, {
      isEditing: () => isEditing,
      setEditing,
      close: () => setEditing(false),
      open: () => setEditing(true),
    });
    if (startOpen) {
      setEditing(true);
    }
  }

  row.append(header, editor);
  return row;
}
