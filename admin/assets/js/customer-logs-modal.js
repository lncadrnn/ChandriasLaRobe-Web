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
    
    // Get all possible date fields
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
    const eventDate = transaction.eventDate ? new Date(transaction.eventDate) : null;
    
    // Normalize current date to ignore time components
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    let rentalStatus = 'Upcoming';
    let statusClass = 'status-upcoming';
    
    // Priority 1: Check if rental has been cancelled
    if (transaction.rentalStatus === 'Cancelled') {
        return { rentalStatus: 'Cancelled', statusClass: 'status-cancelled' };
    }
    
    // Priority 2: Check if rental has been marked as completed
    if (transaction.returnConfirmed) {
        return { rentalStatus: 'Completed', statusClass: 'status-completed' };
    }
    
    // Priority 3: Calculate status based on dates
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
        return { rentalStatus: 'Upcoming', statusClass: 'status-upcoming' };
    }
    
    if (rentalEndDate) {
        // MULTI-DAY RENTAL (has both start and end dates)
        if (today < rentalStartDate) {
            // Event hasn't started yet
            rentalStatus = 'Upcoming';
            statusClass = 'status-upcoming';
        } else if (today >= rentalStartDate && today <= rentalEndDate) {
            // Currently within the event period
            rentalStatus = 'Ongoing';
            statusClass = 'status-ongoing';
        } else if (today > rentalEndDate) {
            // Past end date - check if it's overdue (3 days after end date)
            const overduePeriod = new Date(rentalEndDate);
            overduePeriod.setDate(overduePeriod.getDate() + 3);
            
            if (today > overduePeriod) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
            }
        }
    } else {
        // SINGLE-DAY RENTAL (only start date, no end date)
        if (today < rentalStartDate) {
            // Event is in the future
            rentalStatus = 'Upcoming';
            statusClass = 'status-upcoming';
        } else if (today.getTime() === rentalStartDate.getTime()) {
            // Event is today
            rentalStatus = 'Ongoing';
            statusClass = 'status-ongoing';
        } else if (today > rentalStartDate) {
            // Past event date - check if it's overdue (3+ days after event)
            const daysDiff = Math.floor((today - rentalStartDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 3) {
                rentalStatus = 'Overdue';
                statusClass = 'status-overdue';
            } else {
                rentalStatus = 'Ongoing';
                statusClass = 'status-ongoing';
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
    const predictedStatus = calculateNewStatusAfterUndo(transaction);
    const statusBadge = document.getElementById('predicted-status-badge');
    const statusText = document.getElementById('predicted-status-text');
    const statusExplanation = document.getElementById('status-explanation');
    
    if (statusText) {
        statusText.textContent = predictedStatus;
    }
    
    if (statusBadge) {
        // Remove existing status classes
        statusBadge.classList.remove('upcoming', 'ongoing', 'overdue', 'completed');
        // Add new status class
        statusBadge.classList.add(predictedStatus.toLowerCase());
    }
    
    if (statusExplanation) {
        let explanation = '';
        switch (predictedStatus) {
            case 'Upcoming':
                explanation = 'The event date is in the future, so the rental will be marked as upcoming.';
                break;
            case 'Ongoing':
                explanation = 'The event is currently happening or recently ended (within 3 days).';
                break;
            case 'Overdue':
                explanation = 'The event ended more than 3 days ago, making this rental overdue.';
                break;
            case 'Completed':
                explanation = 'The rental has been marked as completed with items returned.';
                break;
            default:
                explanation = 'The rental status will be automatically determined based on the event dates.';
        }
        statusExplanation.textContent = explanation;
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
        // Show loading state
        const confirmBtn = document.getElementById('confirm-undo-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
        }

        // Show action spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'flex';
        }

        // Validate that the transaction is actually cancelled
        if (currentTransactionToUndo.rentalStatus !== 'Cancelled') {
            throw new Error('This transaction is not cancelled and cannot be undone');
        }

        // Calculate the new status based on current date and event dates
        const newStatus = calculateNewStatusAfterUndo(currentTransactionToUndo);

        // Update transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', currentTransactionToUndo.id);
        const updateData = {
            rentalStatus: newStatus,
            lastUpdated: new Date().toISOString(),
            cancellationUndone: true,
            cancellationUndoneDate: new Date().toISOString()
        };

        // Remove cancellation-related fields
        if (currentTransactionToUndo.cancelledDate) {
            updateData.cancelledDate = null;
        }

        await updateDoc(transactionRef, updateData);

        // Update local data in global arrays
        if (window.allTransactions) {
            const transactionIndex = window.allTransactions.findIndex(t => t.id === currentTransactionToUndo.id);
            if (transactionIndex !== -1) {
                Object.assign(window.allTransactions[transactionIndex], updateData);
            }
        }

        // Update filtered transactions
        if (window.filteredTransactions) {
            const filteredIndex = window.filteredTransactions.findIndex(t => t.id === currentTransactionToUndo.id);
            if (filteredIndex !== -1) {
                Object.assign(window.filteredTransactions[filteredIndex], updateData);
            }
        }

        // Close modal
        closeUndoCancelModal();

        // Hide loading spinner
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Re-render the views
        if (window.currentView) {
            if (window.currentView === 'cards') {
                if (window.renderTransactionCards) {
                    await window.renderTransactionCards();
                }
            } else {
                if (window.renderTransactionTable) {
                    await window.renderTransactionTable();
                }
            }
        }        // Show success notification with the new modal
        showCancellationUndoneModal(newStatus, `Cancellation undone successfully! The rental status has been updated to ${newStatus}.`);

        console.log('Cancellation undone successfully, new status:', newStatus);

    } catch (error) {
        console.error('Error undoing cancellation:', error);

        // Hide loading spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Reset button state
        const confirmBtn = document.getElementById('confirm-undo-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-undo"></i> Confirm Undo';
        }

        // Show error notification
        if (window.showNotification) {
            window.showNotification('Error undoing cancellation: ' + (error.message || 'Please try again.'), 'error');
        } else {
            alert('Error undoing cancellation: ' + (error.message || 'Please try again.'));        }
    }
}

/**
 * Calculates what the new status should be after undoing cancellation
 * @param {Object} transaction - The transaction object
 * @returns {string} - The new rental status
 */
function calculateNewStatusAfterUndo(transaction) {
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get event dates
    const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
    const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
    const eventDate = transaction.eventDate ? new Date(transaction.eventDate) : null;
    
    // Determine the effective start and end dates
    let startDate = eventStartDate || eventDate;
    let endDate = eventEndDate || eventDate;
    
    if (!startDate) {
        return 'Upcoming'; // Default if no dates are available
    }
    
    // Normalize dates to ignore time components
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (endDate) {
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    }
    
    // Determine status based on dates
    if (currentDate < startDate) {
        return 'Upcoming';
    } else if (endDate && currentDate <= endDate) {
        return 'Ongoing';
    } else if (endDate && currentDate > endDate) {
        // Check if it's overdue (3+ days after end date)
        const daysPastEnd = Math.floor((currentDate - endDate) / (1000 * 60 * 60 * 24));
        if (daysPastEnd >= 3) {
            return 'Overdue';
        } else {
            return 'Ongoing';
        }
    } else {
        // Single day event that has passed
        const daysPastEvent = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysPastEvent >= 3) {
            return 'Overdue';
        } else {
            return 'Ongoing';
        }
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

/**
 * Enhanced cancel rental function that ensures global array updates
 * @param {string} transactionId - The ID of the transaction to cancel
 */
async function cancelRentalWithGlobalUpdate(transactionId) {
    try {
        const transaction = window.allTransactions?.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('Transaction not found');
            return;
        }

        // Show loading
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'flex';
        }

        // Update the transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', transactionId);
        await updateDoc(transactionRef, {
            rentalStatus: 'Cancelled',
            cancelledDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });

        // Update local data in global arrays
        if (window.allTransactions) {
            const transactionIndex = window.allTransactions.findIndex(t => t.id === transactionId);
            if (transactionIndex !== -1) {
                window.allTransactions[transactionIndex].rentalStatus = 'Cancelled';
                window.allTransactions[transactionIndex].cancelledDate = new Date().toISOString();
                window.allTransactions[transactionIndex].lastUpdated = new Date().toISOString();
            }
        }

        // Update filtered transactions
        if (window.filteredTransactions) {
            const filteredIndex = window.filteredTransactions.findIndex(t => t.id === transactionId);
            if (filteredIndex !== -1) {
                window.filteredTransactions[filteredIndex].rentalStatus = 'Cancelled';
                window.filteredTransactions[filteredIndex].cancelledDate = new Date().toISOString();
                window.filteredTransactions[filteredIndex].lastUpdated = new Date().toISOString();
            }
        }

        // Re-render the views
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
        }        // Hide loading
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Show success modal instead of Notyf
        showSuccessModal('Rental cancelled successfully!', 'Rental Cancelled');

        return true;

    } catch (error) {
        console.error('Error cancelling rental:', error);
        
        // Hide loading
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }
        
        // Show error notification
        if (window.notyf) {
            window.notyf.error({
                message: 'Error cancelling rental. Please try again.',
                duration: 5000
            });
        } else {
            alert('Error cancelling rental. Please try again.');
        }

        return false;
    }
}

