(function (global) {
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  class MouseController {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.movementSpeed = options.movementSpeed ?? 220;
      this.movementFrequency = options.movementFrequency ?? 6;
      this.clickProbability = options.clickProbability ?? 0.35;
      this.idlePeriods = options.idlePeriods ?? [600, 2600];
      this.intensity = options.intensity ?? 2;
      this.bounds = { width: options.width ?? 1920, height: options.height ?? 1080 };
    }

    getIntensityLabel() {
      const levels = ['Very low', 'Low', 'Normal', 'High', 'Very high'];
      return levels[Math.max(0, Math.min(this.intensity - 1, levels.length - 1))];
    }

    generateMovementAction() {
      const x = randomBetween(0, this.bounds.width);
      const y = randomBetween(0, this.bounds.height);
      const duration = Math.max(80, 1000 / this.movementSpeed * 9);

      return {
        type: 'move',
        x: Number(x.toFixed(0)),
        y: Number(y.toFixed(0)),
        speed: this.movementSpeed,
        duration: Number(duration.toFixed(0)),
        curve: randomInt(1, 5)
      };
    }

    maybeClick() {
      if (!this.enabled || Math.random() > this.clickProbability) {
        return null;
      }

      return {
        type: 'click',
        button: Math.random() > 0.7 ? 'right' : 'left',
        delay: randomInt(30, 220)
      };
    }

    getIdleDelay() {
      return randomInt(this.idlePeriods[0], this.idlePeriods[1]);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MouseController };
  }

  global.MouseController = MouseController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
