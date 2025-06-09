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
    });

    // Initialize wishlist service - make sure it's available globally
    let wishlistService;
    if (window.wishlistService) {
        wishlistService = window.wishlistService;
        console.log("Using existing wishlist service");
    } else {
        console.log("Creating fallback wishlist service");
        // Create a temporary wishlist service if not available
        wishlistService = {
            updateWishlistCountUI: async function() {
                await updateWishlistCount();
            }
        };
    }

    // Initialize authentication modal functionality
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
        console.log("displayWishlistItems called for user:", user ? user.uid : "No user");
        
        if (!user) {
            console.log("No authenticated user found");
            showEmptyWishlist();
            return;
        }

        // Ensure content is visible for authenticated users
        $(".wishlist.section-lg.container").addClass("authenticated").show();

        try {
            console.log("Fetching wishlist for user:", user.uid);
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.log("User document does not exist");
                showEmptyWishlist();
                return;
            }

            const userData = userSnap.data();
            const wishlistItems = userData.added_to_wishlist || [];
            console.log("User wishlist items:", wishlistItems);

            if (wishlistItems.length === 0) {
                console.log("Wishlist is empty");
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
            const mobileCards = $("#wishlist-mobile-cards");
            wishlistTable.empty();
            mobileCards.empty();

            console.log("Processing", wishlistItems.length, "wishlist items");

            for (const item of wishlistItems) {
                try {
                    console.log("Processing wishlist item:", item.productId);
                    const productRef = doc(chandriaDB, "products", item.productId);
                    const productSnap = await getDoc(productRef);

                    if (!productSnap.exists()) {
                        console.warn("Product not found:", item.productId);
                        continue;
                    }

                    const product = productSnap.data();
                    console.log("Found product:", product.name);
                    
                    // Get product category
                    const category = product.category || 'Dress';
                    
                    const row = `
                    <tr data-product-id="${item.productId}">
                        <td>
                            <img src="${product.frontImageUrl}" alt="${product.name}" class="table-img">
                        </td>
                        <td>
                            <h3 class="table-title">${product.name}</h3>
                        </td>
                        <td>
                            <span class="table-price">₱${parseFloat(product.price).toLocaleString()}</span>
                        </td>
                        <td>
                            <span class="table-category">${category}</span>
                        </td>
                        <td>
                            <a href="details.html?id=${item.productId}" class="view-details-btn">
                                <i class="fi fi-rs-eye"></i>
                                View Details
                            </a>
                        </td>
                        <td>
                            <button class="wishlist-heart-btn in-wishlist remove-wishlist-btn" 
                                    data-product-id="${item.productId}" 
                                    title="Remove from wishlist">
                                <i class="bxs-heart"></i>
                            </button>
                        </td>
                    </tr>`;

                    // Also create mobile card for responsive design
                    const mobileCard = `
                    <div class="wishlist-card" data-product-id="${item.productId}">
                        <div class="wishlist-card-header">
                            <img src="${product.frontImageUrl}" alt="${product.name}" class="wishlist-card-image">
                            <div class="wishlist-card-info">
                                <h3 class="wishlist-card-title">${product.name}</h3>
                                <span class="wishlist-card-price">₱${parseFloat(product.price).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="wishlist-card-footer">
                            <div class="wishlist-card-status-row">
                                <span class="wishlist-card-category">${category}</span>
                            </div>
                            <div class="wishlist-card-actions">
                                <a href="details.html?id=${item.productId}" class="wishlist-card-btn view-details-btn">
                                    <i class="fi fi-rs-eye"></i>
                                    View Details
                                </a>
                                <button class="wishlist-card-remove in-wishlist remove-wishlist-btn" 
                                        data-product-id="${item.productId}" 
                                        title="Remove from wishlist">
                                    <i class="bxs-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;

                    wishlistTable.append(row);
                    mobileCards.append(mobileCard);
                } catch (productError) {
                    console.error("Error processing product:", item.productId, productError);
                }
            }

            console.log("Wishlist display completed successfully");

        } catch (error) {
            console.error("Error displaying wishlist items:", error);
            showEmptyWishlist();
        }
    }    function showEmptyWishlist() {
        const user = auth.currentUser;
        const wishlistTable = $("#wishlist-body");
        const mobileCards = $("#wishlist-mobile-cards");
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
            
            // Clear both table and mobile cards
            wishlistTable.empty();
            mobileCards.empty();
        }
    }

    // REMOVE FROM WISHLIST
    $(document).on("click", ".remove-wishlist-btn", async function() {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const productId = $(this).data("product-id");
        const row = $(this).closest("tr");
        const card = $(this).closest(".wishlist-card");
        const button = $(this);

        // Add removing animation
        button.addClass("removing");

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

            // Remove from UI (both table row and mobile card)
            const fadeOutPromises = [];
            
            if (row.length) {
                fadeOutPromises.push(new Promise(resolve => {
                    row.fadeOut(300, () => {
                        row.remove();
                        resolve();
                    });
                }));
            }
            
            if (card.length) {
                fadeOutPromises.push(new Promise(resolve => {
                    card.fadeOut(300, () => {
                        card.remove();
                        resolve();
                    });
                }));
            }
            
            await Promise.all(fadeOutPromises);
            
            // Check if wishlist is now empty
            if ($("#wishlist-body tr").length === 0 && $("#wishlist-mobile-cards .wishlist-card").length === 0) {
                showEmptyWishlist();
            }

            await updateWishlistCount();
            notyf.success("Removed from wishlist!");

        } catch (error) {
            console.error("Error removing from wishlist:", error);
            notyf.error("Failed to remove item from wishlist.");
            button.removeClass("removing");
        }
    });

    // CART COUNT FUNCTION (same as other pages)
    async function updateCartCount() {
        const user = auth.currentUser;
        console.log("updateCartCount called - User:", user ? user.uid : "No user");

        if (!user) {
            console.log("No user authenticated, setting cart count to 0");
            $("#cart-count").text("0");
            return;
        }

        try {
            console.log("Fetching cart data for user:", user.uid);
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                const totalCount = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
                console.log("Cart count calculated:", totalCount, "from", cartItems.length, "items");
                $("#cart-count").text(totalCount);
            } else {
                console.log("User document not found, setting cart count to 0");
                $("#cart-count").text("0");
            }
        } catch (error) {
            console.error("Error fetching cart count:", error);
            $("#cart-count").text("0");
        }
    }

    // WISHLIST COUNT FUNCTION
    async function updateWishlistCount() {
        const user = auth.currentUser;
        console.log("updateWishlistCount called - User:", user ? user.uid : "No user");

        if (!user) {
            console.log("No user authenticated, setting wishlist count to 0");
            $("#wishlist-count").text("0");
            return;
        }

        try {
            console.log("Fetching wishlist data for user:", user.uid);
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const wishlistItems = data.added_to_wishlist || [];
                console.log("Wishlist count calculated:", wishlistItems.length, "items");
                $("#wishlist-count").text(wishlistItems.length);
            } else {
                console.log("User document not found, setting wishlist count to 0");
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