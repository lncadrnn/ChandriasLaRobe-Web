// This code will be inserted into dashboard-service.js
// Function to update modal buttons based on appointment status
function updateAppointmentModalButtons(modal, status) {
    if (!modal) return;
    
    const cancelBtn = modal.querySelector('.cancel-booking');
    const confirmBtn = modal.querySelector('.confirm-booking');
    const undoBtn = modal.querySelector('.undo-confirmation');
    const statusTag = document.getElementById('appointment-confirmed-tag');
    
    // Default visibility is controlled in CSS, we just override it based on status
    if (status === 'confirmed') {
        // Hide cancel and confirm buttons
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        // Show undo button
        if (undoBtn) undoBtn.style.display = 'flex';
        // Show confirmed tag
        if (statusTag) statusTag.style.display = 'flex';
    } else {
        // For pending status or any other non-confirmed status
        // Show cancel and confirm buttons
        if (cancelBtn) cancelBtn.style.display = 'flex';
        if (confirmBtn) confirmBtn.style.display = 'flex';
        // Hide undo button
        if (undoBtn) undoBtn.style.display = 'none';
        // Hide confirmed tag
        if (statusTag) statusTag.style.display = 'none';
    }
}

// Handle undo confirmation button click
$(document).on('click', '.undo-confirmation', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Clear any existing state and ensure modal is properly reset
    $('#undo-confirmation-modal').removeClass('show').removeAttr('style');
    
    // Store the appointment ID for the confirmation modal
    $('#undo-confirmation-modal').data('appointmentId', appointmentId);
    
    // Small delay to ensure modal is properly reset before showing
    setTimeout(function() {
        $('#undo-confirmation-modal').addClass('show');
    }, 50);
});

// Handle undo confirmation modal actions
$(document).on('click', '.confirm-undo-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $('#undo-confirmation-modal').data('appointmentId');
    
    // Implement the logic to update the appointment status in the database
    try {
        // First, close the undo confirmation modal
        closeModal('undo-confirmation-modal');
        
        // For Firebase implementation
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Update appointment status in Firestore
            firebase.firestore().collection('appointments').doc(appointmentId).update({
                status: 'pending'
            }).then(() => {
                // Show success notification
                if (typeof notyf !== 'undefined') {
                    notyf.success('Appointment confirmation has been undone');
                } else if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('Appointment confirmation has been undone');
                }
                
                // Update UI to show cancel and confirm buttons
                const modal = document.getElementById('appointment-modal');
                updateAppointmentModalButtons(modal, 'pending');
                
                // Update the data attribute
                $(modal).data('appointmentStatus', 'pending');
                
                // Update status icon in the appointment list if applicable
                updateAppointmentStatusIcon(appointmentId, 'pending');
            }).catch(error => {
                console.error('Error undoing confirmation:', error);
                if (typeof notyf !== 'undefined') {
                    notyf.error('Failed to undo confirmation. Please try again.');
                } else if (typeof showErrorNotification === 'function') {
                    showErrorNotification('Failed to undo confirmation. Please try again.');
                }
            });
        } else {
            // Demo/mock implementation when Firebase is not available
            console.log('Mock implementation: Appointment status changed to pending');
            
            // Show success notification
            if (typeof notyf !== 'undefined') {
                notyf.success('Appointment confirmation has been undone');
            } else if (typeof showSuccessNotification === 'function') {
                showSuccessNotification('Appointment confirmation has been undone');
            }
            
            // Update UI to show cancel and confirm buttons
            const modal = document.getElementById('appointment-modal');
            updateAppointmentModalButtons(modal, 'pending');
            
            // Update the data attribute
            $(modal).data('appointmentStatus', 'pending');
            
            // Update status icon in the appointment list if applicable
            updateAppointmentStatusIcon(appointmentId, 'pending');
        }
    } catch (error) {
        console.error('Error:', error);
        if (typeof notyf !== 'undefined') {
            notyf.error('An error occurred. Please try again.');
        } else if (typeof showErrorNotification === 'function') {
            showErrorNotification('An error occurred. Please try again.');
        }
        
        // Close the undo confirmation modal
        closeModal('undo-confirmation-modal');
    }
});

// Handle cancel action for undo confirmation modal
$(document).on('click', '#undo-confirmation-modal .cancel-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeUndoConfirmationModal();
});

// Handle cancel action for all confirmation modals
$(document).on('click', '.cancel-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the parent modal
    const modal = $(this).closest('.modal');
    const modalId = modal.attr('id');
    
    // Close the appropriate modal
    closeModal(modalId);
});

// Handle close button for undo confirmation modal
$(document).on('click', '#undo-confirmation-modal .close-confirmation-modal', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeUndoConfirmationModal();
});

// Handle close buttons for all confirmation modals
$(document).on('click', '.close-confirmation-modal', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the parent modal
    const modal = $(this).closest('.modal');
    const modalId = modal.attr('id');
    
    // Close the appropriate modal
    if (modalId === 'undo-confirmation-modal') {
        closeUndoConfirmationModal();
    } else if (modalId === 'cancel-booking-modal') {
        closeModal('cancel-booking-modal');
    } else if (modalId === 'confirm-booking-modal') {
        closeModal('confirm-booking-modal');
    } else {
        // Generic close for any confirmation modal
        closeModal(modalId);
    }
});

