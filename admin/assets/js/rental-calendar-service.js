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
        }
        
        async function fetchRentalsData() {
            try {
                showLoading();
                
                const snapshot = await db.collection("transaction")
                    .orderBy("timestamp", "desc")
                    .get();
                
                rentalsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        status: calculateRentalStatus(data)
                    };
                });
                
                console.log('Fetched rentals data:', rentalsData);
                hideLoading();
                renderCalendar();
                
            } catch (error) {
                console.error('Error fetching rentals data:', error);
                showError();
            }
        }
        
        function calculateRentalStatus(rental) {
            const currentDate = new Date();
            const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
            const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
            const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
            
            // If there's a specific status in the data, use it
            if (rental.status && ['upcoming', 'ongoing', 'completed', 'overdue'].includes(rental.status.toLowerCase())) {
                return rental.status.toLowerCase();
            }
            
            // Calculate status based on dates
            if (eventStartDate || eventDate) {
                const startDate = eventStartDate || eventDate;
                const endDate = eventEndDate || eventDate;
                
                if (currentDate < startDate) {
                    return 'upcoming';
                } else if (currentDate >= startDate && currentDate <= endDate) {
                    return 'ongoing';
                } else if (currentDate > endDate) {
                    // Check if it's overdue (assuming 1 day grace period)
                    const gracePeriod = new Date(endDate);
                    gracePeriod.setDate(gracePeriod.getDate() + 1);
                    
                    if (currentDate > gracePeriod && !rental.returned) {
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
            
            visibleRentals.forEach(rental => {
                const rentalItem = document.createElement('div');
                rentalItem.className = `rental-item ${rental.status}`;
                rentalItem.textContent = rental.fullName || rental.customerName || 'Unknown';
                rentalItem.title = `${rental.fullName || rental.customerName} - ${rental.status.toUpperCase()}`;
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
        }
        
        function getRentalsForDay(day, month, year) {
            const targetDate = new Date(year, month, day);
            
            return rentalsData.filter(rental => {
                const eventStartDate = rental.eventStartDate ? new Date(rental.eventStartDate) : null;
                const eventEndDate = rental.eventEndDate ? new Date(rental.eventEndDate) : null;
                const eventDate = rental.eventDate ? new Date(rental.eventDate) : null;
                
                // Check if the rental falls on this day
                if (eventDate) {
                    // Single day rental
                    return eventDate.toDateString() === targetDate.toDateString();
                } else if (eventStartDate && eventEndDate) {
                    // Multi-day rental
                    return targetDate >= eventStartDate && targetDate <= eventEndDate;
                } else if (eventStartDate) {
                    // Start date only
                    return eventStartDate.toDateString() === targetDate.toDateString();
                }
                
                return false;
            });
        }
        
        function filterRentalsByStatus(rentals) {
            if (filteredStatus === 'all') {
                return rentals;
            }
            return rentals.filter(rental => rental.status === filteredStatus);
        }
        
        function showDayDetails(day, month, year, rentals) {
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
            
            modal.classList.add('visible');
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
            
            item.appendChild(header);
            item.appendChild(info);
            item.appendChild(productsSection);
            
            return item;
        }
        
        function closeModal() {
            modal.classList.remove('visible');
        }
        
        function showLoading() {
            calendarDays.innerHTML = `
                <div class="calendar-loading">
                    <i class="bx bx-loader-alt bx-spin"></i>
                    Loading calendar data...
                </div>
            `;
        }
        
        function hideLoading() {
            // Loading will be cleared when calendar renders
        }
        
        function showError() {
            calendarDays.innerHTML = `
                <div class="calendar-error">
                    <i class="bx bx-error"></i>
                    <h3>Error Loading Calendar</h3>
                    <p>Unable to load rental data. Please refresh the page.</p>
                </div>
            `;
        }
        
    } else {
        console.error('Firebase not available');
        showError();
    }
});
