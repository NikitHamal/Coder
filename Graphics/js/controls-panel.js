/**
 * Initializes the controls panel with default message.
 */
function initializeControlsPanel() {
    if (EditorState.controlsPanel) {
        // Create the button first (if needed)
        createControlsToggleButton();
        // Set initial content (will keep the button because we don't overwrite innerHTML here)
        clearControlsPanelContentOnly();
        toggleControlsPanel(false); // Ensure it starts hidden
    }
}

/**
 * Update the controls panel based on the selected element's properties.
 */
function updateControlsPanel(element) {
    if (!EditorState.controlsPanel) return;

    // Ensure toggle button exists (it should, from init)
    createControlsToggleButton();

    // Clear only the controls content, not the button
    clearControlsPanelContentOnly();

    if (!element) {
        // If no element, show default message
         showDefaultControlsMessage();
        return;
    }

    // Add title back
    const title = document.createElement('h3');
    title.textContent = `Customize ${element.dataset.elementType || 'Element'}`;
    EditorState.controlsPanel.appendChild(title);

    // Add a container for generated controls
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    EditorState.controlsPanel.appendChild(controlsContainer);

    // Add basic info (can be styled better later)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'control-group basic-info';
    infoDiv.innerHTML = `
        <p>ID: ${element.id}</p>
        <p>Pos: (${element.dataset.originalX || 0}, ${element.dataset.originalY || 0})</p>
        <p>Size: ${element.dataset.originalWidth || 0} x ${element.dataset.originalHeight || 0}</p>
    `;
    controlsContainer.appendChild(infoDiv);

    // Generate controls based on editableProps
    try {
        const props = JSON.parse(element.dataset.editableProps || '[]');
        console.log('Generating controls for props:', props);

        props.forEach(prop => {
            // Skip position/size as they are handled by drag/resize visually
            if (prop === 'position' || prop === 'size') return;

            if (prop === 'content') {
                appendTextAreaControl(controlsContainer, element, 'textContent', 'Content:');
            } else if (prop === 'src' && element.dataset.elementType === 'image') {
                appendTextInputControl(controlsContainer, element, 'src', 'Image URL:', 'url');
            } else if (prop.startsWith('style.')) {
                const styleProp = prop.substring(6);
                const label = styleProp.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) + ':';

                if (styleProp.toLowerCase().includes('color')) {
                    appendColorInputControl(controlsContainer, element, styleProp, label);
                } else if (styleProp === 'fontSize' || styleProp === 'borderWidth' || styleProp === 'borderRadius') {
                    // Extract unit and value for number inputs
                    const currentValue = element.style[styleProp] || '';
                    const value = parseFloat(currentValue) || 0;
                    const unit = currentValue.replace(/[\d.-]/g, '') || 'px'; // Default to px
                    let min = 0, max = 1000, step = 1;
                    if (styleProp === 'fontSize') { min = 8; max = 120; }
                    if (styleProp === 'borderWidth') { max = 20; }
                    if (styleProp === 'borderRadius') { max = 100; }

                    appendNumberInputControl(controlsContainer, element, styleProp, label, min, max, step, unit);
                } else if (styleProp === 'fontWeight') {
                    appendSelectControl(controlsContainer, element, styleProp, label, ['normal', 'bold']);
                } else if (styleProp === 'textAlign') {
                    appendSelectControl(controlsContainer, element, styleProp, label, ['left', 'center', 'right']);
                } else if (styleProp === 'fontFamily') {
                    const fonts = ['Poppins', 'Roboto', 'Montserrat', 'Lato', 'Arial', 'Helvetica', 'sans-serif']; // Add more system/Google fonts as needed
                    appendSelectControl(controlsContainer, element, styleProp, label, fonts);
                } else if (styleProp === 'objectFit' && element.dataset.elementType === 'image') {
                     appendSelectControl(controlsContainer, element, styleProp, label, ['cover', 'contain', 'fill', 'none', 'scale-down']);
                }
                // Add more style handlers here (e.g., font family dropdown)
            }
        });

    } catch (e) {
        console.error('Error parsing editableProps or generating controls:', e);
        controlsContainer.innerHTML += '<p style="color: red;">Error loading controls.</p>';
    }
}

/**
 * Clears only the generated controls and messages from the panel,
 * leaving the toggle button intact.
 */
function clearControlsPanelContentOnly() {
    if (!EditorState.controlsPanel) return;
    // Remove all children except the toggle button
    const toggleButton = EditorState.controlsPanel.querySelector('#controls-toggle-btn');
    while (EditorState.controlsPanel.lastChild && EditorState.controlsPanel.lastChild !== toggleButton) {
        EditorState.controlsPanel.removeChild(EditorState.controlsPanel.lastChild);
    }
}

/**
 * Shows the default message in the controls panel content area.
 */
