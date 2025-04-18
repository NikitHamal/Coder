// fileOps.js
import { fileStorage } from './fileStorage.js';
import { addDiffToUI, addFileOperationMessage } from './aiChatModule.js';
import { lintJsCode } from './linter.js';
import { updateLintStatus, showLinterPanel } from './ui.js';

function isValidPath(path) {
    return typeof path === 'string' && path.trim() !== '' && !(/[<>:"\\|?*]/.test(path));
}

function autoFixSemicolons(code) {
    return code.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return line;
        if (/^[^\{\}\s][^;\{\}]$/.test(trimmed) && !trimmed.endsWith(';')) return line + ';';
        return line;
    }).join('\n');
}

export async function createFile(path, content = '', opts = {}) {
    if (!isValidPath(path)) return { success: false, error: 'Invalid file path.' };
    if (fileStorage.getFile(path) !== null) return { success: false, error: 'File already exists.' };
    
    if (!opts.skipDiff) {
        return new Promise((resolve) => {
            addDiffToUI(
                path, 
                '', 
                content,
                () => {
                    // On approve
                    fileStorage.saveFile(path, content);
                    addFileOperationMessage(`File created: ${path}`);
                    if (path.endsWith('.js')) {
                        const problems = lintJsCode(content);
                        updateLintStatus(problems);
                        showLinterPanel(problems, async () => {
                            const fixed = autoFixSemicolons(content);
                            fileStorage.saveFile(path, fixed);
                            const newProblems = lintJsCode(fixed);
                            updateLintStatus(newProblems);
                            showLinterPanel(newProblems, null);
                        });
                    }
                    resolve({ success: true });
                },
                () => {
                    // On reject
                    addFileOperationMessage(`File creation cancelled: ${path}`, false);
                    resolve({ success: false, error: 'Change rejected by user.' });
                }
            );
        });
    }
    
    fileStorage.saveFile(path, content);
    addFileOperationMessage(`File created: ${path}`);
    if (path.endsWith('.js')) {
        const problems = lintJsCode(content);
        updateLintStatus(problems);
        showLinterPanel(problems, async () => {
            const fixed = autoFixSemicolons(content);
            fileStorage.saveFile(path, fixed);
            const newProblems = lintJsCode(fixed);
            updateLintStatus(newProblems);
            showLinterPanel(newProblems, null);
        });
    }
    return { success: true };
}

export async function modifyFile(path, content, opts = {}) {
    if (!isValidPath(path)) return { success: false, error: 'Invalid file path.' };
    const oldContent = fileStorage.getFile(path);
    if (oldContent === null) return { success: false, error: 'File does not exist.' };
    
    if (!opts.skipDiff) {
        return new Promise((resolve) => {
            addDiffToUI(
                path, 
                oldContent, 
                content,
                () => {
                    // On approve
                    fileStorage.saveFile(path, content);
                    addFileOperationMessage(`File modified: ${path}`);
                    if (path.endsWith('.js')) {
                        const problems = lintJsCode(content);
                        updateLintStatus(problems);
                        showLinterPanel(problems, async () => {
                            const fixed = autoFixSemicolons(content);
                            fileStorage.saveFile(path, fixed);
                            const newProblems = lintJsCode(fixed);
                            updateLintStatus(newProblems);
                            showLinterPanel(newProblems, null);
                        });
                    }
                    resolve({ success: true });
                },
                () => {
                    // On reject
                    addFileOperationMessage(`File modification cancelled: ${path}`, false);
                    resolve({ success: false, error: 'Change rejected by user.' });
                }
            );
        });
    }
    
    fileStorage.saveFile(path, content);
    addFileOperationMessage(`File modified: ${path}`);
    if (path.endsWith('.js')) {
        const problems = lintJsCode(content);
        updateLintStatus(problems);
        showLinterPanel(problems, async () => {
            const fixed = autoFixSemicolons(content);
            fileStorage.saveFile(path, fixed);
            const newProblems = lintJsCode(fixed);
            updateLintStatus(newProblems);
            showLinterPanel(newProblems, null);
        });
    }
    return { success: true };
}

export function deleteFile(path) {
    if (!isValidPath(path)) return { success: false, error: 'Invalid file path.' };
    const ok = fileStorage.deleteFile(path);
    if (!ok) return { success: false, error: 'File not found.' };
    addFileOperationMessage(`File deleted: ${path}`);
    return { success: true };
}

export function renameFile(oldPath, newPath) {
    if (!isValidPath(oldPath) || !isValidPath(newPath)) return { success: false, error: 'Invalid path.' };
    const ok = fileStorage.renameFile(oldPath, newPath);
    if (!ok) return { success: false, error: 'Rename failed.' };
    addFileOperationMessage(`File renamed: ${oldPath} → ${newPath}`);
    return { success: true };
}

export function moveFile(oldPath, newPath) {
    return renameFile(oldPath, newPath);
}

export function copyFile(srcPath, destPath) {
    if (!isValidPath(srcPath) || !isValidPath(destPath)) return { success: false, error: 'Invalid path.' };
    const content = fileStorage.getFile(srcPath);
    if (content === null) return { success: false, error: 'Source file not found.' };
    if (fileStorage.getFile(destPath) !== null) return { success: false, error: 'Destination already exists.' };
    fileStorage.saveFile(destPath, content);
    return { success: true };
}

export function createFolder(path) {
    if (!isValidPath(path)) return { success: false, error: 'Invalid folder path.' };
    const folderPath = path.endsWith('/') ? path : path + '/';
    if (fileStorage.getFile(folderPath + '.folder') !== null) return { success: false, error: 'Folder already exists.' };
    fileStorage.saveFile(folderPath + '.folder', '');
    return { success: true };
}

export function deleteFolder(path) {
    if (!isValidPath(path)) return { success: false, error: 'Invalid folder path.' };
    const folderPath = path.endsWith('/') ? path : path + '/';
    const ok = fileStorage.deleteFile(folderPath + '.folder');
    if (!ok) return { success: false, error: 'Folder not found.' };
    return { success: true };
} 