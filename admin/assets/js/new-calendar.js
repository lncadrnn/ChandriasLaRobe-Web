// Import Firebase configuration (will be loaded via script tag)
// import { firebaseConfig } from '../firebase-config.js';

// Calendar State
let currentDate = new Date(); // Start at current date
let currentView = 'month'; // Track current view: 'month', 'week', 'day'
let transactions = [];
let filteredTransactions = [];
let db = null;

// DOM Elements (will be initialized after DOM loads)
let currentMonthElement, currentYearElement, calendarDaysElement, searchInput, prevMonthBtn, nextMonthBtn, notesTextarea;

// Check if essential DOM elements exist
function checkDOMElements() {
    const elements = {
        currentMonthElement: currentMonthElement,
        currentYearElement: currentYearElement,
        calendarDaysElement: calendarDaysElement,
        searchInput: searchInput,
        prevMonthBtn: prevMonthBtn,
        nextMonthBtn: nextMonthBtn,
        notesTextarea: notesTextarea
    };
    
    const missing = [];
    for (const [varName, element] of Object.entries(elements)) {
        if (!element) {
            missing.push(varName);
        }
    }
    
    if (missing.length > 0) {
        console.error('Missing DOM elements:', missing);
        return false;
    }
    
    console.log('All DOM elements found successfully');
    return true;
}

// Month names
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Initialize the calendar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing calendar...');    // Initialize DOM elements
    currentMonthElement = document.getElementById('currentMonth');
    currentYearElement = document.getElementById('currentYear');
    calendarDaysElement = document.getElementById('calendarDays');
    searchInput = document.getElementById('searchInput');
    prevMonthBtn = document.getElementById('prevMonth');
    nextMonthBtn = document.getElementById('nextMonth');
    notesTextarea = document.getElementById('notesTextarea');
    
    try {
        // Check DOM elements first
        if (!checkDOMElements()) {
            showError('Calendar initialization failed: Missing required elements');
            return;
        }
        
        // Check if Firebase is available
        if (typeof firebase !== 'undefined' && window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
            db = firebase.firestore();
            console.log('Firebase initialized successfully');
        } else {
            console.warn('Firebase not available, will use sample data');
        }        // Initialize sidebar
        initializeSidebar();
          // Initialize calendar
        await initializeCalendar();        // Setup event listeners
        setupEventListeners();
        
        // Initialize dropdowns
        initializeDropdowns();
        
        // Load notes from localStorage
        loadNotes();
        
        console.log('Calendar initialization completed successfully');
        
    } catch (error) {
        console.error('Error initializing calendar:', error);
        showError('Failed to initialize calendar. Please refresh the page.');
    }
});

// Initialize sidebar functionality
function initializeSidebar() {
    const body = document.querySelector("body");
    const sidebar = body.querySelector(".sidebar");
    const toggle = body.querySelector(".toggle");

    // Restore sidebar state from localStorage
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle
    if (toggle) {
        toggle.addEventListener("click", () => {
            const isClosed = sidebar.classList.toggle("close");
            localStorage.setItem("admin-sidebar-closed", isClosed);
        });
    }
}

// Initialize calendar
async function initializeCalendar() {
    try {
        showLoading();
        await loadTransactions();
        renderCalendar();
        hideLoading();
    } catch (error) {
        console.error('Error initializing calendar:', error);
        hideLoading();
        showError('Failed to load calendar data.');
    }
}

// Load transactions from Firebase
async function loadTransactions() {
    try {
        if (!db) {
            console.warn('Firebase not initialized, using sample data');
            loadSampleData();
            return;
        }

        const snapshot = await db.collection('transaction')
            .orderBy('timestamp', 'desc')
            .get();

        transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const transaction = {
                id: doc.id,
                ...data,
                // Ensure dates are properly formatted
                eventStartDate: data.eventStartDate ? new Date(data.eventStartDate) : null,
                eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
                eventDate: data.eventDate ? new Date(data.eventDate) : null
            };
            
            // Determine rental status and type
            transaction.rentalStatus = determineRentalStatus(transaction);
            transaction.rentalType = determineRentalType(transaction);
            
            transactions.push(transaction);
        });

        filteredTransactions = [...transactions];
        console.log('Loaded transactions:', transactions.length);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        console.warn('Falling back to sample data');
        loadSampleData();
    }
}

