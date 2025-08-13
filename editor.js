// editor.js
import { fileStorage } from './fileStorage.js';
import { updateStatusBar, updateCursorPositionUI } from './ui.js'; // Import necessary UI updaters
import { showAlert } from './modal.js'; // Import alert for preview errors

// Function to be set by main.js
let saveCurrentFileFunc = () => console.warn('saveCurrentFile not set in editor.js');

export function setEditorModuleDependencies(dependencies) {
    saveCurrentFileFunc = dependencies.saveCurrentFile;
}

// --- DOM Elements ---
let editorPanes, previewButton, activePane;
let editorInitialized = false;

// Initialize editor elements when DOM is ready
function initializeEditorElements() {
    editorPanes = document.querySelectorAll('.editor-pane');
    previewButton = document.querySelector('.preview-button');
    
    // Track the active pane globally within this module
    activePane = document.querySelector('.editor-pane.active') || editorPanes[0];
    if (activePane && !activePane.classList.contains('active')) {
        activePane.classList.add('active'); // Ensure first pane is active if none are
    }
    
    editorInitialized = true;
    console.log('Editor elements initialized successfully');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEditorElements);
} else {
    // DOM is already ready
    initializeEditorElements();
}

// --- Core Editor Update ---

// Update a specific editor pane's content and highlighting
export function updateEditorPane(pane, filePath) {
    if (!pane) {
        console.error("updateEditorPane called with null or undefined pane.");
        return;
    }
    
    // Ensure elements are initialized
    if (!editorInitialized) {
        initializeEditorElements();
    }
    
    pane.dataset.filePath = filePath; // Store the path on the pane element
    const editorCodeElement = pane.querySelector('.editor pre code');
    const lineNumbersElement = pane.querySelector('.line-numbers');

    if (!editorCodeElement || !lineNumbersElement) {
        console.error("Editor code or line number element not found in pane:", pane);
        console.log("Pane HTML:", pane.innerHTML);
        return;
    }

    let language = 'plaintext';
    let content = '';

    if (filePath) {
        // Get content from storage
        content = fileStorage.getFile(filePath);
        if (content === null) {
             console.warn(`File content not found for path: ${filePath}. Displaying empty.`);
             content = ''; // Display empty if file somehow missing
        }

        // Determine language for syntax highlighting
        const fileName = filePath.split('/').pop();
        if (fileName.endsWith('.html')) language = 'html';
        else if (fileName.endsWith('.css')) language = 'css';
        else if (fileName.endsWith('.js')) language = 'javascript';
        else if (fileName.endsWith('.json')) language = 'json';
        else if (fileName.endsWith('.md')) language = 'markdown';
        // Add more languages as needed
    }

    // Update code content (use textContent for safety)
    editorCodeElement.textContent = content;

    // Update language class for highlighting
    editorCodeElement.className = `language-${language}`;

    // Apply highlighting if hljs is available
    if (typeof hljs !== 'undefined' && hljs.highlightElement) {
        // Ensure hljs doesn't add classes itself that interfere
        delete editorCodeElement.dataset.highlighted; // Remove flag if hljs sets one
        // Workaround for potential issues if hljs modifies the element structure
        try {
             hljs.highlightElement(editorCodeElement);
        } catch(e) {
            console.error("Highlight.js error:", e);
            // Optional: Restore text content if highlighting breaks significantly
            // editorCodeElement.textContent = content;
        }
    } else if (typeof hljs === 'undefined') {
        // console.warn("highlight.js not loaded."); // Inform if hljs is missing
    }

    // Update line numbers for this pane
    updateLineNumbersForPane(pane, lineNumbersElement, editorCodeElement);
}

// Update line numbers for a specific pane
function updateLineNumbersForPane(pane, lineNumbersElement, codeElement) {
    // Ensure elements exist
    if (!lineNumbersElement || !codeElement) {
         // console.warn("Line number or code element missing for pane update:", pane);
         return;
    }

    // Use textContent for accurate line count, split by newline
    const lines = codeElement.textContent.split('\n');
    // Line count is number of splits, ensure at least 1 for empty file
    const lineCount = lines.length > 0 ? lines.length : 1;

    // Generate line number fragments efficiently to avoid large innerHTML overhead
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= lineCount; i++) {
        const div = document.createElement('div');
        div.textContent = String(i);
        frag.appendChild(div);
    }
    lineNumbersElement.innerHTML = '';
    lineNumbersElement.appendChild(frag);

    // Sync scroll positions
    const editorPre = codeElement.closest('pre');
    if (editorPre) {
        editorPre.addEventListener('scroll', () => {
            lineNumbersElement.scrollTop = editorPre.scrollTop;
        });
    }
}


