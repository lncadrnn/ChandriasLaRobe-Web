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
        ]    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // AUTHENTICATION MODAL FUNCTIONS
    function showAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    function hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }    // Authentication modal event listeners
    $(document).on('click', '#auth-modal-close, #auth-modal-cancel', function() {
        hideAuthModal();
    });

    $(document).on('click', '#auth-modal-login', function() {
        window.location.href = './user_authentication.html';
    });

    // Close modal when clicking outside
    $(document).on('click', '#auth-modal', function(e) {
        if (e.target === this) {
            hideAuthModal();
        }
    });

    // Close modal on escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAuthModal();
        }
    });

    // Make showAuthModal globally accessible
    window.showAuthModal = showAuthModal;

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
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
                    <span class="product-category">${product.category}</span>                    <a href="./details.html" data-id="${product.id}">
                        <h3 class="product-title">${product.name}</h3>
                    </a>

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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
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
        // If user is not logged in, show authentication modal
        if (!user) {
            showAuthModal();
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
    
    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // QUICK VIEW MODAL FUNCTIONALITY    // Quick View button click handler
    $(document).on("click", ".action-btn[aria-label='Quick View']", async function (e) {
        e.preventDefault();
        
        console.log('Quick View button clicked'); // Debug log
        
        // Try multiple ways to get the product ID
        const $productItem = $(this).closest('.product-item');
        console.log('Product item found:', $productItem.length > 0); // Debug log
        
        let productId = $productItem.find('[data-id]').first().data('id');
        console.log('Product ID attempt 1:', productId); // Debug log
        
        // If not found, try looking for the cart button's data-id
        if (!productId) {
            productId = $productItem.find('.cart-btn[data-id]').data('id');
            console.log('Product ID attempt 2 (cart button):', productId); // Debug log
        }
        
        // If still not found, try looking for the product link's data-id
        if (!productId) {
            productId = $productItem.find('a[data-id]').data('id');
            console.log('Product ID attempt 3 (product link):', productId); // Debug log
        }
        
        // If still not found, try looking for any element with data-id
        if (!productId) {
            productId = $productItem.find('*[data-id]').first().data('id');
            console.log('Product ID attempt 4 (any element):', productId); // Debug log
        }
        
        console.log('Final Product ID found:', productId); // Debug log
        
        if (!productId) {
            console.error('Product ID not found');
            console.log('Product item HTML:', $productItem.html()); // Debug log
            alert('Product ID not found. Please check the console for details.'); // User feedback
            return;
        }

        // Show loading state
        openQuickViewModal();
        showQuickViewLoading();

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const product = docSnap.data();
                populateQuickViewModal(product, productId);
                hideQuickViewLoading();
            } else {
                console.error("Product not found");
                notyf.error("Product not found");
                closeQuickViewModal();
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            notyf.error("Failed to load product details");
            closeQuickViewModal();
        }
    });    // Function to populate quick view modal with product data
    function populateQuickViewModal(product, productId) {
        // Restore the original details HTML structure if it was replaced by loading
        if ($('.quick-view-loading').length > 0) {
            $('.quick-view-details').html(`
                <div class="quick-view-header">
                    <h2 id="quick-view-title" class="quick-view-product-title">Product Name</h2>
                    <span id="quick-view-category" class="quick-view-category">Category</span>
                </div>
                <div class="quick-view-price">
                    <span id="quick-view-price" class="quick-view-new-price">₱0</span>
                    <span class="quick-view-period">/24hr</span>
                </div>
                <div class="quick-view-description">
                    <p id="quick-view-desc" class="quick-view-desc-text">Product description will appear here...</p>
                </div>
                <div class="quick-view-features">
                    <div class="quick-view-feature">
                        <i class="fi fi-rs-clothes-hanger"></i>
                        <span>Free Fitting Service</span>
                    </div>
                    <div class="quick-view-feature">
                        <i class="fi fi-rs-sparkles"></i>
                        <span>Pre-Cleaned & Sanitized</span>
                    </div>
                    <div class="quick-view-feature">
                        <i class="fi fi-rs-running"></i>
                        <span>Ready-to-Wear</span>
                    </div>
                </div>                <div class="quick-view-meta">
                    <div class="quick-view-color">
                        <span class="quick-view-label">Color:</span>
                        <div id="quick-view-color-indicator" class="quick-view-color-circle"></div>
                    </div>
                    <div class="quick-view-code">
                        <span class="quick-view-label">Product Code:</span>
                        <span id="quick-view-product-code" class="quick-view-code-text">-</span>
                    </div>
                </div>
                <div class="quick-view-actions">
                    <button id="quick-view-add-to-cart" class="quick-view-btn quick-view-btn-primary">
                        <i class="fi fi-rs-shopping-bag-add"></i>
                        <span>Add to Rent</span>
                    </button>
                    <button id="quick-view-view-details" class="quick-view-btn quick-view-btn-secondary">
                        <i class="fi fi-rs-eye"></i>
                        <span>View Full Details</span>
                    </button>
                </div>
            `);
        }
        
        // Set main image and thumbnails
        $('#quick-view-main-img').attr('src', product.frontImageUrl || '');
        $('.quick-view-thumbnail').eq(0).attr('src', product.frontImageUrl || '');
        $('.quick-view-thumbnail').eq(1).attr('src', product.backImageUrl || '');
          // Set product details
        $('#quick-view-title').text(product.name || '');
        $('#quick-view-category').text(product.category || '');
        $('#quick-view-price').text(`₱ ${product.price || '0'}`);
        $('#quick-view-desc').text(product.description || 'No description available');
          // Set product metadata
        $('#quick-view-product-code').text(product.code || 'N/A');
        
        // Set button data attributes
        $('#quick-view-add-to-cart').attr('data-id', productId);
        $('#quick-view-view-details').attr('data-id', productId);
        
        // Set color if available
        if (product.color) {
            $('#quick-view-color-indicator').css('background-color', product.color);
        }
        
        // Set features (customize based on your product structure)
        const features = [
            { icon: 'fi-rs-truck', text: 'Free delivery within Metro Manila' },
            { icon: 'fi-rs-refresh', text: '24/7 customer support' },
            { icon: 'fi-rs-shield-check', text: 'Quality guaranteed' },
            { icon: 'fi-rs-time-check', text: 'Flexible rental periods' }
        ];
        
        const $featuresContainer = $('.quick-view-features');
        $featuresContainer.empty();
        features.forEach(feature => {
            $featuresContainer.append(`
                <div class="quick-view-feature">
                    <i class="${feature.icon}"></i>
                    <span>${feature.text}</span>
                </div>
            `);
        });
    }    // Function to open quick view modal
    function openQuickViewModal() {
        console.log('Opening quick view modal'); // Debug log
        $('.quick-view-modal-container').addClass('show');
        $('body').css('overflow', 'hidden');
        
        // Set first thumbnail as active
        $('.quick-view-thumbnail').removeClass('active');
        $('.quick-view-thumbnail').eq(0).addClass('active');
        
        console.log('Quick view modal opened, has show class:', $('.quick-view-modal-container').hasClass('show')); // Debug log
    }    // Function to close quick view modal
    function closeQuickViewModal() {
        $('.quick-view-modal-container').removeClass('show');
        $('body').css('overflow', 'auto');
    }

    // Function to show loading state in quick view modal
    function showQuickViewLoading() {
        console.log('Showing quick view loading state'); // Debug log
        $('.quick-view-details').html(`
            <div class="quick-view-loading">
                <div class="spinner"></div>
                <p>Loading product details...</p>
            </div>
        `);
        $('.quick-view-images img').attr('src', '');
        console.log('Loading state applied'); // Debug log
    }

    // Function to hide loading state in quick view modal
    function hideQuickViewLoading() {
        // Loading state is removed when populateQuickViewModal is called
        // This function exists for consistency but the actual hiding is done in populateQuickViewModal
        console.log('Hiding quick view loading state'); // Debug log
    }// Close modal when clicking close button or backdrop
    $(document).on('click', '.quick-view-close', closeQuickViewModal);
    $(document).on('click', '.quick-view-modal-container', function(e) {
        if (e.target === this) {
            closeQuickViewModal();
        }
    });

    // Prevent modal from closing when clicking modal content
    $(document).on('click', '.quick-view-content', function(e) {
        e.stopPropagation();
    });    // Thumbnail image switching
    $(document).on('click', '.quick-view-thumbnail', function() {
        const newSrc = $(this).attr('src');
        $('#quick-view-main-img').attr('src', newSrc);
        
        // Update active thumbnail
        $('.quick-view-thumbnail').removeClass('active');
        $(this).addClass('active');
    });    // Quick view "Add to Rent" button click handler
    $(document).on('click', '#quick-view-add-to-cart', async function(e) {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const button = $(this);
        const productId = button.data('id');
        
        if (!productId) {
            notyf.error("Product not found.");
            return;
        }

        // Disable button and show loading state
        const originalText = button.find('span').text();
        button.prop('disabled', true);
        button.find('span').text('Adding...');

        try {
            // Get product data to find available sizes
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                notyf.error("Product not found.");
                return;
            }

            const productData = docSnap.data();
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

            // Add to cart with first available size and quantity 1
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return;
            }

            const userData = userSnap.data();
            const currentCart = userData.added_to_cart || [];

            // Check if the same product with the same size is already in the cart
            const index = currentCart.findIndex(
                item => item.productId === productId && item.size === selectedSize
            );

            if (index !== -1) {
                // If found, increment the quantity
                currentCart[index].quantity += 1;
                await updateDoc(userRef, { added_to_cart: currentCart });
                notyf.success(`Updated quantity for ${productData.name} (${selectedSize})`);
            } else {
                // If not found, add a new item to the cart
                await updateDoc(userRef, {
                    added_to_cart: arrayUnion({
                        productId,
                        size: selectedSize,
                        quantity: 1
                    })
                });
                notyf.success(`Added ${productData.name} (${selectedSize}) to cart!`);
            }

            // Update cart count and product display
            await updateCartCount();
            await displayProducts(user);
            
        } catch (error) {
            console.error("Error adding to cart: ", error);
            notyf.error("An error occurred. Please try again.");
        } finally {
            // Re-enable button
            button.prop('disabled', false);
            button.find('span').text(originalText);
        }

        // Close quick view modal
        closeQuickViewModal();
    });

    // Quick view "View Full Details" button click handler
    $(document).on('click', '#quick-view-view-details', function(e) {
        e.preventDefault();
        const productId = $(this).data('id');
        
        // Store product ID and navigate to details page
        localStorage.setItem("selectedProductId", productId);
        window.location.href = "./details.html";
    });

    // Close modal with Escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeQuickViewModal();
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
});
