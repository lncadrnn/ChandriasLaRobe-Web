// Inventory Cloud Service for image management
class InventoryCloudService {
    constructor() {
        this.isInitialized = false;
        this.config = null;
    }

    // Initialize the cloud service
    async initialize() {
        try {
            if (window.cloudinaryConfig) {
                this.config = window.cloudinaryConfig;
                this.isInitialized = true;
                console.log('Inventory Cloud Service initialized successfully');
                return { success: true };
            } else {
                throw new Error('Cloudinary configuration not found');
            }
        } catch (error) {
            console.error('Failed to initialize Inventory Cloud Service:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload product image
    async uploadProductImage(file, productData, imageType = 'front') {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!file) {
                throw new Error('No file provided for upload');
            }

            // Create folder structure based on category
            const category = productData.category || 'general';
            const folder = `inventory/products/${category}`;

            // Upload to Cloudinary
            const uploadResult = await window.uploadImageToCloudinary(file, folder);

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload image');
            }

            return {
                success: true,
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                imageType: imageType,
                metadata: {
                    width: uploadResult.width,
                    height: uploadResult.height,
                    uploadedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Error uploading product image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload additional image
    async uploadAdditionalImage(file, additionalData) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!file) {
                throw new Error('No file provided for upload');
            }

            // Create folder structure based on type
            const type = additionalData.type || 'general';
            const folder = `inventory/additionals/${type}`;

            // Upload to Cloudinary
            const uploadResult = await window.uploadImageToCloudinary(file, folder);

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload image');
            }

            return {
                success: true,
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                metadata: {
                    width: uploadResult.width,
                    height: uploadResult.height,
                    uploadedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Error uploading additional image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete image
    async deleteImage(publicId) {
        try {
            if (!publicId) {
                throw new Error('No public ID provided for deletion');
            }

            const deleteResult = await window.deleteImageFromCloudinary(publicId);
            
            return {
                success: deleteResult.success,
                message: deleteResult.message || deleteResult.error
            };

        } catch (error) {
            console.error('Error deleting image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Batch upload multiple images
    async uploadMultipleImages(files, itemData, itemType = 'product') {
        try {
            const uploadPromises = files.map(async (file, index) => {
                if (itemType === 'product') {
                    const imageType = index === 0 ? 'front' : 'back';
                    return await this.uploadProductImage(file, itemData, imageType);
                } else {
                    return await this.uploadAdditionalImage(file, itemData);
                }
            });

            const results = await Promise.all(uploadPromises);
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            return {
                success: failed.length === 0,
                results: results,
                successCount: successful.length,
                failCount: failed.length
            };

        } catch (error) {
            console.error('Error uploading multiple images:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create global instance
const inventoryCloudService = new InventoryCloudService();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    inventoryCloudService.initialize();
});

// Make service available globally
window.inventoryCloudService = inventoryCloudService;
