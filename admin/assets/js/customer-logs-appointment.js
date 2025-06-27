// Import Firebase configuration
import { chandriaDB, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from './sdk/chandrias-sdk.js';

// Initialize appointment data
let allAppointments = [];
let filteredAppointments = [];
let currentView = 'cards'; // Default to cards view
let currentSort = 'recent'; // Default sort by recent

// DOM elements for appointments
const appointmentsContainer = document.getElementById('appointments-content');

// Export to global scope
window.allAppointments = allAppointments;
window.filteredAppointments = filteredAppointments;

// Initialize appointment functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAppointmentTab();
});

function initializeAppointmentTab() {
    // Listen for tab switches
    const tabButtons = document.querySelectorAll('.tab-switch');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            if (targetTab === 'appointments') {
                loadAppointments();
            }
        });
    });
}

// Load appointments from Firebase
async function loadAppointments() {
    try {
        // Show loading state
        if (window.adminSpinners) {
            window.adminSpinners.showPageLoader('Loading appointments...');
        }
        
        const appointmentRef = collection(chandriaDB, 'appointments');
        const snapshot = await getDocs(appointmentRef);
        
        allAppointments = [];
        window.allAppointments = allAppointments; // Update global reference
        
        snapshot.forEach(doc => {
            const data = doc.data();
            allAppointments.push({
                id: doc.id,
                ...data
            });
        });
        
        filteredAppointments = [...allAppointments];
        applyAppointmentSorting();
        renderAppointmentView();
        
        // Hide page loader after successful load
        if (window.adminSpinners) {
            window.adminSpinners.hidePageLoader();
        }
        
        console.log('Appointments loaded:', allAppointments.length);
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showAppointmentError('Failed to load appointments. Please try again.');
        
        // Hide page loader even on error
        if (window.adminSpinners) {
            window.adminSpinners.hidePageLoader();
        }
    }
}

