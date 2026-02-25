import { createDashboardBootstrap } from './bootstrap/createDashboardBootstrap.js';

export function initDashboardApp() {
  const app = createDashboardBootstrap();
  app.mount();
  return app;
}
