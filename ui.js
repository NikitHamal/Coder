// ui.js
import { fileStorage, initializeFiles } from './fileStorage.js'; // Import initializeFiles here
import * as fileOps from './fileOps.js'; // Add missing import
import { showPrompt, showConfirm, showAlert } from './modal.js';
// Import functions that will be defined in main.js or editor.js
// We need to ensure these are exported from their respective modules later
let selectFile, closeTab, addNewFile, renameFileHandler, deleteFileHandler; 
let updateEditor, updateCursorPosition, updateTheme, getThemeBackground;

// Function to set the imported functions once main.js and editor.js load
export function setUIModuleDependencies(dependencies) {
    selectFile = dependencies.selectFile;
    closeTab = dependencies.closeTab;
    addNewFile = dependencies.addNewFile;
    renameFileHandler = dependencies.renameFileHandler;
    deleteFileHandler = dependencies.deleteFileHandler;
    updateEditor = dependencies.updateEditor;
    updateCursorPosition = dependencies.updateCursorPosition;
    updateTheme = dependencies.updateTheme;
    getThemeBackground = dependencies.getThemeBackground;
}

// --- DOM Elements ---
const fileListContainer = document.querySelector('.file-list');
const tabsContainer = document.querySelector('.tabs-container');
const addFileBtn = document.querySelector('.add-file-btn');
const settingsBtn = document.querySelector('.settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const closeSettingsBtn = document.querySelector('.close-settings');
const themeSelector = document.getElementById('theme-selector');
const fontSizeSelector = document.getElementById('font-size');
const tabSizeSelector = document.getElementById('tab-size');
const aiModeSelectEl = document.getElementById('ai-mode-select');
const aiModelSelectEl = document.getElementById('ai-model-select');
const fileTypeStatus = document.querySelector('.file-type');
const fileSizeStatus = document.querySelector('.file-size');
const tabSizeStatus = document.querySelector('.tab-size'); // Status bar display
const lintStatus = document.querySelector('.lint-status');
const cursorPositionStatus = document.querySelector('.cursor-position');

// Action Buttons & Panels
const searchBtn = document.querySelector('.search-btn');
const searchPanel = document.querySelector('.search-panel');
const closeSearchBtn = document.querySelector('.close-search');

const downloadBtn = document.querySelector('.download-btn');

const terminalBtn = document.querySelector('.terminal-btn');
const terminalPanel = document.querySelector('.terminal-panel');
const closeTerminalBtn = document.querySelector('.close-terminal');

const splitBtn = document.querySelector('.split-btn');
const editorPanes = document.querySelectorAll('.editor-pane');

// --- File Tree ---

// Helper to build a tree object from flat path keys
function buildFileTree(files) {
    const tree = {};
    Object.keys(files).forEach(path => {
        const parts = path.split('/');
        let currentLevel = tree;
        parts.forEach((part, index) => {
            if (!part) return; // Skip empty parts (e.g., leading '/')
            if (index === parts.length - 1) {
                // It's a file
                currentLevel[part] = { _isFile: true, path: path };
            } else {
                // It's a folder
                if (!currentLevel[part]) {
                    currentLevel[part] = { _isFolder: true, children: {}, path: parts.slice(0, index + 1).join('/') };
                }
                // Ensure children object exists even if created in a previous iteration
                if (!currentLevel[part].children) {
                    currentLevel[part].children = {};
                }
                currentLevel = currentLevel[part].children;
            }
        });
    });
    return tree;
}

// Function to attach rename/delete listeners to a file element
function attachFileActionListeners(element, filePath) {
    const fileName = filePath.split('/').pop();

    element.querySelector('.rename')?.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent file selection
        if (renameFileHandler) await renameFileHandler(filePath); // Delegate to main handler
    });

    element.querySelector('.delete')?.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent file selection
       if (deleteFileHandler) await deleteFileHandler(filePath); // Delegate to main handler
    });
}


