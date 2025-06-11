// Cloudinary Configuration for Legacy Admin System

/**
 * IMPORTANT SECURITY NOTE:
 * 
 * This configuration contains SIGNED operations which require API secret.
 * The API secret should NEVER be exposed in client-side code in production.
 * 
 * CURRENT ISSUE: This admin system uses signed operations (image deletion)
 * which require the API secret on the client side - this is a security vulnerability.
 * 
 * RECOMMENDED SOLUTIONS:
 * 1. Move image deletion to a backend service/API endpoint
 * 2. Use server-side functions (Firebase Functions, etc.)
 * 3. Implement a proxy endpoint that handles signed operations
 * 
 * For development/testing purposes only, we provide this configuration,
 * but it should be moved to a secure backend in production.
 */

const LEGACY_CLOUDINARY_CONFIG = {
    // Basic configuration
    cloudName: 'dbtomr3fm',
    uploadPreset: 'UPLOAD_IMG',  // This preset must be set to "Unsigned" for uploads
    
    // WARNING: These should NOT be in client-side code in production
    apiKey: '814782524531725',
    apiSecret: '9vWGOUYipmrq2ecCato2G9MTA7Q', // SECURITY RISK - move to backend!
    
    // Upload settings
    settings: {
        resourceType: 'image',
        format: 'jpg',
        quality: 'auto:good'
    }
};

/**
 * Get Cloudinary upload URL
 * @returns {string} The upload endpoint URL
 */
function getLegacyCloudinaryUploadUrl() {
    return `https://api.cloudinary.com/v1_1/${LEGACY_CLOUDINARY_CONFIG.cloudName}/image/upload`;
}

/**
 * Get Cloudinary delete URL
 * @returns {string} The delete endpoint URL
 */
function getLegacyCloudinaryDeleteUrl() {
    return `https://api.cloudinary.com/v1_1/${LEGACY_CLOUDINARY_CONFIG.cloudName}/image/destroy`;
}

/**
 * Generate signature for signed operations (DELETE)
 * WARNING: This should be done on the backend for security
 * @param {string} publicId - The public ID of the image
 * @param {number} timestamp - Unix timestamp
 * @param {string} apiSecret - API secret (should be on backend)
 * @returns {Promise<string>} The signature
 */
async function generateLegacySignature(publicId, timestamp, apiSecret) {
    const dataToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);

    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SECURE ALTERNATIVE: Create upload form data
 * This uses unsigned uploads which are safe for client-side
 * @param {File} file - The file to upload
 * @returns {FormData} Configured form data for upload
 */
function createLegacyUploadFormData(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", LEGACY_CLOUDINARY_CONFIG.uploadPreset);
    return formData;
}

/**
 * Show security warning in console
 */
function showSecurityWarning() {
    console.warn(
        '⚠️ SECURITY WARNING: Cloudinary API secret is exposed in client-side code!\n' +
        '🔒 SOLUTION: Move image deletion operations to a secure backend service.\n' +
        '📚 LEARN MORE: https://cloudinary.com/documentation/upload_images#unsigned_upload'
    );
}

// Export configuration and utility functions
window.LEGACY_CLOUDINARY_CONFIG = LEGACY_CLOUDINARY_CONFIG;
window.getLegacyCloudinaryUploadUrl = getLegacyCloudinaryUploadUrl;
window.getLegacyCloudinaryDeleteUrl = getLegacyCloudinaryDeleteUrl;
window.generateLegacySignature = generateLegacySignature;
window.createLegacyUploadFormData = createLegacyUploadFormData;

// Show security warning when loaded
document.addEventListener('DOMContentLoaded', showSecurityWarning);

console.log('🔧 Legacy Cloudinary Config Loaded - Check security warnings above!');
