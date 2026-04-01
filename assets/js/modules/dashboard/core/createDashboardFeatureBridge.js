export function createDashboardFeatureBridge() {
  const registry = new Map();
  const deferredMethodCache = new Map();

  function resolveFeatureProp(prop) {
    for (const feature of registry.values()) {
      if (feature && prop in feature) {
        return {
          feature,
          value: feature[prop],
        };
      }
    }
    return null;
  }

  function getDeferredMethod(prop) {
    if (deferredMethodCache.has(prop)) {
      return deferredMethodCache.get(prop);
    }

    const deferred = (...args) => {
      const resolved = resolveFeatureProp(prop);
      if (!resolved) return undefined;
      const { feature, value } = resolved;
      if (typeof value === 'function') {
        return value.apply(feature, args);
      }
      return args.length === 0 ? value : undefined;
    };

    deferredMethodCache.set(prop, deferred);
    return deferred;
  }

  const bridge = new Proxy(
    {},
    {
      get(_target, prop) {
        const resolved = resolveFeatureProp(prop);
        if (resolved) {
          const { feature, value } = resolved;
          return typeof value === 'function' ? value.bind(feature) : value;
        }

        if (typeof prop !== 'string') {
          return undefined;
        }

        return getDeferredMethod(prop);
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
