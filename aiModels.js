import { showAlert } from './modal.js';

class AIModels {
    constructor() {
        this.models = {
            // Free models from gpt4free
            'g4f': {
                name: 'GPT4Free (g4f)',
                description: 'Free GPT models via g4f.js',
                type: 'g4f',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true
            },
            'deepseek': {
                name: 'DeepSeek',
                description: 'Free DeepSeek models',
                type: 'deepseek',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true
            },
            'openai': {
                name: 'OpenAI (Free)',
                description: 'Free OpenAI models via g4f',
                type: 'openai',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true
            },
            'anthropic': {
                name: 'Anthropic (Free)',
                description: 'Free Claude models via g4f',
                type: 'anthropic',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true
            },
            'gemini-2.5-flash': {
                name: 'Gemini 2.5 Flash',
                description: 'Google Gemini 2.5 Flash (requires API key)',
                type: 'gemini',
                available: false,
                maxTokens: 8192,
                supportsStreaming: true,
                requiresApiKey: true
            },
            'gemini-2.5-pro': {
                name: 'Gemini 2.5 Pro',
                description: 'Google Gemini 2.5 Pro (requires API key)',
                type: 'gemini',
                available: false,
                maxTokens: 8192,
                supportsStreaming: true,
                requiresApiKey: true
            }
        };
        
        this.currentModel = 'g4f';
        this.initializeG4F();
    }

    async initializeG4F() {
        try {
            // Try to load g4f from CDN if not available
            if (typeof window.g4f === 'undefined') {
                await this.loadG4F();
            }
        } catch (error) {
            console.warn('Failed to initialize g4f:', error);
        }
    }

    async loadG4F() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/g4f@latest/dist/g4f.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load g4f'));
            document.head.appendChild(script);
        });
    }

    getAvailableModels() {
        return Object.entries(this.models)
            .filter(([key, model]) => model.available)
            .map(([key, model]) => ({ key, ...model }));
    }

    getCurrentModel() {
        return this.models[this.currentModel];
    }

    setCurrentModel(modelKey) {
        if (this.models[modelKey]) {
            this.currentModel = modelKey;
            return true;
        }
        return false;
    }

    async generateContent(prompt, modelKey = null, options = {}) {
        const model = modelKey ? this.models[modelKey] : this.getCurrentModel();
        
        if (!model) {
            throw new Error('Invalid model selected');
        }

        if (model.requiresApiKey && !this.hasApiKey(model.type)) {
            throw new Error(`${model.name} requires an API key`);
        }

        try {
            switch (model.type) {
                case 'g4f':
                    return await this.generateWithG4F(prompt, options);
                case 'gemini':
                    return await this.generateWithGemini(prompt, model.key, options);
                default:
                    throw new Error(`Unsupported model type: ${model.type}`);
            }
        } catch (error) {
            console.error(`Error generating content with ${model.name}:`, error);
            throw error;
        }
    }

    async generateWithG4F(prompt, options = {}) {
        if (typeof window.g4f === 'undefined') {
            await this.loadG4F();
        }

        const {
            model = 'gpt-3.5-turbo',
            temperature = 0.7,
            maxTokens = 4096,
            streaming = false
        } = options;

        try {
            if (streaming) {
                return await this.streamWithG4F(prompt, model, temperature, maxTokens);
            } else {
                return await this.nonStreamWithG4F(prompt, model, temperature, maxTokens);
            }
        } catch (error) {
            throw new Error(`G4F generation failed: ${error.message}`);
        }
    }

    async nonStreamWithG4F(prompt, model, temperature, maxTokens) {
        return new Promise((resolve, reject) => {
            window.g4f.ChatCompletion.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                max_tokens: maxTokens
            }).then(response => {
                resolve({
                    content: response,
                    model: model,
                    usage: { total_tokens: response.length }
                });
            }).catch(reject);
        });
    }

    async streamWithG4F(prompt, model, temperature, maxTokens) {
        return new Promise((resolve, reject) => {
            const response = window.g4f.ChatCompletion.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                max_tokens: maxTokens,
                stream: true
            });

            let fullResponse = '';
            const stream = {
                on: (event, callback) => {
                    if (event === 'data') {
                        response.on('data', (chunk) => {
                            try {
                                const data = JSON.parse(chunk);
                                if (data.choices && data.choices[0] && data.choices[0].delta) {
                                    const content = data.choices[0].delta.content;
                                    if (content) {
                                        fullResponse += content;
                                        callback(content);
                                    }
                                }
                            } catch (e) {
                                // Handle non-JSON chunks
                                if (chunk.trim()) {
                                    fullResponse += chunk;
                                    callback(chunk);
                                }
                            }
                        });
                    } else if (event === 'end') {
                        response.on('end', () => {
                            callback(fullResponse);
                        });
                    }
                }
            };

            resolve(stream);
        });
    }

    async generateWithGemini(prompt, modelKey, options = {}) {
        // Import gemini module dynamically to avoid circular dependencies
        const { gemini } = await import('./gemini.js');
        
        if (!gemini.isApiKeySet()) {
            throw new Error('Gemini API key not set');
        }

        const { streaming = false } = options;
        return await gemini.generateContent(prompt, modelKey, streaming);
    }

    hasApiKey(modelType) {
        switch (modelType) {
            case 'gemini':
                return !!localStorage.getItem('gemini-api-key');
            default:
                return true; // Free models don't need API keys
        }
    }

    async testConnection(modelKey = null) {
        const model = modelKey ? this.models[modelKey] : this.getCurrentModel();
        
        try {
            const testPrompt = "Hello, this is a test message. Please respond with 'Connection successful' if you can see this.";
            const response = await this.generateContent(testPrompt, modelKey, { maxTokens: 50 });
            
            if (response && response.content) {
                return { success: true, model: model.name, response: response.content };
            } else {
                return { success: false, model: model.name, error: 'No response received' };
            }
        } catch (error) {
            return { success: false, model: model.name, error: error.message };
        }
    }

    getModelInfo(modelKey) {
        return this.models[modelKey] || null;
    }

    // Get recommended models for different use cases
    getRecommendedModels(useCase) {
        const recommendations = {
            'coding': ['g4f', 'deepseek', 'gemini-2.5-flash'],
            'writing': ['g4f', 'anthropic', 'openai'],
            'analysis': ['g4f', 'deepseek', 'anthropic'],
            'creative': ['g4f', 'openai', 'anthropic']
        };
        
        return recommendations[useCase] || ['g4f'];
    }
}

// Create and export a singleton instance
export const aiModels = new AIModels();

// Export the class for testing purposes
export { AIModels };