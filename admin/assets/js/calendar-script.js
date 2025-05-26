$(document).ready(function () {
    const $startDateInput = $("#calendar-start-date");
    const $endDateInput = $("#calendar-end-date");
    const $bookingForm = $("#calendar-booking-form");
    const $formErrorMessage = $("#form-error-message");

    // Helper function to get 'YYYY-MM-DD' string from a local Date object
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Set minimum for Start Date to tomorrow
    function setStartDateMin() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrow);
        
        $startDateInput.attr("min", tomorrowStr);

        // If current start date is before tomorrow, clear it
        if ($startDateInput.val()) {
            const currentStartDateVal = $startDateInput.val();
            const currentStartParts = currentStartDateVal.split('-');
            const currentStartDateLocal = new Date(parseInt(currentStartParts[0]), parseInt(currentStartParts[1]) - 1, parseInt(currentStartParts[2]));
            if (currentStartDateLocal < tomorrow) {
                $startDateInput.val("");
            }
        }
    }

    // Function to set the end date's MINIMUM based on the selected start date
    function updateEndDateMin() {
        const startDateVal = $startDateInput.val();
        if (startDateVal) {
            const parts = startDateVal.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2], 10);
            const startDate = new Date(year, month, day); 

            const nextDayOfStartDate = new Date(startDate);
            nextDayOfStartDate.setDate(startDate.getDate() + 1);
            
            const nextDayOfStartDateStr = getLocalDateString(nextDayOfStartDate);
            $endDateInput.attr("min", nextDayOfStartDateStr);

            // If current end date is before the new min end date, clear it
            if ($endDateInput.val()) {
                const currentEndDateVal = $endDateInput.val();
                const currentEndParts = currentEndDateVal.split('-');
                const currentEndDateLocal = new Date(parseInt(currentEndParts[0]), parseInt(currentEndParts[1]) - 1, parseInt(currentEndParts[2]));
                if (currentEndDateLocal < nextDayOfStartDate) {
                    $endDateInput.val("");
                }
            }
        } else {
            // If start date is cleared, remove min from end date and clear its value
            $endDateInput.removeAttr("min").val("");
        }
    }

    // Initialize date restrictions
    setStartDateMin();
    updateEndDateMin(); // Call once on load in case dates are pre-filled or restored by browser

    // Add event listener for start date change
    $startDateInput.on("change", function() {
        setStartDateMin(); // Re-validate start date (e.g., if user tries to type an invalid date)
        updateEndDateMin();
    });

    // Form submission validation
    $bookingForm.on("submit", function(e) {
        $formErrorMessage.text(""); // Clear previous errors
        let isValid = true;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const startDateVal = $startDateInput.val();
        const endDateVal = $endDateInput.val();

        if (!startDateVal) {
            $formErrorMessage.text("Start Date is required.");
            isValid = false;
        } else {
            const startParts = startDateVal.split('-');
            const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            if (startDateLocal < tomorrow) {
                $formErrorMessage.text("Start Date cannot be earlier than tomorrow.");
                isValid = false;
            }
        }

        if (!endDateVal && isValid) { // Only check if start date was valid so far
            $formErrorMessage.text("End Date is required.");
            isValid = false;
        } else if (startDateVal && endDateVal && isValid) { // Both dates present and start date is valid
            const startParts = startDateVal.split('-');
            const startDateLocal = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            
            const endParts = endDateVal.split('-');
            const endDateLocal = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

            const expectedMinEndDate = new Date(startDateLocal);
            expectedMinEndDate.setDate(startDateLocal.getDate() + 1);

            if (endDateLocal < expectedMinEndDate) {
                $formErrorMessage.text("End Date must be at least one day after the Start Date.");
                isValid = false;
            }
        }

        if (!isValid) {
            e.preventDefault(); // Prevent form submission
        } else {
            // If valid, you can proceed with form submission.
            // For demonstration, we'll just alert.
            alert("Booking submitted (simulated)!\nStart Date: " + startDateVal + "\nEnd Date: " + endDateVal);
            // e.preventDefault(); // Uncomment to prevent actual submission for demo
            // $bookingForm[0].reset(); // Optionally reset form
            // setStartDateMin(); // Re-apply min attributes after reset
            // updateEndDateMin();
        }
    });
});
