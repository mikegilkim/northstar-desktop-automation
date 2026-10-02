const test = require('node:test');
const assert = require('node:assert/strict');

const { ProfileManager } = require('../src/engine/ProfileManager');
const { NotificationManager } = require('../src/engine/NotificationManager');
const { ActivityLogger } = require('../src/engine/ActivityLogger');
const { SafetyManager } = require('../src/engine/SafetyManager');
const { MouseController } = require('../src/engine/MouseController');
const { KeyboardController } = require('../src/engine/KeyboardController');
const { ScrollController } = require('../src/engine/ScrollController');
const { BrowserController } = require('../src/engine/BrowserController');
const { AutomationEngine } = require('../src/engine/AutomationEngine');
const {
  WindowCycler,
  normalizeTargets,
  normalizeInterval,
  normalizeTargetIntervals,
  getTargetInterval,
  normalizeMouseAssist,
  normalizeScrollAssist
} = require('../src/engine/WindowCycler');

const tempDir = require('node:path').join(__dirname, 'tmp-test-data');

test('profile manager can create, load, and delete profiles', async () => {
  const manager = new ProfileManager({ storageDir: tempDir });
  const profile = await manager.createProfile({
    name: 'Test Profile',
    description: 'Smoke test profile',
    mouse: { intensity: 2 }
  });

  assert.ok(profile.id);
  assert.equal((await manager.getAllProfiles()).length, 1);

  const loaded = await manager.getProfile(profile.id);
  assert.equal(loaded.name, 'Test Profile');

  await manager.deleteProfile(profile.id);
  assert.equal((await manager.getAllProfiles()).length, 0);
});

test('notification manager records events', () => {
  const manager = new NotificationManager();
  manager.add('Automation started');
  manager.add('Automation paused');

  const notifications = manager.list();
  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].message, 'Automation started');
});

test('activity logger stores entries', () => {
  const logger = new ActivityLogger();
  logger.log({ actionType: 'Browser', application: 'Chrome', browser: 'Chrome', tab: 2, result: 'ok', profile: 'Research' });

  const entries = logger.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].actionType, 'Browser');
});

test('safety manager triggers emergency stop', () => {
  const safety = new SafetyManager({ emergencyStopHotkey: 'Ctrl+Alt+S' });
  safety.activateEmergencyStop();
  assert.equal(safety.getStatus(), 'stopped');
  assert.equal(safety.isEmergencyStopped(), true);
});

test('mouse controller respects random timing bounds', () => {
  const controller = new MouseController({ movementSpeed: 120, movementFrequency: 5, clickProbability: 0.5, enabled: true });
  const action = controller.generateMovementAction();
  assert.ok(action.x >= 0 && action.x <= 1920);
  assert.ok(action.y >= 0 && action.y <= 1080);
});

test('keyboard controller generates safe text actions', () => {
  const controller = new KeyboardController({ enabled: true, typingSpeed: 20, delayRange: [50, 120], allowedActions: ['type', 'shortcut'] });
  const action = controller.generateAction('type', 'demo text');
  assert.deepEqual(action.type, 'type');
  assert.equal(action.text, 'demo text');
});

test('scroll controller generates bounded scroll action', () => {
  const controller = new ScrollController({ enabled: true, speed: 700, distance: 500, direction: 'vertical' });
  const action = controller.generateScroll();
  assert.ok(action.distance !== 0);
  assert.equal(action.direction === 'up' || action.direction === 'down', true);
});

test('browser controller handles safe simulated navigation', async () => {
  const controller = new BrowserController({ enabled: true, defaultBrowser: 'Chrome', allowedHosts: ['example.com', 'github.com'] });
  const result = await controller.navigate('https://example.com');
  assert.equal(result.success, true);
  assert.equal(result.tab.url, 'https://example.com');
});

