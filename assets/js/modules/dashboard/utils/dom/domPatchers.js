export function replaceChildren(node, children = []) {
  if (!node) return;
  node.replaceChildren(...children.filter(Boolean));
}

export function setText(node, text = '') {
  if (!node) return;
  node.textContent = text;
}
