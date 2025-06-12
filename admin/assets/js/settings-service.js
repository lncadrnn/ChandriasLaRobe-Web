import { auth, onAuthStateChanged, signOut } from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // Initialize Notyf for notifications
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        duration: 3000
    });

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
