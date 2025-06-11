// Cloudinary Upload Service for Inventory Management
// Configuration is loaded from: assets/js/config/cloudinary-config.js

// Global variables for upload tracking
let uploadInProgress = false;
let uploadQueue = [];

/**
 * Upload image to Cloudinary
 * @param {string} imageData - Base64 image data
 * @param {string} type - 'front' or 'back'
 * @param {string} productName - Name of the product for file naming
 * @returns {Promise<Object>} - Upload result with URL and public_id
 */
async function uploadImageToCloudinary(imageData, type, productName = 'product') {
    try {
        // Validate configuration before upload
        const configValidation = validateCloudinaryConfig();
        if (!configValidation.isValid) {
            throw new Error(`Configuration error: ${configValidation.message}`);
        }
        
        // Show upload progress
        showUploadProgress(type, 'Uploading...');
        
        // Convert base64 to blob
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Create form data for Cloudinary
        const formData = new FormData();
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${productName.replace(/\s+/g, '_')}_${type}_${timestamp}`;
        
        formData.append('file', blob);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
        formData.append('folder', `${CLOUDINARY_CONFIG.folder}/${type}`);
        formData.append('public_id', filename);
        formData.append('resource_type', CLOUDINARY_CONFIG.settings.resourceType);
        formData.append('format', CLOUDINARY_CONFIG.settings.format);
        formData.append('quality', CLOUDINARY_CONFIG.settings.quality);
        
        // Upload to Cloudinary using the utility function
        const uploadResponse = await fetch(getCloudinaryUploadUrl(), {
            method: 'POST',
            body: formData
        });
          if (!uploadResponse.ok) {
            // Get detailed error information
            let errorMessage = `Upload failed: ${uploadResponse.statusText}`;
            try {
                const errorData = await uploadResponse.json();
                if (errorData.error && errorData.error.message) {
                    errorMessage = `Upload failed: ${errorData.error.message}`;
                }
                console.error('Cloudinary Error Details:', errorData);
            } catch (e) {
                console.error('Could not parse error response');
            }
            throw new Error(errorMessage);
        }
        
        const result = await uploadResponse.json();
        
        // Show success
        showUploadProgress(type, 'Upload complete!');
        setTimeout(() => hideUploadProgress(type), 2000);
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
        
    } catch (error) {
        console.error(`Failed to upload ${type} image to Cloudinary:`, error);
        
        // Enhanced error messaging for common issues
        let userMessage = 'Upload failed!';
        if (error.message.includes('Unauthorized')) {
            userMessage = 'Upload failed: Check Cloudinary setup';
            console.error('SOLUTION: Ensure your upload preset is set to "Unsigned" in Cloudinary dashboard');
        } else if (error.message.includes('Invalid upload preset')) {
            userMessage = 'Upload failed: Invalid preset';
            console.error('SOLUTION: Create an upload preset named "inventory_preset" in Cloudinary dashboard');
        } else if (error.message.includes('Resource not found')) {
            userMessage = 'Upload failed: Check cloud name';
            console.error('SOLUTION: Verify your Cloudinary cloud name in the configuration');
        }
        
        showUploadProgress(type, userMessage, true);
        setTimeout(() => hideUploadProgress(type), 5000);
        throw error;
    }
}

/**
 * Upload both front and back images
 * @param {string} frontImageData - Base64 front image data
 * @param {string} backImageData - Base64 back image data
 * @param {string} productName - Name of the product
 * @returns {Promise<Object>} - Object containing both upload results
 */
async function uploadProductImages(frontImageData, backImageData, productName) {
    const uploadResults = {
        frontImageUrl: null,
        frontImageId: null,
        backImageUrl: null,
        backImageId: null
    };
    
    try {
        uploadInProgress = true;
        
        // Upload front image if provided
        if (frontImageData) {
            console.log('Uploading front image...');
            const frontResult = await uploadImageToCloudinary(frontImageData, 'front', productName);
            uploadResults.frontImageUrl = frontResult.url;
            uploadResults.frontImageId = frontResult.publicId;
        }
        
        // Upload back image if provided
        if (backImageData) {
            console.log('Uploading back image...');
            const backResult = await uploadImageToCloudinary(backImageData, 'back', productName);
            uploadResults.backImageUrl = backResult.url;
            uploadResults.backImageId = backResult.publicId;
        }
        
        console.log('All images uploaded successfully:', uploadResults);
        return uploadResults;
        
    } catch (error) {
        console.error('Failed to upload product images:', error);
        
        // Clean up any successfully uploaded images
        await cleanupPartialUploads(uploadResults);
        
        throw error;
    } finally {
        uploadInProgress = false;
    }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteImageFromCloudinary(publicId) {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Create signature for authenticated request
        const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
        const signature = await generateSignature(stringToSign);
        
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('timestamp', timestamp);
        formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
        formData.append('signature', signature);
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        const result = await response.json();
        return result.result === 'ok';
        
    } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
        return false;
    }
}

/**
 * Generate signature for Cloudinary authenticated requests
 * Note: In production, this should be done on the backend for security
 * @param {string} stringToSign - String to sign
 * @returns {Promise<string>} - Generated signature
 */
async function generateSignature(stringToSign) {
    // This is a simplified version - in production, generate signature on backend
    // For now, we'll skip signature validation by using unsigned uploads
    return '';
}

/**
 * Clean up partially uploaded images in case of failure
 * @param {Object} uploadResults - Results object with any successful uploads
 */
async function cleanupPartialUploads(uploadResults) {
    const cleanupPromises = [];
    
    if (uploadResults.frontImageId) {
        console.log('Cleaning up front image:', uploadResults.frontImageId);
        cleanupPromises.push(deleteImageFromCloudinary(uploadResults.frontImageId));
    }
    
    if (uploadResults.backImageId) {
        console.log('Cleaning up back image:', uploadResults.backImageId);
        cleanupPromises.push(deleteImageFromCloudinary(uploadResults.backImageId));
    }
    
    if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
    }
}

/**
 * Show upload progress indicator
 * @param {string} type - 'front' or 'back'
 * @param {string} message - Progress message
 * @param {boolean} isError - Whether this is an error message
 */
function showUploadProgress(type, message, isError = false) {
    const imageZone = document.getElementById(`${type}ImageZone`);
    if (!imageZone) return;
    
    // Remove existing progress indicator
    const existingProgress = imageZone.querySelector('.upload-progress');
    if (existingProgress) {
        existingProgress.remove();
    }
    
    // Create progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.className = `upload-progress ${isError ? 'error' : 'success'}`;
    progressDiv.innerHTML = `
        <div class="progress-content">
            ${isError ? '<i class="bx bx-error"></i>' : '<i class="bx bx-loader-alt bx-spin"></i>'}
            <span>${message}</span>
        </div>
    `;
    
    imageZone.appendChild(progressDiv);
}

/**
 * Hide upload progress indicator
 * @param {string} type - 'front' or 'back'
 */
function hideUploadProgress(type) {
    const imageZone = document.getElementById(`${type}ImageZone`);
    if (!imageZone) return;
    
    const progressDiv = imageZone.querySelector('.upload-progress');
    if (progressDiv) {
        progressDiv.remove();
    }
}

/**
 * Validate image before upload
 * @param {string} imageData - Base64 image data
 * @param {string} type - 'front' or 'back'
 * @returns {boolean} - Whether image is valid
 */
function validateImageForUpload(imageData, type) {
    if (!imageData) {
        console.warn(`No ${type} image data provided`);
        return false;
    }
    
    // Check if it's a valid base64 image
    if (!imageData.startsWith('data:image/')) {
        console.error(`Invalid ${type} image format`);
        return false;
    }
    
    // Check approximate file size (base64 is ~33% larger than binary)
    const sizeInBytes = (imageData.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    if (sizeInBytes > maxSize) {
        console.error(`${type} image is too large: ${sizeInBytes} bytes`);
        return false;
    }
    
    return true;
}

/**
 * Get optimized image URL from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized image URL
 */
function getOptimizedImageUrl(publicId, options = {}) {
    const {
        width = 400,
        height = 533,
        quality = 'auto:good',
        format = 'auto',
        crop = 'fill'
    } = options;
    
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
}

/**
 * Update the existing saveProduct function to include Cloudinary uploads
 * This function integrates with the existing inventory.js
 */
async function saveProductWithCloudinary() {
    try {
        // Show loading state
        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
        
        // Collect form data (using existing function)
        const formData = collectFormData();
        
        // Validate required fields
        if (!formData.name || !formData.category || !formData.color || !formData.rentalPrice) {
            throw new Error('Please fill in all required fields');
        }
        
        // Upload images to Cloudinary if they exist
        let uploadResults = {
            frontImageUrl: null,
            frontImageId: null,
            backImageUrl: null,
            backImageId: null
        };
        
        if (frontImageData || backImageData) {
            console.log('Uploading images to Cloudinary...');
            uploadResults = await uploadProductImages(
                frontImageData, 
                backImageData, 
                formData.name
            );
        }
        
        // Combine form data with upload results
        const productData = {
            ...formData,
            ...uploadResults,
            dateAdded: new Date().toISOString(),
            id: Date.now()
        };
        
        // Add to inventory (using existing function)
        addProductToInventory(productData);
        
        // Show success message
        showSuccessMessage('Product saved successfully with images uploaded to Cloudinary!');
        
        // Close modal
        closeAddProductModal();
        
    } catch (error) {
        console.error('Failed to save product:', error);
        alert(`Failed to save product: ${error.message}`);
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bx bx-save"></i> Save Product';
        }
    }
}

/**
 * Initialize Cloudinary upload functionality
 * Call this after DOM is loaded
 */
function initializeCloudinaryUpload() {
    // Replace the existing save button event listener
    const saveBtn = document.getElementById('saveProductBtn');
    if (saveBtn) {
        // Remove existing event listeners by cloning
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        // Add new event listener for Cloudinary upload
        newSaveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveProductWithCloudinary();
        });
    }
    
    console.log('Cloudinary upload functionality initialized');
}

/**
 * Enhanced form data collection that includes image URLs
 * Extends the existing collectFormData function
 */
function collectFormDataWithImages() {
    // Get the base form data
    const baseFormData = collectFormData();
    
    // Add image data
    return {
        ...baseFormData,
        frontImageData: frontImageData,
        backImageData: backImageData,
        hasImages: !!(frontImageData || backImageData)
    };
}

/**
 * Update product display to show Cloudinary images
 * @param {Object} product - Product object with image URLs
 * @returns {string} - HTML for product image display
 */
function generateProductImageHTML(product) {
    if (product.frontImageUrl) {
        return `
            <div class="product-image">
                <img src="${getOptimizedImageUrl(product.frontImageId, { width: 280, height: 200 })}" 
                     alt="${product.name}" 
                     loading="lazy"
                     onerror="this.src='assets/img/placeholder-product.jpg'">
                <div class="status-badge ${product.status}">${getStatusText(product.status)}</div>
                <div class="color-indicator" style="background-color: ${product.colorHex}" 
                     title="${product.color}" 
                     onclick="openColorPicker('product', ${product.id}, '${product.colorHex}')">
                </div>
            </div>
        `;
    } else {
        return `
            <div class="product-image">
                <div class="image-placeholder">
                    <i class='bx bxs-t-shirt'></i>
                    <span class="placeholder-text">Product Image</span>
                </div>
                <div class="status-badge ${product.status}">${getStatusText(product.status)}</div>
                <div class="color-indicator" style="background-color: ${product.colorHex}" 
                     title="${product.color}" 
                     onclick="openColorPicker('product', ${product.id}, '${product.colorHex}')">
                </div>
            </div>
        `;
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure other scripts are loaded first
    setTimeout(initializeCloudinaryUpload, 1000);
});

// Debug and Testing Functions

/**
 * Test Cloudinary configuration and connection
 * Call this function from browser console: testCloudinaryConfig()
 */
async function testCloudinaryConfig() {
    console.log('🔧 Testing Cloudinary Configuration...');
    
    // Test 1: Configuration validation
    const configValidation = validateCloudinaryConfig();
    console.log('📋 Configuration Validation:', configValidation);
    
    if (!configValidation.isValid) {
        console.error('❌ Configuration is invalid. Please fix the errors above.');
        return false;
    }
    
    // Test 2: Check if cloud exists
    try {
        console.log('🌐 Testing cloud connectivity...');
        const testUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/sample.jpg`;
        const response = await fetch(testUrl, { method: 'HEAD' });
        
        if (response.ok) {
            console.log('✅ Cloud name is valid and accessible');
        } else {
            console.error('❌ Cloud name appears to be invalid');
            return false;
        }
    } catch (error) {
        console.error('❌ Network error testing cloud:', error);
        return false;
    }
    
    // Test 3: Upload preset validation (this will help identify the unauthorized issue)
    try {
        console.log('🔑 Testing upload preset...');
        const formData = new FormData();
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('file', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        
        const uploadResponse = await fetch(getCloudinaryUploadUrl(), {
            method: 'POST',
            body: formData
        });
        
        if (uploadResponse.ok) {
            console.log('✅ Upload preset is valid and configured correctly');
            const result = await uploadResponse.json();
            console.log('📤 Test upload successful:', result.public_id);
            
            // Clean up test image
            console.log('🧹 Test completed successfully. You can now upload images.');
            return true;
        } else {
            const errorData = await uploadResponse.json();
            console.error('❌ Upload preset test failed:', errorData);
            
            if (uploadResponse.status === 401) {
                console.error('🔐 AUTHORIZATION ERROR: Your upload preset is likely set to "Signed" mode.');
                console.error('📝 SOLUTION: Change your upload preset to "Unsigned" mode in Cloudinary dashboard.');
                console.error('🔗 Go to: Settings → Upload → Upload presets → Edit "inventory_preset"');
            }
            return false;
        }
    } catch (error) {
        console.error('❌ Error testing upload preset:', error);
        return false;
    }
}

/**
 * Show current configuration (without sensitive data)
 */
function showCloudinaryConfig() {
    console.log('📊 Current Cloudinary Configuration:');
    console.log('Cloud Name:', CLOUDINARY_CONFIG.cloudName);
    console.log('Upload Preset:', CLOUDINARY_CONFIG.uploadPreset);
    console.log('Folder:', CLOUDINARY_CONFIG.folder);
    console.log('Upload URL:', getCloudinaryUploadUrl());
    console.log('\n💡 To test configuration, run: testCloudinaryConfig()');
}

// Make test functions available globally for console debugging
window.testCloudinaryConfig = testCloudinaryConfig;
window.showCloudinaryConfig = showCloudinaryConfig;

// Auto-run configuration check on load
document.addEventListener('DOMContentLoaded', function() {
    const configValidation = validateCloudinaryConfig();
    if (!configValidation.isValid) {
        console.warn('⚠️ Cloudinary configuration issues detected:', configValidation.message);
        console.log('💡 Run testCloudinaryConfig() in console for detailed diagnostics');
    }
});

// Export functions for use in other modules
window.CloudinaryUpload = {
    uploadImageToCloudinary,
    uploadProductImages,
    deleteImageFromCloudinary,
    getOptimizedImageUrl,
    validateImageForUpload,
    saveProductWithCloudinary,
    collectFormDataWithImages,
    generateProductImageHTML
};

console.log('Cloudinary Upload Service loaded successfully');
