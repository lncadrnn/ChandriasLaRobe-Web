// Authentication Modal JavaScript
class AuthModal {    constructor() {
        this.modal = document.getElementById('auth-modal');
        this.signInForm = document.getElementById('signin-form');
        this.signUpForm = document.getElementById('signup-form');
        this.forgotPasswordForm = document.getElementById('forgot-form');
        this.currentForm = 'signin';
        
        // Initialize Notyf for notifications
        this.notyf = new Notyf({
            duration: 4000,
            position: {
                x: 'right',
                y: 'top',
            },
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
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {        // Modal open/close events
        const userAccountLink = document.getElementById('user-account-link');
        const closeBtn = document.querySelector('.auth-close');
        const modalOverlay = this.modal;

        if (userAccountLink) {
            userAccountLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }        // Form switching events
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
        });        // Form submission events
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

        // Social login events
        const googleBtn = document.getElementById('google-signin');
        const facebookBtn = document.getElementById('facebook-signin');

        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }

        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => this.handleFacebookSignIn());
        }

        // Password visibility toggles
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-password')) {
                this.togglePasswordVisibility(e.target);
            }
        });

        // Real-time validation
        this.setupFormValidation();

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
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
    }

    async handleSignIn(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!this.validateSignInForm(email, password)) {
            return;
        }

        this.showLoading(event.target);        try {
            // Simulate API call
            await this.simulateAuthRequest();
            
            this.notyf.success('Sign in successful! Welcome back.');
            setTimeout(() => {
                this.closeModal();
                // Redirect or update UI as needed
            }, 1500);

        } catch (error) {
            this.notyf.error('Invalid email or password. Please try again.');
        } finally {
            this.hideLoading(event.target);
        }
    }    async handleSignUp(event) {
        const formData = new FormData(event.target);
        const firstName = formData.get('firstname');
        const lastName = formData.get('lastname');
        const username = formData.get('username');
        const email = formData.get('email');
        const contact = formData.get('contact');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        if (!this.validateSignUpForm(firstName, lastName, username, email, contact, password, confirmPassword)) {
            return;
        }

        this.showLoading(event.target);        try {
            // Simulate API call
            await this.simulateAuthRequest();
            
            this.notyf.success('Account created successfully! Please check your email for verification.');
            setTimeout(() => {
                this.switchForm('signin');
            }, 2000);

        } catch (error) {
            this.notyf.error('Failed to create account. Please try again.');
        } finally {
            this.hideLoading(event.target);
        }
    }    async handleForgotPassword(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');

        if (!this.validateEmail(email)) {
            this.notyf.error('Please enter a valid email address.');
            return;
        }

        this.showLoading(event.target);

        try {
            // Simulate API call
            await this.simulateAuthRequest();
            
            this.notyf.success('Password reset link sent to your email.');
            setTimeout(() => {
                this.switchForm('signin');
            }, 2000);

        } catch (error) {
            this.notyf.error('Failed to send reset email. Please try again.');
        } finally {
            this.hideLoading(event.target);
        }
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
    }    validateSignUpForm(firstName, lastName, username, email, contact, password, confirmPassword) {
        let isValid = true;        

        if (!firstName || firstName.trim().length < 2) {
            this.notyf.error('First name must be at least 2 characters long.');
            isValid = false;
        }

        if (!lastName || lastName.trim().length < 2) {
            this.notyf.error('Last name must be at least 2 characters long.');
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
            this.notyf.error('Please enter a valid phone number.');
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
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }    setupFormValidation() {
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
    new AuthModal();
});
