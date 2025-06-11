// Inventory Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeInventory();
});

// Toggle stock input visibility based on size checkbox selection
function toggleStockInput(checkbox) {
    const label = checkbox.closest('.checkbox-label');
    const stockInput = label.querySelector('.stock-input');
    
    if (checkbox.checked) {
        stockInput.style.display = 'block';
        stockInput.focus();
        // Set default stock value if empty
        if (!stockInput.value) {
            stockInput.value = 1;
        }
    } else {
        stockInput.style.display = 'none';
        stockInput.value = '';
    }
}

// Format sizes display for product cards
function formatSizesDisplay(sizes) {
    if (!sizes) return 'N/A';
    
    // Handle new object format {size: stock}
    if (typeof sizes === 'object' && !Array.isArray(sizes)) {
        return Object.entries(sizes)
            .map(([size, stock]) => `${size} (${stock})`)
            .join(', ');
    }
    
    // Handle legacy array format
    if (Array.isArray(sizes)) {
        return sizes.join(', ');
    }
    
    // Handle string format
    return sizes.toString();
}

// Sample data
const sampleProducts = [
    {
        id: 1,
        name: "Elegant Wedding Gown",
        category: "wedding-gown",
        sizes: { "S": 2, "M": 3, "L": 1 },
        sleeves: "Off Shoulder",
        color: "Ivory",
        colorHex: "#F8F6F0",
        rentalPrice: 15000,
        status: "available",
        description: "Beautiful off-shoulder wedding gown with intricate lace details and cathedral train.",
        image: "placeholder-wedding-gown.jpg"
    }
];

const sampleAdditionals = [
    {
        id: 1,
        name: "Pearl Necklace Set",
        type: "jewelry",
        size: "One Size",
        color: "White",
        colorHex: "#FFFFFF",
        rentalPrice: 2000,
        status: "available",
        description: "Elegant pearl necklace and earring set.",
        image: "placeholder-jewelry.jpg"
    },
    {
        id: 2,
        name: "Bridal Heels",
        type: "shoes",
        size: "7",
        color: "Nude",
        colorHex: "#E8C5A0",
        rentalPrice: 1500,
        status: "available",
        description: "Comfortable bridal heels with satin finish.",
        image: "placeholder-shoes.jpg"
    },
    {
        id: 3,
        name: "Cathedral Veil",
        type: "veils",
        size: "One Size",
        color: "Ivory",
        colorHex: "#F8F6F0",
        rentalPrice: 3000,
        status: "rented",
        description: "Long cathedral veil with delicate lace trim.",
        image: "placeholder-veil.jpg"
    },
    {
        id: 4,
        name: "Crystal Tiara",
        type: "headpieces",
        size: "One Size",
        color: "Silver",
        colorHex: "#C0C0C0",
        rentalPrice: 2500,
        status: "available",
        description: "Sparkling crystal tiara for the perfect bridal look.",
        image: "placeholder-tiara.jpg"
    },
    {
        id: 5,
        name: "Evening Clutch",
        type: "bags",
        size: "Small",
        color: "Gold",
        colorHex: "#FFD700",
        rentalPrice: 800,
        status: "available",
        description: "Elegant beaded evening clutch bag.",
        image: "placeholder-bag.jpg"
    }
];

// Global variables for image cropping
let currentCropper = null;
let currentImageType = null;
let frontImageData = null;
let backImageData = null;

// Firebase integration variables
let firebaseProducts = [];
let firebaseAdditionals = [];
let isFirebaseConnected = false;

/**
 * Firebase Integration Functions
 */

// Update inventory data from Firebase
window.updateInventoryData = function(products, additionals) {
    try {
        console.log('Updating inventory data from Firebase...');
        console.log('Products received:', products.length);
        console.log('Additionals received:', additionals.length);
        
        // Update global variables
        firebaseProducts = products || [];
        firebaseAdditionals = additionals || [];
        isFirebaseConnected = true;
        
        // Replace sample data with Firebase data
        sampleProducts.length = 0; // Clear existing data
        sampleAdditionals.length = 0; // Clear existing data
        
        // Add Firebase data to sample arrays for compatibility
        sampleProducts.push(...firebaseProducts);
        sampleAdditionals.push(...firebaseAdditionals);
          // Refresh the UI        loadProducts();
        loadAdditionals();
        
        console.log('Inventory data updated successfully from Firebase');
        
    } catch (error) {
        console.error('Error updating inventory data:', error);
    }
};

// Show Firebase connection status
function showFirebaseStatus(message, type = 'info') {
    const statusElement = document.getElementById('firebaseStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `firebase-status ${type}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'firebase-status';
        }, 5000);
    } else {
        // Create status element if it doesn't exist
        const status = document.createElement('div');
        status.id = 'firebaseStatus';
        status.className = `firebase-status ${type}`;
        status.textContent = message;
        status.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        
        // Set colors based on type
        if (type === 'success') {
            status.style.backgroundColor = '#d4edda';
            status.style.color = '#155724';
            status.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            status.style.backgroundColor = '#f8d7da';
            status.style.color = '#721c24';
            status.style.border = '1px solid #f5c6cb';
        } else {
            status.style.backgroundColor = '#d1ecf1';
            status.style.color = '#0c5460';
            status.style.border = '1px solid #bee5eb';
        }
        
        document.body.appendChild(status);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (status.parentNode) {
                status.parentNode.removeChild(status);
            }
        }, 5000);
    }
}

