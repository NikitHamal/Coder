import { gemini } from '../../../gemini.js';

export class AIService {
    constructor() {
    }

    /**
     * Generates slide content using the Gemini AI.
     * @param {string} prompt - The user's prompt describing the slides.
     * @param {number} slideCount - The desired number of slides.
     * @param {string} slideStyle - The desired visual style.
     * @returns {Promise<Array<object>>} - A promise that resolves to an array of slide data objects.
     */
    async generateSlidesContent(prompt, slideCount, slideStyle) {
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
            const response = await gemini.generateContent(aiPrompt, 'gemini-2.5-flash', false);
            const data = await response.json();

            let rawContent = '';
            if (data.candidates && data.candidates.length > 0) {
                rawContent = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Received empty response from Gemini API.");
            }

            const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
            let slidesData;
            if (jsonMatch && jsonMatch[1]) {
                slidesData = JSON.parse(jsonMatch[1]);
            } else {
                slidesData = JSON.parse(rawContent);
            }

            if (!Array.isArray(slidesData)) {
                console.error('Invalid response format from AI. Expected an array:', slidesData);
                throw new Error('Invalid response format from AI: Expected an array.');
            }
            
            if (slidesData.length === 0 && slideCount > 0) {
                console.warn('AI returned an empty array of slides.');
            }

            console.log('Received slide data:', slidesData);
            return slidesData;

        } catch (error) {
            console.error('Error fetching slide data:', error);
            throw new Error(`Failed to generate slides: ${error.message}`);
        }
    }
}