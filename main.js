// Main application logic for Coder with Gemini AI
import { SettingsStorage } from './settingsStorage.js';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

class CoderApp {
  constructor() {
    this.settings = new SettingsStorage();
    this.geminiAI = null;
    this.currentChatId = null;
    this.chatHistory = [];
    this.isStreaming = false;
    this.currentStream = null;

    this.initializeApp();
  }

  async initializeApp() {
    try {
      this.initializeUI();
      await this.loadSettings();
      this.setupEventListeners();
      this.initializeCodeEditor();
      this.updateStatusBar();
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showError('Failed to initialize application');
    }
  }

  initializeUI() {
    // Initialize Monaco Editor
    this.editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Welcome to Coder with Gemini AI!\n// Start coding or ask me anything...',
      language: 'javascript',
      theme: this.settings.getSetting('theme'),
      fontSize: parseInt(this.settings.getSetting('fontSize')),
      tabSize: parseInt(this.settings.getSetting('tabSize')),
      automaticLayout: true,
      minimap: { enabled: this.settings.getSetting('minimap') },
      lineNumbers: this.settings.getSetting('showLineNumbers') ? 'on' : 'off',
      wordWrap: this.settings.getSetting('wordWrap') ? 'on' : 'off'
    });

    // Initialize chat interface
    this.chatContainer = document.getElementById('chat-container');
    this.chatInput = document.getElementById('chat-input');
    this.chatModeToggle = document.getElementById('chat-mode-toggle');
    this.modelSelect = document.getElementById('model-select');
    this.sendButton = document.getElementById('send-button');

    // Initialize settings modal
    this.settingsModal = document.getElementById('settings-modal');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.apiKeyVisibilityToggle = document.getElementById('api-key-visibility-toggle');
    this.themeSelect = document.getElementById('theme-select');
    this.fontSizeInput = document.getElementById('font-size-input');
    this.tabSizeInput = document.getElementById('tab-size-input');
  }

  async loadSettings() {
    try {
      // Load Gemini models from configuration
      const models = [
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', description: 'Fastest Gemini 2.0 model' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and efficient Gemini 2.0 model' },
        { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', description: 'Most capable Gemini 2.0 model' },
        { id: 'gemini-2.0-pro-latest', name: 'Gemini 2.0 Pro (Latest)', description: 'Latest Gemini 2.0 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast Gemini 1.5 model with 1M context' },
        { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', description: 'Latest Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Pro Gemini 1.5 model with 1M context' },
        { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', description: 'Latest Gemini 1.5 Pro' },
        { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Legacy Gemini 1.0 Pro model' },
        { id: 'gemini-1.0-pro-vision', name: 'Gemini 1.0 Pro Vision', description: 'Legacy Gemini 1.0 Pro with enhanced vision' }
      ];

      this.populateModelSelect(models);
      this.applyEditorSettings();
      this.updateApiKeyVisibility();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  populateModelSelect(models) {
    this.modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      this.modelSelect.appendChild(option);
    });

    // Set default model
    const savedModel = this.settings.getSetting('aiModel');
    if (savedModel && models.find(m => m.id === savedModel)) {
      this.modelSelect.value = savedModel;
    } else {
      this.modelSelect.value = 'gemini-2.0-flash';
    }
  }

  setupEventListeners() {
    // Chat input events
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });

    this.sendButton.addEventListener('click', () => {
      this.sendChatMessage();
    });

    // Chat mode toggle
    this.chatModeToggle.addEventListener('click', () => {
      this.toggleChatMode();
    });

    // Model selection
    this.modelSelect.addEventListener('change', () => {
      this.settings.setSetting('aiModel', this.modelSelect.value);
    });

    // Settings modal events
    document.getElementById('settings-button').addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('settings-close').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('settings-save').addEventListener('click', () => {
      this.saveSettings();
    });

    // API key visibility toggle
    this.apiKeyVisibilityToggle.addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Theme and editor settings
    this.themeSelect.addEventListener('change', () => {
      this.settings.setSetting('theme', this.themeSelect.value);
      this.applyEditorSettings();
    });

    this.fontSizeInput.addEventListener('change', () => {
      this.settings.setSetting('fontSize', this.fontSizeInput.value);
      this.applyEditorSettings();
    });

    this.tabSizeInput.addEventListener('change', () => {
      this.settings.setSetting('tabSize', this.tabSizeInput.value);
      this.applyEditorSettings();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentFile();
            break;
          case 'o':
            e.preventDefault();
            this.openFile();
            break;
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
        }
      }
    });
  }

  initializeCodeEditor() {
    // Set up editor change listener
    this.editor.onDidChangeModelContent(() => {
      // Auto-save if enabled
      if (this.settings.getSetting('autoSave')) {
        // Debounced auto-save
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
          this.saveCurrentFile();
        }, 1000);
      }
    });

    // Set up cursor position listener
    this.editor.onDidChangeCursorPosition(() => {
      this.updateStatusBar();
    });

    // Set up language change listener
    this.editor.onDidChangeModelLanguage(() => {
      this.updateStatusBar();
    });
  }

  async sendChatMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    const apiKey = this.settings.getGeminiApiKey();
    if (!apiKey) {
      this.showError('Please set your Gemini API key in settings first');
      this.showSettingsModal();
      return;
    }

    // Initialize Gemini AI if not already done
    if (!this.geminiAI || this.geminiAI.apiKey !== apiKey) {
      try {
        this.geminiAI = new GoogleGenerativeAI(apiKey);
        this.geminiAI.apiKey = apiKey; // Store for comparison
      } catch (error) {
        this.showError('Failed to initialize Gemini AI: ' + error.message);
        return;
      }
    }

    // Add user message to chat
    this.addChatMessage('user', message);
    this.chatInput.value = '';

    const model = this.modelSelect.value;
    const mode = this.settings.getSetting('aiMode');

    try {
      this.isStreaming = true;
      this.sendButton.disabled = true;
      this.sendButton.textContent = 'Stop';

      if (mode === 'write') {
        // Use non-streaming for write mode
        await this.sendWriteCompletion(message, model, apiKey);
      } else {
        // Use streaming for ask mode
        await this.sendStreamingChat(message, model, apiKey);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.showError('Failed to send message: ' + error.message);
    } finally {
      this.isStreaming = false;
      this.sendButton.disabled = false;
      this.sendButton.textContent = 'Send';
    }
  }

  async sendStreamingChat(message, model, apiKey) {
    try {
      const geminiModel = this.geminiAI.getGenerativeModel({ 
        model: model,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      const chat = geminiModel.startChat({
        history: this.chatHistory.slice(-10).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      });

      let aiResponse = '';
      this.addChatMessage('assistant', '');

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      // Simulate streaming by updating the message
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        aiResponse += words[i] + (i < words.length - 1 ? ' ' : '');
        this.updateLastMessage(aiResponse);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Update chat history
      this.chatHistory.push({ role: 'user', content: message });
      this.chatHistory.push({ role: 'assistant', content: aiResponse });

    } catch (error) {
      console.error('Error in streaming chat:', error);
      this.showError('Failed to get response: ' + error.message);
    }
  }

  async sendWriteCompletion(message, model, apiKey) {
    try {
      const geminiModel = this.geminiAI.getGenerativeModel({ 
        model: model,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      const workspaceContext = await this.getWorkspaceContext();
      const writeInstructions = `You are in 'write' mode. Analyze the request and the provided context.

Context:
---
${workspaceContext}
---

Respond ONLY with a JSON object containing an 'actions' array (objects with 'type', 'path', 'content') and an 'explanation' string. Example: { "actions": [{ "type": "create_file", "path": "new.js", "content": "console.log('hello');" }], "explanation": "Created new.js." }`;

      const finalMessage = `${writeInstructions}\n\nUser request: ${message}`;

      const result = await geminiModel.generateContent(finalMessage);
      const response = await result.response;
      const text = response.text();

      try {
        const parsed = JSON.parse(text);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          await this.executeWriteActions(parsed.actions);
          this.addChatMessage('assistant', `✅ Executed actions: ${parsed.explanation}`);
        } else {
          this.addChatMessage('assistant', `❌ Invalid response format: ${text}`);
        }
      } catch (parseError) {
        this.addChatMessage('assistant', `❌ Failed to parse response: ${text}`);
      }

      // Update chat history
      this.chatHistory.push({ role: 'user', content: message });

    } catch (error) {
      console.error('Error in write completion:', error);
      this.showError('Failed to get response: ' + error.message);
    }
  }

  addChatMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Gemini AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (role === 'assistant') {
      contentDiv.innerHTML = this.formatAIResponse(content);
    } else {
      contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(roleLabel);
    messageDiv.appendChild(contentDiv);
    
    this.chatContainer.appendChild(messageDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    
    // Store message for context
    if (role === 'user') {
      this.currentChatId = Date.now();
    }
  }

  updateLastMessage(content) {
    const lastMessage = this.chatContainer.lastElementChild;
    if (lastMessage && lastMessage.classList.contains('assistant')) {
      const contentDiv = lastMessage.querySelector('.message-content');
      if (contentDiv) {
        contentDiv.innerHTML = this.formatAIResponse(content);
      }
    }
  }

  formatAIResponse(content) {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/\n/g, '<br>');
  }

  async getWorkspaceContext() {
    // Get current file content
    const currentContent = this.editor.getValue();
    const currentLanguage = this.editor.getModel().getLanguageId();
    
    return `## Current File
Language: ${currentLanguage}
Content:
\`\`\`${currentLanguage}
${currentContent}
\`\`\`

## Workspace
Current working directory: ${window.location.origin}
Available files: index.html, main.js, server.js, package.json, settingsStorage.js, geminiConfig.js`;
  }

  async executeWriteActions(actions) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_file':
            // Create file content in editor
            this.editor.setValue(action.content);
            this.showSuccess(`Created file: ${action.path}`);
            break;
          case 'update_file':
            // Update current file content
            this.editor.setValue(action.content);
            this.showSuccess(`Updated file: ${action.path}`);
            break;
          default:
            console.warn('Unknown action type:', action.type);
        }
      } catch (error) {
        console.error('Error executing action:', error);
        this.showError(`Failed to execute action: ${error.message}`);
      }
    }
  }

  toggleChatMode() {
    const currentMode = this.settings.getSetting('aiMode');
    const newMode = currentMode === 'ask' ? 'write' : 'ask';
    this.settings.setSetting('aiMode', newMode);
    
    this.chatModeToggle.textContent = newMode === 'ask' ? 'Write Mode' : 'Ask Mode';
    this.chatModeToggle.className = `chat-mode-toggle ${newMode}`;
    
    this.showNotification(`Switched to ${newMode} mode`);
  }

  showSettingsModal() {
    this.settingsModal.style.display = 'block';
    this.apiKeyInput.value = this.settings.getGeminiApiKey();
    this.themeSelect.value = this.settings.getSetting('theme');
    this.fontSizeInput.value = this.settings.getSetting('fontSize');
    this.tabSizeInput.value = this.settings.getSetting('tabSize');
  }

  hideSettingsModal() {
    this.settingsModal.style.display = 'none';
  }

  toggleApiKeyVisibility() {
    const isVisible = this.apiKeyInput.type === 'text';
    this.apiKeyInput.type = isVisible ? 'password' : 'text';
    this.updateApiKeyVisibility();
  }

  updateApiKeyVisibility() {
    const isVisible = this.apiKeyInput.type === 'text';
    this.apiKeyVisibilityToggle.textContent = isVisible ? '🙈' : '👁️';
    this.apiKeyVisibilityToggle.title = isVisible ? 'Hide API Key' : 'Show API Key';
  }

  async saveSettings() {
    try {
      const apiKey = this.apiKeyInput.value.trim();
      
      if (apiKey) {
        // Validate API key by testing it
        const isValid = await this.validateApiKey(apiKey);
        if (!isValid) {
          this.showError('Invalid API key. Please check and try again.');
          return;
        }
        
        this.settings.setGeminiApiKey(apiKey);
        this.showSuccess('API key saved and validated successfully!');
      }
      
      this.settings.setSetting('theme', this.themeSelect.value);
      this.settings.setSetting('fontSize', this.fontSizeInput.value);
      this.settings.setSetting('tabSize', this.tabSizeInput.value);
      
      this.applyEditorSettings();
      this.hideSettingsModal();
      this.showSuccess('Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings: ' + error.message);
    }
  }

  async validateApiKey(apiKey) {
    try {
      const testGemini = new GoogleGenerativeAI(apiKey);
      const model = testGemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Hello');
      await result.response;
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  applyEditorSettings() {
    if (this.editor) {
      monaco.editor.setTheme(this.settings.getSetting('theme'));
      this.editor.updateOptions({
        fontSize: parseInt(this.settings.getSetting('fontSize')),
        tabSize: parseInt(this.settings.getSetting('tabSize')),
        minimap: { enabled: this.settings.getSetting('minimap') },
        lineNumbers: this.settings.getSetting('showLineNumbers') ? 'on' : 'off',
        wordWrap: this.settings.getSetting('wordWrap') ? 'on' : 'off'
      });
    }
  }

  updateStatusBar() {
    const statusBar = document.getElementById('status-bar');
    if (statusBar && this.editor) {
      const position = this.editor.getPosition();
      const language = this.editor.getModel().getLanguageId();
      const model = this.modelSelect.value;
      
      statusBar.textContent = `Model: ${model} | Language: ${language} | Line: ${position.lineNumber}, Column: ${position.column}`;
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // File operations (placeholder implementations)
  newFile() {
    this.editor.setValue('');
    this.showNotification('New file created');
  }

  async openFile() {
    // This would typically open a file picker
    this.showNotification('File open functionality not implemented yet');
  }

  async saveCurrentFile() {
    // This would typically save to a specific file
    this.showNotification('File saved to editor');
  }
}

// Initialize app when Monaco Editor is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof monaco !== 'undefined') {
    new CoderApp();
  } else {
    const checkMonaco = setInterval(() => {
      if (typeof monaco !== 'undefined') {
        clearInterval(checkMonaco);
        new CoderApp();
      }
    }, 100);
  }
});

window.CoderApp = CoderApp; 