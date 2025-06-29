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
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
} from "./sdk/chandrias-sdk.js";

class AuthModal {
    constructor() {
        console.log('AuthModal constructor called');
        
        this.modal = document.getElementById('auth-modal');
        this.signInForm = document.getElementById('signin-form');
        this.signUpForm = document.getElementById('signup-form');
        this.forgotPasswordForm = document.getElementById('forgot-form');
        this.currentForm = 'signin';
        this.isLoggingIn = false;

        console.log('Modal elements found:', {
            modal: !!this.modal,
            signInForm: !!this.signInForm,
            signUpForm: !!this.signUpForm,
            forgotPasswordForm: !!this.forgotPasswordForm
        });

        // Initialize Notyf for notifications with enhanced z-index
        this.notyf = window.createHighZIndexNotyf ? window.createHighZIndexNotyf({
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
        }) : new Notyf({
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
        
        // Fallback z-index setup if utility not available
        if (!window.createHighZIndexNotyf) {
            setTimeout(() => {
                const notyfContainer = document.querySelector('.notyf');
                if (notyfContainer) {
                    notyfContainer.style.zIndex = '99999';
                    notyfContainer.style.position = 'fixed';
                }
                
                const notyfToasts = document.querySelectorAll('.notyf__toast');
                notyfToasts.forEach(toast => {
                    toast.style.zIndex = '99999';
                });
            }, 100);
        }
        
        console.log('Initializing event listeners...');
        this.initializeEventListeners();
        this.setupPasswordToggles();
        this.setupAuthStateListener();
        console.log('AuthModal constructor completed');
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

        console.log('Form elements found:', {
            signInFormElement: !!signInFormElement,
            signUpFormElement: !!signUpFormElement,
            forgotFormElement: !!forgotFormElement
        });

        if (signInFormElement) {
            signInFormElement.addEventListener('submit', (e) => {
                console.log('Sign in form submit event triggered');
                e.preventDefault();
                this.handleSignIn(e);
            });
        }

        if (signUpFormElement) {
            signUpFormElement.addEventListener('submit', (e) => {
                console.log('Sign up form submit event triggered');
                e.preventDefault();
                this.handleSignUp(e);
            });
        }        if (forgotFormElement) {
            forgotFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(e);
            });
        }        // Social authentication event listeners
        const googleSignInBtns = document.querySelectorAll('.google-btn');

        googleSignInBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGoogleSignIn();
            });
        });

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
                // Check if user exists in adminAccounts
                const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    // User is admin - admin login has already been handled in handleSignIn/handleGoogleSignIn
                    // Just reset the flag, don't sign out or update UI here
                    this.isLoggingIn = false;
                    return;
                }

                // Update UI for regular authenticated user
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
        
        // Get all forms and remove active class
        [this.signInForm, this.signUpForm, this.forgotPasswordForm].forEach(form => {
            if (form) {
                form.classList.remove('active');
                form.style.display = 'none';
            }
        });

        // Update form section for spacing
        const formSection = document.querySelector('.auth-form-section');
        if (formSection) {
            formSection.classList.remove('signup-active', 'signin-active', 'forgot-active');
        }

        // Show selected form
        let targetForm;
        switch (formType) {
            case 'signup':
                targetForm = this.signUpForm;
                if (formSection) formSection.classList.add('signup-active');
                break;
            case 'forgot':
                targetForm = this.forgotPasswordForm;
                if (formSection) formSection.classList.add('forgot-active');
                break;
            default:
                targetForm = this.signInForm;
                if (formSection) formSection.classList.add('signin-active');
        }

        // Show the target form
        if (targetForm) {
            targetForm.style.display = 'flex';
            // Small delay to ensure display: flex is applied before adding active class
            setTimeout(() => {
                targetForm.classList.add('active');
            }, 10);
        }

        this.currentForm = formType;

        // Focus on first input after form is visible
        setTimeout(() => {
            const firstInput = targetForm?.querySelector('input[type="email"], input[type="text"]');
            if (firstInput) {
                firstInput.focus();
            }
        }, 50);
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

        console.log('Sign in form submitted:', { email, password: '***' });

        if (!this.validateSignInForm(email, password)) {
            console.log('Sign in validation failed');
            return;
        }

        this.isLoggingIn = true;
        this.showLoading(event.target);

        try {
            console.log('Checking if email exists in database...');
            
            // Check if email exists in adminAccounts collection first
            const adminEmailQuery = await getDocs(
                query(
                    collection(chandriaDB, "adminAccounts"),
                    where("email", "==", email)
                )
            );

            // Check if email exists in userAccounts collection
            const userEmailQuery = await getDocs(
                query(
                    collection(chandriaDB, "userAccounts"),
                    where("email", "==", email)
                )
            );

            // Determine account type
            let isAdmin = !adminEmailQuery.empty;
            let isUser = !userEmailQuery.empty;

            console.log('Email check results:', { isAdmin, isUser });

            // If email doesn't exist in either collection, show error
            if (!isAdmin && !isUser) {
                this.notyf.error("Email is not registered. Please sign up first.");
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            console.log('Attempting to sign in with Firebase Auth...');
            
            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            console.log('Firebase Auth sign in successful');

            // Check if verified (only for non-admin users)
            const user = userCredential.user;
            if (!user.emailVerified && !isAdmin) {
                console.log('User email not verified, signing out...');
                // Sign out the unverified user
                await signOut(auth);
                this.notyf.error("Please verify your email before logging in.");
                this.isLoggingIn = false;
                this.hideLoading(event.target);
                return;
            }

            // Handle redirect based on account type
            if (isAdmin) {
                console.log('Admin login successful, redirecting...');
                this.notyf.success("Admin login successful! Redirecting to admin panel...");
                
                // Close modal and redirect to admin panel
                this.closeModal();
                
                setTimeout(() => {
                    // Determine the correct path to admin panel based on current location
                    const currentPath = window.location.pathname;
                    let adminPath = '/admin/dashboard.html';
                    
                    // If we're in the chandriahomepage folder, adjust path
                    if (currentPath.includes('chandriahomepage')) {
                        adminPath = '../admin/dashboard.html';
                    }
                    
                    window.location.href = adminPath;
                }, 1500);
                
            } else {
                console.log('User login successful');
                // Regular user login - show success notification
                this.notyf.success("Login successful! Welcome back.");
                
                // Force notification z-index to appear above modal
                if (window.forceNotificationZIndex) {
                    window.forceNotificationZIndex();
                }
                
                // Close modal first
                this.closeModal();
                
                // The auth state listener will handle UI updates for users
                // Add a small delay before page reload to ensure user sees the notification
                setTimeout(() => {
                    if (typeof location !== 'undefined' && location.reload) {
                        location.reload();
                    }
                }, 1500);
            }
            
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
        const email = formData.get('email');
        const contact = formData.get('contact');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        console.log('Sign up form submitted:', { fullname, email, contact, password: '***', confirmPassword: '***' });

        if (!this.validateSignUpForm(fullname, email, contact, password, confirmPassword)) {
            console.log('Validation failed');
            return;
        }

        this.isLoggingIn = true;
        this.showLoading(event.target);

        try {
            console.log('Creating user with Firebase Auth...');
            
            // Firebase Auth sign-up
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('User created successfully:', userCredential.user.uid);
            
            await getAuth().signOut(); // Sign out immediately after registration
            await sendEmailVerification(userCredential.user);
            await updateProfile(userCredential.user, { displayName: fullname });

            // Form data
            const userData = {
                fullname,
                contact,
                email,
                role: "user",
                createdAt: new Date(),
                added_to_cart: [],
                added_to_wishlist: []
            };

            console.log('Saving user data to Firestore...');
            
            // Save user info to Firestore
            await setDoc(
                doc(chandriaDB, "userAccounts", userCredential.user.uid),
                userData
            );

            console.log('User data saved successfully');

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
    }    async emailExistsInFirestore(email) {
        // Check both userAccounts and adminAccounts collections
        const usersRef = collection(chandriaDB, "userAccounts");
        const adminsRef = collection(chandriaDB, "adminAccounts");
        
        const [usersSnapshot, adminsSnapshot] = await Promise.all([
            getDocs(usersRef),
            getDocs(adminsRef)
        ]);
        
        const userExists = usersSnapshot.docs.some(doc => doc.data().email === email);
        const adminExists = adminsSnapshot.docs.some(doc => doc.data().email === email);
        
        return userExists || adminExists;
    }formatErrorMessage(errorCode) {
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
    }    async handleGoogleSignIn() {
        try {
            this.isLoggingIn = true;
            const provider = new GoogleAuthProvider();
            
            // Optional: Add additional scopes
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Check if user exists in adminAccounts collection
            const adminDocRef = doc(chandriaDB, "adminAccounts", user.uid);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists()) {
                // Admin user - handle admin login
                this.notyf.success("Admin Google sign-in successful! Redirecting to admin panel...");
                
                // Force notification z-index to appear above modal
                if (window.forceNotificationZIndex) {
                    window.forceNotificationZIndex();
                }
                
                // Close modal and redirect to admin panel
                this.closeModal();
                
                setTimeout(() => {
                    // Determine the correct path to admin panel based on current location
                    const currentPath = window.location.pathname;
                    let adminPath = '/admin/dashboard.html';
                    
                    // If we're in the chandriahomepage folder, adjust path
                    if (currentPath.includes('chandriahomepage')) {
                        adminPath = '../admin/dashboard.html';
                    }
                    
                    window.location.href = adminPath;
                }, 1500);
                
                return;
            }
            
            // Check if user account exists in userAccounts collection
            const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {// Create new user account in Firestore
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    fullname: user.displayName || '',
                    contact: user.phoneNumber || '',
                    emailVerified: user.emailVerified,
                    provider: 'google',
                    role: "user",
                    createdAt: new Date().toISOString(),
                    added_to_cart: [],
                    added_to_wishlist: []
                };
                
                await setDoc(userDocRef, userData);
            }
            
            this.notyf.success('Google sign in successful!');
            
            // Force notification z-index to appear above modal
            if (window.forceNotificationZIndex) {
                window.forceNotificationZIndex();
            }
            // The auth state listener will handle UI updates and modal closing

        } catch (error) {
            console.error("Google sign in error:", error.code, error.message);
            this.isLoggingIn = false;
            
            if (error.code === 'auth/popup-closed-by-user') {
                this.notyf.info('Sign in cancelled by user.');
            } else if (error.code === 'auth/popup-blocked') {
                this.notyf.error('Popup blocked. Please allow popups for this site.');        } else {
                this.notyf.error('Google sign in failed. Please try again.');
            }
        }
    }

    validateSignInForm(email, password) {
        let isValid = true;

        console.log('Validating sign in form:', { email, password: '***' });

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            isValid = false;
        }

        if (!password || password.length < 6) {
            this.notyf.error('Password must be at least 6 characters long.');
            isValid = false;
        }

        console.log('Sign in validation result:', isValid);
        return isValid;
    }    validateSignUpForm(fullname, email, contact, password, confirmPassword) {
        let isValid = true;
        
        console.log('Validating sign up form:', { 
            fullname, 
            email, 
            contact, 
            password: '***', 
            confirmPassword: '***' 
        });

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

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            isValid = false;
        }

        if (!this.validatePhone(contact)) {
            this.notyf.error('Contact number must start with "09" and be exactly 11 digits.');
            isValid = false;
        }

        if (!this.validatePasswordRequirements(password)) {
            isValid = false;
        }

        if (password !== confirmPassword) {
            this.notyf.error('Passwords do not match.');
            isValid = false;
        }

        console.log('Sign up validation result:', isValid);
        return isValid;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        console.log('Validating phone:', phone);
        const contactPattern = /^09\d{9}$/;
        const isValid = contactPattern.test(phone);
        console.log('Phone validation result:', isValid);
        return isValid;
    }

    validatePasswordRequirements(password) {
        if (!password || password.length < 6) {
            this.notyf.error('Password must be at least 6 characters long.');
            return false;
        }

        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        let missingRequirements = [];
        if (!hasUppercase) missingRequirements.push('uppercase letter');
        if (!hasLowercase) missingRequirements.push('lowercase letter');
        if (!hasNumber) missingRequirements.push('number');
        if (!hasSpecialChar) missingRequirements.push('special character');

        if (missingRequirements.length > 0) {
            const message = `Password must contain at least one: ${missingRequirements.join(', ')}.`;
            this.notyf.error(message);
            return false;
        }

        return true;
    }    setupFormValidation() {
        // Only visual error clearing, no validation on blur
        const inputs = this.modal.querySelectorAll('input');
        inputs.forEach(input => {
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
    }    showLoading(element) {
        const button = element.querySelector('button[type="submit"]') || element;
        button.disabled = true;
        
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        
        // Check button type and use appropriate loading text
        if (button.textContent.includes('Sign In') || button.id === 'signin-submit') {
            button.textContent = 'Signing in...';
        } else if (button.textContent.includes('Sign Up') || button.textContent.includes('Create Account')) {
            button.textContent = 'Signing Up...';
        } else if (button.textContent.includes('Send Reset Link') || button.textContent.includes('Reset Password')) {
            button.textContent = 'Sending Reset Link...';
        } else if (button.id === 'google-signin' || button.classList.contains('google-btn')) {
            // For Google button, remove spinner
            button.textContent = 'Google';
        } else if (button.id === 'facebook-signin' || button.classList.contains('facebook-btn')) {
            // For Facebook button, remove spinner  
            button.textContent = 'Facebook';
        } else {
            button.innerHTML = '<i class="fi fi-rs-spinner"></i> Loading...';
        }
        
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
    }    togglePasswordVisibility(toggleButton) {
        // Find the password field in the same wrapper
        const passwordField = toggleButton.parentNode.querySelector('input[type="password"], input[type="text"]');
        const icon = toggleButton.querySelector('i');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.className = 'fi fi-rs-eye-crossed';
        } else {
            passwordField.type = 'password';
            icon.className = 'fi fi-rs-eye';
        }
    }setupPasswordToggles() {
        // Add password toggle functionality for all password fields
        const passwordFields = this.modal.querySelectorAll('input[type="password"]');
        
        passwordFields.forEach(field => {
            // Create toggle button if it doesn't exist
            const toggleExists = field.parentNode.querySelector('.password-toggle');
            if (!toggleExists) {
                // Create a wrapper div for the input and toggle
                const wrapper = document.createElement('div');
                wrapper.className = 'password-input-wrapper';
                wrapper.style.position = 'relative';
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                
                // Insert wrapper before input
                field.parentNode.insertBefore(wrapper, field);
                
                // Move input into wrapper
                wrapper.appendChild(field);
                
                // Create toggle button
                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'password-toggle';
                toggleBtn.innerHTML = '<i class="fi fi-rs-eye"></i>';
                toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
                
                // Append toggle to wrapper
                wrapper.appendChild(toggleBtn);
                
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
    console.log('Auth modal initializing...');
    const authModal = new AuthModal();
    console.log('Auth modal initialized successfully');
    
    // Make functions globally accessible
    window.showAuthModal = () => {
        console.log('showAuthModal called');
        // Check if user is already logged in
        const userEmail = localStorage.getItem('userEmail');
        const currentUser = auth.currentUser;
        
        console.log('User check:', { userEmail, currentUser: currentUser?.email, emailVerified: currentUser?.emailVerified });
        
        if (userEmail && currentUser && currentUser.emailVerified) {
            // Determine the correct path to accounts.html based on current location
            const currentPath = window.location.pathname;
            let accountsPath = './accounts.html';
            
            // If we're in the root directory (index.html), adjust path
            if (currentPath === '/' || currentPath.includes('index.html') || !currentPath.includes('chandriahomepage')) {
                accountsPath = './chandriahomepage/accounts.html';
            }
            
            console.log('Redirecting to accounts page:', accountsPath);
            // Redirect to accounts page if user is logged in
            window.location.href = accountsPath;
        } else {
            console.log('Showing auth modal');
            // Show auth modal if user is not logged in
            authModal.show();
        }
    };
    
    window.hideAuthModal = () => {
        console.log('hideAuthModal called');
        authModal.hide();
    };
    
    window.authModal = authModal;
    
    console.log('Global auth functions set up');
});
