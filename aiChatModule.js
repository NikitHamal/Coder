//
import { fileStorage } from './fileStorage.js';
import { showPrompt, showConfirm, showAlert } from './modal.js';
import { gatherContext } from './codebaseContext.js'; // Import the new context gatherer
// We need marked.js, assuming it's globally available via the script tag in index.html
// import { marked } from 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'; // Or adjust path if local

// Import agentic action handling
import { handleAgenticActions, setAgentActionDependencies } from './agentActions.js';

// Functions to be imported from main.js (via dependency injection)
let initializeUI, selectFile;

export function setAIChatDependencies(dependencies) {
    initializeUI = dependencies.initializeUI;
    selectFile = dependencies.selectFile;
    // Pass dependencies down to the agentActions module
    // We need to pass the internal addMessageToUI function as well
    setAgentActionDependencies({ initializeUI, selectFile, addMessageToUI });
}


// --- AI Chat State ---
let currentChatId = null;
let conversationHistory = []; // Stores { role: 'user' | 'assistant', content: '...' }
let currentAssistantMessageDiv = null; // Reference to the current assistant message UI element


// Add message to UI (Internal function for now)
function addMessageToUI(role, content) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (!messagesContainer) return null;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('ai-message');
    const paragraph = document.createElement('p');
    paragraph.textContent = content; // Use textContent for basic user messages

    if (role === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.appendChild(paragraph);
    } else {
        messageDiv.classList.add('assistant-message');
        // Assistant messages will have complex structure added later
        messageDiv.innerHTML = `
            <div class="message-extras">
                <div class="planning-section" style="display: none;">
                    <button class="toggle-planning">Show Planning</button>
                    <div class="planning-content" style="display: none;"></div>
                </div>
                <div class="web-search-results" style="display: none;">
                    <h4>Web Search Results:</h4>
                    <ul></ul>
                </div>
            </div>
            <div class="main-message-content"></div>
        `;
        messageDiv.querySelector('.main-message-content').appendChild(paragraph);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
}

// Update specific parts of an assistant message bubble (Internal)
function updateAssistantMessageUI(messageDiv, { planning, webResults, finalContent }) {
     if (!messageDiv || typeof marked === 'undefined') {
         if (!messageDiv) console.error("updateAssistantMessageUI called with null messageDiv");
         if (typeof marked === 'undefined') console.error("marked.js is not available");
         return;
     }

    const planningSection = messageDiv.querySelector('.planning-section');
    const planningContent = messageDiv.querySelector('.planning-content');
    const toggleButton = messageDiv.querySelector('.toggle-planning');
    const webResultsSection = messageDiv.querySelector('.web-search-results');
    const webResultsList = webResultsSection?.querySelector('ul'); // Add safe navigation
    const mainContent = messageDiv.querySelector('.main-message-content');

    // Validate elements before proceeding
    if (!planningSection || !planningContent || !toggleButton || !webResultsSection || !webResultsList || !mainContent) {
        console.error("One or more UI elements missing in assistant message structure.");
        return;
    }

    // Update Planning
    if (planning) {
        planningContent.innerHTML = marked.parse(planning);
        planningSection.style.display = 'block';
        planningContent.style.display = 'none'; // Always start with planning hidden
        toggleButton.textContent = 'Show Planning'; // Default to "Show Planning"
        toggleButton.onclick = () => {
            const isHidden = planningContent.style.display === 'none';
            planningContent.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Hide Planning' : 'Show Planning';
        };
    } else {
        planningSection.style.display = 'none';
    }

    // Update Web Results
    if (webResults && webResults.length > 0) {
        webResultsList.innerHTML = ''; // Clear previous results
        webResults.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${result.url}" target="_blank" title="${result.snippet || ''}">${result.title || result.url}</a> ${result.date || ''}`;
            webResultsList.appendChild(li);
        });
        webResultsSection.style.display = 'block';
    } else {
        webResultsSection.style.display = 'none';
    }

    // Update Main Content
    if (finalContent) {
        try {
            mainContent.innerHTML = marked.parse(finalContent);
        } catch (e) {
             console.error("Error parsing Markdown:", e);
             mainContent.textContent = finalContent; // Fallback to text content
        }
    } else {
         // Ensure content is cleared if finalContent is null/empty
         mainContent.innerHTML = '';
    }
}

