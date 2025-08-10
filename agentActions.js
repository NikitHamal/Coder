import { fileStorage } from './fileStorage.js';
import * as fileOps from './fileOps.js';

// Dependencies injected from aiChatModule.js
let initializeUI = null;
let selectFile = null;
let addMessageToUI = null; // Function to add messages (including errors) to the UI

/**
 * Sets the dependencies needed by the agent action handlers.
 * @param {object} dependencies - Object containing required functions.
 * @param {function} dependencies.initializeUI - Function to refresh the file tree/UI.
 * @param {function} dependencies.selectFile - Function to select a file in the UI.
 * @param {function} dependencies.addMessageToUI - Function to add a message to the chat UI.
 */
export function setAgentActionDependencies(dependencies) {
    initializeUI = dependencies.initializeUI;
    selectFile = dependencies.selectFile;
    addMessageToUI = dependencies.addMessageToUI;
}

/**
 * Handles the execution of agentic actions received from the AI.
 * @param {Array<object>} actions - An array of action objects.
 */
export async function handleAgenticActions(actions) {
    let lastAffectedPath = null;
    let actionsExecuted = 0;

    // Ensure dependent functions are available
    if (!initializeUI || !selectFile || !addMessageToUI) {
         console.error("[handleAgenticActions] Dependency functions not set!");
         if (addMessageToUI) { // Try to report error if possible
             addMessageToUI('assistant', 'Internal Error: Could not execute actions due to missing UI functions.');
         }
         return;
    }

    // Validate fileStorage (imported directly)
    if (!fileStorage || typeof fileStorage.saveFile !== 'function') {
        console.error("[handleAgenticActions] fileStorage is not available or doesn't have a saveFile method!");
        addMessageToUI('assistant', 'Internal Error: File storage system is not available.');
        return;
    }

    // Check if actions is valid
    if (!Array.isArray(actions) || actions.length === 0) {
        console.warn("[handleAgenticActions] Invalid or empty actions array received:", actions);
        // Don't necessarily show an error to the user, maybe the AI just didn't have actions
        return;
    }

    for (const action of actions) {
        try {
            if (!action.type) {
                throw new Error('Action missing required "type" field');
            }
            let result = { success: false, error: 'Unknown error' };
            switch (action.type) {
                case 'create_file':
                    if (!action.path || typeof action.content !== 'string') throw new Error('Missing path or content for file operation');
                    result = await fileOps.createFile(action.path, action.content);
                    if (result.success) { lastAffectedPath = action.path; actionsExecuted++; }
                    break;
                case 'modify_file':
                case 'update_file':
                    if (!action.path || typeof action.content !== 'string') throw new Error('Missing path or content for file operation');
                    result = await fileOps.modifyFile(action.path, action.content);
                    if (result.success) { lastAffectedPath = action.path; actionsExecuted++; }
                    break;
                case 'create_folder':
                    if (!action.path) throw new Error('Missing path for folder operation');
                    result = await fileOps.createFolder(action.path);
                    if (result.success) { lastAffectedPath = action.path; actionsExecuted++; }
                    break;
                case 'delete_file':
                    if (!action.path) throw new Error('Missing path for delete operation');
                    result = await fileOps.deleteFile(action.path);
                    // Also try to delete folder marker if it exists
                    await fileOps.deleteFolder(action.path);
                    if (result.success) { actionsExecuted++; }
                    break;
                case 'rename_file':
                    if (!action.path || !action.new_path) throw new Error('Missing source or destination path for rename operation');
                    result = await fileOps.renameFile(action.path, action.new_path);
                    // Try folder marker rename if file rename fails
                    if (!result.success) {
                        result = await fileOps.renameFile(action.path + '.folder', action.new_path + '.folder');
                    }
                    if (result.success) { lastAffectedPath = action.new_path; actionsExecuted++; }
                    break;
                case 'move_file':
                    if (!action.path || !action.new_path) throw new Error('Missing source or destination path for move operation');
                    result = await fileOps.moveFile(action.path, action.new_path);
                    // Try folder marker move if file move fails
                    if (!result.success) {
                        result = await fileOps.moveFile(action.path + '.folder', action.new_path + '.folder');
                    }
                    if (result.success) { lastAffectedPath = action.new_path; actionsExecuted++; }
                    break;
                case 'copy_file':
                    if (!action.path || !action.new_path) throw new Error('Missing source or destination path for copy operation');
                    result = await fileOps.copyFile(action.path, action.new_path);
                    if (result.success) { lastAffectedPath = action.new_path; actionsExecuted++; }
                    break;
                default:
                    console.warn(`[handleAgenticActions] Unknown agentic action type: ${action.type}`);
                    // Optionally inform the user via addMessageToUI about the unknown action
                    addMessageToUI('assistant', `Info: Received an unknown action type "${action.type}".`);
            }
            if (!result.success && result.error) {
                addMessageToUI('assistant', `⚠️ Error processing action (${action.type} ${action.path || ''}): ${result.error}`);
            }
        } catch (error) {
            console.error(`[handleAgenticActions] Error executing action: ${JSON.stringify(action)}`, error);
            addMessageToUI('assistant', `⚠️ Error processing action (${action.type} ${action.path || ''}): ${error.message}`);
            // Decide whether to stop processing further actions or continue
            // For now, let's continue with the next action
        }
    }

    if (actionsExecuted > 0) {
        addMessageToUI('assistant', `✅ Executed ${actionsExecuted} file action(s).`);

        // Force UI refresh
        if (initializeUI) {
            initializeUI(); // Refresh file tree
        }

        // Additional UI refresh/selection after a short delay for stability
        setTimeout(() => {
            if (lastAffectedPath && selectFile) {
                selectFile(lastAffectedPath); // Attempt to select the last modified/created file
            }
             // Second refresh just in case
             if (initializeUI) {
                  initializeUI();
             }
        }, 300); // 300ms delay
    } else {
         console.log('[handleAgenticActions] No actions were successfully executed.');
         // Optionally inform the user if actions were provided but none executed due to errors/warnings
         if (Array.isArray(actions) && actions.length > 0) {
             addMessageToUI('assistant', 'Info: No file actions were executed.');
         }
    }
} 