import { showAlert } from '../modal.js';
import { getState, setSetting } from '../state.js';

// --- DOM Elements ---
const settingsBtn = document.querySelector('.settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const closeSettingsBtn = document.querySelector('.close-settings');
const themeSelector = document.getElementById('theme-selector');
const fontSizeSelector = document.getElementById('font-size');
const tabSizeSelector = document.getElementById('tab-size');
const aiModeSelectEl = document.getElementById('ai-mode-select');
const aiModelSelectEl = document.getElementById('ai-model-select');

// --- Functions ---

function populateSettingsPanel() {
    const { settings } = getState();
    if (themeSelector) themeSelector.value = settings.theme;
    if (fontSizeSelector) fontSizeSelector.value = settings.fontSize;
    if (tabSizeSelector) tabSizeSelector.value = settings.tabSize;
    if (document.getElementById('gemini-api-key')) {
        document.getElementById('gemini-api-key').value = settings.apiKey;
    }
    // AI settings are not part of the state module yet, so we leave them as is.
    const savedAiMode = localStorage.getItem('coder_ai_mode') || 'ask';
    const savedAiModel =
        localStorage.getItem('coder_ai_model') || 'gemini-2.5-flash';
    if (aiModeSelectEl) aiModeSelectEl.value = savedAiMode;
    if (aiModelSelectEl) aiModelSelectEl.value = savedAiModel;
}

export function setupSettingsPanel() {
    settingsBtn.addEventListener('click', () => {
        const isHidden = settingsPanel.style.display === 'none';
        settingsPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            populateSettingsPanel();
        }
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
    });

    themeSelector.addEventListener('change', (e) => {
        setSetting('theme', e.target.value);
    });

    fontSizeSelector.addEventListener('change', (e) => {
        setSetting('fontSize', parseInt(e.target.value, 10));
    });

    tabSizeSelector.addEventListener('change', (e) => {
        setSetting('tabSize', parseInt(e.target.value, 10));
    });

    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('gemini-api-key');
    saveApiKeyBtn?.addEventListener('click', () => {
        setSetting('apiKey', apiKeyInput.value.trim());
        showAlert('API Key Saved', 'Your Gemini API key has been saved.');
    });

    // AI settings are not part of the state module yet, so we leave them as is.
    aiModeSelectEl?.addEventListener('change', (e) => {
        localStorage.setItem('coder_ai_mode', e.target.value);
    });
    aiModelSelectEl?.addEventListener('change', (e) => {
        localStorage.setItem('coder_ai_model', e.target.value);
    });
}
