/**
 * Spinner Utility Functions
 * Helper functions, temporary spinners, and initialization
 */

/**
 * Create and show a temporary spinner overlay
 * @param {string} containerId - Container element ID
 * @param {string} text - Loading text
 */
function showTemporarySpinner(containerId, text = SPINNER_CONFIG.defaultText) {
    const container = $(`#${containerId}`);
    if (container.length === 0) {
        console.warn(`Container #${containerId} not found`);
        return;
    }
    
    // Create temporary spinner HTML
    const spinnerId = `temp-spinner-${Date.now()}`;
    const spinnerHtml = `
        <div id="${spinnerId}" class="temporary-spinner">
            <div class="spinner-content">
                <div class="spinner-ring-container">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="gown-figure">
                    <div class="gown-person">
                        <div class="gown-dress">
                            <div class="gown-details"></div>
                        </div>
                    </div>
                    <div class="gown-sparkle"></div>
                    <div class="gown-sparkle"></div>
                    <div class="gown-sparkle"></div>
                </div>
                <p class="spinner-text">${text}</p>
            </div>
        </div>
    `;
    
    // Add spinner to container
    container.append(spinnerHtml);
    
    return spinnerId;
}

/**
 * Hide and remove temporary spinner
 * @param {string} spinnerId - Temporary spinner ID
 */
function hideTemporarySpinner(spinnerId) {
    const spinner = $(`#${spinnerId}`);
    if (spinner.length > 0) {
        spinner.fadeOut(SPINNER_CONFIG.fadeSpeed, function() {
            $(this).remove();
        });
    }
}

/**
 * Initialize page spinner functionality
 * Automatically shows spinner on page load and hides when page is ready
 */
function initPageSpinner() {
    // Show spinner immediately if it exists
    const pageSpinner = $('.page-spinner').first();
    if (pageSpinner.length > 0) {
        showSpinner();
        
        // TEMPORARILY COMMENTED OUT
        // Hide spinner when page is fully loaded
        // $(window).on('load', function() {
        //     hideSpinner(null, 300); // Small delay for better UX
        // });
        
    }
    
    // Handle navigation loading
    $(document).on('click', 'a[href]:not([href^="#"]):not([href^="javascript:"]):not([target="_blank"])', function(e) {
        const href = $(this).attr('href');
        
        // Don't show spinner for certain links
        if (href && !href.includes('mailto:') && !href.includes('tel:')) {
            showNavigationSpinner('Loading page...');
        }
    });
}

/**
 * Utility function to wrap async operations with spinner
 * @param {Function} asyncFunction - Async function to wrap
 * @param {Object} options - Spinner options
 */
async function withSpinner(asyncFunction, options = {}) {
    const {
        text = SPINNER_CONFIG.defaultText,
        spinnerId = null,
        minTime = SPINNER_CONFIG.minDisplayTime
    } = options;
    
    return await showSpinnerWithMinTime(asyncFunction, text, spinnerId);
}

/**
 * Show spinner for form submissions
 * @param {string} formId - Form element ID
 * @param {string} text - Loading text
 */
function showFormSpinner(formId, text = 'Processing...') {
    const form = $(`#${formId}`);
    if (form.length === 0) {
        console.warn(`Form #${formId} not found`);
        return;
    }
    
    // Disable form elements
    form.find('input, button, select, textarea').prop('disabled', true);
    
    // Show temporary spinner in form
    return showTemporarySpinner(formId, text);
}

/**
 * Hide form spinner and re-enable form
 * @param {string} formId - Form element ID
 * @param {string} spinnerId - Temporary spinner ID
 */
function hideFormSpinner(formId, spinnerId) {
    const form = $(`#${formId}`);
    
    // Re-enable form elements
    if (form.length > 0) {
        form.find('input, button, select, textarea').prop('disabled', false);
    }
    
    // Hide temporary spinner
    if (spinnerId) {
        hideTemporarySpinner(spinnerId);
    }
}

// Export utility functions to global scope
window.showTemporarySpinner = showTemporarySpinner;
window.hideTemporarySpinner = hideTemporarySpinner;
window.initPageSpinner = initPageSpinner;
window.withSpinner = withSpinner;
window.showFormSpinner = showFormSpinner;
window.hideFormSpinner = hideFormSpinner;

// Auto-initialize when document is ready
$(document).ready(function() {
    initPageSpinner();
});
