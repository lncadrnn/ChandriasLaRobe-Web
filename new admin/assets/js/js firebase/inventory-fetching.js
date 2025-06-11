// Inventory Fetching Service
// This file handles all Firebase operations for fetching and managing inventory data

import {
    chandriaDB,
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    createTimestamp,
    checkFirebaseConnection,
    COLLECTION_NAMES,
    FIELD_NAMES,
    STATUS
} from './chandrias-sdk.js';

/**
 * Inventory Fetching Service Class
 * Handles all Firebase operations for products and additionals
 */
class InventoryFetcher {
    constructor() {
        this.isConnected = false;
        this.productsCache = [];
        this.additionalsCache = [];
        this.lastFetchTime = null;
        this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize the fetching service and check Firebase connection
     */
    async initialize() {
        try {
            console.log('Initializing Inventory Fetcher...');
            this.isConnected = await checkFirebaseConnection();
            
            if (this.isConnected) {
                console.log('✅ Firebase connection established');
                await this.refreshInventoryData();
                return { success: true, message: 'Inventory Fetcher initialized successfully' };
            } else {
                console.warn('⚠️ Firebase connection failed - using offline mode');
                return { success: false, message: 'Firebase connection failed' };
            }
        } catch (error) {
            console.error('❌ Error initializing Inventory Fetcher:', error);
            this.isConnected = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Check if data needs to be refreshed from cache
     */
    isCacheExpired() {
        if (!this.lastFetchTime) return true;
        return (Date.now() - this.lastFetchTime) > this.cacheExpiryTime;
    }

    /**
     * Get Firebase connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Fetch all products from Firebase
     */
    async fetchProducts() {
        try {
            if (!this.isConnected) {
                console.warn('Firebase not connected, returning cached products');
                return this.productsCache;
            }

            console.log('📦 Fetching products from Firebase...');
            const productsRef = collection(chandriaDB, COLLECTION_NAMES.PRODUCTS);
            const querySnapshot = await getDocs(productsRef);
            
            const products = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    ...data
                });
            });

            // Update cache
            this.productsCache = products;
            this.lastFetchTime = Date.now();

            console.log(`✅ Fetched ${products.length} products from Firebase`);
            return products;

        } catch (error) {
            console.error('❌ Error fetching products:', error);
            // Return cached data on error
            return this.productsCache;
        }
    }

    /**
     * Fetch all additionals from Firebase
     */
    async fetchAdditionals() {
        try {
            if (!this.isConnected) {
                console.warn('Firebase not connected, returning cached additionals');
                return this.additionalsCache;
            }

            console.log('💎 Fetching additionals from Firebase...');
            const additionalsRef = collection(chandriaDB, COLLECTION_NAMES.ADDITIONALS);
            const querySnapshot = await getDocs(additionalsRef);
            
            const additionals = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                additionals.push({
                    id: doc.id,
                    ...data
                });
            });

            // Update cache
            this.additionalsCache = additionals;
            this.lastFetchTime = Date.now();

            console.log(`✅ Fetched ${additionals.length} additionals from Firebase`);
            return additionals;

        } catch (error) {
            console.error('❌ Error fetching additionals:', error);
            // Return cached data on error
            return this.additionalsCache;
        }
    }

    /**
     * Fetch a single product by ID
     */
    async fetchProductById(productId) {
        try {
            if (!this.isConnected) {
                console.warn('Firebase not connected, searching cache');
                return this.productsCache.find(p => p.id === productId) || null;
            }

            const docRef = doc(chandriaDB, COLLECTION_NAMES.PRODUCTS, productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.warn(`Product with ID ${productId} not found`);
                return null;
            }

        } catch (error) {
            console.error('Error fetching product by ID:', error);
            return null;
        }
    }

    /**
     * Fetch a single additional by ID
     */
    async fetchAdditionalById(additionalId) {
        try {
            if (!this.isConnected) {
                console.warn('Firebase not connected, searching cache');
                return this.additionalsCache.find(a => a.id === additionalId) || null;
            }

            const docRef = doc(chandriaDB, COLLECTION_NAMES.ADDITIONALS, additionalId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.warn(`Additional with ID ${additionalId} not found`);
                return null;
            }

        } catch (error) {
            console.error('Error fetching additional by ID:', error);
            return null;
        }
    }

    /**
     * Search products by name
     */
    async searchProductsByName(searchTerm) {
        try {
            const products = await this.fetchProducts();
            const results = products.filter(product => 
                product.name && 
                product.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            console.log(`🔍 Found ${results.length} products matching "${searchTerm}"`);
            return results;

        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    /**
     * Search additionals by name
     */
    async searchAdditionalsByName(searchTerm) {
        try {
            const additionals = await this.fetchAdditionals();
            const results = additionals.filter(additional => 
                additional.name && 
                additional.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            console.log(`🔍 Found ${results.length} additionals matching "${searchTerm}"`);
            return results;

        } catch (error) {
            console.error('Error searching additionals:', error);
            return [];
        }
    }

    /**
     * Filter products by category
     */
    async filterProductsByCategory(category) {
        try {
            const products = await this.fetchProducts();
            const results = products.filter(product => 
                product.category === category
            );
            
            console.log(`📂 Found ${results.length} products in category "${category}"`);
            return results;

        } catch (error) {
            console.error('Error filtering products by category:', error);
            return [];
        }
    }

    /**
     * Filter additionals by type
     */
    async filterAdditionalsByType(type) {
        try {
            const additionals = await this.fetchAdditionals();
            const results = additionals.filter(additional => 
                additional.type === type
            );
            
            console.log(`📂 Found ${results.length} additionals of type "${type}"`);
            return results;

        } catch (error) {
            console.error('Error filtering additionals by type:', error);
            return [];
        }
    }

    /**
     * Get inventory statistics
     */
    async getInventoryStats() {
        try {
            const [products, additionals] = await Promise.all([
                this.fetchProducts(),
                this.fetchAdditionals()
            ]);

            const stats = {
                totalProducts: products.length,
                totalAdditionals: additionals.length,
                totalItems: products.length + additionals.length,
                availableProducts: products.filter(p => p.status === STATUS.AVAILABLE).length,
                availableAdditionals: additionals.filter(a => a.status === STATUS.AVAILABLE).length,
                categories: this.getUniqueValues(products, 'category'),
                types: this.getUniqueValues(additionals, 'type'),
                lastUpdated: new Date().toISOString()
            };

            console.log('📊 Inventory statistics:', stats);
            return stats;

        } catch (error) {
            console.error('Error getting inventory stats:', error);
            return null;
        }
    }

    /**
     * Refresh all inventory data from Firebase
     */
    async refreshInventoryData() {
        try {
            console.log('🔄 Refreshing inventory data...');
            
            const [products, additionals] = await Promise.all([
                this.fetchProducts(),
                this.fetchAdditionals()
            ]);

            const result = {
                success: true,
                products: products,
                additionals: additionals,
                totalCount: products.length + additionals.length,
                lastRefresh: new Date().toISOString()
            };

            console.log(`✅ Inventory data refreshed: ${result.totalCount} total items`);
            return result;

        } catch (error) {
            console.error('❌ Error refreshing inventory data:', error);
            return {
                success: false,
                error: error.message,
                products: this.productsCache,
                additionals: this.additionalsCache,
                totalCount: this.productsCache.length + this.additionalsCache.length
            };
        }
    }

    /**
     * Helper function to get unique values from an array of objects
     */
    getUniqueValues(array, property) {
        return [...new Set(array.map(item => item[property]).filter(Boolean))];
    }    /**
     * Clear cache and force refresh on next fetch
     */
    clearCache() {
        this.productsCache = [];
        this.additionalsCache = [];
        this.lastFetchTime = null;
        console.log('🗑️ Cache cleared');
    }

    /**
     * Get cached data without fetching from Firebase
     */
    getCachedData() {
        return {
            products: this.productsCache,
            additionals: this.additionalsCache,
            lastFetchTime: this.lastFetchTime,
            isExpired: this.isCacheExpired()
        };
    }

    /**
     * Add a new product to Firebase
     */
    async addProduct(productData) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log('💾 Adding product to Firebase...');
            
            // Prepare product data with timestamp
            const productToAdd = {
                ...productData,
                createdAt: createTimestamp(),
                updatedAt: createTimestamp()
            };

            // Add to Firebase
            const docRef = await addDoc(collection(chandriaDB, COLLECTION_NAMES.PRODUCTS), productToAdd);
            
            // Get the added product with its ID
            const addedProduct = {
                id: docRef.id,
                ...productToAdd
            };

            // Update cache
            this.productsCache.unshift(addedProduct);

            console.log(`✅ Product added to Firebase with ID: ${docRef.id}`);
            return addedProduct;

        } catch (error) {
            console.error('❌ Error adding product to Firebase:', error);
            throw error;
        }
    }

    /**
     * Add a new additional to Firebase
     */
    async addAdditional(additionalData) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log('💾 Adding additional to Firebase...');
            
            // Prepare additional data with timestamp
            const additionalToAdd = {
                ...additionalData,
                createdAt: createTimestamp(),
                updatedAt: createTimestamp()
            };

            // Add to Firebase
            const docRef = await addDoc(collection(chandriaDB, COLLECTION_NAMES.ADDITIONALS), additionalToAdd);
            
            // Get the added additional with its ID
            const addedAdditional = {
                id: docRef.id,
                ...additionalToAdd
            };

            // Update cache
            this.additionalsCache.unshift(addedAdditional);

            console.log(`✅ Additional added to Firebase with ID: ${docRef.id}`);
            return addedAdditional;

        } catch (error) {
            console.error('❌ Error adding additional to Firebase:', error);
            throw error;
        }
    }

    /**
     * Update a product in Firebase
     */
    async updateProduct(productId, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log(`🔄 Updating product ${productId} in Firebase...`);
            
            // Prepare update data with timestamp
            const dataToUpdate = {
                ...updateData,
                updatedAt: createTimestamp()
            };

            // Update in Firebase
            const docRef = doc(chandriaDB, COLLECTION_NAMES.PRODUCTS, productId);
            await updateDoc(docRef, dataToUpdate);

            // Update cache
            const cacheIndex = this.productsCache.findIndex(p => p.id === productId);
            if (cacheIndex > -1) {
                this.productsCache[cacheIndex] = {
                    ...this.productsCache[cacheIndex],
                    ...dataToUpdate
                };
            }

            console.log(`✅ Product ${productId} updated successfully`);
            return true;

        } catch (error) {
            console.error(`❌ Error updating product ${productId}:`, error);
            throw error;
        }
    }

    /**
     * Update an additional in Firebase
     */
    async updateAdditional(additionalId, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log(`🔄 Updating additional ${additionalId} in Firebase...`);
            
            // Prepare update data with timestamp
            const dataToUpdate = {
                ...updateData,
                updatedAt: createTimestamp()
            };

            // Update in Firebase
            const docRef = doc(chandriaDB, COLLECTION_NAMES.ADDITIONALS, additionalId);
            await updateDoc(docRef, dataToUpdate);

            // Update cache
            const cacheIndex = this.additionalsCache.findIndex(a => a.id === additionalId);
            if (cacheIndex > -1) {
                this.additionalsCache[cacheIndex] = {
                    ...this.additionalsCache[cacheIndex],
                    ...dataToUpdate
                };
            }

            console.log(`✅ Additional ${additionalId} updated successfully`);
            return true;

        } catch (error) {
            console.error(`❌ Error updating additional ${additionalId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a product from Firebase
     */
    async deleteProduct(productId) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log(`🗑️ Deleting product ${productId} from Firebase...`);
            
            // Delete from Firebase
            const docRef = doc(chandriaDB, COLLECTION_NAMES.PRODUCTS, productId);
            await deleteDoc(docRef);

            // Remove from cache
            const cacheIndex = this.productsCache.findIndex(p => p.id === productId);
            if (cacheIndex > -1) {
                this.productsCache.splice(cacheIndex, 1);
            }

            console.log(`✅ Product ${productId} deleted successfully`);
            return true;

        } catch (error) {
            console.error(`❌ Error deleting product ${productId}:`, error);
            throw error;
        }
    }

    /**
     * Delete an additional from Firebase
     */
    async deleteAdditional(additionalId) {
        try {
            if (!this.isConnected) {
                throw new Error('Firebase not connected');
            }

            console.log(`🗑️ Deleting additional ${additionalId} from Firebase...`);
            
            // Delete from Firebase
            const docRef = doc(chandriaDB, COLLECTION_NAMES.ADDITIONALS, additionalId);
            await deleteDoc(docRef);

            // Remove from cache
            const cacheIndex = this.additionalsCache.findIndex(a => a.id === additionalId);
            if (cacheIndex > -1) {
                this.additionalsCache.splice(cacheIndex, 1);
            }

            console.log(`✅ Additional ${additionalId} deleted successfully`);
            return true;

        } catch (error) {
            console.error(`❌ Error deleting additional ${additionalId}:`, error);
            throw error;
        }
    }
}

// Create a global instance
const inventoryFetcher = new InventoryFetcher();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 Auto-initializing inventory fetcher...');
        await inventoryFetcher.initialize();
    } catch (error) {
        console.error('❌ Failed to auto-initialize inventory fetcher:', error);
    }
});

// Make the service available globally
window.InventoryFetcher = inventoryFetcher;

// Export for module usage
export default inventoryFetcher;
export { InventoryFetcher as InventoryFetcherClass, inventoryFetcher as InventoryFetcher };
