export function showDiffModal({ filePath, oldContent, newContent }) {
    return new Promise((resolve) => {
        let modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">Review Changes: ${filePath}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <pre class="diff-viewer">${diffStringsInline(oldContent, newContent)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="modal-button modal-cancel">Reject</button>
                    <button class="modal-button modal-confirm">Approve</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = close;
        modal.querySelector('.modal-cancel').onclick = () => {
            close();
            resolve(false);
        };
        modal.querySelector('.modal-confirm').onclick = () => {
            close();
            resolve(true);
        };
        function close() {
            document.body.removeChild(modal);
        }
    });
}

function diffStringsInline(oldStr, newStr) {
    if (oldStr === newStr)
        return '<span style="color: #4caf50">No changes</span>';
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    let html = '';
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';
        if (oldLine === newLine) {
            html += `<div style="background:#222;color:#ccc">  ${escapeHtml(oldLine)}</div>`;
        } else {
            if (oldLine)
                html += `<div style="background:#2d1a1a;color:#e57373">- ${escapeHtml(oldLine)}</div>`;
            if (newLine)
                html += `<div style="background:#1a2d1a;color:#81c784">+ ${escapeHtml(newLine)}</div>`;
        }
    }
    return html;
}

function escapeHtml(str) {
    return str.replace(
        /[&<>]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]
    );
}
