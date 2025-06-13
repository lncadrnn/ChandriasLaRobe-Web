/**
 * Inventory Edit and Delete Functionality
 * Handles edit and delete operations for inventory cards
 */

// Import Firebase functions from the SDK
import { 
    chandriaDB, 
    doc, 
    getDoc, 
    deleteDoc,
    getDocs,
    collection,
    updateDoc 
} from "./sdk/chandrias-sdk.js";

// Test Firebase connectivity
async function testFirebaseConnection() {
    try {
        console.log('🧪 Testing Firebase connection...');
        console.log('🔥 Firebase DB:', chandriaDB);
        
        // Try to get the products collection
        const productsRef = collection(chandriaDB, "products");
        const snapshot = await getDocs(productsRef);
        
        console.log('✅ Firebase connection successful!');
        console.log('📦 Products found:', snapshot.size);
        
        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inventory Edit/Delete functionality loaded');
    
    // Test Firebase connection first
    testFirebaseConnection().then(connected => {
        if (connected) {
            console.log('✅ Firebase test passed, initializing edit/delete functionality...');
            initializeEditDeleteFunctionality();
            setupUpdateFormHandler();
        } else {
            console.error('❌ Firebase test failed, edit/delete functionality disabled');
        }
    });function initializeEditDeleteFunctionality() {
        console.log('🚀 Initializing edit/delete functionality...');

        // Initialize Notyf for notifications
        const notyf = new Notyf({
            position: {
                x: "center",
                y: "top"
            }
        });

        // Make notyf available globally for this module
        window.inventoryNotyf = notyf;

        // Setup modal close handlers
        setupModalCloseHandlers();    // ===========================================
    // EDIT BUTTON FUNCTIONALITY
    // ===========================================
    document.addEventListener('click', function(e) {
        console.log('🖱️ Click detected:', e.target);
        
        if (e.target.closest('.edit_btn')) {
            console.log('✅ Edit button clicked!');
            handleEditProduct(e);
        } else {
            console.log('❌ Not an edit button click');
        }
    });async function handleEditProduct(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const editBtn = e.target.closest('.edit_btn');
        const productId = editBtn.getAttribute('data-id');
        
        console.log('📝 Edit product clicked:', productId);
        console.log('🔥 Firebase DB available:', !!chandriaDB);

        // Get or create notyf instance
        const notyf = window.inventoryNotyf || new Notyf({
            position: { x: "center", y: "top" }
        });

        if (!productId) {
            console.error('❌ Product ID not found');
            notyf.error('Product ID not found');
            return;
        }

        try {
            // Show loading
            editBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
            editBtn.disabled = true;
            
            console.log('🔄 Getting product from Firebase...');
            // Get product data from Firebase
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('📦 Product data loaded:', data);

                // Populate the edit modal with product data
                populateEditModal(productId, data);
                
                // Show the modal with additional debugging
                const modal = document.getElementById('viewProductModal');
                console.log('🔍 Modal element found:', !!modal);
                
                if (modal) {
                    // Ensure modal is visible by forcing display and adding show class
                    modal.style.display = 'flex';
                    modal.classList.add('show');
                    
                    // Add a small delay to ensure CSS transitions work
                    setTimeout(() => {
                        modal.style.opacity = '1';
                        modal.style.pointerEvents = 'auto';
                    }, 10);
                    
                    console.log('✅ Modal should now be visible');
                } else {
                    console.error('❌ Edit modal not found');
                    notyf.error('Edit modal not found');
                }
            } else {
                console.error('❌ Product not found');
                notyf.error('Product not found');
            }        } catch (error) {
            console.error('❌ Error loading product for edit:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            
            const notyf = window.inventoryNotyf || new Notyf({
                position: { x: "center", y: "top" }
            });
            notyf.error('Failed to load product details');
        } finally {
            // Reset button
            editBtn.innerHTML = '<i class="bx bx-edit"></i>';
            editBtn.disabled = false;
        }
    }    function populateEditModal(productId, data) {
        console.log('🔄 Populating edit modal with data:', data);

        // Set product ID (hidden field)
        const productIdInput = document.getElementById('update-product-id');
        if (productIdInput) {
            productIdInput.value = productId;
            console.log('✅ Product ID set:', productId);
        } else {
            console.error('❌ Product ID input not found');
        }

        // Set text inputs
        const fields = {
            'update-product-name': data.name || '',
            'update-product-price': data.price || '',
            'update-product-code': data.code || '',
            'update-product-description': data.description || ''
        };

        Object.keys(fields).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fields[fieldId];
                console.log(`✅ Field ${fieldId} set to:`, fields[fieldId]);
            } else {
                console.error(`❌ Field ${fieldId} not found`);
            }
        });

        // Set dropdowns
        const dropdowns = {
            'update-product-category': data.category || '',
            'update-product-sleeve': data.sleeve || '',
            'update-product-color': data.color || ''
        };

        Object.keys(dropdowns).forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.value = dropdowns[dropdownId];
                console.log(`✅ Dropdown ${dropdownId} set to:`, dropdowns[dropdownId]);
            } else {
                console.error(`❌ Dropdown ${dropdownId} not found`);
            }
        });

        // Set images
        setImagePreview('update-dropzone-front', 'update-upload-label-front', getImageUrl(data, 'front'));
        setImagePreview('update-dropzone-back', 'update-upload-label-back', getImageUrl(data, 'back'));

        // Set sizes and quantities
        setSizesAndQuantities(data.size || {});

        console.log('✅ Edit modal populated successfully');
    }

    function setImagePreview(dropzoneId, labelId, imageUrl) {
        if (!imageUrl) return;
        
        const dropzone = document.getElementById(dropzoneId);
        const label = document.getElementById(labelId);
        
        if (dropzone) {
            dropzone.style.backgroundImage = `url(${imageUrl})`;
            dropzone.style.backgroundSize = 'cover';
            dropzone.style.backgroundPosition = 'center';
        }
        
        if (label) {
            label.style.opacity = '0';
        }
    }

    function setSizesAndQuantities(sizeData) {
        const sizeCheckboxes = document.querySelectorAll('input[name="update-product-size"]');
        const selectedSizes = Object.keys(sizeData);

        sizeCheckboxes.forEach(checkbox => {
            const size = checkbox.value;
            if (selectedSizes.includes(size)) {
                checkbox.checked = true;
                // Trigger change event to create quantity input
                checkbox.dispatchEvent(new Event('change'));
                
                // Set quantity value after a short delay to ensure input is created
                setTimeout(() => {
                    const qtyInput = document.getElementById(`qty-${size}`);
                    if (qtyInput) {
                        qtyInput.value = sizeData[size] || 1;
                    }
                }, 100);
            } else {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }

    // ===========================================
    // DELETE BUTTON FUNCTIONALITY
    // ===========================================
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete_btn')) {
            handleDeleteProduct(e);
        }
    });    async function handleDeleteProduct(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const deleteBtn = e.target.closest('.delete_btn');
        const productId = deleteBtn.getAttribute('data-id');
        const card = deleteBtn.closest('.card_article');
        
        console.log('🗑️ Delete product clicked:', productId);
        console.log('🔥 Firebase DB available:', !!chandriaDB);

        if (!productId) {
            console.error('❌ Product ID not found');
            notyf.error('Product ID not found');
            return;
        }

        // Show confirmation dialog
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            console.log('❌ Delete cancelled by user');
            return;
        }

        try {
            // Show loading state
            deleteBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
            deleteBtn.disabled = true;            console.log('🔄 Deleting product from Firebase...');
            
            // Delete from Firebase
            await deleteDoc(doc(chandriaDB, "products", productId));
            
            console.log('✅ Product deleted from Firebase');

            // Remove card from UI with animation
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    card.remove();
                    console.log('✅ Product card removed from UI');
                }, 300);
            }

            // Show success notification
            notyf.success('Product deleted successfully!');        } catch (error) {
            console.error('❌ Error deleting product:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            notyf.error('Failed to delete product. Please try again.');
            
            // Reset button state on error
            deleteBtn.innerHTML = '<i class="bx bx-trash"></i>';
            deleteBtn.disabled = false;
        }    }

    // ===========================================
    // MODAL CLOSE FUNCTIONALITY
    // ===========================================
    function setupModalCloseHandlers() {
        // Close button handler
        document.addEventListener('click', function(e) {
            if (e.target.closest('[data-close="viewProductModal"]')) {
                const modal = document.getElementById('viewProductModal');
                if (modal) {
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    console.log('✅ Modal closed via close button');
                }
            }
        });

        // Click outside modal to close
        document.addEventListener('click', function(e) {
            const modal = document.getElementById('viewProductModal');
            if (modal && e.target === modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
                console.log('✅ Modal closed via outside click');
            }
        });

        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('viewProductModal');
                if (modal && modal.classList.contains('show')) {
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    console.log('✅ Modal closed via Escape key');
                }
            }
        });
    }

    // ===========================================
    // TEST FUNCTION - Remove after debugging
    // ===========================================
    window.testShowModal = function() {
        console.log('🧪 Testing modal visibility...');
        const modal = document.getElementById('viewProductModal');
        console.log('🔍 Modal found:', !!modal);
        
        if (modal) {
            console.log('🔍 Modal current classes:', modal.className);
            console.log('🔍 Modal current style.display:', modal.style.display);
            console.log('🔍 Modal computed display:', window.getComputedStyle(modal).display);
            console.log('🔍 Modal computed visibility:', window.getComputedStyle(modal).visibility);
            console.log('🔍 Modal computed opacity:', window.getComputedStyle(modal).opacity);
            console.log('🔍 Modal computed z-index:', window.getComputedStyle(modal).zIndex);
            
            // Force show the modal
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'auto';
            modal.classList.add('show');
            
            console.log('✅ Modal forced to show');
            console.log('🔍 Modal classes after force:', modal.className);
        } else {
            console.error('❌ Modal not found!');
        }
    };

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================
    function rgbToHex(rgb) {
        if (!rgb) return '';
        
        const rgbMatch = rgb.match(/\d+/g);
        if (!rgbMatch || rgbMatch.length < 3) return '';
        
        return "#" + rgbMatch
            .slice(0, 3)
            .map(x => parseInt(x).toString(16).padStart(2, "0"))
            .join("");
    }

    function getImageUrl(product, type = 'front') {
        // Try new structure first (using frontImageId/backImageId)
        if (type === 'front' && product.frontImageUrl) {
            return product.frontImageUrl;
        }
        if (type === 'back' && product.backImageUrl) {
            return product.backImageUrl;
        }
        
        // Try legacy structure
        if (product.images) {
            if (type === 'front' && product.images.front) {
                return product.images.front;
            }
            if (type === 'back' && product.images.back) {
                return product.images.back;
            }        }
        
        // Fallback to generic imageUrl or placeholder
        return product.imageUrl || '/admin/assets/images/placeholder.jpg';
    }    console.log('✅ Inventory Edit/Delete functionality initialized');
    
    // Add a global test function for debugging
    window.testEditModal = function() {
        const modal = document.getElementById('viewProductModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'auto';
            console.log('🧪 Test: Modal should now be visible');
        } else {
            console.error('🧪 Test: Modal not found');
        }
    };
    
    console.log('🧪 Test function added: window.testEditModal()');
    } // End of initializeEditDeleteFunctionality

}); // End of DOMContentLoaded

