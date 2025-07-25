// main.js - Main application entry point
import { fileStorage, initializeFiles } from './fileStorage.js';
import * as fileOps from './fileOps.js';
import { showPrompt, showConfirm, showAlert } from './modal.js';
import {
    initializeUI,
    setActiveFileUI,
    addOrActivateTab,
    removeTabUI,
    setActiveTabUI,
    updateStatusBar,
    setupUIEventListeners,
    applyInitialFontSize,
    loadSettingsToPanel, // Renamed from loadSettings in ui.js
    setUIModuleDependencies
} from './ui.js';
import {
    updateEditor,
    setupEditorEventListeners,
    applyInitialTheme,
    setEditorModuleDependencies
} from './editor.js';
// Import AI chat functionality from the new module
import {
    setupAIChatEventListeners,
    setAIChatDependencies
} from './aiChatModule.js';

// --- Core Application Logic ---

// Function to select a file (called by UI tree/tab clicks)
export function selectFile(filePath) {
    addOrActivateTab(filePath); // Ensure tab exists and is active
    setActiveFileUI(filePath); // Ensure file tree item is active
    updateEditor(filePath);    // Load content into editor
}

// Function to close a tab (called by UI tab close button)
export function closeTab(filePath) {
    const tabs = document.querySelectorAll('.tab');
    const tabsContainer = document.querySelector('.tabs-container');
    let tabToRemove = tabsContainer.querySelector(`.tab[data-path="${filePath}"]`);
    let activatePath = null;

    if (!tabToRemove) return; // Tab not found

    const wasActive = tabToRemove.classList.contains('active');
    const currentIndex = Array.from(tabs).indexOf(tabToRemove);

    removeTabUI(filePath); // Remove from UI

    // If the closed tab was active, activate another one
    if (wasActive) {
        const remainingTabs = tabsContainer.querySelectorAll('.tab'); // Get updated list
        if (remainingTabs.length > 0) {
            // Try to activate previous tab, otherwise the next (which is now at currentIndex)
            const indexToActivate = Math.max(0, currentIndex - 1);
             if (remainingTabs[indexToActivate]) {
                 activatePath = remainingTabs[indexToActivate].getAttribute('data-path');
             }
        }

        if (activatePath) {
             setActiveTabUI(activatePath);
             setActiveFileUI(activatePath);
             updateEditor(activatePath);
        } else {
            // No other tabs left, clear the editor
            updateEditor(null);
            setActiveFileUI(null); // Clear file selection too
        }
    }
}


// Function to handle adding a new file
export async function addNewFile(filePath) {
    if (!filePath || !filePath.trim()) {
        showAlert('Error', 'File path cannot be empty.');
        return;
    }
    filePath = filePath.trim();
    const result = await fileOps.createFile(filePath);
    if (!result.success) {
        showAlert('Error', result.error);
        return;
    }
    initializeUI();
    selectFile(filePath);
}

// Function to handle renaming a file (called by UI action)
export async function renameFileHandler(oldPath) {
    const oldName = oldPath.split('/').pop();
    const dirPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newName = await showPrompt('Rename File', `Enter new name for ${oldName}:`, oldName);
    if (newName && newName.trim() !== '' && newName !== oldName) {
        const newPath = dirPath ? `${dirPath}/${newName.trim()}` : newName.trim();
        const result = fileOps.renameFile(oldPath, newPath);
        if (!result.success) {
            showAlert('Error', result.error);
            return;
        }
        closeTab(oldPath);
        initializeUI();
        selectFile(newPath);
    }
}

// Function to handle deleting a file (called by UI action)
export async function deleteFileHandler(filePath) {
    const fileName = filePath.split('/').pop();
    const confirmed = await showConfirm('Delete File', `Are you sure you want to delete "${fileName}"? This cannot be undone.`);
    if (confirmed) {
        const result = fileOps.deleteFile(filePath);
        if (!result.success) {
            showAlert('Error', result.error);
            return;
        }
        closeTab(filePath);
        initializeUI();
    }
}


// Function to save the content of the currently active file
// Needs to be exported so editor.js can call it on input
export function saveCurrentFile() {
    const activeTab = document.querySelector('.tab.active');
    const activePane = document.querySelector('.editor-pane.active') || document.querySelector('.editor-pane:first-child'); // Ensure we get the active pane

    if (!activeTab || !activePane) {
        // console.warn("Save attempt failed: No active tab or pane found.");
        return; // No active file to save
    }

    const filePath = activeTab.getAttribute('data-path');
    // Get content directly from the contenteditable element
    const codeElement = activePane.querySelector('.editor pre code');
    if (!codeElement) {
         console.error("Save attempt failed: Could not find code element in active pane.");
         return;
    }
    const content = codeElement.textContent;

    if (filePath) {
        fileStorage.saveFile(filePath, content);
        // Optionally update status bar size indicator immediately
        updateStatusBar(filePath);
    } else {
        console.warn("Save attempt failed: Active tab has no file path.");
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Coder App Initializing...");

    // Set dependencies between modules (circular dependencies workaround)
    setEditorModuleDependencies({ saveCurrentFile });
    setUIModuleDependencies({
        selectFile,
        closeTab,
        addNewFile,
        renameFileHandler,
        deleteFileHandler,
        // Pass editor functions needed by UI
        updateEditor,
        updateCursorPosition: (el) => import('./editor.js').then(editor => editor.updateCursorPosition(el)), // Lazy load for cursor pos
        updateTheme: (theme) => import('./editor.js').then(editor => editor.updateTheme(theme)),
        getThemeBackground: (theme) => import('./editor.js').then(editor => editor.getThemeBackground(theme))
     });
    // Set dependencies needed by aiChat.js
    // Pass initializeUI (imported from ui.js) and selectFile (defined here)
    setAIChatDependencies({
        initializeUI: initializeUI,
        selectFile: selectFile
    });


    initializeFiles(); // Ensure default files exist if needed
    initializeUI(); // Setup file tree, tabs, load first file
    applyInitialTheme(); // Apply saved theme colors/styles
    applyInitialFontSize(); // Apply saved font size
    loadSettingsToPanel(); // Load settings into the panel controls initially

    setupUIEventListeners(); // Setup general UI clicks (add file, settings)
    setupEditorEventListeners(); // Setup editor clicks/keys/input
    setupAIChatEventListeners(); // Setup AI chat listeners from the new module

    console.log("Coder App Initialized.");
}); 