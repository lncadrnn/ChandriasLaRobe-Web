import {
    appCredential,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    auth,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    signOut,
    query,
    orderBy,
    limit,
    arrayUnion
} from "./sdk/chandrias-sdk.js";

// Import wishlist service
import wishlistService from "./wishlist-firebase.js";

$(document).ready(function () {
    // NOTYF for notifications
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // Global variables
    let allProducts = [];
    let allAdditionals = [];
    let filteredProducts = [];
    let currentPage = 1;
    const productsPerPage = 12;
    let currentActiveTab = 'all';    let selectedCategories = [];
    let currentSort = 'default';
    let searchQuery = '';
    
    // Initialize shop
    init();    // Function to wait for counts to be properly loaded
    async function waitForCountsToLoad() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
            
            const checkCounts = () => {
                attempts++;
                
                // Check if cart count and wishlist count elements exist and have been updated
                const cartCountElement = $("#cart-count");
                const wishlistCountElement = $("#wishlist-count");
                
                const cartCountExists = cartCountElement.length > 0;
                const wishlistCountExists = wishlistCountElement.length > 0;
                
                // Check if counts have been initialized (not loading state)
                const cartCountLoaded = cartCountExists && cartCountElement.text() !== "";
                const wishlistCountLoaded = wishlistCountExists && wishlistCountElement.text() !== "";
                
                console.log("Shop.js waitForCountsToLoad - Attempt", attempts, {
                    cartCountExists,
                    wishlistCountExists,
                    cartCountLoaded,
                    wishlistCountLoaded,
                    cartCount: cartCountElement.text(),
                    wishlistCount: wishlistCountElement.text()
                });
                
                // If both counts are loaded or we've reached max attempts, resolve
                if ((cartCountLoaded && wishlistCountLoaded) || attempts >= maxAttempts) {
                    console.log("Shop.js waitForCountsToLoad - Resolved after", attempts, "attempts");
                    resolve();
                } else {
                    // Check again after 100ms
                    setTimeout(checkCounts, 100);
                }
            };
            
            // Start checking immediately
            checkCounts();
        });
    }

    async function init() {
        try {
            // Show spinner using centralized system
            if (typeof showSpinner === 'function') {
                showSpinner('Loading products...', 'page-spinner');
            } else {
                showShopLoader();
            }
              await Promise.all([
                loadAllProducts(),
                loadAllAdditionals(),
                updateCartCount(),
                wishlistService.updateWishlistCountUI(), // Add wishlist count update
                initializeEventListeners()
            ]);
              // Initialize with all products
            applyFiltersAndSort();
            
            // Provide product data to centralized quick view system
            if (typeof setQuickViewData === 'function') {
                setQuickViewData(allProducts, allAdditionals);
            }
              // Update cart button status and heart button states after products are loaded
            setTimeout(() => {
                updateAllCartButtonStatus();
                updateHeartButtonStates();
            }, 500);
            
            // Wait for counts to be properly loaded before hiding spinner
            await waitForCountsToLoad();
            
        } catch (error) {
            console.error("Error initializing shop:", error);
            showError("Failed to load shop. Please refresh the page.");        } finally {
            // Always hide spinner after all operations complete with 1 second delay
            if (typeof hideSpinner === 'function') {
                hideSpinner('page-spinner', 1000); // Add 1 second delay
            } else {
                setTimeout(() => {
                    hideShopLoader();
                }, 1000); // Add 1 second delay for fallback
            }
        }
    }
    
    // Loader functions
    function showShopLoader() {
        $("#shop-loader").removeClass("hidden").show();
    }    function hideShopLoader(delay = 100) {
        // Add configurable delay to ensure smooth transition
        setTimeout(() => {
            $("#shop-loader").addClass("hidden");
        }, delay);
    }

    // Load all products from Firebase
    async function loadAllProducts() {
        try {
            const querySnapshot = await getDocs(collection(chandriaDB, "products"));
            allProducts = [];
            
            querySnapshot.forEach(doc => {
                const productData = doc.data();
                if (productData.frontImageUrl && productData.name) {
                    allProducts.push({ id: doc.id, ...productData });
                }
            });
            
            console.log(`Loaded ${allProducts.length} products`);
        } catch (error) {
            console.error("Error loading products:", error);
            throw error;
        }
    }

    // Load all additionals from Firebase
    async function loadAllAdditionals() {
        try {
            const querySnapshot = await getDocs(collection(chandriaDB, "additionals"));
            allAdditionals = [];
            
            querySnapshot.forEach(doc => {
                const additionalData = doc.data();
                if (additionalData.imageUrl && additionalData.name) {
                    allAdditionals.push({ id: doc.id, ...additionalData });
                }
            });
            
            console.log(`Loaded ${allAdditionals.length} additionals`);
        } catch (error) {
            console.error("Error loading additionals:", error);
            throw error;
        }
    }    // Initialize all event listeners
    function initializeEventListeners() {
        // Search functionality
        $("#product-search").on("input", handleSearch);
        $("#clear-search").on("click", clearSearch);

        // Filter dropdowns
        $("#category-filter-btn").on("click", toggleCategoryDropdown);
        $("#sort-filter-btn").on("click", toggleSortDropdown);

        // Category filter actions
        $("#clear-categories").on("click", clearCategoryFilters);
        $("#apply-categories").on("click", applyCategoryFilters);
        $(".category-checkbox").on("change", updateCategoryFilterText);

        // Sort options
        $(".sort-option").on("click", handleSortSelection);

        // Product tabs
        $(".product-tab").on("click", handleTabSwitch);

        // Quick view functionality now handled by centralized quick-view.js script

        // Circular cart button functionality
        $(document).on("click", ".circular-cart-btn, .enhanced-cart-btn, .add-to-cart-action-btn", handleCircularCartClick);
        
        // Add to favorites functionality
        $(document).on("click", ".add-to-favorites-btn", handleFavoritesClick);

        // Add to cart action button functionality (new button beside category/title)
        // $(document).on("click", ".add-to-cart-action-btn", handleAddToCartClick); // Now handled by handleCircularCartClick// Size and quantity controls
        $(document).on("change", ".size-selector", handleSizeChange);
        $(document).on("click", ".quantity-btn.plus-btn", handleQuantityIncrease);
        $(document).on("click", ".quantity-btn.minus-btn", handleQuantityDecrease);        // Color indicator tooltip
        $(document).on("click", ".product-color-indicator", handleColorIndicatorClick);        // Cart modal (existing modal functionality)
        $(document).on("click", ".action-btn[aria-label='Add to Favorites']", handleAddToCartClick);
        $(document).on("click", ".add-to-cart-btn", handleAddToCartClick);
        $("#btn-close").on("click", closeCartModal);
        $("#btn-rent").on("click", handleAddToCart);

        // Size selection in cart modal
        $(document).on("click", ".size-link", handleSizeSelection);        // Authentication modal
        $(".auth-close, #auth-modal-cancel").on("click", hideAuthModal);
        // Remove the login button handler since we're using the modal directly
        // No need to redirect to user_authentication.html anymore

        // Close dropdowns when clicking outside
        $(document).on("click", function(e) {
            if (!$(e.target).closest(".filter-dropdown").length) {
                $("#category-dropdown").removeClass("show");
            }
            if (!$(e.target).closest(".sort-dropdown").length) {
                $("#sort-dropdown").removeClass("show");
            }
        });        // Close modals when clicking outside
        $(document).on("click", function(e) {
            if ($(e.target).hasClass("cart-modal-container")) {
                closeCartModal();
            }
        });
    }
      // Handle size change in product card
    function handleSizeChange() {
        const productId = $(this).data("product-id");
        const newSize = $(this).val();
        const productCard = $(this).closest('.product-item');
        const quantityElement = productCard.find(".quantity-value");
        const plusButton = productCard.find(".plus-btn");
        
        // Show loading state
        productCard.addClass("is-loading");
        
        // Get product data to check stock
        let productData = allProducts.find(p => p.id === productId);
        
        // If we have the product data and a selected size, check stock limits
        if (productData && productData.size && newSize && productData.size[newSize]) {
            const maxStock = productData.size[newSize];
            let currentQuantity = parseInt(quantityElement.text()) || 1;
            
            // If current quantity exceeds available stock, adjust it
            if (currentQuantity > maxStock) {
                currentQuantity = maxStock;
                quantityElement.text(maxStock);
                notyf.warning(`Quantity adjusted to available stock for size ${newSize}: ${maxStock}`);
            }
            
            // Disable plus button if at max stock
            if (currentQuantity >= maxStock) {
                plusButton.prop("disabled", true).addClass("disabled");
            } else {
                plusButton.prop("disabled", false).removeClass("disabled");
            }
        }
        
        // Remove loading state after a short delay
        setTimeout(() => {
            productCard.removeClass("is-loading");
        }, 300);
    }
      // Handle quantity increase in product card
    function handleQuantityIncrease() {
        const productId = $(this).data("product-id");
        const productCard = $(this).closest('.product-item');
        const quantityElement = $(this).siblings(".quantity-value");
        const selectedSize = productCard.find('.size-selector').val();
        const minusBtn = productCard.find('.minus-btn');
        let currentQuantity = parseInt(quantityElement.text()) || 1;
        
        // Show loading animation
        productCard.addClass("is-loading");
        
        // Get product data to check stock
        let productData = allProducts.find(p => p.id === productId);
        
        // If we have the product data and a selected size, check stock limits
        if (productData && productData.size && selectedSize && productData.size[selectedSize]) {
            const maxStock = productData.size[selectedSize];
            if (currentQuantity < maxStock) {
                currentQuantity++;
                quantityElement.text(currentQuantity);
                
                // Enable minus button when quantity is more than 1
                minusBtn.prop("disabled", false).removeClass("disabled");
                
                // Disable plus button if at max stock
                if (currentQuantity >= maxStock) {
                    $(this).prop("disabled", true).addClass("disabled");
                }
            } else {
                notyf.error(`Maximum available stock for size ${selectedSize} is ${maxStock}`);
            }
        } else {
            // If we can't check stock, just increment (fallback)
            currentQuantity++;
            quantityElement.text(currentQuantity);
            
            // Enable minus button when quantity is more than 1
            minusBtn.prop("disabled", false).removeClass("disabled");
        }
        
        // Remove loading animation after a short delay
        setTimeout(() => {
            productCard.removeClass("is-loading");
        }, 300);
    }    // Handle quantity decrease in product card
    function handleQuantityDecrease() {
        const productId = $(this).data("product-id");
        const productCard = $(this).closest('.product-item');
        const quantityElement = $(this).siblings(".quantity-value");
        const selectedSize = productCard.find('.size-selector').val();
        const plusBtn = productCard.find('.plus-btn');
        let currentQuantity = parseInt(quantityElement.text()) || 1;
        
        // Show loading animation
        productCard.addClass("is-loading");
        
        // Get product data to check stock
        let productData = allProducts.find(p => p.id === productId);
        
        if (currentQuantity > 1) {
            currentQuantity--;
            quantityElement.text(currentQuantity);
            
            // Disable minus button when quantity reaches 1
            if (currentQuantity === 1) {
                $(this).prop("disabled", true).addClass("disabled");
            }
            
            // Enable plus button if previously disabled due to max stock
            if (productData && productData.size && selectedSize && productData.size[selectedSize]) {
                const maxStock = productData.size[selectedSize];
                if (currentQuantity < maxStock) {
                    plusBtn.prop("disabled", false).removeClass("disabled");
                }
            } else {
                plusBtn.prop("disabled", false).removeClass("disabled");
            }
        }
        
        // Remove loading animation after a short delay
        setTimeout(() => {
            productCard.removeClass("is-loading");        }, 300);
    }
      // Handle color indicator click
    function handleColorIndicatorClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const colorName = $(this).attr('title') || 'Color';
        const productId = $(this).data('product-id');
        
        // Create or get tooltip
        let tooltip = $('.color-tooltip');
        if (tooltip.length === 0) {
            $('body').append('<div class="color-tooltip"></div>');
            tooltip = $('.color-tooltip');
        }
        
        // Position tooltip near the color indicator
        const position = $(this).offset();
        tooltip.text(colorName)
            .css({
                'top': position.top - 30,
                'left': position.left - (tooltip.width() / 2) + 12,
                'opacity': 1,
                'visibility': 'visible'
            });
        
        // Hide tooltip after a short delay
        setTimeout(() => {
            tooltip.css({
                'opacity': 0,
                'visibility': 'hidden'
            });
        }, 2000);
    }    // Handle product card click navigation - DISABLED
    // Product cards no longer navigate on click, only the add-to-cart button does
    /*
    function handleProductCardClick(e) {
        // Don't navigate if clicking on action buttons, size selector, quantity controls, or cart button
        if ($(e.target).closest('.action-btn, .size-selector, .quantity-btn, .circular-cart-btn, .product-color-indicator').length > 0) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const productId = $(this).find('[data-product-id]').first().data('product-id');
        if (!productId) return;
        
        // Get product data
        let productData = allProducts.find(p => p.id === productId);
        if (!productData) {
            // Try to find in additionals
            productData = allAdditionals.find(p => p.id === productId);
        }
        
        if (productData) {
            // Store product data for details page
            localStorage.setItem('selectedProduct', JSON.stringify(productData));
            // Navigate to details page
            window.location.href = `details.html?id=${productId}`;
        }
    }
    */

    // Search functionality
    function handleSearch(e) {
        searchQuery = $(this).val().toLowerCase().trim();
        
        if (searchQuery) {
            $("#clear-search").show();
        } else {
            $("#clear-search").hide();
        }
        
        applyFiltersAndSort();
    }

    function clearSearch() {
        $("#product-search").val("");
        $("#clear-search").hide();
        searchQuery = "";
        applyFiltersAndSort();
    }

    // Filter dropdown functions
    function toggleCategoryDropdown() {
        $("#category-dropdown").toggleClass("show");
        $("#sort-dropdown").removeClass("show");
    }    function toggleSortDropdown() {
        $("#sort-dropdown").toggleClass("show");
        $("#category-dropdown").removeClass("show");
    }
    
    function clearCategoryFilters() {
        $(".category-checkbox").prop("checked", false);
        selectedCategories = [];
        updateCategoryFilterText();
        applyFiltersAndSort(); // Apply filters after clearing
    }

    function applyCategoryFilters() {
        $("#category-dropdown").removeClass("show");
        applyFiltersAndSort();
    }

    function updateCategoryFilterText() {
        const checkedBoxes = $(".category-checkbox:checked");
        const count = checkedBoxes.length;
        
        if (count === 0) {
            $("#category-filter-btn .filter-text").text("All Categories");
        } else if (count === 1) {
            $("#category-filter-btn .filter-text").text(checkedBoxes.first().data("category"));
        } else {
            $("#category-filter-btn .filter-text").text(`${count} Categories Selected`);
        }
        
        selectedCategories = checkedBoxes.map(function() {
            return $(this).data("category");
        }).get();
    }

    // Sort functionality
    function handleSortSelection(e) {
        e.preventDefault();
        
        $(".sort-option").removeClass("active");
        $(this).addClass("active");
        
        currentSort = $(this).data("sort");
        const sortText = $(this).find("span").text();
        $("#sort-filter-btn .sort-text").text(`Sort by: ${sortText}`);
        
        $("#sort-dropdown").removeClass("show");
        applyFiltersAndSort();
    }

    // Tab switching
    function handleTabSwitch(e) {
        e.preventDefault();
        
        $(".product-tab").removeClass("active-tab");
        $(this).addClass("active-tab");
        
        currentActiveTab = $(this).data("tab");
        currentPage = 1;
        applyFiltersAndSort();
    }

    // Main filter and sort application
    function applyFiltersAndSort() {
        let productsToShow = [];
        
        // Get products based on active tab
        if (currentActiveTab === 'all') {
            productsToShow = [...allProducts, ...allAdditionals.map(item => ({...item, isAdditional: true}))];
        } else if (currentActiveTab === 'clothing') {
            productsToShow = [...allProducts];
        } else if (currentActiveTab === 'additionals') {
            productsToShow = [...allAdditionals.map(item => ({...item, isAdditional: true}))];
        }
        
        // Apply search filter
        if (searchQuery) {
            productsToShow = productsToShow.filter(product => 
                (product.name && product.name.toLowerCase().includes(searchQuery)) ||
                (product.code && product.code.toLowerCase().includes(searchQuery)) ||
                (product.category && product.category.toLowerCase().includes(searchQuery)) ||
                (product.description && product.description.toLowerCase().includes(searchQuery))
            );
        }
        
        // Apply category filter
        if (selectedCategories.length > 0) {
            productsToShow = productsToShow.filter(product => 
                product.category && selectedCategories.includes(product.category)
            );
        }
        
        // Apply sorting
        productsToShow = sortProducts(productsToShow);
        
        filteredProducts = productsToShow;
        currentPage = 1;
        displayProducts();
        updatePagination();
        updateProductCount();
    }

    // Sort products based on current sort option
    function sortProducts(products) {
        switch (currentSort) {
            case 'name-asc':
                return products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            case 'name-desc':
                return products.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            case 'price-low':
                return products.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
            case 'price-high':
                return products.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
            default:
                return products;
        }
    }

    // Display products in grid    
    function displayProducts() {
        const container = $(".products-container");
        container.empty();
        
        if (filteredProducts.length === 0) {
            container.html(`
                <div class="no-products-found">
                    <div class="no-products-icon">
                        <i class="fi fi-rs-shopping-bag"></i>
                    </div>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                    <button class="btn btn-primary" onclick="location.reload()">Clear All Filters</button>
                </div>
            `);
            return;
        }
        
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const productsToDisplay = filteredProducts.slice(startIndex, endIndex);
        
        let productsHTML = "";
        productsToDisplay.forEach(product => {
            productsHTML += createProductHTML(product);
        });
          container.html(productsHTML);
        
        // Update cart button status after displaying products
        setTimeout(() => {
            updateAllCartButtonStatus();
        }, 100);
    }    // Create product HTML
    function createProductHTML(product) {
        // Debug: Log product data to check backImageUrl
        console.log('Product data:', {
            id: product.id,
            name: product.name,
            frontImageUrl: product.frontImageUrl,
            backImageUrl: product.backImageUrl
        });
        
        const availableSizes = product.size ? Object.keys(product.size).filter(size => product.size[size] > 0) : [];
        const categoryDisplay = product.category || "Item";
        const price = product.price ? `₱ ${product.price}` : "Price available in-store";
        const imageUrl = product.frontImageUrl || product.imageUrl || "assets/img/placeholder.jpg";
        const backImageUrl = product.backImageUrl || imageUrl;
        const colorHex = product.color || "#f8f9fa";
        
        // Create size options HTML
        let sizeOptionsHTML = '';
        if (availableSizes.length > 0 && !product.isAdditional) {
            // Create options with stock information
            const sizeOptions = availableSizes.map(size => {
                const stock = product.size[size];
                return `<option value="${size}" data-stock="${stock}">${size} (${stock})</option>`;
            }).join('');
            
            // Get initial stock for first size
            const initialSize = availableSizes[0];
            const initialStock = product.size[initialSize];
            
            // Determine stock class
            let stockClass = '';
            if (initialStock <= 3) stockClass = 'very-low-stock';
            else if (initialStock <= 5) stockClass = 'low-stock';
              // Modified layout without cart button
            sizeOptionsHTML = `
            <div class="product-size-options">
                <div class="size-selection">
                    <div class="size-selector-container">
                        <select class="size-selector" data-product-id="${product.id}">
                            ${sizeOptions}
                        </select>
                    </div>
                </div>
                <div class="quantity-selection">
                    <button class="quantity-btn minus-btn" data-product-id="${product.id}">-</button>
                    <span class="quantity-value" data-product-id="${product.id}">1</span>
                    <button class="quantity-btn plus-btn" data-product-id="${product.id}" ${initialStock <= 1 ? 'disabled' : ''}>+</button>
                </div>
            </div>`;
        }
        
        return `
        <div class="product-item">
            <div class="loading-state">
                <div class="loading-spinner"></div>
            </div>
            <div class="product-banner">                <a href="details.html?id=${product.id}" class="product-images">
                    <img src="${imageUrl}" alt="${product.name || "Product"}" class="product-img default">
                    <img src="${backImageUrl}" alt="${product.name || "Product"}" class="product-img hover">
                </a>                <div class="product-actions">                    <a href="#" class="action-btn quick-view-btn-trigger" aria-label="Quick View" data-product-id="${product.id}">
                        <i class="fi fi-rs-eye"></i>
                    </a>                    <button class="action-btn add-to-favorites-btn" aria-label="Add to Favorites" data-product-id="${product.id}">
                        <i class="bx bx-heart"></i>
                    </button>
                </div>
                
                <div class="price-tag">${price}</div>
                <div class="product-color-indicator" style="background-color: ${colorHex}" title="${product.colorName || 'Color'}" data-product-id="${product.id}"></div>
            </div>            <div class="product-content">                <div class="product-header">
                    <div class="product-info">
                        <span class="product-category">${categoryDisplay}</span>
                        <h3 class="product-title">${product.name || "Untitled Product"}</h3>
                    </div>
                    ${!product.isAdditional ? `
                    <div class="product-header-buttons">
                        <button class="add-to-cart-action-btn" data-product-id="${product.id}" data-in-cart="false" title="View Details">
                            <i class="fi fi-rs-shopping-bag-add"></i>
                        </button>
                        <button class="circular-cart-btn" data-product-id="${product.id}" data-in-cart="false" title="Add to Cart">
                            <i class="fi fi-rs-shopping-cart-add"></i>
                        </button>
                    </div>` : ''}
                </div>
                ${sizeOptionsHTML}
            </div>
        </div>
        `;
    }

    // Update product count display
    function updateProductCount() {
        const totalCount = filteredProducts.length;
        $(".total-products span").text(totalCount);
    }

    // Pagination functionality
    function updatePagination() {
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        const pagination = $("#pagination");
        pagination.empty();
        
        if (totalPages <= 1) {
            $(".pagination-container").hide();
            return;
        }
        
        $(".pagination-container").show();
        
        // Previous button
        if (currentPage > 1) {
            pagination.append(`
                <li><button class="pagination-btn prev-btn" data-page="${currentPage - 1}">
                    <i class="fi fi-rs-angle-left"></i>
                </button></li>
            `);
        }
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            pagination.append(`<li><button class="pagination-btn page-btn" data-page="1">1</button></li>`);
            if (startPage > 2) {
                pagination.append(`<li><span class="pagination-ellipsis">...</span></li>`);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            pagination.append(`
                <li><button class="pagination-btn page-btn ${activeClass}" data-page="${i}">${i}</button></li>
            `);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination.append(`<li><span class="pagination-ellipsis">...</span></li>`);
            }
            pagination.append(`<li><button class="pagination-btn page-btn" data-page="${totalPages}">${totalPages}</button></li>`);
        }
        
        // Next button
        if (currentPage < totalPages) {
            pagination.append(`
                <li><button class="pagination-btn next-btn" data-page="${currentPage + 1}">
                    <i class="fi fi-rs-angle-right"></i>
                </button></li>
            `);
        }
        
        // Update pagination info
        const startItem = (currentPage - 1) * productsPerPage + 1;
        const endItem = Math.min(currentPage * productsPerPage, filteredProducts.length);
        $("#pagination-info-text").text(`Showing ${startItem}-${endItem} of ${filteredProducts.length} products`);
        
        // Pagination click handlers
        $(".pagination-btn").on("click", function() {
            const page = parseInt($(this).data("page"));
            if (page && page !== currentPage) {
                currentPage = page;
                displayProducts();
                updatePagination();
                $("html, body").animate({ scrollTop: $(".products-container").offset().top - 100 }, 500);
            }
        });
    }    // Quick View functionality now handled by centralized quick-view.js
    // Remove duplicate implementation and use centralized system

    async function addAdditionalToCart(additionalId) {
        const user = auth.currentUser;
        if (!user) return;
        
        const button = $("#quick-view-add-to-cart");
        button.prop('disabled', true).html('<i class="fi fi-rs-spinner"></i> Adding...');
        
        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return;
            }
            
            await updateDoc(userRef, {
                added_to_cart: arrayUnion({
                    productId: additionalId,
                    size: "One Size",
                    quantity: 1
                })
            });
            
            notyf.success("Added to cart successfully!");
            await updateCartCount();
            closeQuickView();
            
        } catch (error) {
            console.error("Error adding to cart:", error);
            notyf.error("An error occurred. Please try again.");
        } finally {
            button.prop('disabled', false).html('<i class="fi fi-rs-shopping-bag-add"></i><span>Add to Rent</span>');
        }
    }    // Cart Modal functionality (existing modal in shop.html)
    async function handleAddToCartClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if this is the add-to-cart-action-btn (the large button beside product info)
        if ($(this).hasClass('add-to-cart-action-btn')) {
            const productId = $(this).data("product-id");
            if (productId) {
                // Redirect to details.html with the product ID
                window.location.href = `details.html?id=${productId}`;
                return;
            }
        }
        
        // For other add to cart buttons, check authentication and open modal
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }
        
        const productId = $(this).data("product-id");
        if (!productId) return;
        
        await openCartModal(productId);
    }

    async function openCartModal(productId) {
        try {
            // Find product data
            let productData = allProducts.find(p => p.id === productId);
            
            if (!productData) {
                // Fallback: fetch from Firebase
                const productDoc = await getDoc(doc(chandriaDB, "products", productId));
                if (!productDoc.exists()) {
                    notyf.error("Product not found.");
                    return;
                }
                productData = productDoc.data();
            }
            
            // Populate modal with product data
            $(".details-img.front-img").attr("src", productData.frontImageUrl);
            $(".details-small-img.front-img").attr("src", productData.frontImageUrl);
            $(".details-small-img.back-img").attr("src", productData.backImageUrl || productData.frontImageUrl);
            
            $("#product-name").text(productData.name);
            $("#product-price").text(productData.price);
            $("#product-description").text(productData.description);
            $("#product-code").text(productData.code);
            $("#product-color").css("background-color", productData.color);
            $("#product-id").val(productId);
            
            // Populate sizes
            const sizeList = $("#product-sizes");
            sizeList.empty();
            
            if (productData.size) {
                Object.entries(productData.size).forEach(([size, stock]) => {
                    const isAvailable = stock > 0;
                    const sizeClass = isAvailable ? "size-link" : "size-link size-unavailable";
                    sizeList.append(`
                        <li>
                            <a href="#" class="${sizeClass}" data-size="${size}" data-stock="${stock}">
                                ${size}
                            </a>
                        </li>
                    `);
                });
                
                // Auto-select first available size
                const firstAvailable = sizeList.find(".size-link:not(.size-unavailable)").first();
                if (firstAvailable.length) {
                    firstAvailable.addClass("size-active");
                    $("#size-available-stock").text(firstAvailable.data("stock"));
                }
            }
            
            // Show modal
            $(".cart-modal-container").show();
            
        } catch (error) {
            console.error("Error opening cart modal:", error);
            notyf.error("Error loading product details.");
        }
    }

    function closeCartModal() {
        $(".cart-modal-container").hide();
    }

    function handleSizeSelection(e) {
        e.preventDefault();
        
        if ($(this).hasClass("size-unavailable")) {
            return;
        }
        
        $(".size-link").removeClass("size-active");
        $(this).addClass("size-active");
        
        const stock = $(this).data("stock");
        $("#size-available-stock").text(stock);
        
        // Update quantity max
        const quantityInput = $("#rent-quantity");
        quantityInput.attr("max", stock);
        if (parseInt(quantityInput.val()) > stock) {
            quantityInput.val(Math.min(stock, 1));
        }
    }

    async function handleAddToCart() {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }
        
        const button = $("#btn-rent");
        const quantity = parseInt($("#rent-quantity").val()) || 1;
        const selectedSize = $(".size-active").text().trim();
        const productId = $("#product-id").val();
        
        if (!selectedSize) {
            notyf.error("Please select a size.");
            return;
        }
        
        if (quantity < 1) {
            notyf.error("Please enter a valid quantity.");
            return;
        }
        
        // Disable button and show loading
        button.prop('disabled', true);
        button.find('.btn-text').hide();
        button.find('.spinner').show();
        
        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return;
            }
            
            const data = userSnap.data();
            const currentCart = data.added_to_cart || [];
            
            // Check if the same product with same size exists
            const existingIndex = currentCart.findIndex(
                item => item.productId === productId && item.size === selectedSize
            );
            
            if (existingIndex !== -1) {
                // Update quantity
                currentCart[existingIndex].quantity = quantity;
                await updateDoc(userRef, { added_to_cart: currentCart });
                notyf.success("Cart item updated successfully.");
            } else {
                // Add new item
                await updateDoc(userRef, {
                    added_to_cart: arrayUnion({
                        productId,
                        size: selectedSize,
                        quantity
                    })
                });
                notyf.success("Added successfully to cart!");
            }
            
            await updateCartCount();
            closeCartModal();
            
        } catch (error) {
            console.error("Error updating cart:", error);
            notyf.error("An error occurred. Please try again.");
        } finally {
            // Re-enable button
            button.prop('disabled', false);
            button.find('.btn-text').show();
            button.find('.spinner').hide();
        }    }    // Authentication modal functions - Now handled by auth-modal.js module    // Debug function to check current state - TEMPORARY
    window.debugCartState = async function() {
        const user = auth.currentUser;
        console.log("=== CART DEBUG STATE ===");
        console.log("Current user:", user);
        
        if (user) {
            console.log("User ID:", user.uid);
            console.log("User email:", user.email);
            
            try {
                const userRef = doc(chandriaDB, "userAccounts", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    console.log("User document exists");
                    console.log("Cart items:", userData.added_to_cart || []);
                    
                    const cartItems = userData.added_to_cart || [];
                    const totalItems = cartItems.reduce((total, item) => {
                        console.log(`Item: ${item.productId}, Quantity: ${item.quantity || 1}`);
                        return total + (item.quantity || 1);
                    }, 0);
                    console.log("Total calculated items:", totalItems);
                } else {
                    console.log("User document does not exist in Firebase");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        } else {
            console.log("No user is currently authenticated");
        }
        console.log("Current cart count displayed:", $("#cart-count").text());
        console.log("=== END DEBUG ===");
    };

    // Debug function to test cart count updates manually
    window.testCartCount = async function() {
        console.log("=== TESTING CART COUNT UPDATE ===");
        console.log("Current cart count element:", $("#cart-count"));
        console.log("Current cart count text:", $("#cart-count").text());
        console.log("Current user:", auth.currentUser);
        
        if ($("#cart-count").length === 0) {
            console.error("Cart count element not found!");
            return;
        }
        
        // Test basic jQuery functionality
        $("#cart-count").text("TEST");
        console.log("Set cart count to TEST, current text:", $("#cart-count").text());
        
        // Test actual cart count update
        await updateCartCount();
        console.log("After updateCartCount, current text:", $("#cart-count").text());
        console.log("=== END TEST ===");
    };    // Cart count function
    async function updateCartCount() {
        try {
            const user = auth.currentUser;
            console.log("Shop.js updateCartCount - Current user:", user ? user.uid : "No user");
            
            if (!user) {
                console.log("Shop.js updateCartCount - No user authenticated, setting count to 0");
                $("#cart-count").text("0");
                return 0; // Return the count value
            }
            
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                console.log("Shop.js updateCartCount - User document does not exist");
                $("#cart-count").text("0");
                return 0; // Return the count value
            }
            
            const cartItems = userSnap.data().added_to_cart || [];
            console.log("Shop.js updateCartCount - Cart items:", cartItems);
            
            const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
            console.log("Shop.js updateCartCount - Total items calculated:", totalItems);
            
            $("#cart-count").text(totalItems.toString());
            return totalItems; // Return the count value
            
        } catch (error) {
            console.error("Error updating cart count:", error);
            $("#cart-count").text("0");
            return 0; // Return fallback count
        }
    }

    // Error handling
    function showError(message) {
        $(".products-container").html(`
            <div class="error-state">
                <div class="error-icon">
                    <i class="fi fi-rs-exclamation"></i>
                </div>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
            </div>
        `);
    }

    // Check if product is in user's cart
    async function isProductInCart(productId) {
        try {
            const user = auth.currentUser;
            if (!user) return false;
            
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) return false;
            
            const cartItems = userSnap.data().added_to_cart || [];
            return cartItems.some(item => item.productId === productId);
            
        } catch (error) {
            console.error("Error checking cart status:", error);
            return false;
        }    }
    
    // Update cart button status for all products
    async function updateAllCartButtonStatus() {
        const user = auth.currentUser;
        if (!user) {
            // If no user, set all buttons to not-in-cart state
            $(".circular-cart-btn, .enhanced-cart-btn, .add-to-cart-action-btn").each(function() {
                $(this).attr("data-in-cart", "false").removeClass("loading");
            });
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                $(".circular-cart-btn, .enhanced-cart-btn, .add-to-cart-action-btn").each(function() {
                    $(this).attr("data-in-cart", "false").removeClass("loading");
                });
                return;
            }
            
            const cartItems = userSnap.data().added_to_cart || [];
            const cartProductIds = new Set(cartItems.map(item => item.productId));
            
            $(".circular-cart-btn, .enhanced-cart-btn, .add-to-cart-action-btn").each(function() {
                const productId = $(this).data("product-id");
                const isInCart = cartProductIds.has(productId);
                $(this).attr("data-in-cart", isInCart.toString()).removeClass("loading");
            });
            
        } catch (error) {
            console.error("Error updating cart button status:", error);
            $(".circular-cart-btn, .enhanced-cart-btn, .add-to-cart-action-btn").each(function() {
                $(this).attr("data-in-cart", "false").removeClass("loading");
            });
        }
    }    
    // Handle circular cart button click
    async function handleCircularCartClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if this is the add-to-cart-action-btn (the large button beside product info)
        if ($(this).hasClass('add-to-cart-action-btn')) {
            const productId = $(this).data("product-id");
            if (productId) {
                // Redirect to details.html with the product ID
                window.location.href = `details.html?id=${productId}`;
                return;
            }
        }
        
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }
        
        const button = $(this);
        const productId = button.data("product-id");
        const isInCart = button.attr("data-in-cart") === "true";
        
        if (!productId) return;
        
        // Add loading state
        button.addClass("loading");
        
        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                notyf.error("User account not found.");
                return;
            }
            
            const currentCart = userSnap.data().added_to_cart || [];
            
            if (isInCart) {
                // Remove from cart - remove all instances of this product
                const updatedCart = currentCart.filter(item => item.productId !== productId);
                await updateDoc(userRef, { added_to_cart: updatedCart });
                
                button.attr("data-in-cart", "false");
                notyf.success("Removed from cart!");
                
            } else {
                // Get product data
                let productData = allProducts.find(p => p.id === productId);
                
                if (!productData) {
                    // Fallback: fetch from Firebase
                    const productDoc = await getDoc(doc(chandriaDB, "products", productId));
                    if (!productDoc.exists()) {
                        notyf.error("Product not found.");
                        return;
                    }
                    productData = productDoc.data();
                }
                  // Get selected size and quantity from the product card
                const productCard = button.closest('.product-item');
                let selectedSize = productCard.find('.size-selector').val();
                let selectedQuantity = parseInt(productCard.find('.quantity-value').text()) || 1;
                
                // Check stock for the selected size
                if (selectedSize && productData.size && productData.size[selectedSize]) {
                    const stock = productData.size[selectedSize];
                    if (stock <= 0) {
                        notyf.error(`Size ${selectedSize} is out of stock.`);
                        return;
                    }
                    
                    // Limit quantity to available stock
                    if (selectedQuantity > stock) {
                        selectedQuantity = stock;
                        notyf.warning(`Quantity limited to available stock: ${stock}`);
                    }
                }
                
                // Fallback to auto-selecting size if not available on the card
                if (!selectedSize && productData.size) {
                    const availableSizes = Object.entries(productData.size).filter(([size, stock]) => stock > 0);
                    if (availableSizes.length > 0) {
                        selectedSize = availableSizes[0][0];
                    } else {
                        notyf.error("Product is out of stock.");
                        return;
                    }
                } else if (!selectedSize) {
                    selectedSize = "One Size";
                }
                
                // Check if same product/size combination already exists
                const existingIndex = currentCart.findIndex(
                    item => item.productId === productId && item.size === selectedSize
                );
                
                if (existingIndex !== -1) {
                    // Update quantity
                    currentCart[existingIndex].quantity = (currentCart[existingIndex].quantity || 1) + selectedQuantity;
                    await updateDoc(userRef, { added_to_cart: currentCart });
                } else {
                    // Add new item
                    await updateDoc(userRef, {
                        added_to_cart: arrayUnion({
                            productId,
                            size: selectedSize,
                            quantity: selectedQuantity
                        })
                    });
                }
                
                button.attr("data-in-cart", "true");
                notyf.success(`Added to cart! Size: ${selectedSize}, Qty: ${selectedQuantity}`);
            }
            
            // Update cart count
            await updateCartCount();
            
        } catch (error) {
            console.error("Error updating cart:", error);
            notyf.error("An error occurred. Please try again.");
        } finally {
            button.removeClass("loading");
        }
    }
    
    // Handle favorites button click
    async function handleFavoritesClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }
        
        const button = $(this);
        const productId = button.data('product-id');
        
        if (!productId) return;
        
        // Add loading state with visual feedback
        button.addClass('loading');
        button.prop('disabled', true);
        const originalIcon = button.find('i').attr('class');
        button.find('i').removeClass().addClass('bx bx-loader-alt bx-spin');
        
        try {
            // Use the wishlist service to toggle the product
            const isNowInWishlist = await wishlistService.toggleWishlist(productId);
            
            // Update button state based on result
            if (isNowInWishlist) {
                button.find('i').removeClass().addClass('bx bxs-heart');
                button.addClass('favorited');
                // Add product item class for hover effect
                button.closest('.product-item').addClass('in-wishlist');
            } else {
                button.find('i').removeClass().addClass('bx bx-heart');
                button.removeClass('favorited');
                // Remove product item class for hover effect
                button.closest('.product-item').removeClass('in-wishlist');
            }
            
            // Update wishlist count
            await wishlistService.updateWishlistCountUI();
            
        } catch (error) {
            console.error("Error updating wishlist:", error);
            // Restore original icon on error
            button.find('i').removeClass().addClass(originalIcon);
        } finally {
            button.removeClass('loading');
            button.prop('disabled', false);
            
            // If there was an error, the icon was already restored above
            if (!button.find('i').hasClass('bx-heart') && !button.find('i').hasClass('bxs-heart')) {
                button.find('i').removeClass().addClass(originalIcon);
            }
        }    }    // Handle authentication state changes
    onAuthStateChanged(auth, async function (user) {
        console.log("Shop.js onAuthStateChanged - User:", user ? user.uid : "No user");
        
        try {
            // Update counts and button states when auth state changes
            await Promise.all([
                updateCartCount(),
                wishlistService.updateWishlistCountUI()
            ]);
            await updateAllCartButtonStatus();
            await updateHeartButtonStates();
            
            if (user) {
                // User is signed in
                console.log("User signed in:", user.uid);
            } else {
                // User is signed out
                console.log("User signed out");
                // Ensure counts are set to 0 when user is signed out
                $("#cart-count").text("0");
                $("#wishlist-count").text("0");
            }
        } catch (error) {
            console.error("Shop.js - Error updating counts:", error);
            // Set fallback values on error
            $("#cart-count").text("0");
            $("#wishlist-count").text("0");
        }
    });
    
    // Function to update heart button states based on current wishlist
    async function updateHeartButtonStates() {
        const user = auth.currentUser;
        
        if (!user) {
            // If no user, ensure all hearts are empty and remove wishlist classes
            $('.add-to-favorites-btn').each(function() {
                $(this).find('i').removeClass('bxs-heart').addClass('bx-heart');
                $(this).removeClass('favorited');
                $(this).closest('.product-item').removeClass('in-wishlist');
            });
            return;
        }

        try {
            const wishlist = await wishlistService.getUserWishlist();
            
            // Update each heart button based on wishlist status
            $('.add-to-favorites-btn').each(function() {
                const button = $(this);
                const productId = button.data('product-id');
                const productItem = button.closest('.product-item');
                
                if (!productId) return;
                
                // Check if this product is in wishlist
                const isInWishlist = wishlist.some(item => item.productId === productId);
                
                if (isInWishlist) {
                    button.find('i').removeClass('bx-heart').addClass('bxs-heart');
                    button.addClass('favorited');
                    productItem.addClass('in-wishlist');
                } else {
                    button.find('i').removeClass('bxs-heart').addClass('bx-heart');
                    button.removeClass('favorited');
                    productItem.removeClass('in-wishlist');
                }
            });
        } catch (error) {
            console.error("Error updating heart button states:", error);
            // On error, set all to "not favorited" as fallback
            $('.add-to-favorites-btn').each(function() {
                $(this).find('i').removeClass('bxs-heart').addClass('bx-heart');
                $(this).removeClass('favorited');
                $(this).closest('.product-item').removeClass('in-wishlist');
            });
        }
    }

    // Mobile hamburger menu functionality is handled by nav-bar.js
    // Removed conflicting implementation to ensure consistency across all pages
});