/*
 * Chandria's La Robe - Simple Notification System
 * Reusable JavaScript for "old style" toast notifications
 * Compatible with Notyf API for easy replacement
 */

/**
 * Simple notification system that mimics Notyf API
 * Shows toast notifications at the top center of the screen
 */
class SimpleNotification {
    constructor() {
        this.notifications = [];
        this.defaultDuration = 3000; // 3 seconds
    }

    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type ('success', 'error', 'info', 'warning')
     * @param {number} duration - Duration in milliseconds (optional)
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        // Remove any existing notifications first to prevent stacking
        this.clearAll();

        const notification = document.createElement('div');
        notification.className = `simple-notification simple-notification-${type}`;
        notification.textContent = message;
        
        // Add unique ID for tracking
        const id = Date.now() + Math.random();
        notification.dataset.notificationId = id;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Track the notification
        this.notifications.push({
            id: id,
            element: notification,
            timeout: null
        });

        // Animate in
        setTimeout(() => {
            notification.classList.add('show', 'animate-in');
        }, 10);

        // Set up auto-removal
        const timeoutId = setTimeout(() => {
            this.dismiss(id);
        }, duration);

        // Update the notification object with timeout
        const notificationObj = this.notifications.find(n => n.id === id);
        if (notificationObj) {
            notificationObj.timeout = timeoutId;
        }

        return {
            id: id,
            element: notification,
            dismiss: () => this.dismiss(id)
        };
    }

    /**
     * Show success notification
     * @param {string} message - The message to display
     */
    success(message) {
        return this.show(message, 'success');
    }

    /**
     * Show error notification
     * @param {string} message - The message to display
     */
    error(message) {
        return this.show(message, 'error');
    }

    /**
     * Show info notification
     * @param {string} message - The message to display
     */
    info(message) {
        return this.show(message, 'info');
    }

    /**
     * Show warning notification
     * @param {string} message - The message to display
     */
    warning(message) {
        return this.show(message, 'warning');
    }

    /**
     * Open notification with options (for Notyf compatibility)
     * @param {Object} options - Notification options
     */
    open(options) {
        const type = options.type || 'info';
        const message = options.message || '';
        const duration = options.duration || this.defaultDuration;
        return this.show(message, type, duration);
    }

    /**
     * Dismiss a specific notification
     * @param {string|number} id - The notification ID
     */
    dismiss(id) {
        const notificationIndex = this.notifications.findIndex(n => n.id === id);
        if (notificationIndex === -1) return;

        const notification = this.notifications[notificationIndex];
        
        // Clear timeout if exists
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        // Animate out
        notification.element.classList.remove('show', 'animate-in');
        notification.element.classList.add('hide', 'animate-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        }, 300);

        // Remove from tracking array
        this.notifications.splice(notificationIndex, 1);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            this.dismiss(notification.id);
        });
    }

    /**
     * Dismiss all notifications (alias for clearAll)
     */
    dismissAll() {
        this.clearAll();
    }
}

// Initialize the notification system
const simpleNotify = new SimpleNotification();

// Create global notyf object for compatibility with existing code
if (typeof window !== 'undefined') {
    window.notyf = {
        success: (message) => simpleNotify.success(message),
        error: (message) => simpleNotify.error(message),
        info: (message) => simpleNotify.info(message),
        warning: (message) => simpleNotify.warning(message),
        open: (options) => simpleNotify.open(options),
        dismiss: (notification) => {
            if (notification && notification.id) {
                simpleNotify.dismiss(notification.id);
            }
        },
        dismissAll: () => simpleNotify.dismissAll()
    };

    // Also expose the class for advanced usage
    window.SimpleNotification = SimpleNotification;
    window.simpleNotify = simpleNotify;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleNotification;
}
