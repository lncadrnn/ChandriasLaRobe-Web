// Inventory Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadInventoryStats();
    loadInventoryItems();
    initializeEventListeners();
});

// Sample inventory data
let inventoryData = [
    {
        id: 1,
        name: "Classic White Wedding Gown",
        category: "wedding-gown",
        size: "M",
        color: "White",
        price: 15000,
        status: "available",
        description: "Elegant A-line wedding gown with lace details and cathedral train.",
        image: null,
        dateAdded: "2024-01-15"
    },
    {
        id: 2,
        name: "Navy Blue Evening Dress",
        category: "long-gown",
        size: "S",
        color: "Navy Blue",
        price: 8000,
        status: "rented",
        description: "Sophisticated floor-length evening gown perfect for formal events.",
        image: null,
        dateAdded: "2024-01-20"
    },
    {
        id: 3,
        name: "Black Tuxedo",
        category: "suits",
        size: "L",
        color: "Black",
        price: 5000,
        status: "available",
        description: "Classic black tuxedo with satin lapels and bow tie.",
        image: null,
        dateAdded: "2024-01-25"
    },
    {
        id: 4,
        name: "Pearl Necklace Set",
        category: "accessories",
        size: "One Size",
        color: "White",
        price: 2000,
        status: "maintenance",
        description: "Elegant pearl necklace and earrings set.",
        image: null,
        dateAdded: "2024-02-01"
    },
    {
        id: 5,
        name: "Red Cocktail Dress",
        category: "long-gown",
        size: "M",
        color: "Red",
        price: 6500,
        status: "available",
        description: "Stunning red cocktail dress with sequin details.",
        image: null,
        dateAdded: "2024-02-05"
    }
];

let filteredData = [...inventoryData];
let currentView = 'grid';

function loadInventoryStats() {
    const stats = {
        totalItems: inventoryData.length,
        availableItems: inventoryData.filter(item => item.status === 'available').length,
        rentedItems: inventoryData.filter(item => item.status === 'rented').length,
        maintenanceItems: inventoryData.filter(item => item.status === 'maintenance').length
    };
    
    document.getElementById('totalItems').textContent = stats.totalItems;
    document.getElementById('availableItems').textContent = stats.availableItems;
    document.getElementById('rentedItems').textContent = stats.rentedItems;
    document.getElementById('maintenanceItems').textContent = stats.maintenanceItems;
}

