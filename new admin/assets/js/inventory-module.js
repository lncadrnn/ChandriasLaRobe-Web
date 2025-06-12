// Import the InventoryFetcher class and make it globally available
import { InventoryFetcher } from './js firebase/inventory-fetching.js';

// Make InventoryFetcher available globally
window.InventoryFetcher = InventoryFetcher;

// Initialize Firebase connection status checker
window.checkFirebaseStatus = async function() {
    try {
        const isConnected = await window.checkFirebaseConnection();
        console.log('🔗 Firebase connection status:', isConnected ? 'Connected' : 'Disconnected');
        return isConnected;
    } catch (error) {
        console.error('❌ Firebase connection check failed:', error);
        return false;
    }
};

// Function to hide spinner
function hideLoadingSpinner() {
    const generalSpinner = document.getElementById('spinner');
    if (generalSpinner) {
        generalSpinner.classList.add('d-none');
    }
}

// Function to wait for UI update and then hide spinner
async function hideSpinnerAfterUIUpdate() {
    // Wait a bit for UI rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if products are actually rendered in the UI
    const productsList = document.getElementById('productsList');
    const additionalsList = document.getElementById('additionalsList');
    
    let uiReady = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Keep checking until UI is ready or max attempts reached
    while (!uiReady && attempts < maxAttempts) {
        const hasProducts = productsList && !productsList.querySelector('.empty-message');
        const hasAdditionals = additionalsList && !additionalsList.querySelector('.empty-message');
        
        if (hasProducts || hasAdditionals) {
            uiReady = true;
        } else {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
    }
    
    // Hide spinner regardless of UI state after timeout
    hideLoadingSpinner();
}

// Function to load inventory data from Firebase
async function loadInventoryFromFirebase() {
    try {
        console.log('📦 Loading inventory data from Firebase...');
        
        // Check if InventoryFetcher is available and connected
        if (!window.InventoryFetcher) {
            throw new Error('InventoryFetcher not available');
        }
        
        if (!window.InventoryFetcher.getConnectionStatus()) {
            throw new Error('Firebase not connected');
        }
        
        // Fetch products and additionals from Firebase using the new fetching service
        const [products, additionals] = await Promise.all([
            window.InventoryFetcher.fetchProducts(),
            window.InventoryFetcher.fetchAdditionals()
        ]);
        
        // Update global variables with Firebase data
        if (typeof window.updateInventoryData === 'function') {
            window.updateInventoryData(products, additionals);
        } else {
            // Fallback: directly update if function doesn't exist
            console.log('📊 Loaded products:', products.length);
            console.log('📊 Loaded additionals:', additionals.length);
            
            // Try to update the UI directly if possible
            if (typeof window.sampleProducts !== 'undefined') {
                window.sampleProducts.length = 0;
                window.sampleProducts.push(...products);
            }
            
            if (typeof window.sampleAdditionals !== 'undefined') {
                window.sampleAdditionals.length = 0;
                window.sampleAdditionals.push(...additionals);
            }
            
            // Try to refresh UI
            if (typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
            if (typeof window.loadAdditionals === 'function') {
                window.loadAdditionals();
            }
        }
        
        // Log successful loading to console only
        console.log(`📦 Successfully loaded ${products.length} products and ${additionals.length} additionals`);
        
        // Hide spinner after UI has been updated
        await hideSpinnerAfterUIUpdate();
        
    } catch (error) {
        console.error('❌ Error loading inventory from Firebase:', error);
        // Hide spinner even if error occurs
        hideLoadingSpinner();
    }
}

// Enhanced initialization with better error diagnostics
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Firebase inventory services...');
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('🌐 Origin:', window.location.origin);
        
        // Show loading spinner at the start
        const generalSpinner = document.getElementById('spinner');
        
        if (generalSpinner) {
            generalSpinner.classList.remove('d-none');
        }
        
        // Set fallback timeout to hide spinner after 15 seconds
        setTimeout(() => {
            console.log('⏰ Fallback timeout reached, hiding spinner');
            hideLoadingSpinner();
        }, 15000);
        
        // Wait a moment for modules to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if InventoryFetcher is available
        if (!window.InventoryFetcher) {
            console.error('❌ InventoryFetcher not available');
            hideLoadingSpinner();
            return;
        }
        
        console.log('✅ InventoryFetcher loaded successfully');
        
        // Test Firebase connection first
        console.log('🔗 Testing Firebase connection...');
        const isConnected = await window.checkFirebaseStatus();
        console.log(`📡 Firebase connection result: ${isConnected}`);
        
        if (!isConnected) {
            console.warn('⚠️ Firebase connection failed - using offline mode');
            
            // Log detailed connection info
            console.log('🔍 Connection details:');
            console.log('- chandriaDB available:', !!window.chandriaDB);
            console.log('- checkFirebaseConnection available:', !!window.checkFirebaseConnection);
            
            hideLoadingSpinner();
            return;
        }
        
        console.log('✅ Firebase connection successful');
        
        // Initialize the inventory fetcher
        console.log('🔄 Initializing InventoryFetcher...');
        const initResult = await window.InventoryFetcher.initialize();
        console.log('📊 InventoryFetcher init result:', initResult);
        
        if (initResult.success) {
            console.log('✅ Firebase services ready:', initResult.message);
            
            // Get initial statistics
            const stats = await window.InventoryFetcher.getInventoryStats();
            if (stats) {
                console.log('📊 Products in database:', stats.totalProducts);
                console.log('📊 Additionals in database:', stats.totalAdditionals);
            } else {
                console.log('📊 No stats available');
            }
            
            // Load initial data from Firebase
            console.log('📦 Loading initial data...');
            await loadInventoryFromFirebase();
        } else {
            console.error('❌ Failed to initialize Firebase services:', initResult.message);
            hideLoadingSpinner();
        }
        
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        console.log('🔍 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Hide spinner if there's an error and no data will be loaded
        hideLoadingSpinner();
    }
});

// Make the load function available globally
window.loadInventoryFromFirebase = loadInventoryFromFirebase;