/**
 * Enhanced confirm cancel rental function that ensures proper global updates
 * This overrides the main service function to ensure consistency
 */
async function confirmCancelRental() {
    // Try to get the current transaction from the main service or window
    const currentTransaction = window.currentCancelTransaction || 
                              (window.allTransactions && window.allTransactions.find(t => t.isBeingCancelled));
    
    if (!currentTransaction) {
        console.error('No transaction selected for cancellation');
        // Fallback to calling the original function if it exists
        if (window.originalConfirmCancelRental) {
            return window.originalConfirmCancelRental();
        }
        return;
    }

    try {
        console.log('Starting cancel rental process for:', currentTransaction.id);
        
        // Disable the confirm button to prevent double-clicks
        const confirmBtn = document.getElementById('confirm-cancel-rental-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelling...';
        }

        // Use the enhanced cancel function
        const success = await cancelRentalWithGlobalUpdate(currentTransaction.id);
        
        if (success && window.closeCancelRentalModal) {
            // Close the modal
            window.closeCancelRentalModal();
        }

        // Re-enable button in case modal stays open
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-x-circle"></i> Cancel Rental';
        }

    } catch (error) {
        console.error('Error in confirmCancelRental:', error);
        
        // Re-enable button
        const confirmBtn = document.getElementById('confirm-cancel-rental-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-x-circle"></i> Cancel Rental';
        }
        
        // Show error notification
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

/**
 * Confirmation Modal Functions
 */
let pendingAction = null;
let pendingActionData = null;

/**
 * Shows the confirmation modal with a custom message
 * @param {string} title - The title of the confirmation modal
 * @param {string} message - The confirmation message
 * @param {function} action - The action to execute if confirmed
 * @param {*} actionData - Any data needed for the action
 */
function showConfirmationModal(title, message, action, actionData = null) {
    const modal = document.getElementById('confirmation-modal');
    const titleElement = document.getElementById('confirmation-modal-title');
    const messageElement = document.getElementById('confirmation-modal-message');
    
    if (!modal || !titleElement || !messageElement) {
        console.error('Confirmation modal elements not found');
        return;
    }
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    // Store the pending action
    pendingAction = action;
    pendingActionData = actionData;
    
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the confirmation modal
 */
function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    document.body.style.overflow = '';
    
    // Clear pending action
    pendingAction = null;
    pendingActionData = null;
}

/**
 * Proceeds with the confirmed action
 */
function proceedWithAction() {
    if (pendingAction && typeof pendingAction === 'function') {
        closeConfirmationModal();
        
        // Execute the pending action with any stored data
        if (pendingActionData) {
            pendingAction(pendingActionData);
        } else {
            pendingAction();
        }
    }
}

/**
 * Enhanced cancel rental function with confirmation
 * @param {string} transactionId - The ID of the transaction to cancel
 */
function showCancelConfirmation(transactionId) {
    if (!transactionId) {
        console.error('No transaction ID provided for cancellation');
        return;
    }
    
    showConfirmationModal(
        'Confirm Rental Cancellation',
        'Are you sure you want to cancel this rental? This action can be undone later if needed.',
        () => {
            // Open the main cancel rental modal after confirmation
            if (window.showCancelRentalModal) {
                window.showCancelRentalModal(transactionId);
            }
        }
    );
}

/**
 * Enhanced undo cancellation function with confirmation
 * @param {string} transactionId - The ID of the transaction to undo cancellation for
 */
function showUndoConfirmation(transactionId) {
    if (!transactionId) {
        console.error('No transaction ID provided for undo cancellation');
        return;
    }
    
    showConfirmationModal(
        'Confirm Undo Cancellation',
        'Are you sure you want to restore this cancelled rental? The rental status will be updated based on the event dates.',
        () => {
            // Open the undo cancellation modal after confirmation
            openUndoCancelModal(transactionId);
        }
    );
}

// Handle ESC key for confirmation modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('confirmation-modal');
        if (modal && modal.classList.contains('show')) {
            closeConfirmationModal();
        }
    }
});

