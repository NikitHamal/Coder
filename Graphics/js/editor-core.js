// --- Configuration ---
const CONFIG = {
    MAX_DISPLAY_DIMENSION: 600,
    MIN_ELEMENT_WIDTH: 20,
    MIN_ELEMENT_HEIGHT: 20,
    RESIZE_HANDLE_SIZE: 10, // Assuming handles are 10x10 px
    DEFAULT_TEXT_COLOR: '#333333',
    PLACEHOLDER_IMAGE_URL: 'https://via.placeholder.com/150',
    DEFAULT_FONT_FAMILY: 'Poppins, sans-serif',
    CANVAS_PADDING: 40, // Padding around the canvas for zoom controls/size display
};

// --- Central State ---
const EditorState = {
    graphicOutputContainer: null,
    canvasContainer: null,
    controlsPanel: null,
    selectedElement: null,
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    elementStartX: 0,
    elementStartY: 0,
    resizeHandle: null,
    resizeStartWidth: 0,
    resizeStartHeight: 0,
    originalWidth: 0, // Original canvas width from data
    originalHeight: 0, // Original canvas height from data
    displayScale: 1, // Scale factor for rendering on screen
    elements: [], // Actively store element data objects here
    currentZoom: 1,
};

/**
 * Initializes the editor: gets references, adds listeners,
 * and calls other initializers.
 */
function initializeEditor() {
    EditorState.graphicOutputContainer = document.getElementById('graphic-output');
    EditorState.canvasContainer = document.getElementById('canvas-container');
    EditorState.controlsPanel = document.querySelector('.controls-panel');

    if (!EditorState.graphicOutputContainer || !EditorState.canvasContainer || !EditorState.controlsPanel) {
        console.error("Essential editor elements not found! Check HTML structure.");
        return;
    }

    // Add listener to deselect when clicking the background canvas
    EditorState.graphicOutputContainer.addEventListener('mousedown', (e) => {
        // Only deselect if clicking directly on the container, not an element or handle
        if (e.target === EditorState.graphicOutputContainer) {
            selectElement(null);
        }
    });

    // Add listener for delete key
    document.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        const isEditingInput = activeEl.tagName === 'INPUT' ||
                               activeEl.tagName === 'TEXTAREA' ||
                               activeEl.isContentEditable;

        if ((e.key === 'Delete' || e.key === 'Backspace') && EditorState.selectedElement && !isEditingInput) {
            e.preventDefault();
            deleteSelectedElement();
        }
    });

    // Initialize different parts (functions defined in other modules)
    setupZoomControls();
    updateCanvasSizeDisplay();
    initializeToolbarButtons();
    initializeControlsPanel(); // Sets default message

    console.log("Editor initialized with state:", EditorState);
}

// Initialize editor on load
document.addEventListener('DOMContentLoaded', initializeEditor); 