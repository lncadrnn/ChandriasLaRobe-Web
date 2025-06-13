// Simple inventory loader - minimal version to get products working
import {
    chandriaDB,
    collection,
    getDocs
} from "./sdk/chandrias-sdk.js";

// Simple function to load and display products
async function loadProducts() {
    console.log("🔄 Simple loadProducts starting...");
    
    // Update debug status
    const debugStatus = document.getElementById('debug-status');
    function updateDebug(message) {
        if (debugStatus) {
            debugStatus.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
        }
        console.log('SIMPLE LOADER:', message);
    }
    
    updateDebug('Simple loader starting...');
    
    try {
        // Find the container
        const container = document.getElementById('products-container');
        if (!container) {
            updateDebug('❌ Container not found');
            return;
        }
        
        updateDebug('📦 Container found');
          // Clear existing content (keep debug info)
        const debugInfo = container.querySelector('#debug-info');
        container.innerHTML = '';
        
        // Re-add debug info but with better styling for grid layout
        if (debugInfo) {
            debugInfo.style.cssText = `
                grid-column: 1 / -1;
                padding: 20px;
                background: #f8f9fa;
                margin-bottom: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            `;
            container.appendChild(debugInfo);
        }
        
        updateDebug('🔥 Connecting to Firebase...');
        
        // Get products from Firebase
        const querySnapshot = await getDocs(collection(chandriaDB, "products"));
        
        updateDebug(`✅ Firebase connected! Found ${querySnapshot.size} products`);
        
        if (querySnapshot.empty) {
            updateDebug('⚠️ No products in database');
            const noProductsDiv = document.createElement('div');
            noProductsDiv.style.cssText = 'margin: 2rem; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;';
            noProductsDiv.innerHTML = '<h3>No Products Found</h3><p>No products are currently in the inventory database.</p>';
            container.appendChild(noProductsDiv);
            return;
        }
        
        updateDebug('🎯 Creating product cards...');
          // Process each product
        let productCount = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            productCount++;
            
            updateDebug(`Processing product ${productCount}: ${data.name || 'Unnamed'}`);
            
            // Calculate total stock
            const sizes = data.size || {};
            const totalStock = Object.values(sizes).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
            
            // Determine stock status
            const stockStatus = totalStock === 0 ? 'out-of-stock' : totalStock <= 2 ? 'low-stock' : 'available';
            const stockStatusText = totalStock === 0 ? 'Out of Stock' : totalStock <= 2 ? 'Rented' : 'Available';
            const stockStatusColor = totalStock === 0 ? '#f44336' : totalStock <= 2 ? '#ff9800' : '#4caf50';
            
            // Get available sizes
            const availableSizes = Object.entries(sizes)
                .filter(([size, stock]) => parseInt(stock) > 0)
                .map(([size]) => size);
              // Create a card that matches the design
            const card = document.createElement('article');
            card.className = 'card_article';
            card.setAttribute('data-id', doc.id);
            card.setAttribute('data-name', data.name || '');
            card.setAttribute('data-category', data.category || '');
            
            // The CSS will handle the basic card styling, we just need to override a few things
            card.style.cssText = `
                cursor: pointer;
                position: relative;
            `;
            
            card.innerHTML = `
                <div class="card_img" style="position: relative; height: 240px; overflow: hidden;">
                    ${data.frontImageUrl ? 
                        `<img src="${data.frontImageUrl}" alt="${data.name}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                        '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #f5f5f5, #e0e0e0); display: flex; align-items: center; justify-content: center; color: #999; font-size: 14px;">No Image</div>'
                    }
                    <div class="card_badge" style="
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        background: #ff4081;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">${data.category || 'ITEM'}</div>
                </div>
                
                <div class="card_content" style="padding: 16px;">
                    <h3 class="card_title" style="
                        margin: 0 0 8px 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: #333;
                        line-height: 1.3;
                    ">${data.name || 'Unnamed Product'}</h3>
                    
                    <div class="card_price" style="
                        font-size: 18px;
                        font-weight: 700;
                        color: #ff4081;
                        margin-bottom: 12px;
                    ">₱${data.price ? parseFloat(data.price).toLocaleString() : '0'}</div>
                    
                    ${data.color ? `
                    <div class="card_color_section" style="
                        display: flex;
                        align-items: center;
                        margin-bottom: 12px;
                        gap: 8px;
                    ">
                        <div class="card_color" style="
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            background-color: ${data.color};
                            border: 2px solid #fff;
                            box-shadow: 0 0 0 1px #ddd;
                        "></div>
                        <span style="font-size: 14px; color: #666;">${data.color}</span>
                    </div>
                    ` : ''}
                    
                    <div class="card_stock_section" style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                    ">
                        <span style="font-size: 14px; color: #666;">${totalStock} in stock</span>
                        <div style="
                            background: ${stockStatusColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 600;
                        ">${stockStatusText}</div>
                    </div>
                    
                    ${availableSizes.length > 0 ? `
                    <div class="card_sizes" style="margin-bottom: 12px;">
                        ${availableSizes.map(size => `
                            <span style="
                                display: inline-block;
                                background: #f5f5f5;
                                color: #666;
                                padding: 4px 8px;
                                border-radius: 6px;
                                font-size: 12px;
                                margin-right: 6px;
                                margin-bottom: 4px;
                            ">${size}</span>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding-top: 8px;
                        border-top: 1px solid #f0f0f0;
                    ">
                        <div style="
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: ${stockStatusColor};
                            margin-right: 8px;
                        "></div>
                        <span style="
                            font-size: 13px;
                            font-weight: 600;
                            color: ${stockStatusColor};
                        ">${stockStatusText}</span>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        updateDebug(`✅ Successfully created ${productCount} product cards!`);
        
    } catch (error) {
        console.error("Error in simple loader:", error);
        updateDebug(`❌ ERROR: ${error.message}`);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin: 2rem; padding: 20px; background: #ffebee; border: 1px solid #f44336; border-radius: 8px; color: #c62828;';
        errorDiv.innerHTML = `
            <h3>Error Loading Products</h3>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Details:</strong> ${error.stack || 'No additional details'}</p>
        `;
        
        const container = document.getElementById('products-container');
        if (container) {
            container.appendChild(errorDiv);
        }
    }
}

// Make it available globally
window.SimpleInventoryLoader = {
    loadProducts
};

// Try to load products when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple inventory loader ready");
    
    // Add some delay to ensure everything is loaded
    setTimeout(() => {
        console.log("Starting simple product load...");
        loadProducts();
    }, 500);
});

export { loadProducts };
