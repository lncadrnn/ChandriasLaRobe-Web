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
let editFrontImageData = null;
let editBackImageData = null;

// Firebase integration variables
let firebaseProducts = [];
let firebaseAdditionals = [];
let isFirebaseConnected = false;

/**
 * Enhanced Loading and Auto-Refresh System
 */

// Loading overlay functions
function showInventoryLoading(message = 'Processing...', subtitle = 'Please wait') {
    const overlay = document.getElementById('inventoryLoadingOverlay');
    const text = overlay.querySelector('.inventory-loading-text');
    const subtitleEl = overlay.querySelector('.inventory-loading-subtitle');
    
    text.textContent = message;
    subtitleEl.textContent = subtitle;
    
    // Reset states
    overlay.classList.remove('success', 'error');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log(`🔄 Loading: ${message}`);
}

function hideInventoryLoading(delay = 500) {
    setTimeout(() => {
        const overlay = document.getElementById('inventoryLoadingOverlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }, delay);
}

function showInventorySuccess(message = 'Success!', subtitle = 'Operation completed', duration = 1500) {
    const overlay = document.getElementById('inventoryLoadingOverlay');
    const text = overlay.querySelector('.inventory-loading-text');
    const subtitleEl = overlay.querySelector('.inventory-loading-subtitle');
    
    text.textContent = message;
    subtitleEl.textContent = subtitle;
    overlay.classList.add('success');
    
    console.log(`✅ Success: ${message}`);
    
    setTimeout(() => {
        hideInventoryLoading(200);
    }, duration);
}

function showInventoryError(message = 'Error occurred', subtitle = 'Please try again', duration = 2000) {
    const overlay = document.getElementById('inventoryLoadingOverlay');
    const text = overlay.querySelector('.inventory-loading-text');
    const subtitleEl = overlay.querySelector('.inventory-loading-subtitle');
    
    text.textContent = message;
    subtitleEl.textContent = subtitle;
    overlay.classList.add('error');
    
    console.error(`❌ Error: ${message}`);
    
    setTimeout(() => {
        hideInventoryLoading(200);
    }, duration);
}

// Auto-refresh indicator functions
function showAutoRefreshIndicator(message = 'Auto-refreshing...') {
    const indicator = document.getElementById('autoRefreshIndicator');
    const span = indicator.querySelector('span');
    span.textContent = message;
    indicator.classList.add('show');
}

function hideAutoRefreshIndicator(delay = 1000) {
    setTimeout(() => {
        const indicator = document.getElementById('autoRefreshIndicator');
        indicator.classList.remove('show');
    }, delay);
}

// Enhanced auto-refresh with visual feedback
async function autoRefreshInventory(operation = 'update') {
    try {
        // Show auto-refresh indicator
        showAutoRefreshIndicator(`Refreshing after ${operation}...`);
        
        // Add refreshing class to inventory lists
        const productsList = document.getElementById('productsList');
        const additionalsList = document.getElementById('additionalsList');
        
        if (productsList) productsList.classList.add('refreshing');
        if (additionalsList) additionalsList.classList.add('refreshing');
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Refresh data from Firebase if available
        if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
            console.log('🔄 Auto-refreshing from Firebase...');
            
            const [products, additionals] = await Promise.all([
                window.InventoryFetcher.fetchProducts(),
                window.InventoryFetcher.fetchAdditionals()
            ]);
            
            // Update global arrays
            sampleProducts.length = 0;
            sampleAdditionals.length = 0;
            sampleProducts.push(...products);
            sampleAdditionals.push(...additionals);
            
            console.log(`📊 Auto-refresh: ${products.length} products, ${additionals.length} additionals`);
        }
        
        // Refresh UI
        loadProducts();
        loadAdditionals();
        
        // Remove refreshing classes
        setTimeout(() => {
            if (productsList) productsList.classList.remove('refreshing');
            if (additionalsList) additionalsList.classList.remove('refreshing');
        }, 500);
        
        // Hide auto-refresh indicator
        hideAutoRefreshIndicator(800);
        
        console.log('✅ Auto-refresh completed successfully');
        
    } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
        
        // Remove refreshing classes on error
        const productsList = document.getElementById('productsList');
        const additionalsList = document.getElementById('additionalsList');
        if (productsList) productsList.classList.remove('refreshing');
        if (additionalsList) additionalsList.classList.remove('refreshing');
        
        hideAutoRefreshIndicator(500);
        
        // Show error notification
        if (window.notyf) {
            window.notyf.error('Auto-refresh failed. Data may not be current.');
        }
    }
}

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

// Enhanced save product function to use Firebase
async function saveProductToFirebase(productData) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Saving product to Firebase:', productData);
        
        // Validate that Cloudinary images are present
        if (!productData.frontImageUrl || !productData.frontImageId || 
            !productData.backImageUrl || !productData.backImageId) {
            throw new Error('Missing Cloudinary image data. Please upload and crop both images before saving.');
        }
          // Use the new addProduct method from InventoryFetcher
        const savedProduct = await window.InventoryFetcher.addProduct(productData);
        
        console.log('Product saved to Firebase successfully');
        
        return savedProduct;
          } catch (error) {
        console.error('Error saving product to Firebase:', error);
        throw error;
    }
}

// Enhanced delete product function to use Firebase with Cloudinary cleanup
async function deleteProductFromFirebase(productId) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Deleting product from Firebase:', productId);
        
        // Step 1: Get product data to find image IDs
        const productData = await window.InventoryFetcher.fetchProductById(productId);
        
        // Step 2: Delete images from Cloudinary if they exist
        if (productData) {
            const deletePromises = [];
            
            if (productData.frontImageId) {
                console.log('Deleting front image from Cloudinary:', productData.frontImageId);
                deletePromises.push(
                    window.deleteImageFromCloudinary(productData.frontImageId)
                        .catch(error => console.warn('Failed to delete front image from Cloudinary:', error))
                );
            }
            
            if (productData.backImageId) {
                console.log('Deleting back image from Cloudinary:', productData.backImageId);
                deletePromises.push(
                    window.deleteImageFromCloudinary(productData.backImageId)
                        .catch(error => console.warn('Failed to delete back image from Cloudinary:', error))
                );
            }
            
            // Wait for image deletions (but don't fail if they error)
            await Promise.allSettled(deletePromises);
        }
        
        // Step 3: Delete product from Firebase
        await window.InventoryFetcher.deleteProduct(productId);
        
        // Step 4: Remove from local array
        const index = sampleProducts.findIndex(p => p.id === productId);
        if (index > -1) {
            sampleProducts.splice(index, 1);
        }
          // Step 5: Refresh UI
        loadProducts();
        
        console.log('Product and associated images deleted successfully');
        
        return true;
        
    } catch (error) {
        console.error('Error deleting product from Firebase:', error);
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
        
        return savedAdditional;
        
    } catch (error) {
        console.error('Error saving additional to Firebase:', error);
        throw error;
    }
}

