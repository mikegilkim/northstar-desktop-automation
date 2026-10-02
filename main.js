const { app, Tray, Menu, shell } = require('electron');
const path = require('node:path');
const { server: agentServer, getState, onStateChange, updateMonitorState } = require('./server');
const { WindowCycler, sampleCursorPosition } = require('./src/engine/WindowCycler');

const AGENT_NAME = 'Northstar';
const trayIconPath = path.join(__dirname, 'assets', 'marvin.ico');

let tray = null;
let mouseTelemetryTimer = null;
let mouseSampleInFlight = false;
let lastMousePosition = null;
const windowCycler = new WindowCycler({
  onUpdate: (update) => {
    const currentMonitor = getState().monitor;
    if (update.active) {
      const result = update.result || {};
      updateMonitorState({
        active: true,
        target: update.target,
        focusedWindow: result.title || null,
        lastResult: result.message || (result.success ? 'Window focused' : 'Window not found'),
        lastSwitchAt: new Date().toISOString(),
        switchCount: currentMonitor.switchCount + (result.success ? 1 : 0),
        intervalSeconds: update.intervalSeconds,
        mouse: result.x === undefined ? currentMonitor.mouse : {
          ...currentMonitor.mouse,
          x: result.x,
          y: result.y,
          screenWidth: result.screenWidth,
          screenHeight: result.screenHeight,
          cursorParked: Boolean(result.cursorParked),
          sampledAt: new Date().toISOString(),
          lastGestureAt: new Date().toISOString(),
          lastScrollTicks: result.scrolledTicks || 0
        }
      });
      return;
    }
    updateMonitorState({ active: false, lastResult: 'Monitor paused or stopped' });
  }
});

function syncWindowCycler(state = getState()) {
  if (state.status !== 'running') {
    windowCycler.stop();
    return;
  }

  try {
    windowCycler.start(state.settings);
  } catch (error) {
    const monitor = getState().monitor;
    if (monitor.active || monitor.lastResult !== error.message) {
      updateMonitorState({ active: false, lastResult: error.message });
    }
  }
}

function updateTrayStatus() {
  if (!tray) {
    return;
  }

  const state = getState ? getState() : { status: 'idle' };
  const statusText = state.status ? state.status.charAt(0).toUpperCase() + state.status.slice(1) : 'Idle';
  const targetText = state.monitor && state.monitor.target ? ` — ${state.monitor.target}` : '';
  tray.setToolTip(`${AGENT_NAME} • ${statusText}${targetText}`);
}

function buildTrayMenu() {
  const runAction = async (action) => {
    try {
      await fetch(`http://127.0.0.1:4173/api/${action}`, { method: 'POST' });
    } catch (error) {
      // Leave the tooltip at the last server-confirmed status.
    }
    updateTrayStatus();
  };

  return Menu.buildFromTemplate([
    {
      label: 'Open dashboard',
      click: () => shell.openExternal('http://127.0.0.1:4173')
    },
    { type: 'separator' },
    {
      label: 'Start ticket monitor',
      click: () => { runAction('start'); }
    },
    {
      label: 'Pause ticket monitor',
      click: () => { runAction('pause'); }
    },
    {
      label: 'Stop ticket monitor',
      click: () => { runAction('stop'); }
    },
    { type: 'separator' },
    {
      label: 'Quit Northstar',
      click: () => app.quit()
    }
  ]);
}

function createTray() {
  const trayIconImage = require('electron').nativeImage.createFromPath(trayIconPath);
  if (trayIconImage.isEmpty()) {
    throw new Error(`Unable to load tray icon: ${trayIconPath}`);
  }
  tray = new Tray(trayIconImage);
  tray.setToolTip(`${AGENT_NAME} • Idle`);
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => shell.openExternal('http://127.0.0.1:4173'));

  setInterval(updateTrayStatus, 2500);
}

async function updateMouseTelemetry() {
  if (mouseSampleInFlight) {
    return;
  }
  mouseSampleInFlight = true;
  try {
    const sample = await sampleCursorPosition();
    if (!sample.success) {
      return;
    }

    const currentMonitor = getState().monitor;
    const moved = lastMousePosition && (lastMousePosition.x !== sample.x || lastMousePosition.y !== sample.y);
    const movementCount = (currentMonitor.mouse?.movementCount || 0) + (moved ? 1 : 0);
    lastMousePosition = { x: sample.x, y: sample.y };
    updateMonitorState({
      mouse: {
        ...currentMonitor.mouse,
        x: sample.x,
        y: sample.y,
        screenWidth: sample.screenWidth,
        screenHeight: sample.screenHeight,
        movementCount,
        sampledAt: sample.sampledAt,
        cursorParked: currentMonitor.mouse?.cursorParked || false
      }
    });
  } finally {
    mouseSampleInFlight = false;
  }
}

app.setName(AGENT_NAME);

app.whenReady().then(() => {
  createTray();
  updateMouseTelemetry();
  mouseTelemetryTimer = setInterval(updateMouseTelemetry, 2000);
  onStateChange((state) => {
    updateTrayStatus();
    syncWindowCycler(state);
  });
  shell.openExternal('http://127.0.0.1:4173');

  app.on('activate', () => {
    if (tray) {
      tray.setContextMenu(buildTrayMenu());
      updateTrayStatus();
    }
  });
});

app.on('before-quit', () => {
  windowCycler.stop(false);
  if (mouseTelemetryTimer) {
    clearInterval(mouseTelemetryTimer);
  }
  if (agentServer && typeof agentServer.close === 'function') {
    agentServer.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
