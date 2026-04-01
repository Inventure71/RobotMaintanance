export function createFixTestsAutoFixApi(deps) {
  const {
    FIX_MODE_CONTEXT_DASHBOARD,
    FIX_MODE_CONTEXT_DETAIL,
    appendTerminalLine,
    buildFixButtonLabel,
    buildFixCandidateActionNode,
    createActionButton,
    enqueueRobotJob,
    getDashboardFixCandidates,
    getDetailFixCandidates,
    getFixModeElements,
    getFleetParallelism,
    getOnlineCheckCountdownMs,
    getRobotActionAvailability,
    getRobotById,
    mapRobots,
    normalizeStatus,
    normalizeText,
    renderDashboard,
    renderDetail,
    robotId,
    runOneRobotOnlineCheck,
    setFixModeStatus,
    setRobotSearching,
    state,
    summarizeBlockedRobotActionTitle,
    syncFixModeToggleButton,
    updateOnlineCheckEstimateFromResults,
  } = deps;

  async function runAutoFixForRobot(robot, candidate) {
    if (!robot || !candidate) return;
    const normalizedRobotId = robotId(robot);

    const currentOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
    if (currentOnlineStatus !== 'ok') {
      appendTerminalLine(
        `Robot ${robot.name || normalizedRobotId} is not online. Running online check first...`,
        'warn',
      );
      setRobotSearching(normalizedRobotId, true, getOnlineCheckCountdownMs());
      const onlineStatus = await runOneRobotOnlineCheck(robot);
      setRobotSearching(normalizedRobotId, false);
      updateOnlineCheckEstimateFromResults([onlineStatus]);
      mapRobots((item) =>
        robotId(item) === normalizedRobotId
          ? {
              ...item,
              tests: {
                ...(item.tests || {}),
                online: {
                  status: onlineStatus.status,
                  value: onlineStatus.value,
                  details: onlineStatus.details,
                },
              },
            }
          : item,
      );
      renderDashboard();
      const activeRobotPostOnline = state.robots.find((item) => robotId(item) === state.detailRobotId);
      if (activeRobotPostOnline) {
        renderDetail(activeRobotPostOnline);
      }
      if (normalizeStatus(onlineStatus.status) !== 'ok') {
        throw new Error(`Robot is offline (${onlineStatus.details}).`);
      }
    }

    const payload = await enqueueRobotJob(normalizedRobotId, {
      kind: 'fix',
      fixId: normalizeText(candidate.id, ''),
      pageSessionId: state.pageSessionId,
      source: 'manual',
      label: normalizeText(candidate.label, 'Run fix'),
    });
    const activeStatus = normalizeText(payload?.activeJob?.status, '').toLowerCase();
    const queuedCount = Array.isArray(payload?.queuedJobs) ? payload.queuedJobs.length : 0;
    if (activeStatus === 'running' || activeStatus === 'interrupting') {
      appendTerminalLine(`Started auto-fix "${candidate.label}" on ${robot.name}.`, 'warn');
    } else {
      appendTerminalLine(
        `Queued auto-fix "${candidate.label}" on ${robot.name} (${queuedCount} queued).`,
        'warn',
      );
    }
  }

  async function runAutoFixCandidate(context, candidate) {
    if (state.isAutoFixInProgress || state.isTestRunInProgress || state.isOnlineRefreshInFlight) return;
    const candidateRobotIds = (candidate?.robotIds || []).map((id) => robotId(id)).filter(Boolean);
    if (!candidateRobotIds.length) {
      setFixModeStatus(context, 'No robots available for this fix action.', 'warn');
      return;
    }

    const robotIds = [];
    candidateRobotIds.forEach((targetId) => {
      const availability = getRobotActionAvailability(targetId, 'fix');
      if (availability?.allowed) {
        robotIds.push(targetId);
        return;
      }
      const robot = getRobotById(targetId);
      appendTerminalLine(
        `Skipping fix for ${robot?.name || targetId}: ${availability?.title || 'Robot is busy with another active operation.'}`,
        'warn',
      );
    });
    if (!robotIds.length) {
      setFixModeStatus(
        context,
        summarizeBlockedRobotActionTitle(
          candidateRobotIds.map((targetId) => getRobotActionAvailability(targetId, 'fix')),
          'No robots can run this fix right now.',
        ),
        'warn',
      );
      syncFixModePanels();
      return;
    }

    state.isAutoFixInProgress = true;
    syncFixModePanels();
    setFixModeStatus(context, `Running "${candidate.label}" on ${robotIds.length} robot(s)...`, 'warn');

    try {
      let successCount = 0;
      let failureCount = 0;
      const workerCount = Math.max(1, Math.min(getFleetParallelism(), robotIds.length));
      setFixModeStatus(
        context,
        `Running "${candidate.label}" on ${robotIds.length} robot(s) with parallelism ${workerCount}...`,
        'warn',
      );
      const queue = [...robotIds];
      const workers = Array.from({ length: workerCount }, () => (async () => {
        while (queue.length) {
          const targetId = queue.shift();
          if (!targetId) break;
          const targetRobot = getRobotById(targetId);
          if (!targetRobot) {
            failureCount += 1;
            continue;
          }
          try {
            await runAutoFixForRobot(targetRobot, candidate);
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            const message = error instanceof Error ? error.message : String(error);
            appendTerminalLine(`Auto-fix failed for ${targetRobot.name}: ${message}`, 'err');
          }
        }
      })());
      await Promise.all(workers);

      renderDashboard();
      const activeRobot = getRobotById(state.detailRobotId);
      if (activeRobot) {
        renderDetail(activeRobot);
      }

      if (failureCount === 0) {
        setFixModeStatus(context, `Auto-fix "${candidate.label}" completed (${successCount}/${robotIds.length}).`, 'ok');
      } else {
        setFixModeStatus(
          context,
          `Auto-fix "${candidate.label}" completed (${successCount} succeeded, ${failureCount} failed).`,
          'warn',
        );
      }
    } finally {
      state.isAutoFixInProgress = false;
      syncFixModePanels();
    }
  }

  function renderFixModeActionsForContext(context) {
    const elements = getFixModeElements(context);
    if (!elements.actions || !elements.summary) return;
    elements.actions.replaceChildren();

    if (context === FIX_MODE_CONTEXT_DETAIL) {
      const detailPayload = getDetailFixCandidates();
      const robot = detailPayload.robot;
      const candidates = detailPayload.candidates;
      if (!robot) {
        elements.summary.textContent = 'Open a robot detail page to use fix mode.';
        const empty = document.createElement('span');
        empty.className = 'fix-mode-empty';
        empty.textContent = 'No robot in context.';
        elements.actions.appendChild(empty);
        return;
      }
      if (!candidates.length) {
        elements.summary.textContent = `${robot.name} has no auto fixes configured.`;
        const empty = document.createElement('span');
        empty.className = 'fix-mode-empty';
        empty.textContent = 'No fixes available for this robot type.';
        elements.actions.appendChild(empty);
        return;
      }

      elements.summary.textContent = `${candidates.length} fix action(s) available for ${robot.name}.`;
      candidates.forEach((candidate) => {
        const availability = getRobotActionAvailability(candidate.robotIds[0], 'fix');
        const button = createActionButton({
          intent: 'fix',
          compact: true,
          label: buildFixButtonLabel(candidate, false),
          title: availability?.title || candidate.description || `Run ${candidate.label}`,
          disabled: state.isAutoFixInProgress || availability?.allowed === false,
        });
        button.addEventListener('click', () => {
          runAutoFixCandidate(context, candidate);
        });
        elements.actions.appendChild(buildFixCandidateActionNode(candidate, button));
      });
      return;
    }

    const payload = getDashboardFixCandidates();
    const candidates = payload.candidates;
    if (!payload.selectedCount) {
      elements.summary.textContent = 'Select one or more robots to see available fixes.';
      const empty = document.createElement('span');
      empty.className = 'fix-mode-empty';
      empty.textContent = 'No selected robots.';
      elements.actions.appendChild(empty);
      return;
    }
    if (payload.mixedTypes) {
      elements.summary.textContent = 'Fix mode requires selecting robots of the same type.';
      const empty = document.createElement('span');
      empty.className = 'fix-mode-empty';
      empty.textContent = 'Mixed robot types cannot run fixes together.';
      elements.actions.appendChild(empty);
      return;
    }
    if (!candidates.length) {
      elements.summary.textContent = 'No auto fixes are configured for the selected robots.';
      const empty = document.createElement('span');
      empty.className = 'fix-mode-empty';
      empty.textContent = 'Selected types have no fixes.';
      elements.actions.appendChild(empty);
      return;
    }

    elements.summary.textContent =
      `${candidates.length} fix action(s) across ${payload.selectedCount} selected robot(s).`;
    candidates.forEach((candidate) => {
      const availabilities = candidate.robotIds.map((targetId) => getRobotActionAvailability(targetId, 'fix'));
      const hasActionableRobot = availabilities.some((entry) => entry.allowed);
      const button = createActionButton({
        intent: 'fix',
        compact: true,
        label: buildFixButtonLabel(candidate, true),
        title:
          hasActionableRobot
            ? (candidate.description || `Run ${candidate.label} for ${candidate.typeLabel}`)
            : summarizeBlockedRobotActionTitle(
                availabilities,
                candidate.description || `Run ${candidate.label} for ${candidate.typeLabel}`,
              ),
        disabled: state.isAutoFixInProgress || !hasActionableRobot,
      });
      button.addEventListener('click', () => {
        runAutoFixCandidate(context, candidate);
      });
      elements.actions.appendChild(buildFixCandidateActionNode(candidate, button));
    });
  }

  function syncFixModePanels() {
    [FIX_MODE_CONTEXT_DASHBOARD, FIX_MODE_CONTEXT_DETAIL].forEach((context) => {
      const elements = getFixModeElements(context);
      const open = !!state.fixModeOpen[context];
      if (elements.panel) {
        const shouldShow = open && elements.active;
        elements.panel.classList.toggle('hidden', !shouldShow);
      }
      syncFixModeToggleButton(context);
      if (open) {
        renderFixModeActionsForContext(context);
      }
    });
  }

  function toggleFixMode(context) {
    if (state.isAutoFixInProgress) return;
    state.fixModeOpen[context] = !state.fixModeOpen[context];
    if (!state.fixModeOpen[context]) {
      setFixModeStatus(context, '');
    }
    syncFixModePanels();
  }

  return {
    renderFixModeActionsForContext,
    runAutoFixCandidate,
    runAutoFixForRobot,
    syncFixModePanels,
    toggleFixMode,
  };
}
