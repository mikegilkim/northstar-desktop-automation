(function (global) {
  class NotificationManager {
    constructor(limit = 40) {
      this.limit = limit;
      this.items = [];
    }

    add(message, level = 'info', meta = {}) {
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toISOString(),
        message,
        level,
        meta
      };

      this.items.push(item);
      if (this.items.length > this.limit) {
        this.items.shift();
      }
      return item;
    }

    list() {
      return [...this.items];
    }

    clear() {
      this.items = [];
    }

    count() {
      return this.items.length;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationManager };
  }

  global.NotificationManager = NotificationManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
