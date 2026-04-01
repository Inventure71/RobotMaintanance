export function createDashboardStore(state) {
  return {
    getState() {
      return state;
    },
    patch(partial) {
      if (!partial || typeof partial !== 'object') return state;
      Object.assign(state, partial);
      return state;
    },
    setSelection(robotIds) {
      state.selectedRobotIds = new Set(robotIds || []);
      return state.selectedRobotIds;
    },
    setRuntimeActivity(activity = {}) {
      if (activity.testingRobotIds) state.testingRobotIds = new Set(activity.testingRobotIds);
      if (activity.searchingRobotIds) state.searchingRobotIds = new Set(activity.searchingRobotIds);
      if (activity.fixingRobotIds) state.fixingRobotIds = new Set(activity.fixingRobotIds);
      if (activity.autoFixingRobotIds) state.autoFixingRobotIds = new Set(activity.autoFixingRobotIds);
      if (activity.autoTestingRobotIds) state.autoTestingRobotIds = new Set(activity.autoTestingRobotIds);
      if (activity.autoSearchingRobotIds) state.autoSearchingRobotIds = new Set(activity.autoSearchingRobotIds);
      if (activity.autoActivityRobotIds) state.autoActivityRobotIds = new Set(activity.autoActivityRobotIds);
      return state;
    },
    setMonitorConfig(partial = {}) {
      return this.patch(partial);
    },
    setRecorderState(partial = {}) {
      return this.patch(partial);
    },
    setRegistryState(partial = {}) {
      return this.patch(partial);
    },
  };
}
