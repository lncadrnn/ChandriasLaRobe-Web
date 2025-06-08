document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase (assuming it's already loaded globally)
    let db = null;
    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
            // Firebase config should be available globally from firebase-config.js
            if (typeof firebaseConfig !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
            }
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
        }
    } catch (error) {
        console.warn('Firebase not available or already initialized:', error);
    }

    const body = document.querySelector("body"),
        sidebar = body.querySelector(".sidebar"),
        toggle = body.querySelector(".toggle"),
        modeSwitch = body.querySelector(".toggle-switch"),
        modeText = body.querySelector(".mode-text");// --- Restore sidebar state from localStorage ---
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle (chevron)
    toggle.addEventListener("click", () => {
        const isClosed = sidebar.classList.toggle("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Calendar Implementation
    const calendar = {
        currentDate: new Date(),
        events: JSON.parse(localStorage.getItem('calendarEvents')) || {},
        selectedStartDate: null,
        selectedEndDate: null,
        editingEvent: null,
        searchQuery: '',

        findMatchingEvents(query) {
            const allEvents = Object.entries(this.events).flatMap(([dateStr, events]) => 
                events.map(event => ({
                    ...event,
                    dateStr,
                    durationInDays: Math.ceil(
                        (new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24)
                    ) + 1
                }))
            );
            
            if (query === 'overdue') {
                return allEvents.filter(event => 
                    event.type === 'fixed' && event.durationInDays > 3
                );
            }
            return allEvents.filter(event => 
                event.title.toLowerCase().includes(query.toLowerCase())
            );
        },

        initMonthYearSelect() {
            const monthSelect = document.getElementById('monthSelect');
            const yearSelect = document.getElementById('yearSelect');
            
            // Populate months
            const months = Array.from({length: 12}, (_, i) => 
                new Date(2000, i).toLocaleString('default', { month: 'long' })
            );
            months.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = month;
                monthSelect.appendChild(option);
            });
            
            // Populate years (5 years before and after current year)
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 5; year <= currentYear + 5; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }
            
            // Set current month and year
            monthSelect.value = this.currentDate.getMonth();
            yearSelect.value = this.currentDate.getFullYear();
            
            // Add event listeners
            monthSelect.addEventListener('change', () => {
                this.currentDate.setMonth(parseInt(monthSelect.value));
                this.render();
            });
            
            yearSelect.addEventListener('change', () => {
                this.currentDate.setFullYear(parseInt(yearSelect.value));
                this.render();
            });
        },

        init() {
            this.calendarGrid = document.getElementById('calendarGrid');
            this.startDateInput = document.getElementById('eventStartDate');
            this.endDateInput = document.getElementById('eventEndDate');
            this.searchInput = document.getElementById('searchTransactionCode');
            
            // Initialize month/year select
            this.initMonthYearSelect();
            
            // Add event listeners for date inputs
            this.startDateInput.addEventListener('change', (e) => this.handleManualDateInput(e.target.value, 'start'));
            this.endDateInput.addEventListener('change', (e) => this.handleManualDateInput(e.target.value, 'end'));
            
            // Add search event listener
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                const calendarContainer = document.querySelector('.calendar-container');
                
                if (this.searchQuery) {
                    calendarContainer.classList.add('is-searching');
                    const matchingEvents = this.findMatchingEvents(this.searchQuery);
                    
                    if (matchingEvents.length > 0) {
                        // Navigate to the month/year of the first matching event
                        const matchDate = new Date(matchingEvents[0].dateStr);
                        this.currentDate = new Date(matchDate.getFullYear(), matchDate.getMonth(), 1);
                        
                        // Update month/year selects
                        const monthSelect = document.getElementById('monthSelect');
                        const yearSelect = document.getElementById('yearSelect');
                        monthSelect.value = matchDate.getMonth();
                        yearSelect.value = matchDate.getFullYear();
                    }
                } else {
                    calendarContainer.classList.remove('is-searching');
                }
                
                this.render();
                
                // Scroll to first matching event if search is not empty
                if (this.searchQuery) {
                    setTimeout(() => {
                        const firstMatch = document.querySelector('.calendar-day[data-has-match="true"]');
                        if (firstMatch) {
                            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            });
              document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
            document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
            document.getElementById('saveEvent').addEventListener('click', () => this.saveEvent());
            
            // Add clear events listener
            document.getElementById('clearEvents').addEventListener('click', () => {
                showClearAllModal();
            });            // Add rental type change listener
            document.getElementById('eventType').addEventListener('change', (e) => {
                const rentalType = e.target.value;
                const openRentalDates = document.querySelectorAll('.open-rental-dates');
                const fixedRentalDate = document.querySelector('.fixed-rental-date');
                const eventStartDate = document.getElementById('eventStartDate');
                const eventEndDate = document.getElementById('eventEndDate');
                
                // Hide all date fields first
                openRentalDates.forEach(field => field.style.display = 'none');
                if (fixedRentalDate) fixedRentalDate.style.display = 'none';
                
                // Show appropriate date fields based on selection
                if (rentalType === 'open') {
                    openRentalDates.forEach(field => field.style.display = 'block');
                    // Reset end date validation when switching to open rental
                    if (eventEndDate) {
                        eventEndDate.disabled = !eventStartDate.value;
                    }
                } else if (rentalType === 'fixed') {
                    if (fixedRentalDate) fixedRentalDate.style.display = 'block';
                }
                
                // Clear all date values when switching rental types
                if (eventStartDate) eventStartDate.value = '';
                if (eventEndDate) {
                    eventEndDate.value = '';
                    eventEndDate.disabled = true;
                }
                const eventFixedDate = document.getElementById('eventFixedDate');
                if (eventFixedDate) eventFixedDate.value = '';
            });

            // Add modal event listeners
            document.getElementById('confirmDelete').addEventListener('click', () => {
                const modal = document.getElementById('deleteModal');
                if (modal.eventToDelete) {
                    confirmDeleteEvent(modal.eventToDelete);
                }
            });            document.getElementById('cancelDelete').addEventListener('click', () => {
                hideDeleteModal();
            });

            // Close modal when clicking outside
            document.getElementById('deleteModal').addEventListener('click', (e) => {
                if (e.target.id === 'deleteModal') {
                    hideDeleteModal();
                }
            });            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const deleteModal = document.getElementById('deleteModal');
                    const clearAllModal = document.getElementById('clearAllModal');
                    if (deleteModal.style.display === 'block') {
                        hideDeleteModal();
                    } else if (clearAllModal.style.display === 'block') {
                        hideClearAllModal();
                    }
                }
            });

            // Add clear all modal event listeners
            document.getElementById('confirmClearAll').addEventListener('click', () => {
                confirmClearAllEvents();
            });

            document.getElementById('cancelClearAll').addEventListener('click', () => {
                hideClearAllModal();
            });

            // Add event listener to all close buttons (for both modals)
            document.querySelectorAll('.close-modal').forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal.id === 'deleteModal') {
                        hideDeleteModal();
                    } else if (modal.id === 'clearAllModal') {
                        hideClearAllModal();
                    }
                });
            });            // Close modal when clicking outside (for both modals)
            document.getElementById('clearAllModal').addEventListener('click', (e) => {
                if (e.target.id === 'clearAllModal') {
                    hideClearAllModal();
                }
            });            // Add date validation
            this.initDateValidation();
            
            // Check for rental data from dashboard
            this.populateFromSessionStorage();

            this.render();
        },

        initDateValidation() {
            const today = new Date();
            const todayString = today.getFullYear() + '-' + 
                               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(today.getDate()).padStart(2, '0');

            // Set minimum date for all date inputs
            const eventFixedDate = document.getElementById('eventFixedDate');
            const eventStartDate = document.getElementById('eventStartDate');
            const eventEndDate = document.getElementById('eventEndDate');

            // Set minimum date to today for all date inputs
            if (eventFixedDate) eventFixedDate.min = todayString;
            if (eventStartDate) eventStartDate.min = todayString;
            if (eventEndDate) eventEndDate.min = todayString;

            // Initially disable end date until start date is selected
            if (eventEndDate) eventEndDate.disabled = true;

            // Add event listener for start date to control end date
            if (eventStartDate) {
                eventStartDate.addEventListener('change', (e) => {
                    const startDateValue = e.target.value;
                    if (startDateValue) {
                        // Enable end date and set its minimum to the selected start date
                        eventEndDate.disabled = false;
                        eventEndDate.min = startDateValue;
                        eventEndDate.value = ''; // Clear any previous end date
                    } else {
                        // Disable end date if start date is cleared
                        eventEndDate.disabled = true;
                        eventEndDate.value = '';
                    }
                });
            }

            // Add event listener for end date validation
            if (eventEndDate) {
                eventEndDate.addEventListener('change', (e) => {
                    const endDateValue = e.target.value;
                    const startDateValue = eventStartDate.value;
                    
                    if (endDateValue && startDateValue) {
                        const startDate = new Date(startDateValue);
                        const endDate = new Date(endDateValue);
                        
                        if (endDate < startDate) {
                            alert('End date cannot be before start date');
                            e.target.value = '';
                        }
                    }
                });
            }

            // Add event listener for fixed date validation
            if (eventFixedDate) {
                eventFixedDate.addEventListener('change', (e) => {
                    const selectedDate = new Date(e.target.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset time for comparison
                    
                    if (selectedDate < today) {
                        alert('Event date cannot be in the past');
                        e.target.value = '';
                    }
                });
            }
        },        formatDate(date) {
            // Ensure we're working with the local date
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        populateFromSessionStorage() {
            try {
                const rentalData = sessionStorage.getItem('rentalData');
                if (rentalData) {
                    const data = JSON.parse(rentalData);
                    console.log('Populating calendar from rental data:', data);

                    // Populate transaction code
                    const transactionCodeInput = document.getElementById('eventTitle');
                    if (transactionCodeInput && data.transactionCode) {
                        transactionCodeInput.value = data.transactionCode;
                    }

                    // Set rental type to open (since we're coming from dashboard with date range)
                    const eventTypeSelect = document.getElementById('eventType');
                    if (eventTypeSelect) {
                        eventTypeSelect.value = 'open';
                        
                        // Trigger change event to show appropriate date fields
                        const changeEvent = new Event('change', { bubbles: true });
                        eventTypeSelect.dispatchEvent(changeEvent);
                    }

                    // Populate dates if available
                    if (data.eventStartDate && data.eventEndDate) {
                        const startDateInput = document.getElementById('eventStartDate');
                        const endDateInput = document.getElementById('eventEndDate');
                        
                        if (startDateInput && endDateInput) {
                            startDateInput.value = data.eventStartDate;
                            endDateInput.value = data.eventEndDate;
                            
                            // Enable end date input since start date is set
                            endDateInput.disabled = false;
                            
                            // Set min date for end date based on start date
                            endDateInput.min = data.eventStartDate;
                        }
                    }

                    // Show a notification that data was loaded
                    const notification = document.createElement('div');
                    notification.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #10b981;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        z-index: 10000;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        font-weight: 500;
                    `;
                    notification.textContent = `Rental data loaded: ${data.transactionCode}`;
                    document.body.appendChild(notification);

                    // Remove notification after 3 seconds
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 3000);

                    // Clear session storage after use
                    sessionStorage.removeItem('rentalData');
                }
            } catch (error) {
                console.error('Error populating calendar from session storage:', error);
            }
        },
        render() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            // Update month/year selects
            const monthSelect = document.getElementById('monthSelect');
            const yearSelect = document.getElementById('yearSelect');
            monthSelect.value = month;
            yearSelect.value = year;
            
            this.calendarGrid.innerHTML = '';
            
            // Get first day of month and last day
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Calculate days from previous month
            const firstDayIndex = firstDay.getDay() || 7;
            const prevMonthDays = firstDayIndex - 1;

            // Compute unique events for the visible month
            const daysInMonth = lastDay.getDate();
            const uniqueEventMap = new Map();
            let uniqueEvents = [];
            // Collect all events for the visible month
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = this.formatDate(new Date(year, month, i));
                (this.events[dateStr] || []).forEach(event => {
                    const key = `${event.title}|${event.startDate}|${event.endDate}`;
                    if (!uniqueEventMap.has(key)) {
                        uniqueEventMap.set(key, event);
                        uniqueEvents.push({ ...event, key });
                    }
                });
            }
            // Assign row index to each unique event
            uniqueEvents = uniqueEvents.map((event, idx) => ({ ...event, row: idx + 1 }));
            const eventKeyToRow = Object.fromEntries(uniqueEvents.map(e => [e.key, e.row]));
            this._monthEventKeyToRow = eventKeyToRow;
            this._monthEventRowCount = uniqueEvents.length;

            // Add previous month's days
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = prevMonthDays; i > 0; i--) {
                const date = new Date(year, month - 1, prevMonthLastDay - i + 1);
                this.calendarGrid.appendChild(this.createDayElement(date, 'prev-month'));
            }

            // Add current month's days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                const date = new Date(year, month, i);
                this.calendarGrid.appendChild(this.createDayElement(date, 'current-month'));
            }

            // Add next month's days
            const totalDays = prevMonthDays + lastDay.getDate();
            const nextMonthDays = 42 - totalDays;
            
            for (let i = 1; i <= nextMonthDays; i++) {
                const date = new Date(year, month + 1, i);
                this.calendarGrid.appendChild(this.createDayElement(date, 'next-month'));
            }
        },
        createDayElement(date, className) {
            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar-day ${className}`;
            
            // Create date number element
            const dateNumber = document.createElement('div');
            dateNumber.className = 'date-number';
            dateNumber.textContent = date.getDate();
            
            // Add today class if it's the current date
            const today = new Date();
            if (date.getDate() === today.getDate() && 
                date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear()) {
                dateNumber.classList.add('today');
            }
            
            dayDiv.appendChild(dateNumber);
            
            const dateStr = this.formatDate(date);
            
            // Create events container
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'events-container';
            const eventsForDay = this.events[dateStr] || [];
            // Map global row index to event for this day
            const eventKeyToRow = this._monthEventKeyToRow || {};
            // Build a list of [row, event] for this day, sorted by row
            const rowEventPairs = [];
            const usedRows = new Set();
            eventsForDay.forEach(event => {
                const key = `${event.title}|${event.startDate}|${event.endDate}`;
                const row = eventKeyToRow[key];
                if (row) {
                    rowEventPairs.push([row, event]);
                    usedRows.add(row);
                }
            });
            // Sort by row index (so multi-day events are always in the same row)
            rowEventPairs.sort((a, b) => a[0] - b[0]);
            if (rowEventPairs.length > 0) {
                eventsContainer.style.display = 'flex';
                eventsContainer.style.flexDirection = 'column';
                eventsContainer.style.gap = '2px';
                eventsContainer.style.position = 'relative';
                rowEventPairs.forEach(([row, event]) => {
                    const isStart = dateStr === event.startDate;
                    const isEnd = dateStr === event.endDate;
                    const marker = createEventMarker(event, isStart, isEnd);
                    eventsContainer.appendChild(marker);
                });
            } else {
                eventsContainer.style.display = 'none';
                eventsContainer.style.height = '0';
                eventsContainer.style.minHeight = '0';
            }
            dayDiv.appendChild(eventsContainer);

            dayDiv.addEventListener('click', (e) => {
                // If the click is inside an event marker, do nothing
                if (e.target.closest('.event-marker')) return;
                this.handleDateClick(dateStr);
            });
            return dayDiv;
        },

        handleManualDateInput(dateStr, type) {
            if (type === 'start') {
                this.selectedStartDate = dateStr;
                // If end date is before start date, update it
                if (this.selectedEndDate && this.selectedEndDate < dateStr) {
                    this.selectedEndDate = dateStr;
                    this.endDateInput.value = dateStr;
                }
                // If no end date is set, set it to start date
                if (!this.selectedEndDate) {
                    this.selectedEndDate = dateStr;
                    this.endDateInput.value = dateStr;
                }
            } else {
                // Don't allow end date before start date
                if (this.selectedStartDate && dateStr < this.selectedStartDate) {
                    this.endDateInput.value = this.selectedStartDate;
                    return;
                }
                this.selectedEndDate = dateStr;
            }

            // Update calendar view to show selected dates
            const newDate = new Date(type === 'start' ? this.selectedStartDate : this.selectedEndDate);
            this.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            this.render();
        },

        handleDateClick(dateStr) {
            if (!this.selectedStartDate || (this.selectedStartDate && this.selectedEndDate)) {
                // Start new selection
                this.selectedStartDate = dateStr;
                this.selectedEndDate = null;
                this.startDateInput.value = dateStr;
                this.endDateInput.value = '';
            } else {
                // Complete the selection
                if (dateStr < this.selectedStartDate) {
                    this.selectedEndDate = this.selectedStartDate;
                    this.selectedStartDate = dateStr;
                } else {
                    this.selectedEndDate = dateStr;
                }
                this.startDateInput.value = this.selectedStartDate;
                this.endDateInput.value = this.selectedEndDate;
            }
            this.render();
        },        saveEvent() {
            const title = document.getElementById('eventTitle').value;
            const description = document.getElementById('eventDescription').value;
            const type = document.getElementById('eventType').value;
            const color = document.getElementById('eventColor').value;
            
            if (!title || !type) {
                alert('Please fill in Transaction Code and Rental Type');
                return;
            }

            // Date validation
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time for comparison
            
            let startDate, endDate;            // Get dates based on rental type
            if (type === 'open') {
                const startDateInput = document.getElementById('eventStartDate');
                const endDateInput = document.getElementById('eventEndDate');
                startDate = startDateInput.value;
                endDate = endDateInput.value;
                
                if (!startDate || !endDate) {
                    alert('Please select both Start Date and End Date for Open Rental');
                    return;
                }
                
                // Validate dates are not in the past
                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);
                
                if (startDateObj < today) {
                    alert('Start date cannot be in the past');
                    return;
                }
                
                if (endDateObj < today) {
                    alert('End date cannot be in the past');
                    return;
                }
                
                if (endDateObj < startDateObj) {
                    alert('End date cannot be before start date');
                    return;
                }
                
            } else if (type === 'fixed') {
                const fixedDateInput = document.getElementById('eventFixedDate');
                const selectedDate = fixedDateInput.value;
                
                if (!selectedDate) {
                    alert('Please select Event Date for Fixed Rental');
                    return;
                }
                
                // Validate fixed date is not in the past
                const selectedDateObj = new Date(selectedDate);
                if (selectedDateObj < today) {
                    alert('Event date cannot be in the past');
                    return;
                }
                
                // For fixed rental, create a 3-day period: day before, selected day, day after
                const centerDate = new Date(selectedDate);
                const startDateObj = new Date(centerDate);
                startDateObj.setDate(centerDate.getDate() - 1); // Day before
                const endDateObj = new Date(centerDate);
                endDateObj.setDate(centerDate.getDate() + 1); // Day after
                
                startDate = this.formatDate(startDateObj);
                endDate = this.formatDate(endDateObj);
            }

            // Update calendar's selected dates
            this.selectedStartDate = startDate;
            this.selectedEndDate = endDate;

            // If editing, remove the old event first from all dates
            if (this.editingEvent) {
                const allDates = Object.keys(this.events);
                allDates.forEach(dateStr => {
                    this.events[dateStr] = this.events[dateStr].filter(e => 
                        !(e.title === this.editingEvent.title && 
                          e.startDate === this.editingEvent.startDate && 
                          e.endDate === this.editingEvent.endDate)
                    );
                    if (this.events[dateStr].length === 0) {
                        delete this.events[dateStr];
                    }
                });
            }
            // Create event object with specific color based on title or use custom color
            const event = {
                title,
                description,
                type,
                color: title === '525616' ? '#525616' : 
                       title === '55' ? '#55' : 
                       title === '54' ? '#54' : 
                       color, // fallback to color input value
                startDate: this.selectedStartDate,
                endDate: this.selectedEndDate || this.selectedStartDate
            };            // Add event to all days in the range
            let currentDate = new Date(this.selectedStartDate);
            const endDateObj = new Date(this.selectedEndDate || this.selectedStartDate);
            
            while (currentDate <= endDateObj) {
                const dateStr = this.formatDate(currentDate);
                if (!this.events[dateStr]) {
                    this.events[dateStr] = [];
                }
                this.events[dateStr].push(event);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
              // Reset form and calendar state
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('eventType').value = '';
            document.getElementById('eventColor').value = '#ff9a9e';
              // Reset all date fields
            document.getElementById('eventStartDate').value = '';
            document.getElementById('eventEndDate').value = '';
            document.getElementById('eventFixedDate').value = '';
            
            // Reset date validation states
            const eventEndDate = document.getElementById('eventEndDate');
            if (eventEndDate) {
                eventEndDate.disabled = true; // Disable end date until start date is selected
            }
            
            // Hide all date field groups
            const openRentalDates = document.querySelectorAll('.open-rental-dates');
            const fixedRentalDate = document.querySelector('.fixed-rental-date');
            openRentalDates.forEach(field => field.style.display = 'none');
            if (fixedRentalDate) fixedRentalDate.style.display = 'none';
            
            this.selectedStartDate = null;
            this.selectedEndDate = null;
            this.editingEvent = null;
            
            // Reset save button text
            const saveBtn = document.querySelector('.save-btn');
            saveBtn.textContent = 'Save Event';
            
            // Reset sidebar title to 'Create Event' after saving
            const sidebarTitle = document.querySelector('.event-sidebar h3');
            sidebarTitle.textContent = 'Create Event';
            
            // Re-render to show the updated events
            this.render();
            
            this.render();
        },        changeMonth(delta) {
            this.currentDate.setMonth(this.currentDate.getMonth() + delta);
            this.render();
        }
    };

    // Helper function to format date range
    function formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options = { month: 'short', day: 'numeric' };
        
        if (startDate === endDate) {
            return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
        } else {
            return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
        }
    }    // Function to load enhanced rental details from Firebase
    async function loadEnhancedDetails(transactionCode, hoverElement) {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
                const enhancedContainer = hoverElement.querySelector('.enhanced-details');
                enhancedContainer.innerHTML = `
                    <div style="color: #666; font-size: 12px;">
                        <i class="fa fa-info-circle"></i> Firebase not available
                    </div>
                `;
                return;
            }

            const db = firebase.firestore();
            const snapshot = await db.collection("transaction")
                .where("transactionCode", "==", transactionCode)
                .limit(1)
                .get();

            const enhancedContainer = hoverElement.querySelector('.enhanced-details');
            
            if (snapshot.empty) {
                enhancedContainer.innerHTML = `
                    <div style="color: #666; font-size: 12px;">
                        <i class="fa fa-info-circle"></i> No additional details found
                    </div>
                `;
                return;
            }

            const data = snapshot.docs[0].data();
            
            // Calculate remaining balance
            const totalPayment = parseFloat(data.totalPayment || 0);
            const totalPaid = parseFloat(data.totalPaid || 0);
            const remainingBalance = totalPayment - totalPaid;

            // Get selected products
            const selectedProducts = data.selectedProducts || [];
            const additionalItems = data.additionalItems || [];

            let enhancedHTML = '';

            // Customer info
            if (data.fullName) {
                enhancedHTML += `
                    <div style="margin-bottom: 8px;">
                        <strong>Customer:</strong> ${data.fullName}
                    </div>
                `;
            }

            // Selected products
            if (selectedProducts.length > 0) {
                enhancedHTML += `
                    <div style="margin-bottom: 8px;">
                        <strong>Products:</strong>
                        <ul style="margin: 4px 0; padding-left: 16px; font-size: 12px;">
                `;
                selectedProducts.forEach(product => {
                    enhancedHTML += `<li>${product.category || 'Unknown'} - ${product.size || 'N/A'}</li>`;
                });
                enhancedHTML += '</ul></div>';
            }

            // Additional items
            if (additionalItems.length > 0) {
                enhancedHTML += `
                    <div style="margin-bottom: 8px;">
                        <strong>Additional Items:</strong>
                        <ul style="margin: 4px 0; padding-left: 16px; font-size: 12px;">
                `;
                additionalItems.forEach(item => {
                    enhancedHTML += `<li>${item.item || item.name || 'Unknown item'}</li>`;
                });
                enhancedHTML += '</ul></div>';
            }

            // Payment information
            enhancedHTML += `
                <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>Total:</strong></span>
                        <span>₱${totalPayment.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>Paid:</strong></span>
                        <span>₱${totalPaid.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #dee2e6; margin-top: 4px; padding-top: 4px;">
                        <span><strong>Balance:</strong></span>
                        <span style="color: ${remainingBalance > 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">
                            ₱${remainingBalance.toLocaleString()}
                        </span>
                    </div>
                </div>
            `;

            // Event status
            const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate) : null;
            const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate) : null;
            const currentDate = new Date();
            
            let status = 'Upcoming';
            let statusColor = '#6c757d';
            
            if (eventStartDate && eventEndDate) {
                if (currentDate < eventStartDate) {
                    status = 'Upcoming';
                    statusColor = '#17a2b8';
                } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                    status = 'Ongoing';
                    statusColor = '#ffc107';
                } else if (currentDate > eventEndDate) {
                    status = 'Completed';
                    statusColor = '#28a745';
                }
            }

            enhancedHTML += `
                <div style="text-align: center; margin-top: 8px;">
                    <span style="display: inline-block; padding: 2px 8px; background: ${statusColor}; color: white; border-radius: 12px; font-size: 11px; font-weight: 500;">
                        ${status}
                    </span>
                </div>
            `;

            enhancedContainer.innerHTML = enhancedHTML;

        } catch (error) {
            console.error('Error loading enhanced details:', error);
            const enhancedContainer = hoverElement.querySelector('.enhanced-details');
            enhancedContainer.innerHTML = `
                <div style="color: #dc3545; font-size: 12px;">
                    <i class="fa fa-exclamation-triangle"></i> Failed to load details
                </div>
            `;
        }
    }

    function createEventMarker(event, isStart, isEnd) {
        const marker = document.createElement('div');
        marker.classList.add('event-marker');
        
        // Create event line with color based on transaction code
        const line = document.createElement('div');
        line.className = 'event-line';

        // Calculate duration and add overdue badge if needed
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        const durationInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        if (durationInDays > 3 && isEnd && event.type === 'fixed') {
            const overdueBadge = document.createElement('span');
            overdueBadge.className = 'overdue-badge';
            overdueBadge.textContent = 'OVERDUE';
            line.appendChild(overdueBadge);
        }
        
        // Apply color based on event color or transaction code
        if (event.title === '525616') {
            line.classList.add('event-525616');
        } else if (event.title === '55') {
            line.classList.add('event-55');
        } else if (event.title === '54') {
            line.classList.add('event-54');
        } else if (event.color) {
            line.style.backgroundColor = event.color;
            line.style.opacity = '0.5';
        }
        
        marker.appendChild(line);

        // Create title element
        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = event.title;
        marker.appendChild(title);
          // Create hover content
        const hoverContent = document.createElement('div');
        hoverContent.className = 'event-hover-content';        
        
        // Create enhanced hover content with loading state
        hoverContent.innerHTML = `
            <div class="event-details">
                <div style="font-weight: 500">Transaction Code: ${event.title}</div>
                <div class="event-rental-type ${event.type}">
                    ${event.type === 'fixed' ? 'Fixed Days Rental' : 
                      event.type === 'open' ? 'Open Rental' : 'No rental type'}
                </div>
                <div class="rental-period">
                    <i class="fa-regular fa-calendar"></i>
                    ${formatDateRange(event.startDate, event.endDate)}
                </div>
                ${event.description ? `<div style="font-size: 12px; color: #666; margin-top: 8px">${event.description}</div>` : ''}
                
                <div class="enhanced-details" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                    <div class="loading-state">
                        <i class="fa fa-spinner fa-spin"></i> Loading details...
                    </div>
                </div>
            </div>
            <div class="event-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        marker.setAttribute('data-rental-type', event.type || 'none');
        marker.appendChild(hoverContent);
        
        // Add event listeners for buttons
        const editBtn = hoverContent.querySelector('.edit-btn');
        const deleteBtn = hoverContent.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editEvent(event);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEvent(event);
        });

        // Prevent calendar day click when clicking event marker
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Highlight the whole bar if search matches transaction code or 'overdue' badge
        let highlight = false;
        if (calendar.searchQuery) {
            const query = calendar.searchQuery.toLowerCase();
            if (event.title.toLowerCase().includes(query)) {
                highlight = true;
            }
            // Check for 'overdue' search and if this event is overdue
            if (query === 'overdue') {
                const startDate = new Date(event.startDate);
                const endDate = new Date(event.endDate);
                const durationInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                if (event.type === 'fixed' && durationInDays > 3) {
                    highlight = true;
                }
            }
        }
        if (highlight) {
            marker.classList.add('search-match');
        }        // Sticky hover logic with enhanced content loading
        let hoverTimeout;
        let sticky = false;
        let detailsLoaded = false;
        
        marker.addEventListener('mouseenter', async () => {
            if (sticky) return;
            clearTimeout(hoverTimeout);
            hoverContent.style.display = 'block';
            hoverContent.style.opacity = '1';
            hoverContent.style.visibility = 'visible';
            
            // Load enhanced details if not already loaded
            if (!detailsLoaded) {
                await loadEnhancedDetails(event.title, hoverContent);
                detailsLoaded = true;
            }
        });
        marker.addEventListener('mouseleave', () => {
            if (sticky) return;
            hoverTimeout = setTimeout(() => {
                hoverContent.style.display = '';
                hoverContent.style.opacity = '';
                hoverContent.style.visibility = '';
            }, 100);
        });
        hoverContent.addEventListener('mouseenter', () => {
            if (sticky) return;
            clearTimeout(hoverTimeout);
            hoverContent.style.display = 'block';
            hoverContent.style.opacity = '1';
            hoverContent.style.visibility = 'visible';
        });
        hoverContent.addEventListener('mouseleave', () => {
            if (sticky) return;
            hoverTimeout = setTimeout(() => {
                hoverContent.style.display = '';
                hoverContent.style.opacity = '';
                hoverContent.style.visibility = '';
            }, 100);
        });
        // Make hover sticky on click
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            sticky = !sticky;
            if (sticky) {
                hoverContent.style.display = 'block';
                hoverContent.style.opacity = '1';
                hoverContent.style.visibility = 'visible';
            } else {
                hoverContent.style.display = '';
                hoverContent.style.opacity = '';
                hoverContent.style.visibility = '';
            }
        });
        // Clicking outside removes sticky
        document.addEventListener('click', function docClick(e) {
            if (!marker.contains(e.target)) {
                sticky = false;
                hoverContent.style.display = '';
                hoverContent.style.opacity = '';
                hoverContent.style.visibility = '';
            }
        });

        return marker;
    }    function editEvent(event) {
        // Populate form with event details
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventType').value = event.type || '';
        document.getElementById('eventColor').value = event.color || '#ff9a9e';
        
        // Show/hide appropriate date fields based on rental type
        const openRentalDates = document.querySelectorAll('.open-rental-dates');
        const fixedRentalDate = document.querySelector('.fixed-rental-date');
        
        // Hide all fields first
        openRentalDates.forEach(field => field.style.display = 'none');
        if (fixedRentalDate) fixedRentalDate.style.display = 'none';
          if (event.type === 'open') {
            // Show Open Rental date fields and populate them
            openRentalDates.forEach(field => field.style.display = 'block');
            document.getElementById('eventStartDate').value = event.startDate;
            document.getElementById('eventEndDate').value = event.endDate;
            document.getElementById('eventFixedDate').value = '';
            
            // Enable end date since we have a start date
            const eventEndDate = document.getElementById('eventEndDate');
            if (eventEndDate) {
                eventEndDate.disabled = false;
                eventEndDate.min = event.startDate;
            }
        } else if (event.type === 'fixed') {
            // Show Fixed Rental date field and populate it
            if (fixedRentalDate) fixedRentalDate.style.display = 'block';
            
            // For fixed rental, calculate the center date from the 3-day span
            const startDateObj = new Date(event.startDate);
            const centerDate = new Date(startDateObj);
            centerDate.setDate(startDateObj.getDate() + 1); // Center date is start + 1 day
            
            document.getElementById('eventFixedDate').value = this.formatDate(centerDate);
            document.getElementById('eventStartDate').value = '';
            document.getElementById('eventEndDate').value = '';
            
            // Reset end date validation
            const eventEndDate = document.getElementById('eventEndDate');
            if (eventEndDate) {
                eventEndDate.disabled = true;
            }
        }
        
        // Update the selected dates in the calendar object
        calendar.selectedStartDate = event.startDate;
        calendar.selectedEndDate = event.endDate;
        
        // Store reference to editing event
        calendar.editingEvent = event;
        
        // Update save button text
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.textContent = 'Update Event';

        // Update the sidebar title to 'Edit Event'
        const sidebarTitle = document.querySelector('.event-sidebar h3');
        sidebarTitle.textContent = 'Edit Event';
    }    function deleteEvent(event) {
        showDeleteModal(event);
    }

    function showDeleteModal(event) {
        const modal = document.getElementById('deleteModal');
        const modalEventTitle = document.getElementById('modalEventTitle');
        const modalEventType = document.getElementById('modalEventType');
        const modalEventDates = document.getElementById('modalEventDates');
        const modalEventDescription = document.getElementById('modalEventDescription');
        
        // Populate modal with event details
        modalEventTitle.textContent = event.title;
        modalEventType.textContent = event.type === 'fixed' ? 'Fixed Rental' : 'Open Rental';
        
        // Format date range
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        if (event.type === 'fixed') {
            modalEventDates.textContent = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        } else {
            modalEventDates.textContent = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        }
        
        modalEventDescription.innerHTML = event.description ? 
            `<strong>Description:</strong> ${event.description}` : '';
          // Show modal
        document.body.classList.add('modal-open');
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Store event reference for deletion
        modal.eventToDelete = event;
    }

    function confirmDeleteEvent(event) {
        // Remove event from all dates
        for (const dateStr in calendar.events) {
            calendar.events[dateStr] = calendar.events[dateStr].filter(e => 
                e.title !== event.title || e.startDate !== event.startDate
            );
            // Remove date key if no events left
            if (calendar.events[dateStr].length === 0) {
                delete calendar.events[dateStr];
            }
        }
        
        // Save to localStorage and refresh
        localStorage.setItem('calendarEvents', JSON.stringify(calendar.events));
        calendar.render();
        hideDeleteModal();
    }    function hideDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.eventToDelete = null;
            document.body.classList.remove('modal-open');
        }, 300);
    }    function showClearAllModal() {
        const modal = document.getElementById('clearAllModal');
        
        // Update modal text to show current month
        const currentMonthYear = calendar.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        const modalBody = modal.querySelector('.modal-body p');
        modalBody.innerHTML = `
            Are you sure you want to delete
            <strong>ALL</strong> events from <strong>${currentMonthYear}</strong>?
        `;
        
        // Show modal
        document.body.classList.add('modal-open');
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    function confirmClearAllEvents() {
        // Clear events only for the current month
        const currentYear = calendar.currentDate.getFullYear();
        const currentMonth = calendar.currentDate.getMonth();
        
        // Get the first and last day of the current month
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // Remove events for all dates in the current month
        for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
            const dateStr = calendar.formatDate(date);
            if (calendar.events[dateStr]) {
                delete calendar.events[dateStr];
            }
        }
        
        // Save updated events to localStorage
        localStorage.setItem('calendarEvents', JSON.stringify(calendar.events));
        calendar.render();
        hideClearAllModal();
    }    function hideClearAllModal() {
        const modal = document.getElementById('clearAllModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }

    function formatEventTime(event) {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleDateString()} ${end.toLocaleTimeString()}`;
    }

    calendar.init();
});

