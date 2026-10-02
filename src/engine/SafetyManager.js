(function (global) {
  class SafetyManager {
    constructor({ emergencyStopHotkey = 'Ctrl+Alt+S', maxSessionDuration = 60 * 60 * 1000 } = {}) {
      this.emergencyStopHotkey = emergencyStopHotkey;
      this.maxSessionDuration = maxSessionDuration;
      this.status = 'idle';
      this.emergencyStopped = false;
      this.sessionStartedAt = null;
      this.sessionStopReason = null;
    }

    start() {
      if (this.emergencyStopped) {
        return { success: false, message: 'Emergency stop is active until reset.' };
      }

      this.status = 'running';
      this.sessionStartedAt = Date.now();
      this.sessionStopReason = null;
      return { success: true, status: this.status };
    }

    pause() {
      if (this.status === 'stopped') {
        return { success: false, message: 'A stopped session cannot be paused.' };
      }
      this.status = 'paused';
      return { success: true, status: this.status };
    }

    resume() {
      if (this.emergencyStopped) {
        return { success: false, message: 'Emergency stop is active.' };
      }
      this.status = 'running';
      return { success: true, status: this.status };
    }

    stop(reason = 'manual') {
      this.status = 'stopped';
      this.sessionStopReason = reason;
      return { success: true, status: this.status, reason };
    }

    activateEmergencyStop() {
      this.emergencyStopped = true;
      this.status = 'stopped';
      this.sessionStopReason = 'Emergency stop activated';
      return { success: true, status: this.status, reason: this.sessionStopReason };
    }

    clearEmergencyStop() {
      this.emergencyStopped = false;
      this.status = 'idle';
      return { success: true, status: this.status };
    }

    getStatus() {
      return this.status;
    }

    isEmergencyStopped() {
      return this.emergencyStopped;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafetyManager };
  }

  global.SafetyManager = SafetyManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
