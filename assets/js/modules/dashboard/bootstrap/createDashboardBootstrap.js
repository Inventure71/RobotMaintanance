import { initDashboardController } from '../controllers/dashboardController.js';

export function createDashboardBootstrap(deps = {}) {
  const controller = deps.controller || initDashboardController;
  let started = false;

  return {
    mount() {
      if (started) return;
      started = true;
      controller();
    },
    update() {},
    unmount() {
      started = false;
    },
  };
}
