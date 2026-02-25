import { normalizeStatus, normalizeText } from '../../../../lib/normalize.js';

const ALLOWED_SOURCES = new Set(['manual', 'live', 'auto-monitor', 'auto-monitor-topics']);

export function normalizeRuntimeTestUpdate(testId, raw = {}) {
  const source = normalizeText(raw.source, '');
  if (!ALLOWED_SOURCES.has(source)) return null;
  return {
    id: normalizeText(testId, ''),
    status: normalizeStatus(raw.status),
    value: normalizeText(raw.value, 'n/a'),
    details: normalizeText(raw.details, 'No detail available'),
    reason: normalizeText(raw.reason, ''),
    source,
    checkedAt: Number(raw.checkedAt) || 0,
  };
}

export function normalizeRuntimeActivity(raw = {}) {
  return {
    searching: Boolean(raw.searching),
    testing: Boolean(raw.testing),
    phase: normalizeText(raw.phase, '') || null,
    lastFullTestAt: Number(raw.lastFullTestAt) || 0,
    lastFullTestSource: normalizeText(raw.lastFullTestSource, '') || null,
    updatedAt: Number(raw.updatedAt) || 0,
  };
}
