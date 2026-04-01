export function createDetailDefinitionOwnerApi({
  getDefinitionTagMeta,
  getOwnerTags,
  normalizeText,
}) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderDefinitionOwnerInline(definition, fallback = {}) {
    const tagMeta = getDefinitionTagMeta(definition, fallback) || {};
    const ownerTags = getOwnerTags(tagMeta?.ownerTags);
    const firstOwnerTag = ownerTags.find((tag) => normalizeText(tag, '').toLowerCase() !== 'global') || '';
    if (!firstOwnerTag) return '';
    return `<span class="detail-owner-inline" data-role="detail-owner-inline"><span class="tag-chip owner">${escapeHtml(firstOwnerTag)}</span></span>`;
  }

  return {
    escapeHtml,
    renderDefinitionOwnerInline,
  };
}