function showDefaultControlsMessage() {
     if (!EditorState.controlsPanel) return;
     clearControlsPanelContentOnly(); // Clear existing controls first
     const title = document.createElement('h3');
     title.textContent = 'Customize';
     const message = document.createElement('p');
     message.textContent = 'Select an element on the canvas to customize.';
     EditorState.controlsPanel.appendChild(title);
     EditorState.controlsPanel.appendChild(message);
}

// --- Control Helper Functions ---

/** Helper to find element state */
function findElementStateById(elementId) {
    return EditorState.elements.find(elState => elState.id === elementId);
}

function createControlContainer(parent, labelText, controlId) {
    const container = document.createElement('div');
    container.className = 'control-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    label.htmlFor = controlId;
    container.appendChild(label);
    parent.appendChild(container);
    return container; // Return the container to append the input to
}

function appendTextAreaControl(parent, element, property, labelText) {
    const controlId = `control-${element.id}-${property}`;
    const container = createControlContainer(parent, labelText, controlId);

    const textarea = document.createElement('textarea');
    textarea.id = controlId;
    textarea.value = element[property] || ''; // Use property accessor

    textarea.addEventListener('input', (e) => {
        const newValue = e.target.value;
        element[property] = newValue; // Update DOM
        // *** Update State ***
        const elementState = findElementStateById(element.id);
        if (elementState) {
            elementState[property] = newValue;
            console.log('Updated state (textarea):', element.id, property, newValue);
        }
    });
    textarea.addEventListener('focus', () => element.classList.add('editing'));
    textarea.addEventListener('blur', () => {
        element.classList.remove('editing');
        // Record history state after text editing is finished (on blur)
        if (window.historyManager) window.historyManager.recordState();
    });

    container.appendChild(textarea);
}

function appendTextInputControl(parent, element, property, labelText, inputType = 'text') {
    const controlId = `control-${element.id}-${property}`;
    const container = createControlContainer(parent, labelText, controlId);

    const input = document.createElement('input');
    input.id = controlId;
    input.type = inputType;

    if (property === 'src' && element.tagName.toLowerCase() === 'div' && element.querySelector('img')) {
        // Special case for image source: target the img tag
        input.value = element.querySelector('img').src || '';
    } else {
        input.value = element[property] || '';
    }

    input.addEventListener('input', (e) => {
        const newValue = e.target.value;
        const elementState = findElementStateById(element.id);
        // Special case for image src
         if (property === 'src' && element.tagName.toLowerCase() === 'div' && element.querySelector('img')) {
             element.querySelector('img').src = newValue; // Update DOM
             element.dataset.originalSrc = newValue; // Update dataset
             // *** Update State ***
             if (elementState) {
                 elementState.src = newValue;
                 console.log('Updated state (img src):', element.id, newValue);
             }
         } else {
            element[property] = newValue; // Update DOM
            // *** Update State ***
             if (elementState) {
                 elementState[property] = newValue;
                 console.log('Updated state (text input):', element.id, property, newValue);
             }
         }
    });
    input.addEventListener('focus', () => element.classList.add('editing'));
    input.addEventListener('blur', () => {
        element.classList.remove('editing');
         // Record history state after text input is finished (on blur)
        if (window.historyManager) window.historyManager.recordState();
    });

    container.appendChild(input);
}

function appendColorInputControl(parent, element, styleProperty, labelText) {
    const controlId = `control-${element.id}-style-${styleProperty}`;
    const container = createControlContainer(parent, labelText, controlId);

    const input = document.createElement('input');
    input.id = controlId;
    input.type = 'color';
    input.value = element.style[styleProperty] ? rgbToHex(element.style[styleProperty]) : '#000000'; // Default to black if unset

    input.addEventListener('input', (e) => {
        const newValue = e.target.value;
        element.style[styleProperty] = newValue; // Update DOM
        // *** Update State ***
        const elementState = findElementStateById(element.id);
        if (elementState) {
            if (!elementState.style) elementState.style = {}; // Ensure style obj exists
            elementState.style[styleProperty] = newValue;
            console.log('Updated state (color):', element.id, styleProperty, newValue);
        }
    });
    input.addEventListener('focus', () => element.classList.add('editing'));
    input.addEventListener('blur', () => {
        element.classList.remove('editing');
        // Record history state after color selection is finished (on blur)
        if (window.historyManager) window.historyManager.recordState();
    });

    container.appendChild(input);
}

