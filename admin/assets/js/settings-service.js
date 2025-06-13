import {
    chandriaDB,
    doc,
    updateDoc,
    getDoc,
    auth,
    onAuthStateChanged,
    validatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    signOut
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // Initialize Notyf for notifications
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        duration: 3000
    });

    // FILLS EMAIL INPUT FIELD
    onAuthStateChanged(auth, user => {
        if (user) {
            // Set email to the input field
            loadAdminProfile();
        } else {
            $("#email").val("No Admin Logged In.");
        }
    });

    async function loadAdminProfile() {
        const user = auth.currentUser;

        if (!user) {
            notyf.error("User not signed in.");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "adminAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                $("#name").val(userData.fullname || "");
                $("#email").val(userData.email || user.email); // fallback to Auth email
            } else {
                console.warn("Admin profile not found.");
            }
        } catch (error) {
            console.error("Failed to load admin profile:", error);
            notyf.error("Error loading profile data.");
        }
    }

    // COMMENTED OUT: Check if the user is logged in and display the email
    // onAuthStateChanged(auth, user => {
    //     if (user) {
    //         // User is signed in
    //         const userEmail = user.email;
    //         $("#email").val(userEmail); // Update the email input field

    //         // Extract name from email (part before @) or use displayName if available
    //         const userName = user.displayName || userEmail.split('@')[0];
    //         $("#name").val(userName);
    //     } else {
    //         // If no user is logged in, redirect to login page
    //         window.location.href = "authentication.html";
    //     }
    // });

    // SHOW PASSWORD FIELD
    $("#togglePasswordFields").on("click", function () {
        const passwordFields = $("#passwordFields");
        if (passwordFields.is(":visible")) {
            passwordFields.hide();
            $(this).text("Change Password");
        } else {
            passwordFields.show();
            $(this).text("Cancel Password Change");
        }
    });

    // Enable the Save button if any input changes
    $("#name, #password, #new-password, #confirm-new-password").on(
        "input",
        function () {
            $("#save-btn").removeClass("disabled");
        }
    );

    // HANDLE NAME UPDATE FUNCTION
    async function handleNameUpdate(user) {
        const updatedName = $("#name").val().trim();

        if (!updatedName) {
            notyf.error("Name cannot be empty.");
            throw new Error("Empty name");
        }

        if (/\d/.test(updatedName)) {
            notyf.error("Name must not contain numbers.");
            throw new Error("Invalid name format");
        }

        const userRef = doc(chandriaDB, "adminAccounts", user.uid);
        await updateDoc(userRef, {
            fullname: updatedName,
            email: user.email,
            updatedAt: new Date()
        });
    }

    // HANDLE PASSWORD UPDATE FUNCTION
    async function handlePasswordUpdate(user) {
        const currentPassword = $("#password").val().trim();
        const newPassword = $("#new-password").val().trim();
        const confirmNewPassword = $("#confirm-new-password").val().trim();

        const anyFilled = currentPassword || newPassword || confirmNewPassword;
        if (!anyFilled) return; // Skip if no password update

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            notyf.error("Please fill in all password fields.");
            throw new Error("Incomplete password fields");
        }

        if (newPassword !== confirmNewPassword) {
            notyf.error("New passwords do not match.");
            throw new Error("Passwords do not match");
        }

        const status = await validatePassword(auth, newPassword);
        if (!status.isValid) {
            const minLength =
                status.passwordPolicy.customStrengthOptions.minPasswordLength;
            let errorMsg =
                "<strong>Password doesn't meet requirements:</strong><ul>";
            if (!status.containsLowercaseLetter)
                errorMsg += "<li>~ Lowercase letter</li>";
            if (!status.containsUppercaseLetter)
                errorMsg += "<li>~ Uppercase letter</li>";
            if (!status.containsNumericCharacter)
                errorMsg += "<li>~ Number</li>";
            if (!status.containsNonAlphanumericCharacter)
                errorMsg += "<li>~ Special character</li>";
            if (minLength && newPassword.length < minLength)
                errorMsg += `<li>~ At least ${minLength} characters</li>`;
            errorMsg += "</ul>";

            notyf.open({ type: "error", message: errorMsg, duration: 5000 });
            throw new Error("Weak password");
        }

        try {
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            
            console.log("Password successfully updated!");

            // Clear password fields
            $("#password, #new-password, #confirm-new-password").val("");
            $("#passwordFields").hide();
        } catch (error) {
            if (error.code === "auth/invalid-credential") {
                notyf.error("Current password is incorrect.");
            } else if (error.code === "auth/requires-recent-login") {
                notyf.error("Please log in again to update password.");
            } else {
                notyf.error("Failed to update password.");
            }
            throw error;
        }
    }

    // === HANDLES SAVE CHANGES BUTTON ===
    $("#save-btn").on("click", async function (e) {
        e.preventDefault();

        const spinner = $("#spinner");
        spinner.removeClass("hidden");

        const user = auth.currentUser;
        if (!user) {
            notyf.error("User not signed in.");
            spinner.addClass("hidden");
            return;
        }

        try {
            await handleNameUpdate(user);
            await handlePasswordUpdate(user);
            notyf.success("Changes updated successfully.");
            $("#save-btn").addClass("disabled");
        } catch (error) {
            console.error("Update failed:", error);
        } finally {
            spinner.addClass("hidden");
        }
    });
    
    // --====== START OF LOGOUT FUNCTION ======--
    const logoutModal = $("#logout-modal");

    $("#signOut-btn").on("click", function () {
        logoutModal.addClass("show");
    });

    $("#logout-yes").on("click", async function () {
        const $btn = $(this);
        $btn.attr("disabled", true).text("Signing Out...");

        const user = auth.currentUser;
        if (!user) {
            notyf.error("No user is currently signed in.");
            $btn.removeAttr("disabled").text("Sign Out");
            logoutModal.removeClass("show");
            return;
        }

        try {
            await signOut(auth);
            notyf.success("You have been successfully signed out.");
            logoutModal.removeClass("show");
            setTimeout(() => {
                window.location.href = "../index.html";
            }, 1800);
        } catch (error) {
            console.error("Sign-out failed:", error);
            notyf.error("Failed to sign out. Try again.");
            $btn.removeAttr("disabled").text("Sign Out");
            logoutModal.removeClass("show");
        }
    });

    // CLICKED NO, HIDE MODAL
    $("#logout-no").on("click", function () {
        logoutModal.removeClass("show");
    });

    // Close modal when clicking outside
    logoutModal.on("click", function (e) {
        if (e.target === this) {
            logoutModal.removeClass("show");
        }
    });
    // --====== END OF LOGOUT FUNCTION ======--

    // --====== SIDEBAR FUNCTIONALITY ======--
    $(document).ready(function () {
        const $body = $("body"),
            $sidebar = $body.find(".custom-sidebar"),
            $toggle = $body.find(".custom-toggle");

        // --- Restore sidebar state from localStorage ---
        if (localStorage.getItem("admin-sidebar-closed") === "true") {
            $sidebar.addClass("close");
        }

        // Sidebar toggle (chevron)
        $toggle.on("click", function () {
            const isClosed = $sidebar.toggleClass("close").hasClass("close");
            localStorage.setItem("admin-sidebar-closed", isClosed);
        });
    });
});
