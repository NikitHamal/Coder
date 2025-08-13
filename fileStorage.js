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
        return Object.prototype.hasOwnProperty.call(files, filePath) ? files[filePath] : null;
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
        console.log("No files found in localStorage. Creating default files.");
        
        const defaultFiles = {
            'index.html': `<!DOCTYPE html>
<html>
<head>
    <title>Hello World</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Hello World!</h1>
    <p>Welcome to Coder AI</p>
    <script src="script.js"></script>
</body>
</html>`,
            'styles.css': `/* Welcome to Coder AI */
body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #0d1117;
    color: #c9d1d9;
}

h1 {
    color: #58a6ff;
    text-align: center;
}

p {
    text-align: center;
    font-size: 18px;
}`,
            'script.js': `// Welcome to Coder AI
console.log('Hello from Coder AI!');

// This is your JavaScript file
// You can start coding here

function greet() {
    alert('Welcome to Coder AI!');
}

// Uncomment the line below to see a greeting
// greet();`
        };
        
        // Save default files to storage
        Object.entries(defaultFiles).forEach(([path, content]) => {
            fileStorage.saveFile(path, content);
        });
        
        console.log("Default files created successfully");
        return defaultFiles;
    }

    return files;
} 