function appendNumberInputControl(parent, element, styleProperty, labelText, min = 0, max = 100, step = 1, unit = 'px') {
    const controlId = `control-${element.id}-style-${styleProperty}`;
    const container = createControlContainer(parent, labelText, controlId);

    const input = document.createElement('input');
    input.id = controlId;
    input.type = 'number';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = parseFloat(element.style[styleProperty]) || 0;

    input.addEventListener('input', (e) => {
        const newValue = e.target.value + unit;
        element.style[styleProperty] = newValue; // Update DOM
         // *** Update State ***
        const elementState = findElementStateById(element.id);
        if (elementState) {
            if (!elementState.style) elementState.style = {};
            elementState.style[styleProperty] = newValue;
            console.log('Updated state (number):', element.id, styleProperty, newValue);
        }
    });
    input.addEventListener('focus', () => element.classList.add('editing'));
    input.addEventListener('blur', () => {
        element.classList.remove('editing');
        // Record history state after number input is finished (on blur)
        if (window.historyManager) window.historyManager.recordState();
    });

    container.appendChild(input);
}

function appendSelectControl(parent, element, styleProperty, labelText, options) {
    const controlId = `control-${element.id}-style-${styleProperty}`;
    const container = createControlContainer(parent, labelText, controlId);

    const select = document.createElement('select');
    select.id = controlId;
    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
    });
    select.value = element.style[styleProperty] || options[0]; // Set current value or default

    select.addEventListener('change', (e) => {
        const newValue = e.target.value;
        // Special handling for objectFit
        if (styleProperty === 'objectFit' && element.dataset.elementType === 'image') {
            const img = element.querySelector('img');
            if(img) img.style.objectFit = newValue; // Update DOM img
        } else {
             element.style[styleProperty] = newValue; // Update DOM container
        }
        // *** Update State ***
        const elementState = findElementStateById(element.id);
        if (elementState) {
            if (!elementState.style) elementState.style = {};
            elementState.style[styleProperty] = newValue;
            console.log('Updated state (select):', element.id, styleProperty, newValue);
        }
        // Record history state immediately on change for select dropdowns
        if (window.historyManager) window.historyManager.recordState();
    });
    // No need for focus/blur history recording here, 'change' is sufficient

    container.appendChild(select);
}

// Helper to convert rgb(a) to hex for color input
function rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'string') return '#000000';
    if (rgb.startsWith('#')) return rgb;
    // Extract numbers from rgb(r, g, b)
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
    if (!result) return '#000000';
    const r = parseInt(result[1], 10);
    const g = parseInt(result[2], 10);
    const b = parseInt(result[3], 10);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Create and append toggle button
    createControlsToggleButton();

    // Subscribe to events
    EventBus.subscribe('elementSelected', handleElementSelectionForControls);
});

function handleElementSelectionForControls(eventData) {
    const { current } = eventData;
    updateControlsPanel(current); // Update content
    // Ensure panel is visible when an element is selected
    if (current && !isControlsPanelVisible) {
        toggleControlsPanel(true); // Force open
    }
}

// --- State ---
let isControlsPanelVisible = false;

// --- Core Panel Functions ---

/**
 * Creates the toggle button for the controls panel if it doesn't exist.
 */
function createControlsToggleButton() {
    if (!EditorState.controlsPanel) return;

    // Check if button already exists
    if (EditorState.controlsPanel.querySelector('#controls-toggle-btn')) {
        return; // Button already exists, do nothing
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'controls-toggle-btn';
    toggleBtn.title = 'Toggle Customize Panel';
    // Ensure Material Icons class and text content are used correctly
    toggleBtn.innerHTML = `<span class="material-icons">keyboard_arrow_up</span>`;

    toggleBtn.addEventListener('click', () => {
        toggleControlsPanel(); // Toggle visibility
    });

    // Prepend button to the panel itself so it's inside
    EditorState.controlsPanel.prepend(toggleBtn);
}

/**
 * Toggles the visibility of the controls panel.
 * @param {boolean} [forceVisible] - Optional. If true, forces panel open. If false, forces closed.
 */
function toggleControlsPanel(forceVisible) {
    if (!EditorState.controlsPanel || !EditorState.canvasContainer) return;

    const shouldBeVisible = typeof forceVisible === 'boolean' ? forceVisible : !isControlsPanelVisible;

    if (shouldBeVisible) {
        EditorState.controlsPanel.classList.add('visible');
        EditorState.canvasContainer.classList.add('controls-visible');
        isControlsPanelVisible = true;
    } else {
        EditorState.controlsPanel.classList.remove('visible');
        EditorState.canvasContainer.classList.remove('controls-visible');
        isControlsPanelVisible = false;
    }
    // Update toggle button icon (optional, handled by CSS rotate now)
     const toggleBtnIcon = EditorState.controlsPanel.querySelector('#controls-toggle-btn .material-icons');
     // if (toggleBtnIcon) {
     //     toggleBtnIcon.textContent = isControlsPanelVisible ? 'keyboard_arrow_down' : 'keyboard_arrow_up';
     // }
}

// Optional handler for live updates (e.g., position/size display)
// function handleElementUpdateForControls(updatedElement) {
//     if (updatedElement === EditorState.selectedElement) {
//         updateControlsPanel(updatedElement);
//     }
// } 