import { createMonitorConfigFeature as createMonitorConfigFeatureRuntime } from '../runtime/createMonitorConfigFeatureRuntime.js';

export function createMonitorConfigFeature(context, maybeEnv) {
  return createMonitorConfigFeatureRuntime(context, maybeEnv);
}
