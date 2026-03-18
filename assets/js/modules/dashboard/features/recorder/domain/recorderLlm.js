export function buildRecorderLlmPromptPayload({
  normalizeText,
  renderRecorderLlmPromptTemplate,
  definitionIdValue,
  exportDraftContext,
  buildRobotContext,
  buildDefinitionContext,
  systemDetails,
  userRequest,
  transcript,
}) {
  const definitionId = normalizeText(definitionIdValue, '');
  const draftContext = exportDraftContext?.(definitionId) || {
    started: false,
    publishReady: false,
    definitionId,
    outputCount: 0,
    writeCount: 0,
    readCount: 0,
    outputs: [],
    execute: [],
    checks: [],
    blockingIssues: [],
  };
  return renderRecorderLlmPromptTemplate({
    selectedRobot: buildRobotContext(),
    currentDefinition: buildDefinitionContext(),
    currentRecorderDraft: draftContext,
    recorderTerminalTranscript: transcript,
    userSystemDetails: systemDetails,
    userTestRequest: userRequest,
  });
}

export function stripRecorderLlmJsonWrapperNoise(rawValue) {
  let text = String(rawValue ?? '').trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    text = fenced[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    const wrapped = text.slice(firstBrace, lastBrace + 1).trim();
    if (wrapped.startsWith('{') && wrapped.endsWith('}')) {
      text = wrapped;
    }
  }
  return text;
}

export function parseRecorderLlmImportPayload(rawValue) {
  const stripped = stripRecorderLlmJsonWrapperNoise(rawValue);
  if (!stripped) {
    throw new Error('Paste the external LLM JSON result first.');
  }
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (error) {
    throw new Error(`LLM result is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM result must be a JSON object.');
  }
  return parsed;
}

function validateRecorderReadSpec({ normalizeText, allowedReadKinds, baseReadKinds, readSpec, contextLabel }) {
  if (!readSpec || typeof readSpec !== 'object' || Array.isArray(readSpec)) {
    throw new Error(`${contextLabel} must define a read object.`);
  }
  const kind = normalizeText(readSpec.kind, '').toLowerCase();
  if (!allowedReadKinds.has(kind)) {
    throw new Error(`${contextLabel} uses unsupported read kind '${kind || 'unknown'}'.`);
  }
  if (kind === 'all_of') {
    const rules = Array.isArray(readSpec.rules) ? readSpec.rules : [];
    if (!rules.length) {
      throw new Error(`${contextLabel} kind 'all_of' must define non-empty rules[].`);
    }
    return {
      ...readSpec,
      kind,
      rules: rules.map((rule, index) => {
        const validatedRule = validateRecorderReadSpec({
          normalizeText,
          allowedReadKinds,
          baseReadKinds,
          readSpec: rule,
          contextLabel: `${contextLabel} rule ${index + 1}`,
        });
        if (!baseReadKinds.has(validatedRule.kind)) {
          throw new Error(`${contextLabel} rule ${index + 1} must use a base read kind.`);
        }
        return validatedRule;
      }),
    };
  }
  if (!normalizeText(readSpec.inputRef, '')) {
    throw new Error(`${contextLabel} read.${kind} must define inputRef.`);
  }
  if (kind === 'contains_string' && !normalizeText(readSpec.needle, '')) {
    throw new Error(`${contextLabel} read.contains_string must define needle.`);
  }
  if (kind === 'contains_any_string') {
    const needles = Array.isArray(readSpec.needles) ? readSpec.needles.map((item) => normalizeText(item, '')).filter(Boolean) : [];
    if (!needles.length) {
      throw new Error(`${contextLabel} read.contains_any_string must define non-empty needles[].`);
    }
  }
  if (kind === 'contains_lines_unordered') {
    const lines = Array.isArray(readSpec.lines) ? readSpec.lines.map((item) => normalizeText(item, '')).filter(Boolean) : [];
    if (!lines.length) {
      throw new Error(`${contextLabel} read.contains_lines_unordered must define non-empty lines[].`);
    }
  }
  return {
    ...readSpec,
    kind,
  };
}

export function validateRecorderImportedDefinition({
  normalizeText,
  inferUniformRunAtConnection,
  allowedReadKinds,
  baseReadKinds,
  rawDefinition,
}) {
  const definition = rawDefinition && typeof rawDefinition === 'object' ? rawDefinition : {};
  const definitionId = normalizeText(definition.id, '');
  if (!definitionId) {
    throw new Error('Imported definition must define a top-level id.');
  }
  const label = normalizeText(definition.label, '');
  if (!label) {
    throw new Error('Imported definition must define a top-level label.');
  }
  const mode = normalizeText(definition.mode, '').toLowerCase();
  if (mode !== 'orchestrate') {
    throw new Error(`Imported definition mode must be 'orchestrate', received '${mode || 'unknown'}'.`);
  }
  const execute = Array.isArray(definition.execute) ? definition.execute : [];
  if (!execute.length) {
    throw new Error('Imported definition must define non-empty execute[].');
  }
  const normalizedExecute = execute.map((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error(`execute[${index}] must be an object.`);
    }
    const command = normalizeText(step.command, '');
    if (!command) {
      throw new Error(`execute[${index}] must define command.`);
    }
    return {
      ...step,
      command,
    };
  });
  const checks = Array.isArray(definition.checks) ? definition.checks : [];
  if (!checks.length) {
    throw new Error('Imported definition must define non-empty checks[].');
  }
  const normalizedChecks = checks.map((check, index) => {
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      throw new Error(`checks[${index}] must be an object.`);
    }
    const checkId = normalizeText(check.id, '');
    if (!checkId) {
      throw new Error(`checks[${index}] must define id.`);
    }
    if (typeof check.runAtConnection !== 'boolean') {
      throw new Error(`checks[${index}] must define a top-level boolean runAtConnection.`);
    }
    if (!check.pass || typeof check.pass !== 'object' || Array.isArray(check.pass)) {
      throw new Error(`checks[${index}] must define a pass object.`);
    }
    if (!check.fail || typeof check.fail !== 'object' || Array.isArray(check.fail)) {
      throw new Error(`checks[${index}] must define a fail object.`);
    }
    return {
      ...check,
      id: checkId,
      read: validateRecorderReadSpec({
        normalizeText,
        allowedReadKinds,
        baseReadKinds,
        readSpec: check.read,
        contextLabel: `checks[${index}]`,
      }),
    };
  });
  const uniformRunAtConnection = inferUniformRunAtConnection(normalizedChecks, true);
  if (uniformRunAtConnection === null) {
    throw new Error('Imported definition checks must share one runAtConnection value.');
  }
  return {
    ...definition,
    id: definitionId,
    label,
    mode: 'orchestrate',
    execute: normalizedExecute,
    checks: normalizedChecks,
  };
}
