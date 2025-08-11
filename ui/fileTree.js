import { setActiveFile } from '../state.js';

const fileListContainer = document.querySelector('.file-list');

// Helper to build a tree object from flat path keys
function buildFileTree(files) {
    const tree = {};
    Object.keys(files).forEach((path) => {
        const parts = path.split('/');
        let currentLevel = tree;
        parts.forEach((part, index) => {
            if (!part) return;
            if (index === parts.length - 1) {
                currentLevel[part] = { _isFile: true, path: path };
            } else {
                if (!currentLevel[part]) {
                    currentLevel[part] = { _isFolder: true, children: {} };
                }
                currentLevel = currentLevel[part].children;
            }
        });
    });
    return tree;
}

export function renderFileTree(files, activeFile) {
    fileListContainer.innerHTML = '';
    const tree = buildFileTree(files);
    const renderNode = (node, container, level) => {
        Object.keys(node)
            .sort()
            .forEach((key) => {
                const item = node[key];
                const element = document.createElement('div');
                element.style.paddingLeft = `${level * 15}px`;
                if (item._isFile) {
                    element.classList.add('file-item');
                    element.setAttribute('data-path', item.path);
                    element.innerHTML = `<i class="material-icons file-icon">description</i><span>${key}</span>`;
                    if (item.path === activeFile) {
                        element.classList.add('active');
                    }
                    element.addEventListener('click', () => {
                        setActiveFile(item.path);
                    });
                    container.appendChild(element);
                }
                // Folder rendering logic would go here
            });
    };
    renderNode(tree, fileListContainer, 0);
}
