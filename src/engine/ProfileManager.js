(function (global) {
  let fs = null;
  let path = null;

  if (typeof require === 'function') {
    try {
      fs = require('node:fs');
      path = require('node:path');
    } catch (error) {
      fs = null;
      path = null;
    }
  }

  class ProfileManager {
    constructor(options = {}) {
      const { storageDir = null } = options;
      this.storageDir = storageDir;
      this.storageKey = 'automationProfiles';
      this.profiles = [];
      this.initialize();
    }

    async initialize() {
      this.profiles = await this.getAllProfiles();
    }

    async getAllProfiles() {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        const data = raw ? JSON.parse(raw) : [];
        this.profiles = Array.isArray(data) ? data : [];
        return this.profiles;
      }

      if (fs && path && this.storageDir) {
        const filePath = path.join(this.storageDir, 'profiles.json');
        try {
          await fs.promises.mkdir(this.storageDir, { recursive: true });
          const raw = await fs.promises.readFile(filePath, 'utf8');
          const data = raw ? JSON.parse(raw) : [];
          this.profiles = Array.isArray(data) ? data : [];
          return this.profiles;
        } catch (error) {
          this.profiles = [];
          return this.profiles;
        }
      }

      return this.profiles;
    }

    async persist() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.profiles));
        return this.profiles;
      }

      if (fs && path && this.storageDir) {
        await fs.promises.mkdir(this.storageDir, { recursive: true });
        const filePath = path.join(this.storageDir, 'profiles.json');
        await fs.promises.writeFile(filePath, JSON.stringify(this.profiles, null, 2), 'utf8');
      }

      return this.profiles;
    }

    async createProfile(profileData = {}) {
      const profile = {
        id: profileData.id || `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: profileData.name || 'New Profile',
        description: profileData.description || '',
        isDefault: Boolean(profileData.isDefault),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mouse: { enabled: true, intensity: 2, ...profileData.mouse },
        keyboard: { enabled: true, typingSpeed: 24, delayRange: [60, 140], ...profileData.keyboard },
        scroll: { enabled: true, speed: 600, distance: 350, direction: 'vertical', ...profileData.scroll },
        browser: { enabled: true, defaultBrowser: 'Chrome', allowedHosts: ['example.com'], ...profileData.browser },
        window: { enabled: true, allowedApps: ['Chrome', 'Slack', 'VS Code'], ...profileData.window },
        timing: { minimumDelay: 1000, maximumDelay: 4000, ...profileData.timing }
      };

      this.profiles = [...this.profiles, profile];
      await this.persist();
      return profile;
    }

    async getProfile(profileId) {
      return this.profiles.find((profile) => profile.id === profileId) || null;
    }

    async deleteProfile(profileId) {
      this.profiles = this.profiles.filter((profile) => profile.id !== profileId);
      await this.persist();
      return this.profiles;
    }

    async updateProfile(profileId, updates = {}) {
      this.profiles = this.profiles.map((profile) => {
        if (profile.id !== profileId) {
          return profile;
        }
        return { ...profile, ...updates, updatedAt: new Date().toISOString() };
      });
      await this.persist();
      return this.getProfile(profileId);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProfileManager };
  }

  global.ProfileManager = ProfileManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
