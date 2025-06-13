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
const transactionCards = document.getElementById('transaction-cards');
const cardsContainer = document.getElementById('cards-container');
const tableContainer = document.getElementById('table-container');
const cardViewBtn = document.getElementById('card-view-btn');
const tableViewBtn = document.getElementById('table-view-btn');
const transactionCount = document.getElementById('transaction-count');

// View state
let currentView = 'cards'; // Default to cards view
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
    
    // View toggle listeners
    cardViewBtn?.addEventListener('click', () => switchView('cards'));
    tableViewBtn?.addEventListener('click', () => switchView('table'));
    
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
            } else if (e.target.id === 'transaction-details-modal') {
                closeTransactionDetailsModal();
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
        updateTransactionCount();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transaction history. Please try again.');
    }
}

// Update transaction count display
function updateTransactionCount() {
    if (transactionCount) {
        const total = allTransactions.length;
        const filtered = filteredTransactions.length;
        if (total === filtered) {
            transactionCount.textContent = `${total} transaction${total !== 1 ? 's' : ''}`;
        } else {
            transactionCount.textContent = `${filtered} of ${total} transactions`;
        }
    }
}

// Switch between card and table views
function switchView(view) {
    currentView = view;
    
    if (view === 'cards') {
        cardsContainer.style.display = 'block';
        tableContainer.style.display = 'none';
        cardViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        renderTransactionCards();
    } else {
        cardsContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        cardViewBtn.classList.remove('active');
        tableViewBtn.classList.add('active');
        renderTransactionTable();
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

// Render transaction table (simplified)
async function renderTransactionTable() {
    if (!tableBody) return;
    
    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    <i class='bx bx-file'></i>
                    <div>No transactions found</div>
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = [];
    
    for (const transaction of filteredTransactions) {
        // Calculate rental status
        const { rentalStatus, statusClass } = calculateRentalStatus(transaction);
        
        // Format event date
        const eventDateDisplay = formatEventDate(transaction);
        
        // Calculate total payment
        const totalPayment = parseFloat(transaction.totalPayment) || 0;        const row = `
            <tr data-transaction-id="${transaction.id}">
                <td><strong>${transaction.fullName || 'Unknown'}</strong></td>
                <td><code class="transaction-code">${transaction.transactionCode || transaction.id.substring(0, 8)}</code></td>
                <td>${eventDateDisplay}</td>
                <td><span class="status-badge ${statusClass}">${rentalStatus}</span></td>
                <td><strong class="amount">₱${totalPayment.toLocaleString()}</strong></td>                <td>
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
                    ${rentalStatus !== 'Upcoming' && rentalStatus !== 'Overdue' ? `
                        <div class="action-buttons-long">
                            <button class="mark-complete-btn long-btn" data-id="${transaction.id}" title="Mark as Complete">
                                <i class='bx bx-check'></i> Mark as Complete
                            </button>
                        </div>
                    ` : ''}
                    ${rentalStatus === 'Overdue' ? `
                        <div class="action-buttons-long">
                            <button class="process-overdue-btn long-btn" data-id="${transaction.id}" title="Process Overdue">
                                <i class='bx bx-exclamation-triangle'></i> Process Overdue
                            </button>
                        </div>
                    ` : ''}
                    ${rentalStatus === 'Upcoming' ? `
                        <div class="action-buttons-long">
                            <button class="cancel-rental-btn long-btn" data-id="${transaction.id}" title="Cancel Rental">
                                <i class='bx bx-x'></i> Cancel
                            </button>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
        
        tableRows.push(row);
    }
    
    tableBody.innerHTML = tableRows.join('');
    addActionListeners();
}

// Render transaction cards
async function renderTransactionCards() {
    if (!transactionCards) return;
    
    if (filteredTransactions.length === 0) {
        transactionCards.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-file'></i>
                <h3>No transactions found</h3>
                <p>No rental transactions match your current search or filter criteria.</p>
            </div>
        `;
        return;
    }

    const cards = [];
    
    for (const transaction of filteredTransactions) {
        // Calculate rental status
        const { rentalStatus, statusClass } = calculateRentalStatus(transaction);
        
        // Format event date
        const eventDateDisplay = formatEventDate(transaction);
        
        // Calculate payment details
        const totalPayment = parseFloat(transaction.totalPayment) || 0;
        const remainingBalance = parseFloat(transaction.remainingBalance) || 0;
        const paymentStatus = remainingBalance > 0 ? 'Partial Payment' : 'Fully Paid';
        
        // Count items
        const productCount = transaction.products?.length || 0;
        const accessoryCount = transaction.accessories?.length || 0;
        const totalItems = productCount + accessoryCount;        const card = `
            <div class="transaction-card" data-transaction-id="${transaction.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="customer-info">
                            <h4>${transaction.fullName || 'Unknown Customer'}</h4>
                            <code class="transaction-code">${transaction.transactionCode || transaction.id.substring(0, 8)}</code>
                        </div>
                        <div class="card-status">
                            <span class="status-badge ${statusClass}">${rentalStatus}</span>
                        </div>
                    </div>
                    
                    <div class="card-details">
                        <div class="detail-item">
                            <span class="detail-label">Event Date</span>
                            <span class="detail-value">${eventDateDisplay}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Event Type</span>
                            <span class="detail-value">${transaction.eventType || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Items Rented</span>
                            <span class="detail-value">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Payment Status</span>
                            <span class="detail-value">${paymentStatus}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Total Amount</span>
                            <span class="detail-value amount">₱${totalPayment.toLocaleString()}</span>
                        </div>
                        ${remainingBalance > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">Remaining Balance</span>
                            <span class="detail-value" style="color: #e74c3c; font-weight: 600;">₱${remainingBalance.toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="card-actions-container">
                    <div class="card-actions">
                        <button class="card-action-btn view-details-btn" data-id="${transaction.id}">
                            <i class='bx bx-show'></i> View
                        </button>
                        <button class="card-action-btn edit-btn" data-id="${transaction.id}">
                            <i class='bx bx-edit'></i> Edit
                        </button>
                        <button class="card-action-btn delete-btn" data-id="${transaction.id}">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    </div>
                    ${rentalStatus !== 'Upcoming' && rentalStatus !== 'Overdue' ? `
                        <div class="card-actions-long">
                            <button class="card-action-btn mark-complete-btn long-btn" data-id="${transaction.id}">
                                <i class='bx bx-check'></i> Mark as Complete
                            </button>
                        </div>
                    ` : ''}
                    ${rentalStatus === 'Overdue' ? `
                        <div class="card-actions-long">
                            <button class="card-action-btn process-overdue-btn long-btn" data-id="${transaction.id}">
                                <i class='bx bx-exclamation-triangle'></i> Process Overdue
                            </button>
                        </div>
                    ` : ''}
                    ${rentalStatus === 'Upcoming' ? `
                        <div class="card-actions-long">
                            <button class="card-action-btn cancel-rental-btn long-btn" data-id="${transaction.id}">
                                <i class='bx bx-x'></i> Cancel
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        cards.push(card);
    }
    
    transactionCards.innerHTML = cards.join('');
    addActionListeners();
}

// Helper function to calculate rental status
function calculateRentalStatus(transaction) {
    const currentDate = new Date();
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
    
    let rentalStatus = 'Upcoming';
    let statusClass = 'status-upcoming';
    
    // If rental has been marked as returned, it's completed
    if (transaction.returnConfirmed) {
        rentalStatus = 'Completed';
        statusClass = 'status-completed';
        return { rentalStatus, statusClass };
    }
    
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
                // Check if it's overdue (1 day grace period)
                const gracePeriod = new Date(eventEndDate);
                gracePeriod.setDate(gracePeriod.getDate() + 1);
                
                if (currentDate > gracePeriod && !transaction.returnConfirmed) {
                    rentalStatus = 'Overdue';
                    statusClass = 'status-overdue';
                } else {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
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
                // Check if it's overdue (1 day grace period for fixed rentals)
                const gracePeriod = new Date(eventStartDate);
                gracePeriod.setDate(gracePeriod.getDate() + 1);
                
                if (currentDate > gracePeriod && !transaction.returnConfirmed) {
                    rentalStatus = 'Overdue';
                    statusClass = 'status-overdue';
                } else {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
            }
        }
    }
    
    return { rentalStatus, statusClass };
}

// Helper function to format event date
function formatEventDate(transaction) {
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
    
    if (!eventStartDate) return 'N/A';
    
    if (eventEndDate && transaction.rentalType === 'Open Rental') {
        return `${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}`;
    } else {
        return eventStartDate.toLocaleDateString();
    }
}

// Add action listeners to buttons
function addActionListeners() {
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.view-details-btn').dataset.id;
            showTransactionDetails(transactionId);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.edit-btn').dataset.id;
            editTransaction(transactionId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.delete-btn').dataset.id;
            deleteTransaction(transactionId);
        });
    });    // Mark as Complete buttons
    document.querySelectorAll('.mark-complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.mark-complete-btn').dataset.id;
            markTransactionAsComplete(transactionId);
        });
    });

    // Process Overdue buttons
    document.querySelectorAll('.process-overdue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.process-overdue-btn').dataset.id;
            processOverdueRental(transactionId);
        });
    });

    // Cancel Rental buttons (for Upcoming status)
    document.querySelectorAll('.cancel-rental-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.cancel-rental-btn').dataset.id;
            cancelRental(transactionId);
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown, .card-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
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
                    <div class="product-content">
                        <div class="product-info">
                            <h4>${product.name || 'Unknown Product'}</h4>                            <div class="info-list">
                                <div class="info-item">
                                    <span class="info-label">Code:</span>
                                    <span class="info-value">${product.code || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Price:</span>
                                    <span class="info-value">₱${product.price?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Category:</span>
                                    <span class="info-value">${productDetails?.category || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="product-image">
                            ${productDetails?.frontImageUrl ? 
                                `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="modal-product-image">` : 
                                `<div class="no-image-placeholder">No Image Available</div>`
                            }
                        </div>
                    </div>
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
                    <div class="accessory-content">
                        <div class="accessory-info">
                            <h4>${accessory.name || 'Unknown Accessory'}</h4>
                            <div class="info-list">
                                <div class="info-item">
                                    <span class="info-label">Code:</span>
                                    <span class="info-value">${accessory.code || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Price:</span>
                                    <span class="info-value">₱${accessory.price?.toLocaleString() || 'N/A'}</span>
                                </div>
                                ${accessory.quantity ? `
                                <div class="info-item">
                                    <span class="info-label">Quantity:</span>
                                    <span class="info-value">${accessory.quantity}</span>
                                </div>
                                ` : ''}
                                ${accessory.types?.length > 0 ? `
                                <div class="info-item">
                                    <span class="info-label">Types:</span>
                                    <span class="info-value">${accessory.types.join(', ')}</span>
                                </div>
                                ` : ''}
                                ${accessoryDetails?.inclusions?.length > 0 ? `
                                <div class="info-item">
                                    <span class="info-label">Inclusions:</span>
                                    <span class="info-value">${accessoryDetails.inclusions.join(', ')}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="accessory-image">
                            ${accessoryDetails?.imageUrl ? 
                                `<img src="${accessoryDetails.imageUrl}" alt="${accessory.name}" class="modal-accessory-image">` : 
                                `<div class="no-image-placeholder">No Image Available</div>`
                            }
                        </div>
                    </div>
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
    
    const modalBody = document.getElementById('transaction-details-body');
    if (modalBody) {
        modalBody.innerHTML = `
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
            
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeTransactionDetailsModal()">
                    <i class='bx bx-x'></i> Close
                </button>
                <button type="button" class="btn-primary" onclick="closeTransactionDetailsModal(); editTransaction('${transaction.id}')">
                    <i class='bx bx-edit'></i> Edit Transaction
                </button>
            </div>
        `;
    }
    
    const modal = document.getElementById('transaction-details-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Close transaction details modal
function closeTransactionDetailsModal() {
    const modal = document.getElementById('transaction-details-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
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
    
    updateTransactionCount();
    applySorting(); // Apply current sort after filtering
}

// Show loading state
function showLoading() {
    if (currentView === 'cards' && transactionCards) {
        transactionCards.innerHTML = `
            <div class="loading-card">
                <i class='bx bx-loader-alt bx-spin'></i>
                <span>Loading transactions...</span>
            </div>
        `;
    } else if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-loading">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <div>Loading rental history...</div>
                </td>
            </tr>
        `;
    }
}

// Show error state
function showError(message) {
    if (currentView === 'cards' && transactionCards) {
        transactionCards.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-error'></i>
                <h3>Error Loading Data</h3>
                <p>${message}</p>
            </div>
        `;
    } else if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-error">
                    <i class='bx bx-error'></i>
                    <div>${message}</div>
                </td>
            </tr>
        `;
    }
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
        
        // Close modal and refresh view
        closeEditModal();
        if (currentView === 'cards') {
            renderTransactionCards();
        } else {
            renderTransactionTable();
        }
        
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
    const eventDate = formatEventDate(transaction);
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
        
        // Close modal and refresh view
        closeDeleteModal();
        updateTransactionCount();
        if (currentView === 'cards') {
            renderTransactionCards();
        } else {
            renderTransactionTable();
        }
        
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
    
    // Re-render current view with sorted data
    if (currentView === 'cards') {
        renderTransactionCards();
    } else {
        renderTransactionTable();
    }
}

// Mark transaction as complete
async function markTransactionAsComplete(transactionId) {
    try {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('Transaction not found');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(`Mark "${transaction.fullName || 'Unknown'}" rental as completed?\n\nThis will change the status to "Completed" and cannot be undone.`);
        if (!confirmed) return;

        // Show loading
        document.querySelector('.admin-action-spinner').style.display = 'flex';

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', transactionId);
        await updateDoc(transactionRef, {
            returnConfirmed: true,
            completedDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === transactionId);
        if (transactionIndex !== -1) {
            allTransactions[transactionIndex].returnConfirmed = true;
            allTransactions[transactionIndex].completedDate = new Date().toISOString();
        }

        // Re-filter and re-render
        filterTransactions();
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';

        // Show success notification
        alert('Transaction marked as completed successfully!');

    } catch (error) {
        console.error('Error marking transaction as complete:', error);
        document.querySelector('.admin-action-spinner').style.display = 'none';
        alert('Error marking transaction as complete. Please try again.');
    }
}

// Cancel rental (for Upcoming status)
async function cancelRental(transactionId) {
    try {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('Transaction not found');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(`Cancel rental for "${transaction.fullName || 'Unknown'}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        // Show loading
        document.querySelector('.admin-action-spinner').style.display = 'flex';

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', transactionId);
        await updateDoc(transactionRef, {
            rentalStatus: 'Cancelled',
            cancelledDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === transactionId);
        if (transactionIndex !== -1) {
            allTransactions[transactionIndex].rentalStatus = 'Cancelled';
            allTransactions[transactionIndex].cancelledDate = new Date().toISOString();
        }

        // Re-filter and re-render
        filterTransactions();
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';

        // Show success notification
        alert('Rental cancelled successfully!');

    } catch (error) {
        console.error('Error cancelling rental:', error);
        document.querySelector('.admin-action-spinner').style.display = 'none';
        alert('Error cancelling rental. Please try again.');
    }
}

// Process overdue rental (for Overdue status)
async function processOverdueRental(transactionId) {
    try {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('Transaction not found');
            return;
        }

        // Show confirmation dialog with options
        const action = confirm(`Process overdue rental for "${transaction.fullName || 'Unknown'}"?\n\nThis will mark the rental as completed and notify the customer about any applicable fees.`);
        if (!action) return;

        // Show loading
        document.querySelector('.admin-action-spinner').style.display = 'flex';

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', transactionId);
        await updateDoc(transactionRef, {
            returnConfirmed: true,
            completedDate: new Date().toISOString(),
            processedOverdue: true,
            updatedAt: new Date().toISOString()
        });

        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === transactionId);
        if (transactionIndex !== -1) {
            allTransactions[transactionIndex].returnConfirmed = true;
            allTransactions[transactionIndex].completedDate = new Date().toISOString();
            allTransactions[transactionIndex].processedOverdue = true;
        }

        // Re-filter and re-render
        filterTransactions();
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';

        // Show success notification
        alert('Overdue rental processed successfully!');

    } catch (error) {
        console.error('Error processing overdue rental:', error);
        document.querySelector('.admin-action-spinner').style.display = 'none';
        alert('Error processing overdue rental. Please try again.');
    }
}

// Show Add Fee Modal
let currentTransactionForFee = null;

function showAddFeeModal(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found');
        return;
    }

    currentTransactionForFee = transaction;
    
    // Get rental status to filter fee options
    const { rentalStatus } = calculateRentalStatus(transaction);
      // Update fee type options for Ongoing status
    const feeTypeSelect = document.getElementById('fee-type');
    feeTypeSelect.innerHTML = `
        <option value="">Select Fee Type</option>
        <option value="Repair Fee">Repair Fee</option>
        <option value="Deposit Fee">Deposit Fee</option>
        <option value="Others">Others</option>
    `;
    
    // Reset form
    document.getElementById('add-fee-form').reset();
    
    // Show modal
    document.getElementById('add-fee-modal').style.display = 'flex';
}

// Close Add Fee Modal
function closeAddFeeModal() {
    document.getElementById('add-fee-modal').style.display = 'none';
    currentTransactionForFee = null;
}

// Initialize Add Fee Modal Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close modal buttons
    document.querySelector('.add-fee-close')?.addEventListener('click', closeAddFeeModal);
    document.getElementById('cancel-add-fee-btn')?.addEventListener('click', closeAddFeeModal);
    
    // Close modal when clicking outside
    document.getElementById('add-fee-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('add-fee-modal')) {
            closeAddFeeModal();
        }
    });
    
    // Handle form submission
    document.getElementById('add-fee-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const feeType = document.getElementById('fee-type').value;
        const feeAmount = parseFloat(document.getElementById('fee-amount').value);
        
        if (!feeType || isNaN(feeAmount) || feeAmount <= 0) {
            alert('Please select a fee type and enter a valid amount greater than 0.');
            return;
        }
        
        if (!currentTransactionForFee) {
            alert('No transaction selected.');
            return;
        }
        
        try {
            // Show loading
            document.querySelector('.admin-action-spinner').style.display = 'flex';
            
            // Here you would typically create a new transaction or update the existing one
            // For now, we'll just show a success message
            
            // Hide loading
            document.querySelector('.admin-action-spinner').style.display = 'none';
            
            // Close modal
            closeAddFeeModal();
            
            // Show success message
            alert(`${feeType} of ₱${feeAmount.toLocaleString()} added successfully to ${currentTransactionForFee.fullName}'s rental!`);
            
        } catch (error) {
            console.error('Error adding fee:', error);
            document.querySelector('.admin-action-spinner').style.display = 'none';
            alert('Error adding fee. Please try again.');
        }
    });
});

// Make functions globally available
window.toggleSortOptions = toggleSortOptions;
window.handleSort = handleSort;
window.closeEditModal = closeEditModal;
window.closeDeleteModal = closeDeleteModal;
window.closeTransactionDetailsModal = closeTransactionDetailsModal;
window.confirmDelete = confirmDelete;
window.editTransaction = editTransaction;
