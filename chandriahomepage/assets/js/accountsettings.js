import {
    auth,
    onAuthStateChanged,
    signOut,
    chandriaDB,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    validatePassword,
    deleteUser
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

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

    // LOADS USER PROFILE
    async function loadUserProfile() {
        auth.onAuthStateChanged(async user => {
            if (user) {
                updateCartCount();
                const userRef = doc(chandriaDB, "userAccounts", user.uid);
                const userSnap = await getDoc(userRef);

                // Check if user is an admin
                const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    // If user is admin, sign them out
                    await signOut(auth);
                    window.location.href = "../index.html";
                    return;
                }

                if (userSnap.exists()) {
                    const userData = userSnap.data();

                    $("#email").val(userData.email || "");
                    $("#name").val(userData.fullname || "");
                    
                    // Store the original name for cancel functionality
                    initialName = userData.fullname || "";

                    // ✅ Load profile image if available
                    if (userData.profileImageUrl) {
                        $(".avatar-placeholder").html(`
                        <img src="${userData.profileImageUrl}" 
                             alt="Profile Picture"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
                    `);
                    }

                    $("body").addClass("loaded");
                } else {
                    console.warn("No user profile found in Firestore.");
                    $("body").addClass("loaded");
                }
            } else {
                // Not signed in, redirect to homepage
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 2500);
            }
        });
    }
    loadUserProfile();

    function previewImage(event) {
        const input = event.target;
        const $avatarPlaceholder = $(".avatar-placeholder");
        const $resetButton = $(".avatar-reset-btn");

        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const $img = $("<img>", {
                    src: e.target.result,
                    css: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                    }
                });

                $avatarPlaceholder.empty().append($img);
                $resetButton.css("display", "flex");
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    function resetAvatar() {
        const $avatarPlaceholder = $(".avatar-placeholder");
        const $resetButton = $(".avatar-reset-btn");
        const $fileInput = $("#profile-image-upload");

        $avatarPlaceholder.html(`
        <div class="avatar-content">
            <i class="fas fa-cloud"></i>
            <span>AVATAR</span>
        </div>
    `);

        $resetButton.hide();
        $fileInput.val("");
    }

    // BASE 64 SIGNATURE
    async function generateSignature(publicId, timestamp, apiSecret) {
        const dataToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(dataToSign);

        const hashBuffer = await crypto.subtle.digest("SHA-1", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // DELETE REQUEST FUNCTION
    async function deleteImageFromCloudinary(publicId) {
        const apiKey = "814782524531725";
        const apiSecret = "9vWGOUYipmrq2ecCato2G9MTA7Q"; // exposed, unsafe
        const cloudName = "dbtomr3fm";
        const timestamp = Math.floor(Date.now() / 1000);

        const signature = await generateSignature(
            publicId,
            timestamp,
            apiSecret
        );

        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();
        console.log("Delete result:", result);

        if (result.result !== "ok") {
            console.error("Cloudinary deletion failed:", result);
            throw new Error(`Image deletion failed: ${publicId}`);
        }

        return result;
    }

    // SAVE UPDATE ACCOUNT SETTINGS FUNCTION
    $("#save-btn").on("click", async function (e) {
        e.preventDefault();

        const file = $("#profile-image-upload")[0].files[0];
        const updatedName = $("#name").val().trim();

        // ✅ Full Name Validation
        const fullnamePattern = /^([A-Z][a-z]+)( [A-Z][a-z]+)+$/;
        if (!fullnamePattern.test(updatedName)) {
            notyf.error(
                "Full name must be at least two words, only letters, and each starting with a capital letter."
            );
            return;
        }

        // Password fields
        const currentPassword = $("#password").val().trim();
        const newPassword = $("#new-password").val().trim();
        const confirmNewPassword = $("#confirm-new-password").val().trim();

        const spinnerText = $("#spinner-text");
        const spinner = $("#spinner");

        try {
            spinner.removeClass("d-none");
            spinnerText.text("Checking Account Info...");

            const user = auth.currentUser;
            if (!user) {
                notyf.error("User not signed in.");
                return;
            }

            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                notyf.error("User profile not found.");
                spinner.addClass("d-none");
                return;
            }

            // === Step 1: Handle Password Change If Any Password Field Is Filled ===
            if (currentPassword || newPassword || confirmNewPassword) {
                // Validate filled fields
                if (!currentPassword || !newPassword || !confirmNewPassword) {
                    notyf.error("Please fill in all password fields.");
                    spinner.addClass("d-none");
                    return;
                }

                if (newPassword !== confirmNewPassword) {
                    notyf.error("New passwords do not match.");
                    spinner.addClass("d-none");
                    return;
                }

                // Validate password strength
                const status = await validatePassword(auth, newPassword);
                if (!status.isValid) {
                    const minLength =
                        status.passwordPolicy.customStrengthOptions
                            .minPasswordLength;

                    let errorMsg =
                        "<strong>Password doesn't meet requirements:</strong><ul>";
                    if (!status.containsLowercaseLetter)
                        errorMsg += "<li>   ~ Lowercase letter</li>";
                    if (!status.containsUppercaseLetter)
                        errorMsg += "<li>   ~ Uppercase letter</li>";
                    if (!status.containsNumericCharacter)
                        errorMsg += "<li>   ~ Number</li>";
                    if (!status.containsNonAlphanumericCharacter)
                        errorMsg += "<li>   ~ Special character</li>";
                    if (minLength && newPassword.length < minLength)
                        errorMsg += `<li>   ~ At least ${minLength} characters</li>`;
                    errorMsg += "</ul>";

                    notyf.open({
                        type: "error",
                        message: errorMsg,
                        duration: 5000
                    });
                    spinner.addClass("d-none");
                    return;
                }

                // Re-authenticate then update password
                try {
                    const credential = EmailAuthProvider.credential(
                        user.email,
                        currentPassword
                    );
                    await reauthenticateWithCredential(user, credential);
                    await updatePassword(user, newPassword);
                    notyf.success("Password successfully updated!");
                    $("#password, #new-password, #confirm-new-password").val(
                        ""
                    );
                    $("#passwordFields").hide();
                } catch (error) {
                    console.error("Password update failed:", error);
                    spinner.addClass("d-none");

                    if (error.code === "auth/invalid-credential") {
                        notyf.error("Current password is incorrect.");
                    } else if (error.code === "auth/requires-recent-login") {
                        notyf.error(
                            "Please log in again to change your password."
                        );
                    } else {
                        notyf.error("Failed to update password.");
                    }
                    return;
                }
            }

            // === Step 2: Handle Profile Image ===
            const userData = userSnap.data();
            let imageUrl = userData.profileImageUrl || "";
            let publicId = userData.profileImageId || "";

            if (file) {
                spinnerText.text("Replacing Old Profile Image...");
                if (publicId) {
                    try {
                        await deleteImageFromCloudinary(publicId);
                        console.log("Old profile image deleted.");
                    } catch (deleteErr) {
                        console.warn(
                            "Failed to delete previous image:",
                            deleteErr
                        );
                    }
                }

                spinnerText.text("Uploading New Profile Picture...");
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "UPLOAD_IMG");

                const cloudRes = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

                const cloudData = await cloudRes.json();
                imageUrl = cloudData.secure_url;
                publicId = cloudData.public_id;
            }

            // === Step 3: Update Firestore ===
            spinnerText.text("Updating Account Settings...");
            await updateDoc(userRef, {
                fullname: updatedName,
                profileImageUrl: imageUrl,
                profileImageId: publicId,
                updatedAt: new Date()
            });

            notyf.success("Account settings updated!");
        } catch (error) {
            console.error("Update failed:", error);
            notyf.error("Failed to update account settings.");
        } finally {
            spinner.addClass("d-none");
            $(".avatar-reset-btn").hide();
            $(this).addClass("disabled");
            await loadUserProfile();
            // Update initialName after successful save
            initialName = $("#name").val();
        }
    });
    // --====== START OF INPUT CHECKING FUNCTION ======--
    const $saveBtn = $("#save-btn");
    const $nameInput = $("#name");
    const $imageInput = $("#profile-image-upload");

    const $currentPassword = $("#password");
    const $newPassword = $("#new-password");
    const $confirmPassword = $("#confirm-new-password");

    let initialName = "";
    let nameChanged = false;
    let imageSelected = false;
    let passwordFieldsFilled = false;

    function checkForChanges() {
        passwordFieldsFilled =
            $currentPassword.val().trim() !== "" ||
            $newPassword.val().trim() !== "" ||
            $confirmPassword.val().trim() !== "";

        if (nameChanged || imageSelected || passwordFieldsFilled) {
            $saveBtn.removeClass("disabled");
        } else {
            $saveBtn.addClass("disabled");
        }
    }

    $nameInput.on("input", function () {
        nameChanged = $(this).val().trim() !== initialName.trim();
        checkForChanges();
    });

    $imageInput.on("change", function () {
        imageSelected = this.files.length > 0;
        checkForChanges();
    });

    // ✅ Trigger check when typing in any password field
    $currentPassword.on("input", checkForChanges);
    $newPassword.on("input", checkForChanges);
    $confirmPassword.on("input", checkForChanges);

    // --====== END OF INPUT CHECKING FUNCTION ======--

    // CANCEL BUTTON FUNCTIONALITY - Reset form to original values
    $(".cancel-btn").on("click", function(e) {
        e.preventDefault();
        
        // Reset name input to original value
        $nameInput.val(initialName);
        
        // Reset password fields if they are visible
        if ($("#passwordFields").is(":visible")) {
            $("#password, #new-password, #confirm-new-password").val("");
            $("#passwordFields").hide();
            $("#togglePasswordFields").text("Change Password");
        }
        
        // Reset profile image if one was selected but not saved
        const $fileInput = $("#profile-image-upload");
        if ($fileInput[0].files.length > 0) {
            $fileInput.val("");
            // Reset avatar to original state if needed
            resetAvatar();
        }
        
        // Reset change detection flags
        nameChanged = false;
        imageSelected = false;
        passwordFieldsFilled = false;
        
        // Disable save button since no changes remain
        $saveBtn.addClass("disabled");
        
        notyf.success("Changes cancelled. Form reset to original values.");
    });

    // Expose to window
    window.previewImage = previewImage;
    window.resetAvatar = resetAvatar;

    $("#togglePasswordFields").on("click", function () {
        const $passwordFields = $("#passwordFields");

        if ($passwordFields.is(":hidden")) {
            $passwordFields.show();
            $(this).text("Cancel Password Change");
        } else {
            $passwordFields.hide();
            $(this).text("Change Password");

            $("#password, #new-password, #confirm-new-password").val("");
        }
    });

    // Logout functionality with confirmation modal
    $("#logout-btn").on("click", function (e) {
        e.preventDefault();
        // Show the logout confirmation modal
        $("#logout-modal").addClass("show");
    });

    // Handle logout modal cancel button
    $("#logout-cancel").on("click", function () {
        // Hide the logout modal
        $("#logout-modal").removeClass("show");
    });

    // Handle logout modal confirm button
    $("#logout-confirm").on("click", function () {
        // Disable the button and show spinner
        $(this).addClass("disabled");
        $("#logout-btn-text").hide();
        $("#logout-btn-spinner").show();
        
        signOut(auth)
            .then(() => {
                // Clear any stored user data
                localStorage.removeItem('userEmail');
                sessionStorage.clear();
                
                // Show success message
                notyf.success("Successfully logged out!");
                
                // Redirect to homepage after a short delay
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 1000);
            })
            .catch(error => {
                console.error("Error during logout:", error);
                notyf.error("Error logging out. Please try again.");
                
                // Re-enable the button and hide spinner
                $("#logout-confirm").removeClass("disabled");
                $("#logout-btn-text").show();
                $("#logout-btn-spinner").hide();
            });
    });

    // Close logout modal when clicking outside of it
    $("#logout-modal").on("click", function (e) {
        if (e.target === this) {
            $(this).removeClass("show");
        }
    });

    // --====== START OF DELETE ACCOUNT FUNCTION ======--
    // A-HREF DELETE ACCOUNT TOGGLER
    $("#del-acc").on("click", function (e) {
        e.preventDefault();

        if (confirm("Are you sure you want to delete your account?")) {
            $(".del-acc-modal-container").addClass("show");
        } else {
            return;
        }
    });

    function disablingDelAccBtn() {
        $("#del-acc-confirm").addClass("disabled");
        $("#btn-text").hide();
        $("#btn-spinner").show();
    }

    function enablingDelAccBtn() {
        $("#del-acc-confirm").removeClass("disabled");
        $("#btn-text").show();
        $("#btn-spinner").hide();
    }

    // DELETE ACCOUNT FUNCTION [MAIN]
    $("#del-acc-confirm").on("click", async function () {
        const password = $("#del-acc-password").val().trim();

        disablingDelAccBtn();

        if (!password) {
            notyf.error("Please enter your current password.");
            enablingDelAccBtn();
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            notyf.error("User not signed in.");
            return;
        }

        try {
            // Step 1: Re-authenticate
            const credential = EmailAuthProvider.credential(
                user.email,
                password
            );
            await reauthenticateWithCredential(user, credential);

            // Step 2: Get user's Firestore data
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();

                // Step 3: Delete profile image from Cloudinary (if it exists)
                if (userData.profileImageId) {
                    try {
                        await deleteImageFromCloudinary(
                            userData.profileImageId
                        );
                        console.log("Profile image deleted from Cloudinary.");
                    } catch (cloudErr) {
                        console.warn(
                            "Failed to delete image from Cloudinary:",
                            cloudErr
                        );
                    }
                }

                // Step 4: Delete user document from Firestore
                await deleteDoc(userRef);
            }

            // Step 5: Delete from Firebase Auth
            await deleteUser(user);

            notyf.success("Your account has been Successfully Deleted!");
            setTimeout(() => {
                window.location.href = "../index.html";
            }, 2000);
        } catch (error) {
            console.error("Account deletion failed:", error);

            if (error.code === "auth/invalid-credential") {
                notyf.error("Incorrect password. Account not deleted.");
            } else if (error.code === "auth/requires-recent-login") {
                notyf.error("Please log in again to delete your account.");
            } else {
                notyf.error("Failed to delete account.");
            }

            enablingDelAccBtn();
        }
    });

    // DELETE ACCOUNT MODAL CLOSE TOGGLER
    $(".del-acc-modal-container, #del-acc-cancel").on("click", function () {
        $(this).removeClass("show");
    });
    $(".del-acc-modal-box").on("click", function (e) {
        e.stopPropagation();
    });
    // --====== END OF DELETE ACCOUNT FUNCTION ======--

    // SIDEBAR NAVIGATION FUNCTIONALITY
    function initializeSidebarNavigation() {
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const contentSections = document.querySelectorAll('.content-section');

        sidebarLinks.forEach(link => {
            link.addEventListener('click', async function() {
                const targetSection = this.getAttribute('data-section');
                
                // Remove active class from all sidebar items
                document.querySelectorAll('.sidebar-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to clicked item
                this.closest('.sidebar-item').classList.add('active');
                
                // Hide all content sections
                contentSections.forEach(section => {
                    section.classList.remove('active');
                });
                
                // Show target section
                const targetElement = document.getElementById(targetSection + '-section');
                if (targetElement) {
                    targetElement.classList.add('active');
                    
                    // Load booking history when bookings section is accessed
                    if (targetSection === 'bookings') {
                        await loadBookingHistory();
                    }
                }
            });
        });
    }

    // BOOKING HISTORY FUNCTIONALITY
    function initializeBookingHistory() {
        // Filter functionality
        const statusFilter = document.getElementById('status-filter');
        const dateFilter = document.getElementById('date-filter');
        const searchFilter = document.getElementById('search-filter');
        const bookingsList = document.getElementById('bookings-list');

        function filterBookings() {
            const statusValue = statusFilter ? statusFilter.value : 'all';
            const dateValue = dateFilter ? dateFilter.value : '';
            const searchValue = searchFilter ? searchFilter.value.toLowerCase() : '';
            
            const bookingCards = bookingsList ? bookingsList.querySelectorAll('.booking-card') : [];
            let visibleCount = 0;

            bookingCards.forEach(card => {
                const title = card.querySelector('.booking-title')?.textContent.toLowerCase() || '';
                const status = card.querySelector('.status-badge')?.textContent.toLowerCase() || '';
                const dateText = card.querySelector('.booking-date')?.textContent || '';
                
                let showCard = true;

                // Filter by status
                if (statusValue !== 'all' && !status.includes(statusValue)) {
                    showCard = false;
                }

                // Filter by search term
                if (searchValue && !title.includes(searchValue)) {
                    showCard = false;
                }

                // Filter by date (basic implementation)
                if (dateValue && !dateText.includes(dateValue)) {
                    showCard = false;
                }

                if (showCard) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Show/hide empty state
            const emptyState = bookingsList ? bookingsList.querySelector('.empty-bookings') : null;
            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        }

        // Add event listeners for filters
        if (statusFilter) statusFilter.addEventListener('change', filterBookings);
        if (dateFilter) dateFilter.addEventListener('change', filterBookings);
        if (searchFilter) searchFilter.addEventListener('input', filterBookings);

        // Booking action handlers
        const bookingActions = document.querySelectorAll('.btn-action');
        bookingActions.forEach(button => {
            button.addEventListener('click', function() {
                const action = this.classList.contains('btn-view') ? 'view' :
                              this.classList.contains('btn-cancel') ? 'cancel' :
                              this.classList.contains('btn-review') ? 'review' : 'unknown';
                
                const bookingCard = this.closest('.booking-card');
                const bookingTitle = bookingCard ? bookingCard.querySelector('.booking-title')?.textContent : 'Unknown';
                
                handleBookingAction(action, bookingTitle, bookingCard);
            });
        });
    }

    function handleBookingAction(action, bookingTitle, bookingCard) {
        switch(action) {
            case 'view':
                // Implement view booking details
                notyf.success(`Viewing details for: ${bookingTitle}`);
                // You can add a modal or redirect to booking details page
                break;
                
            case 'cancel':
                // Implement cancel booking
                if (confirm(`Are you sure you want to cancel the booking for "${bookingTitle}"?`)) {
                    notyf.success(`Booking cancelled: ${bookingTitle}`);
                    // Update the booking status in the UI
                    const statusBadge = bookingCard.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.textContent = 'Cancelled';
                        statusBadge.className = 'status-badge status-cancelled';
                    }
                    // Update action buttons
                    const actionsContainer = bookingCard.querySelector('.booking-actions');
                    if (actionsContainer) {
                        actionsContainer.innerHTML = `
                            <button class="btn-action btn-view">
                                <i class="fas fa-eye"></i>
                                View Details
                            </button>
                        `;
                    }
                }
                break;
                
            case 'review':
                // Implement review functionality
                notyf.info(`Opening review form for: ${bookingTitle}`);
                // You can add a modal for review form
                break;
                
            default:
                console.warn('Unknown booking action:', action);
        }
    }

    // FETCH AND DISPLAY BOOKING HISTORY FROM APPOINTMENTS
    async function loadBookingHistory() {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in');
            return;
        }

        console.log('Loading booking history for user:', user.uid);

        try {
            const bookingsList = document.getElementById('bookings-list');
            if (!bookingsList) {
                console.error('Bookings list element not found');
                return;
            }

            // Show loading state
            bookingsList.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-pink);"></i>
                    <p style="margin-top: 1rem; color: var(--gray-600);">Loading your booking history...</p>
                </div>
            `;

            // Query appointments for current user by email
            console.log('Fetching user data...');
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                throw new Error('User data not found');
            }

            const userData = userSnap.data();
            const userEmail = userData.email || user.email;
            console.log('User email for query:', userEmail);

            // Query appointments collection by email
            console.log('Querying appointments...');
            const appointmentsQuery = query(
                collection(chandriaDB, "appointments"),
                where("customerEmail", "==", userEmail)
            );

            const appointmentsSnapshot = await getDocs(appointmentsQuery);
            let appointmentDocs = appointmentsSnapshot.docs;
            console.log('Found appointments:', appointmentDocs.length);
            
            // Sort by createdAt in JavaScript if orderBy fails
            appointmentDocs.sort((a, b) => {
                const aTime = a.data().createdAt?.toDate?.() || new Date(0);
                const bTime = b.data().createdAt?.toDate?.() || new Date(0);
                return bTime - aTime; // descending order
            });
            const bookings = [];

            for (const appointmentDoc of appointmentDocs) {
                const appointmentData = appointmentDoc.data();
                
                // Process cart items to get product details
                const cartItems = appointmentData.cartItems || [];
                const processedItems = [];

                for (const item of cartItems) {
                    try {
                        let productData = null;
                        
                        // Try to get product data from products or additionals collection
                        if (item.type === "accessory") {
                            const additionalRef = doc(chandriaDB, "additionals", item.productId);
                            const additionalSnap = await getDoc(additionalRef);
                            if (additionalSnap.exists()) {
                                productData = additionalSnap.data();
                            }
                        } else {
                            const productRef = doc(chandriaDB, "products", item.productId);
                            const productSnap = await getDoc(productRef);
                            if (productSnap.exists()) {
                                productData = productSnap.data();
                            }
                        }

                        if (productData) {
                            processedItems.push({
                                id: item.productId,
                                name: productData.name || item.name || 'Unknown Product',
                                code: productData.code || 'N/A',
                                image: productData.frontImageUrl || productData.imageUrl || 'assets/img/placeholder.jpg',
                                price: productData.price || item.price || 0,
                                quantity: item.quantity || 1,
                                size: item.size || 'N/A',
                                type: item.type || 'product'
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching product data:', error);
                    }
                }

                // Create booking object
                const booking = {
                    id: appointmentDoc.id,
                    customerName: appointmentData.customerName || 'N/A',
                    customerEmail: appointmentData.customerEmail || 'N/A',
                    customerContact: appointmentData.customerContact || 'N/A',
                    checkoutDate: appointmentData.checkoutDate || 'N/A',
                    checkoutTime: appointmentData.checkoutTime || 'N/A',
                    checkoutStatus: appointmentData.checkoutStatus || 'Upcoming',
                    customerRequest: appointmentData.customerRequest || '',
                    createdAt: appointmentData.createdAt,
                    items: processedItems,
                    totalAmount: processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                };

                bookings.push(booking);
            }

            // Display bookings
            displayBookings(bookings);

        } catch (error) {
            console.error('Error loading booking history:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            const bookingsList = document.getElementById('bookings-list');
            if (bookingsList) {
                bookingsList.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc2626;"></i>
                        <p style="margin-top: 1rem; color: var(--gray-600);">Error loading booking history.</p>
                        <p style="color: var(--gray-500); font-size: 0.9rem;">${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-pink); color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    // DISPLAY BOOKINGS FUNCTION
    function displayBookings(bookings) {
        const bookingsList = document.getElementById('bookings-list');
        if (!bookingsList) return;

        if (bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-bookings">
                    <i class="fas fa-calendar-alt empty-icon"></i>
                    <h3>No Booking History</h3>
                    <p>You haven't made any appointments yet.</p>
                    <a href="shop.html" class="btn">
                        <i class="fas fa-shopping-bag"></i>
                        Start Shopping
                    </a>
                </div>
            `;
            return;
        }

        const bookingsHTML = bookings.map(booking => {
            // Get the first item for main display
            const mainItem = booking.items[0];
            const itemCount = booking.items.length;
            
            // Format status
            const statusClass = getStatusClass(booking.checkoutStatus);
            
            // Format date
            const formattedDate = formatBookingDate(booking.checkoutDate, booking.checkoutTime);

            return `
                <div class="booking-card" data-booking-id="${booking.id}">
                    <div class="booking-image">
                        <img src="${mainItem ? mainItem.image : 'assets/img/placeholder.svg'}" 
                             alt="${mainItem ? mainItem.name : 'No items'}" 
                             onerror="this.src='assets/img/placeholder.svg'" />
                    </div>
                    <div class="booking-details">
                        <h4 class="booking-title">${mainItem ? mainItem.name : 'Multiple Items'}</h4>
                        <p class="booking-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </p>
                        <p class="booking-created">
                            <i class="fas fa-clock"></i>
                            Booked: ${formatCreatedDate(booking.createdAt)}
                        </p>
                        <p class="booking-items">
                            <i class="fas fa-box"></i>
                            ${itemCount} item${itemCount > 1 ? 's' : ''} • Total: ₱${booking.totalAmount.toLocaleString()}
                        </p>
                        ${mainItem && mainItem.size !== 'N/A' ? `
                        <p class="booking-size">
                            <i class="fas fa-ruler"></i>
                            Size: ${mainItem.size}
                        </p>
                        ` : ''}
                    </div>
                    <div class="booking-status">
                        <span class="status-badge ${statusClass}">${booking.checkoutStatus}</span>
                    </div>
                    <div class="booking-actions">
                        <button class="btn-action btn-view" data-booking-id="${booking.id}">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                        ${booking.checkoutStatus.toLowerCase() === 'upcoming' ? `
                        <button class="btn-action btn-cancel" data-booking-id="${booking.id}">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        bookingsList.innerHTML = bookingsHTML;

        // Re-attach event listeners for the new booking cards
        attachBookingActionListeners();
    }

    // HELPER FUNCTIONS
    function getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('upcoming')) return 'status-upcoming';
        if (statusLower.includes('completed')) return 'status-completed';
        if (statusLower.includes('cancelled')) return 'status-cancelled';
        return 'status-upcoming'; // default
    }

    function formatBookingDate(date, time) {
        if (!date) return 'Date not set';
        
        try {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (time) {
                return `${formattedDate} at ${time}`;
            }
            return formattedDate;
        } catch (error) {
            return date + (time ? ` at ${time}` : '');
        }
    }

    function formatCreatedDate(createdAt) {
        if (!createdAt) return 'Unknown';
        
        try {
            let dateObj;
            if (createdAt.toDate) {
                // Firestore Timestamp
                dateObj = createdAt.toDate();
            } else if (createdAt instanceof Date) {
                dateObj = createdAt;
            } else {
                dateObj = new Date(createdAt);
            }
            
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Unknown';
        }
    }

    // ATTACH EVENT LISTENERS FOR BOOKING ACTIONS
    function attachBookingActionListeners() {
        const bookingActions = document.querySelectorAll('.btn-action');
        bookingActions.forEach(button => {
            button.addEventListener('click', async function() {
                const bookingId = this.getAttribute('data-booking-id');
                const action = this.classList.contains('btn-view') ? 'view' :
                              this.classList.contains('btn-cancel') ? 'cancel' : 'unknown';
                
                const bookingCard = this.closest('.booking-card');
                const bookingTitle = bookingCard ? bookingCard.querySelector('.booking-title')?.textContent : 'Unknown';
                
                await handleBookingActionWithData(action, bookingTitle, bookingCard, bookingId);
            });
        });
    }

    // ENHANCED BOOKING ACTION HANDLER WITH DATA
    async function handleBookingActionWithData(action, bookingTitle, bookingCard, bookingId) {
        switch(action) {
            case 'view':
                await showBookingDetails(bookingId);
                break;
                
            case 'cancel':
                await showCancelConfirmationModal(bookingId, bookingTitle, bookingCard);
                break;
                
            default:
                console.warn('Unknown booking action:', action);
        }
    }

    // SHOW BOOKING DETAILS MODAL
    async function showBookingDetails(bookingId) {
        try {
            const appointmentRef = doc(chandriaDB, "appointments", bookingId);
            const appointmentSnap = await getDoc(appointmentRef);
            
            if (!appointmentSnap.exists()) {
                notyf.error('Booking not found');
                return;
            }

            const appointmentData = appointmentSnap.data();
            
            // Create modal content
            const modalContent = `
                <div class="booking-details-modal" id="booking-details-modal">
                    <div class="modal-backdrop" onclick="closeBookingModal()"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Booking Details</h3>
                            <button class="close-btn" onclick="closeBookingModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="booking-info-section">
                                <h4>Appointment Information</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Customer Name:</label>
                                        <span>${appointmentData.customerName || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Email:</label>
                                        <span>${appointmentData.customerEmail || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Contact:</label>
                                        <span>${appointmentData.customerContact || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Date:</label>
                                        <span>${appointmentData.checkoutDate || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Time:</label>
                                        <span>${appointmentData.checkoutTime || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Status:</label>
                                        <span class="status-badge ${getStatusClass(appointmentData.checkoutStatus)}">${appointmentData.checkoutStatus || 'Upcoming'}</span>
                                    </div>
                                </div>
                                ${appointmentData.customerRequest ? `
                                <div class="info-item full-width">
                                    <label>Special Requests:</label>
                                    <span>${appointmentData.customerRequest}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="booking-items-section">
                                <h4>Booked Items</h4>
                                <div class="items-list">
                                    ${await renderBookingItems(appointmentData.cartItems || [])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalContent);
            
        } catch (error) {
            console.error('Error showing booking details:', error);
            notyf.error('Error loading booking details');
        }
    }

    // RENDER BOOKING ITEMS
    async function renderBookingItems(cartItems) {
        if (!cartItems || cartItems.length === 0) {
            return '<p>No items found</p>';
        }

        let itemsHTML = '';
        let totalAmount = 0;

        for (const item of cartItems) {
            try {
                let productData = null;
                
                // Try to get product data
                if (item.type === "accessory") {
                    const additionalRef = doc(chandriaDB, "additionals", item.productId);
                    const additionalSnap = await getDoc(additionalRef);
                    if (additionalSnap.exists()) {
                        productData = additionalSnap.data();
                    }
                } else {
                    const productRef = doc(chandriaDB, "products", item.productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        productData = productSnap.data();
                    }
                }

                const name = productData?.name || item.name || 'Unknown Product';
                const code = productData?.code || 'N/A';
                const image = productData?.frontImageUrl || productData?.imageUrl || 'assets/img/placeholder.svg';
                const price = productData?.price || item.price || 0;
                const quantity = item.quantity || 1;
                const size = item.size || 'N/A';
                const type = item.type || 'product';
                const itemTotal = price * quantity;
                totalAmount += itemTotal;

                itemsHTML += `
                    <div class="booking-item">
                        <img src="${image}" 
                             alt="${name}" 
                             class="item-image"
                             onerror="this.src='assets/img/placeholder.svg'">
                        <div class="item-details">
                            <h5>${name}</h5>
                            <p><strong>Code:</strong> ${code}</p>
                            <p><strong>Type:</strong> ${type}</p>
                            ${size !== 'N/A' ? `<p><strong>Size:</strong> ${size}</p>` : ''}
                            <p><strong>Quantity:</strong> ${quantity}</p>
                            <p><strong>Price:</strong> ₱${price.toLocaleString()}</p>
                            <p><strong>Total:</strong> ₱${itemTotal.toLocaleString()}</p>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error rendering item:', error);
            }
        }

        itemsHTML += `
            <div class="booking-total">
                <h4>Total Amount: ₱${totalAmount.toLocaleString()}</h4>
            </div>
        `;

        return itemsHTML;
    }

    // SHOW CANCEL CONFIRMATION MODAL
    async function showCancelConfirmationModal(bookingId, bookingTitle, bookingCard) {
        const modalContent = `
            <div class="cancel-confirmation-modal" id="cancel-confirmation-modal">
                <div class="modal-backdrop" onclick="closeCancelModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i> Cancel Booking</h3>
                        <button class="close-btn" onclick="closeCancelModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="warning-content">
                            <p><strong>Are you sure you want to cancel this booking?</strong></p>
                            <p class="booking-title-display">"${bookingTitle}"</p>
                            <div class="warning-message">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>This will permanently cancel your booking and you cannot undo this action. The booking will be completely removed from your history.</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeCancelModal()">
                            <i class="fas fa-arrow-left"></i>
                            Keep Booking
                        </button>
                        <button class="btn btn-danger" onclick="confirmCancelBooking('${bookingId}', '${bookingCard ? 'card' : 'none'}')">
                            <i class="fas fa-trash"></i>
                            Yes, Cancel Booking
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Store booking card reference for later use
        window.currentBookingCard = bookingCard;
    }

    // CANCEL BOOKING FUNCTION (DELETE FROM DATABASE)
    async function cancelBooking(bookingId, bookingCard) {
        try {
            // Delete the booking from the database
            const appointmentRef = doc(chandriaDB, "appointments", bookingId);
            await deleteDoc(appointmentRef);

            notyf.success('Booking cancelled and removed successfully');
            
            // Remove the booking card from the UI
            if (bookingCard) {
                bookingCard.style.transition = 'opacity 0.3s ease';
                bookingCard.style.opacity = '0';
                setTimeout(() => {
                    bookingCard.remove();
                    
                    // Check if there are any bookings left
                    const remainingBookings = document.querySelectorAll('.booking-card');
                    if (remainingBookings.length === 0) {
                        const bookingsList = document.getElementById('bookings-list');
                        if (bookingsList) {
                            bookingsList.innerHTML = `
                                <div class="empty-bookings">
                                    <i class="fas fa-calendar-alt empty-icon"></i>
                                    <h3>No Booking History</h3>
                                    <p>You haven't made any appointments yet.</p>
                                    <a href="shop.html" class="btn">
                                        <i class="fas fa-shopping-bag"></i>
                                        Start Shopping
                                    </a>
                                </div>
                            `;
                        }
                    }
                }, 300);
            }
            
        } catch (error) {
            console.error('Error cancelling booking:', error);
            notyf.error('Error cancelling booking. Please try again.');
        }
    }

    // CLOSE BOOKING MODAL
    window.closeBookingModal = function() {
        const modal = document.getElementById('booking-details-modal');
        if (modal) {
            modal.remove();
        }
    }

    // CLOSE CANCEL CONFIRMATION MODAL
    window.closeCancelModal = function() {
        const modal = document.getElementById('cancel-confirmation-modal');
        if (modal) {
            modal.remove();
        }
        // Clean up stored reference
        window.currentBookingCard = null;
    }

    // CONFIRM CANCEL BOOKING
    window.confirmCancelBooking = async function(bookingId, cardRef) {
        try {
            const bookingCard = window.currentBookingCard;
            
            // Close the modal first
            closeCancelModal();
            
            // Cancel the booking
            await cancelBooking(bookingId, bookingCard);
            
        } catch (error) {
            console.error('Error in confirm cancel booking:', error);
            notyf.error('Error cancelling booking. Please try again.');
        }
    }

    // Initialize all functionality
    initializeSidebarNavigation();
    initializeBookingHistory();
    
    // Load booking history if bookings section is active on page load
    const bookingsSection = document.getElementById('bookings-section');
    if (bookingsSection && bookingsSection.classList.contains('active')) {
        loadBookingHistory();
    }
});
