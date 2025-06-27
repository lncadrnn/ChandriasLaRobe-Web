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
        const sortOptionElements = sortOptions.querySelectorAll('.sort-option');
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
        const mobileSortOptions = document.getElementById('appointment-sort-options-mobile');
        
        mobileSortBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (mobileSortOptions) {
                mobileSortOptions.classList.toggle('show');
            }
        });
        
        // Close mobile dropdown when clicking outside
        document.addEventListener('click', function() {
            if (mobileSortOptions) {
                mobileSortOptions.classList.remove('show');
            }
        });
        
        // Handle mobile sort option selection
        if (mobileSortOptions) {
            const mobileSortOptionElements = mobileSortOptions.querySelectorAll('.sort-option');
            mobileSortOptionElements.forEach(option => {
                option.addEventListener('click', function() {
                    const sortType = this.getAttribute('data-sort');
                    handleAppointmentSort(sortType);
                    mobileSortOptions.classList.remove('show');
                });
            });
        }
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
            console.log('Card view button clicked, current view:', currentView);
            if (currentView !== 'cards') {
                currentView = 'cards';
                
                // Update button states
                cardViewBtn.classList.add('active');
                tableViewBtn.classList.remove('active');
                
                console.log('Switching to cards view');
                
                // Re-render view
                renderAppointmentView();
            }
        });
        
        tableViewBtn.addEventListener('click', function() {
            console.log('Table view button clicked, current view:', currentView);
            if (currentView !== 'table') {
                currentView = 'table';
                
                // Update button states
                tableViewBtn.classList.add('active');
                cardViewBtn.classList.remove('active');
                
                console.log('Switching to table view');
                
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
        
        console.log('Starting to load appointments from Firebase...');
        const appointmentRef = collection(chandriaDB, 'appointments');
        console.log('Collection reference created for: appointments');
        
        const snapshot = await getDocs(appointmentRef);
        console.log('Firestore query completed. Documents found:', snapshot.size);
        
        allAppointments = [];
        window.allAppointments = allAppointments; // Update global reference
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('Raw appointment data from Firebase:', doc.id, data); // Debug: Log raw data structure
            
            const appointment = {
                id: doc.id,
                ...data,
                // Normalize field names for consistency - expanded field mapping
                customerName: data.customerName || data.fullName || data.name || data.firstName || data.customer || data.clientName || '',
                contactNumber: data.contactNumber || data.phoneNumber || data.phone || data.mobile || data.contact || data.cellphone || data.customerContact || '',
                email: data.email || data.emailAddress || data.emailAddr || data.customerEmail || data.contactEmail || '',
                appointmentDate: data.appointmentDate || data.date || data.scheduledDate || data.bookingDate || data.appointmentDay || data.dateScheduled || data.checkoutDate || '',
                appointmentTime: data.appointmentTime || data.time || data.scheduledTime || data.bookingTime || data.timeSlot || data.timeScheduled || data.checkoutTime || '',
                purpose: data.purpose || data.appointmentType || data.type || data.service || data.serviceType || data.reason || 'Consultation',
                notes: data.notes || data.note || data.comments || data.message || data.additionalInfo || '',
                status: data.status || data.appointmentStatus || data.bookingStatus || 'scheduled'
            };
            
            console.log('Normalized appointment data:', appointment); // Debug: Log normalized data
            allAppointments.push(appointment);
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
        console.log('Sample appointment data:', allAppointments[0]); // Debug: Show first appointment structure
        
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
                (appointment.contactNumber || appointment.phoneNumber || '').includes(term) ||
                (appointment.email || appointment.emailAddress || '').toLowerCase().includes(term) ||
                (appointment.purpose || appointment.appointmentType || '').toLowerCase().includes(term) ||
                (appointment.notes || '').toLowerCase().includes(term)
            );
        });
    }
    
    console.log('Search term:', searchTerm, 'Found appointments:', filteredAppointments.length);
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
    const countElement = document.getElementById('appointment-count');
    const mobileCountElement = document.getElementById('appointment-count-mobile');
    
    if (countElement) {
        countElement.textContent = filteredAppointments.length;
    }
    
    if (mobileCountElement) {
        mobileCountElement.textContent = filteredAppointments.length;
    }
    
    console.log('Updated appointment count:', filteredAppointments.length);
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
            cardsContainer.classList.add('hidden');
        }
        if (tableContainer) {
            tableContainer.classList.add('hidden');
            tableContainer.classList.remove('show');
        }
        return;
    }
    
    // Hide empty state
    if (emptyStateElement) {
        emptyStateElement.style.display = 'none';
    }
    
    // Show appropriate view based on current view setting
    console.log('renderAppointmentView - currentView:', currentView);
    if (currentView === 'cards') {
        console.log('Showing cards view, hiding table view');
        if (cardsContainer) {
            cardsContainer.classList.remove('hidden');
        }
        if (tableContainer) {
            tableContainer.classList.add('hidden');
            tableContainer.classList.remove('show');
        }
        renderAppointmentCards();
    } else {
        console.log('Showing table view, hiding cards view');
        if (cardsContainer) {
            cardsContainer.classList.add('hidden');
        }
        if (tableContainer) {
            tableContainer.classList.remove('hidden');
            tableContainer.classList.add('show');
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
        
        // Format customer info with better fallbacks
        const customerName = appointment.customerName || appointment.fullName || appointment.name || 'Unknown Customer';
        const contactNumber = appointment.contactNumber || appointment.phoneNumber || appointment.phone || 'N/A';
        const email = appointment.email || appointment.emailAddress || 'N/A';
        const purpose = appointment.purpose || appointment.appointmentType || appointment.type || appointment.service || 'Consultation';
        
        const card = `
            <div class="transaction-card" data-appointment-id="${appointment.id}">
                <div class="card-content">
                    <div class="card-header">
                        <div class="customer-info-centered">
                            <h4 title="${customerName}">${customerName}</h4>
                            <p class="contact-subtitle">${contactNumber}</p>
                        </div>
                        <div class="card-status-top">
                            <span class="status-badge ${statusClass}">${appointmentStatus}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="card-details">
                            <div class="detail-item">
                                <span class="detail-label">Email</span>
                                <span class="detail-value">${appointment.email || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date and Time</span>
                                <span class="detail-value">${appointmentDateTime}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-actions-bottom">
                    <div class="card-actions">
                        <button class="card-action-btn view-details-btn" data-id="${appointment.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        <button class="card-action-btn edit-btn" data-id="${appointment.id}" title="Edit Appointment">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="card-action-btn delete-btn" data-id="${appointment.id}" title="Delete Appointment">
                            <i class='bx bx-trash'></i>
                        </button>
                        <button class="card-action-btn proceed-dashboard-btn" data-id="${appointment.id}" title="Proceed to Dashboard">
                            <i class='bx bx-right-arrow-alt'></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        cards.push(card);
    }
    
    cardsContainer.innerHTML = cards.join('');
    addAppointmentActionListeners();
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
        
        // Format customer info with better fallbacks
        const customerName = appointment.customerName || appointment.fullName || appointment.name || 'Unknown Customer';
        const contactNumber = appointment.contactNumber || appointment.phoneNumber || appointment.phone || 'N/A';
        const email = appointment.email || appointment.emailAddress || 'N/A';
        
        const row = `
            <tr data-appointment-id="${appointment.id}">
                <td>
                    <div class="customer-info">
                        <strong class="customer-name">${customerName}</strong>
                    </div>
                </td>
                <td>${email}</td>
                <td>${contactNumber}</td>
                <td>${appointmentDateTime}</td>
                <td>
                    <div class="action-buttons">
                        <button class="view-details-btn" data-id="${appointment.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        <button class="edit-btn" data-id="${appointment.id}" title="Edit Appointment">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="delete-btn" data-id="${appointment.id}" title="Delete Appointment">
                            <i class='bx bx-trash'></i>
                        </button>
                        <button class="proceed-dashboard-btn" data-id="${appointment.id}" title="Proceed to Dashboard">
                            <i class='bx bx-right-arrow-alt'></i>
                        </button>
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
    
    let appointmentStatus = 'Pending'; // Changed from 'Scheduled' to 'Pending'
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
        appointmentStatus = 'Pending'; // Changed from 'Scheduled' to 'Pending'
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
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id;
            showAppointmentDetails(appointmentId);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id;
            editAppointment(appointmentId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id;
            deleteAppointment(appointmentId);
        });
    });

    // Proceed to dashboard buttons
    document.querySelectorAll('.proceed-dashboard-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const appointmentId = btn.dataset.id;
            proceedToDashboard(appointmentId);
        });
    });
}

