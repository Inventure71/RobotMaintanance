import { createFleetFeature as createFleetFeatureRuntime } from '../runtime/createFleetFeatureRuntime.js';

export function createFleetFeature(context, maybeEnv) {
  return createFleetFeatureRuntime(context, maybeEnv);
}