// Enhanced delete additional function to use Firebase with Cloudinary cleanup
async function deleteAdditionalFromFirebase(additionalId) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Deleting additional from Firebase:', additionalId);
        
        // Step 1: Get additional data to find image ID
        const additionalData = await window.InventoryFetcher.fetchAdditionalById(additionalId);
          // Step 2: Delete image from Cloudinary if it exists
        if (additionalData && additionalData.imageId) {
            console.log('Deleting additional image from Cloudinary:', additionalData.imageId);
            try {
                await window.deleteImageFromCloudinary(additionalData.imageId);
            } catch (error) {
                console.warn('Failed to delete additional image from Cloudinary:', error);
            }
        }
        
        // Step 3: Delete additional from Firebase
        await window.InventoryFetcher.deleteAdditional(additionalId);
        
        // Step 4: Remove from local array
        const index = sampleAdditionals.findIndex(a => a.id === additionalId);
        if (index > -1) {
            sampleAdditionals.splice(index, 1);
        }
        
        // Step 5: Refresh UI        loadAdditionals();
        
        console.log('Additional and associated image deleted successfully');
        
        return true;
        
    } catch (error) {
        console.error('Error deleting additional from Firebase:', error);
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

    // Edit Product Modal
    const editProductModal = document.getElementById('editProductModal');
    const closeEditProductModal = document.getElementById('closeEditProductModal');
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');

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

    // Edit Product Modal Events
    if (closeEditProductModal) {
        closeEditProductModal.addEventListener('click', () => {
            closeModal(editProductModal);
        });
    }

    if (cancelEditProductBtn) {
        cancelEditProductBtn.addEventListener('click', () => {
            closeModal(editProductModal);
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
    const saveAdditionalBtn = document.getElementById('saveAdditionalBtn');
    const updateProductBtn = document.getElementById('updateProductBtn');

    // Note: saveProductBtn event listener is handled in setupProductForm()

    if (saveAdditionalBtn) {
        saveAdditionalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveAdditional();
        });
    }

    if (updateProductBtn) {
        updateProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateProduct();
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
    // Validate Cloudinary image upload first - check for both URL and public_id
    if (!frontImageData || !frontImageData.url || !frontImageData.publicId ||
        !backImageData || !backImageData.url || !backImageData.publicId) {
        
        console.warn('❌ Image validation failed:');
        console.log('Front image data:', frontImageData);
        console.log('Back image data:', backImageData);
        
        if (window.showErrorModal) {
            window.showErrorModal('Please upload and crop both front and back images before saving.');
        } else {
            alert('Please upload and crop both front and back images before saving.');
        }
        return;
    }
    
    console.log('✅ Image validation passed');
    console.log('Front image:', frontImageData.url);
    console.log('Back image:', backImageData.url);

    const form = document.getElementById('addProductForm');
    // Get selected sizes with stock quantities
    const sizeCheckboxes = form.querySelectorAll('.size-checkboxes input[type="checkbox"]:checked');
    
    if (sizeCheckboxes.length === 0) {
        if (window.showErrorModal) {
            window.showErrorModal('Please select at least one size');
        } else {
            alert('Please select at least one size');
        }
        return;
    }

    // Collect form data (now matches old admin structure)
    const productData = collectFormData();

    // Validate required fields
    if (!productData.name || !productData.category || !productData.sleeve || !productData.price) {
        if (window.showErrorModal) {
            window.showErrorModal('Please fill in all required fields');
        } else {
            alert('Please fill in all required fields');
        }
        return;
    }

    // Show loading spinner
    showInventoryLoading('Saving Product...', 'Please wait while we save your product');

    // Use Firebase to save product if available
    if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
        // Use Firebase to save
        console.log('🔄 Attempting to save product to Firebase...');
        saveProductToFirebase(productData).then(result => {
            if (result) {
                // Show success message
                showInventorySuccess('Product Saved!', 'Product has been added successfully');
                
                // Close modal and refresh data
                setTimeout(() => {
                    closeModal(document.getElementById('addProductModal'));
                    resetProductForm();
                    console.log('✅ Product saved successfully');
                    
                    // Auto-refresh inventory after successful save
                    autoRefreshInventory('add');
                }, 1500);
            }
        }).catch(error => {
            console.error('❌ Failed to save to Firebase:', error);
            // Provide detailed error information
            let errorMessage = 'Failed to save product to Firebase';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            showInventoryError('Save Failed', errorMessage);
        });
    } else {
        // Provide diagnostic information
        if (!window.InventoryFetcher) {
            console.warn('⚠️ InventoryFetcher not available - Firebase service not loaded');
        } else if (!window.InventoryFetcher.getConnectionStatus()) {
            console.warn('⚠️ Firebase not connected - using local storage fallback');
        }
        // Fallback to local storage
        console.log('💾 Saving product locally:', productData);
        const newProduct = {
            id: Date.now().toString(),
            ...productData
        };
        // Add to sample products array
        sampleProducts.unshift(newProduct);
        
        // Show success message
        showInventorySuccess('Product Saved!', 'Product has been added locally');
        
        // Close modal and refresh UI after delay
        setTimeout(() => {
            loadProducts();
            closeModal(document.getElementById('addProductModal'));
            resetProductForm();
            
            // Auto-refresh inventory after successful save
            autoRefreshInventory('add');
        }, 1500);
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
        if (window.showErrorModal) {
            window.showErrorModal('Please fill in all required fields');
        } else {
            alert('Please fill in all required fields');
        }
        return;
    }

    // Show loading spinner
    showInventoryLoading('Saving Additional...', 'Please wait while we save your additional item');

    // Use Firebase to save additional if available
    if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
        console.log('🔄 Attempting to save additional to Firebase...');
        saveAdditionalToFirebase(additionalData).then(result => {
            if (result) {
                // Show success message
                showInventorySuccess('Additional Saved!', 'Additional item has been added successfully');
                
                // Close modal and refresh after delay
                setTimeout(() => {
                    closeModal(document.getElementById('addAdditionalModal'));
                    
                    // Auto-refresh inventory after successful save
                    autoRefreshInventory('add');
                }, 1500);
            }
        }).catch(error => {
            console.error('❌ Failed to save additional to Firebase:', error);
            let errorMessage = 'Failed to save additional to Firebase';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            showInventoryError('Save Failed', errorMessage);
        });
    } else {
        // Fallback to local storage
        console.log('💾 Saving additional locally:', additionalData);
        const newAdditional = {
            id: Date.now().toString(),
            ...additionalData,
            dateAdded: new Date().toISOString()
        };
        
        // Add to sample additionals array
        sampleAdditionals.push(newAdditional);
        
        // Show success message
        showInventorySuccess('Additional Saved!', 'Additional item has been added locally');
        
        // Close modal and refresh UI after delay
        setTimeout(() => {
            closeModal(document.getElementById('addAdditionalModal'));
            
            // Auto-refresh inventory after successful save
            autoRefreshInventory('add');
        }, 1500);
    }
}

