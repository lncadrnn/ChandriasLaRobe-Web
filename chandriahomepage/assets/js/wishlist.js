// WISHLIST JS
import {
    onAuthStateChanged,
    auth,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // INITIALIZING NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        types: [
            {
                type: "custom-success",
                background: "#ff9a10ff",
                icon: {
                    className: "notyf__icon--success",
                    tagName: "i"
                }
            }
        ]
    });    // Initialize authentication modal functionality
    initializeAuthModal();

    // Listen for authentication state changes
    onAuthStateChanged(auth, async user => {
        if (user) {
            // User logged in - show main content
            $("#nav-login").hide();
            localStorage.setItem('userEmail', user.email);
            
            // Show the wishlist section
            $(".wishlist.section-lg.container").addClass("authenticated").show();
            
            await updateCartCount();
            await updateWishlistCount();
            await displayWishlistItems();
        } else {
            // User not logged in - hide main content and show authentication modal
            $("#nav-login").show();
            localStorage.removeItem('userEmail');
            $("#cart-count").text("0");
            $("#wishlist-count").text("0");
            
            // Hide the wishlist section
            $(".wishlist.section-lg.container").removeClass("authenticated").hide();
            
            showEmptyWishlist();
            
            // Show authentication modal for unauthenticated users visiting wishlist
            setTimeout(() => {
                showAuthModal();
            }, 500); // Small delay to ensure page has loaded properly
        }
    });    // AUTHENTICATION MODAL FUNCTIONS - Now handled by auth-modal.js module
    function initializeAuthModal() {
        // Modal functions are now handled by the global auth-modal.js module
        // The global showAuthModal() and hideAuthModal() functions are available
    }

    function hideAuthModal() {
        // Custom wishlist-specific logic when hiding auth modal
        if (window.hideAuthModal) {
            window.hideAuthModal();
        }
        
        // If user is not authenticated and closes modal, ensure content stays hidden
        const user = auth.currentUser;
        if (!user) {
            $(".wishlist.section-lg.container").removeClass("authenticated").hide();
        }
    }

    // DISPLAY WISHLIST ITEMS
    async function displayWishlistItems() {
        const user = auth.currentUser;
        if (!user) {
            showEmptyWishlist();
            return;
        }

        // Ensure content is visible for authenticated users
        $(".wishlist.section-lg.container").addClass("authenticated").show();

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                showEmptyWishlist();
                return;
            }

            const userData = userSnap.data();
            const wishlistItems = userData.added_to_wishlist || [];

            if (wishlistItems.length === 0) {
                showEmptyWishlist();
                return;
            }

            // Show the table header when there are items
            const tableHeader = $(".table thead");
            tableHeader.show();

            const wishlistTable = $("#wishlist-body");
            wishlistTable.empty();

            for (const item of wishlistItems) {
                const productRef = doc(chandriaDB, "products", item.productId);
                const productSnap = await getDoc(productRef);

                if (!productSnap.exists()) continue;

                const product = productSnap.data();
                
                // Calculate availability status
                const totalStock = Object.values(product.size || {}).reduce((a, b) => a + b, 0);
                let status = "Available";
                let statusClass = "available";
                
                if (totalStock === 0) {
                    status = "Unavailable";
                    statusClass = "unavailable";
                } else if (totalStock <= 5) {
                    status = "Limited Stock";
                    statusClass = "limited";
                }

                const row = `
                <tr data-product-id="${item.productId}">
                    <td>
                        <img src="${product.frontImageUrl}" alt="${product.name}" class="table-img">
                    </td>
                    <td>
                        <h3 class="table-title">${product.name}</h3>
                        <p class="table-description">${product.description || 'Premium quality dress for your special occasions'}</p>
                    </td>
                    <td>
                        <span class="table-price">₱${parseFloat(product.price).toLocaleString()}</span>
                    </td>
                    <td>
                        <span class="table-status ${statusClass}">${status}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm add-to-cart-btn" 
                                data-product-id="${item.productId}" 
                                ${totalStock === 0 ? 'disabled' : ''}>
                            Add to Rent List
                        </button>
                    </td>
                    <td>
                        <i class="fi fi-rs-trash table-trash remove-wishlist-btn" 
                           data-product-id="${item.productId}" 
                           title="Remove from wishlist"></i>
                    </td>
                </tr>`;

                wishlistTable.append(row);
            }

        } catch (error) {
            console.error("Error displaying wishlist items:", error);
            showEmptyWishlist();
        }
    }    function showEmptyWishlist() {
        const user = auth.currentUser;
        const wishlistTable = $("#wishlist-body");
        const tableHeader = $(".table thead");
        
        // Hide the table header when wishlist is empty
        tableHeader.hide();
        
        if (!user) {
            // For unauthenticated users, ensure main content is hidden
            $(".wishlist.section-lg.container").removeClass("authenticated").hide();
            
            // Show login prompt in table (this will be hidden anyway, but for completeness)
            wishlistTable.html(`
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <div class="empty-wishlist">
                            <i class="fi fi-rs-heart" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                            <h3>Please log in to view your wishlist</h3>
                            <p>Sign in to save and manage your favorite items</p>
                            <button onclick="showAuthModal()" class="btn btn-primary" style="margin-top: 1rem; margin-right: 0.5rem;">Log In</button>
                            <a href="shop.html" class="btn btn-secondary" style="margin-top: 1rem;">Browse Products</a>
                        </div>
                    </td>
                </tr>
            `);
        } else {
            // Show empty wishlist message for authenticated users
            $(".wishlist.section-lg.container").addClass("authenticated").show();
            wishlistTable.html(`
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <div class="empty-wishlist">
                            <i class="fi fi-rs-heart" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                            <h3>Your wishlist is empty</h3>
                            <p>Add items to your wishlist to see them here</p>
                            <a href="shop.html" class="btn btn-primary" style="margin-top: 1rem;">Browse Products</a>
                        </div>
                    </td>
                </tr>
            `);
        }
    }

    // ADD TO CART FROM WISHLIST
    $(document).on("click", ".add-to-cart-btn", async function() {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const productId = $(this).data("product-id");
        const button = $(this);

        // Disable button during processing
        button.prop("disabled", true).text("Adding...");

        try {
            // Get product data to find available size
            const productRef = doc(chandriaDB, "products", productId);
            const productSnap = await getDoc(productRef);
            
            if (!productSnap.exists()) {
                notyf.error("Product not found.");
                return;
            }

            const productData = productSnap.data();
            const sizes = productData.size || {};
            
            // Find the first available size with stock > 0
            let selectedSize = null;
            for (const [size, stock] of Object.entries(sizes)) {
                if (stock > 0) {
                    selectedSize = size;
                    break;
                }
            }

            if (!selectedSize) {
                notyf.error("Product is out of stock.");
                return;
            }

            // Add to cart
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return;
            }

            const userData = userSnap.data();
            const currentCart = userData.added_to_cart || [];

            // Check if item already exists in cart
            const existingIndex = currentCart.findIndex(
                item => item.productId === productId && item.size === selectedSize
            );

            if (existingIndex !== -1) {
                // Update quantity if already in cart
                currentCart[existingIndex].quantity += 1;
                await updateDoc(userRef, { added_to_cart: currentCart });
                notyf.success(`Updated quantity for ${productData.name} (${selectedSize})`);
            } else {
                // Add new item to cart
                await updateDoc(userRef, {
                    added_to_cart: arrayUnion({
                        productId,
                        size: selectedSize,
                        quantity: 1
                    })
                });
                notyf.success(`Added ${productData.name} (${selectedSize}) to cart!`);
            }

            await updateCartCount();

        } catch (error) {
            console.error("Error adding to cart:", error);
            notyf.error("Failed to add item to cart.");
        } finally {
            button.prop("disabled", false).text("Add to Rent List");
        }
    });

    // REMOVE FROM WISHLIST
    $(document).on("click", ".remove-wishlist-btn", async function() {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const productId = $(this).data("product-id");
        const row = $(this).closest("tr");

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            
            // Remove the specific item by filtering
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const currentWishlist = userData.added_to_wishlist || [];
                const updatedWishlist = currentWishlist.filter(item => item.productId !== productId);
                
                await updateDoc(userRef, {
                    added_to_wishlist: updatedWishlist
                });
            }

            // Remove from UI
            row.fadeOut(300, () => {
                row.remove();
                // Check if wishlist is now empty
                if ($("#wishlist-body tr").length === 0) {
                    showEmptyWishlist();
                }
            });

            await updateWishlistCount();
            notyf.success("Removed from wishlist!");

        } catch (error) {
            console.error("Error removing from wishlist:", error);
            notyf.error("Failed to remove item from wishlist.");
        }
    });

    // CART COUNT FUNCTION (same as other pages)
    async function updateCartCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#cart-count").text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                const totalCount = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
                $("#cart-count").text(totalCount);
            }
        } catch (error) {
            console.error("Error fetching cart count:", error);
            $("#cart-count").text("0");
        }
    }

    // WISHLIST COUNT FUNCTION
    async function updateWishlistCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#wishlist-count").text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const wishlistItems = data.added_to_wishlist || [];
                $("#wishlist-count").text(wishlistItems.length);
            } else {
                $("#wishlist-count").text("0");
            }
        } catch (error) {
            console.error("Error fetching wishlist count:", error);
            $("#wishlist-count").text("0");
        }
    }

    // Make functions globally available for other scripts
    window.updateWishlistCount = updateWishlistCount;
    window.addToWishlist = async function(productId) {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return false;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return false;
            }

            const userData = userSnap.data();
            const currentWishlist = userData.added_to_wishlist || [];

            // Check if already in wishlist
            const exists = currentWishlist.some(item => item.productId === productId);
            if (exists) {
                notyf.error("Item is already in your wishlist!");
                return false;
            }

            // Add to wishlist
            await updateDoc(userRef, {
                added_to_wishlist: arrayUnion({
                    productId: productId,
                    addedAt: new Date()
                })
            });

            await updateWishlistCount();
            notyf.success("Added to wishlist!");
            return true;

        } catch (error) {
            console.error("Error adding to wishlist:", error);
            notyf.error("Failed to add to wishlist.");
            return false;
        }
    };
});