/**
 * Dedicated Mobile Hamburger Navigation
 * Clean, focused implementation for mobile navigation across all pages
 */

class MobileNavigation {
    constructor() {
        this.hamburgerMenu = null;
        this.mobileNavMenu = null;
        this.body = document.body;
        this.isInitialized = false;
        this.isMenuOpen = false;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.hamburgerMenu = document.querySelector('.hamburger-menu');
        this.mobileNavMenu = document.querySelector('.mobile-nav-menu');

        if (!this.hamburgerMenu || !this.mobileNavMenu) {
            console.warn('Mobile navigation elements not found');
            return;
        }        this.attachEventListeners();
        this.setupAccessibility();
        this.setActiveNavLink(); // Add active link detection
        this.setupHashChangeListener(); // Listen for hash changes
        this.isInitialized = true;
        
        // Set global flag to prevent other scripts from initializing mobile nav
        window.mobileNavInitialized = true;
        window.hamburgerMobileNavActive = true;
    }

    attachEventListeners() {
        // Hamburger menu click
        this.hamburgerMenu.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMenu();
        });

        // Mobile nav links click
        const mobileNavLinks = this.mobileNavMenu.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                !this.hamburgerMenu.contains(e.target) && 
                !this.mobileNavMenu.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });

        // Window resize - close menu on desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isMenuOpen) {
                this.closeMenu();
            }
        });
    }

    setupAccessibility() {
        // Make hamburger menu focusable
        this.hamburgerMenu.setAttribute('tabindex', '0');
        this.hamburgerMenu.setAttribute('role', 'button');
        this.hamburgerMenu.setAttribute('aria-label', 'Toggle mobile navigation');
        this.hamburgerMenu.setAttribute('aria-expanded', 'false');

        // Keyboard navigation for hamburger
        this.hamburgerMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMenu();
            }
        });        // Set up mobile menu accessibility
        this.mobileNavMenu.setAttribute('role', 'navigation');
        this.mobileNavMenu.setAttribute('aria-label', 'Mobile navigation');
    }

    setupHashChangeListener() {
        // Update active state on hash change (matches desktop navigation behavior)
        window.addEventListener('hashchange', () => {
            this.setActiveNavLink();
        });    }setActiveNavLink() {
        // Remove active class from all mobile nav links
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => link.classList.remove('active-link'));

        const currentPath = window.location.pathname;
        const currentHash = window.location.hash;
        
        console.log('Mobile Nav - Current path:', currentPath);
        console.log('Mobile Nav - Current hash:', currentHash);

        // Check if we're on index.html (main page)
        const isIndexPage = currentPath.endsWith('index.html') || 
                           currentPath === '/' || 
                           currentPath.endsWith('/ChandriasLaRobe-Web/');

        if (isIndexPage) {
            // ON INDEX.HTML: Active state based on current section (like desktop nav)
            let activeSection = 'home'; // default
            
            if (currentHash) {
                if (currentHash === '#categories') activeSection = 'categories';
                else if (currentHash === '#products') activeSection = 'products';
                else if (currentHash === '#contact') activeSection = 'contact';
                else if (currentHash === '#home' || currentHash === '#') activeSection = 'home';
            }
            
            // Find and activate the corresponding mobile nav link
            mobileNavLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (activeSection === 'home' && (href === '#home' || href === 'index.html' || href === '../index.html')) {
                    link.classList.add('active-link');
                    console.log('Mobile Nav - Activated Home section');
                } else if (activeSection === 'categories' && href.includes('#categories')) {
                    link.classList.add('active-link');
                    console.log('Mobile Nav - Activated Categories section');
                } else if (activeSection === 'products' && href.includes('#products')) {
                    link.classList.add('active-link');
                    console.log('Mobile Nav - Activated Products section');
                } else if (activeSection === 'contact' && href.includes('#contact')) {
                    link.classList.add('active-link');
                    console.log('Mobile Nav - Activated Contact section');
                }
            });
        } else if (currentPath.includes('shop.html')) {
            // ON SHOP.HTML: Only "Shop" should be active
            mobileNavLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href.includes('shop.html')) {
                    link.classList.add('active-link');
                    console.log('Mobile Nav - Activated Shop page');
                }
            });
        }
        // ON CART.HTML, CHECKOUT.HTML, DETAILS.HTML, WISHLIST.HTML, ACCOUNTS.HTML: 
        // NO active states in hamburger menu (do nothing)
        else {
            console.log('Mobile Nav - No active states for this page');
        }
    }

    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.hamburgerMenu.classList.add('active');
        this.mobileNavMenu.classList.add('show', 'active');
        this.body.classList.add('mobile-nav-open');
        this.isMenuOpen = true;

        // Update accessibility
        this.hamburgerMenu.setAttribute('aria-expanded', 'true');

        // Focus management
        const firstLink = this.mobileNavMenu.querySelector('.mobile-nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }

        // Trap focus in menu
        this.trapFocus();
    }

    closeMenu() {
        this.hamburgerMenu.classList.remove('active');
        this.mobileNavMenu.classList.remove('show', 'active');
        this.body.classList.remove('mobile-nav-open');
        this.isMenuOpen = false;

        // Update accessibility
        this.hamburgerMenu.setAttribute('aria-expanded', 'false');

        // Return focus to hamburger
        this.hamburgerMenu.focus();

        // Remove focus trap
        this.removeFocusTrap();
    }

    trapFocus() {
        const focusableElements = this.mobileNavMenu.querySelectorAll(
            'a, button, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        this.focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', this.focusTrapHandler);
    }

    removeFocusTrap() {
        if (this.focusTrapHandler) {
            document.removeEventListener('keydown', this.focusTrapHandler);
            this.focusTrapHandler = null;
        }
    }

    // Public API methods
    isOpen() {
        return this.isMenuOpen;
    }

    forceClose() {
        if (this.isMenuOpen) {
            this.closeMenu();
        }
    }
}

// Initialize mobile navigation
const mobileNav = new MobileNavigation();

// Export for external use
window.MobileNavigation = {
    instance: mobileNav,
    close: () => mobileNav.forceClose(),
    isOpen: () => mobileNav.isOpen()
};

// Ensure compatibility with existing code
window.closeMobileMenu = () => mobileNav.forceClose();
