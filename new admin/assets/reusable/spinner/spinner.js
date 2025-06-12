// Page Loader JavaScript
class PageLoader {
    constructor(options = {}) {
        this.options = {
            minLoadTime: 800, // Minimum time to show loader (in ms)
            fadeOutDuration: 300, // Fade out animation duration
            loadingText: 'Loading Inventory',
            subtitle: 'Please wait while we prepare your content',
            ...options
        };
        
        this.startTime = Date.now();
        this.isHidden = false;
        
        this.init();
    }
    
    init() {
        // Create loader HTML if it doesn't exist
        if (!document.getElementById('pageLoader')) {
            this.createLoader();
        }
        
        // Show loader
        this.show();
        
        // Set up auto-hide when page is fully loaded
        this.setupAutoHide();
    }
    
    createLoader() {
        const loaderHTML = `
            <div id="pageLoader" class="page-loader">
                <div class="page-loader-content">
                    <div class="page-spinner"></div>
                    <div class="page-loader-text">${this.options.loadingText}<span class="loading-dots"></span></div>
                    <div class="page-loader-subtitle">${this.options.subtitle}</div>
                </div>
            </div>
        `;
        
        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    }
    
    show() {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('fade-out');
            this.isHidden = false;
        }
    }
    
    hide() {
        if (this.isHidden) return;
        
        const loader = document.getElementById('pageLoader');
        if (!loader) return;
        
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.options.minLoadTime - elapsedTime);
        
        setTimeout(() => {
            loader.classList.add('fade-out');
            this.isHidden = true;
            
            // Remove from DOM after fade out
            setTimeout(() => {
                if (loader && loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, this.options.fadeOutDuration);
        }, remainingTime);
    }
    
    setupAutoHide() {
        // Hide when DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.hide(), 200);
            });
        } else {
            // DOM already loaded
            setTimeout(() => this.hide(), 200);
        }
        
        // Fallback: hide after window load
        window.addEventListener('load', () => {
            setTimeout(() => this.hide(), 100);
        });
        
        // Emergency fallback: hide after maximum time
        setTimeout(() => {
            console.log('Emergency loader hide triggered');
            this.hide();
        }, 5000);
    }
    
    updateText(text, subtitle = null) {
        const textElement = document.querySelector('.page-loader-text');
        const subtitleElement = document.querySelector('.page-loader-subtitle');
        
        if (textElement) {
            // Remove dots span temporarily
            const dotsSpan = textElement.querySelector('.loading-dots');
            textElement.innerHTML = text;
            if (dotsSpan) {
                textElement.appendChild(dotsSpan);
            } else {
                textElement.innerHTML += '<span class="loading-dots"></span>';
            }
        }
        
        if (subtitle && subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
    }
}

// Initialize page loader immediately when script loads
const pageLoader = new PageLoader();

// Make it globally accessible
window.PageLoader = PageLoader;
window.pageLoader = pageLoader;

// Utility functions
window.showPageLoader = function(text = 'Loading', subtitle = 'Please wait...') {
    if (window.pageLoader) {
        window.pageLoader.updateText(text, subtitle);
        window.pageLoader.show();
    }
};

window.hidePageLoader = function() {
    if (window.pageLoader) {
        window.pageLoader.hide();
    }
};

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageLoader;
}