function showDeleteConfirmation() {
        return new Promise((resolve) => {
            // We use native confirm since we can't be sure the custom modal is available
            const result = confirm('Are you sure you want to delete this product? This action cannot be undone.');
            resolve(result);
        });
    }
    
    // ===========================================
    // UPDATE PRODUCT FUNCTIONALITY
    // ===========================================
    function setupUpdateFormHandler() {
        console.log('🔄 Setting up update form handler...');
        const updateForm = document.getElementById('updateProductForm');
        
        if (!updateForm) {
            console.error('❌ Update form not found');
            return;
        }
        
        updateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get the notyf instance
            const notyf = window.inventoryNotyf || new Notyf({
                position: { x: "center", y: "top" }
            });
            
            // Get product ID
            const productId = document.getElementById('update-product-id').value;
            if (!productId) {
                notyf.error('Product ID is missing');
                return;
            }
            
            // Show loading spinner
            const submitBtn = updateForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Updating...';
            submitBtn.disabled = true;
            
            try {
                // Get form data
                const updatedData = {
                    name: document.getElementById('update-product-name').value,
                    price: parseFloat(document.getElementById('update-product-price').value),
                    description: document.getElementById('update-product-description').value,
                    code: document.getElementById('update-product-code').value,
                    color: document.getElementById('update-product-color').value,
                    sleeve: document.getElementById('update-product-sleeve').value,
                    category: document.getElementById('update-product-category').value,
                    updatedAt: new Date().toISOString()
                };
                
                // Get sizes and quantities
                updatedData.size = {};
                const checkedSizes = document.querySelectorAll('input[name="update-product-size"]:checked');
                checkedSizes.forEach(sizeCheckbox => {
                    const size = sizeCheckbox.value;
                    const qtyInput = document.getElementById(`qty-${size}`);
                    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                    updatedData.size[size] = qty;
                });
                
                console.log('📦 Updated data:', updatedData);
                
                // Update document in Firebase
                const docRef = doc(chandriaDB, "products", productId);
                await updateDoc(docRef, updatedData);
                
                console.log('✅ Product updated successfully');
                notyf.success('Product updated successfully!');
                
                // Close the modal
                const modal = document.getElementById('viewProductModal');
                if (modal) {
                    modal.classList.remove('show');
                }
                
                // Refresh the product list
                if (window.ComprehensiveLoader && typeof window.ComprehensiveLoader.loadProducts === 'function') {
                    window.ComprehensiveLoader.loadProducts();
                } else if (typeof window.loadProducts === 'function') {
                    window.loadProducts();
                } else {
                    console.warn('⚠️ No loadProducts function found - refreshing page instead');
                    window.location.reload();
                }
            } catch (error) {
                console.error('❌ Error updating product:', error);
                notyf.error('Failed to update product. Please try again.');
            } finally {
                // Reset button
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
        
        console.log('✅ Update form handler setup complete');
    }