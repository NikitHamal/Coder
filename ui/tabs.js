import { setActiveFile, closeTab } from '../state.js';

const tabsContainer = document.querySelector('.tabs-container');

export function renderTabs(openTabs, activeFile) {
    tabsContainer.innerHTML = '';
    openTabs.forEach((path) => {
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.setAttribute('data-path', path);
        if (path === activeFile) {
            tab.classList.add('active');
        }
        const fileName = path.split('/').pop();
        tab.innerHTML = `<span>${fileName}</span><button class="close-tab-btn"><i class="material-icons">close</i></button>`;
        tab.addEventListener('click', (e) => {
            if (e.target.closest('.close-tab-btn')) {
                closeTab(path);
            } else {
                setActiveFile(path);
            }
        });
        tabsContainer.appendChild(tab);
    });
}
