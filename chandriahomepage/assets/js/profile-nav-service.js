/**
 * Profile Image Navigation Service
 * Handles displaying user profile images in the navigation bar across all pages
 * Integrates with Firebase authentication and Firestore user data
 */

import {
    auth,
    onAuthStateChanged,
    chandriaDB,
    getDoc,
    doc
} from "./sdk/chandrias-sdk.js";

class ProfileNavService {
    constructor() {
        this.currentUser = null;
        this.profileImageUrl = null;
        this.accountButtonSelector = '#account-btn, button.header-action-btn[onclick*="showAuthModal"]:not([href]), .header-action-btn[onclick*="showAuthModal"]:not([href]), button.header-action-btn[onclick*="handleAccountClick"]:not([href])';
        this.init();
    }

    /**
     * Initialize the profile navigation service
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAuthStateListener());
        } else {
            this.setupAuthStateListener();
        }
    }

    /**
     * Set up Firebase auth state listener
     */
    setupAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) {
                await this.loadUserProfileImage(user.uid);
            } else {
                this.resetToDefaultIcon();
            }
            this.updateNavigationDisplay();
        });
    }    /**
     * Load user profile image from Firestore
     * DISABLED: Profile pictures are no longer shown in navigation
     */
    async loadUserProfileImage(uid) {
        // Profile picture navigation functionality has been disabled
        // Always set profileImageUrl to null to ensure default icon is shown
        this.profileImageUrl = null;
    }/**
     * Update the navigation account button display
     */
    updateNavigationDisplay() {
        const accountButtons = document.querySelectorAll(this.accountButtonSelector);
        
        accountButtons.forEach(button => {
            // Always display default icon, regardless of profile image availability
            this.displayDefaultIcon(button);
        });
    }/**
     * Check if we're on the accounts page
     */
    isAccountsPage() {
        return window.location.pathname.includes('accounts.html') || 
               document.title.includes('My Account');
    }

    /**
     * Display user profile image in the account button
     */
    displayProfileImage(button) {
        // Only modify account buttons, not cart or other buttons
        if (!this.isAccountButton(button)) return;
        
        // Clear existing content
        button.innerHTML = '';
        
        // Check if we're on the accounts page for special handling
        const isAccountsPage = this.isAccountsPage();
        
        // Create profile image element
        const profileImg = document.createElement('img');
        profileImg.src = this.profileImageUrl;
        profileImg.alt = 'Profile Picture';
        profileImg.className = 'profile-nav-image';
        
        if (isAccountsPage) {
            // Larger profile image for accounts page - replace entire button
            profileImg.style.cssText = `
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid rgba(255, 133, 177, 0.4);
                transition: all 0.3s ease;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(255, 133, 177, 0.2);
            `;
            button.style.cssText = `
                background: none !important;
                border: none !important;
                padding: 0 !important;
                cursor: pointer;
                border-radius: 50%;
                transition: all 0.3s ease;
            `;
        } else {
            // Standard size for other pages
            profileImg.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255, 133, 177, 0.3);
                transition: all 0.3s ease;
            `;
        }

        // Add error handling for broken images
        profileImg.onerror = () => {
            this.displayDefaultIcon(button);
        };

        button.appendChild(profileImg);
        button.classList.add('has-profile-image');
        
        if (isAccountsPage) {
            button.classList.add('accounts-page-profile');
        }
    }    /**
     * Display default user icon
     */
    displayDefaultIcon(button) {
        // Only modify account buttons, not cart or other buttons
        if (!this.isAccountButton(button)) return;
        
        // Clear existing content
        button.innerHTML = '';

        // Check if we're on the accounts page for special handling
        const isAccountsPage = this.isAccountsPage();

        // Create default icon element
        const defaultIcon = document.createElement('img');
        defaultIcon.src = 'assets/img/icon-user.svg';
        defaultIcon.alt = 'Account';        // Use consistent sizing for all pages - same as other header action buttons (20px icon, 45px button)
        defaultIcon.style.cssText = `
            width: 20px;
            height: 20px;
            transition: filter 0.3s ease;
        `;
        
        // Apply consistent header-action-btn styling for all pages
        button.style.cssText = `
            background: rgba(255, 133, 177, 0.1) !important;
            border: 2px solid transparent !important;
            width: 45px !important;
            height: 45px !important;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
        `;        button.appendChild(defaultIcon);
        button.classList.remove('has-profile-image');
        button.classList.remove('accounts-page-profile');
        button.classList.remove('accounts-page-default');
    }

    /**
     * Check if a button is an account button (not cart or other buttons)
     */
    isAccountButton(button) {
        // Check if it's the account button by ID
        if (button.id === 'account-btn') return true;
        
        // Check if it has account-related onclick handlers
        const onclick = button.getAttribute('onclick') || '';
        if (onclick.includes('showAuthModal') || onclick.includes('handleAccountClick')) {
            // Make sure it's not a cart button
            const href = button.getAttribute('href') || '';
            if (href.includes('cart.html')) return false;
            
            // Check if it contains cart icon
            const img = button.querySelector('img');
            if (img && img.src.includes('icon-cart.svg')) return false;
            
            return true;
        }
        
        return false;
    }

    /**
     * Reset to default icon (called when user logs out)
     */
    resetToDefaultIcon() {
        this.profileImageUrl = null;
        const accountButtons = document.querySelectorAll(this.accountButtonSelector);
        accountButtons.forEach(button => {
            this.displayDefaultIcon(button);
        });
    }    /**
     * Refresh profile image (called after profile update)
     * DISABLED: Profile pictures are no longer shown in navigation
     */
    async refreshProfileImage() {
        // Profile picture navigation functionality has been disabled
        // Navigation will always show default user icon
        return;
    }

    /**
     * Handle auth modal display with proper context
     */
    handleAccountClick() {
        if (this.currentUser) {
            // User is logged in, redirect to account page
            window.location.href = window.location.pathname.includes('chandriahomepage') 
                ? 'accounts.html' 
                : 'chandriahomepage/accounts.html';
        } else {
            // User not logged in, show auth modal
            if (typeof showAuthModal === 'function') {
                showAuthModal();
            }
        }
    }
}

// CSS styles for profile image in navigation
const profileNavStyles = `
    /* Profile image navigation styles */
    .header-action-btn.has-profile-image {
        padding: 2px;
    }

    .header-action-btn.has-profile-image:hover .profile-nav-image {
        border-color: rgba(255, 133, 177, 0.6);
        transform: scale(1.1);
    }

    .header-action-btn.has-profile-image .profile-nav-image {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* Special styling for accounts page - larger profile image */
    .header-action-btn.accounts-page-profile {
        width: 48px !important;
        height: 48px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        background: none !important;
        border: none !important;
    }

    .header-action-btn.accounts-page-profile:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 6px 20px rgba(255, 133, 177, 0.3) !important;
    }

    .header-action-btn.accounts-page-profile .profile-nav-image {
        box-shadow: 0 4px 12px rgba(255, 133, 177, 0.2);
    }

    .header-action-btn.accounts-page-profile:hover .profile-nav-image {
        border-color: rgba(255, 133, 177, 0.7);
        box-shadow: 0 6px 20px rgba(255, 133, 177, 0.3);    }

    /* Ensure proper sizing on different screen sizes */
    @media screen and (max-width: 768px) {
        .header-action-btn .profile-nav-image {
            width: 20px;
            height: 20px;
        }
        
        .header-action-btn.accounts-page-profile {
            width: 40px !important;
            height: 40px !important;
        }
          .header-action-btn.accounts-page-profile .profile-nav-image {
            width: 40px !important;
            height: 40px !important;
        }
    }

    @media screen and (max-width: 480px) {
        .header-action-btn .profile-nav-image {
            width: 18px;
            height: 18px;
        }
        
        .header-action-btn.accounts-page-profile {
            width: 36px !important;
            height: 36px !important;
        }
        
        .header-action-btn.accounts-page-profile .profile-nav-image {
            width: 36px !important;
            height: 36px !important;
        }
    }

    /* Legacy support for body.page-accounts class */
    body.page-accounts .header-action-btn.has-profile-image {
        background: rgba(255, 133, 177, 0.1) !important;
        border: 2px solid rgba(255, 133, 177, 0.3) !important;
    }

    body.page-accounts .header-action-btn.has-profile-image:hover {
        background: rgba(255, 133, 177, 0.2) !important;
        border-color: rgba(255, 133, 177, 0.4) !important;
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(255, 133, 177, 0.15) !important;
    }
`;

// Inject CSS styles
const styleSheet = document.createElement('style');
styleSheet.textContent = profileNavStyles;
document.head.appendChild(styleSheet);

// Initialize the service
const profileNavService = new ProfileNavService();

// Export for global use (both camelCase and PascalCase for compatibility)
window.profileNavService = profileNavService;
window.ProfileNavService = profileNavService;

export default profileNavService;
