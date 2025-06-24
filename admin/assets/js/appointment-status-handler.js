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
    
    // Immediately hide appointment modal but don't close it completely
    $('#appointment-modal').css({
        'visibility': 'hidden',
        'opacity': '0',
        'pointer-events': 'none',
        'transition': 'none'
    });
    
    // Store a reference to the appointment modal so we can show it again if needed
    $('#undo-confirmation-modal').data('parentModal', 'appointment-modal');
    
    // Clear any existing state and ensure modal is properly reset
    $('#undo-confirmation-modal').removeClass('show').removeAttr('style');
    
    // Store the appointment ID for the confirmation modal
    $('#undo-confirmation-modal').data('appointmentId', appointmentId);
    
    // Show the undo confirmation modal immediately
    $('#undo-confirmation-modal').addClass('show');
});

// Handle undo confirmation modal actions
$(document).on('click', '.confirm-undo-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $('#undo-confirmation-modal').data('appointmentId');
    
    // Implement the logic to update the appointment status in the database
    try {
        // Get parent modal ID before closing the undo confirmation modal
        const parentModalId = $('#undo-confirmation-modal').data('parentModal');
        
        // Close the undo confirmation modal
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
                
                // Update status icon in the appointment list
                updateAppointmentStatusIcon(appointmentId, 'pending');
                
                // Close the appointment modal too (parent modal)
                if (parentModalId) {
                    closeModal(parentModalId);
                }
                  // Update the data attribute
                $(modal).data('appointmentStatus', 'pending');                
                // Refresh the appointments list to show the updated status
                if (typeof renderAppointments === 'function') {
                    console.log('Refreshing appointments list after undo confirmation...');
                    renderAppointments();
                } else {
                    // Fallback to the icon update function if renderAppointments is not available
                    updateAppointmentStatusIcon(appointmentId, 'pending');
                }
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
            // Refresh the appointments list to show the updated status
            if (typeof renderAppointments === 'function') {
                console.log('Refreshing appointments list after mock undo confirmation...');
                renderAppointments();
            } else {
                // Fallback to the icon update function if renderAppointments is not available
                updateAppointmentStatusIcon(appointmentId, 'pending');
            }
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
    
    // Close only the undo confirmation modal
    const undoModal = $('#undo-confirmation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        $(`#${parentModalId}`).css({
            'visibility': 'visible',
            'opacity': '1',
            'pointer-events': 'auto',
            'transition': 'opacity 0.2s ease'
        });
    }
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
    
    // Close only the undo confirmation modal
    const undoModal = $('#undo-confirmation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        $(`#${parentModalId}`).css({
            'visibility': 'visible',
            'opacity': '1',
            'pointer-events': 'auto',
            'transition': 'opacity 0.2s ease'
        });
    }
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
        
        // Special handling for undo confirmation modal
        if (modalId === 'undo-confirmation-modal') {
            // Close only the undo confirmation modal
            modal.removeClass('show');
            modal.css('display', 'none');
            
            // Get the parent modal (appointment modal) and show it again
            const parentModalId = modal.data('parentModal');
            if (parentModalId) {
                $(`#${parentModalId}`).css({
                    'visibility': 'visible',
                    'opacity': '1',
                    'pointer-events': 'auto',
                    'transition': 'opacity 0.2s ease'
                });
            }
        } else {
            // Close the modal normally
            closeModal(modalId);
        }
    }
});

