import {
    chandriaDB,
    collection,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    doc
} from "./sdk/chandrias-sdk.js";

// Import rental duplication functions
import {
    checkProductAvailability,
    checkCartAvailability
} from "./rental-duplication.js";

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
    return product.imageUrl || './assets/images/long-gown.png';
}

$(document).ready(function () {
    // Prevent multiple initializations
    if (window.rentalSubscriptInitialized) {
        console.log('Rental subscript already initialized, skipping...');
        return;
    }
    window.rentalSubscriptInitialized = true;
    
    console.log('Initializing rental subscript...');
      // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        types: [
            {
                type: 'error',
                background: '#ff4757',
                duration: 4000,
                dismissible: true            }
        ]
    });
    
    const $body = $("body"),
        $modeSwitch = $body.find(".toggle-switch"),
        $modeText = $body.find(".mode-text");

    // --- Tab switching ---
    $(".tab-btn").on("click", function () {
        // Remove 'active' class from all tab buttons
        $(".tab-btn").removeClass("active");

        // Add 'active' class to the clicked button
        $(this).addClass("active");

        // Hide all tab contents and remove 'active' class
        $(".tab-content").removeClass("active").css("display", "none");

        // Get the ID of the tab to show from data-tab attribute
        const tab = $(this).attr("data-tab");
        const $tabContent = $("#" + tab);

        // Show the selected tab content if it exists
        if ($tabContent.length) {
            $tabContent.addClass("active").css("display", "flex");
        }
    });

    // --- Set initial tab visibility ---
    $(".tab-content").each(function () {
        // Show tab content if it has 'active' class, otherwise hide it
        if ($(this).hasClass("active")) {
            $(this).css("display", "flex");
        } else {
            $(this).css("display", "none");
        }
    });

    // --- Cart Data ---
    const cart = {
        products: [],
        accessories: []
    };    // --- Utility to update the Rental List summary ---
    function updateCartSummary() {
        // Update new table-based cart display
        if (typeof updateNewCartDisplay === 'function') {
            updateNewCartDisplay();
        }
        
        // Legacy support for old cart elements
        const $cartItemsDiv = $(".cart-items");
        const $cartDetailsDiv = $(".cart-details");
        
        if ($cartItemsDiv.length) {
            $cartItemsDiv.empty();
            
            const groupedProducts = {};
            
            cart.products.forEach(item => {
                if (!groupedProducts[item.name]) {
                    groupedProducts[item.name] = {
                        price: item.price,
                        sizes: []
                    };
                }
                groupedProducts[item.name].sizes.push({
                    size: item.size,
                    quantity: item.quantity
                });
            });
            
            Object.entries(groupedProducts).forEach(([name, group]) => {
                const $div = $('<div class="cart-item"></div>');
                let sizesHTML = "";
                
                group.sizes.forEach(({ size, quantity }) => {
                    sizesHTML += `- ${quantity} x ${size}<br>`;
                });
                
                const total = group.sizes.reduce(
                    (sum, s) => sum + s.quantity * group.price,
                    0
                );
                
                $div.html(`
                    <span>
                        <strong>${name}</strong><br>
                        ${sizesHTML}
                    </span>
                    <span>
                        ₱${total.toLocaleString()}
                        <i class='bx bx-trash cart-remove' title="Remove All"></i>
                    </span>
                `);                  $div.find(".cart-remove").on("click", function () {
                    // Remove the product
                    cart.products = cart.products.filter(p => p.name !== name);
                    
                    // Check if there are any products left in Rental List
                    const remainingProductCount = cart.products.length;
                    
                    if (remainingProductCount === 0) {
                        // If no products left, remove all additionals
                        cart.accessories = [];
                    } else {
                        // Check if we need to remove excess additionals due to product limit
                        // Group additionals by name and count them
                        const additionalGroups = {};
                        cart.accessories.forEach((item, idx) => {
                            if (!additionalGroups[item.name]) {
                                additionalGroups[item.name] = [];
                            }
                            additionalGroups[item.name].push(idx);
                        });
                        
                        // Remove excess additionals that exceed remaining product count
                        const indicesToRemove = [];
                        Object.entries(additionalGroups).forEach(([name, indices]) => {
                            if (indices.length > remainingProductCount) {
                                // Keep only up to remainingProductCount, mark rest for removal
                                const excessIndices = indices.slice(remainingProductCount);
                                indicesToRemove.push(...excessIndices);
                            }
                        });
                        
                        // Remove excess additionals (sort indices in descending order to avoid index shifting)
                        if (indicesToRemove.length > 0) {
                            indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                                cart.accessories.splice(idx, 1);
                            });
                            
                            notyf.error(`Removed ${indicesToRemove.length} excess additional item(s) due to product removal.`);
                        }
                    }
                    
                    updateCartSummary();
                });
                
                $cartItemsDiv.append($div);
            });
        }
        
        if ($cartDetailsDiv.length) {
            $cartDetailsDiv.empty();
            
            const grouped = {};
            
            cart.accessories.forEach((item, idx) => {
                if (item.name.toLowerCase().includes("accessor")) return;
                if (!grouped[item.name]) {
                    grouped[item.name] = { ...item, count: 1, indexes: [idx] };
                } else {
                    grouped[item.name].count++;
                    grouped[item.name].indexes.push(idx);
                }
            });
            
            $.each(grouped, (name, item) => {
                const $div = $('<div class="cart-row"></div>');
                $div.html(`
                    <span>${item.name} <span class="cart-qty-badge">x${item.count}</span></span>
                    <span>
                        ₱${(item.price * item.count).toLocaleString()}
                        <i class='bx bx-trash cart-remove' title="Remove One"></i>
                    </span>
                `);
                
                $div.find(".cart-remove").on("click", function () {
                    if (item.indexes.length > 0) {
                        cart.accessories.splice(item.indexes[0], 1);
                        updateCartSummary();
                    }
                });
                
                $cartDetailsDiv.append($div);
            });
            
            cart.accessories.forEach((item, idx) => {
                if (!item.name.toLowerCase().includes("accessor")) return;
                
                const $div = $('<div class="cart-row"></div>');
                let typesStr = "";
                
                if (item.types && item.types.length) {
                    typesStr =
                        '<ul class="cart-accessory-types">' +
                        item.types
                            .map(
                                type =>
                                    `<li>- ${
                                        type.charAt(0).toUpperCase() +
                                        type.slice(1).toLowerCase()
                                    }</li>`
                            )
                            .join("") +
                        "</ul>";
                }
                
                const editIcon = `<i class='bx bx-edit cart-edit' title="Edit" data-idx="${idx}" data-id="${item.id}" style="cursor:pointer;"></i>`;
                
                $div.html(`
                    <span>${item.name}${typesStr}</span>
                    <span>
                        ₱${item.price.toLocaleString()}
                        <i class='bx bx-trash cart-remove' title="Remove"></i>
                        ${editIcon}
                    </span>
                `);
                
                $div.find(".cart-remove").on("click", function () {
                    cart.accessories.splice(idx, 1);
                    updateCartSummary();
                });
                
                $div.find(".cart-edit").on("click", function () {
                    const idx = $(this).data("idx");
                    const id = $(this).data("id");
                    showAccessoryModal(idx, id);
                });
                
                $cartDetailsDiv.append($div);
            });
        }
        
        // Calculate and display total amount for legacy elements
        const total = [
            ...cart.products.map(p => p.price * (p.quantity || 1)),
            ...cart.accessories.map(a => a.price)
        ].reduce((sum, val) => sum + val, 0);
        
        // Update any legacy total amount displays that might still exist
        const legacyTotalElements = $("#cart-total-amount").not("#order-items #cart-total-amount");
        if (legacyTotalElements.length) {
            legacyTotalElements.text(`₱${total.toLocaleString()}`);
        }
        
        // Trigger availability check if dates are already selected
        triggerAvailabilityCheckForCurrentDates();
    }
    
    // Function to check availability when cart changes but dates are already set
    function triggerAvailabilityCheckForCurrentDates() {
        const rentalType = $("#rental-type").val();
        let startDate = null;
        let endDate = null;
        
        if (rentalType === 'Fixed Rental') {
            startDate = $('#fixed-event-date').val();
        } else if (rentalType === 'Open Rental') {
            startDate = $('#event-start-date').val();
            endDate = $('#event-end-date').val();
        }
        
        if (startDate && cart.products.length > 0) {
            // Clear previous timeout to avoid multiple calls
            if (availabilityCheckTimeout) {
                clearTimeout(availabilityCheckTimeout);
            }
            
            // Check availability after a short delay
            availabilityCheckTimeout = setTimeout(async () => {
                await checkAndDisplayAvailability(startDate, endDate, rentalType);
            }, 300);
        }
    }
    
    // CLEAR CART FUNCTION 
    function clearCart() {
        cart.products = [];
        cart.accessories = [];
    }
    
    // SELECT SIZE PRODUCT FUNCTION
    $(document).on("click", ".product-card", async function (e) {
        const productId = $(this).data("id");
        const productName = $(this).data("name");
        const productCode = $(this).find(".pos-name").text();
        const productPrice = $(this).find(".pos-price").text().trim();

        // Set product name and price in the modal
        $("#modal-product-name").text(productName);
        $("#modal-product-code").text(productCode);
        $("#modal-product-price").text(productPrice);

        // Attach product ID to the proceed button
        $("#proceed-btn").data("id", productId);

        // Show the modal
        $("#product-size-modal").show();

        // Reset button and clear sizes
        $("#proceed-btn").addClass("disabled");
        $("#product-size-form").empty();

        const sizeLabels = {
            XS: "Extra Small",
            S: "Small",
            M: "Medium",
            L: "Large",
            XL: "Extra Large",
            XXL: "Double Extra Large",
            XXXL: "Triple Extra Large"
        };

        // Define the order in which sizes should be displayed
        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const sizes = data.size || {};

                // Filter available sizes (qty > 0) and sort by predefined order
                const availableSizes = Object.entries(sizes)
                    .filter(([_, qty]) => qty > 0)
                    .sort(([sizeA], [sizeB]) => {
                        const indexA = sizeOrder.indexOf(sizeA);
                        const indexB = sizeOrder.indexOf(sizeB);
                        // If size not in predefined order, put it at the end
                        const orderA = indexA === -1 ? sizeOrder.length : indexA;
                        const orderB = indexB === -1 ? sizeOrder.length : indexB;
                        return orderA - orderB;
                    });

                for (const [sizeCode, qty] of availableSizes) {
                    const isOnlyOne = availableSizes.length === 1;
                    const displayLabel = `${
                        sizeLabels[sizeCode] || sizeCode
                    } (${sizeCode})`;

                    const $label = $("<label>");
                    const $checkbox = $("<input>", {
                        type: "checkbox",
                        name: "availableSize",
                        value: sizeCode,
                        "data-stock": qty
                    });

                    if (isOnlyOne) $checkbox.prop("checked", true);

                    $label.append($checkbox, ` ${displayLabel}`);
                    $("#product-size-form").append($label).append("<br>");

                    if (isOnlyOne) {
                        $checkbox.trigger("change");
                    }
                }
            } else {
                console.warn("Product not found.");
            }
        } catch (err) {
            console.error("Error fetching product:", err);
        }
    });

    // PROCEED TO CUSTOMER MODAL CART FUNCTION
    $("#proceed-btn").on("click", async function () {
        if ($(this).hasClass("disabled")) return;

        const productId = $(this).data("id");
        const productName = $("#modal-product-name").text();
        const productCode = $("#modal-product-code").text();

        const productPrice = parseInt(
            $("#modal-product-price").text().replace(/[^\d]/g, "")
        );
        const selectedSizes = $("input[name='availableSize']:checked");

        let added = false;
        let anyValid = false;

        for (let i = 0; i < selectedSizes.length; i++) {
            const checkbox = selectedSizes[i];
            const size = $(checkbox).val();
            const $qtyInput = $(`#size-qty-${size}`);
            const altQtyInput = $(checkbox)
                .closest("label")
                .find(".quantity-input");
            const qty = parseInt($qtyInput.val() || altQtyInput.val(), 10);

            if (!qty || qty < 1) continue;

            anyValid = true;

            const exists = cart.products.some(
                p => p.id === productId && p.size === size
            );
            
            if (exists) {
                notyf.error(
                    `"${productName}" (${size}) is already in the Rental List.`
                );
                continue;
            }

            // Check product availability (basic stock check without dates for now)
            try {
                const availability = await checkProductAvailability(productId, size, new Date().toISOString().split('T')[0]);
                
                if (!availability.available || availability.stock < qty) {
                    notyf.error(
                        `"${productName}" (${size}) is not available. Available stock: ${availability.stock}, Requested: ${qty}`
                    );
                    continue;
                }
                
                // Add to cart if available
                cart.products.push({
                    id: productId,
                    name: productName,
                    code: productCode,
                    price: productPrice,
                    size: size,
                    quantity: qty
                });
                added = true;
                
            } catch (error) {
                console.error('Error checking product availability:', error);
                notyf.error(`Error checking availability for "${productName}" (${size}). Please try again.`);
            }
        }

        if (!anyValid) {
            console.warn(
                "No valid size/quantity selected or all items already in Rental List."
            );
        }

        if (added) {
            updateCartSummary();
            $("#product-size-modal").hide();
        }
    });

    // --====== START OF EVENT LISTENERS FOR PRODUCT SIZES ======--
    // SIZE CHECKBOXES FUNCTION
    $(document).on(
        "change",
        "#product-size-form input[type=checkbox]",
        function () {
            const $label = $(this).closest("label");
            const isChecked = $(this).is(":checked");

            // Remove previous quantity input and stock span
            $label.find(".quantity-input, .stock-text").remove();

            if (isChecked) {
                const stock = $(this).data("stock");

                const quantityInput = $("<input>", {
                    type: "number",
                    class: "quantity-input",
                    min: 1,
                    max: stock,
                    value: 1
                });

                const stockDisplay = $(
                    `<span class="stock-text" style="margin-left: 8px; font-size: 0.9em; color: gray;">Stock: ${stock}</span>`
                );

                $label.append(quantityInput, stockDisplay);
            }

            // Check if any checkboxes are still checked
            const anyChecked =
                "#product-size-form input[type=checkbox]:checked".length > 0;

            if (anyChecked) {
                $("#proceed-btn").removeClass("disabled");
            } else {
                $("#proceed-btn").addClass("disabled");
            }
        }
    );

    // LIMIT QUANTITY INPUT based on available stock
    // Restrict special characters and limit quantity input to available stock
    $(document).on("input", ".quantity-input", function () {
        const $input = $(this);
        const $checkbox = $input.closest("label").find("input[type=checkbox]");
        const stock = parseInt($checkbox.data("stock"), 10) || 0;

        // Remove all non-digit characters
        let cleaned = $input.val().replace(/\D/g, "");

        // If user types "00", convert to "1"
        if (cleaned === "00") {
            cleaned = "1";
        }

        // Update the input field
        $input.val(cleaned);

        // Enforce max stock limit only if value exists
        const currentVal = parseInt(cleaned, 10);
        if (!isNaN(currentVal) && currentVal > stock) {
            $input.val(stock);
        }
    });

    // EVENT LISTENER FOR QUANTITY INPUT FIELDS
    $(document).on("input", "#product-size-form .quantity-input", function () {
        let allValid = true;

        "#product-size-form input[type=checkbox]:checked".each(function () {
            const qtyVal = $(this)
                .closest("label")
                .find(".quantity-input")
                .val();
            if (qtyVal === "" || qtyVal === "0" || /^0+/.test(qtyVal)) {
                allValid = false;
                return false; // Exit loop early
            }
        });

        if (allValid) {
            $("#proceed-btn").removeClass("disabled");
        } else {
            $("#proceed-btn").addClass("disabled");
        }
    });
    // --====== END OF EVENT LISTENERS FOR PRODUCT SIZES ======--    // ACCESSORIES CLICK FUNCTION
    $(document).on("click", ".additional-card", function () {
        const $card = $(this);
        const id = $card.data("id"); // Firestore document ID
        const code = $card.data("code"); // Accessory code (NEW)
        const name = $card.find(".pos-name").text();
        const price = parseInt(
            $card.find(".pos-price").text().replace(/[^\d]/g, "")
        );        const productCount = cart.products.length;
        
        // Check if there are any products in the cart first (but allow fees to be added without products)
        if (productCount === 0 && !name.toLowerCase().includes("fee")) {
            notyf.error("You must add at least one product before adding additional items.");
            return;
        }

        const countOfThis = cart.accessories.filter(
            item => item.name === name
        ).length;

        // Only apply product limit for non-fee items
        if (!name.toLowerCase().includes("fee") && countOfThis >= productCount) {
            notyf.error(
                `You can only add as many '${name}' as products selected. You currently have ${productCount} product(s) and ${countOfThis} '${name}' item(s).`
            );
            return;
        }

        const accessory = { id, name, price };
        if (code) accessory.code = code;
        if (name.toLowerCase().includes("accessor")) accessory.types = [];

        cart.accessories.push(accessory);

        updateCartSummary();
    });

    // --- Accessory Modal Logic ---
    // Cache jQuery objects for modal and controls
    const $accessoryModal = $("#accessory-modal");
    const $closeModalBtn = $(".close-modal");
    const $saveAccessoryTypesBtn = $("#save-accessory-types");
    const $accessoryForm = $("#accessory-form");
    let pendingAccessoryIdx = null;

    // Function to show the modal and pre-fill checkboxes if needed
    async function showAccessoryModal(idx) {
        $accessoryModal.show();
        pendingAccessoryIdx = idx;

        const accessory = cart.accessories[idx];
        const selectedTypes = accessory.types || [];
        const accessoryId = accessory.id;

        $accessoryForm.empty(); // Clear previous checkboxes

        // Add the "Select All" checkbox first
        const selectAllHTML = `
        <label>
            <input type="checkbox" id="select-all-accessories" />
            <strong>Select All</strong>
        </label>
        <br>
    `;
        $accessoryForm.append(selectAllHTML);

        try {
            const docRef = doc(chandriaDB, "additionals", accessoryId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const inclusions = data.inclusions || [];

                inclusions.forEach(type => {
                    const isChecked = selectedTypes.includes(type);

                    const checkboxHTML = `
                    <label class="checkbox-label">
                        <input type="checkbox" name="accessoryType" value="${type}" ${
                            isChecked ? "checked" : ""
                        }>
                        ${type}
                    </label>
                    <br>
                `;
                    $accessoryForm.append(checkboxHTML);
                });

                // Re-bind "Select All" logic after appending
                $("#select-all-accessories")
                    .off("change")
                    .on("change", function () {
                        const checked = $(this).is(":checked");
                        $('#accessory-form input[name="accessoryType"]').prop(
                            "checked",
                            checked
                        );
                    });
            } else {
                console.warn("Accessory not found in Firestore.");
            }
        } catch (error) {
            console.error("Error fetching accessory by ID:", error);
        }
    }

    // Close the modal when close button is clicked
    $closeModalBtn.on("click", function () {
        $accessoryModal.hide();
        $("#product-size-modal").hide();
    });

    // Save selected types when save button is clicked
    $saveAccessoryTypesBtn.on("click", function (e) {
        e.preventDefault();

        if (
            pendingAccessoryIdx !== null &&
            cart.accessories[pendingAccessoryIdx]
        ) {
            // Get all checked accessoryType checkboxes except "Select All"
            const types = $accessoryForm
                .find(
                    "input[type=checkbox]:checked:not(#select-all-accessories)"
                )
                .map(function () {
                    return this.value;
                })
                .get();

            // Update the types array for this accessory
            cart.accessories[pendingAccessoryIdx].types = types;

            // Refresh cart display
            updateCartSummary();
        }

        $accessoryModal.hide();
    });

    // Close modal if user clicks outside the modal content
    $(window).on("click", function (e) {
        if ($(e.target).is($accessoryModal)) {
            $accessoryModal.hide();
        }
        if ($(e.target).is($("#product-size-modal"))) {
            $("#product-size-modal").hide();
        }
    });

    // --- Select All Accessories logic (jQuery version) ---
    const $selectAll = $("#select-all-accessories");

    if ($selectAll.length && $accessoryForm.length) {
        // When the "Select All" checkbox is changed
        $selectAll.on("change", function () {
            $accessoryForm
                .find('input[name="accessoryType"]')
                .prop("checked", this.checked); // Toggle all checkboxes
        });

        // When any accessory checkbox is changed
        $accessoryForm.on("change", 'input[name="accessoryType"]', function () {
            const allChecked =
                $accessoryForm.find('input[name="accessoryType"]').length ===
                $accessoryForm.find('input[name="accessoryType"]:checked')
                    .length;
            $selectAll.prop("checked", allChecked); // Update "Select All" checkbox
        });
    }

    // --- Initialize cart summary on load ---
    updateCartSummary();

    // --- GENERATE TRANSACTION CODE FUNCTION ---
    async function generateTransactionCode() {
        try {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = String(today.getFullYear()).slice(-2);
            const dateString = `${day}${month}${year}`;
            
            // Query existing transactions to find the next sequence number
            const transactionsRef = collection(chandriaDB, "transaction");
            const q = query(transactionsRef, where("transactionCode", ">=", `TRNS-${dateString}-000`), where("transactionCode", "<=", `TRNS-${dateString}-999`));
            const querySnapshot = await getDocs(q);
            
            let maxSequence = 0;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.transactionCode) {
                    const parts = data.transactionCode.split('-');
                    if (parts.length === 3 && parts[0] === 'TRNS' && parts[1] === dateString) {
                        const sequence = parseInt(parts[2]);
                        if (!isNaN(sequence) && sequence > maxSequence) {
                            maxSequence = sequence;
                        }
                    }
                }
            });
            
            // Generate next sequence number
            const nextSequence = maxSequence + 1;
            const sequenceString = String(nextSequence).padStart(3, '0');
            
            return `TRNS-${dateString}-${sequenceString}`;
        } catch (error) {
            console.error('Error generating transaction code:', error);
            // Fallback to timestamp-based code if database query fails
            const timestamp = Date.now().toString().slice(-6);
            return `TRNS-${timestamp}`;
        }
    }

    // === APPOINTMENT FLOW FUNCTIONS ===
    // Check if the page was loaded from an appointment flow
    function checkAppointmentFlow() {
        const appointmentData = sessionStorage.getItem('appointmentData');
        if (appointmentData) {
            try {
                const data = JSON.parse(appointmentData);
                
                // LOGGING DATA ITEMS
                // console.log("Appointment Flow Data:", data);
                // console.log("Cart Items:", data.cartItems);
                
                // Pre-populate cart and form with appointment data
                prePopulateCartFromAppointment(data);
                preFillCustomerFormFromAppointment(data);
                
                // Clear the session storage after using it
                sessionStorage.removeItem('appointmentData');
                
                return true;
            } catch (error) {
                console.error('Error parsing appointment data:', error);
                sessionStorage.removeItem('appointmentData');
            }
        }
        return false;
    }

    // Pre-populate cart with appointment items
    function prePopulateCartFromAppointment(appointmentData) {
        if (!appointmentData.cartItems || !Array.isArray(appointmentData.cartItems)) {
            return;
        }

        // Clear existing cart
        cart.products = [];
        cart.accessories = [];

        appointmentData.cartItems.forEach((item, index) => {
            if (item.type === 'accessory') {
                const accessory = {
                    id: item.id,
                    name: item.name,
                    code: item.name, // Use name as code for accessories
                    price: item.price,
                    quantity: item.quantity,
                    types: [] // Can be updated later when accessory modal is opened
                };
                cart.accessories.push(accessory);
            } else {
                const product = {
                    id: item.id,
                    name: item.name,
                    code: item.code,
                    price: item.price,
                    size: item.size,
                    quantity: item.quantity
                };
                
                // LOGGING
                // console.log("PRODUCT DATA(BEFORE PUSH):", product);
                cart.products.push(product);
            }
        });

        // Update cart summary display
        updateCartSummary();
    }

    // Pre-fill customer form with appointment data
    function preFillCustomerFormFromAppointment(appointmentData) {
        // Fill basic customer information
        if (appointmentData.customerName) {
            $("#client-full-name").val(appointmentData.customerName);
        }
        if (appointmentData.customerContact) {
            $("#client-contact").val(appointmentData.customerContact);
        }
        if (appointmentData.eventDate) {
            $("#fixed-event-date").val(appointmentData.eventDate);
        }

        console.log('Customer form pre-filled with appointment data');
    }    // Check for appointment flow on page load
    const isAppointmentFlow = checkAppointmentFlow();
    if (isAppointmentFlow) {
        console.log('Page loaded from appointment flow - data pre-populated');
    }

    // Check for additional fee flow on page load
    const isAdditionalFeeFlow = checkAdditionalFeeFlow();
    if (isAdditionalFeeFlow) {
        console.log('Page loaded from additional fee flow - data pre-populated');
    }// --- Error Notification Logic (Using Notyf) ---
    function showErrorModal(message) {
        notyf.error(message);
    }

    // --- Product & Accessory Search Functionality (jQuery version) ---
    const $searchInput = $('.pos-search-bar input[type="text"]');

    // Function to filter cards based on input
    function filterCards() {
        const query = $searchInput.val().trim().toLowerCase();

        // Helper: remove non-digit characters (for comparing numbers)
        function normalizePrice(str) {
            return str.replace(/[^\d]/g, "");
        }

        // Helper: match price even with commas or symbols
        function priceMatches(priceText, query) {
            const priceDigits = normalizePrice(priceText);
            const queryDigits = normalizePrice(query);
            return (
                priceText.toLowerCase().includes(query) ||
                priceDigits.includes(queryDigits)
            );
        }

        // Filter product cards
        $("#products .pos-card").each(function () {
            const $card = $(this);
            const name = $card.find(".pos-name").text().toLowerCase();
            const priceText = $card.find(".pos-price").text();
            if (name.includes(query) || priceMatches(priceText, query)) {
                $card.show(); // show matching card
            } else {
                $card.hide(); // hide non-matching card
            }
        });

        // Filter accessory cards
        $("#accessories .pos-card").each(function () {
            const $card = $(this);
            const name = $card.find(".pos-name").text().toLowerCase();
            const priceText = $card.find(".pos-price").text();
            if (name.includes(query) || priceMatches(priceText, query)) {
                $card.show();
            } else {
                $card.hide();
            }
        });
    }

    // Listen for typing in the search input
    if ($searchInput.length) {
        $searchInput.on("input", filterCards);

        // Optional: filter when clicking the search icon
        const $searchIcon = $(".pos-search-bar .search-icon");
        if ($searchIcon.length) {
            $searchIcon.on("click", filterCards);
        }
    }

    // --- Customer Modal Logic (jQuery version) ---
    const $customerModal = $("#customer-modal");
    const $customerClose = $(".customer-close");
    const $customerForm = $("#customer-form");
    const $rentalFeeField = $("#client-rental-fee");
    const $checkoutBtn = $("#cart-checkout-btn");
    const $cartTotalAmount = $("#cart-total-amount");    // Close the modal when close button is clicked
    if ($customerClose.length) {
        $customerClose.on("click", function () {
            $customerModal.removeClass('show').addClass('modal-hidden');
            $('body').removeClass('modal-open');
        });
    }

    // Close the modal when clicking outside of it
    $(window).on("click", function (e) {
        if ($(e.target).is($customerModal)) {
            $customerModal.removeClass('show').addClass('modal-hidden');
            $('body').removeClass('modal-open');
        }
    });

    // --- Customer Modal Luzon Regions and City Logic (jQuery version) ---
    const luzonRegions = {
        "Region I": [
            "Laoag",
            "Vigan",
            "San Fernando",
            "Alaminos",
            "Batac",
            "Candon",
            "Urdaneta",
            "Dagupan",
            "San Carlos",
            "Rosales",
            "Agoo",
            "Bauang",
            "Sual",
            "Pozorrubio",
            "Lingayen",
            "Bayambang",
            "Sison",
            "Sto. Tomas",
            "Bani",
            "Burgos",
            "Agno"
        ],
        "Region II": [
            "Tuguegarao",
            "Cauayan",
            "Ilagan",
            "Santiago",
            "Bayombong",
            "Solano",
            "Aparri",
            "Roxas",
            "Naguilian",
            "Cabagan",
            "Tumauini",
            "San Mateo",
            "Echague",
            "Jones",
            "Alicia",
            "San Mariano",
            "Gamu",
            "San Pablo",
            "Maddela",
            "Diffun"
        ],
        "Region III": [
            "San Fernando",
            "Angeles",
            "Olongapo",
            "Balanga",
            "Cabanatuan",
            "Gapan",
            "Malolos",
            "Meycauayan",
            "San Jose del Monte",
            "Tarlac City",
            "Mabalacat",
            "Palayan",
            "San Jose",
            "Bocaue",
            "Marilao",
            "Baliuag",
            "Guiguinto",
            "Plaridel",
            "Sta. Maria",
            "San Miguel",
            "San Rafael"
        ],
        "Region IV-A": [
            "Calamba",
            "Antipolo",
            "Batangas City",
            "Lucena",
            "Tanauan",
            "Lipa",
            "San Pablo",
            "Tayabas",
            "Cavite City",
            "Tagaytay",
            "Trece Martires",
            "Dasmariñas",
            "Imus",
            "Bacoor",
            "Binan",
            "Cabuyao",
            "San Pedro",
            "Sta. Rosa",
            "San Mateo",
            "Rodriguez"
        ],
        "Region IV-B": [
            "Calapan",
            "Puerto Princesa",
            "Romblon",
            "Boac",
            "Mamburao",
            "San Jose",
            "Sablayan",
            "Roxas",
            "Bongabong",
            "Pinamalayan",
            "Naujan",
            "Victoria",
            "Aborlan",
            "Brooke’s Point",
            "Coron",
            "El Nido",
            "Rizal",
            "Bataraza",
            "Narra",
            "Quezon"
        ],
        "Region V": [
            "Legazpi",
            "Naga",
            "Sorsogon",
            "Iriga",
            "Tabaco",
            "Ligao",
            "Masbate City",
            "Daet",
            "Tigaon",
            "Polangui",
            "Libmanan",
            "Pili",
            "Sorsogon City",
            "Bulusan",
            "Donsol",
            "Gubat",
            "Jovellar",
            "Bulan",
            "Irosin",
            "Matnog",
            "Barcelona"
        ],
        NCR: [
            "Manila",
            "Quezon City",
            "Caloocan",
            "Las Piñas",
            "Makati",
            "Malabon",
            "Mandaluyong",
            "Marikina",
            "Muntinlupa",
            "Navotas",
            "Parañaque",
            "Pasay",
            "Pasig",
            "Pateros",
            "San Juan",
            "Taguig",
            "Valenzuela"
        ],
        CAR: [
            "Baguio",
            "Tabuk",
            "Bangued",
            "La Trinidad",
            "Bontoc",
            "Lagawe",
            "Kiangan",
            "Banaue",
            "Sagada",
            "Sabangan",
            "Tadian",
            "Besao",
            "Paracelis",
            "Natonin",
            "Barlig",
            "Sadanga",
            "Sabangan",
            "Tadian",
            "Besao",
            "Paracelis",
            "Natonin"
        ]
    };

    const $regionSelect = $("#client-region");
    const $citySelect = $("#client-city");

    if ($regionSelect.length && $citySelect.length) {
        // Populate regions
        const regionOptions = Object.keys(luzonRegions)
            .map(region => `<option value="${region}">${region}</option>`)
            .join("");
        $regionSelect.html(
            `<option value="">Select Region</option>${regionOptions}`
        );

        // On region change, populate cities
        $regionSelect.on("change", function () {
            const cities = luzonRegions[$(this).val()] || [];
            const cityOptions = cities
                .map(city => `<option value="${city}">${city}</option>`)
                .join("");
            $citySelect.html(
                `<option value="">Select City</option>${cityOptions}`
            );
        });

        // Set default city dropdown
        $citySelect.html('<option value="">Select City</option>');
    }

    // UPDATE CUSTOMER FIELD
    // --- Auto-fill Product Code, Additional, Rental Fee ---
    function updateCustomerModalFields() {
        // Group product sizes by product code
        const groupedProducts = {};

        cart.products.forEach(p => {
            if (!p.code) {
                console.warn("Product missing code:", p);
                return; // skip products without code
            }

            if (!groupedProducts[p.code]) {
                groupedProducts[p.code] = {};
            }

            if (!groupedProducts[p.code][p.size]) {
                groupedProducts[p.code][p.size] = 0;
            }

            groupedProducts[p.code][p.size] += p.quantity;
        });

        // Build the summary string using code instead of name with comma separation
        const productSummary = Object.entries(groupedProducts)
            .map(([code, sizes]) => {
                const sizeDetails = Object.entries(sizes)
                    .map(([size, qty]) => `${size} x${qty}`)
                    .join(", ");
                return `${code} (${sizeDetails})`;
            })
            .join(",\n");

        $("#client-product-code").val(productSummary);

        // Group all accessories by code (fallback to id or name)
        const groupedAdditionals = {};
        cart.accessories.forEach(a => {
            const code = a.code || a.id || a.name;
            if (!groupedAdditionals[code]) {
                groupedAdditionals[code] = 0;
            }
            groupedAdditionals[code] += a.quantity || 1;
        });

        const additionalArr = Object.entries(groupedAdditionals).map(
            ([code, qty]) => ({ code, quantity: qty })
        );

        const additionalSummary = additionalArr
            .map(item => `${item.code} x${item.quantity}`)
            .join(", ");
        $("#client-additional-code").val(additionalSummary);        // Set rental fee from Rental List total
        const cartTotal = $("#cart-total-amount").text() || "";
        $("#client-rental-fee").val(cartTotal);
        $("#client-rental-fee-display").text(cartTotal);
    }

    // UPDATE CUSTOMER MODAL SUMMARY - Enhanced function for better modal display
    function updateCustomerModalSummary() {
        console.log('Updating customer modal summary...');
        
        // Update the existing updateCustomerModalFields function
        if (typeof updateCustomerModalFields === "function") {
            updateCustomerModalFields();
        }
        
        // Calculate total amount
        const total = [
            ...cart.products.map(p => p.price * (p.quantity || 1)),
            ...cart.accessories.map(a => a.price)
        ].reduce((sum, val) => sum + val, 0);
        
        const formattedTotal = `₱${total.toLocaleString()}`;
        
        // Update all total displays in the modal
        $("#client-rental-fee-display").text(formattedTotal);
        $("#client-rental-fee").val(formattedTotal);
        
        console.log('Modal summary updated with total:', formattedTotal);
    }    // FUNCTION FOR CART PROCEED BUTTON - Enhanced with better modal handling
    $(document).on('click', '#cart-checkout-btn', async function(e) {
        e.preventDefault();
        console.log('Proceed to Payment button clicked');
        
        // Get total items in cart (both products and accessories/fees)
        const totalItems = cart.products.length + cart.accessories.length;
        console.log('Total items in cart:', totalItems);
        
        // Prevent checkout if no items are in the Rental List
        if (totalItems === 0) {
            notyf.error("Please add at least one item to the Rental List before proceeding.");
            return;
        }

        // Basic availability check for current date (without specific rental dates)
        if (cart.products.length > 0) {
            try {
                const currentDate = new Date().toISOString().split('T')[0];
                let hasUnavailableProducts = false;
                
                for (const product of cart.products) {
                    const availability = await checkProductAvailability(
                        product.id, 
                        product.size, 
                        currentDate,
                        null,
                        'Fixed Rental'
                    );
                    
                    if (!availability.available || availability.stock < (product.quantity || 1)) {
                        notyf.error(`"${product.name}" (${product.size}) has limited availability. Please verify rental dates carefully.`);
                        hasUnavailableProducts = true;
                    }
                }
                
                if (hasUnavailableProducts) {
                    console.log('Some products have availability issues, but allowing checkout with warning');
                }
                
            } catch (error) {
                console.error('Error during preliminary availability check:', error);
                // Continue with checkout even if availability check fails
            }
        }

        // Update customer modal with cart data
        updateCustomerModalSummary();

        // Set rental fee field with total amount (if exists)
        if ($rentalFeeField.length && $cartTotalAmount.length) {
            const cartTotal = $cartTotalAmount.text() || "";
            $rentalFeeField.val(cartTotal);
            $("#client-rental-fee-display").text(cartTotal);
        }

        // Optionally update other modal fields if needed
        if (typeof updateCustomerModalFields === "function") {
            updateCustomerModalFields();
        }

        // Initialize date restrictions when modal opens
        if (typeof setFixedRentalDateRestrictions === "function") {
            setFixedRentalDateRestrictions();
        }
        
        // Initially disable all date fields until rental type is selected
        $('#event-start-date').prop('disabled', true);
        $('#event-end-date').prop('disabled', true);
        $('#fixed-event-date').prop('disabled', true);
        
        // Also set up Open Rental date restrictions in case it's selected
        const today = new Date();
        const minStartDate = new Date(today);
        minStartDate.setDate(today.getDate() + 1); // Open Rental: current date + 1 day
        const minStartDateString = minStartDate.toISOString().split('T')[0];
        $("#event-start-date").attr('min', minStartDateString);
          // Show the customer modal with multiple methods to ensure it appears
        const $modal = $("#customer-modal");
        console.log('Customer modal element found:', $modal.length > 0);
        
        if ($modal.length) {
            // Remove hidden class and add show class to display modal
            $modal.removeClass('modal-hidden').addClass('show');
            $('body').addClass('modal-open');
            console.log('Customer modal should now be visible');
        } else {
            console.error('Customer modal element not found!');
            notyf.error('Unable to open payment form. Please refresh the page.');
        }
    });// --- Restrict Client Contact to Numbers Only and Enforce 09 Format ---
    $("#client-contact").on("input", function () {
        let value = this.value;
        
        // Remove any non-numeric characters
        value = value.replace(/[^0-9]/g, "");
        
        // Ensure it starts with 09
        if (value.length > 0 && !value.startsWith("09")) {
            // If user starts typing but doesn't start with 09, prepend 09
            if (value.length === 1 && value !== "0") {
                value = "09" + value;
            } else if (value.length >= 2 && value.substring(0, 2) !== "09") {
                // If first two digits are not 09, replace them
                value = "09" + value.substring(2);
            }
        }
        
        // Limit to 11 digits maximum
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        this.value = value;
    });

    // Auto-fill 09 when contact field gets focus and is empty
    $("#client-contact").on("focus", function () {
        if (this.value === "") {
            this.value = "09";
        }
    });// --- Payment Type Logic ---
    const $paymentType = $("#payment-status");
    const $totalPayment = $("#total-payment");
    const $remainingBalance = $("#remaining-balance");
    const $rentalFeeInput = $("#client-rental-fee");

    // Function to update the payment fields based on the selected payment type
    function updatePaymentFields() {
        try {
            // Get the rental fee value, removing non-numeric characters
            const rentalFee =
                parseFloat($rentalFeeInput.val().replace(/[^\d.]/g, "")) || 0;

            if (isNaN(rentalFee)) {
                throw new Error("Rental fee is not a valid number.");
            }

            const paymentType = $paymentType.val();

            if (!paymentType) {
                throw new Error("No payment type selected.");
            }

            // If the payment type is 'full'
            if (paymentType === "Full Payment") {
                $totalPayment.val(rentalFee);
                $totalPayment.prop("readonly", true);
                $remainingBalance.val(0);
            }
            // If the payment type is 'down'
            else if (paymentType === "Down Payment") {
                $totalPayment.val("");
                $totalPayment.prop("readonly", false);
                $remainingBalance.val(rentalFee);
            }
            // If unknown type
            else {
                $totalPayment.val("");
                $totalPayment.prop("readonly", true);
                $remainingBalance.val("");
                console.warn("Unexpected payment type:", paymentType);
            }
        } catch (error) {
            console.error(
                "Error in updatePaymentFields:",
                error.message,
                error
            );
            notyf.error("Something went wrong while updating payment fields.");
        }
    }

    // Event listener to update the payment fields whenever the payment type changes
    $paymentType.on("change", updatePaymentFields);

    // Event listener for the total payment input to validate the entered value when the user types
    $totalPayment.on("input", function () {
        // Get the rental fee value, removing non-numeric characters
        const rentalFee =
            parseFloat($rentalFeeInput.val().replace(/[^\d.]/g, "")) || 0;

        // Get the payment entered by the user, defaulting to 0 if empty
        let payment = parseFloat($totalPayment.val()) || 0;

        // If the payment type is 'down', validate the down payment amount
        if ($paymentType.val() === "Down Payment") { // Ensure this string matches your HTML option value
            // Calculate the minimum down payment (half of the rental fee)
            const minDown = rentalFee / 2;

            // Check if the entered down payment is less than the minimum allowed or invalid
            if (payment < minDown && payment > 0) {
                $totalPayment[0].setCustomValidity(
                    "Down payment must be at least half of the rental fee." // Custom error message if invalid
                );
            }
            // Check if the entered down payment is less than or equal to 0
            else if (payment <= 0) {
                $totalPayment[0].setCustomValidity(
                    "Down payment must be greater than 0." // Custom error message if invalid
                );
            }
            // If the payment is valid, reset the custom validity
            else {
                $totalPayment[0].setCustomValidity("");
            }

            // Update the remaining balance based on the down payment entered
            $remainingBalance.val(Math.max(rentalFee - payment, 0).toFixed(2)); // Format to two decimal places
        } else if ($paymentType.val() === "Full Payment") {
             $totalPayment[0].setCustomValidity(""); // Clear any previous validation
        }
    });    // --- Payment Method and Status Logic ---
    const $paymentMethod = $("#payment-method");
    const $digitalPaymentFields = $("#digital-payment-fields");
    const $referenceNo = $("#reference-no");
    const $cashChangeDisplay = $("#cash-change-display");

    // Function to calculate and display change for cash payments
    function calculateCashChange() {
        if ($paymentMethod.val() === "Cash") {
            const totalPayment = parseFloat($totalPayment.val()) || 0;
            const rentalFee = parseFloat($rentalFeeInput.val().replace(/[^\d.]/g, "")) || 0;
            
            if (totalPayment > rentalFee) {
                const change = totalPayment - rentalFee;
                $cashChangeDisplay.text(`₱${change.toLocaleString()} Change`).show();
            } else {
                $cashChangeDisplay.hide();
            }
        }
    }    // Function to check if total payment should be enabled
    function updateTotalPaymentState() {
        const method = $paymentMethod.val();
        const status = $paymentType.val();
        
        if (method && status) {
            $totalPayment.prop("disabled", false);
        } else {
            $totalPayment.prop("disabled", true).val("");
            $remainingBalance.val("");
            $cashChangeDisplay.hide();
        }
    }

    // Payment method change handler
    $paymentMethod.on("change", function() {
        const method = $(this).val();
        
        // Update total payment field state based on both method and status
        updateTotalPaymentState();
        
        if (method === "Cash") {
            $digitalPaymentFields.hide();
            $referenceNo.val("CASH").prop("readonly", true);
            // Show change display for cash payments
            $cashChangeDisplay.show();
            // Calculate change if total payment has value
            calculateCashChange();
        } else if (method === "Gcash" || method === "Maya" || method === "GoTyme") {
            $digitalPaymentFields.show();
            $referenceNo.val("").prop("readonly", false);
            $cashChangeDisplay.hide();
        } else {
            $digitalPaymentFields.hide();
            $referenceNo.val("").prop("readonly", false);
            $cashChangeDisplay.hide();
        }
    });

    // Payment status change handler
    $paymentType.on("change", function() {
        // Update total payment field state based on both method and status
        updateTotalPaymentState();
    });// Update change when total payment changes for cash payments
    $totalPayment.on("input", function() {
        calculateCashChange();
    });    // Prevent total payment input when payment method or status is not selected
    $totalPayment.on("focus", function() {
        const paymentMethod = $paymentMethod.val();
        const paymentStatus = $paymentType.val();
        
        if (!paymentMethod && !paymentStatus) {
            $(this).blur();
            notyf.error("Please select a payment method and payment status first.");
        } else if (!paymentMethod) {
            $(this).blur();
            notyf.error("Please select a payment method first.");
        } else if (!paymentStatus) {
            $(this).blur();
            notyf.error("Please select a payment status first.");
        }
    });

    // Initialize total payment field as disabled
    $totalPayment.prop("disabled", true);

    // --- Customer Form Validation and Submission Logic ---
    // Common validation rules
    const commonValidationRules = {
        required: true,
        trim: true
    };

    // Specific rules for different fields
    const specificFieldRules = {
        "client-full-name": {
            ...commonValidationRules,
            minLength: 3
        },        "client-contact": {
            ...commonValidationRules,
            // Custom validation function for contact number
            validate: function(value) {
                const regex = /^09[0-9]{9}$/;
                if (!regex.test(value)) {
                    return "Contact number must be 11 digits starting with 09.";
                }
                return true;
            }
        },
        "fixed-event-date": {
            ...commonValidationRules,
            // Custom validation function for event date
            validate: function(value) {
                // Check if the date is at least 1 day from now
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const minDate = new Date(today);
                minDate.setDate(today.getDate() + 1);
                
                const selectedDate = new Date(value);
                return selectedDate >= minDate || "Event date must be at least 1 day from today.";
            }
        },
        "client-rental-fee": {
            ...commonValidationRules,
            // Ensure this field is a number and greater than 0
            validate: function(value) {
                const numericValue = parseFloat(value.replace(/[^\d.-]/g, ""));
                return (
                    !isNaN(numericValue) && numericValue > 0 ||
                    "Rental fee must be a positive number."
                );
            }
        }
    };    // Apply validation rules to the form fields
    Object.keys(specificFieldRules).forEach(fieldId => {
        const rules = specificFieldRules[fieldId];

        // Special handling for contact field with debounce delay
        if (fieldId === "client-contact") {
            let contactValidationTimeout;
            
            // Validate only on blur (when user finishes typing)
            $(`#${fieldId}`).on("blur", function() {
                const $this = $(this);
                const value = $this.val();

                // Trim whitespace if rule is set
                let trimmedValue = rules.trim ? value.trim() : value;

                // Only validate if field has content
                if (trimmedValue && rules.validate) {
                    const validationResult = rules.validate(trimmedValue);
                    if (validationResult !== true) {
                        // Show error message only on blur
                        notyf.error(validationResult);
                        $this.addClass("invalid");
                        return;
                    }
                }

                $this.removeClass("invalid");
            });
            
            // Also validate with debounce on input for real-time feedback (but no errors)
            $(`#${fieldId}`).on("input", function() {
                const $this = $(this);
                clearTimeout(contactValidationTimeout);
                
                // Remove invalid class immediately on typing
                $this.removeClass("invalid");
                
                // Set a 2-second delay before validation (no error messages, just styling)
                contactValidationTimeout = setTimeout(function() {
                    const value = $this.val();
                    let trimmedValue = rules.trim ? value.trim() : value;
                    
                    if (trimmedValue && rules.validate) {
                        const validationResult = rules.validate(trimmedValue);
                        if (validationResult !== true) {
                            $this.addClass("invalid");
                            // Don't show notyf error on input, only visual feedback
                        } else {
                            $this.removeClass("invalid");
                        }
                    }
                }, 2000); // 2 second delay
            });
        } else {
            // For other fields, keep original validation behavior
            $(`#${fieldId}`).on("input change", function() {
                const $this = $(this);
                const value = $this.val();

                // Trim whitespace if rule is set
                let trimmedValue = rules.trim ? value.trim() : value;

                // Run custom validation if provided
                if (rules.validate) {
                    const validationResult = rules.validate(trimmedValue);
                    if (validationResult !== true) {
                        // Show error message
                        notyf.error(validationResult);
                        $this.addClass("invalid");
                        return;
                    }
                }

                $this.removeClass("invalid");
            });
        }
    });

    // FORM (CUSTOMER INFO) SUBMIT FUNCTION
    $("#customer-form").on("submit", async function (e) {
        e.preventDefault();        // VALIDATE DATE RESTRICTIONS BEFORE SUBMISSION
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const rentalType = $("#rental-type").val();
        let dateToValidate = null;
        let dateFieldName = "";
        let minAllowedDate = null;
        let startDate = null;
        let endDate = null;
        
        if (rentalType === "Open Rental") {
            startDate = $("#event-start-date").val();
            endDate = $("#event-end-date").val();
            if (startDate) {
                dateToValidate = new Date(startDate);
                dateFieldName = "Start date";
                minAllowedDate = new Date(today);
                minAllowedDate.setDate(today.getDate() + 1); // Open Rental: +1 day
            }
        } else if (rentalType === "Fixed Rental") {
            startDate = $("#fixed-event-date").val();
            if (startDate) {
                dateToValidate = new Date(startDate);
                dateFieldName = "Event date";
                minAllowedDate = new Date(today);
                minAllowedDate.setDate(today.getDate() + 1); // Fixed Rental: +1 day
            }
        }
        
        if (dateToValidate && minAllowedDate && dateToValidate < minAllowedDate) {
            notyf.error(`${dateFieldName} must be at least ${minAllowedDate.toLocaleDateString()}. Please select a valid date.`);
            return false;
        }

        // CHECK PRODUCT AVAILABILITY FOR SELECTED DATES
        if (startDate && cart.products.length > 0) {
            try {
                const cartProducts = cart.products.map(product => ({
                    id: product.id,
                    name: product.name,
                    size: product.size,
                    quantity: product.quantity || 1
                }));
                
                const availabilityResult = await checkCartAvailability(
                    cartProducts,
                    startDate,
                    endDate,
                    rentalType
                );
                
                if (!availabilityResult.available) {
                    let errorMessage = "Some products are not available for the selected dates:\n\n";
                    
                    availabilityResult.conflicts.forEach(conflict => {
                        errorMessage += `• ${conflict.product} (${conflict.size}): `;
                        if (conflict.available === 0) {
                            errorMessage += "No stock available";
                        } else {
                            errorMessage += `Only ${conflict.available} available, but ${conflict.requested} requested`;
                        }
                        errorMessage += "\n";
                    });
                    
                    errorMessage += "\nPlease modify your rental list or select different dates.";
                    
                    notyf.error(errorMessage);
                    return false;
                }
                
            } catch (error) {
                console.error('Error checking cart availability:', error);
                notyf.error('Error checking product availability. Please try again.');
                return false;
            }
        }

        // SPINNER VARIABLES
        const spinnerText = $("#spinner-text");
        const spinner = $("#spinner");

        try {
            spinner.removeClass("d-none");
            spinnerText.text("Preparing data...");
            
            // LOGGING CART PRODUCTS
            // console.log("CART PRODUCTS:", cart.products);

            // --- GROUP PRODUCTS ---
            const groupedProducts = {};
            cart.products.forEach(item => {
                if (
                    !item.id ||
                    !item.name ||
                    !item.code ||
                    !item.size ||
                    item.quantity == undefined ||
                    item.price == undefined
                ) {
                    console.warn("Invalid product skipped - missing required fields:", item);
                    return;
                }

                const key = item.id + "|" + item.name;
                if (!groupedProducts[key]) {
                    groupedProducts[key] = {
                        id: item.id,
                        code: item.code,
                        name: item.name,
                        sizes: {},
                        price: parseFloat(item.price)
                    };
                }

                if (!groupedProducts[key].sizes[item.size]) {
                    groupedProducts[key].sizes[item.size] = 0;
                }

                groupedProducts[key].sizes[item.size] += item.quantity;
            });
            
            // LOGGING CART PRODUCTS
            // console.log("Raw cart.products before grouping:", cart.products);

            const finalProductList = Object.values(groupedProducts);

            // --- GROUP ACCESSORIES ---
            const finalAccessoriesList = [];
            const simpleAccessoryMap = new Map();

            cart.accessories.forEach(item => {
                if (!item.code || !item.name || item.price === undefined) {
                    console.warn("Invalid accessory item skipped:", item);
                    return;
                }

                if (Array.isArray(item.types) && item.types.length > 0) {
                    finalAccessoriesList.push({
                        id: item.id || "",
                        code: item.code,
                        name: item.name,
                        price: item.price,
                        types: item.types
                    });
                } else {
                    const key = item.code + "|" + item.id;
                    if (!simpleAccessoryMap.has(key)) {
                        simpleAccessoryMap.set(key, {
                            id: item.id || "",
                            code: item.code,
                            name: item.name,
                            price: item.price,
                            quantity: 1
                        });
                    } else {
                        simpleAccessoryMap.get(key).quantity++;
                    }
                }
            });
            finalAccessoriesList.push(...simpleAccessoryMap.values());
            
            // LOGGING FINAL PRODUCT LIST
            // console.log("Final groupedProducts:", groupedProducts);
            // console.log("Final Product List:", finalProductList);

            // --- GENERATE TRANSACTION CODE ---
            spinnerText.text("Generating transaction code...");
            const transactionCode = await generateTransactionCode();

            if (!transactionCode.startsWith("TRNS-")) {
                throw new Error(
                    "Invalid transaction code generated: " + transactionCode
                );
            }            // --- COLLECT FORM DATA ---
            const rentalTypeVal = $("#rental-type").val();
            let eventStartDateVal = "";
            let eventEndDateVal = "";

            if (rentalTypeVal === "Fixed Rental") {
                eventStartDateVal = $("#fixed-event-date").val();
                eventEndDateVal = ""; // No end date for fixed rental
            } else if (rentalTypeVal === "Open Rental") {
                eventStartDateVal = $("#event-start-date").val();
                eventEndDateVal = $("#event-end-date").val();
            }            const formData = {
                fullName: $("#client-full-name").val().trim(),
                contactNumber: $("#client-contact").val().trim(),
                eventStartDate: eventStartDateVal,
                eventEndDate: eventEndDateVal,
                eventType: $("#event-type").val(),
                rentalFee:
                    parseInt(
                        $("#client-rental-fee").val().replace(/[^\d]/g, ""),
                        10
                    ) || 0,                rentalType: $("#rental-type").val(),
                paymentMethod: $("#payment-method").val(),
                paymentType: $("#payment-status").val(),
                totalPayment: parseFloat($("#total-payment").val()) || 0,
                remainingBalance:
                    parseFloat($("#remaining-balance").val()) || 0,
                referenceNo: $("#reference-no").val().trim(),                region: $("#client-region").val(),
                city: $("#client-city").val(),
                address: $("#client-address").val().trim(),
                notes: $("#client-notes").val().trim(),
                feeType: $("#additional-fee-description").val().trim() || "",
                additionalAmount: parseFloat($("#additional-fee-amount").val()) || 0,
                timestamp: new Date().toISOString(),
                products: finalProductList,
                accessories: finalAccessoriesList,
                transactionCode: transactionCode
            };
            
            // LOGGING FORM DATA
             console.log("Customer Form Data to submit:", formData);

            // === Validate no undefined fields ===
            for (const [key, value] of Object.entries(formData)) {
                if (value === undefined) {
                    throw new Error(`formData field "${key}" is undefined`);
                }
            }

            spinnerText.text("Submitting to Firestore...");
            const docRef = await addDoc(
                collection(chandriaDB, "transaction"),
                formData
            );

            spinnerText.text("Submission successful!");

            // SHOW SUCCESS MESSAGE
            notyf.success("Details Successfully Submitted!");
        } catch (error) {
            console.error("Form submission error:", error);

            // SHOW ERROR MESSAGE
            notyf.error(
                "An error occurred while submitting the form. Please check the console for details."
            );        } finally {
            spinner.addClass("d-none");
            $customerModal.hide();
            $("#customer-form")[0].reset();
            
            // Clear additional fee fields
            $("#additional-fee-description").val("");
            $("#additional-fee-amount").val("");
            
            // CLEARING CART
            clearCart();
            updateCartSummary();
        }
    });
    // --====== END OF SUBMITTING DATA TO FIREBASE ======--
  
    // END OF JAVASCRIPT HERE

    // ===== TABLE-BASED INTERFACE UI FUNCTIONS =====    // Function to populate the products table
    function populateProductsTable(products, additionals) {
        const tableBody = $("#products-table-body");
        
        // Clear any existing content completely
        tableBody.empty();
        
        const addedRows = new Set(); // Track added rows to prevent duplicates
        
        // Group products by their base product ID to combine sizes
        const groupedProducts = new Map();
        
        products.forEach(product => {
            if (product.size && typeof product.size === 'object') {
                if (!groupedProducts.has(product.id)) {
                    groupedProducts.set(product.id, {
                        product: product,
                        sizes: {}
                    });
                }
                
                // Add all sizes with stock > 0
                Object.entries(product.size).forEach(([sizeKey, sizeStock]) => {
                    if (sizeStock > 0) {
                        groupedProducts.get(product.id).sizes[sizeKey] = sizeStock;
                    }
                });
            }
        });
        
        // Create rows for grouped products (one row per product with multiple size buttons)
        groupedProducts.forEach((productData, productId) => {
            if (Object.keys(productData.sizes).length > 0) {
                const rowId = `product-${productId}`;
                
                if (addedRows.has(rowId)) {
                    return; // Skip duplicate
                }
                
                addedRows.add(rowId);
                const row = createProductTableRow(productData.product, productData.sizes);
                tableBody.append(row);
            }
        });
        
        // Add additionals to table
        additionals.forEach(additional => {
            const rowId = `additional-${additional.id}`;
            
            if (addedRows.has(rowId)) {
                return; // Skip duplicate
            }
            
            addedRows.add(rowId);
            const row = createAdditionalTableRow(additional);
            tableBody.append(row);
        });
    }      // Create a table row for products with multiple size buttons
    function createProductTableRow(product, sizes) {
        const sizeLabels = {
            XS: "Extra Small",
            S: "Small", 
            M: "Medium",
            L: "Large",
            XL: "Extra Large",
            XXL: "Double Extra Large",
            XXXL: "Triple Extra Large"
        };
        
        const imageUrl = getImageUrl(product, 'front') || './assets/images/long-gown.png';
        const price = product.price || 0;
        
        // Create size buttons HTML
        let sizeButtonsHTML = '';
        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
        
        // Sort sizes by predefined order
        const sortedSizes = Object.entries(sizes).sort(([sizeA], [sizeB]) => {
            const indexA = sizeOrder.indexOf(sizeA);
            const indexB = sizeOrder.indexOf(sizeB);
            const orderA = indexA === -1 ? sizeOrder.length : indexA;
            const orderB = indexB === -1 ? sizeOrder.length : indexB;
            return orderA - orderB;
        });
        
        sortedSizes.forEach(([size, stock]) => {
            const displaySize = sizeLabels[size] || size;
            sizeButtonsHTML += `
                <button class="size-button size-button-small" 
                        data-product-id="${product.id}"
                        data-product-name="${product.name}"
                        data-product-code="${product.code}"
                        data-product-price="${price}"
                        data-size="${size}"
                        data-stock="${stock}"
                        title="Click to add ${displaySize} to Rental List">
                    ${size}
                    <div class="stock-count">${stock}</div>
                </button>
            `;
        });
        
        return $(`
            <tr class="product-row" 
                data-id="${product.id}" 
                data-name="${product.name}" 
                data-code="${product.code}"
                data-price="${price}"
                data-category="products">
                <td>
                    <img src="${imageUrl}" alt="${product.name}" class="product-image" />
                </td>
                <td>
                    <div class="product-name-compact">${product.name}</div>
                    <div class="product-code-subtitle">${product.code}</div>
                </td>
                <td>
                    <span class="category-badge">Product</span>
                </td>
                <td class="sizes-column">
                    <div class="size-buttons-container">
                        ${sizeButtonsHTML}
                    </div>
                </td>
                <td>
                    <span class="price-display">₱${price.toLocaleString()}</span>
                </td>
            </tr>
        `);
    }
      // Create a table row for additionals
    function createAdditionalTableRow(additional) {
        const imageUrl = additional.imageUrl || './assets/images/accessory-sets.png';
        const price = additional.price || 0;
        
        return $(`
            <tr class="additional-row" 
                data-id="${additional.id}" 
                data-name="${additional.name}" 
                data-code="${additional.code}"
                data-price="${price}"
                data-category="additionals">
                <td>
                    <img src="${imageUrl}" alt="${additional.name}" class="product-image" />
                </td>
                <td>
                    <div class="product-name-compact">${additional.name}</div>
                    <div class="product-code-subtitle">${additional.code}</div>
                </td>
                <td>
                    <span class="category-badge">Additional</span>
                </td>
                <td>
                    <button class="size-button" 
                            data-additional-id="${additional.id}"
                            data-additional-name="${additional.name}"
                            data-additional-code="${additional.code}"
                            data-additional-price="${price}"
                            title="Click to add to Rental List">
                        ONE SIZE
                    </button>
                </td>
                <td>
                    <span class="price-display">₱${price.toLocaleString()}</span>
                </td>
            </tr>
        `);
    }// Listen for data loaded event from rental-service (bind only once)
    if (!window.rentalDataEventBound) {
        window.rentalDataEventBound = true;
        $(document).on('rentalDataLoaded', function(event, data) {
            populateProductsTable(data.products, data.additionals);
        });
    }
    
    // Filter functionality
    $(document).on('click', '.filter-btn', function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        const filter = $(this).data('filter');
        const rows = $('.products-table tbody tr');
        
        if (filter === 'all') {
            rows.show();
        } else {
            rows.hide();
            $(`.products-table tbody tr[data-category="${filter}"]`).show();
        }
    });
    
    // Search functionality for table
    $('.search-input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        const rows = $('.products-table tbody tr');
        
        rows.each(function() {
            const row = $(this);
            const name = row.find('.product-name').text().toLowerCase();
            const code = row.find('.product-code').text().toLowerCase();
            const category = row.find('.category-badge').text().toLowerCase();
            
            if (name.includes(searchTerm) || code.includes(searchTerm) || category.includes(searchTerm)) {
                row.show();
            } else {
                row.hide();
            }
        });
    });    // Handle size button clicks for products - direct add to Rental List
    $(document).on('click', '.size-button[data-product-id]', function(e) {
        e.stopPropagation(); // Prevent row click
        
        const productId = $(this).data('product-id');
        const productName = $(this).data('product-name');
        const productCode = $(this).data('product-code');
        const productPrice = $(this).data('product-price');
        const size = $(this).data('size');
        const stock = $(this).data('stock');
        
        // Count how many of this product-size combination we already have in Rental List
        const existingCount = cart.products.filter(
            p => p.id === productId && p.size === size
        ).length;
        
        // Check if we can add one more based on available stock
        if (existingCount >= stock) {
            notyf.error(`Cannot add more "${productName}" (${size}). Stock limit reached (${stock} available).`);
        } else {
            // Add product directly to Rental List with quantity 1
            cart.products.push({
                id: productId,
                name: productName,
                code: productCode,
                price: productPrice,
                size: size,
                quantity: 1            });
            
            updateNewCartDisplay();
        }
    });

    // Handle size button clicks for additionals
    $(document).on('click', '.size-button[data-additional-id]', function(e) {
        e.stopPropagation(); // Prevent row click
        
        const additionalId = $(this).data('additional-id');
        const additionalName = $(this).data('additional-name');
        const additionalCode = $(this).data('additional-code');
        const additionalPrice = $(this).data('additional-price');
        
        addAdditionalToCart(additionalId, additionalName, additionalCode, additionalPrice);
    });

    // Handle product row clicks (for product details, not size selection)
    $(document).on('click', '.product-row', function(e) {
        // Only trigger if not clicking on size button
        if (!$(e.target).closest('.size-button').length) {
            const productName = $(this).data('name');
            const productCode = $(this).data('code');
            
            // You can add product details modal here if needed
            console.log(`Product details: ${productName} (${productCode})`);
        }
    });

    // Handle additional row clicks (for additional details, not adding to Rental List)
    $(document).on('click', '.additional-row', function(e) {
        // Only trigger if not clicking on size button
        if (!$(e.target).closest('.size-button').length) {
            const additionalName = $(this).data('name');
            const additionalCode = $(this).data('code');
            
            // You can add additional details modal here if needed
            console.log(`Additional details: ${additionalName} (${additionalCode})`);
        }
    });
        // Add additional to Rental List
    function addAdditionalToCart(id, name, code, price) {
        const productCount = cart.products.length;
        
        // Check if there are any products in the Rental List first (but allow fees to be added without products)
        if (productCount === 0 && !name.toLowerCase().includes("fee")) {
            notyf.error("You must add at least one product before adding additional items.");
            return;
        }
        
        const countOfThis = cart.accessories.filter(item => item.name === name).length;
        
        // Check if we already have this additional item (limit one per product, but allow unlimited fees)
        if (!name.toLowerCase().includes("fee") && countOfThis >= productCount) {
            notyf.error(`You can only add as many '${name}' as products selected. You currently have ${productCount} product(s) and ${countOfThis} '${name}' item(s).`);
            return;
        }
        
        const accessory = { id, name, price };
        if (code) accessory.code = code;
        if (name.toLowerCase().includes("accessor")) accessory.types = [];
        
        cart.accessories.push(accessory);
        updateNewCartDisplay();
    }
    
    // Update cart display for new interface
    function updateNewCartDisplay() {
        const orderItems = $("#order-items");
        const emptyCart = $("#empty-cart");
        
        orderItems.find('.cart-item').remove();
          if (cart.products.length === 0 && cart.accessories.length === 0) {
            emptyCart.show();
        } else {
            emptyCart.hide();
            
            // Add individual product entries (not grouped)
            cart.products.forEach((product, index) => {
                const total = product.price * (product.quantity || 1);
                
                const cartItem = $(`
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${product.name}</div>
                            <div class="cart-item-details">Size: ${product.size} | Qty: ${product.quantity || 1}</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="cart-item-price">₱${total.toLocaleString()}</div>
                            <button class="remove-item-btn" data-product-index="${index}">
                                <i class="bx bx-trash"></i>
                            </button>
                        </div>
                    </div>
                `);
                
                orderItems.append(cartItem);
            });                       // Add accessories to display
            cart.accessories.forEach((item, idx) => {
                let detailsText = "Additional Item";
                
                // Handle fees differently
                if (item.isFee) {
                    detailsText = "Additional Fee";
                } else if (item.types && item.types.length > 0) {
                    detailsText = item.types.join(", ");
                }
                
                const cartItem = $(`
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-details">${detailsText}</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="cart-item-price">₱${item.price.toLocaleString()}</div>
                            ${item.name.toLowerCase().includes("accessor") && !item.isFee ? 
                                `<button class="edit-item-btn" data-accessory-idx="${idx}">
                                    <i class="bx bx-edit"></i>
                                </button>` : ''
                            }
                            <button class="remove-item-btn" data-accessory-idx="${idx}">
                                <i class="bx bx-trash"></i>
                            </button>
                        </div>
                    </div>
                `);
                
                orderItems.append(cartItem);
            });
        }
        
        updateOrderSummary();
    }      // Update order summary
    function updateOrderSummary() {
        const total = [
            ...cart.products.map(p => p.price * (p.quantity || 1)),
            ...cart.accessories.map(a => a.price)
        ].reduce((sum, val) => sum + val, 0);
        
        const formattedTotal = `₱${total.toLocaleString()}`;
        $("#cart-total-amount").text(formattedTotal);
        
        // Also update modal display if it exists
        const $modalDisplay = $("#client-rental-fee-display");
        if ($modalDisplay.length) {
            $modalDisplay.text(formattedTotal);
        }
        
        // Update hidden field as well
        const $hiddenField = $("#client-rental-fee");
        if ($hiddenField.length) {
            $hiddenField.val(formattedTotal);
        }
    }// Handle remove item buttons
    $(document).on('click', '.remove-item-btn', function() {
        const productIndex = $(this).data('product-index');
        const accessoryIdx = $(this).data('accessory-idx');
        
        if (productIndex !== undefined) {            // Remove individual product-size entry by index
            if (productIndex >= 0 && productIndex < cart.products.length) {
                const removedProduct = cart.products.splice(productIndex, 1)[0];
                
                // Check if there are any products left in Rental List
                const remainingProductCount = cart.products.length;
                
                if (remainingProductCount === 0) {
                    // If no products left, remove all additionals
                    cart.accessories = [];
                } else {
                    // Check if we need to remove excess additionals due to product limit
                    // Group additionals by name and count them
                    const additionalGroups = {};
                    cart.accessories.forEach(( item, idx) => {
                        if (!additionalGroups[item.name]) {
                            additionalGroups[item.name] = [];
                        }
                        additionalGroups[item.name].push(idx);
                    });
                    
                    // Remove excess additionals that exceed remaining product count
                    const indicesToRemove = [];
                    Object.entries(additionalGroups).forEach(([name, indices]) => {
                        if (indices.length > remainingProductCount) {
                            // Keep only up to remainingProductCount, mark rest for removal
                            const excessIndices = indices.slice(remainingProductCount);
                            indicesToRemove.push(...excessIndices);
                        }
                    });
                    
                    // Remove excess additionals (sort indices in descending order to avoid index shifting)
                    if (indicesToRemove.length > 0) {
                        indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                            cart.accessories.splice(idx, 1);
                        });
                        
                        notyf.error(`Removed ${indicesToRemove.length} excess additional item(s) due to product removal.`);
                    }                }
            }
        } else if (accessoryIdx !== undefined) {
            cart.accessories.splice(accessoryIdx, 1);
        }
        
        updateNewCartDisplay();
    });
    
    // Handle edit accessory buttons
    $(document).on('click', '.edit-item-btn', function() {
        const accessoryIdx = $(this).data('accessory-idx');
        const accessory = cart.accessories[accessoryIdx];
        showAccessoryModal(accessoryIdx, accessory.id);
    });
      // Handle clear cart button
    $("#clear-cart-btn").on('click', function() {
        cart.products = [];
        cart.accessories = [];
        
        // Also clear additional fee form fields
        $("#additional-fee-description").val("");
        $("#additional-fee-amount").val("");
        
        updateNewCartDisplay();
    });

    // ===== RENTAL TYPE DATE FIELD TOGGLE LOGIC =====
    const $rentalType = $("#rental-type");
    const $openRentalDatesWrapper = $("#open-rental-dates-wrapper");
    const $fixedDetailsRow = $("#fixed-details-row");
    const $eventStartDate = $("#event-start-date");
    const $eventEndDate = $("#event-end-date");
    const $fixedEventDate = $("#fixed-event-date");

    // Rental type change handler
    $rentalType.on("change", function() {
        const selectedType = $(this).val();
        
        // Hide all date field groups first
        $openRentalDatesWrapper.hide();
        $fixedDetailsRow.hide();
        
        // Clear all date values when switching rental types
        $eventStartDate.val('');
        $eventEndDate.val('');
        $fixedEventDate.val('');
        
        // Show appropriate date fields based on rental type
        if (selectedType === "Open Rental") {
            $openRentalDatesWrapper.show();
        } else if (selectedType === "Fixed Rental") {
            $fixedDetailsRow.show();
        }
    });    // Date validation for Open Rental fields
    function setDateRestrictions() {
        const today = new Date();
        const minStartDate = new Date(today);
        minStartDate.setDate(today.getDate() + 1); // Minimum is current date + 1 day
        
        const $startDate = $("#event-start-date");
        const $endDate = $("#event-end-date");
        
        // Set minimum date for start date (current date + 1 day)
        const minDateString = minStartDate.toISOString().split('T')[0];
        console.log('Today:', today.toDateString());
        console.log('Minimum start date:', minStartDate.toDateString());
        console.log('Setting min date string for start date:', minDateString);
        
        // Force set the min attribute and add visual class
        $startDate.attr('min', minDateString).addClass('date-restricted');
        console.log('Applied min attribute:', $startDate.attr('min'));
        
        // Aggressive validation - block ALL attempts to set invalid dates
        function validateAndBlockInvalidDate($input, fieldName) {
            const originalValue = $input.val();
            
            // Multiple event listeners to catch all possible ways of setting a date
            $input.off('.dateValidation').on('change.dateValidation input.dateValidation keyup.dateValidation blur.dateValidation', function(e) {
                const value = $(this).val();
                if (!value) return;
                
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const minAllowedDate = new Date(today);
                minAllowedDate.setDate(today.getDate() + 2);
                
                if (selectedDate < minAllowedDate) {
                    // Immediately clear the invalid value
                    $(this).val('');
                    $(this).addClass('invalid-date');
                    
                    // Show error message
                    notyf.error(`${fieldName} must be at least ${minAllowedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}. Please select a valid date.`);
                    
                    // Prevent the invalid date from being processed
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                } else {
                    $(this).removeClass('invalid-date');
                }
            });
            
            // Additional protection against programmatic changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        const value = $input.val();
                        if (value) {
                            const selectedDate = new Date(value);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);                    const minAllowedDate = new Date(today);
                    minAllowedDate.setDate(today.getDate() + 1);
                            
                            if (selectedDate < minAllowedDate) {
                                $input.val('');
                                $input.addClass('invalid-date');
                                notyf.error(`${fieldName} cannot be before ${minAllowedDate.toLocaleDateString()}`);
                            }
                        }
                    }
                });
            });
            
            if ($input[0]) {
                observer.observe($input[0], { attributes: true, attributeFilter: ['value'] });
            }
        }
        
        // Apply validation to start date
        validateAndBlockInvalidDate($startDate, 'Start date');
        
        // Initially disable end date
        $endDate.prop('disabled', true);
        
        // Handle start date changes
        $startDate.on('change', function() {
            const startDateValue = $(this).val();
            
            if (startDateValue) {
                // Enable end date and set its minimum to the day after start date
                $endDate.prop('disabled', false);
                const startDate = new Date(startDateValue);
                const minEndDate = new Date(startDate);
                minEndDate.setDate(startDate.getDate() + 1);
                
                const minEndDateString = minEndDate.toISOString().split('T')[0];
                $endDate.attr('min', minEndDateString);
                
                // Clear end date if it's now invalid
                const currentEndDate = $endDate.val();
                if (currentEndDate && currentEndDate <= startDateValue) {
                    $endDate.val('');
                }
            } else {
                // Disable end date if start date is cleared
                $endDate.prop('disabled', true);
                $endDate.val('');
            }
        });
        
        // Validate end date on change
        $endDate.on('change', function() {
            const startDateValue = $startDate.val();
            const endDateValue = $(this).val();
            
            if (startDateValue && endDateValue && endDateValue <= startDateValue) {
                $(this).val('');
                notyf.error('End date must be after the start date');
            }
        });
    }    // Rental type change handler with date field toggle logic
    $(document).on('change', '#rental-type', function() {
        const rentalType = $(this).val();
        const $openDatesWrapper = $('#open-rental-dates-wrapper');
        const $fixedDetailsRow = $('#fixed-details-row');
        const $startDate = $('#event-start-date');
        const $endDate = $('#event-end-date');
        const $fixedDate = $('#fixed-event-date');
        
        // Clear all date values when switching rental types
        $startDate.val('');
        $endDate.val('');
        $fixedDate.val('');
        
        if (rentalType === 'Open Rental') {
            $openDatesWrapper.show();
            $fixedDetailsRow.hide();
            // Enable Open Rental date fields
            $startDate.prop('disabled', false);
            $endDate.prop('disabled', true); // End date remains disabled until start date is filled
            // Disable Fixed Rental date field
            $fixedDate.prop('disabled', true);
            // Set up date restrictions for open rental
            setDateRestrictions();
        } else if (rentalType === 'Fixed Rental') {
            $openDatesWrapper.hide();
            $fixedDetailsRow.show();
            // Enable Fixed Rental date field
            $fixedDate.prop('disabled', false);
            // Disable Open Rental date fields
            $startDate.prop('disabled', true);
            $endDate.prop('disabled', true);
            // Set date restrictions for fixed rental (current date + 3 days)
            setFixedRentalDateRestrictions();
        } else {
            // No rental type selected - disable all date fields
            $openDatesWrapper.hide();
            $fixedDetailsRow.show();
            $startDate.prop('disabled', true);
            $endDate.prop('disabled', true);
            $fixedDate.prop('disabled', true);
        }
    });
    // ===== END TABLE-BASED INTERFACE UI FUNCTIONS =====    // Set date restrictions for Fixed Rental event date
    function setFixedRentalDateRestrictions() {
        const today = new Date();
        const minEventDate = new Date(today);
        minEventDate.setDate(today.getDate() + 1); // Minimum is current date + 1 day for Fixed Rental
        
        const minDateString = minEventDate.toISOString().split('T')[0];
        console.log('Today:', today.toDateString());
        console.log('Minimum fixed event date:', minEventDate.toDateString());
        console.log('Setting min date string for fixed event date:', minDateString);
        
        const $fixedDate = $('#fixed-event-date');
        $fixedDate.attr('min', minDateString).addClass('date-restricted');
        console.log('Applied min attribute to fixed date:', $fixedDate.attr('min'));
        
        // Apply the same aggressive validation to fixed date
        function validateAndBlockInvalidDate($input, fieldName) {
            // Multiple event listeners to catch all possible ways of setting a date
            $input.off('.dateValidation').on('change.dateValidation input.dateValidation keyup.dateValidation blur.dateValidation', function(e) {
                const value = $(this).val();
                if (!value) return;
                
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const minAllowedDate = new Date(today);
                minAllowedDate.setDate(today.getDate() + 1); // Fixed Rental needs 1 day advance
                
                if (selectedDate < minAllowedDate) {
                    // Immediately clear the invalid value
                    $(this).val('');
                    $(this).addClass('invalid-date');
                    
                    // Show error message
                    notyf.error(`${fieldName} must be at least ${minAllowedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}. Please select a valid date.`);
                    
                    // Prevent the invalid date from being processed
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                } else {
                    $(this).removeClass('invalid-date');
                }
            });
        }
        
        validateAndBlockInvalidDate($fixedDate, 'Event date');
    }

    // Debug: Log current date for testing
    console.log('Current date for testing:', new Date().toISOString().split('T')[0]);
    console.log('Current date + 1 day:', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]);    // Also set restrictions when document is ready
    setFixedRentalDateRestrictions();
    
    // Initially disable all date fields until rental type is selected
    $('#event-start-date').prop('disabled', true);
    $('#event-end-date').prop('disabled', true);
    $('#fixed-event-date').prop('disabled', true);
      console.log('Rental subscript initialization complete - date fields initially disabled');

    // --- Add Fee Modal Logic ---
    const $addFeeModal = $("#add-fee-modal");
    const $addFeeBtn = $("#add-fee-btn");
    const $addFeeClose = $(".add-fee-close");
    const $addFeeForm = $("#add-fee-form");
    const $cancelAddFeeBtn = $("#cancel-add-fee-btn");

    // Open Add Fee Modal
    $addFeeBtn.on("click", function () {
        $addFeeModal.show();
        $addFeeForm[0].reset();
        $addFeeModal.find("#fee-amount").removeClass("input-error");
    });

    // Close Add Fee Modal
    function closeAddFeeModal() {
        $addFeeModal.hide();
    }
    $addFeeClose.on("click", closeAddFeeModal);
    $cancelAddFeeBtn.on("click", closeAddFeeModal);
    $(window).on("click", function (e) {
        if ($(e.target).is($addFeeModal)) {
            closeAddFeeModal();
        }
    });    // Add Fee Form Submission
    $addFeeForm.on("submit", function (e) {
        e.preventDefault();
        
        console.log("Form submitted, debugging values...");
        console.log("Fee type element:", $("#fee-type"));
        console.log("Fee amount element:", $("#fee-amount"));
        
        const feeType = $("#fee-type").val();
        const feeAmountVal = $("#fee-amount").val();
        const feeAmount = parseFloat(feeAmountVal);
        
        console.log("Fee type value:", feeType);
        console.log("Fee amount value (raw):", feeAmountVal);
        console.log("Fee amount value (parsed):", feeAmount);
        console.log("Is fee amount NaN?", isNaN(feeAmount));
        console.log("Is fee amount <= 0?", feeAmount <= 0);
        
        if (!feeType || isNaN(feeAmount) || feeAmount <= 0) {
            $addFeeModal.find("#fee-amount").addClass("input-error");
            notyf.error("Please select a fee type and enter a valid amount greater than 0.");
            return;
        }        $addFeeModal.find("#fee-amount").removeClass("input-error");
        
        // Check if fee already exists in cart and remove it
        const existingFeeIndex = cart.accessories.findIndex(item => item.isFee === true);
        if (existingFeeIndex !== -1) {
            cart.accessories.splice(existingFeeIndex, 1);
        }
        
        // Add fee to cart as an accessory item
        const feeItem = {
            name: feeType + " Fee",
            price: feeAmount,
            isFee: true,
            types: []
        };
        cart.accessories.push(feeItem);
        
        // Populate the additional fee fields in the rental form
        $("#additional-fee-description").val(feeType + " Fee");
        $("#additional-fee-amount").val(feeAmount);
        
        console.log("Fee added to cart and populated in rental form:", { 
            description: feeType + " Fee", 
            amount: feeAmount 
        });
        
        // Update cart display to show the new fee
        updateNewCartDisplay();
        
        // Show success message
        notyf.success(`${feeType} fee of ₱${feeAmount.toLocaleString()} added to order.`);
        
        // Close the modal
        closeAddFeeModal();
    });
      // --- Clear Fee Button Logic ---
    $("#clear-fee-btn").on("click", function () {
        // Remove fee from cart
        const existingFeeIndex = cart.accessories.findIndex(item => item.isFee === true);
        if (existingFeeIndex !== -1) {
            cart.accessories.splice(existingFeeIndex, 1);
            updateNewCartDisplay();
        }
        
        // Clear form fields
        $("#additional-fee-description").val("");
        $("#additional-fee-amount").val("");
        notyf.success("Additional fee removed from order.");
    });

    // === ADDITIONAL FEE FLOW FUNCTIONS ===
    // Check if the page was loaded from additional fee flow
    function checkAdditionalFeeFlow() {
        const additionalFeeData = sessionStorage.getItem('additionalFeeData');
        if (additionalFeeData) {
            try {
                const data = JSON.parse(additionalFeeData);
                
                console.log("Additional Fee Flow Data:", data);
                
                // Pre-fill customer form with transaction data
                preFillCustomerFormFromTransaction(data);
                
                // If there's a pre-selected fee type, open the Add Fee modal
                if (data.preSelectedFeeType) {
                    setTimeout(() => {
                        openAddFeeModalWithPreSelected(data.preSelectedFeeType);
                    }, 500);
                }
                
                // Clear the session storage after using it
                sessionStorage.removeItem('additionalFeeData');
                
                return true;
            } catch (error) {
                console.error('Error parsing additional fee data:', error);
                sessionStorage.removeItem('additionalFeeData');
            }
        }
        return false;
    }

    // Pre-fill customer form with transaction data
    function preFillCustomerFormFromTransaction(transactionData) {
        // Fill customer information
        if (transactionData.customerName) {
            $("#client-full-name").val(transactionData.customerName);
        }
        if (transactionData.customerContact) {
            $("#client-contact").val(transactionData.customerContact);
        }
        if (transactionData.customerAddress) {
            $("#client-address").val(transactionData.customerAddress);
        }
        if (transactionData.customerCity) {
            $("#client-city").val(transactionData.customerCity);
        }
        if (transactionData.customerRegion) {
            $("#client-region").val(transactionData.customerRegion);
        }
        
        // Fill event information
        if (transactionData.eventType) {
            $("#event-type").val(transactionData.eventType);
        }
        if (transactionData.eventDate) {
            $("#fixed-event-date").val(transactionData.eventDate);
        }
        if (transactionData.eventEndDate) {
            $("#event-end-date").val(transactionData.eventEndDate);
        }
        if (transactionData.rentalType) {
            $("#rental-type").val(transactionData.rentalType);
        }
        
        // Fill payment information
        if (transactionData.paymentMethod) {
            $("#payment-method").val(transactionData.paymentMethod);
        }
        if (transactionData.paymentStatus) {
            $("#payment-status").val(transactionData.paymentStatus);
        }
        
        console.log('Customer form pre-filled with transaction data');
    }

    // Open Add Fee modal with pre-selected fee type
    function openAddFeeModalWithPreSelected(feeType) {
        // Open the modal
        $("#add-fee-modal").show();
        
        // Reset form
        $("#add-fee-form")[0].reset();
        
        // Pre-select the fee type
        $("#fee-type").val(feeType);
        
        // Focus on amount field
        $("#fee-amount").focus();
        
        console.log('Add Fee modal opened with pre-selected type:', feeType);
    }

    // --- Error Notification Logic (Using Notyf) ---
    function showErrorModal(message) {
        notyf.error(message);
    }
    
    // Real-time availability checking when dates change
    let availabilityCheckTimeout;
    
    // Check availability for Fixed Rental date
    $(document).on('change', '#fixed-event-date', async function() {
        const eventDate = $(this).val();
        if (!eventDate || cart.products.length === 0) return;
        
        // Clear previous timeout
        if (availabilityCheckTimeout) {
            clearTimeout(availabilityCheckTimeout);
        }
        
        // Add a small delay to avoid too many API calls
        availabilityCheckTimeout = setTimeout(async () => {
            await checkAndDisplayAvailability(eventDate, null, 'Fixed Rental');
        }, 500);
    });
    
    // Check availability for Open Rental dates
    $(document).on('change', '#event-start-date, #event-end-date', async function() {
        const startDate = $('#event-start-date').val();
        const endDate = $('#event-end-date').val();
        
        if (!startDate || cart.products.length === 0) return;
        
        // Clear previous timeout
        if (availabilityCheckTimeout) {
            clearTimeout(availabilityCheckTimeout);
        }
        
        // Add a small delay to avoid too many API calls
        availabilityCheckTimeout = setTimeout(async () => {
            await checkAndDisplayAvailability(startDate, endDate, 'Open Rental');
        }, 500);
    });
    
    // Function to check and display availability
    async function checkAndDisplayAvailability(startDate, endDate, rentalType) {
        try {
            const cartProducts = cart.products.map(product => ({
                id: product.id,
                name: product.name,
                size: product.size,
                quantity: product.quantity || 1
            }));
            
            const availabilityResult = await checkCartAvailability(
                cartProducts,
                startDate,
                endDate,
                rentalType
            );
            
            if (!availabilityResult.available) {
                let conflictProducts = availabilityResult.conflicts.map(c => `${c.product} (${c.size})`).join(', ');
                notyf.error(`Products not available for selected dates: ${conflictProducts}. Please select different dates or remove conflicting items.`);
            } else {
                // Optional: Show success message for available products
                // notyf.success('All products are available for the selected dates!');
            }
            
        } catch (error) {
            console.error('Error checking availability for date change:', error);
        }
    }
});
