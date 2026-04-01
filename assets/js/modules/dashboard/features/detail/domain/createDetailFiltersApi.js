export function createDetailFiltersApi(deps) {
  const {
    documentRef,
    filterActiveOwner,
    filterError,
    filterOwnerTags,
    filterPlatformTags,
    filterType,
    normalizeText,
    state,
  } = deps;

  function getTagList(value) {
    if (Array.isArray(value)) {
      return value.map((tag) => normalizeText(tag, '').toLowerCase()).filter(Boolean);
    }
    return [];
  }

  function getOwnerTags(value) {
    const tags = getTagList(value);
    if (!tags.includes('global')) {
      tags.unshift('global');
    }
    return Array.from(new Set(tags));
  }

  function getPlatformTags(value) {
    return Array.from(new Set(getTagList(value)));
  }

  function detailMatchesDefinitionFilters(definition, fallback = {}) {
    const ownerTags = getOwnerTags(definition?.ownerTags ?? fallback.ownerTags);
    const platformTags = getPlatformTags(definition?.platformTags ?? fallback.platformTags);
    const requiredOwnerTags = getTagList(state?.filter?.ownerTags);
    const requiredPlatformTags = getTagList(state?.filter?.platformTags);
    const ownerMatch = !requiredOwnerTags.length || requiredOwnerTags.every((tag) => ownerTags.includes(tag));
    const platformMatch = !requiredPlatformTags.length || requiredPlatformTags.every((tag) => platformTags.includes(tag));
    return ownerMatch && platformMatch;
  }

  function populateFilters() {
    if (!filterType || !filterError) return;
    const typeOptions = Array.from(new Set(state.robots.map((robot) => robot.type)));
    const knownTestDefinitions = new Map();
    const ownerTagUniverse = new Set();
    const platformTagUniverse = new Set();
    const ownerProfiles = new Set();
    state.robots.forEach((robot) => {
      const definitions = Array.isArray(robot?.testDefinitions) ? robot.testDefinitions : [];
      definitions.forEach((test) => {
        if (!knownTestDefinitions.has(test.id)) {
          knownTestDefinitions.set(test.id, test);
        }
        getOwnerTags(test?.ownerTags).forEach((tag) => {
          ownerTagUniverse.add(tag);
          if (tag !== 'global') ownerProfiles.add(tag);
        });
        getPlatformTags(test?.platformTags).forEach((tag) => platformTagUniverse.add(tag));
      });
    });

    const summaryTests = Array.isArray(state?.definitionsSummary?.tests) ? state.definitionsSummary.tests : [];
    summaryTests.forEach((test) => {
      getOwnerTags(test?.ownerTags).forEach((tag) => {
        ownerTagUniverse.add(tag);
        if (tag !== 'global') ownerProfiles.add(tag);
      });
      getPlatformTags(test?.platformTags).forEach((tag) => platformTagUniverse.add(tag));
    });
    const summaryFixes = Array.isArray(state?.definitionsSummary?.fixes) ? state.definitionsSummary.fixes : [];
    summaryFixes.forEach((fix) => {
      getOwnerTags(fix?.ownerTags).forEach((tag) => {
        ownerTagUniverse.add(tag);
        if (tag !== 'global') ownerProfiles.add(tag);
      });
      getPlatformTags(fix?.platformTags).forEach((tag) => platformTagUniverse.add(tag));
    });

    const previousType = normalizeText(state?.filter?.type, 'all');
    const previousError = normalizeText(state?.filter?.error, 'all');
    const previousOwnerTags = getTagList(state?.filter?.ownerTags);
    const previousPlatformTags = getTagList(state?.filter?.platformTags);
    const previousActiveOwner = normalizeText(state?.filter?.activeOwnerProfile, '').toLowerCase();

    filterType.innerHTML = '<option value="all">All Types</option>';
    typeOptions.forEach((type) => {
      const option = documentRef.createElement('option');
      option.value = type;
      option.textContent = type;
      filterType.appendChild(option);
    });

    filterError.innerHTML = `
      <option value="all">All Robots</option>
      <option value="healthy">Healthy</option>
      <option value="warning">Warnings</option>
      <option value="critical">Critical</option>
      <option value="unknown">Unknown</option>
      <option value="error">Any error</option>
    `.trim().replace(/>\s+</g, '><');

    Array.from(knownTestDefinitions.values()).forEach((test) => {
      const option = documentRef.createElement('option');
      option.value = test.id;
      option.textContent = `${test.label} errors`;
      filterError.appendChild(option);
    });

    if (Array.from(filterType.options || []).some((option) => normalizeText(option?.value, '') === previousType)) {
      filterType.value = previousType;
    } else {
      filterType.value = 'all';
    }
    if (Array.from(filterError.options || []).some((option) => normalizeText(option?.value, '') === previousError)) {
      filterError.value = previousError;
    } else {
      filterError.value = 'all';
    }

    if (filterOwnerTags) {
      const ownerOptions = Array.from(ownerTagUniverse).sort((left, right) => left.localeCompare(right));
      filterOwnerTags.innerHTML = '';
      ownerOptions.forEach((tag) => {
        const option = documentRef.createElement('option');
        option.value = tag;
        option.textContent = tag;
        option.selected = previousOwnerTags.includes(tag);
        filterOwnerTags.appendChild(option);
      });
    }

    if (filterPlatformTags) {
      const platformOptions = Array.from(platformTagUniverse).sort((left, right) => left.localeCompare(right));
      filterPlatformTags.innerHTML = '';
      platformOptions.forEach((tag) => {
        const option = documentRef.createElement('option');
        option.value = tag;
        option.textContent = tag;
        option.selected = previousPlatformTags.includes(tag);
        filterPlatformTags.appendChild(option);
      });
    }

    if (filterActiveOwner) {
      const activeOwnerOptions = Array.from(ownerProfiles).sort((left, right) => left.localeCompare(right));
      filterActiveOwner.innerHTML = '<option value="">Global</option>';
      activeOwnerOptions.forEach((tag) => {
        const option = documentRef.createElement('option');
        option.value = tag;
        option.textContent = tag;
        filterActiveOwner.appendChild(option);
      });
      filterActiveOwner.value = activeOwnerOptions.includes(previousActiveOwner) ? previousActiveOwner : '';
    }

    const filterState = state.filter && typeof state.filter === 'object'
      ? state.filter
      : (state.filter = {});
    filterState.type = normalizeText(filterType?.value, normalizeText(filterState.type, 'all'));
    filterState.error = normalizeText(filterError?.value, normalizeText(filterState.error, 'all'));
    const activeOwnerProfile = normalizeText(filterActiveOwner?.value, '').toLowerCase();
    const selectedOwnerTags = filterOwnerTags
      ? Array.from(filterOwnerTags.selectedOptions || []).map((option) => normalizeText(option?.value, '').toLowerCase()).filter(Boolean)
      : [];
    filterState.ownerTags = selectedOwnerTags.length
      ? selectedOwnerTags
      : (activeOwnerProfile ? [activeOwnerProfile] : []);
    filterState.platformTags = filterPlatformTags
      ? Array.from(filterPlatformTags.selectedOptions || []).map((option) => normalizeText(option?.value, '').toLowerCase()).filter(Boolean)
      : [];
    filterState.activeOwnerProfile = activeOwnerProfile;
  }

  return {
    detailMatchesDefinitionFilters,
    getOwnerTags,
    getPlatformTags,
    getTagList,
    populateFilters,
  };
}
