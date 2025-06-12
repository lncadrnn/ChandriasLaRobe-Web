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
                dismissible: true
            }
        ]
    });
    
    const $body = $("body"),
        $sidebar = $body.find(".sidebar"),
        $toggle = $body.find(".toggle"),
        $modeSwitch = $body.find(".toggle-switch"),
        $modeText = $body.find(".mode-text");

    // --- Restore sidebar state from localStorage ---
    // If 'admin-sidebar-closed' is "true", add the 'close' class to the sidebar
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        $sidebar.addClass("close");
    }

    // --- Sidebar toggle (chevron button) ---
    // When the toggle button is clicked...
    if ($toggle.length && $sidebar.length) {
        $toggle.on("click", function () {
            // Toggle the 'close' class on the sidebar
            const isClosed = $sidebar.toggleClass("close").hasClass("close");

            // Save the state (true or false) in localStorage
            localStorage.setItem("admin-sidebar-closed", isClosed);
        });
    }

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
    $("#proceed-btn").on("click", function () {
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

        selectedSizes.each(function () {
            const size = $(this).val();
            const $qtyInput = $(`#size-qty-${size}`);
            const altQtyInput = $(this)
                .closest("label")
                .find(".quantity-input");
            const qty = parseInt($qtyInput.val() || altQtyInput.val(), 10);

            if (!qty || qty < 1) return;

            anyValid = true;

            const exists = cart.products.some(
                p => p.id === productId && p.size === size
            );            if (exists) {
                notyf.error(
                    `"${productName}" (${size}) is already in the Rental List.`
                );
            } else {
                cart.products.push({
                    id: productId,
                    name: productName,
                    code: productCode,
                    price: productPrice,
                    size: size,
                    quantity: qty
                });
                added = true;
            }
        });

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
        );

        const productCount = cart.products.length;
        
        // Check if there are any products in the cart first
        if (productCount === 0) {
            notyf.error("You must add at least one product before adding additional items.");
            return;
        }

        const countOfThis = cart.accessories.filter(
            item => item.name === name
        ).length;

        if (countOfThis >= productCount) {
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
    }

    // Check for appointment flow on page load
    const isAppointmentFlow = checkAppointmentFlow();
    if (isAppointmentFlow) {
        console.log('Page loaded from appointment flow - data pre-populated');
    }    // --- Error Notification Logic (Using Notyf) ---
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
    const $cartTotalAmount = $("#cart-total-amount");

    // Close the modal when close button is clicked
    if ($customerClose.length) {
        $customerClose.on("click", function () {
            $customerModal.hide();
        });
    }

    // Close the modal when clicking outside of it
    $(window).on("click", function (e) {
        if ($(e.target).is($customerModal)) {
            $customerModal.hide();
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
        $("#client-additional-code").val(additionalSummary);

        // Set rental fee from Rental List total
        $("#client-rental-fee").val($("#cart-total-amount").text() || "");
    }

    // FUNCTION FOR CART PROCEED BUTTON
    if ($checkoutBtn.length && $customerModal.length) {
        $checkoutBtn.on("click", function (e) {            e.preventDefault();
            
            // Prevent checkout if no product is in the Rental List
            if (!cart.products.length) {
                notyf.error(
                    "Please add at least one product to the Rental List before proceeding."
                );
                return;
            }

            // Set rental fee field with total amount (if exists)
            if ($rentalFeeField.length && $cartTotalAmount.length) {
                $rentalFeeField.val($cartTotalAmount.text() || "");
            }

            // Optionally update other modal fields if needed
            if (typeof updateCustomerModalFields === "function") {
                updateCustomerModalFields();
            }

            // Show the customer modal
            $customerModal.show();
        });
    }

    // --- Restrict Client Contact to Numbers Only ---
    $("#client-contact").on("input", function () {
        // Replace any non-numeric character with an empty string
        this.value = this.value.replace(/[^0-9]/g, "");
    });

    // --- Payment Type Logic ---
    const $paymentType = $("#payment-type");
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
    });

    // --- Restrict Event Date ---
    const $rentalType = $("#rental-type");
    const $fixedEventDateInput = $("#fixed-event-date");
    const $fixedEventDateWrapper = $("#fixed-event-date-wrapper"); 
    const $fixedDetailsRow = $("#fixed-details-row"); 
    
    const $eventStartDate = $("#event-start-date");
    const $eventEndDate = $("#event-end-date");
    const $openRentalDatesWrapper = $("#open-rental-dates-wrapper");

    // Helper function to get 'YYYY-MM-DD' string from a local Date object
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Function to set the event end date's MINIMUM based on the selected start date (for Open Rental)
    function updateEventEndDateMin() {
        if ($rentalType.val() === "Open Rental") {
            const startDateVal = $eventStartDate.val();
            if (startDateVal) {
                const parts = startDateVal.split('-');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; 
                const day = parseInt(parts[2], 10);
                const startDate = new Date(year, month, day); 

                const nextDayOfStartDate = new Date(startDate);
                nextDayOfStartDate.setDate(startDate.getDate() + 1);
                
                const nextDayOfStartDateStr = getLocalDateString(nextDayOfStartDate);
                $eventEndDate.attr("min", nextDayOfStartDateStr);

                if ($eventEndDate.val() && new Date($eventEndDate.val()) < nextDayOfStartDate) {
                    $eventEndDate.val("");
                }
            } else {
                $eventEndDate.removeAttr("min").val("");
            }
        }
    }
    
    function toggleDateFields() {
        const rentalType = $rentalType.val();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minBookableDate = new Date(today);
        minBookableDate.setDate(today.getDate() + 2);
        const minBookableDateStr = getLocalDateString(minBookableDate);

        // Ensure the row containing rental fee (and potentially fixed event date) is visible.
        // The rental fee itself should always be visible.
        $fixedDetailsRow.show(); 
        
        // Default state for specific date inputs/wrappers:
        // Hide the "Fixed Event Date" wrapper initially.
        $fixedEventDateWrapper.hide(); 
        $fixedEventDateInput.removeAttr("required").val("").removeAttr("min");
        
        // Hide the "Open Rental" dates wrapper initially.
        $openRentalDatesWrapper.hide();
        $eventStartDate.removeAttr("required").val("").removeAttr("min");
        $eventEndDate.removeAttr("required").val("").removeAttr("min");

        if (rentalType === "Fixed Rental") {
            // Show the "Fixed Event Date" wrapper (it's in $fixedDetailsRow with rental fee).
            $fixedEventDateWrapper.show(); 
            $fixedEventDateInput.attr("required", "required").attr("min", minBookableDateStr);
            // $openRentalDatesWrapper remains hidden.

            if ($fixedEventDateInput.val()) {
                const currentDateVal = $fixedEventDateInput.val();
                const currentParts = currentDateVal.split('-');
                const currentDateLocal = new Date(parseInt(currentParts[0]), parseInt(currentParts[1]) - 1, parseInt(currentParts[2]));
                if (currentDateLocal < minBookableDate) {
                    $fixedEventDateInput.val(""); 
                }
            }
        } else if (rentalType === "Open Rental") {
            // $fixedEventDateWrapper remains hidden (so only rental fee shows in $fixedDetailsRow).
            
            // Show the "Open Rental" dates.
            $openRentalDatesWrapper.show();
            $eventStartDate.attr("required", "required").attr("min", minBookableDateStr);
            $eventEndDate.attr("required", "required");
            
            // Disable end date initially if no start date is selected
            if (!$eventStartDate.val()) {
                $eventEndDate.prop("disabled", true);
            } else {
                $eventEndDate.prop("disabled", false);
            }
            
            if ($eventStartDate.val()) {
                const currentStartDateVal = $eventStartDate.val();
                const currentStartParts = currentStartDateVal.split('-');
                const currentStartDateLocal = new Date(parseInt(currentStartParts[0]), parseInt(currentStartParts[1]) - 1, parseInt(currentStartParts[2]));
                if (currentStartDateLocal < minBookableDate) {
                    $eventStartDate.val(""); 
                    // Disable end date if start date is cleared
                    $eventEndDate.prop("disabled", true);
                }
            }
            updateEventEndDateMin();
        } else { // No rental type selected (initial state)
            // $fixedEventDateWrapper remains hidden.
            // $openRentalDatesWrapper remains hidden.
            // $fixedDetailsRow is shown, so rental fee is visible.
        }
    }

    // Initialize and attach listeners
    if ($fixedEventDateInput.length && $eventStartDate.length && $eventEndDate.length) {
        $eventStartDate.on("change", function() {
            // Enable/disable end date based on start date selection
            if ($rentalType.val() === "Open Rental") {
                if ($eventStartDate.val()) {
                    $eventEndDate.prop("disabled", false);
                } else {
                    $eventEndDate.prop("disabled", true).val("");
                }
            }
            updateEventEndDateMin();
        });
        $rentalType.on("change", toggleDateFields);
        toggleDateFields(); // Initial call
    }

    // Prevent manual entry of invalid dates on form submission
    if ($customerForm.length) {
        $customerForm.on("submit", function (e) {
            const rentalTypeSelected = $rentalType.val();
            
            const todayForSubmit = new Date();
            todayForSubmit.setHours(0, 0, 0, 0);
            const minBookableDateOnSubmit = new Date(todayForSubmit);
            minBookableDateOnSubmit.setDate(todayForSubmit.getDate() + 2);

            if (rentalTypeSelected === "Fixed Rental") {                const fixedDateVal = $fixedEventDateInput.val();
                if (!fixedDateVal) { 
                    notyf.error("Event Date is required for Fixed Rental.");
                    e.preventDefault();
                    $fixedEventDateInput.focus();
                    return;
                }
                const dateParts = fixedDateVal.split('-');
                const dateLocal = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                if (dateLocal < minBookableDateOnSubmit) {
                    e.preventDefault();
                    notyf.error("Event Date must be at least 2 days after today.");
                    $fixedEventDateInput.focus();
                    return;
                }
            } else if (rentalTypeSelected === "Open Rental") {                const startDateVal = $eventStartDate.val();
                if (!startDateVal) { 
                    notyf.error("Event start date is required for Open Rental.");
                    e.preventDefault();
                    $eventStartDate.focus();
                    return;
                }
                const startParts = startDateVal.split('-');
                const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                if (startDateLocal < minBookableDateOnSubmit) {
                    e.preventDefault();
                    notyf.error("Event start date must be at least 2 days after today.");
                    $eventStartDate.focus();
                    return;
                }

                const endDateVal = $eventEndDate.val();
                if (!endDateVal) { 
                     notyf.error("Event end date is required for Open Rental.");
                     e.preventDefault();
                     $eventEndDate.focus();
                     return;
                }
                const endParts = endDateVal.split('-');
                const endDateLocal = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
                const expectedMinEndDate = new Date(startDateLocal);
                expectedMinEndDate.setDate(startDateLocal.getDate() + 1);
                if (endDateLocal < expectedMinEndDate) {
                     e.preventDefault();
                     notyf.error("Event end date must be at least one day after the event start date.");
                     $eventEndDate.focus();
                     return;
                }
            }
        });
    }

    // TRANSACTION CODE GENERATOR FUNCTION
    async function generateTransactionCode() {
        try {
            const now = new Date();
            const mmddyy = now
                .toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "2-digit"
                })
                .replace(/\//g, ""); // Format: MMDDYY

            const prefix = "TRNS-" + mmddyy + "-";
            const rentalsRef = collection(chandriaDB, "transaction");

            const q = query(
                rentalsRef,
                where("transactionCode", ">=", prefix + "000"),
                where("transactionCode", "<=", prefix + "999")
            );

            const snapshot = await getDocs(q);
            let maxSeq = 0;

            snapshot.forEach(doc => {
                const code = doc.data().transactionCode;
                const match = code.match(/-(\d{3})$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxSeq) maxSeq = num;
                }
            });

            const newSeq = (maxSeq + 1).toString().padStart(3, "0");
            return prefix + newSeq;
        } catch (error) {
            console.error("Error generating transaction code:", error);

            // Optional: Notify the user via alert or UI element
            alert(
                "Failed to generate transaction code. Please try again later."
            );

            // Optional: Return a fallback code with 'ERR'
            const fallbackCode =
                "TRNS-ERROR-" + Date.now().toString().slice(-3);
            return fallbackCode;
        }
    }
    
    // --====== START OF SUBMITTING DATA TO FIREBASE ======--
    // FORM (CUSTOMER INFO) SUBMIT FUNCTION
    $("#customer-form").on("submit", async function (e) {
        e.preventDefault();

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
            }

            // --- COLLECT FORM DATA ---
            const rentalTypeVal = $("#rental-type").val();
            let eventStartDateVal = "";
            let eventEndDateVal = "";

            if (rentalTypeVal === "Fixed Rental") {
                eventStartDateVal = $fixedEventDateInput.val();
                eventEndDateVal = ""; // No end date for fixed rental
            } else if (rentalTypeVal === "Open Rental") {
                eventStartDateVal = $eventStartDate.val();
                eventEndDateVal = $eventEndDate.val();
            }


            const formData = {
                fullName: $("#client-full-name").val().trim(),
                contactNumber: $("#client-contact").val().trim(),
                eventStartDate: eventStartDateVal,
                eventEndDate: eventEndDateVal,
                eventType: $("#event-type").val(),
                rentalFee:
                    parseInt(
                        $("#client-rental-fee").val().replace(/[^\d]/g, ""),
                        10
                    ) || 0,
                rentalType: $("#rental-type").val(),
                paymentMethod: $("#payment-method").val(),
                paymentType: $("#payment-type").val(),
                totalPayment: parseFloat($("#total-payment").val()) || 0,
                remainingBalance:
                    parseFloat($("#remaining-balance").val()) || 0,
                referenceNo: $("#client-reference-no").val().trim(),
                region: $("#client-region").val(),
                city: $("#client-city").val(),
                address: $("#client-address").val().trim(),
                notes: $("#client-notes").val().trim(),
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
            );
        } finally {
            spinner.addClass("d-none");
            $customerModal.hide();
            $("#customer-form")[0].reset();
            
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
        
        const imageUrl = product.frontImageUrl || './assets/images/long-gown.png';
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
                </td>
                <td>
                    <span class="product-code">${product.code}</span>
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
                </td>
                <td>
                    <span class="product-code">${additional.code}</span>
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
                quantity: 1
            });
            
            updateNewCartDisplay();
            notyf.success(`Added "${productName}" (${size}) to Rental List!`);
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
        
        // Check if there are any products in the Rental List first
        if (productCount === 0) {
            notyf.error("You must add at least one product before adding additional items.");
            return;
        }
        
        const countOfThis = cart.accessories.filter(item => item.name === name).length;
        
        // Check if we already have this additional item (limit one per product)
        if (countOfThis >= productCount) {
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
            });
            
            // Add accessories to display
            cart.accessories.forEach((item, idx) => {
                let detailsText = "Additional Item";
                if (item.types && item.types.length > 0) {
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
                            ${item.name.toLowerCase().includes("accessor") ? 
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
    }
      // Update order summary
    function updateOrderSummary() {
        const total = [
            ...cart.products.map(p => p.price * (p.quantity || 1)),
            ...cart.accessories.map(a => a.price)
        ].reduce((sum, val) => sum + val, 0);
        
        $("#cart-total-amount").text(`₱${total.toLocaleString()}`);
    }    // Handle remove item buttons
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
                
                notyf.success(`Removed "${removedProduct.name}" (${removedProduct.size}) from Rental List.`);
            }
        } else if (accessoryIdx !== undefined) {
            cart.accessories.splice(accessoryIdx, 1);
            notyf.success("Additional item removed from Rental List.");
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
        updateNewCartDisplay();
    });
      // ===== END TABLE-BASED INTERFACE UI FUNCTIONS =====
});
