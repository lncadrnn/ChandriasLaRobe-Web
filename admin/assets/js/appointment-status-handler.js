// This code will be inserted into dashboard-service.js
// Function to update modal buttons based on appointment status
function updateAppointmentModalButtons(modal, status) {
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    console.log('🔄 Updating modal buttons for status:', status);
    
    const cancelBtn = modal.querySelector('.cancel-booking');
    const confirmBtn = modal.querySelector('.confirm-booking');
    const undoConfirmBtn = modal.querySelector('.undo-confirmation');
    const undoCancelBtn = modal.querySelector('.undo-cancellation');
    const confirmedTag = document.getElementById('appointment-confirmed-tag');
    const cancelledTag = document.getElementById('appointment-cancelled-tag');
    
    // Log current button elements
    console.log('📋 Button elements found:', {
        cancel: !!cancelBtn,
        confirm: !!confirmBtn,
        undoConfirm: !!undoConfirmBtn,
        undoCancel: !!undoCancelBtn,
        confirmedTag: !!confirmedTag,
        cancelledTag: !!cancelledTag
    });
    
    // Hide all buttons and tags by default
    [cancelBtn, confirmBtn, undoConfirmBtn, undoCancelBtn].forEach(btn => {
        if (btn) btn.style.display = 'none';
    });
    [confirmedTag, cancelledTag].forEach(tag => {
        if (tag) tag.style.display = 'none';
    });
    
    if (status === 'confirmed') {
        console.log('✅ Setting buttons for confirmed status');
        // Show undo confirmation button and confirmed tag
        if (undoConfirmBtn) {
            undoConfirmBtn.style.display = 'flex';
            console.log('🔄 Undo confirmation button shown');
        }
        if (confirmedTag) {
            confirmedTag.style.display = 'flex';
            console.log('🔄 Confirmed status tag shown');
        }
    } else if (status === 'cancelled') {
        console.log('❌ Setting buttons for cancelled status');
        // Show undo cancellation button and cancelled tag
        if (undoCancelBtn) {
            undoCancelBtn.style.display = 'flex';
            console.log('🔄 Undo cancellation button shown');
        }
        if (cancelledTag) {
            cancelledTag.style.display = 'flex';
            console.log('🔄 Cancelled status tag shown');
        }
    } else {
        console.log('⏳ Setting buttons for pending status');
        // For pending status - show cancel and confirm buttons
        if (cancelBtn) {
            cancelBtn.style.display = 'flex';
            console.log('🔄 Cancel button shown');
        }
        if (confirmBtn) {
            confirmBtn.style.display = 'flex';
            console.log('🔄 Confirm button shown');
        }
    }    
    console.log('✅ Modal buttons update completed');
}

