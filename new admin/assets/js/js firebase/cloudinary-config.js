// Cloudinary Configuration for Image Upload
/**
 * SECURITY WARNING: 
 * The API secret used in deleteImageFromCloudinary should be moved to a backend service in production.
 * Client-side exposure of API secrets is a security risk.
 * This implementation is for development/testing purposes only.
 */
const cloudinaryConfig = {
    cloudName: 'dbtomr3fm', // Using working cloud name from old admin
    apiKey: '814782524531725', // Using working API key from old admin
    uploadPreset: 'UPLOAD_IMG', // Using working upload preset from old admin
    apiSecret: '9vWGOUYipmrq2ecCato2G9MTA7Q' // API secret for image deletion - same as old admin
};

// Cloudinary Upload URL
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

// Upload image to Cloudinary
async function uploadImageToCloudinary(file, folder = 'inventory') {
    try {
        console.log('🚀 Starting Cloudinary upload...');
        console.log('📁 Upload config:', {
            cloudName: cloudinaryConfig.cloudName,
            uploadPreset: cloudinaryConfig.uploadPreset,
            folder: folder,
            fileSize: file.size,
            fileType: file.type
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', folder);
        formData.append('resource_type', 'image');

        console.log('📤 Making request to:', CLOUDINARY_UPLOAD_URL);

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Cloudinary error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Cloudinary upload successful:', result);
        
        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height
        };
    } catch (error) {
        console.error('❌ Error uploading to Cloudinary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Generate signature for signed operations (DELETE)
// Note: In production, this should be done on the backend for security
async function generateSignature(publicId, timestamp, apiSecret) {
    const dataToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Delete image from Cloudinary
async function deleteImageFromCloudinary(publicId) {
    try {
        if (!publicId) {
            throw new Error('No public ID provided for deletion');
        }

        // Check if we have an API secret configured
        const apiSecret = cloudinaryConfig.apiSecret;
        
        if (!apiSecret) {
            // If no API secret is configured, log the request and return success
            // In production, this should make a request to your backend API
            console.warn('⚠️ Cloudinary API secret not configured. Image deletion simulated.');
            console.log('🗑️ Delete image requested for:', publicId);
            console.log('💡 To enable actual deletion, configure cloudinaryConfig.apiSecret or implement backend deletion.');
            
            return {
                success: true,
                message: `Image deletion requested for ${publicId} (simulated - configure API secret for actual deletion)`,
                simulated: true
            };
        }
        
        // If API secret is available, perform actual deletion
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Generate signature
        const signature = await generateSignature(publicId, timestamp, apiSecret);
        
        // Create form data for deletion request
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', cloudinaryConfig.apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        
        // Make deletion request
        const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`;
        const response = await fetch(deleteUrl, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('Cloudinary deletion result:', result);
        
        if (result.result === 'ok' || result.result === 'not found') {
            return {
                success: true,
                message: `Image ${publicId} deleted successfully`,
                result: result
            };
        } else {
            throw new Error(`Cloudinary deletion failed: ${JSON.stringify(result)}`);
        }
        
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Make functions available globally
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.deleteImageFromCloudinary = deleteImageFromCloudinary;
window.cloudinaryConfig = cloudinaryConfig;

// Test function to validate Cloudinary configuration
window.testCloudinaryConnection = async function() {
    try {
        console.log('🧪 Testing Cloudinary connection...');
        
        // Create a simple test image (1x1 pixel PNG)
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 1, 1);
        
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                const testFile = new File([blob], 'test.png', { type: 'image/png' });
                const result = await uploadImageToCloudinary(testFile, 'test');
                
                if (result.success) {
                    console.log('✅ Cloudinary connection test successful!');
                    console.log('📍 Test image URL:', result.url);
                    resolve(true);
                } else {
                    console.error('❌ Cloudinary connection test failed:', result.error);
                    resolve(false);
                }
            }, 'image/png');
        });
    } catch (error) {
        console.error('❌ Cloudinary test error:', error);
        return false;
    }
};

// Log configuration status
console.log('🔧 Cloudinary Configuration Loaded:', {
    cloudName: cloudinaryConfig.cloudName,
    uploadPreset: cloudinaryConfig.uploadPreset,
    hasApiKey: !!cloudinaryConfig.apiKey,
    hasApiSecret: !!cloudinaryConfig.apiSecret
});
