// Import Firebase configuration
import { chandriaDB, collection, getDocs, doc, getDoc } from './sdk/chandrias-sdk.js';

// Initialize Firebase
let allTransactions = [];
let filteredTransactions = [];

// DOM elements
const tableBody = document.getElementById('rental-history-tbody');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar functionality
    const body = document.querySelector("body");
    const sidebar = body.querySelector(".sidebar");
    const toggle = body.querySelector(".toggle");

    // Restore sidebar state from localStorage
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle (chevron)
    toggle.addEventListener("click", () => {
        const isClosed = sidebar.classList.toggle("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Load transactions on page load
    loadTransactions();
    
    // Add event listeners
    searchInput?.addEventListener('input', handleSearch);
    refreshBtn?.addEventListener('click', loadTransactions);
});

// Load transactions from Firebase
async function loadTransactions() {
    try {
        showLoading();
        
        const transactionRef = collection(chandriaDB, 'transaction');
        const snapshot = await getDocs(transactionRef);
        
        allTransactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allTransactions.push({
                id: doc.id,
                ...data
            });
        });
        
        // Sort by timestamp (newest first)
        allTransactions.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB - dateA;
        });
        
        filteredTransactions = [...allTransactions];
        renderTransactionTable();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transaction history. Please try again.');
    }
}

// Fetch product details from Firebase
async function fetchProductDetails(productId) {
    try {
        if (!productId) return null;
        const productDoc = await getDoc(doc(chandriaDB, 'products', productId));
        if (productDoc.exists()) {
            return productDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching product details:', error);
        return null;
    }
}

// Fetch accessory details from Firebase
async function fetchAccessoryDetails(accessoryId) {
    try {
        if (!accessoryId) return null;
        const accessoryDoc = await getDoc(doc(chandriaDB, 'additionals', accessoryId));
        if (accessoryDoc.exists()) {
            return accessoryDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching accessory details:', error);
        return null;
    }
}

// Format products for display with images
async function formatProducts(products) {
    if (!products || !Array.isArray(products) || products.length === 0) {
        return '<span class="no-items">No products</span>';
    }
    
    const productPromises = products.map(async (product) => {
        const productDetails = await fetchProductDetails(product.id);
        
        if (!product.sizes || Object.keys(product.sizes).length === 0) {
            return `
                <div class="product-item">
                    ${productDetails?.frontImageUrl ? 
                        `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="product-image">` : ''
                    }
                    <div class="item-details">
                        <div class="item-name">${product.name || 'Unknown'}</div>
                        <div class="item-code">${product.code || 'N/A'}</div>
                    </div>
                </div>
            `;
        }
        
        const sizeDetails = Object.entries(product.sizes)
            .map(([size, qty]) => `${size} x${qty}`)
            .join(', ');
        
        return `
            <div class="product-item">
                ${productDetails?.frontImageUrl ? 
                    `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="product-image">` : ''
                }
                <div class="item-details">
                    <div class="item-name">${product.name || 'Unknown'}</div>
                    <div class="item-code">${product.code || 'N/A'}</div>
                    <div class="item-sizes">${sizeDetails}</div>
                </div>
            </div>
        `;
    });
    
    const results = await Promise.all(productPromises);
    return results.join('');
}

// Format accessories for display with images
async function formatAccessories(accessories) {
    if (!accessories || !Array.isArray(accessories) || accessories.length === 0) {
        return '<span class="no-items">No additional items</span>';
    }
    
    const accessoryPromises = accessories.map(async (accessory) => {
        const accessoryDetails = await fetchAccessoryDetails(accessory.id);
        
        let itemText = `
            <div class="item-details">
                <div class="item-name">${accessory.name || 'Unknown'}</div>
                <div class="item-code">${accessory.code || 'N/A'}</div>
        `;
        
        if (accessory.quantity && accessory.quantity > 1) {
            itemText += `<div class="item-sizes">Quantity: ${accessory.quantity}</div>`;
        }
        
        if (accessory.types && Array.isArray(accessory.types) && accessory.types.length > 0) {
            const types = accessory.types.join(', ');
            itemText += `<div class="item-sizes">Types: ${types}</div>`;
        }
        
        itemText += '</div>';
        
        return `
            <div class="accessory-item">
                ${accessoryDetails?.imageUrl ? 
                    `<img src="${accessoryDetails.imageUrl}" alt="${accessory.name}" class="accessory-image">` : ''
                }
                ${itemText}
            </div>
        `;
    });
    
    const results = await Promise.all(accessoryPromises);
    return results.join('');
}

// Render transaction table
async function renderTransactionTable() {
    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    <i class='bx bx-file'></i> No transactions found
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = [];
    
    for (const transaction of filteredTransactions) {
        // Calculate rental status based on dates
        const currentDate = new Date();
        const eventStartDate = transaction.eventStartDate ? new Date(transaction.eventStartDate) : null;
        const eventEndDate = transaction.eventEndDate ? new Date(transaction.eventEndDate) : null;
        
        let rentalStatus = 'Upcoming';
        let statusClass = 'status-upcoming';
        
        if (eventStartDate) {
            if (eventEndDate) {
                // Open rental with end date
                if (currentDate < eventStartDate) {
                    rentalStatus = 'Upcoming';
                    statusClass = 'status-upcoming';
                } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                    rentalStatus = 'Ongoing';
                    statusClass = 'status-ongoing';
                } else if (currentDate > eventEndDate) {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
            } else {
                // Fixed rental (single day)
                if (currentDate < eventStartDate) {
                    rentalStatus = 'Upcoming';
                    statusClass = 'status-upcoming';
                } else if (currentDate.toDateString() === eventStartDate.toDateString()) {
                    rentalStatus = 'Ongoing';
                    statusClass = 'status-ongoing';
                } else if (currentDate > eventStartDate) {
                    rentalStatus = 'Completed';
                    statusClass = 'status-completed';
                }
            }
        }

        // Calculate payment status
        const totalPayment = parseFloat(transaction.totalPayment) || 0;
        const remainingBalance = parseFloat(transaction.remainingBalance) || 0;
        const paymentStatus = remainingBalance > 0 ? 
            `Balance: ₱${remainingBalance.toLocaleString()}` : 
            'Fully Paid';
        const paymentClass = remainingBalance > 0 ? 'payment-balance' : 'payment-fully-paid';

        // Format event date
        let eventDateDisplay = 'N/A';
        if (eventStartDate) {
            if (eventEndDate && transaction.rentalType === 'Open Rental') {
                eventDateDisplay = `${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}`;
            } else {
                eventDateDisplay = eventStartDate.toLocaleDateString();
            }
        }

        // Format products and accessories with images
        const formattedProducts = await formatProducts(transaction.products);
        const formattedAccessories = await formatAccessories(transaction.accessories);

        const row = `
            <tr data-transaction-id="${transaction.id}">
                <td><strong>${transaction.fullName || 'Unknown'}</strong></td>
                <td><code>${transaction.transactionCode || transaction.id.substring(0, 8)}</code></td>
                <td><div class="products-cell">${formattedProducts}</div></td>
                <td><div class="accessories-cell">${formattedAccessories}</div></td>
                <td>${eventDateDisplay}</td>
                <td><span class="payment-status ${paymentClass}">${paymentStatus}</span></td>
                <td><span class="status-badge ${statusClass}">${rentalStatus}</span></td>
                <td><strong>₱${totalPayment.toLocaleString()}</strong></td>
                <td><button class="action-btn view-details" data-id="${transaction.id}">View Details</button></td>
            </tr>
        `;
        
        tableRows.push(row);
    }

    tableBody.innerHTML = tableRows.join('');

    // Add click event listeners for view details buttons
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const transactionId = e.target.dataset.id;
            showTransactionDetails(transactionId);
        });
    });
}

