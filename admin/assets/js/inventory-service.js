//INVENTORY JS
import {
    onAuthStateChanged,
    auth,
    signOut,
    chandriaDB,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where
} from "./sdk/chandrias-sdk.js";

// Helper function to get image URL from product data
function getImageUrl(product, type = 'front') {
    // Try new structure first (using frontImageId/backImageId)
    if (type === 'front' && product.frontImageId) {
        return `https://res.cloudinary.com/dbtomr3fm/image/upload/${product.frontImageId}`;
    }
    if (type === 'back' && product.backImageId) {
        return `https://res.cloudinary.com/dbtomr3fm/image/upload/${product.backImageId}`;
    }
    
    // Try legacy structure (frontImageUrl/backImageUrl)
    if (type === 'front' && product.frontImageUrl) {
        return product.frontImageUrl;
    }
    if (type === 'back' && product.backImageUrl) {
        return product.backImageUrl;
    }
    
    // Try nested images structure
    if (product.images) {
        if (type === 'front' && product.images.front?.url) {
            return product.images.front.url;
        }
        if (type === 'back' && product.images.back?.url) {
            return product.images.back.url;
        }
    }
    
    // Fallback to generic imageUrl or placeholder
    return product.imageUrl || '/admin/assets/images/placeholder.jpg';
}

// Initialize Notyf globally first
const notyf = new Notyf({
    position: {
        x: "center",
        y: "top"
    }
});

// Make notyf available globally immediately
window.notyf = notyf;

// #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
// INVENTORY LOADER FUNCTIONS
function showInventoryLoader() {
    const inventoryLoader = document.querySelector(".admin-page-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.remove("hidden");
        inventoryLoader.style.display = "flex";
    }
}

function hideInventoryLoader() {
    const inventoryLoader = document.querySelector(".admin-page-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.add("hidden");
        inventoryLoader.style.display = "none";
    }
}