// Enhanced save product function to use Firebase
async function saveProductToFirebase(productData) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Saving product to Firebase:', productData);
        
        // Use the new addProduct method from InventoryFetcher
        const savedProduct = await window.InventoryFetcher.addProduct(productData);
        
        // Add to local array for immediate UI update
        sampleProducts.unshift(savedProduct);
        
        // Refresh UI
        loadProducts();
        
        console.log('Product saved to Firebase successfully');
        showFirebaseStatus('Product saved to Firebase', 'success');
        
        return savedProduct;
        
    } catch (error) {
        console.error('Error saving product to Firebase:', error);
        showFirebaseStatus('Failed to save product to Firebase', 'error');
        throw error;
    }
}

// Enhanced delete product function to use Firebase
async function deleteProductFromFirebase(productId) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Deleting product from Firebase:', productId);
        
        // Use the new deleteProduct method from InventoryFetcher
        await window.InventoryFetcher.deleteProduct(productId);
        
        // Remove from local array
        const index = sampleProducts.findIndex(p => p.id === productId);
        if (index > -1) {
            sampleProducts.splice(index, 1);
        }
        
        // Refresh UI
        loadProducts();
        
        console.log('Product deleted from Firebase successfully');
        showFirebaseStatus('Product deleted from Firebase', 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error deleting product from Firebase:', error);
        showFirebaseStatus('Failed to delete product from Firebase', 'error');
        throw error;
    }
}

// Enhanced save additional function to use Firebase
async function saveAdditionalToFirebase(additionalData) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Saving additional to Firebase:', additionalData);
        
        // Use the new addAdditional method from InventoryFetcher
        const savedAdditional = await window.InventoryFetcher.addAdditional(additionalData);
        
        // Add to local array for immediate UI update
        sampleAdditionals.unshift(savedAdditional);
        
        // Refresh UI
        loadAdditionals();
        
        console.log('Additional saved to Firebase successfully');
        showFirebaseStatus('Additional saved to Firebase', 'success');
        
        return savedAdditional;
        
    } catch (error) {
        console.error('Error saving additional to Firebase:', error);
        showFirebaseStatus('Failed to save additional to Firebase', 'error');
        throw error;
    }
}

// Enhanced delete additional function to use Firebase
async function deleteAdditionalFromFirebase(additionalId) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Deleting additional from Firebase:', additionalId);
        
        // Use the new deleteAdditional method from InventoryFetcher
        await window.InventoryFetcher.deleteAdditional(additionalId);
        
        // Remove from local array
        const index = sampleAdditionals.findIndex(a => a.id === additionalId);
        if (index > -1) {
            sampleAdditionals.splice(index, 1);
        }
        
        // Refresh UI
        loadAdditionals();
        
        console.log('Additional deleted from Firebase successfully');
        showFirebaseStatus('Additional deleted from Firebase', 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error deleting additional from Firebase:', error);
        showFirebaseStatus('Failed to delete additional from Firebase', 'error');
        throw error;
    }
}

function initializeInventory() {
    setupTabs();
    setupModals();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load data (sample data first, then Firebase will replace it)
    loadProducts();
    loadAdditionals();
    
    // Initialize enhanced modal functionality
    initializeEnhancedModal();
    
    // Try to refresh data from Firebase if connected
    setTimeout(async () => {
        if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
            try {
                console.log('🔄 Auto-refreshing data from Firebase...');
                await refreshInventoryDataFromFirebase();
            } catch (error) {
                console.error('Failed to auto-refresh from Firebase:', error);
            }
        }
    }, 2000); // Wait 2 seconds after page load
}

// Initialize enhanced modal functionality
function initializeEnhancedModal() {
    initializeImageUpload();
    initializeFormHandlers();
    initializeModalEvents();
}

// Tab Management
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab + 'Content').classList.add('active');
        });
    });
}

// Modal Management
function setupModals() {
    // Add Product Modal
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModal = document.getElementById('addProductModal');
    const closeAddProductModal = document.getElementById('closeAddProductModal');
    const cancelAddProductBtn = document.getElementById('cancelAddProductBtn');
    
    // Add Additional Modal
    const addAdditionalBtn = document.getElementById('addAdditionalBtn');
    const addAdditionalModal = document.getElementById('addAdditionalModal');
    const closeAddAdditionalModal = document.getElementById('closeAddAdditionalModal');
    const cancelAddAdditionalBtn = document.getElementById('cancelAddAdditionalBtn');

    // Product Modal Events
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openModal(addProductModal);
        });
    }

    if (closeAddProductModal) {
        closeAddProductModal.addEventListener('click', () => {
            closeModal(addProductModal);
        });
    }

    if (cancelAddProductBtn) {
        cancelAddProductBtn.addEventListener('click', () => {
            closeModal(addProductModal);
        });
    }

    // Additional Modal Events
    if (addAdditionalBtn) {
        addAdditionalBtn.addEventListener('click', () => {
            openModal(addAdditionalModal);
        });
    }

    if (closeAddAdditionalModal) {
        closeAddAdditionalModal.addEventListener('click', () => {
            closeModal(addAdditionalModal);
        });
    }

    if (cancelAddAdditionalBtn) {
        cancelAddAdditionalBtn.addEventListener('click', () => {
            closeModal(addAdditionalModal);
        });
    }

    // Form Submissions
    const saveProductBtn = document.getElementById('saveProductBtn');
    const saveAdditionalBtn = document.getElementById('saveAdditionalBtn');

    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveProduct();
        });
    }

    if (saveAdditionalBtn) {
        saveAdditionalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveAdditional();
        });
    }

    // Close modal when clicking backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
}

