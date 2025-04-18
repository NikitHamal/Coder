/**
 * Create resize handles for the selected element
 */
function createResizeHandles(element) {
    if (!element || !EditorState.graphicOutputContainer) return;

    removeResizeHandles(element);

    const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.classList.add('resize-handle', `resize-${pos}`);
        handle.dataset.position = pos;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startResize(e, element, pos);
        });

        EditorState.graphicOutputContainer.appendChild(handle);
    });

    updateResizeHandlesPosition();
}

/**
 * Update the position of resize handles
 */
function updateResizeHandlesPosition() {
    if (!EditorState.selectedElement || !EditorState.graphicOutputContainer) return;

    const handles = EditorState.graphicOutputContainer.querySelectorAll('.resize-handle');
    if (handles.length === 0) return; // Don't calculate if no handles exist

    const rect = EditorState.selectedElement.getBoundingClientRect();
    const containerRect = EditorState.graphicOutputContainer.getBoundingClientRect();

    const scrollLeft = EditorState.graphicOutputContainer.scrollLeft;
    const scrollTop = EditorState.graphicOutputContainer.scrollTop;
    const handleOffset = CONFIG.RESIZE_HANDLE_SIZE / 2; // Center handles

    const left = rect.left - containerRect.left + scrollLeft;
    const top = rect.top - containerRect.top + scrollTop;
    const right = left + rect.width;
    const bottom = top + rect.height;

    handles.forEach(handle => {
        const pos = handle.dataset.position;
        handle.style.display = 'block'; // Ensure handles are visible

        switch (pos) {
            case 'nw':
                handle.style.left = `${left - handleOffset}px`;
                handle.style.top = `${top - handleOffset}px`;
                break;
            case 'n':
                handle.style.left = `${left + rect.width/2 - handleOffset}px`;
                handle.style.top = `${top - handleOffset}px`;
                break;
            case 'ne':
                handle.style.left = `${right - handleOffset}px`;
                handle.style.top = `${top - handleOffset}px`;
                break;
            case 'e':
                handle.style.left = `${right - handleOffset}px`;
                handle.style.top = `${top + rect.height/2 - handleOffset}px`;
                break;
            case 'se':
                handle.style.left = `${right - handleOffset}px`;
                handle.style.top = `${bottom - handleOffset}px`;
                break;
            case 's':
                handle.style.left = `${left + rect.width/2 - handleOffset}px`;
                handle.style.top = `${bottom - handleOffset}px`;
                break;
            case 'sw':
                handle.style.left = `${left - handleOffset}px`;
                handle.style.top = `${bottom - handleOffset}px`;
                break;
            case 'w':
                handle.style.left = `${left - handleOffset}px`;
                handle.style.top = `${top + rect.height/2 - handleOffset}px`;
                break;
        }
    });
}

/**
 * Remove resize handles
 */
function removeResizeHandles(element) {
    if (!EditorState.graphicOutputContainer) return;
    const handles = EditorState.graphicOutputContainer.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.remove());
}

/**
 * Start resizing an element
 */
