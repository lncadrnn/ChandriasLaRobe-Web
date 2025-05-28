import {
    auth,
    onAuthStateChanged,
    signOut
} from "./sdk/chandrias-sdk.js";
import autoLogout from "./auto-logout.js";

$(document).ready(function () {

    // Check if the user is logged in and display the email
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in
            const userEmail = user.email;
            $("#user-email").text(userEmail); // Using jQuery to update the email
        } else {
            // If no user is logged in, redirect to login page
            window.location.href = "../../shop.html";
        }
    });

    // LOGOUT FUNCTION
    $("#signOut-btn").on("click", function () {
        if (confirm("Are you sure you want to Log-out?")) {
            signOut(auth)
                .then(() => {
                    window.location.href = "../../index.html"; // Redirect to main site after logout
                })
                .catch(error => {
                    console.error("Error signing out:", error);
                });
        }
    });
});
