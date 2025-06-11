// Inventory Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeInventory();
});

function initializeInventory() {
    setupTabs();
    setupModals();
    updateDateTime();
    setInterval(updateDateTime, 1000);
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
    const formData = new FormData(form);
    
    // Get form values
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        size: document.getElementById('productSize').value,
        color: document.getElementById('productColor').value,
        rentalPrice: document.getElementById('productRentalPrice').value,
        status: document.getElementById('productStatus').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').files[0]
    };

    // Validate required fields
    if (!productData.name || !productData.category || !productData.size || 
        !productData.color || !productData.rentalPrice) {
        alert('Please fill in all required fields');
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

// Load Functions (placeholder for future implementation)
function loadProducts() {
    // This would load products from backend
    console.log('Loading products...');
}

function loadAdditionals() {
    // This would load additionals from backend
    console.log('Loading additionals...');
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
