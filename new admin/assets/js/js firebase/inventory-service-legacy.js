//INVENTORY JS - LEGACY VERSION FROM ADMIN FOLDER
// Modified for new admin system compatibility

// Note: This file has been copied from the admin folder and adapted for the new admin system
// It uses the old import structure and may need modifications to work with the new SDK

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
} from "./sdk/inventory-sdk.js"; // Updated to use new admin SDK

// #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
// INVENTORY LOADER FUNCTIONS
function showInventoryLoader() {
    const inventoryLoader = document.getElementById("inventory-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.remove("hidden");
        inventoryLoader.style.display = "flex";
    }
}

function hideInventoryLoader() {
    const inventoryLoader = document.getElementById("inventory-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.add("hidden");
        inventoryLoader.style.display = "none";
    }
}

// INTITIALIZE NOTYF
$(document).ready(function () {
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });
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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // DISPLAY CARDS FUNCTION - Updated for new admin collection names
    async function loadProducts() {
        try {
            const container = $("#products-container, #productsList"); // Support both old and new container IDs
            container.empty(); // Clear existing cards to avoid duplicates
            const querySnapshot = await getDocs(
                collection(chandriaDB, "products") // Using 'products' collection
            );
            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No products found in inventory.</div>'
                );
                return;
            }
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Defensive: check for required fields
                if (!data.frontImageUrl || !data.code) {
                    console.warn(
                        "Product missing image or code:",
                        doc.id,
                        data
                    );
                    return;
                }
                
                // Handle different size formats (object vs array)
                const sizeDisplay = data.size && typeof data.size === 'object' 
                    ? Object.keys(data.size).join(", ") 
                    : (data.sizes ? data.sizes : 'N/A');
                
                // Create the card HTML - Compatible with both admin styles
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
                            id="product-img"
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
                $("body").addClass("loaded");
            });
        } catch (err) {
            console.error("Error loading products from Firebase:", err);
            container.append(
                '<div style="color:red;margin:2rem;">Failed to load products. Check your connection or Firebase rules.</div>'
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
            hideInventoryLoader();
        }
    }

    // Make functions globally available for new admin compatibility
    window.loadProducts = loadProducts;
    window.loadAdditionals = loadAdditionals;
    
    initializeAllInventoryData();

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

    // CATEGORY & COLOR CODE MAPPINGS - Updated for new admin format
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
        // Additional colors for new admin
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
        } catch (error) {
            console.error("Error generating product code:", error);
            // Fallback to timestamp-based code
            const timestamp = Date.now().toString().slice(-3);
            return `${baseCode}-${timestamp}`;
        }
    }

    // Make code generation functions globally available
    window.generateProductCode = generateProductCode;
    window.rgbToHex = rgbToHex;

    // GENERATE ON INPUT TYPE - Support both old and new admin field IDs
    $("#add-product-category, #productCategory, #add-product-color, #productColor").on(
        "change",
        async function () {
            const category = $("#add-product-category, #productCategory").val();
            const color = $("#add-product-color, #productColor").val();

            if (
                category !== "Select Category" &&
                color !== "Select Color" &&
                categoryCodes[category] &&
                colorCodes[color]
            ) {
                const code = await generateProductCode(category, color);
                $("#add-product-code, #productCode").val(code);
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

    // NOTE: The rest of the functions (add product, delete, update, etc.) 
    // would need similar modifications to work with the new admin structure
    // This is a basic compatibility layer to get the legacy service working

    // --- ADDITIONAL PRODUCT DISPLAY ---
    async function loadAdditionals() {
        try {
            const container = $("#additional-container, #additionalsList"); // Support both container IDs
            container.empty(); // Clear existing cards to avoid duplicates

            const querySnapshot = await getDocs(
                collection(chandriaDB, "additionals") // Using 'additionals' collection
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
                }

                // Create card HTML
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
                            ${
                                data.inclusions && data.inclusions.length
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
            $("#additional-container, #additionalsList").append(
                '<div style="color:red;margin:2rem;">Failed to load additional products.</div>'
            );
        }
    }

    // Make modal and utility functions globally available
    window.showErrorModal = showErrorModal;
    window.showConfirmModal = showConfirmModal;

    console.log("Legacy inventory service loaded - adapted for new admin system");
});

// DOM Content Loaded for tab functionality
document.addEventListener("DOMContentLoaded", function () {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener("click", function () {
                tabBtns.forEach(b => b.classList.remove("active"));
                this.classList.add("active");
                tabContents.forEach(tc => tc.classList.remove("active"));
                const tab = this.getAttribute("data-tab");
                const targetContent = document.getElementById(tab);
                if (targetContent) {
                    targetContent.classList.add("active");
                }
            });
        });
    }
});
