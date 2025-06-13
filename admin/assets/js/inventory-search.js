/**
 * Inventory Search Functionality
 * Handles real-time product search in the inventory management interface
 */

// Simple, direct search implementation
document.addEventListener("DOMContentLoaded", function() {
    console.log("Inventory search script loaded");
    
    // Wait for products to load, then initialize search
    const initializeSearch = () => {
        const searchBox = document.querySelector(".search-box input");
        
        if (!searchBox) {
            console.error("Search box not found!");
            return;
        }
        
        console.log("Search box found, initializing search...");
        
        const performSearch = () => {
            const searchValue = searchBox.value.toLowerCase().trim();
            const cards = document.querySelectorAll(".card_article");
            
            console.log("Searching for:", searchValue);
            console.log("Found cards:", cards.length);
            
            if (cards.length === 0) {
                console.log("No cards found, will retry...");
                setTimeout(performSearch, 500);
                return;
            }
            
            let visibleCount = 0;
            
            cards.forEach((card, index) => {
                let shouldShow = false;
                
                if (!searchValue) {
                    shouldShow = true;
                } else {
                    // Get all text content from the card
                    const cardText = card.textContent.toLowerCase();
                    
                    // Simple text search
                    if (cardText.includes(searchValue)) {
                        shouldShow = true;
                        console.log(`Card ${index} matches:`, card.querySelector('.card_title')?.textContent || 'Unknown');
                    }
                }
                
                card.style.display = shouldShow ? 'block' : 'none';
                if (shouldShow) visibleCount++;
            });
            
            console.log("Visible cards after search:", visibleCount);
        };
        
        // Add event listener
        searchBox.addEventListener('input', performSearch);
        
        // Initial search if there's a value
        if (searchBox.value) {
            setTimeout(performSearch, 1000);
        }
    };
    
    // Initialize search with delay to ensure products are loaded
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
            console.log("Found cards:", cards.length);
            
            if (cards.length === 0) {
                console.log("No cards found, will retry...");
                setTimeout(performSearch, 500);
                return;
            }
            
            let visibleCount = 0;
            
            cards.forEach((card, index) => {
                let shouldShow = false;
                
                if (!searchValue) {
                    shouldShow = true;
                } else {
                    // Get all text content from the card
                    const cardText = card.textContent.toLowerCase();
                    
                    // Simple text search
                    if (cardText.includes(searchValue)) {
                        shouldShow = true;
                        console.log(`Card ${index} matches:`, card.querySelector('.card_title')?.textContent || 'Unknown');
                    }
                }
                
                card.style.display = shouldShow ? 'block' : 'none';
                if (shouldShow) visibleCount++;
            });
            
            console.log("Visible cards after search:", visibleCount);
            
            // Show/hide no results message
            showNoResultsMessage(visibleCount, searchValue);
            
            // Update search results counter
            updateSearchResultsInfo(visibleCount, cards.length, searchValue);
        };
        
        // Add event listener
        searchBox.addEventListener('input', performSearch);
        
        // Initial search if there's a value
        if (searchBox.value) {
            setTimeout(performSearch, 1000);
        }
    };
    
    // Function to show/hide no results message
    const showNoResultsMessage = (visibleCount, searchValue) => {
        const containers = document.querySelectorAll(".card_container");
        
        containers.forEach(container => {
            let noResultsMsg = container.querySelector('.no-results-message');
            
            if (visibleCount === 0 && searchValue) {
                if (!noResultsMsg) {
                    noResultsMsg = document.createElement('div');
                    noResultsMsg.className = 'no-results-message';
                    noResultsMsg.innerHTML = `
                        <div class="no-results-content">
                            <i class="bx bx-search-alt-2"></i>
                            <h3>No products found</h3>
                            <p>Try searching with different keywords like product names, categories, colors, or sizes.</p>
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
    
    // Function to update search results information
    const updateSearchResultsInfo = (visibleCount, totalCount, searchTerm) => {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        
        let resultsInfo = activeTab.querySelector('.search-results-info');
        
        // Create results info element if it doesn't exist
        if (!resultsInfo) {
            resultsInfo = document.createElement('div');
            resultsInfo.className = 'search-results-info';
            activeTab.insertBefore(resultsInfo, activeTab.querySelector('.card_container'));
        }
        
        if (searchTerm) {
            if (visibleCount === 0) {
                resultsInfo.innerHTML = `No products found for "<strong>${searchTerm}</strong>"`;
            } else if (visibleCount === 1) {
                resultsInfo.innerHTML = `<span class="search-results-count">1</span> product found for "<strong>${searchTerm}</strong>"`;
            } else {
                resultsInfo.innerHTML = `<span class="search-results-count">${visibleCount}</span> products found for "<strong>${searchTerm}</strong>"`;
            }
            resultsInfo.style.display = 'block';
        } else {
            resultsInfo.style.display = 'none';
        }
    };
    
    // Initialize search with delay to ensure products are loaded
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
    
    // Expose global functions for debugging
    window.debugInventorySearch = function(searchTerm = "blue") {
        console.log("=== INVENTORY SEARCH DEBUG ===");
        console.log("Search term:", searchTerm);
        
        const searchBox = document.querySelector(".search-box input");
        const cards = document.querySelectorAll(".card_article");
        
        console.log("Search box:", searchBox);
        console.log("Found cards:", cards.length);
        
        if (searchBox) {
            searchBox.value = searchTerm;
            searchBox.dispatchEvent(new Event('input'));
        }
    };
});
