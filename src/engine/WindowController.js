(function (global) {
  class WindowController {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.allowedApps = options.allowedApps ?? ['Chrome', 'Slack', 'VS Code', 'Terminal'];
      this.excludedApps = options.excludedApps ?? [];
      this.currentApp = options.currentApp ?? 'Chrome';
    }

    focusApplication(appName) {
      if (!this.enabled) {
        return { success: false, reason: 'Window switching is disabled.' };
      }

      if (this.excludedApps.includes(appName)) {
        return { success: false, reason: `Application is excluded from automation: ${appName}` };
      }

      this.currentApp = appName;
      return { success: true, appName };
    }

    switchWindow(appName) {
      return this.focusApplication(appName);
    }

    getCurrentApp() {
      return this.currentApp;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WindowController };
  }

  global.WindowController = WindowController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