function startResize(e, element, position) {
    if (EditorState.isDragging) return;

    e.preventDefault();

    EditorState.isResizing = true;
    EditorState.resizeHandle = position;
    EditorState.dragStartX = e.clientX;
    EditorState.dragStartY = e.clientY;
    EditorState.resizeStartWidth = parseInt(element.style.width) || element.offsetWidth;
    EditorState.resizeStartHeight = parseInt(element.style.height) || element.offsetHeight;
    EditorState.elementStartX = parseInt(element.style.left) || 0;
    EditorState.elementStartY = parseInt(element.style.top) || 0;

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

/**
 * Resize an element
 */
function resize(e) {
    if (!EditorState.isResizing || !EditorState.selectedElement || !EditorState.resizeHandle) return;

    const deltaX = e.clientX - EditorState.dragStartX;
    const deltaY = e.clientY - EditorState.dragStartY;
    const minWidth = CONFIG.MIN_ELEMENT_WIDTH;
    const minHeight = CONFIG.MIN_ELEMENT_HEIGHT;

    let newWidth = EditorState.resizeStartWidth;
    let newHeight = EditorState.resizeStartHeight;
    let newX = EditorState.elementStartX;
    let newY = EditorState.elementStartY;

    if (EditorState.resizeHandle.includes('e')) {
        newWidth = Math.max(EditorState.resizeStartWidth + deltaX, minWidth);
    } else if (EditorState.resizeHandle.includes('w')) {
        const possibleWidth = Math.max(EditorState.resizeStartWidth - deltaX, minWidth);
        if (possibleWidth !== minWidth || deltaX < 0) {
            newX = EditorState.elementStartX + (EditorState.resizeStartWidth - possibleWidth);
            newWidth = possibleWidth;
        }
    }

    if (EditorState.resizeHandle.includes('s')) {
        newHeight = Math.max(EditorState.resizeStartHeight + deltaY, minHeight);
    } else if (EditorState.resizeHandle.includes('n')) {
        const possibleHeight = Math.max(EditorState.resizeStartHeight - deltaY, minHeight);
        if (possibleHeight !== minHeight || deltaY < 0) {
            newY = EditorState.elementStartY + (EditorState.resizeStartHeight - possibleHeight);
            newHeight = possibleHeight;
        }
    }

    EditorState.selectedElement.style.width = `${newWidth}px`;
    EditorState.selectedElement.style.height = `${newHeight}px`;
    EditorState.selectedElement.style.left = `${newX}px`;
    EditorState.selectedElement.style.top = `${newY}px`;

    const currentDisplayScale = EditorState.displayScale;
    EditorState.selectedElement.dataset.originalWidth = Math.round(newWidth / currentDisplayScale);
    EditorState.selectedElement.dataset.originalHeight = Math.round(newHeight / currentDisplayScale);
    EditorState.selectedElement.dataset.originalX = Math.round(newX / currentDisplayScale);
    EditorState.selectedElement.dataset.originalY = Math.round(newY / currentDisplayScale);

    updateResizeHandlesPosition();
}

/**
 * Finds the state object for a given element ID.
 * @param {string} elementId
 * @returns {object | undefined} The element state object or undefined if not found.
 */
function findElementStateById(elementId) {
    // Consider moving this helper to a shared utility file if used in multiple places
    return EditorState.elements.find(elState => elState.id === elementId);
}

/**
 * Stop resizing an element and update its state.
 */
function stopResize() {
    if (!EditorState.isResizing) return;
    const resizedElement = EditorState.selectedElement; // Capture before resetting state
    EditorState.isResizing = false;
    EditorState.resizeHandle = null;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);

    if (resizedElement) {
         // Find the corresponding state object
        const elementState = findElementStateById(resizedElement.id);
        if (elementState) {
            // Update state with final dimensions/position (read from dataset)
            elementState.x = parseFloat(resizedElement.dataset.originalX || elementState.x);
            elementState.y = parseFloat(resizedElement.dataset.originalY || elementState.y);
            elementState.width = parseFloat(resizedElement.dataset.originalWidth || elementState.width);
            elementState.height = parseFloat(resizedElement.dataset.originalHeight || elementState.height);
            console.log('Updated element state (resize):', elementState);
        } else {
            console.warn('Could not find state for resized element:', resizedElement.id);
        }

        // Publish update event
        EventBus.publish('elementUpdated', resizedElement);

        // Record history state after resize completes
        if (window.historyManager) window.historyManager.recordState();
    }
}

// --- Event Listeners ---

// Subscribe to element selection events
document.addEventListener('DOMContentLoaded', () => {
    EventBus.subscribe('elementSelected', handleElementSelectionForResize);
    EventBus.subscribe('elementDeselected', handleElementDeselectionForResize);
    EventBus.subscribe('elementDeleted', handleElementDeselectionForResize); // Use same handler for deletion
});

function handleElementSelectionForResize(eventData) {
    const { current } = eventData; // Get the newly selected element
    if (current) {
        createResizeHandles(current);
    } else {
        // If null is selected (deselection), ensure handles are removed
        removeResizeHandles();
    }
}

function handleElementDeselectionForResize(deselectedElement) {
    // Explicitly remove handles when an element is deselected or deleted
    removeResizeHandles();
}