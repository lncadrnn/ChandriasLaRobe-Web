/**
 * Page Focus State Manager
 * Adds page-specific body classes to enable navigation focus states
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get current page URL
    const currentPath = window.location.pathname.toLowerCase();
    const currentFile = currentPath.split('/').pop() || '';
    
    // Add page-specific body class based on current page
    if (currentFile.includes('wishlist')) {
        document.body.classList.add('page-wishlist');
        console.log('Added page-wishlist class');
    } else if (currentFile.includes('cart')) {
        document.body.classList.add('page-cart');
        console.log('Added page-cart class');
    } else if (currentFile.includes('accounts')) {
        document.body.classList.add('page-accounts');
        console.log('Added page-accounts class');
    } else if (currentFile.includes('shop')) {
        document.body.classList.add('page-shop');
    } else if (currentFile.includes('checkout')) {
        document.body.classList.add('page-checkout');
    } else if (currentFile.includes('details')) {
        document.body.classList.add('page-details');
    }
    
    // Alternative method: Check for page-specific elements if URL method fails
    if (!document.body.classList.contains('page-wishlist') && 
        !document.body.classList.contains('page-cart') && 
        !document.body.classList.contains('page-accounts')) {
        
        // Check for wishlist page
        if (document.querySelector('section.wishlist')) {
            document.body.classList.add('page-wishlist');
            console.log('Added page-wishlist class via element detection');
        }
        // Check for cart page
        else if (document.querySelector('section.cart')) {
            document.body.classList.add('page-cart');
            console.log('Added page-cart class via element detection');
        }
        // Check for accounts page
        else if (document.querySelector('.account-settings') || 
                 document.querySelector('#loader .spinner-loader-text')?.textContent?.includes('Account')) {
            document.body.classList.add('page-accounts');
            console.log('Added page-accounts class via element detection');
        }
    }
});
