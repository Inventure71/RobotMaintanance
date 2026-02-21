import { normalizeText } from '../lib/normalize.js';

function normalizeCheckId(rawId) {
  return normalizeText(rawId, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extractOutputText(payload) {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload.output === 'string') return payload.output;
  if (typeof payload.stdout === 'string' || typeof payload.stderr === 'string') {
    return [payload.stdout || '', payload.stderr || ''].filter(Boolean).join('\n');
  }
  if (Array.isArray(payload.lines)) {
    return payload.lines.map((line) => String(line)).join('\n');
  }
  if (payload.result !== undefined) {
    return String(payload.result);
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch (_error) {
    return String(payload);
  }
}

export class WorkflowRecorderComponent {
  constructor(options = {}) {
    this.terminalOutputEl = options.terminalOutputEl;
    this.stepsEl = options.stepsEl;
    this.sourceStepSelectEl = options.sourceStepSelectEl;
    this.outputLinesEl = options.outputLinesEl;
    this.checksEl = options.checksEl;
    this.statusEl = options.statusEl;
    this.publishStatusEl = options.publishStatusEl;
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;

    this.steps = [];
    this.checks = [];
    this.promotedPrimitives = new Map();
    this.activeStepId = '';
    this.recording = false;
  }

  _emitState() {
    if (typeof this.onStateChange !== 'function') return;
    this.onStateChange(this.getState());
  }

  getState() {
    const activeStep = this._currentStep();
    return {
      recording: this.recording,
      stepCount: this.steps.length,
      checkCount: this.checks.length,
      activeStepId: activeStep?.id || '',
      activeStepLabel: activeStep?.label || '',
      activeStepSelectedLines: activeStep ? activeStep.selectedLineIndexes.size : 0,
    };
  }

  setRecording(value) {
    this.recording = Boolean(value);
    this.setStatus(this.recording ? 'Recording active.' : 'Recorder idle.', this.recording ? 'ok' : 'warn');
    this._emitState();
  }

  setStatus(message = '', tone = '') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.classList.remove('ok', 'warn', 'error');
    if (tone) this.statusEl.classList.add(tone);
  }

  setPublishStatus(message = '', tone = '') {
    if (!this.publishStatusEl) return;
    this.publishStatusEl.textContent = message;
    this.publishStatusEl.classList.remove('ok', 'warn', 'error');
    if (tone) this.publishStatusEl.classList.add(tone);
  }

  appendTerminal(text, tone = 'plain') {
    if (!this.terminalOutputEl) return;
    const line = document.createElement('div');
    line.className = `recorder-terminal-line ${tone}`;
    line.textContent = text;
    this.terminalOutputEl.appendChild(line);
    this.terminalOutputEl.scrollTop = this.terminalOutputEl.scrollHeight;
  }

  clearTerminal() {
    if (!this.terminalOutputEl) return;
    this.terminalOutputEl.replaceChildren();
  }

  reset() {
    this.steps = [];
    this.checks = [];
    this.promotedPrimitives.clear();
    this.activeStepId = '';
    this.clearTerminal();
    this.render();
    this.setPublishStatus('', '');
    this.setStatus('Recorder reset.', 'warn');
    this._emitState();
  }

  addCapturedStep({ command, outputPayload, promotePrimitive = false, primitiveId = '' }) {
    const commandText = normalizeText(command, '');
    if (!commandText) {
      throw new Error('Command is required.');
    }
    const outputText = extractOutputText(outputPayload);
    const outputLines = outputText
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const stepNumber = this.steps.length + 1;
    const stepId = `step_${stepNumber}`;
    const saveAs = `out_${stepNumber}`;
    let commandValue = commandText;
    let primitiveInfo = null;
    if (promotePrimitive) {
      const normalizedPrimitiveId = normalizeCheckId(primitiveId);
      if (!normalizedPrimitiveId) {
        throw new Error('Primitive ID is required when promote is enabled.');
      }
      primitiveInfo = {
        id: normalizedPrimitiveId,
        command: commandText,
        description: `Recorded from workflow step ${stepId}`,
      };
      this.promotedPrimitives.set(normalizedPrimitiveId, primitiveInfo);
      commandValue = `$${normalizedPrimitiveId}$`;
    }

    const step = {
      id: stepId,
      label: `Step ${stepNumber}`,
      command: commandValue,
      rawCommand: commandText,
      saveAs,
      outputText,
      outputLines,
      selectedLineIndexes: new Set(),
      primitive: primitiveInfo,
    };
    this.steps.push(step);
    this.activeStepId = stepId;
    this.appendTerminal(`$ ${commandText}`, 'ok');
    if (outputText) {
      this.appendTerminal(outputText, 'plain');
    } else {
      this.appendTerminal('[no output]', 'warn');
    }
    this.render();
    this._emitState();
    return step;
  }

  setActiveStep(stepId) {
    const normalized = normalizeText(stepId, '');
    const exists = this.steps.some((step) => step.id === normalized);
    this.activeStepId = exists ? normalized : '';
    this.render();
    this._emitState();
  }

  toggleLineSelection(stepId, lineIndex, selected) {
    const step = this.steps.find((item) => item.id === stepId);
    if (!step) return;
    if (selected) {
      step.selectedLineIndexes.add(lineIndex);
    } else {
      step.selectedLineIndexes.delete(lineIndex);
    }
    this._emitState();
  }

  _currentStep() {
    return this.steps.find((step) => step.id === this.activeStepId) || null;
  }

  addLineCheck({ stepId, checkId, label, icon }) {
    const step = this.steps.find((item) => item.id === stepId);
    if (!step) {
      throw new Error('Select a source step first.');
    }
    const normalizedCheckId = normalizeCheckId(checkId);
    if (!normalizedCheckId) {
      throw new Error('Check ID is required.');
    }
    if (this.checks.some((item) => item.id === normalizedCheckId)) {
      throw new Error(`Check '${normalizedCheckId}' already exists in this recording.`);
    }
    const selectedLines = Array.from(step.selectedLineIndexes)
      .sort((a, b) => a - b)
      .map((index) => step.outputLines[index])
      .filter(Boolean);
    if (!selectedLines.length) {
      throw new Error('Select one or more output lines.');
    }
    const check = {
      id: normalizedCheckId,
      label: normalizeText(label, normalizedCheckId),
      icon: normalizeText(icon, '🧪'),
      read: {
        kind: 'contains_lines_unordered',
        inputRef: step.saveAs,
        lines: selectedLines,
        requireAll: true,
      },
      pass: {
        status: 'ok',
        value: 'all_present',
        details: 'All selected lines found.',
      },
      fail: {
        status: 'error',
        value: 'missing',
        details: 'Missing one or more selected lines.',
      },
    };
    this.checks.push(check);
    this.render();
    this._emitState();
    return check;
  }

  addStringCheck({ stepId, checkId, label, icon, needle }) {
    const step = this.steps.find((item) => item.id === stepId);
    if (!step) {
      throw new Error('Select a source step first.');
    }
    const normalizedCheckId = normalizeCheckId(checkId);
    if (!normalizedCheckId) {
      throw new Error('Check ID is required.');
    }
    if (this.checks.some((item) => item.id === normalizedCheckId)) {
      throw new Error(`Check '${normalizedCheckId}' already exists in this recording.`);
    }
    const normalizedNeedle = normalizeText(needle, '');
    if (!normalizedNeedle) {
      throw new Error('Contains-string text is required.');
    }
    const check = {
      id: normalizedCheckId,
      label: normalizeText(label, normalizedCheckId),
      icon: normalizeText(icon, '🧪'),
      read: {
        kind: 'contains_string',
        inputRef: step.saveAs,
        needle: normalizedNeedle,
        caseSensitive: false,
      },
      pass: {
        status: 'ok',
        value: 'present',
        details: `Found "${normalizedNeedle}".`,
      },
      fail: {
        status: 'error',
        value: 'missing',
        details: `Missing "${normalizedNeedle}".`,
      },
    };
    this.checks.push(check);
    this.render();
    this._emitState();
    return check;
  }

  removeCheck(checkId) {
    const normalizedCheckId = normalizeText(checkId, '');
    this.checks = this.checks.filter((check) => check.id !== normalizedCheckId);
    this.render();
    this._emitState();
  }

  getCheckIds() {
    return this.checks.map((check) => check.id);
  }

  getPromotedPrimitives() {
    return Array.from(this.promotedPrimitives.values()).map((item) => ({ ...item }));
  }

  buildTestDefinition({ definitionId, label }) {
    const normalizedDefinitionId = normalizeCheckId(definitionId);
    if (!normalizedDefinitionId) {
      throw new Error('Definition ID is required.');
    }
    if (!this.steps.length) {
      throw new Error('No recorded steps available.');
    }
    if (!this.checks.length) {
      throw new Error('No checks defined.');
    }
    return {
      id: normalizedDefinitionId,
      label: normalizeText(label, normalizedDefinitionId),
      enabled: true,
      mode: 'orchestrate',
      execute: this.steps.map((step) => ({
        id: step.id,
        command: step.command,
        saveAs: step.saveAs,
      })),
      checks: this.checks.map((check) => ({
        id: check.id,
        label: check.label,
        icon: check.icon,
        manualOnly: true,
        enabled: true,
        defaultStatus: 'warning',
        defaultValue: 'unknown',
        defaultDetails: 'Not checked yet',
        read: check.read,
        pass: check.pass,
        fail: check.fail,
      })),
    };
  }

  buildFixDefinition({ definitionId, label, postTestIds }) {
    const normalizedDefinitionId = normalizeCheckId(definitionId);
    if (!normalizedDefinitionId) {
      throw new Error('Definition ID is required.');
    }
    if (!this.steps.length) {
      throw new Error('No recorded steps available.');
    }
    return {
      id: normalizedDefinitionId,
      label: normalizeText(label, normalizedDefinitionId),
      enabled: true,
      description: `Recorded fix workflow ${normalizedDefinitionId}`,
      execute: this.steps.map((step) => ({
        id: step.id,
        command: step.command,
      })),
      postTestIds: Array.isArray(postTestIds) ? postTestIds : [],
    };
  }

  render() {
    this._renderSteps();
    this._renderSourceStepOptions();
    this._renderOutputLines();
    this._renderChecks();
    this._emitState();
  }

  _renderSteps() {
    if (!this.stepsEl) return;
    this.stepsEl.replaceChildren();
    if (!this.steps.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No steps recorded yet.';
      this.stepsEl.appendChild(empty);
      return;
    }
    this.steps.forEach((step) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'manage-list-item recorder-step-item';
      if (step.id === this.activeStepId) {
        row.classList.add('active');
      }
      const titleWrap = document.createElement('div');
      titleWrap.className = 'recorder-step-main';
      const title = document.createElement('div');
      title.className = 'recorder-step-title';
      title.textContent = `${step.label}: ${step.rawCommand}`;
      const meta = document.createElement('div');
      meta.className = 'recorder-step-meta';
      meta.textContent = `${step.outputLines.length} lines captured${step.primitive ? ` • primitive: ${step.primitive.id}` : ''}`;
      titleWrap.append(title, meta);
      row.appendChild(titleWrap);
      row.addEventListener('click', () => {
        this.setActiveStep(step.id);
      });
      this.stepsEl.appendChild(row);
    });
  }

  _renderSourceStepOptions() {
    if (!this.sourceStepSelectEl) return;
    const previousValue = normalizeText(this.sourceStepSelectEl.value, '');
    this.sourceStepSelectEl.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select step';
    this.sourceStepSelectEl.appendChild(placeholder);
    this.steps.forEach((step) => {
      const option = document.createElement('option');
      option.value = step.id;
      option.textContent = `${step.label}: ${step.rawCommand}`;
      this.sourceStepSelectEl.appendChild(option);
    });
    const fallback = this.activeStepId || '';
    this.sourceStepSelectEl.value = previousValue || fallback;
    if (!this.sourceStepSelectEl.value && fallback) {
      this.sourceStepSelectEl.value = fallback;
    }
  }

  _renderOutputLines() {
    if (!this.outputLinesEl) return;
    this.outputLinesEl.replaceChildren();
    const selectedStepId = normalizeText(this.sourceStepSelectEl?.value, '') || this.activeStepId;
    const step = this.steps.find((item) => item.id === selectedStepId) || this._currentStep();
    if (!step) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'Run and capture a command first.';
      this.outputLinesEl.appendChild(empty);
      return;
    }
    step.outputLines.forEach((line, index) => {
      const label = document.createElement('label');
      label.className = 'recorder-line-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = step.selectedLineIndexes.has(index);
      checkbox.addEventListener('change', () => {
        this.toggleLineSelection(step.id, index, checkbox.checked);
        label.classList.toggle('selected', checkbox.checked);
      });

      const text = document.createElement('span');
      text.textContent = line;
      label.append(checkbox, text);
      if (checkbox.checked) {
        label.classList.add('selected');
      }
      this.outputLinesEl.appendChild(label);
    });
    if (!step.outputLines.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'This step returned no line output.';
      this.outputLinesEl.appendChild(empty);
    }
  }

  _renderChecks() {
    if (!this.checksEl) return;
    this.checksEl.replaceChildren();
    if (!this.checks.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No checks defined yet.';
      this.checksEl.appendChild(empty);
      return;
    }
    this.checks.forEach((check) => {
      const row = document.createElement('div');
      row.className = 'manage-list-item recorder-check-item';
      const detailsWrap = document.createElement('div');
      detailsWrap.className = 'recorder-check-main';
      const title = document.createElement('div');
      title.className = 'recorder-check-title';
      title.textContent = `${check.icon} ${check.label} (${check.id})`;
      const details = document.createElement('div');
      details.className = 'recorder-check-meta';
      if (check.read?.kind === 'contains_lines_unordered') {
        const lineCount = Array.isArray(check.read?.lines) ? check.read.lines.length : 0;
        details.textContent = `Read: unordered lines (${lineCount}) from ${check.read?.inputRef || 'output'}`;
      } else {
        details.textContent = `Read: string match from ${check.read?.inputRef || 'output'}`;
      }
      detailsWrap.append(title, details);
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'button button-compact';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        this.removeCheck(check.id);
      });
      row.append(detailsWrap, removeButton);
      this.checksEl.appendChild(row);
    });
  }
}
