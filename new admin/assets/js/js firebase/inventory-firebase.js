// Firebase Inventory Management Service for New Admin

// Import Firebase functions from inventory-sdk.js
import {
    chandriaDB,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where
} from './sdk/inventory-sdk.js';

// Collection names
const PRODUCTS_COLLECTION = 'ChandriasInventory';
const ADDITIONALS_COLLECTION = 'ChandriasAdditionals';

/**
 * Products Management Functions
 */

// Fetch all products from Firebase
export async function fetchProducts() {
    try {
        console.log('Fetching products from Firebase...');
        
        const productsRef = collection(chandriaDB, PRODUCTS_COLLECTION);
        const q = query(productsRef, orderBy('dateAdded', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Fetched ${products.length} products from Firebase`);
        return products;
        
    } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

// Add new product to Firebase
export async function addProduct(productData) {
    try {
        console.log('Adding product to Firebase:', productData);
        
        // Prepare product data with timestamp
        const productToAdd = {
            ...productData,
            dateAdded: new Date().toISOString(),
            status: productData.status || 'available'
        };
        
        const productsRef = collection(chandriaDB, PRODUCTS_COLLECTION);
        const docRef = await addDoc(productsRef, productToAdd);
        
        console.log('Product added successfully with ID:', docRef.id);
        return { id: docRef.id, ...productToAdd };
        
    } catch (error) {
        console.error('Error adding product:', error);
        throw new Error(`Failed to add product: ${error.message}`);
    }
}

// Update existing product in Firebase
export async function updateProduct(productId, productData) {
    try {
        console.log('Updating product in Firebase:', productId, productData);
        
        const productRef = doc(chandriaDB, PRODUCTS_COLLECTION, productId);
        const updateData = {
            ...productData,
            dateModified: new Date().toISOString()
        };
        
        await updateDoc(productRef, updateData);
        console.log('Product updated successfully');
        
        return { id: productId, ...updateData };
        
    } catch (error) {
        console.error('Error updating product:', error);
        throw new Error(`Failed to update product: ${error.message}`);
    }
}

// Delete product from Firebase
export async function deleteProduct(productId) {
    try {
        console.log('Deleting product from Firebase:', productId);
        
        const productRef = doc(chandriaDB, PRODUCTS_COLLECTION, productId);
        await deleteDoc(productRef);
        
        console.log('Product deleted successfully');
        return true;
        
    } catch (error) {
        console.error('Error deleting product:', error);
        throw new Error(`Failed to delete product: ${error.message}`);
    }
}

// Search products by category
export async function searchProductsByCategory(category) {
    try {
        console.log('Searching products by category:', category);
        
        const productsRef = collection(chandriaDB, PRODUCTS_COLLECTION);
        const q = query(
            productsRef, 
            where('category', '==', category),
            orderBy('dateAdded', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Found ${products.length} products in category: ${category}`);
        return products;
        
    } catch (error) {
        console.error('Error searching products by category:', error);
        throw new Error(`Failed to search products: ${error.message}`);
    }
}

// Search products by status
export async function searchProductsByStatus(status) {
    try {
        console.log('Searching products by status:', status);
        
        const productsRef = collection(chandriaDB, PRODUCTS_COLLECTION);
        const q = query(
            productsRef, 
            where('status', '==', status),
            orderBy('dateAdded', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Found ${products.length} products with status: ${status}`);
        return products;
        
    } catch (error) {
        console.error('Error searching products by status:', error);
        throw new Error(`Failed to search products: ${error.message}`);
    }
}

/**
 * Additionals Management Functions
 */

// Fetch all additionals from Firebase
export async function fetchAdditionals() {
    try {
        console.log('Fetching additionals from Firebase...');
        
        const additionalsRef = collection(chandriaDB, ADDITIONALS_COLLECTION);
        const q = query(additionalsRef, orderBy('dateAdded', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const additionals = [];
        querySnapshot.forEach((doc) => {
            additionals.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Fetched ${additionals.length} additionals from Firebase`);
        return additionals;
        
    } catch (error) {
        console.error('Error fetching additionals:', error);
        throw new Error(`Failed to fetch additionals: ${error.message}`);
    }
}

// Add new additional to Firebase
export async function addAdditional(additionalData) {
    try {
        console.log('Adding additional to Firebase:', additionalData);
        
        // Prepare additional data with timestamp
        const additionalToAdd = {
            ...additionalData,
            dateAdded: new Date().toISOString(),
            status: additionalData.status || 'available'
        };
        
        const additionalsRef = collection(chandriaDB, ADDITIONALS_COLLECTION);
        const docRef = await addDoc(additionalsRef, additionalToAdd);
        
        console.log('Additional added successfully with ID:', docRef.id);
        return { id: docRef.id, ...additionalToAdd };
        
    } catch (error) {
        console.error('Error adding additional:', error);
        throw new Error(`Failed to add additional: ${error.message}`);
    }
}

// Update existing additional in Firebase
export async function updateAdditional(additionalId, additionalData) {
    try {
        console.log('Updating additional in Firebase:', additionalId, additionalData);
        
        const additionalRef = doc(chandriaDB, ADDITIONALS_COLLECTION, additionalId);
        const updateData = {
            ...additionalData,
            dateModified: new Date().toISOString()
        };
        
        await updateDoc(additionalRef, updateData);
        console.log('Additional updated successfully');
        
        return { id: additionalId, ...updateData };
        
    } catch (error) {
        console.error('Error updating additional:', error);
        throw new Error(`Failed to update additional: ${error.message}`);
    }
}

// Delete additional from Firebase
export async function deleteAdditional(additionalId) {
    try {
        console.log('Deleting additional from Firebase:', additionalId);
        
        const additionalRef = doc(chandriaDB, ADDITIONALS_COLLECTION, additionalId);
        await deleteDoc(additionalRef);
        
        console.log('Additional deleted successfully');
        return true;
        
    } catch (error) {
        console.error('Error deleting additional:', error);
        throw new Error(`Failed to delete additional: ${error.message}`);
    }
}

/**
 * Utility Functions
 */

// Test Firebase connection
export async function testFirebaseConnection() {
    try {
        console.log('Testing Firebase connection...');
        
        // Try to fetch a small amount of data
        const productsRef = collection(chandriaDB, PRODUCTS_COLLECTION);
        const q = query(productsRef, orderBy('dateAdded', 'desc'));
        const querySnapshot = await getDocs(q);
        
        console.log('Firebase connection successful!');
        console.log(`Found ${querySnapshot.size} products in database`);
        
        return {
            success: true,
            productsCount: querySnapshot.size,
            message: 'Firebase connection successful'
        };
        
    } catch (error) {
        console.error('Firebase connection failed:', error);
        throw new Error(`Firebase connection failed: ${error.message}`);
    }
}

// Initialize Firebase services
export async function initializeFirebaseServices() {
    try {
        console.log('Initializing Firebase services for inventory management...');
        
        // Test connection
        const connectionTest = await testFirebaseConnection();
        
        if (connectionTest.success) {
            console.log('Firebase inventory services initialized successfully');
            return {
                success: true,
                message: 'Firebase services ready',
                productsCount: connectionTest.productsCount
            };
        }
        
    } catch (error) {
        console.error('Failed to initialize Firebase services:', error);
        throw new Error(`Firebase initialization failed: ${error.message}`);
    }
}

// Export all functions
export default {
    // Products
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProductsByCategory,
    searchProductsByStatus,
    
    // Additionals
    fetchAdditionals,
    addAdditional,
    updateAdditional,
    deleteAdditional,
    
    // Utilities
    testFirebaseConnection,
    initializeFirebaseServices
};
