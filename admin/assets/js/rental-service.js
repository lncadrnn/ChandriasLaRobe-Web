import { chandriaDB, collection, getDocs } from "./sdk/chandrias-sdk.js";

// RENTAL LOADER FUNCTIONS
function showRentalLoader() {
    const rentalLoader = document.getElementById('rental-loader');
    if (rentalLoader) {
        rentalLoader.classList.remove('hidden');
        rentalLoader.style.display = 'flex';
    }
}

function hideRentalLoader() {
    const rentalLoader = document.getElementById('rental-loader');
    if (rentalLoader) {
        rentalLoader.classList.add('hidden');
        rentalLoader.style.display = 'none';
    }
}

$(document).ready(function () {
    // DISPLAY PRODUCTS FUNCTION
    async function displayProducts() {
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));

        // FETCHING DATA FROM DATABASE
        querySnapshot.forEach(doc => {
            const data = doc.data();

            // DISPLAYING DATA TO TABLE
            const card = `
            <div class="pos-card product-card" data-id="${doc.id}" data-name="${data.name}">
                <img src="${data.frontImageUrl}" alt="Gown" class="pos-img">
                    <div class="pos-info">
                        <div class="pos-name">${data.code}</div>
                        <div class="pos-price">₱${data.price}</div>
                    </div>
            </div>
            `;            // APPEND TO CONTAINER
            $(".pos-products").append(card);
        });
    }
    
    // DISPLAY ADDITIONALS PRODUCT FUNCTION
    async function displayAccessories() {
        const querySnapshot = await getDocs(
            collection(chandriaDB, "additionals")
        );

        querySnapshot.forEach(doc => {
            const data = doc.data();

            const card = `
            <div class="pos-card additional-card" data-id="${doc.id}" data-code="${data.code}">
                <img src="${data.imageUrl}" alt="Accessory" class="pos-img">
                <div class="pos-info">
                    <div class="pos-name">${data.name}</div>
                    <div class="pos-price">₱${data.price}</div>
                </div>
            </div>
            `;

            $(".pos-accessories").append(card);
        });
    }

    // Initialize all rental data with loader
    async function initializeAllRentalData() {
        try {
            showRentalLoader();
            await Promise.all([displayProducts(), displayAccessories()]);
        } catch (error) {
            console.error("Error initializing rental data:", error);
        } finally {
            hideRentalLoader();
        }
    }
    
    initializeAllRentalData();
    
    // --- EVENT TYPE FEE LOGIC ---
    // Removed event type logic as requested

    // --- PAYMENT METHOD REFERENCE NO LOGIC ---
    const paymentMethodSelector = $("#payment-method");
    const referenceNoInput = $("#reference-no");

    paymentMethodSelector.on("change", function () {
        let method = $(this).val();
        if (method === "Cash") {
            referenceNoInput.val("CASH").prop("readonly", true);
        } else {
            referenceNoInput.val("").prop("readonly", false);
        }
    });

    // Optionally, trigger the logic on page load if values are pre-filled
    paymentMethodSelector.trigger("change");

    // Patch: When modal is shown, trigger the custom event
    if ($("#customer-modal").is(":visible")) {
        $("#customer-modal").trigger("showModal");
    }
});
