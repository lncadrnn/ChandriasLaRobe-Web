/**
 * Inventory UI Controller
 * Consolidated script handling all inventory page interactions:
 * - Search functionality
 * - Tab switching
 * - Modal operations
 * - Sidebar management
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("Inventory UI script loaded");
    
    // Check InventoryService availability immediately
    console.log("🔍 Initial InventoryService check:", !!window.InventoryService);
    
    // Check again after a short delay
    setTimeout(() => {
        console.log("🔍 Delayed InventoryService check:", !!window.InventoryService);
        if (window.InventoryService) {
            console.log("✅ InventoryService is available with methods:", Object.keys(window.InventoryService));
        } else {
            console.log("❌ InventoryService is still not available");
        }
    }, 1000);
    
    // Check periodically for 5 seconds
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        console.log(`🔍 Check ${checkCount}: InventoryService available:`, !!window.InventoryService);
        
        if (window.InventoryService || checkCount >= 10) {
            clearInterval(checkInterval);
            if (window.InventoryService) {
                console.log("✅ InventoryService finally available!");
            } else {
                console.log("❌ InventoryService never became available");
            }
        }
    }, 500);// ===========================================
    // SIDEBAR MANAGEMENT
    // ===========================================
    const initializeSidebar = () => {
        const body = document.querySelector("body");
        const sidebar = body.querySelector(".sidebar");
        const toggle = body.querySelector(".toggle");

        if (!sidebar || !toggle) {
            console.warn("Sidebar elements not found");
            return;
        }

        // Restore sidebar state from localStorage
        if (localStorage.getItem("admin-sidebar-closed") === "true") {
            sidebar.classList.add("close");
        }

        // Sidebar toggle functionality
        toggle.addEventListener("click", () => {
            const isClosed = sidebar.classList.toggle("close");
            localStorage.setItem("admin-sidebar-closed", isClosed);
        });
    };    // ===========================================
    // TAB SWITCHING FUNCTIONALITY
    // ===========================================
    const initializeTabs = () => {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabBtns.length === 0) {
            console.warn("No tab buttons found");
            return;
        }

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                  // Show appropriate content and load data based on tab
                if (targetTab === 'products') {
                    // Show all products (products + additionals) in products container
                    document.getElementById('products')?.classList.add('active');
                    document.getElementById('accessories')?.classList.remove('active');
                    
                    console.log("Loading all items for All Products tab");
                    // Load all items
                    if (window.loadAllItems) {
                        window.loadAllItems();
                    } else {
                        console.error("loadAllItems function not available");
                    }
                } else if (targetTab === 'clothing') {
                    // Show only clothing items in products container
                    document.getElementById('products')?.classList.add('active');
                    document.getElementById('accessories')?.classList.remove('active');
                    
                    console.log("Loading clothing items for Clothing tab");
                    // Load only clothing items
                    if (window.loadClothingItems) {
                        window.loadClothingItems();
                    } else {
                        console.error("loadClothingItems function not available");
                    }
                } else if (targetTab === 'accessories') {
                    // Show only accessories in accessories container
                    document.getElementById('products')?.classList.remove('active');
                    document.getElementById('accessories')?.classList.add('active');
                    
                    console.log("Loading accessories for Additional/Accessories tab");
                    // Load only accessories
                    if (window.loadAccessoriesOnly) {
                        window.loadAccessoriesOnly();
                    } else {
                        console.error("loadAccessoriesOnly function not available");
                    }
                }

                console.log(`Switched to tab: ${targetTab}`);
            });
        });
    };// ===========================================
    // SEARCH FUNCTIONALITY
    // ===========================================
    const initializeSearch = () => {
        const searchBox = document.querySelector(".search-box input");
        
        if (!searchBox) {
            console.warn("Search box not found");
            return;
        }

        console.log("Initializing search functionality...");

        const performSearch = () => {
            const searchValue = searchBox.value.toLowerCase().trim();
            const cards = document.querySelectorAll(".card_article");
            
            if (cards.length === 0) {
                console.log("No product cards found, retrying in 500ms...");
                setTimeout(performSearch, 500);
                return;
            }

            console.log(`Searching for: "${searchValue}" in ${cards.length} products`);

            let visibleCount = 0;

            cards.forEach(card => {
                const productName = card.querySelector('.product-name')?.textContent?.toLowerCase() || '';
                const productCategory = card.querySelector('.product-category')?.textContent?.toLowerCase() || '';
                const productPrice = card.querySelector('.product-price')?.textContent?.toLowerCase() || '';
                const productColor = card.getAttribute('data-color')?.toLowerCase() || '';
                const productSize = card.getAttribute('data-size')?.toLowerCase() || '';

                // Also check data attributes for additional search capability
                const cardName = card.getAttribute('data-name')?.toLowerCase() || '';
                const cardCategory = card.getAttribute('data-category')?.toLowerCase() || '';

                const matchesSearch = searchValue === '' || 
                    productName.includes(searchValue) ||
                    productCategory.includes(searchValue) ||
                    productPrice.includes(searchValue) ||
                    productColor.includes(searchValue) ||
                    productSize.includes(searchValue) ||
                    cardName.includes(searchValue) ||
                    cardCategory.includes(searchValue);

                if (matchesSearch) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                }
            });

            console.log(`Search complete: ${visibleCount} products visible`);

            // Show no results message if needed
            const container = document.querySelector('.card_container');
            let noResultsMsg = container.querySelector('.no-results-message');
            
            if (visibleCount === 0 && searchValue !== '') {
                if (!noResultsMsg) {
                    noResultsMsg = document.createElement('div');
                    noResultsMsg.className = 'no-results-message';
                    noResultsMsg.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: #64748b;">
                            <i class="bx bx-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>No products found for "${searchValue}"</p>
                            <p style="font-size: 0.9rem;">Try searching with different keywords</p>
                        </div>
                    `;
                    container.appendChild(noResultsMsg);
                }
                noResultsMsg.style.display = 'block';
            } else {
                if (noResultsMsg) {
                    noResultsMsg.style.display = 'none';
                }
            }
        };

        // Show/hide clear button based on input
        const toggleClearButton = () => {
            const clearBtn = document.querySelector('.search-box .clear-btn');
            if (clearBtn) {
                if (searchBox.value.trim()) {
                    clearBtn.style.display = 'block';
                } else {
                    clearBtn.style.display = 'none';
                }
            }
        };

        // Add input event for clear button visibility
        searchBox.addEventListener('input', () => {
            toggleClearButton();
            performSearch();
        });

        // Override the previous input listener
        searchBox.removeEventListener('input', performSearch);

        // Add event listeners for search
        searchBox.addEventListener('input', performSearch);
        searchBox.addEventListener('keyup', performSearch);

        // Add search clear functionality
        const clearSearch = () => {
            searchBox.value = '';
            performSearch();
        };

        // Look for clear button in search box
        const clearBtn = document.querySelector('.search-box .clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearSearch);
        }

        // Initial search to handle page load
        setTimeout(performSearch, 1000);
        
        return performSearch; // Return the function for external use
    };// ===========================================
    // MODAL FUNCTIONALITY
    // ===========================================
    const initializeModals = () => {
        // Add Product Modal
        const addProductBtn = document.querySelector('[data-open="addProductModal"]');
        const addProductModal = document.getElementById("addProductModal");
        
        if (addProductBtn && addProductModal) {
            addProductBtn.addEventListener("click", () => {
                addProductModal.classList.add("show");
                console.log("Add product modal opened");
            });
        }

        // View Product Modal (Event delegation for dynamic content)
        const cardContainer = document.querySelector(".card_container");
        if (cardContainer) {
            cardContainer.addEventListener("click", function(e) {
                // Handle view product modal
                const viewTarget = e.target.closest('[data-open="viewProductModal"]');
                if (viewTarget) {
                    const viewProductModal = document.getElementById("viewProductModal");
                    if (viewProductModal) {
                        viewProductModal.classList.add("show");
                        console.log("View product modal opened");
                    }
                }                // Handle edit button - Now handled by comprehensive-inventory-loader.js
                const editBtn = e.target.closest('.edit_btn');
                if (editBtn) {
                    e.stopPropagation();
                    // Edit functionality is now handled by comprehensive-inventory-loader.js
                    return;
                }

                // Handle delete button
                const deleteBtn = e.target.closest('.delete_btn');
                if (deleteBtn) {
                    e.stopPropagation();
                    const productId = deleteBtn.getAttribute('data-id');
                    console.log("Delete product:", productId);
                    
                    if (confirm("Are you sure you want to delete this product?")) {
                        // TODO: Implement delete functionality
                        alert(`Delete product ${productId} - Feature coming soon!`);
                    }
                }
            });
        }

        // Close Modal functionality
        const initializeModalClose = (modalId) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            // Close buttons
            modal.querySelectorAll(`[data-close="${modalId}"]`).forEach(closeBtn => {
                closeBtn.addEventListener("click", () => {
                    modal.classList.remove("show");
                    console.log(`${modalId} closed`);
                });
            });

            // Click outside to close
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.classList.remove("show");
                    console.log(`${modalId} closed by clicking outside`);
                }
            });

            // Escape key to close
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && modal.classList.contains("show")) {
                    modal.classList.remove("show");
                    console.log(`${modalId} closed with Escape key`);
                }
            });
        };

        // Initialize close functionality for all modals
        initializeModalClose("addProductModal");
        initializeModalClose("viewProductModal");
    };    // ===========================================
    // ADD PRODUCT MODAL STEP NAVIGATION
    // ===========================================
    const initializeAddProductSteps = () => {
        let currentStep = 1;
        const totalSteps = 4;

        const nextBtn = document.getElementById('next-step-btn');
        const prevBtn = document.getElementById('prev-step-btn');
        const submitBtn = document.getElementById('submit-product-btn');

        if (!nextBtn || !prevBtn || !submitBtn) {
            console.warn("Add product navigation buttons not found");
            return;
        }        const updateStepDisplay = () => {
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
            });

            // Update button visibility
            prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
            nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
            submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

            // Populate review step if on step 4
            if (currentStep === 4) {
                populateReviewStep();
            }

            console.log(`Moved to step ${currentStep}/${totalSteps}`);
        };

        const validateCurrentStep = () => {
            switch (currentStep) {
                case 1:
                    // Check if front image is uploaded
                    const frontImage = document.getElementById('add-file-front-img');
                    if (!frontImage || !frontImage.files || frontImage.files.length === 0) {
                        alert('Please upload a front image before proceeding.');
                        return false;
                    }
                    return true;                case 2:
                    // Check required fields in step 2
                    const productName = document.getElementById('add-product-name');
                    const productCategory = document.getElementById('add-product-category');
                    const productColor = document.getElementById('add-product-color');
                    const selectedSizes = document.querySelectorAll('input[name="add-product-size"]:checked');
                    
                    if (!productName || !productName.value.trim()) {
                        alert('Please enter a product name.');
                        productName?.focus();
                        return false;
                    }
                    
                    if (!productCategory || !productCategory.value) {
                        alert('Please select a category.');
                        productCategory?.focus();
                        return false;
                    }

                    if (!productColor || !productColor.value) {
                        alert('Please select a color.');
                        productColor?.focus();
                        return false;
                    }

                    if (selectedSizes.length === 0) {
                        alert('Please select at least one size.');
                        return false;
                    }
                    return true;

                case 3:
                    // Check required fields in step 3 (pricing)
                    const productPrice = document.getElementById('add-product-price');
                    
                    if (!productPrice || !productPrice.value || productPrice.value <= 0) {
                        alert('Please enter a valid price.');
                        productPrice?.focus();
                        return false;
                    }
                    return true;

                default:
                    return true;
            }
        };

        // Next button event
        nextBtn.addEventListener('click', () => {
            if (validateCurrentStep() && currentStep < totalSteps) {
                currentStep++;
                updateStepDisplay();
            }
        });

        // Previous button event
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepDisplay();
            }
        });        // Submit button event
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (validateCurrentStep()) {
                console.log('Form submitted!');
                await submitProductToFirebase();
            }
        });

        // Reset to step 1 when modal opens
        const addProductModal = document.getElementById('addProductModal');
        if (addProductModal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (addProductModal.classList.contains('show')) {
                            currentStep = 1;
                            updateStepDisplay();
                        }
                    }
                });
            });
            observer.observe(addProductModal, { attributes: true });
        }        // Initialize display
        updateStepDisplay();

        // Reset form function - make it globally available
        const resetAddProductForm = () => {
            // Reset form
            const form = document.getElementById('addProductForm');
            if (form) {
                form.reset();
            }

            // Clear image previews
            const frontPreview = document.getElementById('front-image-preview');
            const backPreview = document.getElementById('back-image-preview');
            
            if (frontPreview) frontPreview.innerHTML = '';
            if (backPreview) backPreview.innerHTML = '';

            // Reset to step 1
            currentStep = 1;
            updateStepDisplay();
        };

        // Make reset function globally available
        window.resetAddProductForm = resetAddProductForm;
    };
    // ===========================================
    // SEARCH RETRY MECHANISM
    // ===========================================
    const waitForProducts = () => {
        let retryCount = 0;
        const maxRetries = 30; // Increased retries
        
        const checkForProducts = () => {
            const cards = document.querySelectorAll(".card_article");
            const container = document.querySelector(".card_container");
            
            console.log(`Checking for products... (${retryCount + 1}/${maxRetries})`);
            console.log(`Found ${cards.length} product cards`);
            console.log(`Container exists:`, !!container);
            
            if (cards.length > 0) {
                console.log(`✅ Products loaded! Found ${cards.length} products`);
                const searchFunction = initializeSearch();
                
                // Test search immediately
                setTimeout(() => {
                    console.log("🔍 Testing search functionality...");
                    const searchBox = document.querySelector(".search-box input");
                    if (searchBox) {
                        // Trigger a test search
                        const event = new Event('input', { bubbles: true });
                        searchBox.dispatchEvent(event);
                        console.log("✅ Search test completed");
                    }
                }, 500);
                
                return;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(checkForProducts, 500);
            } else {
                console.warn("⚠️ Products not loaded after maximum retries, initializing search anyway");
                initializeSearch();
            }
        };
        
        checkForProducts();
    };

    // ===========================================
    // IMAGE UPLOAD PREVIEW FUNCTIONALITY
    // ===========================================
    const initializeImageUploads = () => {
        const frontImageInput = document.getElementById('add-file-front-img');
        const backImageInput = document.getElementById('add-file-back-img');
        const frontPreview = document.getElementById('front-image-preview');
        const backPreview = document.getElementById('back-image-preview');

        if (!frontImageInput || !backImageInput) {
            console.warn("Image input elements not found");
            return;
        }

        const handleImageUpload = (input, preview) => {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = `
                            <img src="${e.target.result}" alt="Preview" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                            <button type="button" class="remove-image-btn" onclick="this.parentElement.innerHTML=''; document.getElementById('${input.id}').value='';">
                                <i class="bx bx-x"></i>
                            </button>
                        `;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
        };

        handleImageUpload(frontImageInput, frontPreview);
        handleImageUpload(backImageInput, backPreview);
    };

    // ===========================================
    // POPULATE REVIEW STEP
    // ===========================================
    const populateReviewStep = () => {
        const reviewContainer = document.querySelector('.product-review');
        if (!reviewContainer) return;

        // Get form data
        const frontImage = document.getElementById('add-file-front-img')?.files[0];
        const backImage = document.getElementById('add-file-back-img')?.files[0];
        const productName = document.getElementById('add-product-name')?.value || '';
        const productCategory = document.getElementById('add-product-category')?.value || '';
        const productPrice = document.getElementById('add-product-price')?.value || '';
        const productDescription = document.getElementById('add-product-description')?.value || '';
        const selectedSizes = Array.from(document.querySelectorAll('input[name="add-product-size"]:checked')).map(input => input.value);

        // Create preview HTML
        reviewContainer.innerHTML = `
            <div class="review-section">
                <h4>Product Images</h4>
                <div class="image-review">
                    ${frontImage ? `<div class="review-image"><img src="${URL.createObjectURL(frontImage)}" alt="Front Image"><span>Front Image</span></div>` : '<p>No front image</p>'}
                    ${backImage ? `<div class="review-image"><img src="${URL.createObjectURL(backImage)}" alt="Back Image"><span>Back Image</span></div>` : '<p>No back image</p>'}
                </div>
            </div>
            
            <div class="review-section">
                <h4>Product Details</h4>
                <div class="review-details">
                    <div class="review-item"><strong>Name:</strong> ${productName}</div>
                    <div class="review-item"><strong>Category:</strong> ${productCategory}</div>
                    <div class="review-item"><strong>Price:</strong> ₱${productPrice}</div>
                    <div class="review-item"><strong>Sizes:</strong> ${selectedSizes.join(', ')}</div>
                    ${productDescription ? `<div class="review-item"><strong>Description:</strong> ${productDescription}</div>` : ''}
                </div>
            </div>
        `;
    };
    // ===========================================
    // FIREBASE SUBMISSION FUNCTIONALITY
    // ===========================================    const submitProductToFirebase = async () => {
        try {
            console.log("🔄 Attempting to submit product to Firebase...");
            
            // Use the simpler add product function
            if (!window.addProduct) {
                console.error("❌ addProduct function not available");
                throw new Error('Product addition service not available. Please refresh the page.');
            }

            console.log("✅ addProduct function is available");

            // Get form data
            const frontFile = document.getElementById('add-file-front-img')?.files[0];
            const backFile = document.getElementById('add-file-back-img')?.files[0];
            const productName = document.getElementById('add-product-name')?.value || '';
            const productCategory = document.getElementById('add-product-category')?.value || '';
            const productPrice = parseFloat(document.getElementById('add-product-price')?.value) || 0;
            const productDescription = document.getElementById('add-product-description')?.value || '';
            
            // Basic validation
            if (!productName.trim()) {
                throw new Error('Product name is required.');
            }
            
            if (!productCategory) {
                throw new Error('Product category is required.');
            }
            
            if (productPrice <= 0) {
                throw new Error('Product price must be greater than 0.');
            }
            
            // For now, create a simple product object without image upload
            // TODO: Add image upload functionality later
            const productData = {
                name: productName.trim(),
                category: productCategory,
                price: productPrice,
                description: productDescription.trim(),
                frontImageUrl: '', // TODO: Upload and get URL
                backImageUrl: '', // TODO: Upload and get URL
                sizes: ['M'], // TODO: Get from form
                color: '#000000', // TODO: Get from form
                sleeve: '', // TODO: Get from form if applicable
            };
            
            console.log("📦 Product data to submit:", productData);
            
            // Add product to Firebase
            const productId = await window.addProduct(productData);
            
            // Show success message
            if (window.notyf) {
                window.notyf.success("Product added successfully!");
            } else {
                alert("Product added successfully!");
            }
            
            // Reset form and close modal
            document.getElementById('addProductForm')?.reset();
            document.getElementById('addProductModal')?.classList.remove('show');
            
            console.log("✅ Product added successfully with ID:", productId);
            
        } catch (error) {
            console.error("❌ Error adding product:", error);
              // Show error message
            if (window.notyf) {
                window.notyf.error(error.message || "Failed to add product");
            } else {
                alert(error.message || "Failed to add product");
            }
        }
    };

            // Get form data
            const frontFile = document.getElementById('add-file-front-img')?.files[0];
            const backFile = document.getElementById('add-file-back-img')?.files[0];
            const productName = document.getElementById('add-product-name')?.value || '';
            const productCategory = document.getElementById('add-product-category')?.value || '';
            const productPrice = parseFloat(document.getElementById('add-product-price')?.value) || 0;
            const productDescription = document.getElementById('add-product-description')?.value || '';
              // Get selected sizes and their quantities
            const selectedSizes = document.querySelectorAll('input[name="add-product-size"]:checked');
            const sizes = {};
            
            selectedSizes.forEach(sizeInput => {
                const sizeValue = sizeInput.value;
                const qtyInput = document.getElementById(`qty-${sizeValue}`);
                const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                sizes[sizeValue] = quantity;
            });

            // Get color
            const productColor = document.getElementById('add-product-color')?.value || '';
            const colorHex = getColorHex(productColor);

            if (!frontFile) {
                throw new Error('Front image is required');
            }

            if (!productColor) {
                throw new Error('Please select a color');
            }            console.log('Uploading images...');
            
            // Upload images using simplified method
            const frontImage = await uploadImageSimple(frontFile);
            let backImage = null;
            
            if (backFile) {
                backImage = await uploadImageSimple(backFile);
            }

            console.log('Generating product code...');
            
            // Generate simple product code
            const productCode = generateSimpleProductCode(productCategory, colorHex);

            console.log('Preparing product data...');
            
            // Prepare product data
            const productData = {                name: productName,
                code: productCode,
                price: productPrice,
                size: sizes,
                color: colorHex,
                category: productCategory,
                description: productDescription,
                frontImageUrl: frontImage.url,
                backImageUrl: backImage?.url || '',
                frontImageId: frontImage.public_id,
                backImageId: backImage?.public_id || '',
                createdAt: new Date()
            };

            console.log('Saving to Firebase...', productData);
            
            // Save to Firebase
            const docRef = await addDoc(collection(chandriaDB, "products"), productData);
            
            console.log('Product saved with ID:', docRef.id);            // Reload products to show the new addition
            if (window.InventoryService?.loadProducts) {
                await window.InventoryService.loadProducts();
            }

            // Hide loading spinner
            if (window.InventoryService?.hideInventoryLoader) {
                window.InventoryService.hideInventoryLoader();
            }

            // Show success message
            notyf.success("Product Successfully Added!");            // Reset form and close modal
            if (typeof window.resetAddProductForm === 'function') {
                window.resetAddProductForm();
            }
            
            const addProductModal = document.getElementById("addProductModal");
            if (addProductModal) {
                addProductModal.classList.remove("show");
            }        } catch (error) {
            console.error('Error adding product:', error);
            
            // Hide loading spinner
            const { hideInventoryLoader, notyf } = window.InventoryService || {};
            if (hideInventoryLoader) hideInventoryLoader();
            
            // Show error message
            if (notyf) {
                notyf.error(`Error adding product: ${error.message}`);
            } else {
                alert(`Error adding product: ${error.message}`);
            }
        }
    };
    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================
    const getColorHex = (colorName) => {
        const colorMap = {
            'Red': '#ef4444',
            'Blue': '#3b82f6',
            'Yellow': '#eab308',
            'Green': '#10b981',
            'Orange': '#f97316',
            'Purple': '#8b5cf6',
            'White': '#ffffff',
            'Black': '#000000',
            'Gray': '#6b7280',
            'Brown': '#a3a3a3',
            'Beige': '#f5f5dc',
            'Cream': '#fffdd0'
        };
        return colorMap[colorName] || '#000000';
    };

    // ===========================================
    // SIZE QUANTITY MANAGEMENT
    // ===========================================
    const initializeSizeQuantityInputs = () => {
        const sizeCheckboxes = document.querySelectorAll('input[name="add-product-size"]');
        const quantityContainer = document.getElementById('add-selected-size-container');

        if (!quantityContainer) {
            console.warn("Size quantity container not found");
            return;
        }

        sizeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateQuantityInputs();
            });
        });

        const updateQuantityInputs = () => {
            const selectedSizes = document.querySelectorAll('input[name="add-product-size"]:checked');
            quantityContainer.innerHTML = '';

            if (selectedSizes.length > 0) {
                const header = document.createElement('h4');
                header.textContent = 'Set Quantities for Selected Sizes';
                header.style.margin = '16px 0 12px 0';
                header.style.fontSize = '14px';
                header.style.fontWeight = '600';
                header.style.color = '#374151';
                quantityContainer.appendChild(header);

                selectedSizes.forEach(sizeInput => {
                    const sizeValue = sizeInput.value;
                    
                    const qtyRow = document.createElement('div');
                    qtyRow.className = 'quantity-row';
                    qtyRow.style.cssText = `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 8px 12px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        margin-bottom: 8px;
                    `;

                    qtyRow.innerHTML = `
                        <label style="font-weight: 500; color: #374151;">Size ${sizeValue}:</label>
                        <input type="number" id="qty-${sizeValue}" min="1" max="99" value="1" 
                               style="width: 60px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;" />
                    `;

                    quantityContainer.appendChild(qtyRow);
                });
            }
        };
    };
    // ===========================================
    // SIMPLE IMAGE UPLOAD FUNCTION
    // ===========================================
    const uploadImageSimple = async (file) => {
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
            throw new Error("Image upload failed");
        }

        const data = await response.json();
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
    };

    // ===========================================
    // SIMPLE PRODUCT CODE GENERATOR
    // ===========================================
    const generateSimpleProductCode = (category, color) => {
        const categoryCodes = {
            "Ball Gown": "BGWN",
            "Long Gown": "LGWN", 
            "Wedding Gown": "WGWN",
            "Fairy Gown": "FGWN",
            "Suits": "SUIT"
        };

        const colorCodes = {
            '#f5f5dc': "BEI", // Beige
            '#ffffff': "WHI", // White
            '#000000': "BLK", // Black
            '#ef4444': "RED", // Red
            '#3b82f6': "BLU", // Blue
            '#eab308': "YEL", // Yellow
            '#10b981': "GRN", // Green
            '#f97316': "ORN", // Orange
            '#8b5cf6': "PUR", // Purple
            '#6b7280': "GRY", // Gray
            '#a3a3a3': "BRN", // Brown
            '#fffdd0': "CRM"  // Cream
        };

        const categoryCode = categoryCodes[category] || "PROD";
        const colorCode = colorCodes[color] || "COL";
        
        // Generate a simple random 3-digit number
        const randomNumber = Math.floor(Math.random() * 900) + 100;
        
        return `${categoryCode}-${colorCode}-${randomNumber.toString().padStart(3, '0')}`;
    };

    // ===========================================
    // INITIALIZATION
    // ===========================================
    console.log("🚀 Initializing inventory UI components...");
    
    // Log current page state
    console.log("Page state:");
    console.log("- Search box:", !!document.querySelector(".search-box input"));
    console.log("- Tab buttons:", document.querySelectorAll('.tab-btn').length);
    console.log("- Card container:", !!document.querySelector(".card_container"));
    console.log("- Add product button:", !!document.querySelector('[data-open="addProductModal"]'));
    console.log("- Sidebar:", !!document.querySelector(".sidebar"));
    
    // Initialize all components
    try {
        initializeSidebar();
        console.log("✅ Sidebar initialized");
    } catch (error) {
        console.error("❌ Sidebar initialization failed:", error);
    }
    
    try {
        initializeTabs();
        console.log("✅ Tabs initialized");
    } catch (error) {
        console.error("❌ Tabs initialization failed:", error);
    }
      try {
        initializeModals();
        console.log("✅ Modals initialized");
    } catch (error) {
        console.error("❌ Modals initialization failed:", error);
    }
      try {
        initializeAddProductSteps();
        console.log("✅ Add Product steps initialized");
    } catch (error) {
        console.error("❌ Add Product steps initialization failed:", error);
    }
      try {
        initializeImageUploads();
        console.log("✅ Image uploads initialized");
    } catch (error) {
        console.error("❌ Image uploads initialization failed:", error);
    }    
    try {
        initializeSizeQuantityInputs();
        console.log("✅ Size quantity inputs initialized");
    } catch (error) {
        console.error("❌ Size quantity inputs initialization failed:", error);
    }
    
    // Wait for products to load before initializing search
    waitForProducts();
    initializeImageUploads();
    
    console.log("🎉 Inventory UI initialization complete");
});
