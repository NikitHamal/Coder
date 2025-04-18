import { renderElements } from './renderers.js';

export class UIManager {
    constructor(slideManager) {
        this.slideManager = slideManager;
        this.selectedElementId = null;
        this.isDraggingElement = false;
        this.dragOffset = { x: 0, y: 0 };
    }
    
    init() {
        // Setup event delegation for slide thumbnails
        document.getElementById('slide-thumbnails').addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.slide-thumbnail');
            if (thumbnail) {
                const index = parseInt(thumbnail.dataset.index, 10);
                this.selectSlide(index);
            }
        });
        
        // Setup event delegation for slide elements
        document.getElementById('current-slide').addEventListener('mousedown', (e) => {
            const element = e.target.closest('.slide-element');
            if (element) {
                this.handleElementMouseDown(element, e);
            }
        });
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingElement && this.selectedElementId) {
                this.handleElementMouseMove(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDraggingElement) {
                this.isDraggingElement = false;
            }
        });
    }
    
    addSlideToThumbnails(slide) {
        const thumbnailsContainer = document.getElementById('slide-thumbnails');
        const slideIndex = this.slideManager.slides.length - 1;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'slide-thumbnail';
        thumbnail.dataset.index = slideIndex;
        
        // Add a simple preview (could be enhanced to show actual mini-preview)
        thumbnail.innerHTML = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;font-size:11px;">
                ${slide.title}
            </div>
        `;
        
        thumbnailsContainer.appendChild(thumbnail);
    }
    
    selectSlide(index) {
        if (this.slideManager.setCurrentSlide(index)) {
            // Update thumbnail selection
            const thumbnails = document.querySelectorAll('.slide-thumbnail');
            thumbnails.forEach((thumb, i) => {
                if (i === index) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
            
            // Render the current slide
            this.renderCurrentSlide();
            
            // Clear property panel
            this.clearPropertyPanel();
        }
    }
    
    renderCurrentSlide() {
        const slideContainer = document.getElementById('current-slide');
        const currentSlide = this.slideManager.getCurrentSlide();
        
        if (!currentSlide) {
            slideContainer.innerHTML = `
                <div class="placeholder-message">
                    <div class="placeholder-icon">
                        <span class="material-icons">auto_awesome</span>
                    </div>
                    <h3>No Slide Selected</h3>
                    <p>Create a new slide or select one from the sidebar.</p>
                </div>
            `;
            return;
        }
        
        // Clear current content and set background
        slideContainer.innerHTML = '';
        slideContainer.style.backgroundColor = currentSlide.background;
        
        // Render all elements
        currentSlide.elements.forEach(element => {
            const elementNode = renderElements[element.type](element);
            slideContainer.appendChild(elementNode);
            
            // Add event handlers for elements
            elementNode.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(element.id);
            });
        });
        
        // Clear selection when clicking on empty slide area
        slideContainer.addEventListener('click', (e) => {
            if (e.target === slideContainer) {
                this.clearElementSelection();
            }
        });
    }
    
    selectElement(elementId) {
        const currentSlide = this.slideManager.getCurrentSlide();
        if (!currentSlide) return;
        
        // Clear previous selection
        this.clearElementSelection();
        
        // Mark new element as selected
        this.selectedElementId = elementId;
        const elementNode = document.getElementById(elementId);
        if (elementNode) {
            elementNode.classList.add('selected');
        }
        
        // Find element data and populate property panel
        const element = currentSlide.elements.find(el => el.id === elementId);
        if (element) {
            this.populatePropertyPanel(element);
        }
    }
    
    clearElementSelection() {
        if (this.selectedElementId) {
            const element = document.getElementById(this.selectedElementId);
            if (element) {
                element.classList.remove('selected');
            }
            this.selectedElementId = null;
            this.clearPropertyPanel();
        }
    }
    
    handleElementMouseDown(elementNode, e) {
        e.preventDefault();
        
        const elementId = elementNode.id;
        this.selectElement(elementId);
        
        this.isDraggingElement = true;
        
        // Calculate offset for smoother dragging
        const rect = elementNode.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    handleElementMouseMove(e) {
        e.preventDefault();
        
        if (!this.selectedElementId || !this.isDraggingElement) return;
        
        const slideContainer = document.getElementById('current-slide');
        const slideRect = slideContainer.getBoundingClientRect();
        
        const elementNode = document.getElementById(this.selectedElementId);
        if (!elementNode) return;
        
        // Calculate new position within slide boundaries
        let x = e.clientX - slideRect.left - this.dragOffset.x;
        let y = e.clientY - slideRect.top - this.dragOffset.y;
        
        // Ensure element stays within slide boundaries
        x = Math.max(0, Math.min(slideRect.width - elementNode.offsetWidth, x));
        y = Math.max(0, Math.min(slideRect.height - elementNode.offsetHeight, y));
        
        // Update element position
        elementNode.style.left = `${x}px`;
        elementNode.style.top = `${y}px`;
        
        // Update element data in slideManager
        const currentSlideIndex = this.slideManager.currentSlideIndex;
        this.slideManager.updateElement(currentSlideIndex, this.selectedElementId, { x, y });
    }
    
    populatePropertyPanel(element) {
        const propertiesPanel = document.querySelector('.properties-panel');
        
        // Clear existing content
        propertiesPanel.innerHTML = '<h3>Properties</h3>';
        
        // Create property editors based on element type
        const propertyGroups = document.createElement('div');
        propertyGroups.className = 'property-groups';
        
        // Common properties for all elements
        this.addPositionSizeProperties(propertyGroups, element);
        
        // Type-specific properties
        switch (element.type) {
            case 'heading':
            case 'paragraph':
                this.addTextProperties(propertyGroups, element);
                break;
                
            case 'image':
                this.addImageProperties(propertyGroups, element);
                break;
                
            case 'code':
                this.addCodeProperties(propertyGroups, element);
                break;
                
            case 'list':
                this.addListProperties(propertyGroups, element);
                break;
        }
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-secondary';
        deleteButton.textContent = 'Delete Element';
        deleteButton.addEventListener('click', () => {
            this.deleteSelectedElement();
        });
        
        propertyGroups.appendChild(deleteButton);
        propertiesPanel.appendChild(propertyGroups);
    }
    
    addPositionSizeProperties(container, element) {
        const posGroup = document.createElement('div');
        posGroup.className = 'property-group';
        posGroup.innerHTML = `
            <h4>Position & Size</h4>
            <div class="property-row">
                <label for="prop-x">X Position</label>
                <input type="number" id="prop-x" value="${element.x}" />
            </div>
            <div class="property-row">
                <label for="prop-y">Y Position</label>
                <input type="number" id="prop-y" value="${element.y}" />
            </div>
            <div class="property-row">
                <label for="prop-width">Width</label>
                <input type="number" id="prop-width" value="${element.width}" />
            </div>
            <div class="property-row">
                <label for="prop-height">Height</label>
                <input type="number" id="prop-height" value="${element.height}" />
            </div>
        `;
        
        // Add event listeners for property changes
        posGroup.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const prop = input.id.split('-')[1];
                const value = parseInt(input.value, 10);
                
                const updates = { [prop]: value };
                
                // Update element in slide manager
                const currentSlideIndex = this.slideManager.currentSlideIndex;
                this.slideManager.updateElement(currentSlideIndex, element.id, updates);
                
                // Update DOM element
                this.updateElementInDOM(element.id, updates);
            });
        });
        
        container.appendChild(posGroup);
    }
    
    addTextProperties(container, element) {
        const textGroup = document.createElement('div');
        textGroup.className = 'property-group';
        textGroup.innerHTML = `
            <h4>Text Properties</h4>
            <div class="property-row">
                <label for="prop-content">Content</label>
                <textarea id="prop-content">${element.content || ''}</textarea>
            </div>
            <div class="property-row">
                <label for="prop-fontSize">Font Size</label>
                <input type="number" id="prop-fontSize" value="${element.fontSize || 16}" />
            </div>
            <div class="property-row">
                <label for="prop-color">Text Color</label>
                <input type="color" id="prop-color" value="${element.color || '#000000'}" />
            </div>
            <div class="property-row">
                <label for="prop-textAlign">Text Align</label>
                <select id="prop-textAlign">
                    <option value="left" ${element.textAlign === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${element.textAlign === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${element.textAlign === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
            <div class="property-row">
                <label for="prop-fontWeight">Font Weight</label>
                <select id="prop-fontWeight">
                    <option value="normal" ${element.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="bold" ${element.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                </select>
            </div>
        `;
        
        // Add event listeners for property changes
        textGroup.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', () => {
                const prop = input.id.split('-')[1];
                const value = input.type === 'number' ? parseInt(input.value, 10) : input.value;
                
                const updates = { [prop]: value };
                
                // Update element in slide manager
                const currentSlideIndex = this.slideManager.currentSlideIndex;
                this.slideManager.updateElement(currentSlideIndex, element.id, updates);
                
                // Re-render the slide to reflect changes
                this.renderCurrentSlide();
                this.selectElement(element.id);
            });
        });
        
        container.appendChild(textGroup);
    }
    
    addImageProperties(container, element) {
        const imageGroup = document.createElement('div');
        imageGroup.className = 'property-group';
        imageGroup.innerHTML = `
            <h4>Image Properties</h4>
            <div class="property-row">
                <label for="prop-src">Image URL</label>
                <input type="text" id="prop-src" value="${element.src || ''}" />
            </div>
            <div class="property-row">
                <label for="prop-alt">Alt Text</label>
                <input type="text" id="prop-alt" value="${element.alt || ''}" />
            </div>
        `;
        
        // Add event listeners for property changes
        imageGroup.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const prop = input.id.split('-')[1];
                const value = input.value;
                
                const updates = { [prop]: value };
                
                // Update element in slide manager
                const currentSlideIndex = this.slideManager.currentSlideIndex;
                this.slideManager.updateElement(currentSlideIndex, element.id, updates);
                
                // Re-render the slide to reflect changes
                this.renderCurrentSlide();
                this.selectElement(element.id);
            });
        });
        
        container.appendChild(imageGroup);
    }
    
    addCodeProperties(container, element) {
        const codeGroup = document.createElement('div');
        codeGroup.className = 'property-group';
        codeGroup.innerHTML = `
            <h4>Code Properties</h4>
            <div class="property-row">
                <label for="prop-content">Code</label>
                <textarea id="prop-content">${element.content || ''}</textarea>
            </div>
            <div class="property-row">
                <label for="prop-language">Language</label>
                <select id="prop-language">
                    <option value="javascript" ${element.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
                    <option value="python" ${element.language === 'python' ? 'selected' : ''}>Python</option>
                    <option value="html" ${element.language === 'html' ? 'selected' : ''}>HTML</option>
                    <option value="css" ${element.language === 'css' ? 'selected' : ''}>CSS</option>
                </select>
            </div>
            <div class="property-row">
                <label for="prop-fontSize">Font Size</label>
                <input type="number" id="prop-fontSize" value="${element.fontSize || 16}" />
            </div>
        `;
        
        // Add event listeners for property changes
        codeGroup.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', () => {
                const prop = input.id.split('-')[1];
                const value = input.type === 'number' ? parseInt(input.value, 10) : input.value;
                
                const updates = { [prop]: value };
                
                // Update element in slide manager
                const currentSlideIndex = this.slideManager.currentSlideIndex;
                this.slideManager.updateElement(currentSlideIndex, element.id, updates);
                
                // Re-render the slide to reflect changes
                this.renderCurrentSlide();
                this.selectElement(element.id);
            });
        });
        
        container.appendChild(codeGroup);
    }
    
    addListProperties(container, element) {
        const listGroup = document.createElement('div');
        listGroup.className = 'property-group';
        
        // Create HTML for the list items
        const listItemsText = element.items ? element.items.join('\n') : '';
        
        listGroup.innerHTML = `
            <h4>List Properties</h4>
            <div class="property-row">
                <label for="prop-items">List Items (one per line)</label>
                <textarea id="prop-items">${listItemsText}</textarea>
            </div>
            <div class="property-row">
                <label for="prop-listStyle">List Style</label>
                <select id="prop-listStyle">
                    <option value="bullet" ${element.listStyle === 'bullet' ? 'selected' : ''}>Bullet</option>
                    <option value="numbered" ${element.listStyle === 'numbered' ? 'selected' : ''}>Numbered</option>
                </select>
            </div>
            <div class="property-row">
                <label for="prop-fontSize">Font Size</label>
                <input type="number" id="prop-fontSize" value="${element.fontSize || 16}" />
            </div>
            <div class="property-row">
                <label for="prop-color">Text Color</label>
                <input type="color" id="prop-color" value="${element.color || '#000000'}" />
            </div>
        `;
        
        // Add event listeners for property changes
        listGroup.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', () => {
                const prop = input.id.split('-')[1];
                let value = input.value;
                
                // Special handling for list items
                if (prop === 'items') {
                    value = input.value.split('\n').filter(item => item.trim() !== '');
                } else if (input.type === 'number') {
                    value = parseInt(input.value, 10);
                }
                
                const updates = { [prop]: value };
                
                // Update element in slide manager
                const currentSlideIndex = this.slideManager.currentSlideIndex;
                this.slideManager.updateElement(currentSlideIndex, element.id, updates);
                
                // Re-render the slide to reflect changes
                this.renderCurrentSlide();
                this.selectElement(element.id);
            });
        });
        
        container.appendChild(listGroup);
    }
    
    updateElementInDOM(elementId, updates) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (updates.x !== undefined) element.style.left = `${updates.x}px`;
        if (updates.y !== undefined) element.style.top = `${updates.y}px`;
        if (updates.width !== undefined) element.style.width = `${updates.width}px`;
        if (updates.height !== undefined) element.style.height = `${updates.height}px`;
    }
    
    deleteSelectedElement() {
        if (!this.selectedElementId) return;
        
        const currentSlideIndex = this.slideManager.currentSlideIndex;
        this.slideManager.removeElement(currentSlideIndex, this.selectedElementId);
        
        // Re-render slide and clear selection
        this.renderCurrentSlide();
        this.clearElementSelection();
    }
    
    clearPropertyPanel() {
        const propertiesPanel = document.querySelector('.properties-panel');
        propertiesPanel.innerHTML = `
            <h3>Properties</h3>
            <div class="no-selection-message">Select an element to edit its properties</div>
        `;
    }
} 