export function createFleetCardRenderingApi(deps) {
  const {
    CAN_USE_MODEL_VIEWER,
    MODEL_RESOLUTION_LOW,
    appendTerminalLine,
    buildConnectionCornerIconMarkup,
    buildLastFullTestPillLabel,
    buildScanOverlayMarkup,
    documentRef,
    getActiveUserAggregate,
    getDefinitionLabel,
    getGlobalAggregate,
    getRobotBatteryState,
    getRobotTypeConfig,
    getScopedTestEntries,
    getStatusChipTone,
    getTestingCountdownText,
    hydrateActionButtons,
    isRobotFixing,
    isRobotSearching,
    isRobotSelected,
    isRobotTesting,
    isUnknownResult,
    modelAssetResolver,
    normalizeStatus,
    normalizeText,
    normalizeTypeId,
    openDetail,
    registerLazyModelViewersInNode,
    renderBatteryPill,
    renderRobotJobQueueStrip,
    renderRobotStopCurrentJobButton,
    resolveRobotBaseModelUrl,
    robotId,
    setRobotSelection,
    shouldUseCompactAutoSearchIndicator,
    stopCurrentJob,
    syncModelViewerRotationForContainer,
  } = deps;

  function statusChip(status, role = '') {
    const roleAttr = role ? ` data-role="${role}"` : '';
    if (status === 'critical') return `<span class="status-chip err"${roleAttr}>Critical</span>`;
    if (status === 'warning') return `<span class="status-chip warn"${roleAttr}>Warning</span>`;
    if (status === 'unknown') return `<span class="status-chip neutral"${roleAttr}>Unknown</span>`;
    if (status === 'na') return `<span class="status-chip neutral"${roleAttr}>N/A</span>`;
    return `<span class="status-chip ok"${roleAttr}>Healthy</span>`;
  }

  function robotModelMarkup() {
    return `
      <div class="body-core"></div>
      <div class="camera-lens"></div>
      <div class="lidar"></div>
      <div class="wheel front-left"></div>
      <div class="wheel front-right"></div>
      <div class="wheel back-left"></div>
      <div class="wheel back-right"></div>
      <div class="battery"><div class="battery-fill"></div></div>
      <div class="proximity-sensor p1"></div>
      <div class="proximity-sensor p2"></div>
      <div class="proximity-sensor p3"></div>
      <div class="proximity-sensor p4"></div>
      <div class="skull"><span></span></div>`;
  }

  function buildRobotModelMarkup(
    robot,
    isOffline = false,
    preferredResolution = MODEL_RESOLUTION_LOW,
  ) {
    const typeConfig = getRobotTypeConfig(robot?.typeId || robot?.type);
    const baseModelUrl = resolveRobotBaseModelUrl(robot, typeConfig, preferredResolution);
    const modelUrl = modelAssetResolver.getInitialModelUrl(baseModelUrl, preferredResolution);
    if (modelUrl && CAN_USE_MODEL_VIEWER) {
      return `
        <div class="robot-viewer">
          <div class="robot-model-placeholder" data-role="robot-model-placeholder" aria-hidden="true">3D Model</div>
          <model-viewer
            data-lazy-src="${modelUrl}"
            data-model-resolution-base-url="${baseModelUrl}"
            data-model-resolution-quality="${preferredResolution}"
            alt="${robot.name || 'Robot model'}"
            disable-zoom
            camera-controls
            interaction-prompt="none">
          </model-viewer>
        </div>`;
    }

    return robotModelMarkup();
  }

  function buildRobotModelContainer(
    robot,
    failureClasses,
    isOffline = false,
    preferredResolution = MODEL_RESOLUTION_LOW,
  ) {
    const modelMarkup = buildRobotModelMarkup(robot, isOffline, preferredResolution);
    const is3D = modelMarkup.includes('model-viewer');
    return is3D
      ? `<div class="robot-model-slot ${failureClasses} ${isOffline ? 'offline' : ''}" data-role="robot-model-container">${modelMarkup}</div>`
      : `<div class="robot-3d ${failureClasses} ${isOffline ? 'offline' : ''}" data-role="robot-model-container">${modelMarkup}</div>`;
  }

  function issueSummary(robot, options = {}) {
    return getScopedTestEntries(robot, options)
      .filter((entry) => normalizeStatus(entry?.result?.status) !== 'ok' && !isUnknownResult(entry?.result))
      .slice(0, 3)
      .map((entry) =>
        getDefinitionLabel(Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [], entry.id),
      );
  }

  function groupRobotsByType(list = []) {
    const groupsByKey = new Map();
    list.forEach((robot) => {
      const typeId = normalizeText(robot?.typeId, normalizeText(robot?.type, ''));
      const label = normalizeText(robot?.type, normalizeText(robot?.typeId, 'Unassigned type'));
      const key = normalizeTypeId(typeId || label || 'unassigned-type');
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, {
          key,
          label,
          typeId,
          robots: [],
        });
      }
      groupsByKey.get(key).robots.push(robot);
    });
    return Array.from(groupsByKey.values()).sort((left, right) => {
      const byLabel = left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
      if (byLabel !== 0) return byLabel;
      return left.typeId.localeCompare(right.typeId, undefined, { sensitivity: 'base' });
    });
  }

  function buildRobotTypeDivider(group) {
    const divider = documentRef.createElement('div');
    divider.className = 'robot-type-divider';
    divider.setAttribute('data-robot-type-group', group.key);

    const label = documentRef.createElement('span');
    label.className = 'robot-type-divider-label';
    label.textContent = group.label;

    const count = documentRef.createElement('span');
    count.className = 'robot-type-divider-count';
    count.textContent = `${group.robots.length} robot${group.robots.length === 1 ? '' : 's'}`;

    divider.appendChild(label);
    divider.appendChild(count);
    return divider;
  }

  function syncRobotTypeDivider(divider, group) {
    if (!divider) return divider;
    divider.className = 'robot-type-divider';
    divider.setAttribute('data-robot-type-group', group.key);

    let label = divider.querySelector('.robot-type-divider-label');
    if (!label) {
      label = documentRef.createElement('span');
      label.className = 'robot-type-divider-label';
      divider.appendChild(label);
    }
    label.textContent = group.label;

    let count = divider.querySelector('.robot-type-divider-count');
    if (!count) {
      count = documentRef.createElement('span');
      count.className = 'robot-type-divider-count';
      divider.appendChild(count);
    }
    count.textContent = `${group.robots.length} robot${group.robots.length === 1 ? '' : 's'}`;
    return divider;
  }

  function describeRobotCard(robot) {
    const globalAggregate = getGlobalAggregate(robot);
    const activeUserAggregate = getActiveUserAggregate(robot);
    const stateKey = globalAggregate.state;
    const outerStateKey = activeUserAggregate.hasChecks ? activeUserAggregate.state : 'na';
    const innerStateKey = globalAggregate.state;
    const isCritical = stateKey === 'critical';
    const normalizedRobotId = robotId(robot);
    const isOffline = normalizeStatus(robot?.tests?.online?.status) !== 'ok';
    const selected = isRobotSelected(normalizedRobotId);
    const isTesting = isRobotTesting(normalizedRobotId);
    const isSearching = isRobotSearching(normalizedRobotId);
    const isFixing = isRobotFixing(normalizedRobotId);
    const compactAutoSearch = shouldUseCompactAutoSearchIndicator(normalizedRobotId, isOffline, isSearching);
    const isCountingDown = isTesting || isSearching || isFixing;
    const testCountdown = isCountingDown ? getTestingCountdownText(normalizedRobotId) : '';
    const stateClass = isOffline ? 'state-offline' : `state-${stateKey}`;
    const overlayMarkup = buildScanOverlayMarkup({
      isSearching,
      isTesting,
      isFixing,
      compactAutoSearch,
    });
    const issues = issueSummary(robot, { scope: 'global' });
    const badgeMarkup = issues.map((issue) => `<span class="error-badge">${issue}</span>`).join('');
    const failureClasses = globalAggregate.entries
      .filter((entry) => normalizeStatus(entry?.result?.status) !== 'ok' && !isUnknownResult(entry?.result))
      .map((entry) => `fault-${entry.id}`)
      .join(' ');
    const activeOwnerProfile = normalizeText(activeUserAggregate.activeOwner, '');
    return {
      stateKey,
      outerStateKey,
      innerStateKey,
      outerStateClass: `outer-state-${outerStateKey}`,
      outerVisibilityClass: activeOwnerProfile ? '' : 'outer-scope-hidden',
      innerStateClass: `inner-state-${innerStateKey}`,
      isCritical,
      normalizedRobotId,
      isOffline,
      selected,
      isTesting,
      isSearching,
      isFixing,
      compactAutoSearch,
      isCountingDown,
      testCountdown,
      stateClass,
      overlayMarkup,
      badgeMarkup,
      failureClasses,
      title: robot.name,
      subtitle: robot.type,
      issueSummaryText: issues.join(', ') || 'No active errors',
      batteryState: getRobotBatteryState(robot),
      lastFullTestLabel: buildLastFullTestPillLabel(robot),
    };
  }

  function syncStatusChipNode(node, stateKey) {
    if (!node) return;
    const tone = getStatusChipTone(stateKey);
    node.className = `status-chip ${tone.css}`;
    node.textContent = tone.text;
  }

  function syncSelectRobotButton(button, normalizedRobotId, selected) {
    if (!button) return;
    button.className = `button robot-select-btn ${selected ? 'selected' : ''}`.trim();
    button.type = 'button';
    button.setAttribute('data-action', 'select-robot');
    button.setAttribute('data-button-intent', 'selection');
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    const label = selected ? 'Deselect robot' : 'Select robot';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.textContent = selected ? '[x]' : '[ ]';
    if (normalizedRobotId) {
      button.setAttribute('data-robot-id', normalizedRobotId);
    }
  }

  function createNodeFromMarkup(markup) {
    if (!markup) return null;
    const template = documentRef.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  }

  function syncModelWrapContent(card, robot, descriptor) {
    if (!card) return;
    const modelWrap = card.querySelector('.model-wrap');
    if (!modelWrap) return;

    const badgeStrip = modelWrap.querySelector('[data-role="badge-strip"]');
    if (badgeStrip && badgeStrip.innerHTML !== descriptor.badgeMarkup) {
      badgeStrip.innerHTML = descriptor.badgeMarkup;
    }

    const desiredConnectionMarkup = buildConnectionCornerIconMarkup(
      descriptor.isOffline,
      descriptor.compactAutoSearch,
    );
    const existingConnectionIcon = modelWrap.querySelector('[data-role="connection-corner-icon"]');
    if (existingConnectionIcon) {
      const replacementConnectionIcon = createNodeFromMarkup(desiredConnectionMarkup);
      if (replacementConnectionIcon) {
        existingConnectionIcon.replaceWith(replacementConnectionIcon);
      }
    } else {
      const insertedConnectionIcon = createNodeFromMarkup(desiredConnectionMarkup);
      if (insertedConnectionIcon) {
        modelWrap.insertBefore(insertedConnectionIcon, modelWrap.firstChild);
      }
    }

    const existingCountdown = modelWrap.querySelector('.scan-countdown');
    if (descriptor.isCountingDown) {
      if (existingCountdown) {
        existingCountdown.className = 'scan-countdown';
        existingCountdown.setAttribute('data-robot-id', descriptor.normalizedRobotId);
        existingCountdown.textContent = descriptor.testCountdown;
      } else {
        const countdownNode = documentRef.createElement('div');
        countdownNode.className = 'scan-countdown';
        countdownNode.setAttribute('data-robot-id', descriptor.normalizedRobotId);
        countdownNode.textContent = descriptor.testCountdown;
        const modelContainer = modelWrap.querySelector('[data-role="robot-model-container"]');
        modelWrap.insertBefore(countdownNode, modelContainer || null);
      }
    } else if (existingCountdown) {
      existingCountdown.remove();
    }

    const existingOverlay = modelWrap.querySelector('[data-role="activity-overlay"]');
    if (descriptor.overlayMarkup) {
      const overlayNode = createNodeFromMarkup(descriptor.overlayMarkup);
      if (existingOverlay) {
        if (overlayNode) {
          existingOverlay.replaceWith(overlayNode);
        }
      } else if (overlayNode) {
        modelWrap.appendChild(overlayNode);
      }
    } else if (existingOverlay) {
      existingOverlay.remove();
    }

    const desiredModelContainer = createNodeFromMarkup(
      buildRobotModelContainer(robot, descriptor.failureClasses, descriptor.isOffline),
    );
    const existingModelContainer = modelWrap.querySelector('[data-role="robot-model-container"]');
    const existingUsesModelViewer = Boolean(existingModelContainer?.querySelector?.('model-viewer'));
    const desiredUsesModelViewer = Boolean(desiredModelContainer?.querySelector?.('model-viewer'));
    const existingBaseModelUrl = normalizeText(
      existingModelContainer?.querySelector?.('model-viewer')?.dataset?.modelResolutionBaseUrl,
      '',
    );
    const desiredBaseModelUrl = normalizeText(
      desiredModelContainer?.querySelector?.('model-viewer')?.dataset?.modelResolutionBaseUrl,
      '',
    );
    const shouldReplaceModelContainer =
      !existingModelContainer
      || !desiredModelContainer
      || existingUsesModelViewer !== desiredUsesModelViewer
      || existingBaseModelUrl !== desiredBaseModelUrl;
    if (shouldReplaceModelContainer) {
      if (existingModelContainer && desiredModelContainer) {
        existingModelContainer.replaceWith(desiredModelContainer);
      } else if (!existingModelContainer && desiredModelContainer) {
        modelWrap.appendChild(desiredModelContainer);
      }
    } else {
      existingModelContainer.className = desiredModelContainer.className;
      existingModelContainer.setAttribute('data-role', 'robot-model-container');
    }

    registerLazyModelViewersInNode(card);
    syncModelViewerRotationForContainer(card, descriptor.isOffline);
  }

  function syncRobotCard(card, robot) {
    if (!card) return card;
    const descriptor = describeRobotCard(robot);
    card.className = [
      'robot-card',
      descriptor.isCritical ? 'error' : '',
      descriptor.stateClass,
      descriptor.outerStateClass,
      descriptor.outerVisibilityClass,
      descriptor.innerStateClass,
      descriptor.selected ? 'selected' : '',
      descriptor.isTesting || descriptor.isSearching || descriptor.isFixing ? 'testing' : '',
      descriptor.isOffline ? 'offline' : '',
    ]
      .filter(Boolean)
      .join(' ');
    card.setAttribute('data-robot-id', descriptor.normalizedRobotId);

    const titleNode = card.querySelector('.robot-card-title');
    if (titleNode) {
      titleNode.textContent = descriptor.title;
    }

    const subtitleNode = card.querySelector('.robot-card-sub');
    if (subtitleNode) {
      subtitleNode.textContent = descriptor.subtitle;
    }

    syncStatusChipNode(card.querySelector('[data-role="card-status-chip"]'), descriptor.stateKey);
    syncSelectRobotButton(
      card.querySelector('[data-action="select-robot"]'),
      descriptor.normalizedRobotId,
      descriptor.selected,
    );
    syncModelWrapContent(card, robot, descriptor);

    const issuesPill = card.querySelector('[data-role="issues-pill"]');
    if (issuesPill) {
      issuesPill.textContent = `Issue cluster: ${descriptor.issueSummaryText}`;
    }

    const lastFullTestPill = card.querySelector('[data-role="last-full-test-pill"]');
    if (lastFullTestPill) {
      lastFullTestPill.textContent = descriptor.lastFullTestLabel;
    }

    const batteryHost = card.querySelector('[data-role="summary-battery-pill"]');
    if (batteryHost) {
      batteryHost.innerHTML = renderBatteryPill({
        value: descriptor.batteryState.value,
        status: descriptor.batteryState.status,
        reason: descriptor.batteryState.reason,
        size: 'default',
      });
    }

    hydrateActionButtons(card);
    return card;
  }

  function renderRobotTypeGroups(container, robots) {
    if (!container) return;
    const existingCardsById = new Map();
    const existingDividersByGroup = new Map();
    Array.from(container.children || []).forEach((child) => {
      if (!child) return;
      const childRobotId = normalizeText(child.getAttribute?.('data-robot-id'), '');
      if (childRobotId) {
        existingCardsById.set(childRobotId, child);
        return;
      }
      const childGroupKey = normalizeText(child.getAttribute?.('data-robot-type-group'), '');
      if (childGroupKey) {
        existingDividersByGroup.set(childGroupKey, child);
      }
    });

    const desiredNodes = [];
    groupRobotsByType(robots).forEach((group) => {
      const divider = syncRobotTypeDivider(
        existingDividersByGroup.get(group.key) || buildRobotTypeDivider(group),
        group,
      );
      desiredNodes.push(divider);
      group.robots.forEach((robot) => {
        const normalizedRobotId = robotId(robot);
        const existingCard = existingCardsById.get(normalizedRobotId);
        desiredNodes.push(existingCard ? syncRobotCard(existingCard, robot) : renderCard(robot));
      });
    });

    let cursor = container.firstChild;
    desiredNodes.forEach((node) => {
      if (node !== cursor) {
        container.insertBefore(node, cursor || null);
      }
      cursor = node.nextSibling;
    });

    while (cursor) {
      const next = cursor.nextSibling;
      container.removeChild(cursor);
      cursor = next;
    }
  }

  function renderCard(robot) {
    const descriptor = describeRobotCard(robot);
    const card = documentRef.createElement('article');
    card.className = [
      'robot-card',
      descriptor.isCritical ? 'error' : '',
      descriptor.stateClass,
      descriptor.outerStateClass,
      descriptor.outerVisibilityClass,
      descriptor.innerStateClass,
      descriptor.selected ? 'selected' : '',
      descriptor.isTesting || descriptor.isSearching || descriptor.isFixing ? 'testing' : '',
      descriptor.isOffline ? 'offline' : '',
    ]
      .filter(Boolean)
      .join(' ');
    card.setAttribute('data-robot-id', descriptor.normalizedRobotId);

    card.innerHTML = `
      <div class="robot-card-inner-border" aria-hidden="true"></div>
      <div class="glow-bar"></div>
      <div class="robot-card-header">
        <div>
          <h3 class="robot-card-title">${descriptor.title}</h3>
          <p class="robot-card-sub">${descriptor.subtitle}</p>
        </div>
        <div class="robot-card-header-actions">
          ${statusChip(descriptor.stateKey, 'card-status-chip')}
          <button
            class="button robot-select-btn ${descriptor.selected ? 'selected' : ''}"
            type="button"
            data-action="select-robot"
            data-button-intent="selection"
            aria-pressed="${descriptor.selected ? 'true' : 'false'}"
            aria-label="${descriptor.selected ? 'Deselect robot' : 'Select robot'}"
            title="${descriptor.selected ? 'Deselect robot' : 'Select robot'}">
            ${descriptor.selected ? '[x]' : '[ ]'}
          </button>
        </div>
      </div>
      <div class="model-wrap">
        <div class="badge-strip" data-role="badge-strip">${descriptor.badgeMarkup}</div>
        ${buildConnectionCornerIconMarkup(descriptor.isOffline, descriptor.compactAutoSearch)}
        ${descriptor.isCountingDown ? `<div class="scan-countdown" data-robot-id="${descriptor.normalizedRobotId}">${descriptor.testCountdown}</div>` : ''}
        ${buildRobotModelContainer(robot, descriptor.failureClasses, descriptor.isOffline)}
        ${descriptor.overlayMarkup}
      </div>
      <div class="summary">
        <span class="pill" data-role="issues-pill">Issue cluster: ${descriptor.issueSummaryText}</span>
        <span class="pill" data-role="last-full-test-pill">${descriptor.lastFullTestLabel}</span>
        <span data-role="summary-battery-pill">${renderBatteryPill({
          value: descriptor.batteryState.value,
          status: descriptor.batteryState.status,
          reason: descriptor.batteryState.reason,
          size: 'default',
        })}</span>
        <span data-role="card-stop-current-job">${renderRobotStopCurrentJobButton(robot?.activity, descriptor.normalizedRobotId)}</span>
      </div>`.trim().replace(/>\s+</g, '><');
    const queueStripMarkup = renderRobotJobQueueStrip(robot?.activity, { maxQueued: 2 });
    if (queueStripMarkup) {
      const queueNode = documentRef.createElement('div');
      queueNode.setAttribute('data-role', 'card-job-queue-strip');
      queueNode.innerHTML = queueStripMarkup;
      card.appendChild(queueNode);
    } else {
      const emptyQueueNode = documentRef.createElement('div');
      emptyQueueNode.setAttribute('data-role', 'card-job-queue-strip');
      card.appendChild(emptyQueueNode);
    }

    card.addEventListener('click', (event) => {
      const stopButton = event.target.closest('[data-action="stop-current-job"]');
      if (stopButton) {
        event.preventDefault();
        event.stopPropagation();
        stopCurrentJob(stopButton.getAttribute('data-robot-id') || descriptor.normalizedRobotId).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          appendTerminalLine(`Failed to stop job for ${descriptor.normalizedRobotId}: ${message}`, 'err');
        });
        return;
      }
      const selectButton = event.target.closest('[data-action="select-robot"]');
      if (selectButton) {
        event.preventDefault();
        event.stopPropagation();
        setRobotSelection(descriptor.normalizedRobotId, !isRobotSelected(descriptor.normalizedRobotId));
        return;
      }

      openDetail(robot.id);
    });

    hydrateActionButtons(card);
    registerLazyModelViewersInNode(card);
    syncModelViewerRotationForContainer(card, descriptor.isOffline);

    return card;
  }

  return {
    buildRobotTypeDivider,
    buildRobotModelContainer,
    buildRobotModelMarkup,
    describeRobotCard,
    groupRobotsByType,
    issueSummary,
    renderCard,
    renderRobotTypeGroups,
    robotModelMarkup,
    statusChip,
    syncRobotCard,
  };
}
