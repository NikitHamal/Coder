/**
 * Select an element and show its controls
 */
function selectElement(element) {
    // Deselect previous element if it exists and is different
    if (EditorState.selectedElement && EditorState.selectedElement !== element) {
        EditorState.selectedElement.classList.remove('selected');
        // Publish deselect event for resizer to remove handles
        EventBus.publish('elementDeselected', EditorState.selectedElement);
    }

    // Update global selected element reference in EditorState
    const previousElement = EditorState.selectedElement;
    EditorState.selectedElement = element;

    // If selecting a new element (or re-selecting the same one)
    if (element) {
        element.classList.add('selected');
    }

    // Publish the event, regardless of whether it's a new element or null (deselection)
    // Pass both the newly selected element and the previously selected one
    EventBus.publish('elementSelected', { current: element, previous: previousElement });

    // Direct calls removed: removeResizeHandles, createResizeHandles, updateControlsPanel, clearControlsPanel
}

/**
 * Deletes the currently selected element from DOM and state.
 */
function deleteSelectedElement() {
    if (!EditorState.selectedElement || !EditorState.graphicOutputContainer) return;

    const elementToRemove = EditorState.selectedElement;
    const elementIdToRemove = elementToRemove.id;

    // Publish event *before* removing from DOM/state
    EventBus.publish('elementDeleted', elementToRemove);

    // Remove element from the DOM
    EditorState.graphicOutputContainer.removeChild(elementToRemove);

    // *** Remove from State ***
    const indexToRemove = EditorState.elements.findIndex(el => el.id === elementIdToRemove);
    if (indexToRemove > -1) {
        EditorState.elements.splice(indexToRemove, 1);
        console.log('Removed element state:', elementIdToRemove);
    } else {
        console.warn('Could not find state for deleted element:', elementIdToRemove);
    }

    // Deselect (will trigger elementSelected with null)
    selectElement(null);
} 