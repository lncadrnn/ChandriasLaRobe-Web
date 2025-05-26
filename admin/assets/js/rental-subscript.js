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
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
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
    };

    // --- Utility to update the cart summary ---
    function updateCartSummary() {
        // --- Products (Gowns): Grouped Display ---
        const $cartItemsDiv = $(".cart-items");
        $cartItemsDiv.empty(); // Clear the cart items section

        const groupedProducts = {};

        // Group products by name
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

        // Render grouped products
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
    `);

            // Remove all sizes of this product
            $div.find(".cart-remove").on("click", function () {
                cart.products = cart.products.filter(p => p.name !== name);
                updateCartSummary();
            });

            $cartItemsDiv.append($div);
        });

        // --- Accessories & Other Items (Grouped Display) ---
        const $cartDetailsDiv = $(".cart-details");
        $cartDetailsDiv.empty(); // Clear the details section

        const grouped = {};

        // Group non-accessory items (e.g., wings)
        cart.accessories.forEach((item, idx) => {
            if (item.name.toLowerCase().includes("accessor")) return; // Skip if it's an accessory
            if (!grouped[item.name]) {
                grouped[item.name] = { ...item, count: 1, indexes: [idx] };
            } else {
                grouped[item.name].count++;
                grouped[item.name].indexes.push(idx);
            }
        });

        // Render grouped non-accessories
        $.each(grouped, (name, item) => {
            const $div = $('<div class="cart-row"></div>');
            $div.html(`
      <span>${item.name} <span class="cart-qty-badge">x${
          item.count
      }</span></span>
      <span>
        ₱${(item.price * item.count).toLocaleString()}
        <i class='bx bx-trash cart-remove' title="Remove One"></i>
      </span>
    `);

            // Click to remove one instance
            $div.find(".cart-remove").on("click", function () {
                if (item.indexes.length > 0) {
                    cart.accessories.splice(item.indexes[0], 1);
                    updateCartSummary();
                }
            });

            $cartDetailsDiv.append($div);
        });

        // --- Render accessories (individually with edit) ---
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

            // EDIT BUTTON
            const editIcon = `<i class='bx bx-edit cart-edit' title="Edit" data-idx="${idx}" data-id="${item.id}" style="cursor:pointer;"></i>`;

            $div.html(`
      <span>${item.name}${typesStr}</span>
      <span>
        ₱${item.price.toLocaleString()}
        <i class='bx bx-trash cart-remove' title="Remove"></i>
        ${editIcon}
      </span>
    `);

            // Remove accessory on click
            $div.find(".cart-remove").on("click", function () {
                cart.accessories.splice(idx, 1);
                updateCartSummary();
            });

            // Open accessory editor
            $div.find(".cart-edit").on("click", function () {
                const idx = $(this).data("idx");
                const id = $(this).data("id");
                showAccessoryModal(idx, id);
            });

            $cartDetailsDiv.append($div);
        });

        // --- Calculate and display total amount ---
        const total = [
            ...cart.products.map(p => p.price * (p.quantity || 1)),
            ...cart.accessories.map(a => a.price)
        ].reduce((sum, val) => sum + val, 0);

        $("#cart-total-amount").text(`₱${total.toLocaleString()}`);
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
            XXL: "Double Extra Large"
        };

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const sizes = data.size || {};

                const availableSizes = Object.entries(sizes).filter(
                    ([_, qty]) => qty > 0
                );

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
            );

            if (exists) {
                showErrorModal(
                    `"${productName}" (${size}) is already in the cart.`
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
                "No valid size/quantity selected or all items already in cart."
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
                $("#product-size-form input[type=checkbox]:checked").length > 0;

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

        $("#product-size-form input[type=checkbox]:checked").each(function () {
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
    // --====== END OF EVENT LISTENERS FOR PRODUCT SIZES ======--

    // ACCESSORIES CLICK FUNCTION
    $(document).on("click", ".additional-card", function () {
        const $card = $(this);
        const id = $card.data("id"); // Firestore document ID
        const code = $card.data("code"); // Accessory code (NEW)
        const name = $card.find(".pos-name").text();
        const price = parseInt(
            $card.find(".pos-price").text().replace(/[^\d]/g, "")
        );

        const countOfThis = cart.accessories.filter(
            item => item.name === name
        ).length;
        const productCount = cart.products.length;

        if (countOfThis >= productCount) {
            showErrorModal(
                `You can only add as many '${name}' as products selected.`
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

    // --- Error Modal Logic (jQuery version) ---
    const $errorModal = $("#error-modal");
    const $errorModalMsg = $("#error-modal-message");
    const $errorModalOk = $("#error-modal-ok");
    const $errorModalClose = $(".error-close");

    function showErrorModal(message) {
        if ($errorModal.length && $errorModalMsg.length) {
            $errorModalMsg.text(message);
            $errorModal.show();
        }
    }

    // Close modal on OK or X button click
    $errorModalOk.on("click", () => $errorModal.hide());
    $errorModalClose.on("click", () => $errorModal.hide());

    // Close modal if clicking outside of it
    $(window).on("click", function (e) {
        if ($(e.target).is($errorModal)) {
            $errorModal.hide();
        }
    });

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

        // Build the summary string using code instead of name
        const productSummary = Object.entries(groupedProducts)
            .map(([code, sizes]) => {
                const sizeDetails = Object.entries(sizes)
                    .map(([size, qty]) => `${size} x${qty}`)
                    .join(", ");
                return `${code} (${sizeDetails})`;
            })
            .join("; ");

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

        // Set rental fee from cart total
        $("#client-rental-fee").val($("#cart-total-amount").text() || "");
    }

    // FUNCTION FOR CART PROCEED BUTTON
    if ($checkoutBtn.length && $customerModal.length) {
        $checkoutBtn.on("click", function (e) {
            e.preventDefault();

            // Prevent checkout if no product is in the cart
            if (!cart.products.length) {
                showErrorModal(
                    "Please add at least one product to the cart before proceeding."
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
        if ($paymentType.val() === "down") {
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
        }
    });

    // --- Restrict Event Date: must be at least 2 days after today, but allow any date after that ---
    const $eventDateInput = $("#event-date"); // Selects the event date input field

    if ($eventDateInput.length) {
        // Set min date to today + 2 days (May 3, 2025)
        const minDate = new Date(2025, 4, 3); // May 3, 2025
        const minDateStr = minDate.toISOString().split("T")[0]; // Format the date to YYYY-MM-DD
        $eventDateInput.attr("min", minDateStr); // Set the minimum allowed date

        // Remove max date restriction
        $eventDateInput.removeAttr("max"); // Remove any max date restriction

        // Prevent manual entry of invalid dates on form submission
        if ($customerForm.length) {
            $customerForm.on("submit", function (e) {
                const selectedDate = new Date($eventDateInput.val()); // Get the selected date

                // If the selected date is earlier than the minimum date, prevent form submission
                if (selectedDate < minDate) {
                    e.preventDefault();
                    showErrorModal(
                        "Event date must be at least 2 days after today (May 3, 2025 or later)."
                    );
                    $eventDateInput.focus(); // Focus the event date input field
                }
            });
        }
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

    // FORM (CUSTOMER INFO) SUBMIT FUNCTION
    $("#customer-form").on("submit", async function (e) {
        e.preventDefault();

        // SPINNER VARIABLES
        const spinnerText = $("#spinner-text");
        const spinner = $("#spinner");

        try {
            spinner.removeClass("d-none");
            spinnerText.text("Preparing data...");

            // --- GROUP PRODUCTS ---
            const groupedProducts = {};
            cart.products.forEach(item => {
                if (
                    !item.id ||
                    !item.name ||
                    !item.code ||
                    !item.size ||
                    item.quantity === undefined ||
                    item.price === undefined
                ) {
                    console.warn("Invalid product skipped:", item);
                    return;
                }

                const key = item.id + "|" + item.name;
                if (!groupedProducts[key]) {
                    groupedProducts[key] = {
                        id: item.id,
                        code: item.code,
                        name: item.name,
                        sizes: {},
                        price: item.price
                    };
                }

                if (!groupedProducts[key].sizes[item.size]) {
                    groupedProducts[key].sizes[item.size] = 0;
                }

                groupedProducts[key].sizes[item.size] += item.quantity;
            });

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

            // --- GENERATE TRANSACTION CODE ---
            spinnerText.text("Generating transaction code...");
            const transactionCode = await generateTransactionCode();

            if (!transactionCode.startsWith("TRNS-")) {
                throw new Error(
                    "Invalid transaction code generated: " + transactionCode
                );
            }

            // --- COLLECT FORM DATA ---
            const formData = {
                fullName: $("#client-full-name").val().trim(),
                contactNumber: $("#client-contact").val().trim(),
                eventStartDate: $("#event-start-date").val(),
                eventEndDate: $("#event-end-date").val(),
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
                referenceNo: $("#reference-no").val().trim(),
                region: $("#client-region").val(),
                city: $("#client-city").val(),
                address: $("#client-address").val().trim(),
                notes: $("#client-notes").val().trim(),
                timestamp: new Date().toISOString(),
                products: finalProductList,
                accessories: finalAccessoriesList,
                transactionCode: transactionCode
            };

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
            $(".cart-items").empty();
            $(".cart-details").empty();
            $("#cart-total-amount").text(`₱0`);
        }
    });

    // END OF JAVASCRIPT HERE
});
