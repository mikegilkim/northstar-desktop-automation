(function (global) {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function randomChoice(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    return items[randomInt(0, items.length - 1)];
  }

  function createTiming(options = {}) {
    const {
      minimumDelay = 400,
      maximumDelay = 2500,
      movementSpeed = 220,
      actionProbability = 0.6,
      idleProbability = 0.2
    } = options;

    return {
      delay: randomBetween(minimumDelay, maximumDelay),
      movementSpeed: clamp(movementSpeed, 50, 1000),
      actionProbability: clamp(actionProbability, 0, 1),
      idleProbability: clamp(idleProbability, 0, 1),
      nextActionMs: randomBetween(minimumDelay, maximumDelay),
      idleDelayMs: randomBetween(500, 3000)
    };
  }

  const api = { clamp, randomBetween, randomInt, randomChoice, createTiming };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.Randomizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