// Update Product Function
function updateProduct() {
    const productId = window.currentEditingProductId;
    if (!productId) {
        if (window.showErrorModal) {
            window.showErrorModal('No product selected for editing');
        } else {
            alert('No product selected for editing');
        }
        return;
    }

    const form = document.getElementById('editProductForm');
    const productData = collectEditFormData();

    // Validate required fields
    if (!productData.name || !productData.category || !productData.sleeve || !productData.price) {
        if (window.showErrorModal) {
            window.showErrorModal('Please fill in all required fields');
        } else {
            alert('Please fill in all required fields');
        }
        return;
    }

    // Get selected sizes with stock quantities
    const sizeCheckboxes = form.querySelectorAll('.size-checkboxes input[type="checkbox"]:checked');
    
    if (sizeCheckboxes.length === 0) {
        if (window.showErrorModal) {
            window.showErrorModal('Please select at least one size');
        } else {
            alert('Please select at least one size');
        }
        return;
    }

    // Show loading spinner
    showInventoryLoading('Updating Product...', 'Please wait while we update your product');

    // Use Firebase to update product if available
    if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
        console.log('🔄 Attempting to update product in Firebase...');
        updateProductInFirebase(productId, productData).then(result => {
            if (result) {
                // Show success message
                showInventorySuccess('Product Updated!', 'Product has been updated successfully');
                
                // Close modal and refresh data after delay
                setTimeout(() => {
                    closeModal(document.getElementById('editProductModal'));
                    resetEditProductForm();
                    console.log('✅ Product updated successfully');
                    
                    // Auto-refresh inventory after successful update
                    autoRefreshInventory('update');
                }, 1500);
            }
        }).catch(error => {
            console.error('❌ Failed to update in Firebase:', error);
            let errorMessage = 'Failed to update product in Firebase';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            showInventoryError('Update Failed', errorMessage);
        });
    } else {
        // Fallback to local storage
        console.log('💾 Updating product locally:', productData);
        const productIndex = sampleProducts.findIndex(p => p.id === productId);
        if (productIndex > -1) {
            // Update the product with new data while preserving ID
            sampleProducts[productIndex] = {
                ...sampleProducts[productIndex],
                ...productData,
                id: productId // Ensure ID is preserved
            };
            
            // Show success message
            showInventorySuccess('Product Updated!', 'Product has been updated locally');
            
            // Close modal and refresh UI after delay
            setTimeout(() => {
                loadProducts();
                closeModal(document.getElementById('editProductModal'));
                resetEditProductForm();
                
                // Auto-refresh inventory after successful update
                autoRefreshInventory('update');
            }, 1500);        } else {
            showInventoryError('Update Failed', 'Product not found in local storage');
        }
    }
}

// Function to collect data from edit form
function collectEditFormData() {
    const form = document.getElementById('editProductForm');
    const sizeCheckboxes = form.querySelectorAll('.size-checkboxes input[type="checkbox"]:checked');
    
    // Collect sizes with stock quantities
    const sizes = {};
    sizeCheckboxes.forEach(checkbox => {
        const size = checkbox.value;
        const stockInput = checkbox.closest('.checkbox-label').querySelector('.stock-input');
        const stock = parseInt(stockInput.value) || 1;
        sizes[size] = stock;
    });

    // Get color hex value
    const colorSelect = document.getElementById('editProductColor');
    const selectedOption = colorSelect.options[colorSelect.selectedIndex];
    const colorHex = selectedOption ? selectedOption.getAttribute('data-hex') : '#000000';

    // Get existing product data to preserve image URLs if no new images are uploaded
    const existingProduct = sampleProducts.find(p => p.id === window.currentEditingProductId);

    return {
        name: document.getElementById('editProductName').value.trim(),
        category: document.getElementById('editProductCategory').value,
        color: document.getElementById('editProductColor').value,
        colorHex: colorHex,
        price: parseFloat(document.getElementById('editProductRentalPrice').value) || 0,
        rentalPrice: parseFloat(document.getElementById('editProductRentalPrice').value) || 0,
        sleeve: document.getElementById('editProductSleeves').value,
        sleeves: document.getElementById('editProductSleeves').value,
        sizes: sizes,
        description: document.getElementById('editProductDescription').value.trim(),
        // Preserve existing image URLs and IDs if no new images are uploaded
        frontImageUrl: editFrontImageData ? editFrontImageData.url : (existingProduct ? existingProduct.frontImageUrl : null),
        frontImageId: editFrontImageData ? editFrontImageData.publicId : (existingProduct ? existingProduct.frontImageId : null),
        backImageUrl: editBackImageData ? editBackImageData.url : (existingProduct ? existingProduct.backImageUrl : null),
        backImageId: editBackImageData ? editBackImageData.publicId : (existingProduct ? existingProduct.backImageId : null),
        status: 'available' // Default status
    };
}

// Enhanced update product function to use Firebase
async function updateProductInFirebase(productId, productData) {
    try {
        if (!window.InventoryFetcher) {
            throw new Error('Firebase service not available');
        }
        
        console.log('Updating product in Firebase:', productId, productData);
        
        // Use the updateProduct method from InventoryFetcher
        const updatedProduct = await window.InventoryFetcher.updateProduct(productId, productData);
        
        // Update local array
        const index = sampleProducts.findIndex(p => p.id === productId);
        if (index > -1) {
            sampleProducts[index] = updatedProduct;
        }
        
        // Refresh UI
        loadProducts();
        
        console.log('Product updated in Firebase successfully');
        
        return updatedProduct;
        
    } catch (error) {
        console.error('Error updating product in Firebase:', error);
        throw error;
    }
}

