/**
 * Customer Logs Undo Cancellation Modal
 * Handles the modal interface for undoing rental cancellations
 */

// Import Firebase configuration (same as main service)
import { chandriaDB, doc, updateDoc } from './sdk/chandrias-sdk.js';

// Modal state
let currentTransactionToUndo = null;

/**
 * Fallback function to calculate rental status if main service function is not available
 * @param {Object} transaction - The transaction object
 * @returns {Object} - Contains rentalStatus and statusClass
 */
function calculateRentalStatusFallback(transaction) {
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
                // Check if it's overdue (1 day grace period)
                const gracePeriod = new Date(eventEndDate);
                gracePeriod.setDate(gracePeriod.getDate() + 1);
                
                if (currentDate > gracePeriod) {
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
                
                if (currentDate > gracePeriod) {
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

/**
 * Opens the undo cancellation modal with transaction data
 * @param {string} transactionId - The ID of the transaction to undo cancellation for
 */
function openUndoCancelModal(transactionId) {
    // Find the transaction data from global allTransactions array
    const transaction = window.allTransactions?.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found');
        return;
    }

    // Store the current transaction for later use
    currentTransactionToUndo = transaction;

    // Populate modal with transaction data
    populateUndoModalData(transaction);

    // Calculate and display the predicted status
    updatePredictedStatus(transaction);

    // Show the modal
    const modal = document.getElementById('undo-cancel-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

/**
 * Closes the undo cancellation modal
 */
function closeUndoCancelModal() {
    const modal = document.getElementById('undo-cancel-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Clear the current transaction
    currentTransactionToUndo = null;
}

/**
 * Populates the modal with transaction data
 * @param {Object} transaction - The transaction object
 */
function populateUndoModalData(transaction) {
    // Customer name
    const customerNameEl = document.getElementById('undo-customer-name');
    if (customerNameEl) {
        customerNameEl.textContent = transaction.fullName || 'Unknown';
    }

    // Transaction code
    const transactionCodeEl = document.getElementById('undo-transaction-code');
    if (transactionCodeEl) {
        transactionCodeEl.textContent = transaction.transactionCode || 'N/A';
    }

    // Event start date
    const eventStartDateEl = document.getElementById('undo-event-start-date');
    if (eventStartDateEl) {
        if (transaction.eventStartDate) {
            const startDate = new Date(transaction.eventStartDate);
            eventStartDateEl.textContent = startDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            eventStartDateEl.textContent = 'Not specified';
        }
    }

    // Event end date
    const eventEndDateEl = document.getElementById('undo-event-end-date');
    if (eventEndDateEl) {
        if (transaction.eventEndDate) {
            const endDate = new Date(transaction.eventEndDate);
            eventEndDateEl.textContent = endDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            eventEndDateEl.textContent = 'Same as start date';
        }
    }

    // Total amount
    const totalAmountEl = document.getElementById('undo-total-amount');
    if (totalAmountEl) {
        const amount = transaction.totalAmount || transaction.amount || 0;
        totalAmountEl.textContent = `₱${parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

/**
 * Updates the predicted status based on current date and event dates
 * @param {Object} transaction - The transaction object
 */
function updatePredictedStatus(transaction) {
    const predictedStatusEl = document.getElementById('predicted-status');
    if (!predictedStatusEl) return;

    // Use the same calculation logic as the main service (access via window)
    const { rentalStatus, statusClass } = window.calculateOriginalRentalStatus ? 
        window.calculateOriginalRentalStatus(transaction) : 
        calculateRentalStatusFallback(transaction);

    // Update the status badge
    predictedStatusEl.textContent = rentalStatus;
    predictedStatusEl.className = `status-badge ${statusClass}`;

    // Update button text based on status
    const confirmBtn = document.getElementById('confirm-undo-cancel-btn');
    if (confirmBtn) {
        confirmBtn.innerHTML = `<i class='bx bx-undo'></i> Restore to "${rentalStatus}"`;
    }
}

/**
 * Confirms and processes the undo cancellation
 */
async function confirmUndoCancel() {
    if (!currentTransactionToUndo) {
        console.error('No transaction selected for undo');
        return;
    }

    try {
        // Disable the confirm button to prevent double-clicks
        const confirmBtn = document.getElementById('confirm-undo-cancel-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
        }

        // Show loading spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'flex';
        }        // Get the predicted status
        const { rentalStatus: originalStatus } = window.calculateOriginalRentalStatus ? 
            window.calculateOriginalRentalStatus(currentTransactionToUndo) :
            calculateRentalStatusFallback(currentTransactionToUndo);

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', currentTransactionToUndo.id);
        const updateData = {
            rentalStatus: null, // Remove the cancelled status
            lastUpdated: new Date().toISOString()
        };

        // Remove cancellation date if it exists
        if (currentTransactionToUndo.cancelledDate) {
            updateData.cancelledDate = null;
        }

        await updateDoc(transactionRef, updateData);        // Update local data (use global arrays)
        if (window.allTransactions) {
            const transactionIndex = window.allTransactions.findIndex(t => t.id === currentTransactionToUndo.id);
            if (transactionIndex !== -1) {
                delete window.allTransactions[transactionIndex].rentalStatus;
                delete window.allTransactions[transactionIndex].cancelledDate;
                window.allTransactions[transactionIndex].lastUpdated = new Date().toISOString();
            }
        }

        // Update filtered transactions
        if (window.filteredTransactions) {
            const filteredIndex = window.filteredTransactions.findIndex(t => t.id === currentTransactionToUndo.id);
            if (filteredIndex !== -1) {
                delete window.filteredTransactions[filteredIndex].rentalStatus;
                delete window.filteredTransactions[filteredIndex].cancelledDate;
                window.filteredTransactions[filteredIndex].lastUpdated = new Date().toISOString();
            }
        }

        // Hide loading spinner
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Close the modal
        closeUndoCancelModal();        // Re-render the views (use global functions)
        if (window.currentView) {
            if (window.currentView === 'cards') {
                if (window.renderTransactionCards) {
                    window.renderTransactionCards();
                }
            } else {
                if (window.renderTransactionTable) {
                    window.renderTransactionTable();
                }
            }
        }

        // Show success notification
        if (window.showSuccessToast) {
            window.showSuccessToast(`Cancellation undone! Status changed to "${originalStatus}".`);
        } else {
            // Fallback to alert if toast function not available
            alert(`Cancellation undone! Status changed to "${originalStatus}".`);
        }

    } catch (error) {
        console.error('Error undoing cancellation:', error);
        
        // Hide loading spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }
        
        // Re-enable button
        const confirmBtn = document.getElementById('confirm-undo-cancel-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-undo"></i> Restore Rental';
        }
        
        // Show error notification
        alert('Error undoing cancellation. Please try again.');
    }
}

/**
 * Handles modal click outside to close
 */
document.addEventListener('click', (e) => {
    if (e.target.id === 'undo-cancel-modal' && e.target.classList.contains('undo-modal-overlay')) {
        closeUndoCancelModal();
    }
});

/**
 * Handles ESC key to close modal
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('undo-cancel-modal');
        if (modal && modal.classList.contains('show')) {
            closeUndoCancelModal();
        }
    }
});

/**
 * Replace the existing undo cancellation functionality
 * This function will be called instead of the original undoCancellation function
 */
function undoCancellation(transactionId) {
    openUndoCancelModal(transactionId);
}

// Export functions for global access (if needed)
if (typeof window !== 'undefined') {
    window.openUndoCancelModal = openUndoCancelModal;
    window.closeUndoCancelModal = closeUndoCancelModal;
    window.confirmUndoCancel = confirmUndoCancel;
    window.undoCancellation = undoCancellation;
}
