import { SlideManager } from './slideManager.js';
import { UIManager } from './uiManager.js';
import { AIService } from './aiService.js';
import { ElementFactory } from './elementFactory.js';
import { exportToPDF, exportToImages } from './exportService.js';

class App {
    constructor() {
        this.slideManager = new SlideManager();
        this.uiManager = new UIManager(this.slideManager);
        this.aiService = new AIService();
        this.elementFactory = new ElementFactory();
        
        window.app = this;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.uiManager.init();
    }
    
    setupEventListeners() {
        // Generate slides button
        document.getElementById('generate-btn').addEventListener('click', () => this.generateSlides());
        
        // Add slide button
        document.getElementById('add-slide-btn').addEventListener('click', () => this.addNewSlide());
        
        // Export PDF button
        document.querySelector('.user-menu .btn-secondary').addEventListener('click', () => this.exportPresentation());
        
        // Export Images button
        let exportImgBtn = document.querySelector('.user-menu .btn-export-images');
        if (!exportImgBtn) {
            exportImgBtn = document.createElement('button');
            exportImgBtn.className = 'btn-secondary btn-export-images';
            exportImgBtn.textContent = 'Export Images';
            document.querySelector('.user-menu').appendChild(exportImgBtn);
        }
        exportImgBtn.addEventListener('click', () => this.exportImages());

        // Debug Index button
        let debugBtn = document.querySelector('.user-menu .btn-debug-index');
        if (!debugBtn) {
            debugBtn = document.createElement('button');
            debugBtn.className = 'btn-secondary btn-debug-index';
            debugBtn.textContent = 'Log Index';
            document.querySelector('.user-menu').appendChild(debugBtn);
        }
        debugBtn.addEventListener('click', () => {
            console.log(this.slideManager.getSlidesIndex());
        });

        // Elements drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const elementItems = document.querySelectorAll('.element-item');
        const slideContainer = document.getElementById('current-slide');
        
        elementItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.getAttribute('data-type'));
            });
        });
        
        slideContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        slideContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const elementType = e.dataTransfer.getData('text/plain');
            const x = e.offsetX;
            const y = e.offsetY;
            
            this.addElementToSlide(elementType, x, y);
        });
    }
    
    async generateSlides() {
        const promptInput = document.getElementById('prompt-input');
        const slideCount = document.getElementById('slide-count').value;
        const slideStyle = document.getElementById('slide-style').value;
        
        if (!promptInput.value.trim()) {
            alert('Please enter a prompt for your slides');
            return;
        }
        
        // Show loading modal
        document.getElementById('loading-modal').classList.add('active');
        
        try {
            const slidesData = await this.aiService.generateSlidesContent(
                promptInput.value, 
                slideCount, 
                slideStyle
            );
            
            this.slideManager.clearSlides();
            
            slidesData.forEach(slideData => {
                const slide = this.slideManager.createSlide(slideData);
                this.uiManager.addSlideToThumbnails(slide);
            });
            
            this.uiManager.selectSlide(0);
        } catch (error) {
            console.error('Error generating slides:', error);
            alert('Failed to generate slides. Please try again.');
        } finally {
            // Hide loading modal
            document.getElementById('loading-modal').classList.remove('active');
        }
    }
    
    addNewSlide() {
        const slide = this.slideManager.createSlide({ title: 'New Slide', content: [] });
        this.uiManager.addSlideToThumbnails(slide);
        this.uiManager.selectSlide(this.slideManager.slides.length - 1);
    }
    
    addElementToSlide(elementType, x, y) {
        const currentSlideIndex = this.slideManager.currentSlideIndex;
        
        if (currentSlideIndex === -1) {
            alert('Please create or select a slide first');
            return;
        }
        
        const element = this.elementFactory.createElement(elementType);
        element.x = x;
        element.y = y;
        
        this.slideManager.addElementToSlide(currentSlideIndex, element);
        this.uiManager.renderCurrentSlide();
    }
    
    exportPresentation() {
        const format = 'pdf'; // Default to PDF
        exportToPDF(this.slideManager.slides);
    }

    exportImages() {
        exportToImages(this.slideManager.slides);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 