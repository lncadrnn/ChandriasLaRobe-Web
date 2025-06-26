/* ================================
   IMAGE CROP MODAL JAVASCRIPT
   ================================ */

class ImageCropModal {
    constructor() {
        this.modal = null;
        this.cropper = null;
        this.currentImageType = null;
        this.originalFile = null;
        this.onCropComplete = null;
        
        // Portrait aspect ratio (3:4)
        this.aspectRatio = 3 / 4;
        this.outputWidth = 300;
        this.outputHeight = 400;
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.setupEventListeners();
    }
    
    createModal() {
        const modalHTML = `
            <div id="imageCropModal" class="crop-modal">
                <div class="crop-modal-content">
                    <!-- Loading overlay -->
                    <div class="crop-loading" id="cropLoading">
                        <div class="crop-loading-content">
                            <div class="crop-loading-spinner"></div>
                            <div class="crop-loading-text">Processing image...</div>
                        </div>
                    </div>
                    
                    <!-- Header -->
                    <div class="crop-modal-header">
                        <h3 class="crop-modal-title">
                            <i class="bx bx-crop"></i>
                            Crop Image
                        </h3>
                        <button class="crop-modal-close" id="cropModalClose" type="button">
                            &times;
                        </button>
                    </div>
                    
                    <!-- Body -->
                    <div class="crop-modal-body">
                        <!-- Crop Container -->
                        <div class="crop-container">
                            <img id="cropImage" class="crop-image" src="" alt="Image to crop">
                        </div>
                        
                        <!-- Preview Section -->
                        <div class="crop-preview-section">
                            <div class="crop-preview-title">
                                <i class="bx bx-show"></i>
                                Preview
                            </div>
                            <div class="crop-preview-container">
                                <div class="crop-preview" id="cropPreview">
                                    <div class="crop-preview-empty">Preview will appear here</div>
                                </div>
                                <div class="crop-preview-info">
                                    <p>This is how your image will look after cropping.</p>
                                    <div class="crop-preview-specs">
                                        <strong>Output Size:</strong> ${this.outputWidth} × ${this.outputHeight}px<br>
                                        <strong>Aspect Ratio:</strong> 3:4 (Portrait)<br>
                                        <strong>Format:</strong> JPEG, optimized for web
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Crop Controls -->
                        <div class="crop-controls">
                            <div class="crop-control-group">
                                <label class="crop-control-label">Reset</label>
                                <button class="crop-control-btn" id="cropReset" type="button">
                                    <i class="bx bx-reset"></i>
                                    Reset Crop
                                </button>
                            </div>
                            <div class="crop-control-group">
                                <label class="crop-control-label">Zoom</label>
                                <button class="crop-control-btn" id="cropZoomIn" type="button">
                                    <i class="bx bx-zoom-in"></i>
                                    Zoom In
                                </button>
                            </div>
                            <div class="crop-control-group">
                                <label class="crop-control-label">Zoom</label>
                                <button class="crop-control-btn" id="cropZoomOut" type="button">
                                    <i class="bx bx-zoom-out"></i>
                                    Zoom Out
                                </button>
                            </div>
                            <div class="crop-control-group">
                                <label class="crop-control-label">Rotate</label>
                                <button class="crop-control-btn" id="cropRotate" type="button">
                                    <i class="bx bx-rotate-right"></i>
                                    Rotate 90°
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="crop-modal-actions">
                        <button class="crop-btn crop-btn-secondary" id="cropCancel" type="button">
                            <i class="bx bx-x"></i>
                            Cancel
                        </button>
                        <button class="crop-btn crop-btn-primary" id="cropConfirm" type="button">
                            <i class="bx bx-check"></i>
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('imageCropModal');
    }
    
    setupEventListeners() {
        // Close modal events
        document.getElementById('cropModalClose').addEventListener('click', () => this.close());
        document.getElementById('cropCancel').addEventListener('click', () => this.close());
        
        // Crop controls
        document.getElementById('cropReset').addEventListener('click', () => this.resetCrop());
        document.getElementById('cropZoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('cropZoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('cropRotate').addEventListener('click', () => this.rotate());
        
        // Confirm crop
        document.getElementById('cropConfirm').addEventListener('click', () => this.confirmCrop());
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Prevent body scroll when modal is open
        this.modal.addEventListener('show', () => {
            document.body.style.overflow = 'hidden';
        });
        
        this.modal.addEventListener('hide', () => {
            document.body.style.overflow = '';
        });
    }
    
    open(file, imageType, callback) {
        this.originalFile = file;
        this.currentImageType = imageType;
        this.onCropComplete = callback;
        
        // Validate file
        if (!file || !file.type.startsWith('image/')) {
            console.error('Invalid file type');
            return;
        }
        
        // Show loading
        this.showLoading(true);
        
        // Read file and setup cropper
        const reader = new FileReader();
        reader.onload = (e) => {
            const image = document.getElementById('cropImage');
            image.src = e.target.result;
            
            // Wait for image to load
            image.onload = () => {
                this.initCropper();
                this.show();
                this.showLoading(false);
            };
        };
        reader.readAsDataURL(file);
    }
    
    initCropper() {
        const image = document.getElementById('cropImage');
        
        // Destroy existing cropper
        if (this.cropper) {
            this.cropper.destroy();
        }
        
        // Initialize new cropper
        this.cropper = new Cropper(image, {
            aspectRatio: this.aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            scalable: true,
            zoomable: true,
            rotatable: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            minContainerWidth: 300,
            minContainerHeight: 400,
            background: false,
            crop: () => this.updatePreview()
        });
    }
    
    updatePreview() {
        if (!this.cropper) return;
        
        try {
            const canvas = this.cropper.getCroppedCanvas({
                width: this.outputWidth,
                height: this.outputHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            if (canvas) {
                const previewContainer = document.getElementById('cropPreview');
                previewContainer.innerHTML = '';
                
                const previewImg = document.createElement('img');
                previewImg.src = canvas.toDataURL('image/jpeg', 0.9);
                previewImg.style.width = '100%';
                previewImg.style.height = '100%';
                previewImg.style.objectFit = 'cover';
                
                previewContainer.appendChild(previewImg);
            }
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }
    
    resetCrop() {
        if (this.cropper) {
            this.cropper.reset();
        }
    }
    
    zoomIn() {
        if (this.cropper) {
            this.cropper.zoom(0.1);
        }
    }
    
    zoomOut() {
        if (this.cropper) {
            this.cropper.zoom(-0.1);
        }
    }
    
    rotate() {
        if (this.cropper) {
            this.cropper.rotate(90);
        }
    }
    
    async confirmCrop() {
        if (!this.cropper || !this.onCropComplete) return;
        
        this.showLoading(true);
        
        try {
            const canvas = this.cropper.getCroppedCanvas({
                width: this.outputWidth,
                height: this.outputHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            if (canvas) {
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new file with the cropped data
                        const fileName = this.originalFile.name.replace(/\.[^/.]+$/, '') + '_cropped.jpg';
                        const croppedFile = new File([blob], fileName, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        // Call the callback with the cropped file
                        this.onCropComplete(croppedFile, this.currentImageType);
                        this.close();
                    }
                    this.showLoading(false);
                }, 'image/jpeg', 0.9);
            }
        } catch (error) {
            console.error('Error cropping image:', error);
            this.showLoading(false);
            // Show error notification
            if (typeof notyf !== 'undefined') {
                notyf.error('Error cropping image. Please try again.');
            }
        }
    }
    
    show() {
        this.modal.classList.add('show');
        this.modal.dispatchEvent(new CustomEvent('show'));
    }
    
    close() {
        this.modal.classList.remove('show');
        this.modal.dispatchEvent(new CustomEvent('hide'));
        
        // Clean up
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        
        // Reset state
        this.currentImageType = null;
        this.originalFile = null;
        this.onCropComplete = null;
        
        // Clear preview
        document.getElementById('cropPreview').innerHTML = '<div class="crop-preview-empty">Preview will appear here</div>';
    }
    
    showLoading(show) {
        const loading = document.getElementById('cropLoading');
        if (show) {
            loading.classList.add('show');
        } else {
            loading.classList.remove('show');
        }
    }
}

// Initialize the crop modal when DOM is loaded
let imageCropModal;

document.addEventListener('DOMContentLoaded', () => {
    // Wait for Cropper.js to be available
    if (typeof Cropper !== 'undefined') {
        imageCropModal = new ImageCropModal();
        window.imageCropModal = imageCropModal;
    } else {
        // Fallback: wait a bit for Cropper.js to load
        setTimeout(() => {
            if (typeof Cropper !== 'undefined') {
                imageCropModal = new ImageCropModal();
                window.imageCropModal = imageCropModal;
            } else {
                console.error('Cropper.js library not found');
            }
        }, 1000);
    }
});

// Export for use in other files
window.ImageCropModal = ImageCropModal;
