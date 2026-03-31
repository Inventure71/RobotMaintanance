import { createRecorderFeature as createRecorderFeatureRuntime } from '../runtime/createRecorderFeatureRuntime.js';

export function createRecorderFeature(context, maybeEnv) {
  return createRecorderFeatureRuntime(context, maybeEnv);
}
