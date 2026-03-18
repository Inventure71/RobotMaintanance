import { createDashboardBootstrap } from './bootstrap/createDashboardBootstrap.js';
export { createDashboardApp } from './controllers/dashboardController.js';

export function initDashboardApp() {
  const app = createDashboardBootstrap();
  app.mount();
  return app;
}
