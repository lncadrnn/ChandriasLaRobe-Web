// NEW ADMIN INVENTORY SERVICE
// Modern inventory management system for Chandria's La Robe
// Uses inventory-sdk.js and integrates with new admin UI

import {
    chandriaDB,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    arrayUnion,
    arrayRemove
} from "./sdk/inventory-sdk.js";

// #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
// MODERN INVENTORY SERVICE CLASS
class InventoryService {
    constructor() {
        this.notyf = null;
        this.initializeNotyf();
        this.initializeEventHandlers();
    }

    // Initialize Notyf with enhanced auto-removal
    initializeNotyf() {
        this.notyf = new Notyf({
            position: { x: "center", y: "top" },
            duration: 3000,
            dismissible: true
        });
    }

    // Enhanced notification with auto-removal
    showNotification(type, message) {
        if (!this.notyf) return;
        
        const notification = this.notyf[type](message);
        
        // Auto-remove after duration with fade-out
        setTimeout(() => {
            if (notification && notification.element) {
                notification.element.classList.add('notyf__fade-out');
                
                setTimeout(() => {
                    try {
                        if (notification.element && notification.element.parentNode) {
                            notification.element.remove();
                        }
                    } catch (e) {
                        console.warn('Notification already removed:', e);
                    }
                }, 300);
            }
        }, type === 'error' ? 4000 : 3000);
        
        return notification;
    }

