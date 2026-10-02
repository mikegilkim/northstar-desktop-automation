const defaultProfiles = [
  { id: 'light', name: 'Light Activity', type: 'Low intensity', description: 'Gentle movement and occasional checks.' },
  { id: 'research', name: 'Research', type: 'Browser-focused', description: 'Search, read, and switch tabs on a delayed loop.' },
  { id: 'browser-testing', name: 'Browser Testing', type: 'UI validation', description: 'Testing and page navigation loop.' },
  { id: 'demo', name: 'Demo Mode', type: 'Safe simulation', description: 'Transparent activity without real input control.' }
];

const profileStore = [...defaultProfiles];

const engine = new AutomationEngine({
  profile: {
    name: 'Research',
    mouse: { enabled: true, intensity: 2 },
    keyboard: { enabled: true, typingSpeed: 24, delayRange: [60, 140], allowedActions: ['type', 'shortcut'] },
    scroll: { enabled: true, speed: 650, distance: 350, direction: 'vertical' },
    browser: { enabled: true, allowedHosts: ['google.com', 'example.com'] },
    window: { enabled: true, allowedApps: ['Chrome', 'Slack', 'VS Code'] }
  },
  simulationMode: true,
  settings: { browser: { defaultBrowser: 'Chrome' } }
});

const controller = new AutomationController({ engine });

const state = {
  profileName: 'Research',
  sessionStartedAt: null,
  elapsedMs: 0,
  currentView: 'dashboard',
  status: 'idle',
  monitor: null,
  settings: {
    monitorTargets: ['Jira', 'Teams', 'Slack'],
    targetIntervals: { browser: 30, teams: 30, slack: 30 },
    mouseAssist: { enabled: true, parkPosition: 'center' },
    scrollAssist: { enabled: true, direction: 'down', ticks: 1 }
  },
};

const refs = {
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  stopBtn: document.getElementById('stop-btn'),
  statusText: document.getElementById('status-text'),
  statusPill: document.getElementById('status-pill'),
  sessionDuration: document.getElementById('session-duration'),
  sessionState: document.getElementById('session-state'),
  notificationCount: document.getElementById('notification-count'),
  notificationList: document.getElementById('notification-list'),
  activityLog: document.getElementById('activity-log'),
  dashboardProfileList: document.getElementById('dashboard-profile-list'),
  profileList: document.getElementById('saved-profile-list'),
  activeProfileChip: document.getElementById('active-profile-chip'),
  currentApp: document.getElementById('current-app'),
  currentBrowser: document.getElementById('current-browser'),
  currentTab: document.getElementById('current-tab'),
  simulatedActions: document.getElementById('simulated-actions'),
  mouseEvents: document.getElementById('mouse-events'),
  keyboardEvents: document.getElementById('keyboard-events'),
  scrollEvents: document.getElementById('scroll-events'),
  switchEvents: document.getElementById('switch-events'),
  mouseState: document.getElementById('mouse-state'),
  mouseSubtext: document.getElementById('mouse-subtext'),
  keyboardState: document.getElementById('keyboard-state'),
  scrollState: document.getElementById('scroll-state'),
  scrollSubtext: document.getElementById('scroll-subtext'),
  browserState: document.getElementById('browser-state'),
  intensityState: document.getElementById('intensity-state'),
  settingsDefaultProfile: document.getElementById('settings-default-profile'),
  settingsBrowser: document.getElementById('settings-browser'),
  settingsIntensity: document.getElementById('settings-intensity'),
  settingsHotkey: document.getElementById('settings-hotkey'),
  settingsAutoStart: document.getElementById('settings-auto-start'),
  settingsStartMinimized: document.getElementById('settings-start-minimized'),
  settingsMonitorTargets: document.getElementById('settings-monitor-targets'),
  settingsBrowserInterval: document.getElementById('settings-browser-interval'),
  settingsTeamsInterval: document.getElementById('settings-teams-interval'),
  settingsSlackInterval: document.getElementById('settings-slack-interval'),
  settingsMousePark: document.getElementById('settings-mouse-park'),
  settingsMouseParkPosition: document.getElementById('settings-mouse-park-position'),
  settingsScrollEnabled: document.getElementById('settings-scroll-enabled'),
  settingsScrollDirection: document.getElementById('settings-scroll-direction'),
  settingsScrollTicks: document.getElementById('settings-scroll-ticks'),
  settingsSaveStatus: document.getElementById('settings-save-status'),
  profileName: document.getElementById('profile-name'),
  profileDescription: document.getElementById('profile-description'),
  profileType: document.getElementById('profile-type'),
  profileIntensity: document.getElementById('profile-intensity'),
  settingsForm: document.getElementById('settings-form'),
  profileForm: document.getElementById('profile-form'),
  permissionModal: document.getElementById('permission-modal'),
  closePermissionsBtn: document.getElementById('close-permissions-btn'),
  permissionContinueBtn: document.getElementById('permission-continue-btn'),
  newProfileBtn: document.getElementById('new-profile-btn')
};

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function setStatusStyle(status) {
  const dot = refs.statusPill.querySelector('.status-dot');
  dot.className = `status-dot ${status}`;
  refs.statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function showView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== `${viewName}-view`);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
}

