import { chandriaDB, collection, getDocs } from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // DISPLAY PRODUCTS FUNCTION
    async function displayProducts() {
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));

        // FETCHING DATA FROM DATABASE
        querySnapshot.forEach(doc => {
            const data = doc.data();

            // DISPLAYING DATA TO TABLE
            const card = `
            <div class="pos-card" data-id="${doc.id}">
                <img src="${data.frontImageUrl}" alt="Gown" class="pos-img">
                    <div class="pos-info">
                        <div class="pos-name">${data.code}</div>
                        <div class="pos-price">₱${data.price}</div>
                    </div>
            </div>

                
            `;

            // APPEND TO CONTAINER
            $(".pos-products").append(card);
        });
    }
    displayProducts();
    
    // DISPLAY ADDITIONALS PRODUCT FUNCTION
    async function displayAccessories() {
        const querySnapshot = await getDocs(
            collection(chandriaDB, "additionals")
        );

        querySnapshot.forEach(doc => {
            const data = doc.data();

            const card = `
        <div class="pos-card" data-id="${doc.id}">
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
    displayAccessories(); 
    
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

    // --- EVENT DATE VALIDATION ---
    const eventDateInput = $("#event-date");
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const dd = String(today.getDate()).padStart(2, '0');

    // Calculate the date two days from today for the min attribute
    const twoDaysFromToday = new Date(today);
    twoDaysFromToday.setDate(today.getDate() + 2);
    const minYear = twoDaysFromToday.getFullYear();
    const minMonth = String(twoDaysFromToday.getMonth() + 1).padStart(2, '0');
    const minDay = String(twoDaysFromToday.getDate()).padStart(2, '0');
    const minDateString = `${minYear}-${minMonth}-${minDay}`;
    eventDateInput.attr("min", minDateString);

    eventDateInput.on("change", function () {
        const selectedDate = new Date($(this).val());
        selectedDate.setHours(0,0,0,0); // Normalize to midnight

        const todayNormalized = new Date(yyyy, today.getMonth(), dd); // Use normalized today

        // Calculate the date for tomorrow
        const tomorrow = new Date(todayNormalized);
        tomorrow.setDate(todayNormalized.getDate() + 1);

        if (selectedDate <= tomorrow) { // Check if selected date is today or tomorrow or in the past
            $("#error-modal-message").text("Event date must be at least two days after the current date.");
            $("#error-modal").show();
            $(this).val(""); // Clear the invalid date
        }
    });
});