    // Initialize event handlers and UI integration
    initializeEventHandlers() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupModalHandlers();
            this.setupFormHandlers();
            this.initializeInventoryData();
        });
    }

    // Setup modal event handlers
    setupModalHandlers() {
        // Tab switching functionality
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const addItemBtn = document.getElementById('add-item-btn');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active to clicked tab
                btn.classList.add('active');
                const tab = btn.getAttribute('data-tab');
                document.getElementById(tab).classList.add('active');
                
                // Update add button
                this.updateAddButton(tab);
            });
        });

        // Modal open/close handlers
        this.setupModalControls();
    }

    // Update add button based on active tab
    updateAddButton(tab) {
        const addItemBtn = document.getElementById('add-item-btn');
        if (tab === 'products') {
            addItemBtn.textContent = 'Add Product';
            addItemBtn.setAttribute('data-open', 'addProductModal');
        } else if (tab === 'accessories') {
            addItemBtn.textContent = 'Add Additional';
            addItemBtn.setAttribute('data-open', 'addAdditionalModal');
        }
    }

    // Setup modal controls
    setupModalControls() {
        // Modal open handlers
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-open')) {
                const modalId = e.target.getAttribute('data-open');
                this.openModal(modalId);
            }
            
            if (e.target.hasAttribute('data-close')) {
                const modalId = e.target.getAttribute('data-close');
                this.closeModal(modalId);
            }
        });

        // Close modal on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    // Open modal with body scroll lock
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // Close modal and unlock body scroll
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            this.resetModalForms(modalId);
        }
    }

    // Reset modal forms
    resetModalForms(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());

        // Reset image previews
        const dropzones = modal.querySelectorAll('[id*="dropzone"]');
        dropzones.forEach(zone => {
            zone.style.backgroundImage = 'none';
        });

        const labels = modal.querySelectorAll('[id*="upload-label"]');
        labels.forEach(label => {
            label.style.opacity = '1';
        });

        // Clear size containers
        const sizeContainers = modal.querySelectorAll('[id*="selected-size-container"]');
        sizeContainers.forEach(container => {
            container.innerHTML = '';
        });
    }

    // Setup form handlers
    setupFormHandlers() {
        // Product form handlers
        this.setupProductFormHandlers();
        
        // Additional form handlers
        this.setupAdditionalFormHandlers();
        
        // Image upload handlers
        this.setupImageHandlers();
    }

    // Setup product form handlers
    setupProductFormHandlers() {
        const addProductBtn = document.getElementById('add-product-btn');
        const updateProductBtn = document.getElementById('update-product-btn');

        if (addProductBtn) {
            addProductBtn.addEventListener('click', (e) => this.handleAddProduct(e));
        }

        if (updateProductBtn) {
            updateProductBtn.addEventListener('click', (e) => this.handleUpdateProduct(e));
        }

        // Size checkbox handlers
        this.setupSizeHandlers();
        
        // Product code generation
        this.setupProductCodeGeneration();
    }

    // Setup additional form handlers
    setupAdditionalFormHandlers() {
        const addAdditionalBtn = document.getElementById('add-additional-btn');
        const updateAdditionalBtn = document.getElementById('update-additional-btn');

        if (addAdditionalBtn) {
            addAdditionalBtn.addEventListener('click', (e) => this.handleAddAdditional(e));
        }

        if (updateAdditionalBtn) {
            updateAdditionalBtn.addEventListener('click', (e) => this.handleUpdateAdditional(e));
        }

        // Additional code generation
        this.setupAdditionalCodeGeneration();
        
        // Inclusion handlers
        this.setupInclusionHandlers();
    }

    // Setup image upload handlers
    setupImageHandlers() {
        // Product image handlers
        const imageInputs = [
            'add-file-front-img',
            'add-file-back-img', 
            'update-file-front-img',
            'update-file-back-img'
        ];

        imageInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => this.handleImagePreview(e));
            }
        });

        // Additional image handlers
        const additionalImageInputs = [
            'add-additional-file-img',
            'update-additional-file-img'
        ];

        additionalImageInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => this.handleImagePreview(e));
            }
        });
    }

    // Handle image preview
    handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        const inputId = event.target.id;
        
        reader.onload = (e) => {
            let dropzoneId, labelId;
            
            // Map input IDs to their corresponding dropzone and label IDs
            const mapping = {
                'add-file-front-img': { dropzone: 'add-dropzone-front', label: 'add-upload-label-front' },
                'add-file-back-img': { dropzone: 'add-dropzone-back', label: 'add-upload-label-back' },
                'update-file-front-img': { dropzone: 'update-dropzone-front', label: 'update-upload-label-front' },
                'update-file-back-img': { dropzone: 'update-dropzone-back', label: 'update-upload-label-back' },
                'add-additional-file-img': { dropzone: 'add-additional-dropzone-img', label: 'add-additional-upload-label-img' },
                'update-additional-file-img': { dropzone: 'update-additional-dropzone-img', label: 'update-additional-upload-label-img' }
            };

            const elements = mapping[inputId];
            if (elements) {
                const dropzone = document.getElementById(elements.dropzone);
                const label = document.getElementById(elements.label);
                
                if (dropzone) {
                    dropzone.style.backgroundImage = `url(${e.target.result})`;
                    dropzone.style.backgroundSize = 'cover';
                    dropzone.style.backgroundPosition = 'center';
                }
                
                if (label) {
                    label.style.opacity = '0';
                }
            }
        };
        
        reader.readAsDataURL(file);
    }

    // Setup size checkbox handlers
    setupSizeHandlers() {
        // Add product size handlers
        const addSizeCheckboxes = document.querySelectorAll('input[name="add-product-size"]');
        addSizeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleSizeChange(e, 'add-selected-size-container');
            });
        });

        // Update product size handlers
        const updateSizeCheckboxes = document.querySelectorAll('input[name="update-product-size"]');
        updateSizeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleSizeChange(e, 'update-selected-size-container');
            });
        });
    }

    // Handle size checkbox changes
    handleSizeChange(event, containerId) {
        const size = event.target.value;
        const container = document.getElementById(containerId);
        const inputId = `qty-${size}`;

        if (event.target.checked) {
            if (!document.getElementById(inputId)) {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'qty-group';
                inputGroup.id = `group-${size}`;
                inputGroup.innerHTML = `
                    <label for="${inputId}">Quantity for ${size}:</label>
                    <input type="number" id="${inputId}" name="${inputId}" min="0" />
                `;
                container.appendChild(inputGroup);
            }
        } else {
            const group = document.getElementById(`group-${size}`);
            if (group) {
                group.remove();
            }
        }
    }

    // Setup product code generation
    setupProductCodeGeneration() {
        const categorySelects = ['add-product-category', 'update-product-category'];
        const colorSelects = ['add-product-color', 'update-product-color'];

        [...categorySelects, ...colorSelects].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', () => {
                    this.generateProductCode(selectId.includes('add') ? 'add' : 'update');
                });
            }
        });
    }

    // Generate product code
    async generateProductCode(type) {
        const categorySelect = document.getElementById(`${type}-product-category`);
        const colorSelect = document.getElementById(`${type}-product-color`);
        const codeInput = document.getElementById(`${type}-product-code`);

        if (!categorySelect || !colorSelect || !codeInput) return;

        const category = categorySelect.value;
        const color = colorSelect.value;

        if (category !== 'Select Category' && color !== 'Select Color') {
            try {
                const code = await this.createProductCode(category, color);
                codeInput.value = code;
            } catch (error) {
                console.error('Error generating product code:', error);
            }
        }
    }

    // Create product code using legacy function
    async createProductCode(category, color) {
        const categoryCodes = {
            "Ball Gown": "BGWN",
            "Long Gown": "LGWN", 
            "Wedding Gown": "WGWN",
            "Fairy Gown": "FGWN",
            "Suits": "SUIT"
        };

        const colorCodes = {
            "Beige": "BEI", "White": "WHI", "Black": "BLK", "Red": "RED",
            "Blue": "BLU", "Yellow": "YEL", "Green": "GRN", "Orange": "ORN",
            "Purple": "PUR", "Gray": "GRY", "Brown": "BRN", "Cream": "CRM"
        };

        const categoryCode = categoryCodes[category];
        const colorCode = colorCodes[color];
        
        if (!categoryCode || !colorCode) return '';

        const baseCode = `${categoryCode}-${colorCode}`;
        const productsRef = collection(chandriaDB, "products");
        const q = query(
            productsRef,
            where("code", ">=", baseCode),
            where("code", "<", baseCode + "\uf8ff")
        );
        
        const snapshot = await getDocs(q);
        const numbers = snapshot.docs.map(doc => {
            const match = doc.data().code.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = (Math.max(...numbers, 0) + 1).toString().padStart(3, "0");
        return `${baseCode}-${nextNumber}`;
    }

    // Setup additional code generation
    setupAdditionalCodeGeneration() {
        const nameInputs = ['add-additional-name', 'update-additional-name'];
        
        nameInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.generateAdditionalCode(e.target.value, inputId.includes('add') ? 'add' : 'update');
                });
            }
        });
    }

    // Generate additional code
    async generateAdditionalCode(name, type) {
        if (!name || name.length < 3) return;

        const prefix = "ADD";
        const nameCode = name.trim().substring(0, 3).toUpperCase();
        const baseCode = `${prefix}-${nameCode}`;

        try {
            const additionalsRef = collection(chandriaDB, "additionals");
            const q = query(
                additionalsRef,
                where("code", ">=", baseCode),
                where("code", "<", baseCode + "\uf8ff")
            );
            const snapshot = await getDocs(q);

            const numbers = snapshot.docs.map(doc => {
                const match = doc.data().code.match(/(\d{3})$/);
                return match ? parseInt(match[1], 10) : 0;
            });

            const nextNumber = (Math.max(...numbers, 0) + 1).toString().padStart(3, "0");
            const fullCode = `${baseCode}-${nextNumber}`;
            
            const codeInput = document.getElementById(`${type}-additional-code`);
            if (codeInput) {
                codeInput.value = fullCode;
            }
        } catch (error) {
            console.error('Error generating additional code:', error);
        }
    }

    // Setup inclusion handlers
    setupInclusionHandlers() {
        // Add inclusion handlers
        this.setupInclusionHandlersForType('add');
        this.setupInclusionHandlersForType('update');
    }

    // Setup inclusion handlers for specific type
    setupInclusionHandlersForType(type) {
        const prefix = type === 'add' ? '' : 'update-';
        const checkbox = document.getElementById(`${prefix}with-inclusions-checkbox`);
        const addBtn = document.getElementById(`${prefix}add-inclusion-btn`);
        const removeBtn = document.getElementById(`${prefix}remove-inclusion-btn`);

        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.handleInclusionCheckbox(e, type);
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addInclusionField(type);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeInclusionField(type);
            });
        }
    }

    // Handle inclusion checkbox change
    handleInclusionCheckbox(event, type) {
        const prefix = type === 'add' ? '' : 'update-';
        const container = document.getElementById(`${prefix}inclusions-container`);
        const btnRow = document.getElementById(`${prefix}inclusion-btn-row`);
        const removeBtn = document.getElementById(`${prefix}remove-inclusion-btn`);

        if (event.target.checked) {
            if (container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <input type="text" placeholder="Name" class="inclusion-field" />
                `;
            }
            if (btnRow) btnRow.classList.add('show');
            if (removeBtn) removeBtn.disabled = true;
        } else {
            if (container) {
                container.style.display = 'none';
                container.innerHTML = '';
            }
            if (btnRow) btnRow.classList.remove('show');
            if (removeBtn) removeBtn.disabled = false;
        }
    }

    // Add inclusion field
    addInclusionField(type) {
        const prefix = type === 'add' ? '' : 'update-';
        const container = document.getElementById(`${prefix}inclusions-container`);
        const removeBtn = document.getElementById(`${prefix}remove-inclusion-btn`);

        if (container) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Name';
            input.className = 'inclusion-field';
            container.appendChild(input);

            if (removeBtn && container.children.length > 1) {
                removeBtn.disabled = false;
            }
        }
    }

    // Remove inclusion field
    removeInclusionField(type) {
        const prefix = type === 'add' ? '' : 'update-';
        const container = document.getElementById(`${prefix}inclusions-container`);
        const removeBtn = document.getElementById(`${prefix}remove-inclusion-btn`);

        if (container && container.children.length > 1) {
            container.removeChild(container.lastElementChild);

            if (removeBtn && container.children.length === 1) {
                removeBtn.disabled = true;
            }
        }
    }

    // Initialize inventory data
    async initializeInventoryData() {
        try {
            showInventoryLoader();
            await Promise.all([
                this.loadProducts(),
                this.loadAdditionals()
            ]);
        } catch (error) {
            console.error('Error initializing inventory data:', error);
            this.showNotification('error', 'Failed to load inventory data');
        } finally {
            hideInventoryLoader();
        }
    }

    // Load products with modern approach
    async loadProducts() {
        try {
            const container = document.getElementById('products-container');
            if (!container) return;

            container.innerHTML = ''; // Clear existing cards

            const querySnapshot = await getDocs(collection(chandriaDB, "products"));
            
            if (querySnapshot.empty) {
                container.innerHTML = '<div style="margin:2rem;">No products found in inventory.</div>';
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.frontImageUrl || !data.code) {
                    console.warn('Product missing image or code:', doc.id, data);
                    return;
                }

                const card = this.createProductCard(doc.id, data);
                container.appendChild(card);
            });

            document.body.classList.add('loaded');
        } catch (error) {
            console.error('Error loading products:', error);
            const container = document.getElementById('products-container');
            if (container) {
                container.innerHTML = '<div style="color:red;margin:2rem;">Failed to load products.</div>';
            }
        }
    }

    // Load additionals with modern approach
    async loadAdditionals() {
        try {
            const container = document.getElementById('additional-container');
            if (!container) return;

            container.innerHTML = ''; // Clear existing cards

            const querySnapshot = await getDocs(collection(chandriaDB, "additionals"));
            
            if (querySnapshot.empty) {
                container.innerHTML = '<div style="margin:2rem;">No additional products found.</div>';
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.imageUrl || !data.code) {
                    console.warn('Additional missing image or code:', doc.id, data);
                    return;
                }

                const card = this.createAdditionalCard(doc.id, data);
                container.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading additionals:', error);
            const container = document.getElementById('additional-container');
            if (container) {
                container.innerHTML = '<div style="color:red;margin:2rem;">Failed to load additional products.</div>';
            }
        }
    }    // Create product card element
    createProductCard(docId, data) {
        const article = document.createElement('article');
        article.className = 'card_article card';
        
        article.innerHTML = `
            <div class="card_data">
                <img src="${data.frontImageUrl}" alt="image" class="card_img" id="product-img" />
                <h2 class="card_title">${data.name}</h2>
                <p class="card_size">Available Size: ${Object.keys(data.size).join(", ")}</p>
                <p class="card_sleeve">Sleeve: ${data.sleeve}</p>
                <span class="card_category">${data.category}</span>
                <div class="product-actions">
                    <a href="#" class="action-btn edit-btn" aria-label="Edit" data-open="viewProductModal" data-id="${docId}">
                        <i class="fi fi-rr-edit"></i>
                    </a>
                    <a href="#" class="action-btn delete-btn" aria-label="Delete" data-id="${docId}">
                        <i class="fi fi-rr-trash"></i>
                    </a>
                </div>
            </div>
        `;

        return article;
    }

    // Create additional card element
    createAdditionalCard(docId, data) {
        const article = document.createElement('article');
        article.className = 'card_article card';
        
        article.innerHTML = `
            <div class="card_data">
                <img src="${data.imageUrl}" alt="image" class="card_img" />
                <h2 class="card_title">${data.name}</h2>
                <p class="card_info">Price: ₱${data.price}</p>
                <p class="card_info">
                    ${data.inclusions && data.inclusions.length ? "With Inclusion" : "Without Inclusion"}
                </p>
                <span class="card_category">${data.code}</span>
                <div class="product-actions">
                    <a href="#" class="action-btn edit-add-btn" data-open="updateAdditionalModal" aria-label="Edit" data-id="${docId}">
                        <i class="fi fi-rr-edit"></i>
                    </a>
                    <a href="#" class="action-btn delete-add-btn" aria-label="Delete" data-id="${docId}">
                        <i class="fi fi-rr-trash"></i>
                    </a>
                </div>
            </div>
        `;

        return article;
    }

    // Handle add product form submission
    async handleAddProduct(event) {
        event.preventDefault();
        // Delegate to legacy function for now to maintain compatibility
        // The legacy function is already well-tested
        console.log('Modern inventory service: Delegating product add to legacy handler');
    }

    // Handle update product form submission  
    async handleUpdateProduct(event) {
        event.preventDefault();
        // Delegate to legacy function for now to maintain compatibility
        console.log('Modern inventory service: Delegating product update to legacy handler');
    }

    // Handle add additional form submission
    async handleAddAdditional(event) {
        event.preventDefault();
        // Delegate to legacy function for now to maintain compatibility
        console.log('Modern inventory service: Delegating additional add to legacy handler');
    }

    // Handle update additional form submission
    async handleUpdateAdditional(event) {
        event.preventDefault();
        // Delegate to legacy function for now to maintain compatibility
        console.log('Modern inventory service: Delegating additional update to legacy handler');
    }
}

// INVENTORY LOADER FUNCTIONS
function showInventoryLoader() {
    const inventoryLoader = document.getElementById("inventory-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.remove("hidden");
        inventoryLoader.style.display = "flex";
    }
}

function hideInventoryLoader() {
    const inventoryLoader = document.getElementById("inventory-loader");
    if (inventoryLoader) {
        inventoryLoader.classList.add("hidden");
        inventoryLoader.style.display = "none";
    }
}

// Global inventory service instance
let inventoryService;

// INTITIALIZE NOTYF
$(document).ready(function () {
    // Initialize the modern inventory service
    inventoryService = new InventoryService();
    
    // Legacy NOTYF for compatibility
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });
    // COMMENTED OUT: Check if user is already signed in, if so, redirect to HOME PAGE
    // onAuthStateChanged(auth, async user => {
    //     if (user) {
    //         // Check if user exists in userAccounts
    //         const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
    //         const userDocSnap = await getDoc(userDocRef);

    //         if (userDocSnap.exists()) {
    //             // If user is customer, sign them out
    //             await signOut(auth);
    //             window.location.href = "../index.html";
    //             return;
    //         }
    //     }

    //     if (!user) {
    //         window.location.href = "./authentication.html";
    //     }
    // });

    // ERROR MODAL FUNCTION
    function showErrorModal(message) {
        const modal = document.getElementById("error-modal");
        const msg = document.getElementById("error-modal-message");
        msg.textContent = message;
        modal.classList.add("show");
    }

    // --- Confirm Modal Logic ---
    function showConfirmModal(message, onConfirm) {
        const modal = document.getElementById("confirm-modal");
        const msg = document.getElementById("confirm-modal-message");
        msg.textContent = message;
        modal.classList.add("show");
        // Remove previous listeners
        const okBtn = document.getElementById("confirm-modal-ok");
        const cancelBtn = document.getElementById("confirm-modal-cancel");
        const closeBtn = document.querySelector(".confirm-close");
        function cleanup() {
            modal.classList.remove("show");
            okBtn.removeEventListener("click", okHandler);
            cancelBtn.removeEventListener("click", cancelHandler);
            closeBtn.removeEventListener("click", cancelHandler);
        }
        function okHandler() {
            cleanup();
            if (onConfirm) onConfirm();
        }
        function cancelHandler() {
            cleanup();
        }
        okBtn.addEventListener("click", okHandler);
        cancelBtn.addEventListener("click", cancelHandler);
        closeBtn.addEventListener("click", cancelHandler);
    }

    // Error modal close logic
    $(document).on("click", ".error-close, #error-modal-ok", function () {
        $("#error-modal").removeClass("show");
    });
    window.addEventListener("click", function (event) {
        const modal = document.getElementById("error-modal");
        if (event.target === modal) modal.classList.remove("show");
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // DISPLAY CARDS FUNCTION
    async function loadProducts() {
        try {
            const container = $("#products-container");
            container.empty(); // Clear existing cards to avoid duplicates
            const querySnapshot = await getDocs(
                collection(chandriaDB, "products")
            );
            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No products found in inventory.</div>'
                );
                return;
            }
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Defensive: check for required fields
                if (!data.frontImageUrl || !data.code) {
                    console.warn(
                        "Product missing image or code:",
                        doc.id,
                        data
                    );
                    return;
                }                // Create the card HTML
                const card = $(`
                  <article class="card_article card">
                    <div class="card_data">
                        <img
                            src="${data.frontImageUrl}"
                            alt="image"
                            class="card_img"
                            id="product-img"
                        />
                        <h2 class="card_title">${data.name}</h2> 
                        <p class="card_size">Available Size: ${Object.keys(
                            data.size
                        ).join(", ")}</p>                     
                        <p class="card_sleeve">Sleeve: ${data.sleeve}</p>
                        <span class="card_category">${data.category}</span>
                        <div class="product-actions">
                            <a
                                href="#"
                                class="action-btn edit-btn"
                                aria-label="Edit"
                                data-open="viewProductModal"
                                data-id="${doc.id}"
                            >
                                <i class="fi fi-rr-edit"></i>
                            </a>
                            <a
                                href="#"
                                class="action-btn delete-btn"
                                aria-label="Delete"
                                data-id="${doc.id}"
                            >
                                <i class="fi fi-rr-trash"></i>
                            </a>
                        </div>
                    </div>
                </article>
                `);
                container.append(card);
                $("body").addClass("loaded");
            });
        } catch (err) {
            console.error("Error loading products from Firebase:", err);
            container.append(
                '<div style="color:red;margin:2rem;">Failed to load products. Check your connection or Firebase rules.</div>'
            );
            $("body").addClass("loaded");
        }
    }

    // Initialize all inventory data with loader
    async function initializeAllInventoryData() {
        try {
            showInventoryLoader();
            await Promise.all([loadProducts(), loadAdditionals()]);
        } catch (error) {
            console.error("Error initializing inventory data:", error);
        } finally {
            hideInventoryLoader();
        }
    }

    initializeAllInventoryData();

    // RGB TO HEX FUNCTION
    function rgbToHex(rgb) {
        const rgbMatch = rgb.match(/\d+/g);
        return (
            "#" +
            rgbMatch
                .map(x => parseInt(x).toString(16).padStart(2, "0"))
                .join("")
        );
    }

    // CATEGORY & COLOR CODE MAPPINGS
    const categoryCodes = {
        "Ball Gown": "BGWN",
        "Long Gown": "LGWN",
        "Wedding Gown": "WGWN",
        "Fairy Gown": "FGWN",
        Suits: "SUIT"
    };

    const colorCodes = {
        Beige: "BEI",
        White: "WHI",
        Black: "BLK",
        Red: "RED",
        Blue: "BLU",
        Yellow: "YEL",
        Green: "GRN",
        Orange: "ORN",
        Purple: "PUR",
        Gray: "GRY",
        Brown: "BRN",
        Cream: "CRM"
    };

    // GENERATE PRODUCT CODE FUNCTION
    async function generateProductCode(category, color) {
        const categoryCode = categoryCodes[category];
        const colorCode = colorCodes[color];
        const baseCode = `${categoryCode}-${colorCode}`;

        const productsRef = collection(chandriaDB, "products");
        const q = query(
            productsRef,
            where("code", ">=", baseCode),
            where("code", "<", baseCode + "\uf8ff")
        );
        const snapshot = await getDocs(q);

        const numbers = snapshot.docs.map(doc => {
            const match = doc.data().code.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = (Math.max(...numbers, 0) + 1)
            .toString()
            .padStart(3, "0");
        return `${baseCode}-${nextNumber}`;
    }

    // GENERATE ON INPUT TYPE
    $("#add-product-category, #add-product-color").on(
        "change",
        async function () {
            const category = $("#add-product-category").val();
            const color = $("#add-product-color").val();

            if (
                category !== "Select Category" &&
                color !== "Select Color" &&
                categoryCodes[category] &&
                colorCodes[color]
            ) {
                const code = await generateProductCode(category, color);
                $("#add-product-code").val(code);
            }
        }
    );

    $("#update-product-category, #update-product-color").on(
        "change",
        async function () {
            const category = $("#update-product-category").val();
            const color = $("#update-product-color").val();

            if (
                category !== "Select Category" &&
                color !== "Select Color" &&
                categoryCodes[category] &&
                colorCodes[color]
            ) {
                const code = await generateProductCode(category, color);
                $("#update-product-code").val(code);
            }
        }
    );

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // ADDING PRODUCT FUNCTION
    $("#add-product-btn").on("click", async function (e) {
        e.preventDefault();

        // VALIDATING REQUIRED FIELDS
        const frontFile = $("#add-file-front-img")[0].files[0];
        const backFile = $("#add-file-back-img")[0].files[0];

        if (!frontFile && !backFile) {
            showErrorModal("Please select both Front and Back View images.");
            return;
        }

        if (!frontFile) {
            showErrorModal("Please select a Front View image.");
            return;
        }

        if (!backFile) {
            showErrorModal("Please select a Back View image.");
            return;
        }

        // GETTING INPUTS VALUE
        const requiredFields = [
            "#add-product-name",
            "#add-product-price",
            "#add-product-color",
            "#add-product-sleeve",
            "#add-product-category",
            "#add-product-description"
        ];

        let isValid = true;

        requiredFields.forEach(selector => {
            const value = $(selector).val().trim();
            if (!value) {
                showErrorModal(
                    `Please fill out ${selector.replace(
                        "#add-product-",
                        "Product "
                    )}.`
                );
                isValid = false;
            }
        });
        if (!isValid) return;

        const selectCategory = $("#add-product-category").val();
        if (selectCategory == "Select Category") {
            showErrorModal("Select a Category.");
            return;
        }

        // Price should not be negative
        const priceValue = parseFloat($("#add-product-price").val());
        if (isNaN(priceValue) || priceValue < 0) {
            showErrorModal("Product price cannot be negative.");
            return;
        }

        // DISPLAYING SPINNER
        const spinnerText = $("#spinner-text");
        const spinner = $("#spinner");

        // FUNCTION TO UPLOAD SINGLE IMAGE
        const uploadImage = async file => {
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

            const data = await response.json();
            return {
                url: data.secure_url,
                public_id: data.public_id // Save this
            };
        };

        // COLLECT SIZE + QUANTITY DATA
        const sizes = {};
        let sizeValid = true;

        // Get all checked size checkboxes
        const checkedSizes = $('input[name="add-product-size"]:checked');

        if (checkedSizes.length === 0) {
            showErrorModal("Please select at least one size.");
            return;
        }

        checkedSizes.each(function () {
            const size = $(this).val();
            const qty = parseInt($(`#qty-${size}`).val());

            if (!isNaN(qty) && qty > 0) {
                sizes[size] = qty;
            } else {
                showErrorModal(
                    `Please enter a valid quantity for size ${size}.`
                );
                sizeValid = false;
                return false; // Break loop on invalid input
            }
        });
        if (!sizeValid) return;

        try {
            spinner.removeClass("d-none");
            // GENERATE PRODUCT CODE BEFORE SUBMITTING
            const categoryText = $("#add-product-category").val();
            const colorText = $("#add-product-color").val();
            const productCode = await generateProductCode(
                categoryText,
                colorText
            );

            spinnerText.text("Uploading Image");
            // UPLOAD BOTH IMAGES
            const frontImage = await uploadImage(frontFile);
            const backImage = await uploadImage(backFile);

            // CONVERTING RGB TO HEX
            const rgb = $("#add-product-color option:selected").css("color");
            const hex = rgbToHex(rgb);

            // GET FORM DATA
            const productData = {
                name: $("#add-product-name").val(),
                code: productCode,
                price: $("#add-product-price").val(),
                size: sizes,
                color: hex,
                sleeve: $("#add-product-sleeve").val(),
                category: categoryText,
                description: $("#add-product-description").val(),
                frontImageUrl: frontImage.url,
                backImageUrl: backImage.url,
                frontImageId: frontImage.public_id,
                backImageId: backImage.public_id,
                createdAt: new Date()
            };

            spinnerText.text("Submitting Data");
            // SAVE TO FIREBASE
            const docRef = await addDoc(
                collection(chandriaDB, "products"),
                productData
            );

            //ReLOADS THE PRODUCTS
            await loadProducts();

            // SHOW SUCCESS MESSAGE
            notyf.success("Product Successfully Added!");

            // RESET FORM
            $("#addProductForm")[0].reset();
            // CLEAR SIZE QUANTITY INPUTS
            $("#add-selected-size-container").empty();
            // RESET IMAGE DROP ZONES
            $("#add-dropzone-front").css("background-image", "none");
            $("#add-upload-label-front").css("opacity", "1");

            $("#add-dropzone-back").css("background-image", "none");
            $("#add-upload-label-back").css("opacity", "1");

            // CLOSING MODAL
            $("#addProductModal").removeClass("show");
        } catch (err) {
            console.error("Upload failed:", err);
            showErrorModal("There was an error uploading the product.");
        }

        spinner.addClass("d-none");    });

    // DELETE REQUEST FUNCTION
    // WARNING: This function uses API secret in client-side code - security risk!
    // TODO: Move this to a backend service for production use
    async function deleteImageFromCloudinary(publicId) {
        const timestamp = Math.floor(Date.now() / 1000);

        const signature = await generateLegacySignature(
            publicId,
            timestamp,
            LEGACY_CLOUDINARY_CONFIG.apiSecret
        );

        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("api_key", LEGACY_CLOUDINARY_CONFIG.apiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);

        const response = await fetch(getLegacyCloudinaryDeleteUrl(),
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();
        console.log("Delete result:", result);

        if (result.result !== "ok") {
            console.error("Cloudinary deletion failed:", result);
            throw new Error(`Image deletion failed: ${publicId}`);
        }

        return result;
    }

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // DELETE CARD FUNCTION
    $(document).on("click", ".delete-btn", async function () {
        const productId = $(this).data("id");
        const card = $(this).closest(".card");

        // DISPLAYING SPINNER
        const spinner = $("#spinner");
        const spinnerText = $("#spinner-text");

        showConfirmModal(
            "Are you sure you want to delete this product?",
            async function () {
                try {
                    spinner.removeClass("d-none");
                    spinnerText.text("Deleting Image");
                    // Step 1: Get product info from Firestore
                    const docSnap = await getDoc(
                        doc(chandriaDB, "products", productId)
                    );
                    const product = docSnap.data();

                    // Step 2: Delete images
                    await deleteImageFromCloudinary(product.frontImageId);
                    await deleteImageFromCloudinary(product.backImageId);

                    spinnerText.text("Deleting Data");

                    // Step 3: Delete product record
                    await deleteDoc(doc(chandriaDB, "products", productId));
                    notyf.success("Product Deleted!");
                    card.remove();
                    spinner.addClass("d-none");
                } catch (err) {
                    console.error("Error:", err);
                    showErrorModal("Failed to delete product or images.");
                }
            }
        );
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // SIZE CHECKBOX FUNCTION
    $('input[name="add-product-size"]').change(function () {
        const size = $(this).val();
        const container = $("#add-selected-size-container");
        const inputId = `qty-${size}`;

        if ($(this).is(":checked")) {
            if (!$(`#${inputId}`).length) {
                const inputGroup = `
                        <div class="qty-group" id="group-${size}">
                            <label for="${inputId}">Quantity for ${size}:</label>
                            <input type="number" id="${inputId}" name="${inputId}" min="0" />
                        </div>`;
                container.append(inputGroup);
            }
        } else {
            $(`#group-${size}`).remove();
        }
    });
    $('input[name="update-product-size"]').change(function () {
        const size = $(this).val();
        const container = $("#update-selected-size-container");
        const inputId = `qty-${size}`;

        if ($(this).is(":checked")) {
            if (!$(`#${inputId}`).length) {
                const inputGroup = `
                        <div class="qty-group" id="group-${size}">
                            <label for="${inputId}">Quantity for ${size}:</label>
                            <input type="number" id="${inputId}" name="${inputId}" min="0" />
                        </div>`;
                container.append(inputGroup);
            }
        } else {
            $(`#group-${size}`).remove();
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // VIEW DETAILS FUNCTION
    $(document).on("click", ".edit-btn", async function () {
        const productId = $(this).data("id");

        try {
            const docRef = doc(chandriaDB, "products", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Set image previews
                if (data.frontImageUrl) {
                    $("#update-dropzone-front").css({
                        "background-image": `url(${data.frontImageUrl})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });
                    $("#update-upload-label-front").css("opacity", "0");
                }
                if (data.backImageUrl) {
                    $("#update-dropzone-back").css({
                        "background-image": `url(${data.backImageUrl})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });
                    $("#update-upload-label-back").css("opacity", "0");
                }

                // Fill text inputs
                $("#update-product-id").val(productId);
                $("#update-product-name").val(data.name);
                $("#update-product-price").val(data.price);
                $("#update-product-code").val(data.code);
                $("#update-product-description").val(data.description);

                // Set category
                $("#update-product-category").val(data.category);

                // Set sleeve
                $("#update-product-sleeve").val(data.sleeve);

                // Set color using hex style matching
                const colorOptions = $("#update-product-color option");
                colorOptions.each(function () {
                    const optionColor = rgbToHex($(this).css("color"));
                    if (
                        optionColor.toLowerCase() === data.color.toLowerCase()
                    ) {
                        $(this).prop("selected", true);
                    }
                });

                // Set sizes and quantities
                const sizeData = data.size || {}; // e.g., { S: 3, M: 5 }
                const selectedSizes = Object.keys(sizeData);

                // Check checkboxes and trigger change event to auto-generate inputs
                $("input[name='update-product-size']").each(function () {
                    const size = $(this).val();
                    if (selectedSizes.includes(size)) {
                        $(this).prop("checked", true).trigger("change");
                    } else {
                        $(this).prop("checked", false).trigger("change");
                    }
                });

                // After inputs are created by the change handler, set their values
                selectedSizes.forEach(size => {
                    const inputId = `qty-${size}`;
                    const input = $(`#${inputId}`);
                    if (input.length) {
                        input.val(sizeData[size]);
                    }
                });
            } else {
                showErrorModal("Product not found.");
            }
        } catch (error) {
            console.error("Error getting product:", error);
            showErrorModal("Failed to load product.");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // UPDATE PRODUCT FUNCTION
    $("#update-product-btn").on("click", async function (e) {
        e.preventDefault();

        const productId = $("#update-product-id").val();
        if (!productId) return showErrorModal("Product ID not found.");

        // Validate required fields
        const requiredFields = [
            "#update-product-name",
            "#update-product-code",
            "#update-product-price",
            "#update-product-color",
            "#update-product-sleeve",
            "#update-product-category",
            "#update-product-description"
        ];

        for (let selector of requiredFields) {
            const value = $(selector).val().trim();
            if (!value) {
                showErrorModal(
                    `Please fill out ${selector.replace(
                        "#update-product-",
                        "Product "
                    )}.`
                );
                return;
            }
        }

        // Validate price
        const priceValue = parseFloat($("#update-product-price").val());
        if (isNaN(priceValue) || priceValue < 0) {
            return showErrorModal("Product price cannot be negative.");
        }

        const frontFile = $("#update-file-front-img")[0].files[0];
        const backFile = $("#update-file-back-img")[0].files[0];

        // Collect size and quantity
        const sizes = {};
        const checkedSizes = $('input[name="update-product-size"]:checked');
        if (checkedSizes.length === 0)
            return showErrorModal("Please select at least one size.");

        for (let i = 0; i < checkedSizes.length; i++) {
            const size = $(checkedSizes[i]).val();
            const qty = parseInt($(`#qty-${size}`).val());
            if (!isNaN(qty) && qty > 0) {
                sizes[size] = qty;
            } else {
                showErrorModal(
                    `Please enter a valid quantity for size ${size}.`
                );
                return;
            }
        }

        let frontImageUrl = null;
        let backImageUrl = null;
        let frontImageId = null;
        let backImageId = null;

        try {
            // Show loading spinner
            $("#spinner").removeClass("d-none");
            $("#spinner-text").text("Updating Product...");

            // Fetch current product data
            const docSnap = await getDoc(
                doc(chandriaDB, "products", productId)
            );
            const existingProduct = docSnap.data();

            // DELETE OLD FRONT IMAGE IF NEW ONE IS PROVIDED
            if (frontFile && existingProduct.frontImageId) {
                $("#spinner-text").text("Deleting Old Front Image...");
                await deleteImageFromCloudinary(existingProduct.frontImageId);
            }

            // DELETE OLD BACK IMAGE IF NEW ONE IS PROVIDED
            if (backFile && existingProduct.backImageId) {
                $("#spinner-text").text("Deleting Old Back Image...");
                await deleteImageFromCloudinary(existingProduct.backImageId);
            }

            // UPLOAD NEW FRONT IMAGE
            if (frontFile) {
                $("#spinner-text").text("Uploading Front Image...");
                const formDataFront = new FormData();
                formDataFront.append("file", frontFile);
                formDataFront.append("upload_preset", "UPLOAD_IMG");

                const responseFront = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formDataFront
                    }
                );
                const dataFront = await responseFront.json();
                frontImageUrl = dataFront.secure_url;
                frontImageId = dataFront.public_id;
            }

            // UPLOAD NEW BACK IMAGE
            if (backFile) {
                $("#spinner-text").text("Uploading Back Image...");
                const formDataBack = new FormData();
                formDataBack.append("file", backFile);
                formDataBack.append("upload_preset", "UPLOAD_IMG");

                const responseBack = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formDataBack
                    }
                );
                const dataBack = await responseBack.json();
                backImageUrl = dataBack.secure_url;
                backImageId = dataBack.public_id;
            }

            // Convert RGB color to HEX
            const rgb = $("#update-product-color option:selected").css("color");
            const hex = rgbToHex(rgb);

            // Prepare the data object for update
            const updatedData = {
                name: $("#update-product-name").val(),
                price: priceValue,
                size: sizes,
                color: hex,
                sleeve: $("#update-product-sleeve").val(),
                category: $("#update-product-category").val(),
                code: $("#update-product-code").val(),
                description: $("#update-product-description").val()
            };

            // Include new image URLs/IDs if updated
            if (frontImageUrl && frontImageId) {
                updatedData.frontImageUrl = frontImageUrl;
                updatedData.frontImageId = frontImageId;
            }
            if (backImageUrl && backImageId) {
                updatedData.backImageUrl = backImageUrl;
                updatedData.backImageId = backImageId;
            }

            // Update Firestore document
            const docRef = doc(chandriaDB, "products", productId);
            await updateDoc(docRef, updatedData);

            // Reload updated products
            await loadProducts();

            notyf.success("Product updated successfully!");

            // Reset the form
            $("#updateProductForm")[0].reset();

            // Close the modal
            $("#viewProductModal").removeClass("show");
        } catch (error) {
            console.error("Error updating product:", error);
            showErrorModal("Failed to update product.");
        } finally {
            // Hide spinner
            $("#spinner").addClass("d-none");
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // IMAGE PREVIEW
    $("#add-file-front-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#add-dropzone-front").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#add-upload-label-front").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#add-file-back-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#add-dropzone-back").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#add-upload-label-back").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#update-file-front-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-dropzone-front").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-upload-label-front").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    $("#update-file-back-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-dropzone-back").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-upload-label-back").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    // ============================== ADDITIONAL ACCESSORIES SECTION ==============================
    // --- ADDITIONAL PRODUCT DISPLAY ---
    async function loadAdditionals() {
        try {
            const container = $("#additional-container");
            container.empty(); // Clear existing cards to avoid duplicates

            const querySnapshot = await getDocs(
                collection(chandriaDB, "additionals")
            );

            if (querySnapshot.empty) {
                container.append(
                    '<div style="margin:2rem;">No additional products found.</div>'
                );
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();

                // Check required fields
                if (!data.imageUrl || !data.code) {
                    console.warn(
                        "Additional missing image or code:",
                        doc.id,
                        data
                    );
                    return;
                }

                // Create card HTML
                const card = $(`
                <article class="card_article card">
                    <div class="card_data">
                        <img
                            src="${data.imageUrl}"
                            alt="image"
                            class="card_img"
                        />
                        <h2 class="card_title">${data.name}</h2>
                        <p class="card_info">Price: ₱${data.price}</p>
                        <p class="card_info">
                            ${
                                data.inclusions && data.inclusions.length
                                    ? "With Inclusion"
                                    : "Without Inclusion"
                            }
                        </p>
                        <span class="card_category">${data.code}</span>
                        <div class="product-actions">
                            <a
                                href="#"
                                class="action-btn edit-add-btn"
                                data-open="updateAdditionalModal"
                                aria-label="Edit"
                                data-id="${doc.id}"
                            >
                                <i class="fi fi-rr-edit"></i>
                            </a>
                            <a
                                href="#"
                                class="action-btn delete-add-btn"
                                aria-label="Delete"
                                data-id="${doc.id}"
                            >
                                <i class="fi fi-rr-trash"></i>
                            </a>
                        </div>
                    </div>
                </article>
            `);

                container.append(card);
            });
        } catch (err) {
            console.error("Error loading additional products:", err);
            $("#additional-container").append(
                '<div style="color:red;margin:2rem;">Failed to load additional products.</div>'
            );
        }
    }

    // GENERATE ADDITIONAL PRODUCT CODE
    async function generateAdditionalCode(name) {
        if (!name || name.length < 3) return;

        const prefix = "ADD";
        const nameCode = name.trim().substring(0, 3).toUpperCase();
        const baseCode = `${prefix}-${nameCode}`;

        const additionalsRef = collection(chandriaDB, "additionals");
        const q = query(
            additionalsRef,
            where("code", ">=", baseCode),
            where("code", "<", baseCode + "\uf8ff")
        );
        const snapshot = await getDocs(q);

        const numbers = snapshot.docs.map(doc => {
            const match = doc.data().code.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = (Math.max(...numbers, 0) + 1)
            .toString()
            .padStart(3, "0");

        const fullCode = `${baseCode}-${nextNumber}`;
        $("#add-additional-code").val(fullCode);
        $("#update-additional-code").val(fullCode);
    }

    // GENERATE PRODUCT CODE ON TRIGGER
    $("#add-additional-name").on("input", function () {
        const name = $(this).val();
        generateAdditionalCode(name);
    });
    $("#update-additional-name").on("input", function () {
        const name = $(this).val();
        generateAdditionalCode(name);
    });

    // --- ADDITIONAL FORM SUBMISSION ---
    $("#add-additional-btn").on("click", async function (e) {
        e.preventDefault();

        // VALIDATION
        const imageFile = $("#add-additional-file-img")[0].files[0];
        const name = $("#add-additional-name").val();
        const code = $("#add-additional-code").val();
        const price = parseFloat($("#add-additional-price").val());

        if (!imageFile) {
            showErrorModal("Please select an image.");
            return;
        }

        if (!name || !code || isNaN(price) || price < 0) {
            showErrorModal("Please fill in all fields with valid values.");
            return;
        }

        // GATHER INCLUSIONS IF CHECKED
        let inclusions = [];
        if ($("#with-inclusions-checkbox").is(":checked")) {
            $("#inclusions-container input[type='text']").each(function () {
                const val = $(this).val().trim();
                if (val) inclusions.push(val);
            });
            if (inclusions.length === 0) {
                showErrorModal("Please enter at least one inclusion.");
                return;
            }
        }

        // UPLOAD IMAGE TO CLOUDINARY
        const uploadImage = async file => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "UPLOAD_IMG");

            const res = await fetch(
                "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json();
            return {
                url: data.secure_url,
                public_id: data.public_id
            };
        };

        try {
            $("#spinner").removeClass("d-none");
            $("#spinner-text").text("Uploading Additional Image...");

            const uploadedImage = await uploadImage(imageFile);

            const additionalData = {
                name,
                code,
                price,
                imageUrl: uploadedImage.url,
                imageId: uploadedImage.public_id,
                inclusions: inclusions.length ? inclusions : null,
                createdAt: new Date()
            };

            $("#spinner-text").text("Saving Data...");

            await addDoc(collection(chandriaDB, "additionals"), additionalData);

            notyf.success("Additional item added!");

            // RESET FORM
            $("#addAdditionalModal form")[0].reset();
            $("#add-additional-dropzone-img").css("background-image", "none");
            $("#add-additional-upload-label-img").css("opacity", "1");
            $("#inclusions-container").empty();
            $("#inclusions-container").hide();
            $("#remove-inclusion-btn").prop("disabled", true);

            $("#addAdditionalModal").removeClass("show");

            // Reload any relevant data view
            await loadAdditionals(); // if you have a function like this
        } catch (err) {
            console.error(err);
            showErrorModal("Failed to add additional item.");
        }

        $("#spinner").addClass("d-none");
    });

    // --- ADDITIONAL IMAGE PREVIEW ---
    $("#add-additional-file-img").on("change", function () {
        const file = this.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $("#add-additional-dropzone-img").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });
                $("#add-additional-upload-label-img").css("opacity", "0");
            };
            reader.readAsDataURL(file);
        }
    });

    // UPDATE ADDITIONAL IMAGE PREVIEW
    $("#update-additional-file-img").on("change", function () {
        const file = this.files[0];

        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                $("#update-additional-dropzone-img").css({
                    "background-image": `url(${e.target.result})`,
                    "background-size": "cover",
                    "background-position": "center"
                });

                $("#update-additional-upload-label-img").css("opacity", "0");
            };

            reader.readAsDataURL(file);
        }
    });

    // VIEW ADDITIONAL DETAILS FUNCTION
    $(document).on("click", ".edit-add-btn", async function () {
        const additionalId = $(this).data("id");
        $("#updateAdditionalModal").addClass("show");

        try {
            const docRef = doc(chandriaDB, "additionals", additionalId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Set hidden field data-id for update
                $("#update-additional-id").val(additionalId);

                // Set image preview
                if (data.imageUrl) {
                    $("#update-additional-dropzone-img").css({
                        "background-image": `url(${data.imageUrl})`,
                        "background-size": "cover",
                        "background-position": "center"
                    });
                    $("#update-additional-upload-label-img").css(
                        "opacity",
                        "0"
                    );
                }

                // Fill inputs
                $("#update-additional-name").val(data.name || "");
                $("#update-additional-code").val(data.code || "");
                $("#update-additional-price").val(data.price || "");

                // Handle inclusions
                const inclusions = data.inclusions || [];
                if (inclusions.length > 0) {
                    $("#with-inclusions-update-checkbox").prop("checked", true);
                    $("#with-inclusions-update-checkbox").trigger("change");
                    $("#update-inclusions-container").empty();
                    inclusions.forEach((inclusion, index) => {
                        const input = $(`
                        <input
                            type="text"
                            class="inclusion-input"
                            value="${inclusion}"
                            placeholder="Inclusion ${index + 1}"
                        />
                    `);
                        $("#update-inclusions-container").append(input);
                    });
                    $("#update-inclusion-btn-row").show();
                } else {
                    $("#with-inclusions-update-checkbox").prop(
                        "checked",
                        false
                    );
                    $("#update-inclusions-container").empty();
                }
            } else {
                showErrorModal("Additional product not found.");
            }
        } catch (err) {
            console.error("Error loading additional product:", err);
            showErrorModal("Failed to load additional product.");
        }
    });

    // INCLUSION CHECKBOX FUNCTION (ADDING)
    $("#with-inclusions-checkbox").on("change", function () {
        if (this.checked) {
            $("#inclusions-container").show().append(`
            <input
                type="text"
                placeholder="Name"
                class="inclusion-field"
            />
        `);
            $("#inclusion-btn-row").addClass("show");
            $("#remove-inclusion-btn").prop("disabled", true); // disable initially
        } else {
            $("#inclusions-container").hide().empty();
            $("#inclusion-btn-row").removeClass("show");
            $("#remove-inclusion-btn").prop("disabled", false); // reset on uncheck
        }
    });

    // ADD INCLUSION BUTTON FUNCTION
    $("#add-inclusion-btn").on("click", function () {
        $("#inclusions-container").append(`
        <input
            type="text"
            placeholder="Name"
            class="inclusion-field"
        />
    `);

        // Enable remove button if more than one input exists
        if ($("#inclusions-container input[type='text']").length > 1) {
            $("#remove-inclusion-btn").prop("disabled", false);
        }
    });
    // REMOVE INCLUSION BUTTON FUNCTION
    $("#remove-inclusion-btn").on("click", function () {
        const $container = $("#inclusions-container");
        const $fields = $container.find("input[type='text']");

        if ($fields.length > 1) {
            $fields.last().remove();
        }

        // Disable button if only one input is left
        if ($container.find("input[type='text']").length === 1) {
            $(this).prop("disabled", true);
        }
    });

    // INCLUSION CHECKBOX FUNCTION (UPDATE)
    $("#with-inclusions-update-checkbox").on("change", function () {
        if (this.checked) {
            $("#update-inclusions-container").show().append(`
            <input
                type="text"
                placeholder="Name"
                class="inclusion-field"
            />
        `);
            $("#update-inclusion-btn-row").addClass("show");
            $("#update-remove-inclusion-btn").prop("disabled", true); // disable initially
        } else {
            $("#update-inclusions-container").hide().empty();
            $("#update-inclusion-btn-row").removeClass("show");
            $("#update-remove-inclusion-btn").prop("disabled", false); // reset on uncheck
        }
    });

    // ADD INCLUSION BUTTON FUNCTION
    $("#update-add-inclusion-btn").on("click", function () {
        $("#update-inclusions-container").append(`
        <input
            type="text"
            placeholder="Name"
            class="inclusion-field"
        />
    `);

        // Enable remove button if more than one input exists
        if ($("#update-inclusions-container input[type='text']").length > 1) {
            $("#update-remove-inclusion-btn").prop("disabled", false);
        }
    });

    // REMOVE INCLUSION BUTTON FUNCTION
    $("#update-remove-inclusion-btn").on("click", function () {
        const $container = $("#update-inclusions-container");
        const $fields = $container.find("input[type='text']");

        if ($fields.length > 1) {
            $fields.last().remove();
        }

        // Disable button if only one input is left
        if ($container.find("input[type='text']").length === 1) {
            $(this).prop("disabled", true);
        }
    });

    // UPDATE ADDITIONAL PRODUCT
    $("#update-additional-btn").on("click", async function (e) {
        e.preventDefault();

        const additionalId = $("#update-additional-id").val();
        if (!additionalId) return showErrorModal("Additional ID not found.");

        const name = $("#update-additional-name").val().trim();
        const code = $("#update-additional-code").val().trim();
        const price = parseFloat($("#update-additional-price").val());
        const newImageFile = $("#update-additional-file-img")[0].files[0];

        if (!name || !code || isNaN(price) || price < 0) {
            return showErrorModal(
                "Please fill in all fields with valid values."
            );
        }

        let inclusions = [];
        if ($("#with-inclusions-update-checkbox").is(":checked")) {
            $("#update-inclusions-container input[type='text']").each(
                function () {
                    const val = $(this).val().trim();
                    if (val) inclusions.push(val);
                }
            );

            if (inclusions.length === 0) {
                return showErrorModal("Please enter at least one inclusion.");
            }
        }

        let newImageUrl = null;
        let newImageId = null;

        try {
            $("#spinner").removeClass("d-none");
            $("#spinner-text").text("Updating Additional...");

            const docRef = doc(chandriaDB, "additionals", additionalId);

            const docSnap = await getDoc(docRef);
            const existingData = docSnap.data();

            // DELETE OLD IMAGE IF NEW ONE IS SELECTED
            if (newImageFile && existingData.imageId) {
                $("#spinner-text").text("Deleting Old Image...");
                await deleteImageFromCloudinary(existingData.imageId);
            }

            // UPLOAD NEW IMAGE IF SELECTED
            if (newImageFile) {
                $("#spinner-text").text("Uploading New Image...");
                const formData = new FormData();
                formData.append("file", newImageFile);
                formData.append("upload_preset", "UPLOAD_IMG");

                const response = await fetch(
                    "https://api.cloudinary.com/v1_1/dbtomr3fm/image/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );
                const data = await response.json();
                newImageUrl = data.secure_url;
                newImageId = data.public_id;
            }

            const updatedData = {
                name,
                code,
                price,
                inclusions: inclusions.length ? inclusions : null
            };

            if (newImageUrl && newImageId) {
                updatedData.imageUrl = newImageUrl;
                updatedData.imageId = newImageId;
            }

            await updateDoc(docRef, updatedData);

            notyf.success("Additional item updated!");

            // Reset form and modal
            $("#update-add-form")[0].reset();
            $("#updateAdditionalModal").removeClass("show");
            $("#update-inclusions-container").empty().hide();

            // Refresh data view
            await loadAdditionals();
        } catch (err) {
            console.error(err);
            showErrorModal("Failed to update additional item.");
        } finally {
            $("#spinner").addClass("d-none");
        }
    });

    // DELETE ADDITIONAL FUNCTION
    $(document).on("click", ".delete-add-btn", async function () {
        const additionalId = $(this).data("id");
        const card = $(this).closest(".card");

        showConfirmModal(
            "Are you sure you want to delete this additional item?",
            async function () {
                try {
                    const spinner = $("#spinner");
                    const spinnerText = $("#spinner-text");

                    spinner.removeClass("d-none");
                    spinnerText.text("Deleting Image");

                    // Step 1: Get additional info
                    const docSnap = await getDoc(
                        doc(chandriaDB, "additionals", additionalId)
                    );
                    const additional = docSnap.data();

                    // Step 2: Delete image from Cloudinary
                    await deleteImageFromCloudinary(additional.imageId);

                    spinnerText.text("Deleting Data");

                    // Step 3: Delete Firestore record
                    await deleteDoc(
                        doc(chandriaDB, "additionals", additionalId)
                    );

                    notyf.success("Additional item deleted!");
                    card.fadeOut(300, () => card.remove());
                } catch (err) {
                    console.error("Error:", err);
                    showErrorModal(
                        "Failed to delete additional item or image."
                    );
                } finally {
                    $("#spinner").addClass("d-none");
                }
            }
        );
    });

    // MODAL CLOSE TOGGLER
    $("#updateAdditionalModal, #updateModalCloseBtn, #updateCloseBtn").on(
        "click",
        function () {
            $("#updateAdditionalModal").removeClass("show");

            $("#update-add-form")[0].reset();
            // RESET IMAGE DROP ZONES
            $("#update-additional-dropzone-img").css(
                "background-image",
                "none"
            );
            $("#update-additional-upload-label-img").css("opacity", "1");

            $("#update-inclusions-container").empty();
            $("#update-inclusion-btn-row").removeClass("show");
        }
    );

    // PREVENT DEFAULTS
    $("#updateModalContent").on("click", function (e) {
        e.stopPropagation();
    });

    // ============================== END OF ADDTIONAL SECTION ==============================

    // --- TAB & ADD BUTTON LOGIC ---
    const addItemBtn = $("#add-item-btn");
    const addProductModal = $("#addProductModal");
    const addAdditionalModal = $("#addAdditionalModal");
    const tabBtns = $(".tab-btn");

    function setAddButtonForTab(tab) {
        if (tab === "products") {
            addItemBtn.text("Add Product");
            addItemBtn.attr("data-open", "addProductModal");
        } else if (tab === "accessories") {
            addItemBtn.text("Add Additional");
            addItemBtn.attr("data-open", "addAdditionalModal");
        }
    }

    tabBtns.on("click", function () {
        const tab = $(this).data("tab");
        setAddButtonForTab(tab);
    });

    // Open correct modal when add button is clicked
    addItemBtn.on("click", function (e) {
        e.preventDefault();

        const modalTarget = $(this).attr("data-open");
        // Always close both modals before opening the target
        addProductModal.removeClass("show");
        addAdditionalModal.removeClass("show");
        if (modalTarget === "addProductModal") {
            addProductModal.addClass("show");
        } else if (modalTarget === "addAdditionalModal") {
            addAdditionalModal.addClass("show");
        }
        setBodyScrollLock(true);
    });

    // Prevent background scroll when any modal is open (strict)
    function setBodyScrollLock(lock) {
        if (lock) {
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
        } else {
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        }
    }
    // Open modal: lock scroll
    $(document).on(
        "click",
        '[data-open="addProductModal"], [data-open="viewProductModal"], [data-open="addAdditionalModal"], [data-open="updateAdditionalModal"]',
        function () {
            setBodyScrollLock(true);
        }
    );
    // Close modal: unlock scroll
    $(document).on("click", "[data-close]", function () {
        var modalId = $(this).attr("data-close");
        $("#" + modalId).removeClass("show");
        setBodyScrollLock(false);

        // Optional: Reset form
        $("#updateProductForm")[0].reset();
        // CLEAR SIZE QUANTITY INPUTS
        $("#update-selected-size-container").empty();
        // RESET IMAGE DROP ZONES
        $("#update-dropzone-front").css("background-image", "none");
        $("#update-upload-label-front").css("opacity", "1");

        $("#update-dropzone-back").css("background-image", "none");
        $("#update-upload-label-back").css("opacity", "1");
    });

    // Also unlock scroll when clicking modal close X or background
    $(document).on("click", ".custom-close-button", function () {
        setBodyScrollLock(false);

        // Optional: Reset form
        $("#updateProductForm")[0].reset();
        // CLEAR SIZE QUANTITY INPUTS
        $("#update-selected-size-container").empty();
        // RESET IMAGE DROP ZONES
        $("#update-dropzone-front").css("background-image", "none");
        $("#update-upload-label-front").css("opacity", "1");

        $("#update-dropzone-back").css("background-image", "none");
        $("#update-upload-label-back").css("opacity", "1");
    });

    $(window).on("click", function (e) {
        if ($(e.target).hasClass("custom-modal")) {
            $(e.target).removeClass("show");
            setBodyScrollLock(false);

            // Optional: Reset form
            $("#updateProductForm")[0].reset();
            // CLEAR SIZE QUANTITY INPUTS
            $("#update-selected-size-container").empty();
            // RESET IMAGE DROP ZONES
            $("#update-dropzone-front").css("background-image", "none");
            $("#update-upload-label-front").css("opacity", "1");

            $("#update-dropzone-back").css("background-image", "none");
            $("#update-upload-label-back").css("opacity", "1");
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", function () {
            tabBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            tabContents.forEach(tc => tc.classList.remove("active"));
            const tab = this.getAttribute("data-tab");
            document.getElementById(tab).classList.add("active");
        });
    });
});
