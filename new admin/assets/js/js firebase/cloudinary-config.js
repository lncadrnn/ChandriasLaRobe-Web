// Cloudinary Configuration for Image Upload
const cloudinaryConfig = {
    cloudName: 'dq3ppjkpe', // Replace with your Cloudinary cloud name
    apiKey: '953695138133449', // Replace with your Cloudinary API key
    uploadPreset: 'chandrias-inventory' // Replace with your upload preset
};

// Cloudinary Upload URL
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

// Upload image to Cloudinary
async function uploadImageToCloudinary(file, folder = 'inventory') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', folder);
        formData.append('resource_type', 'image');

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Delete image from Cloudinary
async function deleteImageFromCloudinary(publicId) {
    try {
        // Note: This would typically require server-side implementation
        // For client-side deletion, you'd need to make a request to your backend
        console.log('Delete image requested for:', publicId);
        
        // Return success for now - implement server-side deletion
        return {
            success: true,
            message: 'Image deletion requested'
        };
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
