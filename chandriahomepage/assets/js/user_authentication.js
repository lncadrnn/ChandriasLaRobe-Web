import {
    appCredential,
    auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    getFirestore,
    chandriaDB,
    collection,
    getDocs,
    getDoc,
    getAuth,
    signOut,
    createUserWithEmailAndPassword,
    validatePassword,
    sendEmailVerification,
    query,
    where,
    setDoc,
    doc,
    updateProfile
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // INTIALIZING NOTYF
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });

    // FLAG TO PREVENT IMMEDIATE REDIRECT AFTER LOGIN
    let isLoggingIn = false;

    // Check if user is already signed in, if so, redirect to HOME PAGE
    onAuthStateChanged(auth, async user => {
        if (user && !isLoggingIn) {
            // Delay just a bit to allow UI elements to load before redirecting
            setTimeout(() => {
                window.location.href = "../index.html"; // Redirect to profile page if already logged in
            }, 800);

            // Check if user exists in adminAccounts
            const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists()) {
                // If user is admin, sign them out
                await signOut(auth);
                $("#login-loader").addClass("hidden");
                return;
            }
        }

        if (!user) {
            $("#login-loader").addClass("hidden");
        }
        
    });

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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // LOGIN BUTTON FUNCTION
    const loginBtn = $("#login-btn");
    loginBtn.on("click", async function (e) {
        e.preventDefault();

        // Set logging in flag to true so we don’t auto-redirect before toast
        isLoggingIn = true;

        // Disable the login button while attempting login
        loginBtn.attr("disabled", true).text("Logging In...");

        const email = $("#login-email").val().trim();
        const password = $("#login-password").val().trim();
        try {
            // CHECK IF EMAIL EXISTS IN userAccounts COLLECTION
            const emailQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
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
                loginBtn.attr("disabled", false).text("Login");
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

                loginBtn.attr("disabled", false).text("Login");
                return;
            } // SHOW NOTYF
            notyf.open({
                type: "success",
                message: "Successful Login, Redirecting...",
                duration: 3000
            });

            // Store user email in localStorage for consistent auth state
            localStorage.setItem("userEmail", user.email);

            // Delay redirect to allow toast to show
            setTimeout(() => {
                window.location.href = "../../../index.html";
            }, 1300);
            //
        } catch (error) {
            console.error("Unable to Login: " + error.code + error.message);

            // Re-enable the login button after login attempt
            loginBtn.attr("disabled", false).text("Login");

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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // CHECKING EMAIL FOR FORGOT PASSWORD
    async function emailExistsInFirestore(email) {
        const usersRef = collection(chandriaDB, "userAccounts");
        const snapshot = await getDocs(usersRef);
        const exists = snapshot.docs.some(doc => doc.data().email === email);
        return exists;
    }

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // FORGOT BUTTON FUNCTION
    const forgotBtn = $("#submit-forgot-btn");
    forgotBtn.on("click", async function (e) {
        e.preventDefault();
        const email = $("#forgot-email").val().trim();

        // VALIDATE INPUT
        if (email === "") {
            notyf.error("Please enter your email address.");
            return;
        }
        // VALIDATE FORMAT
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            notyf.error("Invalid email format.");
            return;
        }

        forgotBtn.attr("disabled", true).text("Submitting...");

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

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // TOGGLE BETWEEN FORGOT PASSWORD
    $("#forgot-link").on("click", function () {
        $("#form-box-login").addClass("hide");
        $("#form-box-forgot").addClass("show");
    });
    $("#back-to-login").on("click", function () {
        $("#form-box-forgot").removeClass("show");
        $("#form-box-login").removeClass("hide");
    });
    // ----- END OF LOGIN FUNCTION -----
    // --------------------------------------------------------------------------------------------------------------------------------

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // DOM VARIABLES
    const $fullname = $("#signup-fullname"),
        $username = $("#signup-username"),
        $email = $("#signup-email"),
        $contact = $("#signup-contact"),
        $password = $("#signup-password"),
        $passwordConfirm = $("#confirm-password");
    const signUpBtn = $("#signUp-btn");
    // SIGN-UP BUTTON FUNCTION
    signUpBtn.on("click", async function (e) {
        e.preventDefault();
        isLoggingIn = true;

        // Variables
        const fullname = $fullname.val();
        const username = $username.val().trim();
        const email = $email.val().trim();
        const contact = $contact.val().trim();
        const password = $password.val().trim();
        const passwordConfirm = $passwordConfirm.val().trim();

        signUpBtn.attr("disabled", true).text("Signing Up...");

        // --- VALIDATIONS ---
        if (
            !fullname ||
            !username ||
            !email ||
            !contact ||
            !password ||
            !passwordConfirm
        ) {
            notyf.error("Please fill in all fields.");
            return enableButton();
        }

        const fullnamePattern = /^([A-Z][a-z]+)( [A-Z][a-z]+)+$/;
        if (!fullnamePattern.test(fullname)) {
            notyf.error(
                "Full name must be at least two words, only letters, and each starting with a capital letter."
            );
            return enableButton();
        }

        const contactPattern = /^09\d{9}$/;
        if (!contactPattern.test(contact)) {
            notyf.error(
                "Contact number must start with '09' and be exactly 11 digits."
            );
            return enableButton();
        }

        if (password !== passwordConfirm) {
            notyf.error("Passwords do not match.");
            return enableButton();
        }

        try {
            // PASSWORD STRENGTH VALIDATION
            const status = await validatePassword(auth, password);
            if (!status.isValid) {
                const minLength =
                    status.passwordPolicy.customStrengthOptions
                        .minPasswordLength;
                let errorMsg = `<strong>Password doesn't meet requirements:</strong><ul>`;
                if (!status.containsLowercaseLetter)
                    errorMsg += "<li>Lowercase letter</li>";
                if (!status.containsUppercaseLetter)
                    errorMsg += "<li>Uppercase letter</li>";
                if (!status.containsNumericCharacter)
                    errorMsg += "<li>Number</li>";
                if (!status.containsNonAlphanumericCharacter)
                    errorMsg += "<li>Special character</li>";
                if (minLength && password.length < minLength)
                    errorMsg += `<li>At least ${minLength} characters</li>`;
                errorMsg += "</ul>";

                notyf.open({
                    type: "error",
                    message: errorMsg,
                    duration: 5000
                });
                return enableButton();
            }

            // CHECK IF USERNAME EXISTS
            const usernameQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
                    where("username", "==", username)
                )
            );
            if (!usernameQuery.empty) {
                notyf.error(
                    "Username is already taken. Please choose another."
                );
                return enableButton();
            }

            // FIREBASE AUTH SIGN-UP
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            await getAuth().signOut(); // Sign out immediately after registration
            await sendEmailVerification(userCredential.user);
            await updateProfile(userCredential.user, { displayName: fullname });

            // FORM DATA
            const userData = {
                fullname,
                contact,
                username,
                email,
                createdAt: new Date()
            };

            // SAVE USER INFO TO FIRESTORE
            await setDoc(
                doc(chandriaDB, "userAccounts", userCredential.user.uid),
                userData
            );

            // SUCCESS MESSAGE
            notyf.success(
                "Successfully Signed-Up! Check your email for verification."
            );
            $("#form-signup")[0].reset();
        } catch (error) {
            console.error("Sign-up error:", error.code, error.message);

            const errorMsg = formatErrorMessage(error.code);
            notyf.error(errorMsg || "Sign-up failed. Please try again.");
        } finally {
            enableButton();
        }

        function enableButton() {
            signUpBtn.attr("disabled", false).text("Sign Up");
        }
    });
    // ----- END OF SIGNUP FUNCTION -----
    // --------------------------------------------------------------------------------------------------------------------------------

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // TOGGLE BETWEEN LOGIN AND REGISTER
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
        $(".container").css("height", window.innerHeight + "px");
    });

    // Password visibility toggle
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
    setupPasswordToggle("signup-password", "toggle-register-password");
    setupPasswordToggle("confirm-password", "toggle-register-confirm-password");
});
