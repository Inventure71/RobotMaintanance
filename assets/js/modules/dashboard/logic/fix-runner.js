export function isFlashFix(candidate) {
  return String(candidate?.id || '') === 'flash_fix';
}
