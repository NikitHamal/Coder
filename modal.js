// modal.js

// Wait for DOM to be ready before accessing elements
let modalBackdrop, modalDialog, modalTitle, modalMessage, modalInput, modalConfirmBtn, modalCancelBtn, modalCloseBtn;
let currentModalResolver = null;

// Initialize modal elements when DOM is ready
function initializeModalElements() {
    modalBackdrop = document.querySelector('.modal-backdrop');
    modalDialog = document.querySelector('.modal-dialog');
    modalTitle = document.querySelector('.modal-title');
    modalMessage = document.querySelector('.modal-message');
    modalInput = document.querySelector('.modal-input');
    modalConfirmBtn = document.querySelector('.modal-confirm');
    modalCancelBtn = document.querySelector('.modal-cancel');
    modalCloseBtn = document.querySelector('.modal-close');

    // Check if all elements exist
    if (!modalBackdrop || !modalDialog || !modalTitle || !modalMessage || 
        !modalInput || !modalConfirmBtn || !modalCancelBtn || !modalCloseBtn) {
        console.warn('Some modal elements not found. Modal functionality may not work properly.');
        return false;
    }

    // Add event listeners for modal buttons
    modalConfirmBtn.addEventListener('click', () => closeModal(true));
    modalCancelBtn.addEventListener('click', () => closeModal(false));
    modalCloseBtn.addEventListener('click', () => closeModal(false));

    // Allow Enter key to confirm prompts/alerts, Esc to cancel
    modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            closeModal(true);
        } else if (e.key === 'Escape') {
            closeModal(false);
        }
    });

    // Allow Enter on buttons, and Escape globally when modal is open
    modalDialog.addEventListener('keydown', (e) => {
         if (modalBackdrop.style.display === 'flex') {
             if (e.key === 'Escape') {
                 closeModal(false);
             } else if (e.key === 'Enter' && document.activeElement === modalConfirmBtn) {
                 closeModal(true);
             } else if (e.key === 'Enter' && document.activeElement === modalCancelBtn) {
                 closeModal(false);
             }
         }
    });

    return true;
}

// Generic function to show the modal
function showModal(config) {
    // Ensure elements are initialized
    if (!modalBackdrop || !modalTitle || !modalMessage || !modalInput || 
        !modalConfirmBtn || !modalCancelBtn) {
        console.error('Modal elements not initialized. Cannot show modal.');
        return Promise.reject(new Error('Modal elements not initialized'));
    }

    return new Promise((resolve) => {
        currentModalResolver = resolve; // Store the resolver function

        modalTitle.textContent = config.title || 'Confirm';
        modalMessage.textContent = config.message || '';

        // Configure input field
        if (config.showInput) {
            modalInput.style.display = 'block';
            modalInput.value = config.defaultValue || '';
            modalInput.placeholder = config.placeholder || '';
        } else {
            modalInput.style.display = 'none';
        }

        // Configure buttons
        modalConfirmBtn.textContent = config.confirmText || 'OK';
        modalCancelBtn.textContent = config.cancelText || 'Cancel';
        modalCancelBtn.style.display = config.hideCancel ? 'none' : 'inline-block';

        // Show modal & backdrop directly
        modalBackdrop.style.display = 'flex';

        // Focus input if shown
        if (config.showInput) {
            modalInput.focus();
            modalInput.select(); // Select existing text
        } else {
            // Focus the confirm button if no input
             modalConfirmBtn.focus();
        }
    });
}

// Close the modal and resolve the promise
function closeModal(value) {
    if (!modalBackdrop) {
        console.error('Modal backdrop not found. Cannot close modal.');
        return;
    }

    // Remove class toggle
    modalBackdrop.style.display = 'none'; // Hide immediately
    if (currentModalResolver) {
        if (modalInput && modalInput.style.display === 'block') {
            // Resolve with input value if it was a prompt
            currentModalResolver(value === false ? null : modalInput.value);
        } else {
            // Resolve with boolean for confirms/alerts
            currentModalResolver(value);
        }
        currentModalResolver = null;
    }
}

// Initialize modal when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModalElements);
} else {
    // DOM is already ready
    initializeModalElements();
}

// Wrapper for prompt using custom modal
export async function showPrompt(title, message, defaultValue = '', placeholder = '') {
    return await showModal({
        title: title,
        message: message,
        showInput: true,
        defaultValue: defaultValue,
        placeholder: placeholder,
        confirmText: 'OK',
        cancelText: 'Cancel'
    });
}

// Wrapper for confirm using custom modal
export async function showConfirm(title, message) {
    return await showModal({
        title: title,
        message: message,
        showInput: false,
        confirmText: 'Yes', // More explicit for confirm
        cancelText: 'No'
    });
}

// Wrapper for alert using custom modal
export async function showAlert(title, message) {
    // Don't return the promise for alert, just show it
    await showModal({
        title: title,
        message: message,
        showInput: false,
        confirmText: 'OK',
        hideCancel: true // Only show OK button
    });
} 