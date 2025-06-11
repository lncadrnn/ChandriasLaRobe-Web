// Cloudinary Configuration for Inventory Management

/**
 * Cloudinary Configuration Object
 * 
 * IMPORTANT SETUP INSTRUCTIONS:
 * 1. Create an upload preset in your Cloudinary dashboard:
 *    - Go to Settings > Upload presets
 *    - Create a new unsigned preset named 'inventory_preset'
 *    - Set signing mode to 'Unsigned'
 *    - Configure folder structure and transformations as needed
 * 
 * 2. Update the values below with your actual Cloudinary credentials:
 *    - cloudName: Your Cloudinary cloud name
 *    - uploadPreset: Must match the preset created in step 1
 *    - apiKey: Your Cloudinary API key (for reference, not used in unsigned uploads)
 */

const CLOUDINARY_CONFIG = {
    // Your Cloudinary cloud name (required)
    cloudName: 'dcush2pqt',
    
    // Upload preset name - MUST be set to 'Unsigned' in Cloudinary dashboard
    uploadPreset: 'inventory_preset',
    
    // API key (for reference, not used in unsigned uploads)
    apiKey: '739938547572917',
    
    // Base folder for organizing uploads
    folder: 'inventory/products',
    
    // Upload settings
    settings: {
        resourceType: 'image',
        format: 'jpg',
        quality: 'auto:good',
        
        // Transformation settings (optional)
        transformation: {
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto:good',
            format: 'jpg'
        },
        
        // Thumbnail transformation for previews
        thumbnailTransformation: {
            width: 300,
            height: 300,
            crop: 'fill',
            gravity: 'center',
            quality: 'auto:eco',
            format: 'jpg'
        }
    }
};

/**
 * Get Cloudinary upload URL
 * @returns {string} The upload endpoint URL
 */
function getCloudinaryUploadUrl() {
    return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
}

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - The public ID of the uploaded image
 * @param {string} transformationType - 'full' or 'thumbnail'
 * @returns {string} Optimized image URL
 */
function getOptimizedImageUrl(publicId, transformationType = 'full') {
    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
    
    let transformation = '';
    if (transformationType === 'thumbnail') {
        const thumb = CLOUDINARY_CONFIG.settings.thumbnailTransformation;
        transformation = `w_${thumb.width},h_${thumb.height},c_${thumb.crop},g_${thumb.gravity},q_${thumb.quality},f_${thumb.format}/`;
    } else if (transformationType === 'full') {
        const full = CLOUDINARY_CONFIG.settings.transformation;
        transformation = `w_${full.width},h_${full.height},c_${full.crop},q_${full.quality},f_${full.format}/`;
    }
    
    return `${baseUrl}/${transformation}${publicId}`;
}

/**
 * Validate Cloudinary configuration
 * @returns {Object} Validation result with success flag and message
 */
function validateCloudinaryConfig() {
    const errors = [];
    
    if (!CLOUDINARY_CONFIG.cloudName) {
        errors.push('Cloud name is required');
    }
    
    if (!CLOUDINARY_CONFIG.uploadPreset) {
        errors.push('Upload preset is required');
    }
    
    if (CLOUDINARY_CONFIG.uploadPreset === 'inventory_preset' && CLOUDINARY_CONFIG.cloudName === 'dcush2pqt') {
        errors.push('Please update the configuration with your actual Cloudinary credentials');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        message: errors.length === 0 ? 'Configuration is valid' : 'Configuration errors found: ' + errors.join(', ')
    };
}

// Export configuration and utility functions
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
window.getCloudinaryUploadUrl = getCloudinaryUploadUrl;
window.getOptimizedImageUrl = getOptimizedImageUrl;
window.validateCloudinaryConfig = validateCloudinaryConfig;

// Log configuration status on load
console.log('Cloudinary Config Loaded:', validateCloudinaryConfig());
