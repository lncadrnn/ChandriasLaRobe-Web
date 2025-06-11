// Clean Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    loadDashboardData();
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
});

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const dateTimeString = now.toLocaleDateString('en-US', options);
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = dateTimeString;
    }
}

function loadDashboardData() {
    updateDashboardCards();
    loadRecentRentals();
    loadRecentAppointments();
}

function updateDashboardCards() {
    const data = {
        totalRentals: 142,
        activeRentals: 8,
        totalAppointments: 23,
        totalRevenue: 45750
    };
    
    document.getElementById('totalRentals').textContent = data.totalRentals;
    document.getElementById('activeRentals').textContent = data.activeRentals;
    document.getElementById('totalAppointments').textContent = data.totalAppointments;
    document.getElementById('totalRevenue').textContent = `₱${data.totalRevenue.toLocaleString()}`;
}

function loadRecentRentals() {
    const recentRentals = [
        {
            renteeName: 'Maria Santos',
            transactionCode: 'TXN-2024-001',
            remainingBalance: 1500,
            status: 'active',
            details: 'Wedding Gown - Classic White'
        },
        {
            renteeName: 'Ana Rodriguez',
            transactionCode: 'TXN-2024-002',
            remainingBalance: 0,
            status: 'completed',
            details: 'Evening Dress - Navy Blue'
        },
        {
            renteeName: 'Carmen dela Cruz',
            transactionCode: 'TXN-2024-003',
            remainingBalance: 800,
            status: 'overdue',
            details: 'Cocktail Dress - Red'
        },
        {
            renteeName: 'Sophia Lim',
            transactionCode: 'TXN-2024-004',
            remainingBalance: 0,
            status: 'completed',
            details: 'Ball Gown - Pink'
        },
        {
            renteeName: 'Isabella Torres',
            transactionCode: 'TXN-2024-005',
            remainingBalance: 2100,
            status: 'pending',
            details: 'Prom Dress - Purple'
        }
    ];
    
    renderRentalsTable(recentRentals);
}

function loadRecentAppointments() {
    const recentAppointments = [
        {
            customer: { name: 'Elena Reyes', email: 'elena.reyes@email.com' },
            service: 'Fitting Session',
            date: '2024-01-18',
            time: '2:00 PM',
            status: 'confirmed',
            contact: '+63 912 345 6789'
        },
        {
            customer: { name: 'Patricia Mendoza', email: 'pat.mendoza@email.com' },
            service: 'Consultation',
            date: '2024-01-18',
            time: '4:30 PM',
            status: 'confirmed',
            contact: '+63 917 234 5678'
        },
        {
            customer: { name: 'Gabriela Castro', email: 'gabi.castro@email.com' },
            service: 'Dress Selection',
            date: '2024-01-19',
            time: '10:00 AM',
            status: 'pending',
            contact: '+63 915 678 9012'
        },        {
            customer: { name: 'Valentina Ramos', email: 'val.ramos@email.com' },
            service: 'Final Fitting',
            date: '2024-01-19',
            time: '1:00 PM',
            status: 'confirmed',
            contact: '+63 918 345 6789'
        },
        {
            customer: { name: 'Cristina Flores', email: 'cristina.flores@email.com' },
            service: 'Fitting Session',
            date: '2024-01-20',
            time: '11:30 AM',
            status: 'pending',
            contact: '+63 920 123 4567'
        }
    ];
    
    renderAppointmentsTable(recentAppointments);
}

function renderRentalsTable(rentals) {
    const tbody = document.getElementById('recentRentalsBody');
    if (!tbody) return;
    
    if (rentals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class='bx bx-package'></i>
                    <h3>No recent rentals</h3>
                    <p>Recent rental activity will appear here</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = rentals.map(rental => `
        <tr>
            <td class="col-customer">
                <div class="customer-info">
                    <div class="customer-avatar">
                        ${rental.renteeName.charAt(0)}
                    </div>
                    <div class="customer-details">
                        <div class="customer-name">${rental.renteeName}</div>
                    </div>
                </div>
            </td>
            <td class="col-transaction">
                <div class="transaction-code">${rental.transactionCode}</div>
            </td>
            <td class="col-balance">
                <div class="balance-text">₱${rental.remainingBalance.toLocaleString()}</div>
            </td>
            <td class="col-status">
                <span class="status-badge ${rental.status}">${rental.status}</span>
            </td>
            <td class="col-details">
                <button class="details-btn" onclick="viewDetails('${rental.transactionCode}')">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('recentAppointmentsBody');
    if (!tbody) return;
    
    if (appointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    <i class='bx bx-calendar'></i>
                    <h3>No recent appointments</h3>
                    <p>Recent appointment activity will appear here</p>
                </td>
            </tr>
        `;
        return;
    }
      tbody.innerHTML = appointments.map(appointment => {
        const formattedDate = formatAppointmentDate(appointment.date);
        const bookingDescription = `has booked an appointment for fitting on ${formattedDate} at ${appointment.time}`;
        
        return `
            <tr>
                <td class="col-customer-appointments">
                    <div class="customer-info">
                        <div class="customer-avatar">
                            ${appointment.customer.name.charAt(0)}
                        </div>
                        <div class="customer-details">
                            <div class="customer-name">${appointment.customer.name}</div>
                            <div class="customer-email">${appointment.customer.email}</div>
                        </div>
                    </div>
                </td>
                <td class="col-booking-description">
                    <div class="booking-description">${bookingDescription}</div>
                </td>
                <td class="col-details">
                    <button class="details-btn" onclick="viewAppointmentDetails('${appointment.customer.name}', '${appointment.date}')">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatAppointmentDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Function to handle rental details button click
function viewDetails(transactionCode) {
    alert(`Viewing details for transaction: ${transactionCode}`);
    // This can be replaced with actual modal or navigation logic
}

// Function to handle appointment details button click
function viewAppointmentDetails(customerName, appointmentDate) {
    alert(`Viewing appointment details for ${customerName} on ${formatAppointmentDate(appointmentDate)}`);
    // This can be replaced with actual modal or navigation logic
}
