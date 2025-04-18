/**
 * Notifications Module
 */

let notificationArea = null;

document.addEventListener('DOMContentLoaded', () => {
    notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("Notification area element not found!");
    }
});

/**
 * Displays a notification message to the user.
 *
 * @param {string} message - The message content.
 * @param {string} [type='info'] - The type of message ('info', 'success', 'error').
 * @param {number} [duration=3000] - Duration in ms before auto-hiding (0 for persistent).
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (!notificationArea) {
        console.warn("Cannot show notification, area not found. Message:", message);
        alert(`${type.toUpperCase()}: ${message}`); // Fallback to alert
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `notification-message ${type}`;
    messageDiv.textContent = message;

    notificationArea.appendChild(messageDiv);

    // Auto-hide after duration (if duration > 0)
    if (duration > 0) {
        setTimeout(() => {
            hideNotification(messageDiv);
        }, duration);
    }

    // Allow manual dismiss (optional)
    messageDiv.addEventListener('click', () => hideNotification(messageDiv));
}

/**
 * Hides a specific notification message element.
 * @param {HTMLElement} messageDiv - The notification div to hide.
 */
function hideNotification(messageDiv) {
    if (!messageDiv || !messageDiv.parentNode) return; // Already removed or invalid

    messageDiv.classList.add('hidden');

    // Remove from DOM after transition
    messageDiv.addEventListener('transitionend', () => {
        if (messageDiv.parentNode === notificationArea) { // Check parent still exists
             notificationArea.removeChild(messageDiv);
        }
    }, { once: true });

     // Fallback removal if transition doesn't fire (e.g., hidden element)
     setTimeout(() => {
         if (messageDiv.parentNode === notificationArea) {
             notificationArea.removeChild(messageDiv);
         }
     }, 600); // Slightly longer than transition
} 