// Helper to render the file tree recursively
function renderFileTree(node, container, level) {
    Object.keys(node).sort((a, b) => {
        // Sort folders first, then alphabetically
        const nodeA = node[a];
        const nodeB = node[b];
        if (nodeA._isFolder && !nodeB._isFolder) return -1;
        if (!nodeA._isFolder && nodeB._isFolder) return 1;
        return a.localeCompare(b);
    }).forEach(key => {
        const item = node[key];
        const element = document.createElement('div');
        element.style.paddingLeft = `${level * 15}px`; // Indentation

        if (item._isFolder) {
            element.classList.add('folder-item');
            element.setAttribute('data-path', item.path); // Store folder path
            element.setAttribute('draggable', 'true');
            element.innerHTML = `
                <span class="folder-toggle"><i class="material-icons">chevron_right</i></span>
                <i class="material-icons folder-icon">folder</i>
                <span>${key}</span>
                <div class="file-actions">
                   <button class="file-action add-in-folder" title="New File"><i class="material-icons">add</i></button>
                   <button class="file-action rename-folder" title="Rename"><i class="material-icons">edit</i></button>
                   <button class="file-action delete-folder" title="Delete"><i class="material-icons">delete</i></button>
                </div>
            `;
            // Drag and drop events for folders
            element.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', item.path.endsWith('/') ? item.path : item.path + '/');
                e.stopPropagation();
            });
            element.addEventListener('dragover', e => {
                e.preventDefault();
                element.classList.add('drag-over');
            });
            element.addEventListener('dragleave', e => {
                element.classList.remove('drag-over');
            });
            element.addEventListener('drop', async e => {
                e.preventDefault();
                element.classList.remove('drag-over');
                const srcPath = e.dataTransfer.getData('text/plain');
                if (!srcPath || srcPath === item.path || srcPath === item.path + '/') return;
                const destPath = item.path.endsWith('/') ? item.path : item.path + '/';
                // Prevent moving folder into itself or its subfolders
                if (srcPath.startsWith(destPath)) return;
                // Move file or folder
                if (srcPath.endsWith('.folder')) {
                    // Should not happen, but skip
                    return;
                } else if (srcPath.endsWith('/')) {
                    // Move folder marker
                    fileOps.moveFile(srcPath + '.folder', destPath + srcPath.split('/').slice(-2, -1)[0] + '/.folder');
                    // Move all children
                    const files = fileStorage.getFiles();
                    Object.keys(files).forEach(f => {
                        if (f.startsWith(srcPath) && f !== srcPath + '.folder') {
                            const newF = destPath + srcPath.split('/').slice(-2, -1)[0] + '/' + f.slice(srcPath.length);
                            fileOps.moveFile(f, newF);
                        }
                    });
                } else {
                    // Move file
                    const fileName = srcPath.split('/').pop();
                    fileOps.moveFile(srcPath, destPath + fileName);
                }
                if (initializeUI) initializeUI();
            });
            const childrenContainer = document.createElement('div');
            childrenContainer.classList.add('folder-children');
            childrenContainer.style.display = 'none'; // Collapsed by default

            const toggleIcon = element.querySelector('.folder-toggle .material-icons');

            // Click on folder name/icon toggles expand/collapse
            element.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions')) { // Ignore action buttons
                    const isExpanded = childrenContainer.style.display === 'block';
                    childrenContainer.style.display = isExpanded ? 'none' : 'block';
                    toggleIcon.textContent = isExpanded ? 'chevron_right' : 'expand_more';
                    setActiveFileUI(item.path); // Select folder when clicked
                }
            });

            // Add File in Folder button
            element.querySelector('.add-in-folder')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newFileName = await showPrompt('New File', `Enter name for new file inside '${key}':`);
                if (newFileName && newFileName.trim() !== '') {
                   const newFilePath = `${item.path}/${newFileName.trim()}`;
                   if (addNewFile) await addNewFile(newFilePath); // Use central function
                }
            });

            // Implement Rename Folder
            element.querySelector('.rename-folder')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const oldPath = item.path.endsWith('/') ? item.path : item.path + '/';
                const oldName = key;
                const dirPath = oldPath.slice(0, -1).lastIndexOf('/') >= 0 ? oldPath.slice(0, -1).slice(0, oldPath.slice(0, -1).lastIndexOf('/') + 1) : '';
                const newName = await showPrompt('Rename Folder', `Enter new name for folder '${oldName}':`, oldName);
                if (!newName || newName.trim() === '' || newName === oldName) return;
                if (/[<>:"\\|?*]/.test(newName)) { showAlert('Error', 'Invalid folder name.'); return; }
                const newPath = dirPath + newName.trim() + '/';
                // Rename marker
                fileOps.renameFile(oldPath + '.folder', newPath + '.folder');
                // Rename all children
                const files = fileStorage.getFiles();
                Object.keys(files).forEach(f => {
                    if (f.startsWith(oldPath) && f !== oldPath + '.folder') {
                        const newF = newPath + f.slice(oldPath.length);
                        fileOps.renameFile(f, newF);
                    }
                });
                if (initializeUI) initializeUI();
                setActiveFileUI(newPath);
            });
            // Implement Delete Folder
            element.querySelector('.delete-folder')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const folderPath = item.path.endsWith('/') ? item.path : item.path + '/';
                const confirmed = await showConfirm('Delete Folder', `Delete folder '${key}' and all its contents? This cannot be undone.`);
                if (!confirmed) return;
                // Delete marker
                fileOps.deleteFolder(folderPath);
                // Delete all children
                const files = fileStorage.getFiles();
                Object.keys(files).forEach(f => {
                    if (f.startsWith(folderPath) && f !== folderPath + '.folder') {
                        fileOps.deleteFile(f);
                    }
                });
                if (initializeUI) initializeUI();
            });

            renderFileTree(item.children, childrenContainer, level + 1);
            container.appendChild(element);
            container.appendChild(childrenContainer);
        } else if (item._isFile) {
            element.classList.add('file-item');
            element.setAttribute('data-path', item.path);
            element.setAttribute('draggable', 'true');
            element.innerHTML = `
                <i class="material-icons file-icon">description</i>
                <span>${key}</span>
                <div class="file-actions">
                   <button class="file-action rename" title="Rename"><i class="material-icons">edit</i></button>
                   <button class="file-action delete" title="Delete"><i class="material-icons">delete</i></button>
                </div>
            `;
            // Drag and drop events for files
            element.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', item.path);
                e.stopPropagation();
            });
            attachFileActionListeners(element, item.path);

            element.addEventListener('click', (e) => {
                if (e.target.closest('.file-actions')) return; // Ignore clicks on buttons
                setActiveFileUI(item.path); // Use helper
                if (selectFile) selectFile(item.path); // Call central handler
            });
            container.appendChild(element);
        }
    });
}