// Handle backdrop click for all confirmation modals
$(document).on('click', '.modal .modal-backdrop', function(e) {
    if (e.target === this) {
        // Get the parent modal
        const modal = $(this).closest('.modal');
        const modalId = modal.attr('id');
        
        // Close the modal
        closeModal(modalId);
    }
});

// Handle ESC key to close modals
$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        // Find any visible modal
        const visibleModal = $('.modal.show');
        
        if (visibleModal.length > 0) {
            const modalId = visibleModal.attr('id');
            closeModal(modalId);
        }
    }
});

// Function to properly close and reset the undo confirmation modal
function closeUndoConfirmationModal() {
    closeModal('undo-confirmation-modal');
}

// Function to properly close and reset any modal
function closeModal(modalId) {
    if (!modalId) return;
    
    console.log('Closing modal:', modalId);
    
    const modal = $('#' + modalId);
    if (modal.length === 0) return;
    
    // Remove the show class which controls visibility
    modal.removeClass('show');
    
    // Hide the modal explicitly as a fallback
    modal.css('display', 'none');
    
    // Remove modal backdrop if it exists separately
    modal.find('.modal-backdrop').css('display', 'none');
    
    // Reset any CSS transformations
    modal.find('.modal-content').css({
        'transform': 'none',
        'transition': 'none'
    });
    
    // Handle special cases
    if (modalId === 'appointment-modal') {
        // Reset any specific appointment modal state
        $('#appointment-confirmed-tag').hide();
    } else if (modalId === 'rental-modal') {
        // Reset any specific rental modal state
    }
    
    // Clear any data attributes after animation
    setTimeout(function() {
        modal.removeData('appointmentId');
        modal.removeAttr('style');
        modal.find('.modal-content').removeAttr('style');
        modal.find('.modal-backdrop').removeAttr('style');
        
        // Ensure the body can scroll again if needed
        $('body').removeClass('modal-open');
        $('html').removeClass('modal-open');
    }, 300); // Wait for CSS transition to complete
}

// Function to update appointment status icon in the list
function updateAppointmentStatusIcon(appointmentId, status) {
    console.log(`Updating status icon for appointment ${appointmentId} to ${status}`);
    
    // For demonstration, update icons in the UI
    const appointments = document.querySelectorAll('.appointment-item');
    
    // Update for sample data based on closest matching appointment
    appointments.forEach(item => {
        // For sample data, we just find the one that was clicked
        const viewButton = item.querySelector('.appointment-view-details');
        if (viewButton && viewButton.dataset.clicked === 'true') {
            const icon = item.querySelector('.fa-check-circle, .fa-question-circle, .fa-times-circle');
            
            // If there's no icon yet, we need to create one
            let iconElement = icon;
            if (!iconElement) {
                iconElement = document.createElement('i');
                iconElement.classList.add('fas');
                
                // Insert at the beginning of the appointment text
                const textElement = item.querySelector('.appointment-text');
                if (textElement && textElement.firstChild) {
                    textElement.insertBefore(iconElement, textElement.firstChild);
                    // Add a space after the icon
                    textElement.insertBefore(document.createTextNode(' '), iconElement.nextSibling);
                }
            }
            
            if (iconElement) {
                // Remove existing classes
                iconElement.classList.remove('fa-check-circle', 'fa-question-circle', 'fa-times-circle');
                // Remove existing style
                iconElement.style.color = '';
                
                // Add appropriate icon and color based on status
                if (status === 'confirmed') {
                    iconElement.classList.add('fa-check-circle');
                    iconElement.style.color = '#28a745'; // Green
                } else if (status === 'cancelled') {
                    iconElement.classList.add('fa-times-circle');
                    iconElement.style.color = '#dc3545'; // Red                } else {
                    // Default to pending (question mark)
                    iconElement.classList.add('fa-question-circle');
                    iconElement.style.color = '#ffc107'; // Yellow
                }
            }
            
            // Reset the clicked attribute            viewButton.dataset.clicked = 'false';
        }
    });
}

// Initialize all modals on page load
$(document).ready(function() {
    // Reset all modals to ensure they're properly closed on page load
    $('.modal').each(function() {
        const modalId = $(this).attr('id');
        if (modalId) {
            // Make sure all modals start in a closed state
            $(this).removeClass('show');
            $(this).css('display', 'none');
            $(this).find('.modal-content').css('transform', 'none');
            
            // Clean up any possible leftover modal-open classes
            $('body').removeClass('modal-open');
            $('html').removeClass('modal-open');
        }
    });
    
    // Ensure all close buttons work by manually attaching event handlers
    $('.close-modal, .close-rental-modal, .close-confirmation-modal').each(function() {
        $(this).off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const modal = $(this).closest('.modal');
            const modalId = modal.attr('id');
            
            console.log('Close button clicked for modal:', modalId);
            closeModal(modalId);
        });
    });
    
    // Prevent default form submission in modals (to avoid page reload)
    $('.modal form').on('submit', function(e) {
        e.preventDefault();
        return false;
    });
});

// Handle all modal close buttons
$(document).on('click', '.close-modal, .close-rental-modal, .close-confirmation-modal', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the parent modal
    const modal = $(this).closest('.modal');
    const modalId = modal.attr('id');
    
    // Close the modal
    closeModal(modalId);
});
