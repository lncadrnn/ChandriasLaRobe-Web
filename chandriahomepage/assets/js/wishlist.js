// WISHLIST JS
import {
    onAuthStateChanged,
    auth,
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
        try {
            if (user) {
                // User logged in - show main content
                $("#nav-login").hide();
                localStorage.setItem('userEmail', user.email);
                
                // Hide auth required content and show wishlist content
                $("#wishlist-auth-required").hide();
                $(".wishlist-header").show();
                $("#wishlist-table-container").show();
                
                // Show the wishlist section
                $(".wishlist.section-lg.container").addClass("authenticated").show();
                
                // Wait for all data operations to complete
                await Promise.all([
                    updateCartCount(),
                    updateWishlistCount(),
                    displayWishlistItems()
                ]);
                
            } else {
                // User not logged in - show auth required content
                $("#nav-login").show();
                localStorage.removeItem('userEmail');
                $("#cart-count").text("0");
                $("#wishlist-count").text("0");
                
                // Hide the wishlist header, table and authenticated content
                $(".wishlist-header").hide();
                $("#wishlist-table-container").hide();
                $("#wishlist-empty-state").hide();
                
                // Show the auth required content and keep main section visible
                $("#wishlist-auth-required").show();
                $(".wishlist.section-lg.container").show();
                
                // Show the authentication modal
                showAuthModal();
            }
        } catch (error) {
            console.error("Error in auth state change:", error);
        } finally {
            // Always hide the spinner after all operations complete (success or error)
            if (typeof hideSpinner === 'function') {
                hideSpinner('page-spinner');
            } else {
                hideWishlistLoader();
            }
        }
    });

    // Remove fallback timeout since we're now properly coordinating async operations
    // The spinner will be hidden when all data operations complete

    // AUTHENTICATION MODAL FUNCTIONS - Now handled by auth-modal.js module
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

    // LOADER FUNCTIONS
    function hideWishlistLoader() {
        const loader = document.getElementById('wishlist-loader');
        if (loader) {
            loader.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
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

            // Show the table header, wishlist header, and table container when there are items
            const tableHeader = $(".table thead");
            const wishlistHeader = $(".wishlist-header");
            const tableContainer = $("#wishlist-table-container");
            const emptyState = $("#wishlist-empty-state");
            
            tableHeader.show();
            wishlistHeader.show();
            tableContainer.show();
            emptyState.hide();

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
        const wishlistHeader = $(".wishlist-header");
        const tableContainer = $("#wishlist-table-container");
        const emptyState = $("#wishlist-empty-state");
        
        if (!user) {
            // For unauthenticated users, hide everything
            wishlistHeader.hide();
            tableContainer.hide();
            emptyState.hide();
            $(".wishlist.section-lg.container").removeClass("authenticated").hide();
        } else {
            // For authenticated users with empty wishlist, hide header and table, show empty state
            $(".wishlist.section-lg.container").addClass("authenticated").show();
            wishlistHeader.hide(); // Hide header when wishlist is empty
            tableContainer.hide();
            emptyState.show();
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