// shop-availability.js - Calendar-based product availability viewer
import {
    collection,
    getDocs,
    chandriaDB
} from "./sdk/chandrias-sdk.js";

// Initialize the module when document is ready
$(document).ready(function() {
    // Add FullCalendar CSS to head if not already present
    if (!$('link[href*="fullcalendar"]').length) {
        $('head').append('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css">');
    }
    
    // Add FullCalendar JS if not already present
    if (typeof FullCalendar === 'undefined') {
        $.getScript('https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js', function() {
            console.log('FullCalendar loaded');
            initCalendarModal();
        });
    } else {
        initCalendarModal();
    }
});

// Initialize the calendar modal
function initCalendarModal() {    // Only create the modal if it doesn't exist yet
    if (!document.getElementById('calendar-availability-modal')) {
        // Add modal HTML to body
        $('body').append(`
            <div id="calendar-availability-modal" class="modal-overlay">
                <div class="modal-container availability-modal">
                    <button id="close-calendar-availability-modal" class="close-btn" aria-label="Close">
                        <i class="fi fi-rs-cross"></i>
                    </button>
                    <div class="modal-body">
                        <div id="availability-calendar"></div>
                        <div class="calendar-legend">
                            <div class="calendar-legend-item">
                                <div class="calendar-box available"></div>
                                <span>Available</span>
                            </div>
                            <div class="calendar-legend-item">
                                <div class="calendar-box unavailable"></div>
                                <span>Unavailable</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Add calendar CSS
        $('head').append(`            <style>                /* Calendar Availability Modal Styles */                #calendar-availability-modal .modal-container {
                    max-width: 750px; /* Reduced from 800px */
                    width: 95%;
                    max-height: 95vh;
                    padding: 10px; /* Reduced from 15px */
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    margin: 0 auto; /* Center the modal */
                }
                
                #calendar-availability-modal .modal-body {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden; /* Prevent overflow */
                }                  #availability-calendar {
                    flex: 1;
                    min-height: 380px; /* Further reduced from 420px */
                    margin: 0;
                    overflow: hidden; /* Prevent overflow */
                }
                
                /* Ensure navigation buttons stay at bottom */
                .calendar-month-navigation {
                    margin-top: auto;
                    flex-shrink: 0;
                }                /* For months with 6 rows - adjust calendar size but keep navigation visible */
                .fc-dayGridMonth-view.fc-view.six-rows .fc-daygrid-body {
                    /* Further reduced to prevent overflow */
                    min-height: 380px !important; 
                }
                  /* When calendar has 6 rows, make the content smaller */
                .fc .fc-daygrid-day-frame {
                    min-height: 55px !important; /* Further reduced from 65px */
                    padding: 0 !important;
                }
                  /* Calendar with 6 rows - make font smaller */
                .fc-dayGridMonth-view.fc-view.six-rows .fc-daygrid-day-number {
                    font-size: 0.8em; /* Smaller font size */
                }
                
                /* Adjust today circle for 6-row months */
                .fc-dayGridMonth-view.fc-view.six-rows .fc-day-today .fc-daygrid-day-number {
                    width: 22px;
                    height: 22px;
                }
                  /* Make all calendar cells more compact */
                .fc .fc-daygrid-day {
                    padding: 0 !important;
                }
                
                /* Reduce spacing between calendar elements */
                .fc .fc-header-toolbar {
                    margin-bottom: 0.3em !important;
                }
                
                /* Make all calendar content more compact */
                .fc-theme-standard .fc-scrollgrid {
                    border-collapse: collapse;
                    font-size: 0.9em;
                }
                
                /* Reduce cell border width */
                .fc-theme-standard td, .fc-theme-standard th {
                    border-width: 1px !important;
                }
                
                /* Remove extra padding in cells */
                .fc .fc-daygrid-day-top {
                    padding: 0 !important;
                }
                
                /* Reduce header row height */
                .fc .fc-col-header-cell {
                    padding: 2px 0 !important;
                }
                
                /* Responsive adjustments */                @media (max-width: 768px) {
                    #calendar-availability-modal .modal-container {
                        width: 98%;
                        max-height: 95vh;
                        padding: 10px;
                    }
                      #availability-calendar {
                        min-height: 350px;
                    }
                    
                    .fc-dayGridMonth-view.fc-view.six-rows .fc-daygrid-body {
                        min-height: 380px !important;
                    }
                      /* Even smaller for mobile */
                    .fc .fc-daygrid-day-frame {
                        min-height: 45px !important; /* Further reduced from 55px */
                    }
                      /* Smaller fonts on mobile */
                    .fc-dayGridMonth-view.fc-view.six-rows .fc-daygrid-day-number {
                        font-size: 0.7em; /* Further reduced font size */
                        padding: 1px !important;
                    }
                    
                    /* Smaller today circle for mobile */
                    .fc .fc-day-today .fc-daygrid-day-number {
                        width: 20px;
                        height: 20px;
                        font-size: 0.75em;
                    }
                    
                    .fc .fc-toolbar-title {
                        font-size: 1.1rem;
                        padding: 0 5px;
                    }
                    
                    .calendar-month-navigation {
                        margin-top: 10px;
                        padding: 8px;
                    }
                    
                    .month-nav-btn {
                        padding: 6px 12px;
                        font-size: 13px;
                    }
                    
                    .calendar-month-display {
                        font-size: 0.95rem;
                        margin: -3px 0 8px 0;
                    }
                }                .calendar-legend {
                    display: flex;
                    justify-content: center;
                    margin-top: 5px; /* Reduced from 10px */
                    margin-bottom: 3px; /* Reduced from 5px */
                    gap: 20px; /* Reduced from 30px */
                }
                
                .calendar-legend-item {
                    display: flex;
                    align-items: center;
                    font-size: 12px; /* Reduced from 14px */
                    color: #666;
                }
                
                .calendar-box {
                    width: 14px; /* Reduced from 16px */
                    height: 14px; /* Reduced from 16px */
                    margin-right: 5px; /* Reduced from 6px */
                    border: 1px solid #ddd;
                }
                
                .calendar-box.available {
                    background-color: #fff;
                }
                
                .calendar-box.unavailable {
                    background-color: #ffeeee;
                    position: relative;
                }
                
                .calendar-box.unavailable::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background-color: #f77;
                    transform: rotate(-45deg);
                }
                  /* FullCalendar custom styles */
                .fc-theme-standard td {
                    border: 1px solid #eee;
                }                  .fc .fc-toolbar-title {
                    font-size: 1.3rem;
                    color: hsl(346, 100%, 74%);
                    font-weight: 600;
                    line-height: 1.3;
                    padding: 0 10px;
                    word-break: break-word;
                    width: 100%;
                    text-align: center;
                }
                  /* Month display styles */
                .calendar-month-display {
                    text-align: center;
                    font-size: 0.95rem; /* Reduced from 1.1rem */
                    color: #666;
                    margin: -3px 0 8px 0; /* Reduced margin */
                    font-weight: 500;
                }
                  /* Month navigation buttons */                .calendar-month-navigation {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px; /* Reduced from 15px */
                    padding: 8px; /* Reduced from 10px */
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                }
                
                .month-nav-btn {
                    background-color: hsl(346, 100%, 90%);
                    color: hsl(346, 100%, 45%);
                    border: none;
                    border-radius: 4px;
                    padding: 6px 14px; /* Reduced from 8px 16px */
                    font-size: 13px; /* Reduced from 14px */
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                }
                
                .month-nav-btn:hover {
                    background-color: hsl(346, 100%, 74%);
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .month-nav-btn i {
                    font-size: 12px;
                }
                  .fc .fc-button-primary {
                    background-color: hsl(346, 100%, 74%);
                    border-color: hsl(346, 100%, 74%);
                    font-size: 0.9em;
                    padding: 0.3em 0.65em;
                }
                
                .fc .fc-button-primary:hover {
                    background-color: hsl(346, 100%, 65%);
                    border-color: hsl(346, 100%, 65%);
                }
                
                .fc .fc-col-header-cell {
                    background-color: #f8f9fa;
                }                
                /* Smaller header text */
                .fc .fc-toolbar-title {
                    font-size: 1.1em;
                    line-height: 1.2;
                }
                  /* Smaller day cells and text */
                .fc .fc-daygrid-day-top {
                    justify-content: center;
                    margin-top: 1px; /* Further reduced from 2px */
                }
                  .fc .fc-daygrid-day-number {
                    font-size: 0.85em;
                    padding: 1px; /* Further reduced from 2px */
                }                  .fc .fc-day-today {
                    background-color: transparent !important; /* Remove yellow background */
                }
                
                /* Also ensure all child elements of today cell have no background */
                .fc .fc-day-today > * {
                    background-color: transparent !important;
                }
                  /* Style the current date number with a pink circle */
                .fc .fc-day-today .fc-daygrid-day-number {
                    background-color: hsl(346, 100%, 85%);
                    color: hsl(346, 100%, 45%);
                    border-radius: 50%;
                    width: 25px;
                    height: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                    font-weight: 600;
                    /* Ensure no other styles affect this */
                    box-shadow: none;
                    border: none;
                }
                
                .fc-day-unavailable {
                    background-color: #ffeeee !important;
                    color: #999 !important;
                    position: relative;
                }
                
                .fc-day-unavailable::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 5px,
                        rgba(255, 120, 120, 0.1) 5px,
                        rgba(255, 120, 120, 0.1) 10px
                    );
                    pointer-events: none;
                }
            </style>
        `);
        
        // Add event listeners for the modal
        $(document).on('click', '#close-calendar-availability-modal', hideCalendarModal);
        $(document).on('click', '#calendar-availability-modal', function(e) {
            if (e.target === this) hideCalendarModal();
        });
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && $('#calendar-availability-modal').is(':visible')) hideCalendarModal();
        });
    }
    
    // Listen for clicks on view-availability buttons
    $(document).on('click', '.view-availability-btn', async function() {
        const productId = $(this).data('product-id');
        const productName = $(this).closest('.product-item').find('.product-title').text();
        showCalendarModal();
        await initProductCalendar(productId, productName);
    });
    
    // Add a tooltip for the availability button
    $(document).on('mouseenter', '.view-availability-btn', function() {
        $(this).attr('title', 'View availability calendar');
    });
}

// Show the calendar modal
function showCalendarModal() {
    const modal = $('#calendar-availability-modal');
    
    // Reset calendar area to prevent duplicate elements
    const calendarEl = document.getElementById('availability-calendar');
    if (calendarEl) {
        calendarEl.innerHTML = '';
    }
    
    // Remove any existing navigation buttons
    const existingNavigation = document.querySelector('.calendar-month-navigation');
    if (existingNavigation) {
        existingNavigation.remove();
    }
    
    modal.css('display', 'flex');
    setTimeout(() => modal.addClass('show'), 10);
}

// Hide the calendar modal
function hideCalendarModal() {
    const modal = $('#calendar-availability-modal');
    modal.removeClass('show');
    
    // Schedule cleanup after animation completes
    setTimeout(() => {
        modal.css('display', 'none');
        
        // Clean up calendar when modal is hidden to prevent memory leaks
        const calendarEl = document.getElementById('availability-calendar');
        if (calendarEl && calendarEl._calendar) {
            // If FullCalendar has a destroy method, use it
            if (typeof calendarEl._calendar.destroy === 'function') {
                calendarEl._calendar.destroy();
            }
            // Remove the reference
            delete calendarEl._calendar;
        }
    }, 300);
}

// Initialize and render the product calendar
async function initProductCalendar(productId, productName) {
    const calendarEl = document.getElementById('availability-calendar');
    
    // Clear any previous calendar content and navigation elements
    calendarEl.innerHTML = '';
    
    // Remove any existing navigation buttons to prevent duplicates
    const existingNavigation = document.querySelector('.calendar-month-navigation');
    if (existingNavigation) {
        existingNavigation.remove();
    }
    
    // Add loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'd-flex flex-column align-items-center justify-content-center py-5';
    loadingSpinner.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3" style="color: #666;">Loading calendar...</p>
    `;
    calendarEl.appendChild(loadingSpinner);
    
    try {
        // Fetch unavailable dates
        const unavailableDates = await fetchUnavailableDates(productId);
        
        // Remove loading spinner once data is fetched
        calendarEl.innerHTML = '';
        
        // Small delay to ensure DOM is ready for calendar rendering
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Initialize the FullCalendar
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            },
            height: 'auto',
            selectable: false,
            unselectAuto: true,
            editable: false,
            fixedWeekCount: false, // This ensures the last row is the one with the month's last day
            showNonCurrentDates: false, // Hide dates from other months
              // Show only the product name in title
            titleFormat: function(date) {
                // Full product name without truncation
                return productName;
            },
                  // Style unavailable dates
            dayCellDidMount: function(info) {
                const dateStr = info.date.toLocaleDateString();
                if (unavailableDates.includes(dateStr)) {
                    info.el.classList.add('fc-day-unavailable');
                }
                
                // Force remove background from today's cell
                if (info.isToday) {
                    info.el.style.setProperty('background-color', 'transparent', 'important');
                    const cellContent = info.el.querySelector('.fc-daygrid-day-frame');
                    if (cellContent) {
                        cellContent.style.setProperty('background-color', 'transparent', 'important');
                    }
                }
            },
              // Highlight today
            nowIndicator: true,
              // When dates are rendered
            datesSet: function(info) {
                // Check if this month needs 6 rows
                const start = info.view.currentStart;
                const end = info.view.currentEnd;
                
                // Calculate how many weeks are needed to display this month
                const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);
                const lastDay = new Date(end.getFullYear(), end.getMonth(), 0);
                
                // First day of the month's day of the week (0 = Sunday)
                const firstDayOfWeek = firstDay.getDay();
                // Total days in the month
                const totalDays = lastDay.getDate();
                
                // Calculate rows needed
                const rowsNeeded = Math.ceil((firstDayOfWeek + totalDays) / 7);
                  // Add/remove class for six-row months
                const calendarElement = document.querySelector('.fc-dayGridMonth-view');
                if (calendarElement) {                    if (rowsNeeded > 5) {
                        calendarElement.classList.add('six-rows');
                          // Reduce the day cell height to fit the 6 rows
                        const dayCells = document.querySelectorAll('.fc-daygrid-day-frame');
                        dayCells.forEach(cell => {
                            cell.style.minHeight = '50px'; // Further reduced from 65px
                        });
                    } else {
                        calendarElement.classList.remove('six-rows');
                        
                        // Restore normal day cell height
                        const dayCells = document.querySelectorAll('.fc-daygrid-day-frame');
                        dayCells.forEach(cell => {
                            cell.style.minHeight = '70px'; // Slightly reduced
                        });
                    }
                }
                
                // Ensure navigation buttons are visible by adjusting modal if needed
                setTimeout(() => {
                    const modal = document.querySelector('#calendar-availability-modal .modal-container');
                    const navigation = document.querySelector('.calendar-month-navigation');
                    const calendarView = document.querySelector('.fc-view-harness');
                    
                    if (modal && navigation && calendarView) {
                        const rect = navigation.getBoundingClientRect();
                        const modalRect = modal.getBoundingClientRect();
                        
                        // If navigation is outside modal or close to the bottom, adjust
                        if (rect.bottom > modalRect.bottom - 10) {                            // First try adjusting the calendar height
                            if (rowsNeeded > 5) {
                                calendarView.style.height = (calendarView.offsetHeight - 50) + 'px';                                // Make day cells even smaller if needed
                                const dayCells = document.querySelectorAll('.fc-daygrid-day-frame');
                                dayCells.forEach(cell => {
                                    cell.style.minHeight = '45px'; // Further reduced from 55px
                                });
                                
                                // Adjust today circle size for extreme compactness
                                const todayNumber = document.querySelector('.fc-day-today .fc-daygrid-day-number');
                                if (todayNumber) {
                                    todayNumber.style.width = '20px';
                                    todayNumber.style.height = '20px';
                                    todayNumber.style.fontSize = '0.7em';
                                }
                                
                                // Also make the toolbar even smaller
                                const toolbarTitle = document.querySelector('.fc-toolbar-title');
                                if (toolbarTitle) {
                                    toolbarTitle.style.fontSize = '1em';
                                    toolbarTitle.style.padding = '0';
                                }
                                
                                // Reduce the space taken by header cells
                                const headerCells = document.querySelectorAll('.fc-col-header-cell');
                                headerCells.forEach(cell => {
                                    cell.style.padding = '1px 0';
                                });
                            }
                            
                            // If still not fitting, adjust modal height as last resort
                            setTimeout(() => {
                                const updatedRect = navigation.getBoundingClientRect();
                                if (updatedRect.bottom > modalRect.bottom - 5) {
                                    modal.style.maxHeight = '98vh';
                                }
                            }, 50);
                        }
                    }
                }, 100);
            }
        });
          // Save reference for later cleanup
        calendarEl._calendar = calendar;
        
        // Render the calendar
        calendar.render();
        
        // Ensure all loading indicators are removed after rendering
        const remainingLoaders = calendarEl.querySelectorAll('.spinner-border, .d-flex.flex-column.align-items-center');
        remainingLoaders.forEach(loader => loader.remove());
        
        // Set up month navigation
        setupMonthNavigation(calendar);
    } catch (error) {
        console.error('Error initializing calendar:', error);
        // Clear the calendar element to remove any loading spinner
        calendarEl.innerHTML = '';
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <i class="fi fi-rs-exclamation"></i>
            Failed to load availability calendar. Please try again.
        `;
        calendarEl.appendChild(errorDiv);
    }
}

// Add a month display element below the calendar title
function addMonthDisplay(calendar) {
    const monthDisplay = document.createElement('div');
    monthDisplay.id = 'calendar-month-display';
    monthDisplay.className = 'calendar-month-display';
    
    // Get current date from calendar
    const currentDate = calendar.getDate();
    const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    monthDisplay.innerHTML = monthYear;
    
    // Insert after the calendar title
    const titleEl = document.querySelector('.fc-toolbar-title');
    if (titleEl && titleEl.parentNode) {
        titleEl.parentNode.insertBefore(monthDisplay, titleEl.nextSibling);
    }
    
    // Update month display when calendar view changes
    calendar.on('datesSet', function(info) {
        const newMonthYear = info.view.currentStart.toLocaleString('default', { month: 'long', year: 'numeric' });
        document.getElementById('calendar-month-display').innerHTML = newMonthYear;
    });
}

// Set up additional month navigation buttons
function setupMonthNavigation(calendar) {
    // Remove any existing navigation to prevent duplicates
    const existingNavigation = document.querySelector('.calendar-month-navigation');
    if (existingNavigation) {
        existingNavigation.remove();
    }
    
    // Add quick month navigation below the calendar
    const monthNav = document.createElement('div');
    monthNav.className = 'calendar-month-navigation';
    monthNav.innerHTML = `
        <button class="month-nav-btn prev-month"><i class="fi fi-rs-angle-left"></i> Previous</button>
        <button class="month-nav-btn next-month">Next <i class="fi fi-rs-angle-right"></i></button>
    `;
    
    // Append to calendar container
    const calendarContainer = document.getElementById('availability-calendar');
    calendarContainer.parentNode.appendChild(monthNav);
    
    // Add event listeners
    document.querySelector('.month-nav-btn.prev-month').addEventListener('click', function() {
        calendar.prev();
    });
    
    document.querySelector('.month-nav-btn.next-month').addEventListener('click', function() {
        calendar.next();
    });
}

// Fetch unavailable dates from Firestore
async function fetchUnavailableDates(productId) {
    try {
        let rentedDates = [];
        
        // Debug: Log what we're looking for
        console.log('Fetching availability for product ID:', productId);
        
        // Fetch from appointments collection
        const appointmentsRef = collection(chandriaDB, 'appointments');
        const appointmentsSnapshot = await getDocs(appointmentsRef);
        
        console.log('Found', appointmentsSnapshot.size, 'appointments');
        
        appointmentsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            // Skip old/cancelled appointments - only process active ones
            if (data.status && (data.status.toLowerCase() === 'cancelled' || data.status.toLowerCase() === 'completed')) {
                return;
            }
            
            // Only process appointments from June 2025 onwards (current month)
            const appointmentDate = data.eventDate || data.eventStartDate || data.checkoutDate;
            if (appointmentDate) {
                const apptDate = new Date(appointmentDate);
                const currentMonth = new Date('2025-06-01'); // June 2025
                if (apptDate < currentMonth) {
                    return;
                }
            }
            
            // Check if this appointment contains the product we're looking for
            if (Array.isArray(data.cartItems)) {
                const hasProduct = data.cartItems.some(item => item.productId === productId);
                
                if (hasProduct) {
                    // Get the rental dates based on rental type from admin calendar
                    const rentalType = data.rentalType || '';
                    const eventDate = data.eventDate;
                    const eventStartDate = data.eventStartDate;
                    const eventEndDate = data.eventEndDate;
                    
                    if (rentalType.toLowerCase().includes('fixed')) {
                        // Fixed Rental: 3 days starting from eventStartDate or eventDate
                        const startDate = eventStartDate || eventDate;
                        if (startDate) {
                            const start = new Date(startDate);
                            for (let i = 0; i < 3; i++) {
                                const date = new Date(start);
                                date.setDate(start.getDate() + i);
                                rentedDates.push(date.toLocaleDateString());
                            }
                        }
                    } else if (rentalType.toLowerCase().includes('open')) {
                        // Open Rental: from eventStartDate to eventEndDate
                        if (eventStartDate && eventEndDate) {
                            const start = new Date(eventStartDate);
                            const end = new Date(eventEndDate);
                            const current = new Date(start);
                            
                            while (current <= end) {
                                rentedDates.push(current.toLocaleDateString());
                                current.setDate(current.getDate() + 1);
                            }
                        }
                    } else {
                        // Fallback: use eventDate or eventStartDate
                        const dateToUse = eventDate || eventStartDate;
                        if (dateToUse) {
                            rentedDates.push(new Date(dateToUse).toLocaleDateString());
                        }
                    }
                    
                    // Also check for other common date fields in appointments
                    if (data.checkoutDate) {
                        rentedDates.push(new Date(data.checkoutDate).toLocaleDateString());
                    }
                    
                    if (data.startDate && data.endDate) {
                        // Handle date ranges
                        const start = new Date(data.startDate);
                        const end = new Date(data.endDate);
                        const current = new Date(start);
                        
                        while (current <= end) {
                            rentedDates.push(current.toLocaleDateString());
                            current.setDate(current.getDate() + 1);
                        }
                    }
                }
            }
        });
        
        // ALSO fetch from admin calendar/transaction collection
        try {
            // Try multiple possible collection names for admin calendar
            const possibleCollections = ['transaction', 'transactions', 'calendar', 'events', 'adminCalendar'];
            
            for (const collectionName of possibleCollections) {
                try {
                    const transactionRef = collection(chandriaDB, collectionName);
                    const transactionSnapshot = await getDocs(transactionRef);
                    
                    if (transactionSnapshot.size > 0) {
                        transactionSnapshot.forEach(docSnap => {
                            const data = docSnap.data();
                            
                            let productFound = false;
                            
                            // Check in products array
                            if (Array.isArray(data.products)) {
                                productFound = data.products.some(item => {
                                    return item.id === productId || item.productId === productId;
                                });
                            }
                            
                            // Check in accessories array
                            if (!productFound && Array.isArray(data.accessories)) {
                                productFound = data.accessories.some(item => {
                                    return item.id === productId || item.productId === productId;
                                });
                            }
                            
                            // Check in cartItems array
                            if (!productFound && Array.isArray(data.cartItems)) {
                                productFound = data.cartItems.some(item => {
                                    return item.id === productId || item.productId === productId;
                                });
                            }
                            
                            if (productFound) {
                                // Extract dates based on rental type
                                const rentalType = (data.rentalType || '').toLowerCase();
                                const eventDate = data.eventDate;
                                const eventStartDate = data.eventStartDate;
                                const eventEndDate = data.eventEndDate;
                                const checkoutDate = data.checkoutDate;
                                const startDate = data.startDate;
                                const endDate = data.endDate;
                                
                                if (rentalType.includes('fixed')) {
                                    // Fixed Rental: 3 consecutive days
                                    const startDateToUse = eventStartDate || eventDate || checkoutDate || startDate;
                                    if (startDateToUse) {
                                        const start = new Date(startDateToUse);
                                        for (let i = 0; i < 3; i++) {
                                            const date = new Date(start);
                                            date.setDate(start.getDate() + i);
                                            rentedDates.push(date.toLocaleDateString());
                                        }
                                    }
                                } else if (rentalType.includes('open')) {
                                    // Open Rental: date range
                                    const startDateToUse = eventStartDate || startDate;
                                    const endDateToUse = eventEndDate || endDate;
                                    
                                    if (startDateToUse && endDateToUse) {
                                        const start = new Date(startDateToUse);
                                        const end = new Date(endDateToUse);
                                        const current = new Date(start);
                                        
                                        while (current <= end) {
                                            rentedDates.push(current.toLocaleDateString());
                                            current.setDate(current.getDate() + 1);
                                        }
                                    }
                                } else {
                                    // Fallback: use any available date
                                    const dateToUse = eventDate || eventStartDate || checkoutDate || startDate;
                                    if (dateToUse) {
                                        rentedDates.push(new Date(dateToUse).toLocaleDateString());
                                    }
                                }
                            }
                        });
                    }
                } catch (collError) {
                    console.log(`Collection '${collectionName}' not accessible:`, collError.message);
                }
            }
        } catch (adminError) {
            console.error('Error fetching admin calendar data:', adminError);
        }
        
        // Remove duplicates and sort
        rentedDates = [...new Set(rentedDates)].sort((a, b) => new Date(a) - new Date(b));
        
        console.log('Final rented dates found:', rentedDates);
        
        return rentedDates;
    } catch (err) {
        console.error('Error fetching availability:', err);
        return [];
    }
}

// Export functions that might be useful to other modules
export {
    showCalendarModal,
    hideCalendarModal,
    initProductCalendar,
    fetchUnavailableDates
};
