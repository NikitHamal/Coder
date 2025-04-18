/**
 * Sets up zoom controls for the canvas
 */
function setupZoomControls() {
    let controlsContainer = EditorState.canvasContainer.querySelector('.canvas-controls');
    if (!controlsContainer) {
        if (!EditorState.canvasContainer) return;

        controlsContainer = document.createElement('div');
        controlsContainer.className = 'canvas-controls';

        const zoomOutBtn = document.createElement('button');
        const zoomOutIcon = document.createElement('span');
        zoomOutIcon.className = 'material-icons';
        zoomOutIcon.textContent = 'remove';
        zoomOutBtn.appendChild(zoomOutIcon);
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.addEventListener('click', () => changeZoom(-0.1));

        const zoomDisplay = document.createElement('div');
        zoomDisplay.className = 'zoom-value';
        zoomDisplay.textContent = '100%';
        zoomDisplay.id = 'zoom-value';

        const zoomInBtn = document.createElement('button');
        const zoomInIcon = document.createElement('span');
        zoomInIcon.className = 'material-icons';
        zoomInIcon.textContent = 'add';
        zoomInBtn.appendChild(zoomInIcon);
        zoomInBtn.title = 'Zoom In';
        zoomInBtn.addEventListener('click', () => changeZoom(0.1));

        const fitBtn = document.createElement('button');
        const fitIcon = document.createElement('span');
        fitIcon.className = 'material-icons';
        fitIcon.textContent = 'fit_screen';
        fitBtn.appendChild(fitIcon);
        fitBtn.title = 'Fit to View';
        fitBtn.addEventListener('click', () => fitCanvasToView());

        controlsContainer.append(zoomOutBtn, zoomDisplay, zoomInBtn, fitBtn);
        EditorState.canvasContainer.appendChild(controlsContainer);
    }
}

/**
 * Change the zoom level of the canvas
 * @param {number} delta - Amount to change zoom by
 */
function changeZoom(delta) {
    if (!EditorState.graphicOutputContainer) return;

    const currentScale = EditorState.currentZoom;
    let newScale = Math.max(0.1, Math.min(3, currentScale + delta));
    newScale = Math.round(newScale * 10) / 10;

    EditorState.currentZoom = newScale;
    EditorState.graphicOutputContainer.style.setProperty('--scale', newScale);

    const zoomDisplay = document.getElementById('zoom-value');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(newScale * 100)}%`;
    }
}

/**
 * Fit the canvas to the view
 */
function fitCanvasToView() {
    if (!EditorState.graphicOutputContainer || !EditorState.canvasContainer) return;

    const containerWidth = EditorState.canvasContainer.clientWidth - CONFIG.CANVAS_PADDING;
    const containerHeight = EditorState.canvasContainer.clientHeight - CONFIG.CANVAS_PADDING;
    const canvasWidth = EditorState.graphicOutputContainer.offsetWidth;
    const canvasHeight = EditorState.graphicOutputContainer.offsetHeight;

    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    EditorState.currentZoom = scale;
    EditorState.graphicOutputContainer.style.setProperty('--scale', scale);

    const zoomDisplay = document.getElementById('zoom-value');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
    }

    EditorState.graphicOutputContainer.style.margin = 'auto';
}

/**
 * Creates and updates the canvas size display
 */
function updateCanvasSizeDisplay() {
    if (!EditorState.graphicOutputContainer || !EditorState.canvasContainer) return;

    let sizeDisplay = EditorState.canvasContainer.querySelector('.canvas-size-display');
    if (!sizeDisplay) {
        sizeDisplay = document.createElement('div');
        sizeDisplay.className = 'canvas-size-display';
        EditorState.canvasContainer.appendChild(sizeDisplay);
    }

    const width = EditorState.originalWidth || parseInt(EditorState.graphicOutputContainer.style.width) || EditorState.graphicOutputContainer.offsetWidth;
    const height = EditorState.originalHeight || parseInt(EditorState.graphicOutputContainer.style.height) || EditorState.graphicOutputContainer.offsetHeight;

    sizeDisplay.textContent = `${width} × ${height}`;
} 