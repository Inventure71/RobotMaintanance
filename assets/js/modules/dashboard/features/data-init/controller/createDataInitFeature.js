import { createDataInitFeature as createDataInitFeatureRuntime } from '../runtime/createDataInitFeatureRuntime.js';

export function createDataInitFeature(context, maybeEnv) {
  return createDataInitFeatureRuntime(context, maybeEnv);
}
