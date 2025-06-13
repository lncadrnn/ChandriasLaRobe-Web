// Simple tab functionality that works
document.addEventListener('DOMContentLoaded', function() {
    console.log("🔧 Simple tab handler loading...");
    
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        console.log("🔧 Initializing simple tab functionality...");
        
        // Check if loader functions are available
        console.log("🔍 Checking loader function availability:");
        console.log("- loadAllItems:", typeof window.loadAllItems);
        console.log("- loadClothingItems:", typeof window.loadClothingItems);
        console.log("- loadAccessoriesOnly:", typeof window.loadAccessoriesOnly);
        
        // Find all tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log(`📋 Found ${tabButtons.length} tab buttons`);
        
        if (tabButtons.length === 0) {
            console.error("❌ No tab buttons found!");
            return;
        }
        
        // Add click handler to each button
        tabButtons.forEach((button, index) => {
            const dataTab = button.getAttribute('data-tab');
            console.log(`📌 Setting up tab ${index}: ${dataTab} - "${button.textContent.trim()}"`);
            
            // Remove any existing click handlers
            button.onclick = null;
            
            // Add new click handler
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log(`🖱️ Tab clicked: ${dataTab}`);
                
                // Remove active class from all buttons
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Handle tab content switching
                const productsContainer = document.getElementById('products');
                const accessoriesContainer = document.getElementById('accessories');
                
                console.log("🎯 Container check:");
                console.log("- products container:", !!productsContainer);
                console.log("- accessories container:", !!accessoriesContainer);
                
                // Reset container visibility
                if (productsContainer) productsContainer.classList.remove('active');
                if (accessoriesContainer) accessoriesContainer.classList.remove('active');
                
                // Load appropriate content based on tab
                if (dataTab === 'products') {
                    console.log("🔄 Loading All Products tab");
                    if (productsContainer) productsContainer.classList.add('active');
                    
                    // Wait for loader functions to be available
                    setTimeout(() => {
                        if (window.loadAllItems) {
                            console.log("✅ Calling loadAllItems");
                            window.loadAllItems();
                        } else {
                            console.error("❌ loadAllItems function not available");
                        }
                    }, 100);
                    
                } else if (dataTab === 'clothing') {
                    console.log("🔄 Loading Clothing tab");
                    if (productsContainer) productsContainer.classList.add('active');
                    
                    setTimeout(() => {
                        if (window.loadClothingItems) {
                            console.log("✅ Calling loadClothingItems");
                            window.loadClothingItems();
                        } else {
                            console.error("❌ loadClothingItems function not available");
                        }
                    }, 100);
                    
                } else if (dataTab === 'accessories') {
                    console.log("🔄 Loading Accessories tab");
                    if (accessoriesContainer) accessoriesContainer.classList.add('active');
                    
                    setTimeout(() => {
                        if (window.loadAccessoriesOnly) {
                            console.log("✅ Calling loadAccessoriesOnly");
                            window.loadAccessoriesOnly();
                        } else {
                            console.error("❌ loadAccessoriesOnly function not available");
                        }
                    }, 100);
                }
                
                console.log(`✅ Successfully switched to tab: ${dataTab}`);
            });
        });
        
        console.log("✅ Simple tab functionality initialized!");
        
    }, 2000); // Wait 2 seconds for everything to load
});
