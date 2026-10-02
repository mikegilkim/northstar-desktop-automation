(function (global) {
  const { AutomationEngine } = typeof require === 'function' ? require('./AutomationEngine') : { AutomationEngine: global.AutomationEngine };
  const { NotificationManager } = typeof require === 'function' ? require('./NotificationManager') : { NotificationManager: global.NotificationManager };
  const { ActivityLogger } = typeof require === 'function' ? require('./ActivityLogger') : { ActivityLogger: global.ActivityLogger };

  class AutomationController {
    constructor(options = {}) {
      this.engine = options.engine || new AutomationEngine(options.engineOptions || {});
      this.notifications = new NotificationManager();
      this.activityLogger = new ActivityLogger();
      this.profile = options.profile || { name: 'Research' };
    }

    startAutomation() {
      const result = this.engine.start();
      if (result.success) {
        this.notifications.add('Automation started');
      }
      return result;
    }

    pauseAutomation() {
      const result = this.engine.pause();
      if (result.success) {
        this.notifications.add('Automation paused');
      }
      return result;
    }

    stopAutomation() {
      const result = this.engine.stop();
      if (result.success) {
        this.notifications.add('Automation stopped');
      }
      return result;
    }

    emergencyStop() {
      const result = this.engine.safetyManager.activateEmergencyStop();
      this.notifications.add('Emergency stop activated');
      return result;
    }

    logAction(actionType, metadata = {}) {
      return this.activityLogger.log({
        actionType,
        application: metadata.application || 'System',
        browser: metadata.browser || 'N/A',
        tab: metadata.tab || 0,
        result: metadata.result || 'ok',
        profile: this.profile.name || 'default',
        message: metadata.message || `${actionType} completed.`
      });
    }

    getStatus() {
      return this.engine.getStatus();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutomationController };
  }

  global.AutomationController = AutomationController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
