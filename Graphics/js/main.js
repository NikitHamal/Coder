document.addEventListener('DOMContentLoaded', () => {
    const sizeSelect = document.getElementById('size-select');
    const customSizeInput = document.querySelector('.custom-size-input');
    const generateButton = document.getElementById('generate-button');
    const promptInput = document.getElementById('prompt-input');
    const graphicOutput = document.getElementById('graphic-output');
    const customWidthInput = document.getElementById('custom-width');
    const customHeightInput = document.getElementById('custom-height');
    const promptButtons = document.querySelectorAll('.prompt-button');
    const canvasContainer = document.getElementById('canvas-container');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    // --- Initialize Core Components ---
    // EventBus is defined globally in event-bus.js
    const historyManager = new HistoryManager(canvasContainer, undoBtn, redoBtn, EventBus);
    window.historyManager = historyManager; // Make it globally accessible

    // Show/hide custom size inputs
    sizeSelect.addEventListener('change', () => {
        if (sizeSelect.value === 'custom') {
            customSizeInput.style.display = 'block';
        } else {
            customSizeInput.style.display = 'none';
        }
    });

    // Handle example prompt button clicks
    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            promptInput.value = button.dataset.prompt;
        });
    });

    // Handle generation request
    generateButton.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        let width, height;

        if (sizeSelect.value === 'custom') {
            width = parseInt(customWidthInput.value, 10);
            height = parseInt(customHeightInput.value, 10);
        } else {
            [width, height] = sizeSelect.value.split('x').map(Number);
        }

        if (!prompt) {
            alert('Please enter a description for your graphic.');
            return;
        }

        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            alert('Please select a valid size or enter valid custom dimensions.');
            return;
        }

        console.log(`Generating graphic with prompt: "${prompt}", size: ${width}x${height}`);
        
        // Clear existing content and show loading indicator
        graphicOutput.innerHTML = '<p>Generating your graphic...</p>';
        graphicOutput.classList.add('loading');
        
        // Reset any custom styling that might affect dimensions
        graphicOutput.style.removeProperty('--scale');
        graphicOutput.style.width = 'auto';
        graphicOutput.style.height = 'auto';

        try {
            // Call the API function (defined in api.js)
            const graphicData = await callQwenAPI(prompt, width, height);
            
            // Ensure canvas dimensions match the requested size
            if (graphicData && graphicData.canvas) {
                graphicData.canvas.width = width;
                graphicData.canvas.height = height;
            }

            // Render the graphic (function defined in editor.js)
            renderGraphic(graphicData);

            // Record the state AFTER successful generation and rendering
            historyManager.recordState();

        } catch (error) {
            console.error('Error generating graphic:', error);
            graphicOutput.innerHTML = `<p style="color: red;">Error: Could not generate graphic. ${error.message}</p>`;
            // Reset size and remove loading class if error occurs before rendering
            graphicOutput.style.width = 'auto';
            graphicOutput.style.height = 'auto';
            graphicOutput.classList.remove('loading');
        }
    });

    // --- Initial Setup ---
    // Set initial canvas size based on default selection
    const initialSize = sizeSelect.value.split('x').map(Number);
    // graphicOutput.style.width = `${initialSize[0]}px`; // Let's not set initial size until generation
    // graphicOutput.style.height = `${initialSize[1]}px`;

    // --- History Management Listeners ---
    undoBtn.addEventListener('click', () => {
        historyManager.undo();
    });

    redoBtn.addEventListener('click', () => {
        historyManager.redo();
    });

    // Listen for history restoration to re-bind listeners
    EventBus.subscribe('history:restored', () => {
        console.log('Caught history:restored event in main.js');
        // Re-attach mousedown listeners for drag/select/edit
        // Assumes rebindCanvasElementListeners is globally accessible from toolbar-actions.js
        rebindCanvasElementListeners(canvasContainer);

        // TODO: Handle re-selection and resize handles if needed
        // After restoring, the previously selected element might need to be re-selected
        // and its resize handles recreated.
        // Option 1: Deselect everything after restore
        // deselectElement(); // Assumes this function exists and removes handles
        // Option 2: Try to find and re-select the previously selected element (more complex)
        // const selectedId = EditorState.selectedElement ? EditorState.selectedElement.id : null;
        // if (selectedId) {
        //     const restoredElement = canvasContainer.querySelector(`#${selectedId}`);
        //     if (restoredElement) selectElement(restoredElement);
        // }
    });

    // --- Subscribe to Selection Events for UI Updates ---
    EventBus.subscribe('elementSelected', (eventData) => {
        // Update ordering buttons when selection changes
        // Assumes updateOrderButtonStates is globally accessible from toolbar-actions.js
        updateOrderButtonStates();
        // Other UI updates based on selection can go here (e.g., enabling/disabling controls)
    });

    EventBus.subscribe('elementDeselected', () => {
         // Update ordering buttons when deselected
        updateOrderButtonStates();
         // Other UI updates for deselection
    });

    // --- Initial UI State Setup ---
    updateOrderButtonStates(); // Set initial state for ordering buttons

}); 