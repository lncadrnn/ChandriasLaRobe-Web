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
    collection 
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

    // ===========================================
    // EDIT BUTTON FUNCTIONALITY
    // ===========================================
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit_btn')) {
            handleEditProduct(e);
        }
    });    async function handleEditProduct(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const editBtn = e.target.closest('.edit_btn');
        const productId = editBtn.getAttribute('data-id');
        
        console.log('📝 Edit product clicked:', productId);
        console.log('🔥 Firebase DB available:', !!chandriaDB);

        if (!productId) {
            console.error('❌ Product ID not found');
            notyf.error('Product ID not found');
            return;
        }

        try {
            // Show loading
            editBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
            
            console.log('🔄 Getting product from Firebase...');
            // Get product data from Firebase
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('📦 Product data loaded:', data);

                // Populate the edit modal with product data
                populateEditModal(productId, data);
                
                // Show the modal
                const modal = document.getElementById('viewProductModal');
                if (modal) {
                    modal.classList.add('show');
                } else {
                    console.error('Edit modal not found');
                    notyf.error('Edit modal not found');
                }
            } else {
                console.error('Product not found');
                notyf.error('Product not found');
            }        } catch (error) {
            console.error('❌ Error loading product for edit:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            notyf.error('Failed to load product details');
        } finally {
            // Reset button
            editBtn.innerHTML = '<i class="bx bx-edit"></i>';
        }
    }

    function populateEditModal(productId, data) {
        console.log('🔄 Populating edit modal...');

        // Set product ID (hidden field)
        const productIdInput = document.getElementById('update-product-id');
        if (productIdInput) {
            productIdInput.value = productId;
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
                // For color, we need to match by the style color
                if (dropdownId === 'update-product-color') {
                    const options = dropdown.querySelectorAll('option');
                    options.forEach(option => {
                        const optionColor = window.getComputedStyle(option).color;
                        const hexColor = rgbToHex(optionColor);
                        if (hexColor && hexColor.toLowerCase() === (data.color || '').toLowerCase()) {
                            option.selected = true;
                        }
                    });
                } else {
                    dropdown.value = dropdowns[dropdownId];
                }
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
        const confirmed = await showDeleteConfirmation();
        if (!confirmed) {
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
        }
    }

    function showDeleteConfirmation() {
        return new Promise((resolve) => {
            // Create custom confirmation modal
            const confirmModal = document.createElement('div');
            confirmModal.className = 'delete-confirm-modal';
            confirmModal.innerHTML = `
                <div class="delete-confirm-backdrop">
                    <div class="delete-confirm-content">
                        <div class="delete-confirm-icon">
                            <i class="bx bx-trash"></i>
                        </div>
                        <h3>Delete Product</h3>
                        <p>Are you sure you want to delete this product? This action cannot be undone.</p>
                        <div class="delete-confirm-buttons">
                            <button class="btn-cancel">Cancel</button>
                            <button class="btn-delete">Delete</button>
                        </div>
                    </div>
                </div>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .delete-confirm-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .delete-confirm-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }
                .delete-confirm-content {
                    position: relative;
                    background: white;
                    padding: 32px;
                    border-radius: 16px;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                    animation: modalSlideIn 0.3s ease-out;
                }
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .delete-confirm-icon {
                    width: 64px;
                    height: 64px;
                    background: #fee2e2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    color: #dc2626;
                    font-size: 24px;
                }
                .delete-confirm-content h3 {
                    margin: 0 0 8px 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #1f2937;
                }
                .delete-confirm-content p {
                    margin: 0 0 24px 0;
                    color: #6b7280;
                    line-height: 1.5;
                }
                .delete-confirm-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .delete-confirm-buttons button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 100px;
                }
                .btn-cancel {
                    background: #f3f4f6;
                    color: #374151;
                }
                .btn-cancel:hover {
                    background: #e5e7eb;
                }
                .btn-delete {
                    background: #dc2626;
                    color: white;
                }
                .btn-delete:hover {
                    background: #b91c1c;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(confirmModal);

            // Handle button clicks
            confirmModal.querySelector('.btn-cancel').onclick = () => {
                document.body.removeChild(confirmModal);
                document.head.removeChild(style);
                resolve(false);
            };

            confirmModal.querySelector('.btn-delete').onclick = () => {
                document.body.removeChild(confirmModal);
                document.head.removeChild(style);
                resolve(true);
            };

            // Handle backdrop click
            confirmModal.querySelector('.delete-confirm-backdrop').onclick = (e) => {
                if (e.target === e.currentTarget) {
                    document.body.removeChild(confirmModal);
                    document.head.removeChild(style);
                    resolve(false);
                }
            };
        });
    }

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
    } // End of initializeEditDeleteFunctionality

}); // End of DOMContentLoaded