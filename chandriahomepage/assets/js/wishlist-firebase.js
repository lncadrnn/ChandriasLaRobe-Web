// WISHLIST FIREBASE SERVICE
import {
    auth,
    chandriaDB,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "./sdk/chandrias-sdk.js";

// WISHLIST FIREBASE SERVICE CLASS
class WishlistFirebaseService {
    constructor() {
        this.notyf = new Notyf({
            position: {
                x: "center",
                y: "top"
            },
            types: [
                {
                    type: "custom-success",
                    background: "#28a745",
                    icon: {
                        className: "notyf__icon--success",
                        tagName: "i"
                    }
                },
                {
                    type: "custom-error", 
                    background: "#dc3545",
                    icon: {
                        className: "notyf__icon--error",
                        tagName: "i"
                    }
                }
            ]
        });
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return auth.currentUser !== null;
    }

    // Get current user's wishlist from Firebase
    async getUserWishlist() {
        const user = auth.currentUser;
        if (!user) return [];

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                return userData.added_to_wishlist || [];
            }
            return [];
        } catch (error) {
            console.error("Error getting user wishlist:", error);
            return [];
        }
    }

    // Check if a product is in the user's wishlist
    async isProductInWishlist(productId) {
        const wishlist = await this.getUserWishlist();
        return wishlist.some(item => item.productId === productId);
    }

    // Add product to wishlist
    async addToWishlist(productId) {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                throw new Error("User account not found");
            }

            const userData = userSnap.data();
            const currentWishlist = userData.added_to_wishlist || [];

            // Check if already in wishlist
            const exists = currentWishlist.some(item => item.productId === productId);
            if (exists) {
                throw new Error("Item is already in your wishlist");
            }

            // Add to wishlist
            await updateDoc(userRef, {
                added_to_wishlist: arrayUnion({
                    productId: productId,
                    addedAt: new Date()
                })
            });            this.notyf.open({
                type: 'custom-success',
                message: 'Added to favorites!'
            });
            return true;

        } catch (error) {
            console.error("Error adding to wishlist:", error);
            if (error.message === "Item is already in your wishlist") {
                this.notyf.error(error.message);
            } else {
                this.notyf.error("Failed to add to favorites.");
            }
            throw error;
        }
    }

    // Remove product from wishlist
    async removeFromWishlist(productId) {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                throw new Error("User account not found");
            }

            const userData = userSnap.data();
            const currentWishlist = userData.added_to_wishlist || [];

            // Filter out the product
            const updatedWishlist = currentWishlist.filter(item => item.productId !== productId);
            
            await updateDoc(userRef, {
                added_to_wishlist: updatedWishlist
            });            this.notyf.open({
                type: 'custom-error',
                message: 'Removed from favorites!'
            });
            return true;

        } catch (error) {
            console.error("Error removing from wishlist:", error);
            this.notyf.error("Failed to remove from favorites.");
            throw error;
        }
    }

    // Toggle product in wishlist (add if not present, remove if present)
    async toggleWishlist(productId) {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        try {
            const isInWishlist = await this.isProductInWishlist(productId);
            
            if (isInWishlist) {
                await this.removeFromWishlist(productId);
                return false; // Removed from wishlist
            } else {
                await this.addToWishlist(productId);
                return true; // Added to wishlist
            }
        } catch (error) {
            throw error;
        }
    }

    // Get wishlist count
    async getWishlistCount() {
        const wishlist = await this.getUserWishlist();
        return wishlist.length;
    }

    // Update wishlist count in UI
    async updateWishlistCountUI() {
        try {
            const count = await this.getWishlistCount();
            const wishlistCountElement = document.getElementById('wishlist-count');
            if (wishlistCountElement) {
                wishlistCountElement.textContent = count.toString();
            }
        } catch (error) {
            console.error("Error updating wishlist count UI:", error);
            const wishlistCountElement = document.getElementById('wishlist-count');
            if (wishlistCountElement) {
                wishlistCountElement.textContent = "0";
            }
        }
    }

    // Update all heart button states on the page
    async updateAllHeartButtonStates() {
        const user = auth.currentUser;
          if (!user) {
            // If no user, ensure all hearts are empty
            document.querySelectorAll('.add-to-favorites-btn').forEach(button => {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = 'bx bx-heart';
                }
                button.classList.remove('favorited');
            });
            return;
        }

        try {
            const wishlist = await this.getUserWishlist();
            
            // Update each heart button based on wishlist status
            document.querySelectorAll('.add-to-favorites-btn').forEach(button => {
                const productId = button.dataset.productId;
                
                if (!productId) return;
                
                // Check if this product is in wishlist
                const isInWishlist = wishlist.some(item => item.productId === productId);
                const icon = button.querySelector('i');
                  if (isInWishlist) {
                    if (icon) icon.className = 'bx bxs-heart';
                    button.classList.add('favorited');
                } else {
                    if (icon) icon.className = 'bx bx-heart';
                    button.classList.remove('favorited');
                }
            });
        } catch (error) {
            console.error("Error updating heart button states:", error);            // On error, set all to "not favorited" as fallback
            document.querySelectorAll('.add-to-favorites-btn').forEach(button => {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = 'bx bx-heart';
                }
                button.classList.remove('favorited');
            });
        }
    }
}

// Create and export singleton instance
const wishlistService = new WishlistFirebaseService();

// Export the service instance and individual methods for backward compatibility
export default wishlistService;
export {
    wishlistService,
    WishlistFirebaseService
};

// Make it globally available for non-module scripts
window.wishlistService = wishlistService;
