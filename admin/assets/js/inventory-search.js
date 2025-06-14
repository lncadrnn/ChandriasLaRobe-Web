/**
 * Enhanced Inventory Search Functionality
 * Handles real-time product search with category filtering
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("Enhanced inventory search script loaded");
    
    // Wait for products to load, then initialize search
    const initializeSearch = () => {
        const searchBox = document.querySelector("#product-search");
        const categoryFilter = document.querySelector("#category-filter");
        
        if (!searchBox || !categoryFilter) {
            console.error("Search elements not found!");
            setTimeout(initializeSearch, 1000); // Retry after 1 second
            return;
        }
        
        console.log("Search elements found, initializing search...");
        
        const performSearch = () => {
            const searchValue = searchBox.value.toLowerCase().trim();
            const categoryValue = categoryFilter.value.toLowerCase().trim();
            const cards = document.querySelectorAll(".card_article");
            
            console.log(`Searching for: "${searchValue}" in category: "${categoryValue || 'All'}"`);
            console.log("Found cards:", cards.length);
            
            if (cards.length === 0) {
                console.log("No cards found, will retry...");
                setTimeout(performSearch, 500);
                return;
            }
            
            let visibleCount = 0;
            
            cards.forEach((card, index) => {
                let shouldShow = true; // Default to showing
                
                // Apply text search filter
                if (searchValue) {
                    const cardText = card.textContent.toLowerCase();
                    if (!cardText.includes(searchValue)) {
                        shouldShow = false;
                    }
                }
                
                // Apply category filter
                if (shouldShow && categoryValue) {
                    // Get category from data attribute or try to find it in the card content
                    const cardCategory = card.dataset.category?.toLowerCase() || '';
                    const cardText = card.textContent.toLowerCase();
                    
                    // Check if category exists in the card's data attribute or text content
                    if (!cardCategory.includes(categoryValue) && !cardText.includes(categoryValue)) {
                        shouldShow = false;
                    }
                }
                
                // Show or hide the card
                card.style.display = shouldShow ? 'block' : 'none';
                if (shouldShow) visibleCount++;
            });
            
            console.log("Visible cards after filtering:", visibleCount);
            
            // Show/hide no results message
            showNoResultsMessage(visibleCount, searchValue, categoryValue);
        };
        
        // Function to show/hide no results message
        const showNoResultsMessage = (visibleCount, searchValue, categoryValue) => {
            const containers = document.querySelectorAll(".card_container");
            
            containers.forEach(container => {
                let noResultsMsg = container.querySelector('.no-results-message');
                
                if (visibleCount === 0 && (searchValue || categoryValue)) {
                    if (!noResultsMsg) {
                        noResultsMsg = document.createElement('div');
                        noResultsMsg.className = 'no-results-message';
                        noResultsMsg.innerHTML = `
                            <div class="no-results-content">
                                <i class="bx bx-search-alt-2"></i>
                                <h3>No products found</h3>
                                <p>Try searching with different keywords or category.</p>
                            </div>
                        `;
                        container.appendChild(noResultsMsg);
                    }
                    noResultsMsg.style.display = 'flex';
                } else {
                    if (noResultsMsg) {
                        noResultsMsg.style.display = 'none';
                    }
                }
            });
        };
        
        // Add event listeners
        searchBox.addEventListener('input', performSearch);
        categoryFilter.addEventListener('change', performSearch);
        
        // Also listen for the Enter key in the search box
        searchBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        
        // Initial search if there are already values
        if (searchBox.value || categoryFilter.value) {
            setTimeout(performSearch, 1000);
        }
    };
    
    // Try to initialize immediately and also with a delay
    initializeSearch();
    setTimeout(initializeSearch, 2000);
    
    // Also try to initialize when products container is found
    const checkForProducts = () => {
        const container = document.querySelector('.card_container');
        const cards = document.querySelectorAll('.card_article');
        
        if (container && cards.length > 0) {
            console.log("Products detected, initializing search");
            initializeSearch();
        } else {
            setTimeout(checkForProducts, 1000);
        }
    };
    
    checkForProducts();
});
