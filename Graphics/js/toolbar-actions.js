// --- Helper Functions ---

/**
 * Generate a random color for shapes
 */
function getRandomColor() {
    const colors = [
        '#4a90e2', '#50c878', '#f06292',
        '#ff9800', '#9c27b0', '#607d8b'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get the highest z-index among elements in the graphic container
 */
function getHighestZIndex() {
    // Use EditorState reference
    if (!EditorState.graphicOutputContainer) return 0;
    const elements = Array.from(EditorState.graphicOutputContainer.querySelectorAll('.editable-element'));
    if (elements.length === 0) return 0;
    // Use Math.max and map for potentially cleaner syntax
    return Math.max(0, ...elements.map(el => parseInt(el.style.zIndex) || 0));
}

/**
 * Get the lowest z-index among elements in the graphic container
 */
function getLowestZIndex() {
    // Use EditorState reference
    if (!EditorState.graphicOutputContainer) return 0;
    const elements = Array.from(EditorState.graphicOutputContainer.querySelectorAll('.editable-element'));
    if (elements.length === 0) return 0;
    // Use Math.min and initialize with Infinity for correct minimum
    return Math.min(Infinity, ...elements.map(el => parseInt(el.style.zIndex) || 0));
}

// --- Initialization ---

/**
 * Add toolbar button event handlers
 */
function initializeToolbarButtons() {
    // No changes needed here, just finds buttons and adds listeners
    const addTextBtn = document.getElementById('add-text-btn');
    if (addTextBtn) addTextBtn.addEventListener('click', addTextElement);

    const addShapeBtn = document.getElementById('add-shape-btn');
    if (addShapeBtn) addShapeBtn.addEventListener('click', addShapeElement);

    const addImageBtn = document.getElementById('add-image-btn');
    if (addImageBtn) addImageBtn.addEventListener('click', addImageElement);

    const bringFrontBtn = document.getElementById('bring-front-btn');
    if (bringFrontBtn) bringFrontBtn.addEventListener('click', () => changeElementOrder('front'));

    const sendBackBtn = document.getElementById('send-back-btn');
    if (sendBackBtn) sendBackBtn.addEventListener('click', () => changeElementOrder('back'));
}

// --- Element Creation Helpers ---

/**
 * Creates a new element instance from a template.
 * @param {string} templateId - The ID of the <template> tag.
 * @returns {HTMLElement | null} The cloned element or null if template not found.
 */
function createElementFromTemplate(templateId) {
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template with ID ${templateId} not found.`);
        return null;
    }
    // Clone the content of the template
    const clone = template.content.firstElementChild.cloneNode(true);
    return clone;
}

/**
 * Sets common properties for a new editable element.
 * @param {HTMLElement} element - The element to configure.
 * @param {string} id - Unique ID for the element.
 * @param {object} styles - An object of styles to apply.
 * @param {string[]} editableProps - Array of editable property names.
 */
function configureNewElement(element, id, styles, editableProps) {
    element.id = id;
    // Ensure classList is managed correctly (template already has editable-element)
    // element.classList.add('editable-element'); // Already on template

    // Position based on center of current view
    const containerRect = EditorState.graphicOutputContainer.getBoundingClientRect();
    const defaultWidth = parseInt(styles.width) || 100; // Get width from styles or default
    const defaultHeight = parseInt(styles.height) || 100; // Get height from styles or default
    const x = Math.max(20, (containerRect.width / 2) - (defaultWidth / 2) + EditorState.graphicOutputContainer.scrollLeft);
    const y = Math.max(20, (containerRect.height / 2) - (defaultHeight / 2) + EditorState.graphicOutputContainer.scrollTop);

    // Merge default/calculated styles with provided styles
    Object.assign(element.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: getHighestZIndex() + 1,
        ...styles // Apply provided styles (width, height, color, etc.)
    });

    element.dataset.editableProps = JSON.stringify(editableProps || []);

    // Add standard listeners
    element.addEventListener('mousedown', (e) => {
        if (e.detail === 2 && element.dataset.elementType === 'text') {
            editTextInPlace(element);
        } else {
            selectElement(element);
            startDrag(e, element);
        }
    });
}

/**
 * Re-attaches essential event listeners (mousedown for drag/select/edit) 
 * to all editable elements within the canvas container.
 * This is crucial after restoring state via innerHTML.
 */
function rebindCanvasElementListeners(container) {
    if (!container) return;
    const elements = container.querySelectorAll('.editable-element');
    console.log(`Re-binding listeners for ${elements.length} elements.`);

    elements.forEach(element => {
        // Remove existing listener to prevent duplicates (though innerHTML should clear them)
        // It's safer but might require storing the handler function reference.
        // For simplicity, we assume innerHTML replacement handles cleanup.

        // Re-attach the main mousedown listener
        element.addEventListener('mousedown', (e) => {
            // Logic copied/adapted from configureNewElement
            if (e.detail === 2 && element.dataset.elementType === 'text') {
                editTextInPlace(element); // Assumes editTextInPlace is globally accessible or in scope
            } else {
                 // Assumes selectElement and startDrag are globally accessible or in scope
                selectElement(element);
                startDrag(e, element); 
            }
        });
    });
}

/**
 * Finds the state object for a given element ID.
 * @param {string} elementId
 * @returns {object | undefined} The element state object or undefined if not found.
 */
function findElementStateById(elementId) {
    return EditorState.elements.find(elState => elState.id === elementId);
}

// --- Element Creation Functions (Refactored) ---

/**
 * Add a new text element to the canvas using template
 */
function addTextElement() {
    if (!EditorState.graphicOutputContainer) return;
    const element = createElementFromTemplate('template-text-element');
    if (!element) return;
    const id = 'text-' + Date.now();
    const styles = {
        width: '200px',
        height: 'auto', // Auto height for text initially
        padding: '10px',
        overflow: 'hidden',
        color: CONFIG.DEFAULT_TEXT_COLOR,
        fontSize: '18px',
        fontFamily: CONFIG.DEFAULT_FONT_FAMILY,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        textAlign: 'center'
    };
    const editableProps = ['content', 'style.color', 'style.fontSize', 'style.fontWeight', 'style.textAlign', 'style.fontFamily'];
    configureNewElement(element, id, styles, editableProps);
    element.textContent = 'Double-click to edit text';

    // Add to DOM
    EditorState.graphicOutputContainer.appendChild(element);

    // *** Add to State ***
    const newState = {
        id: id,
        type: 'text',
        x: parseFloat(element.style.left || 0),
        y: parseFloat(element.style.top || 0),
        width: parseFloat(element.style.width || 200),
        height: parseFloat(element.style.height || 50), // Might need calculation based on content?
        content: element.textContent,
        style: { // Capture initial computed styles relevant to props
            color: element.style.color || CONFIG.DEFAULT_TEXT_COLOR,
            fontSize: element.style.fontSize || '18px',
            fontWeight: element.style.fontWeight || 'normal',
            textAlign: element.style.textAlign || 'center',
            fontFamily: element.style.fontFamily || CONFIG.DEFAULT_FONT_FAMILY
        },
        editable: editableProps
    };
    EditorState.elements.push(newState);
    console.log('Added text state:', newState);

    // Select the new element (publishes event)
    selectElement(element);

    // Record history state
    if (window.historyManager) window.historyManager.recordState();
}

/**
 * Enable in-place editing of text elements
 */
function editTextInPlace(element) {
    element.contentEditable = true;
    element.focus();

    // Select text
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);

    // Finish editing on blur
    const finishEditing = () => {
        element.contentEditable = false;
        element.removeEventListener('blur', finishEditing);
        // Update controls panel if this is the selected element
        if (EditorState.selectedElement === element) {
            updateControlsPanel(element); // Function from controls-panel.js
        }
        // Optional: Could update original data in dataset or state here
    };
    element.addEventListener('blur', finishEditing);
}

/**
 * Add a new shape element to the canvas using template
 */
function addShapeElement() {
    if (!EditorState.graphicOutputContainer) return;
    const element = createElementFromTemplate('template-shape-element');
    if (!element) return;
    const id = 'shape-' + Date.now();
    const shapes = ['rectangle', 'circle', 'ellipse'];
    const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
    const styles = {
        width: '100px',
        height: '100px',
        backgroundColor: getRandomColor()
        // border: '1px solid #333333' // Removed default border
    };
    const editableProps = ['style.backgroundColor', 'style.borderColor', 'style.borderWidth', 'style.borderRadius'];
    configureNewElement(element, id, styles, editableProps);
    element.dataset.shape = shapeType;
    if (shapeType === 'circle' || shapeType === 'ellipse') element.style.borderRadius = '50%';
    else element.style.borderRadius = '4px';

    // Add to DOM
    EditorState.graphicOutputContainer.appendChild(element);

    // *** Add to State ***
    const newState = {
        id: id,
        type: 'shape',
        shape: shapeType,
        x: parseFloat(element.style.left || 0),
        y: parseFloat(element.style.top || 0),
        width: parseFloat(element.style.width || 100),
        height: parseFloat(element.style.height || 100),
        style: { // Capture initial relevant styles
            backgroundColor: element.style.backgroundColor,
            borderColor: element.style.borderColor || '', // Keep for control
            borderWidth: element.style.borderWidth || '0px', // Default to 0px
            borderRadius: element.style.borderRadius || '4px' // Keep default radius
        },
        editable: editableProps
    };
    EditorState.elements.push(newState);
    console.log('Added shape state:', newState);

    // Select the new element
    selectElement(element);

    // Record history state
    if (window.historyManager) window.historyManager.recordState();
}

/**
 * Add a new image placeholder element to the canvas using template
 */
function addImageElement() {
    if (!EditorState.graphicOutputContainer) return;
    const element = createElementFromTemplate('template-image-element');
    if (!element) return;
    const id = 'image-' + Date.now();
    const styles = {
        width: '150px',
        height: '150px',
        overflow: 'hidden',
        border: '1px solid #333333',
        borderRadius: '4px',
        backgroundColor: '#eee' // Placeholder background
    };
    const editableProps = ['src', 'style.objectFit', 'style.borderRadius', 'style.borderColor', 'style.borderWidth'];
    configureNewElement(element, id, styles, editableProps);
    const img = element.querySelector('img');
    if (img) {
        img.src = CONFIG.PLACEHOLDER_IMAGE_URL;
        img.alt = 'Placeholder Image';
        img.style.objectFit = 'cover';
    }
    element.dataset.originalSrc = CONFIG.PLACEHOLDER_IMAGE_URL;

    // Add to DOM
    EditorState.graphicOutputContainer.appendChild(element);

    // *** Add to State ***
    const newState = {
        id: id,
        type: 'image',
        x: parseFloat(element.style.left || 0),
        y: parseFloat(element.style.top || 0),
        width: parseFloat(element.style.width || 150),
        height: parseFloat(element.style.height || 150),
        src: img ? img.src : CONFIG.PLACEHOLDER_IMAGE_URL,
        style: { // Capture initial relevant styles
            objectFit: img ? img.style.objectFit : 'cover',
            borderRadius: element.style.borderRadius || '4px',
            borderColor: element.style.borderColor || '',
            borderWidth: element.style.borderWidth || '1px'
        },
        editable: editableProps
    };
    EditorState.elements.push(newState);
    console.log('Added image state:', newState);

    // Select the new element
    selectElement(element);

    // Record history state
    if (window.historyManager) window.historyManager.recordState();
}

// --- Element Ordering ---

/**
 * Change the z-index ordering of the selected element
 */
function changeElementOrder(direction) {
    // Use EditorState reference
    if (!EditorState.selectedElement || !EditorState.graphicOutputContainer) return;

    const elements = Array.from(EditorState.graphicOutputContainer.querySelectorAll('.editable-element'));
    if (elements.length <= 1) return;

    const currentZ = parseInt(EditorState.selectedElement.style.zIndex) || 0;

    if (direction === 'front') {
        const highestZ = getHighestZIndex();
        // Only change if not already at the front
        if (currentZ < highestZ) {
            EditorState.selectedElement.style.zIndex = highestZ + 1;
        }
    } else if (direction === 'back') {
        const lowestZ = getLowestZIndex();
        // Only change if not already at the back
        if (currentZ > lowestZ) {
             // Assign z-index just below the current lowest positive index, or 0
             EditorState.selectedElement.style.zIndex = Math.max(0, lowestZ - 1);
        }
    }
    // Note: A more robust solution might involve re-indexing all elements.

    // Record history state after changing order
    if (window.historyManager) window.historyManager.recordState();

    // Update button states after changing order
    updateOrderButtonStates();
}

/**
 * Updates the enabled/disabled state of ordering buttons based on selection.
 */
function updateOrderButtonStates() {
    const bringFrontBtn = document.getElementById('bring-front-btn');
    const sendBackBtn = document.getElementById('send-back-btn');
    const selectedElement = EditorState.selectedElement;

    if (!selectedElement || !EditorState.graphicOutputContainer) {
        // Disable both if no element is selected
        bringFrontBtn.disabled = true;
        sendBackBtn.disabled = true;
        return;
    }

    const elements = Array.from(EditorState.graphicOutputContainer.querySelectorAll('.editable-element'));
    if (elements.length <= 1) {
        // Disable both if only one element exists
        bringFrontBtn.disabled = true;
        sendBackBtn.disabled = true;
        return;
    }

    const currentZ = parseInt(selectedElement.style.zIndex) || 0;
    const highestZ = getHighestZIndex();
    const lowestZ = getLowestZIndex();

    // Disable Bring Front if element is already at the highest z-index
    bringFrontBtn.disabled = (currentZ >= highestZ);

    // Disable Send Back if element is already at the lowest z-index
    sendBackBtn.disabled = (currentZ <= lowestZ);
}

// --- Initialization Call ---
initializeToolbarButtons(); 