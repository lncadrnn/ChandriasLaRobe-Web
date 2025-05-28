// Auto-logout utility for Chandria's La Robe
// Automatically signs out users when they close the tab, navigate away, or are inactive for 30 minutes

import { getAuth, signOut } from "./sdk/chandrias-sdk.js";

class AutoLogout {
    constructor() {
        this.auth = getAuth();
        this.isEnabled = true;
        this.inactivityTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.inactivityTimer = null;
        this.hiddenTimer = null;
        this.isNavigatingWithinSite = false;
        this.lastActivityTime = Date.now();
        this.init();
    }

    init() {
        // Listen for beforeunload event (when user closes tab or navigates away)
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Listen for pagehide event (additional coverage for mobile browsers)
        window.addEventListener('pagehide', this.handlePageHide.bind(this));
        
        // Listen for visibilitychange event (when tab becomes hidden)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Track user activity to reset inactivity timer
        this.setupActivityTracking();
        
        // Track internal navigation to prevent logout during site navigation
        this.setupNavigationTracking();
          // Start inactivity timer
        this.resetInactivityTimer();
        
        // Check for session expiry on page load
        this.checkSessionExpiry();
        
        // Check if browser was closed for more than 30 minutes
        this.checkBrowserCloseTimeout();
    }

    setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
                this.resetInactivityTimer();
            }, { passive: true });
        });
    }

    setupNavigationTracking() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (link && link.href) {
                const currentDomain = window.location.hostname;
                const linkUrl = new URL(link.href, window.location.origin);
                
                // If it's an internal link, mark as internal navigation
                if (linkUrl.hostname === currentDomain) {
                    this.isNavigatingWithinSite = true;
                    // Reset the flag after a short delay
                    setTimeout(() => {
                        this.isNavigatingWithinSite = false;
                    }, 1000);
                }
            }
        });
    }

    updateLastActivity() {
        this.lastActivityTime = Date.now();
        // Store in localStorage for cross-tab tracking
        localStorage.setItem('lastActivityTime', this.lastActivityTime.toString());
    }

    resetInactivityTimer() {
        // Clear existing timer
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Set new timer for 30 minutes
        this.inactivityTimer = setTimeout(() => {
            if (this.isEnabled && this.auth.currentUser) {
                console.log('Auto-logout: User inactive for 30 minutes, logging out');
                this.performLogout('inactivity');
            }
        }, this.inactivityTimeout);
    }

    checkSessionExpiry() {
        const lastActivity = localStorage.getItem('lastActivityTime');
        if (lastActivity) {
            const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
            if (timeSinceLastActivity > this.inactivityTimeout && this.auth.currentUser) {
                console.log('Auto-logout: Session expired, logging out');
                this.performLogout('expired');
                return;
            }
        }
        this.updateLastActivity();
    }

    async handleBeforeUnload(event) {
        // Don't logout if this is internal site navigation
        if (this.isNavigatingWithinSite) {
            return;
        }
        
        if (this.isEnabled && this.auth.currentUser) {
            try {
                // Store logout timestamp for detection after browser restart
                localStorage.setItem('browserCloseTime', Date.now().toString());
                await this.performLogout('browser_close');
            } catch (error) {
                console.error('Auto-logout error during beforeunload:', error);
            }
        }
    }

    async handlePageHide(event) {
        // Don't logout if this is internal site navigation
        if (this.isNavigatingWithinSite) {
            return;
        }
        
        if (this.isEnabled && this.auth.currentUser) {
            try {
                localStorage.setItem('browserCloseTime', Date.now().toString());
                await this.performLogout('page_hide');
            } catch (error) {
                console.error('Auto-logout error during pagehide:', error);
            }
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Tab became hidden - start 30-minute timer
            if (this.isEnabled && this.auth.currentUser) {
                this.hiddenTimer = setTimeout(() => {
                    // Only logout if the page is still hidden after 30 minutes and user is still authenticated
                    if (document.hidden && this.auth.currentUser) {
                        console.log('Auto-logout: Tab hidden for 30 minutes, logging out user');
                        this.performLogout('tab_hidden');
                    }
                }, this.inactivityTimeout);
            }
        } else {
            // Tab became visible - cancel hidden timer
            if (this.hiddenTimer) {
                clearTimeout(this.hiddenTimer);
                this.hiddenTimer = null;
            }
            // Reset activity tracking
            this.updateLastActivity();
            this.resetInactivityTimer();
        }
    }    async performLogout(reason = 'unknown') {
        if (!this.auth.currentUser) return;

        try {
            console.log(`Auto-logout: Signing out user due to: ${reason}`);
            
            // Clear all timers
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
                this.inactivityTimer = null;
            }
            if (this.hiddenTimer) {
                clearTimeout(this.hiddenTimer);
                this.hiddenTimer = null;
            }
            
            // Clear local storage data
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userProfilePicture');
            localStorage.removeItem('lastActivityTime');
            
            // Sign out from Firebase
            await signOut(this.auth);
            
            console.log('Auto-logout: User successfully signed out');
            
            // If this is an inactivity or expiry logout, redirect to login page
            if (reason === 'inactivity' || reason === 'expired') {
                alert('You have been logged out due to inactivity. Please log in again.');
                window.location.href = './user_authentication.html';
            }
            
        } catch (error) {
            console.error('Auto-logout: Error during sign out:', error);
            // Even if sign out fails, clear local storage
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userProfilePicture');
            localStorage.removeItem('lastActivityTime');
        }
    }

    // Method to disable auto-logout (useful for testing or specific scenarios)
    disable() {
        this.isEnabled = false;
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        if (this.hiddenTimer) {
            clearTimeout(this.hiddenTimer);
            this.hiddenTimer = null;
        }
        console.log('Auto-logout: Disabled');
    }

    // Method to enable auto-logout
    enable() {
        this.isEnabled = true;
        this.resetInactivityTimer();
        console.log('Auto-logout: Enabled');
    }

    // Method to check if auto-logout is enabled
    isAutoLogoutEnabled() {
        return this.isEnabled;
    }

    // Method to manually trigger logout
    manualLogout() {
        return this.performLogout('manual');
    }

    // Method to check if browser was closed for more than 30 minutes
    checkBrowserCloseTimeout() {
        const browserCloseTime = localStorage.getItem('browserCloseTime');
        if (browserCloseTime) {
            const timeElapsed = Date.now() - parseInt(browserCloseTime);
            if (timeElapsed > this.inactivityTimeout) {
                console.log('Auto-logout: Browser was closed for more than 30 minutes');
                this.performLogout('browser_timeout');
                return true;
            }
            // Clear the close time if within timeout
            localStorage.removeItem('browserCloseTime');
        }        return false;
    }
}

// Create and export a singleton instance
const autoLogout = new AutoLogout();

export default autoLogout;
export { AutoLogout };
