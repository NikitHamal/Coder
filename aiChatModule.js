import { fileStorage } from './fileStorage.js';
import { showPrompt, showConfirm, showAlert } from './modal.js';
import { gatherContext } from './codebaseContext.js';
import { handleAgenticActions, setAgentActionDependencies } from './agentActions.js';
import { gemini } from './gemini.js';

let initializeUI, selectFile;

export function setAIChatDependencies(dependencies) {
    initializeUI = dependencies.initializeUI;
    selectFile = dependencies.selectFile;
    setAgentActionDependencies({ initializeUI, selectFile, addMessageToUI });
}

let conversationHistory = [];
let currentAssistantMessageDiv = null;

function addMessageToUI(role, content) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (!messagesContainer) return null;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('ai-message');
    const paragraph = document.createElement('p');
    paragraph.textContent = content;

    if (role === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.appendChild(paragraph);
    } else {
        messageDiv.classList.add('assistant-message');
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
    const webResultsList = webResultsSection?.querySelector('ul');
    const mainContent = messageDiv.querySelector('.main-message-content');

    if (!planningSection || !planningContent || !toggleButton || !webResultsSection || !webResultsList || !mainContent) {
        console.error("One or more UI elements missing in assistant message structure.");
        return;
    }

    if (planning) {
        planningContent.innerHTML = marked.parse(planning);
        planningSection.style.display = 'block';
        planningContent.style.display = 'none';
        toggleButton.textContent = 'Show Planning';
        toggleButton.onclick = () => {
            const isHidden = planningContent.style.display === 'none';
            planningContent.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Hide Planning' : 'Show Planning';
        };
    } else {
        planningSection.style.display = 'none';
    }

    if (webResults && webResults.length > 0) {
        webResultsList.innerHTML = '';
        webResults.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${result.url}" target="_blank" title="${result.snippet || ''}">${result.title || result.url}</a> ${result.date || ''}`;
            webResultsList.appendChild(li);
        });
        webResultsSection.style.display = 'block';
    } else {
        webResultsSection.style.display = 'none';
    }

    if (finalContent) {
        try {
            mainContent.innerHTML = marked.parse(finalContent);
        } catch (e) {
            console.error("Error parsing Markdown:", e);
            mainContent.textContent = finalContent;
        }
    } else {
        mainContent.innerHTML = '';
    }
}

async function sendChatMessage() {
    const inputElement = document.querySelector('.ai-input');
    const modeSelectElement = document.getElementById('ai-mode-select');
    const modelSelectElement = document.getElementById('ai-model-select');
    const activePane = document.querySelector('.editor-pane.active') || document.querySelector('.editor-pane:first-child');

    if (!inputElement || !modeSelectElement || !modelSelectElement) {
        console.error("AI input, mode selector, or model selector not found.");
        return;
    }
    let message = inputElement.value.trim();
    const selectedMode = modeSelectElement.value;
    const selectedModelId = modelSelectElement.value;

    if (!message) return;

    const displayMessage = message.replace(/@web|@think/g, '').trim();
    const messageToSend = displayMessage;

    if (!messageToSend) return;

    addMessageToUI('user', displayMessage);
    conversationHistory.push({ role: 'user', content: messageToSend });
    inputElement.value = '';
    currentAssistantMessageDiv = addMessageToUI('assistant', 'Thinking...');

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
        workspaceContext = gatherContext(activeFilePath, activeFileContent);
    }

    try {
        await getGeminiResponse(messageToSend, currentAssistantMessageDiv, selectedMode, selectedModelId, workspaceContext);
    } catch (error) {
        console.error('Error communicating with Gemini API:', error);
        if (currentAssistantMessageDiv) {
            updateAssistantMessageUI(currentAssistantMessageDiv, { finalContent: `Error: ${error.message}` });
            currentAssistantMessageDiv.classList.add('error-message');
        }
        currentAssistantMessageDiv = null;
    }
}

async function getGeminiResponse(message, assistantMessageDiv, mode, modelId, workspaceContext) {
    const messagesContainer = document.querySelector('.ai-messages-container');
    if (assistantMessageDiv) {
        const mainContent = assistantMessageDiv.querySelector('.main-message-content');
        if (mainContent) mainContent.textContent = '';
    }

    let fullPrompt = message;
    if (mode === 'write' && workspaceContext) {
        const writeInstructions = `You are in 'write' mode. Analyze the request and the provided context (formatted with Markdown headers: ## File List, ## Active File Path, ## Active File Symbols, ## Active File Content).\nContext:\n---\n${workspaceContext}\n---\nRespond ONLY with a JSON object containing an 'actions' array (objects with 'type', 'path', 'content') and an 'explanation' string. Example: { "actions": [{ "type": "create_file", "path": "new.js", "content": "console.log('hello');" }], "explanation": "Created new.js." }`;
        fullPrompt = `${writeInstructions}\n\nUser request: ${message}`;
    }

    const response = await gemini.generateContent(fullPrompt, modelId, true);

    if (!response.body) {
        throw new Error('Streaming response body is null.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponseContent = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const dataStr = line.substring(5).trim();
                    try {
                        const jsonData = JSON.parse(dataStr);
                        if (jsonData.candidates && jsonData.candidates.length > 0) {
                            const content = jsonData.candidates[0].content.parts[0].text;
                            fullResponseContent += content;
                            updateAssistantMessageUI(assistantMessageDiv, { finalContent: fullResponseContent });
                            if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        // Ignore parsing errors for incomplete JSON
                    }
                }
            }
        }
    } finally {
        if (!reader.closed) {
            reader.cancel().catch(e => console.warn("Error cancelling reader:", e));
        }
    }

    const finalTrimmedContent = fullResponseContent.trim();
    let agenticActions = null;
    let explanation = finalTrimmedContent;

    const jsonFenceStart = '```json\n';
    const jsonFenceEnd = '\n```';

    if (mode === 'write' && finalTrimmedContent.startsWith(jsonFenceStart) && finalTrimmedContent.endsWith(jsonFenceEnd)) {
        const potentialJson = finalTrimmedContent.substring(jsonFenceStart.length, finalTrimmedContent.length - jsonFenceEnd.length);
        try {
            const parsedResponse = JSON.parse(potentialJson);
            if (parsedResponse && Array.isArray(parsedResponse.actions) && typeof parsedResponse.explanation === 'string') {
                agenticActions = parsedResponse.actions;
                explanation = parsedResponse.explanation;
            } else {
                explanation = "⚠️ Error: The response format does not match expected structure. Please try again.";
            }
        } catch (e) {
            explanation = "⚠️ Error: Could not parse the AI response as valid JSON. Please try again.\nRaw content was:\n" + finalTrimmedContent;
        }
    }

    updateAssistantMessageUI(assistantMessageDiv, {
        finalContent: explanation
    });

    if (agenticActions) {
        try {
            await handleAgenticActions(agenticActions);
        } catch (error) {
            console.error("Error executing agentic actions:", error);
            addMessageToUI('assistant', `Error executing actions: ${error.message}`);
        }
    }

    if (explanation) {
        conversationHistory.push({ role: 'assistant', content: explanation });
    }
    currentAssistantMessageDiv = null;
}

function addAIChatStyles() {
    let styleEl = document.getElementById('ai-chat-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ai-chat-styles';
        document.head.appendChild(styleEl);
    }

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

export function setupAIChatEventListeners() {
    const sendButton = document.querySelector('.send-button');
    const inputElement = document.querySelector('.ai-input');

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

    const diffMessage = document.createElement('div');
    diffMessage.className = 'ai-message assistant-message';

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