export class AIService {
    constructor() {
        this.serverUrl = 'http://localhost:3001'; // Adjust if your server runs elsewhere
    }

    /**
     * Generates slide content using the Qwen AI backend.
     * @param {string} prompt - The user's prompt describing the slides.
     * @param {number} slideCount - The desired number of slides.
     * @param {string} slideStyle - The desired visual style.
     * @returns {Promise<Array<object>>} - A promise that resolves to an array of slide data objects.
     */
    async generateSlidesContent(prompt, slideCount, slideStyle) {
        // Detect slide size from DOM if possible
        let slideWidth = 860;
        let slideHeight = 540;
        let slidePadding = 50;
        const container = document.getElementById('current-slide');
        if (container) {
            const style = window.getComputedStyle(container);
            slideWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            slideHeight = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        }

        const aiPrompt = `
You are generating slides for a web-based slide editor. The slide area is ${slideWidth}px wide and ${slideHeight}px tall, with a padding of ${slidePadding}px on each side. Please ensure all content fits within this area and does not overflow horizontally. 

Generate a presentation with ${slideCount} slides about: "${prompt}".
Style: ${slideStyle}

Respond ONLY with a valid JSON array where each object represents a slide. Each slide object must have:
1. A 'title' (string)
2. An optional 'subtitle' (string)
3. A 'content' array of element objects:
   • { "type": "text", "text": "Paragraph content..." }
   • { "type": "list", "items": ["Item 1", "Item 2"], "style": "bullet" | "numbered" }
   • { "type": "code", "code": "console.log('hello');", "language": "javascript" | "python" | "html" | "css" }
   • { "type": "image", "src": "Brief description of needed image", "alt": "Image description" }

Example structure for a slide:
{
  "title": "Introduction",
  "subtitle": "Getting Started",
  "content": [
    { "type": "text", "text": "This is the introduction." },
    { "type": "list", "items": ["Point A", "Point B"], "style": "bullet" }
  ]
}

Generate exactly ${slideCount} slide objects in a JSON array. Make sure the JSON is valid and fits the given dimensions.`;

        try {
            // Using the dedicated slide generation endpoint
            const response = await fetch(`${this.serverUrl}/api/generate-slides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    prompt: aiPrompt, 
                    slideCount, 
                    slideStyle
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error('Error response from server:', errorData);
                throw new Error(`Server error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const slidesData = await response.json();

            // Basic validation of the response structure
            if (!Array.isArray(slidesData)) {
                console.error('Invalid response format from AI. Expected an array:', slidesData);
                throw new Error('Invalid response format from AI: Expected an array.');
            }
            
            if (slidesData.length === 0 && slideCount > 0) {
                console.warn('AI returned an empty array of slides.');
                // Return empty array, maybe show a message later
            }

            console.log('Received slide data:', slidesData);
            return slidesData;

        } catch (error) {
            console.error('Error fetching slide data:', error);
            // Re-throw the error so it can be caught in app.js
            throw new Error(`Failed to generate slides: ${error.message}`);
        }
    }
}