export function createDashboardState(overrides = {}) {
  return {
    robots: [],
    selectedRobotIds: new Set(),
    testingRobotIds: new Set(),
    searchingRobotIds: new Set(),
    fixingRobotIds: new Set(),
    detailRobotId: null,
    ...overrides,
  };
}
