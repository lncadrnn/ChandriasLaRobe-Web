// This code will be inserted into dashboard-service.js
// Function to update modal buttons based on appointment status
function updateAppointmentModalButtons(modal, status) {
    const cancelBtn = modal.querySelector('.cancel-booking');
    const confirmBtn = modal.querySelector('.confirm-booking');
    const undoBtn = modal.querySelector('.undo-confirmation');
    const statusTag = document.getElementById('appointment-confirmed-tag');
    
    if (status === 'confirmed') {
        // Hide cancel and confirm buttons
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        // Show undo button
        if (undoBtn) undoBtn.style.display = 'flex';
        // Show confirmed tag
        if (statusTag) statusTag.style.display = 'flex';
    } else {
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
        // Update appointment status in Firestore
        db.collection('appointments').doc(appointmentId).update({
            status: 'pending'
        }).then(() => {
            // Show success notification
            const notyf = new Notyf();
            notyf.success('Appointment confirmation has been undone');
            
            // Update UI to show cancel and confirm buttons
            const modal = document.getElementById('appointment-modal');
            updateAppointmentModalButtons(modal, 'pending');
            
            // Update the data attribute
            $(modal).data('appointmentStatus', 'pending');
            
            // Close the undo confirmation modal properly
            closeUndoConfirmationModal();
            
            // Update status icon in the appointment list if applicable
            updateAppointmentStatusIcon(appointmentId, 'pending');
        }).catch(error => {
            console.error('Error undoing confirmation:', error);
            const notyf = new Notyf();
            notyf.error('Failed to undo confirmation. Please try again.');
            
            // Close the undo confirmation modal
            closeUndoConfirmationModal();
        });
    } catch (error) {
        console.error('Error:', error);
        const notyf = new Notyf();
        notyf.error('An error occurred. Please try again.');
        
        // Close the undo confirmation modal
        closeUndoConfirmationModal();
    }
});

// Handle cancel action for undo confirmation modal
$(document).on('click', '#undo-confirmation-modal .cancel-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeUndoConfirmationModal();
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
        $('#cancel-booking-modal').removeClass('show');
    } else if (modalId === 'confirm-booking-modal') {
        $('#confirm-booking-modal').removeClass('show');
    } else {
        // Generic close for any confirmation modal
        modal.removeClass('show');
    }
});

// Handle backdrop click for undo confirmation modal
$(document).on('click', '#undo-confirmation-modal .modal-backdrop', function(e) {
    if (e.target === this) {
        closeUndoConfirmationModal();
    }
});

// Handle ESC key to close undo confirmation modal
$(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $('#undo-confirmation-modal').hasClass('show')) {
        closeUndoConfirmationModal();
    }
});

// Function to properly close and reset the undo confirmation modal
function closeUndoConfirmationModal() {
    const modal = $('#undo-confirmation-modal');
    modal.removeClass('show');
    
    // Clear any data and reset state after animation
    setTimeout(function() {
        modal.removeData('appointmentId');
        modal.removeAttr('style');
        modal.find('.confirmation-modal-content').removeAttr('style');
    }, 300); // Wait for CSS transition to complete
}

// Function to update appointment status icon in the list
function updateAppointmentStatusIcon(appointmentId, status) {
    // This would be implemented if we were using real data
    // For the sample data, we'll just reload the page
    // location.reload();
    
    // For demonstration, just update icons in the UI
    const appointments = document.querySelectorAll('.appointment-item');
    
    // Update for sample data based on closest matching appointment
    appointments.forEach(item => {
        // For sample data, we just find the one that was clicked
        const viewButton = item.querySelector('.appointment-view-details');
        if (viewButton && viewButton.dataset.clicked === 'true') {
            const icon = item.querySelector('.fa-check-circle, .fa-question-circle, .fa-times-circle');
            if (icon) {
                // Remove existing classes
                icon.classList.remove('fa-check-circle', 'fa-question-circle', 'fa-times-circle');
                // Remove existing style
                icon.style.color = '';
                
                // Add appropriate icon and color based on status
                if (status === 'confirmed') {
                    icon.classList.add('fa-check-circle');
                    icon.style.color = '#28a745';
                } else if (status === 'cancelled') {
                    icon.classList.add('fa-times-circle');
                    icon.style.color = '#dc3545';
                } else {
                    icon.classList.add('fa-question-circle');
                    icon.style.color = '#ffc107';
                }
            }
            
            // Reset the clicked attribute
            viewButton.dataset.clicked = 'false';
        }
    });
}
