export function createFleetDerivedStateApi(deps) {
  const {
    cycleOnlineSortButton,
    DEFAULT_MODEL_QUALITY_BASE_PATH,
    DEFAULT_ROBOT_MODEL_URL,
    MODEL_RESOLUTION_HIGH,
    MODEL_RESOLUTION_LOW,
    ONLINE_SORT_BATTERY,
    ONLINE_SORT_LABELS,
    ONLINE_SORT_NAME,
    ONLINE_SORT_ORDER,
    ONLINE_SORT_STATUS,
    getRobotTypeConfig,
    modelAssetResolver,
    normalizeRobotActivity,
    normalizeRobotTests,
    normalizeStatus,
    normalizeTestDebugCollection,
    normalizeText,
    readRobotField,
    renderDashboard,
    state,
  } = deps;

function normalizeBatteryPercentForSort(rawValue) {
      const text = normalizeText(rawValue, '');
      if (!text) return Number.POSITIVE_INFINITY;
      const explicitPercent = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
      if (explicitPercent) {
        const parsed = Number.parseFloat(explicitPercent[1]);
        return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
      }
      const numeric = Number.parseFloat(text);
      return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
    }

function getRobotBatteryState(robot) {
      if (robot?.battery && typeof robot.battery === 'object') {
        return robot.battery;
      }
      return robot?.tests?.battery && typeof robot.tests.battery === 'object' ? robot.tests.battery : {};
    }

function nonBatteryTestEntries(robot) {
      return Object.entries(robot?.tests || {}).filter(([testId]) => normalizeText(testId, '').toLowerCase() !== 'battery');
    }

function normalizeTagList(raw) {
      const list = Array.isArray(raw) ? raw : [];
      const seen = new Set();
      const out = [];
      list.forEach((item) => {
        const normalized = normalizeText(item, '').toLowerCase();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      });
      return out;
    }

function normalizeOwnerTags(raw) {
      const tags = normalizeTagList(raw);
      return tags.length ? tags : ['global'];
    }

function normalizePlatformTags(raw) {
      return normalizeTagList(raw);
    }

function getActiveOwnerProfile() {
      return normalizeText(state?.filter?.activeOwnerProfile, '').toLowerCase();
    }

function getTestDefinitionForRobot(robot, testId) {
      const normalizedId = normalizeText(testId, '');
      const definitions = Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [];
      return definitions.find((definition) => normalizeText(definition?.id, '') === normalizedId) || null;
    }

function getDefinitionTagMeta(definition = {}, fallback = {}) {
      return {
        ownerTags: normalizeOwnerTags(definition?.ownerTags ?? fallback?.ownerTags),
        platformTags: normalizePlatformTags(definition?.platformTags ?? fallback?.platformTags),
      };
    }

function hasTagIntersection(candidateTags, selectedTags) {
      if (!Array.isArray(selectedTags) || !selectedTags.length) return true;
      const set = new Set(normalizeTagList(candidateTags));
      return selectedTags.some((tag) => set.has(normalizeText(tag, '').toLowerCase()));
    }

function matchesDefinitionFilters(definition = {}, fallback = {}) {
      const { ownerTags, platformTags } = getDefinitionTagMeta(definition, fallback);
      const selectedOwnerTags = normalizeTagList(state?.filter?.ownerTags);
      const selectedPlatformTags = normalizeTagList(state?.filter?.platformTags);
      const activeOwnerProfile = getActiveOwnerProfile();
      const effectiveOwnerSelection = selectedOwnerTags.length
        ? selectedOwnerTags
        : (activeOwnerProfile ? [activeOwnerProfile] : ['global']);
      const ownerSelection = Array.from(new Set([...effectiveOwnerSelection, 'global']));
      const matchesOwner = hasTagIntersection(ownerTags, ownerSelection);
      const matchesPlatform = hasTagIntersection(platformTags, selectedPlatformTags);
      return matchesOwner && matchesPlatform;
    }

function isUnknownResult(testResult) {
      const source = normalizeText(testResult?.source, '');
      const checkedAt = Number(testResult?.checkedAt);
      const hasTimestamp = Number.isFinite(checkedAt) && checkedAt > 0;
      const value = normalizeText(testResult?.value, '').toLowerCase();
      const details = normalizeText(testResult?.details, '').toLowerCase();
      const isDefaultDetail =
        !details
        || details === 'not checked yet'
        || details === 'awaiting check result'
        || details === 'backend populated test';
      if (!value) return true;
      if (value === 'unknown' && (isDefaultDetail || (!hasTimestamp && !source))) return true;
      if (isDefaultDetail && (!hasTimestamp || !source)) return true;
      return false;
    }

function getScopedTestEntries(robot, options = {}) {
      const scope = normalizeText(options.scope, 'all');
      const activeOwner = normalizeText(options.activeOwner, getActiveOwnerProfile()).toLowerCase();
      const entries = nonBatteryTestEntries(robot).map(([testId, testResult]) => {
        const definition = getTestDefinitionForRobot(robot, testId);
        const tags = getDefinitionTagMeta(definition, testResult);
        return {
          id: normalizeText(testId, ''),
          result: testResult && typeof testResult === 'object' ? testResult : {},
          definition,
          ownerTags: tags.ownerTags,
          platformTags: tags.platformTags,
        };
      });

      return entries.filter((entry) => {
        if (scope === 'global' && !entry.ownerTags.includes('global')) return false;
        if (scope === 'active-user') {
          if (!activeOwner) return false;
          if (!entry.ownerTags.includes(activeOwner)) return false;
        }
        return matchesDefinitionFilters(
          {
            ownerTags: entry.ownerTags,
            platformTags: entry.platformTags,
          },
          entry.result,
        );
      });
    }

function computeAggregateState(entries) {
      const scopedEntries = Array.isArray(entries) ? entries : [];
      if (!scopedEntries.length) {
        return {
          state: 'unknown',
          hasChecks: false,
          passCount: 0,
          failCount: 0,
          unknownCount: 0,
        };
      }

      const passCount = scopedEntries.reduce(
        (total, entry) => (normalizeStatus(entry?.result?.status) === 'ok' ? total + 1 : total),
        0,
      );
      const failCount = scopedEntries.length - passCount;
      const unknownCount = scopedEntries.reduce(
        (total, entry) => (isUnknownResult(entry?.result) ? total + 1 : total),
        0,
      );
      if (unknownCount > 0) {
        return {
          state: 'unknown',
          hasChecks: true,
          passCount,
          failCount,
          unknownCount,
        };
      }
      if (passCount === 0 && failCount > 0) {
        return {
          state: 'critical',
          hasChecks: true,
          passCount,
          failCount,
          unknownCount,
        };
      }
      if (passCount > 0 && failCount > 0) {
        return {
          state: 'warning',
          hasChecks: true,
          passCount,
          failCount,
          unknownCount,
        };
      }
      return {
        state: 'ok',
        hasChecks: true,
        passCount,
        failCount,
        unknownCount,
      };
    }

function getRobotAggregate(robot, options = {}) {
      const scopedEntries = getScopedTestEntries(robot, options);
      const aggregate = computeAggregateState(scopedEntries);
      return {
        ...aggregate,
        entries: scopedEntries,
      };
    }

function getGlobalAggregate(robot) {
      return getRobotAggregate(robot, { scope: 'global' });
    }

function getActiveUserAggregate(robot) {
      const activeOwner = getActiveOwnerProfile();
      const aggregate = getRobotAggregate(robot, {
        scope: 'active-user',
        activeOwner,
      });
      return {
        ...aggregate,
        activeOwner,
        hasChecks: aggregate.hasChecks && !!activeOwner,
      };
    }

function statusFromScore(robot) {
      return getGlobalAggregate(robot).state;
    }

function statusSortRank(robot) {
      const status = statusFromScore(robot);
      if (status === 'critical') return 0;
      if (status === 'warning') return 1;
      if (status === 'unknown') return 2;
      return 3;
    }

function onlineRobotComparator(a, b) {
      const mode = normalizeText(state.onlineSortMode, ONLINE_SORT_BATTERY);
      if (mode === ONLINE_SORT_NAME) {
        return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
      }
      if (mode === ONLINE_SORT_STATUS) {
        const byStatus = statusSortRank(a) - statusSortRank(b);
        if (byStatus !== 0) return byStatus;
        return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
      }
      const aBattery = normalizeBatteryPercentForSort(getRobotBatteryState(a)?.value);
      const bBattery = normalizeBatteryPercentForSort(getRobotBatteryState(b)?.value);
      if (aBattery !== bBattery) return aBattery - bBattery;
      return normalizeText(a?.name, '').localeCompare(normalizeText(b?.name, ''), undefined, { sensitivity: 'base' });
    }

function sortOnlineRobots(robots) {
      const list = Array.isArray(robots) ? [...robots] : [];
      list.sort(onlineRobotComparator);
      return list;
    }

function syncOnlineSortButton() {
      if (!cycleOnlineSortButton) return;
      const mode = ONLINE_SORT_ORDER.includes(state.onlineSortMode) ? state.onlineSortMode : ONLINE_SORT_BATTERY;
      cycleOnlineSortButton.textContent = `Sort robots: ${ONLINE_SORT_LABELS[mode] || ONLINE_SORT_LABELS[ONLINE_SORT_BATTERY]}`;
    }

function cycleOnlineSortMode() {
      const currentIndex = ONLINE_SORT_ORDER.indexOf(state.onlineSortMode);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ONLINE_SORT_ORDER.length : 0;
      state.onlineSortMode = ONLINE_SORT_ORDER[nextIndex];
      syncOnlineSortButton();
      renderDashboard();
    }

function normalizeRobotModelBaseUrl(candidate) {
      if (typeof candidate === 'string' && candidate.trim()) {
        const clean = candidate.trim().replace(/^\.\//, '');
        const hasModelExtension = /\.(gltf|glb)(?:\?|#|$)/i.test(clean);
        if (hasModelExtension) {
          return clean;
        }
      }
      return DEFAULT_ROBOT_MODEL_URL;
    }

function normalizeModelConfig(model) {
      if (!model || typeof model !== 'object') return null;
      const file_name = normalizeText(model.file_name, '').replace(/^\.?\//, '');
      const path_to_quality_folders = normalizeText(model.path_to_quality_folders, '')
        .replace(/^\.?\//, '')
        .replace(/\/+$/, '');
      const asset_version = normalizeText(model.asset_version, '');
      const availableQualitiesRaw = Array.isArray(model.available_qualities)
        ? model.available_qualities
        : Array.isArray(model.availableQualities)
          ? model.availableQualities
          : null;
      const available_qualities = Array.isArray(availableQualitiesRaw)
        ? availableQualitiesRaw
            .map((quality) => normalizeText(quality, '').toLowerCase())
            .filter(
              (quality, index, list) =>
                (quality === MODEL_RESOLUTION_LOW || quality === MODEL_RESOLUTION_HIGH)
                && list.indexOf(quality) === index,
            )
        : null;
      if (!file_name && !path_to_quality_folders) return null;
      return {
        file_name,
        path_to_quality_folders,
        ...(asset_version ? { asset_version } : {}),
        ...(available_qualities !== null ? { available_qualities } : {}),
      };
    }

function appendModelVersionQuery(baseUrl, assetVersion) {
      const normalizedBaseUrl = normalizeRobotModelBaseUrl(baseUrl);
      const version = normalizeText(assetVersion, '');
      if (!normalizedBaseUrl || !version) return normalizedBaseUrl;
      const separator = normalizedBaseUrl.includes('?') ? '&' : '?';
      return `${normalizedBaseUrl}${separator}mv=${encodeURIComponent(version)}`;
    }

function modelSupportsQuality(model, preferredResolution) {
      if (!model) return false;
      if (!Array.isArray(model.available_qualities)) return true;
      return model.available_qualities.includes(preferredResolution);
    }

function pickModelConfigForQuality(robotModel, typeModel, preferredResolution) {
      if (modelSupportsQuality(robotModel, preferredResolution)) return robotModel;
      if (modelSupportsQuality(typeModel, preferredResolution)) return typeModel;
      return robotModel || typeModel || null;
    }

function resolveRobotBaseModelUrl(robot, typeConfig, preferredResolution = MODEL_RESOLUTION_LOW) {
      const robotModel = normalizeModelConfig(robot?.model);
      const typeModel = normalizeModelConfig(typeConfig?.model);
      const effectiveModel = pickModelConfigForQuality(robotModel, typeModel, preferredResolution);
      const fileName = normalizeText(effectiveModel?.file_name, '');
      if (!fileName) return DEFAULT_ROBOT_MODEL_URL;
      const basePath =
        normalizeText(effectiveModel?.path_to_quality_folders, '') ||
        DEFAULT_MODEL_QUALITY_BASE_PATH;
      return appendModelVersionQuery(`${basePath}/${fileName}`, effectiveModel?.asset_version);
    }

function resolveRobotModelUrl(candidate, preferredResolution = MODEL_RESOLUTION_LOW) {
      const baseUrl = normalizeRobotModelBaseUrl(candidate);
      return modelAssetResolver.getInitialModelUrl(baseUrl, preferredResolution);
    }

    function normalizeRobotData(raw) {
      const entries = Array.isArray(raw) ? raw : [];
      return entries.map((bot) => {
        const botType = bot?.type || 'unknown';
        const typeConfig = getRobotTypeConfig(botType);
        const { tests, definitions } = normalizeRobotTests(bot?.tests, botType);
        const modelUrl = resolveRobotBaseModelUrl(bot, typeConfig, MODEL_RESOLUTION_LOW);
        const robotModel = normalizeModelConfig(bot?.model);
        const activity = normalizeRobotActivity(bot?.activity);
        const battery =
          bot?.battery && typeof bot.battery === 'object'
            ? { ...bot.battery }
            : bot?.tests?.battery && typeof bot.tests.battery === 'object'
              ? { ...bot.tests.battery }
              : null;
        return {
          id: bot?.id || `robot-${Math.random().toString(16).slice(2, 7)}`,
          name: normalizeText(bot?.name, `robot-${Math.random().toString(16).slice(2, 7)}`),
          type: typeConfig?.label || botType || 'Unknown Type',
          typeId: botType,
          ip: normalizeText(bot?.ip, ''),
          username: normalizeText(readRobotField(bot, 'username'), ''),
          password: normalizeText(readRobotField(bot, 'password'), ''),
          modelUrl,
          model: robotModel,
          tests,
          battery,
          testDefinitions: definitions,
          topics: typeConfig?.topics || [],
          autoFixes: typeConfig?.autoFixes || [],
          activity,
          testDebug: normalizeTestDebugCollection(bot?.testDebug),
        };
      });
    }

  return {
    normalizeBatteryPercentForSort,
    getRobotBatteryState,
    nonBatteryTestEntries,
    normalizeTagList,
    normalizeOwnerTags,
    normalizePlatformTags,
    getActiveOwnerProfile,
    getTestDefinitionForRobot,
    getDefinitionTagMeta,
    hasTagIntersection,
    matchesDefinitionFilters,
    isUnknownResult,
    getScopedTestEntries,
    computeAggregateState,
    getRobotAggregate,
    getGlobalAggregate,
    getActiveUserAggregate,
    statusFromScore,
    statusSortRank,
    onlineRobotComparator,
    sortOnlineRobots,
    syncOnlineSortButton,
    cycleOnlineSortMode,
    normalizeRobotModelBaseUrl,
    normalizeModelConfig,
    appendModelVersionQuery,
    modelSupportsQuality,
    pickModelConfigForQuality,
    resolveRobotBaseModelUrl,
    resolveRobotModelUrl,
    normalizeRobotData,
  };
}