// Handle sending a message to the AI (Internal)
async function sendChatMessage() {
    const inputElement = document.querySelector('.ai-input');
    const modeSelectElement = document.getElementById('ai-mode-select');
    const modelSelectElement = document.getElementById('ai-model-select');
    // Get active editor pane to fetch current file content
    const activePane = document.querySelector('.editor-pane.active') || document.querySelector('.editor-pane:first-child');

    if (!inputElement || !modeSelectElement || !modelSelectElement) {
        console.error("AI input, mode selector, or model selector not found.");
        return;
    }
    let message = inputElement.value.trim();
    const selectedMode = modeSelectElement.value;
    const selectedModelId = modelSelectElement.value;

    if (!message) return;

    const isWebSearchEnabled = message.includes('@web');
    const isThinkingEnabled = message.includes('@think');
    const displayMessage = message.replace(/@web|@think/g, '').trim();
    const messageToSend = displayMessage;

    if (!messageToSend) return;

    addMessageToUI('user', displayMessage);
    conversationHistory.push({ role: 'user', content: messageToSend });
    inputElement.value = '';
    currentAssistantMessageDiv = addMessageToUI('assistant', 'Thinking...');

    // --- Gather Context for Write Mode using codebaseContext.js ---
    let workspaceContext = null;
    if (selectedMode === 'write') {
        const activeFilePath = activePane?.dataset.filePath || null;
        let activeFileContent = null;
        if (activeFilePath && activePane) {
            const codeElement = activePane.querySelector('.editor pre code');
            if (codeElement) {
                activeFileContent = codeElement.textContent;
            } else {
                console.warn(`Could not find code element in active pane for path: ${activeFilePath}`);
            }
        }
        // Use the new module to gather context
        workspaceContext = gatherContext(activeFilePath, activeFileContent);
    }
    // --- End Context Gathering ---

    try {
        if (!currentChatId) {
            const response = await fetch('/api/qwen/new-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageToSend,
                    isWebSearchEnabled: isWebSearchEnabled,
                    isThinkingEnabled: isThinkingEnabled,
                    mode: selectedMode,
                    modelId: selectedModelId,
                    workspaceContext: workspaceContext // Send context gathered by the module
                }),
            });
            if (!response.ok) throw new Error(`Failed to create new chat: ${await response.text()}`);
            const chatData = await response.json();
            currentChatId = chatData.chatId;
            if (!currentChatId) throw new Error('Backend did not return a chatId.');
            // Pass workspaceContext and selectedModelId to fetchChatCompletions
            await fetchChatCompletions(messageToSend, currentChatId, isWebSearchEnabled, isThinkingEnabled, currentAssistantMessageDiv, selectedMode, selectedModelId, workspaceContext);
        } else {
             // Pass workspaceContext and selectedModelId to fetchChatCompletions
            await fetchChatCompletions(messageToSend, currentChatId, isWebSearchEnabled, isThinkingEnabled, currentAssistantMessageDiv, selectedMode, selectedModelId, workspaceContext);
        }
    } catch (error) {
        console.error('Error communicating with AI backend:', error);
        if (currentAssistantMessageDiv) {
            updateAssistantMessageUI(currentAssistantMessageDiv, { finalContent: `Error: ${error.message}` });
            currentAssistantMessageDiv.classList.add('error-message');
        }
        currentAssistantMessageDiv = null;
    }
}

