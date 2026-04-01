export function createRobotJobsApi({ buildApiUrl, fetchImpl } = {}) {
  function resolveFetchImpl() {
    if (typeof fetchImpl === 'function') return fetchImpl;
    if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
      return globalThis.fetch.bind(globalThis);
    }
    throw new Error('Fetch API is unavailable for /jobs requests.');
  }

  async function readErrorDetail(response) {
    try {
      const payload = await response.json();
      if (payload && typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim();
      }
    } catch (_error) {
      // Fallback to text below.
    }
    try {
      const text = await response.text();
      if (text && text.trim()) return text.trim();
    } catch (_error) {
      // Ignore.
    }
    return `Request failed (${response.status})`;
  }

  async function enqueueJob(robotId, body) {
    const doFetch = resolveFetchImpl();
    const response = await doFetch(buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/jobs`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!response.ok) {
      throw new Error(await readErrorDetail(response));
    }
    return response.json();
  }

  async function stopActiveJob(robotId) {
    const doFetch = resolveFetchImpl();
    const response = await doFetch(buildApiUrl(`/api/robots/${encodeURIComponent(robotId)}/jobs/active/stop`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(await readErrorDetail(response));
    }
    return {
      status: response.status,
      body: await response.json(),
    };
  }

  return {
    enqueueJob,
    stopActiveJob,
  };
}

export function createRobotJobQueueStore({ normalizeText, jobQueueActivity }) {
  const snapshotsByRobotId = new Map();
  if (!jobQueueActivity || typeof jobQueueActivity.normalizeJobQueueSnapshot !== 'function') {
    throw new Error('JOB_QUEUE_ACTIVITY helper is required.');
  }
  const normalizeSnapshot = (raw) => jobQueueActivity.normalizeJobQueueSnapshot(raw);

  function remember(robotId, snapshot) {
    const normalizedRobotId = normalizeText(robotId, '');
    if (!normalizedRobotId) return normalizeSnapshot(snapshot);
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    snapshotsByRobotId.set(normalizedRobotId, normalizedSnapshot);
    return normalizedSnapshot;
  }

  function applySnapshotToRobot(robot, snapshot) {
    if (!robot || typeof robot !== 'object') return robot;
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const previousActivity = robot.activity && typeof robot.activity === 'object' ? robot.activity : {};
    const mergedActivity = {
      ...previousActivity,
      jobQueueVersion: normalizedSnapshot.jobQueueVersion,
      activeJob: normalizedSnapshot.activeJob,
      queuedJobs: normalizedSnapshot.queuedJobs,
      updatedAt: Math.max(
        Number(previousActivity.updatedAt || 0),
        Number(normalizedSnapshot.activeJob?.updatedAt || 0),
        ...normalizedSnapshot.queuedJobs.map((item) => Number(item?.updatedAt || 0)),
      ),
    };

    return {
      ...robot,
      activity: mergedActivity,
    };
  }

  return {
    remember,
    applySnapshotToRobot,
  };
}

export function createRobotJobQueueRenderer({ normalizeText }) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function compactLabel(value, fallback = 'job', maxLen = 20) {
    const normalized = normalizeText(value, fallback) || fallback;
    if (normalized.length <= maxLen) return normalized;
    return `${normalized.slice(0, Math.max(1, maxLen - 3))}...`;
  }

  function renderJobChip(prefix, job) {
    if (!job || typeof job !== 'object') return '';
    const normalizedStatus = normalizeText(job.status, 'queued').toLowerCase();
    const status = escapeHtml(normalizedStatus);
    const kind = escapeHtml(compactLabel(job.kind, 'job', 8));
    const label = escapeHtml(compactLabel(job.label, normalizeText(job.id, 'job'), 18));
    const slot = escapeHtml(prefix);
    return (
      `<span class="pill robot-job-chip robot-job-chip--${status}" title="${slot} ${label} (${kind}) · ${status}">`
      + `${slot} ${label} · ${kind} · ${status}`
      + '</span>'
    );
  }

  function renderQueueStrip(activity, options = {}) {
    const payload = activity && typeof activity === 'object' ? activity : {};
    const activeJob = payload.activeJob && typeof payload.activeJob === 'object' ? payload.activeJob : null;
    const queuedJobs = Array.isArray(payload.queuedJobs) ? payload.queuedJobs : [];
    const maxQueued = Number.isFinite(Number(options.maxQueued)) ? Math.max(0, Math.trunc(Number(options.maxQueued))) : 3;
    const includeEmpty = options.includeEmpty === true;

    const chips = [];
    if (activeJob) {
      chips.push(renderJobChip('A', activeJob));
    }
    queuedJobs.slice(0, maxQueued).forEach((job, index) => {
      chips.push(renderJobChip(`Q${index + 1}`, job));
    });
    if (queuedJobs.length > maxQueued) {
      chips.push(`<span class="pill robot-job-chip">+${queuedJobs.length - maxQueued} more</span>`);
    }

    if (!chips.length && !includeEmpty) return '';
    if (!chips.length) {
      chips.push('<span class="pill robot-job-chip robot-job-chip--empty">Queue empty</span>');
    }

    return `<div class="robot-job-queue-strip robot-job-queue-strip--compact" data-role="job-queue-strip">${chips.join('')}</div>`;
  }

  function hasStoppableActiveJob(activity) {
    const active = activity && typeof activity === 'object' ? activity.activeJob : null;
    const status = normalizeText(active?.status, '');
    return status === 'running' || status === 'interrupting';
  }

  function renderStopCurrentJobButton(activity, robotId) {
    if (!hasStoppableActiveJob(activity)) return '';
    const status = normalizeText(activity?.activeJob?.status, 'running');
    const normalizedRobotId = escapeHtml(normalizeText(robotId, ''));
    const label = status === 'interrupting' ? 'Stopping...' : 'Stop';
    const disabled = status === 'interrupting' ? ' disabled' : '';
    return (
      `<button class="button button-compact stop-current-job-btn" type="button" data-button-intent="danger" `
      + `data-action="stop-current-job" data-robot-id="${normalizedRobotId}"${disabled}>${label}</button>`
    );
  }

  return {
    renderQueueStrip,
    renderStopCurrentJobButton,
  };
}
