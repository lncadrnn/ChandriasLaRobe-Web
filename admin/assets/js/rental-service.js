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
    // Prevent multiple initializations
    if (window.rentalServiceInitialized) {
        return;
    }
    window.rentalServiceInitialized = true;
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
    }    // DISPLAY PRODUCTS FUNCTION
    async function displayProducts() {
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));
        const products = [];
        const seenProductIds = new Set(); // To prevent duplicates

        // FETCHING DATA FROM DATABASE
        querySnapshot.forEach(doc => {
            // Skip if we've already seen this product ID
            if (seenProductIds.has(doc.id)) {
                return;
            }
            
            seenProductIds.add(doc.id);
            const data = doc.data();
            
            products.push({
                id: doc.id,
                name: data.name,
                code: data.code,
                price: data.price,
                size: data.size,
                frontImageUrl: data.frontImageUrl,
                description: data.description || '',
                category: 'Product'
            });
        });

        return products;
    }

    // DISPLAY ADDITIONALS PRODUCT FUNCTION
    async function displayAccessories() {
        const querySnapshot = await getDocs(
            collection(chandriaDB, "additionals")
        );
        const additionals = [];
        const seenAdditionalIds = new Set(); // To prevent duplicates

        querySnapshot.forEach(doc => {
            // Skip if we've already seen this additional ID
            if (seenAdditionalIds.has(doc.id)) {
                return;
            }
            
            seenAdditionalIds.add(doc.id);
            const data = doc.data();
            
            additionals.push({
                id: doc.id,
                name: data.name,
                code: data.code || data.name,
                price: data.price,
                imageUrl: data.imageUrl,
                description: data.description || '',
                category: 'Additional',
                inclusions: data.inclusions || []
            });
        });

        return additionals;
    }    // Initialize all rental data with loader (only once)
    async function initializeAllRentalData() {
        // Prevent multiple calls
        if (window.rentalDataInitialized) {
            return;
        }
        window.rentalDataInitialized = true;
        
        try {
            showRentalLoader();
            const [products, additionals] = await Promise.all([displayProducts(), displayAccessories()]);
            
            // Make data globally available
            window.rentalData = {
                products: products,
                additionals: additionals
            };
            
            // Trigger event to notify that data is loaded
            $(document).trigger('rentalDataLoaded', { products, additionals });
            
        } catch (error) {
            console.error("Error initializing rental data:", error);
            // Reset flag on error so user can retry
            window.rentalDataInitialized = false;
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
