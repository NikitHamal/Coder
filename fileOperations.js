// File Operations Module
// Handles actual file system operations for the agentic AI

export class FileOperations {
  constructor() {
    this.workspacePath = '/workspace';
    this.currentFile = null;
    this.fileHistory = [];
    this.maxFileHistory = 10;
  }

  /**
   * Get list of files in workspace
   * @returns {Promise<Array>} - Array of file objects
   */
  async getFileList() {
    try {
      const response = await fetch('/api/files');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const files = await response.json();
      return files;
    } catch (error) {
      console.error('Error getting file list:', error);
      // Fallback to basic file structure
      return this.getBasicFileStructure();
    }
  }

  /**
   * Get basic file structure as fallback
   * @returns {Array} - Basic file structure
   */
  getBasicFileStructure() {
    return [
      { name: 'index.html', type: 'file', path: '/index.html', size: 0 },
      { name: 'main.js', type: 'file', path: '/main.js', size: 0 },
      { name: 'server.js', type: 'file', path: '/server.js', size: 0 },
      { name: 'package.json', type: 'file', path: '/package.json', size: 0 },
      { name: 'public', type: 'directory', path: '/public', size: 0 }
    ];
  }

  /**
   * Get current file path
   * @returns {string|null} - Current file path or null
   */
  getCurrentFilePath() {
    return this.currentFile;
  }

  /**
   * Set current file
   * @param {string} filePath - File path to set as current
   */
  setCurrentFile(filePath) {
    this.currentFile = filePath;
    this.addToFileHistory(filePath);
  }

  /**
   * Add file to history
   * @param {string} filePath - File path to add
   */
  addToFileHistory(filePath) {
    if (filePath && !this.fileHistory.includes(filePath)) {
      this.fileHistory.unshift(filePath);
      if (this.fileHistory.length > this.maxFileHistory) {
        this.fileHistory.pop();
      }
    }
  }

  /**
   * Get file history
   * @returns {Array} - File history array
   */
  getFileHistory() {
    return [...this.fileHistory];
  }

  /**
   * Read file content
   * @param {string} filePath - Path to file to read
   * @returns {Promise<string>} - File content
   */
  async readFile(filePath) {
    try {
      const response = await fetch(`/api/files/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file content
   * @param {string} filePath - Path to file to write
   * @param {string} content - Content to write
   * @returns {Promise<boolean>} - Success status
   */
  async writeFile(filePath, content) {
    try {
      const response = await fetch(`/api/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          path: filePath, 
          content: content 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Create new file
   * @param {string} filePath - Path for new file
   * @param {string} content - Initial content
   * @returns {Promise<boolean>} - Success status
   */
  async createFile(filePath, content = '') {
    try {
      const response = await fetch(`/api/files/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          path: filePath, 
          content: content 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        this.addToFileHistory(filePath);
      }
      return result.success;
    } catch (error) {
      console.error('Error creating file:', error);
      throw new Error(`Failed to create file: ${error.message}`);
    }
  }

  /**
   * Delete file
   * @param {string} filePath - Path to file to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(filePath) {
    try {
      const response = await fetch(`/api/files/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Remove from history if it was the current file
        this.fileHistory = this.fileHistory.filter(f => f !== filePath);
        if (this.currentFile === filePath) {
          this.currentFile = null;
        }
      }
      return result.success;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Rename file
   * @param {string} oldPath - Old file path
   * @param {string} newPath - New file path
   * @returns {Promise<boolean>} - Success status
   */
  async renameFile(oldPath, newPath) {
    try {
      const response = await fetch(`/api/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          oldPath: oldPath, 
          newPath: newPath 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update history and current file
        this.fileHistory = this.fileHistory.map(f => f === oldPath ? newPath : f);
        if (this.currentFile === oldPath) {
          this.currentFile = newPath;
        }
      }
      return result.success;
    } catch (error) {
      console.error('Error renaming file:', error);
      throw new Error(`Failed to rename file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - Whether file exists
   */
  async fileExists(filePath) {
    try {
      const response = await fetch(`/api/files/exists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get file info
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(filePath) {
    try {
      const response = await fetch(`/api/files/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.info;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Get workspace context for AI
   * @returns {Promise<Object>} - Workspace context
   */
  async getWorkspaceContext() {
    try {
      const files = await this.getFileList();
      const currentFileContent = this.currentFile ? await this.readFile(this.currentFile) : null;
      
      return {
        workspace: this.workspacePath,
        files: files.map(f => ({
          name: f.name,
          path: f.path,
          type: f.type,
          size: f.size
        })),
        currentFile: this.currentFile,
        currentFileContent: currentFileContent,
        fileHistory: this.getFileHistory(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting workspace context:', error);
      return {
        workspace: this.workspacePath,
        files: [],
        currentFile: null,
        currentFileContent: null,
        fileHistory: [],
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Execute write actions from AI
   * @param {Array} actions - Array of actions to execute
   * @returns {Promise<Array>} - Results of actions
   */
  async executeWriteActions(actions) {
    const results = [];
    
    for (const action of actions) {
      try {
        let result;
        
        switch (action.type) {
          case 'create':
            result = await this.createFile(action.path, action.content);
            results.push({ action, success: result, message: 'File created successfully' });
            break;
            
          case 'update':
            result = await this.writeFile(action.path, action.content);
            results.push({ action, success: result, message: 'File updated successfully' });
            break;
            
          case 'delete':
            result = await this.deleteFile(action.path);
            results.push({ action, success: result, message: 'File deleted successfully' });
            break;
            
          case 'rename':
            result = await this.renameFile(action.oldPath, action.newPath);
            results.push({ action, success: result, message: 'File renamed successfully' });
            break;
            
          default:
            results.push({ action, success: false, message: `Unknown action type: ${action.type}` });
        }
      } catch (error) {
        results.push({ action, success: false, message: error.message });
      }
    }
    
    return results;
  }

  /**
   * Get file extension
   * @param {string} filePath - File path
   * @returns {string} - File extension
   */
  getFileExtension(filePath) {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Get file name without extension
   * @param {string} filePath - File path
   * @returns {string} - File name without extension
   */
  getFileNameWithoutExtension(filePath) {
    const fileName = filePath.split('/').pop();
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.slice(0, -1).join('.') : fileName;
  }

  /**
   * Get directory path
   * @param {string} filePath - File path
   * @returns {string} - Directory path
   */
  getDirectoryPath(filePath) {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  /**
   * Check if path is a directory
   * @param {string} path - Path to check
   * @returns {boolean} - Whether path is a directory
   */
  isDirectory(path) {
    return path.endsWith('/') || !path.includes('.');
  }

  /**
   * Get relative path from workspace
   * @param {string} absolutePath - Absolute path
   * @returns {string} - Relative path
   */
  getRelativePath(absolutePath) {
    if (absolutePath.startsWith(this.workspacePath)) {
      return absolutePath.substring(this.workspacePath.length) || '/';
    }
    return absolutePath;
  }

  /**
   * Get absolute path from relative path
   * @param {string} relativePath - Relative path
   * @returns {string} - Absolute path
   */
  getAbsolutePath(relativePath) {
    if (relativePath.startsWith('/')) {
      return this.workspacePath + relativePath;
    }
    return this.workspacePath + '/' + relativePath;
  }
}