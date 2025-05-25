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
        // Call displayProducts with user (can be null or a valid user object)
        await displayProducts(user);
        await updateCartCount();
    });

    // DISPLAY PRODUCTS FUNCTION
    async function displayProducts(user, page = 1) {
        let userCart = []; // Will hold the user's cart items if logged in

        // If user is logged in, fetch their cart from Firestore
        if (user) {
            const userRef = doc(chandriaDB, "userAccounts", user.uid); // User doc reference
            const userSnap = await getDoc(userRef); // Get user data

            if (userSnap.exists()) {
                const data = userSnap.data();
                userCart = data.added_to_cart || []; // Load cart items
            }
        }

        // Fetch all products
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));
        const products = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            products.push({ id: doc.id, ...data });
        });

        const totalItems = products.length;
        const itemsPerPage = 12;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Update total items text
        $(".total-products span").text(totalItems);

        // Clear the container and pagination
        $(".products-container").empty();
        $(".pagination").empty();

        // Paginate products
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

        paginatedProducts.forEach(product => {
            const isInCart = userCart.some(item => item.productId === product.id);
            const selectedClass = isInCart ? "selected" : "";

            // Build product card
            const card = `
            <div class="product-item">
                <div class="product-banner">
                    <a href="./details.html" class="product-images" data-id="${product.id}">
                        <img src="${product.frontImageUrl}" alt="" class="product-img default">
                        <img src="${product.backImageUrl}" alt="" class="product-img hover">
                    </a>
                    <div class="product-actions">
                        <a href="#" class="action-btn" aria-label="Quick View">
                            <i class="fi fi-rs-eye"></i>
                        </a>
                        <a href="#" class="action-btn" aria-label="Add to Favorites">
                            <i class="fi fi-rs-heart"></i>
                        </a>
                    </div>
                </div>

                <div class="product-content">
                    <span class="product-category">${product.category}</span>
                    <a href="./details.html" data-id="${product.id}">
                        <h3 class="product-title">${product.name}</h3>
                    </a>

                    <div class="product-rating">
                        <i class="fi fi-rs-star"></i><i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i><i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i>
                    </div>

                    <div class="product-price flex">
                        <span class="new-price">₱ ${product.price}/24hr</span>
                    </div>

                    <!-- Add to cart button -->
                    <button class="action-btn cart-btn ${selectedClass}" aria-label="Add to Rent List" data-id="${product.id}">
                        <i class="fi fi-rs-shopping-bag-add"></i>
                    </button>
                </div>
            </div>
        `;

            // Append to container
            $(".products-container").append(card);
        });

        // Generate pagination links
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === page ? "active" : "";
            $(".pagination").append(`
            <li><a href="#" class="pagination-link ${activeClass}" data-page="${i}">${i}</a></li>
        `);
        }

        // Add event listener for pagination links
        $(".pagination-link").on("click", function (e) {
            e.preventDefault();
            const selectedPage = parseInt($(this).data("page"), 10);
            displayProducts(user, selectedPage);
        });
    }
    
    // CARD CLICKED FUNCTION
    $(document).on("click", "a[data-id]", function () {
        const productId = $(this).data("id");
        localStorage.setItem("selectedProductId", productId);
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

    // VIEW CART DETAILS TOGGLER
    let currentSizeStock = {}; // Global variable for size:quantity map
    $(document).on("click", ".cart-btn", async function () {
        const user = auth.currentUser; // Get currently logged-in user
        // If user is not logged in, show a prompt to log in
        if (!user) {
            const goToLogin = confirm(
                "You need to log in to add items to your cart. Do you want to log in now?"
            );
            if (goToLogin) {
                window.location.href = "./user_authentication.html"; // Redirect to login page
            }
            return; // Stop execution if not logged in
        }

        $(".cart-modal-container").addClass("show");

        const productId = $(this).data("id");
        $("#product-id").val(productId);

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // SET IMAGE PREVIEWS
                $(".front-img").attr("src", data.frontImageUrl);
                $(".back-img").attr("src", data.backImageUrl);

                // SET TEXT OUTPUTS
                $("#product-name").text(data.name);
                $("#product-price").text(data.prize);
                $("#product-description").text(data.description);

                // SET COLOR
                $("#product-color").css({
                    "background-color": `${data.color}`
                });

                // SET PRODUCT CODE
                $("#product-code").text(data.code);

                // SET AVAILABLE SIZES
                const sizes = data.size || {};
                currentSizeStock = sizes;
                const $sizeList = $("#product-sizes");
                $sizeList.empty(); // Clear previous sizes
                $sizeList.data("sizes", sizes); // Store the size:qty map on the element

                Object.keys(sizes).forEach((size, index) => {
                    const quantity = sizes[size];
                    if (quantity > 0) {
                        $sizeList.append(`
            <li>
                <a href="#" class="size-link${
                    index === 0 ? " size-active" : ""
                }">${size}</a>
            </li>
        `);
                    }
                });

                // Show stock for first available size
                const firstSize = Object.keys(sizes).find(
                    size => sizes[size] > 0
                );
                if (firstSize) {
                    $("#size-available-stock").text(sizes[firstSize]);
                } else {
                    $("#size-available-stock").text("0");
                }
            } else {
                alert("Product not found.");
            }
        } catch (error) {
            console.error("Error getting product:", error);
            alert("Failed to load product." + error.message);
        }
    });

    // Handle size selection and show stock using event delegation
    $("#product-sizes").on("click", ".size-link", function (e) {
        e.preventDefault();

        // Remove active class from all size links
        $(".size-link").removeClass("size-active");

        // Add active class to the clicked size
        $(this).addClass("size-active");

        // Get the selected size text
        const selectedSize = $(this).text().trim();

        // Use global variable instead of .data()
        if (currentSizeStock[selectedSize] !== undefined) {
            const stock = currentSizeStock[selectedSize];
            $("#size-available-stock").text(stock);

            // Reset quantity to 1 if new stock is lower than current value or not 1
            const $qty = $("#rent-quantity");
            $qty.val(1).trigger("input").css("background-color", "#ffeb3b"); // yellow highlight
            setTimeout(() => {
                $qty.css("background-color", ""); // remove highlight
            }, 300);

            const currentQty = parseInt($qty.val(), 10) || 1;
            if (currentQty > stock || currentQty !== 1) {
                $qty.val(1);
            }
        } else {
            $("#size-available-stock").text("0");
            $("#rent-quantity").val(1).trigger("input"); // Reset to 1 when stock is 0 or invalid
        }
    });

    // FUNCTION FOR QUANTITY INPUT TYPE
    $(document).on("input", "#rent-quantity", function () {
        let val = $(this).val(); // Get the current value of the input

        // If the value is "0" or starts with one or more zeros (e.g., "00", "01"), reset it to "1"
        if (val === "0" || /^0+/.test(val)) {
            $(this).val("1"); // Set value to 1
            return; // Exit the function early
        }

        // Get the available stock for the selected size from the DOM (assumed to be in a span or element with that ID)
        const maxStock =
            parseInt($("#size-available-stock").text().trim(), 10) || 0;

        // Convert the current input value to a number, defaulting to 1 if it’s invalid or empty
        let currentVal = parseInt(val, 10) || 1;

        // If the input value exceeds the max stock, limit it to maxStock
        if (currentVal > maxStock) {
            $(this).val(maxStock); // Set the input value to the max stock available
        }
    });

    // DISABLE RENT BUTTON BASED ON FINAL VALUE
    $(document).on("input", "#rent-quantity", function () {
        // Remove non-digit characters like ".", "-" etc.
        let cleaned = $(this).val().replace(/\D/g, "");
        $(this).val(cleaned);

        const finalVal = parseInt(cleaned, 10);

        if (isNaN(finalVal) || finalVal < 1) {
            $("#btn-rent").addClass("disabled");
        } else {
            $("#btn-rent").removeClass("disabled");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // RENT BUTTON FUNCTION
    $("#btn-rent").on("click", async function (e) {
        const user = auth.currentUser; // Get the currently signed-in user
        const button = $(this); // Reference to the clicked button
        const textSpan = button.find(".btn-text");
        const spinner = button.find(".spinner");
        const productId = $("#product-id").val(); // Get product ID from hidden input
        const selectedSize = $(".size-active").text().trim(); // Get the currently selected size
        const quantity = parseInt($("#rent-quantity").val(), 10) || 1; // Get quantity input (default to 1 if invalid)

        const userRef = doc(chandriaDB, "userAccounts", user.uid); // Reference to the user's document in Firestore

        // Show spinner, hide text
        button.addClass("disabled");
        textSpan.hide();
        spinner.show();

        try {
            const userSnap = await getDoc(userRef); // Get the user's document snapshot
            if (!userSnap.exists()) return; // Exit if the user doc doesn't exist

            const data = userSnap.data(); // Get data from the document
            const currentCart = data.added_to_cart || []; // Get current cart array, or initialize empty if not present

            // Check if the same product with the same size is already in the cart
            const index = currentCart.findIndex(
                item =>
                    item.productId === productId && item.size === selectedSize
            );

            if (index !== -1) {
                // If found, update the quantity of that item
                currentCart[index].quantity = quantity;

                // Save the updated cart array back to Firestore
                await updateDoc(userRef, { added_to_cart: currentCart });

                // Show success notification
                notyf.success("Cart item updated successfully.");
            } else {
                // If not found, add a new item to the cart using arrayUnion
                await updateDoc(userRef, {
                    added_to_cart: arrayUnion({
                        productId,
                        size: selectedSize,
                        quantity
                    })
                });

                // Show a custom success notification
                notyf.open({
                    type: "custom-success",
                    message: "Added successfully to cart!"
                });
                $("#rent-quantity").val(1);
            }

            // Optional: Add a visual style to the button
            button.addClass("selected");

            // Update the cart count displayed in UI
            await updateCartCount();
            // UPDATE ADDED TO CART PRODUCT
            await displayProducts(user);
        } catch (error) {
            // Handle any errors that may occur during the Firestore operations
            console.error("Error updating cart: ", error);
            alert("An error occurred. Please try again.");
        } finally {
            // Always hide spinner and show text
            spinner.hide();
            textSpan.show();
            button.removeClass("disabled");
            $(".cart-modal-container").removeClass("show");
        }
    });

    // MODAL CLOSE TOGGLER
    $(".cart-modal-container, #btn-close").on("click", function (e) {
        $(".cart-modal-container").removeClass("show");
        $("#rent-quantity").val(1);
    });
    // PREVENT DEFAULTS
    $(".cart-modal").on("click", function (e) {
        e.stopPropagation();
    });
    //
});
