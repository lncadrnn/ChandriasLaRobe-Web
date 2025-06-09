/**
 * Core Spinner Functionality
 * Base spinner functions used across all pages
 */

// Global spinner configuration
const SPINNER_CONFIG = {
    defaultText: 'Loading, please wait...',
    fadeSpeed: 300,
    minDisplayTime: 500 // Minimum time to show spinner for better UX
};

/**
 * Show page loading spinner
 * @param {string} text - Loading text to display
 * @param {string} spinnerId - Optional specific spinner ID
 */
function showSpinner(text = SPINNER_CONFIG.defaultText, spinnerId = null) {
    const spinnerElement = spinnerId ? $(`#${spinnerId}`) : $('.page-spinner').first();
    
    if (spinnerElement.length === 0) {
        console.warn('Spinner element not found');
        return;
    }
    
    // Update loading text if provided
    const textElement = spinnerElement.find('.spinner-text');
    if (textElement.length > 0 && text) {
        textElement.text(text);
    }
    
    // Show spinner
    spinnerElement.removeClass('hidden').fadeIn(SPINNER_CONFIG.fadeSpeed);
    
    // Prevent body scroll when spinner is active
    document.body.style.overflow = 'hidden';
}

/**
 * Hide page loading spinner
 * @param {string} spinnerId - Optional specific spinner ID
 * @param {number} delay - Optional delay before hiding
 */
function hideSpinner(spinnerId = null, delay = 0) {
    const hideAction = () => {
        const spinnerElement = spinnerId ? $(`#${spinnerId}`) : $('.page-spinner').first();
        
        if (spinnerElement.length === 0) {
            return;
        }
        
        spinnerElement.fadeOut(SPINNER_CONFIG.fadeSpeed, function() {
            $(this).addClass('hidden');
        });
        
        // Restore body scroll
        document.body.style.overflow = '';
    };
    
    if (delay > 0) {
        setTimeout(hideAction, delay);
    } else {
        hideAction();
    }
}

/**
 * Show spinner with minimum display time
 * @param {Function} asyncFunction - Async function to execute
 * @param {string} text - Loading text
 * @param {string} spinnerId - Optional spinner ID
 */
async function showSpinnerWithMinTime(asyncFunction, text = SPINNER_CONFIG.defaultText, spinnerId = null) {
    const startTime = Date.now();
    
    // Show spinner
    showSpinner(text, spinnerId);
    
    try {
        // Execute the async function
        const result = await asyncFunction();
        
        // Calculate remaining time to meet minimum display time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, SPINNER_CONFIG.minDisplayTime - elapsedTime);
        
        // Hide spinner after minimum time
        hideSpinner(spinnerId, remainingTime);
        
        return result;
    } catch (error) {
        // Hide spinner on error
        hideSpinner(spinnerId);
        throw error;
    }
}

// Export core functions to global scope
window.SPINNER_CONFIG = SPINNER_CONFIG;
window.showSpinner = showSpinner;
window.hideSpinner = hideSpinner;
window.showSpinnerWithMinTime = showSpinnerWithMinTime;