// Function to reset edit product form
function resetEditProductForm() {
    const form = document.getElementById('editProductForm');
    if (form) {
        form.reset();
    }
    
    // Clear image data
    editFrontImageData = null;
    editBackImageData = null;
    
    // Reset image previews
    const editFrontPreview = document.getElementById('editFrontPreview');
    const editBackPreview = document.getElementById('editBackPreview');
    const editFrontPlaceholder = document.getElementById('editFrontPlaceholder');
    const editBackPlaceholder = document.getElementById('editBackPlaceholder');
    
    if (editFrontPreview) editFrontPreview.style.display = 'none';
    if (editBackPreview) editBackPreview.style.display = 'none';
    if (editFrontPlaceholder) editFrontPlaceholder.style.display = 'flex';
    if (editBackPlaceholder) editBackPlaceholder.style.display = 'flex';
    
    // Clear current editing ID
    delete window.currentEditingProductId;
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
                        </div>                    `}
                    <!-- <div class="status-badge ${product.status}">${getStatusText(product.status)}</div> -->
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
    }
    
    additionalsList.innerHTML = sampleAdditionals.map(additional => `
        <div class="additional-item card_article" data-id="${additional.id}">
            <div class="card_data">
                <div class="additional-image">
                    ${additional.imageUrl ? `
                        <img src="${additional.imageUrl}" alt="${additional.name}" class="card_img" loading="lazy">
                    ` : `
                        <div class="image-placeholder">
                            <i class='bx bxs-diamond'></i>
                            <span class="placeholder-text">Additional Image</span>
                        </div>                    `}
                    <!-- <div class="status-badge ${additional.status}">${getStatusText(additional.status)}</div> -->
                    <div class="color-indicator" style="background-color: ${additional.colorHex || additional.color}" title="${additional.color}" onclick="openColorPicker('additional', ${additional.id}, '${additional.colorHex || additional.color}')">
                    </div>
                </div>
                <h2 class="card_title additional-title">${additional.name}</h2>
                <p class="card_info">Price: ₱${additional.rentalPrice ? additional.rentalPrice.toLocaleString() : (additional.price ? additional.price.toLocaleString() : '0')}</p>
                <p class="card_info">
                    ${additional.inclusions && additional.inclusions.length ? "With Inclusion" : "Without Inclusion"}
                </p>
                <span class="card_category">${additional.code || getTypeText(additional.type)}</span>
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

// Action functions
function editProduct(id) {
    const product = sampleProducts.find(p => p.id === id);
    if (!product) {
        if (window.notyf) {
            window.notyf.error('Product not found');
        }
        return;
    }

    // Populate the edit form with current product data
    populateEditProductForm(product);
    
    // Store the product ID for later use
    window.currentEditingProductId = id;
    
    // Open the edit modal
    const editModal = document.getElementById('editProductModal');
    openModal(editModal);
}

// Function to populate the edit form with product data
function populateEditProductForm(product) {
    // Basic information
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductCode').value = product.code || '';
    document.getElementById('editProductCategory').value = product.category || '';
    document.getElementById('editProductColor').value = product.color || '';
    document.getElementById('editProductRentalPrice').value = product.rentalPrice || product.price || '';
    document.getElementById('editProductSleeves').value = product.sleeves || product.sleeve || '';
    document.getElementById('editProductDescription').value = product.description || '';

    // Handle sizes and stock
    populateEditSizes(product.sizes || product.size);
    
    // Handle images
    populateEditImages(product);
}

// Function to populate sizes in edit form
function populateEditSizes(sizes) {
    const editSizeCheckboxes = document.getElementById('editSizeCheckboxes');
    const checkboxes = editSizeCheckboxes.querySelectorAll('input[type="checkbox"]');
    const stockInputs = editSizeCheckboxes.querySelectorAll('.stock-input');

    // Reset all checkboxes and stock inputs
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const stockInput = checkbox.closest('.checkbox-label').querySelector('.stock-input');
        stockInput.style.display = 'none';
        stockInput.value = '';
    });

    // Handle different size formats
    if (typeof sizes === 'object' && !Array.isArray(sizes)) {
        // Handle object format {size: stock}
        Object.entries(sizes).forEach(([size, stock]) => {
            const checkbox = Array.from(checkboxes).find(cb => cb.value === size);
            if (checkbox) {
                checkbox.checked = true;
                const stockInput = checkbox.closest('.checkbox-label').querySelector('.stock-input');
                stockInput.style.display = 'block';
                stockInput.value = stock;
            }
        });
    } else if (Array.isArray(sizes)) {
        // Handle array format
        sizes.forEach(size => {
            const checkbox = Array.from(checkboxes).find(cb => cb.value === size);
            if (checkbox) {
                checkbox.checked = true;
                const stockInput = checkbox.closest('.checkbox-label').querySelector('.stock-input');
                stockInput.style.display = 'block';
                stockInput.value = 1; // Default stock
            }
        });
    }
}

// Function to populate images in edit form
function populateEditImages(product) {
    // Clear any existing image data
    window.editFrontImageData = null;
    window.editBackImageData = null;

    // Reset image previews
    const editFrontPreview = document.getElementById('editFrontPreview');
    const editBackPreview = document.getElementById('editBackPreview');
    const editFrontPlaceholder = document.getElementById('editFrontPlaceholder');
    const editBackPlaceholder = document.getElementById('editBackPlaceholder');

    // Hide previews and show placeholders by default
    editFrontPreview.style.display = 'none';
    editBackPreview.style.display = 'none';
    editFrontPlaceholder.style.display = 'flex';
    editBackPlaceholder.style.display = 'flex';

    // If product has front image, show it
    if (product.frontImageUrl) {
        const editFrontImage = document.getElementById('editFrontImage');
        editFrontImage.src = product.frontImageUrl;
        editFrontPlaceholder.style.display = 'none';
        editFrontPreview.style.display = 'block';
        
        // Store the existing image data
        window.editFrontImageData = {
            url: product.frontImageUrl,
            publicId: product.frontImageId
        };
    }

    // If product has back image, show it
    if (product.backImageUrl) {
        const editBackImage = document.getElementById('editBackImage');
        editBackImage.src = product.backImageUrl;
        editBackPlaceholder.style.display = 'none';
        editBackPreview.style.display = 'block';
        
        // Store the existing image data
        window.editBackImageData = {
            url: product.backImageUrl,
            publicId: product.backImageId
        };
    }
}

function deleteProduct(id) {
    const product = sampleProducts.find(p => p.id === id);
    if (!product) {
        if (window.notyf) {
            window.notyf.error('Product not found');
        }
        return;
    }

    // Show custom confirmation dialog
    showDeleteConfirmationModal(
        `Are you sure you want to delete "${product.name}"?`, 
        'This action cannot be undone. The product will be permanently removed from your inventory.',        () => {
            // User confirmed deletion
            // Show loading spinner
            showInventoryLoading('Deleting Product...', 'Please wait while we remove the product');
            
            if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
                // Use Firebase to delete
                deleteProductFromFirebase(id).then(() => {
                    // Show success message
                    showInventorySuccess('Product Deleted!', 'Product has been removed successfully');
                    
                    // Auto-refresh inventory after successful delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                }).catch(error => {
                    console.error('Failed to delete from Firebase:', error);
                    // Fallback to local delete
                    const index = sampleProducts.findIndex(p => p.id === id);
                    if (index > -1) {
                        sampleProducts.splice(index, 1);
                        showInventorySuccess('Product Deleted!', 'Product removed locally (Firebase unavailable)');
                        
                        // Auto-refresh inventory after fallback delete
                        setTimeout(() => {
                            autoRefreshInventory('delete');
                        }, 1500);
                    } else {
                        showInventoryError('Delete Failed', 'Product not found in local storage');
                    }
                });
            } else {
                // Local delete fallback
                const index = sampleProducts.findIndex(p => p.id === id);
                if (index > -1) {
                    sampleProducts.splice(index, 1);
                    showInventorySuccess('Product Deleted!', 'Product has been removed locally');
                    
                    // Auto-refresh inventory after local delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                } else {
                    showInventoryError('Delete Failed', 'Product not found');
                }
            }
        }
    );
}

function editAdditional(id) {
    const additional = sampleAdditionals.find(a => a.id === id);
    if (!additional) {
        if (window.notyf) {
            window.notyf.error('Additional not found');
        }
        return;
    }

    // Populate the edit form with current additional data
    populateEditAdditionalForm(additional);
    
    // Store the additional ID for later use
    window.currentEditingAdditionalId = id;
    
    // Open the edit modal
    const editModal = document.getElementById('editAdditionalModal');
    openModal(editModal);
}

// Function to populate the edit form with additional data
function populateEditAdditionalForm(additional) {
    // Basic information
    document.getElementById('editAdditionalName').value = additional.name || '';
    document.getElementById('editAdditionalCode').value = additional.code || '';
    document.getElementById('editAdditionalType').value = additional.type || '';
    document.getElementById('editAdditionalColor').value = additional.color || '';
    document.getElementById('editAdditionalRentalPrice').value = additional.rentalPrice || additional.price || '';
    document.getElementById('editAdditionalDescription').value = additional.description || '';

    // Handle image
    populateEditAdditionalImage(additional);
}