// Load sample data for testing
function loadSampleData() {
    console.log('Loading sample data...');
    
    transactions = [
        {
            id: 'sample1',
            transactionCode: 'TRNS-050823-007',
            fullName: 'Felecia Burke',
            eventType: 'Grad Ball',
            rentalType: 'Open Rental',
            eventStartDate: new Date(2025, 5, 2), // June 2, 2025
            eventEndDate: new Date(2025, 5, 5),   // June 5, 2025
            totalPayment: 4300,
            paymentMethod: 'Full Payment',
            notes: 'Sending order (#25789) Felecia Burke at 12:00'
        },
        {
            id: 'sample2',
            transactionCode: 'transaction code',
            fullName: 'John Doe',
            eventType: 'Wedding',
            rentalType: 'Fixed Rental',
            eventDate: new Date(2025, 5, 15), // June 15, 2025
            totalPayment: 5000,
            paymentMethod: 'Partial Payment',
            notes: 'Special requirements noted'
        },
        {
            id: 'sample3',
            transactionCode: '+5',
            fullName: 'Jane Smith',
            eventType: 'Debut',
            rentalType: 'Open Rental',
            eventStartDate: new Date(2025, 5, 25), // June 25, 2025
            eventEndDate: new Date(2025, 5, 26),   // June 26, 2025
            totalPayment: 3500,
            paymentMethod: 'Full Payment'
        }
    ];
    
    // Determine status for each transaction
    transactions.forEach(transaction => {
        transaction.rentalStatus = determineRentalStatus(transaction);
        transaction.rentalType = determineRentalType(transaction);
        console.log('Transaction loaded:', {
            code: transaction.transactionCode,
            status: transaction.rentalStatus,
            startDate: transaction.eventStartDate ? transaction.eventStartDate.toLocaleDateString() : 'N/A',
            endDate: transaction.eventEndDate ? transaction.eventEndDate.toLocaleDateString() : 'N/A',
            eventDate: transaction.eventDate ? transaction.eventDate.toLocaleDateString() : 'N/A'
        });
    });
    
    filteredTransactions = [...transactions];
    console.log('Sample data loaded successfully:', transactions.length, 'transactions');
    console.log('Filtered transactions:', filteredTransactions.length);
}

// Determine rental status based on dates
function determineRentalStatus(transaction) {
    const now = new Date();
    const startDate = transaction.eventStartDate || transaction.eventDate;
    const endDate = transaction.eventEndDate || transaction.eventDate;
    
    if (!startDate) return 'upcoming';
    
    // Normalize dates for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : start;
    
    // Check if rental is overdue/late
    if (today > end) {
        return transaction.paymentMethod === 'Full Payment' ? 'completed' : 'late';
    }
    
    // Check if rental is ongoing
    if (today >= start && today <= end) {
        return transaction.rentalType === 'Fixed Rental' ? 'ongoing-fixed' : 'ongoing-open';
    }
    
    // Check if rental is upcoming
    if (today < start) {
        return 'upcoming';
    }
    
    return 'completed';
}

// Determine rental type
function determineRentalType(transaction) {
    if (transaction.rentalType === 'Fixed Rental' || (!transaction.eventEndDate && transaction.eventDate)) {
        return 'fixed';
    }
    return 'open';
}

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    console.log(`Rendering calendar for ${monthNames[month]} ${year}`);
    console.log('Available transactions:', filteredTransactions.length);
    
    // Update month and year display
    currentMonthElement.textContent = monthNames[month];
    currentYearElement.textContent = year;
    
    // Clear previous calendar
    calendarDaysElement.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    console.log(`Month has ${daysInMonth} days`);
    
    // Get first day of week (Monday = 0)
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    // Add previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevMonthLastDay - i, true, year, month - 1);
        calendarDaysElement.appendChild(dayElement);
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false, year, month);
        calendarDaysElement.appendChild(dayElement);
    }
    
    // Add next month days to fill the grid (ensure we have complete weeks)
    const totalCells = calendarDaysElement.children.length;
    const weeksNeeded = Math.ceil(totalCells / 7);
    const totalCellsNeeded = weeksNeeded * 7;
    const remainingCells = totalCellsNeeded - totalCells;
    
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, true, year, month + 1);
        calendarDaysElement.appendChild(dayElement);
    }
    
    console.log('Calendar rendered successfully');
}

