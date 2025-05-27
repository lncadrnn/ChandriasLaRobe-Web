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
    }

    // Rentals data
    const rentals = [
        { name: 'Eimi FUkuda', code: '85631', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Maria Nagai', code: '36378', payment: 'Refunded', status: 'Declined', details: 'View' },
        { name: 'Akari Minase', code: '49347', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Kururugi Aoi', code: '96996', payment: 'Paid', status: 'Delivered', details: 'View' },
        { name: 'Mori Hinako', code: '22821', payment: 'Paid', status: 'Delivered', details: 'View' },
        { name: 'Satsuki Mei', code: '81475', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Rara Kuduo', code: '22821', payment: 'Paid', status: 'Delivered', details: 'View' },
        { name: 'Misaki Azusa', code: '81475', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Natsu Toujou', code: '22821', payment: 'Paid', status: 'Delivered', details: 'View' },
        { name: 'Honoko Tsujii', code: '81475', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Maina Yuuri', code: '22821', payment: 'Paid', status: 'Delivered', details: 'View' },
        { name: 'Sara Uruki', code: '81475', payment: 'Due', status: 'Pending', details: 'View' },
        { name: 'Rima Arai', code: '00482', payment: 'Paid', status: 'Delivered', details: 'View' }
    ];
    const statusClass = {
        'Pending': 'pending',
        'Declined': 'declined',
        'Delivered': 'delivered'
    };
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
                <td><a href="#">${rental.details}</a></td>
            `;
            tbody.appendChild(tr);
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
                    const productData = productDoc.data();
                    return {
                        name: productData.name || productData.code || "Unknown",
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
    }

    // Close modal handler
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        document.getElementById('appointment-modal').classList.remove('visible');
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
    }

    // Initial render
    renderRentals();
    renderAppointments();
});