function renderProfileList() {
  const renderList = (container, useClickHandler = true) => {
    container.innerHTML = profileStore.map((profile) => `
      <div class="profile-item" data-profile-id="${profile.id}">
        <div>
          <strong>${profile.name}</strong>
          <small>${profile.description}</small>
        </div>
        <span class="badge">${profile.type.split('')[0]}</span>
      </div>
    `).join('');

    if (!useClickHandler) {
      return;
    }

    container.querySelectorAll('.profile-item').forEach((item) => {
      item.addEventListener('click', () => {
        const profile = profileStore.find((entry) => entry.id === item.dataset.profileId);
        if (!profile) {
          return;
        }

        refs.profileName.value = profile.name;
        refs.profileDescription.value = profile.description;
        refs.profileType.value = profile.type;
        refs.profileIntensity.value = profile.intensity || 2;
        state.profileName = profile.name;
        showView('profiles');
      });
    });
  };

  renderList(refs.dashboardProfileList, true);
  renderList(refs.profileList, true);
}

function renderSettingsForm(settings = {}) {
  refs.settingsDefaultProfile.innerHTML = profileStore.map((profile) => `<option value="${profile.name}">${profile.name}</option>`).join('');
  refs.settingsDefaultProfile.value = settings.defaultProfile || state.profileName || 'Research';
  refs.settingsBrowser.value = settings.browser || 'Chrome';
  refs.settingsIntensity.value = settings.intensity || 2;
  refs.settingsHotkey.value = settings.emergencyHotkey || 'Ctrl+Alt+S';
  refs.settingsAutoStart.checked = Boolean(settings.autoStart);
  refs.settingsStartMinimized.checked = settings.startMinimized !== false;
  refs.settingsMonitorTargets.value = (settings.monitorTargets || ['Jira', 'Teams', 'Slack']).join('\n');
  const intervals = settings.targetIntervals || { browser: 30, teams: 30, slack: 30 };
  refs.settingsBrowserInterval.value = intervals.browser || 30;
  refs.settingsTeamsInterval.value = intervals.teams || 30;
  refs.settingsSlackInterval.value = intervals.slack || 30;
  const mouseAssist = settings.mouseAssist || {};
  refs.settingsMousePark.checked = mouseAssist.enabled !== false;
  refs.settingsMouseParkPosition.value = mouseAssist.parkPosition || 'center';
  const scrollAssist = settings.scrollAssist || {};
  refs.settingsScrollEnabled.checked = scrollAssist.enabled !== false;
  refs.settingsScrollDirection.value = scrollAssist.direction || 'down';
  refs.settingsScrollTicks.value = scrollAssist.ticks || 1;
}

async function loadSettingsForm() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      return;
    }
    const settings = await response.json();
    state.settings = settings;
    renderSettingsForm(settings);
    updateTelemetry();
  } catch (error) {
    // Keep defaults available if the local service is temporarily unavailable.
  }
}

