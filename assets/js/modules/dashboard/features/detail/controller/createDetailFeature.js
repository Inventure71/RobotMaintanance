import { createDetailFeature as createDetailFeatureRuntime } from '../runtime/createDetailFeatureRuntime.js';

export function createDetailFeature(context, maybeEnv) {
  return createDetailFeatureRuntime(context, maybeEnv);
}
