// Size Chart Tab Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all tab buttons and content
    const tabs = document.querySelectorAll('.size-chart-tab');
    const tabContents = document.querySelectorAll('.size-chart-tab-content');
    
    // Add click event to each tab
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Get target tab content
            const targetId = tab.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and its content
            tab.classList.add('active');
            targetContent.classList.add('active');
        });
    });
});
