/**
 * MOBILE ADMIN LAYOUT JAVASCRIPT
 * This file contains mobile-specific functionality for admin pages
 */

/**
 * Initialize mobile-specific functionality when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initMobileNavigation();
    initMobileScrollBehavior();
    initMobileViewportFixes();
});

/**
 * Initialize mobile navigation highlighting and behavior
 */
function initMobileNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    
    // Remove all active classes first
    mobileNavItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current page
    mobileNavItems.forEach(item => {
        const href = item.getAttribute('href');
        
        if (href === `./${currentPage}` || 
            (currentPage === 'dashboard.html' && href === './dashboard.html') ||
            (currentPage === 'inventory.html' && href === './inventory.html') ||
            (currentPage === 'calendar.html' && href === './calendar.html') ||
            (currentPage === 'rental.html' && href === './rental.html') ||
            (currentPage === 'customer-logs.html' && href === './customer-logs.html') ||
            (currentPage === 'settings.html' && href === './settings.html')) {
            item.classList.add('active');
        }
    });
    
    console.log('Mobile navigation initialized for:', currentPage);
}

/**
 * Handle mobile scroll behavior to ensure navigation stays fixed
 */
function initMobileScrollBehavior() {
    if (window.innerWidth <= 768) {
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        
        if (mobileNav) {
            // Force the navigation to stay at the bottom
            let scrollTimeout;
            
            window.addEventListener('scroll', function() {
                // Clear any existing timeout
                clearTimeout(scrollTimeout);
                
                // Ensure navigation stays fixed after scroll ends
                scrollTimeout = setTimeout(function() {
                    if (mobileNav) {
                        mobileNav.style.position = 'fixed';
                        mobileNav.style.bottom = '0';
                        mobileNav.style.zIndex = '9999';
                    }
                }, 50);
            }, { passive: true });
            
            // Initial positioning
            mobileNav.style.position = 'fixed';
            mobileNav.style.bottom = '0';
            mobileNav.style.zIndex = '9999';
        }
    }
}

/**
 * Initialize mobile viewport fixes
 */
function initMobileViewportFixes() {
    if (window.innerWidth <= 768) {
        // Handle viewport height changes (keyboard opening/closing)
        function handleViewportChange() {
            const mobileNav = document.querySelector('.mobile-bottom-nav');
            if (mobileNav) {
                // Force recalculation of position
                mobileNav.style.bottom = '0px';
            }
        }
        
        // Listen for viewport changes
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);
        
        // Handle touch events to ensure navigation doesn't interfere
        document.addEventListener('touchstart', function(e) {
            const mobileNav = document.querySelector('.mobile-bottom-nav');
            if (mobileNav && mobileNav.contains(e.target)) {
                e.stopPropagation();
            }
        }, { passive: true });
    }
}

/**
 * Force mobile navigation to be visible and fixed (fallback function)
 */
function forceMobileNavigationFix() {
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (mobileNav && window.innerWidth <= 768) {
        mobileNav.style.cssText = `
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 9999 !important;
            display: flex !important;
        `;
        console.log('Mobile navigation positioning forced');
    }
}

/**
 * Handle page navigation for mobile
 */
function handleMobileNavigation(href) {
    if (href && window.innerWidth <= 768) {
        // Add a small delay to show navigation feedback
        const clickedItem = event.currentTarget;
        clickedItem.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            window.location.href = href;
        }, 100);
    }
}

// Add click handlers to mobile navigation items
document.addEventListener('DOMContentLoaded', function() {
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && window.innerWidth <= 768) {
                e.preventDefault();
                handleMobileNavigation(href);
            }
        });
    });
});

// Export functions for use in other scripts
window.MobileAdminLayout = {
    initMobileNavigation,
    initMobileScrollBehavior,
    initMobileViewportFixes,
    forceMobileNavigationFix,
    handleMobileNavigation
};
