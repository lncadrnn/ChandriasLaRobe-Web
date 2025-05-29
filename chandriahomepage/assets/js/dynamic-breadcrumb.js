/**
 * Dynamic Breadcrumb System
 * Automatically generates breadcrumbs based on current page and navigation history
 */

class DynamicBreadcrumb {
    constructor() {
        this.breadcrumbContainer = null;
        this.currentPath = window.location.pathname;        this.pageNames = {
            'index.html': 'Home',
            'shop.html': 'Shop',
            'details.html': 'Product Details',
            'cart.html': 'Cart',
            'checkout.html': 'Appointment',
            'wishlist.html': 'Favorites',
            'accounts.html': 'My Account',
            'user_authentication.html': 'Login'
        };
        this.init();
    }

    init() {
        this.breadcrumbContainer = document.querySelector('.breadcrumb-list');
        if (this.breadcrumbContainer) {
            this.generateBreadcrumb();
            this.setupNavigationTracking();
        }
    }

    generateBreadcrumb() {
        const breadcrumbItems = this.getBreadcrumbItems();
        this.renderBreadcrumb(breadcrumbItems);
    }    getBreadcrumbItems() {
        const items = [];
        const currentPage = this.getCurrentPageName();
        const navigationHistory = this.getNavigationHistory();

        // Always start with Home
        items.push({
            name: 'Home',
            url: this.getHomeUrl(),
            isActive: currentPage === 'Home'
        });

        // If we're on Home, just show Home
        if (currentPage === 'Home') {
            return items;
        }

        // If we're on Shop, just show Home > Shop (no history)
        if (currentPage === 'Shop') {
            items.push({
                name: 'Shop',
                url: null,
                isActive: true
            });
            return items;
        }

        // For other pages, build the breadcrumb trail from navigation history
        // Always include Shop in the path for non-home, non-shop pages
        if (!navigationHistory.includes('Shop')) {
            items.push({
                name: 'Shop',
                url: 'shop.html',
                isActive: false
            });
        }

        // Add pages from navigation history (excluding Home and current page)
        if (navigationHistory.length > 0) {
            navigationHistory.forEach(page => {
                if (page !== 'Home' && page !== currentPage) {
                    items.push({
                        name: page,
                        url: this.getPageUrl(page),
                        isActive: false
                    });
                }
            });
        }        // Add current page
        if (currentPage === 'Product Details') {
            const productName = this.getProductName();
            
            items.push({
                name: productName || 'Product Details',
                url: null,
                isActive: true
            });
        } else {
            items.push({
                name: currentPage,
                url: null,
                isActive: true
            });
        }

        return items;
    }

    getCurrentPageName() {
        const fileName = this.currentPath.split('/').pop() || 'index.html';
        return this.pageNames[fileName] || 'Page';
    }    getProductName() {
        // Try to get product name from URL parameters or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        // First try to get from current product in localStorage (set by details.js)
        const currentProductId = localStorage.getItem('selectedProductId');
        if (currentProductId) {
            const productName = localStorage.getItem(`product_${currentProductId}_name`);
            if (productName) return productName;
        }
        
        // Fallback: try with URL parameter ID
        if (productId) {
            const productName = localStorage.getItem(`product_${productId}_name`);
            if (productName) return productName;
        }

        // Fallback: try to get from page elements
        const titleElement = document.querySelector('#product-name, .product-title, h1');
        if (titleElement) {
            return titleElement.textContent.trim();
        }

        return null;
    }

    getProductCategory() {
        // Try to get product category from URL parameters or page
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId) {
            // If we have a product ID, try to get the category from localStorage
            const productCategory = localStorage.getItem(`product_${productId}_category`);
            if (productCategory) return productCategory;
        }

        // Fallback: try to get from page elements
        const categoryElement = document.querySelector('.product-category, [data-category]');
        if (categoryElement) {
            return categoryElement.textContent.trim();
        }

