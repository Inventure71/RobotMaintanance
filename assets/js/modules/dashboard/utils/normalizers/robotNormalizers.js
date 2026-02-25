import { normalizeStatus, normalizeText, normalizeTypeId } from '../../../../lib/normalize.js';

export function normalizeRobotIdentity(raw = {}) {
  return {
    id: normalizeText(raw.id, ''),
    name: normalizeText(raw.name, ''),
    typeId: normalizeTypeId(raw.typeId || raw.type || ''),
    type: normalizeText(raw.type || raw.typeId, ''),
    ip: normalizeText(raw.ip, ''),
  };
}

export function normalizeRobotTestResult(raw = {}) {
  return {
    status: normalizeStatus(raw.status),
    value: normalizeText(raw.value, 'n/a'),
    details: normalizeText(raw.details, 'No detail available'),
    reason: normalizeText(raw.reason, ''),
  };
}
