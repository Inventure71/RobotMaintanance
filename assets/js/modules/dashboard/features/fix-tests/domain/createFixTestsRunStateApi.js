export function createFixTestsRunStateApi(deps) {
  const {
    $,
    applyActionButton,
    getReachableRobotIds,
    getRobotById,
    getRunSelectedButtonIdleLabel,
    getSelectedRobotIds,
    hasMixedRobotTypesForIds,
    mapRobots,
    normalizeDebugSession,
    normalizeDebugTiming,
    normalizeRobotActivity,
    normalizeStatus,
    normalizeTestDebugResult,
    normalizeText,
    robotId,
    selectRobotIds,
    setActionButtonLoading,
    state,
  } = deps;

  function getRobotIdsForRun(options = {}, runtimeOptions = {}) {
    const persistSelection = runtimeOptions.persistSelection !== false;
    const selectedIds = getSelectedRobotIds().filter((id) => robotId(id));

    if (selectedIds.length) return selectedIds;

    if (options.autoSelectOnlineWhenEmpty) {
      const reachableIds = getReachableRobotIds().filter((id) => robotId(id));
      if (reachableIds.length) {
        if (persistSelection) {
          selectRobotIds(reachableIds);
          return getSelectedRobotIds().filter((id) => robotId(id));
        }
        return reachableIds;
      }
      return [];
    }

    if (options.fallbackToActive && state.detailRobotId) {
      return [state.detailRobotId];
    }

    return [];
  }

  function getRobotActionAvailability(robotIdValue, actionKind = 'test') {
    const id = robotId(robotIdValue);
    const robot = getRobotById(id);
    if (!id || !robot) {
      return {
        allowed: false,
        blocked: true,
        preemptableAuto: false,
        title: 'Robot not found.',
      };
    }

    const actionLabel =
      actionKind === 'fix'
        ? 'fix'
        : actionKind === 'online'
          ? 'online check'
          : 'tests';
    const queueTitle = actionKind === 'fix' ? 'Queue fix job' : 'Queue test job';
    const activity = normalizeRobotActivity(robot?.activity);
    const phase = normalizeText(activity?.phase, '');
    const hasQueuedUserWork = Boolean(activity?.activeJob)
      || (Array.isArray(activity?.queuedJobs) && activity.queuedJobs.length > 0);
    const autoFixing = state.autoFixingRobotIds?.has(id) === true;
    const autoTesting = state.autoTestingRobotIds.has(id);
    const autoSearching = state.autoSearchingRobotIds.has(id);
    const isFixing = state.fixingRobotIds.has(id) || autoFixing || phase === 'fixing';
    const isTesting = state.testingRobotIds.has(id);
    const isSearching = state.searchingRobotIds.has(id);

    if (actionKind !== 'online' && hasQueuedUserWork) {
      return {
        allowed: true,
        blocked: false,
        preemptableAuto: false,
        title: queueTitle,
      };
    }

    if (actionKind === 'online' && isFixing) {
      return {
        allowed: false,
        blocked: true,
        preemptableAuto: false,
        title: 'Fix is already running for this robot.',
      };
    }

    const isRecoveryPhase = phase === 'connection_retry' || phase === 'full_test_after_recovery';
    if (isRecoveryPhase) {
      return {
        allowed: true,
        blocked: false,
        preemptableAuto: true,
        title: `Stops automatic recovery tests and runs ${actionLabel}.`,
      };
    }

    if (actionKind !== 'online' && (isFixing || isTesting || isSearching || autoTesting || autoSearching)) {
      return {
        allowed: true,
        blocked: false,
        preemptableAuto: false,
        title: queueTitle,
      };
    }

    if (isTesting) {
      return {
        allowed: false,
        blocked: true,
        preemptableAuto: false,
        title: 'Tests are already running for this robot.',
      };
    }
    if (isSearching) {
      return {
        allowed: false,
        blocked: true,
        preemptableAuto: false,
        title: 'Online check is already running for this robot.',
      };
    }

    if (autoTesting || autoSearching) {
      return {
        allowed: false,
        blocked: true,
        preemptableAuto: false,
        title: 'Robot is busy with an automatic operation that cannot be interrupted.',
      };
    }

    return {
      allowed: true,
      blocked: false,
      preemptableAuto: false,
      title:
        actionKind === 'fix'
          ? 'Run fix'
          : actionKind === 'online'
            ? 'Run online check'
            : 'Run tests',
    };
  }

  function summarizeBlockedRobotActionTitle(availabilities, fallbackTitle) {
    const titles = Array.from(new Set(
      (Array.isArray(availabilities) ? availabilities : [])
        .map((entry) => normalizeText(entry?.title, ''))
        .filter(Boolean),
    ));
    if (!titles.length) return fallbackTitle;
    if (titles.length === 1) return titles[0];
    return 'Selected robots are busy with operations that cannot be interrupted.';
  }

  function getManualRunButtonState() {
    const detailTargetIds = getRobotIdsForRun(
      { fallbackToActive: true },
      { persistSelection: false },
    );
    const selectedTargetIds = getRobotIdsForRun(
      { fallbackToActive: false, autoSelectOnlineWhenEmpty: true },
      { persistSelection: false },
    );
    const detailAvailability = detailTargetIds.length
      ? getRobotActionAvailability(detailTargetIds[0], 'test')
      : null;
    const hasMixedSelectedTypes = hasMixedRobotTypesForIds(selectedTargetIds);
    const selectedAvailabilities = selectedTargetIds.map((id) => getRobotActionAvailability(id, 'test'));
    const hasSelectedActionableRobot = selectedAvailabilities.some((entry) => entry.allowed);

    return {
      detailDisabled: Boolean(detailAvailability) && !detailAvailability.allowed,
      detailTitle: detailAvailability?.title || 'Run tests',
      selectedDisabled: hasMixedSelectedTypes || (selectedTargetIds.length > 0 && !hasSelectedActionableRobot),
      selectedTitle:
        hasMixedSelectedTypes
          ? 'Selected robots must all share the same type.'
          : selectedTargetIds.length > 0 && !hasSelectedActionableRobot
            ? summarizeBlockedRobotActionTitle(selectedAvailabilities, getRunSelectedButtonIdleLabel())
            : getRunSelectedButtonIdleLabel(),
    };
  }

  function getConfiguredDefaultTestIds(robot, includeOnline = false) {
    const byDefinition =
      Array.isArray(robot?.testDefinitions)
        ? robot.testDefinitions
        : [];
    const testIds = byDefinition
      .filter((item) => item && typeof item === 'object' && item.enabled !== false)
      .map((item) => normalizeText(item?.id, ''))
      .filter((id) => id && (includeOnline || id !== 'online'));
    return Array.from(new Set(testIds)).filter(Boolean);
  }

  function updateRobotTestState(robotIdValue, results, runMeta = {}) {
    const id = robotId(robotIdValue);
    if (!id) return;
    if (!results.length) return;
    const runSession = normalizeDebugSession(runMeta?.session, normalizeText(runMeta?.runId, ''));
    const runTiming = normalizeDebugTiming(runMeta?.timing);
    const runId = normalizeText(runMeta?.runId, normalizeText(runSession.runId, ''));

    const robot = state.robots.find((item) => robotId(item) === id);
    const updates = { ...(robot?.tests || {}) };
    const debugUpdates = { ...(robot?.testDebug || {}) };
    results.forEach((result) => {
      if (!result || typeof result !== 'object') return;
      const resultId = normalizeText(result.id, '');
      if (!resultId) return;
      updates[resultId] = {
        status: normalizeStatus(result.status),
        value: normalizeText(result.value, 'n/a'),
        details: normalizeText(result.details, 'No detail available'),
        reason: normalizeText(result.reason, ''),
        errorCode: normalizeText(result.errorCode, ''),
        source: normalizeText(result.source, ''),
        checkedAt: Number.isFinite(Number(result.checkedAt)) ? Number(result.checkedAt) : 0,
        skipped: Boolean(result.skipped),
      };
      const debugResult = normalizeTestDebugResult(result);
      if (debugResult) {
        debugUpdates[resultId] = {
          ...debugResult,
          runId,
          startedAt: Number.isFinite(Number(runMeta?.startedAt)) ? Number(runMeta.startedAt) : 0,
          finishedAt: Number.isFinite(Number(runMeta?.finishedAt)) ? Number(runMeta.finishedAt) : 0,
          session: runSession,
          timing: runTiming,
        };
      }
    });

    const hasExplicitOnlineResult = results.some(
      (result) => normalizeText(result?.id, '') === 'online',
    );
    const existingOnline = robot?.tests?.online;
    const existingOnlineStatus = normalizeStatus(existingOnline?.status);
    const existingOnlineValue = normalizeText(existingOnline?.value, '').toLowerCase();
    const existingOnlineDetails = normalizeText(existingOnline?.details, '').toLowerCase();
    const existingOnlineCheckedAt = Number(existingOnline?.checkedAt);
    const isPlaceholderOnline =
      existingOnlineStatus === 'warning' &&
      (existingOnlineValue === '' || existingOnlineValue === 'unknown') &&
      (existingOnlineDetails === '' || existingOnlineDetails === 'not checked yet');
    const hasRecentExplicitOnline =
      !!existingOnline
      && !isPlaceholderOnline
      && (!Number.isFinite(existingOnlineCheckedAt) || existingOnlineCheckedAt <= 0 || (Date.now() / 1000) - existingOnlineCheckedAt <= 15);
    if (!hasExplicitOnlineResult && !hasRecentExplicitOnline) {
      const nonOnlineResults = results.filter(
        (result) => normalizeText(result?.id, '') !== 'online',
      );
      const anyNonError = nonOnlineResults.some(
        (result) => normalizeStatus(result?.status) !== 'error',
      );
      const allSshFailures =
        nonOnlineResults.length > 0 &&
        nonOnlineResults.every((result) => {
          if (normalizeStatus(result?.status) !== 'error') return false;
          const details = normalizeText(result?.details, '').toLowerCase();
          const value = normalizeText(result?.value, '').toLowerCase();
          return (
            details.includes('ssh') ||
            details.includes('connect') ||
            details.includes('auth') ||
            value === 'execution_error' ||
            value === 'command_error'
          );
        });

      if (anyNonError) {
        updates.online = {
          status: 'ok',
          value: 'reachable',
          details: 'Inferred online: at least one test command executed.',
        };
      } else if (allSshFailures) {
        updates.online = {
          status: 'error',
          value: 'unreachable',
          details: 'Inferred offline: test execution failed for SSH/connectivity reasons.',
        };
      }
    }

    if (!Object.keys(updates).length) return;

    mapRobots((item) =>
      robotId(item) === id
        ? {
            ...item,
            tests: updates,
            testDebug: debugUpdates,
          }
        : item,
    );
  }

  function setRunningButtonState(isRunning) {
    const runButton = $('#runRobotTests');
    const runSelectedButton = $('#runSelectedRobotTests');
    const buttonState = getManualRunButtonState();

    if (runButton) {
      if (isRunning) {
        setActionButtonLoading(runButton, true, {
          loadingLabel: 'Running tests...',
          idleLabel: 'Run tests',
        });
      } else {
        applyActionButton(runButton, {
          intent: 'run',
          label: 'Run tests',
          title: buttonState.detailTitle,
          ariaLabel: 'Run tests',
          disabled: buttonState.detailDisabled,
        });
      }
    }
    if (runSelectedButton) {
      if (isRunning) {
        setActionButtonLoading(runSelectedButton, true, {
          loadingLabel: 'Running selected tests...',
          idleLabel: getRunSelectedButtonIdleLabel(),
        });
      } else {
        applyActionButton(runSelectedButton, {
          intent: 'run',
          label: getRunSelectedButtonIdleLabel(),
          title: buttonState.selectedTitle,
          ariaLabel: getRunSelectedButtonIdleLabel(),
          disabled: buttonState.selectedDisabled,
        });
      }
    }
  }

  return {
    getConfiguredDefaultTestIds,
    getManualRunButtonState,
    getRobotActionAvailability,
    getRobotIdsForRun,
    setRunningButtonState,
    summarizeBlockedRobotActionTitle,
    updateRobotTestState,
  };
}
