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
    async function showRentalDetails(id) {
        try {
            // Show spinner while loading
            adminSpinners.showActionSpinner('Loading rental details...');
            
            const docSnap = await db.collection("transaction").doc(id).get();
            if (!docSnap.exists) {
                adminSpinners.hideActionSpinner();
                alert('Rental transaction not found');
                return;
            }

            const data = docSnap.data();
            
            // Hide spinner once data is loaded
            adminSpinners.hideActionSpinner();
            
            const modal = document.getElementById('rental-modal');
            
            // Format dates
            const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Not specified';
            
            const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Not specified';
            
            const transactionDate = data.timestamp ? new Date(data.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            }) : 'Not available';            // Populate customer information
            document.getElementById('customer-name').textContent = data.fullName || data.customerName || 'Not provided';
            document.getElementById('customer-contact').textContent = data.contactNumber || data.customerContactNumber || 'Not provided';
            document.getElementById('customer-address').textContent = data.address || data.customerAddress || 'Not provided';

            // Populate transaction details
            document.getElementById('transaction-code').textContent = data.transactionCode || 'Not assigned';
            
            // Handle rental type and dates - check multiple possible field names
            const rentalType = data.rentalType || data.status || data.type || 'Unknown';
            console.log('Rental Type from Firebase:', rentalType, 'Full data:', data);
            
            const rentalTypeElement = document.getElementById('rental-type');
            rentalTypeElement.textContent = getRentalTypeDisplayName(rentalType);
            rentalTypeElement.className = `status-badge ${getRentalTypeClass(rentalType)}`;
              // Set up date fields based on rental type
            setupRentalDates(data, rentalType);            // Calculate payment information - use correct Firebase field names
            const rentalFee = parseFloat(data.rentalFee || data.totalPayment || 0);
            const totalPayment = parseFloat(data.totalPayment || 0);
            const remainingBalance = parseFloat(data.remainingBalance || 0);

            // Debug logging to see available fields and calculated values
            console.log('Payment Info Debug:', {
                availableFields: Object.keys(data),
                calculatedValues: {
                    rentalFee: rentalFee,
                    totalPayment: totalPayment,
                    remainingBalance: remainingBalance
                },
                rawFieldValues: {
                    rentalFee: data.rentalFee,
                    totalPayment: data.totalPayment,
                    remainingBalance: data.remainingBalance
                }
            });

            document.getElementById('rental-fee').textContent = `₱${rentalFee.toLocaleString()}`;
            document.getElementById('payment-total').textContent = `₱${totalPayment.toLocaleString()}`;
            document.getElementById('payment-remaining').textContent = `₱${remainingBalance.toLocaleString()}`;

            // Populate rented items
            await populateRentedItems(data);            // Populate notes
            const notesElement = document.getElementById('rental-notes');
            notesElement.textContent = data.notes || data.additionalNotes || 'No additional notes provided.';

            // Show modal
            modal.classList.add('visible');

        } catch (error) {
            adminSpinners.hideActionSpinner();
            console.error('Error loading rental details:', error);
            alert('Error loading rental details. Please try again.');
        }
    }    // Helper function to get rental type CSS class
    function getRentalTypeClass(rentalType) {
        switch (rentalType?.toLowerCase()) {
            case 'fixed date':
                return 'fixed-date';
            case 'open rental':
                return 'open-rental';
            case 'completed':
            case 'returned':
                return 'completed';
            case 'overdue':
                return 'overdue';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'default';
        }
    }

    // Helper function to get rental type display name
    function getRentalTypeDisplayName(rentalType) {
        switch (rentalType?.toLowerCase()) {
            case 'fixed date':
                return 'Fixed Date';
            case 'open rental':
                return 'Open Rental';
            case 'completed':
                return 'Completed';
            case 'overdue':
                return 'Overdue';
            case 'cancelled':
                return 'Cancelled';
            default:
                return rentalType || 'Unknown';
        }
    }

    // Setup rental dates based on rental type
    function setupRentalDates(data, rentalType) {
        const rentalDatesSection = document.getElementById('rental-dates-section');
        
        // Format dates
        const eventDate = data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Not specified';
        
        const eventStartDate = data.eventStartDate ? new Date(data.eventStartDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Not specified';
        
        const eventEndDate = data.eventEndDate ? new Date(data.eventEndDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Not specified';

        let datesHtml = '';
        
        if (rentalType?.toLowerCase() === 'fixed date') {
            // Show single event date for fixed date rentals
            datesHtml = `
                <div class="info-item">
                    <label>Event Date:</label>
                    <span id="event-date">${eventDate}</span>
                </div>
            `;
        } else if (rentalType?.toLowerCase() === 'open rental') {
            // Show start and end dates for open rentals
            datesHtml = `
                <div class="info-item">
                    <label>Start Date:</label>
                    <span id="start-date">${eventStartDate}</span>
                </div>
                <div class="info-item">
                    <label>End Date:</label>
                    <span id="end-date">${eventEndDate}</span>
                </div>
            `;
        } else {
            // Default to showing start and end dates
            datesHtml = `
                <div class="info-item">
                    <label>Start Date:</label>
                    <span id="start-date">${eventStartDate}</span>
                </div>
                <div class="info-item">
                    <label>End Date:</label>
                    <span id="end-date">${eventEndDate}</span>
                </div>
            `;
        }
        
        rentalDatesSection.innerHTML = datesHtml;
    }

    // Helper function to get status CSS class (keeping for backwards compatibility)
    function getStatusClass(status) {
        return getRentalTypeClass(status);
    }

    // Populate rented items section
    async function populateRentedItems(data) {
        const itemsContainer = document.getElementById('rented-items');
        itemsContainer.innerHTML = '<div class="loading-items"><i class="fas fa-spinner fa-spin"></i> Loading items...</div>';

        try {
            let itemsHtml = '';

            // Process products
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
                            
                        const totalQuantity = Object.values(product.sizes || {}).reduce((sum, qty) => sum + qty, 0);
                        
                        return {
                            type: 'Product',
                            name: productData.name || product.name || 'Unknown Product',
                            code: productData.code || product.code || 'N/A',
                            image: productData.frontImageUrl || productData.imageUrl || './assets/images/placeholder.png',
                            sizes: sizesDisplay,
                            price: product.price || productData.price || 0,
                            quantity: totalQuantity,
                            color: productData.color || 'N/A',
                            category: productData.category || 'N/A'
                        };
                    } catch (error) {
                        console.error('Error fetching product details:', error);
                        return null;
                    }
                }));

                productDetails.filter(item => item !== null).forEach(item => {
                    itemsHtml += createItemHtml(item);
                });
            }

            // Process accessories
            if (data.accessories && Array.isArray(data.accessories)) {
                const accessoryDetails = await Promise.all(data.accessories.map(async accessory => {
                    try {
                        if (!accessory.id) return null;
                        
                        const accessoryDoc = await db.collection("additionals").doc(accessory.id).get();
                        if (!accessoryDoc.exists) return null;
                        
                        const accessoryData = accessoryDoc.data();
                        
                        return {
                            type: 'Accessory',
                            name: accessoryData.name || accessory.name || 'Unknown Accessory',
                            code: accessoryData.code || accessory.code || 'N/A',
                            image: accessoryData.imageUrl || './assets/images/placeholder.png',
                            price: accessory.price || accessoryData.price || 0,
                            quantity: accessory.quantity || 1,
                            inclusions: accessoryData.inclusions || []
                        };
                    } catch (error) {
                        console.error('Error fetching accessory details:', error);
                        return null;
                    }
                }));

                accessoryDetails.filter(item => item !== null).forEach(item => {
                    itemsHtml += createItemHtml(item);
                });
            }

            if (itemsHtml) {
                itemsContainer.innerHTML = itemsHtml;
            } else {
                itemsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No items found for this rental.</p></div>';
            }

        } catch (error) {
            console.error('Error loading rental items:', error);
            itemsContainer.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading rental items.</p></div>';
        }
    }    // Create HTML for individual rental item
    function createItemHtml(item) {
        const inclusionsHtml = item.inclusions && item.inclusions.length > 0 
            ? `<span><strong>Inclusions:</strong> ${item.inclusions.join(', ')}</span>`
            : '';

        return `
            <div class="rental-item">
                <img src="${item.image}" alt="${item.name}" class="item-image" 
                     onerror="this.src='./assets/images/placeholder.png'">
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-info">
                        <span><strong>Code:</strong> ${item.code}</span>
                        ${item.sizes ? `<span><strong>Sizes:</strong> ${item.sizes}</span>` : ''}
                        ${item.category ? `<span><strong>Category:</strong> ${item.category}</span>` : ''}
                        ${item.quantity ? `<span><strong>Quantity:</strong> ${item.quantity}</span>` : ''}
                        ${inclusionsHtml}
                    </div>
                </div>
                <div class="item-price">₱${parseFloat(item.price || 0).toLocaleString()}</div>
            </div>
        `;    }

    // Load and render rentals
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

    // Rental view button event listener (using event delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('rental-view')) {
            const rentalId = e.target.getAttribute('data-id');
            if (rentalId) {
                console.log('🔍 Opening rental details for ID:', rentalId);
                showRentalDetails(rentalId);
            }
        }
    });

    // Close rental modal event listeners
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-rental-modal') || 
            (e.target.closest('.close-rental-modal'))) {
            document.getElementById('rental-modal').classList.remove('visible');
        }
        
        // Close modal when clicking the backdrop
        if (e.target.classList.contains('modal-backdrop')) {
            document.getElementById('rental-modal').classList.remove('visible');
        }
    });

    // View All button functionality to navigate to customer-logs.html
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("🔄 Navigating to customer logs...");
            window.location.href = './customer-logs.html';
        });
    }

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