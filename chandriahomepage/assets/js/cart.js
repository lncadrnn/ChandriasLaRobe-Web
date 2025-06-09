// CART JS
import {
    onAuthStateChanged,
    auth,
    signOut,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion
} from "./sdk/chandrias-sdk.js";
import wishlistService from "./wishlist-firebase.js";

$(document).ready(function () {
    // INTIALIZING NOTYF
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

    onAuthStateChanged(auth, async user => {
        if (user) {
            // Check if user exists in adminAccounts
            const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists()) {
                // If user is admin, sign them out
                await signOut(auth);
                window.location.href = "../index.html";
                return;
            }
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // AUTHENTICATION MODAL FUNCTIONS - Now handled by auth-modal.js module // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // LISTEN FOR AUTH STATE CHANGES
    onAuthStateChanged(auth, async user => {
        try {
            if (!user) {
                // User not logged in, show auth required content
                
                // Hide cart header, content and actions
                $(".cart-header").hide();
                $(".cart-table").hide();
                $("#empty-cart").hide();
                $(".cart-actions").hide();
                
                // Show auth required content
                $("#cart-auth-required").show();
                
                // Keep the main cart section visible but show auth content
                $(".cart.section-lg.container").show();
                
                // Show the authentication modal
                showAuthModal();
                return;
            } else {
                // User is logged in, hide auth modal and show cart content
                hideAuthModal();
                
                // Hide auth required content and show cart content
                $("#cart-auth-required").hide();
                $(".cart-header").show();
                $(".cart-table").show();
                $(".cart-actions").show();
                $(".cart.section-lg.container").show();
            }

            // Wait for all data operations to complete
            await Promise.all([
                updateCartCount(),
                wishlistService.updateWishlistCountUI(),
                displayCartItems(user)
            ]);
            
        } catch (error) {
            console.error("Error loading cart data:", error);
        } finally {
            // Hide loader after data is loaded (success or error)
            if (typeof hideSpinner === 'function') {
                hideSpinner('cart-loader');
            } else {
                hideSpinner('cart-loader');
            }
        }
    }); // DISPLAY CART ITEMS IN TABLE

    async function displayCartItems() {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(chandriaDB, "userAccounts", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const cartItems = userSnap.data().added_to_cart || [];

        const cartTable = $("#cart-list");
        cartTable.empty(); // Clear previous contents

        if (cartItems.length === 0) {
            $("#empty-cart").show();
            $(".cart-table, .cart-actions, .cart-header").hide();
            return;
        } else {
            $("#empty-cart").hide();
            $(".cart-table, .cart-actions, .cart-header").show();
        }

        let totalItems = 0;
        let grandTotal = 0;

        for (const item of cartItems) {
            const productRef = doc(chandriaDB, "products", item.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) continue;

            const product = productSnap.data();
            const price = parseFloat(product.price);
            const quantity = item.quantity;
            const total = price * quantity;
            const stock = product.size?.[item.size] || 0;

            totalItems += quantity;
            grandTotal += total;

            // Responsive Cart Item Row (Desktop table + Mobile card layout)
            const row = `
                <div class="cart-item-row">
                    <!-- Desktop table layout elements -->
                    <div class="cart-item-product">
                        <img src="${
                            product.frontImageUrl
                        }" alt="" class="cart-item-image" />
                        <div class="cart-item-details">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                        </div>
                    </div>
                    <div class="cart-item-size">${item.size}</div>
                    <div class="cart-item-price">₱${price.toLocaleString()}</div>
                    <div class="cart-item-stock">${stock}</div>
                    <div class="cart-item-quantity">
                        <input type="number" class="quantity"
                               value="${quantity}" min="1" max="${stock}"
                               data-id="${item.productId}" data-size="${
                                   item.size
                               }"
                               data-price="${price}" />
                    </div>
                    <div class="cart-item-total">₱${total.toLocaleString()}</div>
                    <div class="cart-item-actions">
                        <button class="delete-btn" data-id="${
                            item.productId
                        }" data-size="${item.size}">
                            <i class="fi fi-rs-trash table-trash"></i>
                        </button>
                    </div>
                    
                    <!-- Mobile card layout elements (hidden on desktop) -->
                    <div class="cart-mobile-info">
                        <div class="cart-mobile-field size">
                            <span class="label">Size</span>
                            <span class="value">${item.size}</span>
                        </div>
                        <div class="cart-mobile-field stock">
                            <span class="label">Stock</span>
                            <span class="value">${stock}</span>
                        </div>
                        <div class="cart-mobile-field price">
                            <span class="label">Price</span>
                            <span class="value">₱${price.toLocaleString()}</span>
                        </div>
                        <div class="cart-mobile-field total">
                            <span class="label">Total</span>
                            <span class="value">₱${total.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="cart-mobile-quantity">
                        <span class="label">Quantity:</span>
                        <input type="number" class="quantity mobile-quantity"
                               value="${quantity}" min="1" max="${stock}"
                               data-id="${item.productId}" data-size="${
                                   item.size
                               }"
                               data-price="${price}" />
                    </div>
                    
                    <div class="cart-mobile-actions">
                        <button class="delete-btn mobile-delete-btn" data-id="${
                            item.productId
                        }" data-size="${item.size}">
                            <i class="fi fi-rs-trash"></i>
                            Remove Item
                        </button>
                    </div>
                </div>
            `;

            cartTable.append(row);
        }

        // Update cart summary
        $("#cart-total-items").text(totalItems);
        $("#cart-grand-total").text(`₱${grandTotal.toLocaleString()}`);
    }

    // VALIDATE QUANTITY INPUT PER PRODUCT, REPLACE SPECIAL CHARACTERS
    // UPDATE TOTAL PRICE ON QUANTITY CHANGE
    function updateCheckoutButtonState() {
        let hasInvalid = false;
        $(".quantity").each(function () {
            const val = $(this).val().trim();
            if (val === "" || isNaN(val) || parseInt(val, 10) <= 0) {
                hasInvalid = true;
                return false; // break loop
            }
        });

        if (hasInvalid) {
            $("#btn-checkout").addClass("disabled");
        } else {
            $("#btn-checkout").removeClass("disabled");
        }
    }
    $(document).on("input", ".quantity", function () {
        const input = $(this);
        let val = input.val();

        // Remove non-digit characters
        val = val.replace(/\D/g, "");

        if (val === "") {
            input.val("");
            updateItemTotal(input, 0);
            updateCheckoutButtonState();
            return;
        }

        if (val === "0") val = "1";

        input.val(val); // Set cleaned value

        const quantity = parseInt(val, 10);
        const maxStock = parseInt(input.attr("max"), 10) || 0;

        if (quantity > maxStock) {
            input.val(maxStock);
        }

        // Update the total for this item
        const price = parseFloat(input.data("price"));
        const finalQty = parseInt(input.val(), 10);
        const total = isNaN(finalQty) ? 0 : price * finalQty;

        updateItemTotal(input, total);
        updateGrandTotal();
        updateCheckoutButtonState();
    });
    function updateItemTotal(input, total) {
        // Find the item container
        const itemContainer = input.closest(".cart-item-row");

        // Update the total display
        itemContainer
            .find(".cart-item-total")
            .text(`₱${total.toLocaleString()}`);
    }

    function updateGrandTotal() {
        let grandTotal = 0;
        let totalItems = 0;

        $(".quantity").each(function () {
            const quantity = parseInt($(this).val(), 10) || 0;
            const price = parseFloat($(this).data("price")) || 0;
            grandTotal += quantity * price;
            totalItems += quantity;
        });

        $("#cart-grand-total").text(`₱${grandTotal.toLocaleString()}`);
        $("#cart-total-items").text(totalItems);
    }

    // VALIDATE QUANTITY INPUT PER PRODUCT, REPLACE SPECIAL CHARACTERS
    // UPDATE TOTAL PRICE ON QUANTITY CHANGE
    function updateCheckoutButtonState() {
        let hasInvalid = false;
        $(".quantity").each(function () {
            const val = $(this).val().trim();
            if (val === "" || isNaN(val) || parseInt(val, 10) <= 0) {
                hasInvalid = true;
                return false; // break loop
            }
        });

        if (hasInvalid) {
            $("#btn-checkout").addClass("disabled");
        } else {
            $("#btn-checkout").removeClass("disabled");
        }
    }
    $(document).on("input", ".quantity", function () {
        const input = $(this);
        let val = input.val();

        // Remove non-digit characters
        val = val.replace(/\D/g, "");

        if (val === "") {
            input.val("");
            updateItemTotal(input, 0);
            updateCheckoutButtonState();
            return;
        }

        if (val === "0") val = "1";

        input.val(val); // Set cleaned value

        const quantity = parseInt(val, 10);
        const maxStock = parseInt(input.attr("max"), 10) || 0;

        if (quantity > maxStock) {
            input.val(maxStock);
        }

        // Update the total for this item
        const price = parseFloat(input.data("price"));
        const finalQty = parseInt(input.val(), 10);
        const total = isNaN(finalQty) ? 0 : price * finalQty;

        updateItemTotal(input, total);
        updateGrandTotal();
        updateCheckoutButtonState();
    });
    function updateItemTotal(input, total) {
        // Find the item container
        const itemContainer = input.closest(".cart-item-row");

        // Update the total display
        itemContainer
            .find(".cart-item-total")
            .text(`₱${total.toLocaleString()}`);
    }

    function updateGrandTotal() {
        let grandTotal = 0;
        let totalItems = 0;

        $(".quantity").each(function () {
            const quantity = parseInt($(this).val(), 10) || 0;
            const price = parseFloat($(this).data("price")) || 0;
            grandTotal += quantity * price;
            totalItems += quantity;
        });

        $("#cart-grand-total").text(`₱${grandTotal.toLocaleString()}`);
        $("#cart-total-items").text(totalItems);
    }

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // CHECKOUT FUNCTION
    $("#btn-checkout").on("click", async function () {
        const btnCheckOut = $(this);
        const btnText = btnCheckOut.find("#btn-text");
        const btnSpinner = btnCheckOut.find(".spinner");

        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const userRef = doc(chandriaDB, "userAccounts", user.uid);

        try {
            // DISABLING BUTTON
            btnCheckOut.addClass("disabled");
            btnText.hide();
            btnSpinner.show();

            const snap = await getDoc(userRef);
            if (!snap.exists()) return alert("User not found.");

            const currentCart = snap.data().added_to_cart || [];

            $(".quantity").each(function () {
                const input = $(this);
                const productId = input.data("id");
                const size = input.data("size");
                const quantity = parseInt(input.val(), 10);

                const itemIndex = currentCart.findIndex(
                    item => item.productId === productId && item.size === size
                );

                if (itemIndex !== -1) {
                    currentCart[itemIndex].quantity = quantity;
                }
            });

            await updateDoc(userRef, { added_to_cart: currentCart });

            // Redirect after successful update
            window.location.href = "./checkout.html";
        } catch (error) {
            console.error("Checkout update failed:", error);
            alert("Failed to update cart.");

            // RE-ENABLING BUTTON IF FAILED
            btnCheckOut.removeClass("disabled");
            btnText.show();
            btnSpinner.hide();
        }
    }); // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#    // DELETE CART ITEM FUNCTION
    let itemToRemove = null;

    // Show modal with animation
    function showRemoveModal() {
        const modal = $("#remove-modal");
        modal.css("display", "flex");
        setTimeout(() => {
            modal.addClass("show");
        }, 10); // Small delay to ensure display:flex is applied first
    }

    // Hide modal with animation
    function hideRemoveModal() {
        const modal = $("#remove-modal");
        modal.removeClass("show");
        setTimeout(() => {
            modal.css("display", "none");
        }, 300); // Match the CSS transition duration
    }

    $(document).on("click", ".delete-btn", function () {
        const productId = $(this).data("id");
        const size = $(this).data("size");

        // Store the item details for removal
        itemToRemove = { productId, size, element: $(this) };

        // Show confirmation modal with animation
        showRemoveModal();
    });

    // Modal "Yes" button - confirm removal
    $("#remove-yes").on("click", async function () {
        if (!itemToRemove) return;

        const user = auth.currentUser;
        if (!user) return;

        const { productId, size, element } = itemToRemove;
        const userRef = doc(chandriaDB, "userAccounts", user.uid);

        try {
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return;

            let currentCart = userSnap.data().added_to_cart || [];

            // Filter out the item to delete
            const updatedCart = currentCart.filter(item => {
                return !(item.productId === productId && item.size === size);
            });

            // Update Firestore with the new cart
            await updateDoc(userRef, {
                added_to_cart: updatedCart
            });

            // Remove the item from the display with fade-out animation
            const itemContainer = element.closest(".cart-item-row");
            itemContainer.fadeOut(0, function () {
                $(this).remove();

                // Check if cart is now empty
                if (updatedCart.length === 0) {
                    $("#empty-cart").fadeIn(0);
                    $(".cart-table, .cart-actions, .cart-header").fadeOut(0);
                } else {
                    // Update totals if items remain
                    updateGrandTotal();
                }
            });

            notyf.success("Item removed from cart");

            // Update cart count
            await updateCartCount();
            await wishlistService.updateWishlistCountUI();

            // Hide modal and clear stored item
            hideRemoveModal();
            itemToRemove = null;
        } catch (error) {
            console.error("Error deleting cart item: ", error);
            notyf.error("Failed to remove item");
            hideRemoveModal();
            itemToRemove = null;
        }
    });

    // Modal "No" button - cancel removal
    $("#remove-no").on("click", function () {
        hideRemoveModal();
        itemToRemove = null;
    });

    // Close modal when clicking outside
    $(document).on("click", "#remove-modal", function (e) {
        if (e.target === this) {
            hideRemoveModal();
            itemToRemove = null;
        }
    });

    // Close modal on escape key
    $(document).on("keydown", function (e) {
        if (e.key === "Escape" && $("#remove-modal").is(":visible")) {
            hideRemoveModal();
            itemToRemove = null;
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // CART COUNT FUNCTION
    async function updateCartCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#cart-count").text("0"); // User not logged in, show 0
            return;
        }

        try {
            // Get user\'s document reference and snapshot
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                // Calculate total quantity instead of number of items, ensuring quantity is an integer
                const totalCount = cartItems.reduce(
                    (sum, item) => sum + (parseInt(item.quantity, 10) || 0),
                    0
                );

                // Update the cart count in the header
                $("#cart-count").text(totalCount);
            }
        } catch (error) {
            console.error("Error fetching cart count: ", error);
            $("#cart-count").text("0"); // Fallback to 0 on error
        }
    }
    //
});
