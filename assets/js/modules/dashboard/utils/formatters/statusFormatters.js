export function statusLabel(status = 'warning') {
  if (status === 'ok') return 'Healthy';
  if (status === 'error') return 'Critical';
  return 'Warning';
}

export function statusTone(status = 'warning') {
  if (status === 'ok') return 'ok';
  if (status === 'error') return 'err';
  return 'warn';
}