// Modal Functions
function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Save Functions
function saveProduct() {
    const form = document.getElementById('addProductForm');
      // Get selected sizes with stock quantities
    const sizeCheckboxes = form.querySelectorAll('.size-checkboxes input[type="checkbox"]:checked');
    const sizesWithStock = {};
    
    sizeCheckboxes.forEach(checkbox => {
        const size = checkbox.value;
        const label = checkbox.closest('.checkbox-label');
        const stockInput = label.querySelector('.stock-input');
        const stock = parseInt(stockInput.value) || 0;
        sizesWithStock[size] = stock;
    });    // Get form values
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        sizes: sizesWithStock,
        sleeves: document.getElementById('productSleeves').value,
        color: document.getElementById('productColor').value,
        colorHex: getColorHex(),
        rentalPrice: document.getElementById('productRentalPrice').value,
        status: 'available', // Default status
        description: document.getElementById('productDescription').value,
        frontImage: document.getElementById('frontImageInput').files[0],
        backImage: document.getElementById('backImageInput').files[0]
    };

    // Validate required fields
    if (!productData.name || !productData.category || Object.keys(sizesWithStock).length === 0 || 
        !productData.sleeves || !productData.color || !productData.rentalPrice) {
        if (window.showErrorModal) {
            window.showErrorModal('Please fill in all required fields and select at least one size');
        } else {
            alert('Please fill in all required fields and select at least one size');
        }
        return;
    }    // Use Firebase to save product if available
    if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
        // Use Firebase to save
        saveProductToFirebase(productData).then(result => {
            if (result) {
                // Close modal and refresh data
                closeModal(document.getElementById('addProductModal'));
                resetProductForm();
                console.log('Product saved to Firebase successfully');
            }
        }).catch(error => {
            console.error('Failed to save to Firebase:', error);
            alert('Failed to save product to Firebase. Please try again.');
        });
    } else {
        // Fallback to local storage
        console.log('Saving product locally:', productData);
        
        const newProduct = {
            id: Date.now().toString(),
            ...productData,
            createdAt: new Date().toISOString()
        };
        
        // Add to sample products array
        sampleProducts.unshift(newProduct);
        
        // Refresh UI
        loadProducts();
        
        // Close modal
        closeModal(document.getElementById('addProductModal'));
        resetProductForm();
        
        alert('Product saved locally!');
    }
}

function getColorHex() {
    const colorSelect = document.getElementById('productColor');
    const selectedOption = colorSelect.options[colorSelect.selectedIndex];
    return selectedOption ? selectedOption.getAttribute('data-hex') : '#000000';
}

function saveAdditional() {
    const form = document.getElementById('addAdditionalForm');
    
    // Get form values
    const additionalData = {
        name: document.getElementById('additionalName').value,
        type: document.getElementById('additionalType').value,
        size: document.getElementById('additionalSize').value,
        color: document.getElementById('additionalColor').value,
        rentalPrice: document.getElementById('additionalRentalPrice').value,
        status: document.getElementById('additionalStatus').value,
        description: document.getElementById('additionalDescription').value,
        image: document.getElementById('additionalImage').files[0]
    };

    // Validate required fields
    if (!additionalData.name || !additionalData.type || 
        !additionalData.color || !additionalData.rentalPrice) {
        alert('Please fill in all required fields');
        return;
    }

    // Here you would typically send data to backend
    console.log('Saving additional:', additionalData);
    
    // For now, just show success message and close modal
    alert('Additional saved successfully!');
    closeModal(document.getElementById('addAdditionalModal'));
    
    // Refresh the additionals list
    loadAdditionals();
}

