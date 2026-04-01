export function createDetailTerminalDebugApi(deps) {
  const {
    DETAIL_TERMINAL_PRESET_IDS,
    PRESET_COMMANDS,
    batteryReasonText,
    bugReportMessageInput,
    bugReportModal,
    bugReportStatus,
    buildApiUrl,
    cancelBugReportButton,
    getDefinitionLabel,
    getRobotBatteryState,
    normalizeText,
    robotId,
    setActionButtonLoading,
    setTerminalActive,
    state,
    submitBugReportButton,
    syncModalScrollLock,
    terminal,
    testDebugBody,
    testDebugModal,
    testDebugSummary,
    testDebugTitle,
  } = deps;

  function getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  function appendTerminalLine(line, level = 'ok', fromAuto = false) {
    const safeLine = `[${getTimestamp()}] ${line}`;
    const span = document.createElement('span');
    span.className = `line ${level}`;
    if (fromAuto) {
      span.style.opacity = '0.9';
    }
    span.textContent = safeLine;
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function formatConsoleLine(key, status, value, details) {
    const map = {
      online: 'network',
      general: 'system',
      battery: 'power',
      movement: 'motion',
      proximity: 'perception',
      lidar: 'perception',
      camera: 'vision',
    };
    const zone = map[key] || 'system';
    if (status === 'ok') {
      return `[OK] ${zone}::${key} => ${value} | ${details}`;
    }
    if (status === 'warning') {
      return `[WARN] ${zone}::${key} => ${value} | ${details}`;
    }
    return `[ERROR] ${zone}::${key} => ${value} | ${details}`;
  }

  function appendTerminalPayload(payload) {
    if (payload === null || payload === undefined) {
      appendTerminalLine('[Empty output]', 'warn');
      return;
    }
    if (typeof payload.stdout === 'string') {
      appendTerminalLine(payload.stdout, 'plain');
    }
    if (typeof payload.stderr === 'string') {
      appendTerminalLine(payload.stderr, 'err');
    }
    if (typeof payload.output === 'string') {
      appendTerminalLine(payload.output, 'plain');
    }
    if (Array.isArray(payload.lines)) {
      appendTerminalLine(payload.lines.join('\n'), 'plain');
    }
    if (payload.result !== undefined) {
      appendTerminalLine(String(payload.result), 'plain');
    }
    if (typeof payload.exitCode === 'number' && payload.exitCode !== 0) {
      appendTerminalLine(`[exit ${payload.exitCode}]`, 'warn');
    }
    if (typeof payload.code === 'number' && payload.code !== 0) {
      appendTerminalLine(`[exit ${payload.code}]`, 'warn');
    }

    const hasKnownFields =
      typeof payload.stdout === 'string' ||
      typeof payload.stderr === 'string' ||
      typeof payload.output === 'string' ||
      Array.isArray(payload.lines) ||
      payload.result !== undefined ||
      typeof payload.exitCode === 'number' ||
      typeof payload.code === 'number';
    if (!hasKnownFields) {
      appendTerminalLine(JSON.stringify(payload), 'plain');
    }
  }

  async function runFallbackCommandSimulation(robot, command, commandId, reason = '') {
    if (!robot || !robot.id) {
      appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
      return;
    }

    const commandText = String(command || '').trim();
    if (!commandText) {
      appendTerminalLine('Fallback blocked: empty command.', 'warn');
      return;
    }

    const terminalEndpoint = buildApiUrl(`/api/robots/${encodeURIComponent(robot.id)}/terminal`);
    appendTerminalLine(`$ ${commandText}`, 'warn');
    if (reason) {
      appendTerminalLine(`Terminal hint: ${reason}. Attempting direct command execution.`, 'warn');
    }

    try {
      const response = await fetch(terminalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: robot.id,
          command: commandText,
          commandId,
          source: 'robot-dashboard-fallback',
        }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        appendTerminalLine(`[HTTP ${response.status}] Terminal API rejected the command.`, 'err');
        if (responseText) appendTerminalLine(responseText, 'err');
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(responseText);
      } catch (_error) {
        payload = null;
      }

      if (payload) {
        appendTerminalPayload(payload);
      } else {
        appendTerminalLine(responseText || '[No response text]', responseText ? 'plain' : 'warn');
      }
      return;
    } catch (_error) {
      appendTerminalLine('Direct terminal execution unavailable. Falling back to simulated output.', 'warn');
    }

    const map = Object.fromEntries(PRESET_COMMANDS.map((item) => [item.id, item]));
    const friendly = map[commandId]?.label || commandText;
    appendTerminalLine(`Simulating output for ${friendly}.`, 'warn');
    const generalState = robot.tests.general || { status: 'warning', value: 'n/a', details: 'No detail available' };
    const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {
      status: 'warning',
      value: 'n/a',
      details: 'No detail available',
    };
    appendTerminalLine(
      formatConsoleLine('general', generalState.status, generalState.value, generalState.details),
      generalState.status === 'error' ? 'err' : generalState.status === 'warning' ? 'warn' : 'ok',
    );
    appendTerminalLine(
      formatConsoleLine('battery', batteryState.status, batteryState.value, batteryState.details),
      batteryState.status === 'error' ? 'err' : batteryState.status === 'warning' ? 'warn' : 'ok',
    );
    appendTerminalLine(`Simulated command result: ${commandText} executed.`, 'warn');
    appendTerminalLine('Hint: configure /api/robots/{robotId}/terminal', 'ok');
  }

  function runFallbackChecks(robot) {
    if (!robot) {
      appendTerminalLine('Fallback blocked: no active robot selected.', 'err');
      return;
    }
    appendTerminalLine('--- Simulated live checks begin ---', 'warn');
    Object.entries(robot.tests).forEach(([key, value]) => {
      appendTerminalLine(
        formatConsoleLine(key, value.status, value.value, value.details),
        value.status === 'error' ? 'err' : value.status === 'warning' ? 'warn' : 'ok',
      );
    });
    appendTerminalLine('--- End checks ---', 'warn');
  }

  function getDetailTerminalPresets() {
    return PRESET_COMMANDS.filter((preset) => {
      const presetId = normalizeText(preset?.id, '').toLowerCase();
      return DETAIL_TERMINAL_PRESET_IDS.has(presetId);
    });
  }

  function initRobotTerminal(robot) {
    if (!robot) return;
    if (!state.terminalComponent) return;
    state.terminalComponent.connect(robot, getDetailTerminalPresets());
    state.activeTerminalRobotId = robotId(robot);
    setTerminalActive();
  }

  function formatEpochSeconds(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 'n/a';
    return new Date(num * 1000).toLocaleString();
  }

  function formatRawOutput(output) {
    const text = normalizeText(output, '');
    if (!text) return '(no output)';
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch (_error) {
      return text;
    }
  }

  function formatReadEvaluationSummary(readResult) {
    if (!readResult || typeof readResult !== 'object') return '';
    const kind = normalizeText(readResult.kind, '');
    const detailText = normalizeText(readResult.details, '');
    const missing = Array.isArray(readResult.missing) ? readResult.missing.filter(Boolean) : [];
    const matched = Array.isArray(readResult.matched) ? readResult.matched.filter(Boolean) : [];
    const status = readResult.passed ? 'pass' : 'fail';
    const parts = [];
    if (kind) parts.push(`${kind}`);
    parts.push(status);
    if (detailText) parts.push(detailText);
    if (missing.length) parts.push(`missing: ${missing.join(', ')}`);
    if (matched.length) parts.push(`matched: ${matched.join(', ')}`);
    return parts.join(' | ');
  }

  function formatReadEvaluationPre(readResult) {
    if (!readResult || typeof readResult !== 'object') return '';
    const lines = [];
    lines.push(`kind: ${normalizeText(readResult.kind, 'n/a')}`);
    lines.push(`passed: ${Boolean(readResult.passed)}`);
    lines.push(`details: ${normalizeText(readResult.details, 'No detail available')}`);
    if (Array.isArray(readResult.missing) && readResult.missing.length) {
      lines.push(`missing: ${readResult.missing.join(', ')}`);
    }
    if (Array.isArray(readResult.matched) && readResult.matched.length) {
      lines.push(`matched: ${readResult.matched.join(', ')}`);
    }
    if (Number.isFinite(Number(readResult.failedRules))) {
      lines.push(`failedRules: ${Number(readResult.failedRules)}`);
    }
    if (Number.isFinite(Number(readResult.totalRules))) {
      lines.push(`totalRules: ${Number(readResult.totalRules)}`);
    }
    lines.push('');
    lines.push('raw:');
    lines.push(JSON.stringify(readResult, null, 2));
    return lines.join('\n');
  }

  function closeTestDebugModal() {
    if (!testDebugModal) return;
    testDebugModal.classList.add('hidden');
    testDebugModal.setAttribute('aria-hidden', 'true');
    state.testDebugModalOpen = false;
    syncModalScrollLock();
  }

  function setBugReportStatus(message = '', tone = '') {
    if (!bugReportStatus) return;
    bugReportStatus.textContent = message;
    bugReportStatus.classList.remove('ok', 'error');
    if (tone) {
      bugReportStatus.classList.add(tone);
    }
  }

  function closeBugReportModal({ force = false } = {}) {
    if (!bugReportModal) return;
    if (state.isBugReportSubmitInProgress && !force) return;
    bugReportModal.classList.add('hidden');
    bugReportModal.setAttribute('aria-hidden', 'true');
    state.isBugReportModalOpen = false;
    syncModalScrollLock();
    setBugReportStatus('', '');
    if (bugReportMessageInput) {
      bugReportMessageInput.value = '';
    }
    if (submitBugReportButton) {
      setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
    }
    if (cancelBugReportButton) {
      cancelBugReportButton.disabled = false;
    }
  }

  function openBugReportModal() {
    if (!bugReportModal) return;
    state.isBugReportModalOpen = true;
    syncModalScrollLock();
    state.isBugReportSubmitInProgress = false;
    setBugReportStatus('', '');
    if (bugReportMessageInput) {
      bugReportMessageInput.value = '';
    }
    if (cancelBugReportButton) {
      cancelBugReportButton.disabled = false;
    }
    if (submitBugReportButton) {
      setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
    }
    bugReportModal.classList.remove('hidden');
    bugReportModal.setAttribute('aria-hidden', 'false');
    if (bugReportMessageInput) {
      bugReportMessageInput.focus();
    }
  }

  async function submitBugReport() {
    if (state.isBugReportSubmitInProgress) return;
    const message = normalizeText(bugReportMessageInput?.value, '').trim();
    if (!message) {
      setBugReportStatus('Please describe the bug before submitting.', 'error');
      if (bugReportMessageInput) {
        bugReportMessageInput.focus();
      }
      return;
    }

    state.isBugReportSubmitInProgress = true;
    setBugReportStatus('');
    if (cancelBugReportButton) {
      cancelBugReportButton.disabled = true;
    }
    if (submitBugReportButton) {
      setActionButtonLoading(submitBugReportButton, true, {
        loadingLabel: 'Submitting...',
        idleLabel: 'Submit',
      });
    }

    try {
      const response = await fetch(buildApiUrl('/api/bug-reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch (_error) {
        payload = null;
      }
      if (!response.ok) {
        const details = normalizeText(payload?.detail, raw || 'Unable to save bug report.');
        setBugReportStatus(details, 'error');
        return;
      }
      closeBugReportModal({ force: true });
    } catch (_error) {
      setBugReportStatus('Unable to submit bug report right now.', 'error');
    } finally {
      state.isBugReportSubmitInProgress = false;
      if (cancelBugReportButton) {
        cancelBugReportButton.disabled = false;
      }
      if (submitBugReportButton) {
        setActionButtonLoading(submitBugReportButton, false, { idleLabel: 'Submit' });
      }
    }
  }

  function openTestDebugModal(robot, testId) {
    if (!robot || !testDebugModal || !testDebugTitle || !testDebugSummary || !testDebugBody) return;

    const definitions = Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [];
    const definitionLabel = getDefinitionLabel(definitions, testId);
    const basicResult = robot?.tests?.[testId] || { status: 'warning', value: 'n/a', details: 'No detail available' };
    const debugResult = robot?.testDebug?.[testId] || null;
    const reasonLabel =
      normalizeText(testId, '').toLowerCase() === 'battery'
        ? batteryReasonText(basicResult)
        : '';
    const errorCodeLabel = normalizeText(debugResult?.errorCode || basicResult?.errorCode, '');
    const sourceLabel = normalizeText(debugResult?.source || basicResult?.source, '');
    const debugReasonLabel = normalizeText(debugResult?.reason || basicResult?.reason, '');
    const readSummaryLabel = formatReadEvaluationSummary(debugResult?.read);
    const checkedAtLabel = Number.isFinite(Number(debugResult?.checkedAt))
      ? formatEpochSeconds(debugResult.checkedAt)
      : 'n/a';

    testDebugTitle.textContent = `${robot.name} • ${definitionLabel}`;
    testDebugSummary.textContent = `Status: ${basicResult.status} | Value: ${basicResult.value} | Details: ${basicResult.details}${reasonLabel ? ` | Reason: ${reasonLabel}` : ''}${errorCodeLabel ? ` | ErrorCode: ${errorCodeLabel}` : ''}${sourceLabel ? ` | Source: ${sourceLabel}` : ''}${debugReasonLabel && debugReasonLabel !== reasonLabel ? ` | ResultReason: ${debugReasonLabel}` : ''}${readSummaryLabel ? ` | CheckEval: ${readSummaryLabel}` : ''}`;
    testDebugBody.replaceChildren();

    const summaryBlock = document.createElement('pre');
    summaryBlock.className = 'test-debug-pre';
    summaryBlock.textContent = debugResult
      ? [
          `runId: ${normalizeText(debugResult.runId, 'n/a')}`,
          `startedAt: ${formatEpochSeconds(debugResult.startedAt)}`,
          `finishedAt: ${formatEpochSeconds(debugResult.finishedAt)}`,
          `testMs: ${Number.isFinite(Number(debugResult.ms)) ? Number(debugResult.ms) : 0}`,
          `status: ${debugResult.status}`,
          `value: ${debugResult.value}`,
          `details: ${debugResult.details}`,
          `errorCode: ${normalizeText(debugResult.errorCode, 'n/a')}`,
          `source: ${normalizeText(debugResult.source, 'n/a')}`,
          `reason: ${normalizeText(debugResult.reason, 'n/a')}`,
          `checkedAt: ${checkedAtLabel}`,
          `skipped: ${Boolean(debugResult.skipped)}`,
        ].join('\n')
      : 'No saved backend debug output recorded yet for this test.';
    testDebugBody.appendChild(summaryBlock);

    const sessionResult = debugResult?.session && typeof debugResult.session === 'object' ? debugResult.session : null;
    if (sessionResult && Object.keys(sessionResult).length) {
      const sessionSection = document.createElement('section');
      sessionSection.className = 'test-debug-step';
      const sessionTitle = document.createElement('h4');
      sessionTitle.className = 'test-debug-step-title';
      sessionTitle.textContent = 'Run session';
      sessionSection.appendChild(sessionTitle);
      const sessionPre = document.createElement('pre');
      sessionPre.className = 'test-debug-pre';
      sessionPre.textContent = [
        `runId: ${normalizeText(sessionResult.runId, 'n/a')}`,
        `robotId: ${normalizeText(sessionResult.robotId, 'n/a')}`,
        `pageSessionId: ${normalizeText(sessionResult.pageSessionId, 'n/a')}`,
        `runKind: ${normalizeText(sessionResult.runKind, 'n/a')}`,
        `transportReused: ${Boolean(sessionResult.transportReused)}`,
        `resetPolicy: ${normalizeText(sessionResult.resetPolicy, 'n/a')}`,
      ].join('\n');
      sessionSection.appendChild(sessionPre);
      testDebugBody.appendChild(sessionSection);
    }

    const timingResult = debugResult?.timing && typeof debugResult.timing === 'object' ? debugResult.timing : null;
    if (timingResult && Object.keys(timingResult).length) {
      const timingSection = document.createElement('section');
      timingSection.className = 'test-debug-step';
      const timingTitle = document.createElement('h4');
      timingTitle.className = 'test-debug-step-title';
      timingTitle.textContent = 'Run timing';
      timingSection.appendChild(timingTitle);
      const timingPre = document.createElement('pre');
      timingPre.className = 'test-debug-pre';
      timingPre.textContent = [
        `queueMs: ${Number.isFinite(Number(timingResult.queueMs)) ? Number(timingResult.queueMs) : 0}`,
        `connectMs: ${Number.isFinite(Number(timingResult.connectMs)) ? Number(timingResult.connectMs) : 0}`,
        `executeMs: ${Number.isFinite(Number(timingResult.executeMs)) ? Number(timingResult.executeMs) : 0}`,
        `totalMs: ${Number.isFinite(Number(timingResult.totalMs)) ? Number(timingResult.totalMs) : 0}`,
      ].join('\n');
      timingSection.appendChild(timingPre);
      testDebugBody.appendChild(timingSection);
    }

    if (debugResult && debugResult.read && Object.keys(debugResult.read).length) {
      const readSection = document.createElement('section');
      readSection.className = 'test-debug-step';
      const readTitle = document.createElement('h4');
      readTitle.className = 'test-debug-step-title';
      readTitle.textContent = 'Check criteria & evaluation';
      readSection.appendChild(readTitle);
      const readPre = document.createElement('pre');
      readPre.className = 'test-debug-pre';
      readPre.textContent = formatReadEvaluationPre(debugResult.read);
      readSection.appendChild(readPre);
      testDebugBody.appendChild(readSection);
    }

    if (debugResult && Array.isArray(debugResult.steps) && debugResult.steps.length) {
      debugResult.steps.forEach((step) => {
        const stepSection = document.createElement('section');
        stepSection.className = 'test-debug-step';

        const heading = document.createElement('h4');
        heading.className = 'test-debug-step-title';
        heading.textContent = `Step: ${step.id} (${step.status})`;
        stepSection.appendChild(heading);

        const details = document.createElement('pre');
        details.className = 'test-debug-pre';
        details.textContent = [
          `value: ${step.value}`,
          `details: ${step.details}`,
          `ms: ${Number.isFinite(Number(step.ms)) ? Number(step.ms) : 0}`,
          'output:',
          formatRawOutput(step.output),
        ].join('\n');
        stepSection.appendChild(details);
        testDebugBody.appendChild(stepSection);
      });
    }

    if (debugResult && debugResult.raw && Object.keys(debugResult.raw).length) {
      const rawSection = document.createElement('section');
      rawSection.className = 'test-debug-step';
      const rawTitle = document.createElement('h4');
      rawTitle.className = 'test-debug-step-title';
      rawTitle.textContent = 'Parser metadata';
      rawSection.appendChild(rawTitle);
      const rawPre = document.createElement('pre');
      rawPre.className = 'test-debug-pre';
      rawPre.textContent = JSON.stringify(debugResult.raw, null, 2);
      rawSection.appendChild(rawPre);
      testDebugBody.appendChild(rawSection);
    }

    testDebugModal.classList.remove('hidden');
    testDebugModal.setAttribute('aria-hidden', 'false');
    state.testDebugModalOpen = true;
    syncModalScrollLock();
  }

  async function openLatestTestDebugModal(robot, testId) {
    const fallbackRobot = robot && typeof robot === 'object' ? robot : null;
    const normalizedRobotId = robotId(fallbackRobot);
    const normalizedTestId = normalizeText(testId, '');
    if (!fallbackRobot || !normalizedRobotId || !normalizedTestId || typeof fetch !== 'function') {
      openTestDebugModal(fallbackRobot, normalizedTestId);
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/api/robots/${encodeURIComponent(normalizedRobotId)}/tests/${encodeURIComponent(normalizedTestId)}/debug`),
      );
      if (!response.ok) {
        openTestDebugModal(fallbackRobot, normalizedTestId);
        return;
      }

      const payload = await response.json();
      const latestResult = payload?.result && typeof payload.result === 'object' ? payload.result : null;
      const latestDebug = payload?.debug && typeof payload.debug === 'object' ? payload.debug : null;
      const nextTests = { ...(fallbackRobot?.tests || {}) };
      const nextTestDebug = { ...(fallbackRobot?.testDebug || {}) };
      if (latestResult) {
        nextTests[normalizedTestId] = latestResult;
      }
      if (latestDebug) {
        nextTestDebug[normalizedTestId] = latestDebug;
      } else {
        delete nextTestDebug[normalizedTestId];
      }

      openTestDebugModal(
        {
          ...fallbackRobot,
          tests: nextTests,
          testDebug: nextTestDebug,
        },
        normalizedTestId,
      );
    } catch (_error) {
      openTestDebugModal(fallbackRobot, normalizedTestId);
    }
  }

  return {
    getTimestamp,
    appendTerminalLine,
    runFallbackCommandSimulation,
    appendTerminalPayload,
    runFallbackChecks,
    getDetailTerminalPresets,
    initRobotTerminal,
    formatConsoleLine,
    formatEpochSeconds,
    formatRawOutput,
    formatReadEvaluationSummary,
    formatReadEvaluationPre,
    closeTestDebugModal,
    setBugReportStatus,
    closeBugReportModal,
    openBugReportModal,
    submitBugReport,
    openTestDebugModal,
    openLatestTestDebugModal,
  };
}
