// Authentication Modal JavaScript with Firebase Integration
import {
    auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    chandriaDB,
    collection,
    getDocs,
    getDoc,
    signOut,
    createUserWithEmailAndPassword,
    validatePassword,
    sendEmailVerification,
    query,
    where,
    setDoc,
    doc,
    updateProfile,
    getAuth
} from "./sdk/chandrias-sdk.js";

class AuthModal {
    constructor() {
        this.modal = document.getElementById('auth-modal');
        this.signInForm = document.getElementById('signin-form');
        this.signUpForm = document.getElementById('signup-form');
        this.forgotPasswordForm = document.getElementById('forgot-form');
        this.currentForm = 'signin';
        this.isLoggingIn = false;
          // Initialize Notyf for notifications
        this.notyf = new Notyf({
            duration: 4000,
            position: {
                x: 'center',
                y: 'top',
            },
            dismissible: true,
            ripple: true,
            types: [
                {
                    type: 'warning',
                    background: '#f39c12',
                    icon: {
                        className: 'fi fi-rs-exclamation-triangle',
                        tagName: 'i',
                        text: ''
                    }
                },
                {
                    type: 'info',
                    background: '#3498db',
                    icon: {
                        className: 'fi fi-rs-info',
                        tagName: 'i',
                        text: ''
                    }
                }
            ]
        });
        
        // Set Notyf container z-index to be higher than auth modal
        setTimeout(() => {
            const notyfContainer = document.querySelector('.notyf');
            if (notyfContainer) {
                notyfContainer.style.zIndex = '20000';
            }
        }, 100);
        
        this.initializeEventListeners();
        this.setupPasswordToggles();
        this.setupAuthStateListener();
    }    initializeEventListeners() {
        // Modal open/close events
        const closeBtn = document.querySelector('.auth-close');
        const modalOverlay = this.modal;

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Form switching events
        document.addEventListener('click', (e) => {
            if (e.target.id === 'switch-to-signup') {
                e.preventDefault();
                this.switchForm('signup');
            } else if (e.target.id === 'switch-to-signin') {
                e.preventDefault();
                this.switchForm('signin');
            } else if (e.target.id === 'back-to-signin') {
                e.preventDefault();
                this.switchForm('signin');
            } else if (e.target.id === 'forgot-password-link') {
                e.preventDefault();
                this.switchForm('forgot');
            }
        });

        // Form submission events
        const signInFormElement = document.getElementById('signin-form-element');
        const signUpFormElement = document.getElementById('signup-form-element');
        const forgotFormElement = document.getElementById('forgot-form-element');

        if (signInFormElement) {
            signInFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignIn(e);
            });
        }

        if (signUpFormElement) {
            signUpFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignUp(e);
            });
        }

        if (forgotFormElement) {
            forgotFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(e);
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });

        // Setup real-time validation
        this.setupFormValidation();
    }    setupAuthStateListener() {
        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            if (user && this.isLoggingIn) {
                // Check if user exists in adminAccounts and redirect them
                const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    // If user is admin, sign them out
                    await signOut(auth);
                    this.isLoggingIn = false;
                    return;
                }

                // Update UI for authenticated user
                this.updateUIForAuthenticatedUser(user);
                this.closeModal();
                this.isLoggingIn = false;
            } else if (!user && !this.isLoggingIn) {
                // Update UI for unauthenticated user
                this.updateUIForUnauthenticatedUser();
            }
        });
    }    updateUIForAuthenticatedUser(user) {
        // Update navigation
        const loginNav = document.getElementById('nav-login');
        const userNav = document.getElementById('nav-user');
        
        if (loginNav) loginNav.style.display = 'none';
        if (userNav) userNav.style.display = 'block';

        // Store user email in localStorage
        localStorage.setItem('userEmail', user.email);

        // Trigger cart/wishlist count updates if functions exist
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        if (typeof updateWishlistCount === 'function') {
            updateWishlistCount();
        }

        // Delay page reload to allow UI updates to complete
        setTimeout(() => {
            if (typeof location !== 'undefined' && location.reload) {
                location.reload();
            }
        }, 2000);
    }

    updateUIForUnauthenticatedUser() {
        // Update navigation
        const loginNav = document.getElementById('nav-login');
        const userNav = document.getElementById('nav-user');
        
        if (loginNav) loginNav.style.display = 'block';
        if (userNav) userNav.style.display = 'none';

        // Clear stored data
        localStorage.removeItem('userEmail');

        // Reset counts
        const cartCount = document.getElementById('cart-count');
        const wishlistCount = document.getElementById('wishlist-count');
        
        if (cartCount) cartCount.textContent = '0';
        if (wishlistCount) wishlistCount.textContent = '0';
    }

    show() {
        this.openModal();
    }

    hide() {
        this.closeModal();
    }

    openModal() {
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input field
        setTimeout(() => {
            const firstInput = this.getCurrentForm().querySelector('input[type="email"], input[type="text"]');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }    closeModal() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
        this.clearForms();
        this.clearErrors();
        // Reset to sign-in form when modal is closed
        this.switchForm('signin');
    }    switchForm(formType) {
        // Clear errors first
        this.clearErrors();
        
        // Hide all forms immediately
        this.signInForm.classList.remove('active');
        this.signUpForm.classList.remove('active');
        this.forgotPasswordForm.classList.remove('active');
        
        // Remove signup-active class from form section
        const formSection = document.querySelector('.auth-form-section');
        if (formSection) {
            formSection.classList.remove('signup-active');
        }

        // Small delay to ensure clean transition
        setTimeout(() => {
            // Show selected form
            switch (formType) {
                case 'signup':
                    this.signUpForm.classList.add('active');
                    this.currentForm = 'signup';
                    // Add signup-active class to form section for reduced padding
                    if (formSection) {
                        formSection.classList.add('signup-active');
                    }
                    break;
                case 'forgot':
                    this.forgotPasswordForm.classList.add('active');
                    this.currentForm = 'forgot';
                    break;
                default:
                    this.signInForm.classList.add('active');
                    this.currentForm = 'signin';
            }

            // Focus on first input after form is visible
            setTimeout(() => {
                const firstInput = this.getCurrentForm().querySelector('input[type="email"], input[type="text"]');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 50);
        }, 10);
    }getCurrentForm() {
        switch (this.currentForm) {
            case 'signup': return this.signUpForm;
            case 'forgot': return this.forgotPasswordForm;
            default: return this.signInForm;
        }
    }    async handleSignIn(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!this.validateSignInForm(email, password)) {
            return;
        }

        this.isLoggingIn = true;
        this.showLoading(event.target);

        try {
            // Check if email exists in userAccounts collection
            const emailQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
                    where("email", "==", email)
                )
            );

            // If email does not exist, show error and return
            if (emailQuery.empty) {
                this.notyf.error("Email is not registered. Please sign up first.");
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Check if verified
            const user = userCredential.user;
            if (!user.emailVerified) {
                // Sign out the unverified user
                await signOut(auth);
                this.notyf.error("Please verify your email before logging in.");
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            // Success
            this.notyf.success("Login successful! Welcome back.");
            
            // The auth state listener will handle UI updates and modal closing
            
        } catch (error) {
            console.error("Login error:", error.code, error.message);
            
            const errorMsg = this.formatErrorMessage(error.code);
            if (errorMsg) {
                this.notyf.error(errorMsg);
            } else {
                this.notyf.error("Wrong email or password entered");
            }
            
            this.isLoggingIn = false;
            this.hideLoading(event.target);
        }
    }    async handleSignUp(event) {
        const formData = new FormData(event.target);
        const fullname = formData.get('fullname');
        const username = formData.get('username');
        const email = formData.get('email');
        const contact = formData.get('contact');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        if (!this.validateSignUpForm(fullname, username, email, contact, password, confirmPassword)) {
            return;
        }

        this.isLoggingIn = true;
        this.showLoading(event.target);

        try {
            // Password strength validation
            const status = await validatePassword(auth, password);
            if (!status.isValid) {
                const minLength = status.passwordPolicy.customStrengthOptions.minPasswordLength;
                let errorMsg = `<strong>Password doesn't meet requirements:</strong><ul>`;
                if (!status.containsLowercaseLetter) errorMsg += "<li>Lowercase letter</li>";
                if (!status.containsUppercaseLetter) errorMsg += "<li>Uppercase letter</li>";
                if (!status.containsNumericCharacter) errorMsg += "<li>Number</li>";
                if (!status.containsNonAlphanumericCharacter) errorMsg += "<li>Special character</li>";
                if (minLength && password.length < minLength) errorMsg += `<li>At least ${minLength} characters</li>`;
                errorMsg += "</ul>";

                this.notyf.open({
                    type: "error",
                    message: errorMsg,
                    duration: 5000
                });
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            // Check if username exists
            const usernameQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
                    where("username", "==", username)
                )
            );
            if (!usernameQuery.empty) {
                this.notyf.error("Username is already taken. Please choose another.");
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            // Firebase Auth sign-up
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await getAuth().signOut(); // Sign out immediately after registration
            await sendEmailVerification(userCredential.user);
            await updateProfile(userCredential.user, { displayName: fullname });

            // Form data
            const userData = {
                fullname,
                contact,
                username,
                email,
                createdAt: new Date()
            };

            // Save user info to Firestore
            await setDoc(
                doc(chandriaDB, "userAccounts", userCredential.user.uid),
                userData
            );

            // Success message
            this.notyf.success("Account created successfully! Check your email for verification.");
            
            this.isLoggingIn = false;
            this.hideLoading(event.target);
            
            setTimeout(() => {
                this.switchForm('signin');
            }, 2000);

        } catch (error) {
            console.error("Sign-up error:", error.code, error.message);
            
            const errorMsg = this.formatErrorMessage(error.code);
            this.notyf.error(errorMsg || "Sign-up failed. Please try again.");
            
            this.isLoggingIn = false;
            this.hideLoading(event.target);
        }
    }async handleForgotPassword(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            return;
        }

        this.showLoading(event.target);

        try {
            // Check if email exists in Firestore
            const exists = await this.emailExistsInFirestore(email);
            if (!exists) {
                this.notyf.error("Email not found. Please try another.");
                return;
            }

            await sendPasswordResetEmail(auth, email);
            this.notyf.success('Password reset link sent to your email.');
            
            setTimeout(() => {
                this.switchForm('signin');
            }, 2000);

        } catch (error) {
            console.error("Reset error:", error.code, error.message);
            this.notyf.error("Something went wrong. Please try again.");
        } finally {
            this.hideLoading(event.target);
        }
    }

    async emailExistsInFirestore(email) {
        const usersRef = collection(chandriaDB, "userAccounts");
        const snapshot = await getDocs(usersRef);
        const exists = snapshot.docs.some(doc => doc.data().email === email);
        return exists;
    }    formatErrorMessage(errorCode) {
        let message = "";

        if (errorCode === "auth/invalid-email" || errorCode === "auth/missing-email") {
            message = "Please enter a valid email";
        } else if (errorCode === "auth/missing-password" || errorCode === "auth/weak-password") {
            message = "Password must be at least 6 characters long";
        } else if (errorCode === "auth/email-already-in-use") {
            message = "Email is already taken";
        } else if (errorCode === "auth/user-not-found") {
            message = "Wrong email or password entered";
        } else if (errorCode === "auth/wrong-password") {
            message = "Wrong email or password entered";
        } else if (errorCode === "auth/invalid-credential") {
            message = "Wrong email or password entered";
        } else if (errorCode === "auth/too-many-requests") {
            message = "Too many failed attempts. Please try again later";
        }

        return message;
    }

    async handleGoogleSignIn() {
        try {            this.showLoading(document.getElementById('google-signin'));
            
            // Simulate Google OAuth
            await this.simulateAuthRequest();
            
            this.notyf.success('Google sign in successful!');
            setTimeout(() => {
                this.closeModal();
            }, 1500);

        } catch (error) {
            this.notyf.error('Google sign in failed. Please try again.');
        } finally {
            this.hideLoading(document.getElementById('google-signin'));
        }
    }

    async handleFacebookSignIn() {
        try {            this.showLoading(document.getElementById('facebook-signin'));
            
            // Simulate Facebook OAuth
            await this.simulateAuthRequest();
            
            this.notyf.success('Facebook sign in successful!');
            setTimeout(() => {
                this.closeModal();
            }, 1500);

        } catch (error) {
            this.notyf.error('Facebook sign in failed. Please try again.');
        } finally {
            this.hideLoading(document.getElementById('facebook-signin'));
        }
    }    validateSignInForm(email, password) {
        let isValid = true;

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            isValid = false;
        }

        if (!password || password.length < 6) {
            this.notyf.error('Password must be at least 6 characters long.');
            isValid = false;
        }

        return isValid;
    }        validateSignUpForm(fullname, username, email, contact, password, confirmPassword) {
        let isValid = true;

        if (!fullname || fullname.trim().length < 2) {
            this.notyf.error('Full name must be at least 2 characters long.');
            isValid = false;
        }

        // Validate full name pattern (at least two words, each starting with capital letter)
        const fullnamePattern = /^([A-Z][a-z]+)( [A-Z][a-z]+)+$/;
        if (fullname && !fullnamePattern.test(fullname)) {
            this.notyf.error('Full name must be at least two words, only letters, and each starting with a capital letter.');
            isValid = false;
        }

        if (!username || username.trim().length < 3) {
            this.notyf.error('Username must be at least 3 characters long.');
            isValid = false;
        }

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            isValid = false;
        }

        if (!this.validatePhone(contact)) {
            this.notyf.error('Contact number must start with "09" and be exactly 11 digits.');
            isValid = false;
        }

        if (!password || password.length < 6) {
            this.notyf.error('Password must be at least 6 characters long.');
            isValid = false;
        }

        if (password !== confirmPassword) {
            this.notyf.error('Passwords do not match.');
            isValid = false;
        }

        return isValid;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const contactPattern = /^09\d{9}$/;
        return contactPattern.test(phone);
    }setupFormValidation() {
        // Real-time validation for all inputs
        const inputs = this.modal.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                // Clear visual error state when user starts typing
                input.classList.remove('error');
            });
        });
    }

    validateField(input) {
        const { name, value } = input;

        switch (name) {
            case 'email':
                if (value.length > 0 && !this.validateEmail(value)) {
                    this.notyf.error('Please enter a valid email address.');
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
                break;
            case 'password':
                if (value.length > 0 && value.length < 6) {
                    this.notyf.error('Password must be at least 6 characters long.');
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
                break;            
            case 'confirm-password':
                const passwordField = this.modal.querySelector('input[name="password"]');
                if (value.length > 0 && value !== passwordField.value) {
                    this.notyf.error('Passwords do not match.');
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
                break;
            case 'contact':
                if (value.length > 0 && !this.validatePhone(value)) {
                    this.notyf.error('Please enter a valid phone number.');
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
                break;
        }
    }    showError(message) {
        this.notyf.error(message);
    }

    showSuccess(message) {
        this.notyf.success(message);
    }

    clearErrors() {
        // Clear any visual error states from input fields
        const errorFields = this.modal.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }

    clearForms() {
        const forms = this.modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }

    showLoading(element) {
        const button = element.querySelector('button[type="submit"]') || element;
        button.disabled = true;
        
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.innerHTML = '<i class="fi fi-rs-spinner"></i> Loading...';
        button.classList.add('loading');
    }

    hideLoading(element) {
        const button = element.querySelector('button[type="submit"]') || element;
        button.disabled = false;
        
        const originalText = button.dataset.originalText;
        if (originalText) {
            button.textContent = originalText;
        }
        button.classList.remove('loading');
    }

    togglePasswordVisibility(toggleButton) {
        const passwordField = toggleButton.previousElementSibling;
        const icon = toggleButton.querySelector('i');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.className = 'fi fi-rs-eye-crossed';
        } else {
            passwordField.type = 'password';
            icon.className = 'fi fi-rs-eye';
        }
    }

    setupPasswordToggles() {
        // Add password toggle functionality for all password fields
        const passwordFields = this.modal.querySelectorAll('input[type="password"]');
        
        passwordFields.forEach(field => {
            // Create toggle button if it doesn't exist
            const toggleExists = field.parentNode.querySelector('.password-toggle');
            if (!toggleExists) {
                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'password-toggle';
                toggleBtn.innerHTML = '<i class="fi fi-rs-eye"></i>';
                toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
                
                // Insert after the input field
                field.parentNode.insertBefore(toggleBtn, field.nextSibling);
                
                // Add click event listener
                toggleBtn.addEventListener('click', () => {
                    this.togglePasswordVisibility(toggleBtn);
                });
            }
        });
    }

    simulateAuthRequest() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo
                Math.random() > 0.1 ? resolve() : reject(new Error('Auth failed'));
            }, 1500);
        });
    }
}

// Initialize the auth modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const authModal = new AuthModal();    // Make functions globally accessible
    window.showAuthModal = () => {
        // Check if user is already logged in
        const userEmail = localStorage.getItem('userEmail');
        const currentUser = auth.currentUser;
        
        if (userEmail && currentUser && currentUser.emailVerified) {
            // Determine the correct path to accounts.html based on current location
            const currentPath = window.location.pathname;
            let accountsPath = './accounts.html';
            
            // If we're in the root directory (index.html), adjust path
            if (currentPath === '/' || currentPath.includes('index.html') || !currentPath.includes('chandriahomepage')) {
                accountsPath = './chandriahomepage/accounts.html';
            }
            
            // Redirect to accounts page if user is logged in
            window.location.href = accountsPath;
        } else {
            // Show auth modal if user is not logged in
            authModal.show();
        }
    };
    window.hideAuthModal = () => authModal.hide();
    window.authModal = authModal;
});
