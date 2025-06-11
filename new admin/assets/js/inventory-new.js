// Inventory Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeInventory();
});

// Sample data
const sampleProducts = [
    {
        id: 1,
        name: "Elegant Wedding Gown",
        category: "wedding-gown",
        sizes: ["S", "M", "L"],
        sleeves: "Off-shoulder",
        color: "Ivory",
        colorHex: "#F8F6F0",
        rentalPrice: 15000,
        status: "available",
        description: "Beautiful off-shoulder wedding gown with intricate lace details and cathedral train.",
        image: "placeholder-wedding-gown.jpg"
    },
    {
        id: 2,
        name: "Classic Long Gown",
        category: "long-gown",
        sizes: ["M", "L", "XL"],
        sleeves: "Long sleeves",
        color: "Navy Blue",
        colorHex: "#2C3E50",
        rentalPrice: 8000,
        status: "rented",
        description: "Sophisticated long gown perfect for formal events and galas.",
        image: "placeholder-long-gown.jpg"
    },
    {
        id: 3,
        name: "Modern Cocktail Dress",
        category: "cocktail-dress",
        sizes: ["XS", "S", "M"],
        sleeves: "Sleeveless",
        color: "Black",
        colorHex: "#2C2C2C",
        rentalPrice: 5000,
        status: "available",
        description: "Chic cocktail dress with modern silhouette and elegant detailing.",
        image: "placeholder-cocktail.jpg"
    },
    {
        id: 4,
        name: "Formal Men's Suit",
        category: "suits",
        sizes: ["L", "XL"],
        sleeves: "Long sleeves",
        color: "Charcoal Gray",
        colorHex: "#36454F",
        rentalPrice: 6000,
        status: "maintenance",
        description: "Professional three-piece suit perfect for weddings and formal occasions.",
        image: "placeholder-suit.jpg"
    },
    {
        id: 5,
        name: "Romantic Wedding Dress",
        category: "wedding-gown",
        sizes: ["S", "M"],
        sleeves: "3/4 sleeves",
        color: "Champagne",
        colorHex: "#F7E7CE",
        rentalPrice: 18000,
        status: "available",
        description: "Romantic wedding dress with delicate lace and flowing train.",
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

function initializeInventory() {
    setupTabs();
    setupModals();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load sample data
    loadProducts();
    loadAdditionals();
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
    
    // Get selected sizes
    const sizeCheckboxes = form.querySelectorAll('.size-checkboxes input[type="checkbox"]:checked');
    const selectedSizes = Array.from(sizeCheckboxes).map(cb => cb.value);
    
    // Get form values
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        sizes: selectedSizes,
        sleeves: document.getElementById('productSleeves').value,
        color: document.getElementById('productColor').value,
        rentalPrice: document.getElementById('productRentalPrice').value,
        status: document.getElementById('productStatus').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').files[0]
    };

    // Validate required fields
    if (!productData.name || !productData.category || selectedSizes.length === 0 || 
        !productData.sleeves || !productData.color || !productData.rentalPrice) {
        alert('Please fill in all required fields and select at least one size');
        return;
    }

    // Here you would typically send data to backend
    console.log('Saving product:', productData);
    
    // For now, just show success message and close modal
    alert('Product saved successfully!');
    closeModal(document.getElementById('addProductModal'));
    
    // Refresh the products list
    loadProducts();
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
    }
      productsList.innerHTML = sampleProducts.map(product => `
        <div class="product-item" data-id="${product.id}">
            <div class="product-image">
                <div class="image-placeholder">
                    <i class='bx bxs-t-shirt'></i>
                    <span class="placeholder-text">Product Image</span>
                </div>
                <div class="status-badge ${product.status}">${getStatusText(product.status)}</div>
                <div class="color-indicator" style="background-color: ${product.colorHex}" title="${product.color}" onclick="openColorPicker('product', ${product.id}, '${product.colorHex}')">
                    <input type="color" class="color-picker hidden" value="${product.colorHex}" onchange="updateItemColor('product', ${product.id}, this.value)">
                </div>
            </div>            <div class="product-content">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-details">
                    <div class="detail-row">
                        <span class="label">Size(s):</span>
                        <span class="value">${product.sizes.join(', ')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Sleeves:</span>
                        <span class="value">${product.sleeves}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Category:</span>
                        <span class="value">${getCategoryText(product.category)}</span>
                    </div>
                </div>
                <div class="product-price">₱${product.rentalPrice.toLocaleString()}</div>
                <div class="product-actions">
                    <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                        <i class='bx bx-edit'></i>
                        Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
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
    }
      additionalsList.innerHTML = sampleAdditionals.map(additional => `
        <div class="additional-item" data-id="${additional.id}">
            <div class="additional-image">
                <div class="image-placeholder">
                    <i class='bx bxs-diamond'></i>
                    <span class="placeholder-text">Additional Image</span>
                </div>
                <div class="status-badge ${additional.status}">${getStatusText(additional.status)}</div>
                <div class="color-indicator" style="background-color: ${additional.colorHex}" title="${additional.color}" onclick="openColorPicker('additional', ${additional.id}, '${additional.colorHex}')">
                    <input type="color" class="color-picker hidden" value="${additional.colorHex}" onchange="updateItemColor('additional', ${additional.id}, this.value)">
                </div>
            </div>            <div class="additional-content">
                <h3 class="additional-title">${additional.name}</h3>
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
                <div class="additional-price">₱${additional.rentalPrice.toLocaleString()}</div>
                <div class="additional-actions">
                    <button class="action-btn edit-btn" onclick="editAdditional(${additional.id})">
                        <i class='bx bx-edit'></i>
                        Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteAdditional(${additional.id})">
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
        case 'wedding-gown': return 'Wedding Gown';
        case 'long-gown': return 'Long Gown';
        case 'cocktail-dress': return 'Cocktail Dress';
        case 'suits': return 'Suits';
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
        const index = sampleProducts.findIndex(p => p.id === id);
        if (index > -1) {
            sampleProducts.splice(index, 1);
            loadProducts();
        }
    }
}

function editAdditional(id) {
    const additional = sampleAdditionals.find(a => a.id === id);
    alert(`Editing additional: ${additional.name}`);
}

function deleteAdditional(id) {
    if (confirm('Are you sure you want to delete this additional?')) {
        const index = sampleAdditionals.findIndex(a => a.id === id);
        if (index > -1) {
            sampleAdditionals.splice(index, 1);
            loadAdditionals();
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
