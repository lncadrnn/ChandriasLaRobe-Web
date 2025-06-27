import {
    chandriaDB,
    collection,
    getDocs,
    query,
    where
} from "./sdk/chandrias-sdk.js";

/**
 * Rental Duplication Management System
 * Handles stock checking and date conflict validation for rentals
 */

/**
 * Check if a product with specific size is available for rental on given dates
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format) - optional for fixed rentals
 * @param {string} rentalType - 'Open Rental' or 'Fixed Rental'
 * @returns {Promise<{available: boolean, conflictDates: string[], stock: number}>}
 */
export async function checkProductAvailability(productId, size, startDate, endDate = null, rentalType = 'Fixed Rental') {
    try {
        // First, get the product's stock information
        const productStock = await getProductStock(productId, size);
        
        if (productStock <= 0) {
            return {
                available: false,
                conflictDates: [],
                stock: 0,
                message: 'Product is out of stock'
            };
        }

        // Generate the date range that would be blocked
        const blockedDates = generateBlockedDates(startDate, endDate, rentalType);
        
        // Get all existing rentals for this product and size
        const existingRentals = await getExistingRentals(productId, size);
        
        // Check for conflicts with existing rentals
        const conflicts = checkDateConflicts(blockedDates, existingRentals);
        
        // Count how many rentals would conflict
        const conflictingRentals = conflicts.length;
        const availableStock = productStock - conflictingRentals;
        
        return {
            available: availableStock > 0,
            conflictDates: conflicts.map(c => c.dateRange).flat(),
            stock: availableStock,
            totalStock: productStock,
            conflictingRentals: conflictingRentals,
            message: availableStock > 0 ? 'Product available' : 'All stock is rented for the selected dates'
        };
        
    } catch (error) {
        console.error('Error checking product availability:', error);
        return {
            available: false,
            conflictDates: [],
            stock: 0,
            message: 'Error checking availability'
        };
    }
}

/**
 * Get the stock count for a specific product and size
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @returns {Promise<number>}
 */
async function getProductStock(productId, size) {
    try {
        const productRef = collection(chandriaDB, "products");
        const q = query(productRef, where("__name__", "==", productId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return 0;
        }
        
        const productData = querySnapshot.docs[0].data();
        
        // Check if product has size-specific stock
        if (productData.sizes && productData.sizes[size]) {
            return parseInt(productData.sizes[size]) || 0;
        }
        
        // Fallback to general stock
        return parseInt(productData.stock) || 0;
        
    } catch (error) {
        console.error('Error getting product stock:', error);
        return 0;
    }
}

/**
 * Generate the list of dates that would be blocked for a rental
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format) - optional for fixed rentals
 * @param {string} rentalType - 'Open Rental' or 'Fixed Rental'
 * @returns {string[]} Array of date strings
 */
function generateBlockedDates(startDate, endDate = null, rentalType = 'Fixed Rental') {
    const dates = [];
    const start = new Date(startDate);
    
    if (rentalType === 'Fixed Rental') {
        // For fixed rental: event date + 3 days (24, 25, 26 after 23rd)
        const eventDate = new Date(start);
        
        // Add the event date
        dates.push(formatDate(eventDate));
        
        // Add 3 additional days (for return, cleaning, etc.)
        for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(eventDate);
            nextDate.setDate(eventDate.getDate() + i);
            dates.push(formatDate(nextDate));
        }
        
    } else if (rentalType === 'Open Rental' && endDate) {
        // For open rental: start date to end date + 1 day for cleaning
        const end = new Date(endDate);
        const current = new Date(start);
        
        // Add all dates from start to end
        while (current <= end) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }
        
        // Add one extra day for cleaning
        dates.push(formatDate(current));
    }
    
    return dates;
}

/**
 * Get all existing rentals for a specific product and size
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @returns {Promise<Array>}
 */