// Handle modal overlay click for confirmation modal
document.addEventListener('click', (e) => {
    if (e.target.id === 'confirmation-modal' && e.target.classList.contains('modal-overlay')) {
        closeConfirmationModal();
    }
});

/**
 * Success Modal Functions
 */

/**
 * Shows the success modal with a custom message
 * @param {string} message - The success message to display
 * @param {string} title - Optional title (defaults to "Success!")
 */
function showSuccessModal(message, title = "Success!") {
    const modal = document.getElementById('success-modal');
    const titleElement = document.getElementById('success-modal-title');
    const messageElement = document.getElementById('success-modal-message');
    
    if (!modal || !titleElement || !messageElement) {
        console.error('Success modal elements not found');
        return;
    }
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    modal.style.display = 'flex';
    // Force reflow to ensure transition works
    modal.offsetHeight;
    modal.classList.add('show');
}

/**
 * Closes the success modal
 */
function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * Cancellation Undone Modal Functions
 */

/**
 * Shows the cancellation undone modal with the new status
 * @param {string} newStatus - The new rental status after undoing cancellation
 * @param {string} customMessage - Optional custom message
 */
function showCancellationUndoneModal(newStatus, customMessage = null) {
    const modal = document.getElementById('cancellation-undone-modal');
    const titleElement = document.getElementById('cancellation-undone-title');
    const messageElement = document.getElementById('cancellation-undone-message');
    const statusElement = document.getElementById('undone-new-status');
    
    if (!modal || !titleElement || !messageElement || !statusElement) {
        console.error('Cancellation undone modal elements not found');
        return;
    }
    
    titleElement.textContent = 'Cancellation Undone!';
    
    if (customMessage) {
        messageElement.textContent = customMessage;
    } else {
        messageElement.textContent = 'The rental cancellation has been successfully undone and the status has been restored.';
    }
    
    statusElement.textContent = newStatus;
    
    modal.style.display = 'flex';
    // Force reflow to ensure transition works
    modal.offsetHeight;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the cancellation undone modal
 */
function closeCancellationUndoneModal() {
    const modal = document.getElementById('cancellation-undone-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    document.body.style.overflow = '';
}

// Handle ESC key for cancellation undone modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('cancellation-undone-modal');
        if (modal && modal.classList.contains('show')) {
            closeCancellationUndoneModal();
        }
    }
});

