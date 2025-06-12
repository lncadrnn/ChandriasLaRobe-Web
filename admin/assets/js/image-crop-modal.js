// Image Crop Modal Functionality
class ImageCropModal {
    constructor() {
        this.modal = document.getElementById('crop-modal');
        this.cropImage = document.getElementById('crop-image');
        this.previewImage = document.getElementById('crop-preview-img');
        this.zoomSlider = document.getElementById('zoom-slider');
        this.rotateSlider = document.getElementById('rotate-slider');
        this.closeBtn = document.getElementById('crop-close-btn');
        this.cancelBtn = document.getElementById('crop-cancel-btn');
        this.applyBtn = document.getElementById('crop-apply-btn');
        
        this.currentFile = null;
        this.currentTargetInput = null;
        this.currentScale = 1;
        this.currentRotation = 0;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Close modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        
        // Apply crop event
        this.applyBtn.addEventListener('click', () => this.applyCrop());
        
        // Slider events
        this.zoomSlider.addEventListener('input', (e) => {
            this.currentScale = parseFloat(e.target.value);
            this.updateImageTransform();
        });
        
        this.rotateSlider.addEventListener('input', (e) => {
            this.currentRotation = parseInt(e.target.value);
            this.updateImageTransform();
        });
        
        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Prevent modal content click from closing modal
        this.modal.querySelector('.crop-modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    openModal(file, targetInput) {
        this.currentFile = file;
        this.currentTargetInput = targetInput;
        
        // Create image URL
        const imageUrl = URL.createObjectURL(file);
        this.cropImage.src = imageUrl;
        this.previewImage.src = imageUrl;
        
        // Reset controls
        this.zoomSlider.value = 1;
        this.rotateSlider.value = 0;
        this.currentScale = 1;
        this.currentRotation = 0;
        this.updateImageTransform();
        
        // Show modal
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Clean up object URLs
        if (this.cropImage.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.cropImage.src);
        }
        
        this.currentFile = null;
        this.currentTargetInput = null;
    }
    
    updateImageTransform() {
        const transform = `scale(${this.currentScale}) rotate(${this.currentRotation}deg)`;
        this.cropImage.style.transform = transform;
        this.previewImage.style.transform = transform;
    }
    
    async applyCrop() {
        try {
            this.applyBtn.classList.add('loading');
            this.applyBtn.disabled = true;
            
            // Create canvas for cropping
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Create image element for processing
            const img = new Image();
            img.onload = () => {
                // Set canvas size
                canvas.width = 400;
                canvas.height = 400;
                
                // Calculate image dimensions with transformations
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                // Apply transformations
                ctx.translate(centerX, centerY);
                ctx.rotate((this.currentRotation * Math.PI) / 180);
                ctx.scale(this.currentScale, this.currentScale);
                
                // Draw image
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    // Create new file from blob
                    const croppedFile = new File([blob], this.currentFile.name, {
                        type: this.currentFile.type,
                        lastModified: Date.now()
                    });
                    
                    // Update the target input
                    if (this.currentTargetInput) {
                        // Create new FileList with cropped file
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(croppedFile);
                        this.currentTargetInput.files = dataTransfer.files;
                        
                        // Trigger change event to update preview
                        this.currentTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    this.closeModal();
                    
                    // Show success notification if notyf is available
                    if (typeof notyf !== 'undefined') {
                        notyf.success('Image cropped successfully!');
                    }
                }, this.currentFile.type, 0.9);
            };
            
            img.src = this.cropImage.src;
            
        } catch (error) {
            console.error('Error cropping image:', error);
            
            // Show error notification if notyf is available
            if (typeof notyf !== 'undefined') {
                notyf.error('Error cropping image. Please try again.');
            }
        } finally {
            this.applyBtn.classList.remove('loading');
            this.applyBtn.disabled = false;
        }
    }
}

// Initialize the crop modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const cropModal = new ImageCropModal();
    
    // Function to handle file input changes and open crop modal
    function handleFileInputChange(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            cropModal.openModal(file, event.target);
        }
    }
    
    // Add event listeners to all image upload inputs
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image/*"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', handleFileInputChange);
    });
    
    // Also handle drag and drop for drop zones if they exist
    const dropZones = document.querySelectorAll('.drop-zone');
    dropZones.forEach(dropZone => {
        const input = dropZone.querySelector('input[type="file"]');
        if (input) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('image/')) {
                    // Create new FileList with dropped file
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(files[0]);
                    input.files = dataTransfer.files;
                    
                    // Open crop modal
                    cropModal.openModal(files[0], input);
                }
            });
        }
    });
});

// Export for use in other scripts if needed
window.ImageCropModal = ImageCropModal;
