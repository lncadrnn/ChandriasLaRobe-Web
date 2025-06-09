// Enhanced About & Policy Page JavaScript
import {
    onAuthStateChanged,
    auth,
    chandriaDB,
    getDoc,
    doc
} from "./sdk/chandrias-sdk.js";

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize typewriter effects
    initializeTypewriterEffects();
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });    // Enhanced typewriter initialization with proper letter-by-letter typing
    function initializeTypewriterEffects() {
        const typewriterElements = document.querySelectorAll('.typewriter');
        
        typewriterElements.forEach((element, index) => {
            const text = element.textContent;
            element.textContent = '';
            
            // Get the primary color from CSS custom property
            const primaryColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary-color').trim() || 'hsl(346, 100%, 74%)';
            
            element.style.borderRight = `3px solid ${primaryColor}`;
            element.style.animation = 'blink-caret 0.75s step-end infinite';
            
            // Start typing with staggered delay
            setTimeout(() => {
                typeText(element, text, 80); // 80ms per character
            }, index * 2000); // 2 second delay between elements
        });
    }

    // Function to type text letter by letter
    function typeText(element, text, speed) {
        let i = 0;
        
        function typeCharacter() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typeCharacter, speed);
            } else {
                // Remove cursor after typing is complete
                setTimeout(() => {
                    element.style.borderRight = 'none';
                    element.style.animation = 'none';
                }, 1000); // Wait 1 second before removing cursor
            }
        }
        
        typeCharacter();
    }// Simple hover effects for service items
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            // Add a subtle glow effect
            const icon = this.querySelector('h3 i');
            if (icon) {
                icon.style.textShadow = '0 0 10px rgba(255, 133, 177, 0.5)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            const icon = this.querySelector('h3 i');
            if (icon) {
                icon.style.textShadow = 'none';
            }
        });
    });

    // Enhanced hover effects for contact items
    const contactItems = document.querySelectorAll('.contact-item-policy');
    contactItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 8px 25px rgba(255, 133, 177, 0.2)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });

    // Add click animation to policy sections
    const policySections = document.querySelectorAll('.policy-section');
    policySections.forEach(section => {
        section.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Add icon animation triggers
    const icons = document.querySelectorAll('.policy-section-title i, .service-item h3 i');
    icons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.animationPlayState = 'paused';
        });
        
        icon.addEventListener('mouseleave', function() {
            this.style.animationPlayState = 'running';
        });
    });    // Enhanced accessibility features
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid hsl(346, 100%, 74%)';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = '';
            this.style.outlineOffset = '';
        });
    });

    // Cart count function
    async function updateCartCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#cart-count").text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                const totalCount = cartItems.reduce(
                    (sum, item) => sum + (parseInt(item.quantity, 10) || 0),
                    0
                );
                $("#cart-count").text(totalCount);
            } else {
                $("#cart-count").text("0");
            }
        } catch (error) {
            console.error("Error fetching cart count:", error);
            $("#cart-count").text("0");
        }
    }

    // Wishlist count function
    async function updateWishlistCount() {
        const user = auth.currentUser;

        if (!user) {
            $("#wishlist-count").text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                const wishlistItems = data.added_to_wishlist || [];
                $("#wishlist-count").text(wishlistItems.length);
            } else {
                $("#wishlist-count").text("0");
            }
        } catch (error) {
            console.error("Error fetching wishlist count:", error);
            $("#wishlist-count").text("0");
        }
    }

    // Handle authentication state changes
    onAuthStateChanged(auth, async function (user) {
        console.log("About-policy.js onAuthStateChanged - User:", user ? user.uid : "No user");
        
        try {
            await updateCartCount();
            await updateWishlistCount();
            
            if (user) {
                // User is signed in
                console.log("About-policy.js - User signed in:", user.uid);
            } else {
                // User is signed out
                console.log("About-policy.js - User signed out");
            }
        } catch (error) {
            console.error("About-policy.js - Error during auth state change:", error);
        }
    });
});