// Load Functions
function loadProducts() {
    const productsList = document.getElementById('productsList');
    
    if (sampleProducts.length === 0) {
        productsList.innerHTML = `
            <div class="empty-message">
                <i class='bx bx-package'></i>
                <h3>No products added yet</h3>
                <p>Click "Add Product" to start managing your inventory</p>
            </div>
        `;
        return;
    }    productsList.innerHTML = sampleProducts.map(product => `
        <div class="product-item card_article" data-id="${product.id}">
            <div class="card_data">
                ${product.color ? `
                    <span class="card_color" style="background-color: ${product.color || product.colorHex}" data-color="${product.color || product.colorHex}"></span>
                ` : ''}
                <div class="product-image">
                    ${product.frontImageUrl ? `
                        <img src="${product.frontImageUrl}" alt="${product.name}" class="card_img" loading="lazy" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="image-placeholder" style="display: none;">
                            <i class='bx bxs-t-shirt'></i>
                            <span class="placeholder-text">Image Error</span>
                        </div>
                    ` : `
                        <div class="image-placeholder">
                            <i class='bx bxs-t-shirt'></i>
                            <span class="placeholder-text">Product Image</span>
                        </div>
                    `}
                    <div class="status-badge ${product.status}">${getStatusText(product.status)}</div>
                    <div class="color-indicator" style="background-color: ${product.colorHex || product.color}" title="${product.color}" onclick="openColorPicker('product', '${product.id}', '${product.colorHex || product.color}')">
                    </div>
                </div>
                <h2 class="card_title product-title">${product.name}</h2>
                <p class="card_size">Available Size: ${formatSizesDisplay(product.sizes || product.size)}</p>
                <p class="card_sleeve">Sleeve: ${product.sleeves || product.sleeve || 'N/A'}</p>
                <span class="card_category">${product.code || getCategoryText(product.category)}</span>
                <div class="product-details">
                    <div class="detail-row">
                        <span class="label">Category:</span>
                        <span class="value">${getCategoryText(product.category)}</span>
                    </div>
                </div>
                <div class="product-price">₱${product.rentalPrice ? product.rentalPrice.toLocaleString() : (product.price ? product.price.toLocaleString() : '0')}</div>
                <div class="product-actions">
                    <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">
                        <i class='bx bx-edit'></i>
                        Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">
                        <i class='bx bx-trash'></i>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadAdditionals() {
    const additionalsList = document.getElementById('additionalsList');
    
    if (sampleAdditionals.length === 0) {
        additionalsList.innerHTML = `
            <div class="empty-message">
                <i class='bx bx-diamond'></i>
                <h3>No additionals added yet</h3>
                <p>Click "Add Additional" to start managing your accessories</p>
            </div>
        `;
        return;
    }    additionalsList.innerHTML = sampleAdditionals.map(additional => `
        <div class="additional-item card_article" data-id="${additional.id}">
            <div class="card_data">
                <div class="additional-image">
                    ${additional.imageUrl ? `
                        <img src="${additional.imageUrl}" alt="${additional.name}" class="card_img" loading="lazy">
                    ` : `
                        <div class="image-placeholder">
                            <i class='bx bxs-diamond'></i>
                            <span class="placeholder-text">Additional Image</span>
                        </div>
                    `}
                    <div class="status-badge ${additional.status}">${getStatusText(additional.status)}</div>
                    <div class="color-indicator" style="background-color: ${additional.colorHex || additional.color}" title="${additional.color}" onclick="openColorPicker('additional', ${additional.id}, '${additional.colorHex || additional.color}')">
                    </div>
                </div>
                <h2 class="card_title additional-title">${additional.name}</h2>
                <p class="card_info">Price: ₱${additional.rentalPrice ? additional.rentalPrice.toLocaleString() : (additional.price ? additional.price.toLocaleString() : '0')}</p>
                <p class="card_info">
                    ${additional.inclusions && additional.inclusions.length ? "With Inclusion" : "Without Inclusion"}
                </p>
                <span class="card_category">${additional.code || getTypeText(additional.type)}</span>
                <div class="additional-details">
                    <div class="detail-row">
                        <span class="label">Type:</span>
                        <span class="value">${getTypeText(additional.type)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Size:</span>
                        <span class="value">${additional.size}</span>
                    </div>
                </div>
                <div class="additional-actions product-actions">
                    <button class="action-btn edit-btn edit-add-btn" onclick="editAdditional(${additional.id})">
                        <i class='bx bx-edit'></i>
                        Edit
                    </button>
                    <button class="action-btn delete-btn delete-add-btn" onclick="deleteAdditional(${additional.id})">
                        <i class='bx bx-trash'></i>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper functions
function getStatusText(status) {
    switch(status) {
        case 'available': return 'Available';
        case 'rented': return 'Rented';
        case 'maintenance': return 'Maintenance';
        default: return status;
    }
}

function getCategoryText(category) {
    switch(category) {
        case 'ball-gown': return 'Ball Gown';
        case 'long-gown': return 'Long Gown';
        case 'fairy-gown': return 'Fairy Gown';
        case 'wedding-gown': return 'Wedding Gown';
        case 'suit': return 'Suit';
        default: return category;
    }
}

function getTypeText(type) {
    switch(type) {
        case 'jewelry': return 'Jewelry';
        case 'shoes': return 'Shoes';
        case 'bags': return 'Bags';
        case 'veils': return 'Veils';
        case 'headpieces': return 'Headpieces';
        case 'other': return 'Other';
        default: return type;
    }
}

// Color Picker Functions
function openColorPicker(type, id, currentColor) {
    const item = type === 'product' ? sampleProducts.find(p => p.id === id) : sampleAdditionals.find(a => a.id === id);
    
    // Create a more sophisticated color picker interface
    const colorPickerModal = document.createElement('div');
    colorPickerModal.className = 'color-picker-modal';
    colorPickerModal.innerHTML = `
        <div class="color-picker-backdrop" onclick="closeColorPickerModal()"></div>
        <div class="color-picker-content">
            <div class="color-picker-header">
                <h3>Choose Color for ${item.name}</h3>
                <button class="close-color-picker" onclick="closeColorPickerModal()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="color-picker-body">
                <div class="color-input-section">
                    <label for="colorInput">Custom Color:</label>
                    <input type="color" id="colorInput" value="${currentColor}" />
                </div>
                <div class="preset-colors">
                    <h4>Preset Colors:</h4>
                    <div class="color-grid">
                        ${getPresetColors().map(color => `
                            <div class="preset-color" 
                                 style="background-color: ${color.hex}" 
                                 title="${color.name}"
                                 onclick="selectPresetColor('${color.hex}', '${type}', ${id})">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="color-preview">
                    <div class="preview-circle" style="background-color: ${currentColor}"></div>
                    <span class="color-name">${hexToColorName(currentColor)}</span>
                    <span class="color-hex">${currentColor}</span>
                </div>
            </div>
            <div class="color-picker-footer">
                <button class="cancel-btn" onclick="closeColorPickerModal()">Cancel</button>
                <button class="apply-btn" onclick="applySelectedColor('${type}', ${id})">Apply</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(colorPickerModal);
    
    // Add event listener for color input changes
    const colorInput = document.getElementById('colorInput');
    colorInput.addEventListener('input', function() {
        updateColorPreview(this.value);
    });
    
    // Store the current selection
    window.selectedColor = currentColor;
}

function getPresetColors() {
    return [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Black', hex: '#000000' },
        { name: 'Red', hex: '#FF0000' },
        { name: 'Navy Blue', hex: '#2C3E50' },
        { name: 'Pink', hex: '#FFC0CB' },
        { name: 'Purple', hex: '#800080' },
        { name: 'Gold', hex: '#FFD700' },
        { name: 'Silver', hex: '#C0C0C0' },
        { name: 'Ivory', hex: '#F8F6F0' },
        { name: 'Champagne', hex: '#F7E7CE' },
        { name: 'Nude', hex: '#E8C5A0' },
        { name: 'Charcoal Gray', hex: '#36454F' },
        { name: 'Emerald', hex: '#50C878' },
        { name: 'Royal Blue', hex: '#4169E1' },
        { name: 'Burgundy', hex: '#800020' },
        { name: 'Rose Gold', hex: '#E8B4A0' }
    ];
}

function selectPresetColor(colorHex, type, id) {
    window.selectedColor = colorHex;
    document.getElementById('colorInput').value = colorHex;
    updateColorPreview(colorHex);
}

function updateColorPreview(colorHex) {
    const previewCircle = document.querySelector('.preview-circle');
    const colorName = document.querySelector('.color-name');
    const colorHexSpan = document.querySelector('.color-hex');
    
    if (previewCircle) previewCircle.style.backgroundColor = colorHex;
    if (colorName) colorName.textContent = hexToColorName(colorHex);
    if (colorHexSpan) colorHexSpan.textContent = colorHex;
    
    window.selectedColor = colorHex;
}

function applySelectedColor(type, id) {
    if (window.selectedColor) {
        updateItemColor(type, id, window.selectedColor);
    }
    closeColorPickerModal();
}

function closeColorPickerModal() {
    const modal = document.querySelector('.color-picker-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    delete window.selectedColor;
}

function updateItemColor(type, id, newColorHex) {
    if (type === 'product') {
        const productIndex = sampleProducts.findIndex(p => p.id === id);
        if (productIndex > -1) {
            sampleProducts[productIndex].colorHex = newColorHex;
            sampleProducts[productIndex].color = hexToColorName(newColorHex);
            loadProducts();
        }
    } else {
        const additionalIndex = sampleAdditionals.findIndex(a => a.id === id);
        if (additionalIndex > -1) {
            sampleAdditionals[additionalIndex].colorHex = newColorHex;
            sampleAdditionals[additionalIndex].color = hexToColorName(newColorHex);
            loadAdditionals();
        }
    }
}

function hexToColorName(hex) {
    // Comprehensive color name mapping
    const colorMap = {
        '#FFFFFF': 'White',
        '#000000': 'Black',
        '#FF0000': 'Red',
        '#00FF00': 'Green',
        '#0000FF': 'Blue',
        '#FFFF00': 'Yellow',
        '#FF00FF': 'Magenta',
        '#00FFFF': 'Cyan',
        '#FFC0CB': 'Pink',
        '#800080': 'Purple',
        '#FFA500': 'Orange',
        '#A52A2A': 'Brown',
        '#808080': 'Gray',
        '#C0C0C0': 'Silver',
        '#FFD700': 'Gold',
        '#2C3E50': 'Navy Blue',
        '#F8F6F0': 'Ivory',
        '#F7E7CE': 'Champagne',
        '#E8C5A0': 'Nude',
        '#36454F': 'Charcoal Gray',
        '#50C878': 'Emerald',
        '#4169E1': 'Royal Blue',
        '#800020': 'Burgundy',
        '#E8B4A0': 'Rose Gold',
        '#2C2C2C': 'Charcoal',
        '#FF69B4': 'Hot Pink',
        '#DC143C': 'Crimson',
        '#8B4513': 'Saddle Brown',
        '#FF6347': 'Tomato',
        '#40E0D0': 'Turquoise',
        '#EE82EE': 'Violet',
        '#F0E68C': 'Khaki',
        '#DDA0DD': 'Plum',
        '#98FB98': 'Pale Green',
        '#F5DEB3': 'Wheat',
        '#CD853F': 'Peru',
        '#D2691E': 'Chocolate',
        '#B22222': 'Fire Brick',
        '#228B22': 'Forest Green',
        '#4682B4': 'Steel Blue',
        '#D2B48C': 'Tan',
        '#BC8F8F': 'Rosy Brown',
        '#F4A460': 'Sandy Brown',
        '#9ACD32': 'Yellow Green',
        '#00CED1': 'Dark Turquoise',
        '#FF1493': 'Deep Pink',
        '#1E90FF': 'Dodger Blue',
        '#B0C4DE': 'Light Steel Blue',
        '#FFFFE0': 'Light Yellow',
        '#F0FFFF': 'Azure',
        '#F5F5F5': 'White Smoke',
        '#FFFAF0': 'Floral White',
        '#FDF5E6': 'Old Lace'
    };
    
    // Convert hex to uppercase for comparison
    const upperHex = hex.toUpperCase();
    
    // Check for exact matches first
    if (colorMap[upperHex]) {
        return colorMap[upperHex];
    }
    
    // If no exact match, find the closest color
    let closestColor = 'Custom';
    let minDistance = Infinity;
    
    for (const [colorHex, colorName] of Object.entries(colorMap)) {
        const distance = calculateColorDistance(upperHex, colorHex);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = colorName;
        }
    }
    
    // If the closest color is very close, use it, otherwise show as custom
    return minDistance < 50 ? closestColor : `Custom (${hex})`;
}

// Helper function to calculate color distance
function calculateColorDistance(hex1, hex2) {
    const r1 = parseInt(hex1.substr(1, 2), 16);
    const g1 = parseInt(hex1.substr(3, 2), 16);
    const b1 = parseInt(hex1.substr(5, 2), 16);
    
    const r2 = parseInt(hex2.substr(1, 2), 16);
    const g2 = parseInt(hex2.substr(3, 2), 16);
    const b2 = parseInt(hex2.substr(5, 2), 16);
    
    return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
}

// Action functions (placeholders)
function editProduct(id) {
    const product = sampleProducts.find(p => p.id === id);
    alert(`Editing product: ${product.name}`);
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
            // Use Firebase to delete
            deleteProductFromFirebase(id).catch(error => {
                console.error('Failed to delete from Firebase:', error);
                // Fallback to local delete
                const index = sampleProducts.findIndex(p => p.id === id);
                if (index > -1) {
                    sampleProducts.splice(index, 1);
                    loadProducts();
                }
            });
        } else {
            // Local delete fallback
            const index = sampleProducts.findIndex(p => p.id === id);
            if (index > -1) {
                sampleProducts.splice(index, 1);
                loadProducts();
            }
        }
    }
}

function editAdditional(id) {
    const additional = sampleAdditionals.find(a => a.id === id);
    alert(`Editing additional: ${additional.name}`);
}

function deleteAdditional(id) {
    if (confirm('Are you sure you want to delete this additional?')) {
        if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
            // Use Firebase to delete
            deleteAdditionalFromFirebase(id).catch(error => {
                console.error('Failed to delete from Firebase:', error);
                // Fallback to local delete
                const index = sampleAdditionals.findIndex(a => a.id === id);
                if (index > -1) {
                    sampleAdditionals.splice(index, 1);
                    loadAdditionals();
                }
            });
        } else {
            // Local delete fallback
            const index = sampleAdditionals.findIndex(a => a.id === id);
            if (index > -1) {
                sampleAdditionals.splice(index, 1);
                loadAdditionals();
            }
        }
    }
}