// Render appointment view
function renderAppointmentView() {
    if (!appointmentsContainer) return;
    
    if (filteredAppointments.length === 0) {
        appointmentsContainer.innerHTML = `
            <div class="appointments-container">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class='bx bx-calendar-x'></i>
                    </div>
                    <h3>No Appointments Found</h3>
                    <p>No appointment records match your current criteria. Appointments will appear here once they're created.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Create appointment cards view
    renderAppointmentCards();
}

// Render appointment cards
function renderAppointmentCards() {
    if (!appointmentsContainer) return;
    
    const cards = [];
    
    for (const appointment of filteredAppointments) {
        // Calculate appointment status
        const { appointmentStatus, statusClass } = calculateAppointmentStatus(appointment);
        
        // Format appointment date and time
        const appointmentDateTime = formatAppointmentDateTime(appointment);
        
        // Format customer info
        const customerName = appointment.customerName || appointment.fullName || 'Unknown Customer';
        const contactNumber = appointment.contactNumber || appointment.phoneNumber || 'N/A';
        
        const card = `
            <div class="appointment-card" data-appointment-id="${appointment.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="customer-info-centered">
                            <h4 title="${customerName}">${customerName}</h4>
                            <span class="appointment-code">${appointment.appointmentCode || appointment.id.substring(0, 8)}</span>
                        </div>
                        <div class="card-status-top">
                            <span class="status-badge ${statusClass}">${appointmentStatus}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="card-details">
                            <div class="detail-item">
                                <span class="detail-label">Appointment Date</span>
                                <span class="detail-value">${appointmentDateTime}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Contact</span>
                                <span class="detail-value">${contactNumber}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Purpose</span>
                                <span class="detail-value">${appointment.purpose || appointment.appointmentType || 'Consultation'}</span>
                            </div>
                            ${appointment.notes ? `
                            <div class="detail-item">
                                <span class="detail-label">Notes</span>
                                <span class="detail-value">${appointment.notes}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="card-actions-bottom">
                    <div class="card-actions">
                        <button class="card-action-btn view-appointment-details-btn" data-id="${appointment.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        <button class="card-action-btn edit-appointment-btn" data-id="${appointment.id}" title="Edit Appointment">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="card-action-btn delete-appointment-btn" data-id="${appointment.id}" title="Delete Appointment">
                            <i class='bx bx-trash'></i>
                        </button>
                        ${appointmentStatus === 'Scheduled' ? `
                            <button class="card-action-btn complete-appointment-btn" data-id="${appointment.id}" title="Mark as Completed">
                                <i class='bx bx-check'></i>
                            </button>
                        ` : ''}
                        ${appointmentStatus === 'Scheduled' ? `
                            <button class="card-action-btn cancel-appointment-btn" data-id="${appointment.id}" title="Cancel Appointment">
                                <i class='bx bx-x'></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        cards.push(card);
    }
    
    appointmentsContainer.innerHTML = `
        <div class="appointments-container">
            <div class="appointment-cards">
                ${cards.join('')}
            </div>
        </div>
    `;
    
    addAppointmentActionListeners();
}

// Calculate appointment status
function calculateAppointmentStatus(appointment) {
    const currentDate = new Date();
    const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : null;
    
    // Normalize dates to ignore time components for comparison
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const apptDay = appointmentDate ? new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()) : null;
    
    let appointmentStatus = 'Scheduled';
    let statusClass = 'status-scheduled';
    
    // Check if appointment is completed
    if (appointment.status === 'completed' || appointment.completed) {
        return { appointmentStatus: 'Completed', statusClass: 'status-completed' };
    }
    
    // Check if appointment is cancelled
    if (appointment.status === 'cancelled' || appointment.cancelled) {
        return { appointmentStatus: 'Cancelled', statusClass: 'status-cancelled' };
    }
    
    // Check if appointment date has passed
    if (apptDay && today > apptDay) {
        appointmentStatus = 'Missed';
        statusClass = 'status-missed';
    } else if (apptDay && today.getTime() === apptDay.getTime()) {
        appointmentStatus = 'Today';
        statusClass = 'status-today';
    } else {
        appointmentStatus = 'Scheduled';
        statusClass = 'status-scheduled';
    }
    
    return { appointmentStatus, statusClass };
}

// Format appointment date and time
function formatAppointmentDateTime(appointment) {
    const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : null;
    const appointmentTime = appointment.appointmentTime || appointment.time;
    
    if (!appointmentDate) return 'N/A';
    
    const dateStr = appointmentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    if (appointmentTime) {
        return `${dateStr} at ${appointmentTime}`;
    }
    
    return dateStr;
}

// Add action listeners for appointment cards
function addAppointmentActionListeners() {
    // View details buttons
    document.querySelectorAll('.view-appointment-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.target.closest('.view-appointment-details-btn').dataset.id;
            showAppointmentDetails(appointmentId);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.target.closest('.edit-appointment-btn').dataset.id;
            editAppointment(appointmentId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.target.closest('.delete-appointment-btn').dataset.id;
            deleteAppointment(appointmentId);
        });
    });

    // Complete buttons
    document.querySelectorAll('.complete-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.target.closest('.complete-appointment-btn').dataset.id;
            completeAppointment(appointmentId);
        });
    });

    // Cancel buttons
    document.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appointmentId = e.target.closest('.cancel-appointment-btn').dataset.id;
            cancelAppointment(appointmentId);
        });
    });
}

// Show appointment details modal
function showAppointmentDetails(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // For now, show an alert with appointment details
    // You can implement a proper modal later
    const details = `
        Customer: ${appointment.customerName || appointment.fullName || 'Unknown'}
        Contact: ${appointment.contactNumber || appointment.phoneNumber || 'N/A'}
        Date: ${formatAppointmentDateTime(appointment)}
        Purpose: ${appointment.purpose || appointment.appointmentType || 'Consultation'}
        Notes: ${appointment.notes || 'None'}
    `;
    
    alert(`Appointment Details:\n\n${details}`);
}

