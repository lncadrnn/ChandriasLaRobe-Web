/**
 * Page-Specific Spinner Functions
 * Specialized spinner functions for different pages/sections
 */

/**
 * Show navigation loading spinner
 * @param {string} text - Loading text
 */
function showNavigationSpinner(text = 'Loading page...') {
    showSpinner(text, 'navigation-spinner');
}

/**
 * Hide navigation loading spinner
 */
function hideNavigationSpinner() {
    hideSpinner('navigation-spinner');
}

/**
 * Show shop loading spinner
 * @param {string} text - Loading text
 */
function showShopSpinner(text = 'Loading products...') {
    showSpinner(text, 'shop-spinner');
}

/**
 * Hide shop loading spinner
 */
function hideShopSpinner() {
    hideSpinner('shop-spinner');
}

/**
 * Show checkout loading spinner
 * @param {string} text - Loading text
 */
function showCheckoutSpinner(text = 'Processing...') {
    showSpinner(text, 'checkout-spinner');
}

/**
 * Hide checkout loading spinner
 */
function hideCheckoutSpinner() {
    hideSpinner('checkout-spinner');
}

/**
 * Show wishlist loading spinner
 * @param {string} text - Loading text
 */
function showWishlistSpinner(text = 'Loading wishlist...') {
    showSpinner(text, 'wishlist-spinner');
}

/**
 * Hide wishlist loading spinner
 */
function hideWishlistSpinner() {
    hideSpinner('wishlist-spinner');
}

/**
 * Show details page loading spinner
 * @param {string} text - Loading text
 */
function showDetailsSpinner(text = 'Loading product details...') {
    showSpinner(text, 'details-spinner');
}

/**
 * Hide details page loading spinner
 */
function hideDetailsSpinner() {
    hideSpinner('details-spinner');
}

// Export page-specific functions to global scope
window.showNavigationSpinner = showNavigationSpinner;
window.hideNavigationSpinner = hideNavigationSpinner;
window.showShopSpinner = showShopSpinner;
window.hideShopSpinner = hideShopSpinner;
window.showCheckoutSpinner = showCheckoutSpinner;
window.hideCheckoutSpinner = hideCheckoutSpinner;
window.showWishlistSpinner = showWishlistSpinner;
window.hideWishlistSpinner = hideWishlistSpinner;
window.showDetailsSpinner = showDetailsSpinner;
window.hideDetailsSpinner = hideDetailsSpinner;
