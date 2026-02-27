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
    const label = typeof getLabel === 'function' ? getLabel(item) : id;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `manage-list-item${id === activeId ? ' active' : ''}`;
    row.textContent = label;
    if (typeof onSelect === 'function') {
      row.addEventListener('click', () => onSelect(item, id));
    }
    container.appendChild(row);
  });
}
