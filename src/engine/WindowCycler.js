const { spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_TARGETS = ['Jira', 'Teams', 'Slack'];
const MIN_INTERVAL_SECONDS = 10;
const MAX_INTERVAL_SECONDS = 3600;
const DEFAULT_TARGET_INTERVALS = { browser: 30, teams: 30, slack: 30 };
const DEFAULT_MOUSE_ASSIST = { enabled: true, parkPosition: 'center' };
const DEFAULT_SCROLL_ASSIST = { enabled: true, direction: 'down', ticks: 1 };

function normalizeTargets(targets = DEFAULT_TARGETS) {
  if (!Array.isArray(targets)) {
    throw new TypeError('Monitor targets must be a list of window-title fragments.');
  }

  const normalized = [...new Set(targets
    .map((target) => String(target).trim())
    .filter((target) => target.length > 0))];

  if (normalized.length === 0 || normalized.length > 6 || normalized.some((target) => target.length > 80)) {
    throw new RangeError('Configure between 1 and 6 title fragments, each no longer than 80 characters.');
  }

  return normalized;
}

function normalizeInterval(value = 30) {
  const interval = Number(value);
  if (!Number.isInteger(interval) || interval < MIN_INTERVAL_SECONDS || interval > MAX_INTERVAL_SECONDS) {
    throw new RangeError(`Switch interval must be between ${MIN_INTERVAL_SECONDS} and ${MAX_INTERVAL_SECONDS} seconds.`);
  }
  return interval;
}

function normalizeTargetIntervals(intervals = DEFAULT_TARGET_INTERVALS) {
  return {
    browser: normalizeInterval(intervals.browser ?? DEFAULT_TARGET_INTERVALS.browser),
    teams: normalizeInterval(intervals.teams ?? DEFAULT_TARGET_INTERVALS.teams),
    slack: normalizeInterval(intervals.slack ?? DEFAULT_TARGET_INTERVALS.slack)
  };
}

function getTargetInterval(target, intervals) {
  const normalizedTarget = target.toLowerCase();
  const appKey = normalizedTarget.includes('slack')
    ? 'slack'
    : normalizedTarget.includes('team')
      ? 'teams'
      : 'browser';
  return intervals[appKey];
}

function normalizeMouseAssist(mouseAssist = DEFAULT_MOUSE_ASSIST) {
  const parkPosition = mouseAssist.parkPosition || 'center';
  if (!['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(parkPosition)) {
    throw new RangeError('Choose a valid mouse position.');
  }
  return { enabled: mouseAssist.enabled !== false, parkPosition };
}

function normalizeScrollAssist(scrollAssist = DEFAULT_SCROLL_ASSIST) {
  const direction = scrollAssist.direction || 'down';
  const ticks = Number(scrollAssist.ticks ?? 1);
  if (!['up', 'down'].includes(direction) || !Number.isInteger(ticks) || ticks < 1 || ticks > 5) {
    throw new RangeError('Scroll direction must be up/down and wheel ticks must be between 1 and 5.');
  }
  return { enabled: scrollAssist.enabled !== false, direction, ticks };
}

function activateMatchingWindow(titlePattern, {
  platform = process.platform,
  mouseAssist = DEFAULT_MOUSE_ASSIST,
  scrollAssist = DEFAULT_SCROLL_ASSIST,
  scriptPath = path.resolve(__dirname, '../../scripts/focus-window.ps1')
} = {}) {
  if (platform !== 'win32') {
    return Promise.resolve({ success: false, message: 'Window focusing is available on Windows only.' });
  }

  return new Promise((resolve) => {
    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-TitlePattern',
      titlePattern,
      '-ParkPosition',
      mouseAssist.parkPosition || 'center',
      '-ScrollDirection',
      scrollAssist.direction || 'down',
      '-ScrollTicks',
      String(scrollAssist.ticks || 1)
    ];

    if (mouseAssist.enabled) {
      args.push('-ParkMouse');
    }
    if (scrollAssist.enabled) {
      args.push('-ScrollAfterFocus');
    }

    const child = spawn('powershell.exe', args, { windowsHide: true });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill(), 10000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, message: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          message: stderr.trim() || `Window focus helper exited with code ${code}.`
        });
      }
    });
  });
}

