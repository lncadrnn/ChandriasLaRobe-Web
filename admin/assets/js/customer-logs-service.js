// Import Firebase configuration
import { chandriaDB, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from './sdk/chandrias-sdk.js';

// Initialize Firebase
let allTransactions = [];
let filteredTransactions = [];
let currentEditingTransaction = null;
let currentDeletingTransaction = null;

// DOM elements
const tableBody = document.getElementById('rental-history-tbody');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const sortBtn = document.getElementById('sort-btn');
const sortOptions = document.getElementById('sort-options');

// Sort state
let currentSort = 'recent'; // Default sort by recent

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar functionality
    const body = document.querySelector("body");
    const sidebar = body.querySelector(".sidebar");
    const toggle = body.querySelector(".toggle");

    // Restore sidebar state from localStorage
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle (chevron)
    toggle.addEventListener("click", () => {
        const isClosed = sidebar.classList.toggle("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Load transactions on page load
    loadTransactions();
    
    // Add event listeners
    searchInput?.addEventListener('input', handleSearch);
    refreshBtn?.addEventListener('click', loadTransactions);
    
    // Sort functionality
    sortBtn?.addEventListener('click', toggleSortOptions);
    
    // Sort option event listeners
    const sortOptionElements = document.querySelectorAll('.sort-option');
    sortOptionElements.forEach(option => {
        option.addEventListener('click', (e) => {
            const sortType = e.currentTarget.getAttribute('data-sort');
            handleSort(sortType);
            closeSortOptions();
        });
    });
    
    // Edit form event listener
    const editForm = document.getElementById('edit-transaction-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Delete confirmation input event listener
    const deleteConfirmInput = document.getElementById('delete-confirmation-input');
    if (deleteConfirmInput) {
        deleteConfirmInput.addEventListener('input', handleDeleteConfirmation);
    }
    
    // Modal click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            if (e.target.id === 'edit-modal') {
                closeEditModal();
            } else if (e.target.id === 'delete-modal') {
                closeDeleteModal();
            }
        }
        
        // Close sort dropdown when clicking outside
        if (!e.target.closest('.sort-dropdown')) {
            closeSortOptions();
        }
    });
    
    // Add CSS for animations
    if (!document.getElementById('modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
});

// Load transactions from Firebase
async function loadTransactions() {
    try {
        showLoading();
        
        const transactionRef = collection(chandriaDB, 'transaction');
        const snapshot = await getDocs(transactionRef);
        
        allTransactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allTransactions.push({
                id: doc.id,
                ...data
            });
        });
        
        filteredTransactions = [...allTransactions];
        applySorting(); // Apply current sort
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transaction history. Please try again.');
    }
}

