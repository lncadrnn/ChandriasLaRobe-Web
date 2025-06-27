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

/**
 * Account Dropdown Functionality
 */
let accountDropdownOpen = false;

/**
 * Update account dropdown menu based on authentication state
 */
function updateAccountDropdown(user = null) {
    const accountName = document.getElementById('account-name');
    const accountEmail = document.getElementById('account-email');
    
    // Find sign-in and logout items
    const signInItem = document.getElementById('signin-item') || 
                       document.querySelector('.account-dropdown-link[onclick*="showAuthModal"]')?.closest('.account-dropdown-item');
    const logoutItem = document.getElementById('logout-item');
    
    if (user) {
        // User is signed in
        if (accountName) accountName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
        if (accountEmail) accountEmail.textContent = user.email || '';
        
        // Show logout, hide sign in
        if (logoutItem) logoutItem.style.display = 'block';
        if (signInItem) signInItem.style.display = 'none';
        
        // Show auth-required items
        document.querySelectorAll('.account-dropdown-link[data-auth-required="true"], .account-dropdown-link.auth-required').forEach(link => {
            const item = link.closest('.account-dropdown-item');
            if (item) item.style.display = 'block';
        });
    } else {
        // User is not signed in
        if (accountName) accountName.textContent = 'Guest User';
        if (accountEmail) accountEmail.textContent = 'Please sign in';
        
        // Hide logout, show sign in
        if (logoutItem) logoutItem.style.display = 'none';
        if (signInItem) signInItem.style.display = 'block';
        
        // Show auth-required items but they will trigger auth modal when clicked
        document.querySelectorAll('.account-dropdown-link[data-auth-required="true"], .account-dropdown-link.auth-required').forEach(link => {
            const item = link.closest('.account-dropdown-item');
            if (item) item.style.display = 'block';
        });
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        const btnText = document.getElementById('logout-btn-text');
        const btnSpinner = document.getElementById('logout-btn-spinner');
        const logoutBtn = document.getElementById('logout-confirm');
        
        if (btnText && btnSpinner && logoutBtn) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';
            logoutBtn.disabled = true;
        }

        closeAccountDropdown();
        
        // Import signOut function and auth from the SDK
        const { signOut, auth } = await import('./sdk/chandrias-sdk.js');
        
        // Sign out the user
        await signOut(auth);
        
        // Clear local storage
        localStorage.removeItem('userEmail');
        
        // Update the UI
        updateAccountDropdown(null);
        
        // Show success message
        showNotification('Successfully signed out', 'success');
        
        // Hide the modal
        const modal = document.getElementById('logout-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Reload page after a short delay to reset all UI states
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error signing out. Please try again.', 'error');
        
        // Reset button state
        const btnText = document.getElementById('logout-btn-text');
        const btnSpinner = document.getElementById('logout-btn-spinner');
        const logoutBtn = document.getElementById('logout-confirm');
        
        if (btnText && btnSpinner && logoutBtn) {
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            logoutBtn.disabled = false;
        }
    }
}

// Function to show logout confirmation
function confirmLogout() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function toggleAccountDropdown() {
    const dropdown = document.getElementById('account-dropdown');
    const overlay = document.getElementById('account-dropdown-overlay');
    const accountBtn = document.getElementById('account-btn');
    
    if (!dropdown) return;
    
    accountDropdownOpen = !accountDropdownOpen;
    
    if (accountDropdownOpen) {
        dropdown.classList.add('show');
        if (accountBtn) accountBtn.classList.add('active');
        
        // Create overlay if it doesn't exist
        if (!overlay) {
            createDropdownOverlay();
        } else {
            overlay.classList.add('show');
        }
        // Add event listener for clicking outside
        document.addEventListener('click', handleOutsideClick);
    } else {
        closeAccountDropdown();
    }
}

function closeAccountDropdown() {
    const dropdown = document.getElementById('account-dropdown');
    const overlay = document.getElementById('account-dropdown-overlay');
    const accountBtn = document.getElementById('account-btn');
    
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
    if (accountBtn) {
        accountBtn.classList.remove('active');
    }
    
    accountDropdownOpen = false;
    document.removeEventListener('click', handleOutsideClick);
}

function createDropdownOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'account-dropdown-overlay';
    overlay.className = 'account-dropdown-overlay show';
    overlay.addEventListener('click', closeAccountDropdown);
    document.body.appendChild(overlay);
}

function handleOutsideClick(event) {
    const dropdown = document.getElementById('account-dropdown');
    const accountBtn = document.getElementById('account-btn');
    
    if (dropdown && accountBtn) {
        if (!dropdown.contains(event.target) && !accountBtn.contains(event.target)) {
            closeAccountDropdown();
        }
    }
}

