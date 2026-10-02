(function (global) {
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  class KeyboardController {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.typingSpeed = options.typingSpeed ?? 24;
      this.delayRange = options.delayRange ?? [60, 150];
      this.allowedActions = options.allowedActions ?? ['type', 'shortcut', 'backspace', 'enter', 'escape', 'tab', 'arrow'];
      this.inputTarget = options.inputTarget ?? 'Active window';
    }

    updateInputTarget(target) {
      this.inputTarget = target;
      return this.inputTarget;
    }

    generateAction(type = 'type', text = '') {
      if (!this.enabled) {
        return { type: 'disabled', success: false };
      }

      if (!this.allowedActions.includes(type)) {
        return { type, success: false, reason: 'Action is not allowed by profile settings.' };
      }

      return {
        type,
        text,
        inputTarget: this.inputTarget,
        delay: randomBetween(this.delayRange[0], this.delayRange[1]),
        typingSpeed: this.typingSpeed,
        success: true
      };
    }

    generateShortcut(keys) {
      return {
        type: 'shortcut',
        keys,
        delay: randomBetween(this.delayRange[0], this.delayRange[1]),
        inputTarget: this.inputTarget,
        success: true
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KeyboardController };
  }

  global.KeyboardController = KeyboardController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
