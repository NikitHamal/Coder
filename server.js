const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Gemini AI Configuration
let geminiAI = null;
let currentApiKey = null;

// Initialize Gemini AI with API key
function initializeGeminiAI(apiKey) {
  if (!apiKey || apiKey === currentApiKey) return;
  
  try {
    geminiAI = new GoogleGenerativeAI(apiKey);
    currentApiKey = apiKey;
    console.log('Gemini AI initialized successfully');
  } catch (error) {
    console.error('Error initializing Gemini AI:', error);
    geminiAI = null;
    currentApiKey = null;
  }
}

// Rate limiting storage
const rateLimitStore = new Map();

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const modelId = req.body.model || 'gemini-2.0-flash';
  const now = Date.now();
  const minuteKey = `${modelId}:${Math.floor(now / 60000)}`;
  const dayKey = `${modelId}:${Math.floor(now / 86400000)}`;

  // Initialize rate limit tracking
  if (!rateLimitStore.has(minuteKey)) {
    rateLimitStore.set(minuteKey, { requests: 0, tokens: 0 });
  }
  if (!rateLimitStore.has(dayKey)) {
    rateLimitStore.set(dayKey, { requests: 0, tokens: 0 });
  }

  const minuteUsage = rateLimitStore.get(minuteKey);
  const dayUsage = rateLimitStore.get(dayKey);

  // Check rate limits (using conservative limits)
  if (minuteUsage.requests >= 1500) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded per minute',
      retryAfter: 60
    });
  }
  if (dayUsage.requests >= 1000000) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded per day',
      retryAfter: 86400
    });
  }

  // Record usage
  minuteUsage.requests++;
  dayUsage.requests++;

  next();
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  const cutoff = now - (2 * 24 * 60 * 60 * 1000); // 2 days
  for (const [key] of rateLimitStore) {
    const timestamp = parseInt(key.split(':')[1]) * 60000;
    if (timestamp < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// API endpoint to validate Gemini API key
app.post('/api/gemini/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({ 
        valid: false, 
        error: 'API key is required' 
      });
    }

    // Initialize Gemini AI with the provided key
    initializeGeminiAI(apiKey);
    
    if (!geminiAI) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid API key format' 
      });
    }

    // Test the API key with a simple request
    try {
      const model = geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Hello');
      await result.response;
      
      res.json({ 
        valid: true, 
        message: 'API key validated successfully' 
      });
    } catch (error) {
      console.error('API key validation error:', error);
      res.status(401).json({ 
        valid: false, 
        error: 'Invalid API key or API error' 
      });
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Server error during validation' 
    });
  }
});

// API endpoint to get Gemini models
app.get('/api/gemini/models', (req, res) => {
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
  
  res.json({ models });
});

// API endpoint to get rate limit usage
app.get('/api/gemini/usage/:modelId', (req, res) => {
  const { modelId } = req.params;
  const now = Date.now();
  const minuteKey = `${modelId}:${Math.floor(now / 60000)}`;
  const dayKey = `${modelId}:${Math.floor(now / 86400000)}`;

  const minuteUsage = rateLimitStore.get(minuteKey) || { requests: 0, tokens: 0 };
  const dayUsage = rateLimitStore.get(dayKey) || { requests: 0, tokens: 0 };

  res.json({
    model: modelId,
    currentMinute: {
      requests: minuteUsage.requests,
      limit: 1500,
      remaining: Math.max(0, 1500 - minuteUsage.requests)
    },
    currentDay: {
      requests: dayUsage.requests,
      limit: 1000000,
      remaining: Math.max(0, 1000000 - dayUsage.requests)
    }
  });
});

