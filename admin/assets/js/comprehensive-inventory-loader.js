// Comprehensive Inventory Loader with Advanced Features
import {
    chandriaDB,
    collection,
    getDocs,
    query,
    orderBy,
    where,
    deleteDoc,
    doc
} from "./sdk/chandrias-sdk.js";

// Enhanced product loader with filtering and sorting
class ComprehensiveInventoryLoader {
    constructor() {
        this.products = [];
        this.additionals = [];
        this.filters = {
            category: 'all',
            status: 'all',
            search: ''
        };
        this.sortBy = 'name';
        this.sortOrder = 'asc';
    }

    // Load all products with advanced options
    async loadProducts(options = {}) {
        console.log("🔄 Comprehensive loader - loading products with options:", options);
        
        try {
            const container = document.getElementById("products-container");
            if (!container) {
                console.error("Products container not found");
                return;
            }

            // Show loading state
            this.showLoadingState(container);

            // Build query
            let productsQuery = collection(chandriaDB, "products");
            
            // Add filters if specified
            if (options.category && options.category !== 'all') {
                productsQuery = query(productsQuery, where("category", "==", options.category));
            }
            
            // Add sorting
            if (options.sortBy) {
                const orderDirection = options.sortOrder === 'desc' ? 'desc' : 'asc';
                productsQuery = query(productsQuery, orderBy(options.sortBy, orderDirection));
            }

            // Execute query
            const querySnapshot = await getDocs(productsQuery);
            
            console.log(`📊 Loaded ${querySnapshot.size} products`);

            // Process results
            this.products = [];
            querySnapshot.forEach(doc => {
                this.products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Apply client-side filters
            const filteredProducts = this.applyFilters(this.products);

            // Render products
            this.renderProducts(container, filteredProducts);

            console.log("✅ Products loaded and rendered successfully");

        } catch (error) {
            console.error("❌ Error in comprehensive loader:", error);
            this.showErrorState(document.getElementById("products-container"), error);
        }
    }

    // Apply client-side filters
    applyFilters(products) {
        return products.filter(product => {
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const matchesSearch = 
                    (product.name || '').toLowerCase().includes(searchTerm) ||
                    (product.category || '').toLowerCase().includes(searchTerm) ||
                    (product.code || '').toLowerCase().includes(searchTerm);
                
                if (!matchesSearch) return false;
            }

            // Category filter
            if (this.filters.category !== 'all') {
                if (product.category !== this.filters.category) return false;
            }

            // Status filter
            if (this.filters.status !== 'all') {
                const totalStock = this.calculateTotalStock(product.size);
                const status = this.getStockStatus(totalStock);
                
                if (status !== this.filters.status) return false;
            }

            return true;
        });
    }

    // Calculate total stock from size object
    calculateTotalStock(sizes) {
        if (!sizes || typeof sizes !== 'object') return 0;
        return Object.values(sizes).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
    }

    // Get stock status
    getStockStatus(totalStock) {
        if (totalStock === 0) return 'out-of-stock';
        if (totalStock <= 2) return 'low-stock';
        return 'available';
    }

    // Show loading state
    showLoadingState(container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading inventory...</p>
            </div>
        `;
    }

    // Show error state
    showErrorState(container, error) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Failed to Load Inventory</h3>
                <p>Error: ${error.message}</p>
                <button onclick="window.ComprehensiveLoader.loadProducts()" class="retry-btn">
                    <i class="bx bx-refresh"></i> Retry
                </button>
            </div>
        `;
    }

    // Render products to container
    renderProducts(container, products) {
        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No Products Found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        products.forEach(product => {
            const card = this.createAdvancedProductCard(product);
            container.appendChild(card);
        });
    }

    // Create advanced product card with enhanced features
    createAdvancedProductCard(product) {
        const totalStock = this.calculateTotalStock(product.size);
        const statusClass = this.getStockStatus(totalStock);
        const statusText = this.getStatusText(statusClass);
        
        const card = document.createElement('article');
        card.className = 'card_article advanced-card';
        card.setAttribute('data-id', product.id);
        card.setAttribute('data-name', product.name || '');
        card.setAttribute('data-category', product.category || '');
        card.setAttribute('data-price', product.price || '');
        card.setAttribute('data-status', statusClass);        card.innerHTML = `
            <div class="card_img">
                <img src="${this.getImageUrl(product, 'front')}" 
                     alt="${product.name || 'Product'}" 
                     loading="lazy" />
                <div class="card_badge ${product.category?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}">
                    ${product.category || 'Unknown'}
                </div>
                <div class="card_status_badge ${statusClass}">${statusText}</div>
                <div class="card_actions">
                    <button class="card_action_btn view_btn" data-action="view" data-id="${product.id}" title="View Details">
                        <i class="bx bx-show"></i>
                    </button>
                    <button class="card_action_btn edit_btn" data-action="edit" data-id="${product.id}" title="Edit Product">
                        <i class="bx bx-edit"></i>
                    </button>
                    <button class="card_action_btn delete_btn" data-action="delete" data-id="${product.id}" title="Delete Product">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card_content" data-open="viewProductModal" data-id="${product.id}">
                <h3 class="card_title product-name">${product.name || 'Unnamed Product'}</h3>
                <div class="card_code">Code: ${product.code || 'N/A'}</div>
                <div class="card_price product-price">₱${parseFloat(product.price || 0).toLocaleString()}</div>
                <div class="card_color_section">
                    <div class="card_color" style="background-color: ${product.color || '#ccc'}"></div>
                    <span class="card_color_text">${this.getColorName(product.color)}</span>
                </div>
                <div class="card_stock_section">
                    <span class="card_stock_text">Stock:</span>
                    <span class="card_stock_count">${totalStock}</span>
                    <div class="card_stock_indicator ${statusClass}"></div>
                </div>
                <div class="card_sizes">
                    ${this.renderSizes(product.size)}
                </div>
                <div class="card_meta">
                    <small>Created: ${this.formatDate(product.createdAt)}</small>
                </div>
            </div>
        `;

        return card;
    }

    // Get image URL from product data
    getImageUrl(product, type = 'front') {
        // Try new structure first (using frontImageId/backImageId)
        if (type === 'front' && product.frontImageId) {
            return `https://res.cloudinary.com/dbtomr3fm/image/upload/${product.frontImageId}`;
        }
        if (type === 'back' && product.backImageId) {
            return `https://res.cloudinary.com/dbtomr3fm/image/upload/${product.backImageId}`;
        }
        
        // Try legacy structure (frontImageUrl/backImageUrl)
        if (type === 'front' && product.frontImageUrl) {
            return product.frontImageUrl;
        }
        if (type === 'back' && product.backImageUrl) {
            return product.backImageUrl;
        }
        
        // Try nested images structure
        if (product.images) {
            if (type === 'front' && product.images.front?.url) {
                return product.images.front.url;
            }
            if (type === 'back' && product.images.back?.url) {
                return product.images.back.url;
            }
        }
        
        // Fallback to generic imageUrl or placeholder
        return product.imageUrl || '/admin/assets/images/placeholder.jpg';
    }

    // Get status text
    getStatusText(statusClass) {
        const statusMap = {
            'available': 'In Stock',
            'low-stock': 'Low Stock',
            'out-of-stock': 'Out of Stock'
        };
        return statusMap[statusClass] || 'Unknown';
    }

    // Render sizes with stock info
    renderSizes(sizes) {
        if (!sizes || typeof sizes !== 'object') return '';
        
        return Object.entries(sizes)
            .filter(([size, stock]) => stock > 0)
            .map(([size, stock]) => `<span class="card_size" title="${stock} available">${size}</span>`)
            .join('');
    }

    // Get color name from hex
    getColorName(hex) {
        const colorMap = {
            '#ffffff': 'White', '#f8f8ff': 'White',
            '#000000': 'Black', '#2f2f2f': 'Black',
            '#ff0000': 'Red', '#dc143c': 'Red',
            '#0000ff': 'Blue', '#4169e1': 'Blue',
            '#008000': 'Green', '#32cd32': 'Green',
            '#ffff00': 'Yellow', '#ffd700': 'Yellow',
            '#ffa500': 'Orange', '#ff8c00': 'Orange',
            '#800080': 'Purple', '#9932cc': 'Purple',
            '#ffc0cb': 'Pink', '#ff69b4': 'Pink',
            '#a52a2a': 'Brown', '#8b4513': 'Brown',
            '#808080': 'Gray', '#a9a9a9': 'Gray',
            '#f5f5dc': 'Beige', '#f0e68c': 'Beige'
        };
        
        if (!hex) return 'Unknown';
        return colorMap[hex.toLowerCase()] || 'Custom';
    }

    // Format date
    formatDate(date) {
        if (!date) return 'Unknown';
        
        try {
            // Handle Firestore Timestamp
            if (date.toDate) {
                return date.toDate().toLocaleDateString();
            }
            // Handle regular Date
            if (date instanceof Date) {
                return date.toLocaleDateString();
            }
            // Handle string dates
            return new Date(date).toLocaleDateString();
        } catch (error) {
            return 'Invalid Date';
        }
    }

    // Set filters
    setFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        console.log("🔧 Filters updated:", this.filters);
    }

