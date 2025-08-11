// ui.js
import { getState, subscribe } from './state.js';
import { setupSettingsPanel } from './ui/settings.js';
import { renderFileTree } from './ui/fileTree.js';
import { renderTabs } from './ui/tabs.js';

// --- Main Render Function ---

function render() {
    const { files, openTabs, activeFile } = getState();
    renderFileTree(files, activeFile);
    renderTabs(openTabs, activeFile);
    // TODO: Render other UI parts like status bar
}

// --- Initialization ---

export function initializeUI() {
    // Initial render
    render();
    // Subscribe to future state changes
    subscribe(render);
    // Setup non-reactive UI elements
    setupSettingsPanel();
}

// TODO: Refactor these functions to be state-driven
export function updateStatusBar(_filePath) {}
export function updateCursorPositionUI(_line, _col) {}
export function updateLintStatus(_problems) {}
export function setupUIEventListeners() {}
export function showLinterPanel(_problems, _onFix) {}
