/**
 * Mobile Navigation Functionality
 * Shared across all pages for consistent mobile menu behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    // Set flag to prevent main.js from initializing mobile nav
    window.mobileNavInitialized = true;
    
    // Mobile hamburger menu functionality
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNavMenu = document.querySelector('.mobile-nav-menu');
    const body = document.body;    if (hamburgerMenu && mobileNavMenu) {
        // Toggle mobile menu when hamburger is clicked
        hamburgerMenu.addEventListener('click', () => {
            console.log('Hamburger clicked - before toggle');
            console.log('hamburgerMenu classes:', hamburgerMenu.className);
            console.log('mobileNavMenu classes:', mobileNavMenu.className);
            
            hamburgerMenu.classList.toggle('active');
            mobileNavMenu.classList.toggle('show');
            mobileNavMenu.classList.toggle('active'); // Support both classes for compatibility
            body.classList.toggle('nav-open');
            
            console.log('After toggle:');
            console.log('hamburgerMenu classes:', hamburgerMenu.className);
            console.log('mobileNavMenu classes:', mobileNavMenu.className);
            console.log('body classes:', body.className);
        });

        // Close menu when clicking mobile nav links
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerMenu.classList.remove('active');
                mobileNavMenu.classList.remove('show');
                mobileNavMenu.classList.remove('active');
                body.classList.remove('nav-open');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburgerMenu.contains(e.target) && !mobileNavMenu.contains(e.target)) {
                hamburgerMenu.classList.remove('active');
                mobileNavMenu.classList.remove('show');
                mobileNavMenu.classList.remove('active');
                body.classList.remove('nav-open');
            }
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hamburgerMenu.classList.remove('active');
                mobileNavMenu.classList.remove('show');
                mobileNavMenu.classList.remove('active');
                body.classList.remove('nav-open');
            }
        });
    }
});
