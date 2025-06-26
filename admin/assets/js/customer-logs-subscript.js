// Tab navigation functionality for Rental Logs
document.addEventListener('DOMContentLoaded', function() {
    initializeTabNavigation();
});

function initializeTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-switch');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(`${targetTab}-content`).classList.add('active');
        });
    });
}
