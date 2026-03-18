export function createDashboardFeatureBridge() {
  const registry = new Map();

  const bridge = new Proxy(
    {},
    {
      get(_target, prop) {
        for (const feature of registry.values()) {
          if (feature && prop in feature) {
            const value = feature[prop];
            return typeof value === 'function' ? value.bind(feature) : value;
          }
        }
        return undefined;
      },
    },
  );

  return {
    bridge,
    register(name, feature) {
      registry.set(name, feature);
      return feature;
    },
    getFeature(name) {
      return registry.get(name) || null;
    },
    listFeatures() {
      return Array.from(registry.entries());
    },
  };
}
