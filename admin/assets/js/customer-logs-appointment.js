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
    
    // Initialize control bar functionality
    initializeAppointmentControlBar();
}

// Initialize appointment control bar functionality
function initializeAppointmentControlBar() {
    // Search functionality
    const appointmentSearchInput = document.getElementById('appointment-search');
    const mobileAppointmentSearchInput = document.getElementById('mobile-appointment-search');
    
    if (appointmentSearchInput) {
        appointmentSearchInput.addEventListener('input', function() {
            searchAppointments(this.value);
        });
    }
    
    if (mobileAppointmentSearchInput) {
        mobileAppointmentSearchInput.addEventListener('input', function() {
            searchAppointments(this.value);
        });
    }
    
    // Sort dropdown functionality
    const sortBtn = document.getElementById('appointment-sort-btn');
    const mobileSortBtn = document.getElementById('mobile-appointment-sort-btn');
    const sortOptions = document.getElementById('appointment-sort-options');
    
    if (sortBtn && sortOptions) {
        sortBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sortOptions.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            sortOptions.classList.remove('show');
        });
        
        // Handle sort option selection
        const sortOptionElements = sortOptions.querySelectorAll('.appointment-sort-option');
        sortOptionElements.forEach(option => {
            option.addEventListener('click', function() {
                const sortType = this.getAttribute('data-sort');
                handleAppointmentSort(sortType);
                sortOptions.classList.remove('show');
            });
        });
    }
    
    // Mobile sort button
    if (mobileSortBtn) {
        mobileSortBtn.addEventListener('click', function() {
            // Cycle through sort options for mobile
            const sortTypes = ['date-desc', 'date-asc', 'status', 'customer'];
            const currentIndex = sortTypes.indexOf(currentSort);
            const nextIndex = (currentIndex + 1) % sortTypes.length;
            handleAppointmentSort(sortTypes[nextIndex]);
        });
    }
    
    // Refresh functionality
    const refreshBtn = document.getElementById('appointment-refresh-btn');
    const mobileRefreshBtn = document.getElementById('mobile-appointment-refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAppointments();
        });
    }
    
    if (mobileRefreshBtn) {
        mobileRefreshBtn.addEventListener('click', function() {
            loadAppointments();
        });
    }
    
    // View toggle functionality
    const cardViewBtn = document.getElementById('card-view-btn');
    const tableViewBtn = document.getElementById('table-view-btn');
    
    if (cardViewBtn && tableViewBtn) {
        cardViewBtn.addEventListener('click', function() {
            if (currentView !== 'cards') {
                currentView = 'cards';
                
                // Update button states
                cardViewBtn.classList.add('active');
                tableViewBtn.classList.remove('active');
                
                // Re-render view
                renderAppointmentView();
            }
        });
        
        tableViewBtn.addEventListener('click', function() {
            if (currentView !== 'table') {
                currentView = 'table';
                
                // Update button states
                tableViewBtn.classList.add('active');
                cardViewBtn.classList.remove('active');
                
                // Re-render view
                renderAppointmentView();
            }
        });
    }
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
        updateAppointmentCount();
        
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

// Search appointments
function searchAppointments(searchTerm) {
    if (!searchTerm.trim()) {
        filteredAppointments = [...allAppointments];
    } else {
        const term = searchTerm.toLowerCase();
        filteredAppointments = allAppointments.filter(appointment => {
            return (
                (appointment.customerName || appointment.fullName || '').toLowerCase().includes(term) ||
                (appointment.appointmentCode || '').toLowerCase().includes(term) ||
                (appointment.contactNumber || appointment.phoneNumber || '').includes(term) ||
                (appointment.purpose || appointment.appointmentType || '').toLowerCase().includes(term) ||
                (appointment.notes || '').toLowerCase().includes(term)
            );
        });
    }
    
    applyAppointmentSorting();
    renderAppointmentView();
    updateAppointmentCount();
}

// Handle appointment sorting
function handleAppointmentSort(sortType) {
    currentSort = sortType;
    applyAppointmentSorting();
    renderAppointmentView();
}

// Update appointment count in control bar
function updateAppointmentCount() {
    const countElements = document.querySelectorAll('.appointment-count');
    countElements.forEach(element => {
        element.textContent = filteredAppointments.length;
    });
}

// Render appointment view
function renderAppointmentView() {
    if (!appointmentsContainer) return;
    
    // Update appointment count
    updateAppointmentCount();
    
    const emptyStateElement = document.getElementById('appointments-empty-state');
    const cardsContainer = document.getElementById('appointment-cards-container');
    const tableContainer = document.getElementById('appointment-table-container');
    
    if (filteredAppointments.length === 0) {
        if (emptyStateElement) {
            emptyStateElement.style.display = 'block';
        }
        if (cardsContainer) {
            cardsContainer.style.display = 'none';
        }
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        return;
    }
    
    // Hide empty state
    if (emptyStateElement) {
        emptyStateElement.style.display = 'none';
    }
    
    // Show appropriate view based on current view setting
    if (currentView === 'cards') {
        if (cardsContainer) {
            cardsContainer.style.display = 'block'; // Changed from 'flex' to 'block' to allow grid layout
        }
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        renderAppointmentCards();
    } else {
        if (cardsContainer) {
            cardsContainer.style.display = 'none';
        }
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
        renderAppointmentTable();
    }
}

