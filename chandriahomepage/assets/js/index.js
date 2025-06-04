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
    signOut,
    query,
    orderBy,
    limit
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // Function to create product HTML (returns a string like the original)
    function createProductHTML(product, productId) {
        const availableSizes = product.size
            ? Object.keys(product.size).join(", ")
            : "N/A";

        const categoryDisplay = product.category || "Clothing";

        const price = product.price
            ? `₱ ${product.price} / rent`
            : "Price available in-store";

        const badges = [
            "light-pink",
            "light-green",
            "light-orange",
            "light-blue"
        ];
        const randomBadge = badges[Math.floor(Math.random() * badges.length)];

        return `
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
                    <a href="chandriahomepage/details.html?id=${productId}" class="action-btn" aria-label="View Details">
                        <i class="fi fi-rs-eye"></i>
                    </a>
                    <a href="#" class="action-btn" aria-label="Add to Favorites">
                        <i class="fi fi-rs-heart"></i>
                    </a>
                </div>
                <div class="product-badge ${randomBadge}">New</div>
            </div>            
            <div class="product-content">
                <span class="product-category">${categoryDisplay}</span>
                <a href="chandriahomepage/details.html?id=${productId}">
                    <h3 class="product-title">${
                        product.name || "Untitled Product"
                    }</h3>
                </a>
                <div class="product-price">
                    <span class="new-price">${price}</span>
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

            $freshContainer.html(
                '<div class="loading">Loading fresh products...</div>'
            );

            const productsQuery = query(
                collection(chandriaDB, "products"),
                orderBy("createdAt", "desc"),
                limit(4)
            );

            const querySnapshot = await getDocs(productsQuery);

            if (querySnapshot.empty) {
                $freshContainer.html(
                    '<div class="no-products">No products available at the moment.</div>'
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
                    '<div class="no-products">No products available at the moment.</div>'
                );
            } else {
                $freshContainer.html(productsHTML);
            }
        } catch (error) {
            console.error("Error loading fresh products:", error);
            $("#fresh-products-container").html(
                '<div class="error">Unable to load products. Please try again later.</div>'
            );
        }
    }

    // Welcome Modal functionality
    function initWelcomeModal() {
        const $modal = $("#welcomeModal");
        const $closeBtn = $("#closeWelcomeModal");
        const $howItWorksLink = $("#howItWorksLink");

        const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");

        // Only show modal on first visit to index.html
        if (!hasSeenWelcome) {
            setTimeout(() => {
                $modal.addClass("show");
            }, 1000);
        }

        // Close modal function
        function closeModal() {
            $modal.removeClass("show");
            localStorage.setItem("hasSeenWelcome", "true");
        }

        // Show modal function
        function showModal() {
            $modal.addClass("show");
        }

        // Event listeners
        $closeBtn.on("click", closeModal);

        $howItWorksLink.on("click", function (e) {
            e.preventDefault();
            showModal();
        });

        // Close modal when clicking outside of it
        $modal.on("click", function (e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // Close modal with ESC key
        $(document).on("keydown", function (e) {
            if (e.key === "Escape" && $modal.hasClass("show")) {
                closeModal();
            }
        });
    }

    // Initialize welcome modal
    initWelcomeModal();

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
            await updateCartCount();
        } else {
            if ($userAccountLink.length) {
                $userAccountLink.attr(
                    "href",
                    "chandriahomepage/user_authentication.html"
                );
            }
            localStorage.removeItem("userEmail");
            await updateCartCount();
        }
    });
});