// Handle ESC key to close modals
$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        // Find any visible modal
        const visibleModal = $('.modal.show');
        
        if (visibleModal.length > 0) {
            const modalId = visibleModal.attr('id');
            
            // Special handling for undo confirmation modal
            if (modalId === 'undo-confirmation-modal') {
                // Close only the undo confirmation modal
                visibleModal.removeClass('show');
                visibleModal.css('display', 'none');
                
                // Get the parent modal (appointment modal) and show it again
                const parentModalId = visibleModal.data('parentModal');
                if (parentModalId) {
                    $(`#${parentModalId}`).css({
                        'visibility': 'visible',
                        'opacity': '1',
                        'pointer-events': 'auto',
                        'transition': 'opacity 0.2s ease'
                    });
                }
            } else {
                // Close the modal normally
                closeModal(modalId);
            }
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
    
    // Instead of trying to update icons directly in the DOM,
    // we'll refresh the entire appointments list to ensure consistency
    if (typeof renderAppointments === 'function') {
        console.log('Refreshing appointments list...');
        renderAppointments();
        return;
    }
    
    console.warn('renderAppointments function not found, falling back to manual update');
    
    // Fallback logic if renderAppointments is not available
    const appointments = document.querySelectorAll('.appointment-item');
    
    appointments.forEach(item => {
        // For sample data, we try to find the button with matching appointmentId
        const viewButton = item.querySelector('.appointment-view-details');
        if (viewButton && viewButton.getAttribute('data-id') === appointmentId) {
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
                    iconElement.style.color = '#dc3545'; // Red
                } else {
                    // Default to pending (question mark)
                    iconElement.classList.add('fa-question-circle');
                    iconElement.style.color = '#ffc107'; // Yellow
                }
            }
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

// Handle confirm booking button click
$(document).on('click', '.confirm-booking', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Clear any existing state and ensure modal is properly reset
    $('#confirm-booking-modal').removeClass('show').removeAttr('style');
    
    // Store the appointment ID for the confirmation modal
    $('#confirm-booking-modal').data('appointmentId', appointmentId);
    
    // Small delay to ensure modal is properly reset before showing
    setTimeout(function() {
        $('#confirm-booking-modal').addClass('show');
    }, 50);
});

// Handle confirm booking confirmation modal action
$(document).on('click', '.confirm-booking-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $('#confirm-booking-modal').data('appointmentId');
    
    // Implement the logic to update the appointment status in the database
    try {
        // First, close the confirm booking modal
        closeModal('confirm-booking-modal');
        
        // For Firebase implementation
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Update appointment status in Firestore
            firebase.firestore().collection('appointments').doc(appointmentId).update({
                status: 'confirmed'
            }).then(() => {
                // Show success notification
                if (typeof notyf !== 'undefined') {
                    notyf.success('Appointment has been confirmed');
                } else if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('Appointment has been confirmed');
                }
                
                // Update UI to show undo button and hide confirm/cancel buttons
                const modal = document.getElementById('appointment-modal');
                updateAppointmentModalButtons(modal, 'confirmed');
                  // Update the data attribute
                $(modal).data('appointmentStatus', 'confirmed');                  // Refresh the appointments list to show the updated status
                if (typeof window.renderAppointments === 'function') {
                    console.log('Refreshing appointments list after confirmation...');
                    window.renderAppointments();
                } else {
                    console.warn('renderAppointments function not found globally');
                    // Fallback to the icon update function if renderAppointments is not available
                    updateAppointmentStatusIcon(appointmentId, 'confirmed');
                }
            }).catch(error => {
                console.error('Error confirming appointment:', error);
                if (typeof notyf !== 'undefined') {
                    notyf.error('Failed to confirm appointment. Please try again.');
                } else if (typeof showErrorNotification === 'function') {
                    showErrorNotification('Failed to confirm appointment. Please try again.');
                }
            });
        } else {
            // Demo/mock implementation when Firebase is not available
            console.log('Mock implementation: Appointment status changed to confirmed');
            
            // Show success notification
            if (typeof notyf !== 'undefined') {
                notyf.success('Appointment has been confirmed');
            } else if (typeof showSuccessNotification === 'function') {
                showSuccessNotification('Appointment has been confirmed');
            }
            
            // Update UI to show undo button and hide confirm/cancel buttons
            const modal = document.getElementById('appointment-modal');
            updateAppointmentModalButtons(modal, 'confirmed');
              // Update the data attribute
            $(modal).data('appointmentStatus', 'confirmed');            
            // Refresh the appointments list to show the updated status
            if (typeof renderAppointments === 'function') {
                console.log('Refreshing appointments list after mock confirmation...');
                renderAppointments();
            } else {
                // Fallback to the icon update function if renderAppointments is not available
                updateAppointmentStatusIcon(appointmentId, 'confirmed');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (typeof notyf !== 'undefined') {
            notyf.error('An error occurred. Please try again.');
        } else if (typeof showErrorNotification === 'function') {
            showErrorNotification('An error occurred. Please try again.');
        }
        
        // Close the confirmation modal
        closeModal('confirm-booking-modal');
    }
});

