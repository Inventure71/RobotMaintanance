import { normalizeText } from '../lib/normalize.js';
import { createFlowBlockContainer, createFlowBlockPreset, createFlowEmptyState } from './flow-block-presets.js';

function normalizeToken(rawValue, fallback = '') {
  const token = normalizeText(rawValue, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return token || fallback;
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
  if (payload.result !== undefined) return String(payload.result);
  try {
    return JSON.stringify(payload, null, 2);
  } catch (_error) {
    return String(payload);
  }
}

function parseCommaSeparated(value) {
  return normalizeText(value, '')
    .split(',')
    .map((item) => normalizeText(item, ''))
    .filter(Boolean);
}

function parseLineSeparated(value) {
  return normalizeText(value, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((item) => normalizeText(item, ''))
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class WorkflowRecorderComponent {
  constructor(options = {}) {
    this.terminalOutputEl = options.terminalOutputEl;
    this.outputsEl = options.outputsEl;
    this.blocksEl = options.blocksEl;
    this.outputSelectEl = options.outputSelectEl;
    this.inputRefSelectEl = options.inputRefSelectEl;
    this.statusEl = options.statusEl;
    this.publishStatusEl = options.publishStatusEl;
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;

    this.started = false;
    this.outputs = [];
    this.blocks = [];
    this.outputEditKey = '';
    this.readEditBlockId = '';
    this._writeCount = 0;
    this._readCount = 0;
  }

  _emitState() {
    if (typeof this.onStateChange !== 'function') return;
    this.onStateChange(this.getState());
  }

  _getWriteBlocks() {
    return this.blocks.filter((block) => block.type === 'write');
  }

  _getReadBlocks() {
    return this.blocks.filter((block) => block.type === 'read');
  }

  _outputHasReads(outputKey) {
    return this._getReadBlocks().some((block) => block.outputKey === outputKey);
  }

  _blockingIssues(definitionId = '') {
    const issues = [];
    if (!this.started) issues.push('Click "Create new test" to start a draft.');
    if (!this._getWriteBlocks().length) issues.push('Add at least one write block.');
    if (!this.outputs.length) issues.push('Add at least one output.');
    this.outputs.forEach((output) => {
      if (!this._outputHasReads(output.key)) {
        issues.push(`Output '${output.key}' has no read block.`);
      }
    });
    if (!normalizeToken(definitionId, '')) issues.push('Definition ID is required.');
    return issues;
  }

  getState(definitionId = '') {
    const issues = this._blockingIssues(definitionId);
    return {
      started: this.started,
      outputCount: this.outputs.length,
      blockCount: this.blocks.length,
      writeCount: this._getWriteBlocks().length,
      readCount: this._getReadBlocks().length,
      editingOutputKey: this.outputEditKey,
      editingReadBlockId: this.readEditBlockId,
      publishReady: issues.length === 0,
      blockingIssues: issues,
    };
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

  createNewTest() {
    this.started = true;
    this.outputs = [];
    this.blocks = [];
    this.outputEditKey = '';
    this.readEditBlockId = '';
    this._writeCount = 0;
    this._readCount = 0;
    this.clearTerminal();
    this.setPublishStatus('', '');
    this.setStatus('New draft created. Add outputs and write blocks.', 'ok');
    this.render();
  }

  reset() {
    this.started = false;
    this.outputs = [];
    this.blocks = [];
    this.outputEditKey = '';
    this.readEditBlockId = '';
    this._writeCount = 0;
    this._readCount = 0;
    this.clearTerminal();
    this.setPublishStatus('', '');
    this.setStatus('Draft cleared.', 'warn');
    this.render();
  }

  _nextSaveAs() {
    const used = new Set(this._getWriteBlocks().map((block) => normalizeText(block.saveAs, '')));
    let cursor = this._getWriteBlocks().length + 1;
    while (used.has(`out_${cursor}`)) {
      cursor += 1;
    }
    return `out_${cursor}`;
  }

  getWriteRefs() {
    return this._getWriteBlocks().map((block) => ({
      id: block.id,
      saveAs: block.saveAs,
      command: block.command,
      label: `${block.id}: ${block.command}`,
    }));
  }

  getOutputKeys() {
    return this.outputs.map((output) => output.key);
  }

  getOutput(outputKey) {
    const key = normalizeToken(outputKey, '');
    return this.outputs.find((output) => output.key === key) || null;
  }

  getReadBlock(blockId) {
    const id = normalizeText(blockId, '');
    return this.blocks.find((block) => block.id === id && block.type === 'read') || null;
  }

  setOutputEdit(outputKey) {
    const output = this.getOutput(outputKey);
    this.outputEditKey = output?.key || '';
    this._emitState();
    return output;
  }

  clearOutputEdit() {
    this.outputEditKey = '';
    this._emitState();
  }

  setReadEdit(blockId) {
    const block = this.getReadBlock(blockId);
    this.readEditBlockId = block?.id || '';
    this._emitState();
    return block;
  }

  clearReadEdit() {
    this.readEditBlockId = '';
    this._emitState();
  }

  addOrUpdateOutput({ key, label, icon, passDetails, failDetails }) {
    if (!this.started) {
      throw new Error('Create a new test draft first.');
    }
    const normalizedKey = normalizeToken(key, '');
    if (!normalizedKey) {
      throw new Error('Output key is required.');
    }
    const payload = {
      key: normalizedKey,
      label: normalizeText(label, normalizedKey),
      icon: normalizeText(icon, '🧪'),
      passDetails: normalizeText(passDetails, `${normalizeText(label, normalizedKey)} checks passed.`),
      failDetails: normalizeText(failDetails, `${normalizeText(label, normalizedKey)} checks failed.`),
    };
    const duplicate = this.outputs.find((output) => output.key === normalizedKey);
    if (duplicate && this.outputEditKey !== normalizedKey) {
      throw new Error(`Output '${normalizedKey}' already exists.`);
    }
    if (this.outputEditKey) {
      const index = this.outputs.findIndex((output) => output.key === this.outputEditKey);
      if (index === -1) {
        throw new Error('Edited output was not found.');
      }
      const oldKey = this.outputs[index].key;
      this.outputs[index] = payload;
      if (oldKey !== normalizedKey) {
        this.blocks = this.blocks.map((block) => (
          block.type === 'read' && block.outputKey === oldKey
            ? { ...block, outputKey: normalizedKey }
            : block
        ));
      }
      this.outputEditKey = '';
      this.render();
      return { ...payload, updated: true };
    }
    this.outputs.push(payload);
    this.render();
    return { ...payload, updated: false };
  }

  removeOutput(outputKey) {
    const key = normalizeToken(outputKey, '');
    this.outputs = this.outputs.filter((output) => output.key !== key);
    this.blocks = this.blocks.filter((block) => !(block.type === 'read' && block.outputKey === key));
    if (this.outputEditKey === key) this.outputEditKey = '';
    this.render();
  }

  updateWriteSaveAs(blockId, saveAs) {
    const normalizedBlockId = normalizeText(blockId, '');
    const normalizedSaveAs = normalizeToken(saveAs, '');
    if (!normalizedSaveAs) {
      throw new Error('saveAs is required.');
    }
    const duplicate = this._getWriteBlocks().find(
      (block) => block.id !== normalizedBlockId && normalizeText(block.saveAs, '') === normalizedSaveAs,
    );
    if (duplicate) {
      throw new Error(`saveAs '${normalizedSaveAs}' is already used by ${duplicate.id}.`);
    }
    const index = this.blocks.findIndex((block) => block.id === normalizedBlockId && block.type === 'write');
    if (index === -1) {
      throw new Error('Write block not found.');
    }
    this.blocks[index] = {
      ...this.blocks[index],
      saveAs: normalizedSaveAs,
    };
    this.render();
  }

  addWriteBlock({ command, outputPayload }) {
    if (!this.started) {
      throw new Error('Create a new test draft first.');
    }
    const commandText = normalizeText(command, '');
    if (!commandText) {
      throw new Error('Command is required.');
    }
    this._writeCount += 1;
    const outputText = extractOutputText(outputPayload);
    const block = {
      id: `write_${this._writeCount}`,
      type: 'write',
      command: commandText,
      saveAs: this._nextSaveAs(),
      outputText,
    };
    this.blocks.push(block);
    this.appendTerminal(`$ ${commandText}`, 'ok');
    this.appendTerminal(outputText || '[no output]', outputText ? 'plain' : 'warn');
    this.render();
    return block;
  }

  _buildReadSpec({ inputRef, kind, needle, needles, lines, requireAll }) {
    const normalizedInputRef = normalizeText(inputRef, '');
    if (!normalizedInputRef) throw new Error('Read input ref is required.');
    if (!this.getWriteRefs().some((item) => item.saveAs === normalizedInputRef)) {
      throw new Error(`Read input ref '${normalizedInputRef}' is not available.`);
    }

    const normalizedKind = normalizeText(kind, '').toLowerCase();
    if (normalizedKind === 'contains_string') {
      const normalizedNeedle = normalizeText(needle, '');
      if (!normalizedNeedle) throw new Error('Needle is required for contains_string.');
      return {
        kind: 'contains_string',
        inputRef: normalizedInputRef,
        needle: normalizedNeedle,
        caseSensitive: false,
      };
    }
    if (normalizedKind === 'contains_any_string') {
      const normalizedNeedles = parseCommaSeparated(needles);
      if (!normalizedNeedles.length) throw new Error('Needles are required for contains_any_string.');
      return {
        kind: 'contains_any_string',
        inputRef: normalizedInputRef,
        needles: normalizedNeedles,
        caseSensitive: false,
      };
    }
    if (normalizedKind === 'contains_lines_unordered') {
      const normalizedLines = parseLineSeparated(lines);
      if (!normalizedLines.length) throw new Error('Lines are required for contains_lines_unordered.');
      return {
        kind: 'contains_lines_unordered',
        inputRef: normalizedInputRef,
        lines: normalizedLines,
        requireAll: Boolean(requireAll),
      };
    }
    throw new Error(`Unsupported read kind '${normalizedKind}'.`);
  }

  addOrUpdateReadBlock({ outputKey, inputRef, kind, needle, needles, lines, requireAll }) {
    if (!this.started) {
      throw new Error('Create a new test draft first.');
    }
    const normalizedOutputKey = normalizeToken(outputKey, '');
    if (!normalizedOutputKey) {
      throw new Error('Read output key is required.');
    }
    if (!this.outputs.some((output) => output.key === normalizedOutputKey)) {
      throw new Error(`Output '${normalizedOutputKey}' does not exist.`);
    }

    const readSpec = this._buildReadSpec({ inputRef, kind, needle, needles, lines, requireAll });

    if (this.readEditBlockId) {
      const index = this.blocks.findIndex((block) => block.id === this.readEditBlockId && block.type === 'read');
      if (index === -1) {
        throw new Error('Edited read block was not found.');
      }
      this.blocks[index] = {
        ...this.blocks[index],
        outputKey: normalizedOutputKey,
        read: readSpec,
      };
      const updated = this.blocks[index];
      this.readEditBlockId = '';
      this.render();
      return { ...updated, updated: true };
    }

    this._readCount += 1;
    const block = {
      id: `read_${this._readCount}`,
      type: 'read',
      outputKey: normalizedOutputKey,
      read: readSpec,
    };
    this.blocks.push(block);
    this.render();
    return { ...block, updated: false };
  }

  removeBlock(blockId) {
    const normalizedBlockId = normalizeText(blockId, '');
    this.blocks = this.blocks.filter((block) => block.id !== normalizedBlockId);
    if (this.readEditBlockId === normalizedBlockId) this.readEditBlockId = '';
    this.render();
  }

  _readRulesForOutput(outputKey) {
    return this.blocks
      .filter((block) => block.type === 'read' && block.outputKey === outputKey)
      .map((block) => ({ ...block.read }));
  }

  getCheckIdsForDefinition(definitionId) {
    const normalizedDefinitionId = normalizeToken(definitionId, '');
    if (!normalizedDefinitionId) return [];
    return this.outputs.map((output) => `${normalizedDefinitionId}__${normalizeToken(output.key, 'output')}`);
  }

  buildTestDefinition({ definitionId, label }) {
    const normalizedDefinitionId = normalizeToken(definitionId, '');
    if (!normalizedDefinitionId) {
      throw new Error('Definition ID is required.');
    }
    const issues = this._blockingIssues(normalizedDefinitionId);
    if (issues.length) {
      throw new Error(issues[0]);
    }

    const execute = this._getWriteBlocks().map((block, index) => ({
      id: `step_${index + 1}`,
      command: block.command,
      saveAs: block.saveAs,
    }));

    const checks = this.outputs.map((output) => {
      const rules = this._readRulesForOutput(output.key);
      if (!rules.length) {
        throw new Error(`Output '${output.key}' has no read blocks.`);
      }
      const compiledRead = rules.length === 1 ? rules[0] : { kind: 'all_of', rules };
      const checkId = `${normalizedDefinitionId}__${normalizeToken(output.key, 'output')}`;
      return {
        id: checkId,
        label: output.label,
        icon: output.icon,
        manualOnly: true,
        enabled: true,
        defaultStatus: 'warning',
        defaultValue: 'unknown',
        defaultDetails: 'Not checked yet',
        read: compiledRead,
        pass: {
          status: 'ok',
          value: 'all_present',
          details: output.passDetails,
        },
        fail: {
          status: 'error',
          value: 'missing',
          details: output.failDetails,
        },
      };
    });

    return {
      id: normalizedDefinitionId,
      label: normalizeText(label, normalizedDefinitionId),
      enabled: true,
      mode: 'orchestrate',
      execute,
      checks,
    };
  }

  _renderOptions() {
    if (this.outputSelectEl) {
      const previous = normalizeToken(this.outputSelectEl.value, '');
      this.outputSelectEl.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select output';
      this.outputSelectEl.appendChild(placeholder);
      this.outputs.forEach((output) => {
        const option = document.createElement('option');
        option.value = output.key;
        option.textContent = `${output.label} (${output.key})`;
        this.outputSelectEl.appendChild(option);
      });
      if (previous && this.outputs.some((output) => output.key === previous)) {
        this.outputSelectEl.value = previous;
      }
    }

    if (this.inputRefSelectEl) {
      const previous = normalizeText(this.inputRefSelectEl.value, '');
      this.inputRefSelectEl.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select write output';
      this.inputRefSelectEl.appendChild(placeholder);
      this.getWriteRefs().forEach((writeRef) => {
        const option = document.createElement('option');
        option.value = writeRef.saveAs;
        option.textContent = `${writeRef.saveAs} (${writeRef.command})`;
        this.inputRefSelectEl.appendChild(option);
      });
      if (previous && this.getWriteRefs().some((writeRef) => writeRef.saveAs === previous)) {
        this.inputRefSelectEl.value = previous;
      }
    }
  }

  _renderOutputs() {
    if (!this.outputsEl) return;
    this.outputsEl.replaceChildren();
    if (!this.outputs.length) {
      this.outputsEl.appendChild(createFlowEmptyState('No outputs yet.'));
      return;
    }
    const container = createFlowBlockContainer();

    this.outputs.forEach((output) => {
      const readCount = this._readRulesForOutput(output.key).length;
      const row = createFlowBlockPreset({
        variant: 'read',
        icon: output.icon || '💾',
        title: `OUTPUT ${output.label} (${output.key})`,
        description: `${readCount} attached read block${readCount === 1 ? '' : 's'}`,
        onRemove: () => this.removeOutput(output.key),
        onToggle: (open) => {
          if (open) {
            this.setOutputEdit(output.key);
          } else if (this.outputEditKey === output.key) {
            this.clearOutputEdit();
          }
        },
        renderEditor: (editor) => {
          editor.innerHTML = `
            <label class="form-field">Output Key
              <input type="text" class="form-input key-input" value="${output.key || ''}">
            </label>
            <label class="form-field">Label
              <input type="text" class="form-input label-input" value="${output.label || ''}">
            </label>
            <label class="form-field">Icon
              <input type="text" class="form-input icon-input" value="${output.icon || '💾'}">
            </label>
            <label class="form-field">Pass message
              <input type="text" class="form-input pass-input" value="${output.passDetails || ''}">
            </label>
            <label class="form-field">Fail message
              <input type="text" class="form-input fail-input" value="${output.failDetails || ''}">
            </label>
            <div style="display:flex; justify-content:flex-end;">
              <button type="button" class="button save-btn">Save Output</button>
            </div>
          `;
          const saveBtn = editor.querySelector('.save-btn');
          saveBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            try {
              this.setOutputEdit(output.key);
              this.addOrUpdateOutput({
                key: editor.querySelector('.key-input').value.trim(),
                label: editor.querySelector('.label-input').value.trim(),
                icon: editor.querySelector('.icon-input').value.trim(),
                passDetails: editor.querySelector('.pass-input').value.trim(),
                failDetails: editor.querySelector('.fail-input').value.trim(),
              });
              this.setStatus('Output updated.', 'ok');
            } catch (error) {
              this.setStatus(error instanceof Error ? error.message : String(error), 'error');
            }
          });
        },
      });
      container.appendChild(row);
    });
    this.outputsEl.appendChild(container);
  }

  _renderBlocks() {
    if (!this.blocksEl) return;
    this.blocksEl.replaceChildren();
    if (!this.blocks.length) {
      this.blocksEl.appendChild(createFlowEmptyState('No blocks in flow yet.'));
      return;
    }

    const container = createFlowBlockContainer();

    this.blocks.forEach((block) => {
      const isWrite = block.type === 'write';
      const description = isWrite
        ? `Saves as: ${block.saveAs}`
        : `${block.read.kind} from ${block.read.inputRef}`;
      const row = createFlowBlockPreset({
        variant: isWrite ? 'write' : 'read',
        icon: isWrite ? '✍️' : '🔍',
        title: isWrite ? `WRITE ${block.command}` : `READ ${block.outputKey}`,
        description,
        onRemove: () => this.removeBlock(block.id),
        onToggle: (open) => {
          if (isWrite) return;
          if (open) {
            this.setReadEdit(block.id);
          } else if (this.readEditBlockId === block.id) {
            this.clearReadEdit();
          }
        },
        renderEditor: (editor) => {
          if (isWrite) {
            editor.innerHTML = `
              <label class="form-field">Command
                <input type="text" class="form-input cmd-input" value="${block.command || ''}" disabled title="Command executed in terminal cannot be modified here. Delete and re-run.">
              </label>
              <label class="form-field">Save As
                <input type="text" class="form-input save-input" value="${block.saveAs || ''}">
              </label>
              <div style="display:flex; justify-content:flex-end;">
                <button type="button" class="button save-btn">Save Block</button>
              </div>
            `;
            const saveBtn = editor.querySelector('.save-btn');
            saveBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              const nextValue = editor.querySelector('.save-input').value.trim();
              try {
                this.updateWriteSaveAs(block.id, nextValue);
                this.setStatus(`Updated ${block.id} saveAs.`, 'ok');
              } catch (error) {
                this.setStatus(error instanceof Error ? error.message : String(error), 'error');
              }
            });
            return;
          }

          const isStr = block.read?.kind === 'contains_string';
          const isAny = block.read?.kind === 'contains_any_string';
          const isLines = block.read?.kind === 'contains_lines_unordered';
          let needleVal = block.read?.needle || '';
          if (isAny && block.read?.needles) needleVal = block.read.needles.join(', ');
          if (isLines && block.read?.lines) needleVal = block.read.lines.join('\n');
          const currentOutputKey = normalizeToken(block.outputKey, '');
          const currentInputRef = normalizeText(block.read?.inputRef, '');
          const outputOptions = this.outputs
            .map((output) => {
              const selected = output.key === currentOutputKey ? ' selected' : '';
              const label = `${normalizeText(output.label, output.key)} (${output.key})`;
              return `<option value="${escapeHtml(output.key)}"${selected}>${escapeHtml(label)}</option>`;
            })
            .join('');
          const writeRefOptions = this.getWriteRefs()
            .map((writeRef) => {
              const selected = normalizeText(writeRef.saveAs, '') === currentInputRef ? ' selected' : '';
              const label = `${writeRef.saveAs} (${writeRef.command})`;
              return `<option value="${escapeHtml(writeRef.saveAs)}"${selected}>${escapeHtml(label)}</option>`;
            })
            .join('');

          editor.innerHTML = `
            <label class="form-field">Output Key Binding
              <select class="form-input id-input">
                ${outputOptions}
              </select>
            </label>
            <label class="form-field">Read from (Input Ref)
              <select class="form-input ref-input">
                ${writeRefOptions}
              </select>
            </label>
            <label class="form-field">Matcher Kind
              <select class="form-input kind-input">
                <option value="contains_string" ${isStr ? 'selected' : ''}>Contains String</option>
                <option value="contains_any_string" ${isAny ? 'selected' : ''}>Contains Any String</option>
                <option value="contains_lines_unordered" ${isLines ? 'selected' : ''}>Contains Lines Unordered</option>
              </select>
            </label>
            <label class="form-field">Matching Value (String / Comma sep / Lines)
              <textarea class="form-input needle-input" rows="3">${needleVal}</textarea>
            </label>
            <div style="display:flex; justify-content:flex-end;">
              <button type="button" class="button save-btn">Save Read Block</button>
            </div>
          `;
          const saveBtn = editor.querySelector('.save-btn');
          saveBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const outKey = normalizeText(editor.querySelector('.id-input').value, '');
            const refVal = normalizeText(editor.querySelector('.ref-input').value, '');
            const kindVal = editor.querySelector('.kind-input').value;
            const needleRaw = editor.querySelector('.needle-input').value;

            let needle = '';
            let needles = [];
            let lines = [];

            if (kindVal === 'contains_lines_unordered') {
              lines = needleRaw.split('\n').map((s) => s.trim()).filter(Boolean);
            } else if (kindVal === 'contains_any_string') {
              needles = needleRaw.split(',').map((s) => s.trim()).filter(Boolean);
            } else {
              needle = needleRaw.trim();
            }

            try {
              this.setReadEdit(block.id);
              this.addOrUpdateReadBlock({
                outputKey: outKey,
                inputRef: refVal,
                kind: kindVal,
                needle,
                needles: needles.join(','),
                lines: lines.join('\n'),
                requireAll: true,
              });
              this.setStatus('Read block updated.', 'ok');
            } catch (error) {
              this.setStatus(error instanceof Error ? error.message : String(error), 'error');
            }
          });
        },
      });
      container.appendChild(row);
    });
    this.blocksEl.appendChild(container);
  }

  render() {
    this._renderOptions();
    this._renderOutputs();
    this._renderBlocks();
    this._emitState();
  }
}
