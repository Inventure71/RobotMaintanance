import assert from 'node:assert/strict';
import test from 'node:test';

import { createDetailFiltersApi } from '../../assets/js/modules/dashboard/features/detail/domain/createDetailFiltersApi.js';

function createApi(filter = {}) {
  return createDetailFiltersApi({
    documentRef: null,
    filterActiveOwner: null,
    filterError: null,
    filterOwnerTags: null,
    filterPlatformTags: null,
    filterType: null,
    normalizeText(value, fallback = '') {
      if (value === null || value === undefined) return String(fallback ?? '');
      const text = String(value).trim();
      return text || String(fallback ?? '');
    },
    state: {
      robots: [],
      filter: {
        ownerTags: [],
        platformTags: [],
        activeOwnerProfile: '',
        ...filter,
      },
    },
  });
}

test('detail owner matching keeps global tests visible when an ownership scope is selected', () => {
  const api = createApi({
    ownerTags: ['alice'],
    activeOwnerProfile: 'alice',
  });

  assert.equal(
    api.detailMatchesDefinitionFilters({ ownerTags: ['global'], platformTags: ['ros2'] }),
    true,
  );
  assert.equal(
    api.detailMatchesDefinitionFilters({ ownerTags: ['alice'], platformTags: ['ros2'] }),
    true,
  );
  assert.equal(
    api.detailMatchesDefinitionFilters({ ownerTags: ['bob'], platformTags: ['ros2'] }),
    false,
  );
});

test('detail owner tags default to global only when a definition has no explicit owners', () => {
  const api = createApi();

  assert.deepEqual(api.getOwnerTags([]), ['global']);
  assert.deepEqual(api.getOwnerTags(['alice']), ['alice']);
});