// Fetch product details from Firebase
async function fetchProductDetails(productId) {
    try {
        if (!productId) return null;
        const productDoc = await getDoc(doc(chandriaDB, 'products', productId));
        if (productDoc.exists()) {
            return productDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null;
    }
}

// Fetch accessory details from Firebase
async function fetchAccessoryDetails(accessoryId) {
    try {
        if (!accessoryId) return null;
        const accessoryDoc = await getDoc(doc(chandriaDB, 'additionals', accessoryId));
        if (accessoryDoc.exists()) {
            return accessoryDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching accessory details:', error);
        return null;
    }
}

// Format products for display with images
async function formatProducts(products) {
    if (!products || !Array.isArray(products) || products.length === 0) {
        return '<span class="no-items">No products</span>';
    }
    
    const productPromises = products.map(async (product) => {
        const productDetails = await fetchProductDetails(product.id);
        
        if (!product.sizes || Object.keys(product.sizes).length === 0) {
            return `
                <div class="product-item">
                    ${productDetails?.frontImageUrl ? 
                        `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="product-image">` : ''
                    }
                    <div class="item-details">
                        <div class="item-name">${product.name || 'Unknown'}</div>
                        <div class="item-code">${product.code || 'N/A'}</div>
                    </div>
                </div>
            `;
        }
        
        const sizeDetails = Object.entries(product.sizes)
            .map(([size, qty]) => `${size} x${qty}`)
            .join(', ');
        
        return `
            <div class="product-item">
                ${productDetails?.frontImageUrl ? 
                    `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="product-image">` : ''
                }
                <div class="item-details">
                    <div class="item-name">${product.name || 'Unknown'}</div>
                    <div class="item-code">${product.code || 'N/A'}</div>
                    <div class="item-sizes">${sizeDetails}</div>
                </div>
            </div>
        `;
    });
    
    const results = await Promise.all(productPromises);
    return results.join('');
}

// Format accessories for display with images
async function formatAccessories(accessories) {
    if (!accessories || !Array.isArray(accessories) || accessories.length === 0) {
        return '<span class="no-items">No additional items</span>';
    }
    
    const accessoryPromises = accessories.map(async (accessory) => {
        const accessoryDetails = await fetchAccessoryDetails(accessory.id);
        
        let itemText = `
            <div class="item-details">
                <div class="item-name">${accessory.name || 'Unknown'}</div>
                <div class="item-code">${accessory.code || 'N/A'}</div>
        `;
        
        if (accessory.quantity && accessory.quantity > 1) {
            itemText += `<div class="item-sizes">Quantity: ${accessory.quantity}</div>`;
        }
        
        if (accessory.types && Array.isArray(accessory.types) && accessory.types.length > 0) {
            const types = accessory.types.join(', ');
            itemText += `<div class="item-sizes">Types: ${types}</div>`;
        }
        
        itemText += '</div>';
        
        return `
            <div class="accessory-item">
                ${accessoryDetails?.imageUrl ? 
                    `<img src="${accessoryDetails.imageUrl}" alt="${accessory.name}" class="accessory-image">` : ''
                }
                ${itemText}
            </div>
        `;
    });
    
    const results = await Promise.all(accessoryPromises);
    return results.join('');
}

// Render transaction table
async function renderTransactionTable() {
    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    <i class='bx bx-file'></i> No transactions found
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = [];
    
    for (const transaction of filteredTransactions) {
        // Calculate rental status based on dates
        const currentDate = new Date();
        const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
        const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
        
        let rentalStatus = 'Upcoming';
        let statusClass = 'status-upcoming';
        
        if (eventStartDate) {
            if (eventEndDate) {
                // Open rental with end date
                if (currentDate < eventStartDate) {
                    rentalStatus = 'Upcoming';
                    statusClass = 'status-upcoming';
                } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                    rentalStatus = 'Ongoing';
                    statusClass = 'status-ongoing';
                } else if (currentDate > eventEndDate) {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
            } else {
                // Fixed rental (single day)
                if (currentDate < eventStartDate) {
                    rentalStatus = 'Upcoming';
                    statusClass = 'status-upcoming';
                } else if (currentDate.toDateString() === eventStartDate.toDateString()) {
                    rentalStatus = 'Ongoing';
                    statusClass = 'status-ongoing';
                } else if (currentDate > eventStartDate) {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
            }
        }

        // Calculate payment status
        const totalPayment = parseFloat(transaction.totalPayment) || 0;
        const remainingBalance = parseFloat(transaction.remainingBalance) || 0;
        const paymentStatus = remainingBalance > 0 ? 
            `Balance: ₱${remainingBalance.toLocaleString()}` : 
            'Fully Paid';
        const paymentClass = remainingBalance > 0 ? 'payment-balance' : 'payment-fully-paid';

        // Format event date
        let eventDateDisplay = 'N/A';
        if (eventStartDate) {
            if (eventEndDate && transaction.rentalType === 'Open Rental') {
                eventDateDisplay = `${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}`;
            } else {
                eventDateDisplay = eventStartDate.toLocaleDateString();
            }
        }

        // Format products and accessories with images
        const formattedProducts = await formatProducts(transaction.products);
        const formattedAccessories = await formatAccessories(transaction.accessories);

        const row = `
            <tr data-transaction-id="${transaction.id}">
                <td><strong>${transaction.fullName || 'Unknown'}</strong></td>
                <td><code>${transaction.transactionCode || transaction.id.substring(0, 8)}</code></td>
                <td><div class="products-cell">${formattedProducts}</div></td>
                <td><div class="accessories-cell">${formattedAccessories}</div></td>
                <td>${eventDateDisplay}</td>
                <td><span class="payment-status ${paymentClass}">${paymentStatus}</span></td>
                <td><span class="status-badge ${statusClass}">${rentalStatus}</span></td>
                <td><strong>₱${totalPayment.toLocaleString()}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="view-details-btn" data-id="${transaction.id}" title="View Details">
                            <i class='bx bx-show'></i> View
                        </button>
                        <button class="edit-btn" data-id="${transaction.id}" title="Edit Transaction">
                            <i class='bx bx-edit'></i> Edit
                        </button>
                        <button class="delete-btn" data-id="${transaction.id}" title="Delete Transaction">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        tableRows.push(row);
    }

    tableBody.innerHTML = tableRows.join('');

    // Add click event listeners for view details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.view-details-btn').dataset.id;
            showTransactionDetails(transactionId);
        });
    });

    // Add click event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.edit-btn').dataset.id;
            editTransaction(transactionId);
        });
    });

    // Add click event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.delete-btn').dataset.id;
            deleteTransaction(transactionId);
        });
    });
}

// Show transaction details modal with complete information
async function showTransactionDetails(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Create detailed view of products with images
    let productsHtml = '<p class="no-items">No products</p>';
    if (transaction.products && transaction.products.length > 0) {
        const productDetailsPromises = transaction.products.map(async (product) => {
            const productDetails = await fetchProductDetails(product.id);
            const sizesHtml = product.sizes ? 
                Object.entries(product.sizes)
                    .map(([size, qty]) => `<li>${size}: ${qty} pcs</li>`)
                    .join('') : '';
            
            return `
                <div class="detail-product">
                    ${productDetails?.frontImageUrl ? 
                        `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="modal-product-image">` : ''
                    }
                    <h4>${product.name || 'Unknown Product'}</h4>
                    <p><strong>Code:</strong> ${product.code || 'N/A'}</p>
                    <p><strong>Price:</strong> ₱${product.price?.toLocaleString() || 'N/A'}</p>
                    <p><strong>Category:</strong> ${productDetails?.category || 'N/A'}</p>
                    <p><strong>Color:</strong> ${productDetails?.color || 'N/A'}</p>
                    <p><strong>Sleeve:</strong> ${productDetails?.sleeve || 'N/A'}</p>
                    ${sizesHtml ? `<p><strong>Sizes:</strong></p><ul>${sizesHtml}</ul>` : ''}
                    ${productDetails?.description ? `<p><strong>Description:</strong> ${productDetails.description}</p>` : ''}
                </div>
            `;
        });
        
        const productResults = await Promise.all(productDetailsPromises);
        productsHtml = productResults.join('');
    }
    
    // Create detailed view of accessories with images
    let accessoriesHtml = '<p class="no-items">No additional items</p>';
    if (transaction.accessories && transaction.accessories.length > 0) {
        const accessoryDetailsPromises = transaction.accessories.map(async (accessory) => {
            const accessoryDetails = await fetchAccessoryDetails(accessory.id);
            const typesHtml = accessory.types?.length > 0 ? 
                `<p><strong>Types:</strong> ${accessory.types.join(', ')}</p>` : '';
            const inclusionsHtml = accessoryDetails?.inclusions?.length > 0 ?
                `<p><strong>Inclusions:</strong> ${accessoryDetails.inclusions.join(', ')}</p>` : '';
            
            return `
                <div class="detail-accessory">
                    ${accessoryDetails?.imageUrl ? 
                        `<img src="${accessoryDetails.imageUrl}" alt="${accessory.name}" class="modal-accessory-image">` : ''
                    }
                    <h4>${accessory.name || 'Unknown Accessory'}</h4>
                    <p><strong>Code:</strong> ${accessory.code || 'N/A'}</p>
                    <p><strong>Price:</strong> ₱${accessory.price?.toLocaleString() || 'N/A'}</p>
                    ${accessory.quantity ? `<p><strong>Quantity:</strong> ${accessory.quantity}</p>` : ''}
                    ${typesHtml}
                    ${inclusionsHtml}
                </div>
            `;
        });
        
        const accessoryResults = await Promise.all(accessoryDetailsPromises);
        accessoriesHtml = accessoryResults.join('');
    }
    
    // Format dates
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate).toLocaleDateString() : 'N/A';
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate).toLocaleDateString() : null;
    const transactionDate = transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'N/A';
    const lastUpdated = transaction.lastUpdated ? new Date(transaction.lastUpdated).toLocaleDateString() : null;
    
    const modalContent = `
        <div class="transaction-modal-overlay" onclick="closeTransactionModal()">
            <div class="transaction-modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class='bx bx-receipt'></i> Transaction Details</h2>
                    <button class="close-btn" onclick="closeTransactionModal()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="customer-payment-section">
                        <div class="customer-info">
                            <h3><i class='bx bx-user'></i> Customer Information</h3>
                            <div class="info-grid">
                                <p><strong>Name:</strong> ${transaction.fullName || 'N/A'}</p>
                                <p><strong>Contact:</strong> ${transaction.contactNumber || 'N/A'}</p>
                                <p><strong>Address:</strong> ${[transaction.address, transaction.city, transaction.region].filter(Boolean).join(', ') || 'N/A'}</p>
                                <p><strong>Event Type:</strong> ${transaction.eventType || 'N/A'}</p>
                                <p><strong>Rental Type:</strong> ${transaction.rentalType || 'N/A'}</p>
                                <p><strong>Event Start:</strong> ${eventStartDate}</p>
                                ${eventEndDate ? `<p><strong>Event End:</strong> ${eventEndDate}</p>` : ''}
                                <p><strong>Transaction Date:</strong> ${transactionDate}</p>
                                ${lastUpdated ? `<p><strong>Last Updated:</strong> ${lastUpdated}</p>` : ''}
                            </div>
                        </div>
                        
                        <div class="payment-info">
                            <h3><i class='bx bx-credit-card'></i> Payment Information</h3>
                            <div class="info-grid">
                                <p><strong>Payment Method:</strong> ${transaction.paymentMethod || 'N/A'}</p>
                                <p><strong>Payment Type:</strong> ${transaction.paymentType || 'N/A'}</p>
                                <p><strong>Rental Fee:</strong> ₱${transaction.rentalFee?.toLocaleString() || '0'}</p>
                                <p><strong>Total Payment:</strong> ₱${transaction.totalPayment?.toLocaleString() || '0'}</p>
                                <p><strong>Remaining Balance:</strong> ₱${transaction.remainingBalance?.toLocaleString() || '0'}</p>
                                <p><strong>Reference Number:</strong> ${transaction.referenceNo || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rental-items">
                        <h3><i class='bx bx-package'></i> Products Rented</h3>
                        <div class="products-detail">${productsHtml}</div>
                        
                        <h3><i class='bx bx-plus-circle'></i> Additional Items</h3>
                        <div class="accessories-detail">${accessoriesHtml}</div>
                    </div>
                    
                    ${transaction.notes ? `
                    <div class="additional-notes">
                        <h3><i class='bx bx-note'></i> Additional Notes</h3>
                        <p class="notes-content">${transaction.notes}</p>
                    </div>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeTransactionModal()">
                        <i class='bx bx-x'></i> Close
                    </button>
                    <button type="button" class="btn-primary" onclick="closeTransactionModal(); editTransaction('${transaction.id}')">
                        <i class='bx bx-edit'></i> Edit Transaction
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.querySelector('.transaction-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalContent);
    document.body.style.overflow = 'hidden';
    
    // Make close function globally available
    window.closeTransactionModal = function() {
        const modal = document.querySelector('.transaction-modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    };
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredTransactions = [...allTransactions];
    } else {
        filteredTransactions = allTransactions.filter(transaction => {
            const customerMatch = (transaction.fullName || '').toLowerCase().includes(searchTerm);
            const codeMatch = (transaction.transactionCode || '').toLowerCase().includes(searchTerm);
            const contactMatch = (transaction.contactNumber || '').toLowerCase().includes(searchTerm);
            const eventMatch = (transaction.eventType || '').toLowerCase().includes(searchTerm);
            const rentalMatch = (transaction.rentalType || '').toLowerCase().includes(searchTerm);
            
            // Search in products
            const productMatch = transaction.products?.some(product => 
                (product.name || '').toLowerCase().includes(searchTerm) ||
                (product.code || '').toLowerCase().includes(searchTerm)
            ) || false;
            
            // Search in accessories
            const accessoryMatch = transaction.accessories?.some(accessory => 
                (accessory.name || '').toLowerCase().includes(searchTerm) ||
                (accessory.code || '').toLowerCase().includes(searchTerm)
            ) || false;
            
            return customerMatch || codeMatch || contactMatch || eventMatch || rentalMatch || productMatch || accessoryMatch;
        });
    }
    
    applySorting(); // Apply current sort after filtering
}

// Show loading state
function showLoading() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-loading">
                <i class='bx bx-loader-alt bx-spin'></i> Loading rental history...
            </td>
        </tr>
    `;
}

// Show error state
function showError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-error">
                <i class='bx bx-error'></i> ${message}
            </td>
        </tr>
    `;
}

// Edit transaction function
function editTransaction(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert('Transaction not found');
        return;
    }
    
    currentEditingTransaction = transaction;
    populateEditForm(transaction);
    showEditModal();
}

// Show edit modal
function showEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentEditingTransaction = null;
}

// Populate edit form with transaction data
function populateEditForm(transaction) {
    document.getElementById('edit-fullName').value = transaction.fullName || '';
    document.getElementById('edit-contactNumber').value = transaction.contactNumber || '';
    document.getElementById('edit-address').value = transaction.address || '';
    document.getElementById('edit-city').value = transaction.city || '';
    document.getElementById('edit-region').value = transaction.region || '';
    document.getElementById('edit-eventType').value = transaction.eventType || '';
    document.getElementById('edit-rentalType').value = transaction.rentalType || 'Fixed Rental';
    document.getElementById('edit-eventStartDate').value = transaction.eventStartDate ? 
        new Date(transaction.eventStartDate).toISOString().split('T')[0] : '';
    document.getElementById('edit-eventEndDate').value = transaction.eventEndDate ? 
        new Date(transaction.eventEndDate).toISOString().split('T')[0] : '';
    document.getElementById('edit-paymentMethod').value = transaction.paymentMethod || 'Cash';
    document.getElementById('edit-paymentType').value = transaction.paymentType || 'Full Payment';
    document.getElementById('edit-rentalFee').value = transaction.rentalFee || '';
    document.getElementById('edit-totalPayment').value = transaction.totalPayment || '';
    document.getElementById('edit-remainingBalance').value = transaction.remainingBalance || '';
    document.getElementById('edit-referenceNo').value = transaction.referenceNo || '';
    document.getElementById('edit-notes').value = transaction.notes || '';
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!currentEditingTransaction) return;
    
    const formData = new FormData(e.target);
    const updatedData = {};
    
    // Collect form data
    for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
            // Convert numeric fields
            if (['rentalFee', 'totalPayment', 'remainingBalance'].includes(key)) {
                updatedData[key] = parseFloat(value) || 0;
            } else {
                updatedData[key] = value.trim();
            }
        }
    }
    
    // Add timestamp for last update
    updatedData.lastUpdated = new Date().toISOString();
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Update document in Firebase
        await updateDoc(doc(chandriaDB, 'transaction', currentEditingTransaction.id), updatedData);
        
        // Update local data
        const index = allTransactions.findIndex(t => t.id === currentEditingTransaction.id);
        if (index !== -1) {
            allTransactions[index] = { ...allTransactions[index], ...updatedData };
            filteredTransactions = [...allTransactions];
        }
        
        // Close modal and refresh table
        closeEditModal();
        renderTransactionTable();
        
        // Show success message
        showSuccessMessage('Transaction updated successfully!');
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Error updating transaction. Please try again.');
        
        // Restore button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Delete transaction function
function deleteTransaction(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert('Transaction not found');
        return;
    }
    
    currentDeletingTransaction = transaction;
    populateDeleteModal(transaction);
    showDeleteModal();
}

// Show delete modal
function showDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Reset confirmation input
    const confirmInput = document.getElementById('delete-confirmation-input');
    confirmInput.value = '';
    document.getElementById('confirm-delete-btn').disabled = true;
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentDeletingTransaction = null;
}

// Populate delete modal with transaction data
function populateDeleteModal(transaction) {
    document.getElementById('delete-customer-name').textContent = transaction.fullName || 'Unknown';
    document.getElementById('delete-transaction-code').textContent = 
        transaction.transactionCode || transaction.id.substring(0, 8);
    
    // Format event date
    let eventDate = 'N/A';
    if (transaction.eventStartDate) {
        const startDate = new Date(transaction.eventStartDate);
        if (transaction.eventEndDate && transaction.rentalType === 'Open Rental') {
            const endDate = new Date(transaction.eventEndDate);
            eventDate = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        } else {
            eventDate = startDate.toLocaleDateString();
        }
    }
    document.getElementById('delete-event-date').textContent = eventDate;
    document.getElementById('delete-total-amount').textContent = 
        `₱${(transaction.totalPayment || 0).toLocaleString()}`;
}

// Handle delete confirmation input
function handleDeleteConfirmation() {
    const input = document.getElementById('delete-confirmation-input');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (input.value.toUpperCase() === 'DELETE') {
        confirmBtn.disabled = false;
    } else {
        confirmBtn.disabled = true;
    }
}

// Confirm and execute deletion
async function confirmDelete() {
    if (!currentDeletingTransaction) return;
    
    try {
        // Show loading state
        const deleteBtn = document.getElementById('confirm-delete-btn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        deleteBtn.disabled = true;
        
        // Delete document from Firebase
        await deleteDoc(doc(chandriaDB, 'transaction', currentDeletingTransaction.id));
        
        // Remove from local arrays
        allTransactions = allTransactions.filter(t => t.id !== currentDeletingTransaction.id);
        filteredTransactions = filteredTransactions.filter(t => t.id !== currentDeletingTransaction.id);
        
        // Close modal and refresh table
        closeDeleteModal();
        renderTransactionTable();
        
        // Show success message
        showSuccessMessage('Transaction deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
        
        // Restore button state
        const deleteBtn = document.getElementById('confirm-delete-btn');
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// Show success message
function showSuccessMessage(message) {
    // Create success toast
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <i class='bx bx-check-circle'></i>
        <span>${message}</span>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// === SORT FUNCTIONALITY ===

// Toggle sort dropdown
function toggleSortOptions() {
    const sortOptions = document.getElementById('sort-options');
    const sortBtn = document.getElementById('sort-btn');
    
    if (sortOptions && sortBtn) {
        const isOpen = sortOptions.classList.contains('show');
        
        if (isOpen) {
            closeSortOptions();
        } else {
            openSortOptions();
        }
    }
}

// Open sort dropdown
function openSortOptions() {
    const sortOptions = document.getElementById('sort-options');
    const sortBtn = document.getElementById('sort-btn');
    
    if (sortOptions && sortBtn) {
        sortOptions.classList.add('show');
        sortBtn.classList.add('active');
        
        // Update active sort option
        updateActiveSortOption();
    }
}

// Close sort dropdown
function closeSortOptions() {
    const sortOptions = document.getElementById('sort-options');
    const sortBtn = document.getElementById('sort-btn');
    
    if (sortOptions && sortBtn) {
        sortOptions.classList.remove('show');
        sortBtn.classList.remove('active');
    }
}

// Update active sort option visual indicator
function updateActiveSortOption() {
    const sortOptionElements = document.querySelectorAll('.sort-option');
    sortOptionElements.forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-sort') === currentSort) {
            option.classList.add('active');
        }
    });
}

// Handle sort selection
function handleSort(sortType) {
    currentSort = sortType;
    updateActiveSortOption();
    applySorting();
}

// Apply sorting to current filtered transactions
function applySorting() {
    switch (currentSort) {
        case 'name-asc':
            filteredTransactions.sort((a, b) => {
                const nameA = (a.fullName || '').toLowerCase();
                const nameB = (b.fullName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
            
        case 'name-desc':
            filteredTransactions.sort((a, b) => {
                const nameA = (a.fullName || '').toLowerCase();
                const nameB = (b.fullName || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });
            break;
            
        case 'recent':
            filteredTransactions.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA; // Newest first
            });
            break;
            
        case 'oldest':
            filteredTransactions.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateA - dateB; // Oldest first
            });
            break;
            
        case 'event-asc':
            filteredTransactions.sort((a, b) => {
                const dateA = new Date(a.eventStartDate || 0);
                const dateB = new Date(b.eventStartDate || 0);
                return dateA - dateB; // Earliest first
            });
            break;
            
        case 'event-desc':
            filteredTransactions.sort((a, b) => {
                const dateA = new Date(a.eventStartDate || 0);
                const dateB = new Date(b.eventStartDate || 0);
                return dateB - dateA; // Latest first
            });
            break;
            
        default:
            // Default to recent (newest first)
            filteredTransactions.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });
    }
    
    // Re-render the table with sorted data
    renderTransactionTable();
}

// Make functions globally available
window.toggleSortOptions = toggleSortOptions;
window.handleSort = handleSort;
window.closeEditModal = closeEditModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