// Initialize account dropdown functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Make toggleAccountDropdown globally available
    window.toggleAccountDropdown = toggleAccountDropdown;
    window.closeAccountDropdown = closeAccountDropdown;
    window.updateAccountDropdown = updateAccountDropdown;
    window.confirmLogout = confirmLogout;
    
    // Initialize authentication state
    initializeAuthState();
    
    // Close dropdown when escape key is pressed
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && accountDropdownOpen) {
            closeAccountDropdown();
        }
    });

    // Add event listeners for the logout modal
    const modal = document.getElementById('logout-modal');
    const cancelBtn = document.getElementById('logout-cancel');
    const confirmBtn = document.getElementById('logout-confirm');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (modal) {
                modal.classList.remove('show');
            }
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleLogout);
    }

    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
});

/**
 * Authentication check for dropdown links
 */
let currentAuthUser = null;

/**
 * Initialize authentication state listener
 */
async function initializeAuthState() {
    try {
        // Import Firebase auth
        const { auth, onAuthStateChanged } = await import('./sdk/chandrias-sdk.js');
        
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            currentAuthUser = user;
            updateAccountDropdown(user);
            updateDropdownLinksVisibility(user);
        });
        
        // Set up click handlers for authentication-required links
        setupAuthRequiredLinkHandlers();
        
    } catch (error) {
        console.error('Error initializing auth state:', error);
    }
}

/**
 * Update dropdown links visibility based on authentication state
 */
function updateDropdownLinksVisibility(user) {
    const authRequiredLinks = document.querySelectorAll('.account-dropdown-link[data-auth-required="true"]');
    
    authRequiredLinks.forEach(link => {
        const listItem = link.closest('.account-dropdown-item');
        if (listItem) {
            if (user) {
                // User is authenticated - show the links
                listItem.style.display = 'block';
            } else {
                // User is not authenticated - hide the links or show them grayed out
                listItem.style.display = 'block'; // Keep visible but will show auth modal on click
            }
        }
    });
}

/**
 * Set up click handlers for links that require authentication
 */
function setupAuthRequiredLinkHandlers() {
    document.addEventListener('click', function(e) {
        // Handle auth-required links
        const authRequiredLink = e.target.closest('a[data-auth-required="true"], a.auth-required');
        if (authRequiredLink) {
            e.preventDefault();
            
            if (currentAuthUser) {
                // User is authenticated, allow navigation
                closeAccountDropdown();
                
                const href = authRequiredLink.getAttribute('href');
                if (href && href !== '#') {
                    // Check if we need to adjust path for root level pages
                    let targetUrl = href;
                    const isRootLevel = window.location.pathname === '/' || 
                                       window.location.pathname.endsWith('/index.html') ||
                                       !window.location.pathname.includes('/chandriahomepage/');
                    
                    // If we're on root level and the href doesn't include chandriahomepage/, add it
                    if (isRootLevel && !href.includes('chandriahomepage/') && href.includes('accounts.html')) {
                        targetUrl = 'chandriahomepage/' + href;
                    }
                    
                    window.location.href = targetUrl;
                } else {
                    // Handle notifications or other special cases
                    if (authRequiredLink.querySelector('i.fi-rs-comment')) {
                        showNotification('Notifications feature coming soon!', 'info');
                    }
                }
            } else {
                // User is not authenticated, show auth modal
                closeAccountDropdown();
                
                if (typeof showAuthModal === 'function') {
                    showAuthModal();
                } else {
                    console.error('Auth modal function not available');
                    // Fallback to redirect to accounts page
                    const isRootLevel = window.location.pathname === '/' || 
                                       window.location.pathname.endsWith('/index.html') ||
                                       !window.location.pathname.includes('/chandriahomepage/');
                    window.location.href = isRootLevel ? 'chandriahomepage/accounts.html' : 'accounts.html';
                }
            }
            return;
        }
        
        // Handle sign-in button specifically
        const signInLink = e.target.closest('a[onclick*="showAuthModal"]');
        if (signInLink) {
            e.preventDefault();
            closeAccountDropdown();
            
            if (typeof showAuthModal === 'function') {
                showAuthModal();
            } else {
                console.error('Auth modal function not available');
                const isRootLevel = window.location.pathname === '/' || 
                                   window.location.pathname.endsWith('/index.html') ||
                                   !window.location.pathname.includes('/chandriahomepage/');
                window.location.href = isRootLevel ? 'chandriahomepage/accounts.html' : 'accounts.html';
            }
        }
    });
}

/**
 * Simple notification function fallback
 */
function showNotification(message, type = 'info') {
    // Try to use Notyf if available
    if (typeof Notyf !== 'undefined') {
        const notyf = new Notyf({
            duration: 3000,
            position: { x: 'center', y: 'top' }
        });
        
        if (type === 'success') {
            notyf.success(message);
        } else if (type === 'error') {
            notyf.error(message);
        } else {
            notyf.open({ type: 'info', message: message });
        }
    } else {
        // Fallback to console and alert if no notification library
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') {
            alert(message);
        }
    }
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
