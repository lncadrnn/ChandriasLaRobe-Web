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
    let currentActiveTab = 'all';
    let selectedCategories = [];
    let currentSort = 'default';
    let searchQuery = '';
    let currentQuickViewProduct = null;
    
    // Initialize shop
    init();
    
    async function init() {
        try {
            showShopLoader();
            await Promise.all([
                loadAllProducts(),
                loadAllAdditionals(),
                updateCartCount(),
                initializeEventListeners()
            ]);
            
            // Initialize with all products
            applyFiltersAndSort();
            
            // Update cart button status after products are loaded
            setTimeout(() => {
                updateAllCartButtonStatus();
            }, 500);
            
            hideShopLoader();
        } catch (error) {
            console.error("Error initializing shop:", error);
            hideShopLoader();
            showError("Failed to load shop. Please refresh the page.");
        }
    }
    
    // Loader functions
    function showShopLoader() {
        $("#shop-loader").removeClass("hidden").show();
    }

    function hideShopLoader() {
        // Add small delay to ensure smooth transition
        setTimeout(() => {
            $("#shop-loader").addClass("hidden");
        }, 100);
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
    }

    // Initialize all event listeners
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

        // Quick view modal
        $(document).on("click", ".action-btn[aria-label='Quick View']", handleQuickViewClick);
        $("#quick-view-close").on("click", closeQuickView);
        $("#quick-view-view-details").on("click", handleViewDetails);
        $("#quick-view-add-to-cart").on("click", handleQuickViewAddToCart);

        // Circular cart button functionality
        $(document).on("click", ".circular-cart-btn", handleCircularCartClick);

        // Cart modal (existing modal functionality)
        $(document).on("click", ".action-btn[aria-label='Add to Rent List']", handleAddToCartClick);
        $(document).on("click", ".add-to-cart-btn", handleAddToCartClick);
        $("#btn-close").on("click", closeCartModal);
        $("#btn-rent").on("click", handleAddToCart);

        // Size selection in cart modal
        $(document).on("click", ".size-link", handleSizeSelection);

        // Authentication modal
        $("#auth-modal-close, #auth-modal-cancel").on("click", hideAuthModal);
        $("#auth-modal-login").on("click", () => {
            window.location.href = "user_authentication.html";
        });

        // Close dropdowns when clicking outside
        $(document).on("click", function(e) {
            if (!$(e.target).closest(".filter-dropdown").length) {
                $("#category-dropdown").removeClass("show");
            }
            if (!$(e.target).closest(".sort-dropdown").length) {
                $("#sort-dropdown").removeClass("show");
            }
        });

        // Close modals when clicking outside
        $(document).on("click", function(e) {
            if ($(e.target).hasClass("quick-view-modal-container")) {
                closeQuickView();
            }
            if ($(e.target).hasClass("cart-modal-container")) {
                closeCartModal();
            }
        });
    }

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
    }

    // Create product HTML
    function createProductHTML(product) {
        const availableSizes = product.size ? Object.keys(product.size).join(", ") : "N/A";
        const categoryDisplay = product.category || "Item";
        const price = product.price ? `₱ ${product.price}` : "Price available in-store";
        const imageUrl = product.frontImageUrl || product.imageUrl || "assets/img/placeholder.jpg";
        const backImageUrl = product.backImageUrl || imageUrl;

        return `
        <div class="product-item">
            <div class="product-banner">
                <a href="details.html?id=${product.id}" class="product-images">
                    <img src="${imageUrl}" alt="${product.name || "Product"}" class="product-img default">
                    <img src="${backImageUrl}" alt="${product.name || "Product"}" class="product-img hover">
                </a>
                  <div class="product-actions">
                    <a href="#" class="action-btn" aria-label="Quick View" data-product-id="${product.id}">
                        <i class="fi fi-rs-eye"></i>
                    </a>
                    <a href="#" class="action-btn" aria-label="Add to Rent List" data-product-id="${product.id}">
                        <i class="fi fi-rs-heart"></i>
                    </a>
                </div>
                
                <div class="product-badge">
                    <span class="badge">Available</span>                </div>
            </div>
            <div class="product-content">
                <span class="product-category">${categoryDisplay}</span>
                <a href="details.html?id=${product.id}">
                    <h3 class="product-title">${product.name || "Untitled Product"}</h3>
                </a>
                <div class="product-price-section">
                    <div class="product-price flex">
                        <span class="new-price">${price}${product.price ? ' / rent' : ''}</span>
                    </div>
                    ${!product.isAdditional ? `
                    <button class="circular-cart-btn" data-product-id="${product.id}" data-in-cart="false">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M18,6A6,6,0,0,0,6,6H0V21a3,3,0,0,0,3,3H21a3,3,0,0,0,3-3V6ZM12,2a4,4,0,0,1,4,4H8A4,4,0,0,1,12,2ZM22,21a1,1,0,0,1-1,1H3a1,1,0,0,1-1-1V8H6v2H8V8h8v2h2V8h4Z"/>
                        </svg>
                    </button>` : ''}
                </div>
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
    }

    // Quick View Modal functionality
    async function handleQuickViewClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = $(this).data("product-id");
        if (!productId) return;
        
        await openQuickView(productId);
    }

    async function openQuickView(productId) {
        try {
            const modal = $("#quick-view-modal");
            const loadingElement = $("#quick-view-loading");
            const contentElement = $("#quick-view-content");
            
            // Show modal with loading state
            modal.addClass("show").show();
            document.body.style.overflow = "hidden";
            
            // Show loading spinner and hide content
            loadingElement.removeClass("hidden").show();
            contentElement.hide();
            
            // Find product in our loaded data
            let productData = allProducts.find(p => p.id === productId);
            if (!productData) {
                productData = allAdditionals.find(p => p.id === productId);
            }
            
            if (!productData) {
                // Fallback: fetch from Firebase
                const productDoc = await getDoc(doc(chandriaDB, "products", productId));
                if (productDoc.exists()) {
                    productData = { id: productId, ...productDoc.data() };
                } else {
                    const additionalDoc = await getDoc(doc(chandriaDB, "additionals", productId));
                    if (additionalDoc.exists()) {
                        productData = { id: productId, ...additionalDoc.data(), isAdditional: true };
                    }
                }
            }
            
            if (!productData) {
                throw new Error('Product not found');
            }
            
            currentQuickViewProduct = productData;
            
            // Populate modal with product data
            populateQuickViewModal(productData, productId);
            
            // Hide loading spinner and show content
            setTimeout(() => {
                loadingElement.hide();
                contentElement.show();
            }, 300);
            
        } catch (error) {
            console.error('Error loading product for quick view:', error);
            notyf.error('Failed to load product details');
            closeQuickView();
        }
    }
    
    function populateQuickViewModal(product, productId) {
        // Update images
        const mainImg = $("#quick-view-main-img");
        const frontThumb = $("#quick-view-front-thumb");
        const backThumb = $("#quick-view-back-thumb");
        
        const frontImage = product.frontImageUrl || product.imageUrl || 'assets/img/placeholder.jpg';
        const backImage = product.backImageUrl || frontImage;
        
        mainImg.attr('src', frontImage);
        frontThumb.attr('src', frontImage);
        backThumb.attr('src', backImage);
        
        // Update product details
        $("#quick-view-title").text(product.name || 'Untitled Product');
        $("#quick-view-category").text(product.category || 'Item');
        $("#quick-view-price").text(product.price ? `₱${product.price}` : '₱0');
        $("#quick-view-desc").text(product.description || 'No description available for this product.');
        $("#quick-view-product-code").text(product.code || 'N/A');
        
        if ($("#quick-view-color-indicator").length && product.color) {
            $("#quick-view-color-indicator").css('backgroundColor', product.color);
        }
        
        // Hide "Add to Rent" button for additionals
        const addToCartBtn = $("#quick-view-add-to-cart");
        if (product.isAdditional) {
            addToCartBtn.hide();
        } else {
            addToCartBtn.show();
        }
        
        // Initialize thumbnail functionality
        initQuickViewThumbnails();
        
        // Store product ID for actions
        addToCartBtn.data('product-id', productId);
        $("#quick-view-view-details").data('product-id', productId);
    }

    function initQuickViewThumbnails() {
        $(".quick-view-thumbnail").off("click").on("click", function() {
            const newSrc = $(this).attr('src');
            $("#quick-view-main-img").attr('src', newSrc);
            
            $(".quick-view-thumbnail").removeClass('active');
            $(this).addClass('active');
        });
    }

    function closeQuickView() {
        $("#quick-view-modal").removeClass("show").hide();
        document.body.style.overflow = "";
        currentQuickViewProduct = null;
    }

    function handleViewDetails() {
        const productId = $(this).data('product-id');
        if (productId) {
            window.location.href = `details.html?id=${productId}`;
        }
    }

    async function handleQuickViewAddToCart() {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }
        
        const productId = $(this).data('product-id');
        if (!productId || !currentQuickViewProduct) return;
        
        // For additionals, add directly to cart
        if (currentQuickViewProduct.isAdditional) {
            await addAdditionalToCart(productId);
            return;
        }
        
        // For regular products, we need size selection - close quick view and open cart modal
        closeQuickView();
        await openCartModal(productId);
    }

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
    }

    // Cart Modal functionality (existing modal in shop.html)
    async function handleAddToCartClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
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
        }
    }

    // Authentication modal functions
    function showAuthModal() {
        $("#auth-modal").addClass("show").show();
    }

    function hideAuthModal() {
        $("#auth-modal").removeClass("show").hide();
    }

    // Cart count function
    async function updateCartCount() {
        try {
            const user = auth.currentUser;
            if (!user) {
                $("#cart-count").text("0");
                return;
            }
            
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                $("#cart-count").text("0");
                return;
            }
            
            const cartItems = userSnap.data().added_to_cart || [];
            const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
            $("#cart-count").text(totalItems.toString());
            
        } catch (error) {
            console.error("Error updating cart count:", error);
            $("#cart-count").text("0");
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
        }
    }

    // Update cart button status for all products
    async function updateAllCartButtonStatus() {
        const user = auth.currentUser;
        if (!user) {
            // If no user, set all buttons to not-in-cart state
            $(".circular-cart-btn").each(function() {
                $(this).attr("data-in-cart", "false").removeClass("loading");
            });
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                $(".circular-cart-btn").each(function() {
                    $(this).attr("data-in-cart", "false").removeClass("loading");
                });
                return;
            }
            
            const cartItems = userSnap.data().added_to_cart || [];
            const cartProductIds = new Set(cartItems.map(item => item.productId));
            
            $(".circular-cart-btn").each(function() {
                const productId = $(this).data("product-id");
                const isInCart = cartProductIds.has(productId);
                $(this).attr("data-in-cart", isInCart.toString()).removeClass("loading");
            });
            
        } catch (error) {
            console.error("Error updating cart button status:", error);
            $(".circular-cart-btn").each(function() {
                $(this).attr("data-in-cart", "false").removeClass("loading");
            });
        }
    }

    // Handle circular cart button click
    async function handleCircularCartClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
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
                // Add to cart - find product data to get available size
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
                
                // Find first available size
                let selectedSize = "One Size";
                if (productData.size) {
                    const availableSizes = Object.entries(productData.size).filter(([size, stock]) => stock > 0);
                    if (availableSizes.length > 0) {
                        selectedSize = availableSizes[0][0];
                    } else {
                        notyf.error("Product is out of stock.");
                        return;
                    }
                }
                
                // Check if same product/size combination already exists
                const existingIndex = currentCart.findIndex(
                    item => item.productId === productId && item.size === selectedSize
                );
                
                if (existingIndex !== -1) {
                    // Update quantity
                    currentCart[existingIndex].quantity = (currentCart[existingIndex].quantity || 1) + 1;
                    await updateDoc(userRef, { added_to_cart: currentCart });
                } else {
                    // Add new item
                    await updateDoc(userRef, {
                        added_to_cart: arrayUnion({
                            productId,
                            size: selectedSize,
                            quantity: 1
                        })
                    });
                }
                
                button.attr("data-in-cart", "true");
                notyf.success("Added to cart!");
            }
            
            // Update cart count
            await updateCartCount();
            
        } catch (error) {
            console.error("Error updating cart:", error);
            notyf.error("An error occurred. Please try again.");
        } finally {            button.removeClass("loading");
        }
    }
    
    // Handle authentication state changes
    onAuthStateChanged(auth, async function (user) {
        await updateCartCount();
        await updateAllCartButtonStatus();
        
        if (user) {
            // User is signed in
            console.log("User signed in:", user.uid);
        } else {
            // User is signed out
            console.log("User signed out");
        }
    });

    // Mobile hamburger menu functionality
    $("#hamburger-menu").on("click", function() {
        $(this).toggleClass("active");
        $("#mobile-nav-menu").toggleClass("active");
    });

    // Close mobile menu when clicking on links
    $(".mobile-nav-link").on("click", function() {
        $("#hamburger-menu").removeClass("active");
        $("#mobile-nav-menu").removeClass("active");
    });
});