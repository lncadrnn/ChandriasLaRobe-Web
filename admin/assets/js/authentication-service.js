import {
    chandriaDB,
    appCredential,
    auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    signOut,
    query,
    where
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // FLAG TO PREVENT IMMEDIATE REDIRECT AFTER LOGIN
    let isLoggingIn = false;

    // COMMENTED OUT: Check if user is already signed in, if so, redirect to profile page
    // onAuthStateChanged(auth, async user => {
    //     if (user && !isLoggingIn) {
    //         // Delay just a bit to allow UI elements to load before redirecting
    //         setTimeout(() => {
    //             window.location.href = "/admin/dashboard.html"; // Redirect to profile page if already logged in
    //         }, 800);

    //         // Check if user exists in adminAccounts
    //         const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
    //         const userDocSnap = await getDoc(userDocRef);

    //         if (userDocSnap.exists()) {
    //             // If user is admin, sign them out
    //             await signOut(auth);
    //             $("#login-loader").addClass("hidden");
    //             return;
    //         }
    //     }

    //     if (!user) {
    //         $("#login-loader").addClass("hidden");
    //     }
    // });

    // ERROR MESSAGES FORMAT
    const formatErrorMessage = errorCode => {
        let message = "";

        if (
            errorCode === "auth/invalid-email" ||
            errorCode === "auth/missing-email"
        ) {
            message = "Please enter a valid email";
        } else if (
            errorCode === "auth/missing-password" ||
            errorCode === "auth/weak-password"
        ) {
            message = "Password must be at least 6 characters long";
        } else if (errorCode === "auth/email-already-in-use") {
            message = "Email is already taken";
        } else if (errorCode === "auth/user-not-found") {
            message = "No user found with this email";
        } else if (errorCode === "auth/wrong-password") {
            message = "Incorrect password";
        } else if (errorCode === "auth/invalid-credential") {
            message = "Incorrect Email or Password";
        }

        return message;
    };

    // DOM VARIABLES
    const loginBtn = $("#login-btn");
    // LOGIN BUTTON FUNCTION
    loginBtn.on("click", async function (e) {
        e.preventDefault();

        // Set logging in flag to true so we don’t auto-redirect before toast
        isLoggingIn = true;

        // Disable the login button while attempting login
        loginBtn.attr("disabled", true).text("Signing in...");

        const email = $("#login-email").val().trim();
        const password = $("#login-password").val().trim();
        try {
            // CHECK IF EMAIL EXISTS IN userAccounts COLLECTION
            const emailQuery = await getDocs(
                query(
                    collection(chandriaDB, "adminAccounts"),
                    where("email", "==", email)
                )
            );
            // IF EMAIL DOES NOT EXIST, SHOW ERROR AND RETURN
            if (emailQuery.empty) {
                notyf.open({
                    type: "error",
                    message: "Email is not registered. Please sign up first.",
                    duration: 5000
                });

                // Re-enable login button
                loginBtn.attr("disabled", false).text("Sign In");
                return;
            }

            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            // CHECKING IF VERIFIED
            const user = userCredential.user;
            if (!user.emailVerified) {
                // Sign out the unverified user
                await auth.signOut();

                notyf.open({
                    type: "error",
                    message: "Please verify your email before logging in.",
                    duration: 5000
                });

                loginBtn.attr("disabled", false).text("Sign In");
                return;
            }

            // SHOW NOTYF
            notyf.open({
                type: "success",
                message: "Successful Login, Redirecting...",
                duration: 3000
            });

            // Delay redirect to allow toast to show
            setTimeout(() => {
                window.location.href = "/admin/dashboard.html"; // Redirect to dashboard
            }, 1300);
            //
        } catch (error) {
            console.error("Unable to Login: " + error.code + error.message);

            // Re-enable the login button after login attempt
            loginBtn.attr("disabled", false).text("Sign In");

            // Format user-friendly error message
            const errorMsg = formatErrorMessage(error.code);
            // If formatErrorMessage returns a message, show it
            if (errorMsg) {
                notyf.open({
                    type: "error",
                    message: errorMsg,
                    duration: 5000
                });
            } else {
                // Fallback for unknown errors
                notyf.error("Login failed. Please try again.");
            }
        }
    });

    // CHECKING EMAIL
    async function emailExistsInFirestore(email) {
        const usersRef = collection(chandriaDB, "adminAccounts");
        const snapshot = await getDocs(usersRef);
        const exists = snapshot.docs.some(doc => doc.data().email === email);
        return exists;
    }

    // FORGOT BUTTON FUNCTION
    const forgotBtn = $("#submit-forgot-btn");
    forgotBtn.on("click", async function (e) {
        e.preventDefault();
        const email = $("#forgot-email").val().trim();

        if (email === "") {
            notyf.error("Please enter your email address.");
            return;
        }

        // Validate format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            notyf.error("Invalid email format.");
            return;
        }

        forgotBtn.attr("disabled", true).text("Sending Reset Link...");

        try {
            //
            const exists = await emailExistsInFirestore(email);
            if (!exists) {
                notyf.error("Email not found. Please try another.");
                forgotBtn.attr("disabled", false).text("Submit");
                return;
            }
            //
            await sendPasswordResetEmail(auth, email);
            notyf.open({
                type: "success",
                message: "Reset link sent! Check your inbox.",
                duration: 5000
            });
            forgotBtn.attr("disabled", false).text("Submit");
        } catch (error) {
            console.error("Reset Error:", error.code, error.message);
            notyf.open({
                type: "error",
                message: "Something went wrong. Please try again.",
                duration: 5000
            });
            forgotBtn.attr("disabled", false).text("Submit");
        }
    });

    // TOGGLE TRIGGER ANIMATION
    const $container = $(".container");
    const $registerBtn = $(".register-btn");
    const $loginBtn = $(".login-btn");

    $registerBtn.on("click", function () {
        $container.addClass("active");
    });

    $loginBtn.on("click", function () {
        $container.removeClass("active");
    });

    $(window).on("resize", function () {
        $(".container").css("height", $(window).height() + "px");
    });

    // PASSWORD TOGGLE (MULTIPLE)
    function setupPasswordToggle(inputId, toggleId) {
        const $input = $("#" + inputId);
        const $toggle = $("#" + toggleId);

        if ($input.length && $toggle.length) {
            $toggle.on("click", function () {
                const type =
                    $input.attr("type") === "password" ? "text" : "password";
                $input.attr("type", type);
                $(this).toggleClass("bx-show bx-hide");
            });
        }
    }

    setupPasswordToggle("login-password", "toggle-login-password");
});
