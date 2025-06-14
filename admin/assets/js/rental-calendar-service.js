// Rental Calendar Service
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(window.firebaseConfig);
        const db = firebase.firestore();
        
        // Calendar state
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();
        let rentalsData = [];
        let filteredStatus = 'all';
          // DOM elements
        const calendarDays = document.getElementById('calendar-days');
        const currentMonthYear = document.getElementById('current-month-year');
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        const todayBtn = document.getElementById('today-btn');
        const statusFilter = document.getElementById('status-filter');
        const modal = document.getElementById('rental-details-modal');
        const modalTitle = document.getElementById('modal-date-title');
        const rentalDetailsList = document.getElementById('rental-details-list');
        const closeModalBtn = document.querySelector('.close-modal');
        
        // Validate critical DOM elements
        if (!modal) console.error('❌ Modal element not found: rental-details-modal');
        if (!modalTitle) console.error('❌ Modal title element not found: modal-date-title');
        if (!rentalDetailsList) console.error('❌ Rental details list element not found: rental-details-list');
        if (!closeModalBtn) console.error('❌ Close modal button not found: .close-modal');
        
        // Month names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Initialize calendar
        init();
        
        function init() {
            setupEventListeners();
            fetchRentalsData();
            renderCalendar();
        }
        
        function setupEventListeners() {
            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
            });
            
            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            });
            
            todayBtn.addEventListener('click', () => {
                const today = new Date();
                currentMonth = today.getMonth();
                currentYear = today.getFullYear();
                renderCalendar();
            });
            
            statusFilter.addEventListener('change', (e) => {
                filteredStatus = e.target.value;
                renderCalendar();
            });
              closeModalBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
            
            // Global click handler to close quick view when clicking outside
            document.addEventListener('click', (e) => {
                const quickView = document.getElementById('active-quick-view');
                if (quickView && !quickView.contains(e.target)) {
                    // Check if the click is not on a rental item (which would open a new quick view)
                    if (!e.target.classList.contains('rental-item')) {
                        closeQuickView();
                    }
                }
            });
        }
          // =============== UI HELPER FUNCTIONS ===============
        
        function showLoading() {
            const calendarContainer = document.getElementById('calendar-container');
            if (calendarContainer) {
                const loadingOverlay = document.createElement('div');
                loadingOverlay.id = 'calendar-loading';
                loadingOverlay.className = 'calendar-loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading rental data...</p>
                    </div>
                `;
                calendarContainer.appendChild(loadingOverlay);
            }
        }
        
        function hideLoading() {
            const loadingOverlay = document.getElementById('calendar-loading');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
        
        function showError(message = 'An error occurred while loading data') {
            const calendarContainer = document.getElementById('calendar-container');
            if (calendarContainer) {
                const errorOverlay = document.createElement('div');
                errorOverlay.className = 'calendar-error-overlay';
                errorOverlay.innerHTML = `
                    <div class="error-content">
                        <i class="bx bx-error-circle"></i>
                        <h3>Loading Error</h3>
                        <p>${message}</p>
                        <button class="btn-retry" onclick="location.reload()">
                            <i class="bx bx-refresh"></i> Retry
                        </button>
                    </div>
                `;
                calendarContainer.appendChild(errorOverlay);
            }
        }        function closeModal() {
            console.log('🔒 closeModal called');
            if (modal) {
                // Enhanced modal closing logic
                modal.classList.remove('visible');
                modal.style.display = 'none';
                document.body.style.overflow = '';
                
                // Clear any lingering content to prevent issues
                setTimeout(() => {
                    if (!modal.classList.contains('visible')) {
                        rentalDetailsList.innerHTML = '';
                    }
                }, 300);
                
                console.log('✅ Modal closed with enhanced logic');
            }
        }

        // =============== TRANSACTION DATA FETCHING UTILITIES ===============
        
        async function fetchTransactionById(transactionId) {
            try {
                console.log('🔍 Fetching transaction:', transactionId);
                const doc = await db.collection("transaction").doc(transactionId).get();
                
                if (!doc.exists) {
                    console.warn('⚠️ Transaction not found:', transactionId);
                    return null;
                }
                
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    status: calculateRentalStatus(data),
                    // Convert timestamps
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                    eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : (data.eventDate ? new Date(data.eventDate) : null),
                    eventStartDate: data.eventStartDate?.toDate ? data.eventStartDate.toDate() : (data.eventStartDate ? new Date(data.eventStartDate) : null),
                    eventEndDate: data.eventEndDate?.toDate ? data.eventEndDate.toDate() : (data.eventEndDate ? new Date(data.eventEndDate) : null)
                };
            } catch (error) {
                console.error('❌ Error fetching transaction:', error);
                return null;
            }
        }
        
        async function fetchTransactionsByDateRange(startDate, endDate) {
            try {
                console.log('📅 Fetching transactions for date range:', startDate, 'to', endDate);
                
                const snapshot = await db.collection("transaction")
                    .where("eventStartDate", ">=", startDate)
                    .where("eventStartDate", "<=", endDate)
                    .orderBy("eventStartDate", "asc")
                    .get();
                
                const transactions = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        status: calculateRentalStatus(data),
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                        eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : (data.eventDate ? new Date(data.eventDate) : null),
                        eventStartDate: data.eventStartDate?.toDate ? data.eventStartDate.toDate() : (data.eventStartDate ? new Date(data.eventStartDate) : null),
                        eventEndDate: data.eventEndDate?.toDate ? data.eventEndDate.toDate() : (data.eventEndDate ? new Date(data.eventEndDate) : null)
                    };
                });
                
                console.log(`✅ Found ${transactions.length} transactions in date range`);
                return transactions;
                
            } catch (error) {
                console.error('❌ Error fetching transactions by date range:', error);
                return [];
            }
        }
        
        async function fetchTransactionsByStatus(status) {
            try {
                console.log('🔍 Fetching transactions with status:', status);
                
                // Since status is calculated, we need to fetch all and filter
                const snapshot = await db.collection("transaction")
                    .orderBy("timestamp", "desc")
                    .get();
                
                const transactions = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        status: calculateRentalStatus(data),
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                        eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : (data.eventDate ? new Date(data.eventDate) : null),
                        eventStartDate: data.eventStartDate?.toDate ? data.eventStartDate.toDate() : (data.eventStartDate ? new Date(data.eventStartDate) : null),
                        eventEndDate: data.eventEndDate?.toDate ? data.eventEndDate.toDate() : (data.eventEndDate ? new Date(data.eventEndDate) : null)
                    };
                }).filter(transaction => transaction.status === status);
                
                console.log(`✅ Found ${transactions.length} transactions with status: ${status}`);
                return transactions;
                
            } catch (error) {
                console.error('❌ Error fetching transactions by status:', error);
                return [];
            }
        }
        
        async function fetchOverdueTransactions() {
            try {
                console.log('⏰ Fetching overdue transactions...');
                
                const currentDate = new Date();
                const snapshot = await db.collection("transaction")
                    .orderBy("timestamp", "desc")
                    .get();
                
                const overdueTransactions = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const transaction = {
                        id: doc.id,
                        ...data,
                        status: calculateRentalStatus(data),
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                        eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : (data.eventDate ? new Date(data.eventDate) : null),
                        eventStartDate: data.eventStartDate?.toDate ? data.eventStartDate.toDate() : (data.eventStartDate ? new Date(data.eventStartDate) : null),
                        eventEndDate: data.eventEndDate?.toDate ? data.eventEndDate.toDate() : (data.eventEndDate ? new Date(data.eventEndDate) : null)
                    };
                    
                    // Calculate overdue days
                    if (transaction.status === 'overdue') {
                        const endDate = transaction.eventEndDate || transaction.eventDate;
                        if (endDate) {
                            const timeDiff = currentDate.getTime() - endDate.getTime();
                            transaction.overdueDays = Math.floor(timeDiff / (1000 * 3600 * 24));
                        }
                    }
                    
                    return transaction;
                }).filter(transaction => transaction.status === 'overdue');
                
                console.log(`⚠️ Found ${overdueTransactions.length} overdue transactions`);
                return overdueTransactions;
                
            } catch (error) {
                console.error('❌ Error fetching overdue transactions:', error);
                return [];
            }
        }
        
        // Refresh transaction data
        async function refreshTransactionData() {
            console.log('🔄 Refreshing transaction data...');
            await fetchRentalsData();
        }
          // Get transaction statistics
        function getTransactionStatistics() {
            const stats = {
                total: rentalsData.length,
                upcoming: rentalsData.filter(r => r.status === 'upcoming').length,
                ongoing: rentalsData.filter(r => r.status === 'ongoing').length,
                completed: rentalsData.filter(r => r.status === 'completed').length,
                overdue: rentalsData.filter(r => r.status === 'overdue').length,
                withOverdueFees: rentalsData.filter(r => r.hasOverdueFee).length,
                totalOverdueFees: rentalsData.reduce((total, r) => total + (r.overdueFeeAmount || 0), 0)
            };
            
            console.log('📊 Transaction Statistics:', stats);
            return stats;
        }
        
        // Update statistics panel in UI
        function updateStatisticsPanel() {
            const stats = getTransactionStatistics();
            
            // Update stat values in the UI
            const statUpcoming = document.getElementById('stat-upcoming');
            const statOngoing = document.getElementById('stat-ongoing');
            const statCompleted = document.getElementById('stat-completed');
            const statOverdue = document.getElementById('stat-overdue');
            const statTotal = document.getElementById('stat-total');
            
            if (statUpcoming) statUpcoming.textContent = stats.upcoming;
            if (statOngoing) statOngoing.textContent = stats.ongoing;
            if (statCompleted) statCompleted.textContent = stats.completed;
            if (statOverdue) statOverdue.textContent = stats.overdue;
            if (statTotal) statTotal.textContent = stats.total;
            
            // Add animation for value changes
            [statUpcoming, statOngoing, statCompleted, statOverdue, statTotal].forEach(element => {
                if (element) {
                    element.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 200);
                }
            });
            
            console.log('📊 Statistics panel updated');
        }
          // Make utility functions globally available
        window.transactionUtils = {
            fetchTransactionById,
            fetchTransactionsByDateRange,
            fetchTransactionsByStatus,
            fetchOverdueTransactions,
            refreshTransactionData,
            getTransactionStatistics,
            updateStatisticsPanel,
            getRentalsData: () => rentalsData
        };
        
        // Additional transaction fetching utilities for different data sources
        async function fetchAllTransactionTypes() {
            try {
                console.log('🔄 Fetching all transaction types...');
                
                const [transactions, overdueFees, appointments] = await Promise.all([
                    db.collection("transaction").get(),
                    db.collection("overdue_fees").get(),
                    db.collection("appointments").get().catch(() => ({ docs: [] })) // Optional collection
                ]);
                
                const allData = {
                    transactions: transactions.docs.map(doc => ({ id: doc.id, type: 'transaction', ...doc.data() })),
                    overdueFees: overdueFees.docs.map(doc => ({ id: doc.id, type: 'overdue_fee', ...doc.data() })),
                    appointments: appointments.docs.map(doc => ({ id: doc.id, type: 'appointment', ...doc.data() }))
                };
                
                console.log('📦 All transaction data:', {
                    transactions: allData.transactions.length,
                    overdueFees: allData.overdueFees.length,
                    appointments: allData.appointments.length
                });
                
                return allData;
                
            } catch (error) {
                console.error('❌ Error fetching all transaction types:', error);
                return { transactions: [], overdueFees: [], appointments: [] };
            }
        }
        
        // Fetch transaction details with related data
        async function fetchTransactionWithDetails(transactionId) {
            try {
                console.log('🔍 Fetching detailed transaction data for:', transactionId);
                
                const [transactionDoc, overdueFees] = await Promise.all([
                    db.collection("transaction").doc(transactionId).get(),
                    db.collection("overdue_fees").where("originalTransactionId", "==", transactionId).get()
                ]);
                
                if (!transactionDoc.exists) {
                    return null;
                }
                
                const transaction = {
                    id: transactionDoc.id,
                    ...transactionDoc.data(),
                    relatedOverdueFees: overdueFees.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                };
                
                // Process product and accessory details
                if (transaction.products && Array.isArray(transaction.products)) {
                    const productDetails = await Promise.all(
                        transaction.products.map(async (product) => {
                            try {
                                const productDoc = await db.collection("products").doc(product.id).get();
                                return productDoc.exists ? { ...product, details: productDoc.data() } : product;
                            } catch (error) {
                                console.warn('Could not fetch product details for:', product.id);
                                return product;
                            }
                        })
                    );
                    transaction.products = productDetails;
                }
                
                if (transaction.accessories && Array.isArray(transaction.accessories)) {
                    const accessoryDetails = await Promise.all(
                        transaction.accessories.map(async (accessory) => {
                            try {
                                const accessoryDoc = await db.collection("additionals").doc(accessory.id).get();
                                return accessoryDoc.exists ? { ...accessory, details: accessoryDoc.data() } : accessory;
                            } catch (error) {
                                console.warn('Could not fetch accessory details for:', accessory.id);
                                return accessory;
                            }
                        })
                    );
                    transaction.accessories = accessoryDetails;
                }
                
                console.log('✅ Detailed transaction data fetched:', transaction.id);
                return transaction;
                
            } catch (error) {
                console.error('❌ Error fetching transaction details:', error);
                return null;
            }
        }
        
        // Export additional utility functions
        window.transactionUtils.fetchAllTransactionTypes = fetchAllTransactionTypes;
        window.transactionUtils.fetchTransactionWithDetails = fetchTransactionWithDetails;

        async function fetchRentalsData() {
            try {
                showLoading();
                console.log('🔄 Fetching rental transactions from Firebase...');
                
                // Fetch all transaction data
                const [transactionSnapshot, overdueFeeSnapshot] = await Promise.all([
                    db.collection("transaction").orderBy("timestamp", "desc").get(),
                    db.collection("overdue_fees").orderBy("createdAt", "desc").get()
                ]);
                
                console.log(`📦 Found ${transactionSnapshot.docs.length} transactions and ${overdueFeeSnapshot.docs.length} overdue fee records`);
                  // Process transaction data and filter out completed rentals
                rentalsData = transactionSnapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // Convert Firebase Timestamp objects to JavaScript Date objects
                    const processedData = {
                        id: doc.id,
                        ...data,
                        // Ensure proper date conversion
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                        eventDate: data.eventDate?.toDate ? data.eventDate.toDate() : (data.eventDate ? new Date(data.eventDate) : null),
                        eventStartDate: data.eventStartDate?.toDate ? data.eventStartDate.toDate() : (data.eventStartDate ? new Date(data.eventStartDate) : null),
                        eventEndDate: data.eventEndDate?.toDate ? data.eventEndDate.toDate() : (data.eventEndDate ? new Date(data.eventEndDate) : null),
                        // Calculate updated status
                        status: calculateRentalStatus(data),
                        // Add overdue fee tracking
                        hasOverdueFee: false,
                        overdueFeeAmount: 0,
                        overdueFeesPaid: []
                    };
                    
                    return processedData;                }).filter(rental => {
                    // Only show ongoing, upcoming, and overdue rentals in calendar
                    return ['ongoing', 'upcoming', 'overdue'].includes(rental.status);
                });
                
                // Process overdue fee data and associate with transactions
                const overdueFees = overdueFeeSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
                }));
                
                // Associate overdue fees with their respective transactions
                rentalsData.forEach(rental => {
                    const associatedFees = overdueFees.filter(fee => fee.originalTransactionId === rental.id);
                    if (associatedFees.length > 0) {
                        rental.hasOverdueFee = true;
                        rental.overdueFeeAmount = associatedFees.reduce((total, fee) => total + (fee.overdueFee || 0), 0);
                        rental.overdueFeesPaid = associatedFees;
                    }
                });                console.log('✅ Successfully processed rental data (completed and cancelled rentals filtered out):', {
                    totalTransactions: rentalsData.length,
                    withOverdueFees: rentalsData.filter(r => r.hasOverdueFee).length,
                    statusBreakdown: {
                        upcoming: rentalsData.filter(r => r.status === 'upcoming').length,
                        ongoing: rentalsData.filter(r => r.status === 'ongoing').length,
                        overdue: rentalsData.filter(r => r.status === 'overdue').length,
                        cancelled: rentalsData.filter(r => r.status === 'cancelled').length
                    }
                });
                
                hideLoading();
                updateStatisticsPanel(); // Update statistics panel
                renderCalendar();
                
            } catch (error) {
                console.error('❌ Error fetching rental transactions:', error);
                hideLoading();
                showError('Failed to load rental data. Please check your connection and try again.');
            }
        }        function calculateRentalStatus(rental) {
            const currentDate = new Date();
            // Set current date to start of day for accurate comparison
            currentDate.setHours(0, 0, 0, 0);
            
            const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
            const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
            const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
            const rentalType = rental.rentalType || '';
            
            // Check if rental has been cancelled - this takes priority over other statuses
            if (rental.rentalStatus === 'Cancelled') {
                return 'cancelled';
            }
            
            // If rental has been marked as returned, it's completed
            if (rental.returnConfirmed) {
                return 'completed';
            }
            
            // Calculate status based on dates
            let startDate = eventStartDate || eventDate;
            let endDate = eventEndDate;
            
            if (startDate) {
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
                
                // If no end date specified, use the 3-day rule (start + 2 more days)
                if (!endDate) {
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 2); // +2 because start date is day 1 (total 3 days)
                } else {
                    endDate = new Date(endDate);
                }
                endDate.setHours(0, 0, 0, 0);
                
                // Status logic:
                // - upcoming: current date is before start date
                // - ongoing: current date is between start date and end date (inclusive)
                // - overdue: current date is after end date and item not returned
                
                if (currentDate.getTime() < startDate.getTime()) {
                    return 'upcoming';
                } else if (currentDate.getTime() >= startDate.getTime() && currentDate.getTime() <= endDate.getTime()) {
                    return 'ongoing';
                } else if (currentDate.getTime() > endDate.getTime()) {
                    if (!rental.returnConfirmed) {
                        return 'overdue';
                    } else {
                        return 'completed';
                    }
                }
            }
            
            return 'upcoming'; // Default status
        }
        
        function renderCalendar() {
            // Update month/year display
            currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
            
            // Clear calendar
            calendarDays.innerHTML = '';
            
            // Get first day of month and number of days
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startDate = firstDay.getDay();
            
            // Get previous month info for padding
            const prevMonth = new Date(currentYear, currentMonth, 0);
            const prevMonthDays = prevMonth.getDate();
            
            // Add previous month's trailing days
            for (let i = startDate - 1; i >= 0; i--) {
                const dayNum = prevMonthDays - i;
                const dayElement = createDayElement(dayNum, true, currentMonth === 0 ? 11 : currentMonth - 1, currentMonth === 0 ? currentYear - 1 : currentYear);
                calendarDays.appendChild(dayElement);
            }
            
            // Add current month's days
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = createDayElement(day, false, currentMonth, currentYear);
                calendarDays.appendChild(dayElement);
            }
            
            // Add next month's leading days to fill the grid
            const totalCells = calendarDays.children.length;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            
            for (let day = 1; day <= remainingCells; day++) {
                const dayElement = createDayElement(day, true, currentMonth === 11 ? 0 : currentMonth + 1, currentMonth === 11 ? currentYear + 1 : currentYear);
                calendarDays.appendChild(dayElement);
            }
        }
        
        function createDayElement(dayNum, isOtherMonth, month, year) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (isOtherMonth) {
                dayElement.classList.add('other-month');
            }
            
            // Check if it's today
            const today = new Date();
            if (!isOtherMonth && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayElement.classList.add('today');
            }
              // Get rentals for this day
            const dayRentals = getRentalsForDay(dayNum, month, year);
            const filteredRentals = filterRentalsByStatus(dayRentals);
            
            if (filteredRentals.length > 0) {
                dayElement.classList.add('has-rentals');
                
                // Add status classes based on rental priorities
                // Priority: overdue > ongoing > upcoming
                const hasOverdue = filteredRentals.some(rental => rental.status === 'overdue');
                const hasOngoing = filteredRentals.some(rental => rental.status === 'ongoing');
                const hasUpcoming = filteredRentals.some(rental => rental.status === 'upcoming');
                
                if (hasOverdue) {
                    dayElement.classList.add('has-overdue');
                } else if (hasOngoing) {
                    dayElement.classList.add('has-ongoing');
                } else if (hasUpcoming) {
                    dayElement.classList.add('has-upcoming');
                }
            }
            
            // Adjust height based on number of rentals
            if (filteredRentals.length > 4) {
                dayElement.classList.add('has-many-rentals');
            }
            if (filteredRentals.length > 7) {
                dayElement.classList.add('has-lots-rentals');
            }
            if (filteredRentals.length > 10) {
                dayElement.classList.add('has-tons-rentals');
            }
            
            // Create day structure
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayNum;
            
            const rentalItems = document.createElement('div');
            rentalItems.className = 'rental-items';
              // Add rental items (show max 5, then "X more")
            const maxVisible = 5;
            const visibleRentals = filteredRentals.slice(0, maxVisible);
            
            visibleRentals.forEach((rental, index) => {
                const rentalItem = document.createElement('div');
                rentalItem.className = `rental-item ${rental.status}`;
                rentalItem.textContent = rental.fullName || rental.customerName || 'Unknown';
                
                // Create detailed tooltip
                const duration = calculateRentalDuration(rental);
                const durationText = duration > 1 ? `${duration} days` : '1 day';
                const eventInfo = getEventDateInfo(rental);
                
                rentalItem.title = `${rental.fullName || rental.customerName} - ${rental.status.toUpperCase()}\nDuration: ${durationText}\nDates: ${eventInfo}\nTransaction: ${rental.transactionCode || 'N/A'}`;
                  // Add click event for individual rental item
                rentalItem.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent day click event
                    showRentalQuickView(rental, rentalItem);
                });
                
                // Add visual indicator for duration (longest rentals get special styling)
                if (index === 0 && duration > 3) {
                    rentalItem.classList.add('longest-rental');
                }
                
                rentalItems.appendChild(rentalItem);
            });
            
            // Add "more" indicator if needed
            if (filteredRentals.length > maxVisible) {
                const moreItem = document.createElement('div');
                moreItem.className = 'more-rentals';
                moreItem.textContent = `+${filteredRentals.length - maxVisible} more`;
                rentalItems.appendChild(moreItem);
            }
            
            dayElement.appendChild(dayNumber);
            dayElement.appendChild(rentalItems);
            
            // Add click event to show details
            if (filteredRentals.length > 0) {
                dayElement.addEventListener('click', () => {
                    showDayDetails(dayNum, month, year, filteredRentals);
                });
            }
            
            return dayElement;
        }        function getRentalsForDay(day, month, year) {
            const targetDate = new Date(year, month, day);
            // Normalize target date to start of day
            targetDate.setHours(0, 0, 0, 0);
            
            const dayRentals = rentalsData.filter(rental => {
                const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
                const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
                const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
                
                // Normalize all dates to start of day for accurate comparison
                let startDate = eventStartDate || eventDate;
                let endDate = eventEndDate;
                
                if (!startDate) return false; // Skip rentals without valid start date
                
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
                
                // If no end date specified, use the 3-day rule (start + 2 more days)
                if (!endDate) {
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 2); // +2 because start date is day 1 (total 3 days: june14, june15, june16)
                } else {
                    endDate = new Date(endDate);
                }
                endDate.setHours(0, 0, 0, 0);
                
                // Check if the rental falls on this day (inclusive range)
                return targetDate.getTime() >= startDate.getTime() && targetDate.getTime() <= endDate.getTime();
            });
            
            // Sort rentals by duration (longest to shortest)
            return dayRentals.sort((a, b) => {
                const durationA = calculateRentalDuration(a);
                const durationB = calculateRentalDuration(b);
                return durationB - durationA; // Descending order (longest first)
            });
        }        function calculateRentalDuration(rental) {
            const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
            const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
            const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
            
            let startDate = eventStartDate || eventDate;
            let endDate = eventEndDate;
            
            if (!startDate) return 1; // Default to 1 day if no dates
            
            startDate = new Date(startDate);
            startDate.setHours(0, 0, 0, 0);
            
            // If no end date specified, use the 3-day rule
            if (!endDate) {
                return 3; // Default 3 days when no end date            } else {
                endDate = new Date(endDate);
                endDate.setHours(0, 0, 0, 0);
                
                // Calculate actual duration (inclusive of both start and end dates)
                const timeDiff = endDate.getTime() - startDate.getTime();
                return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
            }
        }
        
        function filterRentalsByStatus(rentals) {
            if (filteredStatus === 'all') {
                return rentals;
            }            return rentals.filter(rental => rental.status === filteredStatus);
        }
          
        function getEventDateInfo(rental) {
            const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
            const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
            const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
            
            if (eventStartDate && eventEndDate) {
                // Multi-day rental with start and end dates
                return `${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}`;
            } else if (eventStartDate && eventDate) {
                // Both start date and event date exist - show both for clarity
                if (eventStartDate.toDateString() === eventDate.toDateString()) {
                    // If they're the same, just show one date
                    return eventDate.toLocaleDateString();
                } else {
                    // If different, show both
                    return `Start: ${eventStartDate.toLocaleDateString()}, Event: ${eventDate.toLocaleDateString()}`;
                }
            } else if (eventStartDate) {
                // Only start date exists
                return `Start: ${eventStartDate.toLocaleDateString()}`;
            } else if (eventDate) {
                // Only event date exists
                return eventDate.toLocaleDateString();
            }
              return 'Date not specified';
        }
        
        function showRentalQuickView(rental, targetElement) {
            // Close any existing quick view
            closeQuickView();
              // Function to get rental types from products
            function getRentalTypes(rental) {
                const types = new Set();
                
                // First, get the rental type from Firebase (Fixed Rental or Open Rental)
                let rentalTypeInfo = '';
                if (rental.rentalType) {
                    rentalTypeInfo = rental.rentalType;
                }
                
                // Get product categories from products
                if (rental.products && Array.isArray(rental.products)) {
                    rental.products.forEach(product => {
                        if (product.details && product.details.category) {
                            types.add(product.details.category);
                        } else if (product.category) {
                            types.add(product.category);
                        }
                    });
                }
                
                // Get types from accessories (they might also have categories)
                if (rental.accessories && Array.isArray(rental.accessories)) {
                    rental.accessories.forEach(accessory => {
                        if (accessory.details && accessory.details.category) {
                            types.add(accessory.details.category);
                        } else if (accessory.category) {
                            types.add(accessory.category);
                        }
                    });
                }
                  const productCategories = Array.from(types).join(', ');
                
                // Combine rental type with product categories
                if (rentalTypeInfo && productCategories) {
                    return `${rentalTypeInfo} • ${productCategories}`;
                } else if (rentalTypeInfo) {
                    return rentalTypeInfo;
                } else if (productCategories) {
                    return productCategories;
                } else {
                    return 'Rental';
                }
            }
            
            // Create a quick view popup with rental details
            const quickView = document.createElement('div');
            quickView.className = 'rental-quick-view';
            quickView.innerHTML = `
                <div class="quick-view-content">
                    <div class="quick-view-header">
                        <h4>${rental.fullName || rental.customerName || 'Unknown Customer'}</h4>
                        <span class="quick-view-status ${rental.status}">${rental.status.toUpperCase()}</span>
                    </div>
                    <div class="quick-view-body">
                        <p><strong>Rental Type:</strong> ${getRentalTypes(rental)}</p>
                        <p><strong>Duration:</strong> ${calculateRentalDuration(rental)} day(s)</p>
                        <p><strong>Dates:</strong> ${getEventDateInfo(rental)}</p>
                        <p><strong>Transaction:</strong> ${rental.transactionCode || 'N/A'}</p>
                        <p><strong>Contact:</strong> ${rental.contactNumber || rental.customerContactNumber || 'N/A'}</p>
                        ${rental.totalPayment ? `<p><strong>Total:</strong> ₱${parseFloat(rental.totalPayment).toLocaleString()}</p>` : ''}
                    </div>
                    <div class="quick-view-actions">
                        <button class="btn-view-full">View Full Details</button>
                        <button class="btn-close-quick">Close</button>
                    </div>
                </div>
            `;
            
            // Add a unique identifier
            quickView.id = 'active-quick-view';// Calculate optimal position relative to page content
            const rect = targetElement.getBoundingClientRect();
            const pageContent = document.querySelector('.page-content');
            const pageContentRect = pageContent.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const quickViewHeight = 280; // Estimated height
            const quickViewWidth = 350; // From CSS max-width
            
            let top, left, showAbove = false;
            
            // Position relative to the page content container
            const relativeTop = rect.top - pageContentRect.top;
            const relativeLeft = rect.left - pageContentRect.left;
            
            // Determine vertical position (above or below the element)
            if (rect.bottom + quickViewHeight + 20 > viewportHeight) {
                // Show above the element
                top = relativeTop - quickViewHeight - 10;
                showAbove = true;
                if (top < 10) {
                    // If still not enough space above, show below
                    top = relativeTop + rect.height + 10;
                    showAbove = false;
                }
            } else {
                // Show below the element
                top = relativeTop + rect.height + 10;
                showAbove = false;
            }
            
            // Determine horizontal position
            left = relativeLeft;
            const containerWidth = pageContent.offsetWidth;
            if (left + quickViewWidth > containerWidth) {
                // Adjust to fit within container
                left = relativeLeft + rect.width - quickViewWidth;
                if (left < 10) {
                    left = 10;
                }
            }// Apply aggressive positioning with inline styles
            quickView.style.cssText = `
                position: absolute !important;
                top: ${Math.max(10, top)}px !important;
                left: ${left}px !important;
                z-index: 999999 !important;
                transform: translateZ(0) !important;
                -webkit-transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                will-change: auto !important;
                pointer-events: auto !important;
            `;
            
            // Add positioning class for styling
            if (showAbove) {
                quickView.classList.add('quick-view-above');
            } else {
                quickView.classList.add('quick-view-below');
            }
              document.querySelector('.page-content').appendChild(quickView);
            
            // Add body class for additional CSS control
            document.body.classList.add('quick-view-active');
            
            // Add event listeners
            quickView.querySelector('.btn-close-quick').addEventListener('click', (e) => {
                e.stopPropagation();
                closeQuickView();
            });            quickView.querySelector('.btn-view-full').addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔍 View Full Details clicked');
                
                // Get the rental's event date
                const rentalDate = rental.eventDate || new Date();
                const day = rentalDate.getDate();
                const month = rentalDate.getMonth();
                const year = rentalDate.getFullYear();
                
                // Close quick view first
                closeQuickView();
                
                // Enhanced modal opening with better timing
                setTimeout(() => {
                    console.log('🚀 Opening modal after quick view close delay');
                    showDayDetails(day, month, year, [rental]);
                    
                    // Additional safety check
                    setTimeout(() => {
                        if (modal && !modal.classList.contains('visible')) {
                            console.warn('⚠️ Modal opening backup triggered');
                            modal.classList.add('visible');
                            modal.style.display = 'flex';
                            document.body.style.overflow = 'hidden';
                        }
                    }, 150);
                }, 250);
            });
            
            // Prevent click events from bubbling up from the quick view
            quickView.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Add keyboard handler for escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeQuickView();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }          function closeQuickView() {
            const existingQuickView = document.getElementById('active-quick-view');
            if (existingQuickView) {
                // Remove body class
                document.body.classList.remove('quick-view-active');
                
                // Add fade out animation
                existingQuickView.style.animation = 'quickViewFadeOut 0.15s ease-in';
                setTimeout(() => {
                    if (existingQuickView.parentNode) {
                        existingQuickView.remove();
                    }
                }, 150);
            }
        }        function showDayDetails(day, month, year, rentals) {
            console.log('🔍 showDayDetails called:', { day, month, year, rentalsCount: rentals.length });
            
            // Ensure modal is found
            if (!modal) {
                console.error('❌ Modal element not found!');
                return;
            }
            
            // Close any existing quick view first
            closeQuickView();
            
            const dateStr = `${monthNames[month]} ${day}, ${year}`;
            modalTitle.textContent = `Rentals for ${dateStr}`;
            
            // Clear previous details
            rentalDetailsList.innerHTML = '';
            
            if (rentals.length === 0) {
                rentalDetailsList.innerHTML = '<p>No rentals found for this date.</p>';
            } else {
                rentals.forEach(rental => {
                    const detailItem = createRentalDetailItem(rental);
                    rentalDetailsList.appendChild(detailItem);
                });
            }
            
            // Enhanced modal opening logic with multiple fallbacks
            modal.classList.remove('visible');
            modal.style.display = 'none';
            
            // Force DOM update and then show modal
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.style.display = 'flex';
                    modal.classList.add('visible');
                    document.body.style.overflow = 'hidden';
                    
                    // Additional backup to ensure visibility
                    setTimeout(() => {
                        if (!modal.classList.contains('visible')) {
                            console.warn('⚠️ Modal visibility backup triggered');
                            modal.classList.add('visible');
                            modal.style.display = 'flex';
                        }
                    }, 100);
                    
                    console.log('✅ Modal opened with enhanced logic');
                });
            });
        }
        
        function createRentalDetailItem(rental) {
            const item = document.createElement('div');
            item.className = `rental-detail-item ${rental.status}`;
            
            const header = document.createElement('div');
            header.className = 'rental-detail-header';
            
            const customerName = document.createElement('div');
            customerName.className = 'rental-customer';
            customerName.textContent = rental.fullName || rental.customerName || 'Unknown Customer';
            
            const status = document.createElement('div');
            status.className = `rental-status ${rental.status}`;
            status.textContent = rental.status.toUpperCase();
            
            header.appendChild(customerName);
            header.appendChild(status);
            
            const info = document.createElement('div');
            info.className = 'rental-detail-info';
            
            // Format dates
            const eventDate = rental.eventDate ? new Date(rental.eventDate).toLocaleDateString() : '';
            const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate).toLocaleDateString() : '';
            const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate).toLocaleDateString() : '';
            
            const infoItems = [
                { label: 'Transaction Code', value: rental.transactionCode || 'N/A' },
                { label: 'Contact', value: rental.contactNumber || rental.customerContactNumber || 'N/A' },
                { label: 'Event Date', value: eventDate || (eventStartDate && eventEndDate ? `${eventStartDate} - ${eventEndDate}` : eventStartDate || 'N/A') },
                { label: 'Total Payment', value: rental.totalPayment ? `₱${parseFloat(rental.totalPayment).toLocaleString()}` : 'N/A' },
                { label: 'Remaining Balance', value: rental.remainingBalance ? `₱${parseFloat(rental.remainingBalance).toLocaleString()}` : '₱0' }
            ];
            
            infoItems.forEach(infoItem => {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'rental-info-item';
                
                const label = document.createElement('div');
                label.className = 'rental-info-label';
                label.textContent = infoItem.label;
                
                const value = document.createElement('div');
                value.className = 'rental-info-value';
                value.textContent = infoItem.value;
                
                infoDiv.appendChild(label);
                infoDiv.appendChild(value);
                info.appendChild(infoDiv);
            });
            
            // Add products section
            const productsSection = document.createElement('div');
            productsSection.className = 'rental-products';
            
            const productsTitle = document.createElement('h4');
            productsTitle.textContent = 'Rented Items:';
            
            const productsList = document.createElement('div');
            productsList.className = 'product-list';
            
            // Add products
            if (rental.products && Array.isArray(rental.products)) {
                rental.products.forEach(product => {
                    const productTag = document.createElement('span');
                    productTag.className = 'product-tag';
                    productTag.textContent = product.name || 'Unknown Product';
                    productsList.appendChild(productTag);
                });
            }
            
            // Add accessories
            if (rental.accessories && Array.isArray(rental.accessories)) {
                rental.accessories.forEach(accessory => {
                    const accessoryTag = document.createElement('span');
                    accessoryTag.className = 'product-tag';
                    accessoryTag.textContent = accessory.name || 'Unknown Accessory';
                    productsList.appendChild(accessoryTag);
                });
            }
            
            if (productsList.children.length === 0) {
                productsList.innerHTML = '<span style="color: #999;">No items listed</span>';
            }
              productsSection.appendChild(productsTitle);
            productsSection.appendChild(productsList);
            
            // Add action buttons section
            const actionsSection = document.createElement('div');
            actionsSection.className = 'rental-actions';
            
            const actionButtons = createActionButtons(rental);
            actionsSection.appendChild(actionButtons);
            
            item.appendChild(header);
            item.appendChild(info);
            item.appendChild(productsSection);
            item.appendChild(actionsSection);
            
            return item;
        }
          function createActionButtons(rental) {
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'action-buttons';
            
            // View History button - always shown for all rentals
            const viewHistoryBtn = document.createElement('button');
            viewHistoryBtn.className = 'btn-action btn-history';
            viewHistoryBtn.innerHTML = '<i class="bx bx-history"></i> View History';
            viewHistoryBtn.onclick = () => {
                // Redirect to customer logs page
                window.location.href = './customer-logs.html';
            };
            buttonsContainer.appendChild(viewHistoryBtn);
            
            return buttonsContainer;
        }
          // =============== UTILITY FUNCTIONS ===============
        
        function showSuccessMessage(message) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.innerHTML = `
                <div class="success-content">
                    <i class="bx bx-check-circle"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(successDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (document.body.contains(successDiv)) {
                    successDiv.classList.add('fade-out');
                    setTimeout(() => {
                        if (document.body.contains(successDiv)) {
                            document.body.removeChild(successDiv);
                        }
                    }, 300);
                }
            }, 3000);
        }
    } else {
        console.error('Firebase not available');
        showError();
    }
});
