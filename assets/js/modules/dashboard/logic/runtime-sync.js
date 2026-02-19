export function shouldApplyRuntimeUpdate(previousCheckedAt, incomingCheckedAt) {
  return Number(incomingCheckedAt || 0) >= Number(previousCheckedAt || 0);
}
