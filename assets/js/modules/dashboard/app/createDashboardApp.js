import { createDashboardFeatureBridge } from '../core/createDashboardFeatureBridge.js';
import { createMonitorConfigFeature } from '../features/monitor-config/controller/createMonitorConfigFeature.js';
import { createFleetFeature } from '../features/fleet/controller/createFleetFeature.js';
import { createFixTestsFeature } from '../features/fix-tests/controller/createFixTestsFeature.js';
import { createDetailFeature } from '../features/detail/controller/createDetailFeature.js';
import { createRecorderFeature } from '../features/recorder/controller/createRecorderFeature.js';
import { createDataInitFeature } from '../features/data-init/controller/createDataInitFeature.js';

export function createDashboardApp({ env, store }) {
  const featureBridge = createDashboardFeatureBridge();
  const context = {
    bridge: featureBridge.bridge,
    env,
    store,
  };

  const features = {
    monitorConfig: featureBridge.register('monitorConfig', createMonitorConfigFeature(context)),
    fleet: featureBridge.register('fleet', createFleetFeature(context)),
    fixTests: featureBridge.register('fixTests', createFixTestsFeature(context)),
    detail: featureBridge.register('detail', createDetailFeature(context)),
    recorder: featureBridge.register('recorder', createRecorderFeature(context)),
    dataInit: featureBridge.register('dataInit', createDataInitFeature(context)),
  };

  let started = false;

  return {
    env,
    store,
    features,
    init() {
      if (started) return features;
      started = true;
      Object.values(features).forEach((feature) => {
        if (typeof feature.init === 'function' && feature !== features.dataInit) {
          feature.init();
        }
      });
      if (typeof features.dataInit.init === 'function') {
        features.dataInit.init();
      }
      return features;
    },
    destroy() {
      Object.values(features).forEach((feature) => {
        if (typeof feature.dispose === 'function') {
          feature.dispose();
        }
      });
      started = false;
    },
  };
}
