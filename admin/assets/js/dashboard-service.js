document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    firebase.initializeApp(window.firebaseConfig);
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
    let rentals = [];

    const statusClass = {
        'Upcoming': 'pending',
        'Pending': 'ongoing', 
        'Completed': 'delivered',
        'Overdue': 'declined'
    };

    // Update current date and time display
    function updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        const dateTimeString = now.toLocaleDateString('en-US', options);
        const currentDateTimeElement = document.getElementById('currentDateTime');
        if (currentDateTimeElement) {
            currentDateTimeElement.textContent = dateTimeString;
        }
    }

    // Update time every minute
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Fetch transactions from Firebase
    async function fetchTransactions() {
        try {
            console.log("Fetching transactions from Firebase...");
            
            // Check if Firebase is available
            if (!db) {
                throw new Error("Firebase database not initialized");
            }
            
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
                if (eventStartDate) {
                    if (eventEndDate) {
                        // Open rental with end date
                        if (currentDate < eventStartDate) {
                            rentalStatus = 'Upcoming';
                        } else if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                            rentalStatus = 'Ongoing';
                        } else if (currentDate > eventEndDate) {
                            rentalStatus = 'Completed';
                        }
                    } else {
                        // Fixed rental (single day)
                        if (currentDate < eventStartDate) {
                            rentalStatus = 'Upcoming';
                        } else if (currentDate.toDateString() === eventStartDate.toDateString()) {
                            rentalStatus = 'Ongoing';
                        } else if (currentDate > eventStartDate) {
                            rentalStatus = 'Completed';
                        }
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
            });        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
    }

    function renderRentals(filteredRentals = rentals) {
        const tbody = document.getElementById('rentals-table-body');
        if (!tbody) return;
        
        // Show loading state while processing
        if (filteredRentals === 'loading') {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
                        <i class="bx bx-loader-alt bx-spin"></i> Loading rentals...
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!filteredRentals || filteredRentals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
                        No rental data available
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredRentals.forEach(rental => {
            const tr = document.createElement('tr');
            
            // Map status to proper CSS classes for the existing UI
            let statusClass = '';
            switch(rental.status.toLowerCase()) {
                case 'upcoming':
                    statusClass = 'status-pending';
                    break;
                case 'ongoing':
                    statusClass = 'status-active';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    break;
                case 'overdue':
                    statusClass = 'status-overdue';
                    break;
                default:
                    statusClass = 'status-pending';
            }
            
            tr.innerHTML = `
                <td>${rental.name}</td>
                <td>${rental.code}</td>
                <td>${rental.payment}</td>
                <td><span class="status-badge ${statusClass}">${rental.status}</span></td>
                <td><button class="btn-details rental-view" data-id="${rental.id}">View</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Add click event listeners for rental details
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
            if (!docSnap.exists) return;        const data = docSnap.data();
            
        const modal = document.getElementById('rental-modal');
        const details = document.getElementById('rental-details');

        // Format dates
        const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate).toLocaleDateString() : 'N/A';
        const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate).toLocaleDateString() : 'N/A';
        const transactionDate = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A';

        // Fetch detailed product information from Firebase
        let productsContent = '';
        if (data.products && Array.isArray(data.products)) {
            const productDetails = await Promise.all(data.products.map(async product => {
                try {
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
            }));

            const validProducts = productDetails.filter(Boolean);
            
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
                `).join('');
            } else {
                productsContent = '<tr><td colspan="3" style="text-align:center;color:#888;">No products found</td></tr>';
            }
        } else {
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
    }    // Load and render rentals
    async function loadRentals() {
        console.log("Loading rentals...");
        
        // Show loading state
        renderRentals('loading');
        
        try {
            rentals = await fetchTransactions();
            console.log("Loaded", rentals.length, "rentals");
            renderRentals();
        } catch (error) {
            console.error("Error loading rentals:", error);
            // Show error state
            const tbody = document.getElementById('rentals-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: #e74c3c; padding: 20px;">
                            Error loading rental data. Please refresh the page.
                        </td>
                    </tr>
                `;
            }
        }
    }    // Update dashboard cards with real data
    async function updateDashboardCards() {
        try {
            // Show loading state for cards
            document.getElementById('active-rentals-count').innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
            document.getElementById('active-appointments-count').innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
            document.getElementById('total-products-count').innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';

            // Ensure rentals data is loaded first
            if (!rentals || rentals.length === 0) {
                console.log("Loading rentals for dashboard cards...");
                rentals = await fetchTransactions();
            }

            // Update Active Rentals count (Ongoing and Upcoming transactions)
            const activeRentalsCount = rentals.filter(rental => 
                rental.status === 'Ongoing' || rental.status === 'Upcoming'
            ).length;
            document.getElementById('active-rentals-count').textContent = activeRentalsCount;

            // Update Active Appointments count
            const appointments = await fetchAppointments();
            const activeAppointmentsCount = appointments.length;
            document.getElementById('active-appointments-count').textContent = activeAppointmentsCount;

            // Update Total Products count
            const productsSnapshot = await db.collection("products").get();
            const totalProductsCount = productsSnapshot.size;
            document.getElementById('total-products-count').textContent = totalProductsCount;

            console.log(`✅ Dashboard Cards Updated:`);
            console.log(`📦 Active Rentals: ${activeRentalsCount}`);
            console.log(`📅 Active Appointments: ${activeAppointmentsCount}`);
            console.log(`👔 Total Products: ${totalProductsCount}`);

        } catch (error) {
            console.error("Error updating dashboard cards:", error);
            // Set default values if there's an error
            document.getElementById('active-rentals-count').textContent = '0';
            document.getElementById('active-appointments-count').textContent = '0';
            document.getElementById('total-products-count').textContent = '0';
        }
    }    // Appointments Functions
    async function fetchAppointments() {
        try {
            // Check if Firebase is available
            if (!db) {
                throw new Error("Firebase database not initialized");
            }
            
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
    }async function renderAppointments() {
        const ul = document.getElementById('appointments-list');
        if (!ul) return;
        
        // Show loading state
        ul.innerHTML = `
            <li class="appointment-item">
                <div class="appointment-text" style="text-align: center; color: #999; padding: 20px;">
                    <i class="bx bx-loader-alt bx-spin"></i> Loading appointments...
                </div>
            </li>
        `;
        
        try {
            const appointments = await fetchAppointments();
            
            // Clear loading state
            ul.innerHTML = '';
            
            if (!appointments || appointments.length === 0) {
                ul.innerHTML = `
                    <li class="appointment-item">
                        <div class="appointment-text" style="text-align: center; color: #999;">
                            No appointments available
                        </div>
                    </li>
                `;
                return;
            }
            
            appointments.forEach(app => {
                const checkoutDate = app.checkoutDate || 'N/A';
                const checkoutTime = app.checkoutTime || 'N/A';
                const customerName = app.customerName || 'Unknown Customer';
                
                const li = document.createElement('li');
                li.className = 'appointment-item';
                li.innerHTML = `
                    <div class="appointment-text">
                        <strong>${customerName}</strong> has booked an appointment on <strong>${checkoutDate}</strong> at <strong>${checkoutTime}</strong>. 
                        <button class="appointment-view-details" data-id="${app.id}">View Details</button>
                    </div>
                `;
                ul.appendChild(li);
            });

            // Add view event listeners
            document.querySelectorAll('.appointment-view-details').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const id = e.target.getAttribute('data-id');
                    showAppointmentDetails(id);
                });
            });
        } catch (error) {
            console.error("Error rendering appointments:", error);
            ul.innerHTML = `
                <li class="appointment-item">
                    <div class="appointment-text" style="text-align: center; color: #e74c3c;">
                        Error loading appointments. Please refresh the page.
                    </div>
                </li>
            `;
        }
    }

    async function showAppointmentDetails(id) {
        try {
            const docSnap = await db.collection("appointments").doc(id).get();
            if (!docSnap.exists) return;

            const data = docSnap.data();        const modal = document.getElementById('appointment-modal');
        const details = document.getElementById('appointment-details');

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
                        id: productDoc.id,
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
            if (cartItems.length > 0) {                products = cartItems.map(item => `
                    <tr>
                        <td><img src="${item.image}" alt="${item.name}" class="appointment-product-img"></td>
                        <td>
                            <div class="appointment-product-info">
                                <div class="appointment-product-name">${item.name}</div>
                                <div class="appointment-product-details">Size: ${item.size} | Qty: ${item.quantity}</div>
                            </div>
                        </td>
                        <td class="appointment-product-price">₱ ${(item.price * item.quantity).toLocaleString()}</td>
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
            const customerRequest = data.customerRequest || '';            details.innerHTML = `
                <div class="appointment-modal-grid">
                    <div class="appointment-customer-info">
                        <h4><i class="fas fa-user"></i> Customer Information</h4>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Name:</span>
                            <span class="appointment-info-value">${customerName}</span>
                        </div>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Email:</span>
                            <span class="appointment-info-value">${customerEmail}</span>
                        </div>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Phone:</span>
                            <span class="appointment-info-value">${customerContact}</span>
                        </div>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Date:</span>
                            <span class="appointment-info-value">${checkoutDate}</span>
                        </div>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Time:</span>
                            <span class="appointment-info-value">${checkoutTime}</span>
                        </div>
                        <div class="appointment-info-item">
                            <span class="appointment-info-label">Notes:</span>
                            <span class="appointment-info-value">${customerRequest || 'No special requests'}</span>
                        </div>
                    </div>
                    <div class="appointment-products-section">
                        <div class="appointment-products-header">
                            <h4><i class="fas fa-box"></i> Booked Items</h4>
                        </div>
                        <table class="appointment-products-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Product Details</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products}
                            </tbody>
                        </table>
                        <div class="appointment-total-section">
                            <div class="appointment-total-row">
                                <span>Total Amount:</span>
                                <span>₱ ${total.toLocaleString()}</span>
                            </div>
                        </div>
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
        });        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            const items = document.querySelectorAll('#appointments-list li');
            items.forEach(item => item.style.display = '');
        });
    }    // Initial render
    async function initializeDashboard() {
        try {
            console.log("🚀 Initializing Dashboard...");
            
            // Load rentals and appointments data
            await loadRentals();
            await renderAppointments();
            
            // Update dashboard cards with the fetched data
            await updateDashboardCards();
            
            console.log("✅ Dashboard initialization completed successfully");
        } catch (error) {
            console.error("❌ Error initializing dashboard:", error);
        }
    }

    initializeDashboard();
});