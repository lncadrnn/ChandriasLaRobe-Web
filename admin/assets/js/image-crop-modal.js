// Enhanced Image Crop Modal with 4:3 aspect ratio and movable crop area
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
        
        // Crop area properties
        this.cropArea = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.originalImageSize = { width: 0, height: 0 };
        this.aspectRatio = 4/3; // 4:3 aspect ratio
        
        this.initializeEventListeners();
        this.createCropOverlay();
    }
    
    createCropOverlay() {
        // Create crop overlay container
        const cropContainer = this.cropImage.parentElement;
        if (!cropContainer.querySelector('.crop-overlay')) {
            this.cropOverlay = document.createElement('div');
            this.cropOverlay.className = 'crop-overlay';
            this.cropOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10;
            `;

            // Create crop selection box
            this.cropBox = document.createElement('div');
            this.cropBox.className = 'crop-box';
            this.cropBox.style.cssText = `
                position: absolute;
                border: 2px solid #fff;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
                cursor: move;
                pointer-events: all;
                min-width: 50px;
                min-height: 37px;
            `;

            // Create resize handles
            const handles = ['nw', 'ne', 'sw', 'se'];
            handles.forEach(handle => {
                const handleEl = document.createElement('div');
                handleEl.className = `crop-handle crop-handle-${handle}`;
                handleEl.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #fff;
                    border: 1px solid #333;
                    cursor: ${handle === 'nw' || handle === 'se' ? 'nw-resize' : 'ne-resize'};
                    pointer-events: all;
                `;

                // Position handles
                if (handle.includes('n')) handleEl.style.top = '-5px';
                if (handle.includes('s')) handleEl.style.bottom = '-5px';
                if (handle.includes('w')) handleEl.style.left = '-5px';
                if (handle.includes('e')) handleEl.style.right = '-5px';

                this.cropBox.appendChild(handleEl);
            });

            this.cropOverlay.appendChild(this.cropBox);
            cropContainer.style.position = 'relative';
            cropContainer.appendChild(this.cropOverlay);

            this.initializeCropEvents();
        }
    }

    initializeCropEvents() {
        // Crop box dragging
        this.cropBox.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('crop-handle')) return;
            this.isDragging = true;
            this.dragStart = {
                x: e.clientX - this.cropArea.x,
                y: e.clientY - this.cropArea.y
            };
            e.preventDefault();
        });

        // Handle resizing
        this.cropBox.querySelectorAll('.crop-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this.isResizing = true;
                this.resizeHandle = handle.className.split('-').pop();
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.initialCropArea = { ...this.cropArea };
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Mouse move handler
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.moveCropArea(e);
            } else if (this.isResizing) {
                this.resizeCropArea(e);
            }
        });

        // Mouse up handler
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isResizing = false;
        });
    }

    moveCropArea(e) {
        const container = this.cropImage.getBoundingClientRect();
        let newX = e.clientX - this.dragStart.x;
        let newY = e.clientY - this.dragStart.y;

        // Constrain to container bounds
        newX = Math.max(0, Math.min(newX, container.width - this.cropArea.width));
        newY = Math.max(0, Math.min(newY, container.height - this.cropArea.height));

        this.cropArea.x = newX;
        this.cropArea.y = newY;
        this.updateCropBox();
        this.updatePreview();
    }

    resizeCropArea(e) {
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        const container = this.cropImage.getBoundingClientRect();

        let newWidth = this.initialCropArea.width;
        let newHeight = this.initialCropArea.height;
        let newX = this.initialCropArea.x;
        let newY = this.initialCropArea.y;

        // Handle different resize directions
        if (this.resizeHandle.includes('e')) {
            newWidth = this.initialCropArea.width + deltaX;
        }
        if (this.resizeHandle.includes('w')) {
            newWidth = this.initialCropArea.width - deltaX;
            newX = this.initialCropArea.x + deltaX;
        }
        if (this.resizeHandle.includes('s')) {
            newHeight = this.initialCropArea.height + deltaY;
        }
        if (this.resizeHandle.includes('n')) {
            newHeight = this.initialCropArea.height - deltaY;
            newY = this.initialCropArea.y + deltaY;
        }

        // Maintain 4:3 aspect ratio
        if (Math.abs(newWidth / this.aspectRatio - newHeight) > Math.abs(newHeight * this.aspectRatio - newWidth)) {
            newHeight = newWidth / this.aspectRatio;
        } else {
            newWidth = newHeight * this.aspectRatio;
        }

        // Ensure minimum size
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(37, newHeight);

        // Constrain to container
        newWidth = Math.min(newWidth, container.width);
        newHeight = Math.min(newHeight, container.height);
        newX = Math.max(0, Math.min(newX, container.width - newWidth));
        newY = Math.max(0, Math.min(newY, container.height - newHeight));

        this.cropArea = { x: newX, y: newY, width: newWidth, height: newHeight };
        this.updateCropBox();
        this.updatePreview();
    }

    updateCropBox() {
        this.cropBox.style.left = this.cropArea.x + 'px';
        this.cropBox.style.top = this.cropArea.y + 'px';
        this.cropBox.style.width = this.cropArea.width + 'px';
        this.cropBox.style.height = this.cropArea.height + 'px';
    }

    updatePreview() {
        // Update preview image based on crop area
        const scaleX = this.originalImageSize.width / this.cropImage.clientWidth;
        const scaleY = this.originalImageSize.height / this.cropImage.clientHeight;

        const cropData = {
            x: this.cropArea.x * scaleX,
            y: this.cropArea.y * scaleY,
            width: this.cropArea.width * scaleX,
            height: this.cropArea.height * scaleY
        };

        // Apply crop preview styling
        this.previewImage.style.clipPath = `inset(${cropData.y}px ${this.originalImageSize.width - cropData.x - cropData.width}px ${this.originalImageSize.height - cropData.y - cropData.height}px ${cropData.x}px)`;
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
    }    openModal(file, targetInput) {
        this.currentFile = file;
        this.currentTargetInput = targetInput;
        
        // Create image URL
        const imageUrl = URL.createObjectURL(file);
        this.cropImage.src = imageUrl;
        this.previewImage.src = imageUrl;
        
        // Wait for image to load to get dimensions
        this.cropImage.onload = () => {
            this.originalImageSize = {
                width: this.cropImage.naturalWidth,
                height: this.cropImage.naturalHeight
            };
            
            // Initialize crop area (centered, 4:3 aspect ratio)
            const containerWidth = this.cropImage.clientWidth;
            const containerHeight = this.cropImage.clientHeight;
            
            let cropWidth = Math.min(containerWidth * 0.8, containerHeight * 0.8 * this.aspectRatio);
            let cropHeight = cropWidth / this.aspectRatio;
            
            // Ensure crop area fits within container
            if (cropHeight > containerHeight * 0.8) {
                cropHeight = containerHeight * 0.8;
                cropWidth = cropHeight * this.aspectRatio;
            }
            
            this.cropArea = {
                x: (containerWidth - cropWidth) / 2,
                y: (containerHeight - cropHeight) / 2,
                width: cropWidth,
                height: cropHeight
            };
            
            this.updateCropBox();
            this.updatePreview();
            
            // Enable the apply button
            this.applyBtn.disabled = false;
            this.applyBtn.classList.remove('loading');
        };
        
        // Reset controls
        this.zoomSlider.value = 1;
        this.rotateSlider.value = 0;
        this.currentScale = 1;
        this.currentRotation = 0;
        this.updateImageTransform();
        
        // Ensure apply button is enabled
        this.applyBtn.disabled = false;
        this.applyBtn.classList.remove('loading');
        
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
                // Calculate crop dimensions in original image coordinates
                const scaleX = this.originalImageSize.width / this.cropImage.clientWidth;
                const scaleY = this.originalImageSize.height / this.cropImage.clientHeight;
                
                const cropX = this.cropArea.x * scaleX;
                const cropY = this.cropArea.y * scaleY;
                const cropWidth = this.cropArea.width * scaleX;
                const cropHeight = this.cropArea.height * scaleY;
                
                // Set canvas size to maintain 4:3 aspect ratio
                canvas.width = 800; // Fixed width for consistency
                canvas.height = 600; // 800 * 3/4 = 600 (4:3 ratio)
                
                // Apply rotation if needed
                if (this.currentRotation !== 0) {
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate((this.currentRotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);
                }
                
                // Draw the cropped portion of the image
                ctx.drawImage(
                    img,
                    cropX, cropY, cropWidth, cropHeight, // Source rectangle (crop area)
                    0, 0, canvas.width, canvas.height    // Destination rectangle (full canvas)
                );
                
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
                        
                        // Force preview update by calling validation
                        if (window.validateStep1) {
                            window.validateStep1();
                        }
                        
                        console.log("✅ Cropped file applied to input:", this.currentTargetInput.id);
                    }
                    
                    this.closeModal();
                    
                    // Show success notification if notyf is available
                    if (typeof notyf !== 'undefined') {
                        notyf.success('Image cropped to 4:3 ratio successfully!');
                    } else if (window.notyf) {
                        window.notyf.success('Image cropped to 4:3 ratio successfully!');
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
