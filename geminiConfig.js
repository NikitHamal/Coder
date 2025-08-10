// Gemini Configuration - All available models with rate limits
export const GEMINI_MODELS = {
  // Gemini 2.0 Models
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Fastest Gemini 2.0 model for quick responses',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    description: 'Fast and efficient Gemini 2.0 model',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-2.0-pro': {
    name: 'Gemini 2.0 Pro',
    description: 'Most capable Gemini 2.0 model for complex tasks',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-2.0-pro-latest': {
    name: 'Gemini 2.0 Pro (Latest)',
    description: 'Latest version of Gemini 2.0 Pro',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  
  // Gemini 1.5 Models
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    description: 'Fast Gemini 1.5 model with 1M context',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-1.5-flash-latest': {
    name: 'Gemini 1.5 Flash (Latest)',
    description: 'Latest Gemini 1.5 Flash model',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    description: 'Pro Gemini 1.5 model with 1M context',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-1.5-pro-latest': {
    name: 'Gemini 1.5 Pro (Latest)',
    description: 'Latest Gemini 1.5 Pro model',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 1048576,
    supportsVision: true,
    supportsCode: true
  },
  
  // Gemini 1.0 Models (Legacy but still available)
  'gemini-1.0-pro': {
    name: 'Gemini 1.0 Pro',
    description: 'Legacy Gemini 1.0 Pro model',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 30720,
    supportsVision: true,
    supportsCode: true
  },
  'gemini-1.0-pro-vision': {
    name: 'Gemini 1.0 Pro Vision',
    description: 'Legacy Gemini 1.0 Pro with enhanced vision',
    rateLimit: {
      requestsPerMinute: 1500,
      requestsPerDay: 1000000,
      tokensPerMinute: 1000000,
      tokensPerDay: 100000000
    },
    maxTokens: 30720,
    supportsVision: true,
    supportsCode: true
  }
};

// Rate limiting utility
export class RateLimiter {
  constructor() {
    this.usage = new Map();
  }

  canMakeRequest(modelId, requestType = 'request') {
    const model = GEMINI_MODELS[modelId];
    if (!model) return false;

    const now = Date.now();
    const minuteKey = `${modelId}:${Math.floor(now / 60000)}`;
    const dayKey = `${modelId}:${Math.floor(now / 86400000)}`;

    // Initialize usage tracking
    if (!this.usage.has(minuteKey)) {
      this.usage.set(minuteKey, { requests: 0, tokens: 0 });
    }
    if (!this.usage.has(dayKey)) {
      this.usage.set(dayKey, { requests: 0, tokens: 0 });
    }

    const minuteUsage = this.usage.get(minuteKey);
    const dayUsage = this.usage.get(dayKey);

    // Check rate limits
    if (minuteUsage.requests >= model.rateLimit.requestsPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded per minute' };
    }
    if (dayUsage.requests >= model.rateLimit.requestsPerDay) {
      return { allowed: false, reason: 'Rate limit exceeded per day' };
    }

    return { allowed: true };
  }

  recordUsage(modelId, tokens = 0) {
    const now = Date.now();
    const minuteKey = `${modelId}:${Math.floor(now / 60000)}`;
    const dayKey = `${modelId}:${Math.floor(now / 86400000)}`;

    if (!this.usage.has(minuteKey)) {
      this.usage.set(minuteKey, { requests: 0, tokens: 0 });
    }
    if (!this.usage.has(dayKey)) {
      this.usage.set(dayKey, { requests: 0, tokens: 0 });
    }

    this.usage.get(minuteKey).requests++;
    this.usage.get(minuteKey).tokens += tokens;
    this.usage.get(dayKey).requests++;
    this.usage.get(dayKey).tokens += tokens;

    // Clean up old entries (older than 2 days)
    const cutoff = now - (2 * 24 * 60 * 60 * 1000);
    for (const [key] of this.usage) {
      const timestamp = parseInt(key.split(':')[1]) * 60000;
      if (timestamp < cutoff) {
        this.usage.delete(key);
      }
    }
  }

  getUsageStats(modelId) {
    const now = Date.now();
    const minuteKey = `${modelId}:${Math.floor(now / 60000)}`;
    const dayKey = `${modelId}:${Math.floor(now / 86400000)}`;

    const minuteUsage = this.usage.get(minuteKey) || { requests: 0, tokens: 0 };
    const dayUsage = this.usage.get(dayKey) || { requests: 0, tokens: 0 };
    const model = GEMINI_MODELS[modelId];

    return {
      model: model?.name || 'Unknown',
      currentMinute: {
        requests: minuteUsage.requests,
        limit: model?.rateLimit.requestsPerMinute || 0,
        remaining: Math.max(0, (model?.rateLimit.requestsPerMinute || 0) - minuteUsage.requests)
      },
      currentDay: {
        requests: dayUsage.requests,
        limit: model?.rateLimit.requestsPerDay || 0,
        remaining: Math.max(0, (model?.rateLimit.requestsPerDay || 0) - dayUsage.requests)
      }
    };
  }
}

// Default model selection
export const DEFAULT_MODEL = 'gemini-2.0-flash';
export const CODING_MODEL = 'gemini-2.0-pro';
export const FAST_MODEL = 'gemini-2.0-flash';