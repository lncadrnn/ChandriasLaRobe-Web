/**
 * Unified Navigation Bar Functionality
 * Consolidates desktop and mobile navigation behavior across all pages
 * Replaces mobile-nav.js and portions of main.js
 */

document.addEventListener('DOMContentLoaded', function() {
    // Set flag to prevent other scripts from initializing mobile nav
    window.navBarInitialized = true;
    window.mobileNavInitialized = true;
    
    initializeNavigation();
    initializeStickyHeader();
    initializeSmoothScrolling();
});

/**
 * Initialize all navigation functionality
 */
function initializeNavigation() {
    initializeMobileMenu();
    initializeActiveNavigation();
    initializeAccessibility();
}

/**
 * Mobile menu functionality is now handled by hamburger-mob.js
 * This function is kept for compatibility but does nothing
 */
function initializeMobileMenu() {
    // Mobile hamburger menu functionality is now handled by hamburger-mob.js
    // This ensures better separation of concerns and cleaner code
    console.log('Mobile menu initialization delegated to hamburger-mob.js');
}

/**
 * Initialize sticky header behavior
 */
function initializeStickyHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeaderOnScroll() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateHeaderOnScroll);
            ticking = true;
        }
    });
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScrolling() {
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"], .smooth-scroll');
    
    smoothScrollLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just a hash (#) or invalid
            if (!href || href === '#' || href.length <= 1) return;
            
            const target = document.querySelector(href);
            if (!target) return;
            
            e.preventDefault();
            
            const header = document.querySelector('.header');
            const headerHeight = header ? header.offsetHeight : 0;
            const targetPosition = target.offsetTop - headerHeight - 20;
            
            // Update active navigation state
            updateActiveNavigation(href);
            
            // Smooth scroll to target
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
              // Close mobile menu if open (delegate to hamburger-mob.js)
            if (window.MobileNavigation && window.MobileNavigation.isOpen()) {
                window.MobileNavigation.close();
            }
        });
    });
}

/**
 * Initialize active navigation state management
 */
function initializeActiveNavigation() {
    // Update active state based on current page and hash
    updateActiveNavigationOnLoad();
    
    // Update active state on hash change
    window.addEventListener('hashchange', () => {
        updateActiveNavigation(window.location.hash);
    });
}

/**
 * Update active navigation state for a given target hash
 */
function updateActiveNavigation(targetHash) {
    // Remove active-link class from all navigation links
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active-link');
    });
    
    // Add active-link class to matching links
    if (targetHash) {
        const matchingLinks = document.querySelectorAll(`a[href="${targetHash}"]`);
        matchingLinks.forEach(link => {
            if (link.classList.contains('nav-link') || link.classList.contains('mobile-nav-link')) {
                link.classList.add('active-link');
            }
        });
    }
}

/**
 * Update active navigation on page load
 */
function updateActiveNavigationOnLoad() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentHash = window.location.hash;
    
    // Handle different page types
    const pageMap = {
        'index.html': 'home',
        '': 'home', // Root path
        'shop.html': 'shop',
        'about-policy.html': 'about',
        'accounts.html': 'account',
        'cart.html': 'cart',
        'wishlist.html': 'wishlist',
        'checkout.html': 'checkout',
        'details.html': 'details'
    };
    
    // Set active state based on current page
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active-link');
        
        const linkHref = link.getAttribute('href');
        const linkPage = linkHref.split('/').pop().split('#')[0] || 'index.html';
        
        // Check if this link matches the current page
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active-link');
        }
        
        // Handle hash-based navigation for index page
        if (currentHash && linkHref.includes(currentHash)) {
            link.classList.add('active-link');
        }
    });
}

/**
 * Initialize accessibility features
 */
function initializeAccessibility() {
    // Keyboard navigation for hamburger menu
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                hamburgerMenu.click();
            }
        });
    }
    
    // Skip to content link functionality
    const skipLink = document.querySelector('.skip-to-content');
    if (skipLink) {
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const mainContent = document.querySelector('main, .main, #main');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView();
            }
        });
    }
    
    // Trap focus in mobile menu when open
    trapFocusInMobileMenu();
}

/**
 * Trap focus within mobile menu for accessibility
 */
function trapFocusInMobileMenu() {
    const mobileNavMenu = document.querySelector('.mobile-nav-menu');
    if (!mobileNavMenu) return;
    
    mobileNavMenu.addEventListener('keydown', (e) => {
        if (!mobileNavMenu.classList.contains('show')) return;
        
        if (e.key === 'Tab') {
            const focusableElements = mobileNavMenu.querySelectorAll(
                '.mobile-nav-link, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

/**
 * Utility function to update cart count across all pages
 */
function updateCartCountDisplay(count = 0) {
    const cartCountElements = document.querySelectorAll('#cart-count, .cart-count');
    cartCountElements.forEach(element => {
        element.textContent = count;
        
        // Add visual feedback for non-zero counts
        if (count > 0) {
            element.classList.add('has-items');
        } else {
            element.classList.remove('has-items');
        }
    });
}

/**
 * Utility function to update wishlist count across all pages
 */
function updateWishlistCountDisplay(count = 0) {
    const wishlistCountElements = document.querySelectorAll('#wishlist-count, .wishlist-count');
    wishlistCountElements.forEach(element => {
        element.textContent = count;
        
        // Add visual feedback for non-zero counts
        if (count > 0) {
            element.classList.add('has-items');
        } else {
            element.classList.remove('has-items');
        }
    });
}

// Export utility functions for other scripts to use
window.NavBar = {
    updateCartCount: updateCartCountDisplay,
    updateWishlistCount: updateWishlistCountDisplay,
    updateActiveNavigation,
    closeMobileMenu: () => {
        // Delegate to hamburger-mob.js
        if (window.MobileNavigation) {
            window.MobileNavigation.close();
        }
    }
};
