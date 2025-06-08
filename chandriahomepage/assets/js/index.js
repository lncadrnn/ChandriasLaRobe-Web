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
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // Function to create modernized no-products card HTML
    function createNoProductsCard(title, message, actionText = "Browse Shop", actionLink = "chandriahomepage/shop.html") {
        return `
        <div class="no-products-container">
            <div class="no-products-card">
                <div class="no-products-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 11H19L18 21H6L5 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3 class="no-products-title">${title}</h3>
                <p class="no-products-message">${message}</p>
                <a href="${actionLink}" class="no-products-action">
                    ${actionText}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </a>
            </div>
        </div>
        `;
    }

    // Function to create product HTML (returns a string like the original)
    function createProductHTML(product, productId) {
        const availableSizes = product.size
            ? Object.keys(product.size).join(", ")
            : "N/A";        const categoryDisplay = product.category || "Clothing";

        const price = product.price
            ? `₱ ${product.price}`
            : "Price available in-store";return `
        <div class="product-item">
            <div class="product-banner">
                <a href="chandriahomepage/details.html?id=${productId}" class="product-images">
                    <img src="${
                        product.frontImageUrl ||
                        "chandriahomepage/assets/img/placeholder.jpg"
                    }" alt="${
                        product.name || "Product"
                    }" class="product-img default">
                    ${
                        product.backImageUrl
                            ? `<img src="${product.backImageUrl}" alt="${
                                  product.name || "Product"
                              }" class="product-img hover">`
                            : ""
                    }
                </a>                
                <div class="product-actions">
                    <button class="action-btn quick-view-btn" aria-label="Quick View" data-product-id="${productId}">
                        <i class="fi fi-rs-eye"></i>
                    </button>
                    <a href="#" class="action-btn" aria-label="Add to Favorites">
                        <i class="fi fi-rs-heart"></i>
                    </a>
                </div>
                  <div class="price-tag">${price}</div>
                <div class="product-color-indicator" style="background-color: ${product.color || '#f8f9fa'}" title="${product.colorName || product.color || 'Color'}" data-product-id="${productId}"></div>            </div>
            <div class="product-content">                <div class="product-header">
                    <div class="product-info">
                        <span class="product-category">${categoryDisplay}</span>
                        <h3 class="product-title">${
                            product.name || "Untitled Product"
                        }</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
    }

    // Function to load fresh products (most recent)
    async function loadFreshProducts() {
        try {
            const $freshContainer = $("#fresh-products-container");
            if ($freshContainer.length === 0) return;

            $freshContainer.html(`
                <div class="products-loading">
                    <div class="spinner"></div>
                    <p>Loading fresh products...</p>
                </div>
            `);

            const productsQuery = query(
                collection(chandriaDB, "products"),
                orderBy("createdAt", "desc"),
                limit(4)
            );

            const querySnapshot = await getDocs(productsQuery);

            if (querySnapshot.empty) {
                $freshContainer.html(
                    createNoProductsCard(
                        "No Fresh Products", 
                        "We're currently updating our fresh collection. Check back soon for new arrivals!",
                        "Explore All Products"
                    )
                );
                return;
            }

            let productsHTML = "";
            querySnapshot.forEach(doc => {
                const productData = doc.data();
                if (productData.frontImageUrl && productData.name) {
                    productsHTML += createProductHTML(productData, doc.id);
                }
            });

            if (productsHTML === "") {
                $freshContainer.html(
                    createNoProductsCard(
                        "No Fresh Products", 
                        "We're currently updating our fresh collection. Check back soon for new arrivals!",
                        "Explore All Products"
                    )
                );
            } else {
                $freshContainer.html(productsHTML);
            }
        } catch (error) {
            console.error("Error loading fresh products:", error);
            $("#fresh-products-container").html(`
                <div class="products-error">
                    <p>Unable to load fresh products. Please try again later.</p>
                </div>
            `);
        }
    }

    // Function to load hot products (price range based)
    async function loadHotProducts() {
        try {
            const $hotContainer = $("#hot-products-container");
            if ($hotContainer.length === 0) return;

            $hotContainer.html(`
                <div class="products-loading">
                    <div class="spinner"></div>
                    <p>Loading hot products...</p>
                </div>
            `);

            // Query products with price >= 3000 (considered "hot" high-end items)
            const querySnapshot = await getDocs(collection(chandriaDB, "products"));
            const hotProducts = [];

            querySnapshot.forEach(doc => {
                const productData = doc.data();
                const price = parseFloat(productData.price) || 0;
                if (price >= 3000 && productData.frontImageUrl && productData.name) {
                    hotProducts.push({ id: doc.id, ...productData, price });
                }
            });

            // Sort by price descending and limit to 4
            hotProducts.sort((a, b) => b.price - a.price);
            const limitedHotProducts = hotProducts.slice(0, 4);

            if (limitedHotProducts.length === 0) {
                $hotContainer.html(
                    createNoProductsCard(
                        "No Hot Products", 
                        "Our premium collection is currently being restocked. Discover other amazing pieces in our shop!",
                        "Browse Premium Collection"
                    )
                );
                return;
            }

            let productsHTML = "";
            limitedHotProducts.forEach(productData => {
                productsHTML += createProductHTML(productData, productData.id);
            });

            $hotContainer.html(productsHTML);
        } catch (error) {
            console.error("Error loading hot products:", error);
            $("#hot-products-container").html(`
                <div class="products-error">
                    <p>Unable to load hot products. Please try again later.</p>
                </div>
            `);
        }
    }

    // Function to load popular products (based on category popularity)
    async function loadPopularProducts() {
        try {
            const $popularContainer = $("#popular-products-container");
            if ($popularContainer.length === 0) return;

            $popularContainer.html(`
                <div class="products-loading">
                    <div class="spinner"></div>
                    <p>Loading popular products...</p>
                </div>
            `);

            // Get products from popular categories (Wedding Gown, Long Gown, Short Gown)
            const querySnapshot = await getDocs(collection(chandriaDB, "products"));
            const popularProducts = [];

            querySnapshot.forEach(doc => {
                const productData = doc.data();
                const category = productData.category || '';
                const popularCategories = ['Wedding Gown', 'Long Gown', 'Short Gown'];
                
                if (popularCategories.includes(category) && productData.frontImageUrl && productData.name) {
                    popularProducts.push({ id: doc.id, ...productData });
                }
            });

            // Limit to 4 products
            const limitedPopularProducts = popularProducts.slice(0, 4);

            if (limitedPopularProducts.length === 0) {
                $popularContainer.html(
                    createNoProductsCard(
                        "No Popular Products", 
                        "Our trending gowns are flying off the racks! Explore our full collection for more stunning options.",
                        "View All Gowns"
                    )
                );
                return;
            }

            let productsHTML = "";
            limitedPopularProducts.forEach(productData => {
                productsHTML += createProductHTML(productData, productData.id);
            });

            $popularContainer.html(productsHTML);
        } catch (error) {
            console.error("Error loading popular products:", error);
            $("#popular-products-container").html(`
                <div class="products-error">
                    <p>Unable to load popular products. Please try again later.</p>
                </div>
            `);
        }
    }

    // QUICK VIEW FUNCTIONALITY
    let currentQuickViewProduct = null;

    // Function to show details navigation loader
    function showDetailsNavigationLoader() {
        const loader = document.getElementById('details-navigation-loader');
        if (loader) {
            loader.classList.remove('hidden');
        }
    }

    // Function to open quick view modal
    async function openQuickView(productId) {
        try {
            const modal = document.getElementById('quick-view-modal');
            const loadingElement = document.getElementById('quick-view-loading');
            const contentElement = document.getElementById('quick-view-content');
            
            // Show modal with loading state
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Show loading spinner and hide content
            if (loadingElement) {
                loadingElement.classList.remove('hidden');
                loadingElement.style.display = 'flex';
            }
            if (contentElement) {
                contentElement.style.display = 'none';
            }
            
            // Fetch product data
            const productDoc = await getDoc(doc(chandriaDB, "products", productId));
            
            if (!productDoc.exists()) {
                throw new Error('Product not found');
            }
            
            const productData = productDoc.data();
            currentQuickViewProduct = { id: productId, ...productData };
            
            // Populate modal with product data
            populateQuickViewModal(productData, productId);
            
            // Hide loading spinner and show content after data is loaded
            setTimeout(() => {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                    loadingElement.classList.add('hidden');
                }
                if (contentElement) {
                    contentElement.style.display = 'grid';
                }
            }, 300); // Small delay to ensure smooth transition
            
        } catch (error) {
            console.error('Error loading product for quick view:', error);
            notyf.error('Failed to load product details');
            closeQuickView();
        }
    }

    // Function to close quick view modal
    function closeQuickView() {
        const modal = document.getElementById('quick-view-modal');
        const loadingElement = document.getElementById('quick-view-loading');
        const contentElement = document.getElementById('quick-view-content');
        
        modal.classList.remove('show');
        document.body.style.overflow = '';
        currentQuickViewProduct = null;
        
        // Reset modal state for next use
        if (loadingElement) {
            loadingElement.style.display = 'none';
            loadingElement.classList.add('hidden');
        }
        if (contentElement) {
            contentElement.style.display = 'none';
        }
    }

    // Function to populate quick view modal with product data
    function populateQuickViewModal(product, productId) {
        // Update images
        const mainImg = document.getElementById('quick-view-main-img');
        const frontThumb = document.getElementById('quick-view-front-thumb');
        const backThumb = document.getElementById('quick-view-back-thumb');
        
        if (mainImg) mainImg.src = product.frontImageUrl || 'chandriahomepage/assets/img/placeholder.jpg';
        if (frontThumb) frontThumb.src = product.frontImageUrl || 'chandriahomepage/assets/img/placeholder.jpg';
        if (backThumb) backThumb.src = product.backImageUrl || 'chandriahomepage/assets/img/placeholder.jpg';
        
        // Update product details
        const title = document.getElementById('quick-view-title');
        const category = document.getElementById('quick-view-category');
        const price = document.getElementById('quick-view-price');
        const description = document.getElementById('quick-view-desc');
        const productCode = document.getElementById('quick-view-product-code');
        const colorIndicator = document.getElementById('quick-view-color-indicator');
        
        if (title) title.textContent = product.name || 'Untitled Product';
        if (category) category.textContent = product.category || 'Clothing';
        if (price) price.textContent = product.price ? `₱${product.price}` : '₱0';
        if (description) description.textContent = product.description || 'No description available for this product.';
        if (productCode) productCode.textContent = product.code || 'N/A';
        if (colorIndicator && product.color) {
            colorIndicator.style.backgroundColor = product.color;
        }
        
        // Initialize thumbnail functionality
        initQuickViewThumbnails();
        
        // Initialize action buttons
        initQuickViewActions(productId);
    }

    // Function to initialize thumbnail switching
    function initQuickViewThumbnails() {
        const thumbnails = document.querySelectorAll('#quick-view-modal .quick-view-thumbnail');
        const mainImage = document.getElementById('quick-view-main-img');
        
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', () => {
                // Remove active class from all thumbnails
                thumbnails.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked thumbnail
                thumbnail.classList.add('active');
                
                // Update main image with thumbnail's src
                if (mainImage) {
                    mainImage.src = thumbnail.src;
                }
            });
        });
    }

    // Function to initialize quick view action buttons
    function initQuickViewActions(productId) {
        // Add to Cart button - DISABLED (button hidden via CSS)
        // Note: The Book Appointment functionality has been disabled for the index page
        
        // View Full Details button
        const fullDetailsBtn = document.querySelector('#quick-view-details-btn');
        if (fullDetailsBtn) {
            fullDetailsBtn.addEventListener('click', () => {
                // Show details navigation loader
                showDetailsNavigationLoader();
                
                // Close quick view modal
                closeQuickView();
                
                // Navigate after short delay
                setTimeout(() => {
                    window.location.href = `chandriahomepage/details.html?id=${productId}`;
                }, 300);
            });
        }
    }    // Initialize quick view event listeners
    function initQuickViewListeners() {
        // Event delegation for quick view buttons
        $(document).on('click', '.quick-view-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = $(this).data('product-id');
            if (productId) {
                openQuickView(productId);
            }
        });

        // Close modal events
        const modal = document.getElementById('quick-view-modal');
        const closeBtn = document.querySelector('#quick-view-modal .quick-view-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeQuickView);
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeQuickView();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                closeQuickView();
            }
        });
    }    // Initialize product card click navigation - DISABLED
    // Product cards no longer redirect to details.html when clicked
    function initProductCardClickNavigation() {
        // This function has been disabled to prevent product card clicks from redirecting to details.html
        // Users can still use action buttons (quick view, add to favorites) to interact with products
    }

    // Product Tabs functionality
    function initProductTabs() {
        const $tabs = $('.product-tab');
        const $tabContents = $('.product-tab-content');

        $tabs.on('click', function(e) {
            e.preventDefault();
            const targetTab = $(this).data('tab');
            
            // Remove active class from all tabs and contents
            $tabs.removeClass('active-tab');
            $tabContents.removeClass('active-tab');
            
            // Add active class to clicked tab
            $(this).addClass('active-tab');
            
            // Show corresponding content
            $(`#${targetTab}`).addClass('active-tab');
            
            // Load products for the selected tab if not already loaded
            if (targetTab === 'hot' && $('#hot-products-container').children().length === 0) {
                loadHotProducts();
            } else if (targetTab === 'popular' && $('#popular-products-container').children().length === 0) {
                loadPopularProducts();
            }
        });
    }

    // Initialize product tabs
    initProductTabs();    // Initialize quick view functionality
    initQuickViewListeners();

    // Initialize product card click navigation - DISABLED
    // initProductCardClickNavigation(); // Commented out to prevent product card clicks from redirecting to details.html

    // Smooth scrolling for anchor links
    $('a[href^="#"]').on("click", function (e) {
        e.preventDefault();
        const targetId = $(this).attr("href");
        const $targetElement = $(targetId);
        if ($targetElement.length) {
            $("html, body").animate(
                {
                    scrollTop: $targetElement.offset().top
                },
                500 // Duration in ms
            );
        }
    });

    // Load fresh products
    loadFreshProducts();
    
    // Load hot and popular products on page load
    loadHotProducts();
    loadPopularProducts();

    // Initialize cart count
    updateCartCount();

    // CART COUNT FUNCTION
    async function updateCartCount() {
        const user = auth.currentUser;

        const $cartCount = $("#cart-count");

        if (!user) {
            $cartCount.text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                const totalCount = cartItems.reduce(
                    (sum, item) => sum + (parseInt(item.quantity, 10) || 0),
                    0
                );
                $cartCount.text(totalCount);
            } else {
                $cartCount.text("0");
            }
        } catch (error) {
            console.error("Error fetching cart count: ", error);
            $cartCount.text("0");
        }
    }

    // HANDLE AUTH STATE
    onAuthStateChanged(auth, async function (user) {
        const $userAccountLink = $("#user-account-link");

        if (user) {
            // Check if user exists in adminAccounts
            const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists()) {
                // If user is admin, sign them out
                await signOut(auth);
                return;
            }

            if ($userAccountLink.length) {
                $userAccountLink.attr("href", "chandriahomepage/accounts.html");
            }
            localStorage.setItem("userEmail", user.email);
            await updateCartCount();        } else {
            if ($userAccountLink.length) {
                // Open auth modal instead of redirecting to standalone page
                $userAccountLink.attr("href", "#");
                $userAccountLink.click(function(e) {
                    e.preventDefault();
                    // Trigger auth modal
                    if (window.authModal) {
                        window.authModal.openModal();
                    }
                });
            }
            localStorage.removeItem("userEmail");
            await updateCartCount();
        }
    });
});
