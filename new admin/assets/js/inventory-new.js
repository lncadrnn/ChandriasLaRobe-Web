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
            </div>
            <div class="product-content">
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
                    <div class="detail-row">
                        <span class="label">Color:</span>
                        <span class="value">${product.color}</span>
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
            </div>
            <div class="additional-content">
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
                    <div class="detail-row">
                        <span class="label">Color:</span>
                        <span class="value">${additional.color}</span>
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
