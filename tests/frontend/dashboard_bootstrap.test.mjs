import assert from 'node:assert/strict';
import test from 'node:test';

test('dashboard bootstrap creates, initializes, and destroys the composed app once', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { location: { origin: 'http://localhost' } };
  globalThis.document = {
    body: { classList: { toggle: () => {} } },
    createElement: () => ({ getContext: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  try {
    const { createDashboardBootstrap } = await import(
      '../../assets/js/modules/dashboard/bootstrap/createDashboardBootstrap.js'
    );
    const calls = [];
    const app = {
      init: () => {
        calls.push('init');
      },
      destroy: () => {
        calls.push('destroy');
      },
    };

    const bootstrap = createDashboardBootstrap({
      createApp: () => {
        calls.push('create');
        return app;
      },
    });

    bootstrap.mount();
    bootstrap.mount();
    bootstrap.unmount();

    assert.deepEqual(calls, ['create', 'init', 'destroy']);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