// Set active class on file/folder item
export function setActiveFileUI(filePath) {
     document.querySelectorAll('.file-item, .folder-item').forEach(i => {
        if (i.getAttribute('data-path') === filePath) {
            i.classList.add('active');
            // Optional: Expand parent folders if needed (complex)
        } else {
            i.classList.remove('active');
        }
    });
}

// --- Tabs ---

// Create a tab element
export function createTab(filePath) {
    const tab = document.createElement('div');
    tab.classList.add('tab');
    const fileName = filePath.split('/').pop();
    tab.setAttribute('data-path', filePath);

    const tabContent = document.createElement('span');
    tabContent.textContent = fileName;
    tab.appendChild(tabContent);

    const closeBtn = document.createElement('button');
    closeBtn.classList.add('close-tab-btn');
    closeBtn.innerHTML = '<i class="material-icons">close</i>'; // Use icon
    closeBtn.title = 'Close tab';
    tab.appendChild(closeBtn);

    tab.addEventListener('click', (e) => {
        if (e.target.closest('.close-tab-btn')) return;
        setActiveTabUI(filePath);
        setActiveFileUI(filePath); // Sync file tree selection
        if (updateEditor) updateEditor(filePath); // Load content into editor
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (closeTab) closeTab(filePath); // Call central handler
    });

    return tab;
}

// Set active class on tab
export function setActiveTabUI(filePath) {
    let tabFound = false;
    document.querySelectorAll('.tab').forEach(t => {
        if (t.getAttribute('data-path') === filePath) {
            t.classList.add('active');
            tabFound = true;
        } else {
            t.classList.remove('active');
        }
    });
    return tabFound;
}

// Add a new tab or activate existing one
export function addOrActivateTab(filePath) {
    if (!setActiveTabUI(filePath)) {
        // Tab doesn't exist, create and add it
        const newTab = createTab(filePath);
        tabsContainer.appendChild(newTab);
        // Ensure it's marked active *after* adding
        // Need a slight delay or different approach if direct activation fails
        setTimeout(() => setActiveTabUI(filePath), 0); 
    }
}

// Remove tab from UI
export function removeTabUI(filePath) {
     const tabToRemove = tabsContainer.querySelector(`.tab[data-path="${filePath}"]`);
     if (tabToRemove) {
         tabToRemove.remove();
     }
}

// --- Status Bar ---

