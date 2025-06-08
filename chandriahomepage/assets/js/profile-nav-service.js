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
    }

    /**
     * Load user profile image from Firestore
     */
    async loadUserProfileImage(uid) {
        try {
            const userRef = doc(chandriaDB, "userAccounts", uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                this.profileImageUrl = userData.profileImageUrl || null;
            } else {
                this.profileImageUrl = null;
            }
        } catch (error) {
            console.error('Error loading user profile image:', error);
            this.profileImageUrl = null;
        }
    }

    /**
     * Update the navigation account button display
     */
    updateNavigationDisplay() {
        const accountButtons = document.querySelectorAll(this.accountButtonSelector);
        
        accountButtons.forEach(button => {
            if (this.currentUser && this.profileImageUrl) {
                this.displayProfileImage(button);
            } else {
                this.displayDefaultIcon(button);
            }
        });
    }    /**
     * Display user profile image in the account button
     */
    displayProfileImage(button) {
        // Only modify account buttons, not cart or other buttons
        if (!this.isAccountButton(button)) return;
        
        // Clear existing content
        button.innerHTML = '';
        
        // Create profile image element
        const profileImg = document.createElement('img');
        profileImg.src = this.profileImageUrl;
        profileImg.alt = 'Profile Picture';
        profileImg.className = 'profile-nav-image';
        profileImg.style.cssText = `
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 133, 177, 0.3);
            transition: all 0.3s ease;
        `;

        // Add error handling for broken images
        profileImg.onerror = () => {
            this.displayDefaultIcon(button);
        };

        button.appendChild(profileImg);
        button.classList.add('has-profile-image');
    }

    /**
     * Display default user icon
     */
    displayDefaultIcon(button) {
        // Only modify account buttons, not cart or other buttons
        if (!this.isAccountButton(button)) return;
        
        // Clear existing content
        button.innerHTML = '';

        // Create default icon element
        const defaultIcon = document.createElement('img');
        defaultIcon.src = 'assets/img/icon-user.svg';
        defaultIcon.alt = 'Account';
        defaultIcon.style.cssText = `
            width: 24px;
            height: 24px;
            transition: filter 0.3s ease;
        `;

        button.appendChild(defaultIcon);
        button.classList.remove('has-profile-image');
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
    }

    /**
     * Refresh profile image (called after profile update)
     */
    async refreshProfileImage() {
        if (this.currentUser) {
            await this.loadUserProfileImage(this.currentUser.uid);
            this.updateNavigationDisplay();
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
        padding: 2px;
    }

    .header-action-btn.has-profile-image:hover .profile-nav-image {
        border-color: rgba(255, 133, 177, 0.6);
        transform: scale(1.1);
    }

    .header-action-btn.has-profile-image .profile-nav-image {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* Ensure proper sizing on different screen sizes */
    @media screen and (max-width: 768px) {
        .header-action-btn .profile-nav-image {
            width: 20px;
            height: 20px;
        }
    }

    @media screen and (max-width: 480px) {
        .header-action-btn .profile-nav-image {
            width: 18px;
            height: 18px;
        }
    }

    /* Special styling for accounts page */
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
