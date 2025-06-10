import {
    chandriaDB,
    auth,
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    validatePassword,
    sendEmailVerification,
    setDoc,
    doc,
    query,
    where
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });
    
    // DOM VARIABLES
    const $email = $("#signup-email"),
        $password = $("#signup-password"),
        $passwordConfirm = $("#confirm-password");
    const signUpBtn = $("#signUp-btn");
    // SIGN-UP BUTTON FUNCTION
    signUpBtn.on("click", async function (e) {
        e.preventDefault();

        // VARIABLES
        const email = $email.val().trim();
        const password = $password.val().trim();
        const passwordConfirm = $passwordConfirm.val().trim();

        // DISABLING SIGN-UP BUTTON WHEN SIGNING-UP
        signUpBtn.attr("disabled", true).text("Signing Up...");

        if (!email || !password || !passwordConfirm) {
            notyf.error("Please fill in all fields.");
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

            // REGISTERING IF SUCCESS
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // SEND VERIFICATION EMAIL
            await sendEmailVerification(userCredential.user);

            await setDoc(
                doc(chandriaDB, "adminAccounts", userCredential.user.uid),
                {
                    email: email,
                    role: "admin",
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

            // SIGN OUT user so they must log in manually
            await getAuth().signOut();

            // CLEARING FORM INPUTS
            $email.val("");
            $password.val("");
            $passwordConfirm.val("");

            // ERROR IF FAILED
        } catch (error) {
            console.error(error.code, error.message);
        }

        // ENABLING SIGN-UP BUTTON AFTER SUCCESS REGISTERING
        signUpBtn.attr("disabled", false).text("Sign Up");
    });

    // TOGGLING PASSWORD
    $("#toggle-signup-passwords").click(function () {
        const input = $("#signup-password");
        const confirm = $("#confirm-password");

        const type = input.attr("type") === "password" ? "text" : "password";

        input.attr("type", type);
        confirm.attr("type", type);

        $(this).toggleClass("bx-show bx-hide");
    });
});
