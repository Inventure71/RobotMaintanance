/**
 * @typedef {Object} RobotTestResult
 * @property {string} status
 * @property {string} value
 * @property {string} details
 * @property {string=} reason
 */

/**
 * @typedef {Object} RobotRecord
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} typeId
 * @property {Record<string, RobotTestResult>} tests
 */

export const DASHBOARD_TYPES = {
  robot: 'RobotRecord',
  testResult: 'RobotTestResult',
};
