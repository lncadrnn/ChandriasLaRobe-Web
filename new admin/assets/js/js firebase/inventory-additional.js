// Inventory Additional Service
// This file handles all additional product operations including image upload, cropping, and Firebase storage

import { InventoryFetcher } from './inventory-fetching.js';

/**
 * Additional Product Manager Class
 * Handles all operations related to additional products (accessories)
 */
class AdditionalManager {
    constructor() {
        this.currentAdditionalImage = null;
        this.additionalCropper = null;
        this.inclusionCounter = 0;
        this.currentInclusions = [];
        this.isUploading = false;
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners for additional product management
     */
    initializeEventListeners() {
        // Modal controls
        document.getElementById('addAdditionalBtn')?.addEventListener('click', () => this.openAddAdditionalModal());
        document.getElementById('closeAddAdditionalModal')?.addEventListener('click', () => this.closeAddAdditionalModal());
        document.getElementById('cancelAddAdditionalBtn')?.addEventListener('click', () => this.closeAddAdditionalModal());
        document.getElementById('saveAdditionalBtn')?.addEventListener('click', () => this.saveAdditional());

        // Image upload
        document.getElementById('additionalImageInput')?.addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('additionalImageZone')?.addEventListener('click', () => this.triggerImageUpload());
        document.getElementById('additionalImageZone')?.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.getElementById('additionalImageZone')?.addEventListener('drop', (e) => this.handleImageDrop(e));

        // Form inputs
        document.getElementById('additionalName')?.addEventListener('input', () => this.generateAdditionalCode());
        document.getElementById('withInclusionsCheckbox')?.addEventListener('change', (e) => this.toggleInclusionsContainer(e));
        document.getElementById('addInclusionBtn')?.addEventListener('click', () => this.addInclusionItem());
        document.getElementById('removeInclusionBtn')?.addEventListener('click', () => this.removeLastInclusionItem());

        console.log('Additional Manager event listeners initialized');
    }

    /**
     * Open the add additional modal
     */
    openAddAdditionalModal() {
        const modal = document.getElementById('addAdditionalModal');
        if (modal) {
            modal.style.display = 'flex';
            this.resetForm();
        }
    }

    /**
     * Close the add additional modal
     */
    closeAddAdditionalModal() {
        const modal = document.getElementById('addAdditionalModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetForm();
            this.destroyCropper();
        }
    }

    /**
     * Reset the additional form
     */
    resetForm() {
        const form = document.getElementById('addAdditionalForm');
        if (form) {
            form.reset();
        }

        // Reset image upload
        this.resetImageUpload();
        
        // Reset inclusions
        this.resetInclusions();
        
        // Clear generated code
        document.getElementById('additionalCode').value = '';
        
        this.currentAdditionalImage = null;
        this.inclusionCounter = 0;
        this.currentInclusions = [];
    }

    /**
     * Reset image upload area
     */
    resetImageUpload() {
        const placeholder = document.getElementById('additionalPlaceholder');
        const preview = document.getElementById('additionalPreview');
        
        if (placeholder) placeholder.style.display = 'block';
        if (preview) preview.style.display = 'none';
        
        const img = document.getElementById('additionalImage');
        if (img) img.src = '';
    }

    /**
     * Reset inclusions section
     */
    resetInclusions() {
        const checkbox = document.getElementById('withInclusionsCheckbox');
        const container = document.getElementById('inclusionsContainer');
        const list = document.getElementById('inclusionsList');
        
        if (checkbox) checkbox.checked = false;
        if (container) container.style.display = 'none';
        if (list) list.innerHTML = '';
    }

    /**
     * Trigger image upload
     */
    triggerImageUpload() {
        document.getElementById('additionalImageInput')?.click();
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }

    /**
     * Handle image drop
     */
    handleImageDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }

