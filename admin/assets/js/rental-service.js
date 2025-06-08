import {
    collection,
    getDocs,
    onAuthStateChanged,
    auth,
    doc,
    getDoc,
    chandriaDB,
    signOut
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
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

    // RENTAL LOADER FUNCTIONS
    function showRentalLoader() {
        const $rentalLoader = $("#rental-loader");
        if ($rentalLoader.length) {
            $rentalLoader.removeClass("hidden").css("display", "flex");
        }
    }

    function hideRentalLoader() {
        const $rentalLoader = $("#rental-loader");
        if ($rentalLoader.length) {
            $rentalLoader.addClass("hidden").css("display", "none");
        }
    }

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
            `; // APPEND TO CONTAINER
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