export function updateStatusBar(filePath) {
    if (!filePath) {
        fileTypeStatus.textContent = '-';
        fileSizeStatus.textContent = '-';
        cursorPositionStatus.textContent = 'Ln 1, Col 1';
        // Keep tab size and lint status potentially? Or clear them too.
        // tabSizeStatus.textContent = `Spaces: ${localStorage.getItem('coder_tab_size') || '4'}`;
        // lintStatus.textContent = '0 Problems';
        return;
    }
    const fileName = filePath.split('/').pop();

    // File Type
    if (fileName.endsWith('.html')) fileTypeStatus.textContent = 'HTML';
    else if (fileName.endsWith('.css')) fileTypeStatus.textContent = 'CSS';
    else if (fileName.endsWith('.js')) fileTypeStatus.textContent = 'JavaScript';
    else if (fileName.endsWith('.json')) fileTypeStatus.textContent = 'JSON';
    else if (fileName.endsWith('.md')) fileTypeStatus.textContent = 'Markdown';
    else fileTypeStatus.textContent = 'Text'; // More generic default

    // File Size
    const content = fileStorage.getFile(filePath) || '';
    const sizeInBytes = new Blob([content]).size;
    if (sizeInBytes < 1024) fileSizeStatus.textContent = `${sizeInBytes} B`;
    else if (sizeInBytes < 1024 * 1024) fileSizeStatus.textContent = `${(sizeInBytes / 1024).toFixed(1)} KB`;
    else fileSizeStatus.textContent = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;

    // Tab Size (reflects current setting)
    const savedTabSize = localStorage.getItem('coder_tab_size') || '4';
    tabSizeStatus.textContent = `Spaces: ${savedTabSize}`;

    // Lint Status (Simulated)
    lintStatus.textContent = '0 Problems';

    // Cursor position update is handled by editor.js listening to clicks/keys
}

// Update cursor position display only
export function updateCursorPositionUI(line, col) {
     cursorPositionStatus.textContent = `Ln ${line}, Col ${col}`;
}

export function updateLintStatus(problems) {
    if (!Array.isArray(problems) || problems.length === 0) {
        lintStatus.textContent = '0 Problems';
        lintStatus.title = '';
        return;
    }
    lintStatus.textContent = `${problems.length} Problem${problems.length > 1 ? 's' : ''}`;
    lintStatus.title = problems.map(p => `Line ${p.line}: ${p.type} - ${p.message}`).join('\n');
}

// --- Initial UI Setup ---

export function initializeUI() {
    const files = fileStorage.getFiles();
    fileListContainer.innerHTML = ''; // Clear existing list
    const tree = buildFileTree(files);
    renderFileTree(tree, fileListContainer, 0);

    // Determine the file to potentially activate (first existing or null if none)
    const fileKeys = Object.keys(files);
    const firstFile = fileKeys.length > 0 ? fileKeys[0] : null;

    // Check if any tabs exist, if not add the first file (if one exists)
    if (!tabsContainer.querySelector('.tab') && firstFile) {
        addOrActivateTab(firstFile);
    }

    // Ensure the active tab corresponds to the file tree
    const activeTab = tabsContainer.querySelector('.tab.active');
    const activeFilePath = activeTab ? activeTab.getAttribute('data-path') : firstFile;
    
    // Only activate UI elements if there is an active file path
    if (activeFilePath) {
        setActiveFileUI(activeFilePath);
        setActiveTabUI(activeFilePath);
        if (updateEditor) updateEditor(activeFilePath);
    } else {
        // Handle the case where there are no files and no active tab
        setActiveFileUI(null); // Clear file list selection
        setActiveTabUI(null); // Clear active tab state
        if (updateEditor) updateEditor(null); // Clear the editor
    }

    // Apply tab size from settings
    applyInitialTabSize(); 
}

// --- Settings Panel --- // Moved loadSettings to settings.js

export function setupSettingsPanelUI() {
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
         if (settingsPanel.style.display === 'block') {
             // Load current settings into the panel when opening
             loadSettingsToPanel(); 
         }
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
    });

    themeSelector.addEventListener('change', () => {
        const selectedTheme = themeSelector.value;
        localStorage.setItem('coder_theme', selectedTheme);
        if (updateTheme) updateTheme(selectedTheme); // Delegate to editor module
    });

    fontSizeSelector.addEventListener('change', () => {
        const selectedSize = fontSizeSelector.value;
        localStorage.setItem('coder_font_size', selectedSize);
        document.querySelectorAll('.editor pre code, .editor pre, .line-numbers').forEach(el => { // Apply to pre too for line-height consistency
             el.style.fontSize = `${selectedSize}px`;
        });
    });

    tabSizeSelector.addEventListener('change', () => {
        const selectedSize = tabSizeSelector.value;
        localStorage.setItem('coder_tab_size', selectedSize);
        // Update status bar display if a file is open
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            updateStatusBar(activeTab.getAttribute('data-path'));
        }
    });
}

