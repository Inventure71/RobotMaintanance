import { createDashboardApp } from '../controllers/dashboardController.js';

export function createDashboardBootstrap(deps = {}) {
  const createApp = deps.createApp || createDashboardApp;
  let started = false;
  let app = null;

  return {
    mount() {
      if (started) return;
      started = true;
      app = createApp();
      app.init();
    },
    update() {},
    unmount() {
      app?.destroy?.();
      app = null;
      started = false;
    },
  };
}