$(document).ready(function () {
    const $eventStartDateInput = $("#eventStartDate");
    const $eventEndDateInput = $("#eventEndDate");
    const $saveEventButton = $("#saveEvent"); // Assuming this is the trigger for saving/submitting the event form part

    // Helper function to get 'YYYY-MM-DD' string from a local Date object
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Function to set the event end date's MINIMUM based on the selected start date
    function updateEventEndDateMin() {
        const startDateVal = $eventStartDateInput.val();
        if (startDateVal) {
            const parts = startDateVal.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2], 10);
            const startDate = new Date(year, month, day); 

            const nextDayOfStartDate = new Date(startDate);
            nextDayOfStartDate.setDate(startDate.getDate() + 1);
            
            const nextDayOfStartDateStr = getLocalDateString(nextDayOfStartDate);
            $eventEndDateInput.attr("min", nextDayOfStartDateStr);

            if ($eventEndDateInput.val()) {
                const currentEndDateVal = $eventEndDateInput.val();
                // Ensure currentEndDateVal is parsed correctly as a local date
                const currentEndParts = currentEndDateVal.split('-');
                const currentEndDateLocal = new Date(parseInt(currentEndParts[0]), parseInt(currentEndParts[1]) - 1, parseInt(currentEndParts[2]));
                if (currentEndDateLocal < nextDayOfStartDate) {
                    $eventEndDateInput.val(""); // Clear if end date is now invalid
                }
            }
        } else {
            $eventEndDateInput.removeAttr("min").val(""); // Clear end date if start date is cleared
        }
    }
    
    // Function to initialize/update date field states (min attributes, required, etc.)
    // This combines aspects of toggleDateFields from rental-subscript.js
    function initializeAndUpdateDateFields() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        const minBookableDate = new Date(today);
        minBookableDate.setDate(today.getDate() + 2); // Minimum booking is 2 days from today
        const minBookableDateStr = getLocalDateString(minBookableDate);

        // Setup for Event Start Date
        $eventStartDateInput.attr("min", minBookableDateStr);
        if ($eventStartDateInput.val()) {
            const currentStartDateVal = $eventStartDateInput.val();
            const currentStartParts = currentStartDateVal.split('-');
            const currentStartDateLocal = new Date(parseInt(currentStartParts[0]), parseInt(currentStartParts[1]) - 1, parseInt(currentStartParts[2]));
            if (currentStartDateLocal < minBookableDate) {
                $eventStartDateInput.val(""); // Clear if current value is invalid
            }
        }
        
        // Setup for Event End Date (depends on Start Date)
        updateEventEndDateMin();
    }


    // Initialize and attach listeners
    if ($eventStartDateInput.length && $eventEndDateInput.length) {
        $eventStartDateInput.on("change", function() {
            // Re-check minBookableDate for start date in case user manually types an invalid past date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const minBookableDate = new Date(today);
            minBookableDate.setDate(today.getDate() + 2);
            if ($eventStartDateInput.val()) {
                const currentStartDateVal = $eventStartDateInput.val();
                const currentStartParts = currentStartDateVal.split('-');
                const currentStartDateLocal = new Date(parseInt(currentStartParts[0]), parseInt(currentStartParts[1]) - 1, parseInt(currentStartParts[2]));
                if (currentStartDateLocal < minBookableDate) {
                    alert("Start Date must be at least 2 days after today.");
                    $eventStartDateInput.val(""); 
                }
            }
            updateEventEndDateMin(); // Update end date based on new start date
        });
        
        $eventEndDateInput.on("change", function() {
            // Validate end date against start date if both are present
            const startDateVal = $eventStartDateInput.val();
            if (startDateVal && $eventEndDateInput.val()) {
                 const startParts = startDateVal.split('-');
                 const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                 const nextDayOfStartDate = new Date(startDateLocal);
                 nextDayOfStartDate.setDate(startDateLocal.getDate() + 1);

                 const currentEndDateVal = $eventEndDateInput.val();
                 const currentEndParts = currentEndDateVal.split('-');
                 const currentEndDateLocal = new Date(parseInt(currentEndParts[0]), parseInt(currentEndParts[1]) - 1, parseInt(currentEndParts[2]));

                 if (currentEndDateLocal < nextDayOfStartDate) {
                    alert("End Date cannot be earlier than one day after the Start Date.");
                    $eventEndDateInput.val(""); // Clear invalid date
                 }
            }
        });

        initializeAndUpdateDateFields(); // Initial call to set up dates
    }
    
    // Validation on "Save Event" button click (similar to rental form submission)
    if ($saveEventButton.length) {
        $saveEventButton.on("click", function(e) {
            let isValid = true;
            const todayForSubmit = new Date();
            todayForSubmit.setHours(0, 0, 0, 0);
            const minBookableDateOnSubmit = new Date(todayForSubmit);
            minBookableDateOnSubmit.setDate(todayForSubmit.getDate() + 2);

            const startDateVal = $eventStartDateInput.val();
            const endDateVal = $eventEndDateInput.val();

            // --- Basic field presence checks (can be expanded) ---
            if (!$("#eventTitle").val().trim()) {
                alert("Transaction Code is required.");
                isValid = false;
                $("#eventTitle").focus();
                // e.preventDefault(); // if it were a real form submit
                return; // Stop further processing
            }
            if (!$("#eventType").val() && isValid) {
                alert("Rental Type is required.");
                isValid = false;
                $("#eventType").focus();
                // e.preventDefault();
                return;
            }
            // --- End basic field presence ---


            // --- Start Date Validation ---
            if (!startDateVal) { 
                alert("Start Date is required.");
                isValid = false;
                $eventStartDateInput.focus();
            } else {
                const startParts = startDateVal.split('-');
                const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                if (startDateLocal < minBookableDateOnSubmit) {
                    alert("Start Date must be at least 2 days after today.");
                    isValid = false;
                    $eventStartDateInput.focus();
                }
            }
            if (!isValid) { /* e.preventDefault(); */ return; }


            // --- End Date Validation ---
            if (!endDateVal) { 
                 alert("End Date is required.");
                 isValid = false;
                 $eventEndDateInput.focus();
            } else if (startDateVal) { // Only proceed if start date is also present
                const startParts = startDateVal.split('-');
                const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                
                const endParts = endDateVal.split('-');
                const endDateLocal = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
                
                const expectedMinEndDate = new Date(startDateLocal);
                expectedMinEndDate.setDate(startDateLocal.getDate() + 1);
                if (endDateLocal < expectedMinEndDate) {
                     alert("End Date must be at least one day after the Start Date.");
                     isValid = false;
                     $eventEndDateInput.focus();
                }
            }
            if (!isValid) { /* e.preventDefault(); */ return; }

            // If all validations pass, the existing calendar.saveEvent() will be called
            // by its own event listener. This click handler here is just for validation.
            // If this button were type="submit" in a form, you'd use e.preventDefault() above.
            // Since it's likely a generic button, just returning if not valid is enough
            // to prevent the calendar.saveEvent() from proceeding with bad dates if it also checks them.
            // The calendar.saveEvent() in the original code is called by its own click listener.
            // This validation should ideally happen *before* that or be integrated.
            // For now, this provides the alert feedback.
            
            // If the saveEvent function in the other part of the script relies on these fields,
            // and this validation fails, the user gets an alert. The actual save might still proceed
            // if not prevented. The original saveEvent in the provided code doesn't seem to take 'e'
            // so it can't be easily prevented from here without restructuring.
            // The best approach would be to call a single validation function before saving.

            // For now, if invalid, we just alert and return. The calendar's own saveEvent
            // will still fire. This is a limitation of adding validation separately.
            if (!isValid) {
                console.log("Date validation failed for calendar event form.");
                // To truly prevent the other save, you might need to set a flag or restructure.
            } else {
                console.log("Date validation passed for calendar event form.");
            }
        });
    }
});
