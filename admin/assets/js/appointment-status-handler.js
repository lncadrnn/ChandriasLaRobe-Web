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
$(document).on('click', '.undo-confirmation', function() {
    const appointmentId = $(this).closest('.modal').data('appointmentId');
    
    // Create a confirmation dialog
    if (confirm('Are you sure you want to undo the confirmation for this appointment?')) {
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
                
                // Update status icon in the appointment list if applicable
                updateAppointmentStatusIcon(appointmentId, 'pending');
            }).catch(error => {
                console.error('Error undoing confirmation:', error);
                const notyf = new Notyf();
                notyf.error('Failed to undo confirmation. Please try again.');
            });
        } catch (error) {
            console.error('Error:', error);
            const notyf = new Notyf();
            notyf.error('An error occurred. Please try again.');
        }
    }
});

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