// Function to populate image in edit form
function populateEditAdditionalImage(additional) {
    // Clear any existing image data
    window.editAdditionalImageData = null;

    // Reset image preview
    const editImagePreview = document.getElementById('editAdditionalImagePreview');
    const editImagePlaceholder = document.getElementById('editAdditionalImagePlaceholder');

    // Hide preview and show placeholder by default
    editImagePreview.style.display = 'none';
    editImagePlaceholder.style.display = 'flex';

    // If additional has image, show it
    if (additional.imageUrl) {
        const editImage = document.getElementById('editAdditionalImage');
        editImage.src = additional.imageUrl;
        editImagePlaceholder.style.display = 'none';
        editImagePreview.style.display = 'block';
        
        // Store the existing image data
        window.editAdditionalImageData = {
            url: additional.imageUrl,
            publicId: additional.imageId
        };
    }
}

function deleteProduct(id) {
    const product = sampleProducts.find(p => p.id === id);
    if (!product) {
        if (window.notyf) {
            window.notyf.error('Product not found');
        }
        return;
    }

    // Show custom confirmation dialog
    showDeleteConfirmationModal(
        `Are you sure you want to delete "${product.name}"?`, 
        'This action cannot be undone. The product will be permanently removed from your inventory.',        () => {
            // User confirmed deletion
            // Show loading spinner
            showInventoryLoading('Deleting Product...', 'Please wait while we remove the product');
            
            if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
                // Use Firebase to delete
                deleteProductFromFirebase(id).then(() => {
                    // Show success message
                    showInventorySuccess('Product Deleted!', 'Product has been removed successfully');
                    
                    // Auto-refresh inventory after successful delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                }).catch(error => {
                    console.error('Failed to delete from Firebase:', error);
                    // Fallback to local delete
                    const index = sampleProducts.findIndex(p => p.id === id);
                    if (index > -1) {
                        sampleProducts.splice(index, 1);
                        showInventorySuccess('Product Deleted!', 'Product removed locally (Firebase unavailable)');
                        
                        // Auto-refresh inventory after fallback delete
                        setTimeout(() => {
                            autoRefreshInventory('delete');
                        }, 1500);
                    } else {
                        showInventoryError('Delete Failed', 'Product not found in local storage');
                    }
                });
            } else {
                // Local delete fallback
                const index = sampleProducts.findIndex(p => p.id === id);
                if (index > -1) {
                    sampleProducts.splice(index, 1);
                    showInventorySuccess('Product Deleted!', 'Product has been removed locally');
                    
                    // Auto-refresh inventory after local delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                } else {
                    showInventoryError('Delete Failed', 'Product not found');
                }
            }
        }
    );
}

function editAdditional(id) {
    const additional = sampleAdditionals.find(a => a.id === id);
    if (!additional) {
        if (window.notyf) {
            window.notyf.error('Additional not found');
        }
        return;
    }

    // Populate the edit form with current additional data
    populateEditAdditionalForm(additional);
    
    // Store the additional ID for later use
    window.currentEditingAdditionalId = id;
    
    // Open the edit modal
    const editModal = document.getElementById('editAdditionalModal');
    openModal(editModal);
}

// Function to populate the edit form with additional data
function populateEditAdditionalForm(additional) {
    // Basic information
    document.getElementById('editAdditionalName').value = additional.name || '';
    document.getElementById('editAdditionalCode').value = additional.code || '';
    document.getElementById('editAdditionalType').value = additional.type || '';
    document.getElementById('editAdditionalColor').value = additional.color || '';
    document.getElementById('editAdditionalRentalPrice').value = additional.rentalPrice || additional.price || '';
    document.getElementById('editAdditionalDescription').value = additional.description || '';

    // Handle image
    populateEditAdditionalImage(additional);
}

// Function to populate image in edit form
function populateEditAdditionalImage(additional) {
    // Clear any existing image data
    window.editAdditionalImageData = null;

    // Reset image preview
    const editImagePreview = document.getElementById('editAdditionalImagePreview');
    const editImagePlaceholder = document.getElementById('editAdditionalImagePlaceholder');

    // Hide preview and show placeholder by default
    editImagePreview.style.display = 'none';
    editImagePlaceholder.style.display = 'flex';

    // If additional has image, show it
    if (additional.imageUrl) {
        const editImage = document.getElementById('editAdditionalImage');
        editImage.src = additional.imageUrl;
        editImagePlaceholder.style.display = 'none';
        editImagePreview.style.display = 'block';
        
        // Store the existing image data
        window.editAdditionalImageData = {
            url: additional.imageUrl,
            publicId: additional.imageId
        };
    }
}

function deleteAdditional(id) {
    const additional = sampleAdditionals.find(a => a.id === id);
    if (!additional) {
        if (window.notyf) {
            window.notyf.error('Additional not found');
        }
        return;
    }

    // Show custom confirmation dialog
    showDeleteConfirmationModal(
        `Are you sure you want to delete "${additional.name}"?`, 
        'This action cannot be undone. The additional item will be permanently removed from your inventory.',        () => {
            // User confirmed deletion
            // Show loading spinner
            showInventoryLoading('Deleting Additional...', 'Please wait while we remove the additional item');
            
            if (window.InventoryFetcher && window.InventoryFetcher.getConnectionStatus()) {
                // Use Firebase to delete
                deleteAdditionalFromFirebase(id).then(() => {
                    // Show success message
                    showInventorySuccess('Additional Deleted!', 'Additional item has been removed successfully');
                    
                    // Auto-refresh inventory after successful delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                }).catch(error => {
                    console.error('Failed to delete from Firebase:', error);
                    // Fallback to local delete
                    const index = sampleAdditionals.findIndex(a => a.id === id);
                    if (index > -1) {
                        sampleAdditionals.splice(index, 1);
                        showInventorySuccess('Additional Deleted!', 'Additional removed locally (Firebase unavailable)');
                        
                        // Auto-refresh inventory after fallback delete
                        setTimeout(() => {
                            autoRefreshInventory('delete');
                        }, 1500);
                    } else {
                        showInventoryError('Delete Failed', 'Additional not found in local storage');
                    }
                });
            } else {
                // Local delete fallback
                const index = sampleAdditionals.findIndex(a => a.id === id);
                if (index > -1) {
                    sampleAdditionals.splice(index, 1);
                    showInventorySuccess('Additional Deleted!', 'Additional item has been removed locally');
                    
                    // Auto-refresh inventory after local delete
                    setTimeout(() => {
                        autoRefreshInventory('delete');
                    }, 1500);
                } else {
                    showInventoryError('Delete Failed', 'Additional not found');
                }
            }
        }
    );
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
    console.log('🔧 Initializing image upload functionality...');
    
    // Front image upload (Add form)
    const frontZone = document.getElementById('frontImageZone');
    const frontInput = document.getElementById('frontImageInput');
    const frontPlaceholder = document.getElementById('frontPlaceholder');
    const frontPreview = document.getElementById('frontPreview');
    
    // Back image upload (Add form)
    const backZone = document.getElementById('backImageZone');
    const backInput = document.getElementById('backImageInput');
    const backPlaceholder = document.getElementById('backPlaceholder');
    const backPreview = document.getElementById('backPreview');

    // Edit Front image upload (Edit form)
    const editFrontZone = document.getElementById('editFrontImageZone');
    const editFrontInput = document.getElementById('editFrontImageInput');
    const editFrontPlaceholder = document.getElementById('editFrontPlaceholder');
    const editFrontPreview = document.getElementById('editFrontPreview');
    
    // Edit Back image upload (Edit form)
    const editBackZone = document.getElementById('editBackImageZone');
    const editBackInput = document.getElementById('editBackImageInput');
    const editBackPlaceholder = document.getElementById('editBackPlaceholder');
    const editBackPreview = document.getElementById('editBackPreview');
    
    // Check if all elements exist
    console.log('🔍 Element check:', {
        frontZone: !!frontZone,
        frontInput: !!frontInput,
        frontPlaceholder: !!frontPlaceholder,
        frontPreview: !!frontPreview,
        backZone: !!backZone,
        backInput: !!backInput,
        backPlaceholder: !!backPlaceholder,
        backPreview: !!backPreview,
        editFrontZone: !!editFrontZone,
        editFrontInput: !!editFrontInput,
        editFrontPlaceholder: !!editFrontPlaceholder,
        editFrontPreview: !!editFrontPreview,
        editBackZone: !!editBackZone,
        editBackInput: !!editBackInput,
        editBackPlaceholder: !!editBackPlaceholder,
        editBackPreview: !!editBackPreview
    });
    
    if (!frontZone || !frontInput || !backZone || !backInput) {
        console.error('❌ Missing required image upload elements for add form');
        return;
    }
    
    // Setup add form image uploads
    setupImageUpload(frontZone, frontInput, frontPlaceholder, frontPreview, 'front');
    setupImageUpload(backZone, backInput, backPlaceholder, backPreview, 'back');
    
    // Setup edit form image uploads if elements exist
    if (editFrontZone && editFrontInput && editBackZone && editBackInput) {
        setupImageUpload(editFrontZone, editFrontInput, editFrontPlaceholder, editFrontPreview, 'editFront');
        setupImageUpload(editBackZone, editBackInput, editBackPlaceholder, editBackPreview, 'editBack');
        console.log('✅ Edit form image upload functionality initialized');
    } else {
        console.warn('⚠️ Edit form image upload elements not found, skipping edit form setup');
    }
    
    console.log('✅ Image upload functionality initialized successfully');
}

