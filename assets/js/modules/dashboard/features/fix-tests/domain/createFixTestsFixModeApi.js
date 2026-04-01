export function createFixTestsFixModeApi(deps) {
  const {
    FIX_MODE_CONTEXT_DETAIL,
    applyActionButton,
    dashboard,
    dashboardFixModeActions,
    dashboardFixModePanel,
    dashboardFixModeStatus,
    dashboardFixModeSummary,
    detail,
    detailFixModeActions,
    detailFixModePanel,
    detailFixModeStatus,
    detailFixModeSummary,
    getAutoFixesForType,
    getDefinitionTagMeta,
    getRobotById,
    hasMixedRobotTypesForIds,
    matchesDefinitionFilters,
    normalizeOwnerTags,
    normalizePlatformTags,
    normalizeText,
    normalizeTypeId,
    robotId,
    state,
    toggleDashboardFixModeButton,
    toggleDetailFixModeButton,
  } = deps;

  function getFixModeElements(context) {
    if (context === FIX_MODE_CONTEXT_DETAIL) {
      return {
        panel: detailFixModePanel,
        summary: detailFixModeSummary,
        actions: detailFixModeActions,
        status: detailFixModeStatus,
        toggleButton: toggleDetailFixModeButton,
        active: detail.classList.contains('active'),
      };
    }
    return {
      panel: dashboardFixModePanel,
      summary: dashboardFixModeSummary,
      actions: dashboardFixModeActions,
      status: dashboardFixModeStatus,
      toggleButton: toggleDashboardFixModeButton,
      active: dashboard.classList.contains('active'),
    };
  }

  function setFixModeStatus(context, message = '', tone = '') {
    const elements = getFixModeElements(context);
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.classList.remove('ok', 'warn', 'error');
    if (tone) {
      elements.status.classList.add(tone);
    }
  }

  function getDashboardFixCandidates() {
    const selectedRobots = state.robots.filter((robot) => state.selectedRobotIds.has(robotId(robot)));
    if (hasMixedRobotTypesForIds(selectedRobots.map((robot) => robotId(robot)))) {
      return {
        selectedCount: selectedRobots.length,
        candidates: [],
        mixedTypes: true,
      };
    }
    const byKey = new Map();
    selectedRobots.forEach((robot) => {
      const typeLabel = normalizeText(robot.type, normalizeText(robot.typeId, 'Unknown type'));
      const typeKey = normalizeTypeId(robot.typeId || typeLabel || '');
      getAutoFixesForType(robot.typeId).forEach((fix) => {
        if (!fixMatchesDefinitionFilters(fix, fix)) return;
        const tagMeta = getDefinitionTagMeta(fix, fix);
        const key = `${typeKey}:${fix.id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            key,
            id: fix.id,
            label: fix.label,
            description: fix.description,
            ownerTags: getFixOwnerTags(tagMeta?.ownerTags),
            platformTags: getFixPlatformTags(tagMeta?.platformTags),
            typeLabel,
            robotIds: [],
          });
        }
        byKey.get(key).robotIds.push(robotId(robot));
      });
    });
    return {
      selectedCount: selectedRobots.length,
      candidates: Array.from(byKey.values()).sort((a, b) => {
        const byLabel = a.label.localeCompare(b.label);
        if (byLabel !== 0) return byLabel;
        return a.typeLabel.localeCompare(b.typeLabel);
      }),
      mixedTypes: false,
    };
  }

  function getDetailFixCandidates() {
    const robot = getRobotById(state.detailRobotId);
    if (!robot) {
      return { robot: null, candidates: [] };
    }
    const candidates = getAutoFixesForType(robot.typeId)
      .filter((fix) => fixMatchesDefinitionFilters(fix, fix))
      .map((fix) => {
        const tagMeta = getDefinitionTagMeta(fix, fix);
        return {
          key: `${normalizeTypeId(robot.typeId)}:${fix.id}`,
          id: fix.id,
          label: fix.label,
          description: fix.description,
          ownerTags: getFixOwnerTags(tagMeta?.ownerTags),
          platformTags: getFixPlatformTags(tagMeta?.platformTags),
          typeLabel: robot.type,
          robotIds: [robotId(robot)],
        };
      });
    return { robot, candidates };
  }

  function syncFixModeToggleButton(context) {
    const elements = getFixModeElements(context);
    const open = !!state.fixModeOpen[context];
    if (!elements.toggleButton) return;
    const label = open ? 'Exit fix mode' : 'Enter fix mode';
    applyActionButton(elements.toggleButton, {
      intent: 'fix',
      pressed: open,
      disabled: state.isAutoFixInProgress,
      label,
    });
    elements.toggleButton.setAttribute('aria-pressed', open ? 'true' : 'false');
  }

  function buildFixButtonLabel(candidate, includeTypeLabel = false) {
    const countLabel = candidate.robotIds.length > 1 ? ` (${candidate.robotIds.length})` : '';
    if (!includeTypeLabel) {
      return `${candidate.label}${countLabel}`;
    }
    return `${candidate.label} • ${candidate.typeLabel}${countLabel}`;
  }

  function fixMatchesDefinitionFilters(definition, fallback = {}) {
    const match = matchesDefinitionFilters(definition, fallback);
    if (typeof match === 'boolean') return match;
    return true;
  }

  function getFixOwnerTags(rawTags) {
    const normalized = normalizeOwnerTags(rawTags);
    if (Array.isArray(normalized) && normalized.length) return normalized;
    return ['global'];
  }

  function getFixPlatformTags(rawTags) {
    const normalized = normalizePlatformTags(rawTags);
    if (Array.isArray(normalized)) return normalized;
    return [];
  }

  function buildFixCandidateTagChips(candidate) {
    const chips = [];
    getFixOwnerTags(candidate?.ownerTags).forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip owner';
      chip.textContent = `owner:${tag}`;
      chips.push(chip);
    });
    return chips;
  }

  function buildFixCandidateActionNode(candidate, actionButton) {
    const entry = document.createElement('div');
    entry.className = 'fix-candidate-entry';
    entry.appendChild(actionButton);
    const chips = buildFixCandidateTagChips(candidate);
    if (chips.length) {
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'fix-candidate-tag-chips';
      chips.forEach((chip) => chipsWrap.appendChild(chip));
      entry.appendChild(chipsWrap);
    }
    return entry;
  }

  return {
    buildFixButtonLabel,
    buildFixCandidateActionNode,
    fixMatchesDefinitionFilters,
    getDashboardFixCandidates,
    getDetailFixCandidates,
    getFixModeElements,
    getFixOwnerTags,
    getFixPlatformTags,
    setFixModeStatus,
    syncFixModeToggleButton,
  };
}
