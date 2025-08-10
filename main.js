// Main application logic for Coder with Gemini AI
import { SettingsStorage } from './settingsStorage.js';
import { GeminiAI } from './geminiAI.js';

class CoderApp {
  constructor() {
    this.settings = new SettingsStorage();
    this.geminiAI = new GeminiAI();
    this.currentChatId = null;
    this.chatHistory = [];
    this.isStreaming = false;
    this.currentStream = null;
    
    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Initialize UI components
      this.initializeUI();
      
      // Load saved settings
      await this.loadSettings();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize code editor
      this.initializeCodeEditor();
      
      // Check if API key is set
      if (!this.settings.getSetting('geminiApiKey')) {
        this.showSettingsModal();
      }
      
      console.log('🚀 Coder Gemini AI initialized successfully');
    } catch (error) {
      console.error('Error initializing Coder app:', error);
      this.showError('Failed to initialize application');
    }
  }

  initializeUI() {
    // Initialize Monaco Editor
    this.editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Welcome to Coder with Gemini AI!\n// Start coding or ask me anything...',
      language: 'javascript',
      theme: this.settings.getSetting('theme') || 'atom-one-dark',
      fontSize: parseInt(this.settings.getSetting('fontSize')) || 14,
      tabSize: parseInt(this.settings.getSetting('tabSize')) || 4,
      automaticLayout: true,
      minimap: {
        enabled: this.settings.getSetting('minimap') !== false
      },
      wordWrap: this.settings.getSetting('wordWrap') ? 'on' : 'off',
      lineNumbers: this.settings.getSetting('showLineNumbers') !== false ? 'on' : 'off'
    });

    // Initialize chat interface
    this.chatContainer = document.getElementById('chat-container');
    this.chatInput = document.getElementById('chat-input');
    this.chatSendBtn = document.getElementById('chat-send-btn');
    this.chatModeToggle = document.getElementById('chat-mode-toggle');
    
    // Initialize settings modal
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsOverlay = document.getElementById('settings-overlay');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.apiKeyToggle = document.getElementById('api-key-toggle');
    this.modelSelect = document.getElementById('model-select');
    
    // Initialize other UI elements
    this.fileExplorer = document.getElementById('file-explorer');
    this.statusBar = document.getElementById('status-bar');
    this.toolbar = document.getElementById('toolbar');
  }

  async loadSettings() {
    try {
      // Load models from server
      const response = await fetch('/api/gemini/models');
      if (response.ok) {
        const data = await response.json();
        this.populateModelSelect(data.models);
      }
      
      // Set current model
      const currentModel = this.settings.getSetting('aiModel') || 'gemini-2.0-flash';
      if (this.modelSelect) {
        this.modelSelect.value = currentModel;
      }
      
      // Apply theme
      const theme = this.settings.getSetting('theme') || 'atom-one-dark';
      monaco.editor.setTheme(theme);
      
      // Apply other settings
      this.applyEditorSettings();
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  populateModelSelect(models) {
    if (!this.modelSelect) return;
    
    this.modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} - ${model.description}`;
      this.modelSelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // Chat input events
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }

    if (this.chatSendBtn) {
      this.chatSendBtn.addEventListener('click', () => {
        this.sendChatMessage();
      });
    }

    // Chat mode toggle
    if (this.chatModeToggle) {
      this.chatModeToggle.addEventListener('click', () => {
        this.toggleChatMode();
      });
    }

    // Settings events
    if (this.settingsModal) {
      const closeBtn = this.settingsModal.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hideSettingsModal();
        });
      }
    }

    if (this.settingsOverlay) {
      this.settingsOverlay.addEventListener('click', () => {
        this.hideSettingsModal();
      });
    }

    // API key toggle
    if (this.apiKeyToggle) {
      this.apiKeyToggle.addEventListener('click', () => {
        this.toggleApiKeyVisibility();
      });
    }

    // Model selection
    if (this.modelSelect) {
      this.modelSelect.addEventListener('change', (e) => {
        this.settings.setSetting('aiModel', e.target.value);
        this.updateStatusBar();
      });
    }

    // Save settings button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }

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
          case ',':
            e.preventDefault();
            this.showSettingsModal();
            break;
        }
      }
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      if (this.settings.hasUnsavedChanges()) {
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  initializeCodeEditor() {
    // Set up file change detection
    this.editor.onDidChangeModelContent(() => {
      this.settings.markUnsavedChanges();
      this.updateStatusBar();
    });

    // Set up language detection
    this.editor.onDidChangeModelLanguage(() => {
      this.updateStatusBar();
    });

    // Set up cursor position tracking
    this.editor.onDidChangeCursorPosition(() => {
      this.updateStatusBar();
    });
  }

  async sendChatMessage() {
    const message = this.chatInput?.value?.trim();
    if (!message || this.isStreaming) return;

    const apiKey = this.settings.getSetting('geminiApiKey');
    if (!apiKey) {
      this.showError('Please set your Gemini API key in settings first');
      this.showSettingsModal();
      return;
    }

    try {
      this.isStreaming = true;
      this.chatInput.disabled = true;
      this.chatSendBtn.disabled = true;

      // Add user message to chat
      this.addChatMessage('user', message);
      this.chatInput.value = '';

      // Get current mode
      const mode = this.chatModeToggle?.classList.contains('write-mode') ? 'write' : 'ask';
      
      // Get workspace context for write mode
      let workspaceContext = null;
      if (mode === 'write') {
        workspaceContext = this.getWorkspaceContext();
      }

      // Get selected model
      const modelId = this.modelSelect?.value || 'gemini-2.0-flash';

      // Send message to Gemini
      const response = await this.geminiAI.sendMessage({
        message,
        modelId,
        mode,
        workspaceContext,
        apiKey,
        previousMessages: this.chatHistory
      });

      if (response.success) {
        // Add AI response to chat
        this.addChatMessage('assistant', response.content);
        
        // Handle write mode actions
        if (mode === 'write' && response.actions) {
          await this.executeWriteActions(response.actions);
        }
      } else {
        this.showError(`AI Error: ${response.error}`);
      }

    } catch (error) {
      console.error('Error sending chat message:', error);
      this.showError(`Failed to send message: ${error.message}`);
    } finally {
      this.isStreaming = false;
      this.chatInput.disabled = false;
      this.chatSendBtn.disabled = false;
      this.chatInput.focus();
    }
  }

  addChatMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    
    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Gemini AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (role === 'assistant') {
      // Format AI response with syntax highlighting
      contentDiv.innerHTML = this.formatAIResponse(content);
    } else {
      contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(roleLabel);
    messageDiv.appendChild(contentDiv);
    
    this.chatContainer.appendChild(messageDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    
    // Add to history
    this.chatHistory.push({ role, content, timestamp: Date.now() });
    
    // Limit history size
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }

  formatAIResponse(content) {
    // Convert markdown to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/\n/g, '<br>');
  }

  getWorkspaceContext() {
    const currentFile = this.getCurrentFilePath();
    const fileContent = this.editor.getValue();
    const language = this.editor.getModel()?.getLanguageId() || 'text';
    
    return `## File List
${this.getFileList()}

## Active File Path
${currentFile}

## Active File Language
${language}

## Active File Content
\`\`\`${language}
${fileContent}
\`\`\``;
  }

  getFileList() {
    // This would be populated from the file explorer
    // For now, return a placeholder
    return 'index.html\nmain.js\nstyles.css\nserver.js';
  }

  getCurrentFilePath() {
    // This would be the actual file path
    // For now, return a placeholder
    return 'main.js';
  }

  async executeWriteActions(actions) {
    if (!Array.isArray(actions)) return;
    
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_file':
            await this.createFile(action.path, action.content);
            break;
          case 'update_file':
            await this.updateFile(action.path, action.content);
            break;
          case 'delete_file':
            await this.deleteFile(action.path);
            break;
          default:
            console.warn('Unknown action type:', action.type);
        }
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
        this.showError(`Failed to execute action: ${error.message}`);
      }
    }
  }

  async createFile(path, content) {
    // Implementation for creating files
    console.log(`Creating file: ${path}`);
    // This would typically involve a file system operation
  }

  async updateFile(path, content) {
    // Implementation for updating files
    console.log(`Updating file: ${path}`);
    // This would typically involve a file system operation
  }

  async deleteFile(path) {
    // Implementation for deleting files
    console.log(`Deleting file: ${path}`);
    // This would typically involve a file system operation
  }

  toggleChatMode() {
    if (!this.chatModeToggle) return;
    
    const isWriteMode = this.chatModeToggle.classList.contains('write-mode');
    if (isWriteMode) {
      this.chatModeToggle.classList.remove('write-mode');
      this.chatModeToggle.textContent = 'Ask Mode';
      this.chatModeToggle.title = 'Switch to Write Mode';
    } else {
      this.chatModeToggle.classList.add('write-mode');
      this.chatModeToggle.textContent = 'Write Mode';
      this.chatModeToggle.title = 'Switch to Ask Mode';
    }
    
    this.settings.setSetting('aiMode', isWriteMode ? 'ask' : 'write');
  }

  showSettingsModal() {
    if (this.settingsModal && this.settingsOverlay) {
      this.settingsModal.style.display = 'block';
      this.settingsOverlay.style.display = 'block';
      
      // Populate current settings
      const apiKey = this.settings.getSetting('geminiApiKey');
      if (this.apiKeyInput) {
        this.apiKeyInput.value = apiKey;
        this.updateApiKeyVisibility();
      }
    }
  }

  hideSettingsModal() {
    if (this.settingsModal && this.settingsOverlay) {
      this.settingsModal.style.display = 'none';
      this.settingsOverlay.style.display = 'none';
    }
  }

  toggleApiKeyVisibility() {
    if (!this.apiKeyInput || !this.apiKeyToggle) return;
    
    const isHidden = this.apiKeyInput.type === 'password';
    this.apiKeyInput.type = isHidden ? 'text' : 'password';
    this.apiKeyToggle.textContent = isHidden ? '👁️' : '🙈';
    this.apiKeyToggle.title = isHidden ? 'Hide API Key' : 'Show API Key';
  }

  updateApiKeyVisibility() {
    if (!this.apiKeyInput || !this.apiKeyToggle) return;
    
    const apiKey = this.apiKeyInput.value;
    if (apiKey) {
      this.apiKeyInput.type = 'password';
      this.apiKeyToggle.textContent = '🙈';
      this.apiKeyToggle.title = 'Show API Key';
    }
  }

  async saveSettings() {
    try {
      const apiKey = this.apiKeyInput?.value?.trim();
      
      if (!apiKey) {
        this.showError('API key is required');
        return;
      }

      // Validate API key
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        this.showError('Invalid API key. Please check and try again.');
        return;
      }

      // Save settings
      this.settings.setSetting('geminiApiKey', apiKey);
      this.settings.setSetting('aiModel', this.modelSelect?.value || 'gemini-2.0-flash');
      
      // Save to storage
      await this.settings.saveSettings();
      
      // Hide modal
      this.hideSettingsModal();
      
      // Show success message
      this.showSuccess('Settings saved successfully!');
      
      // Update status
      this.updateStatusBar();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError(`Failed to save settings: ${error.message}`);
    }
  }

  async validateApiKey(apiKey) {
    try {
      const response = await fetch('/api/gemini/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  applyEditorSettings() {
    if (!this.editor) return;
    
    // Apply theme
    const theme = this.settings.getSetting('theme') || 'atom-one-dark';
    monaco.editor.setTheme(theme);
    
    // Apply font size
    const fontSize = parseInt(this.settings.getSetting('fontSize')) || 14;
    this.editor.updateOptions({ fontSize });
    
    // Apply tab size
    const tabSize = parseInt(this.settings.getSetting('tabSize')) || 4;
    this.editor.updateOptions({ tabSize });
    
    // Apply word wrap
    const wordWrap = this.settings.getSetting('wordWrap') ? 'on' : 'off';
    this.editor.updateOptions({ wordWrap });
    
    // Apply line numbers
    const lineNumbers = this.settings.getSetting('showLineNumbers') !== false ? 'on' : 'off';
    this.editor.updateOptions({ lineNumbers });
    
    // Apply minimap
    const minimap = this.settings.getSetting('minimap') !== false;
    this.editor.updateOptions({ 
      minimap: { enabled: minimap } 
    });
  }

  updateStatusBar() {
    if (!this.statusBar) return;
    
    const model = this.modelSelect?.value || 'gemini-2.0-flash';
    const position = this.editor.getPosition();
    const language = this.editor.getModel()?.getLanguageId() || 'text';
    
    this.statusBar.innerHTML = `
      <span>Model: ${model}</span> |
      <span>Language: ${language}</span> |
      <span>Line: ${position.lineNumber}, Column: ${position.column}</span>
    `;
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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // File operations
  newFile() {
    this.editor.setValue('');
    this.settings.markUnsavedChanges();
    this.updateStatusBar();
  }

  async openFile() {
    // Implementation for opening files
    console.log('Opening file...');
  }

  async saveCurrentFile() {
    // Implementation for saving files
    console.log('Saving file...');
    this.settings.clearUnsavedChanges();
    this.updateStatusBar();
  }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Load Monaco Editor first
  if (typeof monaco !== 'undefined') {
    new CoderApp();
  } else {
    // Wait for Monaco to load
    const checkMonaco = setInterval(() => {
      if (typeof monaco !== 'undefined') {
        clearInterval(checkMonaco);
        new CoderApp();
      }
    }, 100);
  }
});

// Export for potential use in other modules
window.CoderApp = CoderApp; 