// Proceed to dashboard with appointment context
function proceedToDashboard(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    // Store appointment context in sessionStorage for the dashboard
    sessionStorage.setItem('selectedAppointment', JSON.stringify(appointment));
    sessionStorage.setItem('dashboardContext', 'appointment');
    
    // Navigate to dashboard
    window.location.href = './dashboard.html';
}

// Show appointment details modal
async function showAppointmentDetails(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const modal = document.getElementById('appointment-details-modal');
    const modalBody = document.getElementById('appointment-details-body');
    
    if (!modal || !modalBody) return;
    
    // Calculate appointment status
    const { appointmentStatus, statusClass } = calculateAppointmentStatus(appointment);
    
    // Format appointment date and time
    const appointmentDateTime = formatAppointmentDateTime(appointment);
      // Format customer info
    const customerName = appointment.customerName || appointment.fullName || appointment.name || 'Unknown Customer';
    const contactNumber = appointment.contactNumber || appointment.phoneNumber || appointment.phone || 'N/A';
    const email = appointment.email || appointment.emailAddress || 'N/A';
    const notes = appointment.notes || appointment.note || appointment.comments || 'None';

    // Fetch product details for cart items
    let productsHtml = '<p class="no-items">No products selected</p>';
    if (appointment.cartItems && Array.isArray(appointment.cartItems) && appointment.cartItems.length > 0) {
        try {
            const productDetails = await Promise.all(
                appointment.cartItems.map(async item => {
                    try {
                        let productDoc;
                        if (item.type === "accessory") {
                            productDoc = await getDoc(doc(chandriaDB, "additionals", item.productId));
                        } else {
                            productDoc = await getDoc(doc(chandriaDB, "products", item.productId));
                        }
                        
                        if (!productDoc.exists()) return null;
                        
                        const productData = productDoc.data();
                        return {
                            id: productDoc.id,
                            name: productData.name || productData.code || "Unknown",
                            code: productData.code || productData.name || "Unknown",
                            image: productData.frontImageUrl || productData.imageUrl || "",
                            price: productData.price || 0,
                            size: item.size || "",
                            quantity: item.quantity || 1,
                            type: item.type || "product",
                            category: productData.category || "N/A"
                        };
                    } catch (error) {
                        console.error('Error fetching product details:', error);
                        return null;
                    }
                })
            );
            
            const validProducts = productDetails.filter(Boolean);
            if (validProducts.length > 0) {
                productsHtml = validProducts.map(product => `
                    <div class="detail-product">
                        <div class="product-content">
                            <div class="product-info">
                                <h4>${product.name}</h4>
                                <div class="info-list">
                                    <div class="info-item">
                                        <span class="info-label">Code:</span>
                                        <span class="info-value">${product.code}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Price:</span>
                                        <span class="info-value">₱${product.price.toLocaleString()}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Category:</span>
                                        <span class="info-value">${product.category}</span>
                                    </div>
                                    ${product.size ? `
                                    <div class="info-item">
                                        <span class="info-label">Size:</span>
                                        <span class="info-value">${product.size}</span>
                                    </div>
                                    ` : ''}
                                    <div class="info-item">
                                        <span class="info-label">Quantity:</span>
                                        <span class="info-value">${product.quantity}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Type:</span>
                                        <span class="info-value">${product.type === 'accessory' ? 'Accessory' : 'Product'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="product-image">
                                ${product.image ? 
                                    `<img src="${product.image}" alt="${product.name}" class="modal-product-image">` : 
                                    `<div class="no-image-placeholder">No Image Available</div>`
                                }
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error fetching appointment products:', error);
            productsHtml = '<p class="no-items error">Error loading products</p>';
        }
    }

    modalBody.innerHTML = `
        <div class="appointment-details-container">
            <div class="detail-section">
                <h3><i class='bx bx-user'></i> Customer Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Full Name</span>
                        <span class="detail-value">${customerName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Contact Number</span>
                        <span class="detail-value">${contactNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email Address</span>
                        <span class="detail-value">${email}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class='bx bx-calendar'></i> Appointment Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Date & Time</span>
                        <span class="detail-value">${appointmentDateTime}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class='bx bx-package'></i> Selected Products</h3>
                <div class="products-detail">
                    ${productsHtml}
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class='bx bx-note'></i> Additional Information</h3>
                <div class="detail-item">
                    <span class="detail-label">Notes</span>
                    <span class="detail-value">${notes}</span>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn-secondary" onclick="closeAppointmentDetailsModal()">
                    <i class='bx bx-x'></i> Close
                </button>
                <button class="btn-primary" onclick="editAppointment('${appointmentId}')">
                    <i class='bx bx-edit'></i> Edit Appointment
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Edit appointment (shows edit modal)
function editAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const modal = document.getElementById('edit-appointment-modal');
    const form = document.getElementById('edit-appointment-form');
    
    if (!modal || !form) return;
    
    // Close appointment details modal if open
    closeAppointmentDetailsModal();
    
    // Populate form with appointment data
    document.getElementById('edit-appointment-customerName').value = appointment.customerName || appointment.fullName || appointment.name || '';
    document.getElementById('edit-appointment-contactNumber').value = appointment.contactNumber || appointment.phoneNumber || appointment.phone || '';
    document.getElementById('edit-appointment-email').value = appointment.email || appointment.emailAddress || '';
    
    // Format date for input (YYYY-MM-DD)
    const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : null;
    if (appointmentDate) {
        const formattedDate = appointmentDate.toISOString().split('T')[0];
        document.getElementById('edit-appointment-date').value = formattedDate;
    }
    
    document.getElementById('edit-appointment-time').value = appointment.appointmentTime || appointment.time || '';
    document.getElementById('edit-appointment-notes').value = appointment.notes || appointment.note || appointment.comments || '';
    
    // Store appointment ID for form submission
    form.dataset.appointmentId = appointmentId;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Delete appointment (shows delete confirmation modal)
async function deleteAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    const modal = document.getElementById('delete-appointment-modal');
    if (!modal) return;
      const customerName = appointment.customerName || appointment.fullName || appointment.name || 'Unknown Customer';
    const appointmentDateTime = formatAppointmentDateTime(appointment);

    // Populate modal with appointment data
    document.getElementById('delete-appointment-customer-name').textContent = customerName;
    document.getElementById('delete-appointment-datetime').textContent = appointmentDateTime;
    
    // Store appointment ID for deletion
    const confirmBtn = document.getElementById('confirm-delete-appointment-btn');
    confirmBtn.dataset.appointmentId = appointmentId;
    
    // Reset confirmation input
    const confirmInput = document.getElementById('delete-appointment-confirmation-input');
    confirmInput.value = '';
    confirmBtn.disabled = true;
    
    // Setup confirmation input listener
    confirmInput.addEventListener('input', function() {
        const isValid = this.value.trim().toUpperCase() === 'DELETE';
        confirmBtn.disabled = !isValid;
        
        if (isValid) {
            confirmBtn.classList.add('enabled');
        } else {
            confirmBtn.classList.remove('enabled');
        }
    });
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
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
    } else if (currentSort === 'event-asc') {
        // Sort by appointment date (earliest first)
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.appointmentDate || 0);
            const dateB = new Date(b.appointmentDate || 0);
            return dateA - dateB;
        });
    } else if (currentSort === 'event-desc') {
        // Sort by appointment date (latest first)
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.appointmentDate || 0);
            const dateB = new Date(b.appointmentDate || 0);
            return dateB - dateA;
        });
    }
    
    console.log('Applied sorting:', currentSort, 'Total appointments:', filteredAppointments.length);
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

