/**
 * Inventory Tab Functionality
 * Handles switching between different product category tabs
 */

document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show appropriate content based on tab
            if (targetTab === 'products') {
                // Show all products
                document.getElementById('products').classList.add('active');
                document.getElementById('accessories').classList.remove('active');
            } else if (targetTab === 'clothing') {
                // Show only clothing (products, not accessories)
                document.getElementById('products').classList.add('active');
                document.getElementById('accessories').classList.remove('active');
            } else if (targetTab === 'accessories') {
                // Show only accessories
                document.getElementById('products').classList.remove('active');
                document.getElementById('accessories').classList.add('active');
            }
        });
    });
});
