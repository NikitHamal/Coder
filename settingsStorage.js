// Settings Storage Utility
export class SettingsStorage {
  constructor() {
    this.storageKey = 'coder-settings';
    this.defaultSettings = {
      geminiApiKey: '',
      theme: 'atom-one-dark',
      fontSize: '14',
      tabSize: '4',
      autoSave: true,
      showLineNumbers: true,
      wordWrap: false,
      minimap: true,
      aiModel: 'gemini-2.0-flash',
      aiMode: 'ask',
      webSearchEnabled: true,
      thinkingEnabled: true
    };
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all settings exist
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...this.defaultSettings };
  }

  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  getSetting(key) {
    return this.settings[key];
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    // Dispatch custom event for other parts of the app to listen to
    window.dispatchEvent(new CustomEvent('settingChanged', { 
      detail: { key, value, allSettings: this.settings } 
    }));
  }

  getGeminiApiKey() {
    return this.settings.geminiApiKey;
  }

  setGeminiApiKey(apiKey) {
    this.setSetting('geminiApiKey', apiKey);
  }

  isGeminiApiKeySet() {
    return !!this.settings.geminiApiKey && this.settings.geminiApiKey.trim() !== '';
  }

  getAIModel() {
    return this.settings.aiModel;
  }

  setAIModel(model) {
    this.setSetting('aiModel', model);
  }

  getAIMode() {
    return this.settings.aiMode;
  }

  setAIMode(mode) {
    this.setSetting('aiMode', mode);
  }

  getTheme() {
    return this.settings.theme;
  }

  setTheme(theme) {
    this.setSetting('theme', theme);
  }

  getFontSize() {
    return this.settings.fontSize;
  }

  setFontSize(size) {
    this.setSetting('fontSize', size);
  }

  getTabSize() {
    return this.settings.tabSize;
  }

  setTabSize(size) {
    this.setSetting('tabSize', size);
  }

  getAllSettings() {
    return { ...this.settings };
  }

  resetToDefaults() {
    this.settings = { ...this.defaultSettings };
    this.saveSettings();
    window.dispatchEvent(new CustomEvent('settingsReset'));
  }

  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      // Validate imported settings
      const validSettings = {};
      for (const key in this.defaultSettings) {
        if (imported.hasOwnProperty(key)) {
          validSettings[key] = imported[key];
        } else {
          validSettings[key] = this.defaultSettings[key];
        }
      }
      this.settings = validSettings;
      this.saveSettings();
      window.dispatchEvent(new CustomEvent('settingsImported'));
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const settingsStorage = new SettingsStorage();

// Utility function to check if API key is valid format
export function isValidGeminiApiKey(apiKey) {
  // Gemini API keys are typically 39 characters long and start with "AI"
  return apiKey && apiKey.trim().length >= 30 && apiKey.trim().startsWith('AI');
}

// Utility function to mask API key for display
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
}