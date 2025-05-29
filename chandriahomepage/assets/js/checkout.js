// CHECKOUT JS
import {
    onAuthStateChanged,
    auth,
    appCredential,
    chandriaDB,
    collection,
    getDoc,
    addDoc,
    doc
} from "./sdk/chandrias-sdk.js";

// #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
// CHECKOUT LOADER FUNCTIONS
function showCheckoutLoader() {
    const checkoutLoader = document.getElementById('checkout-loader');
    if (checkoutLoader) {
        checkoutLoader.classList.remove('hidden');
        checkoutLoader.style.display = 'flex';
    }
}

function hideCheckoutLoader() {
    const checkoutLoader = document.getElementById('checkout-loader');
    if (checkoutLoader) {
        checkoutLoader.classList.add('hidden');
        checkoutLoader.style.display = 'none';
    }
}

$(document).ready(function () {
    // INITIALIZING NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // Set min date for checkout date input to today
    const todayDate = new Date().toISOString().split('T')[0];
    $("#checkout-date").attr("min", todayDate);

    // Initialize Bootstrap Clockpicker (with clock UI)
    $('#checkout-time').clockpicker({
        autoclose: true,
        placement: 'bottom',
        align: 'left',
        donetext: 'Done',
        twelvehour: false, // 24-hour mode for easier validation
        afterDone: function() {
            const selectedTimeStr = $('#checkout-time').val(); // Format: HH:MM
            if (selectedTimeStr) {
                const timeParts = selectedTimeStr.split(':');
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                const selectedTotalMinutes = hours * 60 + minutes;
                const minTotalMinutes = 8 * 60;  // 8:00 AM
                const maxTotalMinutes = 21 * 60; // 9:00 PM
                if (selectedTotalMinutes < minTotalMinutes || selectedTotalMinutes > maxTotalMinutes) {
                    notyf.error('Please select a time between 8:00 AM and 9:00 PM.');
                    $('#checkout-time').val('');
                }
            }
        }
    });
    // Also open clockpicker when clicking the clock button
    $('#clock-btn').on('click', function(e) {
        e.preventDefault();
        $('#checkout-time').clockpicker('show');
    });    // FILL UP FORM BASE ON CURRENT USER LOGGED-IN
    onAuthStateChanged(auth, async user => {
        // Show loader when starting to load checkout data
        showCheckoutLoader();
        
        try {
            if (user) {
                // Auto-fill email from Firebase Auth
                $("#customer-email").val(user.email);

                // Fetch user data from Firestore
                const userDoc = await getDoc(
                    doc(chandriaDB, "userAccounts", user.uid)
                );

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    $("#customer-name").val(userData.fullname || "");
                    $("#customer-contact").val(userData.contact || "");
                }
                
                await loadCartItems(user.uid);
                await updateCartCount();
            } else {
                $("#nav-login").show(); // show if there's no user logged-in
            }
        } catch (error) {
            console.error('Error loading checkout data:', error);
        } finally {
            // Hide loader after data is loaded (success or error)
            hideCheckoutLoader();
        }
    });

    // DISPLAY USER's CART ITEMS
    async function loadCartItems(userId) {
        const userRef = doc(chandriaDB, "userAccounts", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const cartItems = userData.added_to_cart || [];

        let grandTotal = 0;
        $("#checkout-cart").empty(); // Clear existing content

        for (const item of cartItems) {
            const productRef = doc(chandriaDB, "products", item.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) continue;

            const product = productSnap.data();
            const itemTotal = product.price * item.quantity;
            grandTotal += itemTotal;

            const row = `
            <tr>
                <td>
                    <img src="${product.frontImageUrl}" alt="" class="order-img" />
                </td>
                <td>
                    <h3 class="table-title">${product.name}</h3>
                    <p class="table-quantity">Size: ${item.size} x ${
                        item.quantity
                    }</p>
                </td>
                <td>
                    <span class="table-price">₱ ${itemTotal.toLocaleString()}</span>
                </td>
            </tr>
        `;

            $("#checkout-cart").append(row);
        }

        $(".order-grand-total").text(`₱ ${grandTotal.toLocaleString()}`);
    }

    // PLACE RENT FUNCTION
    $("#place-rent-btn").on("click", async function (e) {
        e.preventDefault();

        const checkoutStatus = "Upcoming";        // GET FORM DATA
        const customerName = $("#customer-name").val();
        const customerEmail = $("#customer-email").val();
        const customerContact = $("#customer-contact").val(); // <-- ADD THIS
        const checkoutDateStr = $("#checkout-date").val();
        const checkoutTimeStr = $("#checkout-time").val();
        const customerRequest = $("#customer-request").val(); // <-- ADD THIS

        // VALIDATE FORM DATA
        if (!customerName || !customerEmail || !checkoutDateStr || !checkoutTimeStr) {
            notyf.error("Please fill in all required fields.");
            return;
        }

        // --- DATE VALIDATION ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for comparison

        const checkoutDate = new Date(checkoutDateStr);
        // No need to normalize checkoutDate hours if it already comes from a date input

        if (checkoutDate < today) {
            notyf.error("Checkout date cannot be in the past.");
            return;
        }

        // --- TIME VALIDATION ---
        if (!checkoutTimeStr) { // Check if time is provided
            notyf.error("Please select a checkout time.");
            return;
        } else {
            // Validate the time format and range if a time is provided
            const timeParts = checkoutTimeStr.split(':');
            if (timeParts.length === 2) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                // Check if hours and minutes are valid numbers and within typical time ranges (00-23 for hours, 00-59 for minutes)
                if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    const selectedTotalMinutes = hours * 60 + minutes;
                    const minTotalMinutes = 8 * 60;  // 8:00 AM (480 minutes)
                    const maxTotalMinutes = 21 * 60; // 9:00 PM (1260 minutes)

                    // Check if the selected time is outside the allowed range [8:00 AM, 9:00 PM]
                    if (selectedTotalMinutes < minTotalMinutes || selectedTotalMinutes > maxTotalMinutes) {
                        notyf.error('Checkout time must be between 8:00 AM and 9:00 PM.');
                        return; 
                    }
                } else {
                    // Handles cases like "aa:bb" or invalid numbers like "25:00" or "10:70"
                    notyf.error('Invalid time format. Please enter a valid time (HH:MM).');
                    return;
                }
            } else {
                // Handles cases where format is not HH:MM, e.g., "123" or "10:10:10"
                notyf.error('Invalid time format. Please use HH:MM format.');
                return;
            }
        }

        // --- COLLECT CART ITEMS ---
        const user = auth.currentUser;
        let cartItems = [];
        if (user) {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                // Ensure each item has productId, quantity, size, and type (if needed)
                cartItems = (userData.added_to_cart || []).map(item => ({
                    productId: item.productId,
                    quantity: item.quantity || 1,
                    size: item.size || "",
                    type: item.type || "product" // add type if you support accessories
                }));
            }
        }

        try {            const productData = {
                customerName: customerName,
                customerEmail: customerEmail,
                customerContact: customerContact, // <-- SAVE PHONE
                checkoutDate: checkoutDateStr,
                checkoutTime: checkoutTimeStr,
                customerRequest: customerRequest, // <-- SAVE NOTES/REQUEST
                checkoutStatus: checkoutStatus,
                createdAt: new Date(),
                cartItems: cartItems // <-- Save cart items here!
            };

            // SAVE TO FIREBASE
            await addDoc(
                collection(chandriaDB, "appointments"),
                productData
            );

            notyf.success(
                "Checkout successful! Your appointment has been saved."
            );

            // RESET FORM
            $("form")[0].reset();
        } catch (err) {
            console.error("Upload failed:", err);
            showErrorModal("There was an error uploading the product.");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // CART COUNT FUNCTION
    async function updateCartCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#cart-count").text("0"); // User not logged in, show 0
            return;
        }

        try {
            // Get user\'s document reference and snapshot
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                // Calculate total quantity instead of number of items, ensuring quantity is an integer
                const totalCount = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

                // Update the cart count in the header
                $("#cart-count").text(totalCount);
            }
        } catch (error) {
            console.error("Error fetching cart count: ", error);
            $("#cart-count").text("0"); // Fallback to 0 on error
        }
    }

});
