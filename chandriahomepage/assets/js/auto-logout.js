// Auto-logout utility for Chandria's La Robe
// Automatically signs out users when they close the tab or navigate away

import { getAuth, signOut } from "./sdk/chandrias-sdk.js";

class AutoLogout {
    constructor() {
        this.auth = getAuth();
        this.isEnabled = true;
        this.init();
    }

    init() {
        // Listen for beforeunload event (when user closes tab or navigates away)
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Listen for pagehide event (additional coverage for mobile browsers)
        window.addEventListener('pagehide', this.handlePageHide.bind(this));
        
        // Listen for visibilitychange event (when tab becomes hidden)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    async handleBeforeUnload(event) {
        if (this.isEnabled && this.auth.currentUser) {
            try {
                // Synchronous logout for beforeunload
                await this.performLogout();
            } catch (error) {
                console.error('Auto-logout error during beforeunload:', error);
            }
        }
    }

    async handlePageHide(event) {
        if (this.isEnabled && this.auth.currentUser) {
            try {
                await this.performLogout();
            } catch (error) {
                console.error('Auto-logout error during pagehide:', error);
            }
        }
    }    handleVisibilityChange() {
        // More conservative approach: only log out on visibility change if the page stays hidden for a longer period
        // This prevents accidental logout when switching tabs temporarily
        if (document.hidden && this.isEnabled && this.auth.currentUser) {
            // Set a longer delay to avoid logout on quick tab switches
            setTimeout(() => {
                // Only logout if the page is still hidden after 5 seconds and user is still authenticated
                if (document.hidden && this.auth.currentUser) {
                    console.log('Auto-logout: Page hidden for extended period, logging out user');
                    this.performLogout().catch(error => {
                        console.error('Auto-logout error during visibility change:', error);
                    });
                }
            }, 5000); // Increased delay to 5 seconds
        }
    }

    async performLogout() {
        if (!this.auth.currentUser) return;

        try {
            console.log('Auto-logout: Signing out user before page unload');
            
            // Clear local storage data
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userProfilePicture');
            
            // Sign out from Firebase
            await signOut(this.auth);
            
            console.log('Auto-logout: User successfully signed out');
        } catch (error) {
            console.error('Auto-logout: Error during sign out:', error);
            // Even if sign out fails, clear local storage
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userProfilePicture');
        }
    }

    // Method to disable auto-logout (useful for testing or specific scenarios)
    disable() {
        this.isEnabled = false;
        console.log('Auto-logout: Disabled');
    }

    // Method to enable auto-logout
    enable() {
        this.isEnabled = true;
        console.log('Auto-logout: Enabled');
    }

    // Method to check if auto-logout is enabled
    isAutoLogoutEnabled() {
        return this.isEnabled;
    }
}

// Create and export a singleton instance
const autoLogout = new AutoLogout();

export default autoLogout;
export { AutoLogout };