// Edit appointment (placeholder)
function editAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    alert(`Edit appointment functionality will be implemented here for: ${appointment.customerName || 'Unknown Customer'}`);
}

// Delete appointment (placeholder)
function deleteAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const confirmed = confirm(`Are you sure you want to delete the appointment for ${appointment.customerName || 'Unknown Customer'}?`);
    if (!confirmed) return;
    
    // Implement deletion logic here
    console.log('Delete appointment:', appointmentId);
}

// Complete appointment
async function completeAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const confirmed = confirm(`Mark appointment for ${appointment.customerName || 'Unknown Customer'} as completed?`);
    if (!confirmed) return;
    
    try {
        // Update appointment status in Firebase
        await updateDoc(doc(chandriaDB, 'appointments', appointmentId), {
            status: 'completed',
            completed: true,
            completedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        const index = allAppointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
            allAppointments[index].status = 'completed';
            allAppointments[index].completed = true;
            allAppointments[index].completedDate = new Date().toISOString();
        }
        
        // Re-render view
        filteredAppointments = [...allAppointments];
        renderAppointmentView();
        
        if (window.showNotification) {
            window.showNotification('Appointment marked as completed!', 'success');
        }
        
    } catch (error) {
        console.error('Error completing appointment:', error);
        alert('Error completing appointment. Please try again.');
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const confirmed = confirm(`Cancel appointment for ${appointment.customerName || 'Unknown Customer'}?`);
    if (!confirmed) return;
    
    try {
        // Update appointment status in Firebase
        await updateDoc(doc(chandriaDB, 'appointments', appointmentId), {
            status: 'cancelled',
            cancelled: true,
            cancelledDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        const index = allAppointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
            allAppointments[index].status = 'cancelled';
            allAppointments[index].cancelled = true;
            allAppointments[index].cancelledDate = new Date().toISOString();
        }
        
        // Re-render view
        filteredAppointments = [...allAppointments];
        renderAppointmentView();
        
        if (window.showNotification) {
            window.showNotification('Appointment cancelled!', 'info');
        }
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Error cancelling appointment. Please try again.');
    }
}

// Apply sorting to appointments
function applyAppointmentSorting() {
    if (currentSort === 'recent') {
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.timestamp || 0);
            return dateB - dateA;
        });
    } else if (currentSort === 'oldest') {
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.timestamp || 0);
            return dateA - dateB;
        });
    } else if (currentSort === 'name-asc') {
        filteredAppointments.sort((a, b) => {
            const nameA = (a.customerName || a.fullName || '').toLowerCase();
            const nameB = (b.customerName || b.fullName || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } else if (currentSort === 'name-desc') {
        filteredAppointments.sort((a, b) => {
            const nameA = (a.customerName || a.fullName || '').toLowerCase();
            const nameB = (b.customerName || b.fullName || '').toLowerCase();
            return nameB.localeCompare(nameA);
        });
    } else if (currentSort === 'date-asc') {
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.appointmentDate || 0);
            const dateB = new Date(b.appointmentDate || 0);
            return dateA - dateB;
        });
    } else if (currentSort === 'date-desc') {
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.appointmentDate || 0);
            const dateB = new Date(b.appointmentDate || 0);
            return dateB - dateA;
        });
    }
}

// Show appointment error
function showAppointmentError(message) {
    if (appointmentsContainer) {
        appointmentsContainer.innerHTML = `
            <div class="appointments-container">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class='bx bx-error'></i>
                    </div>
                    <h3>Error Loading Appointments</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="loadAppointments()">
                        <i class='bx bx-refresh'></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

// Export functions to global scope
window.loadAppointments = loadAppointments;
window.renderAppointmentView = renderAppointmentView;
window.applyAppointmentSorting = applyAppointmentSorting;

console.log('Customer logs appointment module loaded');