// INTITIALIZE NOTYF
$(document).ready(function () {
    // Use the globally initialized notyf
    // COMMENTED OUT: Check if user is already signed in, if so, redirect to HOME PAGE
    // onAuthStateChanged(auth, async user => {
    //     if (user) {
    //         // Check if user exists in userAccounts
    //         const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
    //         const userDocSnap = await getDoc(userDocRef);

    //         if (userDocSnap.exists()) {
    //             // If user is customer, sign them out
    //             await signOut(auth);
    //             window.location.href = "../index.html";
    //             return;
    //         }
    //     }

    //     if (!user) {
    //         window.location.href = "./authentication.html";
    //     }
    // });

    // ERROR MODAL FUNCTION
    function showErrorModal(message) {
        const modal = document.getElementById("error-modal");
        const msg = document.getElementById("error-modal-message");
        msg.textContent = message;
        modal.classList.add("show");
    }

    // --- Confirm Modal Logic ---
    function showConfirmModal(message, onConfirm) {
        const modal = document.getElementById("confirm-modal");
        const msg = document.getElementById("confirm-modal-message");
        msg.textContent = message;
        modal.classList.add("show");
        // Remove previous listeners
        const okBtn = document.getElementById("confirm-modal-ok");
        const cancelBtn = document.getElementById("confirm-modal-cancel");
        const closeBtn = document.querySelector(".confirm-close");
        function cleanup() {
            modal.classList.remove("show");
            okBtn.removeEventListener("click", okHandler);
            cancelBtn.removeEventListener("click", cancelHandler);
            closeBtn.removeEventListener("click", cancelHandler);
        }
        function okHandler() {
            cleanup();
            if (onConfirm) onConfirm();
        }
        function cancelHandler() {
            cleanup();
        }
        okBtn.addEventListener("click", okHandler);
        cancelBtn.addEventListener("click", cancelHandler);
        closeBtn.addEventListener("click", cancelHandler);
    }

    // Error modal close logic
    $(document).on("click", ".error-close, #error-modal-ok", function () {
        $("#error-modal").removeClass("show");
    });
    window.addEventListener("click", function (event) {
        const modal = document.getElementById("error-modal");
        if (event.target === modal) modal.classList.remove("show");
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#    // DISPLAY CARDS FUNCTION
    async function loadProducts() {
        console.log("🔄 Starting loadProducts function...");
        
        // Update debug status if available
        const debugStatus = document.getElementById('debug-status');
        function updateDebug(message) {
            if (debugStatus) {
                debugStatus.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
            }
        }
        
        updateDebug('loadProducts() called');
        
        try {
            const container = $("#products-container");
            console.log("📦 Container found:", container.length > 0);
            updateDebug(`Container found: ${container.length > 0}`);
            
            container.empty(); // Clear existing cards to avoid duplicates
            
            console.log("🔥 Attempting to connect to Firebase...");
            updateDebug('Connecting to Firebase...');
            
            const querySnapshot = await getDocs(
                collection(chandriaDB, "products")
            );
            
            console.log("📊 Firebase query result:", querySnapshot.size, "documents found");
            updateDebug(`Firebase connected! Found ${querySnapshot.size} products`);
            
            if (querySnapshot.empty) {
                console.log("⚠️ No products found in inventory");
                updateDebug('No products found in database');
                container.append(
                    '<div style="margin:2rem;">No products found in inventory.</div>'
                );
                return;
            }
            
            console.log("🎯 Processing products...");
            updateDebug('Processing products...');
            querySnapshot.forEach(doc => {
                console.log("📄 Processing document:", doc.id);
                const data = doc.data();                console.log("📋 Document data:", data);
                
                // Defensive: check for required fields
                if (!getImageUrl(data, 'front') || !data.code) {
                    console.warn(
                        "Product missing image or code:",
                        doc.id,
                        data
                    );
                    return;
                }// Create the card HTML to match the exact screenshot design
                const totalStock = Object.values(data.size).reduce((sum, qty) => sum + qty, 0);
                const statusClass = totalStock === 0 ? 'out-of-stock' : totalStock <= 2 ? 'low-stock' : 'available';
                const statusText = totalStock === 0 ? 'Out of Stock' : totalStock <= 2 ? 'Low Stock' : 'Available';
                
                // Get color name from hex
                const colorName = getColorNameFromHex(data.color) || 'Unknown';                  const card = $(`
                  <article class="card_article" data-id="${doc.id}" data-name="${data.name}" data-category="${data.category}" data-color="${data.color}" data-size="${Object.keys(data.size).join(',')}" data-price="${data.price}" data-product-code="${data.code}">
                    <div class="card_img">
                        <img src="${getImageUrl(data, 'front')}" alt="${data.name}" />
                        <div class="card_badge clothing">${data.category}</div>
                        <div class="card_status_badge ${statusClass}">${statusText}</div>
                        <div class="card_actions">
                            <button class="card_action_btn edit_btn" data-action="edit" data-id="${doc.id}" title="Edit Product">
                                <i class="bx bx-edit"></i>
                            </button>
                            <button class="card_action_btn delete_btn" data-action="delete" data-id="${doc.id}" title="Delete Product">
                                <i class="bx bx-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card_content" data-open="viewProductModal" data-id="${doc.id}">
                        <h3 class="card_title product-name">${data.name}</h3>
                        <div class="card_price product-price">₱${parseFloat(data.price).toLocaleString()}</div>
                        <div class="card_color_section">
                            <div class="card_color" style="background-color: ${data.color}"></div>
                            <span class="card_color_text">${colorName}</span>
                        </div>
                        <div class="card_stock_section">
                            <span class="card_stock_text">Stock:</span>
                            <span class="card_stock_count">${totalStock}</span>
                            <div class="card_stock_indicator ${statusClass}"></div>
                        </div>
                        <div class="card_sizes">
                            ${Object.entries(data.size)
                                .filter(([size, stock]) => stock > 0)
                                .map(([size, stock]) => `<span class="card_size">${size}</span>`)
                                .join("")}
                        </div>
                        <div class="product-category" style="display: none;">${data.category}</div>
                    </div>
                </article>
                `);
                container.append(card);
                $("body").addClass("loaded");
            });        } catch (err) {
            console.error("Error loading products from Firebase:", err);
            
            // Update debug status if available
            const debugStatus = document.getElementById('debug-status');
            if (debugStatus) {
                debugStatus.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ❌ ERROR: ' + err.message;
            }
            
            const container = $("#products-container");
            container.append(
                '<div style="color:red;margin:2rem;">Failed to load products. Check your connection or Firebase rules.<br>Error: ' + err.message + '</div>'
            );
            $("body").addClass("loaded");
        }
    }

    // Initialize all inventory data with loader
    async function initializeAllInventoryData() {
        try {
            showInventoryLoader();
            await Promise.all([loadProducts(), loadAdditionals()]);
        } catch (error) {
            console.error("Error initializing inventory data:", error);
        } finally {
            hideInventoryLoader();        }
    }

    // Wait for DOM to be ready before initializing
    document.addEventListener('DOMContentLoaded', function() {
        initializeAllInventoryData();
    });

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
        Suits: "SUIT"
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
        Cream: "CRM"
    };

    // GENERATE PRODUCT CODE FUNCTION
    async function generateProductCode(category, color) {
        const categoryCode = categoryCodes[category];
        const colorCode = colorCodes[color];
        const baseCode = `${categoryCode}-${colorCode}`;

        const productsRef = collection(chandriaDB, "products");
        const q = query(
            productsRef,
            where("code", ">=", baseCode),
            where("code", "<", baseCode + "\uf8ff")
        );
        const snapshot = await getDocs(q);

        const numbers = snapshot.docs.map(doc => {
            const match = doc.data().code.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = (Math.max(...numbers, 0) + 1)
            .toString()
            .padStart(3, "0");
        return `${baseCode}-${nextNumber}`;
    }

    // GENERATE ON INPUT TYPE
    $("#add-product-category, #add-product-color").on(
        "change",
        async function () {
            const category = $("#add-product-category").val();
            const color = $("#add-product-color").val();

            if (
                category !== "Select Category" &&
                color !== "Select Color" &&
                categoryCodes[category] &&
                colorCodes[color]
            ) {
                const code = await generateProductCode(category, color);
                $("#add-product-code").val(code);
            }
        }
    );

    $("#update-product-category, #update-product-color").on(
        "change",
        async function () {
            const category = $("#update-product-category").val();
            const color = $("#update-product-color").val();

            if (
                category !== "Select Category" &&
                color !== "Select Color" &&
                categoryCodes[category] &&
                colorCodes[color]
            ) {
                const code = await generateProductCode(category, color);
                $("#update-product-code").val(code);
            }
        }
    );

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // ADDING PRODUCT FUNCTION
    $("#add-product-btn").on("click", async function (e) {
        e.preventDefault();

        // VALIDATING REQUIRED FIELDS
        const frontFile = $("#add-file-front-img")[0].files[0];
        const backFile = $("#add-file-back-img")[0].files[0];

        if (!frontFile && !backFile) {
            showErrorModal("Please select both Front and Back View images.");
            return;
        }

        if (!frontFile) {
            showErrorModal("Please select a Front View image.");
            return;
        }

        if (!backFile) {
            showErrorModal("Please select a Back View image.");
            return;
        }

        // GETTING INPUTS VALUE
        const requiredFields = [
            "#add-product-name",
            "#add-product-price",
            "#add-product-color",
            "#add-product-sleeve",
            "#add-product-category",
            "#add-product-description"
        ];

        let isValid = true;

        requiredFields.forEach(selector => {
            const value = $(selector).val().trim();
            if (!value) {
                showErrorModal(
                    `Please fill out ${selector.replace(
                        "#add-product-",
                        "Product "
                    )}.`
                );
                isValid = false;
            }
        });
        if (!isValid) return;

        const selectCategory = $("#add-product-category").val();
        if (selectCategory == "Select Category") {
            showErrorModal("Select a Category.");
            return;
        }

        // Price should not be negative
        const priceValue = parseFloat($("#add-product-price").val());
        if (isNaN(priceValue) || priceValue < 0) {
            showErrorModal("Product price cannot be negative.");
            return;
        }        // DISPLAYING SPINNER
        const spinnerText = $("#spinner-text");
        const spinner = $("#spinner");

        try {
            // FUNCTION TO UPLOAD SINGLE IMAGE
            const uploadImage = async file => {
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
                    public_id: data.public_id // Save this
                };
            };

        // COLLECT SIZE + QUANTITY DATA
        const sizes = {};
        let sizeValid = true;

        // Get all checked size checkboxes
        const checkedSizes = $('input[name="add-product-size"]:checked');

        if (checkedSizes.length === 0) {
            showErrorModal("Please select at least one size.");
            return;
        }

        checkedSizes.each(function () {
            const size = $(this).val();
            const qty = parseInt($(`#qty-${size}`).val());

            if (!isNaN(qty) && qty > 0) {
                sizes[size] = qty;
            } else {
                showErrorModal(
                    `Please enter a valid quantity for size ${size}.`
                );
                sizeValid = false;
                return false; // Break loop on invalid input
            }
        });
        if (!sizeValid) return;

        try {
            spinner.removeClass("d-none");
            // GENERATE PRODUCT CODE BEFORE SUBMITTING
            const categoryText = $("#add-product-category").val();
            const colorText = $("#add-product-color").val();
            const productCode = await generateProductCode(
                categoryText,
                colorText
            );

            spinnerText.text("Uploading Image");
            // UPLOAD BOTH IMAGES
            const frontImage = await uploadImage(frontFile);
            const backImage = await uploadImage(backFile);

            // CONVERTING RGB TO HEX
            const rgb = $("#add-product-color option:selected").css("color");
            const hex = rgbToHex(rgb);

            // GET FORM DATA
            const productData = {
                name: $("#add-product-name").val(),
                code: productCode,
                price: $("#add-product-price").val(),
                size: sizes,
                color: hex,
                sleeve: $("#add-product-sleeve").val(),
                category: categoryText,
                description: $("#add-product-description").val(),
                frontImageUrl: frontImage.url,
                backImageUrl: backImage.url,
                frontImageId: frontImage.public_id,
                backImageId: backImage.public_id,
                createdAt: new Date()
            };

            spinnerText.text("Submitting Data");
            // SAVE TO FIREBASE
            const docRef = await addDoc(
                collection(chandriaDB, "products"),
                productData
            );

            //ReLOADS THE PRODUCTS
            await loadProducts();

            // SHOW SUCCESS MESSAGE
            notyf.success("Product Successfully Added!");

            // RESET FORM
            $("#addProductForm")[0].reset();
            // CLEAR SIZE QUANTITY INPUTS
            $("#add-selected-size-container").empty();
            // RESET IMAGE DROP ZONES
            $("#add-dropzone-front").css("background-image", "none");
            $("#add-upload-label-front").css("opacity", "1");

            $("#add-dropzone-back").css("background-image", "none");
            $("#add-upload-label-back").css("opacity", "1");
            
            // CLOSING MODAL
            $("#addProductModal").removeClass("show");
        } catch (err) {
            console.error("Upload failed:", err);
            showErrorModal("There was an error uploading the product.");
        } finally {
            spinner.addClass("d-none");
        }

    // DELETE REQUEST FUNCTION
    // WARNING: This function uses API secret in client-side code - security risk!
    // TODO: Move this to a backend service for production use
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

        const response = await fetch(getLegacyCloudinaryDeleteUrl(),
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();
        console.log("Delete result:", result);

        if (result.result !== "ok") {
            console.error("Cloudinary deletion failed:", result);
            throw new Error(`Image deletion failed: ${publicId}`);
        }

        return result;
    }

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#    // DELETE CARD FUNCTION
    $(document).on("click", ".delete_btn", async function () {
        const productId = $(this).data("id");
        const card = $(this).closest(".card");

        // DISPLAYING SPINNER
        const spinner = $("#spinner");
        const spinnerText = $("#spinner-text");

        showConfirmModal(
            "Are you sure you want to delete this product?",
            async function () {
                try {
                    spinner.removeClass("d-none");
                    spinnerText.text("Deleting Image");
                    // Step 1: Get product info from Firestore
                    const docSnap = await getDoc(
                        doc(chandriaDB, "products", productId)
                    );
                    const product = docSnap.data();

                    // Step 2: Delete images
                    await deleteImageFromCloudinary(product.frontImageId);
                    await deleteImageFromCloudinary(product.backImageId);

                    spinnerText.text("Deleting Data");

                    // Step 3: Delete product record
                    await deleteDoc(doc(chandriaDB, "products", productId));
                    notyf.success("Product Deleted!");
                    card.remove();
                    spinner.addClass("d-none");
                } catch (err) {
                    console.error("Error:", err);
                    showErrorModal("Failed to delete product or images.");
                }
            }
        );
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // SIZE CHECKBOX FUNCTION
    $('input[name="add-product-size"]').change(function () {
        const size = $(this).val();
        const container = $("#add-selected-size-container");
        const inputId = `qty-${size}`;

        if ($(this).is(":checked")) {
            if (!$(`#${inputId}`).length) {
                const inputGroup = `
                        <div class="qty-group" id="group-${size}">
                            <label for="${inputId}">Quantity for ${size}:</label>
                            <input type="number" id="${inputId}" name="${inputId}" min="0" />
                        </div>`;
                container.append(inputGroup);
            }
        } else {
            $(`#group-${size}`).remove();
        }
    });
    $('input[name="update-product-size"]').change(function () {
        const size = $(this).val();
        const container = $("#update-selected-size-container");
        const inputId = `qty-${size}`;

        if ($(this).is(":checked")) {
            if (!$(`#${inputId}`).length) {
                const inputGroup = `
                        <div class="qty-group" id="group-${size}">
                            <label for="${inputId}">Quantity for ${size}:</label>
                            <input type="number" id="${inputId}" name="${inputId}" min="0" />
                        </div>`;
                container.append(inputGroup);
            }
        } else {
            $(`#group-${size}`).remove();
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#    // VIEW DETAILS FUNCTION
    $(document).on("click", ".edit_btn", async function () {
        const productId = $(this).data("id");

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();                // Set image previews
                if (getImageUrl(data, 'front')) {
                    $("#update-dropzone-front").css({
                        "background-image": `url(${getImageUrl(data, 'front')})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });
                    $("#update-upload-label-front").css("opacity", "0");
                }
                if (getImageUrl(data, 'back')) {
                    $("#update-dropzone-back").css({
                        "background-image": `url(${getImageUrl(data, 'back')})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });
                    $("#update-upload-label-back").css("opacity", "0");
                }

                // Fill text inputs
                $("#update-product-id").val(productId);
                $("#update-product-name").val(data.name);
                $("#update-product-price").val(data.price);
                $("#update-product-code").val(data.code);
                $("#update-product-description").val(data.description);

                // Set category
                $("#update-product-category").val(data.category);

                // Set sleeve
                $("#update-product-sleeve").val(data.sleeve);

                // Set color using hex style matching
                const colorOptions = $("#update-product-color option");
                colorOptions.each(function () {
                    const optionColor = rgbToHex($(this).css("color"));
                    if (
                        optionColor.toLowerCase() === data.color.toLowerCase()
                    ) {
                        $(this).prop("selected", true);
                    }
                });

                // Set sizes and quantities
                const sizeData = data.size || {}; // e.g., { S: 3, M: 5 }
                const selectedSizes = Object.keys(sizeData);

                // Check checkboxes and trigger change event to auto-generate inputs
                $("input[name='update-product-size']").each(function () {
                    const size = $(this).val();
                    if (selectedSizes.includes(size)) {
                        $(this).prop("checked", true).trigger("change");
                    } else {
                        $(this).prop("checked", false).trigger("change");
                    }
                });

                // After inputs are created by the change handler, set their values
                selectedSizes.forEach(size => {
                    const inputId = `qty-${size}`;
                    const input = $(`#${inputId}`);
                    if (input.length) {
                        input.val(sizeData[size]);
                    }
                });

                // Show the edit modal
                $("#viewProductModal").addClass("show");
            } else {
                showErrorModal("Product not found.");
            }
        } catch (error) {
            console.error("Error getting product:", error);
            showErrorModal("Failed to load product.");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // UPDATE PRODUCT FUNCTION
    $("#update-product-btn").on("click", async function (e) {
        e.preventDefault();

        const productId = $("#update-product-id").val();
        if (!productId) return showErrorModal("Product ID not found.");

        // Validate required fields
        const requiredFields = [
            "#update-product-name",
            "#update-product-code",
            "#update-product-price",
            "#update-product-color",
            "#update-product-sleeve",
            "#update-product-category",
            "#update-product-description"
        ];

        for (let selector of requiredFields) {
            const value = $(selector).val().trim();
            if (!value) {
                showErrorModal(
                    `Please fill out ${selector.replace(
                        "#update-product-",
                        "Product "
                    )}.`
                );
                return;
            }
        }

        // Validate price
        const priceValue = parseFloat($("#update-product-price").val());
        if (isNaN(priceValue) || priceValue < 0) {
            return showErrorModal("Product price cannot be negative.");
        }

        const frontFile = $("#update-file-front-img")[0].files[0];
        const backFile = $("#update-file-back-img")[0].files[0];

        // Collect size and quantity
        const sizes = {};
        const checkedSizes = $('input[name="update-product-size"]:checked');
        if (checkedSizes.length === 0)
            return showErrorModal("Please select at least one size.");

        for (let i = 0; i < checkedSizes.length; i++) {
            const size = $(checkedSizes[i]).val();
            const qty = parseInt($(`#qty-${size}`).val());
            if (!isNaN(qty) && qty > 0) {
                sizes[size] = qty;
            } else {
                showErrorModal(
                    `Please enter a valid quantity for size ${size}.`
                );
                return;
            }
        }

        let frontImageUrl = null;
        let backImageUrl = null;
        let frontImageId = null;
        let backImageId = null;

        try {
            // Show loading spinner
            $("#spinner").removeClass("d-none");
            $("#spinner-text").text("Updating Product...");

            // Fetch current product data
            const docSnap = await getDoc(
                doc(chandriaDB, "products", productId)
            );
            const existingProduct = docSnap.data();

            // DELETE OLD FRONT IMAGE IF NEW ONE IS PROVIDED
            if (frontFile && existingProduct.frontImageId) {
                $("#spinner-text").text("Deleting Old Front Image...");
                await deleteImageFromCloudinary(existingProduct.frontImageId);
            }

            // DELETE OLD BACK IMAGE IF NEW ONE IS PROVIDED
            if (backFile && existingProduct.backImageId) {
                $("#spinner-text").text("Deleting Old Back Image...");
                await deleteImageFromCloudinary(existingProduct.backImageId);
            }

            // UPLOAD NEW FRONT IMAGE
            if (frontFile) {
                $("#spinner-text").text("Uploading Front Image...");
                const formDataFront = new FormData();
                formDataFront.append("file", frontFile);
                formDataFront.append("upload_preset", "UPLOAD_IMG");

                const responseFront = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formDataFront
                    }
                );
                const dataFront = await responseFront.json();
                frontImageUrl = dataFront.secure_url;
                frontImageId = dataFront.public_id;
            }

            // UPLOAD NEW BACK IMAGE
            if (backFile) {
                $("#spinner-text").text("Uploading Back Image...");
                const formDataBack = new FormData();
                formDataBack.append("file", backFile);
                formDataBack.append("upload_preset", "UPLOAD_IMG");

                const responseBack = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formDataBack
                    }
                );
                const dataBack = await responseBack.json();
                backImageUrl = dataBack.secure_url;
                backImageId = dataBack.public_id;
            }

            // Convert RGB color to HEX
            const rgb = $("#update-product-color option:selected").css("color");
            const hex = rgbToHex(rgb);

            // Prepare the data object for update
            const updatedData = {
                name: $("#update-product-name").val(),
                price: priceValue,
                size: sizes,
                color: hex,
                sleeve: $("#update-product-sleeve").val(),
                category: $("#update-product-category").val(),
                code: $("#update-product-code").val(),
                description: $("#update-product-description").val()
            };

            // Include new image URLs/IDs if updated
            if (frontImageUrl && frontImageId) {
                updatedData.frontImageUrl = frontImageUrl;
                updatedData.frontImageId = frontImageId;
            }
            if (backImageUrl && backImageId) {
                updatedData.backImageUrl = backImageUrl;
                updatedData.backImageId = backImageId;
            }

            // Update Firestore document
            const docRef = doc(chandriaDB, "products", productId);
            await updateDoc(docRef, updatedData);

            // Reload updated products
            await loadProducts();

            notyf.success("Product updated successfully!");

            // Reset the form
            $("#updateProductForm")[0].reset();

            // Close the modal
            $("#viewProductModal").removeClass("show");
        } catch (error) {
            console.error("Error updating product:", error);
            showErrorModal("Failed to update product.");
        } finally {
            // Hide spinner
            $("#spinner").addClass("d-none");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // IMAGE PREVIEW
    $("#add-file-front-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#add-dropzone-front").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#add-upload-label-front").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#add-file-back-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#add-dropzone-back").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#add-upload-label-back").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#update-file-front-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-dropzone-front").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-upload-label-front").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#update-file-back-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-dropzone-back").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-upload-label-back").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    // ============================== ADDITIONAL ACCESSORIES SECTION ==============================
    // --- ADDITIONAL PRODUCT DISPLAY ---
    async function loadAdditionals() {
        try {
            const container = $("#additional-container");
            container.empty(); // Clear existing cards to avoid duplicates

            const querySnapshot = await getDocs(
                collection(chandriaDB, "additionals")
            );

            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No additional products found.</div>'
                );
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();

                // Check required fields
                if (!data.imageUrl || !data.code) {
                    console.warn(
                        "Additional missing image or code:",
                        doc.id,
                        data
                    );
                    return;
                }                // Create card HTML to match screenshot design
                const statusClass = 'available'; // Accessories are typically always available
                const statusText = 'Available';
                  const card = $(`
                <article class="card_article" data-open="updateAdditionalModal" data-id="${doc.id}">
                    <div class="card_img">
                        <img src="${data.imageUrl}" alt="${data.name}" />
                        <div class="card_badge additional">Additional / Accessories</div>
                        <div class="card_status_badge ${statusClass}">${statusText}</div>
                    </div>
                    <div class="card_content">
                        <h3 class="card_title">${data.name}</h3>
                        <div class="card_price">₱${parseFloat(data.price).toLocaleString()}</div>
                        <div class="card_color_section">
                            <div class="card_color" style="background-color: #8b5cf6"></div>
                            <span class="card_color_text">Pearl White</span>
                        </div>
                        <div class="card_stock_section">
                            <span class="card_stock_text">${data.inclusions && data.inclusions.length ? "With Inclusion" : "Without Inclusion"}</span>
                            <div class="card_stock_indicator ${statusClass}"></div>
                        </div>
                        <div class="card_sizes">
                            <span class="card_size">One Size</span>
                        </div>
                    </div>
                </article>
                `);

                container.append(card);
            });
        } catch (err) {
            console.error("Error loading additional products:", err);
            $("#additional-container").append(
                '<div style="color:red;margin:2rem;">Failed to load additional products.</div>'
            );
        }
    }

    // GENERATE ADDITIONAL PRODUCT CODE
    async function generateAdditionalCode(name) {
        if (!name || name.length < 3) return;

        const prefix = "ADD";
        const nameCode = name.trim().substring(0, 3).toUpperCase();
        const baseCode = `${prefix}-${nameCode}`;

        const additionalsRef = collection(chandriaDB, "additionals");
        const q = query(
            additionalsRef,
            where("code", ">=", baseCode),
            where("code", "<", baseCode + "\uf8ff")
        );
        const snapshot = await getDocs(q);

        const numbers = snapshot.docs.map(doc => {
            const match = doc.data().code.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = (Math.max(...numbers, 0) + 1)
            .toString()
            .padStart(3, "0");

        const fullCode = `${baseCode}-${nextNumber}`;
        $("#add-additional-code").val(fullCode);
        $("#update-additional-code").val(fullCode);
    }

    // GENERATE PRODUCT CODE ON TRIGGER
    $("#add-additional-name").on("input", function () {
        const name = $(this).val();
        generateAdditionalCode(name);
    });
    $("#update-additional-name").on("input", function () {
        const name = $(this).val();
        generateAdditionalCode(name);
    });

    // --- ADDITIONAL FORM SUBMISSION ---
    $("#add-additional-btn").on("click", async function (e) {
        e.preventDefault();

        // VALIDATION
        const imageFile = $("#add-additional-file-img")[0].files[0];
        const name = $("#add-additional-name").val();
        const code = $("#add-additional-code").val();
        const price = parseFloat($("#add-additional-price").val());

        if (!imageFile) {
            showErrorModal("Please select an image.");
            return;
        }

        if (!name || !code || isNaN(price) || price < 0) {
            showErrorModal("Please fill in all fields with valid values.");
            return;
        }

        // GATHER INCLUSIONS IF CHECKED
        let inclusions = [];
        if ($("#with-inclusions-checkbox").is(":checked")) {
            $("#inclusions-container input[type='text']").each(function () {
                const val = $(this).val().trim();
                if (val) inclusions.push(val);
            });
            if (inclusions.length === 0) {
                showErrorModal("Please enter at least one inclusion.");
                return;
            }
        }

        // UPLOAD IMAGE TO CLOUDINARY
        const uploadImage = async file => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "UPLOAD_IMG");

            const res = await fetch(
                "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json();
            return {
                url: data.secure_url,
                public_id: data.public_id
            };
        };

        try {
            $("#spinner").removeClass("d-none");
            $("#spinner-text").text("Uploading Additional Image...");

            const uploadedImage = await uploadImage(imageFile);

            const additionalData = {
                name,
                code,
                price,
                imageUrl: uploadedImage.url,
                imageId: uploadedImage.public_id,
                inclusions: inclusions.length ? inclusions : null,
                createdAt: new Date()
            };

            $("#spinner-text").text("Saving Data...");

            await addDoc(collection(chandriaDB, "additionals"), additionalData);

            notyf.success("Additional item added!");

            // RESET FORM
            $("#addAdditionalModal form")[0].reset();
            $("#add-additional-dropzone-img").css("background-image", "none");
            $("#add-additional-upload-label-img").css("opacity", "1");
            $("#inclusions-container").empty();
            $("#inclusions-container").hide();
            $("#remove-inclusion-btn").prop("disabled", true);

            $("#addAdditionalModal").removeClass("show");

            // Reload any relevant data view
            await loadAdditionals(); // if you have a function like this
        } catch (err) {
            console.error(err);
            showErrorModal("Failed to add additional item.");
        }

        $("#spinner").addClass("d-none");
    });

    // --- ADDITIONAL IMAGE PREVIEW ---
    $("#add-additional-file-img").on("change", function () {
        const file = this.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $("#add-additional-dropzone-img").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });
                $("#add-additional-upload-label-img").css("opacity", "0");
            };
            reader.readAsDataURL(file);
        }
    });

    // UPDATE ADDITIONAL IMAGE PREVIEW
    $("#update-additional-file-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-additional-dropzone-img").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-additional-upload-label-img").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    // VIEW ADDITIONAL DETAILS FUNCTION
    $(document).on("click", ".edit-add-btn", async function () {
        const additionalId = $(this).data("id");
        $("#updateAdditionalModal").addClass("show");

        try {
            const docRef = doc(chandriaDB, "additionals", additionalId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Set hidden field data-id for update
                $("#update-additional-id").val(additionalId);

                // Set image preview
                if (data.imageUrl) {
                    $("#update-additional-dropzone-img").css({
                        "background-image": `url(${data.imageUrl})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });                    $("#update-additional-upload-label-img").css(
                        "opacity",
                        "0"
                    );
                }

                // Fill inputs
                $("#update-additional-name").val(data.name || "");
                $("#update-additional-price").val(data.price || "");
                $("#update-additional-description").val(data.description || "");

                // Store the current additional ID for updating
                $("#updateAdditionalModal").attr("data-current-id", additionalId);
            } else {
                console.log("No such additional product!");
                notyf.error("Additional product not found");
            }
        } catch (error) {
            console.error("Error getting additional product:", error);
            notyf.error("Error loading additional product details");
        }
    });

});