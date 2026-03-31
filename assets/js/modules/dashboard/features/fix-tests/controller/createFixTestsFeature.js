import { createFixTestsFeature as createFixTestsFeatureRuntime } from '../runtime/createFixTestsFeatureRuntime.js';

export function createFixTestsFeature(context, maybeEnv) {
  return createFixTestsFeatureRuntime(context, maybeEnv);
}
