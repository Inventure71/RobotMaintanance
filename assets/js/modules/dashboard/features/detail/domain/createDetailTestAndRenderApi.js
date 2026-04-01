export function createDetailTestAndRenderApi(deps) {
  const {
    $,
    FIX_MODE_CONTEXT_DETAIL,
    POST_CONNECT_TEST_DELAY_MS,
    appendTerminalLine,
    buildConnectionCornerIconMarkup,
    buildLastFullTestPillLabel,
    buildRobotModelContainer,
    buildScanOverlayMarkup,
    buildTestPreviewTextForResult,
    closeTerminalSession,
    detailMatchesDefinitionFilters,
    detail,
    estimateTestCountdownMsFromBody,
    getConfiguredDefaultTestIds,
    getFleetParallelism,
    getOnlineCheckCountdownMs,
    getRobotById,
    getRobotIdsForRun,
    getRobotBatteryState,
    getScopedTestEntries,
    getTestIconPresentation,
    getTestingCountdownText,
    hasMixedRobotTypesForIds,
    hydrateActionButtons,
    invalidateCountdownNodeCache,
    isRobotFixing,
    isRobotSearching,
    isRobotTesting,
    mapRobots,
    nonBatteryTestEntries,
    normalizeStatus,
    normalizeText,
    openTestDebugModal,
    renderBatteryPill,
    renderDashboard,
    renderDefinitionOwnerInline,
    renderFixModeActionsForContext,
    renderRobotJobQueueStrip,
    renderRobotStopCurrentJobButton,
    robotId,
    runOneRobotOnlineCheck,
    runRobotTestsForRobot,
    runtime,
    setRobotSearching,
    setRobotTesting,
    setRunningButtonState,
    setTerminalActive,
    setTerminalInactive,
    shouldUseCompactAutoSearchIndicator,
    state,
    statusChip,
    statusFromScore,
    stopCurrentJob,
    syncFixModePanels,
    syncModelViewerRotationForContainer,
    terminal,
    updateOnlineCheckEstimateFromResults,
    window,
  } = deps;

  function renderDetail(robot) {
    const model = $('#detailModel');
    const testList = $('#testList');
    const titleBar = $('#detailTitleBar');
    const statusBar = $('#detailStatusBar');

    if (!robot) return;

    const stateKey = statusFromScore(robot);
    const normalizedRobotId = robotId(robot);
    const scopedEntries = getScopedTestEntries(robot, { scope: 'all' });
    const safeScopedEntries = Array.isArray(scopedEntries)
      ? scopedEntries
      : nonBatteryTestEntries(robot).map(([id, result]) => ({ id, result }));
    const errorCount = safeScopedEntries.filter((entry) => normalizeStatus(entry?.result?.status) !== 'ok').length;
    const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {};
    const isTesting = isRobotTesting(normalizedRobotId);
    const isSearching = isRobotSearching(normalizedRobotId);
    const isFixing = isRobotFixing(normalizedRobotId);
    const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
    const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
    const isCountingDown = isTesting || isSearching || isFixing;
    const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';

    if (titleBar) {
      titleBar.innerHTML = `
        <span class="detail-title-main">${robot.name}</span>
        <span class="detail-title-type">(${robot.type})</span>`.trim().replace(/>\s+</g, '><');
    }
    if (statusBar) {
      statusBar.innerHTML = `
        ${statusChip(stateKey, 'detail-status-chip')}
        ${renderBatteryPill({
          value: batteryState.value,
          status: batteryState.status,
          reason: batteryState.reason,
          size: 'small',
        })}
        <span class="pill" data-role="detail-last-full-test-pill">${buildLastFullTestPillLabel(robot, true)}</span>
        <span class="detail-issue-count">${errorCount} issue(s)</span>
        ${renderRobotStopCurrentJobButton(robot?.activity, normalizedRobotId)}
        ${renderRobotJobQueueStrip(robot?.activity, { maxQueued: 4, includeEmpty: true })}`.trim().replace(/>\s+</g, '><');
      const stopButton = statusBar.querySelector('[data-action="stop-current-job"]');
      if (stopButton) {
        stopButton.addEventListener('click', async (event) => {
          event.preventDefault();
          const targetRobotId = normalizeText(stopButton.getAttribute('data-robot-id'), normalizedRobotId);
          try {
            await stopCurrentJob(targetRobotId);
            appendTerminalLine(`Stop requested for ${robot.name || targetRobotId}.`, 'warn');
          } catch (error) {
            appendTerminalLine(
              `Failed to stop job for ${robot.name || targetRobotId}: ${error instanceof Error ? error.message : String(error)}`,
              'err',
            );
          }
        });
      }
    }

    const modelMarkup = buildRobotModelContainer(
      robot,
      `detail-model ${nonBatteryTestEntries(robot)
        .filter(([, test]) => test.status !== 'ok')
        .map(([id]) => `fault-${id}`)
        .join(' ')}`,
      isOffline,
      'low',
    );
    const scanningMarkup = buildScanOverlayMarkup({
      isSearching,
      isTesting,
      isFixing,
      compactAutoSearch,
    });
    const countdownMarkup = isCountingDown
      ? `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`
      : '';
    const connectionIconMarkup = buildConnectionCornerIconMarkup(isOffline, compactAutoSearch);
    model.innerHTML = `${modelMarkup}${scanningMarkup}${countdownMarkup}${connectionIconMarkup}`;
    invalidateCountdownNodeCache();
    syncModelViewerRotationForContainer(model, isOffline);

    testList.replaceChildren();
    const definitions = Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [];
    const filteredDefinitions = definitions.filter((def) => detailMatchesDefinitionFilters(def, robot?.tests?.[def?.id]));
    filteredDefinitions.forEach((def) => {
      const result = robot.tests[def.id] && typeof robot.tests[def.id] === 'object'
        ? robot.tests[def.id]
        : { status: 'warning', value: 'unknown', details: 'Not checked yet' };
      const icon = getTestIconPresentation(def.id, def.icon);
      const previewText = buildTestPreviewTextForResult(def.id, result);
      const ownerInline = renderDefinitionOwnerInline(def, result);
      const row = document.createElement('div');
      row.className = 'test-row';
      row.setAttribute('data-test-id', def.id);
      row.innerHTML = `
        <div class="test-info">
          <span class="test-title">
            <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
            <span class="test-title-label">${def.label}</span>
          </span>
          <span class="test-value" data-role="detail-test-value">${previewText}</span>
        </div>
          <div class="test-actions">
          ${ownerInline}
          <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${def.id}" title="Show detailed output">Info</button>
          <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
        </div>`.trim().replace(/>\s+</g, '><');
      const valueNode = row.querySelector('[data-role="detail-test-value"]');
      if (valueNode) {
        valueNode.title = previewText;
      }
      const infoButton = row.querySelector(`[data-test-id="${def.id}"]`);
      if (infoButton) {
        infoButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openTestDebugModal(robot, def.id);
        });
      }
      testList.appendChild(row);
    });

    if (definitions.length > 0) {
      Object.entries(robot.tests)
        .filter(([id]) => !definitions.find((test) => test.id === id))
        .filter(([id, result]) => detailMatchesDefinitionFilters({ id }, result))
        .forEach(([id, result]) => {
          const icon = getTestIconPresentation(id, '⚙️');
          const previewText = buildTestPreviewTextForResult(id, result);
          const ownerInline = renderDefinitionOwnerInline({}, result);
          const row = document.createElement('div');
          row.className = 'test-row';
          row.setAttribute('data-test-id', id);
          row.innerHTML = `
            <div class="test-info">
              <span class="test-title">
                <span class="${icon.className}" aria-hidden="true">${icon.value}</span>
                <span class="test-title-label">${id}</span>
              </span>
              <span class="test-value" data-role="detail-test-value">${previewText}</span>
            </div>
            <div class="test-actions">
            ${ownerInline}
            <button class="button test-info-btn" type="button" data-button-intent="utility" data-test-id="${id}" title="Show detailed output">Info</button>
            <span class="status-chip ${result.status === 'ok' ? 'ok' : result.status === 'warning' ? 'warn' : 'err'}" data-role="detail-test-status-chip">${result.status}</span>
          </div>`.trim().replace(/>\s+</g, '><');
          const valueNode = row.querySelector('[data-role="detail-test-value"]');
          if (valueNode) {
            valueNode.title = previewText;
          }
          const infoButton = row.querySelector(`[data-test-id="${id}"]`);
          if (infoButton) {
            infoButton.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              openTestDebugModal(robot, id);
            });
          }
          testList.appendChild(row);
        });
    }

    if (!testList.children.length) {
      const empty = document.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No tests match the selected ownership filter.';
      testList.appendChild(empty);
    }

    const detailId = robotId(robot);
    if (state.activeTerminalRobotId !== detailId) {
      closeTerminalSession();
      setTerminalInactive(robot);
    } else {
      setTerminalActive();
    }
    hydrateActionButtons(detail);
    setRunningButtonState(Boolean(state.isTestRunInProgress));
    if (state.fixModeOpen.detail) {
      renderFixModeActionsForContext(FIX_MODE_CONTEXT_DETAIL);
    }
  }

  async function runManualTests(options = {}) {
    if (state.isTestRunInProgress) {
      appendTerminalLine('Test run already in progress. Please wait before running again.', 'warn');
      return;
    }
    if (state.isAutoFixInProgress) {
      appendTerminalLine('Auto-fix run in progress. Wait for it to complete before running tests.', 'warn');
      return;
    }

    const runIds = getRobotIdsForRun(options);
    if (!runIds.length) {
      if (options.autoSelectOnlineWhenEmpty) {
        appendTerminalLine('No robots selected and none are currently online. Refresh online status or select robots manually.', 'warn');
      } else {
        appendTerminalLine('No robot selected for tests. Select at least one robot first.', 'warn');
      }
      return;
    }
    if (hasMixedRobotTypesForIds(runIds)) {
      appendTerminalLine('Selected robots must all share the same type before running tests.', 'warn');
      setRunningButtonState(false);
      return;
    }

    const actionableRunIds = [];
    runIds.forEach((targetId) => {
      const availability = runtime.getRobotActionAvailability(targetId, 'test');
      if (availability?.allowed) {
        actionableRunIds.push(targetId);
        return;
      }
      const robot = getRobotById(targetId);
      appendTerminalLine(
        `Skipping tests for ${robot?.name || targetId}: ${availability?.title || 'Robot is busy with another active operation.'}`,
        'warn',
      );
    });
    if (!actionableRunIds.length) {
      appendTerminalLine('No selected robots can run tests right now.', 'warn');
      setRunningButtonState(false);
      return;
    }

    state.isTestRunInProgress = true;
    setRunningButtonState(true);

    try {
      let successCount = 0;
      let failureCount = 0;
      const workerCount = Math.max(1, Math.min(getFleetParallelism(), actionableRunIds.length));
      if (terminal) {
        appendTerminalLine(
          `Running selected tests with parallelism ${workerCount} (${actionableRunIds.length} robot${actionableRunIds.length === 1 ? '' : 's'}).`,
          'warn',
        );
      }

      const queue = [...actionableRunIds];
      const processOneRobot = async (robotIdValue) => {
        const robot = getRobotById(robotIdValue);
        const normalizedRobotId = robotId(robotIdValue);
        if (!robot || !normalizedRobotId) {
          failureCount += 1;
          if (terminal) {
            appendTerminalLine(`Test run failed for ${robotIdValue}: Robot not found in current state`, 'err');
          }
          return;
        }

        const previousOnlineStatus = normalizeStatus(robot?.tests?.online?.status);
        if (terminal) {
          appendTerminalLine(
            `Running online precheck for ${robot.name || robotId(robot)}...`,
            'warn',
          );
        }

        const onlineCheckCountdownMs = getOnlineCheckCountdownMs();
        const searchCountdownMs = onlineCheckCountdownMs + POST_CONNECT_TEST_DELAY_MS;
        setRobotSearching(normalizedRobotId, true, searchCountdownMs);
        const onlineStatus = await runOneRobotOnlineCheck(robot);
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
          failureCount += 1;
          if (terminal) {
            appendTerminalLine(
              `Skipping tests for ${robotId(robot)}: robot is offline (${onlineStatus.details}).`,
              'err',
            );
          }
          setRobotSearching(normalizedRobotId, false);
          setRobotTesting(normalizedRobotId, false);
          return;
        }

        if (previousOnlineStatus !== 'ok') {
          if (terminal) {
            appendTerminalLine(
              `Connected to ${robot.name || robotId(robot)}. Waiting 5s before starting tests...`,
              'warn',
            );
          }
          await new Promise((resolve) => window.setTimeout(resolve, POST_CONNECT_TEST_DELAY_MS));
        }
        setRobotSearching(normalizedRobotId, false);

        const body = { ...options.body };
        const includeOnline = options.includeOnline !== false;
        const hasExplicitTestIds = Array.isArray(body.testIds) && body.testIds.length;
        const defaultTestIds = getConfiguredDefaultTestIds(robot, includeOnline);

        if (!hasExplicitTestIds && defaultTestIds.length) {
          body.testIds = defaultTestIds;
        }
        const countdownMs = estimateTestCountdownMsFromBody(body);

        if (terminal) {
          appendTerminalLine(`Running tests for ${robot.name}...`, 'warn');
        }

        setRobotTesting(normalizedRobotId, true, countdownMs);
        try {
          const result = await runRobotTestsForRobot(robotId(robot), body);
          if (terminal && Array.isArray(body.testIds) && body.testIds.length) {
            appendTerminalLine(`Requested test IDs: ${body.testIds.join(', ')}`, 'ok');
          }
          successCount += 1;
          const activeStatus = normalizeText(result?.activeJob?.status, '').toLowerCase();
          const queuedCount = Array.isArray(result?.queuedJobs) ? result.queuedJobs.length : 0;
          if (terminal) {
            if (activeStatus === 'running' || activeStatus === 'interrupting') {
              appendTerminalLine(`Started tests for ${robotId(robot)}.`, 'ok');
            } else {
              appendTerminalLine(`Queued tests for ${robotId(robot)} (${queuedCount} queued).`, 'ok');
            }
          }
          renderDashboard();

          const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
          if (activeRobot) {
            renderDetail(activeRobot);
          }
        } catch (error) {
          failureCount += 1;
          if (terminal) {
            appendTerminalLine(
              `Test run failed for ${robotId(robot)}: ${error instanceof Error ? error.message : String(error)}`,
              'err',
            );
          }
        } finally {
          setRobotTesting(normalizedRobotId, false);
        }
      };

      const workers = Array.from({ length: workerCount }, () => (async () => {
        while (queue.length) {
          const nextRobotId = queue.shift();
          if (!nextRobotId) break;
          await processOneRobot(nextRobotId);
        }
      })());
      await Promise.all(workers);

      if (terminal) {
        if (failureCount === 0) {
          appendTerminalLine(`Test run complete (${successCount}/${actionableRunIds.length} robots).`, 'ok');
        } else {
          appendTerminalLine(`Test run complete (${successCount} succeeded, ${failureCount} failed).`, 'warn');
        }
      }

      renderDashboard();

      const activeRobot = state.robots.find((item) => robotId(item) === state.detailRobotId);
      if (activeRobot) {
        renderDetail(activeRobot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Test run failed', error);
      appendTerminalLine(`Failed to run tests: ${message}`, 'err');
    } finally {
      state.isTestRunInProgress = false;
      setRunningButtonState(false);
      if (terminal) {
        appendTerminalLine('Ready.', 'ok');
      }
    }
  }

  return {
    renderDetail,
    runManualTests,
  };
}
