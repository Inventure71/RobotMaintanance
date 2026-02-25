import { normalizeStatus, normalizeText } from '../../../../lib/normalize.js';

export function normalizeTestDefinition(raw = {}) {
  return {
    id: normalizeText(raw.id, ''),
    label: normalizeText(raw.label, normalizeText(raw.id, '')),
    icon: normalizeText(raw.icon, 'TST'),
  };
}

export function normalizeTestResult(raw = {}) {
  return {
    status: normalizeStatus(raw.status),
    value: normalizeText(raw.value, 'n/a'),
    details: normalizeText(raw.details, 'No detail available'),
  };
}
