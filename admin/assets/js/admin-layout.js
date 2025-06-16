/**
 * UNIFIED ADMIN LAYOUT JAVASCRIPT
 * This file contains shared JavaScript functionality for all admin pages:
 * - Sidebar toggle functionality
 * - Active navigation highlighting
 * - Common UI interactions
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initAdminLayout();
});

/**
 * Initialize admin layout functionality
 */
function initAdminLayout() {
    initSidebarToggle();
    highlightActiveNavigation();
    initSearchFunctionality();
}

/**
 * Initialize sidebar toggle functionality
 */
function initSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.toggle');
    
    if (toggle && sidebar) {
        // Make sure the toggle is clickable and properly bound
        toggle.style.cursor = 'pointer';
        
        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any default behavior
            e.stopPropagation(); // Stop event propagation
            
            sidebar.classList.toggle('close');
            
            // Store sidebar state in localStorage
            const isClose = sidebar.classList.contains('close');
            localStorage.setItem('sidebarClosed', isClose);
            
            // Log for debugging
            console.log('Sidebar toggle clicked. Sidebar is now:', isClose ? 'closed' : 'open');
        });
        
        // Ensure toggle is visible and properly styled
        toggle.style.display = 'flex';
        
        // Restore sidebar state from localStorage
        const sidebarClosed = localStorage.getItem('sidebarClosed');
        if (sidebarClosed === 'true') {
            sidebar.classList.add('close');
        } else if (sidebarClosed === 'false') {
            sidebar.classList.remove('close');
        }
    } else {
        console.warn('Sidebar toggle elements not found in the DOM');
    }
}

/**
 * Highlight active navigation item based on current page
 */
function highlightActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.nav-link, .custom-nav-link');
    
    // First, preserve any existing active classes that are correctly set
    let hasExistingActive = false;
    navLinks.forEach(link => {
        if (link.classList.contains('active')) {
            const anchor = link.querySelector('a');
            if (anchor && anchor.getAttribute('href') === '#') {
                // This is likely the correct active page with href="#"
                hasExistingActive = true;
            }
        }
    });
    
    // If there's already a correctly set active class with href="#", don't override it
    if (hasExistingActive) {
        return;
    }
    
    // Otherwise, set active class based on href matching current page
    navLinks.forEach(link => {
        const anchor = link.querySelector('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            
            // Remove existing active classes
            link.classList.remove('active', 'custom-active');
            
            // Add active class to current page
            if (href === `./${currentPage}` || 
                (currentPage === 'dashboard.html' && href === '#') ||
                href === currentPage) {
                link.classList.add('active');
            }
        }
    });
}

/**
 * Initialize search functionality
 */
function initSearchFunctionality() {
    const searchInputs = document.querySelectorAll('.search-box input');
    
    searchInputs.forEach(input => {
        const clearIcon = input.parentElement.querySelector('.clear-icon, .bx-x');
        
        // Show/hide clear icon based on input value
        input.addEventListener('input', function() {
            if (clearIcon) {
                clearIcon.style.display = this.value ? 'block' : 'none';
            }
        });
        
        // Clear search on clear icon click
        if (clearIcon) {
            clearIcon.addEventListener('click', function() {
                input.value = '';
                input.focus();
                this.style.display = 'none';
                
                // Trigger input event to update any search functionality
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }
    });
}

/**
 * Show loading state for buttons
 * @param {HTMLElement} button - The button element
 * @param {string} loadingText - Optional loading text
 */
function showButtonLoading(button, loadingText = 'Loading...') {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> ${loadingText}`;
}

/**
 * Hide loading state for buttons
 * @param {HTMLElement} button - The button element
 */
function hideButtonLoading(button) {
    if (!button) return;
    
    button.disabled = false;
    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

/**
 * Show toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    // Check if Notyf is available
    if (typeof notyf !== 'undefined') {
        switch (type) {
            case 'success':
                notyf.success(message);
                break;
            case 'error':
                notyf.error(message);
                break;
            case 'warning':
                notyf.open({
                    type: 'warning',
                    message: message,
                    background: '#ffc107',
                    duration: 4000
                });
                break;
            default:
                notyf.open({
                    type: 'info',
                    message: message,
                    background: '#17a2b8',
                    duration: 4000
                });
        }
    } else {
        // Fallback to console if Notyf is not available
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Format date for display
 * @param {Date|string} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', formatOptions);
}

/**
 * Format currency for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: PHP)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'PHP') {
    if (currency === 'PHP') {
        return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Initialize modal functionality
 */
function initModalFunctionality() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close, [data-close]');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        // Close modal on close button click
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(modal);
            });
        });
        
        // Close modal on backdrop click
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                closeModal(modal);
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal(modal);
            }
        });
    });
}

/**
 * Open modal
 * @param {HTMLElement|string} modal - Modal element or selector
 */
function openModal(modal) {
    if (typeof modal === 'string') {
        modal = document.querySelector(modal);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus first input in modal
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Close modal
 * @param {HTMLElement|string} modal - Modal element or selector
 */
function closeModal(modal) {
    if (typeof modal === 'string') {
        modal = document.querySelector(modal);
    }
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Export functions for use in other scripts
window.AdminLayout = {
    showButtonLoading,
    hideButtonLoading,
    showToast,
    formatDate,
    formatCurrency,
    debounce,
    openModal,
    closeModal,
    initModalFunctionality
};

// Initialize modal functionality after DOM load
document.addEventListener('DOMContentLoaded', function() {
    initModalFunctionality();
});
