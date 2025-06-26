/**
 * Modern Inventory Management System
 * Handles product and additional items with table view, pagination, and CRUD operations
 */

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
    where,
    orderBy
} from "./sdk/chandrias-sdk.js";

// Initialize Notyf for notifications
const notyf = new Notyf({
    position: {
        x: "center",
        y: "top"
    },
    duration: 4000
});

// Global variables
let currentData = [];
let filteredData = [];
let currentFilter = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let searchQuery = '';

// DOM elements
const inventoryTable = document.getElementById('inventory-table');
const inventoryTbody = document.getElementById('inventory-tbody');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('inventory-search');
const addProductBtn = document.getElementById('add-product-btn');
const addAdditionalBtn = document.getElementById('add-additional-btn');
const tableHeader = document.getElementById('table-header');

// Pagination elements
const paginationInfo = document.getElementById('pagination-info-text');
const pageNumbers = document.getElementById('page-numbers');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeInventory();
    setupEventListeners();
});

/**
 * Initialize the inventory system
 */
async function initializeInventory() {
    try {
        showLoader();
        await loadAllData();
        setupTableHeader();
        renderTable();
        setupPagination();
    } catch (error) {
        console.error('Error initializing inventory:', error);
        notyf.error('Failed to load inventory data');
    } finally {
        hideLoader();
    }
}

/**
 * Load all data from Firebase
 */
async function loadAllData() {
    try {
        const [productsSnapshot, additionalsSnapshot] = await Promise.all([
            getDocs(collection(chandriaDB, "products")),
            getDocs(collection(chandriaDB, "additionals"))
        ]);

        currentData = [];

        // Process products
        productsSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Handle both old URL format and new ID format for images
            let frontImageUrl = data.frontImageUrl;
            let backImageUrl = data.backImageUrl;
            
            // If using imageId format, construct Cloudinary URL
            if (data.frontImageId && !frontImageUrl) {
                frontImageUrl = `https://res.cloudinary.com/dbtomr3fm/image/upload/${data.frontImageId}`;
            }
            if (data.backImageId && !backImageUrl) {
                backImageUrl = `https://res.cloudinary.com/dbtomr3fm/image/upload/${data.backImageId}`;
            }
            
            currentData.push({
                id: doc.id,
                type: 'product',
                name: data.name || 'N/A',
                price: data.price || 0,
                category: data.category || 'N/A',
                sizes: data.size || {},
                quantity: calculateTotalQuantity(data.size || {}),
                code: data.code || 'N/A',
                color: data.color || 'N/A',
                sleeve: data.sleeve || 'N/A',
                frontImageUrl: frontImageUrl || '',
                backImageUrl: backImageUrl || '',
                description: data.description || '',
                originalData: data
            });
        });

        // Process additionals
        additionalsSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Handle both old URL format and new ID format for images
            let imageUrl = data.imageUrl;
            
            // If using imageId format, construct Cloudinary URL
            if (data.imageId && !imageUrl) {
                imageUrl = `https://res.cloudinary.com/dbtomr3fm/image/upload/${data.imageId}`;
            }
            
            currentData.push({
                id: doc.id,
                type: 'additional',
                name: data.name || 'N/A',
                price: data.price || 0,
                category: 'Additional',
                inclusions: data.inclusions || [],
                code: data.code || 'N/A',
                imageUrl: imageUrl || '',
                originalData: data
            });
        });

        filteredData = [...currentData];
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

/**
 * Calculate total quantity from size object
 */
function calculateTotalQuantity(sizeObj) {
    if (!sizeObj || typeof sizeObj !== 'object') return 0;
    return Object.values(sizeObj).reduce((total, qty) => total + (parseInt(qty) || 0), 0);
}

/**
 * Setup table header based on current filter
 */
function setupTableHeader() {
    let headerHTML = '';

    if (currentFilter === 'all') {
        headerHTML = `
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Category</th>
            <th>Sizes</th>
            <th>Quantity</th>
            <th>Code</th>
            <th>Action</th>
        `;
    } else if (currentFilter === 'product') {
        headerHTML = `
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Category</th>
            <th>Sizes</th>
            <th>Quantity</th>
            <th>Code</th>
            <th>Action</th>
        `;
    } else if (currentFilter === 'additional') {
        headerHTML = `
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Inclusions</th>
            <th>Code</th>
            <th>Action</th>
        `;
    }

    tableHeader.innerHTML = headerHTML;
}

/**
 * Render the table with current data
 */
