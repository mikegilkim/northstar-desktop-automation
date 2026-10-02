(function (global) {
  class ActivityLogger {
    constructor() {
      this.entries = [];
    }

    log(payload = {}) {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toISOString(),
        actionType: payload.actionType || 'System',
        application: payload.application || 'System',
        browser: payload.browser || 'N/A',
        tab: payload.tab || 0,
        result: payload.result || 'ok',
        profile: payload.profile || 'default',
        message: payload.message || `${payload.actionType || 'System'} activity logged.`
      };

      this.entries = [entry, ...this.entries].slice(0, 250);
      return entry;
    }

    list() {
      return [...this.entries];
    }

    clear() {
      this.entries = [];
    }

    export() {
      return JSON.stringify(this.entries, null, 2);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ActivityLogger };
  }

  global.ActivityLogger = ActivityLogger;
})(typeof globalThis !== 'undefined' ? globalThis : this);