// Handle undo confirmation button click
$(document).on('click', '.undo-confirmation', function(e) {
    e.preventDefault();
    e.stopPropagation();
      const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Immediately hide appointment modal properly
    $('#appointment-modal').removeClass('show').css('display', 'none');
    
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
                status: 'pending'            }).then(() => {
                console.log('✅ Firebase: Appointment status updated to pending');
                
                // Show success notification
                if (typeof notyf !== 'undefined') {
                    notyf.success('Appointment confirmation has been undone');
                } else if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('Appointment confirmation has been undone');
                }
                  // Get the appointment modal to update its state
                const appointmentModal = document.getElementById('appointment-modal');
                if (appointmentModal) {
                    // Update the data attribute for the modal
                    $(appointmentModal).data('appointmentStatus', 'pending');
                    
                    // Update the modal buttons to reflect the new status
                    updateAppointmentModalButtons(appointmentModal, 'pending');
                    
                    console.log('🔄 Modal state updated to pending');
                }
                  // Update status icon in the appointment list
                updateAppointmentStatusIcon(appointmentId, 'pending');
                
                // Close the appointment modal properly to allow fresh reopening
                if (parentModalId) {
                    closeModal(parentModalId);
                    // Perform comprehensive reset to ensure modal is completely clean
                    setTimeout(() => {
                        resetAppointmentModalCompletely();
                    }, 350);
                    
                    // Restore background interaction
                    if (typeof restoreBackgroundInteraction === 'function') {
                        restoreBackgroundInteraction();
                    }
                }
                
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
            });        } else {
            // Demo/mock implementation when Firebase is not available
            console.log('Mock implementation: Appointment status changed to pending');
            
            // Show success notification
            if (typeof notyf !== 'undefined') {
                notyf.success('Appointment confirmation has been undone');
            } else if (typeof showSuccessNotification === 'function') {
                showSuccessNotification('Appointment confirmation has been undone');
            }
              // Get the appointment modal to update its state
            const appointmentModal = document.getElementById('appointment-modal');
            if (appointmentModal) {
                // Update the data attribute for the modal
                $(appointmentModal).data('appointmentStatus', 'pending');
                
                // Update the modal buttons to reflect the new status
                updateAppointmentModalButtons(appointmentModal, 'pending');
                
                console.log('🔄 Mock: Modal state updated to pending');
            }
              // Close the appointment modal properly to allow fresh reopening
            if (parentModalId) {
                closeModal(parentModalId);
                // Perform comprehensive reset to ensure modal is completely clean
                setTimeout(() => {
                    resetAppointmentModalCompletely();
                }, 350);
                
                // Restore background interaction
                if (typeof restoreBackgroundInteraction === 'function') {
                    restoreBackgroundInteraction();
                }
            }
            
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
    
    console.log('🔄 Undo confirmation cancelled, restoring appointment modal');
    
    // Close only the undo confirmation modal
    const undoModal = $('#undo-confirmation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again properly
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        const appointmentModal = $(`#${parentModalId}`);
        
        // Restore the appointment modal properly without problematic CSS
        appointmentModal.removeClass('show').removeAttr('style'); // Reset first
        
        setTimeout(() => {
            appointmentModal.css({
                'display': 'flex'
            });
            appointmentModal.addClass('show');
            
            // Re-enable background interaction prevention
            if (typeof preventBackgroundInteraction === 'function') {
                preventBackgroundInteraction();
            }
            
            console.log('✅ Appointment modal restored after undo cancellation');
        }, 50);
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
    
    console.log('🔄 Undo confirmation modal closed via X button, restoring appointment modal');
    
    // Close only the undo confirmation modal
    const undoModal = $('#undo-confirmation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again properly
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        const appointmentModal = $(`#${parentModalId}`);
        
        // Restore the appointment modal properly without problematic CSS
        appointmentModal.removeClass('show').removeAttr('style'); // Reset first
        
        setTimeout(() => {
            appointmentModal.css({
                'display': 'flex'
            });
            appointmentModal.addClass('show');
            
            // Re-enable background interaction prevention
            if (typeof preventBackgroundInteraction === 'function') {
                preventBackgroundInteraction();
            }
            
            console.log('✅ Appointment modal restored after undo modal close');
        }, 50);    }
});

// Handle close button for undo cancellation modal
$(document).on('click', '#undo-cancellation-modal .close-confirmation-modal', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔄 Undo cancellation modal closed via X button, restoring appointment modal');
    
    // Close only the undo cancellation modal
    const undoModal = $('#undo-cancellation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again properly
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        const appointmentModal = $(`#${parentModalId}`);
        
        // Restore the appointment modal properly without problematic CSS
        appointmentModal.removeClass('show').removeAttr('style'); // Reset first
        
        setTimeout(() => {
            appointmentModal.css({
                'display': 'flex'
            });
            appointmentModal.addClass('show');
            
            // Re-enable background interaction prevention
            if (typeof preventBackgroundInteraction === 'function') {
                preventBackgroundInteraction();
            }
            
            console.log('✅ Appointment modal restored after undo cancellation modal close');
        }, 50);
    }
});

// Handle cancel action for undo cancellation modal
$(document).on('click', '#undo-cancellation-modal .cancel-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔄 Undo cancellation cancelled, restoring appointment modal');
    
    // Close only the undo cancellation modal
    const undoModal = $('#undo-cancellation-modal');
    undoModal.removeClass('show');
    undoModal.css('display', 'none');
    
    // Get the parent modal (appointment modal) and show it again properly
    const parentModalId = undoModal.data('parentModal');
    if (parentModalId) {
        const appointmentModal = $(`#${parentModalId}`);
        
        // Restore the appointment modal properly without problematic CSS
        appointmentModal.removeClass('show').removeAttr('style'); // Reset first
        
        setTimeout(() => {
            appointmentModal.css({
                'display': 'flex'
            });
            appointmentModal.addClass('show');
            
            // Re-enable background interaction prevention
            if (typeof preventBackgroundInteraction === 'function') {
                preventBackgroundInteraction();
            }
            
            console.log('✅ Appointment modal restored after undo cancellation cancelled');
        }, 50);
    }
});