// Show transaction details modal with complete information
async function showTransactionDetails(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Create detailed view of products with images
    let productsHtml = '<p>No products</p>';
    if (transaction.products && transaction.products.length > 0) {
        const productDetailsPromises = transaction.products.map(async (product) => {
            const productDetails = await fetchProductDetails(product.id);
            const sizesHtml = product.sizes ? 
                Object.entries(product.sizes)
                    .map(([size, qty]) => `<li>${size}: ${qty} pcs</li>`)
                    .join('') : '';
            
            return `
                <div class="detail-product">
                    ${productDetails?.frontImageUrl ? 
                        `<img src="${productDetails.frontImageUrl}" alt="${product.name}" class="modal-product-image">` : ''
                    }
                    <h4>${product.name || 'Unknown Product'}</h4>
                    <p><strong>Code:</strong> ${product.code || 'N/A'}</p>
                    <p><strong>Price:</strong> ₱${product.price?.toLocaleString() || 'N/A'}</p>
                    <p><strong>Category:</strong> ${productDetails?.category || 'N/A'}</p>
                    <p><strong>Color:</strong> ${productDetails?.color || 'N/A'}</p>
                    <p><strong>Sleeve:</strong> ${productDetails?.sleeve || 'N/A'}</p>
                    ${sizesHtml ? `<p><strong>Sizes:</strong></p><ul>${sizesHtml}</ul>` : ''}
                    ${productDetails?.description ? `<p><strong>Description:</strong> ${productDetails.description}</p>` : ''}
                </div>
            `;
        });
        
        const productResults = await Promise.all(productDetailsPromises);
        productsHtml = productResults.join('');
    }
    
    // Create detailed view of accessories with images
    let accessoriesHtml = '<p>No additional items</p>';
    if (transaction.accessories && transaction.accessories.length > 0) {
        const accessoryDetailsPromises = transaction.accessories.map(async (accessory) => {
            const accessoryDetails = await fetchAccessoryDetails(accessory.id);
            const typesHtml = accessory.types?.length > 0 ? 
                `<p><strong>Types:</strong> ${accessory.types.join(', ')}</p>` : '';
            const inclusionsHtml = accessoryDetails?.inclusions?.length > 0 ?
                `<p><strong>Inclusions:</strong> ${accessoryDetails.inclusions.join(', ')}</p>` : '';
            
            return `
                <div class="detail-accessory">
                    ${accessoryDetails?.imageUrl ? 
                        `<img src="${accessoryDetails.imageUrl}" alt="${accessory.name}" class="modal-accessory-image">` : ''
                    }
                    <h4>${accessory.name || 'Unknown Accessory'}</h4>
                    <p><strong>Code:</strong> ${accessory.code || 'N/A'}</p>
                    <p><strong>Price:</strong> ₱${accessory.price?.toLocaleString() || 'N/A'}</p>
                    ${accessory.quantity ? `<p><strong>Quantity:</strong> ${accessory.quantity}</p>` : ''}
                    ${typesHtml}
                    ${inclusionsHtml}
                </div>
            `;
        });
        
        const accessoryResults = await Promise.all(accessoryDetailsPromises);
        accessoriesHtml = accessoryResults.join('');
    }
    
    const modalContent = `
        <div class="transaction-modal-overlay" onclick="closeTransactionModal()">
            <div class="transaction-modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Transaction Details</h2>
                    <button class="close-btn" onclick="closeTransactionModal()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="customer-info">
                        <h3>Customer Information</h3>
                        <p><strong>Name:</strong> ${transaction.fullName || 'N/A'}</p>
                        <p><strong>Contact:</strong> ${transaction.contactNumber || 'N/A'}</p>
                        <p><strong>Address:</strong> ${[transaction.address, transaction.city, transaction.region].filter(Boolean).join(', ') || 'N/A'}</p>
                        <p><strong>Event Type:</strong> ${transaction.eventType || 'N/A'}</p>
                        <p><strong>Rental Type:</strong> ${transaction.rentalType || 'N/A'}</p>
                        <p><strong>Event Start:</strong> ${transaction.eventStartDate ? new Date(transaction.eventStartDate).toLocaleDateString() : 'N/A'}</p>
                        ${transaction.eventEndDate ? `<p><strong>Event End:</strong> ${new Date(transaction.eventEndDate).toLocaleDateString()}</p>` : ''}
                        <p><strong>Transaction Date:</strong> ${transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    
                    <div class="rental-items">
                        <h3>Products Rented</h3>
                        <div class="products-detail">${productsHtml}</div>
                        
                        <h3>Additional Items</h3>
                        <div class="accessories-detail">${accessoriesHtml}</div>
                    </div>
                    
                    <div class="payment-info">
                        <h3>Payment Information</h3>
                        <p><strong>Payment Method:</strong> ${transaction.paymentMethod || 'N/A'}</p>
                        <p><strong>Payment Type:</strong> ${transaction.paymentType || 'N/A'}</p>
                        <p><strong>Rental Fee:</strong> ₱${transaction.rentalFee?.toLocaleString() || '0'}</p>
                        <p><strong>Total Payment:</strong> ₱${transaction.totalPayment?.toLocaleString() || '0'}</p>
                        <p><strong>Remaining Balance:</strong> ₱${transaction.remainingBalance?.toLocaleString() || '0'}</p>
                        <p><strong>Reference Number:</strong> ${transaction.referenceNo || 'N/A'}</p>
                    </div>
                    
                    ${transaction.notes ? `
                    <div class="additional-notes">
                        <h3>Additional Notes</h3>
                        <p>${transaction.notes}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    const existingModal = document.querySelector('.transaction-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Make close function globally available
    window.closeTransactionModal = function() {
        const modal = document.querySelector('.transaction-modal-overlay');
        if (modal) {
            modal.remove();
        }
    };
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredTransactions = [...allTransactions];
    } else {
        filteredTransactions = allTransactions.filter(transaction => {
            const customerMatch = (transaction.fullName || '').toLowerCase().includes(searchTerm);
            const codeMatch = (transaction.transactionCode || '').toLowerCase().includes(searchTerm);
            const contactMatch = (transaction.contactNumber || '').toLowerCase().includes(searchTerm);
            const eventMatch = (transaction.eventType || '').toLowerCase().includes(searchTerm);
            const rentalMatch = (transaction.rentalType || '').toLowerCase().includes(searchTerm);
            
            // Search in products
            const productMatch = transaction.products?.some(product => 
                (product.name || '').toLowerCase().includes(searchTerm) ||
                (product.code || '').toLowerCase().includes(searchTerm)
            ) || false;
            
            // Search in accessories
            const accessoryMatch = transaction.accessories?.some(accessory => 
                (accessory.name || '').toLowerCase().includes(searchTerm) ||
                (accessory.code || '').toLowerCase().includes(searchTerm)
            ) || false;
            
            return customerMatch || codeMatch || contactMatch || eventMatch || rentalMatch || productMatch || accessoryMatch;
        });
    }
    
    renderTransactionTable();
}

// Show loading state
function showLoading() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-loading">
                <i class='bx bx-loader-alt bx-spin'></i> Loading rental history...
            </td>
        </tr>
    `;
}

// Show error state
function showError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-error">
                <i class='bx bx-error'></i> ${message}
            </td>
        </tr>
    `;
}