    /**
     * Handle image upload from input
     */
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }

    /**
     * Process uploaded image file
     */
    processImageFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Display image preview
     */
    displayImagePreview(imageSrc) {
        const placeholder = document.getElementById('additionalPlaceholder');
        const preview = document.getElementById('additionalPreview');
        const img = document.getElementById('additionalImage');
        
        if (placeholder) placeholder.style.display = 'none';
        if (preview) preview.style.display = 'block';
        if (img) img.src = imageSrc;
        
        this.currentAdditionalImage = imageSrc;
    }

    /**
     * Generate additional code based on name
     */
    generateAdditionalCode() {
        const nameInput = document.getElementById('additionalName');
        const codeInput = document.getElementById('additionalCode');
        
        if (nameInput && codeInput && nameInput.value.trim()) {
            const name = nameInput.value.trim().toUpperCase();
            const prefix = 'ADD';
            const namePart = name.substring(0, 3).replace(/[^A-Z]/g, '');
            const timestamp = Date.now().toString().slice(-4);
            
            const code = `${prefix}-${namePart}-${timestamp}`;
            codeInput.value = code;
        }
    }

    /**
     * Toggle inclusions container
     */
    toggleInclusionsContainer(e) {
        const container = document.getElementById('inclusionsContainer');
        if (container) {
            if (e.target.checked) {
                container.style.display = 'block';
                this.addInclusionItem(); // Add first inclusion item
            } else {
                container.style.display = 'none';
                this.resetInclusions();
            }
        }
    }

    /**
     * Add inclusion item
     */
    addInclusionItem() {
        const list = document.getElementById('inclusionsList');
        if (!list) return;

        this.inclusionCounter++;
        const inclusionId = `inclusion_${this.inclusionCounter}`;
        
        const inclusionItem = document.createElement('div');
        inclusionItem.className = 'inclusion-item';
        inclusionItem.dataset.inclusionId = inclusionId;
        
        inclusionItem.innerHTML = `
            <div class="form-group">
                <label for="${inclusionId}">Inclusion Item ${this.inclusionCounter}</label>
                <input type="text" id="${inclusionId}" class="inclusion-input" placeholder="Enter inclusion item name" required>
                <button type="button" class="remove-single-inclusion" onclick="additionalManager.removeSingleInclusion('${inclusionId}')">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `;
        
        list.appendChild(inclusionItem);
    }

    /**
     * Remove last inclusion item
     */
    removeLastInclusionItem() {
        const list = document.getElementById('inclusionsList');
        if (list && list.children.length > 1) {
            list.removeChild(list.lastElementChild);
        }
    }

    /**
     * Remove single inclusion item
     */
    removeSingleInclusion(inclusionId) {
        const item = document.querySelector(`[data-inclusion-id="${inclusionId}"]`);
        if (item) {
            item.remove();
        }
    }

    /**
     * Collect inclusion items from form
     */
    collectInclusions() {
        const inclusionInputs = document.querySelectorAll('.inclusion-input');
        const inclusions = [];
        
        inclusionInputs.forEach(input => {
            if (input.value.trim()) {
                inclusions.push({
                    name: input.value.trim(),
                    id: input.id
                });
            }
        });
        
        return inclusions;
    }

    /**
     * Open additional image cropper
     */
    openAdditionalImageCropper() {
        if (!this.currentAdditionalImage) {
            showNotification('Please upload an image first', 'error');
            return;
        }

        const modal = document.getElementById('additionalImageCropperModal');
        const img = document.getElementById('additionalCropperImage');
        
        if (modal && img) {
            img.src = this.currentAdditionalImage;
            modal.style.display = 'flex';
            
            // Initialize cropper with square aspect ratio
            setTimeout(() => {
                this.initializeAdditionalCropper();
            }, 100);
        }
    }

    /**
     * Initialize additional image cropper (square aspect ratio)
     */
    initializeAdditionalCropper() {
        const img = document.getElementById('additionalCropperImage');
        if (img && typeof Cropper !== 'undefined') {
            this.destroyCropper();
            
            this.additionalCropper = new Cropper(img, {
                aspectRatio: 1, // Square aspect ratio
                viewMode: 1,
                autoCropArea: 0.8,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        }
    }

    /**
     * Apply additional crop
     */
    applyAdditionalCrop() {
        if (!this.additionalCropper) return;

        const canvas = this.additionalCropper.getCroppedCanvas({
            width: 500,
            height: 500,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (canvas) {
            const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
            this.displayImagePreview(croppedImageData);
            this.closeAdditionalCropperModal();
        }
    }

    /**
     * Close additional cropper modal
     */
    closeAdditionalCropperModal() {
        const modal = document.getElementById('additionalImageCropperModal');
        if (modal) {
            modal.style.display = 'none';
            this.destroyCropper();
        }
    }

    /**
     * Destroy cropper instance
     */
    destroyCropper() {
        if (this.additionalCropper) {
            this.additionalCropper.destroy();
            this.additionalCropper = null;
        }
    }

    /**
     * Remove additional image
     */
    removeAdditionalImage() {
        this.currentAdditionalImage = null;
        this.resetImageUpload();
    }

    /**
     * Validate additional form
     */
    validateForm() {
        const name = document.getElementById('additionalName')?.value.trim();
        const price = document.getElementById('additionalRentalPrice')?.value;
        
        if (!name) {
            showNotification('Please enter a product name', 'error');
            return false;
        }
        
        if (!price || parseFloat(price) <= 0) {
            showNotification('Please enter a valid rental price', 'error');
            return false;
        }
        
        if (!this.currentAdditionalImage) {
            showNotification('Please upload a product image', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * Save additional product
     */
    async saveAdditional() {
        if (this.isUploading) {
            showNotification('Upload in progress, please wait...', 'warning');
            return;
        }

        if (!this.validateForm()) {
            return;
        }

        try {
            this.isUploading = true;
            showSpinner('Saving additional product...');
            
            // Collect form data
            const formData = this.collectFormData();
            
            // Upload image to Cloudinary
            if (this.currentAdditionalImage) {
                const imageUrl = await this.uploadImageToCloudinary(this.currentAdditionalImage);
                formData.imageUrl = imageUrl;
            }
            
            // Save to Firebase
            const savedAdditional = await InventoryFetcher.addAdditional(formData);
            
            hideSpinner();
            showNotification('Additional product saved successfully!', 'success');
            
            // Close modal and refresh list
            this.closeAddAdditionalModal();
            this.refreshAdditionalsList();
            
        } catch (error) {
            console.error('Error saving additional:', error);
            hideSpinner();
            showNotification('Failed to save additional product: ' + error.message, 'error');
        } finally {
            this.isUploading = false;
        }
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const name = document.getElementById('additionalName')?.value.trim();
        const code = document.getElementById('additionalCode')?.value.trim();
        const price = parseFloat(document.getElementById('additionalRentalPrice')?.value);
        const withInclusions = document.getElementById('withInclusionsCheckbox')?.checked;
        
        const formData = {
            name,
            code,
            rentalPrice: price,
            withInclusions,
            inclusions: withInclusions ? this.collectInclusions() : [],
            type: 'accessory',
            status: 'available',
            createdAt: new Date().toISOString()
        };
        
        return formData;
    }

    /**
     * Upload image to Cloudinary
     */
    async uploadImageToCloudinary(imageData) {
        if (typeof window.cloudinaryUpload === 'function') {
            return await window.cloudinaryUpload(imageData, 'additionals');
        } else {
            throw new Error('Cloudinary upload service not available');
        }
    }

    /**
     * Refresh additionals list
     */
    async refreshAdditionalsList() {
        try {
            const additionals = await InventoryFetcher.fetchAdditionals();
            this.displayAdditionals(additionals);
        } catch (error) {
            console.error('Error refreshing additionals list:', error);
        }
    }

    /**
     * Display additionals in the list
     */
    displayAdditionals(additionals) {
        const container = document.getElementById('additionalsList');
        if (!container) return;

        if (additionals.length === 0) {
            container.innerHTML = `
                <div class="empty-message">
                    <i class='bx bx-diamond'></i>
                    <h3>No additionals added yet</h3>
                    <p>Click "Add Additional" to start managing your accessories</p>
                </div>
            `;
            return;
        }

        container.innerHTML = additionals.map(additional => this.createAdditionalCard(additional)).join('');
    }

    /**
     * Create additional card HTML
     */
    createAdditionalCard(additional) {
        const inclusionsText = additional.withInclusions && additional.inclusions?.length > 0 
            ? `<p class="inclusions"><i class='bx bx-diamond'></i> ${additional.inclusions.length} inclusions</p>`
            : '';

        return `
            <div class="inventory-item additional-item" data-id="${additional.id}">
                <div class="item-image">
                    <img src="${additional.imageUrl || 'assets/img/placeholder.png'}" alt="${additional.name}">
                </div>
                <div class="item-details">
                    <h3 class="item-name">${additional.name}</h3>
                    <p class="item-code">${additional.code}</p>
                    <p class="item-price">₱${additional.rentalPrice.toFixed(2)}</p>
                    ${inclusionsText}
                    <div class="item-status">
                        <span class="status-badge ${additional.status}">${additional.status}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="additionalManager.viewAdditional('${additional.id}')" title="View Details">
                        <i class='bx bx-show'></i>
                    </button>
                    <button class="btn-icon" onclick="additionalManager.editAdditional('${additional.id}')" title="Edit">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon danger" onclick="additionalManager.deleteAdditional('${additional.id}')" title="Delete">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * View additional details
     */
    async viewAdditional(additionalId) {
        try {
            const additional = await InventoryFetcher.fetchAdditionalById(additionalId);
            if (additional) {
                // Show additional details in modal
                this.showAdditionalDetails(additional);
            }
        } catch (error) {
            console.error('Error viewing additional:', error);
            showNotification('Failed to load additional details', 'error');
        }
    }

    /**
     * Show additional details in modal
     */
    showAdditionalDetails(additional) {
        // Implementation for showing additional details
        console.log('Showing additional details:', additional);
    }

    /**
     * Edit additional
     */
    async editAdditional(additionalId) {
        // Implementation for editing additional
        console.log('Editing additional:', additionalId);
    }

    /**
     * Delete additional
     */
    async deleteAdditional(additionalId) {
        if (!confirm('Are you sure you want to delete this additional?')) {
            return;
        }

        try {
            await InventoryFetcher.deleteAdditional(additionalId);
            showNotification('Additional deleted successfully', 'success');
            this.refreshAdditionalsList();
        } catch (error) {
            console.error('Error deleting additional:', error);
            showNotification('Failed to delete additional', 'error');
        }
    }
}

// Create global instance
const additionalManager = new AdditionalManager();

// Make available globally
window.additionalManager = additionalManager;
window.openAdditionalImageCropper = () => additionalManager.openAdditionalImageCropper();
window.applyAdditionalCrop = () => additionalManager.applyAdditionalCrop();
window.closeAdditionalCropperModal = () => additionalManager.closeAdditionalCropperModal();
window.removeAdditionalImage = () => additionalManager.removeAdditionalImage();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Additional Manager initialized');
});

export default additionalManager;
