// CHECKOUT JS
import {
    onAuthStateChanged,
    auth,
    appCredential,
    chandriaDB,
    collection,
    getDoc,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    setDoc,
    signOut
} from "./sdk/chandrias-sdk.js";
import wishlistService from "./wishlist-firebase.js";

// Check product availability for a specific date and quantity
async function checkProductAvailability(
    productId,
    productName,
    requestedQuantity,
    checkoutDate
) {
    try {
        console.log(
            `Checking availability for ${productName} (${productId}) on ${checkoutDate} for quantity ${requestedQuantity}`
        );

        // Get product stock information
        const productRef = doc(chandriaDB, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            return {
                available: false,
                message: `${productName} not found in inventory.`
            };
        }

        const productData = productSnap.data();
        // Calculate total stock across all sizes
        const totalStock = productData.size
            ? Object.values(productData.size).reduce(
                  (sum, stock) => sum + (stock || 0),
                  0
              )
            : 0;

        console.log(`Total stock for ${productName}: ${totalStock}`);

        if (totalStock < requestedQuantity) {
            return {
                available: false,
                message: `${productName} has insufficient stock. Only ${totalStock} available.`
            };
        }

        // Count how many units are booked for this date
        let bookedQuantity = 0;
        const dateToCheck = new Date(checkoutDate).toLocaleDateString();

        // Check appointments collection
        const appointmentsRef = collection(chandriaDB, "appointments");
        const appointmentsSnapshot = await getDocs(appointmentsRef);

        appointmentsSnapshot.forEach(docSnap => {
            const data = docSnap.data();

            // Skip cancelled/completed appointments
            if (
                data.checkoutStatus &&
                (data.checkoutStatus.toLowerCase() === "cancelled" ||
                    data.checkoutStatus.toLowerCase() === "completed")
            ) {
                return;
            }

            // Check if appointment is for the same date
            const appointmentDate =
                data.checkoutDate || data.eventDate || data.eventStartDate;
            if (appointmentDate) {
                const apptDateStr = new Date(
                    appointmentDate
                ).toLocaleDateString();

                if (apptDateStr === dateToCheck) {
                    // Check if this appointment contains the product
                    if (Array.isArray(data.cartItems)) {
                        data.cartItems.forEach(item => {
                            if (item.productId === productId) {
                                bookedQuantity += parseInt(
                                    item.quantity || 1,
                                    10
                                );
                            }
                        });
                    }
                }
            }
        });

        // Check transaction collection for confirmed bookings
        const possibleCollections = [
            "transaction",
            "transactions",
            "calendar",
            "events"
        ];

        for (const collectionName of possibleCollections) {
            try {
                const transactionRef = collection(chandriaDB, collectionName);
                const transactionSnapshot = await getDocs(transactionRef);

                transactionSnapshot.forEach(docSnap => {
                    const data = docSnap.data();

                    // Skip cancelled transactions
                    if (
                        data.status &&
                        data.status.toLowerCase() === "cancelled"
                    ) {
                        return;
                    }

                    // Check transaction dates based on rental type
                    const rentalType = (data.rentalType || "").toLowerCase();
                    const eventDate = data.eventDate;
                    const eventStartDate = data.eventStartDate;
                    const eventEndDate = data.eventEndDate;
                    const checkoutDate = data.checkoutDate;

                    let transactionDates = [];

                    if (rentalType.includes("fixed")) {
                        // Fixed Rental: 3 consecutive days
                        const startDate =
                            eventStartDate || eventDate || checkoutDate;
                        if (startDate) {
                            const start = new Date(startDate);
                            for (let i = 0; i < 3; i++) {
                                const date = new Date(start);
                                date.setDate(start.getDate() + i);
                                transactionDates.push(
                                    date.toLocaleDateString()
                                );
                            }
                        }
                    } else if (rentalType.includes("open")) {
                        // Open Rental: date range
                        if (eventStartDate && eventEndDate) {
                            const start = new Date(eventStartDate);
                            const end = new Date(eventEndDate);
                            const current = new Date(start);

                            while (current <= end) {
                                transactionDates.push(
                                    current.toLocaleDateString()
                                );
                                current.setDate(current.getDate() + 1);
                            }
                        }
                    } else {
                        // Single date
                        const dateToUse =
                            eventDate || eventStartDate || checkoutDate;
                        if (dateToUse) {
                            transactionDates.push(
                                new Date(dateToUse).toLocaleDateString()
                            );
                        }
                    }

                    // If the transaction affects our date, count the quantity
                    if (transactionDates.includes(dateToCheck)) {
                        // Check products array
                        if (Array.isArray(data.products)) {
                            data.products.forEach(item => {
                                if (
                                    item.id === productId ||
                                    item.productId === productId
                                ) {
                                    bookedQuantity += parseInt(
                                        item.quantity || 1,
                                        10
                                    );
                                }
                            });
                        }

                        // Check accessories array
                        if (Array.isArray(data.accessories)) {
                            data.accessories.forEach(item => {
                                if (
                                    item.id === productId ||
                                    item.productId === productId
                                ) {
                                    bookedQuantity += parseInt(
                                        item.quantity || 1,
                                        10
                                    );
                                }
                            });
                        }

                        // Check cartItems array
                        if (Array.isArray(data.cartItems)) {
                            data.cartItems.forEach(item => {
                                if (
                                    item.id === productId ||
                                    item.productId === productId
                                ) {
                                    bookedQuantity += parseInt(
                                        item.quantity || 1,
                                        10
                                    );
                                }
                            });
                        }
                    }
                });
            } catch (collError) {
                console.log(
                    `Collection '${collectionName}' not accessible:`,
                    collError.message
                );
            }
        }

        console.log(
            `${productName} - Total stock: ${totalStock}, Booked quantity: ${bookedQuantity}, Requested: ${requestedQuantity}`
        );

        // Calculate available quantity
        const availableQuantity = totalStock - bookedQuantity;

        if (availableQuantity < requestedQuantity) {
            if (availableQuantity <= 0) {
                return {
                    available: false,
                    message: `'${productName}' is unavailable on this date. Please check availability in the Products section.`
                };
            } else {
                return {
                    available: false,
                    message: `'${productName}' has only ${availableQuantity} unit(s) available on this date. Please check availability in the Products section.`
                };
            }
        }

        return { available: true, message: `${productName} is available.` };
    } catch (error) {
        console.error("Error checking product availability:", error);
        return {
            available: false,
            message: `Error checking availability for '${productName}'. Please try again.`
        };
    }
}

