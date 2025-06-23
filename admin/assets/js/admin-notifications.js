/**
 * Admin Notifications JS
 * Provides consistent notification handling for the admin panel
 */

// Define positions and enforce top-center regardless of configuration
const POSITION = {
    x: 'center',
    y: 'top'
};

// Create a single notyf instance with consistent configuration
const notyf = new Notyf({
    duration: 3000,
    position: POSITION,
    dismissible: true,
    ripple: true,
    types: [
        {
            type: 'success',
            background: '#28a745',
            position: POSITION,
            icon: {
                className: 'fas fa-check-circle',
                tagName: 'i'
            }
        },
        {
            type: 'error',
            background: '#dc3545',
            position: POSITION,
            icon: {
                className: 'fas fa-times-circle',
                tagName: 'i'
            }
        },
        {
            type: 'warning',
            background: '#ffc107',
            className: 'notyf__toast--warning',
            position: POSITION,
            icon: {
                className: 'fas fa-exclamation-circle',
                tagName: 'i'
            }
        },
        {
            type: 'info',
            background: '#17a2b8',
            className: 'notyf__toast--info',
            position: POSITION,
            icon: {
                className: 'fas fa-info-circle',
                tagName: 'i'
            }
        }
    ]
});

// Override any existing notyf instance to ensure our configuration is used
window.notyf = notyf;

/**
 * Show a success notification
 * @param {string} message - The message to display
 */
function showSuccessNotification(message) {
    notyf.success(message);
}

/**
 * Show an error notification
 * @param {string} message - The message to display
 */
function showErrorNotification(message) {
    notyf.error(message);
}

/**
 * Show a warning notification
 * @param {string} message - The message to display
 */
function showWarningNotification(message) {
    notyf.open({
        type: 'warning',
        message: message,
        position: POSITION
    });
}

/**
 * Show an info notification
 * @param {string} message - The message to display
 */
function showInfoNotification(message) {
    notyf.open({
        type: 'info',
        message: message,
        position: POSITION
    });
}

// Make helper functions globally available
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;
window.showWarningNotification = showWarningNotification;
window.showInfoNotification = showInfoNotification;

/**
 * Show a success notification
 * @param {string} message - The message to display
 */
function showSuccessNotification(message) {
    notyf.success(message);
}

/**
 * Show an error notification
 * @param {string} message - The message to display
 */
function showErrorNotification(message) {
    notyf.error(message);
}

/**
 * Show a warning notification
 * @param {string} message - The message to display
 */
function showWarningNotification(message) {
    notyf.open({
        type: 'warning',
        message: message
    });
}

/**
 * Show an info notification
 * @param {string} message - The message to display
 */
function showInfoNotification(message) {
    notyf.open({
        type: 'info',
        message: message
    });
}