// Date and Time Update Function
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    const formattedDateTime = now.toLocaleDateString('en-US', options)
        .replace(' at ', ' at ');
    
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = formattedDateTime;
    }
}

// Enhanced Modal Functionality

// Initialize image upload functionality
function initializeImageUpload() {
    // Front image upload
    const frontZone = document.getElementById('frontImageZone');
    const frontInput = document.getElementById('frontImageInput');
    const frontPlaceholder = document.getElementById('frontPlaceholder');
    const frontPreview = document.getElementById('frontPreview');
    
    // Back image upload
    const backZone = document.getElementById('backImageZone');
    const backInput = document.getElementById('backImageInput');
    const backPlaceholder = document.getElementById('backPlaceholder');
    const backPreview = document.getElementById('backPreview');
    
    // Setup front image upload
    setupImageUpload(frontZone, frontInput, frontPlaceholder, frontPreview, 'front');
    
    // Setup back image upload
    setupImageUpload(backZone, backInput, backPlaceholder, backPreview, 'back');
}

// Setup individual image upload zone
function setupImageUpload(zone, input, placeholder, preview, type) {
    // Click to upload
    zone.addEventListener('click', (e) => {
        if (e.target.closest('.image-actions')) return;
        input.click();
    });
    
    // File input change
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file, placeholder, preview, type);
        }
    });
    
    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleImageFile(file, placeholder, preview, type);
            }
        }
    });
}

