export function createRecorderPreviewApi(deps) {
  const {
    documentRef,
    normalizeText,
    recorderAdvancedPreview,
    recorderDefinitionIdInput,
    recorderSimplePreview,
    state,
  } = deps;

  function getRecorderDraftContext() {
    const definitionId = normalizeText(recorderDefinitionIdInput?.value, '');
    return state.workflowRecorder?.exportDraftContext?.(definitionId) || {
      started: false,
      publishReady: false,
      definitionId,
      outputCount: 0,
      writeCount: 0,
      readCount: 0,
      outputs: [],
      execute: [],
      checks: [],
      blockingIssues: [],
    };
  }

  function hasRecorderPreviewableDraft() {
    const draft = getRecorderDraftContext();
    return Boolean(
      draft.started
      && (draft.outputCount > 0 || draft.writeCount > 0 || draft.readCount > 0),
    );
  }

  function getRecorderTerminalTranscript() {
    return normalizeText(state.recorderTerminalComponent?.exportTranscript?.(), '');
  }

  function buildRecorderPreview(target) {
    if (!target) return;
    target.replaceChildren();
    const draft = getRecorderDraftContext();
    if (!draft.started) {
      const empty = documentRef.createElement('div');
      empty.className = 'manage-list-empty';
      empty.textContent = 'No recorder draft yet.';
      target.appendChild(empty);
      return;
    }

    const header = documentRef.createElement('div');
    header.className = 'recorder-preview-header';
    const title = documentRef.createElement('h3');
    title.className = 'recorder-preview-title';
    title.textContent = draft.definitionId || 'Draft preview';
    const meta = documentRef.createElement('p');
    meta.className = 'recorder-preview-copy';
    meta.textContent = `${draft.writeCount} write block${draft.writeCount === 1 ? '' : 's'}, ${draft.readCount} read block${draft.readCount === 1 ? '' : 's'}, ${draft.outputCount} output${draft.outputCount === 1 ? '' : 's'}`;
    header.append(title, meta);
    target.appendChild(header);

    const sections = [
      {
        titleText: 'Outputs',
        rows: draft.outputs.map((output) => `${output.label} (${output.key}) · ${output.readBlockCount} read block${output.readBlockCount === 1 ? '' : 's'}`),
      },
      {
        titleText: 'Execute',
        rows: draft.execute.map((step) => `${step.order}. ${step.command} → ${step.saveAs}`),
      },
      {
        titleText: 'Checks',
        rows: draft.checks.map((check) => {
          const readRules = Array.isArray(check.read) ? check.read : [];
          return `${check.label} (${check.outputKey}) · ${readRules.length} rule${readRules.length === 1 ? '' : 's'}`;
        }),
      },
    ];

    sections.forEach((sectionData) => {
      const section = documentRef.createElement('section');
      section.className = 'recorder-preview-section';
      const sectionTitle = documentRef.createElement('h4');
      sectionTitle.className = 'recorder-preview-section-title';
      sectionTitle.textContent = sectionData.titleText;
      section.appendChild(sectionTitle);
      if (!sectionData.rows.length) {
        const empty = documentRef.createElement('div');
        empty.className = 'recorder-preview-empty';
        empty.textContent = `No ${sectionData.titleText.toLowerCase()} yet.`;
        section.appendChild(empty);
      } else {
        const list = documentRef.createElement('div');
        list.className = 'recorder-preview-list';
        sectionData.rows.forEach((rowText) => {
          const row = documentRef.createElement('div');
          row.className = 'recorder-preview-row';
          row.textContent = rowText;
          list.appendChild(row);
        });
        section.appendChild(list);
      }
      target.appendChild(section);
    });

    const issuesSection = documentRef.createElement('section');
    issuesSection.className = 'recorder-preview-section';
    const issuesTitle = documentRef.createElement('h4');
    issuesTitle.className = 'recorder-preview-section-title';
    issuesTitle.textContent = 'Blocking Issues';
    issuesSection.appendChild(issuesTitle);
    const issues = Array.isArray(draft.blockingIssues) ? draft.blockingIssues : [];
    if (!issues.length) {
      const ok = documentRef.createElement('div');
      ok.className = 'recorder-preview-empty ok';
      ok.textContent = 'No blocking issues.';
      issuesSection.appendChild(ok);
    } else {
      const list = documentRef.createElement('div');
      list.className = 'recorder-preview-list';
      issues.forEach((issue) => {
        const row = documentRef.createElement('div');
        row.className = 'recorder-preview-row recorder-preview-row-error';
        row.textContent = issue;
        list.appendChild(row);
      });
      issuesSection.appendChild(list);
    }
    target.appendChild(issuesSection);
  }

  function renderRecorderPreviews() {
    buildRecorderPreview(recorderAdvancedPreview);
    buildRecorderPreview(recorderSimplePreview);
  }

  return {
    buildRecorderPreview,
    getRecorderDraftContext,
    getRecorderTerminalTranscript,
    hasRecorderPreviewableDraft,
    renderRecorderPreviews,
  };
}