// Handle modal overlay click for cancellation undone modal
document.addEventListener('click', (e) => {
    if (e.target.id === 'cancellation-undone-modal' && e.target.classList.contains('modal-overlay')) {
        closeCancellationUndoneModal();
    }
});

// Handle payment type change in mark complete modal
document.addEventListener('change', (e) => {
    if (e.target.id === 'complete-payment-type') {
        const paymentType = e.target.value;
        const referenceNumberContainer = document.getElementById('complete-payment-reference-group');
        const referenceNumberInput = document.getElementById('complete-payment-reference');
        
        if (referenceNumberContainer && referenceNumberInput) {
            // Show reference number for digital payments
            if (paymentType === 'GCash' || paymentType === 'PayMaya' || paymentType === 'GoTyme') {
                referenceNumberContainer.style.display = 'block';
                referenceNumberInput.required = true;
            } else {
                referenceNumberContainer.style.display = 'none';
                referenceNumberInput.required = false;
                referenceNumberInput.value = '';
            }
        }
    }
});

// Handle reference number input validation in mark complete modal (numbers only)
document.addEventListener('input', (e) => {
    if (e.target.id === 'complete-payment-reference') {
        // Allow only numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    }
});

/**
 * Mark as Complete Modal Functions
 */
let currentTransactionToComplete = null;

/**
 * Shows the mark as complete confirmation modal
 * @param {string} transactionId - The ID of the transaction to mark as complete
 */
function showMarkCompleteConfirmation(transactionId) {
    const transaction = window.allTransactions?.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found');
        return;
    }

    // Store the current transaction
    currentTransactionToComplete = transaction;

    // Populate modal with transaction data
    populateMarkCompleteModal(transaction);

    // Show the modal
    const modal = document.getElementById('mark-complete-confirmation-modal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Closes the mark as complete confirmation modal
 */
function closeMarkCompleteConfirmationModal() {
    const modal = document.getElementById('mark-complete-confirmation-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    }
    
    // Clear the current transaction
    currentTransactionToComplete = null;
}

/**
 * Populates the mark complete modal with transaction data
 * @param {Object} transaction - The transaction object
 */
function populateMarkCompleteModal(transaction) {
    // Customer name
    const customerNameEl = document.getElementById('complete-customer-name');
    if (customerNameEl) {
        customerNameEl.textContent = transaction.fullName || 'Unknown';
    }

    // Transaction code
    const transactionCodeEl = document.getElementById('complete-transaction-code');
    if (transactionCodeEl) {
        transactionCodeEl.textContent = transaction.transactionCode || 'N/A';
    }

    // Event date (use start date or single event date)
    const eventDateEl = document.getElementById('complete-event-date');
    if (eventDateEl) {
        let eventDate = 'Not specified';
        if (transaction.eventStartDate) {
            const startDate = new Date(transaction.eventStartDate);
            eventDate = startDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (transaction.eventEndDate) {
                const endDate = new Date(transaction.eventEndDate);
                eventDate += ` - ${endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}`;
            }
        } else if (transaction.eventDate) {
            const singleDate = new Date(transaction.eventDate);
            eventDate = singleDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        eventDateEl.textContent = eventDate;
    }

    // Total amount
    const totalAmountEl = document.getElementById('complete-total-amount');
    if (totalAmountEl) {
        const amount = transaction.totalAmount || transaction.amount || 0;
        totalAmountEl.textContent = `₱${parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Calculate and display remaining balance
    // First try to get remaining balance from the transaction field (like in overdue modal)
    let remainingBalance = parseFloat(transaction.remainingBalance || 0);
    
    // If remainingBalance field doesn't exist, calculate it from totalAmount - totalPaid
    if (remainingBalance === 0) {
        const totalAmount = parseFloat(transaction.totalAmount || transaction.amount || 0);
        const totalPaid = parseFloat(transaction.totalPaid || 0);
        remainingBalance = Math.max(0, totalAmount - totalPaid);
    }
    
    // Debug logging to check values
    console.log('Transaction data for remaining balance calculation:', {
        transactionId: transaction.id,
        remainingBalanceField: transaction.remainingBalance,
        calculatedRemainingBalance: remainingBalance,
        totalAmount: transaction.totalAmount || transaction.amount,
        totalPaid: transaction.totalPaid
    });
    
    const remainingBalanceEl = document.getElementById('complete-remaining-balance');
    if (remainingBalanceEl) {
        remainingBalanceEl.textContent = `₱${remainingBalance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Show/hide payment section based on remaining balance
    const paymentSection = document.getElementById('complete-payment-section');
    if (paymentSection) {
        if (remainingBalance > 0) {
            paymentSection.style.display = 'block';
            // Reset payment fields
            const paymentTypeSelect = document.getElementById('complete-payment-type');
            const referenceNumberInput = document.getElementById('complete-payment-reference');
            const referenceNumberContainer = document.getElementById('complete-payment-reference-group');
            
            if (paymentTypeSelect) paymentTypeSelect.value = '';
            if (referenceNumberInput) referenceNumberInput.value = '';
            if (referenceNumberContainer) referenceNumberContainer.style.display = 'none';
        } else {
            paymentSection.style.display = 'none';
        }
    }
}

/**
 * Proceeds with marking the transaction as complete
 */
async function proceedWithMarkComplete() {
    if (!currentTransactionToComplete) {
        console.error('No transaction selected for completion');
        return;
    }

    // Check if payment is required and validate payment fields
    // First try to get remaining balance from the transaction field (like in overdue modal)
    let remainingBalance = parseFloat(currentTransactionToComplete.remainingBalance || 0);
    
    // If remainingBalance field doesn't exist, calculate it from totalAmount - totalPaid
    if (remainingBalance === 0) {
        const totalAmount = parseFloat(currentTransactionToComplete.totalAmount || currentTransactionToComplete.amount || 0);
        const totalPaid = parseFloat(currentTransactionToComplete.totalPaid || 0);
        remainingBalance = Math.max(0, totalAmount - totalPaid);
    }
    
    let paymentInfo = null;
    
    if (remainingBalance > 0) {
        const paymentTypeEl = document.getElementById('complete-payment-type');
        const referenceNumberEl = document.getElementById('complete-payment-reference');
        
        if (!paymentTypeEl || !paymentTypeEl.value) {
            if (window.showNotification) {
                window.showNotification('Please select a payment type.', 'error');
            } else {
                alert('Please select a payment type.');
            }
            return;
        }
        
        const paymentType = paymentTypeEl.value;
        
        // Validate reference number for digital payments
        if ((paymentType === 'GCash' || paymentType === 'PayMaya' || paymentType === 'GoTyme')) {
            if (!referenceNumberEl || !referenceNumberEl.value.trim()) {
                if (window.showNotification) {
                    window.showNotification('Please enter a reference number for digital payments.', 'error');
                } else {
                    alert('Please enter a reference number for digital payments.');
                }
                return;
            }
            
            if (referenceNumberEl.value.trim().length < 6) {
                if (window.showNotification) {
                    window.showNotification('Reference number must be at least 6 digits.', 'error');
                } else {
                    alert('Reference number must be at least 6 digits.');
                }
                return;
            }
        }
        
        // Prepare payment info
        paymentInfo = {
            paymentType: paymentType,
            referenceNumber: referenceNumberEl ? referenceNumberEl.value.trim() : null,
            paymentAmount: remainingBalance,
            paymentDate: new Date().toISOString()
        };
    }

    try {
        // Show loading state
        const confirmBtn = document.getElementById('confirm-mark-complete-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
        }

        // Show action spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'flex';
        }

        // Update transaction in Firebase
        const transactionRef = doc(chandriaDB, 'transaction', currentTransactionToComplete.id);
        const updateData = {
            returnConfirmed: true,
            completedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            rentalStatus: 'Completed'
        };

        // If there was a payment made during completion, update payment info
        if (paymentInfo) {
            // Calculate current total paid (for updating the total)
            const currentTotalPaid = parseFloat(currentTransactionToComplete.totalPaid || 0);
            const newTotalPaid = currentTotalPaid + remainingBalance;
            
            updateData.totalPaid = newTotalPaid;
            updateData.remainingBalance = 0; // Set remaining balance to 0 after payment
            updateData.paymentHistory = arrayUnion({
                ...paymentInfo,
                description: 'Final payment on completion'
            });
            updateData.lastPaymentDate = paymentInfo.paymentDate;
            updateData.lastPaymentType = paymentInfo.paymentType;
            if (paymentInfo.referenceNumber) {
                updateData.lastPaymentReference = paymentInfo.referenceNumber;
            }
        }

        await updateDoc(transactionRef, updateData);

        // Update local data in global arrays
        if (window.allTransactions) {
            const transactionIndex = window.allTransactions.findIndex(t => t.id === currentTransactionToComplete.id);
            if (transactionIndex !== -1) {
                Object.assign(window.allTransactions[transactionIndex], updateData);
            }
        }

        // Update filtered transactions
        if (window.filteredTransactions) {
            const filteredIndex = window.filteredTransactions.findIndex(t => t.id === currentTransactionToComplete.id);
            if (filteredIndex !== -1) {
                Object.assign(window.filteredTransactions[filteredIndex], updateData);
            }
        }

        // Close confirmation modal
        closeMarkCompleteConfirmationModal();

        // Hide loading spinner
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Re-render the views
        if (window.currentView) {
            if (window.currentView === 'cards') {
                if (window.renderTransactionCards) {
                    await window.renderTransactionCards();
                }
            } else {
                if (window.renderTransactionTable) {
                    await window.renderTransactionTable();
                }
            }
        }

        // Show success modal
        showMarkCompleteSuccessModal(currentTransactionToComplete);

        console.log('Transaction marked as complete successfully');

    } catch (error) {
        console.error('Error marking transaction as complete:', error);

        // Hide loading spinner
        const actionSpinner = document.querySelector('.admin-action-spinner');
        if (actionSpinner) {
            actionSpinner.style.display = 'none';
        }

        // Reset button state
        const confirmBtn = document.getElementById('confirm-mark-complete-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bx bx-check-circle"></i> Mark as Complete';
        }

        // Show error notification
        if (window.showNotification) {
            window.showNotification('Error marking transaction as complete: ' + (error.message || 'Please try again.'), 'error');
        } else {
            alert('Error marking transaction as complete: ' + (error.message || 'Please try again.'));
        }
    }
}

/**
 * Shows the mark as complete success modal
 * @param {Object} transaction - The completed transaction object
 */
function showMarkCompleteSuccessModal(transaction) {
    const modal = document.getElementById('mark-complete-success-modal');
    const customerNameEl = document.getElementById('success-customer-name');
    const completionDateEl = document.getElementById('success-completion-date');
    
    if (!modal || !customerNameEl || !completionDateEl) {
        console.error('Mark complete success modal elements not found');
        return;
    }
    
    customerNameEl.textContent = transaction.fullName || 'Unknown';
    completionDateEl.textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    modal.style.display = 'flex';
    // Force reflow to ensure transition works
    modal.offsetHeight;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the mark as complete success modal
 */
function closeMarkCompleteSuccessModal() {
    const modal = document.getElementById('mark-complete-success-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    document.body.style.overflow = '';
}

// Export functions for global access (if needed)
if (typeof window !== 'undefined') {    // Preserve the original function if it exists
    if (window.confirmCancelRental && typeof window.confirmCancelRental === 'function') {
        window.originalConfirmCancelRental = window.confirmCancelRental;
    }
    
    window.openUndoCancelModal = openUndoCancelModal;
    window.closeUndoCancelModal = closeUndoCancelModal;
    window.confirmUndoCancel = confirmUndoCancel;
    window.undoCancellation = undoCancellation;
    window.cancelRentalWithGlobalUpdate = cancelRentalWithGlobalUpdate;
    window.confirmCancelRental = confirmCancelRental;
    window.showSuccessModal = showSuccessModal;
    window.closeSuccessModal = closeSuccessModal;
    window.showConfirmationModal = showConfirmationModal;
    window.closeConfirmationModal = closeConfirmationModal;
    window.proceedWithAction = proceedWithAction;    window.showCancelConfirmation = showCancelConfirmation;
    window.showUndoConfirmation = showUndoConfirmation;
    window.showCancellationUndoneModal = showCancellationUndoneModal;
    window.closeCancellationUndoneModal = closeCancellationUndoneModal;
    window.showMarkCompleteConfirmation = showMarkCompleteConfirmation;
    window.closeMarkCompleteConfirmationModal = closeMarkCompleteConfirmationModal;
    window.closeMarkCompleteModal = closeMarkCompleteConfirmationModal; // Alias for compatibility
    window.proceedWithMarkComplete = proceedWithMarkComplete;
    window.showMarkCompleteSuccessModal = showMarkCompleteSuccessModal;
    window.closeMarkCompleteSuccessModal = closeMarkCompleteSuccessModal;
    
    console.log('Customer logs modal functions loaded and exported');
}