function renderNotificationList() {
  const notifications = controller.notifications.list();
  refs.notificationCount.textContent = String(notifications.length || 0);

  refs.notificationList.innerHTML = notifications.slice(0, 5).map((item) => `
    <li>
      ${item.message}
      <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
    </li>
  `).join('');
}

function renderLog() {
  const entries = engine.activityLogger.list().slice(0, 10);
  refs.activityLog.innerHTML = entries.map((entry) => `
    <li>
      ${entry.actionType} — ${entry.result}
      <span>${new Date(entry.timestamp).toLocaleTimeString()} • ${entry.application}</span>
    </li>
  `).join('');
}

function updateTelemetry() {
  const monitor = state.monitor || {};
  const targets = state.settings.monitorTargets || ['Jira', 'Teams', 'Slack'];
  const targetIndex = targets.indexOf(monitor.target);
  const nextTarget = targets[(targetIndex + 1 + targets.length) % targets.length] || targets[0] || '—';
  const mouse = monitor.mouse || {};

  refs.activeProfileChip.textContent = state.profileName;
  refs.currentApp.textContent = monitor.target || (monitor.active ? 'Looking for first window…' : 'Monitor stopped');
  refs.currentBrowser.textContent = monitor.focusedWindow || '—';
  refs.currentTab.textContent = nextTarget;
  refs.simulatedActions.textContent = String(monitor.switchCount || 0);
  refs.mouseEvents.textContent = monitor.lastResult || 'No window checked yet';
  refs.keyboardEvents.textContent = monitor.lastSwitchAt ? new Date(monitor.lastSwitchAt).toLocaleTimeString() : '—';
  refs.scrollEvents.textContent = `${monitor.intervalSeconds || state.settings.targetIntervals?.browser || 30} sec`;
  refs.switchEvents.textContent = targets.join(' → ');
  refs.mouseState.textContent = monitor.target || (monitor.active ? 'Searching…' : 'Stopped');
  refs.keyboardState.textContent = monitor.lastResult || 'Ready';
  refs.browserState.textContent = monitor.focusedWindow || '—';
  refs.intensityState.textContent = monitor.active ? 'Running' : 'Visible';
  refs.mouseState.textContent = Number.isFinite(mouse.x) && Number.isFinite(mouse.y) ? `${mouse.x}, ${mouse.y}` : '—';
  refs.mouseSubtext.textContent = mouse.screenWidth && mouse.screenHeight
    ? `Screen ${mouse.screenWidth} × ${mouse.screenHeight}${mouse.cursorParked ? ' · parked' : ''}`
    : 'Waiting for telemetry';
  refs.scrollState.textContent = String(mouse.movementCount || 0);
  refs.scrollSubtext.textContent = mouse.sampledAt
    ? `Last sampled ${new Date(mouse.sampledAt).toLocaleTimeString()} · last scroll ${mouse.lastScrollTicks || 0} ticks`
    : 'Observed cursor changes';

  setStatusStyle(state.status);
  refs.sessionDuration.textContent = formatDuration(state.elapsedMs);
  refs.sessionState.textContent = String(monitor.switchCount || 0);
}

async function refreshStatusFromServer() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (payload.status) {
      state.status = payload.status;
      engine.status = payload.status;
      state.profileName = payload.profile || state.profileName;
      state.elapsedMs = payload.sessionDurationMs || 0;
      state.monitor = payload.monitor || state.monitor;
      state.settings = payload.settings || state.settings;
      updateTelemetry();
    }
  } catch (error) {
    // fallback to local engine state when running without the server
  }
}

async function sendAutomationCommand(action, logMessage) {
  try {
    const response = await fetch(`/api/${action}`, { method: 'POST' });
    if (!response.ok) {
      return;
    }

    await refreshStatusFromServer();
    controller.logAction('System', {
      application: 'Automation control',
      result: action === 'start' ? 'started' : action === 'pause' ? 'paused' : 'stopped',
      message: logMessage
    });
    renderLog();
    renderNotificationList();
  } catch (error) {
    // Keep the last server-confirmed status visible if the service is unavailable.
  }
}

function startAutomation() {
  return sendAutomationCommand('start', 'Ticket and message monitor started.');
}

