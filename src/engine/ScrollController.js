(function (global) {
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  class ScrollController {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.speed = options.speed ?? 600;
      this.distance = options.distance ?? 250;
      this.direction = options.direction ?? 'vertical';
      this.scrollFrequency = options.scrollFrequency ?? 4;
    }

    generateScroll() {
      if (!this.enabled) {
        return { success: false, reason: 'Scroll simulation is disabled.' };
      }

      const direction = Math.random() > 0.5 ? 'down' : 'up';
      const amount = randomBetween(80, this.distance);
      return {
        success: true,
        type: 'scroll',
        direction,
        distance: Number(amount.toFixed(0)),
        speed: this.speed,
        axis: this.direction === 'horizontal' ? 'horizontal' : 'vertical'
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScrollController };
  }

  global.ScrollController = ScrollController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
