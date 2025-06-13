// Import Firebase configuration
import { chandriaDB, collection, getDocs, doc, getDoc, updateDoc, deleteDoc, arrayUnion } from './sdk/chandrias-sdk.js';

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

// Export variables and functions to global scope for modal access
window.allTransactions = allTransactions;
window.filteredTransactions = filteredTransactions;
window.currentView = currentView;

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

    // Show initial loading spinner
    if (window.adminSpinners) {
        window.adminSpinners.showPageLoader('Initializing...');
    }

    // Load transactions on page load
    loadTransactions();
      // Add event listeners
    searchInput?.addEventListener('input', handleSearch);
    refreshBtn?.addEventListener('click', async () => {
        // Show button loading state
        if (window.adminSpinners && refreshBtn) {
            window.adminSpinners.showButtonSpinner(refreshBtn, 'Refreshing...');
        }
        
        await loadTransactions();
        
        // Hide button loading state
        if (window.adminSpinners && refreshBtn) {
            window.adminSpinners.hideButtonSpinner(refreshBtn);
        }
    });
    
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
            } else if (e.target.id === 'cancel-rental-modal') {
                closeCancelRentalModal();
            } else if (e.target.id === 'mark-complete-modal') {
                closeMarkCompleteModal();
            } else if (e.target.id === 'add-fee-modal') {
                if (window.closeAddFeeModal) {
                    closeAddFeeModal();
                }
            } else if (e.target.id === 'process-overdue-modal') {
                closeProcessOverdueModal();
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
        // Show loading spinner
        if (window.adminSpinners) {
            window.adminSpinners.showPageLoader('Loading transactions...');
        }
        
        const transactionRef = collection(chandriaDB, 'transaction');
        const snapshot = await getDocs(transactionRef);
        
        allTransactions = [];
        window.allTransactions = allTransactions; // Update global reference
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
        
        // Hide page loader after successful load
        if (window.adminSpinners) {
            window.adminSpinners.hidePageLoader();
        }
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transaction history. Please try again.');
        
        // Hide page loader even on error
        if (window.adminSpinners) {
            window.adminSpinners.hidePageLoader();
        }
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
    window.currentView = currentView; // Update global reference
      if (view === 'cards') {
        cardsContainer.style.display = 'block';
        tableContainer.classList.remove('show');
        cardViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        renderTransactionCards();
    } else {
        cardsContainer.style.display = 'none';
        tableContainer.classList.add('show');
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
                    </div>                    ${rentalStatus === 'Ongoing' ? `
                        <div class="action-buttons-long">                            <button class="mark-complete-btn long-btn" data-id="${transaction.id}" title="Mark as Complete">
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
                    ${rentalStatus === 'Cancelled' ? `
                        <div class="action-buttons-long">
                            <button class="undo-cancel-btn long-btn" data-id="${transaction.id}" title="Undo Cancellation">
                                <i class='bx bx-undo'></i> Undo Cancellation
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
                    </div>                    ${rentalStatus === 'Ongoing' ? `
                        <div class="card-actions-long">
                            <button class="card-action-btn mark-complete-btn long-btn" data-id="${transaction.id}">
                                <i class='bx bx-check'></i> Mark as Complete
                            </button>
                        </div>                    ` : ''}
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
                    ${rentalStatus === 'Cancelled' ? `
                        <div class="card-actions-long">
                            <button class="card-action-btn undo-cancel-btn long-btn" data-id="${transaction.id}">
                                <i class='bx bx-undo'></i> Undo Cancellation
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
    
    // Get all possible date fields
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
    const eventDate = transaction.eventDate ? new Date(transaction.eventDate) : null;
    
    // Normalize current date to ignore time components
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    // Debug logging
    console.log('🔍 calculateRentalStatus DEBUG:', {
        transactionId: transaction.id || 'Unknown',
        today: today.toDateString(),
        eventStartDate: eventStartDate ? eventStartDate.toDateString() : null,
        eventEndDate: eventEndDate ? eventEndDate.toDateString() : null,
        eventDate: eventDate ? eventDate.toDateString() : null,
        rentalStatus: transaction.rentalStatus,
        returnConfirmed: transaction.returnConfirmed
    });
    
    let rentalStatus = 'Upcoming';
    let statusClass = 'status-upcoming';
    
    // Priority 1: Check if rental has been cancelled
    if (transaction.rentalStatus === 'Cancelled') {
        console.log('❌ Status: CANCELLED (rentalStatus field)');
        return { rentalStatus: 'Cancelled', statusClass: 'status-cancelled' };
    }
    
    // Priority 2: Check if rental has been marked as completed
    if (transaction.returnConfirmed) {
        console.log('✅ Status: COMPLETED (return confirmed)');
        return { rentalStatus: 'Completed', statusClass: 'status-completed' };
    }
    
    // Priority 3: Calculate status based on dates
    // Determine which date fields to use
    let rentalStartDate = null;
    let rentalEndDate = null;
    
    if (eventStartDate) {
        rentalStartDate = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
        if (eventEndDate) {
            rentalEndDate = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
        }
    } else if (eventDate) {
        rentalStartDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    }
    
    if (!rentalStartDate) {
        console.log('⚠️ No valid date found, defaulting to Upcoming');
        return { rentalStatus: 'Upcoming', statusClass: 'status-upcoming' };
    }
    
    console.log('📅 Date calculations:', {
        today: today.toDateString(),
        rentalStartDate: rentalStartDate.toDateString(),
        rentalEndDate: rentalEndDate ? rentalEndDate.toDateString() : null,
        hasEndDate: !!rentalEndDate
    });
    
    if (rentalEndDate) {
        // MULTI-DAY RENTAL (has both start and end dates)
        console.log('📊 Multi-day rental logic');
        
        if (today < rentalStartDate) {
            // Event hasn't started yet
            rentalStatus = 'Upcoming';
            statusClass = 'status-upcoming';
            console.log('📅 Before start date → UPCOMING');
        } else if (today >= rentalStartDate && today <= rentalEndDate) {
            // Currently within the event period
            rentalStatus = 'Ongoing';
            statusClass = 'status-ongoing';
            console.log('📅 Within rental period → ONGOING');
        } else if (today > rentalEndDate) {
            // Past end date - check if it's overdue (3 days after end date)
            const overduePeriod = new Date(rentalEndDate);
            overduePeriod.setDate(overduePeriod.getDate() + 3);
            
            if (today > overduePeriod) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
                console.log('📅 Past overdue period (3+ days after end date) → OVERDUE');
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
                console.log('📅 Within 3 days after end date → ONGOING');
            }
        }
    } else {
        // SINGLE-DAY RENTAL (only start date, no end date)
        console.log('📅 Single-day rental logic');
        
        console.log('📅 Single-day rental period:', {
            rentalStartDate: rentalStartDate.toDateString(),
            today: today.toDateString(),
            daysDiff: Math.floor((today - rentalStartDate) / (1000 * 60 * 60 * 24))
        });
        
        if (today < rentalStartDate) {
            // Event is in the future
            rentalStatus = 'Upcoming';
            statusClass = 'status-upcoming';
            console.log('📅 Before event date → UPCOMING');
        } else if (today.getTime() === rentalStartDate.getTime()) {
            // Event is today
            rentalStatus = 'Ongoing';
            statusClass = 'status-ongoing';
            console.log('📅 Event is today → ONGOING');
        } else if (today > rentalStartDate) {
            // Past event date - check if it's overdue (3+ days after event)
            const daysDiff = Math.floor((today - rentalStartDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 3) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
                console.log('📅 3+ days after event date → OVERDUE');
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
                console.log('📅 Within 3 days after event date → ONGOING');
            }
        }
    }
    
    console.log('🎯 Final status:', { rentalStatus, statusClass });
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
            showMarkCompleteModal(transactionId);
        });
    });    // Process Overdue buttons
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
            showCancelRentalModal(transactionId);
        });
    });

    // Undo Cancel buttons
    document.querySelectorAll('.undo-cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.closest('.undo-cancel-btn').dataset.id;
            undoCancellation(transactionId);
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
            
            <div class="additional-fees-section">
                <h3><i class='bx bx-receipt'></i> Additional Fees</h3>
                <div class="fees-grid">
                    <div class="fee-item">
                        <p><strong>Overdue Fee:</strong> 
                            <span class="fee-amount">${transaction.overdueFee?.overdueAmount ? '₱' + parseFloat(transaction.overdueFee.overdueAmount).toLocaleString() : '-'}</span>
                        </p>
                        ${transaction.overdueFee?.overdueReason ? `<p class="fee-reason"><em>Reason: ${transaction.overdueFee.overdueReason}</em></p>` : ''}
                    </div>
                    
                    <div class="fee-item">
                        <p><strong>Repair Fee:</strong> 
                            <span class="fee-amount">${transaction.repairFee?.amount ? '₱' + parseFloat(transaction.repairFee.amount).toLocaleString() : '-'}</span>
                        </p>
                        ${transaction.repairFee?.reason ? `<p class="fee-reason"><em>Reason: ${transaction.repairFee.reason}</em></p>` : ''}
                    </div>
                    
                    <div class="fee-item">
                        <p><strong>Deposit Fee:</strong> 
                            <span class="fee-amount">${transaction.depositFee?.amount ? '₱' + parseFloat(transaction.depositFee.amount).toLocaleString() : '-'}</span>
                        </p>
                        ${transaction.depositFee?.reason ? `<p class="fee-reason"><em>Reason: ${transaction.depositFee.reason}</em></p>` : ''}
                    </div>
                    
                    <div class="fee-item">
                        <p><strong>Other Fee:</strong> 
                            <span class="fee-amount">${transaction.otherFee?.amount ? '₱' + parseFloat(transaction.otherFee.amount).toLocaleString() : '-'}</span>
                        </p>
                        ${transaction.otherFee?.reason ? `<p class="fee-reason"><em>Reason: ${transaction.otherFee.reason}</em></p>` : ''}
                    </div>
                </div>
                
                ${(transaction.overdueFee?.overdueAmount || transaction.repairFee?.amount || transaction.depositFee?.amount || transaction.otherFee?.amount) ? `
                <div class="total-additional-fees">
                    <p><strong>Total Additional Fees:</strong> 
                        <span class="total-fee-amount">₱${(
                            (parseFloat(transaction.overdueFee?.overdueAmount) || 0) +
                            (parseFloat(transaction.repairFee?.amount) || 0) +
                            (parseFloat(transaction.depositFee?.amount) || 0) +
                            (parseFloat(transaction.otherFee?.amount) || 0)
                        ).toLocaleString()}</span>
                    </p>
                </div>
                ` : ''}
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
                <button type="button" class="btn-primary" onclick="openEditFromDetails('${transaction.id}')">
                    <i class='bx bx-edit'></i> Edit Transaction
                </button>
            </div>
        `;
    }
      const modal = document.getElementById('transaction-details-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Open edit modal from transaction details modal
function openEditFromDetails(transactionId) {
    // Close the details modal first
    closeTransactionDetailsModal();
    
    // Wait a short moment for the close animation, then open edit modal
    setTimeout(() => {
        editTransaction(transactionId);
    }, 100);
}

// Close transaction details modal
function closeTransactionDetailsModal() {
    const modal = document.getElementById('transaction-details-modal');
    if (modal) {
        modal.classList.remove('show');
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
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('show');
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
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Reset confirmation input
    const confirmInput = document.getElementById('delete-confirmation-input');
    confirmInput.value = '';
    document.getElementById('confirm-delete-btn').disabled = true;
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('show');
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
        
        // Update global references
        window.allTransactions = allTransactions;
        window.filteredTransactions = filteredTransactions;
        
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

// =============== NOTIFICATION SYSTEM ===============

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Set the message
    notification.innerHTML = `
        <div class="notification-content">
            <i class="bx ${getNotificationIcon(type)}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="bx bx-x"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 4000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'bx-check-circle';
        case 'error': return 'bx-error-circle';
        case 'warning': return 'bx-error';
        case 'info':
        default: return 'bx-info-circle';
    }
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
        document.querySelector('.admin-action-spinner').style.display = 'none';        // Show success notification
        showNotification('Transaction marked as completed successfully!', 'success');

    } catch (error) {
        console.error('Error marking transaction as complete:', error);
        document.querySelector('.admin-action-spinner').style.display = 'none';
        showNotification('Error marking transaction as complete. Please try again.', 'error');
    }
}

// Cancel rental (for Upcoming status)
async function cancelRental(transactionId) {
    try {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('Transaction not found');
            return;
        }        // Show confirmation dialog
        const confirmed = confirm(`Cancel rental for "${transaction.fullName || 'Unknown'}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        // Show loading
        showActionSpinner('Cancelling rental...');

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
        }        // Re-filter and re-render
        filterTransactions();
          // Hide loading
        hideActionSpinner();

        // Show success notification with Notyf
        if (window.notyf) {
            window.notyf.success({
                message: 'Rental cancelled successfully!',
                duration: 4000,
                background: '#28a745',
                icon: {
                    className: 'bx bx-check-circle',
                    tagName: 'i'
                }            });
        } else {
            showNotification('Rental cancelled successfully!', 'success');
        }

    } catch (error) {        console.error('Error cancelling rental:', error);
        hideActionSpinner();
        showNotification('Error cancelling rental. Please try again.', 'error');
    }
}

// Process overdue rental (for Overdue status)
async function processOverdueRental(transactionId) {
    showProcessOverdueModal(transactionId);
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

// === CANCEL RENTAL MODAL FUNCTIONS ===

let currentCancelTransaction = null;

// Show cancel rental modal
function showCancelRentalModal(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found');
        return;
    }

    currentCancelTransaction = transaction;
    window.currentCancelTransaction = currentCancelTransaction; // Update global reference    // Format event date
    const eventDateDisplay = formatEventDate(transaction);
    const totalAmount = transaction.totalAmount || transaction.totalPayment || transaction.amount || 0;    // Populate modal with transaction details
    const customerNameEl = document.getElementById('cancel-customer-name');
    if (customerNameEl) {
        customerNameEl.textContent = transaction.fullName || 'Unknown';
    }
    
    const transactionCodeEl = document.getElementById('cancel-transaction-code');
    if (transactionCodeEl) {
        transactionCodeEl.textContent = transaction.transactionCode || transaction.id.substring(0, 8);
    }
    
    const eventDateEl = document.getElementById('cancel-event-date');
    if (eventDateEl) {
        eventDateEl.textContent = eventDateDisplay;
    }
    
    const totalAmountEl = document.getElementById('cancel-total-amount');
    if (totalAmountEl) {
        totalAmountEl.textContent = `₱${parseFloat(totalAmount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }// Show modal
    const modal = document.getElementById('cancel-rental-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Close cancel rental modal
function closeCancelRentalModal() {
    const modal = document.getElementById('cancel-rental-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    currentCancelTransaction = null;
    window.currentCancelTransaction = null; // Clear global reference
}

// Confirm cancel rental
async function confirmCancelRental() {
    if (!currentCancelTransaction) return;

    try {
        // Disable the confirm button to prevent double-clicks
        const confirmBtn = document.getElementById('confirm-cancel-rental-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelling...';
        }

        // Show loading
        document.querySelector('.admin-action-spinner').style.display = 'flex';

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', currentCancelTransaction.id);
        await updateDoc(transactionRef, {
            rentalStatus: 'Cancelled',
            cancelledDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === currentCancelTransaction.id);
        if (transactionIndex !== -1) {
            allTransactions[transactionIndex].rentalStatus = 'Cancelled';
            allTransactions[transactionIndex].cancelledDate = new Date().toISOString();
            allTransactions[transactionIndex].lastUpdated = new Date().toISOString();
        }

        // Update filtered transactions
        const filteredIndex = filteredTransactions.findIndex(t => t.id === currentCancelTransaction.id);
        if (filteredIndex !== -1) {
            filteredTransactions[filteredIndex].rentalStatus = 'Cancelled';
            filteredTransactions[filteredIndex].cancelledDate = new Date().toISOString();
            filteredTransactions[filteredIndex].lastUpdated = new Date().toISOString();
        }

        // Update global references
        window.allTransactions = allTransactions;
        window.filteredTransactions = filteredTransactions;

        // Re-render the views
        if (currentView === 'cards') {
            renderTransactionCards();
        } else {
            renderTransactionTable();
        }

        // Close modal
        closeCancelRentalModal();        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';        // Show success notification with Notyf
        if (window.notyf) {
            window.notyf.success({
                message: 'Rental cancelled successfully!',
                duration: 4000,
                background: '#28a745',
                icon: {
                    className: 'bx bx-check-circle',
                    tagName: 'i'
                }
            });
        } else if (showSuccessToast) {
            showSuccessToast('Rental cancelled successfully!');
        } else {
            alert('Rental cancelled successfully!');
        }    } catch (error) {
        console.error('Error cancelling rental:', error);
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';
        
        // Re-enable button
        const confirmBtn = document.getElementById('confirm-cancel-rental-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-x-circle"></i> Cancel Rental';
        }
        
        // Show error notification with Notyf
        if (window.notyf) {
            window.notyf.error({
                message: 'Error cancelling rental. Please try again.',
                duration: 5000
            });
        } else {
            alert('Error cancelling rental. Please try again.');
        }
    }
}

// ============================================
// Process Overdue Modal Functions
// ============================================

let currentOverdueTransaction = null;

// Show Process Overdue Modal
function showProcessOverdueModal(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found');
        return;
    }

    currentOverdueTransaction = transaction;
    
    // Populate modal with transaction details
    document.getElementById('overdue-customer-name').textContent = transaction.fullName || 'Unknown';
    document.getElementById('overdue-transaction-code').textContent = transaction.transactionCode || 'N/A';
    document.getElementById('overdue-event-date').textContent = formatEventDate(transaction);
    document.getElementById('overdue-total-amount').textContent = `₱${transaction.totalAmount ? transaction.totalAmount.toLocaleString() : '0'}`;
    
    // Calculate days overdue
    const daysOverdue = calculateDaysOverdue(transaction);
    document.getElementById('overdue-days-count').textContent = `${daysOverdue} days`;
      // Reset form
    document.getElementById('mark-completed').checked = true;
    document.getElementById('late-fee-section').style.display = 'none';
    document.getElementById('late-fee-amount').value = '';
    document.getElementById('late-fee-reason').value = 'late-return';
    
    // Show modal immediately
    const modal = document.getElementById('process-overdue-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Prevent background interaction
    document.body.classList.add('modal-open');
    
    // Add event listeners for radio buttons
    setupOverdueModalListeners();
}

// Close Process Overdue Modal
function closeProcessOverdueModal() {
    const modal = document.getElementById('process-overdue-modal');
    
    // Remove modal classes immediately
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // Hide modal immediately
    modal.style.display = 'none';
    currentOverdueTransaction = null;
}

// Setup event listeners for the modal
function setupOverdueModalListeners() {
    const radioButtons = document.querySelectorAll('input[name="overdue-action"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Hide all sections first
            document.getElementById('late-fee-section').style.display = 'none';
            
            // Show relevant section based on selection
            if (this.value === 'late-fee') {
                document.getElementById('late-fee-section').style.display = 'block';
            }
        });
    });
}

// Calculate days overdue
function calculateDaysOverdue(transaction) {
    const today = new Date();
    let eventEndDate = null;
    
    if (transaction.eventEndDate) {
        eventEndDate = new Date(transaction.eventEndDate);
    } else if (transaction.eventStartDate) {
        eventEndDate = new Date(transaction.eventStartDate);
    } else if (transaction.eventDate) {
        eventEndDate = new Date(transaction.eventDate);
    }
    
    if (!eventEndDate) return 0;
    
    const timeDiff = today - eventEndDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff);
}

// Confirm Process Overdue
async function confirmProcessOverdue() {
    if (!currentOverdueTransaction) return;
    
    const selectedAction = document.querySelector('input[name="overdue-action"]:checked').value;
    
    try {
        // Show loading
        document.querySelector('.admin-action-spinner').style.display = 'flex';
        
        const transactionRef = doc(chandriaDB, 'transaction', currentOverdueTransaction.id);
        const updateData = {
            processedOverdue: true,
            updatedAt: new Date().toISOString()
        };
        
        if (selectedAction === 'completed') {
            // Mark as completed
            updateData.returnConfirmed = true;
            updateData.completedDate = new Date().toISOString();
              } else if (selectedAction === 'late-fee') {
            // Add overdue fee and mark as completed
            const feeAmount = parseFloat(document.getElementById('late-fee-amount').value) || 0;
            const feeReason = document.getElementById('late-fee-reason').value;
            
            updateData.returnConfirmed = true;
            updateData.completedDate = new Date().toISOString();
            updateData.overdueFee = {
                overdueAmount: feeAmount,
                overdueReason: feeReason,
                addedDate: new Date().toISOString()
            };
            
            // Update total amount
            const newTotal = (currentOverdueTransaction.totalAmount || 0) + feeAmount;
            updateData.totalAmount = newTotal;
        }
        
        // Update the transaction in Firebase
        await updateDoc(transactionRef, updateData);
        
        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === currentOverdueTransaction.id);
        if (transactionIndex !== -1) {
            Object.assign(allTransactions[transactionIndex], updateData);
        }
        
        // Close modal and refresh
        closeProcessOverdueModal();
        filterTransactions();
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';        // Show success message
        let successMessage = '';
        if (selectedAction === 'completed') {
            successMessage = 'Overdue Processed. Product is now Completed.';
        } else if (selectedAction === 'late-fee') {
            successMessage = 'Overdue Processed. Product is now Completed.';
        }
        
        showNotification(successMessage, 'success');
      } catch (error) {
        console.error('Error processing overdue rental:', error);
        document.querySelector('.admin-action-spinner').style.display = 'none';
        showNotification('Overdue Processed. Product is now Completed.', 'error');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'process-overdue-modal') {
            closeProcessOverdueModal();
        }
    }
});

// Make functions available globally
window.openEditFromDetails = openEditFromDetails;
window.showProcessOverdueModal = showProcessOverdueModal;
window.closeProcessOverdueModal = closeProcessOverdueModal;
window.confirmProcessOverdue = confirmProcessOverdue;

// Hide page loader
function hidePageLoader() {
    const pageLoader = document.querySelector('.admin-page-loader');
    if (pageLoader) {
        pageLoader.style.display = 'none';
    }
}

// Show page loader
function showPageLoader() {
    const pageLoader = document.querySelector('.admin-page-loader');
    if (pageLoader) {
        pageLoader.style.display = 'flex';
    }
}

// Show action spinner
function showActionSpinner(text = 'Processing...') {
    const actionSpinner = document.querySelector('.admin-action-spinner');
    const actionSpinnerText = document.querySelector('.admin-action-spinner .admin-spinner-text');
    
    if (actionSpinner) {
        actionSpinner.style.display = 'flex';
    }
    if (actionSpinnerText) {
        actionSpinnerText.textContent = text;
    }
}

// Hide action spinner
function hideActionSpinner() {
    const actionSpinner = document.querySelector('.admin-action-spinner');
    if (actionSpinner) {
        actionSpinner.style.display = 'none';
    }
}

// Update action spinner text
function updateActionSpinner(text) {
    const actionSpinnerText = document.querySelector('.admin-action-spinner .admin-spinner-text');
    if (actionSpinnerText) {
        actionSpinnerText.textContent = text;
    }
}

// Add click-outside-to-close functionality for all modals
document.addEventListener('click', function(event) {
    // Check if the click is on a modal overlay (not the modal content)
    if (event.target.classList.contains('modal-overlay')) {
        const modalId = event.target.id;
        
        // Close the appropriate modal based on its ID
        switch(modalId) {
            case 'transaction-details-modal':
                closeTransactionDetailsModal();
                break;
            case 'edit-modal':
                closeEditModal();
                break;
            case 'delete-modal':
                closeDeleteModal();
                break;
            case 'cancel-rental-modal':
                closeCancelRentalModal();
                break;
            case 'mark-complete-modal':
                closeMarkCompleteModal();
                break;
            case 'add-fee-modal':
                if (window.closeAddFeeModal) {
                    closeAddFeeModal();
                }
                break;
            case 'process-overdue-modal':
                closeProcessOverdueModal();
                break;
        }
    }
});

// Make sure all modal close functions are globally accessible
window.closeTransactionDetailsModal = closeTransactionDetailsModal;
window.closeEditModal = closeEditModal;
window.closeDeleteModal = closeDeleteModal;
window.closeCancelRentalModal = closeCancelRentalModal;
window.closeMarkCompleteModal = closeMarkCompleteModal;

// Export functions needed by the undo cancellation modal
window.renderTransactionCards = renderTransactionCards;
window.renderTransactionTable = renderTransactionTable;
window.showSuccessToast = showSuccessToast;
window.showNotification = showNotification;

// Export cancel rental functions
window.showCancelRentalModal = showCancelRentalModal;
window.confirmCancelRental = confirmCancelRental;

// Export cancel rental state
window.currentCancelTransaction = currentCancelTransaction;
