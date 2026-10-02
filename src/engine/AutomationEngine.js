(function (global) {
  const { MouseController } = typeof require === 'function' ? require('./MouseController') : { MouseController: global.MouseController };
  const { KeyboardController } = typeof require === 'function' ? require('./KeyboardController') : { KeyboardController: global.KeyboardController };
  const { ScrollController } = typeof require === 'function' ? require('./ScrollController') : { ScrollController: global.ScrollController };
  const { BrowserController } = typeof require === 'function' ? require('./BrowserController') : { BrowserController: global.BrowserController };
  const { WindowController } = typeof require === 'function' ? require('./WindowController') : { WindowController: global.WindowController };
  const { SafetyManager } = typeof require === 'function' ? require('./SafetyManager') : { SafetyManager: global.SafetyManager };
  const { NotificationManager } = typeof require === 'function' ? require('./NotificationManager') : { NotificationManager: global.NotificationManager };
  const { ActivityLogger } = typeof require === 'function' ? require('./ActivityLogger') : { ActivityLogger: global.ActivityLogger };

  class AutomationEngine {
    constructor(options = {}) {
      const profile = options.profile || {
        name: 'Demo Mode',
        mouse: { enabled: true, intensity: 2 },
        keyboard: { enabled: true },
        scroll: { enabled: true },
        browser: { enabled: true },
        window: { enabled: true }
      };

      this.profile = profile;
      this.simulationMode = Boolean(options.simulationMode ?? true);
      this.settings = options.settings || { browser: { defaultBrowser: 'Chrome' } };
      this.status = 'idle';
      this.startedAt = null;
      this.sessionDurationMs = 0;
      this.mouseController = new MouseController(profile.mouse || {});
      this.keyboardController = new KeyboardController(profile.keyboard || {});
      this.scrollController = new ScrollController(profile.scroll || {});
      this.browserController = new BrowserController(profile.browser || {});
      this.windowController = new WindowController(profile.window || {});
      this.safetyManager = new SafetyManager();
      this.notificationManager = new NotificationManager();
      this.activityLogger = new ActivityLogger();
      this.actionCount = 0;
    }

    registerNotification(message, level = 'info', meta = {}) {
      this.notificationManager.add(message, level, meta);
      return this.notificationManager.list()[0];
    }

    start() {
      const safetyResult = this.safetyManager.start();
      if (!safetyResult.success) {
        return safetyResult;
      }

      this.status = 'running';
      this.startedAt = Date.now();
      this.registerNotification('Automation started', 'success', { profile: this.profile.name || 'default' });
      this.activityLogger.log({ actionType: 'System', application: 'Automation', result: 'started', profile: this.profile.name || 'default' });
      return { success: true, status: this.status };
    }

    pause() {
      this.status = 'paused';
      this.safetyManager.pause();
      this.registerNotification('Automation paused', 'warning');
      return { success: true, status: this.status };
    }

    stop() {
      this.status = 'stopped';
      this.safetyManager.stop('manual');
      this.registerNotification('Automation stopped', 'info');
      return { success: true, status: this.status };
    }

    getStatus() {
      return this.status;
    }

    getStats() {
      return {
        status: this.status,
        actionCount: this.actionCount,
        browser: this.browserController.defaultBrowser,
        activeApp: this.windowController.getCurrentApp(),
        activeTab: this.browserController.tabs.find((tab) => tab.active)?.id || 0,
        sessionDurationMs: this.sessionDurationMs
      };
    }

    tick() {
      if (this.status !== 'running') {
        return { success: false, reason: 'Automation is not running.' };
      }

      const actions = [];
      const mouseAction = this.mouseController.generateMovementAction();
      if (mouseAction) {
        actions.push({ type: 'mouse', action: mouseAction });
      }

      const clickAction = this.mouseController.maybeClick();
      if (clickAction) {
        actions.push({ type: 'mouse-click', action: clickAction });
      }

      const scrollAction = this.scrollController.generateScroll();
      if (scrollAction.success) {
        actions.push({ type: 'scroll', action: scrollAction });
      }

      const keyboardAction = this.keyboardController.generateAction('type', 'Productivity check');
      if (keyboardAction.success) {
        actions.push({ type: 'keyboard', action: keyboardAction });
      }

      this.actionCount += actions.length;
      this.activityLogger.log({ actionType: 'System', application: 'Automation', result: 'simulated', profile: this.profile.name || 'default' });
      return { success: true, actions };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutomationEngine };
  }

  global.AutomationEngine = AutomationEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
