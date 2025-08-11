// main.js - Main application entry point
import {
    initializeState,
    setActiveFile,
    updateFileContent,
    getState,
} from './state.js';
import {
    addNewFileHandler,
    renameFileHandler,
    deleteFileHandler,
} from './fileOps.js';
import { initializeUI, setupUIEventListeners } from './ui.js';
import { setupEditorEventListeners } from './editor.js';
import {
    setupAIChatEventListeners,
    setAIChatDependencies,
} from './aiChatModule.js';

// --- Core Application Logic ---

// Function to save the content of the currently active file
function saveCurrentFile() {
    const { activeFile } = getState();
    if (!activeFile) return;

    const activePane =
        document.querySelector('.editor-pane.active') ||
        document.querySelector('.editor-pane:first-child');
    const codeElement = activePane.querySelector('.editor pre code');
    if (!codeElement) return;

    const content = codeElement.textContent;
    updateFileContent(activeFile, content);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Coder App Initializing...');

    initializeState();
    initializeUI();

    // The dependency injection is now much simpler.
    // We only need to pass a few core functions.
    // Most logic is now handled by state changes.
    setAIChatDependencies({
        initializeUI, // Still needed for AI actions
        selectFile: setActiveFile,
    });

    setupUIEventListeners({
        onNewFile: addNewFileHandler,
        onRenameFile: renameFileHandler,
        onDeleteFile: deleteFileHandler,
    });
    setupEditorEventListeners({
        onSave: saveCurrentFile,
    });
    setupAIChatEventListeners();

    console.log('Coder App Initialized.');
});