// Create day element
function createDayElement(day, isOtherMonth, year, month) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('calendar-day');
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // Check if it's today
    const today = new Date();
    const currentDateCheck = new Date(year, month, day);
    if (!isOtherMonth && 
        currentDateCheck.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }
    
    // Create day number
    const dayNumberElement = document.createElement('div');
    dayNumberElement.classList.add('day-number');
    dayNumberElement.textContent = day;
    dayElement.appendChild(dayNumberElement);
    
    // Create events container
    const eventsContainer = document.createElement('div');
    eventsContainer.classList.add('day-events');
    dayElement.appendChild(eventsContainer);
    
    // Add events for this day
    if (!isOtherMonth) {
        const dayEvents = getEventsForDay(year, month, day);
        console.log(`Day ${day}: ${dayEvents.length} events found`);
        
        dayEvents.forEach((event, index) => {
            console.log(`Creating event element ${index + 1} for day ${day}:`, event.transactionCode);
            const eventElement = createEventElement(event);
            eventsContainer.appendChild(eventElement);
        });
    }
    
    return dayElement;
}

// Get events for a specific day
function getEventsForDay(year, month, day) {
    const targetDate = new Date(year, month, day);
    const events = [];
    
    // Debug log for specific dates we're looking for
    if (year === 2025 && month === 5 && [2, 15, 25].includes(day)) {
        console.log(`Checking events for ${year}-${month + 1}-${day} (${targetDate.toLocaleDateString()})`);
        console.log('Available transactions:', filteredTransactions.length);
    }
    
    filteredTransactions.forEach(transaction => {
        const startDate = transaction.eventStartDate || transaction.eventDate;
        const endDate = transaction.eventEndDate || transaction.eventDate;
        
        if (!startDate) {
            if (year === 2025 && month === 5 && [2, 15, 25].includes(day)) {
                console.log('Transaction has no start date:', transaction.transactionCode);
            }
            return;
        }
        
        // Normalize dates to compare only the date part
        const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const normalizedEnd = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : normalizedStart;
        
        // Debug log for specific dates
        if (year === 2025 && month === 5 && [2, 15, 25].includes(day)) {
            console.log(`Transaction ${transaction.transactionCode}:`, {
                targetDate: normalizedTarget.toLocaleDateString(),
                startDate: normalizedStart.toLocaleDateString(),
                endDate: normalizedEnd.toLocaleDateString(),
                inRange: normalizedTarget >= normalizedStart && normalizedTarget <= normalizedEnd
            });
        }
        
        // Check if the event occurs on this day
        if (normalizedTarget >= normalizedStart && normalizedTarget <= normalizedEnd) {
            // Add information about whether this is the start, middle, or end of the event
            const isStart = normalizedTarget.getTime() === normalizedStart.getTime();
            const isEnd = normalizedTarget.getTime() === normalizedEnd.getTime();
            const isMultiDay = normalizedStart.getTime() !== normalizedEnd.getTime();
            
            events.push({
                ...transaction,
                isStart,
                isEnd,
                isMultiDay
            });
            
            // Debug logging for found events
            if (year === 2025 && month === 5 && [2, 15, 25].includes(day)) {
                console.log(`✓ Found event for ${year}-${month+1}-${day}:`, transaction.transactionCode);
            }
        }
    });
    
    if (year === 2025 && month === 5 && [2, 15, 25].includes(day)) {
        console.log(`Events found for ${year}-${month+1}-${day}:`, events.length);
    }
    
    return events;
}

