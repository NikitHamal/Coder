import { showAlert } from './modal.js';

class AIModels {
    constructor() {
        this.models = {
            // GPT4Free Models (Primary - No API Key Required)
            'g4f-gpt-3.5-turbo': {
                name: 'GPT-3.5 Turbo (Free)',
                description: 'OpenAI GPT-3.5 Turbo via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true,
                category: 'GPT'
            },
            'g4f-gpt-4': {
                name: 'GPT-4 (Free)',
                description: 'OpenAI GPT-4 via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 8192,
                supportsStreaming: true,
                category: 'GPT'
            },
            'g4f-gpt-4-turbo': {
                name: 'GPT-4 Turbo (Free)',
                description: 'OpenAI GPT-4 Turbo via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 128000,
                supportsStreaming: true,
                category: 'GPT'
            },
            'g4f-gpt-4o': {
                name: 'GPT-4o (Free)',
                description: 'OpenAI GPT-4o via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 128000,
                supportsStreaming: true,
                category: 'GPT'
            },
            'g4f-gpt-4o-mini': {
                name: 'GPT-4o Mini (Free)',
                description: 'OpenAI GPT-4o Mini via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 128000,
                supportsStreaming: true,
                category: 'GPT'
            },

            // DeepSeek Models
            'deepseek-chat': {
                name: 'DeepSeek Chat',
                description: 'DeepSeek Chat model (Free)',
                type: 'deepseek',
                available: true,
                maxTokens: 32768,
                supportsStreaming: true,
                category: 'DeepSeek'
            },
            'deepseek-coder': {
                name: 'DeepSeek Coder',
                description: 'DeepSeek Coder model (Free)',
                type: 'deepseek',
                available: true,
                maxTokens: 16384,
                supportsStreaming: true,
                category: 'DeepSeek'
            },

            // Anthropic Claude Models
            'claude-3-haiku': {
                name: 'Claude 3 Haiku (Free)',
                description: 'Anthropic Claude 3 Haiku via g4f',
                type: 'anthropic',
                available: true,
                maxTokens: 200000,
                supportsStreaming: true,
                category: 'Claude'
            },
            'claude-3-sonnet': {
                name: 'Claude 3 Sonnet (Free)',
                description: 'Anthropic Claude 3 Sonnet via g4f',
                type: 'anthropic',
                available: true,
                maxTokens: 200000,
                supportsStreaming: true,
                category: 'Claude'
            },
            'claude-3-opus': {
                name: 'Claude 3 Opus (Free)',
                description: 'Anthropic Claude 3 Opus via g4f',
                type: 'anthropic',
                available: true,
                maxTokens: 200000,
                supportsStreaming: true,
                category: 'Claude'
            },

            // Google Gemini Models (Requires API Key)
            'gemini-2.5-flash': {
                name: 'Gemini 2.5 Flash',
                description: 'Google Gemini 2.5 Flash (requires API key)',
                type: 'gemini',
                available: false,
                maxTokens: 8192,
                supportsStreaming: true,
                requiresApiKey: true,
                category: 'Gemini'
            },
            'gemini-2.5-pro': {
                name: 'Gemini 2.5 Pro',
                description: 'Google Gemini 2.5 Pro (requires API key)',
                type: 'gemini',
                available: false,
                maxTokens: 8192,
                supportsStreaming: true,
                requiresApiKey: true,
                category: 'Gemini'
            },

            // Meta Models
            'llama-3-8b': {
                name: 'Llama 3 8B (Free)',
                description: 'Meta Llama 3 8B via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 8192,
                supportsStreaming: true,
                category: 'Meta'
            },
            'llama-3-70b': {
                name: 'Llama 3 70B (Free)',
                description: 'Meta Llama 3 70B via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 8192,
                supportsStreaming: true,
                category: 'Meta'
            },

            // Mistral Models
            'mistral-7b': {
                name: 'Mistral 7B (Free)',
                description: 'Mistral 7B model via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 8192,
                supportsStreaming: true,
                category: 'Mistral'
            },
            'mistral-large': {
                name: 'Mistral Large (Free)',
                description: 'Mistral Large model via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 32768,
                supportsStreaming: true,
                category: 'Mistral'
            },

            // Cohere Models
            'cohere-command': {
                name: 'Cohere Command (Free)',
                description: 'Cohere Command model via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true,
                category: 'Cohere'
            },

            // Perplexity Models
            'perplexity-sonar': {
                name: 'Perplexity Sonar (Free)',
                description: 'Perplexity Sonar model via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 4096,
                supportsStreaming: true,
                category: 'Perplexity'
            },

            // HuggingFace Models
            'huggingface-codellama': {
                name: 'Code Llama (Free)',
                description: 'HuggingFace Code Llama via g4f',
                type: 'g4f',
                available: true,
                maxTokens: 16384,
                supportsStreaming: true,
                category: 'HuggingFace'
            }
        };
        
        this.currentModel = 'g4f-gpt-3.5-turbo';
        this.initializeG4F();
    }