        return null;
    }

    getNavigationHistory() {
        const history = JSON.parse(localStorage.getItem('breadcrumb_history') || '[]');
        return history.slice(-3); // Keep only last 3 pages for clean breadcrumb
    }    updateNavigationHistory() {
        const currentPage = this.getCurrentPageName();
        let history = JSON.parse(localStorage.getItem('breadcrumb_history') || '[]');
        
        // Reset history if we're on the home page or shop page
        if (currentPage === 'Home' || currentPage === 'Shop') {
            localStorage.removeItem('breadcrumb_history');
            return;
        }
        
        // For other pages, build up the navigation trail
        // Remove current page if it already exists to avoid duplicates
        history = history.filter(page => page !== currentPage);
        
        // Add current page to history
        history.push(currentPage);
        
        // Keep only reasonable number of pages in breadcrumb trail
        if (history.length > 4) {
            history = history.slice(-4);
        }
        
        localStorage.setItem('breadcrumb_history', JSON.stringify(history));
    }

    getHomeUrl() {
        // Determine if we're in a subfolder
        const pathParts = this.currentPath.split('/');
        if (pathParts.includes('chandriahomepage')) {
            return '../index.html';
        }
        return 'index.html';
    }    getPageUrl(pageName) {
        const pageMap = {
            'Shop': 'shop.html',
            'Favorites': 'wishlist.html',
            'Cart': 'cart.html',
            'Appointment': 'checkout.html',
            'My Account': 'accounts.html',
            'Login': 'user_authentication.html'
        };
        return pageMap[pageName] || '#';
    }

    renderBreadcrumb(items) {
        if (!this.breadcrumbContainer) return;

        this.breadcrumbContainer.innerHTML = '';

        items.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'breadcrumb-item';

            if (item.url && !item.isActive) {
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'breadcrumb-link';
                link.textContent = item.name;
                
                // Add home icon to first item
                if (index === 0) {
                    const homeIcon = this.createHomeIcon();
                    link.insertBefore(homeIcon, link.firstChild);
                }
                
                listItem.appendChild(link);
            } else {
                const span = document.createElement('span');
                span.className = `breadcrumb-link ${item.isActive ? 'active' : ''}`;
                span.textContent = item.name;
                
                // Add home icon to first item
                if (index === 0) {
                    const homeIcon = this.createHomeIcon();
                    span.insertBefore(homeIcon, span.firstChild);
                }
                
                listItem.appendChild(span);
            }

            this.breadcrumbContainer.appendChild(listItem);

            // Add separator if not the last item
            if (index < items.length - 1) {
                const separator = document.createElement('li');
                separator.className = 'breadcrumb-separator';
                separator.setAttribute('aria-hidden', 'true');
                this.breadcrumbContainer.appendChild(separator);
            }
        });
    }

    createHomeIcon() {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'breadcrumb-home-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6');
        
        icon.appendChild(path);
        return icon;
    }    setupNavigationTracking() {
        // Update history when page loads
        this.updateNavigationHistory();

        // Track product views for better breadcrumb context
        this.trackProductViews();
        
        // Clear history when navigating to home
        this.setupHomeNavigation();
    }
      setupHomeNavigation() {
        // Listen for clicks on home and shop links to clear breadcrumb history
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (target) {
                const href = target.getAttribute('href');
                if (href && (
                    href.includes('index.html') || 
                    href === '../index.html' || 
                    href === '/' ||
                    href.includes('shop.html')
                )) {
                    localStorage.removeItem('breadcrumb_history');
                }
            }
        });
    }

    trackProductViews() {
        // Store product information when viewing details
        if (this.getCurrentPageName() === 'Product Details') {
            const productTitle = document.querySelector('.product-title, h1');
            if (productTitle) {
                const urlParams = new URLSearchParams(window.location.search);
                const productId = urlParams.get('id');
                if (productId) {
                    localStorage.setItem(`product_${productId}_name`, productTitle.textContent.trim());
                }
            }
        }
    }

    // Public method to manually update breadcrumb (useful for SPA-like navigation)
    refresh() {
        this.currentPath = window.location.pathname;
        this.generateBreadcrumb();
    }

    // Public method to add custom breadcrumb item
    addCustomItem(name, url = null) {
        const items = this.getBreadcrumbItems();
        // Insert before the last (active) item
        items.splice(-1, 0, {
            name: name,
            url: url,
            isActive: false
        });
        this.renderBreadcrumb(items);
    }
}

// Initialize breadcrumb system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dynamicBreadcrumb = new DynamicBreadcrumb();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicBreadcrumb;
}
