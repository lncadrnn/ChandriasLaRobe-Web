// SIMPLE MODAL HANDLER - ES6 MODULE VERSION
import {
    onAuthStateChanged,
    auth,
    signOut,
    chandriaDB,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where
} from "./sdk/chandrias-sdk.js";

// Simple modal handler for add product functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("🔧 Simple modal handler loaded");
    
    // Debug: Check if InventoryService is available at load time
    console.log('🔍 Checking for InventoryService:', {
        available: !!window.InventoryService,
        keys: window.InventoryService ? Object.keys(window.InventoryService) : 'N/A'
    });
    
    // Also check after a delay
    setTimeout(() => {
        console.log('🔍 Checking for InventoryService after 2s:', {
            available: !!window.InventoryService,
            keys: window.InventoryService ? Object.keys(window.InventoryService) : 'N/A'
        });
    }, 2000);
    
    // Handle add product button click
    const addProductBtn = document.querySelector('[data-open="addProductModal"]');
    const addProductModal = document.getElementById('addProductModal');
    
    if (addProductBtn && addProductModal) {
        console.log("✅ Add product button and modal found");
        
        addProductBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🔄 Opening add product modal");
            addProductModal.classList.add('show');
            
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        });
    } else {
        console.log("❌ Add product button or modal not found", {
            button: !!addProductBtn,
            modal: !!addProductModal
        });
    }
    
    // Handle image upload previews
    function setupImagePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (input && preview) {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        preview.innerHTML = `
                            <img src="${event.target.result}" alt="Preview" style="
                                width: 100%;
                                height: 150px;
                                object-fit: cover;
                                border-radius: 8px;
                                border: 2px solid var(--primary-color);
                            ">
                            <div style="
                                position: absolute;
                                top: 5px;
                                right: 5px;
                                background: rgba(0,0,0,0.7);
                                color: white;
                                border-radius: 50%;
                                width: 24px;
                                height: 24px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                font-size: 14px;
                            " onclick="clearImagePreview('${inputId}', '${previewId}')">×</div>
                        `;
                        preview.style.display = 'block';
                        
                        // Hide upload area
                        const uploadArea = input.parentElement.querySelector('.upload-area');
                        if (uploadArea) {
                            uploadArea.style.display = 'none';
                        }
                        
                        // Enable next button if both required fields are filled
                        validateStep1();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    
    // Setup image previews
    setupImagePreview('add-file-front-img', 'front-image-preview');
    setupImagePreview('add-file-back-img', 'back-image-preview');
    
    // Function to clear image preview
    window.clearImagePreview = function(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (input && preview) {
            input.value = '';
            preview.innerHTML = '';
            preview.style.display = 'none';
            
            // Show upload area
            const uploadArea = input.parentElement.querySelector('.upload-area');
            if (uploadArea) {
                uploadArea.style.display = 'flex';
            }
            
            validateStep1();
        }
    };    // Validate step 1 (at least front image required)
    function validateStep1() {
        const frontInput = document.getElementById('add-file-front-img');
        const nextBtn = document.getElementById('next-step-btn'); // Updated to correct ID
        
        if (frontInput && nextBtn) {
            const hasFile = frontInput.files && frontInput.files.length > 0;
            nextBtn.disabled = !hasFile;
            nextBtn.style.opacity = hasFile ? '1' : '0.5';
            nextBtn.style.cursor = hasFile ? 'pointer' : 'not-allowed';
            
            console.log("Step 1 validation:", { hasFile, nextBtnFound: !!nextBtn });
        }
    }
    
    // Make validateStep1 available globally for crop modal
    window.validateStep1 = validateStep1;
    
    // Add step navigation functionality
    let currentStep = 1;
    const totalSteps = 4;

    const nextBtn = document.getElementById('next-step-btn');
    const prevBtn = document.getElementById('prev-step-btn');
    const submitBtn = document.getElementById('submit-product-btn');

    const updateStepDisplay = () => {
        // Hide all step contents
        document.querySelectorAll('.add-product-step-content').forEach(step => {
            step.style.display = 'none';
            step.classList.remove('active');
        });

        // Show current step content
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
            currentStepElement.classList.add('active');
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
            }
        });        // Update button visibility
        if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
        if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

        // Populate review step if on step 4
        if (currentStep === 4) {
            populateReviewStep();
        }

        console.log(`Moved to step ${currentStep}/${totalSteps}`);
    };    const validateCurrentStep = async () => {
        switch (currentStep) {
            case 1:
                // Check if front image is uploaded
                const frontImage = document.getElementById('add-file-front-img');
                if (!frontImage || !frontImage.files || frontImage.files.length === 0) {
                    alert('Please upload a front image before proceeding.');
                    return false;
                }
                return true;
            case 2:
                // Check required fields in step 2
                const productName = document.getElementById('add-product-name');
                const productCategory = document.getElementById('add-product-category');
                const productColor = document.getElementById('add-product-color');
                const productStatus = document.getElementById('add-product-status');
                const selectedSizes = document.querySelectorAll('input[name="add-product-size"]:checked');
                
                if (!productName || !productName.value.trim()) {
                    alert('Please enter a product name.');
                    return false;
                }
                if (!productCategory || !productCategory.value) {
                    alert('Please select a category.');
                    return false;
                }
                if (!productColor || !productColor.value) {
                    alert('Please select a color.');
                    return false;
                }
                if (!productStatus || !productStatus.value) {
                    alert('Please select a status.');
                    return false;
                }
                if (selectedSizes.length === 0) {
                    alert('Please select at least one size.');
                    return false;
                }                // Validate stock quantities for selected sizes
                const sizeStockInputs = document.querySelectorAll('[id^="stock-"]');
                
                console.log('Validation Debug:', {
                    selectedSizesCount: selectedSizes.length,
                    stockInputsCount: sizeStockInputs.length,
                    selectedSizeValues: Array.from(selectedSizes).map(s => s.value),
                    stockInputs: Array.from(sizeStockInputs).map(inp => ({
                        id: inp.id,
                        value: inp.value,
                        parsedValue: parseInt(inp.value)
                    }))
                });
                  // Check each selected size has a corresponding stock input with valid value
                for (let sizeCheckbox of selectedSizes) {
                    const sizeValue = sizeCheckbox.value;
                    const sizeId = sizeValue.replace(/\s+/g, '-').toLowerCase();
                    const stockInput = document.getElementById(`stock-${sizeId}`);
                    
                    if (!stockInput) {
                        alert(`Stock input for size ${sizeValue} not found. Please try reselecting the sizes.`);
                        return false;
                    }
                    
                    const stockValue = parseInt(stockInput.value);
                    if (!stockInput.value || isNaN(stockValue) || stockValue < 1) {
                        alert(`Please enter a valid stock quantity (minimum 1) for size ${sizeValue}.`);
                        stockInput.focus();
                        return false;
                    }
                }
                
                // Generate product code if not present
                const productCode = document.getElementById('add-product-code');
                if (!productCode.value || productCode.value === 'TEMP-CODE-001') {
                    const newCode = await generateProductCode();
                    productCode.value = newCode;
                }
                
                return true;
            case 3:
                // Check pricing step
                const productPrice = document.getElementById('add-product-price');
                if (!productPrice || !productPrice.value || parseFloat(productPrice.value) <= 0) {
                    alert('Please enter a valid price.');
                    return false;
                }
                
                return true;
            default:
                return true;
        }
    };// Add event listeners for navigation
    if (nextBtn) {
        nextBtn.addEventListener('click', async function() {
            console.log('Next button clicked, current step:', currentStep);
            
            if (await validateCurrentStep()) {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateStepDisplay();
                }
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            console.log('Previous button clicked, current step:', currentStep);
            
            if (currentStep > 1) {
                currentStep--;
                updateStepDisplay();
            }
        });
    }

    // Initialize step display
    updateStepDisplay();
    
    // Handle size selection and stock quantities
    const sizeCheckboxes = document.querySelectorAll('input[name="add-product-size"]');
    const stockContainer = document.getElementById('stock-quantities-container');
    const sizeStockInputs = document.getElementById('size-stock-inputs');    const updateStockInputs = () => {
        const selectedSizes = Array.from(sizeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        if (selectedSizes.length > 0) {
            stockContainer.style.display = 'block';
            sizeStockInputs.innerHTML = '';
            
            selectedSizes.forEach(size => {
                // Sanitize the size value for use as HTML ID
                const sizeId = size.replace(/\s+/g, '-').toLowerCase();
                const stockInput = document.createElement('div');
                stockInput.className = 'stock-input-group';
                stockInput.innerHTML = `
                    <label for="stock-${sizeId}">Size ${size}</label>
                    <input type="number" id="stock-${sizeId}" name="stock-${sizeId}" 
                           data-size="${size}" min="1" value="1" placeholder="Qty" required>
                `;
                sizeStockInputs.appendChild(stockInput);
            });
        } else {
            stockContainer.style.display = 'none';
            sizeStockInputs.innerHTML = '';
        }
    };

    sizeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateStockInputs);
    });    // Product code generation with proper format: CATEGORY-COLOR-INCREMENT
    const generateProductCode = async () => {
        const categorySelect = document.getElementById('add-product-category');
        const colorSelect = document.getElementById('add-product-color');
        
        if (!categorySelect?.value || !colorSelect?.value) {
            return 'TEMP-CODE-001'; // Temporary code if category/color not selected
        }
        
        // Category abbreviations (using the select values)
        const categoryMap = {
            'ball-gown': 'BGWN',
            'long-gown': 'LGWN', 
            'wedding-gown': 'WGWN',
            'fairy-gown': 'FGWN',
            'suits': 'SUIT',
            'accessories': 'ACCS'
        };
        
        // Color abbreviations (using the select values)
        const colorMap = {
            'red': 'RED',
            'blue': 'BLU',
            'yellow': 'YEL',
            'green': 'GRN',
            'orange': 'ORG',
            'purple': 'PUR',
            'white': 'WHT',
            'black': 'BLK',
            'gray': 'GRY',
            'brown': 'BRN',
            'beige': 'BEG',
            'cream': 'CRM'
        };
        
        const categoryCode = categoryMap[categorySelect.value] || 'UNKN';
        const colorCode = colorMap[colorSelect.value] || 'UNKN';
        
        // Try to get next increment from existing products (simulated for now)
        let increment;
        try {
            // In a real app, this would query the database for existing products
            // with the same category-color combination and get the next number
            const existingProducts = await getExistingProductCodes(categoryCode, colorCode);
            increment = existingProducts.length + 1;
        } catch (error) {
            console.log('Could not fetch existing products, using random increment');
            increment = Math.floor(Math.random() * 999) + 1;
        }
        
        const incrementStr = increment.toString().padStart(3, '0');
        return `${categoryCode}-${colorCode}-${incrementStr}`;
    };
    
    // Simulated function to get existing product codes (would be replaced with actual API call)
    const getExistingProductCodes = async (categoryCode, colorCode) => {
        // This is a simulation - in real app would call your database
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate some existing products for demo
                const simulatedCodes = [
                    `${categoryCode}-${colorCode}-001`,
                    `${categoryCode}-${colorCode}-002`
                ];
                resolve(simulatedCodes);
            }, 100);
        });
    };const generateCodeBtn = document.getElementById('generate-code-btn');
    const productCodeInput = document.getElementById('add-product-code');

    if (generateCodeBtn && productCodeInput) {
        generateCodeBtn.addEventListener('click', async () => {
            const newCode = await generateProductCode();
            productCodeInput.value = newCode;
        });

        // Auto-generate code when both category and color are selected
        const categorySelect = document.getElementById('add-product-category');
        const colorSelect = document.getElementById('add-product-color');
        
        const autoGenerateCode = async () => {
            if (categorySelect?.value && colorSelect?.value && !productCodeInput.value) {
                const newCode = await generateProductCode();
                productCodeInput.value = newCode;
            }
        };
        
        if (categorySelect) {
            categorySelect.addEventListener('change', autoGenerateCode);
        }
        if (colorSelect) {
            colorSelect.addEventListener('change', autoGenerateCode);
        }
    }

    // Review step population
    const populateReviewStep = () => {
        // Product Images
        const frontInput = document.getElementById('add-file-front-img');
        const backInput = document.getElementById('add-file-back-img');
        
        if (frontInput?.files[0]) {
            const frontReader = new FileReader();
            frontReader.onload = (e) => {
                document.getElementById('review-front-image').innerHTML = 
                    `<img src="${e.target.result}" alt="Front" style="width: 100px; height: 75px; object-fit: cover; border-radius: 4px;">`;
            };
            frontReader.readAsDataURL(frontInput.files[0]);
        }

        if (backInput?.files[0]) {
            const backReader = new FileReader();
            backReader.onload = (e) => {
                document.getElementById('review-back-image').innerHTML = 
                    `<img src="${e.target.result}" alt="Back" style="width: 100px; height: 75px; object-fit: cover; border-radius: 4px;">`;
            };
            backReader.readAsDataURL(backInput.files[0]);
        } else {
            document.getElementById('review-back-image').innerHTML = 'No back image';
        }

        // Product Details
        document.getElementById('review-product-name').textContent = 
            document.getElementById('add-product-name')?.value || '-';
        document.getElementById('review-product-code').textContent = 
            document.getElementById('add-product-code')?.value || '-';
        document.getElementById('review-category').textContent = 
            document.getElementById('add-product-category')?.selectedOptions[0]?.text || '-';
        document.getElementById('review-color').textContent = 
            document.getElementById('add-product-color')?.selectedOptions[0]?.text || '-';
        document.getElementById('review-status').textContent = 
            document.getElementById('add-product-status')?.selectedOptions[0]?.text || '-';
        document.getElementById('review-description').textContent = 
            document.getElementById('add-product-description')?.value || 'No description';

        // Pricing & Stock
        const price = document.getElementById('add-product-price')?.value || '0';
        document.getElementById('review-price').textContent = `₱${parseFloat(price).toFixed(2)}`;

        // Sizes and Stock
        const selectedSizes = Array.from(sizeCheckboxes).filter(cb => cb.checked);        if (selectedSizes.length > 0) {
            const sizesHtml = selectedSizes.map(cb => {
                const size = cb.value;
                const sizeId = size.replace(/\s+/g, '-').toLowerCase();
                const stockInput = document.getElementById(`stock-${sizeId}`);
                const stock = stockInput?.value || '1';
                return `<span class="size-stock-item">${size}: ${stock} pcs</span>`;
            }).join('');
            document.getElementById('review-sizes-stock').innerHTML = sizesHtml;
        } else {
            document.getElementById('review-sizes-stock').textContent = 'No sizes selected';
        }
    };
    
    console.log("📋 Step navigation initialized");
    
    // Handle modal close buttons
    const closeButtons = document.querySelectorAll('[data-close]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-close');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                console.log("🔄 Closing modal:", modalId);
                modal.classList.remove('show');
                
                // Unlock body scroll
                document.body.style.overflow = '';
            }
        });
    });
    
    // Handle click outside modal to close
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
            console.log("🔄 Clicking outside modal to close");
            e.target.classList.remove('show');
            document.body.style.overflow = '';
        }
    });    // Handle form submission
    if (submitBtn) {
        submitBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Submit button clicked');
            
            // Validate final step if needed
            if (await validateCurrentStep()) {
                console.log('Final validation passed, submitting product...');
                
                try {
                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Adding Product...';
                      await submitNewProductDirect();
                      // Success - close modal and refresh
                    if (typeof notyf !== 'undefined') {
                        notyf.success("Product Successfully Added!");
                    } else {
                        alert("Product Successfully Added!");
                    }
                    closeModalAndRefresh();
                    
                } catch (error) {
                    console.error('Product submission error:', error);
                    if (typeof notyf !== 'undefined') {
                        notyf.error('Failed to add product: ' + error.message);
                    } else {
                        alert('Failed to add product: ' + error.message);
                    }
                }finally {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bx bx-check"></i> Add Product';
                }
            }
        });
    }    // Function to wait for InventoryService to be available
    const waitForInventoryService = () => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // Wait up to 5 seconds
            
            const checkService = () => {
                if (window.InventoryService) {
                    console.log('✅ InventoryService found!');
                    resolve(window.InventoryService);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    console.log(`⏳ Waiting for InventoryService... (${attempts}/${maxAttempts})`);
                    setTimeout(checkService, 100);
                } else {
                    reject(new Error('InventoryService not available after waiting. Please ensure inventory-service.js is loaded properly.'));
                }
            };
            
            checkService();
        });
    };

    // Function to submit new product
    const submitNewProduct = async () => {
        // Wait for InventoryService to be available
        const InventoryService = await waitForInventoryService();
        
        const { addDoc, collection, chandriaDB, loadProducts } = InventoryService;
        
        // Get form data
        const productName = document.getElementById('add-product-name').value.trim();
        const productCategory = document.getElementById('add-product-category').value;
        const productColor = document.getElementById('add-product-color').value;
        const productStatus = document.getElementById('add-product-status').value;
        const productDescription = document.getElementById('add-product-description').value.trim();
        const productPrice = parseFloat(document.getElementById('add-product-price').value);
        const productCode = document.getElementById('add-product-code').value;
        
        // Get selected sizes and their stock quantities
        const selectedSizes = Array.from(document.querySelectorAll('input[name="add-product-size"]:checked'));
        const sizes = {};
        
        for (let sizeCheckbox of selectedSizes) {
            const sizeValue = sizeCheckbox.value;
            const sizeId = sizeValue.replace(/\s+/g, '-').toLowerCase();
            const stockInput = document.getElementById(`stock-${sizeId}`);
            const stock = parseInt(stockInput.value);
            sizes[sizeValue] = stock;
        }
        
        // Get images
        const frontFile = document.getElementById('add-file-front-img').files[0];
        const backFile = document.getElementById('add-file-back-img').files[0];
        
        if (!frontFile) {
            throw new Error('Front image is required');
        }
        
        // Upload images to Cloudinary
        const uploadImage = async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "UPLOAD_IMG");

            const response = await fetch(
                "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Image upload failed');
            }

            const data = await response.json();
            return {
                url: data.secure_url,
                public_id: data.public_id
            };
        };
        
        // Upload images
        const frontImage = await uploadImage(frontFile);
        const backImage = backFile ? await uploadImage(backFile) : null;
        
        // Prepare product data in the same format as the original inventory service
        const productData = {
            name: productName,
            code: productCode,
            category: productCategory,
            color: productColor,
            status: productStatus,
            description: productDescription,
            price: productPrice,
            sizes: sizes,
            images: {
                front: frontImage,
                back: backImage
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('Submitting product data:', productData);
        
        // Add to Firebase using InventoryService functions
        await addDoc(collection(chandriaDB, "products"), productData);
        
        // Reload products list
        await loadProducts();
    };
    
    // Function to close modal and refresh
    const closeModalAndRefresh = () => {
        const modal = document.getElementById('addProductModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
        
        // Reset form
        const form = document.getElementById('addProductForm');
        if (form) {
            form.reset();
        }
        
        // Reset step to 1
        currentStep = 1;
        updateStepDisplay();
        
        // Clear image previews
        document.getElementById('front-image-preview').innerHTML = '';
        document.getElementById('back-image-preview').innerHTML = '';
        
        // Hide stock container
        document.getElementById('stock-quantities-container').style.display = 'none';
        document.getElementById('size-stock-inputs').innerHTML = '';
        
        // Clear product code
        document.getElementById('add-product-code').value = '';
    };

    console.log("📋 Step navigation and form submission initialized");    
    // Function to submit new product directly to Firebase
    const submitNewProductDirect = async () => {
        console.log('🚀 Starting direct Firebase submission...');
        
        // Get form data
        const productName = document.getElementById('add-product-name').value.trim();
        const productCategory = document.getElementById('add-product-category').value;
        const productColor = document.getElementById('add-product-color').value;
        const productStatus = document.getElementById('add-product-status').value;
        const productDescription = document.getElementById('add-product-description').value.trim();
        const productPrice = parseFloat(document.getElementById('add-product-price').value);
        const productCode = document.getElementById('add-product-code').value;
        
        // Get selected sizes and their stock quantities
        const selectedSizes = Array.from(document.querySelectorAll('input[name="add-product-size"]:checked'));
        const sizes = {};
        
        for (let sizeCheckbox of selectedSizes) {
            const sizeValue = sizeCheckbox.value;
            const sizeId = sizeValue.replace(/\s+/g, '-').toLowerCase();
            const stockInput = document.getElementById(`stock-${sizeId}`);
            const stock = parseInt(stockInput.value);
            sizes[sizeValue] = stock;
        }
        
        console.log('📊 Form data collected:', { productName, productCategory, productColor, sizes });
        
        // Get images
        const frontFile = document.getElementById('add-file-front-img').files[0];
        const backFile = document.getElementById('add-file-back-img').files[0];
        
        if (!frontFile) {
            throw new Error('Front image is required');
        }
        
        console.log('📸 Images found:', { front: !!frontFile, back: !!backFile });
        
        // Upload images to Cloudinary
        const uploadImage = async (file) => {
            console.log('⬆️ Uploading image to Cloudinary...');
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "UPLOAD_IMG");

            const response = await fetch(
                "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Image upload failed');
            }

            const data = await response.json();
            console.log('✅ Image uploaded successfully');
            return {
                url: data.secure_url,
                public_id: data.public_id
            };
        };
        
        // Upload images
        const frontImage = await uploadImage(frontFile);
        const backImage = backFile ? await uploadImage(backFile) : null;
        
        // Prepare product data
        const productData = {
            name: productName,
            code: productCode,
            category: productCategory,
            color: productColor,
            status: productStatus,
            description: productDescription,
            price: productPrice,
            sizes: sizes,
            images: {
                front: frontImage,
                back: backImage
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('💾 Saving product data to Firebase:', productData);
        
        // Add to Firebase
        await addDoc(collection(chandriaDB, "products"), productData);
        
        console.log('✅ Product saved to Firebase successfully');
        
        // Reload products list if function exists
        if (typeof window.loadProducts === 'function') {
            console.log('🔄 Reloading products list...');
            await window.loadProducts();
        } else if (window.InventoryService && typeof window.InventoryService.loadProducts === 'function') {
            console.log('🔄 Reloading products list via InventoryService...');
            await window.InventoryService.loadProducts();
        } else {
            console.log('⚠️ No loadProducts function found - manual refresh may be needed');
        }
    };
      // Search functionality
    const initializeSearch = () => {
        console.log("🔍 Attempting to initialize search functionality...");
        
        const searchBox = document.querySelector(".search-box input");
        const clearBtn = document.querySelector(".clear-btn");
        
        console.log("🔍 Search box found:", !!searchBox);
        console.log("🔍 Clear button found:", !!clearBtn);
        
        if (!searchBox) {
            console.warn("❌ Search box not found - searching for alternative selectors");
            const alternativeSearch = document.querySelector("input[placeholder*='Search']");
            console.log("🔍 Alternative search input found:", !!alternativeSearch);
            return;
        }
        
        console.log("✅ Initializing search functionality...");        const performSearch = () => {
            const searchValue = searchBox.value.toLowerCase().trim();
            const cards = document.querySelectorAll("#products-container .card_article");
            
            console.log(`🔍 Searching for: "${searchValue}" in ${cards.length} products`);
            console.log(`🔍 Search container:`, document.querySelector("#products-container"));
            console.log(`🔍 First card sample:`, cards[0]);
            
            if (cards.length === 0) {
                console.warn("⚠️ No product cards found! Are products loaded?");
                return;
            }
            
            let visibleCount = 0;
            
            cards.forEach((card, index) => {
                const productName = (card.querySelector('.card_title')?.textContent || '').toLowerCase();
                const productCategory = (card.getAttribute('data-category') || '').toLowerCase();
                const productPrice = (card.querySelector('.card_price')?.textContent || '').toLowerCase();
                const productColor = (card.querySelector('.card_color_text')?.textContent || '').toLowerCase();
                const productCode = (card.getAttribute('data-product-code') || '').toLowerCase();
                
                if (index === 0) {
                    console.log(`🔍 Sample search data for first card:`, {
                        name: productName,
                        category: productCategory,
                        price: productPrice,
                        color: productColor,
                        code: productCode
                    });
                }
                
                const matchesSearch = searchValue === '' || 
                    productName.includes(searchValue) ||
                    productCategory.includes(searchValue) ||
                    productPrice.includes(searchValue) ||
                    productColor.includes(searchValue) ||
                    productCode.includes(searchValue);
                
                if (matchesSearch) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            console.log(`📊 Search results: ${visibleCount} products match "${searchValue}"`);
            
            // Show/hide clear button
            if (clearBtn) {
                clearBtn.style.display = searchValue ? 'block' : 'none';
            }
            
            // Show no results message if needed
            const container = document.getElementById('products-container');
            let noResultsMsg = container.querySelector('.no-results-message');
            
            if (visibleCount === 0 && searchValue !== '') {
                if (!noResultsMsg) {
                    noResultsMsg = document.createElement('div');
                    noResultsMsg.className = 'no-results-message';
                    noResultsMsg.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: #666;">
                            <i class="bx bx-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h3>No products found</h3>
                            <p>Try adjusting your search terms or browse all products.</p>
                        </div>
                    `;
                    container.appendChild(noResultsMsg);
                }
                noResultsMsg.style.display = 'block';
            } else if (noResultsMsg) {
                noResultsMsg.style.display = 'none';
            }
        };
        
        // Add event listeners
        searchBox.addEventListener('input', performSearch);
        searchBox.addEventListener('keyup', performSearch);
        
        // Clear button functionality
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchBox.value = '';
                performSearch();
                searchBox.focus();
            });
        }
        
        console.log("🔍 Search functionality initialized successfully");
    };
      // Initialize search when DOM is ready AND after a small delay to ensure products are loaded
    const delayedSearchInit = () => {
        setTimeout(() => {
            initializeSearch();
        }, 1000); // Wait 1 second for products to load
    };
    
    // Try multiple initialization methods
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', delayedSearchInit);
    } else {
        delayedSearchInit();
    }
    
    // Also try to reinitialize search when products container changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.target.id === 'products-container') {
                console.log("🔄 Products container updated - reinitializing search");
                setTimeout(initializeSearch, 500);
            }
        });
    });
    
    // Start observing when the container exists
    const startObserving = () => {
        const container = document.getElementById('products-container');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
            console.log("👀 Started observing products container for changes");
        } else {
            setTimeout(startObserving, 500);
        }
    };
    
    startObserving();
    
    // Global function for manual testing
    window.testSearch = () => {
        console.log("🧪 Manual search test triggered");
        const searchBox = document.querySelector(".search-box input");
        const products = document.querySelectorAll("#products-container .card_article");
        console.log("Search box:", searchBox);
        console.log("Products found:", products.length);
        
        if (searchBox) {
            searchBox.value = "test";
            searchBox.dispatchEvent(new Event('input'));
        }
    };
    
    // Global function to reinitialize search
    window.reinitSearch = () => {
        console.log("🔄 Manually reinitializing search");
        initializeSearch();
    };
});
