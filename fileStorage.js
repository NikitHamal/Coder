// fileStorage.js

const CODER_FILES_KEY = 'coder_files';

export const fileStorage = {
    // Get all files from storage
    getFiles: function() {
        const files = localStorage.getItem(CODER_FILES_KEY);
        return files ? JSON.parse(files) : {};
    },

    // Save all files to storage
    saveFiles: function(files) {
        localStorage.setItem(CODER_FILES_KEY, JSON.stringify(files));
    },

    // Get a specific file content
    getFile: function(filePath) {
        const files = this.getFiles();
        return files[filePath] || null;
    },

    // Save a specific file content
    saveFile: function(filePath, content) {
        const files = this.getFiles();
        files[filePath] = content;
        this.saveFiles(files);
    },

    // Delete a file
    deleteFile: function(filePath) {
        const files = this.getFiles();
        if (files[filePath] !== undefined) { // Check existence more reliably
            delete files[filePath];
            this.saveFiles(files);
            return true;
        }
        return false;
    },

    // Rename a file
    renameFile: function(oldPath, newPath) {
        const files = this.getFiles();
        if (files[oldPath] !== undefined && files[newPath] === undefined) { // Ensure old exists and new doesn't
            files[newPath] = files[oldPath];
            delete files[oldPath];
            this.saveFiles(files);
            return true;
        }
        return false;
    }
};

// Load files from storage or create default files if none exist
export function initializeFiles() {
    const files = fileStorage.getFiles();

    // If no files in storage, create default ones
    if (Object.keys(files).length === 0) {
        console.log("No files found in localStorage. Starting with an empty workspace.");
        return {};
    }

    return files;
} 