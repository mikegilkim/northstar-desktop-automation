(function (global) {
  class PermissionManager {
    constructor() {
      this.capabilities = {
        accessibility: { enabled: true, description: 'Allows safe input simulation to be routed to the correct app with explicit user approval.' },
        browserAutomation: { enabled: true, description: 'Enables simulated browser activity in the configured browser.' },
        windowManagement: { enabled: true, description: 'Allows window switching only for approved applications.' }
      };
    }

    updateCapability(name, enabled) {
      if (!this.capabilities[name]) {
        return { success: false, reason: 'Unknown capability.' };
      }

      this.capabilities[name].enabled = enabled;
      return { success: true, capability: { name, enabled } };
    }

    getStatus() {
      return Object.fromEntries(Object.entries(this.capabilities).map(([key, value]) => [key, value.enabled]));
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PermissionManager };
  }

  global.PermissionManager = PermissionManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
