import { showAlert } from './modal.js';

class GeminiAPI {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl =
            'https://generativelanguage.googleapis.com/v1beta/models/';
        // Per-model default limits (best-effort defaults; can be overridden via localStorage)
        // Units: perSecond, perMinute, perDay
        this.rateLimits = {
            'gemini-1.5-flash': { perSecond: 2, perMinute: 60, perDay: 5000 },
            'gemini-1.5-pro': { perSecond: 1, perMinute: 15, perDay: 1500 },
            'gemini-2.0-flash': { perSecond: 2, perMinute: 60, perDay: 5000 },
            'gemini-2.0-flash-lite': {
                perSecond: 3,
                perMinute: 90,
                perDay: 8000,
            },
            'gemini-2.0-flash-thinking': {
                perSecond: 1,
                perMinute: 15,
                perDay: 1500,
            },
            'gemini-2.0-flash-vision': {
                perSecond: 1,
                perMinute: 30,
                perDay: 3000,
            },
            'gemini-2.5-flash': { perSecond: 1, perMinute: 15, perDay: 1500 },
            'gemini-pro': { perSecond: 1, perMinute: 60, perDay: 5000 },
            'gemini-pro-vision': { perSecond: 1, perMinute: 60, perDay: 5000 },
        };
    }

    getApiKey() {
        return localStorage.getItem('gemini-api-key');
    }

    isApiKeySet() {
        return !!this.apiKey;
    }

    async checkRateLimit(model) {
        const defaults = this.rateLimits[model] || {
            perSecond: 2,
            perMinute: 60,
            perDay: 5000,
        };
        // Allow overrides via localStorage (optional)
        const override = JSON.parse(
            localStorage.getItem(`gemini-rate-config-${model}`) || 'null'
        );
        const limit = override || defaults;

        const now = Date.now();
        const windows = {
            perSecond: 1000,
            perMinute: 60 * 1000,
            perDay: 24 * 60 * 60 * 1000,
        };

        let timestamps = JSON.parse(
            localStorage.getItem(`gemini-rate-usage-${model}`) || '[]'
        );
        // Prune entries older than a day to keep storage small
        const oneDayAgo = now - windows.perDay;
        timestamps = timestamps.filter((t) => t > oneDayAgo);

        const counts = {
            perSecond: timestamps.filter((t) => t > now - windows.perSecond)
                .length,
            perMinute: timestamps.filter((t) => t > now - windows.perMinute)
                .length,
            perDay: timestamps.length,
        };

        // Check limits, throw on exceed
        for (const key of ['perSecond', 'perMinute', 'perDay']) {
            const max = limit[key];
            if (max && counts[key] >= max) {
                throw new Error(
                    `Rate limit exceeded for ${model}: ${key} limit reached (${counts[key]}/${max}).`
                );
            }
        }

        // Warnings at 80%
        for (const key of ['perSecond', 'perMinute', 'perDay']) {
            const max = limit[key];
            if (max && counts[key] >= Math.floor(max * 0.8)) {
                showAlert(
                    `Rate limit warning for ${model}: ${key} ${counts[key]}/${max}.`,
                    'warning'
                );
                break;
            }
        }

        // Record this request
        timestamps.push(now);
        localStorage.setItem(
            `gemini-rate-usage-${model}`,
            JSON.stringify(timestamps)
        );
    }

    async generateContent(
        prompt,
        model = 'gemini-2.5-flash',
        streaming = false
    ) {
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

    async generateWithTools({
        contents,
        tools = [],
        model = 'gemini-2.5-flash',
        streaming = false,
        toolConfig = {},
    }) {
        if (!this.isApiKeySet()) {
            throw new Error('Gemini API key not set.');
        }

        await this.checkRateLimit(model);

        const url = `${this.baseUrl}${model}:${streaming ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`;

        const requestBody = {
            contents,
            tools:
                tools.length > 0
                    ? [{ function_declarations: tools }]
                    : undefined,
            tool_config:
                tools.length > 0
                    ? {
                        function_calling_config: {
                            mode: 'AUTO',
                            ...toolConfig,
                        },
                    }
                    : undefined,
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
            throw new Error(
                `Gemini API error: ${errorData.error?.message || 'Unknown error'}`
            );
        }

        if (streaming) return response;
        return await response.json();
    }
}

export const gemini = new GeminiAPI();
