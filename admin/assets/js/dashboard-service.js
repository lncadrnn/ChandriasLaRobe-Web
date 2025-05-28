import { firebaseConfig } from '../../firebase-config.js';

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Sidebar toggle logic
    const body = document.querySelector("body"),
        sidebar = body.querySelector(".sidebar"),
        toggle = body.querySelector(".toggle");
    if (toggle && sidebar) {
        if (localStorage.getItem("admin-sidebar-closed") === "true") {
            sidebar.classList.add("close");
        }
        toggle.addEventListener("click", () => {
            const isClosed = sidebar.classList.toggle("close");
            localStorage.setItem("admin-sidebar-closed", isClosed);
        });
    }    // Rentals data - now fetched from Firebase
    let rentals = [];    const statusClass = {
        'Upcoming': 'pending',
        'Pending': 'ongoing', 
        'Completed': 'delivered',
        'Overdue': 'declined'
    };// Fetch transactions from Firebase
    async function fetchTransactions() {
        try {
            console.log("Fetching transactions from Firebase...");
            const snapshot = await db.collection("transaction")
                .orderBy("timestamp", "desc")
                .limit(20)
                .get();
            
            console.log("Found", snapshot.docs.length, "transactions");
            
            return snapshot.docs.map(doc => {
                const data = doc.data();
                const currentDate = new Date();
                const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate) : null;
                const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate) : null;
                  // Calculate rental status based on dates
                let rentalStatus = 'Upcoming';
                if (eventStartDate && eventEndDate) {
                    if (currentDate < eventStartDate) {
                        rentalStatus = 'Upcoming';
                    } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                        rentalStatus = 'Ongoing';
                    } else if (currentDate > eventEndDate) {
                        rentalStatus = 'Completed';
                    }
                }
                  // Calculate payment status
                const totalPayment = parseFloat(data.totalPayment) || 0;
                const remainingBalance = parseFloat(data.remainingBalance) || 0;
                const paymentStatus = remainingBalance > 0 ? `Bal: ₱${remainingBalance.toLocaleString()}` : 'Fully Paid';
                
                return {
                    id: doc.id,
                    name: data.fullName || 'Unknown',
                    code: data.transactionCode || doc.id.substring(0, 6),
                    payment: paymentStatus,
                    status: rentalStatus,
                    details: 'View',
                    ...data
                };
            });
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
    }

    function renderRentals(filteredRentals = rentals) {
        const tbody = document.getElementById('rentals-table-body');
        tbody.innerHTML = '';
        filteredRentals.forEach(rental => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rental.name}</td>
                <td>${rental.code}</td>
                <td>${rental.payment}</td>
                <td class="${statusClass[rental.status] || ''}">${rental.status}</td>
                <td><a href="#" class="rental-view" data-id="${rental.id}">${rental.details}</a></td>
            `;
            tbody.appendChild(tr);
        });        // Add click event listeners for rental details
        document.querySelectorAll('.rental-view').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.getAttribute('data-id');
                showRentalDetails(id);
            });
        });
    }

    // Rentals search functionality
    const rentalSearchInput = document.querySelector('.table-search input');
    const rentalClearBtn = document.querySelector('.table-search .bx-x');
    
    if (rentalSearchInput && rentalClearBtn) {
        rentalSearchInput.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase().trim();
            const filteredRentals = rentals.filter(rental => 
                rental.name.toLowerCase().includes(searchValue) ||
                rental.code.toLowerCase().includes(searchValue) ||
                rental.payment.toLowerCase().includes(searchValue) ||
                rental.status.toLowerCase().includes(searchValue)
            );
            renderRentals(filteredRentals);
        });

        rentalClearBtn.addEventListener('click', function() {
            rentalSearchInput.value = '';
            renderRentals();
        });
    }    // Show rental details modal
    async function showRentalDetails(id) {        try {
            const docSnap = await db.collection("transaction").doc(id).get();
            if (!docSnap.exists) return;

            const data = docSnap.data();
            
            // DEBUG: Log the transaction data retrieved from Firestore
            console.log("DEBUG - Transaction data retrieved:", data);
            console.log("DEBUG - Products in transaction:", data.products);
            console.log("DEBUG - Products array type:", Array.isArray(data.products));
            console.log("DEBUG - Products array length:", data.products ? data.products.length : 0);
            
            const modal = document.getElementById('rental-modal');
            const details = document.getElementById('rental-details');

            // Format dates
            const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate).toLocaleDateString() : 'N/A';
            const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate).toLocaleDateString() : 'N/A';
            const transactionDate = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A';

            // Fetch detailed product information from Firebase
            let productsContent = '';
            if (data.products && Array.isArray(data.products)) {
                console.log("DEBUG - Processing products array...");
                const productDetails = await Promise.all(data.products.map(async product => {
                    try {
                        console.log("DEBUG - Processing product:", product);
                        if (!product.id) return null;
                        
                        const productDoc = await db.collection("products").doc(product.id).get();
                        if (!productDoc.exists) return null;
                        
                        const productData = productDoc.data();
                        
                        // Convert sizes object to display format
                        const sizesDisplay = Object.entries(product.sizes || {})
                            .map(([size, quantity]) => `${size} (×${quantity})`)
                            .join(', ') || 'N/A';
                            
                        return {
                            name: productData.name || product.name || 'Unknown Product',
                            code: productData.code || product.code || 'N/A',
                            image: productData.frontImageUrl || productData.imageUrl || '',
                            sizes: sizesDisplay,
                            price: product.price || productData.price || 0,
                            totalQuantity: Object.values(product.sizes || {}).reduce((sum, qty) => sum + qty, 0)
                        };
                    } catch (error) {
                        console.error('Error fetching product details:', error);
                        return null;
                    }
                }));                const validProducts = productDetails.filter(Boolean);
                
                // DEBUG: Log product details processing results
                console.log("DEBUG - Product details processing results:");
                console.log("DEBUG - Valid products count:", validProducts.length);
                console.log("DEBUG - Valid products:", validProducts);
                
                if (validProducts.length > 0) {
                    productsContent = validProducts.map(product => `
                        <tr>
                            <td><img src="${product.image}" alt="${product.name}" class="modal-product-img" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; background: #fafafa;"></td>
                            <td>
                                <div class="modal-product-name" style="font-weight: 600; color: #222;">${product.name}</div>
                                <div class="modal-product-code" style="font-size: 0.9em; color: #666;">Code: ${product.code}</div>
                                <div class="modal-product-size" style="font-size: 0.95em; color: #888;">Sizes: ${product.sizes}</div>
                            </td>
                            <td class="modal-product-price" style="font-weight: 500; color: #222; text-align: right;">₱ ${(product.price * product.totalQuantity).toLocaleString()}</td>
                        </tr>
                    `).join('');                } else {
                    console.log("DEBUG - No valid products found, showing 'No products found' message");
                    productsContent = '<tr><td colspan="3" style="text-align:center;color:#888;">No products found</td></tr>';
                }
            } else {
                console.log("DEBUG - No products array found in transaction data");
                productsContent = '<tr><td colspan="3" style="text-align:center;color:#888;">No products found</td></tr>';
            }

            // Fetch detailed accessory information from Firebase
            let accessoriesContent = '';
            if (data.accessories && Array.isArray(data.accessories)) {
                const accessoryDetails = await Promise.all(data.accessories.map(async accessory => {
                    try {
                        if (!accessory.id) return {
                            name: accessory.name || 'Unknown Accessory',
                            code: accessory.code || 'N/A',
                            image: '',
                            quantity: accessory.quantity || 1,
                            price: accessory.price || 0
                        };
                        
                        const accessoryDoc = await db.collection("additionals").doc(accessory.id).get();
                        if (!accessoryDoc.exists) return {
                            name: accessory.name || 'Unknown Accessory',
                            code: accessory.code || 'N/A',
                            image: '',
                            quantity: accessory.quantity || 1,
                            price: accessory.price || 0
                        };
                        
                        const accessoryData = accessoryDoc.data();
                        return {
                            name: accessoryData.name || accessory.name || 'Unknown Accessory',
                            code: accessoryData.code || accessory.code || 'N/A',
                            image: accessoryData.imageUrl || '',
                            quantity: accessory.quantity || 1,
                            price: accessory.price || accessoryData.price || 0
                        };
                    } catch (error) {
                        console.error('Error fetching accessory details:', error);
                        return {
                            name: accessory.name || 'Unknown Accessory',
                            code: accessory.code || 'N/A',
                            image: '',
                            quantity: accessory.quantity || 1,
                            price: accessory.price || 0
                        };
                    }
                }));

                if (accessoryDetails.length > 0) {
                    accessoriesContent = accessoryDetails.map(accessory => `
                        <tr>
                            <td><img src="${accessory.image}" alt="${accessory.name}" class="modal-product-img" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; background: #fafafa;"></td>
                            <td>
                                <div class="modal-product-name" style="font-weight: 600; color: #222;">${accessory.name}</div>
                                <div class="modal-product-code" style="font-size: 0.9em; color: #666;">Code: ${accessory.code}</div>
                                <div class="modal-product-size" style="font-size: 0.95em; color: #888;">Quantity: ${accessory.quantity}</div>
                            </td>
                            <td class="modal-product-price" style="font-weight: 500; color: #222; text-align: right;">₱ ${(accessory.price * accessory.quantity).toLocaleString()}</td>
                        </tr>
                    `).join('');
                }
            }

            const totalPayment = parseFloat(data.totalPayment) || 0;
            const remainingBalance = parseFloat(data.remainingBalance) || 0;
            const paidAmount = totalPayment - remainingBalance;

            details.innerHTML = `
                <div class="rental-modal-grid">
                    <div class="rental-modal-form" style="gap:1.2rem;">
                        <div><b>Customer Name:</b> ${data.fullName || 'N/A'}</div>
                        <div><b>Contact Number:</b> ${data.contactNumber || 'N/A'}</div>
                        <div><b>Transaction Code:</b> ${data.transactionCode || 'N/A'}</div>
                        <div><b>Rental Type:</b> ${data.rentalType || 'N/A'}</div>
                        <div><b>Event Start Date:</b> ${eventStartDate}</div>
                        <div><b>Event End Date:</b> ${eventEndDate}</div>
                        <div><b>Transaction Date:</b> ${transactionDate}</div>
                        <div><b>Payment Method:</b> ${data.paymentMethod || 'N/A'}</div>
                        <div><b>Payment Type:</b> ${data.paymentType || 'N/A'}</div>
                    </div>
                    <div class="rental-modal-table">
                        <h4>Products</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Product Details</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsContent}
                            </tbody>
                        </table>
                        
                        ${accessoriesContent ? `
                        <h4 style="margin-top: 20px;">Accessories</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Accessory Details</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accessoriesContent}
                            </tbody>
                        </table>
                        ` : ''}                        <div class="payment-summary" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span><b>Total Amount:</b></span>
                                <span><b>₱ ${totalPayment.toLocaleString()}</b></span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>Paid Amount:</span>
                                <span>₱ ${paidAmount.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: ${remainingBalance > 0 ? '#e74c3c' : '#27ae60'};">
                                <span><b>Remaining Balance:</b></span>
                                <span><b>₱ ${remainingBalance.toLocaleString()}</b></span>
                            </div>
                        </div>
                          <div class="rental-modal-actions" style="margin-top: 20px; text-align: center;">
                            <button id="proceed-to-calendar-btn" style="
                                background: var(--primary-color);
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 16px;
                                font-weight: 600;
                                transition: background-color 0.3s ease;
                            " onmouseover="this.style.backgroundColor='#e63975'" onmouseout="this.style.backgroundColor='var(--primary-color)'">
                                Proceed to Calendar
                            </button>
                        </div>
                    </div>
                </div>
            `;            modal.classList.add('visible');
            
            // Add click handler for Proceed to Calendar button
            const proceedBtn = document.getElementById('proceed-to-calendar-btn');
            if (proceedBtn) {
                proceedBtn.addEventListener('click', () => {
                    // Store rental data for calendar use
                    sessionStorage.setItem('rentalData', JSON.stringify({
                        transactionId: id,
                        customerName: data.fullName,
                        transactionCode: data.transactionCode,
                        eventStartDate: data.eventStartDate,
                        eventEndDate: data.eventEndDate,
                        totalPayment: totalPayment,
                        remainingBalance: remainingBalance
                    }));
                    
                    // Navigate to calendar page (adjust URL as needed)
                    window.location.href = './calendar.html';
                });
            }
        } catch (error) {
            console.error("Error showing rental details:", error);
        }
    }// Load and render rentals
    async function loadRentals() {
        console.log("Loading rentals...");
        rentals = await fetchTransactions();
        console.log("Loaded", rentals.length, "rentals");
        renderRentals();
    }

    // Appointments Functions
    async function fetchAppointments() {
        try {
            const snapshot = await db.collection("appointments")
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching appointments:", error);
            return [];
        }
    }

    async function renderAppointments() {
        const ul = document.getElementById('appointments-list');
        ul.innerHTML = '';
        
        try {
            const appointments = await fetchAppointments();
            
            appointments.forEach(app => {
                const createdDate = app.createdAt?.toDate() || new Date();
                const formattedDate = createdDate.toLocaleString();
                
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="appointment-title"><b>${app.customerName || 'Unknown'}</b></div>
                    <div class="appointment-desc"> has booked an appointment on ${app.checkoutDate || 'N/A'}</div>
                    <span class="appointment-time">${formattedDate}</span>
                    <a class="appointment-view" href="#" data-id="${app.id}">View</a>
                `;
                ul.appendChild(li);
            });

            // Add view event listeners
            document.querySelectorAll('.appointment-view').forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const id = e.target.getAttribute('data-id');
                    showAppointmentDetails(id);
                });
            });
        } catch (error) {
            console.error("Error rendering appointments:", error);
        }
    }

    async function showAppointmentDetails(id) {
        try {
            const docSnap = await db.collection("appointments").doc(id).get();
            if (!docSnap.exists) return;

            const data = docSnap.data();
            const modal = document.getElementById('appointment-modal');
            const details = document.getElementById('appointment-details');

            // Debug: log cartItems
            console.log("Appointment cartItems:", data.cartItems);

            // Fetch product details for each cart item
            let cartItems = [];
            if (Array.isArray(data.cartItems) && data.cartItems.length > 0) {
                cartItems = await Promise.all(data.cartItems.map(async item => {
                    let productDoc;
                    if (item.type === "accessory") {
                        productDoc = await db.collection("additionals").doc(item.productId).get();
                    } else {
                        productDoc = await db.collection("products").doc(item.productId).get();
                    }
                    if (!productDoc.exists) return null;
                    const productData = productDoc.data();                    return {
                        name: productData.name || productData.code || "Unknown",
                        code: productData.code || productData.name || "Unknown", // Add code field
                        image: productData.frontImageUrl || productData.imageUrl || "",
                        price: productData.price || 0,
                        size: item.size || "",
                        quantity: item.quantity || 1,
                        type: item.type || "product"
                    };
                }));
                cartItems = cartItems.filter(Boolean);
            }

            let products = '';
            if (cartItems.length > 0) {
                products = cartItems.map(item => `
                    <tr>
                        <td><img src="${item.image}" alt="${item.name}" class="modal-product-img"></td>
                        <td>
                            <div class="modal-product-name">${item.name}</div>
                            <div class="modal-product-size">Size: ${item.size} x ${item.quantity}</div>
                        </td>
                        <td class="modal-product-price">₱ ${(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                `).join('');
            } else {
                products = `<tr><td colspan="3" style="text-align:center;color:#888;">No booked items found for this appointment.</td></tr>`;
            }

            const total = cartItems.reduce((sum, i) => sum + (Number(i.price) * (i.quantity || 1)), 0);            // Ensure all fields are filled (use empty string if undefined)
            const customerName = data.customerName || '';
            const customerEmail = data.customerEmail || '';
            const customerContact = data.customerContact || '';
            const checkoutDate = data.checkoutDate || '';
            const checkoutTime = data.checkoutTime || '';
            const customerRequest = data.customerRequest || '';

            details.innerHTML = `
                <div class="appointment-modal-grid">
                    <div class="appointment-modal-form" style="gap:1.2rem;">
                        <div><b>Name:</b> ${customerName}</div>
                        <div><b>Email:</b> ${customerEmail}</div>
                        <div><b>Phone:</b> ${customerContact}</div>
                        <div><b>Date:</b> ${checkoutDate}</div>
                        <div><b>Time:</b> ${checkoutTime}</div>
                        <div><b>Request / Notes:</b> ${customerRequest}</div>
                    </div>
                    <div class="appointment-modal-table">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Products</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2" style="text-align:right;font-weight:600;">Total</td>
                                    <td style="font-weight:700;font-size:1.2em;">₱ ${total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;

            modal.classList.add('visible');            // Proceed to Transaction handler
            modal.querySelector('.proceed-transaction').onclick = () => {
                sessionStorage.setItem('appointmentData', JSON.stringify({
                    customerName: data.customerName,
                    customerEmail: data.customerEmail,
                    customerContact: data.customerContact,
                    eventDate: data.checkoutDate,
                    appointmentTime: data.checkoutTime,
                    appointmentId: id,
                    cartItems: cartItems,
                    totalAmount: total
                }));
                window.location.href = './rental.html';
            };
        } catch (error) {
            console.error("Error showing appointment details:", error);
        }
    }    // Close modal handlers
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        document.getElementById('appointment-modal').classList.remove('visible');
    });

    document.querySelector('.close-rental-modal')?.addEventListener('click', () => {
        document.getElementById('rental-modal').classList.remove('visible');
    });

    // Appointment search functionality
    const searchInput = document.getElementById('appointment-search');
    const clearSearch = document.getElementById('clear-search');

    if (searchInput && clearSearch) {
        searchInput.addEventListener('input', async (e) => {
            const value = e.target.value.toLowerCase();
            const list = document.getElementById('appointments-list');
            const items = list.getElementsByTagName('li');

            for (const item of items) {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(value) ? '' : 'none';
            }
        });

        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            const items = document.querySelectorAll('#appointments-list li');
            items.forEach(item => item.style.display = '');
        });
    }    // Initial render
    loadRentals();
    renderAppointments();
});