// Handle image file upload
function handleImageFile(file, placeholder, preview, type) {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }
      const reader = new FileReader();
    reader.onload = (e) => {
        // Store image data
        if (type === 'front') {
            frontImageData = e.target.result;
        } else {
            backImageData = e.target.result;
        }
        
        // Automatically open crop modal when image is uploaded
        setTimeout(() => {
            openImageCropper(type);
        }, 100);
    };
    reader.readAsDataURL(file);
}

// Remove image
function removeImage(type) {
    const placeholder = document.getElementById(`${type}Placeholder`);
    const preview = document.getElementById(`${type}Preview`);
    const input = document.getElementById(`${type}ImageInput`);
    
    // Clear data
    if (type === 'front') {
        frontImageData = null;
    } else {
        backImageData = null;
    }
    
    // Reset input
    input.value = '';
    
    // Show placeholder, hide preview
    placeholder.style.display = 'flex';
    preview.style.display = 'none';
}

// Open image cropper
function openImageCropper(type) {
    currentImageType = type;
    const imageData = type === 'front' ? frontImageData : backImageData;
    
    if (!imageData) {
        alert('Please upload an image first');
        return;
    }
    
    const cropperModal = document.getElementById('imageCropperModal');
    const cropperImage = document.getElementById('cropperImage');
    
    // Set image source
    cropperImage.src = imageData;
    
    // Show modal
    cropperModal.classList.add('active');
    
    // Initialize cropper after image loads
    cropperImage.onload = function() {
        initializeCropper();
    };
}

// Initialize cropper with portrait aspect ratio
function initializeCropper() {
    const image = document.getElementById('cropperImage');
    
    // Destroy existing cropper
    if (currentCropper) {
        currentCropper.destroy();
    }
    
    // Initialize new cropper with fixed portrait aspect ratio (3:4)
    currentCropper = new Cropper(image, {
        aspectRatio: 3/4, // Fixed portrait ratio
        viewMode: 1,
        autoCropArea: 0.6, // Reduced to zoom out more
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        background: false,
        zoomable: true,
        scalable: true,
        minContainerWidth: 300,
        minContainerHeight: 200,
        ready: function() {
            console.log('Cropper initialized successfully');
            // Zoom out slightly to ensure the image fits well
            currentCropper.zoomTo(0.8);
        }
    });
}

