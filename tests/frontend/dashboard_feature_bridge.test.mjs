import assert from 'node:assert/strict';
import test from 'node:test';

import { createDashboardFeatureBridge } from '../../assets/js/modules/dashboard/core/createDashboardFeatureBridge.js';

test('bridge resolves methods that are destructured before provider registration', () => {
  const featureBridge = createDashboardFeatureBridge();
  const { increment, getCounter } = featureBridge.bridge;

  const provider = {
    counter: 0,
    increment(step = 1) {
      this.counter += step;
      return this.counter;
    },
    getCounter() {
      return this.counter;
    },
  };

  featureBridge.register('provider', provider);

  assert.equal(increment(3), 3);
  assert.equal(getCounter(), 3);
  assert.equal(provider.counter, 3);
});

test('bridge keeps missing props callable and inert', () => {
  const featureBridge = createDashboardFeatureBridge();

  const lateMethod = featureBridge.bridge.notYetRegistered;
  assert.equal(typeof lateMethod, 'function');
  assert.equal(lateMethod(), undefined);
  assert.equal(lateMethod('arg'), undefined);
});

test('bridge binds already-registered methods and resolves values', () => {
  const featureBridge = createDashboardFeatureBridge();
  const provider = {
    counter: 0,
    label: 'fleet',
    increment() {
      this.counter += 1;
      return this.counter;
    },
  };

  featureBridge.register('provider', provider);

  const increment = featureBridge.bridge.increment;
  assert.equal(increment(), 1);
  assert.equal(provider.counter, 1);
  assert.equal(featureBridge.bridge.label, 'fleet');
});