// Modal close functions for appointments
function closeAppointmentDetailsModal() {
    const modal = document.getElementById('appointment-details-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function closeEditAppointmentModal() {
    const modal = document.getElementById('edit-appointment-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function closeDeleteAppointmentModal() {
    const modal = document.getElementById('delete-appointment-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Confirm delete appointment
async function confirmDeleteAppointment() {
    const confirmBtn = document.getElementById('confirm-delete-appointment-btn');
    const appointmentId = confirmBtn.dataset.appointmentId;
    
    if (!appointmentId) return;
    
    const appointment = allAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const customerName = appointment.customerName || appointment.fullName || appointment.name || 'Unknown Customer';
    
    try {
        // Show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        
        // Delete appointment from Firebase
        await deleteDoc(doc(chandriaDB, 'appointments', appointmentId));
        
        // Remove from local arrays
        const allIndex = allAppointments.findIndex(a => a.id === appointmentId);
        if (allIndex !== -1) {
            allAppointments.splice(allIndex, 1);
        }
        
        const filteredIndex = filteredAppointments.findIndex(a => a.id === appointmentId);
        if (filteredIndex !== -1) {
            filteredAppointments.splice(filteredIndex, 1);
        }
        
        // Close modal
        closeDeleteAppointmentModal();
        
        // Re-render view
        renderAppointmentView();
        
        if (window.showNotification) {
            window.showNotification(`Appointment for ${customerName} has been deleted.`, 'success');
        } else {
            alert(`Appointment for ${customerName} has been deleted.`);
        }
        
    } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Error deleting appointment. Please try again.');
        
        // Reset button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="bx bx-trash"></i> DELETE FOREVER';
    }
}

// Handle edit appointment form submission
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('edit-appointment-form');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const appointmentId = this.dataset.appointmentId;
            if (!appointmentId) return;
            
            const formData = new FormData(this);
            const appointmentData = {};
            
            // Convert form data to object
            for (let [key, value] of formData.entries()) {
                appointmentData[key] = value.trim();
            }
            
            // Add timestamp for last updated
            appointmentData.lastUpdated = new Date().toISOString();
            
            try {
                // Show loading state
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalContent = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
                
                // Update appointment in Firebase
                await updateDoc(doc(chandriaDB, 'appointments', appointmentId), appointmentData);
                
                // Update local data
                const appointmentIndex = allAppointments.findIndex(a => a.id === appointmentId);
                if (appointmentIndex !== -1) {
                    allAppointments[appointmentIndex] = {
                        ...allAppointments[appointmentIndex],
                        ...appointmentData
                    };
                }
                
                // Update filtered appointments
                const filteredIndex = filteredAppointments.findIndex(a => a.id === appointmentId);
                if (filteredIndex !== -1) {
                    filteredAppointments[filteredIndex] = {
                        ...filteredAppointments[filteredIndex],
                        ...appointmentData
                    };
                }
                
                // Close modal
                closeEditAppointmentModal();
                
                // Re-render view
                renderAppointmentView();
                
                if (window.showNotification) {
                    window.showNotification('Appointment updated successfully!', 'success');
                } else {
                    alert('Appointment updated successfully!');
                }
                
                // Reset form
                this.reset();
                delete this.dataset.appointmentId;
                
            } catch (error) {
                console.error('Error updating appointment:', error);
                alert('Error updating appointment. Please try again.');
            } finally {
                // Reset button
                const submitBtn = this.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        });
    }
});

// Global functions for modal access
window.closeAppointmentDetailsModal = closeAppointmentDetailsModal;
window.closeEditAppointmentModal = closeEditAppointmentModal;
window.closeDeleteAppointmentModal = closeDeleteAppointmentModal;
window.confirmDeleteAppointment = confirmDeleteAppointment;

// ...existing code...
