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
    /<aside class="dashboard-sidebar" aria-label="Fleet controls">[\s\S]*?Fleet health[\s\S]*?Control[\s\S]*?Search &amp; filter[\s\S]*?Expert Mode[\s\S]*?<\/aside>/,
  );
  assert.match(
    dashboardSection,
    /Expert Mode[\s\S]*?Visual style:[\s\S]*?id="themeSelect"[\s\S]*?<option value="swiss">Swiss<\/option>[\s\S]*?<option value="classic">Classic<\/option>/,
  );
  assert.match(
    dashboardSection,
    /<div class="dashboard-main">[\s\S]*?id="fleetOnlineSummary"[\s\S]*?id="selectionSummary"[\s\S]*?id="dashboardFixModePanel"[\s\S]*?id="onlineSection"[\s\S]*?id="cycleOnlineSort"[\s\S]*?id="runFleetOnline"[\s\S]*?id="selectAllOnlineRobots"[\s\S]*?id="offlineSection"[\s\S]*?id="emptyState"[\s\S]*?<\/div>/,
  );
});

test('manage shell keeps the back action inside the tabs panel and removes the title pill', async () => {
  const html = await fs.readFile(INDEX_PATH, 'utf8');
  const addRobotStart = html.indexOf('<section id="addRobot" class="view">');
  const detailStart = html.indexOf('<section id="detail" class="view">');

  assert.notEqual(addRobotStart, -1, 'expected addRobot section in index.html');
  assert.notEqual(detailStart, -1, 'expected detail section in index.html');
  assert.ok(detailStart > addRobotStart, 'expected detail section after addRobot section');

  const addRobotSection = collapseWhitespace(html.slice(addRobotStart, detailStart));

  assert.doesNotMatch(addRobotSection, /<div class="detail-title-bar">Manage Robots<\/div>/);
  assert.doesNotMatch(addRobotSection, /Robot Registry tasks/);
  assert.doesNotMatch(addRobotSection, /Pick one job\. Each view keeps a single primary workflow on screen\./);
  assert.match(
    addRobotSection,
    /<div class="manage-tabs-row manage-tabs-row-primary">[\s\S]*?id="backFromAddRobot"[\s\S]*?class="manage-tab-bar manage-tab-bar-primary"[\s\S]*?Primary navigation[\s\S]*?<\/div>/,
  );
  assert.match(
    addRobotSection,
    /<div class="registry-intro-pills">[\s\S]*?<div class="registry-view-intro panel">[\s\S]*?Existing robots[\s\S]*?Choose a registered robot[\s\S]*?<div class="panel registry-jump-card registry-jump-card-alert">[\s\S]*?Want to register a new robot\?[\s\S]*?Go to register new robot[\s\S]*?<\/div>/,
  );

  const newRobotTypeStart = addRobotSection.indexOf('data-robot-registry-panel="new-robot-type"');
  const definitionsStart = addRobotSection.indexOf('id="manageTabPanelDefinitions"');

  assert.notEqual(newRobotTypeStart, -1, 'expected new robot type registry panel');
  assert.notEqual(definitionsStart, -1, 'expected definitions panel after robot registry panels');
  assert.ok(definitionsStart > newRobotTypeStart, 'expected definitions panel after new robot type panel');

  const newRobotTypePanel = collapseWhitespace(addRobotSection.slice(newRobotTypeStart, definitionsStart));

  assert.match(newRobotTypePanel, /<div class="add-robot-shell">[\s\S]*?Register a new robot type/);
  assert.doesNotMatch(newRobotTypePanel, /registry-new-robot-shell/);
  assert.doesNotMatch(newRobotTypePanel, /Already have robot types\?/);
  assert.doesNotMatch(newRobotTypePanel, /Go to existing robot types/);
});

test('recorder import step uses a visible manual-copy prompt field and removes the copy button', async () => {
  const html = await fs.readFile(INDEX_PATH, 'utf8');
  const recorderPromptStart = html.indexOf('<div id="recorderSimplePromptStep"');
  const recorderImportStart = html.indexOf('<div id="recorderSimpleImportStep"');
  const recorderTerminalStart = html.indexOf('<div id="recorderTerminalPanel"');

  assert.notEqual(recorderPromptStart, -1, 'expected recorder prompt step in index.html');
  assert.notEqual(recorderImportStart, -1, 'expected recorder import step in index.html');
  assert.notEqual(recorderTerminalStart, -1, 'expected recorder terminal panel after import step');
  assert.ok(recorderTerminalStart > recorderImportStart, 'expected recorder terminal panel after import step');

  const recorderPromptSection = collapseWhitespace(html.slice(recorderPromptStart, recorderImportStart));
  const recorderImportSection = collapseWhitespace(html.slice(recorderImportStart, recorderTerminalStart));

  assert.match(recorderPromptSection, /generated automatically when you continue/i);
  assert.doesNotMatch(recorderPromptSection, /id="recorderGeneratePromptButton"/);
  assert.match(recorderImportSection, /Prompt to copy/);
  assert.match(recorderImportSection, /Ctrl\/Cmd\+A/);
  assert.match(recorderImportSection, /Ctrl\/Cmd\+C/);
  assert.match(
    recorderImportSection,
    /<textarea id="recorderLlmPromptPreview" class="recorder-llm-textarea recorder-llm-preview"[\s\S]*?readonly[\s\S]*?><\/textarea>/,
  );
  assert.doesNotMatch(recorderImportSection, /id="recorderLlmCopyPromptButton"/);
});

test('recorder terminal step tells operators to run the generic info action before the LLM step', async () => {
  const html = await fs.readFile(INDEX_PATH, 'utf8');
  const recorderTerminalStart = html.indexOf('<div id="recorderSimpleTerminalStep"');
  const recorderPromptStart = html.indexOf('<div id="recorderSimplePromptStep"');

  assert.notEqual(recorderTerminalStart, -1, 'expected recorder terminal step in index.html');
  assert.notEqual(recorderPromptStart, -1, 'expected recorder prompt step in index.html');
  assert.ok(recorderPromptStart > recorderTerminalStart, 'expected prompt step after terminal step');

  const recorderTerminalSection = collapseWhitespace(html.slice(recorderTerminalStart, recorderPromptStart));

  assert.match(recorderTerminalSection, /Run generic info commands/);
  assert.match(recorderTerminalSection, /OS, ROS, processes, networking, services, and containers/i);
});
