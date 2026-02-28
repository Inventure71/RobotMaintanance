function applyRowLayoutStyles(row) {
  row.style.display = 'flex';
  row.style.flexDirection = 'column';
  row.style.alignItems = 'stretch';
}

function buildHeader({
  icon = '',
  title = '',
  description = '',
  removeLabel = 'Remove',
  onRemove = null,
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

  if (typeof onRemove === 'function') {
    const removeBtn = document.createElement('button');
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
  return header;
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
  onRemove = null,
  removeLabel = 'Remove',
  onToggle = null,
  renderEditor = null,
}) {
  const normalizedVariant = String(variant || 'read').toLowerCase() === 'write' ? 'write' : 'read';
  const row = document.createElement('div');
  row.className = `flow-block ${normalizedVariant}-block`;
  applyRowLayoutStyles(row);

  const header = buildHeader({
    icon,
    title,
    description,
    removeLabel,
    onRemove,
  });

  const editor = document.createElement('div');
  editor.className = 'flow-block-editor-modal';
  editor.style.display = 'none';
  const hasEditor = typeof renderEditor === 'function';
  const actionWrap = header.querySelector('.flow-block-actions');
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
    actionWrap.prepend(editBtn);
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
  }

  row.append(header, editor);
  return row;
}
