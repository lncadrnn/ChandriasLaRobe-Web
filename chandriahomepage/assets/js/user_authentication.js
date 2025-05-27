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

// Import auto-logout functionality
import autoLogout from "./auto-logout.js";

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

    // Check if user is already signed in, if so, redirect to profile page
    onAuthStateChanged(auth, user => {
        if (user && !isLoggingIn) {
            // Delay just a bit to allow UI elements to load before redirecting
            setTimeout(() => {
                window.location.href = "../../../index.html"; // Redirect to profile page if already logged in
            }, 800);
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
            }

            // SHOW NOTYF
            notyf.open({
                type: "success",
                message: "Successful Login, Redirecting...",
                duration: 3000
            });

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

        // Set logging in flag to true so we don’t auto-redirect before toast
        isLoggingIn = true;

        // VARIABLES
        const fullname = $fullname.val();
        const username = $username.val().trim();
        const email = $email.val().trim();
        const contact = $contact.val().trim();
        const password = $password.val().trim();
        const passwordConfirm = $passwordConfirm.val().trim();

        // DISABLING SIGN-UP BUTTON WHEN SIGNING-UP
        signUpBtn.attr("disabled", true).text("Signing Up...");

        if (!fullname || !username || !email || !contact || !password || !passwordConfirm) {
            notyf.error("Please fill in all fields.");
            signUpBtn.attr("disabled", false).text("Sign Up");
            return;
        }
        
        // FULLNAME VALIDATION
        const fullnamePattern = /^([A-Z][a-z]+)( [A-Z][a-z]+)+$/;
        if (!fullnamePattern.test(fullname)) {
           notyf.open({
                    type: "error",
                    message: "Full name must be at least two words, only letters, and each starting with a capital letter.",
                    duration: 5000
                });
            signUpBtn.attr("disabled", false).text("Sign Up");
            return;
        }
        
        // CONTACT NUMBER VALIDATION
        const contactPattern = /^09\d{9}$/;
        if (!contactPattern.test(contact)) {
            notyf.error("Contact number must start with '09' and be exactly 11 digits.");
            signUpBtn.attr("disabled", false).text("Sign Up");
            return;
        }

        // CONFIRM PASSWORD VALIDATION
        if (password !== passwordConfirm) {
            notyf.error("Passwords do not match.");

            // ENABLING SIGN-UP BUTTON WHEN WRONG CONFIRM PASSWORD
            signUpBtn.attr("disabled", false).text("Sign Up");
            return;
        }

        // PASSWORD VALIDATION
        try {
            const status = await validatePassword(auth, password);
            if (!status.isValid) {
                let errorMsg = `<strong>Password doesn't meet the following requirements:</strong><ul style="padding-left: 20px; margin: 0;">`;

                const minLength =
                    status.passwordPolicy.customStrengthOptions
                        .minPasswordLength;

                if (status.containsLowercaseLetter === false)
                    errorMsg += "<li>At least one lowercase letter</li>";
                if (status.containsUppercaseLetter === false)
                    errorMsg += "<li>At least one uppercase letter</li>";
                if (status.containsNumericCharacter === false)
                    errorMsg += "<li>At least one number</li>";
                if (status.containsNonAlphanumericCharacter === false)
                    errorMsg += "<li>At least one special character</li>";
                if (minLength && password.length < minLength)
                    errorMsg += `<li>Minimum length: ${minLength} characters</li>`;

                console.log(`Minimum length required: ${minLength}`);

                errorMsg += "</ul>";

                notyf.open({
                    type: "error",
                    message: errorMsg,
                    duration: 5000
                });

                // ENABLING SIGN-UP BUTTON WHEN WRONG VALIDATION
                signUpBtn.attr("disabled", false).text("Sign Up");
                return;
            }

            // CHECK IF USERNAME ALREADY EXISTS
            const usernameQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
                    where("username", "==", username)
                )
            );

            // IF USERNAME EXISTS, SHOW ERROR AND RETURN
            if (!usernameQuery.empty) {
                notyf.open({
                    type: "error",
                    message:
                        "Username is already taken. Please choose another one.",
                    duration: 5000
                });

                // ENABLING SIGN-UP BUTTON WHEN USERNAME IS TAKEN
                signUpBtn.attr("disabled", false).text("Sign Up");
                return;
            }

            // REGISTERING IF SUCCESS
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // SIGN OUT user so they must log in manually
            await getAuth().signOut();

            // SEND VERIFICATION EMAIL
            await sendEmailVerification(userCredential.user);
            
            // UPDATE FIREBASE USER PROFILE WITH FULL NAME
              await updateProfile(userCredential.user, {
                  displayName: fullname
              });
              
              // SAVE ADDITIONAL USER INFO TO FIRESTORE
              await setDoc(
                  doc(chandriaDB, "userAccounts", userCredential.user.uid),
                  {
                      fullname: fullname,
                      contact: contact,
                      username: username,
                      email: email,
                      createdAt: new Date()
                  }
              );

            // MESSAGE IF SUCCESS
            notyf.open({
                type: "success",
                message:
                    "Successfully Signed-Up! Now Check Email for Verification!",
                duration: 5000
            });

            // CLEARING FORM INPUTS
            $("#form-signup")[0].reset();

            // ERROR IF FAILED
        } catch (error) {
            console.error(error.code, error.message);

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
        } finally {
        // ENABLING SIGN-UP BUTTON AFTER SUCCESS REGISTERING
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
