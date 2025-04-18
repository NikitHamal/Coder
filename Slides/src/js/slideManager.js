export class SlideManager {
    constructor() {
        this.slides = [];
        this.currentSlideIndex = -1;
    }
    
    createSlide(data = {}) {
        const slide = {
            id: Date.now().toString(),
            title: data.title || 'Untitled Slide',
            elements: [],
            background: data.background || '#ffffff'
        };
        
        // If we have AI-generated content, convert it to elements
        if (data.content) {
            this.processSlideContent(slide, data);
        }
        
        this.slides.push(slide);
        return slide;
    }
    
    getSlideContainerWidth() {
        const container = document.getElementById('current-slide');
        if (container) {
            const style = window.getComputedStyle(container);
            const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            return width;
        }
        // Fallback to default
        return 860;
    }
    
    processSlideContent(slide, data) {
        const slidePadding = 50;
        const containerWidth = this.getSlideContainerWidth ? this.getSlideContainerWidth() : 860;
        const availableWidth = containerWidth - (2 * slidePadding);
        let yPosition = 40; // Start Y position

        if (data.title) {
            slide.elements.push({
                id: `title-${Date.now()}`,
                type: 'heading',
                content: data.title,
                x: slidePadding,
                y: yPosition,
                width: availableWidth,
                height: 70, // Keep height relatively fixed for title
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#000000'
            });
            yPosition += 80; // Increment Y after title
        }
        
        if (data.subtitle) {
            slide.elements.push({
                id: `subtitle-${Date.now()}`,
                type: 'heading',
                content: data.subtitle,
                x: slidePadding,
                y: yPosition,
                width: availableWidth,
                height: 50,
                fontSize: 22,
                fontWeight: 'normal',
                textAlign: 'center',
                color: '#333333'
            });
            yPosition += 60; // Increment Y after subtitle
        }
        
        if (data.content && Array.isArray(data.content)) {
            // Ensure yPosition has space after title/subtitle
            if (!data.title && !data.subtitle) {
                yPosition = slidePadding; // Start nearer top if no title/subtitle
            } else if (yPosition < 120) {
                 yPosition = 120; // Ensure minimum starting Y if title/subtitle exist
            }
            
            data.content.forEach((item, index) => {
                const elementBase = {
                    x: slidePadding,
                    y: yPosition,
                    width: availableWidth
                };
                let elementHeight = 90; // Default height

                switch (item.type) {
                    case 'text':
                        // Crude height estimation based on text length
                        elementHeight = Math.max(60, Math.ceil(item.text.length / 50) * 25); // Adjust divisor/multiplier as needed
                        slide.elements.push({
                            ...elementBase,
                            id: `text-${Date.now()}-${index}`,
                            type: 'paragraph',
                            content: item.text,
                            height: elementHeight,
                            fontSize: 16,
                            fontWeight: 'normal',
                            textAlign: 'left',
                            color: '#000000'
                        });
                        break;
                        
                    case 'list':
                        elementHeight = Math.max(40, (item.items.length * 25) + 15);
                        slide.elements.push({
                            ...elementBase,
                            id: `list-${Date.now()}-${index}`,
                            type: 'list',
                            items: item.items,
                            x: slidePadding + 20, // Indent list slightly
                            width: availableWidth - 20,
                            height: elementHeight,
                            fontSize: 16,
                            fontWeight: 'normal',
                            color: '#000000',
                            listStyle: item.style || 'bullet'
                        });
                        break;
                        
                    case 'code':
                        elementHeight = Math.max(60, 18 * (item.code.split('\n').length + 2));
                        slide.elements.push({
                            ...elementBase,
                            id: `code-${Date.now()}-${index}`,
                            type: 'code',
                            content: item.code,
                            language: item.language || 'javascript',
                            height: elementHeight,
                            fontSize: 14,
                            fontFamily: 'monospace',
                            backgroundColor: '#f5f5f5'
                        });
                        break;
                        
                    case 'image':
                        // Keep image centered or allow AI to specify position?
                        // For now, place below previous content, roughly centered horizontally
                        elementHeight = 280;
                        slide.elements.push({
                            id: `image-${Date.now()}-${index}`,
                            type: 'image',
                            src: item.src, // AI provides description, needs translation to URL later
                            alt: item.alt || 'Image',
                            x: (960 - 440) / 2, // Center horizontally
                            y: yPosition,
                            width: 440, 
                            height: elementHeight
                        });
                        break;
                }
                yPosition += elementHeight + 20; // Increment Y position with padding
            });
        }
    }
    
    getSlide(index) {
        return this.slides[index];
    }
    
    getCurrentSlide() {
        if (this.currentSlideIndex >= 0 && this.currentSlideIndex < this.slides.length) {
            return this.slides[this.currentSlideIndex];
        }
        return null;
    }
    
    setCurrentSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.currentSlideIndex = index;
            return true;
        }
        return false;
    }
    
    addElementToSlide(slideIndex, element) {
        if (slideIndex >= 0 && slideIndex < this.slides.length) {
            element.id = `${element.type}-${Date.now()}`;
            this.slides[slideIndex].elements.push(element);
            return true;
        }
        return false;
    }
    
    updateElement(slideIndex, elementId, properties) {
        if (slideIndex >= 0 && slideIndex < this.slides.length) {
            const slide = this.slides[slideIndex];
            const elementIndex = slide.elements.findIndex(el => el.id === elementId);
            
            if (elementIndex !== -1) {
                slide.elements[elementIndex] = {
                    ...slide.elements[elementIndex],
                    ...properties
                };
                return true;
            }
        }
        return false;
    }
    
    removeElement(slideIndex, elementId) {
        if (slideIndex >= 0 && slideIndex < this.slides.length) {
            const slide = this.slides[slideIndex];
            const elementIndex = slide.elements.findIndex(el => el.id === elementId);
            
            if (elementIndex !== -1) {
                slide.elements.splice(elementIndex, 1);
                return true;
            }
        }
        return false;
    }
    
    clearSlides() {
        this.slides = [];
        this.currentSlideIndex = -1;
    }
    
    getSlidesIndex() {
        return this.slides.map((slide, idx) => ({
            slideIndex: idx,
            title: slide.title,
            elements: slide.elements.map(el => ({
                id: el.id,
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                content: el.content ? (el.content.length > 30 ? el.content.slice(0, 30) + '...' : el.content) : undefined
            }))
        }));
    }
} 