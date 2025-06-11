// Comprehensive Inventory Service for New Admin System
// Combines functionality from old admin inventory-service.js

$(document).ready(function () {
    // Initialize Notyf notifications
    const notyf = new Notyf({
        duration: 4000,
        position: { x: "center", y: "top" },
        dismissible: true,
        types: [
            {
                type: 'success',
                background: '#10b981',
                icon: {
                    className: 'bx bx-check-circle',
                    tagName: 'i',
                    text: ''
                }
            },
            {
                type: 'error',
                background: '#ef4444',
                icon: {
                    className: 'bx bx-error-circle',
                    tagName: 'i',
                    text: ''
                }
            }
        ]
    });

    // Make notyf globally available
    window.notyf = notyf;

    // ERROR MODAL FUNCTION
    function showErrorModal(message) {
        const modal = document.getElementById("error-modal");
        if (modal) {
            const msg = document.getElementById("error-modal-message");
            if (msg) msg.textContent = message;
            modal.classList.add("show");
        } else {
            // Fallback to notyf if modal doesn't exist
            notyf.error(message);
        }
    }

    // CONFIRM MODAL FUNCTION
    function showConfirmModal(message, onConfirm) {
        const modal = document.getElementById("confirm-modal");
        if (modal) {
            const msg = document.getElementById("confirm-modal-message");
            if (msg) msg.textContent = message;
            modal.classList.add("show");
            
            // Remove previous listeners
            const okBtn = document.getElementById("confirm-modal-ok");
            const cancelBtn = document.getElementById("confirm-modal-cancel");
            const closeBtn = document.querySelector(".confirm-close");
            
            function cleanup() {
                modal.classList.remove("show");
                if (okBtn) okBtn.removeEventListener("click", okHandler);
                if (cancelBtn) cancelBtn.removeEventListener("click", cancelHandler);
                if (closeBtn) closeBtn.removeEventListener("click", cancelHandler);
            }
            
            function okHandler() {
                cleanup();
                if (onConfirm) onConfirm();
            }
            
            function cancelHandler() {
                cleanup();
            }
            
            if (okBtn) okBtn.addEventListener("click", okHandler);
            if (cancelBtn) cancelBtn.addEventListener("click", cancelHandler);
            if (closeBtn) closeBtn.addEventListener("click", cancelHandler);
        } else {
            // Fallback to native confirm if modal doesn't exist
            if (confirm(message) && onConfirm) {
                onConfirm();
            }
        }
    }

    // RGB TO HEX FUNCTION
    function rgbToHex(rgb) {
        const rgbMatch = rgb.match(/\d+/g);
        return (
            "#" +
            rgbMatch
                .map(x => parseInt(x).toString(16).padStart(2, "0"))
                .join("")
        );
    }

    // CATEGORY & COLOR CODE MAPPINGS
    const categoryCodes = {
        "Ball Gown": "BGWN",
        "Long Gown": "LGWN",
        "Wedding Gown": "WGWN",
        "Fairy Gown": "FGWN",
        "Suits": "SUIT",
        // New admin format support
        "ball-gown": "BGWN",
        "long-gown": "LGWN",
        "wedding-gown": "WGWN",
        "fairy-gown": "FGWN",
        "suit": "SUIT"
    };

    const colorCodes = {
        Beige: "BEI",
        White: "WHI",
        Black: "BLK",
        Red: "RED",
        Blue: "BLU",
        Yellow: "YEL",
        Green: "GRN",
        Orange: "ORN",
        Purple: "PUR",
        Gray: "GRY",
        Brown: "BRN",
        Cream: "CRM",
        // Additional colors
        "Navy Blue": "NBL",
        Ivory: "IVO",
        Champagne: "CHA",
        Nude: "NUD",
        "Rose Gold": "RSG",
        Silver: "SIL",
        Gold: "GLD",
        Burgundy: "BUR",
        Emerald: "EME",
        "Royal Blue": "RBL",
        Pink: "PNK"
    };

    // GENERATE PRODUCT CODE FUNCTION
    async function generateProductCode(category, color) {
        const categoryCode = categoryCodes[category];
        const colorCode = colorCodes[color];
        
        if (!categoryCode || !colorCode) {
            console.warn("Missing category or color code:", { category, color });
            return null;
        }
        
        const baseCode = `${categoryCode}-${colorCode}`;

        try {
            // Check if Firebase is available
            if (typeof window.FirebaseInventory !== 'undefined') {
                const productsRef = window.FirebaseInventory.getProductsCollection();
                const q = window.FirebaseInventory.query(
                    productsRef,
                    window.FirebaseInventory.where("code", ">=", baseCode),
                    window.FirebaseInventory.where("code", "<", baseCode + "\uf8ff")
                );
                const snapshot = await window.FirebaseInventory.getDocs(q);

                const numbers = snapshot.docs.map(doc => {
                    const match = doc.data().code.match(/(\d{3})$/);
                    return match ? parseInt(match[1], 10) : 0;
                });

                const nextNumber = (Math.max(...numbers, 0) + 1)
                    .toString()
                    .padStart(3, "0");
                return `${baseCode}-${nextNumber}`;
            } else {
                // Fallback to timestamp-based code if Firebase is not available
                const timestamp = Date.now().toString().slice(-3);
                return `${baseCode}-${timestamp}`;
            }
        } catch (error) {
            console.error("Error generating product code:", error);
            // Fallback to timestamp-based code
            const timestamp = Date.now().toString().slice(-3);
            return `${baseCode}-${timestamp}`;
        }
    }

    // GENERATE ADDITIONAL PRODUCT CODE
    async function generateAdditionalCode(name) {
        if (!name || name.length < 3) return;

        const prefix = "ADD";
        const nameCode = name.trim().substring(0, 3).toUpperCase();
        const baseCode = `${prefix}-${nameCode}`;

        try {
            if (typeof window.FirebaseInventory !== 'undefined') {
                const additionalsRef = window.FirebaseInventory.getAdditionalsCollection();
                const q = window.FirebaseInventory.query(
                    additionalsRef,
                    window.FirebaseInventory.where("code", ">=", baseCode),
                    window.FirebaseInventory.where("code", "<", baseCode + "\uf8ff")
                );
                const snapshot = await window.FirebaseInventory.getDocs(q);

                const numbers = snapshot.docs.map(doc => {
                    const match = doc.data().code.match(/(\d{3})$/);
                    return match ? parseInt(match[1], 10) : 0;
                });

                const nextNumber = (Math.max(...numbers, 0) + 1)
                    .toString()
                    .padStart(3, "0");

                return `${baseCode}-${nextNumber}`;
            } else {
                const timestamp = Date.now().toString().slice(-3);
                return `${baseCode}-${timestamp}`;
            }
        } catch (error) {
            console.error("Error generating additional code:", error);
            const timestamp = Date.now().toString().slice(-3);
            return `${baseCode}-${timestamp}`;
        }
    }

    // UPLOAD IMAGE TO CLOUDINARY FUNCTION
    async function uploadImage(file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "UPLOAD_IMG");

        const response = await fetch(
            "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
    }

    // DELETE IMAGE FROM CLOUDINARY FUNCTION
    async function deleteImageFromCloudinary(publicId) {
        const timestamp = Math.floor(Date.now() / 1000);

        const signature = await generateLegacySignature(
            publicId,
            timestamp,
            LEGACY_CLOUDINARY_CONFIG.apiSecret
        );

        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("api_key", LEGACY_CLOUDINARY_CONFIG.apiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);

        const response = await fetch(getLegacyCloudinaryDeleteUrl(), {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (result.result !== "ok") {
            console.error("Cloudinary deletion failed:", result);
            throw new Error(`Image deletion failed: ${publicId}`);
        }

        return result;
    }

    // LOAD PRODUCTS FUNCTION
    async function loadProducts() {
        try {
            if (typeof window.FirebaseInventory === 'undefined') {
                console.warn('Firebase not available, using sample data');
                return;
            }

            const container = $("#products-container, #productsList");
            if (container.length === 0) {
                console.warn('Products container not found');
                return;
            }

            container.empty();
            
            const querySnapshot = await window.FirebaseInventory.getProducts();
            
            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No products found in inventory.</div>'
                );
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                if (!data.frontImageUrl || !data.code) {
                    console.warn("Product missing image or code:", doc.id, data);
                    return;
                }

                // Create product card - compatible with both old and new admin styles
                const sizeDisplay = data.size && typeof data.size === 'object' 
                    ? Object.keys(data.size).join(", ") 
                    : (data.sizes ? data.sizes : 'N/A');

                const card = $(`
                    <article class="card_article card product-item" data-id="${doc.id}">
                        <div class="card_data">
                            <span
                                class="card_color"
                                style="background-color: ${data.color}"
                                data-color="${data.color}"
                            ></span>
                            <img
                                src="${data.frontImageUrl}"
                                alt="image"
                                class="card_img"
                                loading="lazy"
                            />
                            <h2 class="card_title">${data.name}</h2>
                            <p class="card_size">Available Size: ${sizeDisplay}</p>
                            <p class="card_sleeve">Sleeve: ${data.sleeve || data.sleeves}</p>
                            <span class="card_category">${data.category}</span>
                            <div class="product-actions">
                                <a
                                    href="#"
                                    class="action-btn edit-btn"
                                    aria-label="Edit"
                                    data-open="viewProductModal"
                                    data-id="${doc.id}"
                                >
                                    <i class="fi fi-rr-edit"></i>
                                </a>
                                <a
                                    href="#"
                                    class="action-btn delete-btn"
                                    aria-label="Delete"
                                    data-id="${doc.id}"
                                >
                                    <i class="fi fi-rr-trash"></i>
                                </a>
                            </div>
                        </div>
                    </article>
                `);
                container.append(card);
            });

        } catch (err) {
            console.error("Error loading products from Firebase:", err);
            const container = $("#products-container, #productsList");
            container.append(
                '<div style="color:red;margin:2rem;">Failed to load products. Check your connection or Firebase rules.</div>'
            );
        }
    }

    // LOAD ADDITIONALS FUNCTION
    async function loadAdditionals() {
        try {
            if (typeof window.FirebaseInventory === 'undefined') {
                console.warn('Firebase not available for additionals');
                return;
            }

            const container = $("#additional-container, #additionalsList");
            if (container.length === 0) {
                console.warn('Additionals container not found');
                return;
            }

            container.empty();

            const querySnapshot = await window.FirebaseInventory.getAdditionals();

            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No additional products found.</div>'
                );
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();

                if (!data.imageUrl || !data.code) {
                    console.warn("Additional missing image or code:", doc.id, data);
                    return;
                }

                const card = $(`
                    <article class="card_article card additional-item" data-id="${doc.id}">
                        <div class="card_data">
                            <img
                                src="${data.imageUrl}"
                                alt="image"
                                class="card_img"
                                loading="lazy"
                            />
                            <h2 class="card_title">${data.name}</h2>
                            <p class="card_info">Price: ₱${data.price}</p>
                            <p class="card_info">
                                ${data.inclusions && data.inclusions.length
                                    ? "With Inclusion"
                                    : "Without Inclusion"
                                }
                            </p>
                            <span class="card_category">${data.code}</span>
                            <div class="product-actions">
                                <a
                                    href="#"
                                    class="action-btn edit-add-btn"
                                    data-open="updateAdditionalModal"
                                    aria-label="Edit"
                                    data-id="${doc.id}"
                                >
                                    <i class="fi fi-rr-edit"></i>
                                </a>
                                <a
                                    href="#"
                                    class="action-btn delete-add-btn"
                                    aria-label="Delete"
                                    data-id="${doc.id}"
                                >
                                    <i class="fi fi-rr-trash"></i>
                                </a>
                            </div>
                        </div>
                    </article>
                `);

                container.append(card);
            });

        } catch (err) {
            console.error("Error loading additional products:", err);
            const container = $("#additional-container, #additionalsList");
            container.append(
                '<div style="color:red;margin:2rem;">Failed to load additional products.</div>'
            );
        }
    }

    // ADD PRODUCT FUNCTION
    window.addProductFromForm = async function(formData) {
        try {
            // Show loading indicator
            const spinner = $("#spinner");
            const spinnerText = $("#spinner-text");
            
            if (spinner.length) {
                spinner.removeClass("d-none");
                spinnerText.text("Processing product...");
            }

            // Validate required fields
            if (!formData.name || !formData.category || !formData.rentalPrice) {
                throw new Error("Please fill in all required fields");
            }

            // Generate product code
            const productCode = await generateProductCode(formData.category, formData.color);
            if (!productCode) {
                throw new Error("Failed to generate product code");
            }

            // Upload images if provided
            let frontImageUrl = null, frontImageId = null;
            let backImageUrl = null, backImageId = null;

            if (formData.frontImage) {
                spinnerText.text("Uploading front image...");
                const frontResult = await uploadImage(formData.frontImage);
                frontImageUrl = frontResult.url;
                frontImageId = frontResult.public_id;
            }

            if (formData.backImage) {
                spinnerText.text("Uploading back image...");
                const backResult = await uploadImage(formData.backImage);
                backImageUrl = backResult.url;
                backImageId = backResult.public_id;
            }

            // Prepare product data
            const productData = {
                name: formData.name,
                code: productCode,
                price: parseFloat(formData.rentalPrice),
                size: formData.sizes || {},
                color: formData.colorHex || formData.color,
                sleeve: formData.sleeves,
                category: formData.category,
                description: formData.description || '',
                frontImageUrl: frontImageUrl,
                backImageUrl: backImageUrl,
                frontImageId: frontImageId,
                backImageId: backImageId,
                status: formData.status || 'available',
                createdAt: new Date()
            };

            spinnerText.text("Saving to database...");

            // Save to Firebase
            if (window.FirebaseInventory) {
                await window.FirebaseInventory.addProduct(productData);
            } else {
                throw new Error("Firebase service not available");
            }

            // Reload products
            await loadProducts();

            // Show success message
            notyf.success("Product successfully added!");

            // Return success
            return { success: true, code: productCode };

        } catch (error) {
            console.error("Error adding product:", error);
            notyf.error(error.message || "Failed to add product");
            return { success: false, error: error.message };
        } finally {
            // Hide loading indicator
            const spinner = $("#spinner");
            if (spinner.length) {
                spinner.addClass("d-none");
            }
        }
    };

    // DELETE PRODUCT FUNCTION
    window.deleteProductById = async function(productId) {
        return new Promise((resolve) => {
            showConfirmModal(
                "Are you sure you want to delete this product?",
                async function () {
                    try {
                        const spinner = $("#spinner");
                        const spinnerText = $("#spinner-text");
                        
                        if (spinner.length) {
                            spinner.removeClass("d-none");
                            spinnerText.text("Deleting product...");
                        }

                        // Get product data first
                        const productData = await window.FirebaseInventory.getProduct(productId);
                        
                        if (productData) {
                            // Delete images from Cloudinary
                            if (productData.frontImageId) {
                                spinnerText.text("Deleting front image...");
                                await deleteImageFromCloudinary(productData.frontImageId);
                            }
                            
                            if (productData.backImageId) {
                                spinnerText.text("Deleting back image...");
                                await deleteImageFromCloudinary(productData.backImageId);
                            }

                            spinnerText.text("Deleting from database...");
                            
                            // Delete from Firebase
                            await window.FirebaseInventory.deleteProduct(productId);
                            
                            // Remove from UI
                            $(`.product-item[data-id="${productId}"]`).remove();
                            
                            notyf.success("Product deleted successfully!");
                            resolve(true);
                        }
                        
                    } catch (error) {
                        console.error("Error deleting product:", error);
                        notyf.error("Failed to delete product");
                        resolve(false);
                    } finally {
                        const spinner = $("#spinner");
                        if (spinner.length) {
                            spinner.addClass("d-none");
                        }
                    }
                }
            );
        });
    };

    // DELETE ADDITIONAL FUNCTION
    window.deleteAdditionalById = async function(additionalId) {
        return new Promise((resolve) => {
            showConfirmModal(
                "Are you sure you want to delete this additional item?",
                async function () {
                    try {
                        const spinner = $("#spinner");
                        const spinnerText = $("#spinner-text");
                        
                        if (spinner.length) {
                            spinner.removeClass("d-none");
                            spinnerText.text("Deleting additional...");
                        }

                        // Get additional data first
                        const additionalData = await window.FirebaseInventory.getAdditional(additionalId);
                        
                        if (additionalData) {
                            // Delete image from Cloudinary
                            if (additionalData.imageId) {
                                spinnerText.text("Deleting image...");
                                await deleteImageFromCloudinary(additionalData.imageId);
                            }

                            spinnerText.text("Deleting from database...");
                            
                            // Delete from Firebase
                            await window.FirebaseInventory.deleteAdditional(additionalId);
                            
                            // Remove from UI
                            $(`.additional-item[data-id="${additionalId}"]`).remove();
                            
                            notyf.success("Additional item deleted successfully!");
                            resolve(true);
                        }
                        
                    } catch (error) {
                        console.error("Error deleting additional:", error);
                        notyf.error("Failed to delete additional item");
                        resolve(false);
                    } finally {
                        const spinner = $("#spinner");
                        if (spinner.length) {
                            spinner.addClass("d-none");
                        }
                    }
                }
            );
        });
    };

    // Event handlers for product code generation
    $(document).on("change", "#productCategory, #productColor", async function () {
        const category = $("#productCategory").val();
        const color = $("#productColor").val();

        if (category && color && categoryCodes[category] && colorCodes[color]) {
            const code = await generateProductCode(category, color);
            if (code) {
                $("#productCode").val(code);
            }
        }
    });

    // Event handlers for additional code generation
    $(document).on("input", "#additionalName", function () {
        const name = $(this).val();
        generateAdditionalCode(name).then(code => {
            if (code) {
                $("#additionalCode").val(code);
            }
        });
    });

    // Delete product event handler
    $(document).on("click", ".delete-btn", function () {
        const productId = $(this).data("id");
        if (productId) {
            window.deleteProductById(productId);
        }
    });

    // Delete additional event handler
    $(document).on("click", ".delete-add-btn", function () {
        const additionalId = $(this).data("id");
        if (additionalId) {
            window.deleteAdditionalById(additionalId);
        }
    });

    // Initialize data loading
    async function initializeInventoryData() {
        try {
            if (window.FirebaseInventory) {
                await Promise.all([loadProducts(), loadAdditionals()]);
            }
        } catch (error) {
            console.error("Error initializing inventory data:", error);
        }
    }

    // Make functions globally available
    window.generateProductCode = generateProductCode;
    window.generateAdditionalCode = generateAdditionalCode;
    window.loadProducts = loadProducts;
    window.loadAdditionals = loadAdditionals;
    window.uploadImage = uploadImage;
    window.deleteImageFromCloudinary = deleteImageFromCloudinary;
    window.rgbToHex = rgbToHex;
    window.showErrorModal = showErrorModal;
    window.showConfirmModal = showConfirmModal;

    // Initialize when Firebase becomes available
    if (window.FirebaseInventory) {
        initializeInventoryData();
    } else {
        // Wait for Firebase to be ready
        document.addEventListener('firebaseReady', initializeInventoryData);
    }
});