// Function to handle the streaming chat completion (Internal)
// Add workspaceContext and modelId parameter here
async function fetchChatCompletions(message, chatId, isWebSearchEnabled, isThinkingEnabled, assistantMessageDiv, mode, modelId, workspaceContext) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (assistantMessageDiv) {
        const mainContent = assistantMessageDiv.querySelector('.main-message-content');
        if (mainContent) mainContent.textContent = '';
    }

    const response = await fetch('/api/qwen/chat-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            chatId: chatId,
            previousMessages: conversationHistory.slice(0, -1),
            isWebSearchEnabled: isWebSearchEnabled,
            isThinkingEnabled: isThinkingEnabled,
            mode: mode,
            modelId: modelId,
            workspaceContext: workspaceContext // Send context gathered earlier
        }),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Failed to get chat completion: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponseContent = '';
    let thinkingContent = '';
    let webSearchResults = [];
    let insideThinkTag = false;
    let jsonBuffer = ''; // Buffer for accumulating JSON data

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const dataStr = line.substring(5).trim();
                    if (dataStr === '[DONE]') { reader.cancel(); break; }
                    if (dataStr === '[ERROR]') {
                        fullResponseContent += '\n\nError from server.';
                        if (assistantMessageDiv) assistantMessageDiv.classList.add('error-message');
                        jsonBuffer = ''; // Clear buffer on error
                        reader.cancel();
                        break;
                    }

                    // Append the data chunk to the buffer
                    jsonBuffer += dataStr;

                    try {
                        // Try parsing the accumulated buffer
                        const jsonData = JSON.parse(jsonBuffer);

                        // If parse succeeds, clear the buffer and process the data
                        jsonBuffer = '';

                        const delta = jsonData?.choices?.[0]?.delta || jsonData?.output?.choices?.[0]?.message;
                        const functionCall = delta?.function_call;
                        const functionInfo = delta?.extra?.web_search_info;

                        if (functionCall?.name === 'web_search') { /* Ignore */ }
                        else if (delta?.role === 'function' && delta?.name === 'web_search' && functionInfo) {
                            webSearchResults = functionInfo;
                            updateAssistantMessageUI(assistantMessageDiv, { webResults: webSearchResults });
                        } else if (delta?.role === 'assistant' && delta?.content) {
                            const content = delta.content;

                            // Improved think tag handling
                            if (content.includes('<think>')) {
                                insideThinkTag = true;
                                const parts = content.split('<think>');
                                if (parts[0]) fullResponseContent += parts[0];
                                if (parts[1]) thinkingContent += parts[1];
                            }
                            else if (content.includes('</think>')) {
                                insideThinkTag = false;
                                const parts = content.split('</think>');
                                if (parts[0]) thinkingContent += parts[0];
                                if (parts[1]) fullResponseContent += parts[1];
                            }
                            else if (insideThinkTag) {
                                thinkingContent += content;
                            }
                            else {
                                fullResponseContent += content;
                            }

                            updateAssistantMessageUI(assistantMessageDiv, {
                                planning: thinkingContent ? thinkingContent.trim() : null,
                                webResults: webSearchResults,
                                finalContent: fullResponseContent // Display accumulated content
                            });
                            if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        // Check if the error is specifically an incomplete JSON syntax error
                        if (e instanceof SyntaxError) {
                            // Incomplete JSON, wait for more data. Log modestly.
                            // console.log('Incomplete JSON detected, accumulating...');
                        } else {
                            // A different error occurred during parsing or processing
                            console.error('[fetchChatCompletions] Error processing JSON data:', e, 'Buffer content:', jsonBuffer);
                            // Clear the buffer to prevent potential infinite loops with malformed data
                            jsonBuffer = '';
                        }
                    }
                }
            }
            if (reader.reason) break; // Exit outer loop if cancelled
        }
    } finally {
        // Ensure stream is properly handled even if errors occur during processing
         if (!reader.closed) {
            reader.cancel().catch(e => console.warn("Error cancelling reader:", e));
         }
    }

    const finalTrimmedContent = fullResponseContent.trim();
    let agenticActions = null;
    let explanation = finalTrimmedContent;

    // --- Debugging Action Execution ---
    // REMOVED: console.log('[fetchChatCompletions] Mode:', mode);
    // REMOVED: console.log('[fetchChatCompletions] Final content received:', finalTrimmedContent);
    // --- End Debugging ---

    const jsonFenceStart = '```json\n';
    const jsonFenceEnd = '\n```';
    let potentialJson = null;

    if (mode === 'write' && finalTrimmedContent.startsWith(jsonFenceStart) && finalTrimmedContent.endsWith(jsonFenceEnd)) {
        // REMOVED: console.log('[fetchChatCompletions] Detected JSON fence wrapper.');
        potentialJson = finalTrimmedContent.substring(jsonFenceStart.length, finalTrimmedContent.length - jsonFenceEnd.length);
        // REMOVED: console.log('[fetchChatCompletions] Extracted potential JSON:', potentialJson);

        // REMOVED: console.log('[fetchChatCompletions] Attempting to parse extracted JSON...');
        try {
            const parsedResponse = JSON.parse(potentialJson);
            // REMOVED: console.log('[fetchChatCompletions] JSON parsed successfully.');

            // Show the raw JSON block to the user for transparency
            const debugContent = "```json\n" + JSON.stringify(parsedResponse, null, 2) + "\n```\n\n";

            if (parsedResponse && Array.isArray(parsedResponse.actions) && typeof parsedResponse.explanation === 'string') {
                agenticActions = parsedResponse.actions;
                explanation = parsedResponse.explanation;
                // REMOVED: console.log('[fetchChatCompletions] Successfully parsed actions. agenticActions set.');
            } else {
                explanation = debugContent + "⚠️ Error: The response format does not match expected structure. Please try again.";
                console.warn('[fetchChatCompletions] Parsed JSON structure mismatch.');
            }
        } catch (e) {
            // Keep the raw content display in case of parsing errors
            explanation = "⚠️ Error: Could not parse the AI response as valid JSON. Please try again.\nRaw content was:\n" + finalTrimmedContent;
            console.error('[fetchChatCompletions] JSON parsing error:', e);
            potentialJson = null; // Ensure parsing failure doesn't proceed
        }
    } else {
        // REMOVED: console.log('[fetchChatCompletions] Did not detect JSON fence wrapper or not in write mode.');
        // If not wrapped, but still might be JSON (though less likely now)
        if (mode === 'write' && finalTrimmedContent.startsWith('{') && finalTrimmedContent.endsWith('}')) {
            console.warn('[fetchChatCompletions] Content looked like JSON but was not wrapped in fences. Attempting parse anyway.')
            potentialJson = finalTrimmedContent;
            try {
                 const parsedResponse = JSON.parse(potentialJson);
                 // Simplified handling if direct JSON is ever sent
                 if (parsedResponse && Array.isArray(parsedResponse.actions) && typeof parsedResponse.explanation === 'string') {
                     agenticActions = parsedResponse.actions;
                     // Use only the explanation, hide the raw JSON
                     explanation = parsedResponse.explanation;
                     // REMOVED: console.log('[fetchChatCompletions] Successfully parsed UNWRAPPED actions.');
                 } else {
                      explanation = "⚠️ Warning: Received unwrapped JSON with unexpected structure.";
                 }
            } catch (e) {
                 explanation = "⚠️ Error: Failed to parse unwrapped JSON-like content.";
                 console.error('[fetchChatCompletions] Error parsing unwrapped JSON:', e);
            }
        }
    }

    updateAssistantMessageUI(assistantMessageDiv, {
        planning: thinkingContent ? thinkingContent.trim() : null,
        webResults: webSearchResults,
        finalContent: explanation
    });

    // --- Debugging Action Execution ---
    // REMOVED: console.log('[fetchChatCompletions] Value of agenticActions before final check:', agenticActions);
    // --- End Debugging ---

    if (agenticActions) {
        // REMOVED: console.log('[fetchChatCompletions] agenticActions is valid. Calling handleAgenticActions...');
        try {
            // Call the imported handler
            await handleAgenticActions(agenticActions);
        } catch (error) {
            console.error("Error executing agentic actions:", error);
            // Use the internal addMessageToUI for errors originating here
            addMessageToUI('assistant', `Error executing actions: ${error.message}`);
        }
    } else {
         // REMOVED: console.log('[fetchChatCompletions] agenticActions is null or invalid. Skipping handleAgenticActions call.');
    }

    if (explanation) {
        conversationHistory.push({ role: 'assistant', content: explanation });
    }
    currentAssistantMessageDiv = null;
}

