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
const searchInputMobile = document.getElementById('search-input-mobile');
const refreshBtn = document.getElementById('refresh-btn');
const refreshBtnMobile = document.getElementById('refresh-btn-mobile');
const sortBtn = document.getElementById('sort-btn');
const sortOptions = document.getElementById('sort-options');
const transactionCards = document.getElementById('transaction-cards');
const cardsContainer = document.getElementById('cards-container');
const tableContainer = document.getElementById('table-container');
const cardViewBtn = document.getElementById('card-view-btn');
const tableViewBtn = document.getElementById('table-view-btn');
const transactionCount = document.getElementById('transaction-count');
const transactionCountMobile = document.getElementById('transaction-count-mobile');

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
    loadTransactions();      // Add event listeners
    searchInput?.addEventListener('input', handleSearch);
    searchInputMobile?.addEventListener('input', handleSearchMobile);
    
    // Refresh functionality for both desktop and mobile buttons
    const handleRefresh = async (button) => {
        // Show button loading state
        if (window.adminSpinners && button) {
            window.adminSpinners.showButtonSpinner(button, 'Refreshing...');
        }
        
        await loadTransactions();
        
        // Hide button loading state
        if (window.adminSpinners && button) {
            window.adminSpinners.hideButtonSpinner(button);
        }
    };
    
    refreshBtn?.addEventListener('click', () => handleRefresh(refreshBtn));
    refreshBtnMobile?.addEventListener('click', () => handleRefresh(refreshBtnMobile));
    
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
      // Delete confirmation button event listener (as backup to onclick)
    const deleteConfirmBtn = document.getElementById('confirm-delete-btn');
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', confirmDelete);
    }
    
    // Immediately expose the function to global scope for HTML onclick
    window.confirmDelete = confirmDelete;
    window.closeDeleteModal = closeDeleteModal;
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
    const total = allTransactions.length;
    const filtered = filteredTransactions.length;
    
    let countText;
    if (total === filtered) {
        countText = `${total}`;
    } else {
        countText = `${filtered}`;
    }
    
    // Update desktop count
    if (transactionCount) {
        transactionCount.textContent = countText;
    }
    
    // Update mobile count
    if (transactionCountMobile) {
        transactionCountMobile.textContent = countText;
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
                <td colspan="5" class="table-empty">
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
                <td>
                    <div class="customer-info">
                        <strong class="customer-name">${transaction.fullName || 'Unknown'}</strong>
                        <small class="transaction-code">${transaction.transactionCode || transaction.id.substring(0, 8)}</small>
                    </div>
                </td>
                <td>${eventDateDisplay}</td>
                <td><span class="status-badge ${statusClass}">${rentalStatus}</span></td>
                <td><strong class="amount">₱${totalPayment.toLocaleString()}</strong></td>                <td>
                    <div class="action-buttons">
                        <button class="view-details-btn" data-id="${transaction.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        ${(() => {
                            const editValidation = canEditTransaction(transaction);
                            if (editValidation.canEdit) {
                                return `<button class="edit-btn" data-id="${transaction.id}" title="Edit Transaction">
                                    <i class='bx bx-edit'></i>
                                </button>`;
                            } else {
                                return `<button class="edit-btn disabled" data-id="${transaction.id}" title="${editValidation.reason}" disabled>
                                    <i class='bx bx-edit'></i>
                                </button>`;
                            }
                        })()}
                        <button class="delete-btn" data-id="${transaction.id}" title="Delete Transaction">
                            <i class='bx bx-trash'></i>
                        </button>
                        ${rentalStatus === 'Ongoing' ? `
                            <button class="mark-complete-btn" data-id="${transaction.id}" title="Mark as Complete">
                                <i class='bx bx-check'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Overdue' ? `
                            <button class="process-overdue-btn" data-id="${transaction.id}" title="Process Overdue">
                                <i class='bx bx-time-five'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Upcoming' ? `
                            <button class="cancel-rental-btn" data-id="${transaction.id}" title="Cancel Rental">
                                <i class='bx bx-x'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Cancelled' ? `
                            <button class="undo-cancel-btn" data-id="${transaction.id}" title="Undo Cancellation">
                                <i class='bx bx-undo'></i>
                            </button>
                        ` : ''}
                    </div>
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
        // Determine payment status text with balance
        let paymentStatusText;
        if (remainingBalance > 0) {
            paymentStatusText = `Bal: ₱${remainingBalance.toLocaleString()}`;
        } else {
            paymentStatusText = 'Fully Paid';
        }
        
        const card = `
            <div class="transaction-card" data-transaction-id="${transaction.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="customer-info-centered">
                            <h4 title="${transaction.fullName || 'Unknown Customer'}">${transaction.fullName || 'Unknown Customer'}</h4>
                            <span class="transaction-code">${transaction.transactionCode || transaction.id.substring(0, 8)}</span>
                        </div>
                        <div class="card-status-top">
                            <span class="status-badge ${statusClass}">${rentalStatus}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="card-details">
                            <div class="detail-item">
                                <span class="detail-label">Event Date</span>
                                <span class="detail-value">${eventDateDisplay}</span>
                            </div>
                            <div class="card-details-row">
                                <div class="detail-item">
                                    <span class="detail-label">Payment Status</span>
                                    <span class="detail-value">${paymentStatusText}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Total Amount</span>
                                    <span class="detail-value amount">₱${totalPayment.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-actions-bottom">
                    <div class="card-actions">
                        <button class="card-action-btn view-details-btn" data-id="${transaction.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        ${(() => {
                            const editValidation = canEditTransaction(transaction);
                            if (editValidation.canEdit) {
                                return `<button class="card-action-btn edit-btn" data-id="${transaction.id}" title="Edit Transaction">
                                    <i class='bx bx-edit'></i>
                                </button>`;
                            } else {
                                return `<button class="card-action-btn edit-btn disabled" data-id="${transaction.id}" title="${editValidation.reason}" disabled>
                                    <i class='bx bx-edit'></i>
                                </button>`;
                            }
                        })()}
                        <button class="card-action-btn delete-btn" data-id="${transaction.id}" title="Delete Transaction">
                            <i class='bx bx-trash'></i>
                        </button>
                        ${rentalStatus === 'Ongoing' ? `
                            <button class="card-action-btn mark-complete-btn" data-id="${transaction.id}" title="Mark as Complete">
                                <i class='bx bx-check'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Overdue' ? `
                            <button class="card-action-btn process-overdue-btn" data-id="${transaction.id}" title="Process Overdue">
                                <i class='bx bx-time-five'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Upcoming' ? `
                            <button class="card-action-btn cancel-rental-btn" data-id="${transaction.id}" title="Cancel Rental">
                                <i class='bx bx-x'></i>
                            </button>
                        ` : ''}
                        ${rentalStatus === 'Cancelled' ? `
                            <button class="card-action-btn undo-cancel-btn" data-id="${transaction.id}" title="Undo Cancellation">
                                <i class='bx bx-undo'></i>
                            </button>
                        ` : ''}
                    </div>
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
            // Past end date - calculate actual end date based on rental type
            let actualEndDate = rentalEndDate;
            
            if (transaction.rentalType === 'Fixed Rental') {
                // For Fixed Rental: recalculate end date as start + 2 days
                actualEndDate = new Date(rentalStartDate);
                actualEndDate.setDate(actualEndDate.getDate() + 2);
            }
            
            // Overdue starts the day after actual end date
            const overdueStartDate = new Date(actualEndDate);
            overdueStartDate.setDate(overdueStartDate.getDate() + 1);
            
            if (today >= overdueStartDate) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
                console.log('📅 Past actual end date + 1 day → OVERDUE');
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
                console.log('📅 Event ended but within grace period → ONGOING');
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
            // Past event date - calculate actual end date based on rental type
            let actualEndDate = rentalStartDate;
            
            if (transaction.rentalType === 'Fixed Rental') {
                // For Fixed Rental: end date is start + 2 days
                actualEndDate = new Date(rentalStartDate);
                actualEndDate.setDate(actualEndDate.getDate() + 2);
            }
            
            // Overdue starts the day after actual end date
            const overdueStartDate = new Date(actualEndDate);
            overdueStartDate.setDate(overdueStartDate.getDate() + 1);
            
            if (today >= overdueStartDate) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
                console.log('📅 Past actual end date + 1 day → OVERDUE');
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
                console.log('📅 Event ended but within grace period → ONGOING');
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
        // For fixed rentals, display date and label inline
        return `${eventStartDate.toLocaleDateString()} (Fixed Rental)`;
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
            if (window.showMarkCompleteConfirmation) {
                window.showMarkCompleteConfirmation(transactionId);
            } else {
                // Fallback to the original function if modal is not available
                markTransactionAsComplete(transactionId);
            }
        });
    });// Process Overdue buttons
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
                    
                    ${transaction.feeType && transaction.additionalAmount ? `
                    <div class="fee-item">
                        <p><strong>Additional Fee (${transaction.feeType}):</strong> 
                            <span class="fee-amount">₱${parseFloat(transaction.additionalAmount).toLocaleString()}</span>
                        </p>
                        <p class="fee-reason"><em>Type: ${transaction.feeType}</em></p>
                    </div>
                    ` : ''}
                </div>
                  ${(transaction.overdueFee?.overdueAmount || transaction.repairFee?.amount || transaction.depositFee?.amount || transaction.otherFee?.amount || transaction.additionalAmount) ? `
                <div class="total-additional-fees">
                    <p><strong>Total Additional Fees:</strong> 
                        <span class="total-fee-amount">₱${(
                            (parseFloat(transaction.overdueFee?.overdueAmount) || 0) +
                            (parseFloat(transaction.repairFee?.amount) || 0) +
                            (parseFloat(transaction.depositFee?.amount) || 0) +
                            (parseFloat(transaction.otherFee?.amount) || 0) +
                            (parseFloat(transaction.additionalAmount) || 0)
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
            ` : ''}              <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeTransactionDetailsModal()">
                    <i class='bx bx-x'></i> Close
                </button>
                ${(() => {
                    const editValidation = canEditTransaction(transaction);
                    if (editValidation.canEdit) {
                        return `<button type="button" class="btn-primary" onclick="openEditFromDetails('${transaction.id}')">
                            <i class='bx bx-edit'></i> Edit Transaction
                        </button>`;
                    } else {
                        return `<button type="button" class="btn-disabled" disabled title="${editValidation.reason}">
                            <i class='bx bx-edit'></i> Edit Transaction
                        </button>`;
                    }
                })()}
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
    // Find the transaction
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        if (window.showNotification) {
            window.showNotification('Transaction not found', 'error');
        }
        return;
    }
    
    // Validate if transaction can be edited
    const editValidation = canEditTransaction(transaction);
    if (!editValidation.canEdit) {
        if (window.showNotification) {
            window.showNotification(editValidation.reason, 'error');
        } else {
            alert(editValidation.reason);
        }
        return;
    }
    
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

// Mobile search functionality (syncs with desktop search)
function handleSearchMobile() {
    const searchTerm = searchInputMobile.value.toLowerCase().trim();
    
    // Sync with desktop search input
    if (searchInput) {
        searchInput.value = searchInputMobile.value;
    }
    
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
    
    if (!currentEditingTransaction || !currentEditingTransaction.id) {
        console.error('No valid transaction selected for editing');
        alert('No transaction selected for editing. Please try again.');
        return;
    }
    
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
    
    // Get submit button and store original text outside try block
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
    
    try {
        // Show loading state
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
            submitBtn.disabled = true;
        }
        
        // Update document in Firebase
        await updateDoc(doc(chandriaDB, 'transaction', currentEditingTransaction.id), updatedData);
        
        // Store transaction ID before closing modal (since closeEditModal sets currentEditingTransaction to null)
        const transactionId = currentEditingTransaction.id;
        
        // Update local data
        const index = allTransactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            allTransactions[index] = { ...allTransactions[index], ...updatedData };
            filteredTransactions = [...allTransactions];
        }
        
        // Close modal
        closeEditModal();
        
        // Use real-time updater for immediate UI changes
        if (window.realTimeUpdater) {
            window.realTimeUpdater.updateTransaction(transactionId, updatedData);
        } else {
            // Fallback: refresh view
            if (currentView === 'cards') {
                renderTransactionCards();
            } else {
                renderTransactionTable();
            }
        }
        
        // Show success message
        showSuccessMessage('Transaction updated successfully!');
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Error updating transaction. Please try again.');
        
        // Restore button state
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Delete transaction function
function deleteTransaction(transactionId) {
    console.log('deleteTransaction called with ID:', transactionId);
    
    if (!transactionId) {
        console.error('No transaction ID provided');
        alert('Error: No transaction ID provided.');
        return;
    }
    
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found with ID:', transactionId);
        alert('Transaction not found. It may have been already deleted or moved.');
        return;
    }
    
    console.log('Found transaction for deletion:', transaction);
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
    
    // Reset the confirmation input and button state
    const confirmInput = document.getElementById('delete-confirmation-input');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (confirmInput) {
        confirmInput.value = '';
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="bx bx-trash"></i> DELETE FOREVER';
    }
    
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
    console.log('confirmDelete called');
    
    if (!currentDeletingTransaction) {
        console.error('No transaction to delete');
        alert('Error: No transaction selected for deletion.');
        return;
    }
    
    // Additional safety check
    if (!currentDeletingTransaction.id) {
        console.error('Transaction missing ID:', currentDeletingTransaction);
        alert('Error: Invalid transaction data.');
        return;
    }
    
    // Check if the button is disabled
    const deleteBtn = document.getElementById('confirm-delete-btn');
    if (!deleteBtn) {
        console.error('Delete button not found');
        return;
    }
    
    if (deleteBtn.disabled) {
        console.log('Delete button is disabled, not proceeding');
        return;
    }
    
    // Verify the input confirmation
    const input = document.getElementById('delete-confirmation-input');
    if (!input || input.value.toUpperCase() !== 'DELETE') {
        console.log('Confirmation text is not correct');
        return;
    }
    
    try {
        console.log('Starting deletion process for:', currentDeletingTransaction.id);
        
        // Store the transaction ID before closing modal (to avoid null reference)
        const transactionId = currentDeletingTransaction.id;
        
        // Show loading state
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        deleteBtn.disabled = true;
          // Delete document from Firebase
        console.log('Deleting document from Firebase...');
        await deleteDoc(doc(chandriaDB, 'transaction', transactionId));
        console.log('Document deleted successfully');
          // Remove from local arrays
        allTransactions = allTransactions.filter(t => t.id !== transactionId);
        filteredTransactions = filteredTransactions.filter(t => t.id !== transactionId);
        
        // Update global references
        window.allTransactions = allTransactions;
        window.filteredTransactions = filteredTransactions;
        
        // Close modal (this will set currentDeletingTransaction to null)
        closeDeleteModal();
        
        // Use real-time updater for immediate UI changes (use stored ID)
        if (window.realTimeUpdater) {
            window.realTimeUpdater.removeTransaction(transactionId);
        } else {
            // Fallback: update count and re-render
            updateTransactionCount();
            if (currentView === 'cards') {
                renderTransactionCards();
            } else {
                renderTransactionTable();
            }
        }
        
        // Show success message
        showSuccessMessage('Transaction deleted successfully!');
        console.log('Deletion process completed successfully');
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            transactionId: currentDeletingTransaction ? currentDeletingTransaction.id : 'N/A'
        });
        
        alert(`Error deleting transaction: ${error.message}. Please try again.`);
        
        // Restore button state if button still exists
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bx bx-trash"></i> DELETE FOREVER';
            deleteBtn.disabled = true; // Keep disabled until confirmation is re-entered
        }
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
    // Use the new confirmation modal instead of browser confirm
    if (window.showMarkCompleteConfirmation) {
        window.showMarkCompleteConfirmation(transactionId);
    } else {
        // Fallback to original method if modal functions are not available
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
            showNotification('Transaction marked as completed successfully!', 'success');

        } catch (error) {
            console.error('Error marking transaction as complete:', error);
            document.querySelector('.admin-action-spinner').style.display = 'none';
            showNotification('Error marking transaction as complete. Please try again.', 'error');
        }
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
        }        

        // Use real-time updater for immediate UI changes
        if (window.realTimeUpdater) {
            window.realTimeUpdater.updateTransaction(transactionId, {
                rentalStatus: 'Cancelled',
                cancelledDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } else {
            // Fallback: Re-filter and re-render
            filterTransactions();
        }
          // Hide loading
        hideActionSpinner();

        // Show red rental cancelled notification
        if (window.showRentalCancelledNotification) {
            window.showRentalCancelledNotification();
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

        // Use real-time updater for immediate UI changes
        if (window.realTimeUpdater) {
            window.realTimeUpdater.updateTransaction(currentCancelTransaction.id, {
                rentalStatus: 'Cancelled',
                cancelledDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        } else {
            // Fallback: Re-render the views
            if (currentView === 'cards') {
                renderTransactionCards();
            } else {
                renderTransactionTable();
            }
        }

        // Close modal
        closeCancelRentalModal();        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';        // Show red rental cancelled notification
        if (window.showRentalCancelledNotification) {
            window.showRentalCancelledNotification();
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
    
    // Debug: Log transaction data to check field names
    console.log('Transaction data for overdue calculation:', {
        id: transaction.id,
        eventStartDate: transaction.eventStartDate,
        eventEndDate: transaction.eventEndDate,
        rentalType: transaction.rentalType,
        rentalFee: transaction.rentalFee,
        totalAmount: transaction.totalAmount
    });
    
    // Populate modal with transaction details
    document.getElementById('overdue-customer-name').textContent = transaction.fullName || 'Unknown';
    document.getElementById('overdue-transaction-code').textContent = transaction.transactionCode || 'N/A';
    document.getElementById('overdue-event-date').textContent = formatEventDate(transaction);
    document.getElementById('overdue-total-amount').textContent = `₱${transaction.totalAmount ? transaction.totalAmount.toLocaleString() : '0'}`;
    
    // Calculate overdue days based on rental type
    let overdueDays = 0;
    let actualEndDate = null;
    const today = new Date();
    const eventStartDate = new Date(transaction.eventStartDate);
    
    console.log('Transaction data for overdue calculation:', {
        id: transaction.id,
        eventStartDate: transaction.eventStartDate,
        eventEndDate: transaction.eventEndDate,
        rentalType: transaction.rentalType,
               rentalFee: transaction.rentalFee
    });
    
    if (transaction.rentalType === 'Fixed Rental') {
        // For Fixed Rental: 3-day rental starting from event start date
        // If start date is June 23, rental period is June 23, 24, 25
        // So end date is June 25, overdue starts June 26
        actualEndDate = new Date(eventStartDate);
        actualEndDate.setDate(actualEndDate.getDate() + 2); // Add 2 days for 3-day rental
        
        const overdueStartDate = new Date(actualEndDate);
        overdueStartDate.setDate(overdueStartDate.getDate() + 1);
        
        if (today > overdueStartDate) {
            const diffTime = today - overdueStartDate;
            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        console.log('Fixed Rental calculation:', {
            eventStartDate: eventStartDate.toDateString(),
            actualEndDate: actualEndDate.toDateString(),
            overdueStartDate: overdueStartDate.toDateString(),
            today: today.toDateString(),
            overdueDays: overdueDays
        });
        
    } else if (transaction.rentalType === 'Open Rental') {
        // For Open Rental: use the provided event end date
        // If event is June 20-22, overdue starts June 23
        if (transaction.eventEndDate) {
            actualEndDate = new Date(transaction.eventEndDate);
            
            const overdueStartDate = new Date(actualEndDate);
            overdueStartDate.setDate(overdueStartDate.getDate() + 1);
            
            if (today > overdueStartDate) {
                const diffTime = today - overdueStartDate;
                overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            
            console.log('Open Rental calculation:', {
                eventEndDate: actualEndDate.toDateString(),
                overdueStartDate: overdueStartDate.toDateString(),
                today: today.toDateString(),
                overdueDays: overdueDays
            });
        }
    }

    // Ensure overdue days is not negative
    overdueDays = Math.max(0, overdueDays);
    
    console.log('Final calculated overdue days:', overdueDays);

    // Calculate overdue fee (rental fee × overdue days)
    const rentalFee = parseFloat(transaction.rentalFee) || parseFloat(transaction.totalPayment) || 0;
    const calculatedOverdueFee = rentalFee * overdueDays;

    console.log('Overdue fee calculation:', {
        rentalFee: rentalFee,
        overdueDays: overdueDays,
        calculatedOverdueFee: calculatedOverdueFee
    });

    // Update modal content
    document.getElementById('overdue-customer-name').textContent = transaction.fullName;
    document.getElementById('overdue-transaction-code').textContent = transaction.transactionCode;
    document.getElementById('overdue-event-date').textContent = formatEventDate(transaction);
    
    // Display overdue fee instead of days
    document.getElementById('overdue-fee-amount').textContent = `₱${calculatedOverdueFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Display remaining balance
    const remainingBalance = parseFloat(transaction.remainingBalance) || 0;
    document.getElementById('overdue-remaining-balance').textContent = `₱${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Calculate total amount: overdue fee + remaining balance (do NOT include original rental amount)
    const totalAmount = calculatedOverdueFee + remainingBalance;
    document.getElementById('overdue-total-amount').textContent = `₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // Update calculation display
    document.getElementById('original-rental-fee').textContent = `₱${rentalFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('overdue-days-display').textContent = `${overdueDays} days`;
    document.getElementById('calculated-overdue-fee').textContent = `₱${calculatedOverdueFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Store the calculated fee and overdue days for later use
    window.calculatedOverdueFee = calculatedOverdueFee;
    window.calculatedOverdueDays = overdueDays;
    window.actualEndDate = actualEndDate;
    
    // Reset form - always show fee section
    document.getElementById('late-fee-section').style.display = 'block';
    document.getElementById('late-fee-reason').value = 'late-return';
    
    // Reset payment section
    document.getElementById('overdue-payment-type').value = '';
    document.getElementById('overdue-payment-reference').value = '';
    document.getElementById('payment-reference-group').style.display = 'none';
    
    // Show modal immediately
    const modal = document.getElementById('process-overdue-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Prevent background interaction
    document.body.classList.add('modal-open');
    
    // Add event listeners for payment type selection
    setupPaymentTypeListener();
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

// Setup event listeners for the modal - no longer needed
function setupOverdueModalListeners() {
    // Radio buttons removed - fee section is always visible
}

// Setup payment type listener
function setupPaymentTypeListener() {
    const paymentTypeSelect = document.getElementById('overdue-payment-type');
    const referenceGroup = document.getElementById('payment-reference-group');
    const referenceInput = document.getElementById('overdue-payment-reference');
    
    // Remove any existing event listeners
    paymentTypeSelect.removeEventListener('change', handlePaymentTypeChange);
    
    // Add event listener
    paymentTypeSelect.addEventListener('change', handlePaymentTypeChange);
}

// Handle payment type change
function handlePaymentTypeChange() {
    const paymentType = document.getElementById('overdue-payment-type').value;
    const referenceGroup = document.getElementById('payment-reference-group');
    const referenceInput = document.getElementById('overdue-payment-reference');
    
    if (paymentType === 'Cash') {
        // Hide reference field for cash payments
        referenceGroup.style.display = 'none';
        referenceInput.removeAttribute('required');
        referenceInput.value = '';
    } else if (paymentType === 'GCash' || paymentType === 'PayMaya' || paymentType === 'GoTyme') {
        // Show reference field for digital payments
        referenceGroup.style.display = 'block';
        referenceInput.setAttribute('required', 'required');
    } else {
        // Hide reference field if no payment type selected
        referenceGroup.style.display = 'none';
        referenceInput.removeAttribute('required');
        referenceInput.value = '';
    }
}

// Confirm Process Overdue
async function confirmProcessOverdue() {
    if (!currentOverdueTransaction) return;
    
    // Always apply overdue fee - no radio button selection needed
    const feeReason = document.getElementById('late-fee-reason').value;
    const calculatedFee = window.calculatedOverdueFee || 0;
    const paymentType = document.getElementById('overdue-payment-type').value;
    const paymentReference = document.getElementById('overdue-payment-reference').value;
    
    // Validate required fields
    if (!feeReason) {
        showNotification('Please select a reason for the overdue fee', 'error');
        document.getElementById('late-fee-reason').focus();
        return;
    }
    
    if (!paymentType) {
        showNotification('Payment Type is required. Please select a payment method.', 'error');
        document.getElementById('overdue-payment-type').focus();
        return;
    }
    
    // Validate reference number for digital payments
    if ((paymentType === 'GCash' || paymentType === 'PayMaya' || paymentType === 'GoTyme') && !paymentReference.trim()) {
        showNotification('Reference Number is required for digital payments.', 'error');
        document.getElementById('overdue-payment-reference').focus();
        return;
    }
    
    // Validate reference number format (numbers only) for digital payments
    if ((paymentType === 'GCash' || paymentType === 'PayMaya' || paymentType === 'GoTyme') && paymentReference.trim() && !/^\d+$/.test(paymentReference.trim())) {
        showNotification('Reference number must contain numbers only.', 'error');
        document.getElementById('overdue-payment-reference').focus();
        return;
    }
    
    try {
        // Show loading and disable button
        const confirmBtn = document.getElementById('confirm-process-overdue-btn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
        confirmBtn.disabled = true;
        
        document.querySelector('.admin-action-spinner').style.display = 'flex';
        
        const transactionRef = doc(chandriaDB, 'transaction', currentOverdueTransaction.id);
        const updateData = {
            processedOverdue: true,
            updatedAt: new Date().toISOString(),
            returnConfirmed: true,
            completedDate: new Date().toISOString(),
            overdueFee: {
                overdueAmount: calculatedFee,
                overdueReason: feeReason,
                overdueDays: window.calculatedOverdueDays || 0,
                rentalType: currentOverdueTransaction.rentalType,
                addedDate: new Date().toISOString(),
                notes: document.getElementById('late-fee-notes').value || '',
                paymentMethod: paymentType,
                referenceNumber: paymentType !== 'Cash' ? paymentReference.trim() : null
            }
        };
        
        // Update total amount - only add overdue fee to existing total
        const newTotal = (currentOverdueTransaction.totalAmount || 0) + calculatedFee;
        updateData.totalAmount = newTotal;
        
        // Update the transaction in Firebase
        await updateDoc(transactionRef, updateData);
        
        // Update local data
        const transactionIndex = allTransactions.findIndex(t => t.id === currentOverdueTransaction.id);
        if (transactionIndex !== -1) {
            Object.assign(allTransactions[transactionIndex], updateData);
        }
        
        // Close modal
        closeProcessOverdueModal();
        
        // Use real-time updater for immediate UI changes
        if (window.realTimeUpdater) {
            window.realTimeUpdater.updateTransaction(currentOverdueTransaction.id, updateData);
        } else {
            // Fallback: refresh
            filterTransactions();
        }
        
        // Hide loading
        document.querySelector('.admin-action-spinner').style.display = 'none';        // Show success message
        let successMessage = '';
        if (selectedAction === 'completed') {
            successMessage = 'Overdue Processed. Product is now Completed.';
        } else if (selectedAction === 'late-fee') {
            const calculatedFee = window.calculatedOverdueFee || 0;
            const overdueDays = window.calculatedOverdueDays || 0;
            successMessage = `Rental completed with ₱${calculatedFee.toLocaleString('en-US', { minimumFractionDigits: 2 })} overdue fee (${overdueDays} days overdue)`;
        }
        
        showNotification('Overdue rental processed successfully!', 'success');
      } catch (error) {
        console.error('Error processing overdue rental:', error);
        
        // Reset button state
        const confirmBtn = document.getElementById('confirm-process-overdue-btn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bx bx-check"></i> Process Rental';
            confirmBtn.disabled = false;
        }
        
        document.querySelector('.admin-action-spinner').style.display = 'none';
        showNotification('Failed to process overdue rental. Please try again.', 'error');
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

// Export delete function needed by HTML onclick
window.confirmDelete = confirmDelete;

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

// Validation function to check if transaction can be edited
function canEditTransaction(transaction) {
    // Allow editing of all transactions regardless of status, date, or other conditions
    return {
        canEdit: true,
        reason: null
    };
}
