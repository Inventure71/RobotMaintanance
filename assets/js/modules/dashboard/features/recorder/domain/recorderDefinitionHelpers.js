export function normalizeIdList({ normalizeText, values }) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const normalized = normalizeText(item, '');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

export function normalizeTagList({ normalizeText, values, ownerDefault = false }) {
  const list = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(/[\n,]+/g)
      : [];
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const normalized = normalizeText(item, '').toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  if (ownerDefault && !out.length) {
    return ['global'];
  }
  return out;
}

export function parseTagInput({ normalizeTagList, inputElement, ownerDefault = false }) {
  if (!inputElement) {
    return ownerDefault ? ['global'] : [];
  }
  return normalizeTagList(inputElement.value, { ownerDefault });
}

export function formatTagInputValue({
  normalizeTagList,
  tags,
  ownerDefault = false,
  hideGlobalDefault = true,
}) {
  const normalized = normalizeTagList(tags, { ownerDefault });
  if (hideGlobalDefault && normalized.length === 1 && normalized[0] === 'global') {
    return '';
  }
  return normalized.join(', ');
}

export function resolveCheckRunAtConnection(check, fallback = true) {
  if (typeof check?.runAtConnection === 'boolean') {
    return check.runAtConnection;
  }
  if (typeof check?.metadata?.runAtConnection === 'boolean') {
    return check.metadata.runAtConnection;
  }
  return Boolean(fallback);
}

export function applyRunAtConnection(entries, runAtConnection) {
  const list = Array.isArray(entries) ? entries : [];
  const value = Boolean(runAtConnection);
  return list.map((entry) => ({
    ...(entry && typeof entry === 'object' ? entry : {}),
    runAtConnection: value,
  }));
}

export function inferUniformRunAtConnection({
  entries,
  fallback = true,
  resolveCheckRunAtConnectionFn = resolveCheckRunAtConnection,
}) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return Boolean(fallback);
  const values = list.map((entry) => resolveCheckRunAtConnectionFn(entry, fallback));
  const first = values[0];
  const mixed = values.some((value) => value !== first);
  if (mixed) return null;
  return first;
}