// Check availability for all cart items
async function checkCartAvailability(cartItems, checkoutDate) {
    const unavailableItems = [];

    for (const item of cartItems) {
        const productRef = doc(chandriaDB, "products", item.productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            unavailableItems.push(`Product not found`);
            continue;
        }

        const productData = productSnap.data();
        const productName = productData.name || "Unknown Product";
        const requestedQuantity = parseInt(item.quantity || 1, 10);

        const availabilityCheck = await checkProductAvailability(
            item.productId,
            productName,
            requestedQuantity,
            checkoutDate
        );

        if (!availabilityCheck.available) {
            unavailableItems.push(availabilityCheck.message);
        }
    }

    return unavailableItems;
}

$(document).ready(function () {
    // INITIALIZING NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        types: [
            {
                type: "success",
                background: "hsl(346, 100%, 74%)",
                icon: {
                    className: "fi fi-rs-check",
                    tagName: "i"
                },
                duration: 4000
            },
            {
                type: "error",
                background: "#ff4d4d",
                duration: 4000
            }
        ]
    });

    // Check if user signed in with Google
    function isGoogleUser(user) {
        if (!user || !user.providerData) return false;
        return user.providerData.some(
            provider => provider.providerId === "google.com"
        );
    }

    // Set min date for checkout date input to today
    const todayDate = new Date().toISOString().split("T")[0];
    $("#checkout-date").attr("min", todayDate);

    // FILL UP FORM BASE ON CURRENT USER LOGGED-IN

    // AUTH STATE CHANGED FUNCTION
    onAuthStateChanged(auth, async user => {
        try {
            // Show spinner using centralized system with fallback
            if (typeof window.showSpinner === "function") {
                window.showSpinner();
            } else {
                $("#checkout-loader").removeClass("hidden");
            }

            if (user) {
                // Check if user is an admin
                const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                if (adminDocSnap.exists()) {
                    // If user is admin, redirect to admin panel
                    window.location.href = "../admin/dashboard.html";
                    return;
                }

                // Coordinate all async operations with Promise.all
                await Promise.all([
                    (async () => {
                        // Auto-fill email from Firebase Auth
                        $("#customer-email").val(user.email);

                        // Always allow editing phone number
                        $("#customer-contact").removeAttr("readonly");
                        $("#customer-contact").attr("placeholder", "Phone No.");

                        // Fetch user data from Firestore
                        const userDoc = await getDoc(
                            doc(chandriaDB, "userAccounts", user.uid)
                        );

                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            $("#customer-name").val(userData.fullname || "");

                            const contactValue = userData.contact || "";
                            $("#customer-contact").val(contactValue);
                        }
                    })(),
                    loadCartItems(user.uid),
                    updateCartCount(),
                    wishlistService.updateWishlistCountUI()
                ]);
            } else {
                // REDIRECT IF NO USER LOGGED-IN
                window.location.href = "../index.html";
            }
        } catch (error) {
            console.error("Error loading checkout data:", error);
        } finally {
            // Hide spinner using centralized system with fallback
            if (typeof window.hideSpinner === "function") {
                window.hideSpinner();
            } else {
                $("#checkout-loader").addClass("hidden");
            }
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
                    <img src="${
                        product.frontImageUrl
                    }" alt="" class="order-img" />
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

        const checkoutStatus = "Upcoming"; // GET FORM DATA
        const customerName = $("#customer-name").val();
        const customerEmail = $("#customer-email").val();
        const customerContact = $("#customer-contact").val(); // <-- ADD THIS
        const checkoutDateStr = $("#checkout-date").val();
        const checkoutTimeStr = $("#checkout-time").val();
        const customerRequest = $("#customer-request").val(); // <-- ADD THIS

        // VALIDATE FORM DATA
        if (
            !customerName ||
            !customerEmail ||
            !customerContact ||
            !checkoutDateStr ||
            !checkoutTimeStr
        ) {
            notyf.error(
                "Please fill in all required fields including phone number."
            );
            return;
        }

        // Validate phone number format (must start with 09 and be exactly 11 digits)
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(customerContact.trim())) {
            notyf.error('Contact number must start with "09" and be exactly 11 digits.');
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
        if (!checkoutTimeStr) {
            // Check if time is provided
            notyf.error("Please select a checkout time.");
            return;
        } else {
            // Validate the time format and range if a time is provided
            const timeParts = checkoutTimeStr.split(":");
            if (timeParts.length === 2) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                // Check if hours and minutes are valid numbers and within typical time ranges (00-23 for hours, 00-59 for minutes)
                if (
                    !isNaN(hours) &&
                    !isNaN(minutes) &&
                    hours >= 0 &&
                    hours <= 23 &&
                    minutes >= 0 &&
                    minutes <= 59
                ) {
                    const selectedTotalMinutes = hours * 60 + minutes;
                    const minTotalMinutes = 8 * 60; // 8:00 AM (480 minutes)
                    const maxTotalMinutes = 21 * 60; // 9:00 PM (1260 minutes)

                    // Check if the selected time is outside the allowed range [8:00 AM, 9:00 PM]
                    if (
                        selectedTotalMinutes < minTotalMinutes ||
                        selectedTotalMinutes > maxTotalMinutes
                    ) {
                        notyf.error(
                            "Checkout time must be between 8:00 AM and 9:00 PM."
                        );
                        return;
                    }
                } else {
                    // Handles cases like "aa:bb" or invalid numbers like "25:00" or "10:70"
                    notyf.error(
                        "Invalid time format. Please enter a valid time (HH:MM)."
                    );
                    return;
                }
            } else {
                // Handles cases where format is not HH:MM, e.g., "123" or "10:10:10"
                notyf.error("Invalid time format. Please use HH:MM format.");
                return;
            }
        }

        // Check product availability before proceeding
        const user = auth.currentUser;
        if (user) {
            try {
                // Get user's cart items
                const userRef = doc(chandriaDB, "userAccounts", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const cartItems = userData.added_to_cart || [];

                    if (cartItems.length > 0) {
                        // Check availability for all items
                        const unavailableItems = await checkCartAvailability(
                            cartItems,
                            checkoutDateStr
                        );

                        if (unavailableItems.length > 0) {
                            // Show error messages for unavailable items
                            unavailableItems.forEach(message => {
                                notyf.error(message);
                            });
                            return; // Stop the booking process
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking availability:", error);
                notyf.error(
                    "Error checking product availability. Please try again."
                );
                return;
            }
        }

        // Show terms and conditions modal instead of proceeding immediately
        $("#terms-modal").addClass("active");
        // Add class to body to prevent background scrolling
        $("body").addClass("terms-modal-open");

        // Reset checkbox state
        $("#terms-checkbox").prop("checked", false);
        $("#terms-agree").prop("disabled", true);

        // Store form data for later use if terms are accepted
        window.bookingData = {
            customerName,
            customerEmail,
            customerContact,
            checkoutDateStr,
            checkoutTimeStr,
            customerRequest,
            checkoutStatus
        };
    });

    // Terms and Conditions Modal functionality
    $("#terms-checkbox").on("change", function () {
        // Enable/disable the agree button based on checkbox state
        $("#terms-agree").prop("disabled", !$(this).prop("checked"));
    });

    // Close terms modal on cancel or X button
    $("#terms-close, #terms-cancel").on("click", function () {
        $("#terms-modal").removeClass("active");
        // Remove class from body to re-enable background scrolling
        $("body").removeClass("terms-modal-open");
    });

    // Scroll progress indicator for terms modal
    $(".terms-modal-content").on("scroll", function () {
        const scrollPosition = $(this).scrollTop();
        const totalHeight = $(this)[0].scrollHeight - $(this).outerHeight();
        const scrollPercentage = (scrollPosition / totalHeight) * 100;
        $(".terms-scroll-progress").css("width", scrollPercentage + "%");
    });

    // Escape key to close terms modal
    $(document).keydown(function (e) {
        if (e.key === "Escape" && $("#terms-modal").hasClass("active")) {
            $("#terms-modal").removeClass("active");
            // Remove class from body to re-enable background scrolling
            $("body").removeClass("terms-modal-open");
        }
    });

    // Process booking when terms are agreed to
    $("#terms-agree").on("click", async function () {
        // Show spinner for better UX during processing
        if (typeof window.showSpinner === "function") {
            window.showSpinner();
        }

        // Hide terms modal
        $("#terms-modal").removeClass("active");
        // Remove class from body to re-enable background scrolling
        $("body").removeClass("terms-modal-open");

        // Retrieve the stored form data
        const {
            customerName,
            customerEmail,
            customerContact,
            checkoutDateStr,
            checkoutTimeStr,
            customerRequest,
            checkoutStatus
        } = window.bookingData;

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
                    productName: item.productName,
                    quantity: item.quantity || 1,
                    size: item.size || "",
                    type: item.type || "product" // add type if you support accessories
                }));
            }
        }

        try {
            const productData = {
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
            await addDoc(collection(chandriaDB, "appointments"), productData);

            // If Google user provided contact info, update their profile
            if (isGoogleUser(user)) {
                const userRef = doc(chandriaDB, "userAccounts", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    // Only update if the contact is different or was empty
                    if (
                        !userData.contact ||
                        userData.contact !== customerContact
                    ) {
                        await updateDoc(userRef, {
                            contact: customerContact
                        });
                        console.log("Updated Google user contact information");
                    }
                } else {
                    // Create user record if it doesn't exist (new Google user)
                    await setDoc(
                        userRef,
                        {
                            fullname: customerName,
                            email: customerEmail,
                            contact: customerContact,
                            createdAt: new Date()
                        },
                        { merge: true }
                    );
                    console.log("Created user profile for new Google user");
                }
            }

            // CLEAR USER'S CART AFTER SUCCESSFUL APPOINTMENT
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            await updateDoc(userRef, {
                added_to_cart: [] // Clear the cart by setting it to empty array
            });

            // RESET FORM
            $("form")[0].reset();

            // CLEAR CHECKOUT DISPLAY
            $("#checkout-cart").empty();
            $(".order-grand-total").text("₱ 0");

            // UPDATE CART COUNT TO 0
            await updateCartCount();

            // UPDATE WISHLIST COUNT AS WELL FOR CONSISTENCY
            await wishlistService.updateWishlistCountUI();

            // REDIRECT TO CART PAGE AFTER A SHORT DELAY WITH SUCCESS PARAMETER
            setTimeout(() => {
                window.location.href = "./cart.html?booking=success";
            }, 1000); // 1 second delay to ensure data is processed
        } catch (err) {
            console.error("Appointment creation failed:", err);
            notyf.error(
                "There was an error creating your appointment. Please try again."
            );
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
                const totalCount = cartItems.reduce(
                    (sum, item) => sum + (parseInt(item.quantity, 10) || 0),
                    0
                );

                // Update the cart count in the header
                $("#cart-count").text(totalCount);
            }
        } catch (error) {
            console.error("Error fetching cart count: ", error);
            $("#cart-count").text("0"); // Fallback to 0 on error
        }
    }

    // HANDLE ACCOUNT ICON CLICK
    window.handleAccountClick = function () {
        const userEmail = localStorage.getItem("userEmail");
        const currentUser = auth.currentUser;

        if (userEmail && currentUser && currentUser.emailVerified) {
            // Redirect to accounts page if user is logged in
            window.location.href = "./accounts.html";
        } else {
            // Show auth modal if user is not logged in
            if (typeof window.showAuthModal === "function") {
                window.showAuthModal();
            }
        }
    };
});
