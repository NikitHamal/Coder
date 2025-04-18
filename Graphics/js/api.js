const API_ENDPOINT = '/generate-graphic'; // Assuming this endpoint exists on your server.js

/**
 * Calls the backend API to generate graphic data based on the prompt and size.
 * @param {string} prompt - The user's description of the graphic.
 * @param {number} width - The desired width of the graphic.
 * @param {number} height - The desired height of the graphic.
 * @returns {Promise<object>} - A promise that resolves with the graphic data object.
 */
async function callQwenAPI(prompt, width, height) {
    console.log('Sending request to API endpoint:', API_ENDPOINT);

    // Construct the prompt for the AI, requesting the specific JSON format
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
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the structured prompt to the backend
            // The backend server.js should handle passing this (or the relevant parts)
            // to the actual Qwen API.
            body: JSON.stringify({ prompt: structuredPrompt, width, height }),
        });

        if (!response.ok) {
            // Try to get error details from the response body
            let errorBody = 'Unknown error';
            try {
                errorBody = await response.text();
            } catch (e) { /* Ignore inability to read body */ }
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();

        // Basic validation of the received structure
        if (!data || !data.canvas || !Array.isArray(data.elements)) {
             console.error("Invalid data structure received from API:", data);
             throw new Error('Invalid data structure received from the AI.');
        }
        
        // Force the correct dimensions in the data
        data.canvas.width = width;
        data.canvas.height = height;

        console.log('Received graphic data from API:', data);
        return data;

    } catch (error) {
        console.error('Error calling backend API:', error);
        // Re-throw the error to be caught by the main.js handler
        throw new Error(`Failed to communicate with the generation service. ${error.message}`);
    }
} 