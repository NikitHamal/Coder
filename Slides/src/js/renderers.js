export const renderElements = {
    heading: (element) => {
        const heading = document.createElement('div');
        heading.id = element.id;
        heading.className = 'slide-element';
        heading.style.position = 'absolute';
        heading.style.left = `${element.x}px`;
        heading.style.top = `${element.y}px`;
        heading.style.width = `${element.width}px`;
        heading.style.height = `${element.height}px`;
        heading.style.fontSize = `${element.fontSize}px`;
        heading.style.fontWeight = element.fontWeight || 'bold';
        heading.style.color = element.color || '#000000';
        heading.style.textAlign = element.textAlign || 'center';
        heading.innerHTML = element.content || 'Heading Text';
        heading.style.overflow = 'hidden';
        heading.style.wordWrap = 'break-word';
        heading.style.boxSizing = 'border-box';
        heading.style.whiteSpace = 'normal';
        heading.style.overflowWrap = 'break-word';
        
        return heading;
    },
    
    paragraph: (element) => {
        const paragraph = document.createElement('div');
        paragraph.id = element.id;
        paragraph.className = 'slide-element';
        paragraph.style.position = 'absolute';
        paragraph.style.left = `${element.x}px`;
        paragraph.style.top = `${element.y}px`;
        paragraph.style.width = `${element.width}px`;
        paragraph.style.height = `${element.height}px`;
        paragraph.style.fontSize = `${element.fontSize}px`;
        paragraph.style.fontWeight = element.fontWeight || 'normal';
        paragraph.style.color = element.color || '#000000';
        paragraph.style.textAlign = element.textAlign || 'left';
        paragraph.innerHTML = element.content || 'Paragraph text';
        paragraph.style.overflow = 'hidden';
        paragraph.style.wordWrap = 'break-word';
        paragraph.style.boxSizing = 'border-box';
        paragraph.style.whiteSpace = 'normal';
        paragraph.style.overflowWrap = 'break-word';
        
        return paragraph;
    },
    
    image: (element) => {
        const imageContainer = document.createElement('div');
        imageContainer.id = element.id;
        imageContainer.className = 'slide-element';
        imageContainer.style.position = 'absolute';
        imageContainer.style.left = `${element.x}px`;
        imageContainer.style.top = `${element.y}px`;
        imageContainer.style.width = `${element.width}px`;
        imageContainer.style.height = `${element.height}px`;
        
        const image = document.createElement('img');
        image.src = element.src || 'https://via.placeholder.com/400x300?text=Add+Image+URL';
        image.alt = element.alt || 'Slide image';
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'contain';
        
        imageContainer.appendChild(image);
        
        return imageContainer;
    },
    
    code: (element) => {
        const codeContainer = document.createElement('div');
        codeContainer.id = element.id;
        codeContainer.className = 'slide-element';
        codeContainer.style.position = 'absolute';
        codeContainer.style.left = `${element.x}px`;
        codeContainer.style.top = `${element.y}px`;
        codeContainer.style.width = `${element.width}px`;
        codeContainer.style.height = `${element.height}px`;
        codeContainer.style.overflow = 'auto';
        codeContainer.style.backgroundColor = element.backgroundColor || '#f5f5f5';
        codeContainer.style.padding = '10px';
        codeContainer.style.borderRadius = '4px';
        
        const pre = document.createElement('pre');
        pre.style.margin = '0';
        pre.style.fontFamily = element.fontFamily || 'monospace';
        pre.style.fontSize = `${element.fontSize}px`;
        
        const code = document.createElement('code');
        code.className = element.language || 'javascript';
        code.textContent = element.content || '// Add your code here';
        
        pre.appendChild(code);
        codeContainer.appendChild(pre);
        
        return codeContainer;
    },
    
    list: (element) => {
        const listContainer = document.createElement('div');
        listContainer.id = element.id;
        listContainer.className = 'slide-element';
        listContainer.style.position = 'absolute';
        listContainer.style.left = `${element.x}px`;
        listContainer.style.top = `${element.y}px`;
        listContainer.style.width = `${element.width}px`;
        listContainer.style.height = `${element.height}px`;
        listContainer.style.fontSize = `${element.fontSize}px`;
        listContainer.style.color = element.color || '#000000';
        
        const listElement = document.createElement(
            element.listStyle === 'numbered' ? 'ol' : 'ul'
        );
        listElement.style.paddingLeft = '16px';
        
        if (element.items && Array.isArray(element.items)) {
            element.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                listElement.appendChild(li);
            });
        } else {
            // Default list items if none provided
            for (let i = 1; i <= 3; i++) {
                const li = document.createElement('li');
                li.textContent = `List item ${i}`;
                listElement.appendChild(li);
            }
        }
        
        listContainer.appendChild(listElement);
        
        return listContainer;
    },
    
    chart: (element) => {
        const chartContainer = document.createElement('div');
        chartContainer.id = element.id;
        chartContainer.className = 'slide-element';
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = `${element.x}px`;
        chartContainer.style.top = `${element.y}px`;
        chartContainer.style.width = `${element.width}px`;
        chartContainer.style.height = `${element.height}px`;
        chartContainer.style.backgroundColor = '#f9f9f9';
        chartContainer.style.border = '1px solid #e0e0e0';
        chartContainer.style.borderRadius = '4px';
        chartContainer.style.display = 'flex';
        chartContainer.style.justifyContent = 'center';
        chartContainer.style.alignItems = 'center';
        
        chartContainer.innerHTML = `
            <div style="text-align:center;">
                <span class="material-icons" style="font-size:36px;color:#666;">bar_chart</span>
                <p style="margin-top:8px;font-size:14px;">Chart Placeholder</p>
            </div>
        `;
        
        return chartContainer;
    }
}; 