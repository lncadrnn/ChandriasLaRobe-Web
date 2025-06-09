/**
 * Centralized Quick View Modal Functionality
 * Provides consistent quick view functionality across all pages
 */

// Global quick view configuration
const QUICK_VIEW_CONFIG = {
    modalId: 'quick-view-modal',
    loadingDelay: 300,
    fadeSpeed: 300
};

// Global variables
let currentQuickViewProduct = null;
let allProducts = [];
let allAdditionals = [];

/**
 * Initialize quick view modal HTML structure
 */
function initQuickViewModal() {
    // Check if modal already exists
    if ($('#' + QUICK_VIEW_CONFIG.modalId).length > 0) {
        return;
    }

    const modalHtml = `
        <div id="${QUICK_VIEW_CONFIG.modalId}" class="quick-view-modal-container">
            <div class="quick-view-modal">
                <button class="quick-view-close" id="quick-view-close">
                    &times;
                </button>
                
                <!-- Loading Spinner -->
                <div class="quick-view-loading" id="quick-view-loading">
                    <div class="quick-view-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <p class="loading-text">Loading product details...</p>
                </div>
                
                <div class="quick-view-content" id="quick-view-content" style="display: none;">
                    <div class="quick-view-images">
                        <div class="quick-view-main-image">
                            <img
                                id="quick-view-main-img"
                                src=""
                                alt="Product Image"
                                class="quick-view-img"
                            />
                        </div>
                        <div class="quick-view-thumbnail-container">
                            <img
                                id="quick-view-front-thumb"
                                src=""
                                alt="Front View"
                                class="quick-view-thumbnail active"
                            />
                            <img
                                id="quick-view-back-thumb"
                                src=""
                                alt="Back View"
                                class="quick-view-thumbnail"
                            />
                        </div>
                    </div>
                    <div class="quick-view-details">
                        <div class="quick-view-header">
                            <h2
                                id="quick-view-title"
                                class="quick-view-product-title"
                            >
                                Product Name
                            </h2>
                            <span
                                id="quick-view-category"
                                class="quick-view-category"
                                >Category</span
                            >
                        </div>
                        <div class="quick-view-price">
                            <span
                                id="quick-view-price"
                                class="quick-view-new-price"
                                >₱0</span
                            >
                            <span class="quick-view-period">/ Rent</span>
                        </div>
                        <div class="quick-view-description">
                            <p
                                id="quick-view-desc"
                                class="quick-view-desc-text"
                            >
                                Product description will appear here...
                            </p>
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
                        </div>
                        <div class="quick-view-meta">
                            <div class="quick-view-color">
                                <span class="quick-view-label">Color:</span>
                                <div
                                    id="quick-view-color-indicator"
                                    class="quick-view-color-circle"
                                ></div>
                            </div>
                            <div class="quick-view-code">
                                <span class="quick-view-label"
                                    >Product Code:</span
                                >
                                <span
                                    id="quick-view-product-code"
                                    class="quick-view-code-text"
                                    >-</span
                                >
                            </div>
                        </div>
                        <div class="quick-view-actions">
                            <button
                                id="quick-view-add-to-cart"
                                class="quick-view-btn quick-view-btn-primary"
                            >
                                <i class="fi fi-rs-shopping-bag-add"></i>
                                <span>Book Appointment</span>
                            </button>
                            <button
                                id="quick-view-details-btn"
                                class="quick-view-btn quick-view-btn-secondary"
                            >
                                <i class="fi fi-rs-eye"></i>
                                <span>View Full Details</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    $('body').append(modalHtml);
}

/**
 * Open quick view modal for a product
 * @param {string} productId - Product ID to display
 */
async function openQuickView(productId) {
    try {
        // Ensure modal exists
        initQuickViewModal();

        const modal = $("#" + QUICK_VIEW_CONFIG.modalId);
        const loadingElement = $("#quick-view-loading");
        const contentElement = $("#quick-view-content");
        
        // Show modal with loading state
        modal.addClass("show").show();
        document.body.style.overflow = "hidden";
        
        // Show loading spinner and hide content
        loadingElement.removeClass("hidden").show();
        contentElement.hide();
        
        // Find product in our loaded data
        let productData = null;
        
        // Check if global product arrays exist
        if (typeof allProducts !== 'undefined' && allProducts.length > 0) {
            productData = allProducts.find(p => p.id === productId);
        }
        
        if (!productData && typeof allAdditionals !== 'undefined' && allAdditionals.length > 0) {
            productData = allAdditionals.find(p => p.id === productId);
        }
        
        // If product not found in arrays, try Firebase
        if (!productData && typeof chandriaDB !== 'undefined') {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
            
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
        }, QUICK_VIEW_CONFIG.loadingDelay);
        
    } catch (error) {
        console.error('Error loading product for quick view:', error);
        
        // Show error notification if notyf is available
        if (typeof notyf !== 'undefined') {
            notyf.error('Failed to load product details');
        } else {
            alert('Failed to load product details');
        }
        
        closeQuickView();
    }
}

/**
 * Populate quick view modal with product data
 * @param {Object} product - Product data
 * @param {string} productId - Product ID
 */
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
    
    // Update color indicator
    if ($("#quick-view-color-indicator").length && product.color) {
        $("#quick-view-color-indicator").css('backgroundColor', product.color);
    }
    
    // Handle "Add to Cart" button for additionals
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
    $("#quick-view-details-btn").data('product-id', productId);
}

/**
 * Initialize thumbnail click functionality
 */
function initQuickViewThumbnails() {
    $(".quick-view-thumbnail").off("click").on("click", function() {
        const newSrc = $(this).attr('src');
        $("#quick-view-main-img").attr('src', newSrc);
        
        $(".quick-view-thumbnail").removeClass('active');
        $(this).addClass('active');
    });
}

/**
 * Close quick view modal
 */
function closeQuickView() {
    $("#" + QUICK_VIEW_CONFIG.modalId).removeClass("show").hide();
    document.body.style.overflow = "";
    currentQuickViewProduct = null;
}

/**
 * Handle view details button click
 */
function handleViewDetails() {
    const productId = $(this).data('product-id');
    if (productId) {
        // Determine the correct path based on current location
        const currentPath = window.location.pathname;
        let detailsPath = 'details.html';
        
        if (currentPath.includes('/chandriahomepage/') || currentPath.endsWith('index.html')) {
            detailsPath = currentPath.includes('/chandriahomepage/') ? 'details.html' : 'chandriahomepage/details.html';
        }
        
        window.location.href = `${detailsPath}?id=${productId}`;
    }
}

/**
 * Initialize quick view event listeners
 */
function initQuickViewEventListeners() {
    // Initialize modal if it doesn't exist
    initQuickViewModal();
    
    // Close button click
    $(document).on("click", "#quick-view-close", closeQuickView);
    
    // View details button click
    $(document).on("click", "#quick-view-details-btn", handleViewDetails);
    
    // Click outside modal to close
    $(document).on("click", function(e) {
        if ($(e.target).hasClass("quick-view-modal-container")) {
            closeQuickView();
        }
    });
    
    // Escape key to close
    $(document).on("keydown", function(e) {
        if (e.key === "Escape" && $("#" + QUICK_VIEW_CONFIG.modalId).hasClass("show")) {
            closeQuickView();
        }
    });
    
    // Quick view button clicks (delegated event handling)
    $(document).on("click", ".quick-view-btn-trigger, .product-quick-view, [data-action='quick-view']", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = $(this).data('product-id') || $(this).closest('.product-item').data('product-id');
        if (productId) {
            openQuickView(productId);
        }
    });
}

/**
 * Set product data for quick view (useful for pages that load products)
 * @param {Array} products - Array of products
 * @param {Array} additionals - Array of additional items
 */
function setQuickViewData(products = [], additionals = []) {
    allProducts = products;
    allAdditionals = additionals;
}

/**
 * Add product to cart from quick view
 * @param {string} productId - Product ID to add
 */
async function addToCartFromQuickView(productId) {
    try {
        // Check if user is authenticated
        if (typeof auth === 'undefined' || !auth.currentUser) {
            if (typeof showAuthModal === 'function') {
                showAuthModal();
            } else {
                alert('Please sign in to add items to cart');
            }
            return;
        }
        
        const button = $("#quick-view-add-to-cart");
        const originalText = button.html();
        
        // Show loading state
        button.prop('disabled', true).html('<i class="fi fi-rs-spinner btn-spinner"></i> Adding...');
        
        // Add to cart logic here (implement based on your existing cart functionality)
        if (typeof addToCart === 'function') {
            await addToCart(productId);
        } else {
            console.warn('addToCart function not found');
        }
        
        // Restore button state
        button.prop('disabled', false).html(originalText);
        
        // Show success notification
        if (typeof notyf !== 'undefined') {
            notyf.success('Item added to cart successfully!');
        }
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        // Restore button state
        const button = $("#quick-view-add-to-cart");
        button.prop('disabled', false);
        
        // Show error notification
        if (typeof notyf !== 'undefined') {
            notyf.error('Failed to add item to cart');
        } else {
            alert('Failed to add item to cart');
        }
    }
}

// Export functions for global use
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.initQuickViewModal = initQuickViewModal;
window.setQuickViewData = setQuickViewData;
window.addToCartFromQuickView = addToCartFromQuickView;
window.currentQuickViewProduct = currentQuickViewProduct;

// Auto-initialize when document is ready
$(document).ready(function() {
    initQuickViewEventListeners();
    
    // Initialize add to cart button functionality
    $(document).on("click", "#quick-view-add-to-cart", function(e) {
        e.preventDefault();
        const productId = $(this).data('product-id');
        if (productId) {
            addToCartFromQuickView(productId);
        }
    });
});