// Setup individual image upload zone
function setupImageUpload(zone, input, placeholder, preview, type) {
    console.log(`🔧 Setting up ${type} image upload...`);
    
    if (!zone || !input) {
        console.error(`❌ Missing elements for ${type} image upload`);
        return;
    }
    
    // Click to upload
    zone.addEventListener('click', (e) => {
        if (e.target.closest('.image-actions')) return;
        console.log(`📁 ${type} zone clicked, opening file dialog...`);
        input.click();
    });
    
    // File input change
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        console.log(`📁 ${type} file selected:`, file ? file.name : 'none');
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
            console.log(`📁 ${type} file dropped:`, file.name);
            if (file.type.startsWith('image/')) {
                handleImageFile(file, placeholder, preview, type);
            }
        }
    });
    
    console.log(`✅ ${type} image upload setup complete`);
}

// Handle image file upload
function handleImageFile(file, placeholder, preview, type) {
    console.log(`🖼️ Handling ${type} image file:`, {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        console.error(`❌ ${type} file too large:`, file.size);
        if (window.notyf) {
            window.notyf.error('File size must be less than 5MB');
        } else {
            alert('File size must be less than 5MB');
        }
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.error(`❌ ${type} invalid file type:`, file.type);
        if (window.notyf) {
            window.notyf.error('Please select a valid image file');
        } else {
            alert('Please select a valid image file');
        }
        return;
    }
    
    console.log(`✅ ${type} file validation passed`);
    
    // Show loading state
    showImageUploadProgress(type, 'Preparing image...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log(`📖 ${type} file read successfully`);
          // Store image data
        if (type === 'front') {
            frontImageData = e.target.result;
            console.log('📥 Front image data stored');
        } else if (type === 'back') {
            backImageData = e.target.result;
            console.log('📥 Back image data stored');
        } else if (type === 'editFront') {
            editFrontImageData = { url: e.target.result };
            console.log('📥 Edit front image data stored');
        } else if (type === 'editBack') {
            editBackImageData = { url: e.target.result };
            console.log('📥 Edit back image data stored');
        }
        
        // Hide loading progress
        hideImageUploadProgress(type);
        
        // Automatically open crop modal when image is uploaded
        console.log(`🔄 Opening cropper for ${type} image...`);
        setTimeout(() => {
            openImageCropper(type);
        }, 100);
    };
    
    reader.onerror = (error) => {
        console.error(`❌ Error reading ${type} file:`, error);
        hideImageUploadProgress(type);
        if (window.notyf) {
            window.notyf.error('Error reading image file');
        }
    };
    
    reader.readAsDataURL(file);
}

// Remove image
function removeImage(type) {
    const placeholder = document.getElementById(`${type}Placeholder`);
    const preview = document.getElementById(`${type}Preview`);
    const input = document.getElementById(`${type}ImageInput`);
    
    // Clear data based on type
    if (type === 'front') {
        frontImageData = null;
    } else if (type === 'back') {
        backImageData = null;
    } else if (type === 'editFront') {
        editFrontImageData = null;
    } else if (type === 'editBack') {
        editBackImageData = null;
    }
    
    // Reset input
    if (input) {
        input.value = '';
    }
    
    // Show placeholder, hide preview
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    if (preview) {
        preview.style.display = 'none';
    }
}

// Open image cropper
function openImageCropper(type) {
    console.log(`✂️ Opening cropper for ${type} image...`);
    
    currentImageType = type;
    let imageData;
    
    if (type === 'front') {
        imageData = frontImageData;
    } else if (type === 'back') {
        imageData = backImageData;
    } else if (type === 'editFront') {
        imageData = editFrontImageData ? editFrontImageData.url : null;
    } else if (type === 'editBack') {
        imageData = editBackImageData ? editBackImageData.url : null;
    }
    
    if (!imageData) {
        console.error(`❌ No ${type} image data available for cropping`);
        alert('Please upload an image first');
        return;
    }
    
    const cropperModal = document.getElementById('imageCropperModal');
    const cropperImage = document.getElementById('cropperImage');
    
    if (!cropperModal || !cropperImage) {
        console.error('❌ Cropper modal elements not found');
        return;
    }
    
    // Set image source
    cropperImage.src = imageData;
    console.log(`🖼️ Set ${type} image source for cropper`);
    
    // Show modal
    cropperModal.classList.add('active');
    console.log('📱 Cropper modal opened');
    
    // Initialize cropper after image loads
    cropperImage.onload = function() {
        console.log('🔄 Initializing cropper...');
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

// Apply crop and save result with Cloudinary upload
async function applyCrop() {
    if (!currentCropper || !currentImageType) {
        if (window.notyf) {
            window.notyf.error('No image to crop');
        } else {
            alert('No image to crop');
        }
        return;
    }
    
    try {
        showImageUploadProgress(currentImageType, 'Cropping image...');
        
        // Get cropped canvas with fixed dimensions for portrait (3:4 ratio)
        const canvas = currentCropper.getCroppedCanvas({
            width: 400,   // Fixed width
            height: 533,  // Fixed height (3:4 ratio: 400 * 4/3 = 533)
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        
        // Convert canvas to blob for Cloudinary upload
        canvas.toBlob(async (blob) => {
            try {
                showImageUploadProgress(currentImageType, 'Uploading to Cloudinary...');
                
                // Upload to Cloudinary
                const uploadResult = await uploadImageToCloudinary(blob, 'inventory/products');
                  if (uploadResult.success) {
                    // Store Cloudinary URL instead of base64 data
                    const imageData = {
                        url: uploadResult.url,
                        publicId: uploadResult.public_id,  // Make sure this matches the property used in saveProduct
                        localData: canvas.toDataURL('image/jpeg', 0.9) // Keep for preview
                    };
                      // Update the image data
                    if (currentImageType === 'front') {
                        frontImageData = imageData;
                        updateImagePreview('front', imageData.localData);
                        console.log('✅ Front image data updated:', frontImageData);
                    } else if (currentImageType === 'back') {
                        backImageData = imageData;
                        updateImagePreview('back', imageData.localData);
                        console.log('✅ Back image data updated:', backImageData);
                    } else if (currentImageType === 'editFront') {
                        editFrontImageData = imageData;
                        updateImagePreview('editFront', imageData.localData);
                        console.log('✅ Edit front image data updated:', editFrontImageData);
                    } else if (currentImageType === 'editBack') {
                        editBackImageData = imageData;
                        updateImagePreview('editBack', imageData.localData);
                        console.log('✅ Edit back image data updated:', editBackImageData);
                    }
                    
                    hideImageUploadProgress(currentImageType);
                      if (window.notyf) {
                        window.notyf.success('Image uploaded successfully');
                    }
                    
                    console.log('Image uploaded to Cloudinary:', uploadResult.url);
                } else {
                    throw new Error(uploadResult.error || 'Upload failed');
                }
                
                // Close modal
                closeCropperModal();
                
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                hideImageUploadProgress(currentImageType);
                
                if (window.notyf) {
                    window.notyf.error('Failed to upload image to Cloudinary, saving locally');
                }
                  // Fallback: save locally with consistent structure
                const localData = canvas.toDataURL('image/jpeg', 0.9);
                const fallbackImageData = { 
                    localData, 
                    url: null, 
                    publicId: null 
                };
                  if (currentImageType === 'front') {
                    frontImageData = fallbackImageData;
                    updateImagePreview('front', localData);
                    console.log('⚠️ Front image saved locally (fallback):', frontImageData);
                } else if (currentImageType === 'back') {
                    backImageData = fallbackImageData;
                    updateImagePreview('back', localData);
                    console.log('⚠️ Back image saved locally (fallback):', backImageData);
                } else if (currentImageType === 'editFront') {
                    editFrontImageData = fallbackImageData;
                    updateImagePreview('editFront', localData);
                    console.log('⚠️ Edit front image saved locally (fallback):', editFrontImageData);
                } else if (currentImageType === 'editBack') {
                    editBackImageData = fallbackImageData;
                    updateImagePreview('editBack', localData);
                    console.log('⚠️ Edit back image saved locally (fallback):', editBackImageData);
                }
                closeCropperModal();
            }
        }, 'image/jpeg', 0.9);
        
    } catch (error) {
        console.error('Error cropping image:', error);
        hideImageUploadProgress(currentImageType);
        if (window.notyf) {
            window.notyf.error('Error cropping image. Please try again.');
        } else {
            alert('Error cropping image. Please try again.');
        }
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
function collectFormData() {
    const getSelectedSizes = () => {
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
    
    // Build product data matching the old admin structure exactly
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        code: document.getElementById('productCode').value,
        price: parseFloat(document.getElementById('productRentalPrice').value),
        size: getSelectedSizes(), // Match old admin field name
        color: getColorHex(),
        sleeve: document.getElementById('productSleeves').value, // Match old admin field name
        description: document.getElementById('productDescription').value.trim(),
        createdAt: new Date()
    };
    
    // Add Cloudinary URLs and IDs only if images are uploaded
    if (frontImageData && frontImageData.url && frontImageData.publicId) {
        productData.frontImageUrl = frontImageData.url;
        productData.frontImageId = frontImageData.publicId;
    }
    
    if (backImageData && backImageData.url && backImageData.publicId) {
        productData.backImageUrl = backImageData.url;
        productData.backImageId = backImageData.publicId;
    }
    
    return productData;
}

// Add product to inventory
async function addProductToInventory(productData) {
    try {        if (isFirebaseConnected && window.InventoryFetcher) {
            // Use Firebase to save product
            const savedProduct = await saveProductToFirebase(productData);
            console.log('Product added to Firebase successfully:', savedProduct);
            
            // Add to local array for immediate UI update
            sampleProducts.unshift(savedProduct);
            
            // Show success notification
            if (window.notyf) {
                window.notyf.success('Product added successfully');
            }
            
            // Refresh the products list
            loadProducts();
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
            
            // Show success notification
            if (window.notyf) {
                window.notyf.success('Product added successfully');
            }
            
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
        
        // Show success notification even for fallback
        if (window.notyf) {
            window.notyf.success('Product added successfully');
        } else {
            alert('Product saved locally. Firebase connection may be unavailable.');
        }
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
                // window.notyf.success(`Inventory refreshed: ${inventoryData.totalCount} items`);
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

// Show image upload progress
function showImageUploadProgress(type, message) {
    const zone = document.getElementById(`${type}ImageZone`);
    if (zone) {
        // Remove any existing progress indicator
        const existingProgress = zone.querySelector('.upload-progress');
        if (existingProgress) {
            existingProgress.remove();
        }
        
        const progressDiv = document.createElement('div');
        progressDiv.className = 'upload-progress';
        progressDiv.innerHTML = `
            <div class="progress-content">
                <i class='bx bx-loader-alt bx-spin'></i>
                <span>${message}</span>
            </div>
        `;
        
        zone.appendChild(progressDiv);
        zone.classList.add('uploading');
    }
}

// Hide image upload progress
function hideImageUploadProgress(type) {
    const zone = document.getElementById(`${type}ImageZone`);
    if (zone) {
        const progressDiv = zone.querySelector('.upload-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
        zone.classList.remove('uploading');
    }
}

// =============== CUSTOM CONFIRMATION MODAL ===============

/**
 * Show custom confirmation modal for delete operations
 * @param {string} title - Main confirmation message
 * @param {string} subtitle - Additional warning message
 * @param {function} onConfirm - Callback function when user confirms
 */
function showDeleteConfirmationModal(title, subtitle, onConfirm) {
    // Create modal HTML
    const modalHTML = `
        <div class="delete-confirmation-modal" id="deleteConfirmationModal">
            <div class="modal-backdrop" onclick="closeDeleteConfirmationModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="warning-icon">
                        <i class='bx bx-error-circle'></i>
                    </div>
                    <h3>Confirm Deletion</h3>
                </div>
                <div class="modal-body">
                    <p class="confirmation-title">${title}</p>
                    <p class="confirmation-subtitle">${subtitle}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeDeleteConfirmationModal()">
                        <i class='bx bx-x'></i>
                        Cancel
                    </button>
                    <button class="btn-delete" onclick="confirmDelete()">
                        <i class='bx bx-trash'></i>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('deleteConfirmationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store the callback function globally for the confirm button
    window.currentDeleteCallback = onConfirm;    // Show modal with animation
    const modal = document.getElementById('deleteConfirmationModal');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Add escape key listener
    const escapeListener = (e) => {
        if (e.key === 'Escape') {
            closeDeleteConfirmationModal();
            document.removeEventListener('keydown', escapeListener);
        }
    };
    document.addEventListener('keydown', escapeListener);
}

/**
 * Close the confirmation modal
 */
function closeDeleteConfirmationModal() {
    const modal = document.getElementById('deleteConfirmationModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore background scrolling
        setTimeout(() => {
            modal.remove();
            // Clean up the global callback
            delete window.currentDeleteCallback;
        }, 300);
    }
}

/**
 * Handle delete confirmation
 */
function confirmDelete() {
    if (window.currentDeleteCallback && typeof window.currentDeleteCallback === 'function') {
        window.currentDeleteCallback();
    }
    closeDeleteConfirmationModal();
}

// Make functions globally available
window.showDeleteConfirmationModal = showDeleteConfirmationModal;
window.closeDeleteConfirmationModal = closeDeleteConfirmationModal;
window.confirmDelete = confirmDelete;

// Firebase Inventory Module Integration
(async function initFirebaseModule() {
    // Wait for modules to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Import and initialize InventoryFetcher if not already done
    if (!window.InventoryFetcher) {
        try {
            const { InventoryFetcher } = await import('./js firebase/inventory-fetching.js');
            window.InventoryFetcher = InventoryFetcher;
        } catch (error) {
            console.error('Failed to import InventoryFetcher:', error);
        }
    }
    
    // Initialize Firebase connection status checker
    window.checkFirebaseStatus = async function() {
        try {
            const isConnected = await window.checkFirebaseConnection();
            console.log('🔗 Firebase connection status:', isConnected ? 'Connected' : 'Disconnected');
            return isConnected;
        } catch (error) {
            console.error('❌ Firebase connection check failed:', error);
            return false;
        }
    };

    // Function to hide spinner
    function hideLoadingSpinner() {
        const generalSpinner = document.getElementById('spinner');
        if (generalSpinner) {
            generalSpinner.classList.add('d-none');
        }
    }

    // Function to wait for UI update and then hide spinner
    async function hideSpinnerAfterUIUpdate() {
        // Wait a bit for UI rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if products are actually rendered in the UI
        const productsList = document.getElementById('productsList');
        const additionalsList = document.getElementById('additionalsList');
        
        let uiReady = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Keep checking until UI is ready or max attempts reached
        while (!uiReady && attempts < maxAttempts) {
            const hasProducts = productsList && !productsList.querySelector('.empty-message');
            const hasAdditionals = additionalsList && !additionalsList.querySelector('.empty-message');
            
            if (hasProducts || hasAdditionals) {
                uiReady = true;
            } else {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
        }
        
        // Hide spinner regardless of UI state after timeout
        hideLoadingSpinner();
    }

    // Function to load inventory data from Firebase
    async function loadInventoryFromFirebase() {
        try {
            console.log('📦 Loading inventory data from Firebase...');
            
            // Check if InventoryFetcher is available and connected
            if (!window.InventoryFetcher) {
                throw new Error('InventoryFetcher not available');
            }
            
            if (!window.InventoryFetcher.getConnectionStatus()) {
                throw new Error('Firebase not connected');
            }
            
            // Fetch products and additionals from Firebase using the new fetching service
            const [products, additionals] = await Promise.all([
                window.InventoryFetcher.fetchProducts(),
                window.InventoryFetcher.fetchAdditionals()
            ]);
            
            // Update global variables with Firebase data
            if (typeof window.updateInventoryData === 'function') {
                window.updateInventoryData(products, additionals);
            } else {
                // Fallback: directly update if function doesn't exist
                console.log('📊 Loaded products:', products.length);
                console.log('📊 Loaded additionals:', additionals.length);
                
                // Try to update the UI directly if possible
                if (typeof window.sampleProducts !== 'undefined') {
                    window.sampleProducts.length = 0;
                    window.sampleProducts.push(...products);
                }
                
                if (typeof window.sampleAdditionals !== 'undefined') {
                    window.sampleAdditionals.length = 0;
                    window.sampleAdditionals.push(...additionals);
                }
                
                // Try to refresh UI
                if (typeof window.loadProducts === 'function') {
                    window.loadProducts();
                }
                if (typeof window.loadAdditionals === 'function') {
                    window.loadAdditionals();
                }
            }
            
            // Log successful loading to console only
            console.log(`📦 Successfully loaded ${products.length} products and ${additionals.length} additionals`);
            
            // Hide spinner after UI has been updated
            await hideSpinnerAfterUIUpdate();
            
        } catch (error) {
            console.error('❌ Error loading inventory from Firebase:', error);
            // Hide spinner even if error occurs
            hideLoadingSpinner();
        }
    }

    // Enhanced initialization with better error diagnostics
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            console.log('🚀 Initializing Firebase inventory services...');
            console.log('📱 User Agent:', navigator.userAgent);
            console.log('🌐 Origin:', window.location.origin);
            
            // Show loading spinner at the start
            const generalSpinner = document.getElementById('spinner');
            
            if (generalSpinner) {
                generalSpinner.classList.remove('d-none');
            }
            
            // Set fallback timeout to hide spinner after 15 seconds
            setTimeout(() => {
                console.log('⏰ Fallback timeout reached, hiding spinner');
                hideLoadingSpinner();
            }, 15000);
            
            // Wait a moment for modules to load
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if InventoryFetcher is available
            if (!window.InventoryFetcher) {
                console.error('❌ InventoryFetcher not available');
                hideLoadingSpinner();
                return;
            }
            
            console.log('✅ InventoryFetcher loaded successfully');
            
            // Test Firebase connection first
            console.log('🔗 Testing Firebase connection...');
            const isConnected = await window.checkFirebaseStatus();
            console.log(`📡 Firebase connection result: ${isConnected}`);
            
            if (!isConnected) {
                console.warn('⚠️ Firebase connection failed - using offline mode');
                
                // Log detailed connection info
                console.log('🔍 Connection details:');
                console.log('- chandriaDB available:', !!window.chandriaDB);
                console.log('- checkFirebaseConnection available:', !!window.checkFirebaseConnection);
                
                hideLoadingSpinner();
                return;
            }
            
            console.log('✅ Firebase connection successful');
            
            // Initialize the inventory fetcher
            console.log('🔄 Initializing InventoryFetcher...');
            const initResult = await window.InventoryFetcher.initialize();
            console.log('📊 InventoryFetcher init result:', initResult);
            
            if (initResult.success) {
                console.log('✅ Firebase services ready:', initResult.message);
                
                // Get initial statistics
                const stats = await window.InventoryFetcher.getInventoryStats();
                if (stats) {
                    console.log('📊 Products in database:', stats.totalProducts);
                    console.log('📊 Additionals in database:', stats.totalAdditionals);
                } else {
                    console.log('📊 No stats available');
                }
                
                // Load initial data from Firebase
                console.log('📦 Loading initial data...');
                await loadInventoryFromFirebase();
            } else {
                console.error('❌ Failed to initialize Firebase services:', initResult.message);
                hideLoadingSpinner();
            }
            
        } catch (error) {
            console.error('❌ Error initializing Firebase:', error);
            console.log('🔍 Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Hide spinner if there's an error and no data will be loaded
            hideLoadingSpinner();
        }
    });

    // Make the load function available globally
    window.loadInventoryFromFirebase = loadInventoryFromFirebase;
})();