// Add this helper function to add basic styles to your AI chat
function addAIChatStyles() {
    // Create style element if it doesn't exist
    let styleEl = document.getElementById('ai-chat-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ai-chat-styles';
        document.head.appendChild(styleEl);
    }

    // Add styles
    styleEl.textContent = `
        .planning-section {
            background-color: #1e1e1e;
            border-radius: 6px;
            margin-bottom: 10px;
            padding: 8px;
        }
        .toggle-planning {
            background-color: #2b2b2b;
            border: none;
            color: #e0e0e0;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: block;
            width: 100%;
            text-align: left;
        }
        .toggle-planning:hover {
            background-color: #3a3a3a;
        }
        .planning-content {
            margin-top: 8px;
            padding: 8px;
            background-color: #252525;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            color: #a0a0a0;
            max-height: 400px;
            overflow-y: auto;
        }
    `;
}

// Setup AI event listeners (Exported)
export function setupAIChatEventListeners() {
    const sendButton = document.querySelector('.send-button');
    const inputElement = document.querySelector('.ai-input');

    // Add chat styles
    addAIChatStyles();

    if (sendButton && inputElement) {
        sendButton.addEventListener('click', sendChatMessage);
        inputElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        });
    } else {
         console.error("Could not find AI send button or input field to attach listeners.");
    }
}