// Update the currently active editor pane
export function updateEditor(filePath) {
    // Ensure elements are initialized
    if (!editorInitialized) {
        initializeEditorElements();
    }
    
    if (!activePane) {
        console.error("No active editor pane found.");
        if (editorPanes && editorPanes.length > 0) {
            activePane = editorPanes[0]; // Fallback to first pane
        } else {
            console.error("No editor panes found at all.");
            return;
        }
    }

    // Handle case where no file is selected (e.g., last tab closed)
    if (!filePath) {
        console.log("No file selected. Clearing editor."); // Log info instead of warning
        // Clear the active editor pane if no file path
        updateEditorPane(activePane, null);
        updateStatusBar(null);
        updateCursorPositionUI(1, 1); // Reset cursor UI
        return;
    }

    // If filePath is valid, proceed to update the pane
    updateEditorPane(activePane, filePath);
    updateStatusBar(filePath); // Update status bar for the loaded file
    // Reset cursor pos display when loading new file
    const codeEl = activePane.querySelector('pre code');
    if(codeEl) updateCursorPosition(codeEl); 
}

// --- Editor Input Handling ---

function handleTabKey(event, codeElement) {
    event.preventDefault();
    const tabSize = parseInt(localStorage.getItem('coder_tab_size') || '4');
    const tabSpaces = ' '.repeat(tabSize);

    // Insert spaces at the cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const tabNode = document.createTextNode(tabSpaces);
    range.insertNode(tabNode);

    // Move cursor after inserted spaces
    range.setStartAfter(tabNode);
    range.setEndAfter(tabNode);
    selection.removeAllRanges();
    selection.addRange(range);

    saveCurrentFileFunc(); // Save after edit using the imported function
    const pane = event.target.closest('.editor-pane');
    updateLineNumbersForPane(pane,
                               pane.querySelector('.line-numbers'),
                               codeElement);
}


// --- Cursor Position ---

export function updateCursorPosition(editorCodeElement) {
    if (!editorCodeElement) return;

    const selection = window.getSelection();
    let lineNum = 1;
    let colNum = 1;

    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Ensure selection is within the target code element
        // Check both start and end container in case of selection across nodes
        if (editorCodeElement.contains(range.startContainer) && editorCodeElement.contains(range.endContainer)) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editorCodeElement);
            // Set end to the *start* of the selection/cursor for accurate line/col
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            const text = preCaretRange.toString();

            const lines = text.split('\n');
            lineNum = lines.length;
            // Column is the length of the last line segment + 1
            colNum = lines[lines.length - 1].length + 1;
        }
    }
    updateCursorPositionUI(lineNum, colNum); // Update display via UI module
}


// --- Theme Handling ---

