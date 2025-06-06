// Enhanced About & Policy Page JavaScript
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
    });

    // Enhanced typewriter initialization
    function initializeTypewriterEffects() {
        // Handle typewriter elements with CSS animations
        const typewriterElements = document.querySelectorAll('.typewriter');
        
        typewriterElements.forEach((element, index) => {
            // Add staggered delay for multiple typewriter elements
            element.style.animationDelay = `${index * 4}s`;
        });
    }    // Simple hover effects for service items
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
    });

    // Enhanced accessibility features
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
});