// Load settings from localStorage and apply them to the UI controls in the panel
export function loadSettingsToPanel() {
    const savedTheme = localStorage.getItem('coder_theme') || localStorage.getItem('editorTheme') || 'atom-one-dark';
    const savedFontSize = localStorage.getItem('editorFontSize') || '14';
    const savedTabSize = localStorage.getItem('editorTabSize') || '4';
    const savedApiKey = localStorage.getItem('gemini-api-key') || '';
    const savedAiMode = localStorage.getItem('coder_ai_mode') || 'ask';
    const savedAiModel = localStorage.getItem('coder_ai_model') || 'gemini-2.5-flash';

    if (themeSelector) themeSelector.value = savedTheme;
    if (fontSizeSelector) fontSizeSelector.value = savedFontSize;
    if (tabSizeSelector) tabSizeSelector.value = savedTabSize;
    if (document.getElementById('gemini-api-key')) {
        document.getElementById('gemini-api-key').value = savedApiKey;
    }
    if (aiModeSelectEl) aiModeSelectEl.value = savedAiMode;
    if (aiModelSelectEl) aiModelSelectEl.value = savedAiModel;
}

// Apply initial font size from localStorage
export function applyInitialFontSize() {
    const savedFontSize = localStorage.getItem('editorFontSize') || '14';
    const editorElements = document.querySelectorAll('.editor pre code, .line-numbers');
    editorElements.forEach(el => {
        el.style.fontSize = `${savedFontSize}px`;
    });
}

// Apply initial tab size from localStorage
function applyInitialTabSize() {
    const savedTabSize = localStorage.getItem('editorTabSize') || '4';
    const editorCodeElements = document.querySelectorAll('.editor pre code');
    const tabSizeString = ' '.repeat(parseInt(savedTabSize, 10));
    
    editorCodeElements.forEach(codeEl => {
        // CSS property for tab rendering
        codeEl.style.tabSize = savedTabSize;
        codeEl.style.MozTabSize = savedTabSize; // Firefox
        // Update status bar display
        if (tabSizeStatus) {
            tabSizeStatus.textContent = `Spaces: ${savedTabSize}`;
        }
        // Note: This doesn't automatically convert existing tabs in content
        // That would require parsing and replacing content on load/save
    });
    
}

