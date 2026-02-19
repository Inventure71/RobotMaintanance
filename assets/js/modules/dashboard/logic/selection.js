export function toggleSelection(setRef, id, enabled) {
  if (!(setRef instanceof Set)) return;
  if (enabled) {
    setRef.add(id);
  } else {
    setRef.delete(id);
  }
}
