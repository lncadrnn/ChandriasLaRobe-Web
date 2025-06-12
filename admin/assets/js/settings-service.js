import {
    auth,
    onAuthStateChanged,
    signOut
} from "./sdk/chandrias-sdk.js";

// Global functions for avatar functionality
window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarPlaceholder = document.querySelector('.avatar-placeholder');
            const resetBtn = document.querySelector('.avatar-reset-btn');
            
            avatarPlaceholder.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
            resetBtn.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
};

window.resetAvatar = function() {
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    const resetBtn = document.querySelector('.avatar-reset-btn');
    const fileInput = document.getElementById('profile-image-upload');
    
    avatarPlaceholder.innerHTML = `
        <div class="avatar-content">
            <i class="fas fa-user"></i>
            <span>AVATAR</span>
        </div>
    `;
    resetBtn.style.display = 'none';
    fileInput.value = '';
};

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

    // Password fields toggle
    $("#togglePasswordFields").on("click", function() {
        const passwordFields = $("#passwordFields");
        if (passwordFields.is(":visible")) {
            passwordFields.hide();
            $(this).text("Change Password");
        } else {
            passwordFields.show();
            $(this).text("Cancel Password Change");
        }
    });

    // LOGOUT FUNCTION with modal
    const logoutModal = $("#logout-modal");
    
    $("#signOut-btn").on("click", function () {
        logoutModal.css("display", "flex");
    });    $("#logout-yes").on("click", function () {
        // Close the modal first
        logoutModal.css("display", "none");
        
        // Show loading message
        notyf.open({
            type: "info",
            message: "Signing out...",
            duration: 2000
        });
        
        signOut(auth)
            .then(() => {
                // Clear any stored admin data
                localStorage.removeItem('userEmail');
                localStorage.removeItem('adminEmail');
                sessionStorage.clear();
                
                // Show success message
                notyf.success("Successfully signed out! Redirecting to main website...");
                
                // Redirect after a short delay to show the message
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 1500);
            })
            .catch(error => {
                console.error("Error signing out:", error);
                
                // Clear stored data even if signOut fails
                localStorage.removeItem('userEmail');
                localStorage.removeItem('adminEmail');
                sessionStorage.clear();
                
                // Show error message but still redirect
                notyf.error("Sign out completed with some issues. Redirecting...");
                
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 1500);
            });
    });$("#logout-no").on("click", function () {
        logoutModal.css("display", "none");
    });

    // Close modal when clicking outside
    logoutModal.on("click", function(e) {
        if (e.target === this) {
            logoutModal.css("display", "none");
        }
    });

    // SIDEBAR FUNCTIONALITY
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