// Close cropper modal
function closeCropperModal() {
    const cropperModal = document.getElementById('imageCropperModal');
    cropperModal.classList.remove('active');
    
    // Destroy cropper
    if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
    }
    
    currentImageType = null;
}

// Apply crop and save result
function applyCrop() {
    if (!currentCropper || !currentImageType) {
        alert('No image to crop');
        return;
    }
    
    try {
        // Get cropped canvas with fixed dimensions for portrait (3:4 ratio)
        const canvas = currentCropper.getCroppedCanvas({
            width: 400,   // Fixed width
            height: 533,  // Fixed height (3:4 ratio: 400 * 4/3 = 533)
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        
        const croppedData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Update the image data
        if (currentImageType === 'front') {
            frontImageData = croppedData;
            updateImagePreview('front', croppedData);
        } else {
            backImageData = croppedData;
            updateImagePreview('back', croppedData);
        }
        
        // Close modal
        closeCropperModal();
        
        console.log('Image cropped successfully');
        
    } catch (error) {
        console.error('Error cropping image:', error);
        alert('Error cropping image. Please try again.');
    }
}

// Update image preview after cropping
function updateImagePreview(type, imageData) {
    const placeholder = document.getElementById(`${type}Placeholder`);
    const preview = document.getElementById(`${type}Preview`);
    const img = document.getElementById(`${type}Image`);
      if (placeholder && preview && img) {
        // Hide placeholder and show preview
        placeholder.style.display = 'none';
        preview.style.display = 'block';        img.src = imageData;
    }
}

// Initialize form handlers
function initializeFormHandlers() {
    // Color dropdown change handler
    const colorSelect = document.getElementById('productColor');
    
    if (colorSelect) {
        colorSelect.addEventListener('change', () => {
            generateProductCode();
        });
    }
    
    // Category change handler
    const categorySelect = document.getElementById('productCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', generateProductCode);
    }
    
    // Form submission
    const saveBtn = document.getElementById('saveProductBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleFormSubmission);
    }
}

// Generate product code automatically
function generateProductCode() {
    const category = document.getElementById('productCategory').value;
    const colorSelect = document.getElementById('productColor');
    const color = colorSelect.value;
    
    if (!category || !color) return;
      const categoryCodes = {
        'ball-gown': 'BG',
        'long-gown': 'LG',
        'fairy-gown': 'FG',
        'wedding-gown': 'WG',
        'suit': 'ST'
    };
    
    const colorCodes = {
        'Red': 'RD',
        'Blue': 'BL', 
        'Yellow': 'YL',
        'Orange': 'OR',
        'Green': 'GR',
        'Purple': 'PR',
        'Pink': 'PK',
        'White': 'WH',
        'Black': 'BK',
        'Gray': 'GY',
        'Brown': 'BR',
        'Beige': 'BG',
        'Cream': 'CR',
        'Navy Blue': 'NB',
        'Ivory': 'IV',
        'Champagne': 'CH',
        'Nude': 'ND',
        'Rose Gold': 'RG',
        'Silver': 'SV',
        'Gold': 'GD',
        'Burgundy': 'BU',
        'Emerald': 'EM',
        'Royal Blue': 'RB'
    };
    
    const categoryCode = categoryCodes[category] || 'XX';
    const colorCode = colorCodes[color] || color.substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    
    const productCode = `${categoryCode}-${colorCode}-${timestamp}`;
    document.getElementById('productCode').value = productCode;
}

// Initialize modal events
function initializeModalEvents() {
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductModal = document.getElementById('addProductModal');
    const closeBtn = document.getElementById('closeAddProductModal');
    const cancelBtn = document.getElementById('cancelAddProductBtn');
    const closeCropperBtn = document.getElementById('closeCropperModal');
    
    // Open modal
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openAddProductModal();
        });
    }
    
    // Close modal events
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAddProductModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddProductModal);
    }
    
    if (closeCropperBtn) {
        closeCropperBtn.addEventListener('click', closeCropper);
    }
    
    // Close on backdrop click
    if (addProductModal) {
        addProductModal.addEventListener('click', (e) => {
            if (e.target === addProductModal || e.target.classList.contains('modal-backdrop')) {
                closeAddProductModal();
            }
        });
    }
}

// Open add product modal
function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset form
    resetProductForm();
}

// Close add product modal
function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    resetProductForm();
}

// Reset product form
function resetProductForm() {
    const form = document.getElementById('addProductForm');
    if (form) {
        form.reset();
    }
    
    // Reset images
    removeImage('front');
    removeImage('back');
    
    // Reset product code
    document.getElementById('productCode').value = '';
}

