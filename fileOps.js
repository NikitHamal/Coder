// fileOps.js
import {
    addFile as addFileToState,
    updateFileContent,
    deleteFile as deleteFileFromState,
    renameFile as renameFileInState,
} from './state.js';
import { addFileOperationMessage } from './aiChatModule.js';
import { showPrompt, showConfirm, showAlert } from './modal.js';

export async function createFile(path, content = '') {
    // This function is now just a wrapper around the state action
    // The diffing logic has been removed for simplicity and will be refactored later.
    const success = addFileToState(path, content);
    if (success) {
        addFileOperationMessage(`File created: ${path}`);
    }
    return { success };
}

export async function modifyFile(path, content) {
    updateFileContent(path, content);
    addFileOperationMessage(`File modified: ${path}`);
    return { success: true };
}

export async function addNewFileHandler() {
    const filePath = await showPrompt(
        'New File',
        'Enter the path/name for the new file:'
    );
    if (!filePath || !filePath.trim()) {
        showAlert('Error', 'File path cannot be empty.');
        return;
    }
    const result = await createFile(filePath.trim());
    if (!result.success) {
        showAlert('Error', result.error || 'Failed to create file.');
    }
}

export async function renameFileHandler(oldPath) {
    const oldName = oldPath.split('/').pop();
    const newName = await showPrompt(
        'Rename File',
        `Enter new name for ${oldName}:`,
        oldName
    );
    if (newName && newName.trim() !== '' && newName !== oldName) {
        const success = renameFileInState(oldPath, newName.trim());
        if (!success) {
            showAlert('Error', 'Rename failed.');
        } else {
            addFileOperationMessage(`File renamed: ${oldPath} → ${newName.trim()}`);
        }
    }
}

export async function deleteFileHandler(filePath) {
    const fileName = filePath.split('/').pop();
    const confirmed = await showConfirm(
        'Delete File',
        `Are you sure you want to delete "${fileName}"? This cannot be undone.`
    );
    if (confirmed) {
        deleteFileFromState(filePath);
        addFileOperationMessage(`File deleted: ${filePath}`);
    }
}

// These folder operations are not yet supported by the new state management.
export function createFolder(_path) {
    addFileOperationMessage('Folder creation is not yet supported.', false);
    return { success: false, error: 'Not implemented' };
}

export function deleteFolder(_path) {
    addFileOperationMessage('Folder deletion is not yet supported.', false);
    return { success: false, error: 'Not implemented' };
}
