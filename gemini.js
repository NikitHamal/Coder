import { showAlert } from './modal.js';

class GeminiAPI {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
        this.rateLimits = {
            'gemini-2.5-flash': 15,
            'gemini-pro': 60,
            'gemini-pro-vision': 60,
        };
    }

    getApiKey() {
        return localStorage.getItem('gemini-api-key');
    }

    isApiKeySet() {
        return !!this.apiKey;
    }

    async checkRateLimit(model) {
        const limit = this.rateLimits[model];
        if (!limit) {
            return; // No rate limit for this model
        }

        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;

        const requestTimestamps = JSON.parse(localStorage.getItem(`gemini-rate-limit-${model}`) || '[]');
        const recentRequests = requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);

        if (recentRequests.length >= limit) {
            throw new Error(`Rate limit exceeded for model ${model}. Please wait a moment.`);
        }

        if (recentRequests.length >= limit * 0.8) {
            showAlert(`Rate limit warning for model ${model}: ${recentRequests.length}/${limit} requests in the last minute.`, 'warning');
        }

        recentRequests.push(now);
        localStorage.setItem(`gemini-rate-limit-${model}`, JSON.stringify(recentRequests));
    }

    async generateContent(prompt, model = 'gemini-2.5-flash', streaming = false) {
        if (!this.isApiKeySet()) {
            throw new Error('Gemini API key not set.');
        }

        await this.checkRateLimit(model);

        const url = `${this.baseUrl}${model}:${streaming ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${errorData.error.message}`);
        }

        return response;
    }
}

export const gemini = new GeminiAPI();
