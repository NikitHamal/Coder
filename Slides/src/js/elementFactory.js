export class ElementFactory {
    constructor() {
        this.defaultElementProperties = {
            heading: {
                width: 800,
                height: 70,
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#000000',
                content: 'New Heading'
            },
            paragraph: {
                width: 800,
                height: 180,
                fontSize: 16,
                fontWeight: 'normal',
                textAlign: 'left',
                color: '#000000',
                content: 'New text paragraph. Click to edit.'
            },
            image: {
                width: 380,
                height: 280,
                src: 'https://via.placeholder.com/400x300?text=Click+to+add+image',
                alt: 'Image description'
            },
            code: {
                width: 800,
                height: 180,
                fontSize: 14,
                fontFamily: 'monospace',
                content: '// Add your code here',
                language: 'javascript',
                backgroundColor: '#f5f5f5'
            },
            list: {
                width: 700,
                height: 180,
                fontSize: 16,
                fontWeight: 'normal',
                color: '#000000',
                items: ['Item 1', 'Item 2', 'Item 3'],
                listStyle: 'bullet'
            },
            chart: {
                width: 480,
                height: 360,
                chartType: 'bar',
                backgroundColor: '#f9f9f9'
            }
        };
    }
    
    createElement(type) {
        if (!this.defaultElementProperties[type]) {
            console.error(`Element type "${type}" is not supported`);
            return null;
        }
        
        return {
            type,
            ...this.defaultElementProperties[type]
        };
    }
    
    getPropertyOptions(type) {
        const commonProperties = ['x', 'y', 'width', 'height'];
        
        const typeSpecificProperties = {
            heading: ['content', 'fontSize', 'fontWeight', 'textAlign', 'color'],
            paragraph: ['content', 'fontSize', 'fontWeight', 'textAlign', 'color'],
            image: ['src', 'alt'],
            code: ['content', 'language', 'fontSize', 'fontFamily', 'backgroundColor'],
            list: ['items', 'listStyle', 'fontSize', 'color'],
            chart: ['chartType', 'backgroundColor']
        };
        
        return [...commonProperties, ...(typeSpecificProperties[type] || [])];
    }
} 