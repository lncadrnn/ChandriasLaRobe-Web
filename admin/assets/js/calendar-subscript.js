import {
    onAuthStateChanged,
    auth,
    doc,
    getDoc,
    chandriaDB,
    signOut
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    // Check if user is already signed in, if so, redirect to HOME PAGE
    onAuthStateChanged(auth, async user => {
        if (user) {
            // Check if user exists in userAccounts
            const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                // If user is customer, sign them out
                await signOut(auth);
                window.location.href = "../index.html";
                return;
            }
        }

        if (!user) {
            window.location.href = "./authentication.html";
        }
    });
});
