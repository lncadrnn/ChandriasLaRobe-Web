import {
    auth,
    onAuthStateChanged,
    signOut,
    chandriaDB,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
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
            link.addEventListener('click', function() {
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

    // Initialize all functionality
    initializeSidebarNavigation();
    initializeBookingHistory();
});
