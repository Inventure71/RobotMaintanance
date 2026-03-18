import { createDashboardApp as composeDashboardApp } from '../app/createDashboardApp.js';
import { createDashboardStore } from '../core/createDashboardStore.js';
import { dashboardEnvironment } from './dashboardEnvironment.js';

const dashboardStore = createDashboardStore(dashboardEnvironment.state);
dashboardEnvironment.store = dashboardStore;

export function createDashboardApp() {
  return composeDashboardApp({
    env: dashboardEnvironment,
    store: dashboardStore,
  });
}

export function initDashboardController() {
  const app = createDashboardApp();
  app.init();
  return app;
}

export const initDashboardApp = initDashboardController;
