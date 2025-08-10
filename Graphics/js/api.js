import { gemini } from '../../gemini.js';

/**
 * Calls the Gemini API to generate graphic data based on the prompt and size.
 * @param {string} prompt - The user's description of the graphic.
 * @param {number} width - The desired width of the graphic.
 * @param {number} height - The desired height of the graphic.
 * @returns {Promise<object>} - A promise that resolves with the graphic data object.
 */
async function generateGraphic(prompt, width, height) {
    console.log('Sending request to Gemini API for graphic generation.');

    const structuredPrompt = `
        Generate a graphic based on the following description: '${prompt}'.
        The canvas size should be ${width}x${height} pixels.
        Represent the graphic as a JSON object with:
        1. A 'canvas' object containing 'width', 'height', and 'backgroundColor'.
        2. An 'elements' array, where each element is an object with:
           - 'id': A unique string identifier (e.g., 'elem-1').
           - 'type': The element type ('text', 'shape', 'image').
           - 'x', 'y': Top-left coordinates in pixels.
           - 'width', 'height': Dimensions in pixels.
           - 'content': (For type 'text') The text content.
           - 'shape': (For type 'shape') The shape type ('rectangle', 'circle', 'ellipse').
           - 'src': (For type 'image') Placeholder for image URL or data.
           - 'style': An object containing CSS style properties (e.g., 'color', 'backgroundColor', 'fontSize', 'fontFamily': 'Poppins', 'fontWeight', 'textAlign', 'borderRadius': '4px', 'borderColor', 'borderWidth'). Use black and white primarily, respecting the Poppins font and 4px radius where applicable.
           - 'editable': An array listing the properties that should be user-editable (e.g., ['content', 'position', 'size', 'style']).

        Ensure the output is ONLY the JSON object, nothing else.
    `;

    try {
        const response = await gemini.generateContent(structuredPrompt, 'gemini-2.5-flash', false);
        const data = await response.json();

        let rawContent = '';
        if (data.candidates && data.candidates.length > 0) {
            rawContent = data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Received empty response from Gemini API.");
        }

        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        let graphicJson;
        if (jsonMatch && jsonMatch[1]) {
            graphicJson = JSON.parse(jsonMatch[1]);
        } else {
            graphicJson = JSON.parse(rawContent);
        }

        if (!graphicJson || !graphicJson.canvas || !Array.isArray(graphicJson.elements)) {
            console.error("Invalid data structure received from API:", graphicJson);
            throw new Error('Invalid data structure received from the AI.');
        }

        graphicJson.canvas.width = width;
        graphicJson.canvas.height = height;

        console.log('Received graphic data from API:', graphicJson);
        return graphicJson;

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error(`Failed to communicate with the generation service. ${error.message}`);
    }
} 