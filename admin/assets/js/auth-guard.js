/**
 * Authentication Guard for Admin Pages
 * Automatically redirects to index.html if user is not logged in or not an admin
 */

import {
    onAuthStateChanged,
    auth,
    doc,
    getDoc,
    chandriaDB,
    signOut
} from "./sdk/chandrias-sdk.js";

// Flag to prevent multiple redirects
let authCheckInProgress = false;

// Authentication guard function
function initAuthGuard() {
    if (authCheckInProgress) return;
    authCheckInProgress = true;

    onAuthStateChanged(auth, async (user) => {
        try {
            if (!user) {
                // No user logged in, redirect to home page
                console.log('No user logged in, redirecting to index.html');
                window.location.href = '../index.html';
                return;
            }

            // Check if user exists in adminAccounts collection
            const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (!adminDocSnap.exists()) {
                // User is not an admin, check if they're a regular user
                const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // User is a customer, sign them out and redirect
                    console.log('User is a customer, not admin. Signing out and redirecting.');
                    await signOut(auth);
                }
                
                // Redirect to home page
                window.location.href = '../index.html';
                return;
            }

            // Verify email is verified
            if (!user.emailVerified) {
                console.log('User email not verified, signing out and redirecting.');
                await signOut(auth);
                window.location.href = '../index.html';
                return;
            }

            console.log('User authenticated as admin:', user.email);
            authCheckInProgress = false;

        } catch (error) {
            console.error('Error during auth check:', error);
            // On error, redirect to home page for safety
            window.location.href = '../index.html';
        }
    });
}

// Auto-initialize when the script loads
document.addEventListener('DOMContentLoaded', initAuthGuard);

// Export for manual initialization if needed
export { initAuthGuard };
