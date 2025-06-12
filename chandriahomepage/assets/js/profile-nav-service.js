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
        try {
            const userRef = doc(chandriaDB, "userAccounts", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                this.profileImageUrl = userData.profileImageUrl || null;
            }
        } catch (error) {
            console.error("Error loading profile image:", error);
            this.profileImageUrl = null;
        }
    }/**
     * Update the navigation account button display
     */
    updateNavigationDisplay() {
        const accountButtons = document.querySelectorAll(this.accountButtonSelector);
        accountButtons.forEach(button => {
            if (this.profileImageUrl) {
                this.displayProfileImage(button);
            } else {
                this.displayDefaultIcon(button);
            }
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
     */    displayProfileImage(button) {
        if (!this.isAccountButton(button)) return;
        
        button.innerHTML = '';
        const isAccountsPage = this.isAccountsPage();
        
        // Create and style profile image element
        const profileImg = document.createElement('img');
        profileImg.src = this.profileImageUrl;
        profileImg.alt = 'Profile Picture';
        profileImg.className = 'profile-nav-image';

        // Error handling
        profileImg.onerror = () => {
            this.displayDefaultIcon(button);
        };

        // Apply styles based on page context
        if (isAccountsPage) {
            button.className = 'header-action-btn accounts-page-profile';
        } else {
            button.className = 'header-action-btn has-profile-image';
            button.style.cssText = `
                width: 45px !important;
                height: 45px !important;
                padding: 0 !important;
                margin: 0 !important;
                border-radius: 50% !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: rgba(255, 133, 177, 0.1) !important;
                border: none !important;
                cursor: pointer !important;
            `;
            
            profileImg.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 50% !important;
                border: 2px solid rgba(255, 133, 177, 0.4) !important;
                display: block !important;
            `;
        }

        button.appendChild(profileImg);
    }    /**
     * Display default user icon
     */
    displayDefaultIcon(button) {
        // Only modify account buttons, not cart or other buttons
        if (!this.isAccountButton(button)) return;
        
        // Clear existing content
        button.innerHTML = '';        // Check if we're on the accounts page for special handling
        const isAccountsPage = this.isAccountsPage();

        // Create default icon element
        const defaultIcon = document.createElement('img');
          // Determine correct path based on current page location
        const isInChandriaHomepage = window.location.pathname.includes('/chandriahomepage/');
        const isRootLevel = !isInChandriaHomepage || 
                           window.location.pathname === '/' || 
                           window.location.pathname.endsWith('/index.html');
        
        defaultIcon.src = isRootLevel ? 'chandriahomepage/assets/img/icon-user.svg' : 'assets/img/icon-user.svg';
        defaultIcon.alt = 'Account';// Use consistent sizing for all pages - same as other header action buttons (20px icon, 45px button)
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
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;button.appendChild(defaultIcon);
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
     * Refresh profile image after profile update
     */
    async refreshProfileImage() {
        if (this.currentUser) {
            await this.loadUserProfileImage(this.currentUser.uid);
            // Force refresh all account buttons
            const accountButtons = document.querySelectorAll(this.accountButtonSelector);
            accountButtons.forEach(button => {
                // Remove any existing styles
                button.removeAttribute('style');
                if (this.profileImageUrl) {
                    this.displayProfileImage(button);
                } else {
                    this.displayDefaultIcon(button);
                }
            });
        }
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
        width: 45px !important;
        height: 45px !important;
        padding: 0 !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        border-radius: 50% !important;
        background: transparent !important;
        border: none !important;
    }

    .header-action-btn.has-profile-image .profile-nav-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        box-shadow: none !important;
        transition: transform 0.3s ease !important;
        display: block !important;
    }

    /* Non-accounts pages styling */
    :not(.accounts-page-profile).header-action-btn.has-profile-image {
        background: rgba(255, 133, 177, 0.1) !important;
    }

    :not(.accounts-page-profile).header-action-btn.has-profile-image .profile-nav-image {
        border: 2px solid rgba(255, 133, 177, 0.4) !important;
    }

    :not(.accounts-page-profile).header-action-btn.has-profile-image:hover .profile-nav-image {
        border-color: rgba(255, 133, 177, 0.6) !important;
        transform: scale(1.05) !important;
    }

    /* Accounts page specific styling */
    .accounts-page-profile.has-profile-image,
    .accounts-page-profile.header-action-btn.has-profile-image {
        background: transparent !important;
    }

    .accounts-page-profile.has-profile-image .profile-nav-image,
    .accounts-page-profile.header-action-btn.has-profile-image .profile-nav-image {
        border: none !important;
        transform: none !important;
    }

    .accounts-page-profile.has-profile-image:hover .profile-nav-image {
        opacity: 0.9;
    }

    /* Accounts page specific styling - force override */
    .accounts-page-profile.header-action-btn,
    .accounts-page-profile.header-action-btn.has-profile-image {
        width: 45px !important;
        height: 45px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 50% !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: none !important;
        border: none !important;
        box-shadow: none !important;
        position: relative !important;
    }

    .accounts-page-profile.header-action-btn img,
    .accounts-page-profile.header-action-btn.has-profile-image img {
        width: 45px !important;
        height: 45px !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        border: none !important;
        background: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    /* Responsive sizing */
    @media screen and (max-width: 768px) {
        .header-action-btn.has-profile-image {
            width: 40px !important;
            height: 40px !important;
        }
    }

    @media screen and (max-width: 480px) {
        .header-action-btn.has-profile-image {
            width: 36px !important;
            height: 36px !important;
        }
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
