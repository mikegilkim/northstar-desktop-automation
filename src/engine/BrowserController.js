(function (global) {
  class BrowserController {
    constructor(options = {}) {
      this.enabled = options.enabled ?? true;
      this.defaultBrowser = options.defaultBrowser || 'Chrome';
      this.allowedHosts = options.allowedHosts || ['google.com', 'example.com'];
      this.maxTabs = options.maxTabs || 6;
      this.tabs = [
        { id: 1, title: 'Google', url: 'https://www.google.com', active: true },
        { id: 2, title: 'Inbox', url: 'https://example.com', active: false }
      ];
      this.activeTabId = 1;
    }

    normalizeUrl(rawUrl) {
      if (!rawUrl) {
        return 'https://www.google.com';
      }

      const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      return url;
    }

    validateHost(url) {
      try {
        const parsed = new URL(url);
        return this.allowedHosts.some((host) => parsed.hostname.includes(host));
      } catch (error) {
        return false;
      }
    }

    async navigate(url) {
      if (!this.enabled) {
        return { success: false, reason: 'Browser automation is disabled.' };
      }

      const normalized = this.normalizeUrl(url);
      if (!this.validateHost(normalized)) {
        return { success: false, reason: `Host is not permitted for browser automation: ${normalized}` };
      }

      const activeTab = this.tabs.find((tab) => tab.id === this.activeTabId) || this.tabs[0];
      const updated = { ...activeTab, url: normalized, title: 'Loaded page', active: true };
      this.tabs = this.tabs.map((tab) => (tab.id === updated.id ? updated : { ...tab, active: false }));

      return { success: true, tab: updated, browser: this.defaultBrowser };
    }

    async search(term, engine = 'https://www.google.com/search?q=') {
      if (!term) {
        return { success: false, reason: 'Search term is required.' };
      }
      const url = `${engine}${encodeURIComponent(term)}`;
      return this.navigate(url);
    }

    openTab(url = 'https://example.com') {
      if (this.tabs.length >= this.maxTabs) {
        return { success: false, reason: 'Maximum tab count reached.' };
      }
      const nextId = Math.max(0, ...this.tabs.map((tab) => tab.id)) + 1;
      const created = { id: nextId, title: 'New tab', url: this.normalizeUrl(url), active: true };
      this.tabs = this.tabs.map((tab) => ({ ...tab, active: false }));
      this.tabs.push(created);
      this.activeTabId = nextId;
      return { success: true, tab: created };
    }

    switchTab(tabIndex) {
      if (tabIndex < 0 || tabIndex >= this.tabs.length) {
        return { success: false, reason: 'Invalid tab index.' };
      }
      this.tabs = this.tabs.map((tab, index) => ({ ...tab, active: index === tabIndex }));
      this.activeTabId = this.tabs[tabIndex].id;
      return { success: true, tab: this.tabs[tabIndex] };
    }

    closeTab(tabId) {
      const nextTabs = this.tabs.filter((tab) => tab.id !== tabId);
      if (nextTabs.length === 0) {
        return { success: false, reason: 'At least one tab must remain open.' };
      }
      this.tabs = nextTabs;
      this.activeTabId = this.tabs[0].id;
      this.tabs[0].active = true;
      return { success: true, tab: this.tabs[0] };
    }

    async waitForLoad(delayMs = 750) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { success: true, delayMs };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BrowserController };
  }

  global.BrowserController = BrowserController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