export function updateTheme(theme) {
    const highlightThemeStylesheet = document.getElementById('theme-stylesheet');
    const body = document.body;
    let highlightThemeUrl;

    // Toggle body class for light/dark themes
    if (theme === 'coder-light' || theme === 'github') { // Treat github as light too
        body.classList.add('light-theme');
        // Choose a light theme for highlight.js
        highlightThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    } else {
        body.classList.remove('light-theme');
        // Use the selected dark theme for highlight.js
        // Handle potential theme name mismatches if necessary
        const validThemes = ['atom-one-dark', 'dracula', 'monokai']; // Add more valid CDN theme names
        const safeTheme = validThemes.includes(theme) ? theme : 'atom-one-dark'; // Fallback theme
        highlightThemeUrl = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${safeTheme}.min.css`;
    }

    // Update highlight.js theme stylesheet
    if (highlightThemeStylesheet) {
        highlightThemeStylesheet.href = highlightThemeUrl;
    } else {
        console.error("Theme stylesheet element not found.");
    }

    // Update editor background color based on theme
    const editorBg = getThemeBackground(theme); // Use helper function
    const lineNumBg = (theme === 'coder-light' || theme === 'github') ? '#f0f0f0' : '#21252b'; // Example background for line numbers

    document.querySelectorAll('.editor').forEach(editor => {
        editor.style.backgroundColor = editorBg;
    });
    document.querySelectorAll('.line-numbers').forEach(ln => {
        ln.style.backgroundColor = lineNumBg;
    });

    // Re-highlight content in visible panes after theme change
    editorPanes.forEach(pane => {
        // Check if pane is actually visible (might be hidden in split view)
        if (pane.offsetParent !== null) { 
            const filePath = pane.dataset.filePath;
            if (filePath) {
                // Re-apply highlighting (updateEditorPane handles this)
                updateEditorPane(pane, filePath);
            }
        }
    });
}

// Helper to get appropriate background color based on theme name
export function getThemeBackground(theme) {
    // Define background colors for your supported themes
    switch (theme) {
        case 'github':
        case 'coder-light':
            return '#ffffff'; // White background for light themes
        case 'atom-one-dark':
            return '#282c34';
        case 'dracula':
            return '#282a36';
        case 'monokai':
            return '#272822';
        // Add more cases for other themes
        default:
            return '#282c34'; // Default dark background
    }
}

// Apply the initial theme on load
export function applyInitialTheme() {
    const savedTheme = localStorage.getItem('coder_theme') || 'atom-one-dark';
    updateTheme(savedTheme);
}


// --- Preview Functionality ---

async function previewHtml(filePath) {
    if (!filePath || !filePath.endsWith('.html')) {
        showAlert('Preview Error', 'Please open and select an HTML file first.');
        return;
    }

    let htmlContent = fileStorage.getFile(filePath);
    if (htmlContent === null) {
        showAlert('Preview Error', 'Could not load file content for preview.');
        return;
    }

    // Inject a script to intercept navigation and resource loading
    const injectedScript = `
        <script>(function() {
            window.fileStorageFiles = JSON.parse(localStorage.getItem('coder_files') || '{}');
            function fetchFile(path) {
                return window.fileStorageFiles[path] || '';
            }
            function handleNav(e) {
                let t = e.target;
                while (t && t.tagName !== 'A') t = t.parentElement;
                if (t && t.tagName === 'A' && t.getAttribute('href')) {
                    const href = t.getAttribute('href');
                    if (window.fileStorageFiles[href]) {
                        e.preventDefault();
                        document.open();
                        var html = window.fileStorageFiles[href];
                        if (/<\/body>/i.test(html)) {
                            html = html.replace(/<\/body>/i, injectedScript + '</body>');
                        } else {
                            html += injectedScript;
                        }
                        document.write(html);
                        document.close();
                    }
                }
            }
            document.addEventListener('click', handleNav, true);
            // Intercept resource loading (CSS/JS/images)
            const origCreateElement = document.createElement;
            document.createElement = function(tag) {
                const el = origCreateElement.call(document, tag);
                if (tag === 'script' || tag === 'link' || tag === 'img') {
                    setTimeout(() => {
                        if (tag === 'script' && el.src && window.fileStorageFiles[el.src]) {
                            el.text = window.fileStorageFiles[el.src];
                            el.removeAttribute('src');
                        }
                        if (tag === 'link' && el.href && window.fileStorageFiles[el.href]) {
                            const style = document.createElement('style');
                            style.textContent = window.fileStorageFiles[el.href];
                            el.parentNode && el.parentNode.replaceChild(style, el);
                        }
                        if (tag === 'img' && el.src && window.fileStorageFiles[el.src]) {
                            el.src = 'data:image/*;base64,' + btoa(window.fileStorageFiles[el.src]);
                        }
                    }, 0);
                }
                return el;
            };
        })();<\/script>
    `;
    // Inject the script before </body>
    if (/<\/body>/i.test(htmlContent)) {
        htmlContent = htmlContent.replace(/<\/body>/i, injectedScript + '</body>');
    } else {
        htmlContent += injectedScript;
    }

    // Create an iframe for preview
    const previewWindow = window.open('', '_blank');
    previewWindow.document.open();
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
}

// --- Event Listeners Setup ---

export function setupEditorEventListeners() {
    editorPanes.forEach(pane => {
        const codeElement = pane.querySelector('pre code');
        const lineNumbersElement = pane.querySelector('.line-numbers');

        if (!codeElement || !lineNumbersElement) {
            console.warn("Skipping event listeners for pane due to missing elements:", pane);
            return;
        }

        // Input event: Save file and update line numbers
        codeElement.addEventListener('input', () => {
             // Only save if the input event occurred in the currently active pane
            if (pane === activePane) {
                saveCurrentFileFunc(); 
            }
            updateLineNumbersForPane(pane, lineNumbersElement, codeElement);
        });

        // Keydown event: Handle Tab key
        codeElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                handleTabKey(e, codeElement);
            }
            // Update cursor position after key press (keyup is better for final position)
        });

        // Update cursor position on click and keyup
        codeElement.addEventListener('click', () => updateCursorPosition(codeElement));
        codeElement.addEventListener('keyup', (e) => {
            // Avoid updating cursor position for non-character keys like Shift, Ctrl, Alt
            if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'Shift') {
                 updateCursorPosition(codeElement);
            }
        });
    });

     // Preview button listener
     if (previewButton) {
         previewButton.addEventListener('click', () => {
             const activeFilePath = activePane ? activePane.dataset.filePath : null;
             if (activeFilePath) {
                 previewHtml(activeFilePath);
             } else {
                 showAlert('Preview Error', 'No file is active in the editor.');
             }
         });
     } else {
         console.warn("Preview button not found.");
     }
} 