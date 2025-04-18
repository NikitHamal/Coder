// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadGraphic);
    } else {
        console.warn('Download button not found.');
    }
});

// --- Download Functionality ---

/**
 * Download the current canvas as an image using html2canvas
 */
function downloadGraphic() {
    // Use EditorState reference
    if (!EditorState.graphicOutputContainer) {
        console.error('Graphic container not found for download.');
        return;
    }

    // Hide resize handles if any element is selected
    const handles = EditorState.graphicOutputContainer.querySelectorAll('.resize-handle');
    const wasSelected = EditorState.selectedElement;
    if (wasSelected) {
        handles.forEach(handle => handle.style.display = 'none');
    }

    if (typeof html2canvas === 'undefined') {
        // Use notification instead of alert
        // alert('html2canvas library is required for download. Please include it in your HTML.');
        showNotification('html2canvas library is required for download.', 'error');
        if (wasSelected) { // Show handles again if download failed early
            handles.forEach(handle => handle.style.display = 'block');
        }
        return;
    }

    // --- Prepare for Download (Full Resolution) ---

    // Store current display styles to restore later
    const originalStyles = {
        width: EditorState.graphicOutputContainer.style.width,
        height: EditorState.graphicOutputContainer.style.height,
        scale: EditorState.graphicOutputContainer.style.getPropertyValue('--scale') || '1',
        transform: EditorState.graphicOutputContainer.style.transform,
        margin: EditorState.graphicOutputContainer.style.margin
    };

    const elements = Array.from(EditorState.graphicOutputContainer.querySelectorAll('.editable-element'));
    const elementStyles = elements.map(el => ({
        element: el,
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height,
        fontSize: el.style.fontSize,
    }));

    // Get full resolution dimensions from EditorState or dataset
    const fullWidth = EditorState.originalWidth || parseInt(EditorState.graphicOutputContainer.dataset.originalWidth);
    const fullHeight = EditorState.originalHeight || parseInt(EditorState.graphicOutputContainer.dataset.originalHeight);
    const currentDisplayScale = EditorState.displayScale; // Scale used for current display

    // Apply full-size dimensions temporarily
    EditorState.graphicOutputContainer.style.width = `${fullWidth}px`;
    EditorState.graphicOutputContainer.style.height = `${fullHeight}px`;
    EditorState.graphicOutputContainer.style.setProperty('--scale', '1'); // Render at 100%
    EditorState.graphicOutputContainer.style.transform = 'scale(1)';
    EditorState.graphicOutputContainer.style.margin = '0'; // Remove margin for capture

    // Adjust all element positions and sizes to match full resolution
    elements.forEach(el => {
        const originalX = parseFloat(el.dataset.originalX || 0);
        const originalY = parseFloat(el.dataset.originalY || 0);
        const originalW = parseFloat(el.dataset.originalWidth || el.offsetWidth / currentDisplayScale); // Fallback calc
        const originalH = parseFloat(el.dataset.originalHeight || el.offsetHeight / currentDisplayScale); // Fallback calc

        el.style.left = `${originalX}px`;
        el.style.top = `${originalY}px`;
        el.style.width = `${originalW}px`;
        el.style.height = `${originalH}px`;

        // Scale font size back to original if it was scaled for display
        if (el.dataset.elementType === 'text' && currentDisplayScale !== 1) {
            const currentFontSize = window.getComputedStyle(el).fontSize;
            const fontSizeValue = parseFloat(currentFontSize);
            const unit = currentFontSize.replace(/[\d.]/g, '');

            if (!isNaN(fontSizeValue)) {
                el.style.fontSize = `${fontSizeValue / currentDisplayScale}${unit}`;
            }
        }
    });

    // --- Generate Canvas and Restore --- 

    // Take the screenshot using html2canvas
    html2canvas(EditorState.graphicOutputContainer, {
        scale: 1, // Render at native resolution (we already set the size)
        useCORS: true,
        allowTaint: true, // May be needed for external images, but can taint canvas
        backgroundColor: EditorState.graphicOutputContainer.style.backgroundColor || '#FFFFFF'
    }).then(canvas => {
        // --- Get Export Options ---
        const format = document.querySelector('input[name="export-format"]:checked')?.value || 'png';
        let mimeType = 'image/png';
        let fileExtension = '.png';

        if (format === 'jpeg') {
            mimeType = 'image/jpeg';
            fileExtension = '.jpg';
            // TODO: Add quality parameter if implementing slider
            // const quality = 0.9; // Example: 90% quality
            // link.href = canvas.toDataURL(mimeType, quality);
        }

        // --- Trigger download ---
        const link = document.createElement('a');
        link.download = 'ai-graphic-' + Date.now() + fileExtension; // Use correct extension
        link.href = canvas.toDataURL(mimeType); // Use correct MIME type
        link.click();

    }).catch(error => {
        console.error("Error generating canvas image:", error);
        // Use notification instead of alert
        // alert("An error occurred while generating the image for download.");
        showNotification("Error generating image. See console for details.", 'error');
    }).finally(() => {
        // --- Restore Original Display Styles ---
        EditorState.graphicOutputContainer.style.width = originalStyles.width;
        EditorState.graphicOutputContainer.style.height = originalStyles.height;
        EditorState.graphicOutputContainer.style.setProperty('--scale', originalStyles.scale);
        EditorState.graphicOutputContainer.style.transform = originalStyles.transform;
        EditorState.graphicOutputContainer.style.margin = originalStyles.margin;

        // Restore all element display positions and sizes
        elementStyles.forEach(style => {
            style.element.style.left = style.left;
            style.element.style.top = style.top;
            style.element.style.width = style.width;
            style.element.style.height = style.height;
            if (style.fontSize) {
                style.element.style.fontSize = style.fontSize;
            }
        });

        // Show handles again if an element was selected
        if (wasSelected) {
            handles.forEach(handle => handle.style.display = 'block');
            updateResizeHandlesPosition(); // Update handle positions after styles are restored
        }
    });
} 