// Set up event handlers for appointment view details buttons
$(document).ready(function() {
    // Event handler for view details buttons
    $(document).on('click', '.appointment-view-details', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Mark this button as the one that was clicked
        $(this).attr('data-clicked', 'true');
        
        // Get appointment details from the parent element
        const appointmentItem = $(this).closest('.appointment-item');
        const appointmentText = appointmentItem.find('.appointment-text').text();
        
        // Extract name and date from the appointment text
        const nameMatch = appointmentText.match(/\*\*([^*]+)\*\*/);
        const dateMatch = appointmentText.match(/(\w+\s\d+,\s\d{4})/);
        const timeMatch = appointmentText.match(/(\d{1,2}:\d{2}\s[AP]M)/);
        
        const name = nameMatch ? nameMatch[1] : 'Unknown Customer';
        const date = dateMatch ? dateMatch[1] : 'Unknown Date';
        const time = timeMatch ? timeMatch[1] : 'Unknown Time';
        
        // Generate a unique ID if we don't have one
        const appointmentId = appointmentItem.data('id') || `appointment-${Date.now()}`;
        
        // Determine status based on icon
        let status = 'pending';
        const icon = appointmentItem.find('.fas');
        if (icon.hasClass('fa-check-circle')) {
            status = 'confirmed';
        } else if (icon.hasClass('fa-times-circle')) {
            status = 'cancelled';
        }
        
        // Store appointment ID and status in the modal
        $('#appointment-modal').data('appointmentId', appointmentId);
        $('#appointment-modal').data('appointmentStatus', status);
        
        // Populate appointment details
        const detailsHTML = `
            <div class="appointment-detail-item">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${name}</span>
            </div>
            <div class="appointment-detail-item">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${date}</span>
            </div>
            <div class="appointment-detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${time}</span>
            </div>
            <div class="appointment-detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>
        `;
        
        // Update the modal with the details
        $('#appointment-details').html(detailsHTML);
        
        // Update modal buttons based on status
        updateAppointmentModalButtons(document.getElementById('appointment-modal'), status);
        
        // Show the modal
        $('#appointment-modal').addClass('show');
    });
});

// Handle cancel booking button click
$(document).on('click', '.cancel-booking', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Clear any existing state and ensure modal is properly reset
    $('#cancel-booking-modal').removeClass('show').removeAttr('style');
    
    // Store the appointment ID for the confirmation modal
    $('#cancel-booking-modal').data('appointmentId', appointmentId);
    
    // Small delay to ensure modal is properly reset before showing
    setTimeout(function() {
        $('#cancel-booking-modal').addClass('show');
    }, 50);
});

// Handle cancel booking confirmation modal action
$(document).on('click', '.confirm-cancel-booking', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $('#cancel-booking-modal').data('appointmentId');
    
    // Implement the logic to update the appointment status in the database
    try {
        // First, close the cancel booking modal
        closeModal('cancel-booking-modal');
        
        // For Firebase implementation
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Update appointment status in Firestore
            firebase.firestore().collection('appointments').doc(appointmentId).update({
                status: 'cancelled'
            }).then(() => {                // Show success notification
                if (typeof notyf !== 'undefined') {
                    notyf.success('Appointment has been cancelled');
                } else if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('Appointment has been cancelled');
                }                
                // Refresh the appointments list to show the updated status
                if (typeof renderAppointments === 'function') {
                    console.log('Refreshing appointments list after cancel...');
                    renderAppointments();
                } else {
                    // Fallback to the icon update function if renderAppointments is not available
                    updateAppointmentStatusIcon(appointmentId, 'cancelled');
                }
                
                // Close all modals including the appointment modal
                closeModal('appointment-modal');
            }).catch(error => {
                console.error('Error cancelling appointment:', error);
                if (typeof notyf !== 'undefined') {
                    notyf.error('Failed to cancel appointment. Please try again.');
                } else if (typeof showErrorNotification === 'function') {
                    showErrorNotification('Failed to cancel appointment. Please try again.');
                }
            });
        } else {
            // Demo/mock implementation when Firebase is not available
            console.log('Mock implementation: Appointment status changed to cancelled');
              // Show success notification
            if (typeof notyf !== 'undefined') {
                notyf.success('Appointment has been cancelled');
            } else if (typeof showSuccessNotification === 'function') {
                showSuccessNotification('Appointment has been cancelled');
            }            
            // Refresh the appointments list to show the updated status
            if (typeof renderAppointments === 'function') {
                console.log('Refreshing appointments list after mock cancel...');
                renderAppointments();
            } else {
                // Fallback to the icon update function if renderAppointments is not available
                updateAppointmentStatusIcon(appointmentId, 'cancelled');
            }
            
            // Close all modals including the appointment modal
            closeModal('appointment-modal');
        }
    } catch (error) {
        console.error('Error:', error);
        if (typeof notyf !== 'undefined') {
            notyf.error('An error occurred. Please try again.');
        } else if (typeof showErrorNotification === 'function') {
            showErrorNotification('An error occurred. Please try again.');
        }
        
        // Close the confirmation modal
        closeModal('cancel-booking-modal');
    }
});
