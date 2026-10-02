const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const {
  DEFAULT_TARGETS,
  DEFAULT_TARGET_INTERVALS,
  DEFAULT_MOUSE_ASSIST,
  DEFAULT_SCROLL_ASSIST,
  normalizeTargets,
  normalizeTargetIntervals,
  normalizeMouseAssist,
  normalizeScrollAssist
} = require('./src/engine/WindowCycler');

const PORT = process.env.AGENT_PORT || 4173;
const ROOT = __dirname;
const UI_ROOT = path.join(ROOT, 'src', 'renderer');
const stateEvents = new EventEmitter();
let sessionStartedAt = null;
const settingsPath = path.join(os.homedir(), '.northstar-monitor-settings.json');

function loadSavedSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return {
      defaultProfile: saved.defaultProfile || 'Research',
      browser: saved.browser || 'Chrome',
      intensity: Number(saved.intensity) || 2,
      emergencyHotkey: saved.emergencyHotkey || 'Ctrl+Alt+S',
      autoStart: Boolean(saved.autoStart),
      startMinimized: saved.startMinimized !== false,
      monitorTargets: normalizeTargets(saved.monitorTargets || DEFAULT_TARGETS),
      targetIntervals: normalizeTargetIntervals(saved.targetIntervals || DEFAULT_TARGET_INTERVALS),
      mouseAssist: normalizeMouseAssist(saved.scrollAssist === undefined ? DEFAULT_MOUSE_ASSIST : saved.mouseAssist),
      scrollAssist: normalizeScrollAssist(saved.scrollAssist === undefined ? DEFAULT_SCROLL_ASSIST : saved.scrollAssist)
    };
  } catch (error) {
    return null;
  }
}

const defaultSettings = {
  defaultProfile: 'Research',
  browser: 'Chrome',
  intensity: 2,
  emergencyHotkey: 'Ctrl+Alt+S',
  autoStart: false,
  startMinimized: true,
  monitorTargets: DEFAULT_TARGETS,
  targetIntervals: DEFAULT_TARGET_INTERVALS,
  mouseAssist: DEFAULT_MOUSE_ASSIST,
  scrollAssist: DEFAULT_SCROLL_ASSIST
};

const state = {
  status: 'idle',
  profile: 'Research',
  sessionDurationMs: 0,
  actionCount: 0,
  browser: 'Chrome',
  app: 'Chrome',
  activeTab: 1,
  intensity: 2,
  lastUpdated: new Date().toISOString(),
  monitor: {
    active: false,
    target: null,
    focusedWindow: null,
    lastResult: 'Monitor stopped',
    lastSwitchAt: null,
    switchCount: 0,
    intervalSeconds: 30,
    mouse: {
      x: null,
      y: null,
      screenWidth: null,
      screenHeight: null,
      movementCount: 0,
      sampledAt: null,
      lastGestureAt: null,
      lastScrollTicks: 0
    }
  },
  settings: loadSavedSettings() || defaultSettings
};

function updateState(patch) {
  Object.assign(state, patch);
  state.lastUpdated = new Date().toISOString();
  stateEvents.emit('change', getState());
  return state;
}

function setAutomationStatus(status) {
  if (status === 'running' && state.status !== 'running') {
    sessionStartedAt = Date.now();
  } else if (state.status === 'running' && status !== 'running') {
    state.sessionDurationMs += Date.now() - sessionStartedAt;
    sessionStartedAt = null;
  }

  if (status === 'stopped') {
    state.sessionDurationMs = 0;
  }

  return updateState({ status });
}

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

function safeReadFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolveStaticFilePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath === '/' ? '/index.html' : requestPath);
  const normalized = decodedPath.replace(/\\/g, '/');

  if (normalized === '/index.html') {
    return path.join(UI_ROOT, 'index.html');
  }

  if (normalized.startsWith('/engine/')) {
    return path.join(ROOT, 'src', 'engine', normalized.slice('/engine/'.length));
  }

  if (normalized.startsWith('/renderer/')) {
    return path.join(ROOT, 'src', 'renderer', normalized.slice('/renderer/'.length));
  }

  if (normalized.startsWith('/src/')) {
    return path.join(ROOT, normalized.slice(1));
  }

  return path.normalize(path.join(UI_ROOT, normalized));
}