    async initializeG4F() {
        try {
            // Wait for g4f to be available from CDN
            if (typeof window.g4f === 'undefined') {
                await this.waitForG4F();
            }
            console.log('G4F initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize g4f:', error);
        }
    }

    async waitForG4F() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // Wait up to 5 seconds
            
            const checkG4F = () => {
                attempts++;
                if (typeof window.g4f !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('G4F failed to load from CDN'));
                } else {
                    setTimeout(checkG4F, 100);
                }
            };
            
            checkG4F();
        });
    }

    getAvailableModels() {
        return Object.entries(this.models)
            .filter(([key, model]) => model.available)
            .map(([key, model]) => ({ key, ...model }));
    }

    getModelsByCategory() {
        const categories = {};
        Object.entries(this.models).forEach(([key, model]) => {
            if (model.available) {
                if (!categories[model.category]) {
                    categories[model.category] = [];
                }
                categories[model.category].push({ key, ...model });
            }
        });
        return categories;
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
                    return await this.generateWithG4F(prompt, modelKey, options);
                case 'gemini':
                    return await this.generateWithGemini(prompt, modelKey, options);
                default:
                    throw new Error(`Unsupported model type: ${model.type}`);
            }
        } catch (error) {
            console.error(`Error generating content with ${model.name}:`, error);
            throw error;
        }
    }

    async generateWithG4F(prompt, modelKey, options = {}) {
        if (typeof window.g4f === 'undefined') {
            await this.waitForG4F();
        }

        // Map our model keys to actual g4f model names
        const modelMapping = {
            'g4f-gpt-3.5-turbo': 'gpt-3.5-turbo',
            'g4f-gpt-4': 'gpt-4',
            'g4f-gpt-4-turbo': 'gpt-4-turbo',
            'g4f-gpt-4o': 'gpt-4o',
            'g4f-gpt-4o-mini': 'gpt-4o-mini',
            'llama-3-8b': 'llama-3-8b',
            'llama-3-70b': 'llama-3-70b',
            'mistral-7b': 'mistral-7b',
            'mistral-large': 'mistral-large',
            'cohere-command': 'cohere-command',
            'perplexity-sonar': 'perplexity-sonar',
            'huggingface-codellama': 'codellama-7b-instruct'
        };

        const actualModel = modelMapping[modelKey] || 'gpt-3.5-turbo';
        const {
            temperature = 0.7,
            maxTokens = 4096,
            streaming = false
        } = options;

        try {
            if (streaming) {
                return await this.streamWithG4F(prompt, actualModel, temperature, maxTokens);
            } else {
                return await this.nonStreamWithG4F(prompt, actualModel, temperature, maxTokens);
            }
        } catch (error) {
            throw new Error(`G4F generation failed: ${error.message}`);
        }
    }

    async nonStreamWithG4F(prompt, model, temperature, maxTokens) {
        try {
            const response = await window.g4f.ChatCompletion.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                max_tokens: maxTokens
            });

            return {
                content: response,
                model: model,
                usage: { total_tokens: response.length }
            };
        } catch (error) {
            throw new Error(`G4F API error: ${error.message}`);
        }
    }

    async streamWithG4F(prompt, model, temperature, maxTokens) {
        try {
            const response = await window.g4f.ChatCompletion.create({
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

            return stream;
        } catch (error) {
            throw new Error(`G4F streaming error: ${error.message}`);
        }
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
            'coding': ['g4f-gpt-4o', 'deepseek-coder', 'huggingface-codellama', 'gemini-2.5-flash'],
            'writing': ['g4f-gpt-4o', 'claude-3-sonnet', 'g4f-gpt-4-turbo'],
            'analysis': ['g4f-gpt-4o', 'deepseek-chat', 'claude-3-opus'],
            'creative': ['g4f-gpt-4o', 'claude-3-opus', 'g4f-gpt-4-turbo'],
            'conversation': ['g4f-gpt-3.5-turbo', 'claude-3-haiku', 'mistral-7b']
        };
        
        return recommendations[useCase] || ['g4f-gpt-3.5-turbo'];
    }

    // Get all models by category for UI display
    getModelsForUI() {
        const categories = this.getModelsByCategory();
        const result = [];
        
        Object.entries(categories).forEach(([category, models]) => {
            result.push({ category, models });
        });
        
        return result;
    }
}

// Create and export a singleton instance
export const aiModels = new AIModels();

// Export the class for testing purposes
export { AIModels };