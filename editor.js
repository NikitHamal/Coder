// editor.js
import 'highlight.js/styles/atom-one-dark.css';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import { fileStorage } from './fileStorage.js';
import { updateCursorPositionUI } from './ui.js'; // Import necessary UI updaters
import { showAlert } from './modal.js'; // Import alert for preview errors

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml); // For HTML
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);

import { updateFileContent, getState } from './state.js';

// --- DOM Elements ---
const editorPanes = document.querySelectorAll('.editor-pane');
const previewButton = document.querySelector('.preview-button');

// --- Editor State ---
// Track the active pane globally within this module
let activePane =
    document.querySelector('.editor-pane.active') || editorPanes[0];
if (!activePane.classList.contains('active')) {
    activePane.classList.add('active'); // Ensure first pane is active if none are
}

// --- Core Editor Update ---

// Update a specific editor pane's content and highlighting
export function updateEditorPane(pane, filePath, content = '') {
    if (!pane) {
        console.error('updateEditorPane called with null or undefined pane.');
        return;
    }
    pane.dataset.filePath = filePath; // Store the path on the pane element
    const editorCodeElement = pane.querySelector('.editor pre code');
    const lineNumbersElement = pane.querySelector('.line-numbers');

    if (!editorCodeElement || !lineNumbersElement) {
        console.error(
            'Editor code or line number element not found in pane:',
            pane
        );
        return;
    }

    let language = 'plaintext';

    if (filePath) {
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
        } catch (e) {
            console.error('Highlight.js error:', e);
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
export function updateEditor(filePath, files) {
    if (!activePane) {
        console.error('No active editor pane found.');
        activePane = editorPanes[0]; // Fallback to first pane
        if (!activePane) return; // No panes at all?
    }

    // Handle case where no file is selected (e.g., last tab closed)
    if (!filePath) {
        console.log('No file selected. Clearing editor.'); // Log info instead of warning
        // Clear the active editor pane if no file path
        updateEditorPane(activePane, null, '');
        // updateStatusBar(null); // This should also be state-driven
        updateCursorPositionUI(1, 1); // Reset cursor UI
        return;
    }

    const content = files[filePath] || '';
    // If filePath is valid, proceed to update the pane
    updateEditorPane(activePane, filePath, content);
    // updateStatusBar(filePath); // This should also be state-driven
    // Reset cursor pos display when loading new file
    const codeEl = activePane.querySelector('pre code');
    if (codeEl) updateCursorPosition(codeEl);
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

    const { activeFile } = getState();
    if (activeFile) {
        updateFileContent(activeFile, codeElement.textContent);
    }
    const pane = event.target.closest('.editor-pane');
    updateLineNumbersForPane(
        pane,
        pane.querySelector('.line-numbers'),
        codeElement
    );
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
        if (
            editorCodeElement.contains(range.startContainer) &&
            editorCodeElement.contains(range.endContainer)
        ) {
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

import { subscribe } from './state.js';

// --- State-driven UI Updates ---

function applyFontSize(size) {
    document
        .querySelectorAll('.editor pre code, .editor pre, .line-numbers')
        .forEach((el) => {
            el.style.fontSize = `${size}px`;
        });
}

function applyTheme(theme) {
    // This function can be expanded later to dynamically import theme CSS files.
    // For now, it just handles the light/dark mode body class.
    const body = document.body;
    if (theme === 'coder-light' || theme === 'github') {
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
    }
}

// Subscribe to state changes to keep the editor UI in sync.
subscribe((newState) => {
    const { settings, activeFile, files } = newState;
    applyFontSize(settings.fontSize);
    applyTheme(settings.theme);
    updateEditor(activeFile, files);
});

// Apply initial theme is now handled by the first notification from the state.
export { applyInitialTheme };
function applyInitialTheme() {
    /* This function is now effectively handled by the state subscription,
       but we keep it here to avoid breaking the import in main.js for now.
       It will be removed in a later refactoring step. */
}

// --- Preview Functionality ---

async function previewHtml(filePath) {
    if (!filePath || !filePath.endsWith('.html')) {
        showAlert(
            'Preview Error',
            'Please open and select an HTML file first.'
        );
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
                        if (new RegExp('</body>', 'i').test(html)) {
                            html = html.replace(new RegExp('</body>', 'i'), injectedScript + '</body>');
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
        })();</script>
    `;
    // Inject the script before </body>
    if (new RegExp('</body>', 'i').test(htmlContent)) {
        htmlContent = htmlContent.replace(
            new RegExp('</body>', 'i'),
            injectedScript + '</body>'
        );
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
    editorPanes.forEach((pane) => {
        const codeElement = pane.querySelector('pre code');
        const lineNumbersElement = pane.querySelector('.line-numbers');

        if (!codeElement || !lineNumbersElement) {
            console.warn(
                'Skipping event listeners for pane due to missing elements:',
                pane
            );
            return;
        }

        // Input event: Save file and update line numbers
        codeElement.addEventListener('input', () => {
            // Only save if the input event occurred in the currently active pane
            if (pane === activePane) {
                const { activeFile } = getState();
                if (activeFile) {
                    updateFileContent(activeFile, codeElement.textContent);
                }
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
        codeElement.addEventListener('click', () =>
            updateCursorPosition(codeElement)
        );
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
            const activeFilePath = activePane
                ? activePane.dataset.filePath
                : null;
            if (activeFilePath) {
                previewHtml(activeFilePath);
            } else {
                showAlert('Preview Error', 'No file is active in the editor.');
            }
        });
    } else {
        console.warn('Preview button not found.');
    }
}
