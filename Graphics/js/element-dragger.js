/**
 * Start dragging an element
 */
function startDrag(e, element) {
    // Use EditorState flags
    if (EditorState.isResizing) return;

    e.preventDefault();

    // Update EditorState
    EditorState.isDragging = true;
    EditorState.dragStartX = e.clientX;
    EditorState.dragStartY = e.clientY;
    EditorState.elementStartX = parseInt(element.style.left) || 0;
    EditorState.elementStartY = parseInt(element.style.top) || 0;
    // Ensure the element being dragged is the selected one
    // This should already be true if called after selectElement
    if (EditorState.selectedElement !== element) {
        selectElement(element); 
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

/**
 * Drag an element
 */
function drag(e) {
    // Check EditorState flags and selected element
    if (!EditorState.isDragging || !EditorState.selectedElement) return;

    const deltaX = e.clientX - EditorState.dragStartX;
    const deltaY = e.clientY - EditorState.dragStartY;
    const newX = EditorState.elementStartX + deltaX;
    const newY = EditorState.elementStartY + deltaY;

    // Apply styles to the selected element
    EditorState.selectedElement.style.left = `${newX}px`;
    EditorState.selectedElement.style.top = `${newY}px`;

    // Update the original position data (accounting for display scale from EditorState)
    const currentDisplayScale = EditorState.displayScale; // Already set in renderer
    EditorState.selectedElement.dataset.originalX = Math.round(newX / currentDisplayScale);
    EditorState.selectedElement.dataset.originalY = Math.round(newY / currentDisplayScale);

    // Update resize handles (function from element-resizer.js)
    updateResizeHandlesPosition();
}

/**
 * Finds the state object for a given element ID.
 * @param {string} elementId
 * @returns {object | undefined} The element state object or undefined if not found.
 */
function findElementStateById(elementId) {
    return EditorState.elements.find(elState => elState.id === elementId);
}

/**
 * Stop dragging an element and update its state.
 */
function stopDrag() {
    if (!EditorState.isDragging) return;
    const draggedElement = EditorState.selectedElement;
    EditorState.isDragging = false;

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);

    if (draggedElement) {
        // Find the corresponding state object
        const elementState = findElementStateById(draggedElement.id);
        if (elementState) {
            // Update state with final position (read from dataset)
            elementState.x = parseFloat(draggedElement.dataset.originalX || elementState.x);
            elementState.y = parseFloat(draggedElement.dataset.originalY || elementState.y);
            console.log('Updated element state (drag):', elementState);
        } else {
            console.warn('Could not find state for dragged element:', draggedElement.id);
        }

        // Publish update event
        EventBus.publish('elementUpdated', draggedElement);

        // Record history state after drag completes
        if (window.historyManager) window.historyManager.recordState();
    }
} 