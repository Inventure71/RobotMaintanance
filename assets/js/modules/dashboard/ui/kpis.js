export function summarizeStatuses(robots = []) {
  return robots.reduce(
    (acc, robot) => {
      const status = String(robot?.status || 'unknown');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );
}
