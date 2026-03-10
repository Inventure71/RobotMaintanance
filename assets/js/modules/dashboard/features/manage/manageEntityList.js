function normalizeEntityLabel(label, fallbackId) {
  if (label && typeof label === 'object' && !Array.isArray(label)) {
    const title = String(label.title ?? label.primary ?? fallbackId ?? '').trim() || String(fallbackId ?? '');
    const meta = String(label.meta ?? label.secondary ?? '').trim();
    const accessibleText = String(label.ariaLabel ?? [title, meta].filter(Boolean).join(' ')).trim() || title;
    return { title, meta, accessibleText };
  }

  const title = String(label ?? fallbackId ?? '').trim() || String(fallbackId ?? '');
  return { title, meta: '', accessibleText: title };
}

export function renderManageEntityList({
  container,
  items,
  emptyText = 'No items.',
  getId,
  getLabel,
  onSelect,
  activeId = '',
}) {
  if (!container) return;
  container.replaceChildren();

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'manage-list-empty';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  list.forEach((item) => {
    const id = typeof getId === 'function' ? getId(item) : '';
    if (!id) return;
    const label = normalizeEntityLabel(typeof getLabel === 'function' ? getLabel(item) : id, id);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `manage-list-item${id === activeId ? ' active' : ''}`;
    row.setAttribute('aria-label', label.accessibleText);
    row.title = label.accessibleText;

    const title = document.createElement('span');
    title.className = 'manage-list-item-title';
    title.textContent = label.title;
    row.appendChild(title);

    if (label.meta) {
      const meta = document.createElement('span');
      meta.className = 'manage-list-item-meta';
      meta.textContent = label.meta;
      row.appendChild(meta);
    }

    if (typeof onSelect === 'function') {
      row.addEventListener('click', () => onSelect(item, id));
    }
    container.appendChild(row);
  });
}
