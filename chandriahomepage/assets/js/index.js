import {
    appCredential,
    chandriaDB,
    getFirestore,
    collection,
    getDocs
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // DISPLAY PRODUCTS FUNCTION
    async function displayProducts() {
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));

        // FETCHING DATA FROM DATABASE
        querySnapshot.forEach(doc => {
            const data = doc.data();            // Generate random badge color
            const badgeColors = ['featured', 'new', 'popular', 'trending'];
            const randomBadge = badgeColors[Math.floor(Math.random() * badgeColors.length)];

            // DISPLAYING DATA TO TABLE
            const card = `
                <div class="product-item">
                    <div class="product-badge ${randomBadge}">${randomBadge}</div>
                    
                    <div class="product-banner">
                        <a href="/chandriahomepage/details.html" class="product-images" data-id="${doc.id}">
                            <img src="${data.frontImageUrl}" alt="" class="product-img default">
                            <img src="${data.backImageUrl}" alt="" class="product-img hover">
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
                        <span class="product-category">${data.category}</span>
                        <a href="/chandriahomepage/details.html" data-id="${doc.id}">
                            <h3 class="product-title">${data.productCode}</h3>
                        </a>
                        
                        <div class="product-price">
                            <span class="new-price shimmer">₱ ${data.prize} / rent</span>
                            <span class="old-price">₱ ${Math.floor(data.prize * 1.3)} / rent</span>
                        </div>

                        <a href="#" class="action-btn cart-btn" aria-label="Add to Rent List">
                            <i class="fi fi-rs-shopping-bag-add"></i>
                        </a>
                    </div>
                </div>
            `;

            // APPEND TO CONTAINER
            $(".featured-container").append(card);
        });
    }
    displayProducts();
});