    // Set sorting
    setSorting(sortBy, sortOrder = 'asc') {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        console.log("🔧 Sorting updated:", { sortBy, sortOrder });
    }    // Refresh with current filters
    async refresh() {
        console.log("🔄 Refreshing with current filters and sorting...");
        await this.loadProducts({
            category: this.filters.category,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        });
    }

    // Delete product functionality
    async deleteProduct(productId) {
        try {
            console.log(`🗑️ Deleting product with ID: ${productId}`);
            
            // Show action spinner
            this.showActionSpinner('Deleting product...');
            
            // Delete from Firebase
            await deleteDoc(doc(chandriaDB, "products", productId));
            
            console.log(`✅ Product ${productId} deleted successfully from Firebase`);
            
            // Show success notification
            if (window.notyf) {
                window.notyf.success('Product deleted successfully!');
            }
            
            // Remove from local array
            this.products = this.products.filter(p => p.id !== productId);
            
            // Remove card from DOM
            const card = document.querySelector(`[data-id="${productId}"]`);
            if (card) {
                card.remove();
            }
            
            // Hide action spinner
            this.hideActionSpinner();
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error deleting product ${productId}:`, error);
            
            // Show error notification
            if (window.notyf) {
                window.notyf.error(`Failed to delete product: ${error.message}`);
            }
            
            // Hide action spinner
            this.hideActionSpinner();
            
            return false;
        }
    }

    // Show action spinner
    showActionSpinner(message = 'Processing...') {
        const spinner = document.querySelector('.admin-action-spinner');
        const text = document.querySelector('.admin-action-spinner .admin-spinner-text');
        
        if (spinner) {
            if (text) text.textContent = message;
            spinner.style.display = 'flex';
        }
    }

    // Hide action spinner
    hideActionSpinner() {
        const spinner = document.querySelector('.admin-action-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    // Confirm delete with centered modal
    confirmDelete(productId, productName) {
        // Create confirmation modal with perfect centering
        const modalHtml = `
            <div class="delete-confirmation-overlay" id="deleteConfirmationModal">
                <div class="delete-modal-container">
                    <div class="delete-modal-content">
                        <div class="delete-modal-header">
                            <h3>⚠️ Confirm Delete</h3>
                            <button class="delete-modal-close" type="button">&times;</button>
                        </div>
                        <div class="delete-modal-body">
                            <div class="delete-warning-content">
                                <p>Are you sure you want to delete</p>
                                <p class="delete-product-name">"${productName}"</p>
                                <p class="delete-warning-text">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div class="delete-modal-footer">
                            <button class="delete-btn-cancel" type="button">Cancel</button>
                            <button class="delete-btn-confirm" type="button" data-id="${productId}">Delete Product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('deleteConfirmationModal');
        const closeBtn = modal.querySelector('.delete-modal-close');
        const cancelBtn = modal.querySelector('.delete-btn-cancel');
        const confirmBtn = modal.querySelector('.delete-btn-confirm');
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Prevent body scroll and interaction
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';
        modal.style.pointerEvents = 'auto';
        
        // Close modal function
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
                document.body.style.pointerEvents = '';
            }, 300);
        };
        
        // Event listeners
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', async () => {
            const success = await this.deleteProduct(productId);
            if (success) {
                closeModal();
            }
        });
        
        // Close on overlay click (not modal content)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Prevent clicks on modal content from closing
        modal.querySelector('.delete-modal-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // ESC key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // Initialize event listeners for delete buttons
    initializeDeleteListeners() {
        // Use event delegation to handle dynamically created delete buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete_btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.target.closest('.delete_btn');
                const productId = button.getAttribute('data-id');
                const card = button.closest('.card_article');
                const productName = card ? card.getAttribute('data-name') : 'this product';
                
                console.log(`🗑️ Delete button clicked for product: ${productId}`);
                
                // Show confirmation modal
                this.confirmDelete(productId, productName);
            }
        });
    }
}

// Create global instance
const comprehensiveLoader = new ComprehensiveInventoryLoader();

// Export for global access
window.ComprehensiveLoader = comprehensiveLoader;

// Auto-initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Comprehensive inventory loader ready");
    
    // Initialize delete listeners
    comprehensiveLoader.initializeDeleteListeners();
    
    // Auto-load products
    comprehensiveLoader.loadProducts();
});