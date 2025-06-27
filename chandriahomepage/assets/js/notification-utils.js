// Notification Z-Index Utility
// Ensures notifications always appear above modals and confirmation dialogs

// Function to force notification z-index to be above all modals
function forceNotificationZIndex() {
    setTimeout(() => {
        // Set Notyf container z-index
        const notyfContainer = document.querySelector('.notyf');
        if (notyfContainer) {
            notyfContainer.style.zIndex = '99999';
            notyfContainer.style.position = 'fixed';
        }
        
        // Set individual notification z-index
        const notyfToasts = document.querySelectorAll('.notyf__toast');
        notyfToasts.forEach(toast => {
            toast.style.zIndex = '99999';
            toast.style.position = 'relative';
        });
        
        // Force success notifications
        const successToasts = document.querySelectorAll('.notyf__toast--success');
        successToasts.forEach(toast => {
            toast.style.zIndex = '99999';
        });
        
        // Force error notifications
        const errorToasts = document.querySelectorAll('.notyf__toast--error');
        errorToasts.forEach(toast => {
            toast.style.zIndex = '99999';
        });
        
        // Force warning notifications
        const warningToasts = document.querySelectorAll('.notyf__toast--warning');
        warningToasts.forEach(toast => {
            toast.style.zIndex = '99999';
        });
        
        // Force info notifications
        const infoToasts = document.querySelectorAll('.notyf__toast--info');
        infoToasts.forEach(toast => {
            toast.style.zIndex = '99999';
        });
    }, 50);
}

// Enhanced Notyf wrapper that ensures proper z-index
function createHighZIndexNotyf(config = {}) {
    const defaultConfig = {
        position: {
            x: 'center',
            y: 'top'
        },
        duration: 4000,
        dismissible: true,
        ripple: true,
        types: [
            {
                type: 'warning',
                background: '#f39c12',
                icon: {
                    className: 'fi fi-rs-exclamation-triangle',
                    tagName: 'i',
                    text: ''
                }
            },
            {
                type: 'info',
                background: '#3498db',
                icon: {
                    className: 'fi fi-rs-info',
                    tagName: 'i',
                    text: ''
                }
            }
        ]
    };
    
    const notyf = new Notyf({...defaultConfig, ...config});
    
    // Override the show methods to ensure z-index
    const originalSuccess = notyf.success.bind(notyf);
    const originalError = notyf.error.bind(notyf);
    const originalOpen = notyf.open.bind(notyf);
    
    notyf.success = function(message) {
        const result = originalSuccess(message);
        forceNotificationZIndex();
        return result;
    };
    
    notyf.error = function(message) {
        const result = originalError(message);
        forceNotificationZIndex();
        return result;
    };
    
    notyf.open = function(config) {
        const result = originalOpen(config);
        forceNotificationZIndex();
        return result;
    };
    
    // Initial z-index setup
    forceNotificationZIndex();
    
    return notyf;
}

// Auto-setup on DOM load
document.addEventListener('DOMContentLoaded', function() {
    forceNotificationZIndex();
    
    // Set up a mutation observer to catch dynamically added notifications
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (
                            node.classList.contains('notyf__toast') ||
                            node.classList.contains('notyf') ||
                            node.querySelector && node.querySelector('.notyf__toast')
                        )) {
                            forceNotificationZIndex();
                        }
                    }
                });
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Make functions globally available
window.forceNotificationZIndex = forceNotificationZIndex;
window.createHighZIndexNotyf = createHighZIndexNotyf;