export function slugifyRecorderValue({ normalizeText, value, fallback = '' }) {
  const slug = normalizeText(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback;
}

export function normalizeRecorderMode({ normalizeText, mode = '' }) {
  const normalized = normalizeText(mode, '').toLowerCase();
  return normalized === 'simple' || normalized === 'advanced' ? normalized : '';
}

export function normalizeRecorderSimpleStep({ normalizeText, recorderSimpleSteps, step = '' }) {
  const normalized = normalizeText(step, '').toLowerCase();
  return recorderSimpleSteps.includes(normalized) ? normalized : 'terminal';
}

function quoteRecorderShellValue(value) {
  return `'${String(value ?? '').replace(/'/g, `'"'"'`)}'`;
}

export function normalizeRecorderGenericInfoConfig({ normalizeText, rawConfig }) {
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const commands = Array.isArray(config.commands) ? config.commands : [];
  const normalizedCommands = commands
    .map((entry, index) => {
      const label = normalizeText(entry?.label, `Command ${index + 1}`);
      const command = normalizeText(entry?.command, '');
      const timeoutSec = Number(entry?.timeoutSec);
      if (!command) return null;
      return {
        label,
        command,
        timeoutSec: Number.isFinite(timeoutSec) && timeoutSec > 0 ? Math.floor(timeoutSec) : 10,
      };
    })
    .filter(Boolean);
  if (!normalizedCommands.length) {
    throw new Error('Recorder generic info config has no runnable commands.');
  }
  return {
    id: normalizeText(config.id, 'recorder_generic_info'),
    label: normalizeText(config.label, 'Recorder generic info'),
    commands: normalizedCommands,
  };
}

export function buildRecorderGenericInfoBundleCommand({
  normalizeRecorderGenericInfoConfig,
  rawConfig,
}) {
  const config = normalizeRecorderGenericInfoConfig(rawConfig);
  const scriptLines = [
    'set +e',
    `printf '%s\\n' ${quoteRecorderShellValue(`=== ${config.label} ===`)}`,
    `printf '%s\\n' ${quoteRecorderShellValue('Read-only diagnostics for recorder and external LLM context.')}`,
    'run_block() {',
    '  local label="$1"',
    '  local timeout_sec="$2"',
    '  local command="$3"',
    `  printf '\\n===== %s =====\\n' "$label"`,
    '  timeout "${timeout_sec}s" bash -lc "$command"',
    '  local status=$?',
    '  if [ "$status" -eq 124 ]; then',
    `    printf '[timeout after %ss]\\n' "$timeout_sec"`,
    '  elif [ "$status" -ne 0 ]; then',
    `    printf '[exit %s]\\n' "$status"`,
    '  fi',
    '}',
    ...config.commands.map((entry) => (
      `run_block ${quoteRecorderShellValue(entry.label)} ${quoteRecorderShellValue(entry.timeoutSec)} ${quoteRecorderShellValue(entry.command)}`
    )),
  ];
  return `bash -lc ${quoteRecorderShellValue(scriptLines.join('\n'))}`;
}

export function createRecorderDefinitionHelpers({ normalizeText, recorderSimpleSteps }) {
  const normalizeIdListBound = (values) => normalizeIdList({ normalizeText, values });
  const normalizeTagListBound = (values, options = {}) =>
    normalizeTagList({ normalizeText, values, ownerDefault: options.ownerDefault === true });
  const parseTagInputBound = (inputElement, options = {}) =>
    parseTagInput({
      normalizeTagList: normalizeTagListBound,
      inputElement,
      ownerDefault: options.ownerDefault === true,
    });
  const formatTagInputValueBound = (tags, options = {}) =>
    formatTagInputValue({
      normalizeTagList: normalizeTagListBound,
      tags,
      ownerDefault: options.ownerDefault === true,
      hideGlobalDefault: options.hideGlobalDefault !== false,
    });
  const resolveCheckRunAtConnectionBound = (check, fallback = true) =>
    resolveCheckRunAtConnection(check, fallback);
  const applyRunAtConnectionBound = (entries, runAtConnection) =>
    applyRunAtConnection(entries, runAtConnection);
  const inferUniformRunAtConnectionBound = (entries, fallback = true) =>
    inferUniformRunAtConnection({
      entries,
      fallback,
      resolveCheckRunAtConnectionFn: resolveCheckRunAtConnectionBound,
    });
  const slugifyRecorderValueBound = (value, fallback = '') =>
    slugifyRecorderValue({ normalizeText, value, fallback });
  const normalizeRecorderModeBound = (mode = '') => normalizeRecorderMode({ normalizeText, mode });
  const normalizeRecorderSimpleStepBound = (step = '') =>
    normalizeRecorderSimpleStep({ normalizeText, recorderSimpleSteps, step });
  const normalizeRecorderGenericInfoConfigBound = (rawConfig) =>
    normalizeRecorderGenericInfoConfig({ normalizeText, rawConfig });
  const buildRecorderGenericInfoBundleCommandBound = (rawConfig) =>
    buildRecorderGenericInfoBundleCommand({
      normalizeRecorderGenericInfoConfig: normalizeRecorderGenericInfoConfigBound,
      rawConfig,
    });

  return {
    normalizeIdList: normalizeIdListBound,
    normalizeTagList: normalizeTagListBound,
    parseTagInput: parseTagInputBound,
    formatTagInputValue: formatTagInputValueBound,
    resolveCheckRunAtConnection: resolveCheckRunAtConnectionBound,
    applyRunAtConnection: applyRunAtConnectionBound,
    inferUniformRunAtConnection: inferUniformRunAtConnectionBound,
    slugifyRecorderValue: slugifyRecorderValueBound,
    normalizeRecorderMode: normalizeRecorderModeBound,
    normalizeRecorderSimpleStep: normalizeRecorderSimpleStepBound,
    normalizeRecorderGenericInfoConfig: normalizeRecorderGenericInfoConfigBound,
    buildRecorderGenericInfoBundleCommand: buildRecorderGenericInfoBundleCommandBound,
  };
}