async function getExistingRentals(productId, size) {
    try {
        const transactionRef = collection(chandriaDB, "transaction");
        const querySnapshot = await getDocs(transactionRef);
        
        const rentals = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip cancelled or completed rentals
            if (data.rentalStatus === 'Cancelled' || data.rentalStatus === 'Completed') {
                return;
            }
            
            // Check if this rental includes our product and size
            let productMatches = false;
            
            // Check in products array (new format)
            if (data.products && Array.isArray(data.products)) {
                productMatches = data.products.some(p => 
                    p.id === productId && 
                    p.sizes && 
                    p.sizes[size] && 
                    p.sizes[size] > 0
                );
            }
            
            // Check in productCode string (legacy format)
            if (!productMatches && data.productCode) {
                // This is a fallback for older format, might need adjustment based on your data structure
                productMatches = data.productCode.includes(productId);
            }
            
            if (productMatches && (data.eventStartDate || data.eventDate)) {
                const rentalDates = generateBlockedDates(
                    data.eventStartDate || data.eventDate,
                    data.eventEndDate,
                    data.rentalType || 'Fixed Rental'
                );
                
                rentals.push({
                    id: doc.id,
                    transactionCode: data.transactionCode,
                    dateRange: rentalDates,
                    rentalType: data.rentalType || 'Fixed Rental',
                    eventDate: data.eventStartDate || data.eventDate,
                    endDate: data.eventEndDate
                });
            }
        });
        
        return rentals;
        
    } catch (error) {
        console.error('Error getting existing rentals:', error);
        return [];
    }
}

/**
 * Check for date conflicts between new rental dates and existing rentals
 * @param {string[]} newDates - Array of dates for the new rental
 * @param {Array} existingRentals - Array of existing rental objects
 * @returns {Array} Array of conflicting rentals
 */
function checkDateConflicts(newDates, existingRentals) {
    const conflicts = [];
    
    existingRentals.forEach(rental => {
        const hasConflict = newDates.some(date => rental.dateRange.includes(date));
        
        if (hasConflict) {
            conflicts.push(rental);
        }
    });
    
    return conflicts;
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string}
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Check if a specific date is available for all products in the cart
 * @param {Array} cartProducts - Array of cart products with id, size, etc.
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format) - optional
 * @param {string} rentalType - 'Open Rental' or 'Fixed Rental'
 * @returns {Promise<{available: boolean, conflicts: Array, message: string}>}
 */
export async function checkCartAvailability(cartProducts, startDate, endDate = null, rentalType = 'Fixed Rental') {
    try {
        const conflicts = [];
        let allAvailable = true;
        
        // Group products by id and size to handle quantities
        const productGroups = {};
        cartProducts.forEach(product => {
            const key = `${product.id}_${product.size}`;
            if (!productGroups[key]) {
                productGroups[key] = {
                    id: product.id,
                    name: product.name,
                    size: product.size,
                    quantity: 0
                };
            }
            productGroups[key].quantity += (product.quantity || 1);
        });
        
        // Check each product group
        for (const group of Object.values(productGroups)) {
            const availability = await checkProductAvailability(
                group.id, 
                group.size, 
                startDate, 
                endDate, 
                rentalType
            );
            
            if (!availability.available || availability.stock < group.quantity) {
                allAvailable = false;
                conflicts.push({
                    product: group.name,
                    size: group.size,
                    requested: group.quantity,
                    available: availability.stock,
                    conflictDates: availability.conflictDates,
                    message: availability.message
                });
            }
        }
        
        return {
            available: allAvailable,
            conflicts: conflicts,
            message: allAvailable ? 'All products available for selected dates' : 'Some products are not available'
        };
        
    } catch (error) {
        console.error('Error checking cart availability:', error);
        return {
            available: false,
            conflicts: [],
            message: 'Error checking availability'
        };
    }
}

/**
 * Update product stock when a rental is confirmed
 * This is handled by the rental creation process, but can be used for stock tracking
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @param {number} quantity - Quantity to reserve (negative to unreserve)
 * @returns {Promise<boolean>}
 */
export async function updateProductStock(productId, size, quantity) {
    // Note: In this system, we don't actually decrease stock numbers
    // Instead, we track rentals and calculate available stock dynamically
    // This function is here for future enhancement if needed
    console.log(`Stock update requested: ${productId} (${size}) - ${quantity}`);
    return true;
}
