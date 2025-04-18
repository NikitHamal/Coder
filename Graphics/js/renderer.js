/**
 * Renders the graphic data received from the API onto the canvas.
 * @param {object} graphicData - The graphic data object from the API.
 */
function renderGraphic(graphicData) {
    // Use EditorState reference
    if (!EditorState.graphicOutputContainer) {
        console.error("Graphic output container not found for rendering.");
        return;
    }

    // Clear previous content & state
    EditorState.graphicOutputContainer.innerHTML = '';
    EditorState.graphicOutputContainer.classList.remove('graphic-output-placeholder');
    EditorState.graphicOutputContainer.classList.remove('loading');
    // Reset elements array in state if used
    EditorState.elements = [];

    if (!graphicData || !graphicData.canvas || isNaN(parseInt(graphicData.canvas.width)) || isNaN(parseInt(graphicData.canvas.height)) || graphicData.canvas.width <= 0 || graphicData.canvas.height <= 0) {
        const errorMsg = "Invalid or missing canvas dimensions in graphic data.";
        console.error(errorMsg, graphicData);
        showNotification(errorMsg, 'error');
        EditorState.graphicOutputContainer.classList.add('graphic-output-placeholder');
        // Reset dimensions in state
        EditorState.originalWidth = 0;
        EditorState.originalHeight = 0;
        return;
    }

    // Update dimensions in EditorState
    EditorState.originalWidth = parseInt(graphicData.canvas.width);
    EditorState.originalHeight = parseInt(graphicData.canvas.height);
    console.log(`Original dimensions: ${EditorState.originalWidth}x${EditorState.originalHeight}`);

    // Apply original dimensions directly to the container
    EditorState.graphicOutputContainer.style.width = `${EditorState.originalWidth}px`;
    EditorState.graphicOutputContainer.style.height = `${EditorState.originalHeight}px`;
    EditorState.graphicOutputContainer.style.backgroundColor = graphicData.canvas.backgroundColor || '#FFFFFF';
    // Store original dimensions (scale is now handled by CSS transform)
    EditorState.graphicOutputContainer.dataset.originalWidth = EditorState.originalWidth;
    EditorState.graphicOutputContainer.dataset.originalHeight = EditorState.originalHeight;

    // Call functions from canvas-manager.js (already using EditorState)
    setTimeout(() => {
        fitCanvasToView();
        updateCanvasSizeDisplay();
    }, 10);

    if (!Array.isArray(graphicData.elements)) {
        const warnMsg = "Graphic data elements is not an array or is missing.";
        console.warn(warnMsg, graphicData);
        showNotification(warnMsg, 'info');
        return; // Render empty canvas
    }

    graphicData.elements.forEach(elementData => {
        if (!elementData || !elementData.id) {
            console.warn("Skipping invalid element data:", elementData);
            return; // Skip this element
        }

        // Determine template ID based on type
        let templateId = '';
        if (elementData.type === 'text') templateId = 'template-text-element';
        else if (elementData.type === 'shape') templateId = 'template-shape-element';
        else if (elementData.type === 'image') templateId = 'template-image-element';
        else {
            console.warn('Unknown element type, cannot use template:', elementData.type);
             return; // Skip unknown types for now
        }

        // ** Use the helper function from toolbar-actions.js **
        const element = createElementFromTemplate(templateId);
        if (!element) return; // Skip if template failed

        // --- Configure Element (Common properties first) ---
        element.id = elementData.id;

        // --- Apply API Data (Position, Size, Content, Styles etc.) ---
        // (The rest of the configuration and style application logic follows,
        // similar to before, but applied to the 'element' cloned from the template)
        // Ensure editableProps is an array from API or defaults
        let editableProps = [];
        try {
            const parsedProps = elementData.editable; // Assuming API might send { editable: [...] }
            if (Array.isArray(parsedProps)) {
                editableProps = parsedProps;
            } else {
                // Default props if API doesn't provide
                if (elementData.type === 'text') editableProps = ['content', 'style.color', 'style.fontSize', 'style.fontWeight', 'style.textAlign'];
                else if (elementData.type === 'shape') editableProps = ['style.backgroundColor', 'style.borderColor', 'style.borderWidth', 'style.borderRadius'];
                else if (elementData.type === 'image') editableProps = ['src', 'style.borderRadius', 'style.borderColor', 'style.borderWidth', 'style.objectFit'];
            }
        } catch (e) {
            console.warn('Could not parse editable props from API, using defaults for type:', elementData.type);
             // Default props on error
             if (elementData.type === 'text') editableProps = ['content', 'style.color', 'style.fontSize'];
             else if (elementData.type === 'shape') editableProps = ['style.backgroundColor'];
             else if (elementData.type === 'image') editableProps = ['src'];
        }
        // Always add position and size (handled implicitly or via transform potentially)
        if (!editableProps.includes('position')) editableProps.push('position');
        if (!editableProps.includes('size')) editableProps.push('size');

        element.dataset.editableProps = JSON.stringify(editableProps);

        // Use original, unscaled coordinates and dimensions from API data
        const x = elementData.x || 0;
        const y = elementData.y || 0;
        const width = elementData.width || 100;
        const height = elementData.height || 50;

        // Apply common styles with original dimensions
        Object.assign(element.style, {
            position: 'absolute',
            left: `${x}px`, top: `${y}px`,
            width: `${width}px`, height: `${height}px`,
            overflow: 'hidden' // Keep overflow hidden on element itself
        });

        // Store original unscaled dimensions in dataset (already correct)
        element.dataset.originalX = elementData.x || 0;
        element.dataset.originalY = elementData.y || 0;
        element.dataset.originalWidth = elementData.width || 100;
        element.dataset.originalHeight = elementData.height || 50;

        // Apply type-specific styles
        if (elementData.type === 'text') {
            element.textContent = elementData.content || 'Text';
            element.style.whiteSpace = 'pre-wrap';
            element.style.wordBreak = 'break-word';
        } else if (elementData.type === 'shape') {
            // Use var(--border-radius) or specific value from API
            element.style.borderRadius = elementData.style?.borderRadius || 'var(--border-radius)';
            if (elementData.shape === 'circle') {
                element.style.borderRadius = '50%';
            } else if (elementData.shape === 'ellipse') {
                // Setting border radius 50% makes it an ellipse if width != height
                element.style.borderRadius = '50%';
            }
        } else if (elementData.type === 'image') {
            const img = document.createElement('img');
            // Use CONFIG constant for placeholder
            img.src = elementData.src || CONFIG.PLACEHOLDER_IMAGE_URL;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = elementData.style?.objectFit || 'cover';
            element.appendChild(img);
            img.draggable = false;
            img.style.pointerEvents = 'none';
        }

        // Apply custom styles from API data
        if (elementData.style) {
            for (const styleProp in elementData.style) {
                if (typeof element.style[styleProp] !== 'undefined') {
                    // Remove manual scaling of font size
                    // if (styleProp === 'fontSize' && typeof elementData.style[styleProp] === 'string') {
                    //     const fontSize = parseFloat(elementData.style[styleProp]);
                    //     if (!isNaN(fontSize)) {
                    //         const unit = elementData.style[styleProp].replace(/[\d.]/g, '');
                    //         element.style[styleProp] = `${fontSize * EditorState.displayScale}${unit}`;
                    //         continue; // Skip default assignment below
                    //     }
                    // }
                    // Apply style directly from API data
                    element.style[styleProp] = elementData.style[styleProp];
                }
            }
        }

        // Ensure default font for text if not specified, use CONFIG
        if (elementData.type === 'text' && !element.style.fontFamily) {
            element.style.fontFamily = CONFIG.DEFAULT_FONT_FAMILY;
        }

        // Store original data (optional, could be derived from state)
        element.dataset.originalData = JSON.stringify(elementData);

        // Attach event listeners (calls functions from other modules)
        element.addEventListener('mousedown', (e) => {
             // Check for double-click on text elements for editing
            if (e.detail === 2 && element.dataset.elementType === 'text') {
                 editTextInPlace(element); // Function from toolbar-actions.js
            } else {
                 // Standard select and drag initiation
                 selectElement(element); // Function from element-selector.js
                 startDrag(e, element); // Function from element-dragger.js
            }
        });

        // Add to the main container
        EditorState.graphicOutputContainer.appendChild(element);

        // Add element data to EditorState
        EditorState.elements.push({
            id: element.id,
            type: elementData.type,
            shape: elementData.shape, // Store shape type if applicable
            x: parseFloat(element.dataset.originalX || 0),
            y: parseFloat(element.dataset.originalY || 0),
            width: parseFloat(element.dataset.originalWidth || 100),
            height: parseFloat(element.dataset.originalHeight || 50),
            content: elementData.content, // Store original content
            src: elementData.src,         // Store original src
            alt: elementData.alt,         // Store original alt
            style: { ...elementData.style }, // Store a copy of original styles
            editable: editableProps // Store the processed editable props
            // Note: We store *original* unscaled values here
        });
    });

    console.log("Render complete. EditorState.elements:", EditorState.elements);
} 