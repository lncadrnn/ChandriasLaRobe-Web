import { firebaseConfig } from '../../firebase-config.js';

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const body = document.querySelector("body"),
        sidebar = body.querySelector(".sidebar"),
        toggle = body.querySelector(".toggle");

    // --- Restore sidebar state from localStorage ---
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle (chevron)
    toggle.addEventListener("click", () => {
        const isClosed = sidebar.classList.toggle("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Transaction History Management
    let allTransactions = [];
    let filteredTransactions = [];

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const tableBody = document.getElementById('rental-history-tbody');

    // Fetch transactions from Firebase
    async function fetchTransactionHistory() {
        try {
            console.log("Fetching transaction history from Firebase...");
            showLoading();

            const snapshot = await db.collection("transaction")
                .orderBy("timestamp", "desc")
                .get();
            
            console.log("Found", snapshot.docs.length, "transactions");
            
            allTransactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });

            filteredTransactions = [...allTransactions];
            renderTransactionTable();
            
        } catch (error) {
            console.error("Error fetching transaction history:", error);
            showError("Failed to load transaction history. Please try again.");
        }
    }

    // Render transaction table
    function renderTransactionTable() {
        if (filteredTransactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        <i class='bx bx-file'></i> No transactions found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredTransactions.map(transaction => {
            // Calculate status based on dates
            const currentDate = new Date();
            const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
            const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
            
            let rentalStatus = 'Upcoming';
            let statusClass = 'status-upcoming';
            
            if (eventStartDate) {
                if (eventEndDate) {
                    // Open rental with end date
                    if (currentDate < eventStartDate) {
                        rentalStatus = 'Upcoming';
                        statusClass = 'status-upcoming';
                    } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                        rentalStatus = 'Ongoing';
                        statusClass = 'status-ongoing';
                    } else if (currentDate > eventEndDate) {
                        rentalStatus = 'Completed';
                        statusClass = 'status-completed';
                    }
                } else {
                    // Fixed rental (single day)
                    if (currentDate < eventStartDate) {
                        rentalStatus = 'Upcoming';
                        statusClass = 'status-upcoming';
                    } else if (currentDate.toDateString() === eventStartDate.toDateString()) {
                        rentalStatus = 'Ongoing';
                        statusClass = 'status-ongoing';
                    } else if (currentDate > eventStartDate) {
                        rentalStatus = 'Completed';
                        statusClass = 'status-completed';
                    }
                }
            }

            // Calculate payment status
            const totalPayment = parseFloat(transaction.totalPayment) || 0;
            const remainingBalance = parseFloat(transaction.remainingBalance) || 0;
            const paymentStatus = remainingBalance > 0 ? 
                `Balance: ₱${remainingBalance.toLocaleString()}` : 
                'Fully Paid';
            const paymentClass = remainingBalance > 0 ? 'payment-balance' : 'payment-fully-paid';

            // Format event date
            let eventDateDisplay = 'N/A';
            if (eventStartDate) {
                if (eventEndDate && transaction.rentalType === 'Open Rental') {
                    eventDateDisplay = `${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}`;
                } else {
                    eventDateDisplay = eventStartDate.toLocaleDateString();
                }
            }

            return `
                <tr data-transaction-id="${transaction.id}">
                    <td><strong>${transaction.fullName || 'Unknown'}</strong></td>
                    <td><code>${transaction.transactionCode || transaction.id.substring(0, 8)}</code></td>
                    <td>${eventDateDisplay}</td>
                    <td><span class="payment-status ${paymentClass}">${paymentStatus}</span></td>
                    <td><span class="status-badge ${statusClass}">${rentalStatus}</span></td>
                    <td><strong>₱${totalPayment.toLocaleString()}</strong></td>
                    <td><button class="action-btn view-details" data-id="${transaction.id}">View Details</button></td>
                </tr>
            `;
        }).join('');

        // Add click event listeners for view details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transactionId = e.target.dataset.id;
                showTransactionDetails(transactionId);
            });
        });
    }

    // Show transaction details (placeholder for now)
    function showTransactionDetails(transactionId) {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (transaction) {
            // For now, just log the transaction details
            console.log('Transaction details:', transaction);
            alert(`Transaction Details:\n\nCustomer: ${transaction.fullName}\nCode: ${transaction.transactionCode}\nEvent Type: ${transaction.eventType || 'N/A'}\nRental Type: ${transaction.rentalType || 'N/A'}\nContact: ${transaction.contactNumber || 'N/A'}`);
        }
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            filteredTransactions = [...allTransactions];
        } else {
            filteredTransactions = allTransactions.filter(transaction => {
                return (
                    (transaction.fullName || '').toLowerCase().includes(searchTerm) ||
                    (transaction.transactionCode || '').toLowerCase().includes(searchTerm) ||
                    (transaction.contactNumber || '').toLowerCase().includes(searchTerm) ||
                    (transaction.eventType || '').toLowerCase().includes(searchTerm) ||
                    (transaction.rentalType || '').toLowerCase().includes(searchTerm)
                );
            });
        }
        
        renderTransactionTable();
    }

    // Show loading state
    function showLoading() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-loading">
                    <i class='bx bx-loader-alt bx-spin'></i> Loading rental history...
                </td>
            </tr>
        `;
    }

    // Show error state
    function showError(message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">
                    <i class='bx bx-error'></i> ${message}
                </td>
            </tr>
        `;
    }

    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    refreshBtn.addEventListener('click', fetchTransactionHistory);

    // Initial load
    fetchTransactionHistory();
});
