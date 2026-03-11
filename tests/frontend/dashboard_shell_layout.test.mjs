import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_PATH = path.resolve(__dirname, '../../index.html');

function collapseWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

test('dashboard shell organizes header, sidebar, and main fleet content', async () => {
  const html = await fs.readFile(INDEX_PATH, 'utf8');
  const dashboardStart = html.indexOf('<section id="dashboard" class="view active">');
  const addRobotStart = html.indexOf('<section id="addRobot" class="view">');

  assert.notEqual(dashboardStart, -1, 'expected dashboard section in index.html');
  assert.notEqual(addRobotStart, -1, 'expected addRobot section in index.html');
  assert.ok(addRobotStart > dashboardStart, 'expected addRobot section after dashboard section');

  const dashboardSection = collapseWhitespace(html.slice(dashboardStart, addRobotStart));
  const headerIndex = dashboardSection.indexOf('class="dashboard-header panel"');
  const sidebarIndex = dashboardSection.indexOf('class="dashboard-sidebar"');
  const mainIndex = dashboardSection.indexOf('class="dashboard-main"');

  assert.equal(headerIndex, -1, 'did not expect dashboard header wrapper');
  assert.notEqual(sidebarIndex, -1, 'expected dashboard sidebar wrapper');
  assert.notEqual(mainIndex, -1, 'expected dashboard main wrapper');
  assert.ok(sidebarIndex < mainIndex, 'expected sidebar before main content');

  assert.match(
    dashboardSection,
    /<aside class="dashboard-sidebar" aria-label="Fleet controls">[\s\S]*?Fleet health[\s\S]*?Filters &amp; control[\s\S]*?Auto monitor[\s\S]*?<\/aside>/,
  );
  assert.doesNotMatch(dashboardSection, /id="themeSelect"/);
  assert.match(
    dashboardSection,
    /<div class="dashboard-main">[\s\S]*?id="fleetOnlineSummary"[\s\S]*?id="dashboardFixModePanel"[\s\S]*?id="onlineSection"[\s\S]*?id="cycleOnlineSort"[\s\S]*?id="runFleetOnline"[\s\S]*?id="selectAllOnlineRobots"[\s\S]*?id="offlineSection"[\s\S]*?id="emptyState"[\s\S]*?<\/div>/,
  );
});
