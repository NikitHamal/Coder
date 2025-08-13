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
    loadSettingsToPanel,
    setUIModuleDependencies
} from './ui.js';
import {
    updateEditor,
    setupEditorEventListeners,
    applyInitialTheme,
    setEditorModuleDependencies
} from './editor.js';
import {
    setupAIChatEventListeners,
    setAIChatDependencies
} from './aiChatModule.js';
import { aiModels } from './aiModels.js';

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
export function saveCurrentFile() {
    const activeTab = document.querySelector('.tab.active');
    const activePane = document.querySelector('.editor-pane.active') || document.querySelector('.editor-pane:first-child');

    if (!activeTab || !activePane) {
        return; // No active file to save
    }

    const filePath = activeTab.getAttribute('data-path');
    const codeElement = activePane.querySelector('.editor pre code');
    if (!codeElement) {
         console.error("Save attempt failed: Could not find code element in active pane.");
         return;
    }
    const content = codeElement.textContent;

    if (filePath) {
        fileStorage.saveFile(filePath, content);
        updateStatusBar(filePath);
    } else {
        console.warn("Save attempt failed: Active tab has no file path.");
    }
}

// Function to test AI model connections
export async function testAIModelConnection(modelKey = null) {
    try {
        const result = await aiModels.testConnection(modelKey);
        if (result.success) {
            showAlert('Success', `${result.model} connection successful!`);
        } else {
            showAlert('Error', `${result.model} connection failed: ${result.error}`);
        }
    } catch (error) {
        showAlert('Error', `Failed to test connection: ${error.message}`);
    }
}

// Function to get AI model recommendations
export function getAIRecommendations(useCase) {
    return aiModels.getRecommendedModels(useCase);
}

// Function to update AI model selection
export function updateAIModel(modelKey) {
    if (aiModels.setCurrentModel(modelKey)) {
        // Update UI to reflect the change
        const modelSelect = document.querySelector('#ai-model-select');
        if (modelSelect) {
            modelSelect.value = modelKey;
        }
        
        // Show success message
        const modelInfo = aiModels.getModelInfo(modelKey);
        if (modelInfo) {
            showAlert('Success', `Switched to ${modelInfo.name}`);
        }
    } else {
        showAlert('Error', 'Invalid model selected');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Coder AI App Initializing...");

    try {
        // Initialize AI models
        await aiModels.initializeG4F();
        console.log("AI Models initialized successfully");

        // Set dependencies between modules (circular dependencies workaround)
        setEditorModuleDependencies({ saveCurrentFile });
        setUIModuleDependencies({
            selectFile,
            closeTab,
            addNewFile,
            renameFileHandler,
            deleteFileHandler,
            updateEditor,
            updateCursorPosition: (el) => import('./editor.js').then(editor => editor.updateCursorPosition(el)),
            updateTheme: (theme) => import('./editor.js').then(editor => editor.updateTheme(theme)),
            getThemeBackground: (theme) => import('./editor.js').then(editor => editor.getThemeBackground(theme))
         });

        // Set dependencies needed by aiChat.js
        setAIChatDependencies({
            initializeUI: initializeUI,
            selectFile: selectFile
        });

        // Initialize core components
        initializeFiles(); // Ensure default files exist if needed
        initializeUI(); // Setup file tree, tabs, load first file
        applyInitialTheme(); // Apply saved theme colors/styles
        applyInitialFontSize(); // Apply saved font size
        loadSettingsToPanel(); // Load settings into the panel controls initially

        // Setup event listeners
        setupUIEventListeners(); // Setup general UI clicks (add file, settings)
        setupEditorEventListeners(); // Setup editor clicks/keys/input
        setupAIChatEventListeners(); // Setup AI chat listeners

        // Setup keyboard shortcuts for AI
        setupAIKeyboardShortcuts();

        console.log("Coder AI App Initialized Successfully.");
        
        // Show welcome message
        showWelcomeMessage();
        
    } catch (error) {
        console.error("Failed to initialize Coder AI:", error);
        showAlert('Initialization Error', 'Failed to initialize the application. Please refresh the page.');
    }
});

// Setup AI-specific keyboard shortcuts
function setupAIKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl+I to focus AI input
        if (event.ctrlKey && event.key === 'i') {
            event.preventDefault();
            const aiInput = document.querySelector('.ai-input');
            if (aiInput) {
                aiInput.focus();
            }
        }
        
        // Ctrl+Enter to send AI message (when AI input is focused)
        if (event.ctrlKey && event.key === 'Enter') {
            const aiInput = document.querySelector('.ai-input');
            if (aiInput === document.activeElement) {
                event.preventDefault();
                const sendButton = document.querySelector('.send-button');
                if (sendButton && !sendButton.disabled) {
                    sendButton.click();
                }
            }
        }
    });
}

// Show welcome message and tips
function showWelcomeMessage() {
    // Add a small delay to ensure UI is fully loaded
    setTimeout(() => {
        const messagesContainer = document.querySelector('.ai-messages-container');
        if (messagesContainer) {
            const welcomeTip = document.createElement('div');
            welcomeTip.className = 'ai-message assistant-message tip-message';
            welcomeTip.innerHTML = `
                <div class="message-avatar">
                    <i class="material-icons">lightbulb</i>
                </div>
                <div class="message-content">
                    <p><strong>💡 Quick Tips:</strong></p>
                    <ul>
                        <li>Use <kbd>Ctrl+I</kbd> to quickly focus the AI input</li>
                        <li>Try different AI modes for different tasks</li>
                        <li>Switch between free AI models as needed</li>
                        <li>Use <kbd>Ctrl+Enter</kbd> to send messages quickly</li>
                    </ul>
                </div>
            `;
            messagesContainer.appendChild(welcomeTip);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, 1000);
} 