export function addDiffToUI(filePath, oldContent, newContent, onApprove, onReject) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (!messagesContainer) return;
    
    // Create a diff message
    const diffMessage = document.createElement('div');
    diffMessage.className = 'ai-message assistant-message';
    
    // Build the diff view
    let diffHtml = `<div class="diff-view">
        <div class="diff-header">
            <span class="diff-filename"><i class="material-icons" style="font-size:16px;vertical-align:middle;">description</i> ${filePath}</span>
            <div class="diff-actions">
                <button class="diff-approve" title="Approve"><i class="material-icons">check_circle</i></button>
                <button class="diff-reject" title="Discard"><i class="material-icons">cancel</i></button>
            </div>
        </div>
        <pre class="diff-content">`;
    
    if (oldContent === newContent) {
        diffHtml += '<span style="color: #4caf50">No changes</span>';
    } else {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            if (oldLine === newLine) {
                diffHtml += `<div class="diff-same">  ${escapeHtml(oldLine)}</div>`;
            } else {
                if (oldLine) diffHtml += `<div class="diff-del">- ${escapeHtml(oldLine)}</div>`;
                if (newLine) diffHtml += `<div class="diff-add">+ ${escapeHtml(newLine)}</div>`;
            }
        }
    }
    
    diffHtml += `</pre></div>`;
    
    diffMessage.innerHTML = diffHtml;
    messagesContainer.appendChild(diffMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add event listeners
    diffMessage.querySelector('.diff-approve').addEventListener('click', () => {
        if (onApprove) onApprove();
        diffMessage.querySelector('.diff-actions').innerHTML = '<span style="color: #81c784"><i class="material-icons">check_circle</i> Changes approved</span>';
    });
    
    diffMessage.querySelector('.diff-reject').addEventListener('click', () => {
        if (onReject) onReject();
        diffMessage.querySelector('.diff-actions').innerHTML = '<span style="color: #e57373"><i class="material-icons">cancel</i> Changes discarded</span>';
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// Add this function after addDiffToUI
export function addFileOperationMessage(message, isSuccess = true) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant-message';
    
    const icon = isSuccess ? '✅' : '❌';
    messageDiv.innerHTML = `<p class="file-op-message ${isSuccess ? 'success' : 'error'}">${icon} ${message}</p>`;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
} 