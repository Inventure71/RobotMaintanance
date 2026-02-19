function clampPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPercentFromRaw(rawValue) {
  const text = normalizeText(rawValue, '');
  if (!text) return null;

  const explicitPercent = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (explicitPercent) {
    return clampPercent(Number.parseFloat(explicitPercent[1]));
  }

  const plainNumber = text.match(/^-?\d+(?:\.\d+)?$/);
  if (plainNumber) {
    return clampPercent(Number.parseFloat(text));
  }

  return null;
}

function normalizeBatteryDisplayValue(rawValue) {
  const text = normalizeText(rawValue, 'n/a');
  const percent = getPercentFromRaw(text);
  if (percent === null) return text;
  return `${Math.round(percent)}%`;
}

function normalizeBatteryTone(status, levelPercent) {
  const state = normalizeText(status, '').toLowerCase();
  if (state === 'error') return 'critical';
  if (state === 'warning') return 'warning';
  if (!Number.isFinite(levelPercent)) {
    return state === 'ok' ? 'ok' : 'unknown';
  }
  if (levelPercent <= 20) return 'critical';
  if (levelPercent <= 45) return 'warning';
  return 'ok';
}

export function renderBatteryPill(options = {}) {
  const label = normalizeText(options.label, 'Battery');
  const size = options.size === 'small' ? 'small' : 'default';
  const showLabel = options.showLabel !== false;
  const displayValue = normalizeBatteryDisplayValue(options.value);
  const levelPercent = getPercentFromRaw(options.value);
  const tone = normalizeBatteryTone(options.status, levelPercent);
  const safeLevelPercent = Number.isFinite(levelPercent) ? Math.round(levelPercent) : 0;
  const levelStyle = `style="width:${safeLevelPercent}%"`;
  const valueWithLabel = showLabel ? `${label} ${displayValue}` : displayValue;
  const titleText = showLabel ? `${label}: ${displayValue}` : displayValue;

  return `
    <span class="battery-pill battery-pill-${tone} battery-pill-${size}" title="${escapeHtml(titleText)}" aria-label="${escapeHtml(titleText)}">
      <span class="battery-pill-icon" aria-hidden="true">
        <span class="battery-pill-meter">
          <span class="battery-pill-meter-fill" ${levelStyle}></span>
        </span>
      </span>
      <span class="battery-pill-value">${escapeHtml(valueWithLabel)}</span>
    </span>`;
}