// Create event element
function createEventElement(transaction) {
    const eventElement = document.createElement('div');
    eventElement.classList.add('event-bar', transaction.rentalStatus);
    
    // Handle multi-day event display
    if (transaction.isMultiDay) {
        if (transaction.isStart && !transaction.isEnd) {
            eventElement.classList.add('event-start');
            eventElement.textContent = transaction.transactionCode || 'No Code';
        } else if (!transaction.isStart && !transaction.isEnd) {
            eventElement.classList.add('event-middle');
            eventElement.textContent = transaction.transactionCode || 'No Code';
        } else if (transaction.isEnd && !transaction.isStart) {
            eventElement.classList.add('event-end');
            eventElement.textContent = transaction.transactionCode || 'No Code';
        } else {
            // Single day event within multi-day range
            eventElement.textContent = transaction.transactionCode || 'No Code';
        }
    } else {
        eventElement.textContent = transaction.transactionCode || 'No Code';
    }
      eventElement.title = `${transaction.transactionCode || 'No Code'} - ${transaction.fullName || 'Unknown'}`;
    
    // Add click event for event details
    eventElement.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(transaction, e.currentTarget);
    });
    
    return eventElement;
}

// Show event details
function showEventDetails(transaction, clickedElement) {
    const modal = document.getElementById('eventModal');
    const modalBody = document.getElementById('eventModalBody');
    
    // Format dates
    const startDate = transaction.eventStartDate ? transaction.eventStartDate.toLocaleDateString() : 'N/A';
    const endDate = transaction.eventEndDate ? transaction.eventEndDate.toLocaleDateString() : 'N/A';
    const eventDate = transaction.eventDate ? transaction.eventDate.toLocaleDateString() : 'N/A';
    
    let dateInfo = '';
    if (transaction.rentalType === 'Fixed Rental' || transaction.eventDate) {
        dateInfo = eventDate;
    } else {
        dateInfo = `${startDate} - ${endDate}`;
    }
    
    const statusFormatted = formatStatus(transaction.rentalStatus);
    
    modalBody.innerHTML = `
        <div class="event-detail-item">
            <div class="event-detail-label">Transaction Code:</div>
            <div class="event-detail-value"><strong>${transaction.transactionCode || 'N/A'}</strong></div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Customer:</div>
            <div class="event-detail-value">${transaction.fullName || 'N/A'}</div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Event Type:</div>
            <div class="event-detail-value">${transaction.eventType || 'N/A'}</div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Rental Type:</div>
            <div class="event-detail-value">${transaction.rentalType || 'N/A'}</div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Status:</div>
            <div class="event-detail-value">
                <span class="status-badge ${transaction.rentalStatus}">${statusFormatted}</span>
            </div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Date:</div>
            <div class="event-detail-value">${dateInfo}</div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Total Payment:</div>
            <div class="event-detail-value">₱${transaction.totalPayment || 0}</div>
        </div>
        <div class="event-detail-item">
            <div class="event-detail-label">Payment Method:</div>
            <div class="event-detail-value">${transaction.paymentMethod || 'N/A'}</div>
        </div>
        ${transaction.notes ? `
        <div class="event-detail-item">
            <div class="event-detail-label">Notes:</div>
            <div class="event-detail-value">${transaction.notes}</div>
        </div>        ` : ''}
    `;    // Position modal relative to clicked element if provided
    if (clickedElement) {
        const rect = clickedElement.getBoundingClientRect();
        const modalContent = modal.querySelector('.modal-content');
        
        // Check if screen is mobile (width < 768px)
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // On mobile, use centered positioning for better UX
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modalContent.style.position = 'relative';
            modalContent.style.left = 'auto';
            modalContent.style.top = 'auto';
            modalContent.style.margin = 'auto';
            modalContent.removeAttribute('data-position');
        } else {
            // Desktop positioning logic
            modal.style.alignItems = 'flex-start';
            modal.style.justifyContent = 'flex-start';
            
            // Calculate position
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const modalWidth = 500; // max-width from CSS
            const modalHeight = 400; // estimated height
            
            let left = rect.right + 10; // 10px gap from element
            let top = rect.top;
            let position = 'right'; // Track which side we're positioning on
            
            // Check if modal would go off-screen horizontally
            if (left + modalWidth > viewportWidth - 20) {
                left = rect.left - modalWidth - 10; // Position to the left of element
                position = 'left';
            }
            
            // Ensure modal doesn't go off left edge
            if (left < 20) {
                left = 20;
                position = 'center';
            }
            
            // Check if modal would go off-screen vertically
            if (top + modalHeight > viewportHeight - 20) {
                top = viewportHeight - modalHeight - 20;
            }
            
            // Ensure modal doesn't go off top edge
            if (top < 20) {
                top = 20;
            }
            
            // Apply positioning
            modalContent.style.position = 'absolute';
            modalContent.style.left = left + 'px';
            modalContent.style.top = top + 'px';
            modalContent.style.margin = '0';
            
            // Add arrow indicator
            modalContent.setAttribute('data-position', position);
        }
    } else {
        // Fallback to center positioning
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.position = 'relative';
        modalContent.style.left = 'auto';
        modalContent.style.top = 'auto';
        modalContent.style.margin = 'auto';
        modalContent.removeAttribute('data-position');
    }
      modal.style.display = 'flex';
    
    // Setup close functionality with positioning reset
    const closeBtn = modal.querySelector('.close-modal');
    const closeModal = () => {
        modal.style.display = 'none';
        // Reset modal positioning
        const modalContent = modal.querySelector('.modal-content');
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modalContent.style.position = 'relative';
        modalContent.style.left = 'auto';
        modalContent.style.top = 'auto';
        modalContent.style.margin = 'auto';
        modalContent.removeAttribute('data-position');
    };
      closeBtn.onclick = closeModal;
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

