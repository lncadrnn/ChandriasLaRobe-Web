// Cloudinary Upload Service for Inventory Management

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dcush2pqt',
    uploadPreset: 'inventory_preset', // You'll need to create this preset in Cloudinary
    apiKey: '739938547572917', // Your Cloudinary API key
    folder: 'inventory/products'
};

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
        formData.append('resource_type', 'image');
        formData.append('format', 'jpg');
        formData.append('quality', 'auto:good');
        
        // Upload to Cloudinary
        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
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
        showUploadProgress(type, 'Upload failed!', true);
        setTimeout(() => hideUploadProgress(type), 3000);
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
