// Gemini AI Frontend Module
// Handles all communication with the Gemini AI backend

export class GeminiAI {
  constructor() {
    this.baseUrl = window.location.origin;
    this.currentStream = null;
    this.isStreaming = false;
    this.rateLimits = new Map();
  }

  /**
   * Validate a Gemini API key
   * @param {string} apiKey - The API key to validate
   * @returns {Promise<boolean>} - Whether the key is valid
   */
  async validateApiKey(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/api/gemini/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Get available Gemini models
   * @returns {Promise<Array>} - Array of available models
   */
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/gemini/models`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const models = await response.json();
      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  /**
   * Get current usage for a specific model
   * @param {string} modelId - The model ID to check
   * @returns {Promise<Object>} - Current usage statistics
   */
  async getModelUsage(modelId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/gemini/usage/${modelId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const usage = await response.json();
      return usage;
    } catch (error) {
      console.error('Error fetching model usage:', error);
      return null;
    }
  }

  /**
   * Send a chat message and get streaming response
   * @param {Object} options - Chat options
   * @param {string} options.message - User message
   * @param {string} options.model - Model to use
   * @param {string} options.mode - 'ask' or 'write'
   * @param {Array} options.context - Previous chat context
   * @param {Function} options.onChunk - Callback for each chunk
   * @param {Function} options.onComplete - Callback when complete
   * @param {Function} options.onError - Callback for errors
   * @returns {Promise<void>}
   */
  async sendChatMessage(options) {
    const {
      message,
      model,
      mode = 'ask',
      context = [],
      onChunk,
      onComplete,
      onError
    } = options;

    try {
      // Cancel any existing stream
      if (this.currentStream) {
        this.currentStream.cancel();
        this.currentStream = null;
      }

      this.isStreaming = true;

      const requestBody = {
        message,
        model,
        mode,
        context: context.slice(-10) // Keep last 10 messages for context
      };

      // Add workspace context for write mode
      if (mode === 'write') {
        requestBody.workspaceContext = await this.getWorkspaceContext();
      }

      const response = await fetch(`${this.baseUrl}/api/gemini/chat-completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body not available for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      this.currentStream = {
        cancel: () => {
          reader.cancel();
          this.isStreaming = false;
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                this.isStreaming = false;
                onComplete && onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  onChunk && onChunk(parsed.content);
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        this.isStreaming = false;
        this.currentStream = null;
      }

    } catch (error) {
      this.isStreaming = false;
      this.currentStream = null;
      onError && onError(error.message || 'An error occurred');
    }
  }

  /**
   * Send a non-streaming completion (for write mode)
   * @param {Object} options - Completion options
   * @param {string} options.message - User message
   * @param {string} options.model - Model to use
   * @param {Array} options.context - Previous context
   * @returns {Promise<Object>} - Completion response
   */
  async sendCompletion(options) {
    const { message, model, context = [] } = options;

    try {
      const requestBody = {
        message,
        model,
        context: context.slice(-10),
        workspaceContext: await this.getWorkspaceContext()
      };

      const response = await fetch(`${this.baseUrl}/api/gemini/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending completion:', error);
      throw error;
    }
  }

  /**
   * Generate slides content
   * @param {Object} options - Slide generation options
   * @param {string} options.topic - Topic for slides
   * @param {string} options.model - Model to use
   * @param {number} options.slideCount - Number of slides
   * @returns {Promise<Object>} - Generated slides
   */
  async generateSlides(options) {
    const { topic, model, slideCount = 5 } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/gemini/slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, model, slideCount }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating slides:', error);
      throw error;
    }
  }

  /**
   * Generate graphic description
   * @param {Object} options - Graphic generation options
   * @param {string} options.description - Description of desired graphic
   * @param {string} options.model - Model to use
   * @param {string} options.style - Art style
   * @returns {Promise<Object>} - Generated graphic description
   */
  async generateGraphic(options) {
    const { description, model, style = 'modern' } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/gemini/graphics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, model, style }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating graphic:', error);
      throw error;
    }
  }

  /**
   * Get workspace context for write mode
   * @returns {Promise<Object>} - Workspace context
   */
  async getWorkspaceContext() {
    try {
      // This would be implemented to gather actual workspace information
      // For now, return a placeholder structure
      return {
        files: [],
        currentFile: null,
        workspace: '/workspace',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting workspace context:', error);
      return {};
    }
  }

  /**
   * Cancel current streaming operation
   */
  cancelStream() {
    if (this.currentStream) {
      this.currentStream.cancel();
      this.currentStream = null;
    }
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   * @returns {boolean} - Whether currently streaming
   */
  isCurrentlyStreaming() {
    return this.isStreaming;
  }

  /**
   * Get current rate limit information
   * @param {string} modelId - Model to check
   * @returns {Promise<Object>} - Rate limit info
   */
  async getRateLimitInfo(modelId) {
    try {
      const usage = await this.getModelUsage(modelId);
      if (!usage) return null;

      return {
        modelId,
        requestsUsed: usage.requestsUsed,
        requestsLimit: usage.requestsLimit,
        tokensUsed: usage.tokensUsed,
        tokensLimit: usage.tokensLimit,
        resetTime: usage.resetTime,
        isLimited: usage.isLimited
      };
    } catch (error) {
      console.error('Error getting rate limit info:', error);
      return null;
    }
  }

  /**
   * Format rate limit information for display
   * @param {Object} rateLimitInfo - Rate limit information
   * @returns {string} - Formatted display string
   */
  formatRateLimitDisplay(rateLimitInfo) {
    if (!rateLimitInfo) return 'Rate limit info unavailable';

    const { requestsUsed, requestsLimit, tokensUsed, tokensLimit, isLimited } = rateLimitInfo;
    
    if (isLimited) {
      return `⚠️ Rate limited - Reset in ${this.formatTimeRemaining(rateLimitInfo.resetTime)}`;
    }

    const requestsPercent = Math.round((requestsUsed / requestsLimit) * 100);
    const tokensPercent = Math.round((tokensUsed / tokensLimit) * 100);

    return `📊 Requests: ${requestsUsed}/${requestsLimit} (${requestsPercent}%) | Tokens: ${this.formatTokens(tokensUsed)}/${this.formatTokens(tokensLimit)} (${tokensPercent}%)`;
  }

  /**
   * Format tokens for display
   * @param {number} tokens - Number of tokens
   * @returns {string} - Formatted token string
   */
  formatTokens(tokens) {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  /**
   * Format time remaining until reset
   * @param {string} resetTime - ISO string of reset time
   * @returns {string} - Formatted time string
   */
  formatTimeRemaining(resetTime) {
    if (!resetTime) return 'unknown time';
    
    const now = new Date();
    const reset = new Date(resetTime);
    const diff = reset - now;

    if (diff <= 0) return 'now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }
}