function renderTable() {
    if (!filteredData.length) {
        inventoryTbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="bx bx-package" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                        <h3>No items found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    let tableHTML = '';

    pageData.forEach(item => {
        if (currentFilter === 'additional') {
            tableHTML += renderAdditionalRow(item);
        } else {
            tableHTML += renderItemRow(item);
        }
    });

    inventoryTbody.innerHTML = tableHTML;
}

/**
 * Render a regular item row (for 'all' and 'product' filters)
 */
function renderItemRow(item) {
    const imageUrl = item.type === 'product' ? item.frontImageUrl : item.imageUrl;
    const sizes = item.type === 'product' ? Object.keys(item.sizes).join(', ') : 'N/A';
    const quantity = item.type === 'product' ? item.quantity : 'N/A';
    const category = item.type === 'additional' ? 
        `Additional${item.inclusions.length > 0 ? ' (' + item.inclusions.join(', ') + ')' : ''}` : 
        item.category;

    return `
        <tr data-item-id="${item.id}" data-item-type="${item.type}">
            <td>
                <img src="${imageUrl}" alt="${item.name}" class="product-image" 
                     onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">
            </td>
            <td class="product-name">${item.name}</td>
            <td class="product-price">₱${parseFloat(item.price).toFixed(2)}</td>
            <td><span class="product-category">${category}</span></td>
            <td>${sizes}</td>
            <td class="product-quantity">${quantity}</td>
            <td class="product-code">${item.code}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-sm view" onclick="viewItem('${item.id}', '${item.type}')" title="View">
                        <i class="bx bx-show"></i>
                    </button>
                    <button class="action-btn-sm edit" onclick="editItem('${item.id}', '${item.type}')" title="Edit">
                        <i class="bx bx-edit"></i>
                    </button>
                    <button class="action-btn-sm delete" onclick="deleteItem('${item.id}', '${item.type}')" title="Delete">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Render an additional item row (for 'additional' filter)
 */
function renderAdditionalRow(item) {
    const inclusions = item.inclusions.length > 0 ? item.inclusions.join(', ') : 'N/A';

    return `
        <tr data-item-id="${item.id}" data-item-type="${item.type}">
            <td>
                <img src="${item.imageUrl}" alt="${item.name}" class="product-image" 
                     onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">
            </td>
            <td class="product-name">${item.name}</td>
            <td class="product-price">₱${parseFloat(item.price).toFixed(2)}</td>
            <td>${inclusions}</td>
            <td class="product-code">${item.code}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-sm view" onclick="viewItem('${item.id}', '${item.type}')" title="View">
                        <i class="bx bx-show"></i>
                    </button>
                    <button class="action-btn-sm edit" onclick="editItem('${item.id}', '${item.type}')" title="Edit">
                        <i class="bx bx-edit"></i>
                    </button>
                    <button class="action-btn-sm delete" onclick="deleteItem('${item.id}', '${item.type}')" title="Delete">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Setup pagination
 */
function setupPagination() {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Update pagination info
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} items`;

    // Update navigation buttons
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;

    // Generate page numbers
    generatePageNumbers(totalPages);
}

/**
 * Generate page number buttons
 */
function generatePageNumbers(totalPages) {
    pageNumbers.innerHTML = '';

    if (totalPages <= 1) return;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

/**
 * Navigate to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        setupPagination();
    }
}

/**
 * Filter data based on current filter and search query
 */
function applyFilters() {
    filteredData = currentData.filter(item => {
        // Apply type filter
        let typeMatch = true;
        if (currentFilter === 'product') {
            typeMatch = item.type === 'product';
        } else if (currentFilter === 'additional') {
            typeMatch = item.type === 'additional';
        }

        // Apply search filter
        let searchMatch = true;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            searchMatch = 
                item.name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.code.toLowerCase().includes(query);
        }

        return typeMatch && searchMatch;
    });

    currentPage = 1; // Reset to first page
    setupTableHeader();
    renderTable();
    setupPagination();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active filter button
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.dataset.filter;
            applyFilters();
        });
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFilters();
    });

    // Pagination buttons
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });

    // Add buttons
    addProductBtn.addEventListener('click', () => {
        showAddProductModal();
    });

    addAdditionalBtn.addEventListener('click', () => {
        showAddAdditionalModal();
    });

    // Modal event listeners
    setupModalEventListeners();
}

/**
 * Setup modal event listeners
 */
function setupModalEventListeners() {
    // Product modal
    const addProductModal = document.getElementById('addProductModal');
    const closeAddProduct = document.getElementById('close-add-product');
    const cancelAddProduct = document.getElementById('cancel-add-product');

    closeAddProduct?.addEventListener('click', () => hideModal('addProductModal'));
    cancelAddProduct?.addEventListener('click', () => hideModal('addProductModal'));

    // Additional modal
    const addAdditionalModal = document.getElementById('addAdditionalModal');
    const closeAddAdditional = document.getElementById('close-add-additional');
    const cancelAddAdditional = document.getElementById('cancel-add-additional');

    closeAddAdditional?.addEventListener('click', () => hideModal('addAdditionalModal'));
    cancelAddAdditional?.addEventListener('click', () => hideModal('addAdditionalModal'));

    // View modal
    const closeViewModal = document.getElementById('close-view-modal');
    closeViewModal?.addEventListener('click', () => hideModal('viewModal'));

    // Edit modal
    const closeEditModal = document.getElementById('close-edit-modal');
    closeEditModal?.addEventListener('click', () => hideModal('editModal'));

    // Backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                hideModal(backdrop.closest('.modern-modal').id);
            }
        });
    });

    // Size checkbox handling for product modal
    const sizeCheckboxes = document.querySelectorAll('input[name="product-size"]');
    const sizeQuantities = document.getElementById('size-quantities');

    sizeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const size = e.target.value;
            if (e.target.checked) {
                addSizeQuantityInput(size);
            } else {
                removeSizeQuantityInput(size);
            }
            updateProductCode();
        });
    });

    // Category change handler for product code generation
    const categorySelect = document.getElementById('add-product-category');
    const colorInput = document.getElementById('add-product-color');
    
    categorySelect?.addEventListener('change', updateProductCode);
    colorInput?.addEventListener('input', updateProductCode);

    // Handle custom category and sleeve options
    categorySelect?.addEventListener('change', (e) => {
        const customSection = document.getElementById('custom-category-section');
        if (customSection) {
            customSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
    });

    const sleeveSelect = document.getElementById('add-product-sleeve');
    sleeveSelect?.addEventListener('change', (e) => {
        const customSection = document.getElementById('custom-sleeve-section');
        if (customSection) {
            customSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
    });

    // Inclusions handling for additional modal
    const withInclusionsCheckbox = document.getElementById('with-inclusions');
    const inclusionsContainer = document.getElementById('inclusions-container');
    const addInclusionBtn = document.getElementById('add-inclusion');

    withInclusionsCheckbox?.addEventListener('change', (e) => {
        inclusionsContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    addInclusionBtn?.addEventListener('click', addInclusionField);

    // Additional name change for code generation
    const additionalNameInput = document.getElementById('add-additional-name');
    additionalNameInput?.addEventListener('input', updateAdditionalCode);

    // Form submissions
    const addProductForm = document.getElementById('addProductForm');
    const addAdditionalForm = document.getElementById('addAdditionalForm');

    addProductForm?.addEventListener('submit', handleAddProduct);
    addAdditionalForm?.addEventListener('submit', handleAddAdditional);

    // Image upload handlers
    setupImageUploadHandlers();
}

/**
 * Setup image upload handlers
 */
function setupImageUploadHandlers() {
    // Product images
    const frontUpload = document.getElementById('front-upload');
    const backUpload = document.getElementById('back-upload');
    const frontInput = document.getElementById('add-front-image');
    const backInput = document.getElementById('add-back-image');

    frontUpload?.addEventListener('click', () => frontInput.click());
    backUpload?.addEventListener('click', () => backInput.click());

    frontInput?.addEventListener('change', (e) => handleImagePreview(e, 'front-preview'));
    backInput?.addEventListener('change', (e) => handleImagePreview(e, 'back-preview'));

    // Additional image
    const additionalUpload = document.getElementById('additional-upload');
    const additionalInput = document.getElementById('add-additional-image');

    additionalUpload?.addEventListener('click', () => additionalInput.click());
    additionalInput?.addEventListener('change', (e) => handleImagePreview(e, 'additional-preview'));
}

/**
 * Handle image preview
 */
function handleImagePreview(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            const uploadContent = preview.parentElement.querySelector('.upload-content');
            const img = preview.querySelector('img');
            
            img.src = e.target.result;
            uploadContent.style.display = 'none';
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Add size quantity input
 */
function addSizeQuantityInput(size) {
    const sizeQuantities = document.getElementById('size-quantities');
    const quantityGroup = document.createElement('div');
    quantityGroup.className = 'quantity-group';
    quantityGroup.dataset.size = size;
    
    quantityGroup.innerHTML = `
        <span class="quantity-label">${size}:</span>
        <input type="number" class="quantity-input" name="quantity-${size}" 
               min="0" value="1" placeholder="Qty">
    `;
    
    sizeQuantities.appendChild(quantityGroup);
}

/**
 * Remove size quantity input
 */
function removeSizeQuantityInput(size) {
    const quantityGroup = document.querySelector(`[data-size="${size}"]`);
    if (quantityGroup) {
        quantityGroup.remove();
    }
}

/**
 * Update product code based on category and color
 */
async function updateProductCode() {
    const category = document.getElementById('add-product-category')?.value;
    const color = document.getElementById('add-product-color')?.value;
    
    if (category && color) {
        try {
            const productCode = await generateProductCode(category, color);
            document.getElementById('add-product-code').value = productCode;
        } catch (error) {
            console.error('Error generating product code:', error);
        }
    }
}

/**
 * Generate product code with auto-increment
 */
async function generateProductCode(category, color) {
    const categoryCodes = {
        "Ball Gown": "BGWN",
        "Long Gown": "LGWN",
        "Wedding Gown": "WGWN",
        "Fairy Gown": "FGWN",
        "Suits": "SUIT"
    };

    const colorCodes = {
        "Beige": "BEI",
        "White": "WHI",
        "Black": "BLK",
        "Red": "RED",
        "Blue": "BLU",
        "Yellow": "YEL",
        "Green": "GRN",
        "Orange": "ORN",
        "Purple": "PUR",
        "Gray": "GRY",
        "Brown": "BRN",
        "Cream": "CRM"
    };

    const categoryCode = categoryCodes[category] || "PROD";
    const colorCode = colorCodes[color] || color.substring(0, 3).toUpperCase();
    const baseCode = `${categoryCode}-${colorCode}`;

    try {
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
    } catch (error) {
        console.error('Error generating product code:', error);
        return `${baseCode}-001`;
    }
}

/**
 * Get category code
 */
function getCategoryCode(category) {
    const codes = {
        'Ball Gown': 'BGWN',
        'Wedding Gown': 'WGWN',
        'Fairy Gown': 'FGWN',
        'Long Gown': 'LGWN',
        'Suits': 'SUIT'
    };
    return codes[category] || 'PROD';
}

/**
 * Get color code
 */
function getColorCode(color) {
    const codes = {
        "Beige": "BEI",
        "White": "WHI",
        "Black": "BLK",
        "Red": "RED",
        "Blue": "BLU",
        "Yellow": "YEL",
        "Green": "GRN",
        "Orange": "ORN",
        "Purple": "PUR",
        "Gray": "GRY",
        "Brown": "BRN",
        "Cream": "CRM"
    };
    return codes[color] || color.substring(0, 3).toUpperCase();
}

/**
 * Update additional code
 */
async function updateAdditionalCode() {
    const name = document.getElementById('add-additional-name')?.value;
    
    if (name) {
        try {
            const additionalCode = await generateAdditionalCode(name);
            document.getElementById('add-additional-code').value = additionalCode;
        } catch (error) {
            console.error('Error generating additional code:', error);
        }
    }
}

/**
 * Generate additional code with auto-increment
 */
async function generateAdditionalCode(name) {
    const nameCode = name.substring(0, 3).toUpperCase();
    const baseCode = `ADD-${nameCode}`;

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

        const nextNumber = (Math.max(...numbers, 0) + 1)
            .toString()
            .padStart(3, "0");
        return `${baseCode}-${nextNumber}`;
    } catch (error) {
        console.error('Error generating additional code:', error);
        return `${baseCode}-001`;
    }
}

/**
 * Add inclusion field
 */
function addInclusionField() {
    const inclusionsList = document.getElementById('inclusions-list');
    const inclusionItem = document.createElement('div');
    inclusionItem.className = 'inclusion-item';
    
    inclusionItem.innerHTML = `
        <input type="text" class="form-input inclusion-input" placeholder="Enter inclusion">
        <button type="button" class="remove-inclusion" onclick="removeInclusionField(this)">
            <i class="bx bx-x"></i>
        </button>
    `;
    
    inclusionsList.appendChild(inclusionItem);
}

/**
 * Remove inclusion field
 */
function removeInclusionField(button) {
    button.parentElement.remove();
}

/**
 * Handle add product form submission
 */
async function handleAddProduct(event) {
    event.preventDefault();
    
    try {
        showLoader();
        
        // Validate required fields
        const productName = document.getElementById('add-product-name').value.trim();
        const category = document.getElementById('add-product-category').value;
        const price = document.getElementById('add-product-price').value;
        const color = document.getElementById('add-product-color').value.trim();
        
        if (!productName) {
            notyf.error('Please enter a product name');
            return;
        }
        
        if (!category || category === '') {
            notyf.error('Please select a category');
            return;
        }
        
        if (!price || price <= 0) {
            notyf.error('Please enter a valid price');
            return;
        }
        
        if (!color) {
            notyf.error('Please enter a color');
            return;
        }
        
        // Collect form data
        const frontImage = document.getElementById('add-front-image').files[0];
        const backImage = document.getElementById('add-back-image').files[0];
        
        if (!frontImage || !backImage) {
            notyf.error('Please upload both front and back images');
            return;
        }
        
        // Validate sizes
        const checkedSizes = document.querySelectorAll('input[name="product-size"]:checked');
        if (checkedSizes.length === 0) {
            notyf.error('Please select at least one size');
            return;
        }
        
        // Upload images to Cloudinary (implement this based on your existing upload logic)
        const frontImageData = await uploadImageToCloudinary(frontImage, 'front');
        const backImageData = await uploadImageToCloudinary(backImage, 'back');
        
        // Collect size quantities
        const sizes = {};
        let hasValidQuantity = false;
        
        document.querySelectorAll('.quantity-group').forEach(group => {
            const size = group.dataset.size;
            const quantity = parseInt(group.querySelector('.quantity-input').value) || 0;
            if (quantity > 0) {
                sizes[size] = quantity;
                hasValidQuantity = true;
            }
        });
        
        if (!hasValidQuantity) {
            notyf.error('Please enter valid quantities for selected sizes');
            return;
        }
        
        // Prepare product data
        const categoryValue = document.getElementById('add-product-category').value;
        const customCategory = document.getElementById('custom-category-input')?.value;
        const finalCategory = categoryValue === 'custom' ? customCategory : categoryValue;

        const sleeveValue = document.getElementById('add-product-sleeve').value;
        const customSleeve = document.getElementById('custom-sleeve-input')?.value;
        const finalSleeve = sleeveValue === 'custom' ? customSleeve : sleeveValue;

        const productData = {
            name: productName,
            category: finalCategory,
            price: parseFloat(price),
            size: sizes,
            color: color,
            sleeve: finalSleeve || 'N/A',
            code: document.getElementById('add-product-code').value,
            frontImageUrl: frontImageData.url,
            backImageUrl: backImageData.url,
            frontImageId: frontImageData.public_id,
            backImageId: backImageData.public_id,
            createdAt: new Date()
        };
        
        // Add to Firebase
        await addDoc(collection(chandriaDB, "products"), productData);
        
        notyf.success('Product added successfully!');
        hideModal('addProductModal');
        resetProductForm();
        await loadAllData();
        applyFilters();
        
    } catch (error) {
        console.error('Error adding product:', error);
        notyf.error('Failed to add product: ' + error.message);
    } finally {
        hideLoader();
    }
}

/**
 * Handle add additional form submission
 */
async function handleAddAdditional(event) {
    event.preventDefault();
    
    try {
        showLoader();
        
        // Collect form data
        const image = document.getElementById('add-additional-image').files[0];
        
        if (!image) {
            notyf.error('Please upload an image');
            return;
        }
        
        // Upload image to Cloudinary
        const imageData = await uploadImageToCloudinary(image, 'additional');
        
        // Collect inclusions
        const inclusions = [];
        const withInclusions = document.getElementById('with-inclusions').checked;
        
        if (withInclusions) {
            document.querySelectorAll('.inclusion-input').forEach(input => {
                if (input.value.trim()) {
                    inclusions.push(input.value.trim());
                }
            });
        }
        
        // Prepare additional data
        const additionalData = {
            name: document.getElementById('add-additional-name').value,
            price: parseFloat(document.getElementById('add-additional-price').value),
            inclusions: inclusions.length ? inclusions : null,
            code: document.getElementById('add-additional-code').value,
            imageUrl: imageData.url,
            imageId: imageData.public_id,
            createdAt: new Date()
        };
        
        // Add to Firebase
        await addDoc(collection(chandriaDB, "additionals"), additionalData);
        
        notyf.success('Additional item added successfully!');
        hideModal('addAdditionalModal');
        resetAdditionalForm();
        await loadAllData();
        applyFilters();
        
    } catch (error) {
        console.error('Error adding additional:', error);
        notyf.error('Failed to add additional item');
    } finally {
        hideLoader();
    }
}

/**
 * Upload image to Cloudinary
 */
async function uploadImageToCloudinary(file, type) {
    try {
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
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
    } catch (error) {
        console.error(`Error uploading ${type} image:`, error);
        throw error;
    }
}

/**
 * Show modal
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide modal
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * Show add product modal
 */
function showAddProductModal() {
    resetProductForm();
    showModal('addProductModal');
}

/**
 * Show add additional modal
 */
function showAddAdditionalModal() {
    resetAdditionalForm();
    showModal('addAdditionalModal');
}

/**
 * Reset product form
 */
function resetProductForm() {
    document.getElementById('addProductForm').reset();
    document.getElementById('size-quantities').innerHTML = '';
    document.querySelectorAll('input[name="product-size"]').forEach(cb => cb.checked = false);
    document.getElementById('add-product-code').value = '';
    
    // Reset image previews
    document.querySelectorAll('.image-preview').forEach(preview => {
        preview.style.display = 'none';
        preview.parentElement.querySelector('.upload-content').style.display = 'flex';
    });
}

/**
 * Reset additional form
 */
function resetAdditionalForm() {
    document.getElementById('addAdditionalForm').reset();
    document.getElementById('with-inclusions').checked = false;
    document.getElementById('inclusions-container').style.display = 'none';
    document.getElementById('add-additional-code').value = '';
    
    // Reset inclusions list
    const inclusionsList = document.getElementById('inclusions-list');
    inclusionsList.innerHTML = `
        <div class="inclusion-item">
            <input type="text" class="form-input inclusion-input" placeholder="Enter inclusion">
            <button type="button" class="remove-inclusion" onclick="removeInclusionField(this)">
                <i class="bx bx-x"></i>
            </button>
        </div>
    `;
    
    // Reset image preview
    const preview = document.getElementById('additional-preview');
    preview.style.display = 'none';
    preview.parentElement.querySelector('.upload-content').style.display = 'flex';
}

/**
 * View item details
 */
function viewItem(itemId, itemType) {
    const item = currentData.find(i => i.id === itemId && i.type === itemType);
    if (!item) return;
    
    const viewContent = document.getElementById('view-content');
    const modalTitle = document.getElementById('view-modal-title');
    
    modalTitle.textContent = `${item.type === 'product' ? 'Product' : 'Additional'} Details`;
    
    let contentHTML = '';
    
    if (item.type === 'product') {
        contentHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Product Name</span>
                    <span class="detail-value">${item.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Category</span>
                    <span class="detail-value">${item.category}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price</span>
                    <span class="detail-value">₱${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Product Code</span>
                    <span class="detail-value">${item.code}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Color</span>
                    <span class="detail-value">${item.color}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Sleeve Style</span>
                    <span class="detail-value">${item.sleeve}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Available Sizes</span>
                    <span class="detail-value">${Object.keys(item.sizes).join(', ')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Quantity</span>
                    <span class="detail-value">${item.quantity}</span>
                </div>
            </div>
            
            <div class="detail-item" style="margin-top: 20px;">
                <span class="detail-label">Size Breakdown</span>
                <div style="margin-top: 8px;">
                    ${Object.entries(item.sizes).map(([size, qty]) => 
                        `<span class="size-tag">${size}: ${qty}</span>`
                    ).join(' ')}
                </div>
            </div>
            
            <div class="image-gallery">
                <img src="${item.frontImageUrl}" alt="Front view" class="gallery-image">
                <img src="${item.backImageUrl}" alt="Back view" class="gallery-image">
            </div>
        `;
    } else {
        contentHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Additional Name</span>
                    <span class="detail-value">${item.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price</span>
                    <span class="detail-value">₱${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Additional Code</span>
                    <span class="detail-value">${item.code}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Inclusions</span>
                    <span class="detail-value">${item.inclusions.length > 0 ? item.inclusions.join(', ') : 'None'}</span>
                </div>
            </div>
            
            <div class="image-gallery">
                <img src="${item.imageUrl}" alt="${item.name}" class="gallery-image">
            </div>
        `;
    }
    
    viewContent.innerHTML = contentHTML;
    showModal('viewModal');
}

/**
 * Edit item
 */
function editItem(itemId, itemType) {
    const item = currentData.find(i => i.id === itemId && i.type === itemType);
    if (!item) return;
    
    const editContent = document.getElementById('edit-content');
    const modalTitle = document.getElementById('edit-modal-title');
    
    modalTitle.textContent = `Edit ${item.type === 'product' ? 'Product' : 'Additional'}`;
    
    if (item.type === 'product') {
        editContent.innerHTML = createEditProductForm(item);
        setupEditProductHandlers(item);
    } else {
        editContent.innerHTML = createEditAdditionalForm(item);
        setupEditAdditionalHandlers(item);
    }
    
    showModal('editModal');
}

/**
 * Create edit product form
 */
function createEditProductForm(item) {
    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const sizeCheckboxes = sizeOptions.map(size => {
        const checked = item.sizes && item.sizes[size] ? 'checked' : '';
        return `
            <label class="size-checkbox">
                <input type="checkbox" name="edit-product-size" value="${size}" ${checked}>
                <span>${size}</span>
            </label>
        `;
    }).join('');

    const sizeQuantities = Object.entries(item.sizes || {}).map(([size, qty]) => `
        <div class="quantity-group" data-size="${size}">
            <span class="quantity-label">${size}:</span>
            <input type="number" class="quantity-input" name="edit-quantity-${size}" 
                   min="0" value="${qty}" placeholder="Qty">
        </div>
    `).join('');

    return `
        <form id="editProductForm" class="modal-form">
            <!-- Image Upload Section -->
            <div class="form-group">
                <label class="form-label">Product Images</label>
                <div class="image-upload-container">
                    <div class="upload-box" id="edit-front-upload">
                        <input type="file" id="edit-front-image" accept="image/*" hidden>
                        <div class="upload-content" style="display: none;">
                            <i class="bx bx-cloud-upload upload-icon"></i>
                            <p>Front View</p>
                            <span>Click to upload</span>
                        </div>
                        <div class="image-preview" id="edit-front-preview" style="display: block;">
                            <img src="${item.frontImageUrl}" alt="Front view">
                            <button type="button" class="remove-image" onclick="removeEditImage('front')">&times;</button>
                        </div>
                    </div>
                    <div class="upload-box" id="edit-back-upload">
                        <input type="file" id="edit-back-image" accept="image/*" hidden>
                        <div class="upload-content" style="display: none;">
                            <i class="bx bx-cloud-upload upload-icon"></i>
                            <p>Back View</p>
                            <span>Click to upload</span>
                        </div>
                        <div class="image-preview" id="edit-back-preview" style="display: block;">
                            <img src="${item.backImageUrl}" alt="Back view">
                            <button type="button" class="remove-image" onclick="removeEditImage('back')">&times;</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Product Details -->
            <div class="form-group">
                <label class="form-label">Product Name</label>
                <input type="text" id="edit-product-name" class="form-input" value="${item.name}" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select id="edit-product-category" class="form-select" required>
                        <option value="">Select Category</option>
                        <option value="Ball Gown" ${item.category === 'Ball Gown' ? 'selected' : ''}>Ball Gown</option>
                        <option value="Wedding Gown" ${item.category === 'Wedding Gown' ? 'selected' : ''}>Wedding Gown</option>
                        <option value="Fairy Gown" ${item.category === 'Fairy Gown' ? 'selected' : ''}>Fairy Gown</option>
                        <option value="Long Gown" ${item.category === 'Long Gown' ? 'selected' : ''}>Long Gown</option>
                        <option value="Suits" ${item.category === 'Suits' ? 'selected' : ''}>Suits</option>
                        <option value="custom" ${!['Ball Gown', 'Wedding Gown', 'Fairy Gown', 'Long Gown', 'Suits'].includes(item.category) ? 'selected' : ''}>Custom</option>
                    </select>
                    <div class="custom-category" id="edit-custom-category-section" style="display: ${!['Ball Gown', 'Wedding Gown', 'Fairy Gown', 'Long Gown', 'Suits'].includes(item.category) ? 'block' : 'none'};">
                        <input type="text" id="edit-custom-category-input" class="form-input" value="${!['Ball Gown', 'Wedding Gown', 'Fairy Gown', 'Long Gown', 'Suits'].includes(item.category) ? item.category : ''}" placeholder="Enter custom category">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Price (₱)</label>
                    <input type="number" id="edit-product-price" class="form-input" value="${item.price}" min="0" step="0.01" required>
                </div>
            </div>

            <!-- Product Sizes & Quantities -->
            <div class="form-group">
                <label class="form-label">Product Sizes & Quantities</label>
                <div class="size-selection">
                    <div class="size-checkboxes">
                        ${sizeCheckboxes}
                    </div>
                    <div class="size-quantities" id="edit-size-quantities">
                        ${sizeQuantities}
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-input-container">
                        <input type="text" id="edit-product-color" class="form-input" value="${item.color}" placeholder="Enter or select color">
                        <input type="color" id="edit-color-picker" class="color-picker">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Sleeve Style</label>
                    <select id="edit-product-sleeve" class="form-select">
                        <option value="">Select Sleeve Style</option>
                        <option value="Long Sleeve" ${item.sleeve === 'Long Sleeve' ? 'selected' : ''}>Long Sleeve</option>
                        <option value="Short Sleeve" ${item.sleeve === 'Short Sleeve' ? 'selected' : ''}>Short Sleeve</option>
                        <option value="Off Shoulder" ${item.sleeve === 'Off Shoulder' ? 'selected' : ''}>Off Shoulder</option>
                        <option value="custom" ${!['Long Sleeve', 'Short Sleeve', 'Off Shoulder'].includes(item.sleeve) && item.sleeve !== 'N/A' ? 'selected' : ''}>Custom</option>
                    </select>
                    <div class="custom-sleeve" id="edit-custom-sleeve-section" style="display: ${!['Long Sleeve', 'Short Sleeve', 'Off Shoulder'].includes(item.sleeve) && item.sleeve !== 'N/A' ? 'block' : 'none'};">
                        <input type="text" id="edit-custom-sleeve-input" class="form-input" value="${!['Long Sleeve', 'Short Sleeve', 'Off Shoulder'].includes(item.sleeve) && item.sleeve !== 'N/A' ? item.sleeve : ''}" placeholder="Enter custom sleeve style">
                    </div>
                </div>
            </div>

            <!-- Product Code (Auto-generated) -->
            <div class="form-group">
                <label class="form-label">Product Code</label>
                <input type="text" id="edit-product-code" class="form-input" value="${item.code}" readonly>
            </div>

            <!-- Modal Actions -->
            <div class="modal-actions">
                <button type="button" class="btn-secondary" id="cancel-edit-product">Cancel</button>
                <button type="submit" class="btn-primary" id="confirm-edit-product">Save Changes</button>
            </div>
        </form>
    `;
}

/**
 * Create edit additional form
 */
function createEditAdditionalForm(item) {
    const inclusionsHTML = item.inclusions.length > 0 ? item.inclusions.map(inclusion => `
        <div class="inclusion-item">
            <input type="text" class="form-input inclusion-input" value="${inclusion}" placeholder="Enter inclusion">
            <button type="button" class="remove-inclusion" onclick="removeInclusionField(this)">
                <i class="bx bx-x"></i>
            </button>
        </div>
    `).join('') : `
        <div class="inclusion-item">
            <input type="text" class="form-input inclusion-input" placeholder="Enter inclusion">
            <button type="button" class="remove-inclusion" onclick="removeInclusionField(this)">
                <i class="bx bx-x"></i>
            </button>
        </div>
    `;

    return `
        <form id="editAdditionalForm" class="modal-form">
            <!-- Image Upload Section -->
            <div class="form-group">
                <label class="form-label">Additional Image</label>
                <div class="image-upload-container single">
                    <div class="upload-box" id="edit-additional-upload">
                        <input type="file" id="edit-additional-image" accept="image/*" hidden>
                        <div class="upload-content" style="display: none;">
                            <i class="bx bx-cloud-upload upload-icon"></i>
                            <p>Upload Image</p>
                            <span>Click to upload</span>
                        </div>
                        <div class="image-preview" id="edit-additional-preview" style="display: block;">
                            <img src="${item.imageUrl}" alt="Additional item">
                            <button type="button" class="remove-image" onclick="removeEditImage('additional')">&times;</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Additional Name</label>
                    <input type="text" id="edit-additional-name" class="form-input" value="${item.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Price (₱)</label>
                    <input type="number" id="edit-additional-price" class="form-input" value="${item.price}" min="0" step="0.01" required>
                </div>
            </div>

            <!-- Inclusions Section -->
            <div class="form-group">
                <div class="inclusions-header">
                    <label class="form-label">Inclusions</label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="edit-with-inclusions" ${item.inclusions.length > 0 ? 'checked' : ''}>
                        <span>With Inclusions</span>
                    </label>
                </div>
                <div class="inclusions-container" id="edit-inclusions-container" style="display: ${item.inclusions.length > 0 ? 'block' : 'none'};">
                    <div class="inclusions-list" id="edit-inclusions-list">
                        ${inclusionsHTML}
                    </div>
                    <button type="button" class="btn-add-inclusion" id="edit-add-inclusion">
                        <i class="bx bx-plus"></i>
                        Add Inclusion
                    </button>
                </div>
            </div>

            <!-- Additional Code (Auto-generated) -->
            <div class="form-group">
                <label class="form-label">Additional Code</label>
                <input type="text" id="edit-additional-code" class="form-input" value="${item.code}" readonly>
            </div>

            <!-- Modal Actions -->
            <div class="modal-actions">
                <button type="button" class="btn-secondary" id="cancel-edit-additional">Cancel</button>
                <button type="submit" class="btn-primary" id="confirm-edit-additional">Save Changes</button>
            </div>
        </form>
    `;
}

/**
 * Setup edit product handlers
 */
function setupEditProductHandlers(item) {
    // Image upload handlers
    const frontUpload = document.getElementById('edit-front-upload');
    const backUpload = document.getElementById('edit-back-upload');
    const frontInput = document.getElementById('edit-front-image');
    const backInput = document.getElementById('edit-back-image');

    frontUpload?.addEventListener('click', () => frontInput.click());
    backUpload?.addEventListener('click', () => backInput.click());

    frontInput?.addEventListener('change', (e) => handleEditImagePreview(e, 'edit-front-preview'));
    backInput?.addEventListener('change', (e) => handleEditImagePreview(e, 'edit-back-preview'));

    // Size checkbox handling
    const sizeCheckboxes = document.querySelectorAll('input[name="edit-product-size"]');
    const sizeQuantities = document.getElementById('edit-size-quantities');

    sizeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const size = e.target.value;
            if (e.target.checked) {
                addEditSizeQuantityInput(size);
            } else {
                removeEditSizeQuantityInput(size);
            }
        });
    });

    // Custom category and sleeve handlers
    const categorySelect = document.getElementById('edit-product-category');
    const sleeveSelect = document.getElementById('edit-product-sleeve');
    
    categorySelect?.addEventListener('change', (e) => {
        const customSection = document.getElementById('edit-custom-category-section');
        if (customSection) {
            customSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
    });

    sleeveSelect?.addEventListener('change', (e) => {
        const customSection = document.getElementById('edit-custom-sleeve-section');
        if (customSection) {
            customSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
    });

    // Form submission
    const editForm = document.getElementById('editProductForm');
    editForm?.addEventListener('submit', (e) => handleEditProduct(e, item));

    // Cancel button
    const cancelBtn = document.getElementById('cancel-edit-product');
    cancelBtn?.addEventListener('click', () => hideModal('editModal'));
}

/**
 * Setup edit additional handlers
 */
function setupEditAdditionalHandlers(item) {
    // Image upload handler
    const additionalUpload = document.getElementById('edit-additional-upload');
    const additionalInput = document.getElementById('edit-additional-image');

    additionalUpload?.addEventListener('click', () => additionalInput.click());
    additionalInput?.addEventListener('change', (e) => handleEditImagePreview(e, 'edit-additional-preview'));

    // Inclusions handler
    const withInclusionsCheckbox = document.getElementById('edit-with-inclusions');
    const inclusionsContainer = document.getElementById('edit-inclusions-container');
    const addInclusionBtn = document.getElementById('edit-add-inclusion');

    withInclusionsCheckbox?.addEventListener('change', (e) => {
        inclusionsContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    addInclusionBtn?.addEventListener('click', () => {
        const inclusionsList = document.getElementById('edit-inclusions-list');
        const inclusionItem = document.createElement('div');
        inclusionItem.className = 'inclusion-item';
        
        inclusionItem.innerHTML = `
            <input type="text" class="form-input inclusion-input" placeholder="Enter inclusion">
            <button type="button" class="remove-inclusion" onclick="removeInclusionField(this)">
                <i class="bx bx-x"></i>
            </button>
        `;
        
        inclusionsList.appendChild(inclusionItem);
    });

    // Form submission
    const editForm = document.getElementById('editAdditionalForm');
    editForm?.addEventListener('submit', (e) => handleEditAdditional(e, item));

    // Cancel button
    const cancelBtn = document.getElementById('cancel-edit-additional');
    cancelBtn?.addEventListener('click', () => hideModal('editModal'));
}

/**
 * Handle edit image preview
 */
function handleEditImagePreview(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            const uploadContent = preview.parentElement.querySelector('.upload-content');
            const img = preview.querySelector('img');
            
            img.src = e.target.result;
            uploadContent.style.display = 'none';
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Add size quantity input for edit form
 */
function addEditSizeQuantityInput(size) {
    const sizeQuantities = document.getElementById('edit-size-quantities');
    const quantityGroup = document.createElement('div');
    quantityGroup.className = 'quantity-group';
    quantityGroup.dataset.size = size;
    
    quantityGroup.innerHTML = `
        <span class="quantity-label">${size}:</span>
        <input type="number" class="quantity-input" name="edit-quantity-${size}" 
               min="0" value="1" placeholder="Qty">
    `;
    
    sizeQuantities.appendChild(quantityGroup);
}

/**
 * Remove size quantity input for edit form
 */
function removeEditSizeQuantityInput(size) {
    const quantityGroup = document.querySelector(`#edit-size-quantities [data-size="${size}"]`);
    if (quantityGroup) {
        quantityGroup.remove();
    }
}

/**
 * Remove edit image
 */
function removeEditImage(type) {
    const previewId = `edit-${type}-preview`;
    const preview = document.getElementById(previewId);
    const uploadContent = preview.parentElement.querySelector('.upload-content');
    
    preview.style.display = 'none';
    uploadContent.style.display = 'flex';
    
    // Clear the file input
    const inputId = `edit-${type}-image`;
    const input = document.getElementById(inputId);
    if (input) input.value = '';
}

/**
 * Handle edit product form submission
 */
async function handleEditProduct(event, originalItem) {
    event.preventDefault();
    
    try {
        showLoader();
        
        // Validate required fields
        const productName = document.getElementById('edit-product-name').value.trim();
        const category = document.getElementById('edit-product-category').value;
        const price = document.getElementById('edit-product-price').value;
        const color = document.getElementById('edit-product-color').value.trim();
        
        if (!productName || !category || !price || price <= 0 || !color) {
            notyf.error('Please fill in all required fields');
            return;
        }
        
        // Collect size quantities
        const sizes = {};
        let hasValidQuantity = false;
        
        document.querySelectorAll('#edit-size-quantities .quantity-group').forEach(group => {
            const size = group.dataset.size;
            const quantity = parseInt(group.querySelector('.quantity-input').value) || 0;
            if (quantity > 0) {
                sizes[size] = quantity;
                hasValidQuantity = true;
            }
        });
        
        if (!hasValidQuantity) {
            notyf.error('Please enter valid quantities for selected sizes');
            return;
        }
        
        // Prepare update data
        const categoryValue = document.getElementById('edit-product-category').value;
        const customCategory = document.getElementById('edit-custom-category-input')?.value;
        const finalCategory = categoryValue === 'custom' ? customCategory : categoryValue;

        const sleeveValue = document.getElementById('edit-product-sleeve').value;
        const customSleeve = document.getElementById('edit-custom-sleeve-input')?.value;
        const finalSleeve = sleeveValue === 'custom' ? customSleeve : sleeveValue;

        const updateData = {
            name: productName,
            category: finalCategory,
            price: parseFloat(price),
            size: sizes,
            color: color,
            sleeve: finalSleeve || 'N/A',
            updatedAt: new Date()
        };
        
        // Handle image uploads if new images were selected
        const frontImageInput = document.getElementById('edit-front-image');
        const backImageInput = document.getElementById('edit-back-image');
        
        if (frontImageInput.files[0]) {
            const frontImageData = await uploadImageToCloudinary(frontImageInput.files[0], 'front');
            updateData.frontImageUrl = frontImageData.url;
            updateData.frontImageId = frontImageData.public_id;
        }
        
        if (backImageInput.files[0]) {
            const backImageData = await uploadImageToCloudinary(backImageInput.files[0], 'back');
            updateData.backImageUrl = backImageData.url;
            updateData.backImageId = backImageData.public_id;
        }
        
        // Update in Firebase
        await updateDoc(doc(chandriaDB, "products", originalItem.id), updateData);
        
        notyf.success('Product updated successfully!');
        hideModal('editModal');
        await loadAllData();
        applyFilters();
        
    } catch (error) {
        console.error('Error updating product:', error);
        notyf.error('Failed to update product: ' + error.message);
    } finally {
        hideLoader();
    }
}

/**
 * Handle edit additional form submission
 */
async function handleEditAdditional(event, originalItem) {
    event.preventDefault();
    
    try {
        showLoader();
        
        // Validate required fields
        const name = document.getElementById('edit-additional-name').value.trim();
        const price = document.getElementById('edit-additional-price').value;
        
        if (!name || !price || price <= 0) {
            notyf.error('Please fill in all required fields');
            return;
        }
        
        // Collect inclusions
        const inclusions = [];
        const withInclusions = document.getElementById('edit-with-inclusions').checked;
        
        if (withInclusions) {
            document.querySelectorAll('#edit-inclusions-list .inclusion-input').forEach(input => {
                if (input.value.trim()) {
                    inclusions.push(input.value.trim());
                }
            });
        }
        
        // Prepare update data
        const updateData = {
            name: name,
            price: parseFloat(price),
            inclusions: inclusions.length ? inclusions : [],
            updatedAt: new Date()
        };
        
        // Handle image upload if new image was selected
        const imageInput = document.getElementById('edit-additional-image');
        if (imageInput.files[0]) {
            const imageData = await uploadImageToCloudinary(imageInput.files[0], 'additional');
            updateData.imageUrl = imageData.url;
            updateData.imageId = imageData.public_id;
        }
        
        // Update in Firebase
        await updateDoc(doc(chandriaDB, "additionals", originalItem.id), updateData);
        
        notyf.success('Additional item updated successfully!');
        hideModal('editModal');
        await loadAllData();
        applyFilters();
        
    } catch (error) {
        console.error('Error updating additional:', error);
        notyf.error('Failed to update additional item: ' + error.message);
    } finally {
        hideLoader();
    }
}

/**
 * Delete item
 */
function deleteItem(itemId, itemType) {
    showConfirmDialog(
        `Are you sure you want to delete this ${itemType}?`,
        async () => {
            try {
                showLoader();
                
                const collectionName = itemType === 'product' ? 'products' : 'additionals';
                await deleteDoc(doc(chandriaDB, collectionName, itemId));
                
                notyf.success(`${itemType} deleted successfully!`);
                await loadAllData();
                applyFilters();
                
            } catch (error) {
                console.error('Error deleting item:', error);
                notyf.error(`Failed to delete ${itemType}`);
            } finally {
                hideLoader();
            }
        }
    );
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(message, onConfirm) {
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    
    confirmMessage.textContent = message;
    
    // Remove existing listeners
    const newConfirmOk = confirmOk.cloneNode(true);
    const newConfirmCancel = confirmCancel.cloneNode(true);
    confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
    confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);
    
    // Add new listeners
    newConfirmOk.addEventListener('click', () => {
        hideModal('confirmModal');
        onConfirm();
    });
    
    newConfirmCancel.addEventListener('click', () => {
        hideModal('confirmModal');
    });
    
    showModal('confirmModal');
}

/**
 * Show loader
 */
function showLoader() {
    const containerSpinner = document.getElementById('spinner');
    if (containerSpinner) {
        containerSpinner.classList.remove('d-none');
    }
    
    const inventoryLoader = document.getElementById('inventory-loader');
    if (inventoryLoader) {
        inventoryLoader.classList.remove('hidden');
    }
}

/**
 * Hide loader
 */
function hideLoader() {
    const containerSpinner = document.getElementById('spinner');
    if (containerSpinner) {
        containerSpinner.classList.add('d-none');
    }
    
    const inventoryLoader = document.getElementById('inventory-loader');
    if (inventoryLoader) {
        inventoryLoader.classList.add('hidden');
    }
}

// Make functions globally available
window.viewItem = viewItem;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.removeInclusionField = removeInclusionField;
window.removeEditImage = removeEditImage;