function serveStatic(req, res, urlPath) {
  const candidatePath = resolveStaticFilePath(urlPath);
  const rootGuard = path.resolve(ROOT);

  if (!candidatePath.startsWith(rootGuard)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const fileExt = path.extname(candidatePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
  };

  if (!fs.existsSync(candidatePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const contentType = mimeTypes[fileExt] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(safeReadFile(candidatePath));
}

function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  switch (url.pathname) {
    case '/api/status':
      sendJson(res, getState());
      return;
    case '/api/start':
      setAutomationStatus('running');
      updateState({ profile: state.settings.defaultProfile || state.profile });
      sendJson(res, { ok: true, status: state.status });
      return;
    case '/api/pause':
      setAutomationStatus('paused');
      sendJson(res, { ok: true, status: state.status });
      return;
    case '/api/stop':
      setAutomationStatus('stopped');
      sendJson(res, { ok: true, status: state.status });
      return;
    case '/api/settings':
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const settings = { ...state.settings, ...payload };
            settings.monitorTargets = normalizeTargets(payload.monitorTargets ?? state.settings.monitorTargets);
            settings.targetIntervals = normalizeTargetIntervals(payload.targetIntervals ?? state.settings.targetIntervals);
            settings.mouseAssist = normalizeMouseAssist(payload.mouseAssist ?? state.settings.mouseAssist);
            settings.scrollAssist = normalizeScrollAssist(payload.scrollAssist ?? state.settings.scrollAssist);
            if (settings.scrollAssist.enabled && !settings.mouseAssist.enabled) {
              throw new RangeError('Enable visible pointer movement to scroll the focused app content safely.');
            }
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            updateState({ settings });
            sendJson(res, { ok: true, settings: state.settings });
          } catch (error) {
            sendJson(res, { ok: false, message: error.message || 'Invalid settings payload' }, 400);
          }
        });
        return;
      }

      sendJson(res, {
        defaultProfile: state.settings.defaultProfile || state.profile,
        browser: state.settings.browser || state.browser,
        intensity: state.settings.intensity || state.intensity,
        emergencyHotkey: state.settings.emergencyHotkey,
        autoStart: state.settings.autoStart,
        startMinimized: state.settings.startMinimized,
        monitorTargets: state.settings.monitorTargets,
        targetIntervals: state.settings.targetIntervals,
        mouseAssist: state.settings.mouseAssist,
        scrollAssist: state.settings.scrollAssist,
        mode: 'tray-agent'
      });
      return;
    case '/api/profiles':
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const profile = {
              id: payload.id || `profile-${Date.now()}`,
              name: payload.name || 'Custom Profile',
              description: payload.description || '',
              type: payload.type || 'Custom',
              intensity: payload.intensity || 2
            };
            updateState({ profile: profile.name });
            sendJson(res, { ok: true, profile });
          } catch (error) {
            sendJson(res, { ok: false, message: 'Invalid profile payload' }, 400);
          }
        });
        return;
      }
      sendJson(res, { ok: true, profiles: [{ id: 'light', name: 'Light Activity', type: 'Low intensity', description: 'Gentle movement and checks.' }, { id: 'research', name: 'Research', type: 'Browser-focused', description: 'Search and review loop.' }, { id: 'demo', name: 'Demo Mode', type: 'Safe simulation', description: 'Transparent activity only.' }] });
      return;
    default:
      break;
  }

  sendJson(res, { ok: false, message: 'Unknown API route' }, 404);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Automation agent UI available at http://127.0.0.1:${PORT}`);
});

function getState() {
  if (state.status === 'running' && sessionStartedAt !== null) {
    return { ...state, sessionDurationMs: state.sessionDurationMs + Date.now() - sessionStartedAt };
  }
  return state;
}

function onStateChange(listener) {
  stateEvents.on('change', listener);
  return () => stateEvents.off('change', listener);
}

function updateMonitorState(monitorPatch) {
  return updateState({ monitor: { ...state.monitor, ...monitorPatch } });
}

module.exports = { server, getState, onStateChange, updateMonitorState };
