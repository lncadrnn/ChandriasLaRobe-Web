/**
 * Inventory Edit and Delete Functionality using jQuery
 * Compatible with existing modal system
 */

// Import Firebase functions
import { 
    chandriaDB, 
    doc, 
    getDoc, 
    deleteDoc,
    updateDoc
} from "./sdk/chandrias-sdk.js";

console.log('🚀 Loading jQuery-based edit/delete functionality...');

// Wait for jQuery and DOM to be ready
$(document).ready(function() {
    console.log('📦 jQuery available:', !!$);
    console.log('🔥 Firebase available:', !!chandriaDB);
    
    // Initialize Notyf
    const notyf = new Notyf({
        position: { x: "center", y: "top" }
    });
    
    // Make notyf globally available
    window.inventoryNotyf = notyf;
      // ===========================================
    // EDIT BUTTON CLICK HANDLER
    // ===========================================
    $(document).on('click', '.edit-btn', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $editBtn = $(this);
        const productId = $editBtn.data('id') || $editBtn.attr('data-id');
        
        console.log('📝 Edit button clicked for product:', productId);
        
        if (!productId) {
            notyf.error('Product ID not found');
            return;
        }
        
        // Show loading state
        const originalHtml = $editBtn.html();
        $editBtn.html('<i class="bx bx-loader bx-spin"></i>').prop('disabled', true);
        
        try {
            // Get product data from Firebase
            console.log('🔄 Fetching product data...');
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const productData = docSnap.data();
                console.log('✅ Product data loaded:', productData);
                
                // Populate the modal with product data
                populateEditModal(productId, productData);
                
                // Show the modal using jQuery
                const $modal = $('#viewProductModal');
                console.log('🔍 Modal element found:', $modal.length > 0);
                
                if ($modal.length > 0) {
                    $modal.addClass('show');
                    
                    // Lock body scroll (same as existing system)
                    $('body').css({
                        'overflow': 'hidden',
                        'position': 'fixed',
                        'width': '100%'
                    });
                    
                    console.log('✅ Edit modal should now be visible');
                } else {
                    console.error('❌ Modal element not found');
                    notyf.error('Modal not found');
                }
                
            } else {
                console.error('❌ Product not found in database');
                notyf.error('Product not found');
            }
            
        } catch (error) {
            console.error('❌ Error loading product:', error);
            notyf.error('Failed to load product details');
        } finally {
            // Reset button
            $editBtn.html(originalHtml).prop('disabled', false);
        }
    });
    
    // ===========================================
    // DELETE BUTTON CLICK HANDLER    // ===========================================
    // DELETE BUTTON CLICK HANDLER
    // ===========================================
    $(document).on('click', '.delete-btn', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $deleteBtn = $(this);
        const productId = $deleteBtn.data('id') || $deleteBtn.attr('data-id');
        
        console.log('🗑️ Delete button clicked for product:', productId);
        
        if (!productId) {
            notyf.error('Product ID not found');
            return;
        }
        
        // Show confirmation
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }
        
        // Show loading state
        const originalHtml = $deleteBtn.html();
        $deleteBtn.html('<i class="bx bx-loader bx-spin"></i>').prop('disabled', true);
        
        try {
            console.log('🔄 Fetching product data...');
            
            // First get the product data to retrieve image IDs
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                notyf.error('Product not found');
                return;
            }
            
            const productData = docSnap.data();
            console.log('📄 Product data:', productData);
            
            // Delete images if they exist
            try {
                if (productData.frontImageId) {
                    console.log('🔄 Deleting front image...');
                    await deleteImageFromCloudinary(productData.frontImageId);
                    console.log('✅ Front image deleted');
                }
                
                if (productData.backImageId) {
                    console.log('🔄 Deleting back image...');
                    await deleteImageFromCloudinary(productData.backImageId);
                    console.log('✅ Back image deleted');
                }
            } catch (imageError) {
                console.warn('⚠️ Image deletion failed, but continuing with product deletion:', imageError);
                // Continue with product deletion even if image deletion fails
            }
            
            console.log('🔄 Deleting product from database...');
            
            // Delete the product document
            await deleteDoc(docRef);
            
            console.log('✅ Product deleted from database');
            
            // Remove the card with animation
            const $card = $deleteBtn.closest('.card_article');
            $card.fadeOut(300, function() {
                $(this).remove();
            });
            
            notyf.success('Product deleted successfully!');
            
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            notyf.error('Failed to delete product or images');
            
            // Reset button on error
            $deleteBtn.html(originalHtml).prop('disabled', false);
        }
    });
    
    // ===========================================
    // CLOUDINARY IMAGE DELETE FUNCTION
    // ===========================================
    
    async function deleteImageFromCloudinary(publicId) {
        if (!publicId) {
            console.log('⚠️ No publicId provided for image deletion');
            return;
        }
        
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Generate signature using the globally available function
            const signature = await window.generateLegacySignature(
                publicId,
                timestamp,
                window.LEGACY_CLOUDINARY_CONFIG.apiSecret
            );

            const formData = new FormData();
            formData.append("public_id", publicId);
            formData.append("api_key", window.LEGACY_CLOUDINARY_CONFIG.apiKey);
            formData.append("timestamp", timestamp);
            formData.append("signature", signature);

            const response = await fetch(window.getLegacyCloudinaryDeleteUrl(), {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Cloudinary delete failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Cloudinary delete result:', result);
            
            return result;
        } catch (error) {
            console.error('❌ Error deleting image from Cloudinary:', error);
            throw error;
        }
    }
    
    // ===========================================
    // HELPER FUNCTIONS
    // ===========================================
      function populateEditModal(productId, data) {
        console.log('🔄 Populating edit modal...');
        
        // Set product ID
        $('#update-product-id').val(productId);
        
        // Set image previews
        if (data.frontImageUrl) {
            $("#update-dropzone-front").css({
                "background-image": `url(${data.frontImageUrl})`,
                "background-size": "cover",
                "background-position": "center"
            });
            $("#update-upload-label-front").css("opacity", "0");
        }
        if (data.backImageUrl) {
            $("#update-dropzone-back").css({
                "background-image": `url(${data.backImageUrl})`,
                "background-size": "cover",
                "background-position": "center"
            });
            $("#update-upload-label-back").css("opacity", "0");
        }
        
        // Set basic fields
        $('#update-product-name').val(data.name || '');
        $('#update-product-price').val(data.price || '');
        $('#update-product-code').val(data.code || '');
        $('#update-product-description').val(data.description || '');
        
        // Set dropdowns
        $('#update-product-category').val(data.category || '');
        $('#update-product-sleeve').val(data.sleeve || '');
        
        // Set color using text value (simpler approach)
        $('#update-product-color').val(data.color || '');
        
        // Handle sizes and quantities
        if (data.size) {
            // First uncheck all sizes
            $('input[name="update-product-size"]').prop('checked', false);
            
            // Then check and set quantities for existing sizes
            Object.keys(data.size).forEach(size => {
                const $sizeCheckbox = $(`input[name="update-product-size"][value="${size}"]`);
                if ($sizeCheckbox.length > 0) {
                    $sizeCheckbox.prop('checked', true);
                    
                    // Trigger change event to create quantity input if needed
                    $sizeCheckbox.trigger('change');
                    
                    // Set quantity value after a brief delay
                    setTimeout(() => {
                        const $qtyInput = $(`#qty-${size}`);
                        if ($qtyInput.length > 0) {
                            $qtyInput.val(data.size[size] || 1);
                        }
                    }, 100);
                }
            });
        }
        
        console.log('✅ Modal populated successfully');
    }
      // ===========================================
    // UPDATE FORM SUBMISSION
    // ===========================================
    
    $(document).on('click', '#update-product-btn', async function(e) {
        e.preventDefault();
        
        const productId = $('#update-product-id').val();
        if (!productId) {
            notyf.error('Product ID is missing');
            return;
        }
        
        const $submitBtn = $(this);
        const originalBtnText = $submitBtn.html();
        $submitBtn.html('<i class="bx bx-loader bx-spin"></i> Updating...').prop('disabled', true);
        
        try {
            // Collect form data
            const updatedData = {
                name: $('#update-product-name').val(),
                price: parseFloat($('#update-product-price').val()) || 0,
                description: $('#update-product-description').val(),
                code: $('#update-product-code').val(),
                color: $('#update-product-color').val(),
                sleeve: $('#update-product-sleeve').val(),
                category: $('#update-product-category').val(),
                updatedAt: new Date().toISOString()
            };
            
            // Collect sizes and quantities
            updatedData.size = {};
            $('input[name="update-product-size"]:checked').each(function() {
                const size = $(this).val();
                const qty = parseInt($(`#qty-${size}`).val()) || 1;
                updatedData.size[size] = qty;
            });
            
            console.log('📦 Updating product with data:', updatedData);
            
            // Update in Firebase
            const docRef = doc(chandriaDB, "products", productId);
            await updateDoc(docRef, updatedData);
            
            console.log('✅ Product updated successfully');
            notyf.success('Product updated successfully!');
            
            // Close modal (same as existing system)
            $('#viewProductModal').removeClass('show');
            $('body').css({
                'overflow': '',
                'position': '',
                'width': ''
            });
              // Refresh products if possible
            if (typeof window.loadProducts === 'function') {
                console.log('🔄 Refreshing product list...');
                window.loadProducts();
            } else if (window.ComprehensiveLoader && typeof window.ComprehensiveLoader.loadProducts === 'function') {
                window.ComprehensiveLoader.loadProducts();
            } else {
                console.warn('⚠️ No loadProducts function found');
            }
            
        } catch (error) {
            console.error('❌ Error updating product:', error);
            notyf.error('Failed to update product');
        } finally {
            $submitBtn.html(originalBtnText).prop('disabled', false);
        }
    });
    
    // ===========================================
    // GLOBAL TEST FUNCTION
    // ===========================================
    
    window.testEditModal = function() {
        console.log('🧪 Testing edit modal display...');
        const $modal = $('#viewProductModal');
        if ($modal.length > 0) {
            $modal.addClass('show');
            $('body').css({
                'overflow': 'hidden',
                'position': 'fixed',
                'width': '100%'
            });
            console.log('✅ Test modal should now be visible');
        } else {
            console.error('❌ Test: Modal not found');
        }
    };
    
    console.log('✅ jQuery-based inventory edit/delete functionality loaded');
    console.log('🧪 Test modal with: window.testEditModal()');
});