// --- Event Listeners Setup ---
export function setupUIEventListeners() {
    // Add New File Button
    addFileBtn?.addEventListener('click', async () => {
        const filePath = await showPrompt('New File', 'Enter the path/name for the new file:');
        if (filePath) {
            if (addNewFile) await addNewFile(filePath);
        }
    });

    // Settings Panel Toggle
    settingsBtn?.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
    closeSettingsBtn?.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
    });

    // Theme Selector
    themeSelector?.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        if (updateTheme) updateTheme(newTheme);
        localStorage.setItem('editorTheme', newTheme);
        localStorage.setItem('coder_theme', newTheme);
         // Maybe close settings panel after selection?
         // settingsPanel.style.display = 'none';
    });

    // Font Size Selector
    fontSizeSelector?.addEventListener('change', (e) => {
        const newSize = e.target.value;
        const editorElements = document.querySelectorAll('.editor pre code, .line-numbers');
        editorElements.forEach(el => {
            el.style.fontSize = `${newSize}px`;
        });
        localStorage.setItem('editorFontSize', newSize);
    });

    // Tab Size Selector
    tabSizeSelector?.addEventListener('change', (e) => {
        const newSize = e.target.value;
        const editorCodeElements = document.querySelectorAll('.editor pre code');
        editorCodeElements.forEach(codeEl => {
            codeEl.style.tabSize = newSize;
            codeEl.style.MozTabSize = newSize; // Firefox
        });
         if (tabSizeStatus) {
             tabSizeStatus.textContent = `Spaces: ${newSize}`;
         }
        localStorage.setItem('editorTabSize', newSize);
         applyInitialTabSize(); // Re-apply to ensure consistency if needed
    });

    // Persist AI mode/model
    aiModeSelectEl?.addEventListener('change', (e) => {
        localStorage.setItem('coder_ai_mode', e.target.value);
    });
    aiModelSelectEl?.addEventListener('change', (e) => {
        localStorage.setItem('coder_ai_model', e.target.value);
    });

    // --- Action Button Listeners ---

    // Search Panel Toggle
    searchBtn?.addEventListener('click', () => {
        searchPanel.style.display = searchPanel.style.display === 'none' ? 'block' : 'none';
        if (searchPanel.style.display === 'block') {
            searchPanel.querySelector('.search-input')?.focus();
        }
    });
    closeSearchBtn?.addEventListener('click', () => {
        searchPanel.style.display = 'none';
    });

    // Terminal Panel Toggle
    terminalBtn?.addEventListener('click', () => {
        terminalPanel.style.display = terminalPanel.style.display === 'none' ? 'block' : 'none';
        if (terminalPanel.style.display === 'block') {
            terminalPanel.querySelector('.terminal-input')?.focus();
        }
    });
    closeTerminalBtn?.addEventListener('click', () => {
        terminalPanel.style.display = 'none';
    });

    // Download Button (Placeholder)
    downloadBtn?.addEventListener('click', () => {
        // TODO: Implement file download logic
        // 1. Get active file path from active tab
        // 2. Get content using fileStorage.getFile(filePath)
        // 3. Create a Blob
        // 4. Create an object URL
        // 5. Create a link element, set href and download attributes
        // 6. Click the link
        // 7. Revoke object URL
        showAlert('Not Implemented', 'File download is not yet implemented.');
    });

    // Split Editor Button (Placeholder)
    splitBtn?.addEventListener('click', () => {
        // TODO: Implement editor split logic
        // 1. Find the second editor pane
        // 2. Toggle its display style
        // 3. Adjust layout/flex properties of .editor-container if needed
        // 4. Handle content syncing or loading different files (more complex)
        showAlert('Not Implemented', 'Split editor view is not yet implemented.');
    });

    // --- End Action Button Listeners ---

    // Gemini API Key Settings
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const toggleApiKeyVisibilityBtn = document.getElementById('toggle-api-key-visibility');

    saveApiKeyBtn?.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('gemini-api-key', apiKey);
            showAlert('API Key Saved', 'Your Gemini API key has been saved locally.');
            // Reload the Gemini module to use the new key
            import('../gemini.js').then(module => {
                module.gemini.apiKey = apiKey;
            });
        } else {
            showAlert('API Key Cleared', 'Your Gemini API key has been cleared.', 'warning');
            localStorage.removeItem('gemini-api-key');
        }
    });

    toggleApiKeyVisibilityBtn?.addEventListener('click', () => {
        const icon = toggleApiKeyVisibilityBtn.querySelector('i');
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.textContent = 'visibility';
        } else {
            apiKeyInput.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });
}

const linterPanel = document.getElementById('linter-panel');
const linterList = document.getElementById('linter-list');
const linterFixBtn = document.getElementById('linter-fix-btn');
const linterCloseBtn = document.getElementById('linter-close-btn');
const lintStatusEl = document.querySelector('.lint-status');

export function showLinterPanel(problems, onFix) {
    if (!linterPanel || !linterList) return;
    if (!problems || problems.length === 0) {
        linterPanel.style.display = 'none';
        return;
    }
    linterList.innerHTML = '';
    let allFixable = problems.every(p => p.type === 'warning' && p.message === 'Missing semicolon');
    linterFixBtn.style.display = allFixable ? '' : 'none';
    problems.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="lint-icon ${p.type}">${p.type === 'error' ? '⛔' : '⚠️'}</span> Line ${p.line}: <span class="lint-type ${p.type}">${p.type}</span> - <span class="lint-msg">${p.message}</span>`;
        linterList.appendChild(li);
    });
    linterPanel.style.display = 'block';
    linterFixBtn.onclick = () => { if (onFix) onFix(); };
    linterCloseBtn.onclick = () => { linterPanel.style.display = 'none'; };
}

if (lintStatusEl) {
    lintStatusEl.onclick = () => {
        if (linterPanel.style.display === 'block') {
            linterPanel.style.display = 'none';
        } else if (linterList.childElementCount > 0) {
            linterPanel.style.display = 'block';
        }
    };
} 