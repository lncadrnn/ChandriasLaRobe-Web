// CART JS
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
    arrayUnion
} from "./sdk/chandrias-sdk.js";

// Import auto-logout functionality
import autoLogout from "./auto-logout.js";

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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // LISTEN FOR AUTH STATE CHANGES
    onAuthStateChanged(auth, async user => {
        if (!user) {
            // User not logged in, show the login nav
            $("#nav-login").show();
        }
        await updateCartCount();
        await displayCartItems(user);
    });

    // DISPLAY CART ITEMS ON TABLE
    async function displayCartItems() {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(chandriaDB, "userAccounts", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const cartItems = userSnap.data().added_to_cart || [];

        const cartTable = $("#cart-list");
        cartTable.empty(); // Clear previous contents

        for (const item of cartItems) {
            const productRef = doc(chandriaDB, "products", item.productId); // adjust if your collection name is different
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) continue;

            const product = productSnap.data();
            const price = parseFloat(product.price);
            const quantity = item.quantity;
            const total = price * quantity;
            const stock = product.size?.[item.size] || 0;

            const row = `
            <tr>
                <td>
                    <img src="${product.frontImageUrl}" alt="" class="table-img" />
                </td>
                <td>
                    <h3 class="table-title">${product.name}</h3>
                    <p class="table-description">${product.description}</p>
                </td>
                <td>
                    <span class="table-size">${item.size}</span>
                </td>
                <td><span class="table-price">₱${price}</span></td>
                <td><span class="table-stock">${stock}</span></td>
                <td>
                    <input type="number" class="quantity"
                           value="${quantity}" min="1" max="${stock}"
                           data-id="${item.productId}" data-size="${item.size}"
                           data-price="${price}" />
                </td>
                <td><span class="table-total">₱${total}</span></td>
                <td>
                    <button class="delete-btn" data-id="${item.productId}" data-size="${item.size}">
                        <i class="fi fi-rs-trash table-trash"></i>
                    </button>
                </td>
            </tr>
        `;

            cartTable.append(row);
        }
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
            input.closest("tr").find(".table-total").text("₱0");
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

        // Recalculate total
        const priceText = input
            .closest("tr")
            .find(".table-price")
            .text()
            .replace("₱", "")
            .trim();
        const price = parseFloat(priceText);
        const finalQty = parseInt(input.val(), 10);
        const total = isNaN(finalQty) ? 0 : price * finalQty;

        input.closest("tr").find(".table-total").text(`₱${total}`);

        updateCheckoutButtonState();
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // CHECKOUT FUNCTION
$("#btn-checkout").on("click", async function () {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "./user_authentication.html";
    return;
  }

  const userRef = doc(chandriaDB, "userAccounts", user.uid);

  try {
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
  }
});    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // DELETE CART ITEM FUNCTION
    let itemToRemove = null;
    
    $(document).on("click", ".delete-btn", function () {
        const productId = $(this).data("id");
        const size = $(this).data("size");
        
        // Store the item details for removal
        itemToRemove = { productId, size, element: $(this) };
        
        // Show confirmation modal
        $("#remove-modal").css("display", "flex");
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

            // REMOVING TABLE ITEM
            const tableRow = element.closest("tr");
            tableRow.remove();

            notyf.success("Cart item removed.");

            // Update cart count
            await updateCartCount();

            // Hide modal and clear stored item
            $("#remove-modal").hide();
            itemToRemove = null;

        } catch (error) {
            console.error("Error deleting cart item: ", error);
            alert("Failed to remove item.");
            $("#remove-modal").hide();
            itemToRemove = null;
        }
    });

    // Modal "No" button - cancel removal
    $("#remove-no").on("click", function () {
        $("#remove-modal").hide();
        itemToRemove = null;
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
                const totalCount = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

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
