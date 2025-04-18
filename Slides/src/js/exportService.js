import { renderElements } from './renderers.js';

export async function exportToPDF(slides) {
    try {
        // For a proper implementation, you would use a library like jsPDF or html2pdf
        // or send data to a server-side API for PDF generation
        
        // For now, we'll create a printable view of slides
        createPrintableView(slides);
        
        // Open print dialog
        setTimeout(() => {
            window.print();
            
            // Remove the printable view after printing
            setTimeout(() => {
                const printView = document.getElementById('print-view');
                if (printView) {
                    document.body.removeChild(printView);
                }
            }, 1000);
        }, 500);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert('Failed to export presentation. Please try again.');
    }
}

function createPrintableView(slides) {
    // Remove any existing print view
    const existingPrintView = document.getElementById('print-view');
    if (existingPrintView) {
        document.body.removeChild(existingPrintView);
    }
    
    // Create a new print view container
    const printView = document.createElement('div');
    printView.id = 'print-view';
    printView.style.position = 'fixed';
    printView.style.top = '0';
    printView.style.left = '0';
    printView.style.width = '100%';
    printView.style.height = '100%';
    printView.style.backgroundColor = 'white';
    printView.style.zIndex = '9999';
    printView.style.overflow = 'auto';
    printView.style.padding = '20px';
    
    // Add print-specific styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @media print {
            body * {
                visibility: hidden;
            }
            #print-view, #print-view * {
                visibility: visible;
            }
            #print-view {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto;
                overflow: visible;
                padding: 0;
            }
            .print-slide {
                page-break-after: always;
                padding: 40px;
                box-sizing: border-box;
            }
            .print-slide:last-child {
                page-break-after: avoid;
            }
        }
    `;
    printView.appendChild(styleElement);
    
    // Add a header with controls
    const header = document.createElement('div');
    header.style.padding = '10px';
    header.style.marginBottom = '20px';
    header.style.borderBottom = '1px solid #e0e0e0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h2');
    title.textContent = 'Print Preview';
    title.style.margin = '0';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'btn-secondary';
    closeButton.style.padding = '8px 16px';
    closeButton.onclick = () => {
        document.body.removeChild(printView);
    };
    
    header.appendChild(title);
    header.appendChild(closeButton);
    printView.appendChild(header);
    
    // Add each slide
    slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = 'print-slide';
        slideElement.style.width = '210mm'; // A4 width
        slideElement.style.height = '148mm'; // A4 height in landscape
        slideElement.style.margin = '0 auto 40px auto';
        slideElement.style.position = 'relative';
        slideElement.style.backgroundColor = slide.background || '#ffffff';
        slideElement.style.border = '1px solid #e0e0e0';
        slideElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        slideElement.style.overflow = 'hidden';
        
        // Add slide number
        const slideNumber = document.createElement('div');
        slideNumber.textContent = `${index + 1}`;
        slideNumber.style.position = 'absolute';
        slideNumber.style.bottom = '10px';
        slideNumber.style.right = '10px';
        slideNumber.style.fontSize = '12px';
        slideNumber.style.color = '#666';
        
        slideElement.appendChild(slideNumber);
        
        // Render all elements in the slide
        slide.elements.forEach(element => {
            try {
                const elementNode = renderElements[element.type](element);
                slideElement.appendChild(elementNode);
            } catch (error) {
                console.error(`Error rendering element of type ${element.type}:`, error);
            }
        });
        
        printView.appendChild(slideElement);
    });
    
    document.body.appendChild(printView);
}

export async function exportToImages(slides) {
    // Dynamically import html2canvas if not already loaded
    if (typeof window.html2canvas === 'undefined') {
        await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    }
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        // Create a temporary container for rendering
        const tempContainer = document.createElement('div');
        tempContainer.style.width = '960px';
        tempContainer.style.height = '540px';
        tempContainer.style.background = slide.background || '#fff';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.overflow = 'hidden';
        tempContainer.style.zIndex = '-1';
        document.body.appendChild(tempContainer);
        // Render all elements
        slide.elements.forEach(element => {
            try {
                const elementNode = renderElements[element.type](element);
                tempContainer.appendChild(elementNode);
            } catch (error) {
                console.error(`Error rendering element of type ${element.type}:`, error);
            }
        });
        // Use html2canvas to export as image
        await window.html2canvas(tempContainer, { backgroundColor: null }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${slide.title.replace(/\s+/g, '_') || 'slide'}_${i + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
        document.body.removeChild(tempContainer);
    }
}

export async function exportToHTML(slides) {
    // Future implementation for HTML export
    alert('HTML export feature coming soon!');
} 