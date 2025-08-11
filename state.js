// state.js - A simple, centralized state management module.

// --- State ---
// The single source of truth for the application's state.
const state = {
    files: {}, // Example: { 'index.html': '<html>...' }
    openTabs: [], // An array of file paths
    activeFile: null, // The path of the currently active file
    settings: {
        theme: 'atom-one-dark',
        fontSize: 14,
        tabSize: 4,
        apiKey: '',
    },
};

// --- Pub/Sub System ---
// A list of callback functions to be executed when the state changes.
const subscribers = [];

/**
 * Notifies all subscribers that the state has changed.
 */
function notify() {
    // We pass a deep copy of the state to prevent direct mutation.
    const deepCopiedState = JSON.parse(JSON.stringify(state));
    subscribers.forEach(callback => callback(deepCopiedState));
}

/**
 * Subscribes a callback function to state changes.
 * @param {function} callback The function to call when the state changes.
 * @returns {function} A function to unsubscribe.
 */
export function subscribe(callback) {
    subscribers.push(callback);
    // Return an unsubscribe function
    return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
            subscribers.splice(index, 1);
        }
    };
}

import { fileStorage } from './fileStorage.js';

// --- Actions ---
// Functions that modify the state and then notify subscribers.

// --- File and Tab Actions ---

export function addFile(path, content = '') {
    if (state.files[path] !== undefined) {
        console.warn(`File already exists: ${path}`);
        return false;
    }
    state.files[path] = content;
    fileStorage.saveFile(path, content);
    setActiveFile(path); // This will also open a tab and notify
    return true;
}

export function updateFileContent(path, content) {
    if (state.files[path] === undefined) {
        console.warn(`File not found for update: ${path}`);
        return;
    }
    state.files[path] = content;
    fileStorage.saveFile(path, content);
    notify();
}

export function deleteFile(path) {
    if (state.files[path] === undefined) {
        console.warn(`File not found for delete: ${path}`);
        return;
    }
    delete state.files[path];
    state.openTabs = state.openTabs.filter((p) => p !== path);
    if (state.activeFile === path) {
        state.activeFile = state.openTabs[0] || null;
    }
    fileStorage.deleteFile(path);
    notify();
}

export function renameFile(oldPath, newPath) {
    if (state.files[oldPath] === undefined) {
        console.warn(`File not found for rename: ${oldPath}`);
        return false;
    }
    if (state.files[newPath] !== undefined) {
        console.warn(`File already exists: ${newPath}`);
        return false;
    }
    state.files[newPath] = state.files[oldPath];
    delete state.files[oldPath];
    state.openTabs = state.openTabs.map((p) => (p === oldPath ? newPath : p));
    if (state.activeFile === oldPath) {
        state.activeFile = newPath;
    }
    fileStorage.renameFile(oldPath, newPath);
    notify();
    return true;
}

export function setActiveFile(path) {
    if (path !== null && state.files[path] === undefined) {
        console.warn(`Attempted to activate non-existent file: ${path}`);
        return;
    }
    if (path !== null && !state.openTabs.includes(path)) {
        state.openTabs.push(path);
    }
    state.activeFile = path;
    notify();
}

export function closeTab(path) {
    state.openTabs = state.openTabs.filter((p) => p !== path);
    if (state.activeFile === path) {
        // If the closed tab was active, activate the next available tab or null
        const currentIndex = state.openTabs.indexOf(path); // will be -1
        const nextIndex = Math.max(0, currentIndex -1); // This logic needs review.
        state.activeFile = state.openTabs[nextIndex] || null;
    }
    notify();
}


/**
 * Updates a specific setting and persists it to localStorage.
 * @param {string} key The setting key to update.
 * @param {any} value The new value for the setting.
 */
export function setSetting(key, value) {
    if (key in state.settings) {
        state.settings[key] = value;
        localStorage.setItem(`coder_setting_${key}`, value);
        notify();
    } else {
        console.warn(`Attempted to set an unknown setting: ${key}`);
    }
}

/**
 * Initializes the state from localStorage.
 * This should be called once when the application starts.
 */
export function initializeState() {
    // Initialize settings from localStorage
    state.settings.theme = localStorage.getItem('coder_setting_theme') || 'atom-one-dark';
    state.settings.fontSize = parseInt(localStorage.getItem('coder_setting_fontSize') || '14', 10);
    state.settings.tabSize = parseInt(localStorage.getItem('coder_setting_tabSize') || '4', 10);
    state.settings.apiKey = localStorage.getItem('coder_setting_apiKey') || '';

    // Initialize files from fileStorage
    state.files = fileStorage.getFiles();
    const fileKeys = Object.keys(state.files);
    if (fileKeys.length > 0) {
        state.activeFile = fileKeys[0];
        state.openTabs = [fileKeys[0]];
    }

    console.log('Initial state loaded:', state);
    notify();
}

/**
 * Returns a snapshot of the current state.
 * @returns {object} A deep copy of the current state.
 */
export function getState() {
    return JSON.parse(JSON.stringify(state));
}
