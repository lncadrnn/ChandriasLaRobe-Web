/**
 * Admin Spinners JavaScript Utility
 * Provides consistent spinner functionality across all admin pages
 */

class AdminSpinners {
    constructor() {
        this.pageLoader = null;
        this.actionSpinner = null;
        this.init();
    }

    init() {
        // Initialize spinners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createSpinners());
        } else {
            this.createSpinners();
        }
    }

    createSpinners() {
        this.createPageLoader();
        this.createActionSpinner();
    }

    createPageLoader() {
        // Create page loader if it doesn't exist
        if (!document.querySelector('.admin-page-loader')) {
            const loader = document.createElement('div');
            loader.className = 'admin-page-loader';
            loader.innerHTML = `
                <div class="admin-spinner-with-text">
                    <div class="admin-page-spinner"></div>
                    <div class="admin-spinner-text">Loading...</div>
                </div>
            `;
            document.body.appendChild(loader);
            this.pageLoader = loader;
        } else {
            this.pageLoader = document.querySelector('.admin-page-loader');
        }
    }

    createActionSpinner() {
        // Create action spinner if it doesn't exist
        if (!document.querySelector('.admin-action-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'admin-action-spinner';
            spinner.innerHTML = `
                <div class="admin-spinner-with-text">
                    <div class="admin-spinner"></div>
                    <div class="admin-spinner-text">Processing...</div>
                </div>
            `;
            document.body.appendChild(spinner);
            this.actionSpinner = spinner;
        } else {
            this.actionSpinner = document.querySelector('.admin-action-spinner');
        }
    }

    // Page loader methods
    showPageLoader(text = 'Loading...') {
        if (this.pageLoader) {
            const textElement = this.pageLoader.querySelector('.admin-spinner-text');
            if (textElement) {
                textElement.textContent = text;
            }
            this.pageLoader.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hidePageLoader() {
        if (this.pageLoader) {
            this.pageLoader.classList.add('hidden');
            document.body.style.overflow = '';
            
            // Remove from DOM after transition
            setTimeout(() => {
                if (this.pageLoader && this.pageLoader.classList.contains('hidden')) {
                    this.pageLoader.style.display = 'none';
                }
            }, 500);
        }
    }

    // Action spinner methods
    showActionSpinner(text = 'Processing...') {
        if (this.actionSpinner) {
            const textElement = this.actionSpinner.querySelector('.admin-spinner-text');
            if (textElement) {
                textElement.textContent = text;
            }
            this.actionSpinner.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideActionSpinner() {
        if (this.actionSpinner) {
            this.actionSpinner.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Button spinner methods
    showButtonSpinner(button, text = null) {
        if (!button) return;

        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.disabled = true;
        button.classList.add('admin-loading');

        const spinner = document.createElement('span');
        spinner.className = 'admin-btn-spinner';
        
        button.innerHTML = '';
        button.appendChild(spinner);
        if (text) {
            button.appendChild(document.createTextNode(text));
        } else {
            button.appendChild(document.createTextNode('Loading...'));
        }
    }

    hideButtonSpinner(button) {
        if (!button) return;

        const originalText = button.dataset.originalText;
        button.disabled = false;
        button.classList.remove('admin-loading');
        button.textContent = originalText || 'Submit';
        delete button.dataset.originalText;
    }

    // Section loading methods
    showSectionLoading(element) {
        if (element) {
            element.classList.add('admin-section-loading');
        }
    }

    hideSectionLoading(element) {
        if (element) {
            element.classList.remove('admin-section-loading');
        }
    }

    // Table loading methods
    showTableLoading(tableId) {
        const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (tbody) {
            const colCount = table.querySelector('thead tr')?.children.length || 1;
            const loadingRow = document.createElement('tr');
            loadingRow.className = 'admin-table-loading-row';
            loadingRow.innerHTML = `
                <td colspan="${colCount}" style="text-align: center; padding: 20px;">
                    <div class="admin-spinner-with-text">
                        <div class="admin-table-spinner"></div>
                        <div class="admin-spinner-text">Loading data...</div>
                    </div>
                </td>
            `;
            tbody.appendChild(loadingRow);
        }
    }

    hideTableLoading(tableId) {
        const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
        if (!table) return;

        const loadingRow = table.querySelector('.admin-table-loading-row');
        if (loadingRow) {
            loadingRow.remove();
        }
    }

    // Card loading methods
    showCardLoading(cardElement, text = 'Loading...') {
        if (!cardElement) return;

        const overlay = document.createElement('div');
        overlay.className = 'admin-card-loading-overlay';        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
        `;
        overlay.innerHTML = `
            <div class="admin-spinner-with-text">
                <div class="admin-card-spinner"></div>
                <div class="admin-spinner-text">${text}</div>
            </div>
        `;

        cardElement.style.position = 'relative';
        cardElement.appendChild(overlay);
    }

    hideCardLoading(cardElement) {
        if (!cardElement) return;

        const overlay = cardElement.querySelector('.admin-card-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Form submission helper
    async handleFormSubmission(form, submitCallback, options = {}) {
        if (!form || !submitCallback) return;

        const submitButton = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn');
        const {
            loadingText = 'Processing...',
            successText = 'Success!',
            errorText = 'Error occurred',
            showPageSpinner = false,
            showActionSpinner = true
        } = options;

        try {
            // Show appropriate spinner
            if (showPageSpinner) {
                this.showPageLoader(loadingText);
            } else if (showActionSpinner) {
                this.showActionSpinner(loadingText);
            } else if (submitButton) {
                this.showButtonSpinner(submitButton, loadingText);
            }

            // Execute the callback
            const result = await submitCallback();

            // Hide spinners
            if (showPageSpinner) {
                this.hidePageLoader();
            } else if (showActionSpinner) {
                this.hideActionSpinner();
            } else if (submitButton) {
                this.hideButtonSpinner(submitButton);
            }

            return result;

        } catch (error) {
            // Hide spinners on error
            if (showPageSpinner) {
                this.hidePageLoader();
            } else if (showActionSpinner) {
                this.hideActionSpinner();
            } else if (submitButton) {
                this.hideButtonSpinner(submitButton);
            }

            console.error('Form submission error:', error);
            throw error;
        }
    }

    // AJAX request helper with spinner
    async request(url, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            showSpinner = true,
            spinnerText = 'Loading...',
            spinnerType = 'action' // 'page', 'action', 'none'
        } = options;

        try {
            if (showSpinner && spinnerType === 'page') {
                this.showPageLoader(spinnerText);
            } else if (showSpinner && spinnerType === 'action') {
                this.showActionSpinner(spinnerText);
            }

            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data && method !== 'GET') {
                fetchOptions.body = JSON.stringify(data);
            }

            const response = await fetch(url, fetchOptions);
            const result = await response.json();

            if (showSpinner && spinnerType === 'page') {
                this.hidePageLoader();
            } else if (showSpinner && spinnerType === 'action') {
                this.hideActionSpinner();
            }

            return result;

        } catch (error) {
            if (showSpinner && spinnerType === 'page') {
                this.hidePageLoader();
            } else if (showSpinner && spinnerType === 'action') {
                this.hideActionSpinner();
            }

            console.error('Request error:', error);
            throw error;
        }
    }

    // Utility method to hide all spinners
    hideAllSpinners() {
        this.hidePageLoader();
        this.hideActionSpinner();
        
        // Hide all button spinners
        document.querySelectorAll('.admin-loading').forEach(button => {
            this.hideButtonSpinner(button);
        });

        // Hide all section loading
        document.querySelectorAll('.admin-section-loading').forEach(section => {
            this.hideSectionLoading(section);
        });

        // Hide all card loading overlays
        document.querySelectorAll('.admin-card-loading-overlay').forEach(overlay => {
            overlay.remove();
        });
    }
}

// Create global instance
window.adminSpinners = new AdminSpinners();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSpinners;
}

// Auto-hide page loader when page is fully loaded
window.addEventListener('load', () => {
    // Small delay to ensure smooth transition
    setTimeout(() => {
        if (window.adminSpinners) {
            window.adminSpinners.hidePageLoader();
        }
    }, 500);
});

// Hide spinners on page unload to prevent issues
window.addEventListener('beforeunload', () => {
    if (window.adminSpinners) {
        window.adminSpinners.hideAllSpinners();
    }
});