function sampleCursorPosition({ platform = process.platform, scriptPath = path.resolve(__dirname, '../../scripts/focus-window.ps1') } = {}) {
  if (platform !== 'win32') {
    return Promise.resolve({ success: false, message: 'Mouse telemetry is available on Windows only.' });
  }

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-Action',
      'Sample'
    ], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill(), 5000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, message: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        resolve({ success: false, message: stderr.trim() || `Mouse sampler exited with code ${code}.` });
      }
    });
  });
}

class WindowCycler {
  constructor({ activateWindow = activateMatchingWindow, onUpdate = () => {}, platform = process.platform } = {}) {
    this.activateWindow = activateWindow;
    this.onUpdate = onUpdate;
    this.platform = platform;
    this.timer = null;
    this.targets = [];
    this.intervalSeconds = 30;
    this.targetIntervals = DEFAULT_TARGET_INTERVALS;
    this.mouseAssist = DEFAULT_MOUSE_ASSIST;
    this.scrollAssist = DEFAULT_SCROLL_ASSIST;
    this.targetIndex = 0;
    this.inFlight = false;
    this.active = false;
    this.lastResult = null;
  }

  start(settings = {}) {
    const targets = normalizeTargets(settings.monitorTargets || DEFAULT_TARGETS);
    const targetIntervals = normalizeTargetIntervals(settings.targetIntervals);
    const mouseAssist = normalizeMouseAssist(settings.mouseAssist);
    const scrollAssist = normalizeScrollAssist(settings.scrollAssist);
    if (scrollAssist.enabled && !mouseAssist.enabled) {
      throw new RangeError('Enable visible pointer movement to scroll the focused app content safely.');
    }
    const configKey = JSON.stringify({ targets, targetIntervals, mouseAssist, scrollAssist });
    const sameConfig = this.active && this.configKey === configKey;

    if (sameConfig) {
      return;
    }

    this.stop(false);
    this.targets = targets;
    this.targetIntervals = targetIntervals;
    this.mouseAssist = mouseAssist;
    this.scrollAssist = scrollAssist;
    this.configKey = configKey;
    this.targetIndex = 0;
    this.active = true;
    this.runNext();
  }

  async runNext() {
    if (!this.active || this.inFlight || this.targets.length === 0) {
      return;
    }

    this.inFlight = true;
    try {
      const { target, result } = await this.focusNext();
      this.lastResult = result;
      if (this.active) {
        this.intervalSeconds = getTargetInterval(target, this.targetIntervals);
        this.onUpdate({
          active: true,
          target,
          result,
          intervalSeconds: this.intervalSeconds,
          mouseAssist: this.mouseAssist,
          scrollAssist: this.scrollAssist
        });
      }
    } catch (error) {
      this.lastResult = { success: false, message: error.message };
    } finally {
      this.inFlight = false;
      if (this.active) {
        this.timer = setTimeout(() => this.runNext(), this.intervalSeconds * 1000);
      }
    }
  }

  async focusNext() {
    if (this.targets.length === 0) {
      throw new Error('No window targets are configured.');
    }

    const target = this.targets[this.targetIndex];
    this.targetIndex = (this.targetIndex + 1) % this.targets.length;
      const result = await this.activateWindow(target, {
        platform: this.platform,
        mouseAssist: this.mouseAssist,
        scrollAssist: this.scrollAssist
      });
    return { target, result };
  }

  stop(notify = true) {
    const wasActive = this.active;
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (wasActive && notify) {
      this.onUpdate({ active: false });
    }
  }
}

module.exports = {
  DEFAULT_TARGETS,
  MIN_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  normalizeTargets,
  normalizeInterval,
  normalizeTargetIntervals,
  normalizeMouseAssist,
  normalizeScrollAssist,
  getTargetInterval,
  DEFAULT_TARGET_INTERVALS,
  DEFAULT_MOUSE_ASSIST,
  DEFAULT_SCROLL_ASSIST,
  activateMatchingWindow,
  sampleCursorPosition,
  WindowCycler
};