test('automation engine can start stop and pause', async () => {
  const engine = new AutomationEngine({
    profile: { name: 'Demo', mouse: { intensity: 2 }, keyboard: { enabled: true }, scroll: { enabled: true }, browser: { enabled: true } },
    simulationMode: true,
    settings: { browser: { defaultBrowser: 'Chrome' } }
  });

  engine.start();
  assert.equal(engine.getStatus(), 'running');

  engine.pause();
  assert.equal(engine.getStatus(), 'paused');

  engine.stop();
  assert.equal(engine.getStatus(), 'stopped');
});

test('window monitor validates title filters and switch intervals', () => {
  assert.deepEqual(normalizeTargets([' Jira ', 'Teams', 'Jira', 'Slack']), ['Jira', 'Teams', 'Slack']);
  assert.equal(normalizeInterval(30), 30);
  assert.deepEqual(normalizeTargetIntervals({ browser: 300, teams: 120, slack: 180 }), { browser: 300, teams: 120, slack: 180 });
  assert.equal(getTargetInterval('Jira', { browser: 300, teams: 120, slack: 180 }), 300);
  assert.equal(getTargetInterval('Teams - General', { browser: 300, teams: 120, slack: 180 }), 120);
  assert.equal(getTargetInterval('Slack workspace', { browser: 300, teams: 120, slack: 180 }), 180);
  assert.deepEqual(normalizeMouseAssist(), { enabled: true, parkPosition: 'center' });
  assert.deepEqual(normalizeScrollAssist({ enabled: true, direction: 'up', ticks: 3 }), { enabled: true, direction: 'up', ticks: 3 });
  assert.throws(() => normalizeTargets([]), /between 1 and 6/);
  assert.throws(() => normalizeInterval(2), /between 10 and 3600/);
  assert.throws(() => normalizeScrollAssist({ direction: 'sideways', ticks: 1 }), /Scroll direction/);
  assert.throws(() => normalizeScrollAssist({ direction: 'down', ticks: 6 }), /Scroll direction/);
});

test('window monitor focuses configured targets in order', async () => {
  const focused = [];
  const inputOptions = [];
  const monitor = new WindowCycler({
    platform: 'win32',
    activateWindow: async (title, options) => {
      focused.push(title);
      inputOptions.push(options);
      return { success: true, title: `${title} - test window` };
    }
  });
  monitor.targets = ['Jira', 'Teams', 'Slack'];

  await monitor.focusNext();
  await monitor.focusNext();
  await monitor.focusNext();
  await monitor.focusNext();

  assert.deepEqual(focused, ['Jira', 'Teams', 'Slack', 'Jira']);
  assert.equal(inputOptions[0].mouseAssist.enabled, true);
  assert.equal(inputOptions[0].scrollAssist.enabled, true);
  assert.equal(inputOptions[0].scrollAssist.direction, 'down');
});

test('window monitor reports real focus results from its rotation loop', async () => {
  let resolveUpdate;
  const updateReceived = new Promise((resolve) => { resolveUpdate = resolve; });
  const monitor = new WindowCycler({
    platform: 'win32',
    activateWindow: async (title) => ({ success: true, title: `${title} - ticket board` }),
    onUpdate: resolveUpdate
  });

  monitor.start({ monitorTargets: ['Jira'], targetIntervals: { browser: 45, teams: 60, slack: 90 } });
  const update = await updateReceived;
  monitor.stop(false);

  assert.equal(update.target, 'Jira');
  assert.equal(update.intervalSeconds, 45);
  assert.equal(update.result.success, true);
  assert.equal(update.result.title, 'Jira - ticket board');
});

test('window monitor requires pointer positioning when app scrolling is enabled', () => {
  const monitor = new WindowCycler({ platform: 'win32', activateWindow: async () => ({ success: true }) });
  assert.throws(() => monitor.start({
    monitorTargets: ['Jira'],
    mouseAssist: { enabled: false, parkPosition: 'center' },
    scrollAssist: { enabled: true, direction: 'down', ticks: 1 }
  }), /Enable visible pointer movement/);
  monitor.stop(false);
});