function pauseAutomation() {
  return sendAutomationCommand('pause', 'Ticket and message monitor paused.');
}

function stopAutomation() {
  return sendAutomationCommand('stop', 'Ticket and message monitor stopped.');
}

async function saveSettings(event) {
  event.preventDefault();

  const payload = {
    defaultProfile: refs.settingsDefaultProfile.value,
    browser: refs.settingsBrowser.value,
    intensity: Number(refs.settingsIntensity.value || 2),
    emergencyHotkey: refs.settingsHotkey.value,
    autoStart: refs.settingsAutoStart.checked,
    startMinimized: refs.settingsStartMinimized.checked,
    monitorTargets: refs.settingsMonitorTargets.value.split(/\r?\n/).map((target) => target.trim()).filter(Boolean),
    targetIntervals: {
      browser: Number(refs.settingsBrowserInterval.value || 30),
      teams: Number(refs.settingsTeamsInterval.value || 30),
      slack: Number(refs.settingsSlackInterval.value || 30)
    },
    mouseAssist: {
      enabled: refs.settingsMousePark.checked,
      parkPosition: refs.settingsMouseParkPosition.value
    },
    scrollAssist: {
      enabled: refs.settingsScrollEnabled.checked,
      direction: refs.settingsScrollDirection.value,
      ticks: Number(refs.settingsScrollTicks.value || 1)
    }
  };

  refs.settingsSaveStatus.textContent = 'Saving…';
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Could not save settings.');
    }

    state.settings = result.settings;
    state.profileName = payload.defaultProfile;
    refs.settingsSaveStatus.textContent = 'Settings saved. Changes apply to the running monitor.';
    updateTelemetry();
  } catch (error) {
    refs.settingsSaveStatus.textContent = error.message;
  }
}

function saveProfile(event) {
  event.preventDefault();

  const payload = {
    id: `custom-${Date.now()}`,
    name: refs.profileName.value || 'Custom Profile',
    description: refs.profileDescription.value || 'Custom profile',
    type: refs.profileType.value || 'Custom',
    intensity: Number(refs.profileIntensity.value || 2)
  };

  profileStore.push(payload);
  renderProfileList();
  renderSettingsForm(state.settings);

  fetch('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function setupEvents() {
  refs.startBtn.addEventListener('click', startAutomation);
  refs.pauseBtn.addEventListener('click', pauseAutomation);
  refs.stopBtn.addEventListener('click', stopAutomation);

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      showView(button.dataset.view);
    });
  });

  refs.settingsForm.addEventListener('submit', saveSettings);
  refs.profileForm.addEventListener('submit', saveProfile);
  refs.newProfileBtn.addEventListener('click', () => {
    refs.profileName.value = 'New profile';
    refs.profileDescription.value = 'Create a custom activity profile';
    refs.profileType.value = 'Custom';
    refs.profileIntensity.value = 2;
  });

  refs.closePermissionsBtn.addEventListener('click', () => {
    refs.permissionModal.classList.add('hidden');
    localStorage.setItem('permission-wizard-seen', 'true');
  });

  refs.permissionContinueBtn.addEventListener('click', () => {
    refs.permissionModal.classList.add('hidden');
    localStorage.setItem('permission-wizard-seen', 'true');
  });

  document.getElementById('clear-log-btn').addEventListener('click', () => {
    engine.activityLogger.clear();
    renderLog();
  });

  document.getElementById('export-log-btn').addEventListener('click', () => {
    const logText = engine.activityLogger.export();
    const blob = new Blob([logText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'automation-log.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('mark-read-btn').addEventListener('click', () => {
    controller.notifications.clear();
    renderNotificationList();
  });
}

function boot() {
  renderProfileList();
  renderSettingsForm(state.settings);
  loadSettingsForm();
  renderNotificationList();
  renderLog();
  updateTelemetry();
  setupEvents();
  showView('dashboard');
  refreshStatusFromServer();
  window.__statusPollInterval = window.setInterval(refreshStatusFromServer, 1000);

  const wizardSeen = localStorage.getItem('permission-wizard-seen');
  if (!wizardSeen) {
    refs.permissionModal.classList.remove('hidden');
  }
}

boot();
