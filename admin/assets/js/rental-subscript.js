import { chandriaDB, collection, getDoc, doc } from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
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
        // --- Products (Gowns): show each unique product once ---
        const $cartItemsDiv = $(".cart-items");
        $cartItemsDiv.empty(); // Clear the cart items section

        const uniqueProducts = [];

        // Filter to keep only unique products by name and price
        cart.products.forEach(item => {
            if (
                !uniqueProducts.some(
                    p => p.name === item.name && p.price === item.price
                )
            ) {
                uniqueProducts.push(item);
            }
        });

        // Render each unique product
        uniqueProducts.forEach(item => {
            const $div = $('<div class="cart-item"></div>');
            $div.html(`
      <span>${item.name}</span>
      <span>
        ₱${item.price.toLocaleString()}
        <i class='bx bx-trash cart-remove' title="Remove"></i>
      </span>
    `);

            // Click to remove all instances of this product
            $div.find(".cart-remove").on("click", function () {
                cart.products = cart.products.filter(
                    p => !(p.name === item.name && p.price === item.price)
                );
                // Trim accessories if there are too many
                if (cart.accessories.length > cart.products.length) {
                    cart.accessories.splice(cart.products.length);
                }
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
        const total = [...cart.products, ...cart.accessories].reduce(
            (sum, item) => sum + item.price,
            0
        );
        $("#cart-total-amount").text(`₱${total.toLocaleString()}`);
    }

    // Listen for clicks on the #products container
    $("#products").on("click", function (e) {
        // Find the nearest parent with class .pos-card that was clicked
        const $card = $(e.target).closest(".pos-card");

        // If no product card was clicked, exit
        if (!$card.length) return;

        // Get the product name from the card
        const name = $card.find(".pos-name").text();

        // Get the price, remove any non-digit characters (like ₱), and convert to number
        const price = parseInt(
            $card.find(".pos-price").text().replace(/[^\d]/g, "")
        );

        // Check if product is already in cart based on name and price
        const exists = cart.products.some(
            p => p.name === name && p.price === price
        );
        if (exists) {
            showErrorModal("This product is already in the cart.");
            return;
        }

        // Add the product to the cart
        cart.products.push({ name, price });

        // Update the cart display
        updateCartSummary();
    });

    // ACCESSORIES CLICK FUNCTION
    $("#accessories").on("click", ".pos-card", function () {
        const $card = $(this);
        const id = $card.data("id"); // <-- Firestore document ID
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

        if (name.toLowerCase().includes("accessor")) {
            cart.accessories.push({ id, name, price, types: [] }); // <-- Add id to cart
        } else {
            cart.accessories.push({ id, name, price });
        }

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

    // When checkout button is clicked
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

            // Set rental fee field with total amount
            if ($rentalFeeField.length && $cartTotalAmount.length) {
                $rentalFeeField.val($cartTotalAmount.text() || "");
            }

            // Show the customer modal
            $customerModal.show();
        });
    }

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

    // Handle form submission
    if ($customerForm.length) {
        $customerForm.on("submit", function (e) {
            e.preventDefault();

            // Hide the modal after submitting
            $customerModal.hide();

            // Show error modal as placeholder (replace with real submission logic)
            showErrorModal("Customer form submitted! (Demo only)");
        });
    }

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

    // --- Auto-fill Product Code, Additional, Rental Fee ---
    function updateCustomerModalFields() {
        // Concatenate all product names/codes in the cart and display them in the 'client-product-code' field
        const productCodes = cart.products.map(p => p.name).join(", ");
        $("#client-product-code").val(productCodes);

        // Create an array to hold additional items like accessories or wings
        let additionalArr = [];

        // Count the number of wings in the cart
        const wingsCount = cart.accessories.filter(a =>
            a.name.toLowerCase().includes("wing")
        ).length;

        // Check if there are any accessories in the cart and add them to the additional items array
        if (
            cart.accessories.some(a =>
                a.name.toLowerCase().includes("accessor")
            )
        )
            additionalArr.push("Accessory");

        // If there are wings, add them to the additional items array, including the count if greater than 1
        if (wingsCount > 0)
            additionalArr.push(
                `Wings${wingsCount > 1 ? " x" + wingsCount : ""}`
            );

        // Set the value of the 'client-additional' field with the additional items list
        $("#client-additional").val(additionalArr.join(", "));

        // Set the rental fee in the 'client-rental-fee' field based on the total amount in the cart
        $("#client-rental-fee").val($("#cart-total-amount").text() || "");
    }

    // When the checkout button is clicked
    if ($checkoutBtn && $customerModal) {
        $($checkoutBtn).on("click", function (e) {
            e.preventDefault();

            // Check if there are products in the cart
            if (!cart.products.length) {
                // If no products, show an error message
                showErrorModal(
                    "Please add at least one product to the cart before proceeding."
                );
                return;
            }

            // Update the customer modal fields with the cart details
            updateCustomerModalFields();

            // Show the customer modal
            $($customerModal).show();
        });
    }

    // --- Restrict Client Contact to Numbers Only ---
    $("#client-contact").on("input", function () {
        // Replace any non-numeric character with an empty string
        this.value = this.value.replace(/[^0-9]/g, "");
    });

    // --- Payment Type Logic ---
    const $paymentType = $("#payment-type"); // Selects the payment type dropdown
    const $totalPayment = $("#total-payment"); // Selects the total payment input field
    const $remainingBalance = $("#remaining-balance"); // Selects the remaining balance input field
    const $rentalFeeInput = $("#client-rental-fee"); // Selects the rental fee input field

    // Function to update the payment fields based on the selected payment type
    function updatePaymentFields() {
        // Get the rental fee value, removing non-numeric characters
        const rentalFee =
            parseFloat($rentalFeeInput.val().replace(/[^\d.]/g, "")) || 0;

        // If the payment type is 'full', set the total payment to the full rental fee and disable further input
        if ($paymentType.val() === "full") {
            $totalPayment.val(rentalFee); // Set the total payment to the full rental fee
            $totalPayment.prop("readonly", true); // Make the total payment input read-only
            $remainingBalance.val(0); // Set the remaining balance to 0
        }
        // If the payment type is 'down', enable the total payment input for the user to enter down payment
        else if ($paymentType.val() === "down") {
            $totalPayment.val(""); // Clear the total payment input
            $totalPayment.prop("readonly", false); // Enable editing of the total payment
            $remainingBalance.val(rentalFee); // Set the remaining balance to the full rental fee
        }
        // If no valid payment type is selected, reset both fields
        else {
            $totalPayment.val(""); // Clear the total payment input
            $totalPayment.prop("readonly", true); // Make the total payment input read-only
            $remainingBalance.val(""); // Clear the remaining balance
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
});