// Render appointment cards
function renderAppointmentCards() {
    const cardsContainer = document.getElementById('appointment-cards');
    if (!cardsContainer) return;
    
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
            <div class="transaction-card" data-appointment-id="${appointment.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="customer-info-centered">
                            <h4 title="${customerName}">${customerName}</h4>
                            <span class="transaction-code">${appointment.appointmentCode || appointment.id.substring(0, 8)}</span>
                        </div>
                        <div class="card-status-top">
                            <span class="status-badge ${statusClass}">${appointmentStatus}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="card-details">
                            <div class="detail-item">
                                <span class="detail-label">Date and Time</span>
                                <span class="detail-value">${appointmentDateTime}</span>
                            </div>
                            <div class="card-details-row">
                                <div class="detail-item">
                                    <span class="detail-label">Email</span>
                                    <span class="detail-value">${appointment.email || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Contact Number</span>
                                    <span class="detail-value">${contactNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-actions-bottom">
                    <div class="card-actions">
                        <button class="card-action-btn" title="Proceed to Transaction" onclick="proceedToTransaction('${appointment.id}')">
                            <i class='bx bx-right-arrow-alt'></i>
                        </button>
                        ${appointmentStatus === 'Scheduled' || appointmentStatus === 'Pending' ? `
                        <button class="card-action-btn" title="Confirm Booking" onclick="confirmAppointment('${appointment.id}')">
                            <i class='bx bx-check'></i>
                        </button>
                        <button class="card-action-btn" title="Cancel Booking" onclick="cancelAppointment('${appointment.id}')">
                            <i class='bx bx-x'></i>
                        </button>
                        ` : ''}
                        ${appointmentStatus === 'Cancelled' ? `
                        <button class="card-action-btn" title="Undo Cancellation" onclick="undoCancelAppointment('${appointment.id}')">
                            <i class='bx bx-undo'></i>
                        </button>
                        ` : ''}
                        ${appointmentStatus === 'Confirmed' ? `
                        <button class="card-action-btn" title="Undo Confirmation" onclick="undoConfirmAppointment('${appointment.id}')">
                            <i class='bx bx-undo'></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        cards.push(card);
    }
    
    cardsContainer.innerHTML = cards.join('');
}

// Render appointment table
function renderAppointmentTable() {
    const tableBody = document.getElementById('appointment-history-tbody');
    if (!tableBody) return;
    
    if (filteredAppointments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state-row">
                    <div class="empty-state">
                        <i class='bx bx-calendar-x'></i>
                        <h3>No appointments found</h3>
                        <p>No appointment records match your current search or filter criteria.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const tableRows = [];
    
    for (const appointment of filteredAppointments) {
        // Calculate appointment status
        const { appointmentStatus, statusClass } = calculateAppointmentStatus(appointment);
        
        // Format appointment date and time
        const appointmentDateTime = formatAppointmentDateTime(appointment);
        
        // Format customer info
        const customerName = appointment.customerName || appointment.fullName || 'Unknown Customer';
        const contactNumber = appointment.contactNumber || appointment.phoneNumber || 'N/A';
        const email = appointment.email || 'N/A';
        
        const row = `
            <tr data-appointment-id="${appointment.id}">
                <td>
                    <div class="customer-info">
                        <strong class="customer-name">${customerName}</strong>
                        <small class="appointment-code">${appointment.appointmentCode || appointment.id.substring(0, 8)}</small>
                    </div>
                </td>
                <td>${email}</td>
                <td>${contactNumber}</td>
                <td>${appointmentDateTime}</td>
                <td>
                    <div class="action-buttons">
                        <button class="proceed-transaction-btn" data-id="${appointment.id}" title="Proceed to Transaction">
                            <i class='bx bx-right-arrow-alt'></i>
                        </button>
                        ${appointmentStatus === 'Scheduled' || appointmentStatus === 'Pending' ? `
                            <button class="confirm-appointment-btn" data-id="${appointment.id}" title="Confirm Booking">
                                <i class='bx bx-check'></i>
                            </button>
                            <button class="cancel-appointment-btn" data-id="${appointment.id}" title="Cancel Booking">
                                <i class='bx bx-x'></i>
                            </button>
                        ` : ''}
                        ${appointmentStatus === 'Cancelled' ? `
                            <button class="undo-cancel-appointment-btn" data-id="${appointment.id}" title="Undo Cancellation">
                                <i class='bx bx-undo'></i>
                            </button>
                        ` : ''}
                        ${appointmentStatus === 'Confirmed' ? `
                            <button class="undo-confirm-appointment-btn" data-id="${appointment.id}" title="Undo Confirmation">
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
    
    // Check if appointment is confirmed
    if (appointment.status === 'confirmed' || appointment.confirmed) {
        appointmentStatus = 'Confirmed';
        statusClass = 'status-confirmed';
    }
    // Check if appointment date has passed
    else if (apptDay && today > apptDay) {
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

// Add action listeners for appointment cards and table
function addAppointmentActionListeners() {
    // Proceed to transaction buttons
    document.querySelectorAll('.proceed-transaction-btn, .card-action-btn[onclick*="proceedToTransaction"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id || btn.onclick.toString().match(/'([^']+)'/)[1];
            proceedToTransaction(appointmentId);
        });
    });

    // Confirm appointment buttons
    document.querySelectorAll('.confirm-appointment-btn, .card-action-btn[onclick*="confirmAppointment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id || btn.onclick.toString().match(/'([^']+)'/)[1];
            confirmAppointment(appointmentId);
        });
    });

    // Cancel appointment buttons
    document.querySelectorAll('.cancel-appointment-btn, .card-action-btn[onclick*="cancelAppointment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id || btn.onclick.toString().match(/'([^']+)'/)[1];
            cancelAppointment(appointmentId);
        });
    });

    // Undo cancellation buttons
    document.querySelectorAll('.undo-cancel-appointment-btn, .card-action-btn[onclick*="undoCancelAppointment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id || btn.onclick.toString().match(/'([^']+)'/)[1];
            undoCancelAppointment(appointmentId);
        });
    });

    // Undo confirmation buttons
    document.querySelectorAll('.undo-confirm-appointment-btn, .card-action-btn[onclick*="undoConfirmAppointment"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id || btn.onclick.toString().match(/'([^']+)'/)[1];
            undoConfirmAppointment(appointmentId);
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

// Action functions for appointments
function proceedToTransaction(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        console.error('Appointment not found:', appointmentId);
        return;
    }
    
    // For now, show an alert - you can implement actual transaction flow later
    alert(`Proceeding to transaction for appointment: ${appointment.customerName || appointment.fullName || 'Unknown Customer'}`);
    console.log('Proceed to transaction for appointment:', appointment);
}

async function confirmAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        console.error('Appointment not found:', appointmentId);
        return;
    }
    
    if (!confirm(`Are you sure you want to confirm the appointment for ${appointment.customerName || appointment.fullName || 'Unknown Customer'}?`)) {
        return;
    }
    
    try {
        // Update appointment status in Firebase
        await updateDoc(doc(chandriaDB, 'appointments', appointmentId), {
            status: 'confirmed',
            confirmed: true,
            confirmedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        const index = allAppointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
            allAppointments[index].status = 'confirmed';
            allAppointments[index].confirmed = true;
            allAppointments[index].confirmedDate = new Date().toISOString();
        }
        
        // Re-render view
        filteredAppointments = [...allAppointments];
        renderAppointmentView();
        
        alert('Appointment confirmed successfully!');
    } catch (error) {
        console.error('Error confirming appointment:', error);
        alert('Failed to confirm appointment. Please try again.');
    }
}

async function undoCancelAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        console.error('Appointment not found:', appointmentId);
        return;
    }
    
    if (!confirm(`Are you sure you want to undo the cancellation for ${appointment.customerName || appointment.fullName || 'Unknown Customer'}?`)) {
        return;
    }
    
    try {
        // Update appointment status in Firebase
        await updateDoc(doc(chandriaDB, 'appointments', appointmentId), {
            status: 'scheduled',
            cancelled: false,
            cancelledDate: null,
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        const index = allAppointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
            allAppointments[index].status = 'scheduled';
            allAppointments[index].cancelled = false;
            delete allAppointments[index].cancelledDate;
        }
        
        // Re-render view
        filteredAppointments = [...allAppointments];
        renderAppointmentView();
        
        alert('Appointment cancellation undone successfully!');
    } catch (error) {
        console.error('Error undoing appointment cancellation:', error);
        alert('Failed to undo cancellation. Please try again.');
    }
}

async function undoConfirmAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        console.error('Appointment not found:', appointmentId);
        return;
    }
    
    if (!confirm(`Are you sure you want to undo the confirmation for ${appointment.customerName || appointment.fullName || 'Unknown Customer'}?`)) {
        return;
    }
    
    try {
        // Update appointment status in Firebase
        await updateDoc(doc(chandriaDB, 'appointments', appointmentId), {
            status: 'scheduled',
            confirmed: false,
            confirmedDate: null,
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        const index = allAppointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
            allAppointments[index].status = 'scheduled';
            allAppointments[index].confirmed = false;
            delete allAppointments[index].confirmedDate;
        }
        
        // Re-render view
        filteredAppointments = [...allAppointments];
        renderAppointmentView();
        
        alert('Appointment confirmation undone successfully!');
    } catch (error) {
        console.error('Error undoing appointment confirmation:', error);
        alert('Failed to undo confirmation. Please try again.');
    }
}

// Export functions to global scope
window.loadAppointments = loadAppointments;
window.renderAppointmentView = renderAppointmentView;
window.applyAppointmentSorting = applyAppointmentSorting;

console.log('Customer logs appointment module loaded');
