export function createFixTestsRuntimePatchApi({
  $,
  detail,
  state,
  appendTerminalLine,
  stopCurrentJob,
  normalizeStatus,
  normalizeText,
  patchDashboardForChangedRobots,
  renderDashboard,
  getRobotById,
  robotId,
  nonBatteryTestEntries,
  statusFromScore,
  isRobotTesting,
  isRobotSearching,
  isRobotFixing,
  shouldUseCompactAutoSearchIndicator,
  getTestingCountdownText,
  getRobotBatteryState,
  issueSummary,
  getStatusChipTone,
  renderRobotJobQueueStrip,
  renderRobotStopCurrentJobButton,
  renderBatteryPill,
  buildLastFullTestPillLabel,
  syncModelViewerRotationForContainer,
  buildConnectionCornerIconMarkup,
  buildScanOverlayMarkup,
  invalidateCountdownNodeCache,
  buildTestPreviewTextForResult,
  statusChip,
  setActionButtonLoading,
  updateFleetOnlineRefreshStatus,
}) {
  function countNonOkResults(results) {
    return (Array.isArray(results) ? results : []).filter((result) => normalizeStatus(result?.status) !== 'ok').length;
  }

  function announceCompletedJobIfNeeded(robot) {
    const normalizedRobotId = robotId(robot);
    if (!normalizedRobotId) return;
    const completedJob = robot?.activity?.lastCompletedJob;
    if (!completedJob || typeof completedJob !== 'object') return;
    if (normalizeText(completedJob.source, 'manual') !== 'manual') return;

    if (!(state.announcedCompletedJobs instanceof Map)) {
      state.announcedCompletedJobs = new Map();
    }
    const announcementKey = [
      normalizeText(completedJob.id, ''),
      normalizeText(completedJob.status, ''),
      Number(completedJob.updatedAt || 0),
    ].join(':');
    if (!announcementKey.replaceAll(':', '')) return;
    if (state.announcedCompletedJobs.get(normalizedRobotId) === announcementKey) return;
    state.announcedCompletedJobs.set(normalizedRobotId, announcementKey);

    const robotLabel = normalizeText(robot?.name, normalizedRobotId);
    const jobLabel = normalizeText(completedJob.label, normalizeText(completedJob.kind, 'job'));
    const jobKind = normalizeText(completedJob.kind, 'job');
    const terminalStatus = normalizeText(completedJob.status, '');
    const metadata = completedJob.metadata && typeof completedJob.metadata === 'object' ? completedJob.metadata : {};
    const testResults = jobKind === 'fix'
      ? (metadata.testRun?.results || [])
      : (metadata.results || []);
    const failingResultCount = countNonOkResults(testResults);
    const totalResultCount = Array.isArray(testResults) ? testResults.length : 0;
    const errorMessage = normalizeText(metadata.error, '');

    if (terminalStatus === 'interrupted') {
      appendTerminalLine(`${jobLabel} was interrupted on ${robotLabel}.`, 'warn');
      return;
    }
    if (terminalStatus === 'failed') {
      appendTerminalLine(
        `${jobLabel} failed on ${robotLabel}${errorMessage ? `: ${errorMessage}` : '.'}`,
        'err',
      );
      return;
    }

    if (jobKind === 'fix') {
      if (failingResultCount > 0) {
        appendTerminalLine(
          `${jobLabel} finished on ${robotLabel}, but ${failingResultCount}/${totalResultCount} post-test(s) failed.`,
          'warn',
        );
        return;
      }
      appendTerminalLine(
        totalResultCount > 0
          ? `${jobLabel} succeeded on ${robotLabel} after ${totalResultCount} post-test(s).`
          : `${jobLabel} succeeded on ${robotLabel}.`,
        'ok',
      );
      return;
    }

    if (failingResultCount > 0) {
      appendTerminalLine(
        `${jobLabel} completed on ${robotLabel} with ${failingResultCount}/${totalResultCount} failing result(s).`,
        'warn',
      );
      return;
    }
    appendTerminalLine(
      totalResultCount > 0
        ? `${jobLabel} completed on ${robotLabel} with ${totalResultCount} passing result(s).`
        : `${jobLabel} completed on ${robotLabel}.`,
      'ok',
    );
  }

  function setModelContainerFaultClasses(modelContainer, robot, isOffline, includeDetailClass = false) {
    if (!modelContainer) return;
    const failureClasses = nonBatteryTestEntries(robot)
      .filter(([, test]) => normalizeStatus(test?.status) !== 'ok')
      .map(([id]) => `fault-${id}`)
      .join(' ');
    const baseClass = modelContainer.classList.contains('robot-model-slot') ? 'robot-model-slot' : 'robot-3d';
    const detailClass = includeDetailClass ? 'detail-model' : '';
    modelContainer.className = `${baseClass} ${detailClass} ${failureClasses} ${isOffline ? 'offline' : ''}`.trim();
  }

  function updateCardRuntimeContent(card, robot) {
    if (!card || !robot) return;
    const stateKey = statusFromScore(robot);
    const isCritical = stateKey === 'critical';
    const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
    const normalizedRobotId = robotId(robot);
    const isTesting = isRobotTesting(normalizedRobotId);
    const isSearching = isRobotSearching(normalizedRobotId);
    const isFixing = isRobotFixing(normalizedRobotId);
    const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
    const isCountingDown = isTesting || isSearching || isFixing;
    const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
    const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {};
    const issues = issueSummary(robot);
    const issueText = issues.join(', ') || 'No active errors';

    card.classList.remove('state-ok', 'state-warning', 'state-critical', 'state-offline');
    card.classList.add(isOffline ? 'state-offline' : `state-${stateKey}`);
    card.classList.toggle('error', isCritical);
    card.classList.toggle('offline', isOffline);
    card.classList.toggle('testing', isTesting || isSearching || isFixing);

    const statusChipNode = card.querySelector('[data-role="card-status-chip"]');
    if (statusChipNode) {
      const tone = getStatusChipTone(stateKey);
      statusChipNode.className = `status-chip ${tone.css}`;
      statusChipNode.textContent = tone.text;
    }

    const badgeStrip = card.querySelector('[data-role="badge-strip"]');
    if (badgeStrip) {
      badgeStrip.innerHTML = issues.map((item) => `<span class="error-badge">${item}</span>`).join('');
    }

    const issuesPill = card.querySelector('[data-role="issues-pill"]');
    if (issuesPill) {
      issuesPill.textContent = `Issue cluster: ${issueText}`;
    }

    const movementPill = card.querySelector('[data-role="movement-pill"]');
    if (movementPill) {
      movementPill.textContent = `Movement: ${robot?.tests?.movement?.value || 'n/a'}`;
    }
    const lastFullTestPill = card.querySelector('[data-role="last-full-test-pill"]');
    if (lastFullTestPill) {
      lastFullTestPill.textContent = buildLastFullTestPillLabel(robot);
    }
    const queueStripHost = card.querySelector('[data-role="card-job-queue-strip"]');
    if (queueStripHost) queueStripHost.innerHTML = '';
    const stopJobHost = card.querySelector('[data-role="card-stop-current-job"]');
    if (stopJobHost) stopJobHost.innerHTML = '';

    const summaryBatteryHost = card.querySelector('[data-role="summary-battery-pill"]');
    if (summaryBatteryHost) {
      summaryBatteryHost.innerHTML = renderBatteryPill({
        value: batteryState.value,
        status: batteryState.status,
        reason: batteryState.reason,
        size: 'default',
      });
    }

    const modelContainer = card.querySelector('.model-wrap .robot-model-slot, .model-wrap .robot-3d');
    setModelContainerFaultClasses(modelContainer, robot, isOffline);

    const modelWrap = card.querySelector('.model-wrap');
    syncModelViewerRotationForContainer(modelWrap, isOffline);
    if (modelWrap) {
      const existingConnectionIcon = modelWrap.querySelector('[data-role="connection-corner-icon"]');
      if (existingConnectionIcon) {
        existingConnectionIcon.remove();
      }
      modelWrap.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
    }

    if (modelWrap) {
      const existingCountdown = modelWrap.querySelector('.scan-countdown');
      if (isCountingDown) {
        if (existingCountdown) {
          existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
          existingCountdown.textContent = testCountdown;
        } else {
          modelWrap.insertAdjacentHTML(
            'beforeend',
            `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
          );
        }
      } else if (existingCountdown) {
        existingCountdown.remove();
      }

      const existingOverlay = modelWrap.querySelector('[data-role="activity-overlay"]');
      const nextOverlayMarkup = buildScanOverlayMarkup({
        isSearching,
        isTesting,
        isFixing,
        compactAutoSearch,
      });
      if (nextOverlayMarkup) {
        if (existingOverlay) {
          existingOverlay.remove();
        }
        modelWrap.insertAdjacentHTML('beforeend', nextOverlayMarkup);
      } else if (existingOverlay) {
        existingOverlay.remove();
      }
    }
    invalidateCountdownNodeCache();
  }

  function patchDetailRuntimeContent(robot) {
    if (!robot || !detail.classList.contains('active')) return;
    if (robotId(robot) !== state.detailRobotId) return;

    const statusBar = $('#detailStatusBar');
    const matrixHeaderBar = $('#detailMatrixHeaderBar');
    const testList = $('#testList');
    const modelHost = $('#detailModel');
    const stateKey = statusFromScore(robot);
    const batteryState = getRobotBatteryState(robot) || robot?.tests?.battery || {};
    const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
    const normalizedRobotId = robotId(robot);
    const isTesting = isRobotTesting(normalizedRobotId);
    const isSearching = isRobotSearching(normalizedRobotId);
    const isFixing = isRobotFixing(normalizedRobotId);
    const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
    const isCountingDown = isTesting || isSearching || isFixing;
    const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';

    if (statusBar) {
      statusBar.innerHTML = `
            ${renderBatteryPill({
              value: batteryState.value,
              status: batteryState.status,
              reason: batteryState.reason,
              size: 'small',
            })}
            `.trim().replace(/>\s+</g, '><');
      statusBar.insertAdjacentHTML(
        'beforeend',
        `
            <span data-role="detail-stop-current-job">${renderRobotStopCurrentJobButton(robot?.activity, normalizedRobotId)}</span>
            <span data-role="detail-job-queue-strip">${renderRobotJobQueueStrip(robot?.activity, { maxQueued: 6, includeEmpty: true })}</span>
        `.trim().replace(/>\s+</g, '><'),
      );
      const stopButton = statusBar.querySelector('[data-action="stop-current-job"]');
      if (stopButton) {
        stopButton.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetRobotId = normalizeText(stopButton.getAttribute('data-robot-id'), normalizedRobotId);
          const previousLabel = normalizeText(stopButton.textContent, 'Stop');
          stopButton.disabled = true;
          stopButton.textContent = 'Stopping...';
          try {
            await stopCurrentJob(targetRobotId);
            appendTerminalLine(`Stop requested for ${robot.name || targetRobotId}.`, 'warn');
          } catch (error) {
            stopButton.disabled = false;
            stopButton.textContent = previousLabel;
            appendTerminalLine(
              `Failed to stop job for ${robot.name || targetRobotId}: ${error instanceof Error ? error.message : String(error)}`,
              'err',
            );
          }
        });
      }
    }
    if (matrixHeaderBar) {
      matrixHeaderBar.innerHTML = `
            ${statusChip(stateKey, 'detail-status-chip')}
            <span class="pill" data-role="detail-last-full-test-pill">${buildLastFullTestPillLabel(robot, true)}</span>
          `.trim().replace(/>\s+</g, '><');
    }

    const modelContainer = modelHost?.querySelector('.robot-model-slot, .robot-3d') || null;
    setModelContainerFaultClasses(modelContainer, robot, isOffline, true);
    syncModelViewerRotationForContainer(modelHost, isOffline);

    if (modelHost) {
      const existingOverlay = modelHost.querySelector('[data-role="activity-overlay"]');
      const nextOverlayMarkup = buildScanOverlayMarkup({
        isSearching,
        isTesting,
        isFixing,
        compactAutoSearch,
      });
      if (nextOverlayMarkup) {
        if (existingOverlay) existingOverlay.remove();
        modelHost.insertAdjacentHTML('beforeend', nextOverlayMarkup);
      } else if (existingOverlay) {
        existingOverlay.remove();
      }

      const existingCountdown = modelHost.querySelector('.scan-countdown');
      if (isCountingDown) {
        if (existingCountdown) {
          existingCountdown.setAttribute('data-robot-id', normalizedRobotId);
          existingCountdown.textContent = testCountdown;
        } else {
          modelHost.insertAdjacentHTML(
            'beforeend',
            `<div class="scan-countdown" data-robot-id="${normalizedRobotId}">${testCountdown}</div>`,
          );
        }
      } else if (existingCountdown) {
        existingCountdown.remove();
      }

      const existingConnectionIcon = modelHost.querySelector('[data-role="connection-corner-icon"]');
      if (existingConnectionIcon) {
        existingConnectionIcon.remove();
      }
      modelHost.insertAdjacentHTML('afterbegin', buildConnectionCornerIconMarkup(isOffline, compactAutoSearch));
    }
    invalidateCountdownNodeCache();

    if (testList) {
      Object.entries(robot.tests || {}).forEach(([testId, result]) => {
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(testId)
            : testId.replace(/"/g, '\\"');
        const row = testList.querySelector(`.test-row[data-test-id="${escaped}"]`);
        if (!row) return;
        const status = normalizeStatus(result?.status);
        const statusPill = row.querySelector('[data-role="detail-test-status-pill"]');
        if (statusPill) {
          statusPill.textContent = status.toUpperCase();
        }
        const valueNode = row.querySelector('[data-role="detail-test-value"]');
        if (valueNode) {
          const previewText = buildTestPreviewTextForResult(testId, result);
          valueNode.textContent = previewText;
          valueNode.title = previewText;
        }
        const statusChipNode = row.querySelector('[data-role="detail-test-status-chip"]');
        if (statusChipNode) {
          statusChipNode.className = `status-chip ${status === 'ok' ? 'ok' : status === 'warning' ? 'warn' : 'err'}`;
          statusChipNode.textContent = status;
        }
      });
    }
    invalidateCountdownNodeCache();
  }

  function applyRuntimeRobotPatches(changedRobotIds) {
    const changedIds = Array.from(changedRobotIds || []).map((id) => robotId(id)).filter(Boolean);
    if (!changedIds.length) return;
    changedIds.forEach((id) => {
      const robot = getRobotById(id);
      if (robot) announceCompletedJobIfNeeded(robot);
    });

    const patched = Boolean(patchDashboardForChangedRobots(changedIds));
    if (!patched) {
      renderDashboard();
    }
    if (state.detailRobotId) {
      const activeRobot = getRobotById(state.detailRobotId);
      patchDetailRuntimeContent(activeRobot);
    }
  }

  function updateFleetOnlineSummary(onlineNames, offlineNames, skippedNames = []) {
    const summary = $('#fleetOnlineSummary');
    if (!summary) return;

    const total = state.robots.length;
    const skippedCount = Array.isArray(skippedNames) ? skippedNames.length : 0;
    summary.style.display = 'block';
    summary.innerHTML = `
          <div style="font-size: 0.92rem; margin-bottom: 0.35rem; opacity: 0.9;">
            Online check complete • ${onlineNames.length} reachable / ${Math.max(0, total - skippedCount)} checked
          </div>
          <div><strong>Reachable:</strong> ${onlineNames.length ? onlineNames.join(', ') : 'none'}</div>
          <div><strong>Unreachable:</strong> ${offlineNames.length ? offlineNames.join(', ') : 'none'}</div>
          <div><strong>Skipped (busy):</strong> ${skippedCount ? skippedNames.join(', ') : 'none'}</div>
        `.trim().replace(/>\s+</g, '><');
    state.onlineRefreshSummary = {
      onlineCount: onlineNames.length,
      offlineCount: offlineNames.length,
      skippedCount,
      totalCount: total,
    };
  }

  function setFleetOnlineButtonState(isRunning) {
    const runAllButton = $('#runFleetOnline');
    if (!runAllButton) return;
    const idleLabel = normalizeText(runAllButton.dataset.idleLabel, 'Refresh online');
    setActionButtonLoading(runAllButton, isRunning, {
      loadingLabel: 'Refreshing...',
      idleLabel,
    });
    if (!isRunning) {
      updateFleetOnlineRefreshStatus();
    }
  }

  return {
    setModelContainerFaultClasses,
    updateCardRuntimeContent,
    patchDetailRuntimeContent,
    applyRuntimeRobotPatches,
    updateFleetOnlineSummary,
    setFleetOnlineButtonState,
  };
}