// Handle form submission
function handleFormSubmission() {
    const form = document.getElementById('addProductForm');
    
    // Validate required fields
    const requiredFields = ['productName', 'productCategory', 'productColor', 'productRentalPrice'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.style.borderColor = '#dc2626';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (!isValid) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Collect form data
    const formData = collectFormData();
      // Add product to inventory
    addProductToInventory(formData);
    
    // Close modal
    closeAddProductModal();
}

// Collect form data
function collectFormData() {    const getSelectedSizes = () => {
        const checkboxes = document.querySelectorAll('#addProductForm input[type="checkbox"]:checked');
        const sizesWithStock = {};
        
        checkboxes.forEach(checkbox => {
            const size = checkbox.value;
            const label = checkbox.closest('.checkbox-label');
            const stockInput = label.querySelector('.stock-input');
            const stock = parseInt(stockInput.value) || 0;
            sizesWithStock[size] = stock;
        });
        
        return sizesWithStock;
    };
    
    const getColorHex = () => {
        const colorSelect = document.getElementById('productColor');
        const selectedOption = colorSelect.options[colorSelect.selectedIndex];
        return selectedOption ? selectedOption.getAttribute('data-hex') : '#000000';
    };
    
    return {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        productCode: document.getElementById('productCode').value,
        color: document.getElementById('productColor').value,
        colorHex: getColorHex(),
        rentalPrice: parseFloat(document.getElementById('productRentalPrice').value),
        description: document.getElementById('productDescription').value.trim(),
        sizes: getSelectedSizes(),
        sleeves: document.getElementById('productSleeves').value,
        status: 'available', // Default status
        frontImage: frontImageData,
        backImage: backImageData
    };
}

// Add product to inventory
async function addProductToInventory(productData) {
    try {
        if (isFirebaseConnected && window.InventoryFetcher) {
            // Use Firebase to save product
            const savedProduct = await saveProductToFirebase(productData);
            console.log('Product added to Firebase successfully:', savedProduct);
        } else {
            // Fallback to local storage
            const newProduct = {
                id: Date.now(),
                ...productData,
                dateAdded: new Date().toISOString()
            };
            
            // Add to sample products array
            sampleProducts.push(newProduct);
            
            // Refresh the products list
            loadProducts();
            
            console.log('Product added locally:', newProduct);
        }
    } catch (error) {
        console.error('Error adding product to inventory:', error);
        
        // Fallback to local storage if Firebase fails
        const newProduct = {
            id: Date.now(),
            ...productData,
            dateAdded: new Date().toISOString()
        };
          sampleProducts.push(newProduct);
        loadProducts();
        
        alert('Product saved locally. Firebase connection may be unavailable.');
    }
}

// Color name to hex conversion (enhanced)
function colorNameToHex(colorName) {
    const colorMap = {
        'white': '#FFFFFF',
        'black': '#000000',
        'red': '#FF0000',
        'blue': '#0000FF',
        'navy blue': '#2C3E50',
        'pink': '#FFC0CB',
        'purple': '#800080',
        'green': '#008000',
        'yellow': '#FFFF00',
        'orange': '#FFA500',
        'brown': '#A52A2A',
        'gray': '#808080',
        'grey': '#808080',
        'silver': '#C0C0C0',
        'gold': '#FFD700',
        'ivory': '#F8F6F0',
        'champagne': '#F7E7CE',
        'nude': '#E8C5A0'
    };
    
    return colorMap[colorName.toLowerCase()] || null;
}

/**
 * FIREBASE FETCHING INTEGRATION
 * Functions to work with the new inventory-fetching.js service
 */

// Refresh data using the new fetching service
async function refreshInventoryDataFromFirebase() {
    try {
        if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
            console.log('Refreshing inventory data via new fetching service...');
            
            const inventoryData = await window.InventoryFetcher.refreshInventoryData();
            
            // Update local arrays
            firebaseProducts = inventoryData.products || [];
            firebaseAdditionals = inventoryData.additionals || [];
            
            // Replace sample data with Firebase data
            sampleProducts.length = 0;
            sampleAdditionals.length = 0;
            sampleProducts.push(...firebaseProducts);
            sampleAdditionals.push(...firebaseAdditionals);
            
            // Refresh UI
            loadProducts();
            loadAdditionals();
            
            console.log(`Refreshed: ${inventoryData.products.length} products, ${inventoryData.additionals.length} additionals`);
            
            if (window.notyf) {
                window.notyf.success(`Inventory refreshed: ${inventoryData.totalCount} items`);
            }
            
            return inventoryData;
            
        } else {
            console.warn('New fetching service not available, using fallback...');
            return await loadInventoryFromFirebase();
        }
        
    } catch (error) {
        console.error('Error refreshing inventory data:', error);
        if (window.notyf) {
            window.notyf.error('Failed to refresh inventory data');
        }
        throw error;
    }
}

// Manual refresh function to fetch fresh data from Firebase
async function refreshInventoryData() {
    try {
        if (!window.InventoryFetcher) {
            console.warn('InventoryFetcher not available');
            if (window.notyf) {
                window.notyf.warning('Firebase service not available');
            }
            return;
        }

        if (!window.InventoryFetcher.getConnectionStatus()) {
            console.warn('Firebase not connected');
            if (window.notyf) {
                window.notyf.warning('Firebase not connected');
            }
            return;
        }

        console.log('🔄 Manually refreshing inventory data from Firebase...');
        
        if (window.notyf) {
            window.notyf.info('Refreshing data from Firebase...');
        }

        // Fetch fresh data from Firebase
        const [products, additionals] = await Promise.all([
            window.InventoryFetcher.fetchProducts(),
            window.InventoryFetcher.fetchAdditionals()
        ]);

        // Update the inventory data
        window.updateInventoryData(products, additionals);

        if (window.notyf) {
            window.notyf.success(`Refreshed: ${products.length} products, ${additionals.length} additionals`);
        }

        console.log(`✅ Manual refresh complete: ${products.length} products, ${additionals.length} additionals`);

    } catch (error) {
        console.error('❌ Error during manual refresh:', error);
        if (window.notyf) {
            window.notyf.error('Failed to refresh data from Firebase');
        }
    }
}

// Make refresh function available globally
window.refreshInventoryData = refreshInventoryData;

// Make functions available globally
window.refreshInventoryDataFromFirebase = refreshInventoryDataFromFirebase;
window.getInventoryStatistics = getInventoryStatistics;
window.searchProductsByName = searchProductsByName;
window.checkFirebaseConnection = checkFirebaseConnection;

//# sourceMappingURL=inventory-management.js.map