// Handle close buttons for all confirmation modals
$(document).on('click', '.close-confirmation-modal', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the parent modal
    const modal = $(this).closest('.modal');    const modalId = modal.attr('id');
    
    // Close the appropriate modal
    if (modalId === 'undo-confirmation-modal') {
        closeUndoConfirmationModal();
    } else if (modalId === 'undo-cancellation-modal') {
        closeUndoCancellationModal();
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
        const modalId = modal.attr('id');        // Special handling for undo confirmation modal
        if (modalId === 'undo-confirmation-modal') {
            console.log('🔄 Undo confirmation modal backdrop clicked, restoring appointment modal');
            
            // Close only the undo confirmation modal
            modal.removeClass('show');
            modal.css('display', 'none');
              // Get the parent modal (appointment modal) and show it again properly
            const parentModalId = modal.data('parentModal');
            if (parentModalId) {
                const appointmentModal = $(`#${parentModalId}`);
                
                // Restore the appointment modal properly without problematic CSS
                appointmentModal.removeClass('show').removeAttr('style'); // Reset first
                
                setTimeout(() => {
                    appointmentModal.css({
                        'display': 'flex'
                    });
                    appointmentModal.addClass('show');
                    
                    // Re-enable background interaction prevention
                    if (typeof preventBackgroundInteraction === 'function') {
                        preventBackgroundInteraction();
                    }
                    
                    console.log('✅ Appointment modal restored after backdrop click');
                }, 50);
            }
        } else if (modalId === 'undo-cancellation-modal') {
            console.log('🔄 Undo cancellation modal backdrop clicked, restoring appointment modal');
            
            // Close only the undo cancellation modal
            modal.removeClass('show');
            modal.css('display', 'none');
              // Get the parent modal (appointment modal) and show it again properly
            const parentModalId = modal.data('parentModal');
            if (parentModalId) {
                const appointmentModal = $(`#${parentModalId}`);
                
                // Restore the appointment modal properly without problematic CSS
                appointmentModal.removeClass('show').removeAttr('style'); // Reset first
                
                setTimeout(() => {
                    appointmentModal.css({
                        'display': 'flex'
                    });
                    appointmentModal.addClass('show');
                    
                    // Re-enable background interaction prevention
                    if (typeof preventBackgroundInteraction === 'function') {
                        preventBackgroundInteraction();
                    }
                    
                    console.log('✅ Appointment modal restored after undo cancellation backdrop click');
                }, 50);
            }} else {
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
            const modalId = visibleModal.attr('id');            // Special handling for undo confirmation modal
            if (modalId === 'undo-confirmation-modal') {
                console.log('🔄 Undo confirmation modal closed via ESC, restoring appointment modal');
                
                // Close only the undo confirmation modal
                visibleModal.removeClass('show');
                visibleModal.css('display', 'none');
                  // Get the parent modal (appointment modal) and show it again properly
                const parentModalId = visibleModal.data('parentModal');
                if (parentModalId) {
                    const appointmentModal = $(`#${parentModalId}`);
                    
                    // Restore the appointment modal properly without problematic CSS
                    appointmentModal.removeClass('show').removeAttr('style'); // Reset first
                    
                    setTimeout(() => {
                        appointmentModal.css({
                            'display': 'flex'
                        });
                        appointmentModal.addClass('show');
                        
                        // Re-enable background interaction prevention
                        if (typeof preventBackgroundInteraction === 'function') {
                            preventBackgroundInteraction();
                        }
                        
                        console.log('✅ Appointment modal restored after ESC key');
                    }, 50);
                }
            } else if (modalId === 'undo-cancellation-modal') {
                console.log('🔄 Undo cancellation modal closed via ESC, restoring appointment modal');
                
                // Close only the undo cancellation modal
                visibleModal.removeClass('show');
                visibleModal.css('display', 'none');
                  // Get the parent modal (appointment modal) and show it again properly
                const parentModalId = visibleModal.data('parentModal');
                if (parentModalId) {
                    const appointmentModal = $(`#${parentModalId}`);
                    
                    // Restore the appointment modal properly without problematic CSS
                    appointmentModal.removeClass('show').removeAttr('style'); // Reset first
                    
                    setTimeout(() => {
                        appointmentModal.css({
                            'display': 'flex'
                        });
                        appointmentModal.addClass('show');
                        
                        // Re-enable background interaction prevention
                        if (typeof preventBackgroundInteraction === 'function') {
                            preventBackgroundInteraction();
                        }
                        
                        console.log('✅ Appointment modal restored after undo cancellation ESC key');
                    }, 50);
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

// Function to properly close and reset the undo cancellation modal
function closeUndoCancellationModal() {
    closeModal('undo-cancellation-modal');
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
        
        // Reset button states to default
        const modalElement = document.getElementById('appointment-modal');
        if (modalElement) {
            const cancelBtn = modalElement.querySelector('.cancel-booking');
            const confirmBtn = modalElement.querySelector('.confirm-booking');
            const undoBtn = modalElement.querySelector('.undo-confirmation');
            
            // Reset to default visibility (will be updated when modal is reopened)
            if (cancelBtn) cancelBtn.style.display = 'flex';
            if (confirmBtn) confirmBtn.style.display = 'flex';
            if (undoBtn) undoBtn.style.display = 'none';
        }
        
        // CRITICAL: Reset all CSS properties that might block interactions
        modal.css({
            'visibility': '',
            'opacity': '',
            'pointer-events': '',
            'transition': ''
        });
        
        console.log('🔄 Appointment modal fully reset including pointer-events');
    } else if (modalId === 'rental-modal') {
        // Reset any specific rental modal state
    }
    
    // Clear any data attributes after animation
    setTimeout(function() {
        modal.removeData('appointmentId');
        modal.removeData('appointmentStatus');
        modal.removeAttr('style');
        modal.find('.modal-content').removeAttr('style');
        modal.find('.modal-backdrop').removeAttr('style');
        
        // Ensure the body can scroll again if needed
        $('body').removeClass('modal-open');
        $('html').removeClass('modal-open');
        
        console.log('✅ Modal', modalId, 'fully reset and ready for reuse');
    }, 300); // Wait for CSS transition to complete
}

// Comprehensive function to reset appointment modal to a clean state
function resetAppointmentModalCompletely() {
    const modal = document.getElementById('appointment-modal');
    if (!modal) return;
    
    console.log('🔄 Performing comprehensive appointment modal reset');
    
    // Remove all classes except 'modal'
    modal.className = 'modal';
    
    // Clear all inline styles that might interfere
    modal.removeAttribute('style');
    
    // Reset all problematic CSS properties explicitly
    modal.style.display = '';
    modal.style.visibility = '';
    modal.style.opacity = '';
    modal.style.pointerEvents = '';
    modal.style.transition = '';
    modal.style.transform = '';
    modal.style.zIndex = '';
    
    // Reset jQuery data
    $(modal).removeData('appointmentId');
    $(modal).removeData('appointmentStatus');
    
    // Reset button states
    const cancelBtn = modal.querySelector('.cancel-booking');
    const confirmBtn = modal.querySelector('.confirm-booking');
    const undoBtn = modal.querySelector('.undo-confirmation');
    const statusTag = document.getElementById('appointment-confirmed-tag');
    
    if (cancelBtn) {
        cancelBtn.style.display = 'flex';
        cancelBtn.disabled = false;
    }
    if (confirmBtn) {
        confirmBtn.style.display = 'flex';
        confirmBtn.disabled = false;
    }
    if (undoBtn) {
        undoBtn.style.display = 'none';
        undoBtn.disabled = false;
    }
    if (statusTag) {
        statusTag.style.display = 'none';
    }
    
    // Ensure background interaction is restored
    if (typeof restoreBackgroundInteraction === 'function') {
        restoreBackgroundInteraction();
    }
    
    console.log('✅ Appointment modal completely reset and ready for use');
}

// Function to update appointment status icon in the list
function updateAppointmentStatusIcon(appointmentId, status) {
    console.log(`🔄 Updating status icon for appointment ${appointmentId} to ${status}`);
    
    // First try to refresh the entire appointments list
    if (typeof renderAppointments === 'function') {
        console.log('🔄 Refreshing entire appointments list...');
        renderAppointments();
        return;
    }
    
    if (typeof window.renderAppointments === 'function') {
        console.log('🔄 Refreshing entire appointments list via window...');
        window.renderAppointments();
        return;
    }
    
    console.warn('⚠️ renderAppointments function not found, falling back to manual update');
    
    // Fallback logic for manual DOM update
    const appointments = document.querySelectorAll('.appointment-item');
    let found = false;
    
    appointments.forEach(item => {
        // Try multiple ways to match the appointment
        const viewButton = item.querySelector('.appointment-view-details');
        const appointmentText = item.querySelector('.appointment-text');
        
        // Check if this is the appointment we're looking for
        let isMatch = false;
        
        // Method 1: Check data-id attribute
        if (viewButton && viewButton.getAttribute('data-id') === appointmentId) {
            isMatch = true;
        }
        
        // Method 2: For sample appointments, check if the appointmentId contains customer info
        if (!isMatch && appointmentText && appointmentId.includes('sample-')) {
            const textContent = appointmentText.textContent.toLowerCase();
            const idParts = appointmentId.toLowerCase().split('-');
            if (idParts.length > 1) {
                const customerNamePart = idParts[1];
                if (textContent.includes(customerNamePart)) {
                    isMatch = true;
                }
            }
        }
        
        if (isMatch) {
            found = true;
            console.log(`🎯 Found matching appointment item`);
            
            // Find existing icon or create new one
            let iconElement = item.querySelector('.appointment-text i.fas');
            
            if (!iconElement) {
                // Create new icon
                iconElement = document.createElement('i');
                iconElement.classList.add('fas');
                
                // Insert at the beginning of the appointment text
                if (appointmentText && appointmentText.firstChild) {
                    appointmentText.insertBefore(iconElement, appointmentText.firstChild);
                    // Add a space after the icon
                    appointmentText.insertBefore(document.createTextNode(' '), iconElement.nextSibling);
                }
            }
            
            if (iconElement) {
                // Remove existing classes and styles
                iconElement.classList.remove('fa-check-circle', 'fa-question-circle', 'fa-times-circle');
                iconElement.style.color = '';
                
                // Add appropriate icon and color based on status
                if (status === 'confirmed') {
                    iconElement.classList.add('fa-check-circle');
                    iconElement.style.color = '#28a745'; // Green
                    console.log('✅ Icon updated to confirmed (green check)');
                } else if (status === 'cancelled') {
                    iconElement.classList.add('fa-times-circle');
                    iconElement.style.color = '#dc3545'; // Red
                    console.log('❌ Icon updated to cancelled (red X)');
                } else {
                    // Default to pending (question mark)
                    iconElement.classList.add('fa-question-circle');
                    iconElement.style.color = '#ffc107'; // Yellow
                    console.log('⏳ Icon updated to pending (yellow question)');
                }
            }
        }
    });
    
    if (!found) {
        console.warn('⚠️ Could not find appointment item to update icon for ID:', appointmentId);
    }
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
        
        console.log('🔍 Appointment view details clicked');
        
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
        
        // Determine status based on icon - CRITICAL: Check current icon state
        let status = 'pending';
        const statusIcon = appointmentItem.find('.appointment-text i');
        if (statusIcon.length > 0) {
            if (statusIcon.hasClass('fa-check-circle')) {
                status = 'confirmed';
                console.log('🔍 Detected confirmed status from icon');
            } else if (statusIcon.hasClass('fa-times-circle')) {
                status = 'cancelled';
                console.log('🔍 Detected cancelled status from icon');
            } else {
                console.log('🔍 Detected pending status from icon');
            }
        } else {
            console.log('🔍 No status icon found, defaulting to pending');
        }
        
        console.log('🔍 Final detected status:', status);
        
        // Store appointment ID and status in the modal
        const modal = $('#appointment-modal');
        modal.data('appointmentId', appointmentId);
        modal.data('appointmentStatus', status);
        
        console.log('🔍 Stored in modal - ID:', appointmentId, 'Status:', status);
        
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

// Handle undo cancellation button click
$(document).on('click', '.undo-cancellation', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Immediately hide appointment modal properly
    $('#appointment-modal').removeClass('show').css('display', 'none');
    
    // Store a reference to the appointment modal so we can show it again if needed
    $('#undo-cancellation-modal').data('parentModal', 'appointment-modal');
    
    // Clear any existing state and ensure modal is properly reset
    $('#undo-cancellation-modal').removeClass('show').removeAttr('style');
    
    // Store the appointment ID for the confirmation modal
    $('#undo-cancellation-modal').data('appointmentId', appointmentId);
    
    // Show the undo cancellation modal immediately
    $('#undo-cancellation-modal').addClass('show');
    
    console.log('🔄 Undo cancellation modal shown for appointment:', appointmentId);
});

// Handle undo cancellation confirmation modal actions
$(document).on('click', '.confirm-undo-cancellation-action', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const appointmentId = $('#undo-cancellation-modal').data('appointmentId');
    
    // Implement the logic to update the appointment status in the database
    try {
        // Get parent modal ID before closing the undo cancellation modal
        const parentModalId = $('#undo-cancellation-modal').data('parentModal');
        
        // Close the undo cancellation modal
        closeModal('undo-cancellation-modal');
          // For Firebase implementation
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Update appointment status in Firestore
            firebase.firestore().collection('appointments').doc(appointmentId).update({
                status: 'confirmed'
            }).then(() => {
                console.log('✅ Firebase: Appointment status updated from cancelled to confirmed');
                
                // Show success notification
                if (typeof notyf !== 'undefined') {
                    notyf.success('Appointment cancellation has been undone');
                } else if (typeof showSuccessNotification === 'function') {
                    showSuccessNotification('Appointment cancellation has been undone');
                }
                
                // Get the appointment modal to update its state
                const appointmentModal = document.getElementById('appointment-modal');
                if (appointmentModal) {                    // Update the data attribute for the modal
                    $(appointmentModal).data('appointmentStatus', 'confirmed');
                    
                    // Update the modal buttons to reflect the new status
                    updateAppointmentModalButtons(appointmentModal, 'confirmed');
                      console.log('🔄 Modal state updated to confirmed from cancelled');
                }
                
                // Update status icon in the appointment list
                updateAppointmentStatusIcon(appointmentId, 'confirmed');
                
                // Close the appointment modal properly to allow fresh reopening
                if (parentModalId) {
                    closeModal(parentModalId);
                    // Perform comprehensive reset to ensure modal is completely clean
                    setTimeout(() => {
                        resetAppointmentModalCompletely();
                    }, 350);
                    
                    // Restore background interaction
                    if (typeof restoreBackgroundInteraction === 'function') {
                        restoreBackgroundInteraction();
                    }
                }
                  }).catch((error) => {
                console.error('❌ Firebase: Error updating appointment status from cancelled to confirmed:', error);
                if (typeof notyf !== 'undefined') {
                    notyf.error('Failed to undo cancellation. Please try again.');
                } else if (typeof showErrorNotification === 'function') {
                    showErrorNotification('Failed to undo cancellation. Please try again.');
                }
                
                // Re-open parent modal if there was an error
                const parentModalId = $('#undo-cancellation-modal').data('parentModal');
                if (parentModalId) {
                    setTimeout(() => {
                        $(`#${parentModalId}`).addClass('show');
                    }, 100);
                }
            });        } else {
            // Mock implementation for testing without Firebase
            console.log('Mock implementation: Appointment status changed from cancelled to confirmed');
            
            if (typeof notyf !== 'undefined') {
                notyf.success('Appointment cancellation has been undone');
            } else if (typeof showSuccessNotification === 'function') {
                showSuccessNotification('Appointment cancellation has been undone');
            }
            
            // Get the appointment modal to update its state
            const appointmentModal = document.getElementById('appointment-modal');
            if (appointmentModal) {
                // Update the data attribute for the modal
                $(appointmentModal).data('appointmentStatus', 'confirmed');
                
                // Update the modal buttons to reflect the new status
                updateAppointmentModalButtons(appointmentModal, 'confirmed');
            }
            
            // Update status icon in the appointment list (mock)
            updateAppointmentStatusIcon(appointmentId, 'confirmed');
            
            // Close the appointment modal properly to allow fresh reopening
            if (parentModalId) {
                closeModal(parentModalId);
                // Perform comprehensive reset to ensure modal is completely clean
                setTimeout(() => {
                    resetAppointmentModalCompletely();
                }, 350);
                
                // Restore background interaction
                if (typeof restoreBackgroundInteraction === 'function') {
                    restoreBackgroundInteraction();
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in undo cancellation process:', error);
        if (typeof notyf !== 'undefined') {
            notyf.error('An error occurred. Please try again.');
        } else if (typeof showErrorNotification === 'function') {
            showErrorNotification('An error occurred. Please try again.');
        }
        
        // Close the confirmation modal
        closeModal('undo-cancellation-modal');
    }
});