// API endpoint for Gemini chat completions
app.post('/api/gemini/chat-completions', rateLimitMiddleware, async (req, res) => {
  try {
    const { 
      message, 
      modelId = 'gemini-2.0-flash', 
      previousMessages = [], 
      mode = 'ask', 
      workspaceContext = null,
      apiKey 
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize Gemini AI if API key provided
    if (apiKey) {
      initializeGeminiAI(apiKey);
    }

    if (!geminiAI) {
      return res.status(401).json({ 
        error: 'Gemini AI not initialized. Please provide a valid API key.' 
      });
    }

    // Prepare the conversation history
    let conversationHistory = [];
    
    // Add previous messages to conversation history
    if (Array.isArray(previousMessages) && previousMessages.length > 0) {
      conversationHistory = previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
    }

    // Prepare the current message
    let finalMessage = message;
    
    // Handle write mode with context
    if (mode === 'write' && workspaceContext) {
      const writeInstructions = `You are in 'write' mode. Analyze the request and the provided context (formatted with Markdown headers: ## File List, ## Active File Path, ## Active File Symbols, ## Active File Content).

Context:
---
${workspaceContext}
---

Respond ONLY with a JSON object containing an 'actions' array (objects with 'type', 'path', 'content') and an 'explanation' string. Example: { "actions": [{ "type": "create_file", "path": "new.js", "content": "console.log('hello');" }], "explanation": "Created new.js." }`;

      finalMessage = `${writeInstructions}\n\nUser request: ${message}`;
    }

    // Add the current message to conversation history
    conversationHistory.push({
      role: 'user',
      parts: [{ text: finalMessage }]
    });

    // Get the Gemini model
    const model = geminiAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // Start chat session
    const chat = model.startChat({
      history: conversationHistory.slice(0, -1), // Exclude current message from history
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // Set response headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial response
    res.write('data: {"type": "start", "model": "' + modelId + '"}\n\n');

    try {
      // Generate content
      const result = await chat.sendMessage(finalMessage);
      const response = await result.response;
      const text = response.text();

      // Send the response in chunks for streaming effect
      const chunks = text.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const data = {
          type: 'content',
          content: chunk + (i < chunks.length - 1 ? ' ' : ''),
          isComplete: i === chunks.length - 1
        };
        
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        
        // Small delay for streaming effect
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send completion signal
      res.write('data: {"type": "done"}\n\n');
      
    } catch (error) {
      console.error('Error generating content:', error);
      res.write(`data: {"type": "error", "error": "${error.message}"}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Error in chat completions:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate response', 
        details: error.message 
      });
    } else {
      res.write(`data: {"type": "error", "error": "${error.message}"}\n\n`);
      res.end();
    }
  }
});

// API endpoint for non-streaming completions (for write mode)
app.post('/api/gemini/completions', rateLimitMiddleware, async (req, res) => {
  try {
    const { 
      message, 
      modelId = 'gemini-2.0-flash', 
      mode = 'ask', 
      workspaceContext = null,
      apiKey 
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize Gemini AI if API key provided
    if (apiKey) {
      initializeGeminiAI(apiKey);
    }

    if (!geminiAI) {
      return res.status(401).json({ 
        error: 'Gemini AI not initialized. Please provide a valid API key.' 
      });
    }

    // Prepare the message
    let finalMessage = message;
    
    if (mode === 'write' && workspaceContext) {
      const writeInstructions = `You are in 'write' mode. Analyze the request and the provided context (formatted with Markdown headers: ## File List, ## Active File Path, ## Active File Symbols, ## Active File Content).

Context:
---
${workspaceContext}
---

Respond ONLY with a JSON object containing an 'actions' array (objects with 'type', 'path', 'content') and an 'explanation' string. Example: { "actions": [{ "type": "create_file", "path": "new.js", "content": "console.log('hello');" }], "explanation": "Created new.js." }`;

      finalMessage = `${writeInstructions}\n\nUser request: ${message}`;
    }

    // Get the Gemini model
    const model = geminiAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // Generate content
    const result = await model.generateContent(finalMessage);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      content: text,
      model: modelId,
      usage: {
        promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.response.usageMetadata?.totalTokenCount || 0
      }
    });

  } catch (error) {
    console.error('Error in completions:', error);
    res.status(500).json({ 
      error: 'Failed to generate response', 
      details: error.message 
    });
  }
});

// API endpoint for slide generation
app.post('/api/gemini/slides', rateLimitMiddleware, async (req, res) => {
  try {
    const { 
      topic, 
      modelId = 'gemini-2.0-flash', 
      apiKey 
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Initialize Gemini AI if API key provided
    if (apiKey) {
      initializeGeminiAI(apiKey);
    }

    if (!geminiAI) {
      return res.status(401).json({ 
        error: 'Gemini AI not initialized. Please provide a valid API key.' 
      });
    }

    const prompt = `Create a comprehensive slide presentation about "${topic}". 
    Return the response as a JSON object with the following structure:
    {
      "title": "Presentation Title",
      "slides": [
        {
          "title": "Slide Title",
          "content": "Slide content with bullet points",
          "type": "title|content|summary"
        }
      ]
    }
    
    Make it informative, well-structured, and suitable for a professional presentation.`;

    // Get the Gemini model
    const model = geminiAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse the response as JSON
    try {
      const slidesData = JSON.parse(text);
      res.json({
        success: true,
        slides: slidesData,
        model: modelId
      });
    } catch (parseError) {
      // If parsing fails, return the raw text
      res.json({
        success: true,
        slides: {
          title: `Presentation about ${topic}`,
          slides: [{
            title: 'Generated Content',
            content: text,
            type: 'content'
          }]
        },
        model: modelId,
        rawResponse: text
      });
    }

  } catch (error) {
    console.error('Error generating slides:', error);
    res.status(500).json({ 
      error: 'Failed to generate slides', 
      details: error.message 
    });
  }
});

// API endpoint for graphic generation (text-to-image)
app.post('/api/gemini/graphics', rateLimitMiddleware, async (req, res) => {
  try {
    const { 
      prompt, 
      width = 1024, 
      height = 1024, 
      modelId = 'gemini-2.0-flash', 
      apiKey 
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Initialize Gemini AI if API key provided
    if (apiKey) {
      initializeGeminiAI(apiKey);
    }

    if (!geminiAI) {
      return res.status(401).json({ 
        error: 'Gemini AI not initialized. Please provide a valid API key.' 
      });
    }

    // Note: Gemini doesn't support text-to-image generation directly
    // This endpoint will return a descriptive response instead
    const enhancedPrompt = `Create a detailed description of an image based on: "${prompt}".
    
    The image should be ${width}x${height} pixels.
    
    Return a JSON response with:
    {
      "description": "Detailed visual description",
      "suggestions": ["Alternative image ideas"],
      "note": "Gemini doesn't generate images directly, but here's what the image would look like"
    }`;

    // Get the Gemini model
    const model = geminiAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.8,
        topP: 0.9,
        topK: 40
      }
    });

    // Generate content
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const text = response.text();

    try {
      const graphicData = JSON.parse(text);
      res.json({
        success: true,
        graphic: graphicData,
        model: modelId,
        note: "Gemini doesn't generate images directly. Consider using DALL-E, Midjourney, or Stable Diffusion for actual image generation."
      });
    } catch (parseError) {
      res.json({
        success: true,
        graphic: {
          description: text,
          suggestions: [],
          note: "Gemini doesn't generate images directly. Consider using DALL-E, Midjourney, or Stable Diffusion for actual image generation."
        },
        model: modelId
      });
    }

  } catch (error) {
    console.error('Error generating graphic description:', error);
    res.status(500).json({ 
      error: 'Failed to generate graphic description', 
      details: error.message 
    });
  }
});

// File system endpoints
app.get('/api/files', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    function getFileList(dirPath, basePath = '') {
      const items = [];
      try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          const relativePath = path.join(basePath, file).replace(/\\/g, '/');
          const stats = fs.statSync(fullPath);
          
          items.push({
            name: file,
            path: '/' + relativePath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.isDirectory() ? 0 : stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
      }
      
      return items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    }
    
    const workspacePath = process.cwd();
    const files = getFileList(workspacePath);
    
    res.json(files);
  } catch (error) {
    console.error('Error getting file list:', error);
    res.status(500).json({ error: 'Failed to get file list' });
  }
});

app.post('/api/files/read', (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot read directory' });
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content, size: stats.size, modified: stats.mtime.toISOString() });
    
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

app.post('/api/files/write', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    // Ensure directory exists
    const dir = require('path').dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content || '');
    res.json({ success: true, message: 'File written successfully' });
    
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: 'Failed to write file' });
  }
});

app.post('/api/files/create', (req, res) => {
  try {
    const { path: filePath, content = '' } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'File already exists' });
    }
    
    // Ensure directory exists
    const dir = require('path').dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
    res.json({ success: true, message: 'File created successfully' });
    
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

app.post('/api/files/delete', (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlinkSync(fullPath);
    res.json({ success: true, message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.post('/api/files/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old path and new path are required' });
    }
    
    const fs = require('fs');
    const oldFullPath = require('path').join(process.cwd(), oldPath.replace(/^\//, ''));
    const newFullPath = require('path').join(process.cwd(), newPath.replace(/^\//, ''));
    
    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ error: 'Source file not found' });
    }
    
    if (fs.existsSync(newFullPath)) {
      return res.status(409).json({ error: 'Destination file already exists' });
    }
    
    // Ensure directory exists
    const dir = require('path').dirname(newFullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.renameSync(oldFullPath, newFullPath);
    res.json({ success: true, message: 'File renamed successfully' });
    
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

app.post('/api/files/exists', (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    res.json({ exists: fs.existsSync(fullPath) });
    
  } catch (error) {
    console.error('Error checking file existence:', error);
    res.status(500).json({ error: 'Failed to check file existence' });
  }
});

app.post('/api/files/info', (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fs = require('fs');
    const fullPath = require('path').join(process.cwd(), filePath.replace(/^\//, ''));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = fs.statSync(fullPath);
    res.json({
      info: {
        name: require('path').basename(fullPath),
        path: filePath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Coder Gemini AI Server',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    geminiInitialized: !!geminiAI
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Coder Gemini AI Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`🔑 Set your Gemini API key in the settings to get started`);
}); 