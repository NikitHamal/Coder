class HistoryManager {
    constructor(canvasContainer, undoBtn, redoBtn, eventBus, maxHistory = 50) {
        this.canvasContainer = canvasContainer;
        this.undoBtn = undoBtn;
        this.redoBtn = redoBtn;
        this.eventBus = eventBus; // To potentially notify other components
        this.maxHistory = maxHistory;

        this.history = [];
        this.currentStateIndex = -1; // No states initially
        this.isRestoring = false; // Flag to prevent recording during undo/redo

        this.recordInitialState();
        this.updateButtonStates();
    }

    recordInitialState() {
        // Capture the initial empty or loaded state
        this.recordState();
    }

    // Records the current state of the canvas container's innerHTML
    // Improvement: Could serialize to a more robust format (JSON) later
    recordState() {
        if (this.isRestoring) return; // Don't record history states themselves

        const currentState = this.canvasContainer.innerHTML;

        // If we undo, then make a new change, discard the future history
        if (this.currentStateIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentStateIndex + 1);
        }

        // Add the new state
        this.history.push(currentState);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift(); // Remove the oldest state
        }

        this.currentStateIndex = this.history.length - 1;
        this.updateButtonStates();

        // console.log('State recorded. Index:', this.currentStateIndex, 'History size:', this.history.length);
    }

    undo() {
        if (this.canUndo()) {
            this.isRestoring = true;
            this.currentStateIndex--;
            this.restoreState(this.history[this.currentStateIndex]);
            this.updateButtonStates();
             this.eventBus.publish('history:restored'); // Notify others (e.g., selector, controls)
            this.isRestoring = false;
            // console.log('Undo. Index:', this.currentStateIndex);
        } else {
            // console.log('Cannot undo');
        }
    }

    redo() {
        if (this.canRedo()) {
            this.isRestoring = true;
            this.currentStateIndex++;
            this.restoreState(this.history[this.currentStateIndex]);
            this.updateButtonStates();
            this.eventBus.publish('history:restored'); // Notify others
            this.isRestoring = false;
            // console.log('Redo. Index:', this.currentStateIndex);
        } else {
             // console.log('Cannot redo');
        }
    }

    restoreState(stateHTML) {
        this.canvasContainer.innerHTML = stateHTML;
        // Important: After restoring HTML, need to re-attach event listeners
        // This is a major challenge with the innerHTML approach.
        // A better approach would re-create elements from serialized data.
        // For now, we'll rely on a global re-initialization or specific re-binding.
        console.warn('History restored state. Element listeners might need re-attaching!');
        // Example: If using a CanvasManager class, you might need:
        // canvasManager.rebindElementListeners();
    }

    canUndo() {
        return this.currentStateIndex > 0;
    }

    canRedo() {
        return this.currentStateIndex < this.history.length - 1;
    }

    updateButtonStates() {
        this.undoBtn.disabled = !this.canUndo();
        this.redoBtn.disabled = !this.canRedo();
    }

    clearHistory() {
        this.history = [];
        this.currentStateIndex = -1;
        this.recordInitialState(); // Start with the current state
    }
}

// Export or make available globally/through modules
// export default HistoryManager; // If using ES modules 