function loadInventoryItems() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredData.length === 0) {
        inventoryGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    inventoryGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    inventoryGrid.innerHTML = filteredData.map(item => `
        <div class="inventory-item" onclick="viewItemDetails(${item.id})">
            <div class="item-image">
                ${item.image ? 
                    `<img src="${item.image}" alt="${item.name}">` : 
                    `<i class='bx bxs-t-shirt'></i>`
                }
                <span class="item-status-badge ${item.status}">${item.status}</span>
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-details">
                    <div class="item-detail">
                        <span class="label">Category:</span>
                        <span class="value">${formatCategory(item.category)}</span>
                    </div>
                    <div class="item-detail">
                        <span class="label">Size:</span>
                        <span class="value">${item.size}</span>
                    </div>
                    <div class="item-detail">
                        <span class="label">Color:</span>
                        <span class="value">${item.color}</span>
                    </div>
                </div>
                <div class="item-price">₱${item.price.toLocaleString()}</div>
                <div class="item-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); editItem(${item.id})">
                        <i class='bx bx-edit'></i> Edit
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); deleteItem(${item.id})">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatCategory(category) {
    const categoryMap = {
        'wedding-gown': 'Wedding Gown',
        'long-gown': 'Long Gown',
        'suits': 'Suits',
        'accessories': 'Accessories'
    };
    return categoryMap[category] || category;
}

function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Filter functionality
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    categoryFilter.addEventListener('change', handleFilter);
    statusFilter.addEventListener('change', handleFilter);
    
    // View toggle
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    gridViewBtn.addEventListener('click', () => toggleView('grid'));
    listViewBtn.addEventListener('click', () => toggleView('list'));
    
    // Add item modal
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemModal = document.getElementById('addItemModal');
    const closeAddModal = document.getElementById('closeAddModal');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const saveItemBtn = document.getElementById('saveItemBtn');
    
    addItemBtn.addEventListener('click', openAddItemModal);
    closeAddModal.addEventListener('click', closeAddItemModal);
    cancelAddBtn.addEventListener('click', closeAddItemModal);
    saveItemBtn.addEventListener('click', saveNewItem);
    
    // Item details modal
    const itemDetailsModal = document.getElementById('itemDetailsModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    closeDetailsModal.addEventListener('click', closeItemDetailsModal);
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeAllModals();
            }
        });
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters();
}

function handleFilter() {
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredData = inventoryData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                            item.color.toLowerCase().includes(searchTerm) ||
                            item.description.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesStatus = !statusFilter || item.status === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    loadInventoryItems();
}

function toggleView(view) {
    currentView = view;
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const inventoryGrid = document.getElementById('inventoryGrid');
    
    if (view === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        inventoryGrid.className = 'inventory-grid';
    } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        inventoryGrid.className = 'inventory-list';
    }
    
    loadInventoryItems();
}

function openAddItemModal() {
    const modal = document.getElementById('addItemModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddItemModal() {
    const modal = document.getElementById('addItemModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('addItemForm').reset();
}

function closeItemDetailsModal() {
    const modal = document.getElementById('itemDetailsModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

function saveNewItem() {
    const form = document.getElementById('addItemForm');
    const formData = new FormData(form);
    
    // Basic validation
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const size = document.getElementById('itemSize').value;
    const color = document.getElementById('itemColor').value.trim();
    const price = parseFloat(document.getElementById('rentalPrice').value);
    const status = document.getElementById('itemStatus').value;
    const description = document.getElementById('itemDescription').value.trim();
    
    if (!name || !category || !size || !color || !price || !status) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Create new item
    const newItem = {
        id: Date.now(), // Simple ID generation
        name,
        category,
        size,
        color,
        price,
        status,
        description,
        image: null, // Handle image upload separately if needed
        dateAdded: new Date().toISOString().split('T')[0]
    };
    
    // Add to inventory
    inventoryData.push(newItem);
    filteredData = [...inventoryData];
    
    // Refresh displays
    loadInventoryStats();
    loadInventoryItems();
    
    // Close modal
    closeAddItemModal();
    
    // Show success message
    showToast('Item added successfully!', 'success');
}

function viewItemDetails(itemId) {
    const item = inventoryData.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.getElementById('itemDetailsModal');
    const content = document.getElementById('itemDetailsContent');
    
    content.innerHTML = `
        <div class="item-details-content">
            <div class="item-image-large">
                ${item.image ? 
                    `<img src="${item.image}" alt="${item.name}">` : 
                    `<i class='bx bxs-t-shirt'></i>`
                }
            </div>
            <div class="item-info">
                <h3>${item.name}</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Category:</strong> ${formatCategory(item.category)}
                    </div>
                    <div class="detail-item">
                        <strong>Size:</strong> ${item.size}
                    </div>
                    <div class="detail-item">
                        <strong>Color:</strong> ${item.color}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> 
                        <span class="status-badge ${item.status}">${item.status}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Rental Price:</strong> ₱${item.price.toLocaleString()}
                    </div>
                    <div class="detail-item">
                        <strong>Date Added:</strong> ${formatDate(item.dateAdded)}
                    </div>
                </div>
                <div class="description-section">
                    <strong>Description:</strong>
                    <p>${item.description || 'No description available.'}</p>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Set up action buttons
    const editBtn = document.getElementById('editItemBtn');
    const deleteBtn = document.getElementById('deleteItemBtn');
    
    editBtn.onclick = () => editItem(itemId);
    deleteBtn.onclick = () => deleteItem(itemId);
}

function editItem(itemId) {
    // For now, just show an alert. You can implement a full edit modal later
    alert(`Edit functionality for item ${itemId} would be implemented here.`);
    closeAllModals();
}

function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        inventoryData = inventoryData.filter(item => item.id !== itemId);
        filteredData = [...inventoryData];
        
        loadInventoryStats();
        loadInventoryItems();
        closeAllModals();
        
        showToast('Item deleted successfully!', 'success');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add some CSS for item details modal content
const additionalStyles = `
<style>
.item-details-content {
    display: flex;
    gap: 20px;
    flex-direction: column;
}

.item-image-large {
    width: 100%;
    height: 200px;
    background: var(--light-gray);
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    color: var(--text-light);
}

.item-image-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--border-radius);
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 15px 0;
}

.detail-item {
    font-size: 14px;
}

.description-section {
    margin-top: 20px;
}

.description-section p {
    margin-top: 8px;
    color: var(--text-light);
    line-height: 1.5;
}

.status-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
}

.status-badge.available {
    background: #d4edda;
    color: #155724;
}

.status-badge.rented {
    background: #fff3cd;
    color: #856404;
}

.status-badge.maintenance {
    background: #f8d7da;
    color: #721c24;
}

@media (max-width: 768px) {
    .detail-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }
}
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
