/**
 * @typedef {Object} FleetService
 * @property {() => Promise<any>} getFleetStatic
 * @property {(since:number) => Promise<any>} getFleetRuntime
 */

export const SERVICE_TYPES = {
  fleet: 'FleetService',
};