// Format status for display
function formatStatus(status) {
    const statusMap = {
        'ongoing-fixed': 'Ongoing (Fixed)',
        'ongoing-open': 'Ongoing (Open)',
        'upcoming': 'Upcoming',
        'completed': 'Completed',
        'late': 'Late'
    };
    return statusMap[status] || status;
}

// Render Week View
function renderWeekView() {
    console.log('Rendering week view');
    
    // Get the start of the week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
      // Update month/year display to show week range
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        currentMonthElement.textContent = monthNames[startOfWeek.getMonth()];
        currentYearElement.textContent = `${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
        // Shortened format for cross-month weeks
        const startMonth = monthNames[startOfWeek.getMonth()].substring(0, 3); // Short month name
        const endMonth = monthNames[endOfWeek.getMonth()].substring(0, 3);
        currentMonthElement.textContent = `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}`;
        currentYearElement.textContent = startOfWeek.getFullYear().toString();
    }
    
    // Clear and update calendar container
    calendarDaysElement.innerHTML = '';
    calendarDaysElement.classList.add('week-view');
    
    // Create week days
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const dayElement = createWeekDayElement(currentDay);
        calendarDaysElement.appendChild(dayElement);
    }
}

// Create week day element
function createWeekDayElement(date) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('week-day');
    
    // Check if it's today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }
    
    // Day header with day name and date
    const dayHeader = document.createElement('div');
    dayHeader.classList.add('week-day-header');
    dayHeader.innerHTML = `
        <div class="week-day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="week-day-number">${date.getDate()}</div>
    `;
    dayElement.appendChild(dayHeader);
    
    // Events container
    const eventsContainer = document.createElement('div');
    eventsContainer.classList.add('week-day-events');
    dayElement.appendChild(eventsContainer);
    
    // Add events for this day
    const dayEvents = getEventsForDay(date.getFullYear(), date.getMonth(), date.getDate());
    dayEvents.forEach(event => {
        const eventElement = createWeekEventElement(event);
        eventsContainer.appendChild(eventElement);
    });
    
    return dayElement;
}

// Create week event element
function createWeekEventElement(transaction) {
    const eventElement = document.createElement('div');
    eventElement.classList.add('week-event', transaction.rentalStatus);
    eventElement.textContent = transaction.transactionCode || 'No Code';    eventElement.title = `${transaction.transactionCode || 'No Code'} - ${transaction.fullName || 'Unknown'}`;
    
    eventElement.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(transaction, e.currentTarget);
    });
    
    return eventElement;
}

// Render Day View
function renderDayView() {
    console.log('Rendering day view');
      // Update month/year display
    currentMonthElement.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'short' }); // Shortened weekday
    currentYearElement.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Shortened month
    
    // Clear and update calendar container
    calendarDaysElement.innerHTML = '';
    calendarDaysElement.classList.add('day-view');
    
    // Create day container
    const dayContainer = document.createElement('div');
    dayContainer.classList.add('day-container');
    
    // Check if it's today
    const today = new Date();
    if (currentDate.toDateString() === today.toDateString()) {
        dayContainer.classList.add('today');
    }
    
    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.classList.add('day-header');
    dayHeader.innerHTML = `
        <h2>${currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
    `;
    dayContainer.appendChild(dayHeader);
    
    // Events container
    const eventsContainer = document.createElement('div');
    eventsContainer.classList.add('day-events-list');
    dayContainer.appendChild(eventsContainer);
    
    // Add events for this day
    const dayEvents = getEventsForDay(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    if (dayEvents.length === 0) {
        const noEventsMsg = document.createElement('div');
        noEventsMsg.classList.add('no-events');
        noEventsMsg.textContent = 'No events scheduled for this day';
        eventsContainer.appendChild(noEventsMsg);
    } else {
        dayEvents.forEach(event => {
            const eventElement = createDayEventElement(event);
            eventsContainer.appendChild(eventElement);
        });
    }
    
    calendarDaysElement.appendChild(dayContainer);
}

// Create day event element
function createDayEventElement(transaction) {
    const eventElement = document.createElement('div');
    eventElement.classList.add('day-event', transaction.rentalStatus);
    
    const startDate = transaction.eventStartDate ? transaction.eventStartDate.toLocaleDateString() : 'N/A';
    const endDate = transaction.eventEndDate ? transaction.eventEndDate.toLocaleDateString() : 'N/A';
    const eventDate = transaction.eventDate ? transaction.eventDate.toLocaleDateString() : 'N/A';
    
    let dateInfo = '';
    if (transaction.rentalType === 'Fixed Rental' || transaction.eventDate) {
        dateInfo = eventDate;
    } else {
        dateInfo = `${startDate} - ${endDate}`;
    }
    
    eventElement.innerHTML = `
        <div class="day-event-time">${dateInfo}</div>
        <div class="day-event-title">${transaction.transactionCode || 'No Code'}</div>
        <div class="day-event-details">
            <div>${transaction.fullName || 'Unknown Customer'}</div>
            <div>${transaction.eventType || 'Unknown Event'}</div>
            <div class="status-badge ${transaction.rentalStatus}">${formatStatus(transaction.rentalStatus)}</div>        </div>
    `;
    
    eventElement.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(transaction, e.currentTarget);
    });
    
    return eventElement;
}

// Switch between views
function switchView(view) {
    currentView = view;
    
    // Remove all view classes
    calendarDaysElement.classList.remove('week-view', 'day-view');
    
    switch(view) {
        case 'month':
            renderCalendar();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
    }
}

// Navigation for different views
function navigateView(direction) {
    switch(currentView) {
        case 'month':
            currentDate.setMonth(currentDate.getMonth() + direction);
            renderCalendar();
            break;
        case 'week':
            currentDate.setDate(currentDate.getDate() + (direction * 7));
            renderWeekView();
            break;
        case 'day':
            currentDate.setDate(currentDate.getDate() + direction);
            renderDayView();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        navigateView(-1);
    });
    
    nextMonthBtn.addEventListener('click', () => {
        navigateView(1);
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredTransactions = [...transactions];
        } else {
            filteredTransactions = transactions.filter(transaction => 
                (transaction.transactionCode || '').toLowerCase().includes(searchTerm) ||
                (transaction.fullName || '').toLowerCase().includes(searchTerm) ||
                (transaction.eventType || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Re-render current view
        switchView(currentView);
    });
    
    // View toggle functionality
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            viewButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            
            const view = e.target.dataset.view;
            console.log(`Switched to ${view} view`);
            
            // Switch to the selected view
            switchView(view);
        });
    });
    
    // Notes functionality
    notesTextarea.addEventListener('input', saveNotes);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    prevMonthBtn.click();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextMonthBtn.click();
                    break;
            }        } else if (e.key === 'Escape') {
            // Close modal on ESC key
            const modal = document.getElementById('eventModal');
            if (modal && modal.style.display === 'flex') {
                const modalContent = modal.querySelector('.modal-content');
                modal.style.display = 'none';
                // Reset modal positioning
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modalContent.style.position = 'relative';
                modalContent.style.left = 'auto';
                modalContent.style.top = 'auto';
                modalContent.style.margin = 'auto';
                modalContent.removeAttribute('data-position');
            }
        }
    });
}

// Load notes from localStorage
function loadNotes() {
    const savedNotes = localStorage.getItem('calendar-notes');
    if (savedNotes && notesTextarea) {
        notesTextarea.value = savedNotes;
    }
}

// Save notes to localStorage
function saveNotes() {
    if (notesTextarea) {
        localStorage.setItem('calendar-notes', notesTextarea.value);
    }
}

// Utility functions
function showLoading() {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'calendar-loading';
    loadingElement.classList.add('loading');
    loadingElement.innerHTML = '<div class="spinner"></div>';
    
    const existingLoading = document.getElementById('calendar-loading');
    if (existingLoading) {
        existingLoading.remove();
    }
    
    calendarDaysElement.appendChild(loadingElement);
}

function hideLoading() {
    const loadingElement = document.getElementById('calendar-loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

// Refresh calendar data
async function refreshCalendar() {
    try {
        showLoading();
        await loadTransactions();
        renderCalendar();
        hideLoading();
    } catch (error) {
        console.error('Error refreshing calendar:', error);
        hideLoading();
        showError('Failed to refresh calendar data.');
    }
}

// Export functions for external use
window.calendarApp = {
    refreshCalendar,
    loadTransactions,
    renderCalendar
};

// ========== DROPDOWN FUNCTIONALITY ==========

// Initialize dropdown functionality
function initializeDropdowns() {
    console.log('Initializing dropdowns...');
    initializeYearDropdown();
    setupDropdownEventListeners();
    updateCalendarDisplay(); // Update initial display
    console.log('Dropdowns initialized successfully');
}

// Generate years for year dropdown (current year ± 10 years)
function initializeYearDropdown() {
    const yearDropdown = document.getElementById('yearDropdown');
    if (!yearDropdown) return;
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    const endYear = currentYear + 10;
    
    yearDropdown.innerHTML = '';
    
    for (let year = startYear; year <= endYear; year++) {
        const yearItem = document.createElement('div');
        yearItem.className = 'dropdown-item';
        yearItem.dataset.year = year;
        yearItem.textContent = year;
        yearDropdown.appendChild(yearItem);
    }
}

// Setup dropdown event listeners
function setupDropdownEventListeners() {
    const monthSelector = document.querySelector('.month-selector');
    const yearSelector = document.querySelector('.year-selector');
    const monthDropdown = document.getElementById('monthDropdown');
    const yearDropdown = document.getElementById('yearDropdown');
    const currentMonthSpan = document.getElementById('currentMonth');
    const currentYearSpan = document.getElementById('currentYear');
    
    if (!monthSelector || !yearSelector || !monthDropdown || !yearDropdown) {
        console.warn('Dropdown elements not found');
        return;
    }
    
    // Month selector click handler
    currentMonthSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        monthDropdown.classList.toggle('show');
    });
      // Year selector click handler
    currentYearSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        yearDropdown.classList.toggle('show');
    });
      // Month dropdown item click handlers
    monthDropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            const selectedMonth = parseInt(e.target.dataset.month);
            currentDate.setMonth(selectedMonth);
            updateCalendarDisplay();
            // Re-render current view
            switchView(currentView);
            closeAllDropdowns();
        }
    });
    
    // Year dropdown item click handlers
    yearDropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            const selectedYear = parseInt(e.target.dataset.year);
            currentDate.setFullYear(selectedYear);
            updateCalendarDisplay(); 
            // Re-render current view
            switchView(currentView);
            closeAllDropdowns();
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.month-selector') && !e.target.closest('.year-selector')) {
            closeAllDropdowns();
        }
    });
    
    // Close dropdowns on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });
}

// Close all dropdowns
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-menu');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Update calendar display (month/year text)
function updateCalendarDisplay() {
    const currentMonthElement = document.getElementById('currentMonth');
    const currentYearElement = document.getElementById('currentYear');
    
    if (currentMonthElement && currentYearElement) {
        currentMonthElement.textContent = monthNames[currentDate.getMonth()];
        currentYearElement.textContent = currentDate.getFullYear();
    }
}
