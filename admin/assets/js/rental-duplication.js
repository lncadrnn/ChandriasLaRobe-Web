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

// Enable/disable debug logging
const DEBUG_ENABLED = true; // Set to false to disable console logs

function debugLog(...args) {
    if (DEBUG_ENABLED) {
        console.log(...args);
    }
}

/**
 * Check if a product with specific size is available for rental on given dates
 * Simple rule: If product is already rented on any of the requested dates, it's not available
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format) - optional for fixed rentals
 * @param {string} rentalType - 'Open Rental' or 'Fixed Rental'
 * @returns {Promise<{available: boolean, conflictDates: string[], message: string}>}
 */
export async function checkProductAvailability(productId, size, startDate, endDate = null, rentalType = 'Fixed Rental') {
    try {
        // Generate the date range that would be blocked
        const blockedDates = generateBlockedDates(startDate, endDate, rentalType);
        
        // Get all existing rentals for this product and size
        const existingRentals = await getExistingRentals(productId, size);
        
        // Check for any date conflicts - simple rule: if any date overlaps, product is not available
        const hasConflicts = existingRentals.some(rental => {
            return blockedDates.some(date => rental.dateRange.includes(date));
        });
        
        debugLog(`[DEBUG] Product ${productId} (${size}) availability check:`, {
            requestedDates: blockedDates,
            existingRentals: existingRentals.length,
            hasConflicts,
            available: !hasConflicts
        });
        
        return {
            available: !hasConflicts,
            conflictDates: hasConflicts ? blockedDates : [],
            message: hasConflicts ? 'Product is already rented on the selected dates' : 'Product available'
        };
        
    } catch (error) {
        console.error('Error checking product availability:', error);
        return {
            available: false,
            conflictDates: [],
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
export async function getProductStock(productId, size) {
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
 * Simple rule: if product exists in rental, it's considered rented
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @returns {Promise<Array>}
 */
async function getExistingRentals(productId, size) {
    try {
        const transactionRef = collection(chandriaDB, "transaction");
        const querySnapshot = await getDocs(transactionRef);
        
        const rentals = [];
        
        debugLog(`[DEBUG] Checking existing rentals for Product ID: ${productId}, Size: ${size}`);
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip cancelled or completed rentals
            if (data.rentalStatus === 'Cancelled' || data.rentalStatus === 'Completed') {
                return;
            }
            
            let hasThisProduct = false;
            
            // Check in products array (new format)
            if (data.products && Array.isArray(data.products)) {
                hasThisProduct = data.products.some(p => {
                    const hasMatchingId = p.id === productId;
                    const hasSizes = p.sizes && typeof p.sizes === 'object';
                    const hasMatchingSize = hasSizes && p.sizes[size] && p.sizes[size] > 0;
                    
                    return hasMatchingId && hasSizes && hasMatchingSize;
                });
            }
            
            // Check in productCode string (legacy format)
            if (!hasThisProduct && data.productCode) {
                const productCodes = data.productCode.split(',').map(code => code.trim());
                hasThisProduct = productCodes.some(code => code.includes(productId));
            }
            
            // If this rental includes our product and has valid dates, add it to conflicts
            if (hasThisProduct && (data.eventStartDate || data.eventDate)) {
                const rentalDates = generateBlockedDates(
                    data.eventStartDate || data.eventDate,
                    data.eventEndDate,
                    data.rentalType || 'Fixed Rental'
                );
                
                debugLog(`[DEBUG] Found conflicting rental:`, {
                    transactionCode: data.transactionCode,
                    dateRange: rentalDates,
                    rentalType: data.rentalType
                });
                
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
        
        debugLog(`[DEBUG] Found ${rentals.length} existing rentals for ${productId} (${size})`);
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
 * Check if all products in the cart are available for the specified dates
 * Simple rule: If any product is already rented on the requested dates, it's not available
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
        
        for (const product of cartProducts) {
            const availability = await checkProductAvailability(
                product.id,
                product.size,
                startDate,
                endDate,
                rentalType
            );
            
            if (!availability.available) {
                allAvailable = false;
                conflicts.push({
                    product: product.name,
                    size: product.size,
                    available: 0, // Simple: either available (1) or not (0)
                    requested: 1,
                    message: 'Already rented on selected dates'
                });
            }
        }
        
        return {
            available: allAvailable,
            conflicts: conflicts,
            message: allAvailable ? 'All products available' : 'Some products are already rented on selected dates'
        };
        
    } catch (error) {
        console.error('Error checking cart availability:', error);
        return {
            available: false,
            conflicts: [],
            message: 'Error checking cart availability'
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

/**
 * Debug function to check what's causing availability issues
 * @param {string} productId - The product ID
 * @param {string} size - The product size
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format) - optional
 * @param {string} rentalType - 'Open Rental' or 'Fixed Rental'
 * @returns {Promise<Object>} Debug information
 */
export async function debugProductAvailability(productId, size, startDate, endDate = null, rentalType = 'Fixed Rental') {
    console.log('=== DEBUGGING PRODUCT AVAILABILITY ===');
    console.log('Product ID:', productId);
    console.log('Size:', size);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Rental Type:', rentalType);
    
    const productStock = await getProductStock(productId, size);
    console.log('Total Stock:', productStock);
    
    const existingRentals = await getExistingRentals(productId, size);
    console.log('Existing Rentals:', existingRentals.length);
    console.log('Rental Details:', existingRentals);
    
    const blockedDates = generateBlockedDates(startDate, endDate, rentalType);
    console.log('Blocked Dates:', blockedDates);
    
    const conflictingQuantity = calculateConflictingQuantity(blockedDates, existingRentals, productId, size);
    console.log('Conflicting Quantity:', conflictingQuantity);
    
    const availableStock = productStock - conflictingQuantity;
    console.log('Available Stock:', availableStock);
    
    console.log('=== END DEBUG ===');
    
    return {
        productStock,
        existingRentals: existingRentals.length,
        conflictingQuantity,
        availableStock,
        blockedDates,
        rentalDetails: existingRentals
    };
}


