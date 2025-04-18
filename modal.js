// modal.js

const modalBackdrop = document.querySelector('.modal-backdrop');
const modalDialog = document.querySelector('.modal-dialog');
const modalTitle = document.querySelector('.modal-title');
const modalMessage = document.querySelector('.modal-message');
const modalInput = document.querySelector('.modal-input');
const modalConfirmBtn = document.querySelector('.modal-confirm');
const modalCancelBtn = document.querySelector('.modal-cancel');
const modalCloseBtn = document.querySelector('.modal-close');

let currentModalResolver = null;

// Generic function to show the modal
function showModal(config) {
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
    // Remove class toggle
    modalBackdrop.style.display = 'none'; // Hide immediately
    if (currentModalResolver) {
        if (modalInput.style.display === 'block') {
            // Resolve with input value if it was a prompt
            currentModalResolver(value === false ? null : modalInput.value);
        } else {
            // Resolve with boolean for confirms/alerts
            currentModalResolver(value);
        }
        currentModalResolver = null;
    }
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


// Wrapper for prompt using custom modal
export async function showPrompt(title, message, defaultValue = '', placeholder = '') {
    return await showModal({
        title: title,
        message: message,
        showInput: true,
        defaultValue: defaultValue,
        placeholder: placeholder,
        confirmText: 'OK',        cancelText: 'Cancel'
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