/**
 * New Inventory Edit and Delete Functionality
 * Simple and clean implementation
 */

// Import Firebase functions
import { 
    chandriaDB, 
    doc, 
    getDoc, 
    deleteDoc,
    updateDoc 
} from "./sdk/chandrias-sdk.js";

console.log('🚀 Loading new edit/delete functionality...');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM loaded, initializing edit/delete handlers...');
    
    // Initialize Notyf for notifications
    const notyf = new Notyf({
        position: { x: "center", y: "top" }
    });

    // ===========================================
    // EDIT BUTTON HANDLER
    // ===========================================
    document.addEventListener('click', async function(e) {
        const editBtn = e.target.closest('.edit_btn');
        if (!editBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const productId = editBtn.getAttribute('data-id');
        console.log('✏️ Edit button clicked for product:', productId);

        if (!productId) {
            notyf.error('Product ID not found');
            return;
        }

        try {
            // Show loading on button
            const originalContent = editBtn.innerHTML;
            editBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
            editBtn.disabled = true;

            // Get product data from Firebase
            console.log('📦 Fetching product data...');
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                notyf.error('Product not found');
                return;
            }

            const productData = docSnap.data();
            console.log('✅ Product data retrieved:', productData);

            // Fill the edit modal
            fillEditModal(productId, productData);

            // Show the modal
            showEditModal();

            // Reset button
            editBtn.innerHTML = originalContent;
            editBtn.disabled = false;

        } catch (error) {
            console.error('❌ Error in edit handler:', error);
            notyf.error('Failed to load product for editing');
            
            // Reset button
            editBtn.innerHTML = '<i class="bx bx-edit"></i>';
            editBtn.disabled = false;
        }
    });

    // ===========================================
    // DELETE BUTTON HANDLER
    // ===========================================
    document.addEventListener('click', async function(e) {
        const deleteBtn = e.target.closest('.delete_btn');
        if (!deleteBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const productId = deleteBtn.getAttribute('data-id');
        console.log('🗑️ Delete button clicked for product:', productId);

        if (!productId) {
            notyf.error('Product ID not found');
            return;
        }

        // Confirm deletion
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

        try {
            // Show loading on button
            const originalContent = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
            deleteBtn.disabled = true;

            // Delete from Firebase
            console.log('🗑️ Deleting product from Firebase...');
            await deleteDoc(doc(chandriaDB, "products", productId));

            // Remove the card from UI
            const card = deleteBtn.closest('.card_article');
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    card.remove();
                }, 300);
            }

            notyf.success('Product deleted successfully!');
            console.log('✅ Product deleted successfully');

        } catch (error) {
            console.error('❌ Error deleting product:', error);
            notyf.error('Failed to delete product');
            
            // Reset button
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
        }
    });

    // ===========================================
    // MODAL FUNCTIONS
    // ===========================================
    function fillEditModal(productId, data) {
        console.log('📝 Filling edit modal with data...');

        // Set product ID
        const productIdInput = document.getElementById('update-product-id');
        if (productIdInput) {
            productIdInput.value = productId;
        }

        // Set basic fields
        setFieldValue('update-product-name', data.name);
        setFieldValue('update-product-price', data.price);
        setFieldValue('update-product-code', data.code);
        setFieldValue('update-product-description', data.description);

        // Set dropdowns
        setDropdownValue('update-product-category', data.category);
        setDropdownValue('update-product-sleeve', data.sleeve);
        setDropdownValue('update-product-color', data.color);

        // Set sizes if they exist
        if (data.size) {
            setSizes(data.size);
        }

        console.log('✅ Modal filled with product data');
    }

    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value !== undefined && value !== null) {
            field.value = value;
            console.log(`✅ Set ${fieldId} to:`, value);
        }
    }

    function setDropdownValue(dropdownId, value) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown && value) {
            dropdown.value = value;
            console.log(`✅ Set dropdown ${dropdownId} to:`, value);
        }
    }

    function setSizes(sizeData) {
        // Clear all size checkboxes first
        const sizeCheckboxes = document.querySelectorAll('input[name="update-product-size"]');
        sizeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Set the sizes that exist in the data
        Object.keys(sizeData).forEach(size => {
            const checkbox = document.querySelector(`input[name="update-product-size"][value="${size}"]`);
            if (checkbox) {
                checkbox.checked = true;
                // Trigger change event if needed for quantity inputs
                checkbox.dispatchEvent(new Event('change'));
                
                // Set quantity if there's a quantity input
                setTimeout(() => {
                    const qtyInput = document.getElementById(`qty-${size}`);
                    if (qtyInput) {
                        qtyInput.value = sizeData[size] || 1;
                    }
                }, 100);
            }
        });
    }

    function showEditModal() {
        const modal = document.getElementById('viewProductModal');
        console.log('🔍 Looking for modal:', !!modal);

        if (!modal) {
            console.error('❌ Modal element not found!');
            notyf.error('Edit modal not found');
            return;
        }

        // Force show the modal
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        modal.style.zIndex = '9999';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.classList.add('show');

        console.log('✅ Modal should now be visible');
        console.log('Modal styles applied:', {
            display: modal.style.display,
            opacity: modal.style.opacity,
            visibility: modal.style.visibility,
            zIndex: modal.style.zIndex
        });
    }

    function hideEditModal() {
        const modal = document.getElementById('viewProductModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            console.log('✅ Modal hidden');
        }
    }

    // ===========================================
    // MODAL CLOSE HANDLERS
    // ===========================================
    document.addEventListener('click', function(e) {
        // Close button
        if (e.target.closest('[data-close="viewProductModal"]')) {
            hideEditModal();
        }

        // Click outside modal
        const modal = document.getElementById('viewProductModal');
        if (modal && e.target === modal) {
            hideEditModal();
        }
    });

    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideEditModal();
        }
    });

    // ===========================================
    // UPDATE FORM HANDLER
    // ===========================================
    const updateForm = document.getElementById('updateProductForm');
    if (updateForm) {
        updateForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const productId = document.getElementById('update-product-id').value;
            if (!productId) {
                notyf.error('Product ID is missing');
                return;
            }

            const submitBtn = updateForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Updating...';
            submitBtn.disabled = true;

            try {
                // Collect form data
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

                // Get sizes
                updatedData.size = {};
                const checkedSizes = document.querySelectorAll('input[name="update-product-size"]:checked');
                checkedSizes.forEach(sizeCheckbox => {
                    const size = sizeCheckbox.value;
                    const qtyInput = document.getElementById(`qty-${size}`);
                    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                    updatedData.size[size] = qty;
                });

                console.log('📦 Updating product with data:', updatedData);

                // Update in Firebase
                const docRef = doc(chandriaDB, "products", productId);
                await updateDoc(docRef, updatedData);

                notyf.success('Product updated successfully!');
                hideEditModal();

                // Refresh product list
                if (window.ComprehensiveLoader && typeof window.ComprehensiveLoader.loadProducts === 'function') {
                    window.ComprehensiveLoader.loadProducts();
                } else if (typeof window.loadProducts === 'function') {
                    window.loadProducts();
                } else {
                    window.location.reload();
                }

            } catch (error) {
                console.error('❌ Error updating product:', error);
                notyf.error('Failed to update product');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Add test function for debugging
    window.testShowModal = function() {
        showEditModal();
    };

    console.log('✅ New edit/delete functionality initialized');
    console.log('🧪 Test function available: window.testShowModal()');
});
