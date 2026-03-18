import {
  commandUsesSudo,
  createFlowBlockContainer,
  createFlowBlockPreset,
  createFlowEmptyState,
} from './flow-block-presets.js';

export function initVisualFlows() {
  const tExecInput = document.getElementById('manageTestExecuteJson');
  const tChecksInput = document.getElementById('manageTestChecksJson');
  const tFlowDiv = document.getElementById('manageTestVisualFlow');
  const tAddW = document.getElementById('manageTestAddWriteBtn');
  const tAddR = document.getElementById('manageTestAddReadBtn');
  const tRunAtConnectionInput = document.getElementById('manageTestRunAtConnectionInput');

  const fExecInput = document.getElementById('manageFixExecuteJson');
  const fFlowDiv = document.getElementById('manageFixVisualFlow');
  const fAddW = document.getElementById('manageFixAddWriteBtn');

  function renderFlow(execInput, checksInput, flowDiv, isTest) {
    if (!execInput || !flowDiv) return;
    flowDiv.replaceChildren();

    let execute = [];
    let checks = [];
    try { execute = JSON.parse(execInput.value || '[]'); } catch(e) {}
    try { if (checksInput) checks = JSON.parse(checksInput.value || '[]'); } catch(e) {}

    const container = createFlowBlockContainer();

    execute.forEach((block, index) => {
      const row = createFlowBlock(
        true,
        block,
        () => {
          execute.splice(index, 1);
          execInput.value = JSON.stringify(execute, null, 2);
          renderFlow(execInput, checksInput, flowDiv, isTest);
        },
        (newBlock) => {
          execute[index] = newBlock;
          execInput.value = JSON.stringify(execute, null, 2);
          renderFlow(execInput, checksInput, flowDiv, isTest);
        }
      );
      container.appendChild(row);
    });

    checks.forEach((check, index) => {
      const row = createFlowBlock(
        false,
        check,
        () => {
          checks.splice(index, 1);
          if (checksInput) checksInput.value = JSON.stringify(checks, null, 2);
          renderFlow(execInput, checksInput, flowDiv, isTest);
        },
        (newCheck) => {
          checks[index] = newCheck;
          if (checksInput) checksInput.value = JSON.stringify(checks, null, 2);
          renderFlow(execInput, checksInput, flowDiv, isTest);
        }
      );
      container.appendChild(row);
    });

    if (!execute.length && !checks.length) {
      flowDiv.appendChild(createFlowEmptyState('No blocks in flow yet.'));
    } else {
      flowDiv.appendChild(container);
    }
  }

function createFlowBlock(isWrite, data, onRemove, onSave) {
    const usesSudo = isWrite && commandUsesSudo(data.command);
    const title = isWrite ? `WRITE ${data.command || '???'}` : `READ ${data.id || '???'}`;
    const description = isWrite
      ? usesSudo
        ? `Saves as: ${data.saveAs || data.id} · Risk: executes with sudo privileges`
        : `Saves as: ${data.saveAs || data.id}`
      : `${data.read?.kind || 'unknown'} from ${data.read?.inputRef || 'unknown'}`;

    return createFlowBlockPreset({
      variant: isWrite ? 'write' : 'read',
      icon: isWrite ? '✍️' : '🔍',
      title,
      description,
      riskLevel: usesSudo ? 'sudo' : '',
      riskLabel: 'sudo risk',
      riskTitle: 'This write block runs with sudo privileges.',
      onRemove,
      renderEditor: (editor) => {
        if (isWrite) {
          editor.innerHTML = `
            <label class="form-field">Command
              <input type="text" class="form-input cmd-input" value="${data.command || ''}">
            </label>
            <label class="form-field">Save As
              <input type="text" class="form-input save-input" value="${data.saveAs || ''}">
            </label>
            <div style="display:flex; justify-content:flex-end;">
              <button type="button" class="button save-btn">Save Block</button>
            </div>
          `.trim().replace(/>\s+</g, '><');
          const saveBtn = editor.querySelector('.save-btn');
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newCmd = editor.querySelector('.cmd-input').value.trim();
            const newSave = editor.querySelector('.save-input').value.trim();
            onSave({ ...data, command: newCmd, saveAs: newSave });
          });
          return;
        }

        const isStr = data.read?.kind === 'contains_string';
        const isAny = data.read?.kind === 'contains_any_string';
        const isLines = data.read?.kind === 'contains_lines_unordered';
        const selectedReadString = isStr ? ' selected="selected"' : '';
        const selectedReadAny = isAny ? ' selected="selected"' : '';
        const selectedReadLines = isLines ? ' selected="selected"' : '';
        let needleVal = data.read?.needle || '';
        if (isAny && data.read?.needles) needleVal = data.read.needles.join(', ');
        if (isLines && data.read?.lines) needleVal = data.read.lines.join('\n');

        editor.innerHTML = `
          <label class="form-field">Check ID
            <input type="text" class="form-input id-input" value="${data.id || ''}">
          </label>
          <label class="form-field">Read from (Input Ref)
            <input type="text" class="form-input ref-input" value="${data.read?.inputRef || ''}">
          </label>
          <label class="form-field">Matcher Kind
            <select class="form-input kind-input">
              <option value="contains_string"${selectedReadString}>Contains String</option>
              <option value="contains_any_string"${selectedReadAny}>Contains Any String</option>
              <option value="contains_lines_unordered"${selectedReadLines}>Contains Lines Unordered</option>
            </select>
          </label>
          <label class="form-field">Matching Value (String / Comma sep / Lines)
            <textarea class="form-input needle-input" rows="3">${needleVal}</textarea>
          </label>
          <label class="form-field">Pass Message
            <input type="text" class="form-input pass-input" value="${data.pass?.details || 'Passed'}">
          </label>
          <label class="form-field">Fail Message
            <input type="text" class="form-input fail-input" value="${data.fail?.details || 'Failed'}">
          </label>
          <div style="display:flex; justify-content:flex-end;">
            <button type="button" class="button save-btn">Save Block</button>
          </div>
        `.trim().replace(/>\s+</g, '><');
        const saveBtn = editor.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idVal = editor.querySelector('.id-input').value.trim();
          const refVal = editor.querySelector('.ref-input').value.trim();
          const kindVal = editor.querySelector('.kind-input').value;
          const needleRaw = editor.querySelector('.needle-input').value;
          const passDetail = editor.querySelector('.pass-input').value.trim();
          const failDetail = editor.querySelector('.fail-input').value.trim();

          let newRead = { kind: kindVal, inputRef: refVal };
          if (kindVal === 'contains_lines_unordered') {
            newRead.lines = needleRaw.split('\n').map((s) => s.trim()).filter(Boolean);
            newRead.requireAll = true;
          } else if (kindVal === 'contains_any_string') {
            newRead.needles = needleRaw.split(',').map((s) => s.trim()).filter(Boolean);
          } else {
            newRead.needle = needleRaw.trim();
          }

          const newBlock = {
            ...data,
            id: idVal,
            label: idVal.replace(/_/g, ' '),
            runAtConnection: data.runAtConnection !== false,
            read: newRead,
            pass: { ...data.pass, details: passDetail, status: 'ok', value: 'present' },
            fail: { ...data.fail, details: failDetail, status: 'error', value: 'missing' },
          };
          onSave(newBlock);
        });
      },
    });
  }

  // Hook change events to re-render blocks
  [tExecInput, tChecksInput].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('change', () => renderFlow(tExecInput, tChecksInput, tFlowDiv, true));
    
    const d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (d && d.get && d.set) {
      Object.defineProperty(inp, 'value', {
        get: d.get,
        set: function(v) { 
          d.set.call(this, v); 
          this.dispatchEvent(new Event('change')); 
        }
      });
    }
  });

  if (fExecInput) {
    fExecInput.addEventListener('change', () => renderFlow(fExecInput, null, fFlowDiv, false));
    const d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (d && d.get && d.set) {
      Object.defineProperty(fExecInput, 'value', {
        get: d.get,
        set: function(v) {
          d.set.call(this, v);
          this.dispatchEvent(new Event('change'));
        }
      });
    }
  }

  if (tAddW) {
    tAddW.addEventListener('click', () => {
      let execute = [];
      try { execute = JSON.parse(tExecInput.value || '[]'); } catch(e){}
      const id = 'step_' + (execute.length + 1);
      execute.push({ id, command: 'echo "New Command"', saveAs: id + '_out' });
      tExecInput.value = JSON.stringify(execute, null, 2);
    });
  }

  if (tAddR) {
    tAddR.addEventListener('click', () => {
       let checks = [];
       try { checks = JSON.parse(tChecksInput.value || '[]'); } catch(e){}
       let execute = [];
       try { execute = JSON.parse(tExecInput.value || '[]'); } catch(e){}

       const defRef = execute.length ? execute[execute.length - 1].saveAs : 'unknown';
       const id = 'read_' + (checks.length + 1);
       const runAtConnectionDefault = Boolean(tRunAtConnectionInput?.checked);
       checks.push({
         id: id,
         label: id.replace(/_/g, ' '),
         runAtConnection: runAtConnectionDefault,
         read: {
           kind: 'contains_string',
           inputRef: defRef,
           needle: 'success text',
         },
         pass: { status: 'ok', value: 'present', details: 'Check passed' },
         fail: { status: 'error', value: 'missing', details: 'Check failed' }
       });
       tChecksInput.value = JSON.stringify(checks, null, 2);
    });
  }

  if (fAddW) {
    fAddW.addEventListener('click', () => {
      let execute = [];
      try { execute = JSON.parse(fExecInput.value || '[]'); } catch(e){}
      const id = 'fix_step_' + (execute.length + 1);
      execute.push({ id, command: 'echo "New Fix Command"' });
      fExecInput.value = JSON.stringify(execute, null, 2);
    });
  }

  // Initial render
  setTimeout(() => {
    if (tExecInput) renderFlow(tExecInput, tChecksInput, tFlowDiv, true);
    if (fExecInput) renderFlow(fExecInput, null, fFlowDiv, false);
  }, 100);
}
