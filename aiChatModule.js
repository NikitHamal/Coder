import { fileStorage } from './fileStorage.js';
import { showPrompt, showConfirm, showAlert } from './modal.js';
import { gatherContext } from './codebaseContext.js';
import { handleAgenticActions, setAgentActionDependencies } from './agentActions.js';
import { aiModels } from './aiModels.js';

let initializeUI, selectFile;

export function setAIChatDependencies(dependencies) {
    initializeUI = dependencies.initializeUI;
    selectFile = dependencies.selectFile;
    setAgentActionDependencies({ initializeUI, selectFile, addMessageToUI });
}

let conversationHistory = [];
let currentAssistantMessageDiv = null;
let isGenerating = false;

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
        } catch (error) {
            console.error('Error parsing markdown:', error);
            mainContent.textContent = finalContent;
        }
    }
}

async function sendChatMessage() {
    if (isGenerating) return;

    const inputElement = document.querySelector('.ai-input');
    const sendButton = document.querySelector('.send-button');
    const modelSelect = document.querySelector('#ai-model-select');
    
    if (!inputElement || !sendButton) {
        console.error("AI chat elements not found");
        return;
    }

    const message = inputElement.value.trim();
    if (!message) return;

    const selectedModel = modelSelect ? modelSelect.value : 'g4f';
    const selectedMode = document.querySelector('#ai-mode-select')?.value || 'ask';

    // Clear input and disable send button
    inputElement.value = '';
    sendButton.disabled = true;
    isGenerating = true;

    // Add user message to UI
    addMessageToUI('user', message);
    
    // Add assistant message placeholder
    currentAssistantMessageDiv = addMessageToUI('assistant', 'Thinking...');
    
    try {
        // Gather codebase context if needed
        let context = '';
        if (selectedMode === 'write' || message.toLowerCase().includes('code') || message.toLowerCase().includes('file')) {
            context = await gatherContext();
        }

        // Prepare full prompt with context
        let fullPrompt = message;
        if (context) {
            fullPrompt = `Context: ${context}\n\nUser Request: ${message}`;
        }

        // Generate response using selected AI model
        const response = await aiModels.generateContent(fullPrompt, selectedModel, {
            streaming: true,
            maxTokens: 4096
        });

        if (response && response.on) {
            // Handle streaming response
            let fullResponse = '';
            
            response.on('data', (chunk) => {
                fullResponse += chunk;
                if (currentAssistantMessageDiv) {
                    const mainContent = currentAssistantMessageDiv.querySelector('.main-message-content');
                    if (mainContent) {
                        mainContent.innerHTML = marked.parse(fullResponse);
                    }
                }
            });

            response.on('end', (finalResponse) => {
                if (currentAssistantMessageDiv) {
                    const mainContent = currentAssistantMessageDiv.querySelector('.main-message-content');
                    if (mainContent) {
                        mainContent.innerHTML = marked.parse(finalResponse);
                    }
                }
                
                // Add to conversation history
                conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: finalResponse }
                );
                
                // Re-enable send button
                sendButton.disabled = false;
                isGenerating = false;
            });
        } else {
            // Handle non-streaming response
            const content = response.content || response;
            if (currentAssistantMessageDiv) {
                const mainContent = currentAssistantMessageDiv.querySelector('.main-message-content');
                if (mainContent) {
                    mainContent.innerHTML = marked.parse(content);
                }
            }
            
            // Add to conversation history
            conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: content }
            );
            
            // Re-enable send button
            sendButton.disabled = false;
            isGenerating = false;
        }

    } catch (error) {
        console.error('Error generating AI response:', error);
        
        if (currentAssistantMessageDiv) {
            const mainContent = currentAssistantMessageDiv.querySelector('.main-message-content');
            if (mainContent) {
                mainContent.innerHTML = `<div class="error-message">❌ Error: ${error.message}</div>`;
            }
        }
        
        // Re-enable send button
        sendButton.disabled = false;
        isGenerating = false;
    }
}

// --- Function calling powered Write mode ---
async function handleWriteModeWithFunctionCalling({ message, assistantMessageDiv, modelId, workspaceContext, messagesContainer }) {
    const functionDeclarations = [
        {
            name: 'create_file',
            description: 'Create a new file at path with initial content',
            parameters: {
                type: 'OBJECT',
                properties: {
                    path: { type: 'STRING', description: 'Path including file name' },
                    content: { type: 'STRING', description: 'File contents' }
                },
                required: ['path', 'content']
            }
        },
        {
            name: 'modify_file',
            description: 'Replace the entire content of an existing file',
            parameters: {
                type: 'OBJECT',
                properties: {
                    path: { type: 'STRING' },
                    content: { type: 'STRING' }
                },
                required: ['path', 'content']
            }
        },
        {
            name: 'create_folder',
            description: 'Create a folder (virtual) at the given path',
            parameters: {
                type: 'OBJECT',
                properties: { path: { type: 'STRING' } },
                required: ['path']
            }
        },
        {
            name: 'delete_file',
            description: 'Delete a file at path',
            parameters: {
                type: 'OBJECT',
                properties: { path: { type: 'STRING' } },
                required: ['path']
            }
        },
        {
            name: 'rename_file',
            description: 'Rename or move a file from path to new_path',
            parameters: {
                type: 'OBJECT',
                properties: { path: { type: 'STRING' }, new_path: { type: 'STRING' } },
                required: ['path', 'new_path']
            }
        },
        {
            name: 'copy_file',
            description: 'Copy a file from path to new_path',
            parameters: {
                type: 'OBJECT',
                properties: { path: { type: 'STRING' }, new_path: { type: 'STRING' } },
                required: ['path', 'new_path']
            }
        }
    ];

    const systemPreamble = `You are an autonomous coding agent with direct file access tools. Prefer calling the provided functions to make changes. Provide concise rationale as plain text also.`;
    const userContent = `User request: ${message}\n\nWorkspace Context:\n${workspaceContext || '[No context]'}`;

    const contents = [
        { role: 'user', parts: [{ text: systemPreamble + '\n\n' + userContent }] }
    ];

    const res = await aiModels.generateWithTools({ contents, tools: functionDeclarations, model: modelId, streaming: false });

    let explanationText = '';
    const actions = [];
    try {
        const candidate = res.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
            if (part.text) explanationText += part.text;
            const fc = part.functionCall || part.function_call; // handle variants
            if (fc && fc.name) {
                let args = {};
                try { args = typeof fc.args === 'string' ? JSON.parse(fc.args) : (fc.args || {}); } catch {}
                const action = mapFunctionCallToAction(fc.name, args);
                if (action) actions.push(action);
            }
        }
    } catch (e) {
        console.warn('Failed to parse function call response', e);
    }

    if (assistantMessageDiv) {
        updateAssistantMessageUI(assistantMessageDiv, { finalContent: explanationText || 'Applying changes...' });
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (actions.length > 0) {
        await handleAgenticActions(actions);
    }
}

function mapFunctionCallToAction(name, args) {
    switch (name) {
        case 'create_file':
            return { type: 'create_file', path: args.path, content: String(args.content || '') };
        case 'modify_file':
            return { type: 'modify_file', path: args.path, content: String(args.content || '') };
        case 'create_folder':
            return { type: 'create_folder', path: args.path };
        case 'delete_file':
            return { type: 'delete_file', path: args.path };
        case 'rename_file':
            return { type: 'rename_file', path: args.path, new_path: args.new_path };
        case 'copy_file':
            return { type: 'copy_file', path: args.path, new_path: args.new_path };
        default:
            return null;
    }
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