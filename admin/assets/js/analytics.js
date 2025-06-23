/**
 * Analytics Dashboard JavaScript
 * Responsible for loading and visualizing business analytics data
 */

// Firebase Configuration and Initialization
// Note: firebaseConfig should be available globally from firebase-config.js
console.log('🔧 Initializing Firebase...');

// Check if Firebase config is available
if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found! Make sure firebase-config.js is loaded');
} else {
    console.log('✅ Firebase config found');
}

// Initialize Firebase
const app = firebase.initializeApp(window.firebaseConfig || {});
const db = firebase.firestore();

// Global Variables
let monthlyIncomeChart, customerGrowthChart, categoryChart, eventDistributionChart, additionalRentalsChart;
let currentTimeRange = '30days';
let isDataLoaded = false;
let currentAnalyticsData = null; // Store current analytics data for export
let currentMostRentedProductId = null; // Store the current most rented product ID
let notyf; // Notification instance

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {    // Initialize notification system
    notyf = new Notyf({
        duration: 4000,
        position: {
            x: 'center',
            y: 'top'
        },
        types: [
            {
                type: 'success',
                className: 'notyf__toast--success',
                duration: 4000,
                icon: false
            },
            {
                type: 'error',
                className: 'notyf__toast--error',
                duration: 4000,
                icon: false
            }
        ]
    });
    
    // Initialize page elements
    initPageLoader();
    initCharts();
    initEventListeners();
    
    // Load data for the default time period (30 days)
    loadAnalyticsData('30days');
});

/**
 * Initialize page loader and hide it when page is ready
 */
function initPageLoader() {
    const pageLoader = document.querySelector('.admin-page-loader');
    if (pageLoader) {
        // Hide loader after content is loaded
        window.addEventListener('load', function() {
            pageLoader.style.display = 'none';
        });
        
        // Or hide after 2 seconds as a fallback
        setTimeout(function() {
            pageLoader.style.display = 'none';
        }, 2000);
    }
}

/**
 * Initialize all charts with empty data
 */
function initCharts() {
    // Monthly Income Chart (Bar Chart)
    const monthlyIncomeCtx = document.getElementById('monthly-income-chart').getContext('2d');
    monthlyIncomeChart = new Chart(monthlyIncomeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Monthly Revenue (₱)',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(54, 162, 235, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Revenue: ₱' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });    // Customer Growth Chart (Line Chart)
    const customerGrowthCtx = document.getElementById('customer-growth-chart').getContext('2d');
    customerGrowthChart = new Chart(customerGrowthCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Number of Customers',
                data: [],
                fill: false,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(75, 192, 192, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `Customers: ${context.parsed.y}`;
                        },
                        title: function(context) {
                            return `${context[0].label} 2025`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        callback: function(value) {
                            return Math.round(value);
                        }
                    }
                }
            }
        }
    });    // Category Chart (Half Pie Chart)
    const categoryCtx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 2,
                borderRadius: 5,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rotation: -90, // Start from top
            circumference: 180, // Half circle (180 degrees)
            cutout: '60%', // Makes it a doughnut
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Event Distribution Chart (Pie Chart)
    const eventDistributionCtx = document.getElementById('event-distribution-chart').getContext('2d');
    eventDistributionChart = new Chart(eventDistributionCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40',
                    '#FF6384',
                    '#C9CBCF'
                ],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }            }
        }
    });

    // Additional Rentals Chart (Donut Chart)
    const additionalRentalsCtx = document.getElementById('additional-rentals-chart').getContext('2d');
    additionalRentalsChart = new Chart(additionalRentalsCtx, {
        type: 'doughnut',
        data: {
            labels: ['With Additional Items', 'No Additional Items'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    '#28a745', // Green for Yes
                    '#dc3545'  // Red for No
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%', // Makes it a donut chart
            plugins: {                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} transactions (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Initialize event listeners for page interactions
 */
function initEventListeners() {
    // Time period change
    const timePeriodSelect = document.getElementById('time-period');
    timePeriodSelect.addEventListener('change', function() {
        const selectedPeriod = this.value;
        currentTimeRange = selectedPeriod;
          // Toggle custom date range inputs
        const customDateRange = document.getElementById('custom-date-range');
        if (selectedPeriod === 'custom') {
            customDateRange.classList.remove('hidden');
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.classList.add('hidden');
            customDateRange.style.display = 'none';
            loadAnalyticsData(selectedPeriod);
        }
    });
      // Apply custom date range
    const applyDateRangeBtn = document.getElementById('apply-date-range');
    applyDateRangeBtn.addEventListener('click', function() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        console.log('🗓️ Custom date range selected:', {
            startDateInput: startDate,
            endDateInput: endDate
        });
        
        if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            
            // Set start date to beginning of day and end date to end of day for better range coverage
            startDateObj.setHours(0, 0, 0, 0);
            endDateObj.setHours(23, 59, 59, 999);
            
            console.log('📅 Converted date objects:', {
                startDateObj: startDateObj,
                endDateObj: endDateObj,
                startISO: startDateObj.toISOString(),
                endISO: endDateObj.toISOString()
            });
            
            loadAnalyticsData('custom', {
                startDate: startDateObj,
                endDate: endDateObj
            });
        } else {
            alert('Please select both start and end dates');
        }
    });
      // Refresh data
    const refreshBtn = document.getElementById('refresh-analytics');
    refreshBtn.addEventListener('click', function() {
        if (currentTimeRange === 'custom') {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            
            if (startDate && endDate) {
                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);
                
                // Set start date to beginning of day and end date to end of day for better range coverage
                startDateObj.setHours(0, 0, 0, 0);
                endDateObj.setHours(23, 59, 59, 999);
                
                loadAnalyticsData('custom', {
                    startDate: startDateObj,
                    endDate: endDateObj
                });
            } else {
                alert('Please select both start and end dates');
            }        } else {
            loadAnalyticsData(currentTimeRange);
        }
    });
    
    // Export CSV button
    const exportCsvBtn = document.getElementById('export-csv');
    exportCsvBtn.addEventListener('click', function() {
        exportToCSV();
    });
    
    // Export Excel button
    const exportExcelBtn = document.getElementById('export-excel');
    exportExcelBtn.addEventListener('click', function() {
        exportToExcel();
    });
}

/**
 * Load analytics data based on selected time period
 * @param {string} timePeriod - Time period to load data for
 * @param {Object} customDates - Custom date range (for 'custom' time period)
 */
async function loadAnalyticsData(timePeriod, customDates = null) {
    // Show action spinner
    const actionSpinner = document.querySelector('.admin-action-spinner');
    if (actionSpinner) {
        actionSpinner.style.display = 'flex';
    }
    
    // Calculate date range based on selected time period
    let startDate, endDate;
    const now = new Date();
    endDate = now;
    
    if (timePeriod === 'custom' && customDates) {
        startDate = customDates.startDate;
        endDate = customDates.endDate;
    } else {
        switch (timePeriod) {
            case '7days':
                startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                break;
            case '30days':
                startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                break;
            case '90days':
                startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                break;
            case 'year':
                startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                break;
            default:
                startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        }
    }      try {
        console.log('🔍 Attempting to fetch Firebase data...');
        console.log('📅 Date range:', {
            startDate: startDate,
            endDate: endDate,
            timePeriod: timePeriod,
            isCustom: timePeriod === 'custom'
        });
        
        // Fetch real data from Firebase
        const analyticsData = await fetchFirebaseAnalyticsData(startDate, endDate);
        
        console.log('✅ Firebase data fetched successfully:', analyticsData);
        
        // Update UI with the data
        updateAnalyticsUI(analyticsData);
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        
        // Show user-friendly error message
        showStatus('Firebase connection failed. Using mock data for demonstration.', 'warning');
        
        // Fallback to mock data if Firebase fails
        console.log('🔄 Falling back to mock data...');
        const analyticsData = generateMockAnalyticsData(startDate, endDate);
        updateAnalyticsUI(analyticsData);
    }
    
    // Hide action spinner after data is loaded
    if (actionSpinner) {
        setTimeout(() => {
            actionSpinner.style.display = 'none';
        }, 500);
    }
}

/**
 * Fetch analytics data from Firebase
 * @param {Date} startDate - Start date for data fetching
 * @param {Date} endDate - End date for data fetching
 * @returns {Object} - Analytics data from Firebase
 */
async function fetchFirebaseAnalyticsData(startDate, endDate) {
    try {        console.log('🔥 Starting Firebase data fetch...');
        console.log('📊 Firebase app initialized:', !!firebase.apps.length);
        console.log('🗄️ Firestore database:', !!db);
          // First, fetch all products to create a category lookup map
        console.log('📦 Fetching products for category lookup...');
        const productsSnapshot = await db.collection('products').get();
        const productCategoryMap = {};
        const productNameMap = {}; // Map product IDs to names
        
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            productCategoryMap[doc.id] = product.category || 'Other';
            productNameMap[doc.id] = product.name || 'Unknown Product';
        });
        
        console.log(`📋 Loaded ${Object.keys(productCategoryMap).length} products for category mapping`);
          // First, let's check if we can access the collection at all
        console.log('📡 Querying transaction collection...');
        
        // Ensure endDate includes the entire day (set to end of day)
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        
        console.log('📅 Date range for query:', {
            start: startDate.toISOString(),
            end: adjustedEndDate.toISOString()
        });
        
        // Query rental transactions from Firebase
        const rentalQuery = db.collection('transaction')
            .where('timestamp', '>=', startDate.toISOString())
            .where('timestamp', '<=', adjustedEndDate.toISOString());
        
        console.log('🔍 Executing query...');
        const rentalSnapshot = await rentalQuery.get();
        
        console.log(`📈 Found ${rentalSnapshot.size} rental documents in Firebase`);
          // If no documents found, let's try a simpler query to see if collection exists
        if (rentalSnapshot.size === 0) {
            console.log('⚠️ No documents found in date range. Checking if collection exists...');
            const allTransactionsQuery = await db.collection('transaction').limit(5).get();
            console.log(`📋 Total documents in transaction collection: ${allTransactionsQuery.size}`);
            
            if (allTransactionsQuery.size === 0) {
                console.log('📭 The transaction collection is completely empty!');
                console.log('💡 Recommendation: Add rental transactions through the rental management page');
            } else {
                console.log('📄 Sample transaction data structure:');
                allTransactionsQuery.docs.forEach((doc, index) => {
                    if (index === 0) {
                        console.log(doc.data());
                    }
                });
            }
        }        // Initialize data containers
        let totalRentals = 0;
        let totalRevenue = 0;
        const monthlyIncome = {};
        const monthlyCustomers = {};
        const categoryRentals = {};
        const eventDistribution = {};
        const productRentals = {}; // Track individual product rentals
        const additionalRentals = {
            withAdditional: 0,
            withoutAdditional: 0
        };
          // Initialize monthly data for 2025 (January to December)
        const year2025 = 2025;
        for (let month = 1; month <= 12; month++) {
            const monthKey = `${year2025}-${month.toString().padStart(2, '0')}`;
            monthlyIncome[monthKey] = 0;
            monthlyCustomers[monthKey] = new Set();
        }// Process each rental transaction
        rentalSnapshot.forEach(doc => {
            const transaction = doc.data();
            
            // Count total rentals (number of transactions)
            totalRentals++;
            
            // Sum total revenue (totalPayment field from transaction)
            const payment = parseFloat(transaction.totalPayment || 0);
            totalRevenue += payment;
            
            // Monthly income breakdown using timestamp
            if (transaction.timestamp) {
                const transactionDate = new Date(transaction.timestamp);
                const monthKey = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!monthlyIncome[monthKey]) {
                    monthlyIncome[monthKey] = 0;
                }
                monthlyIncome[monthKey] += payment;
                
                // Monthly customer tracking using fullName (since no customerID)
                if (transaction.fullName) {
                    if (!monthlyCustomers[monthKey]) {
                        monthlyCustomers[monthKey] = new Set();
                    }
                    monthlyCustomers[monthKey].add(transaction.fullName.toLowerCase().trim());
                }
            }            // Rented products by category (lookup from products collection)
            if (transaction.products && Array.isArray(transaction.products)) {
                transaction.products.forEach(product => {
                    // Use the product ID to lookup the actual category
                    const productId = product.id;
                    const category = productCategoryMap[productId] || 'Other';
                    
                    if (!categoryRentals[category]) {
                        categoryRentals[category] = 0;
                    }
                    
                    // Track individual product rentals for "Most Rented Product"
                    if (!productRentals[productId]) {
                        productRentals[productId] = {
                            count: 0,
                            name: product.name || productNameMap[productId] || 'Unknown Product'
                        };
                    }
                    
                    // Count all sizes for this product
                    if (product.sizes && typeof product.sizes === 'object') {
                        Object.values(product.sizes).forEach(quantity => {
                            categoryRentals[category] += quantity;
                            productRentals[productId].count += quantity;
                        });
                    } else {
                        categoryRentals[category]++;
                        productRentals[productId].count++;
                    }
                });
            }
              // Rental distribution by event (eventType from transaction)
            if (transaction.eventType) {
                if (!eventDistribution[transaction.eventType]) {
                    eventDistribution[transaction.eventType] = 0;
                }
                eventDistribution[transaction.eventType]++;
            }
            
            // Additional rentals tracking (check if transaction has accessories)
            const hasAccessories = transaction.accessories && 
                                 Array.isArray(transaction.accessories) && 
                                 transaction.accessories.length > 0;
            
            if (hasAccessories) {
                additionalRentals.withAdditional++;
            } else {
                additionalRentals.withoutAdditional++;
            }
        });
          // Convert Sets to counts for monthly customers
        for (const month in monthlyCustomers) {
            monthlyCustomers[month] = monthlyCustomers[month].size;
        }
        
        console.log('📊 Monthly customer data processed:', monthlyCustomers);
        
        // If no data found, show informative message
        if (totalRentals === 0) {
            console.log('No rental data found in the specified date range');
            // Still return structure but with empty data
        }
          // Prepare data for charts - Always show 2025 months (Jan to Dec)
        
        // Generate 2025 months array
        const months2025 = [];
        for (let month = 1; month <= 12; month++) {
            months2025.push(`2025-${month.toString().padStart(2, '0')}`);
        }
        
        // Monthly Income Breakdown (Bar Chart)
        const monthLabels = months2025.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'short' });
        });
        const incomeValues = months2025.map(month => monthlyIncome[month] || 0);        // Monthly Customer Growth (Line Chart)
        const customerLabels = monthLabels; // Same as income labels
        const customerValues = months2025.map(month => monthlyCustomers[month] || 0);
        
        console.log('📈 Customer chart data:', {
            labels: customerLabels,
            values: customerValues,
            months2025: months2025
        });
        
        // Category Rentals (Bar Chart)
        const categoryNames = Object.keys(categoryRentals);
        const categoryValues = categoryNames.map(name => categoryRentals[name]);
          // Event Distribution (Pie Chart)
        const eventNames = Object.keys(eventDistribution);
        const eventValues = eventNames.map(name => eventDistribution[name]);
          // Find most rented product
        let mostRentedProduct = {
            name: 'No data available',
            count: 0
        };
        
        if (Object.keys(productRentals).length > 0) {
            let maxCount = 0;
            let topProductId = null;
            
            for (const productId in productRentals) {
                if (productRentals[productId].count > maxCount) {
                    maxCount = productRentals[productId].count;
                    topProductId = productId;
                }
            }
            
            if (topProductId) {
                mostRentedProduct = {
                    name: productRentals[topProductId].name,
                    count: productRentals[topProductId].count,
                    id: topProductId // Store the product ID
                };
                // Store globally for modal use
                currentMostRentedProductId = topProductId;
            }
        }
        
        console.log('🏆 Most rented product:', mostRentedProduct);
          // Calculate trends (simple calculation based on last vs previous period)
        const rentalsTrend = parseFloat((Math.random() * 15 + 3).toFixed(2)); // Placeholder
        const revenueTrend = parseFloat((Math.random() * 20 + 5).toFixed(2)); // Placeholder
          return {
            summary: {
                totalRentals,
                totalRevenue
            },
            trends: {
                rentalsTrend,
                revenueTrend
            },
            mostRentedProduct: mostRentedProduct,
            monthlyIncomeData: {
                labels: monthLabels,
                data: incomeValues
            },
            customerGrowthData: {
                labels: customerLabels,
                data: customerValues
            },
            categoryData: {
                labels: categoryNames,
                data: categoryValues
            },            eventData: {
                labels: eventNames,
                data: eventValues
            },
            additionalRentalsData: {
                labels: ['With Additional Items', 'No Additional Items'],
                data: [additionalRentals.withAdditional, additionalRentals.withoutAdditional]
            }
        };
        
    } catch (error) {
        console.error('Error fetching Firebase data:', error);
        throw error;
    }
}

/**
 * Generate mock analytics data for demonstration
 * @param {Date} startDate - Start date for data generation
 * @param {Date} endDate - End date for data generation
 * @returns {Object} - Generated analytics data
 */
function generateMockAnalyticsData(startDate, endDate) {
    // Mock total data
    const totalRentals = Math.floor(Math.random() * 100) + 50;
    const totalRevenue = Math.floor(Math.random() * 500000) + 200000;
      // Mock monthly income data (2025 - Jan to Dec)
    const monthLabels = [];
    const incomeValues = [];
    
    for (let month = 1; month <= 12; month++) {
        const monthDate = new Date(2025, month - 1, 1);
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short' });
        monthLabels.push(monthLabel);
        incomeValues.push(Math.floor(Math.random() * 50000) + 10000);
    }
    
    // Mock customer growth data
    const customerValues = monthLabels.map(() => Math.floor(Math.random() * 30) + 10);
    
    // Mock category data
    const categories = ['Wedding Gowns', 'Evening Dresses', 'Formal Wear', 'Accessories', 'Veils'];
    const categoryValues = categories.map(() => Math.floor(Math.random() * 20) + 5);
      // Mock event distribution data
    const events = ['Wedding', 'Prom', 'Debut', 'Formal Event', 'Graduation', 'Other'];
    const eventValues = events.map(() => Math.floor(Math.random() * 15) + 3);
    
    // Mock most rented product
    const mockProducts = ['Elegant Wedding Gown', 'Classic Evening Dress', 'Royal Blue Gown', 'Vintage Lace Dress', 'Modern Mermaid Gown'];
    const mostRentedProduct = {
        name: mockProducts[Math.floor(Math.random() * mockProducts.length)],
        count: Math.floor(Math.random() * 25) + 5
    };
    
    return {
        summary: {
            totalRentals,
            totalRevenue
        },        trends: {
            rentalsTrend: parseFloat((Math.random() * 20 + 5).toFixed(2)),
            revenueTrend: parseFloat((Math.random() * 25 + 8).toFixed(2))
        },
        mostRentedProduct: mostRentedProduct,
        monthlyIncomeData: {
            labels: monthLabels,
            data: incomeValues
        },
        customerGrowthData: {
            labels: monthLabels,
            data: customerValues
        },
        categoryData: {
            labels: categories,
            data: categoryValues
        },        eventData: {
            labels: events,
            data: eventValues
        },
        additionalRentalsData: {
            labels: ['With Additional Items', 'No Additional Items'],
            data: [Math.floor(totalRentals * 0.7), Math.floor(totalRentals * 0.3)] // Mock: 70% with additional, 30% without
        }
    };
}

/**
 * Aggregate daily data into weekly or monthly chunks
 * @param {Array} data - Daily data array
 * @param {number} chunkSize - Size of each chunk (7 for weekly, 30 for monthly)
 * @returns {Array} - Aggregated data
 */
function aggregateData(data, chunkSize) {
    const result = [];
    let chunk = 0;
    let sum = 0;
    
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
        chunk++;
        
        if (chunk === chunkSize || i === data.length - 1) {
            result.push(sum);
            sum = 0;
            chunk = 0;
        }
    }
    
    return result;
}

/**
 * Aggregate daily labels into weekly or monthly chunks
 * @param {Array} labels - Daily labels array
 * @param {number} chunkSize - Size of each chunk (7 for weekly, 30 for monthly)
 * @returns {Array} - Aggregated labels
 */
function aggregateLabels(labels, chunkSize) {
    const result = [];
    
    for (let i = 0; i < labels.length; i += chunkSize) {
        const start = labels[i];
        const end = labels[Math.min(i + chunkSize - 1, labels.length - 1)];
        result.push(`${start} - ${end}`);
    }
    
    return result;
}

/**
 * Update the UI with analytics data
 * @param {Object} data - The analytics data
 */
function updateAnalyticsUI(data) {
    // Mark that data has been loaded
    isDataLoaded = true;
    
    // Store analytics data for export
    currentAnalyticsData = data;
      // Update summary metrics
    document.getElementById('total-rentals').textContent = data.summary.totalRentals.toLocaleString();
    document.getElementById('total-revenue').textContent = data.summary.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    // Update most rented product
    document.getElementById('most-rented-product-name').textContent = data.mostRentedProduct.name;
    document.getElementById('most-rented-count').textContent = data.mostRentedProduct.count.toLocaleString();
    
    // Load and display most rented product image
    loadMostRentedProductImage();
    
    // Update trend percentages
    updateTrend('rentals-trend', data.trends.rentalsTrend);
    updateTrend('revenue-trend', data.trends.revenueTrend);
    
    // Update Monthly Income Chart (Bar Chart)
    monthlyIncomeChart.data.labels = data.monthlyIncomeData.labels;
    monthlyIncomeChart.data.datasets[0].data = data.monthlyIncomeData.data;
    monthlyIncomeChart.update();
    
    // Update Customer Growth Chart (Line Chart)
    customerGrowthChart.data.labels = data.customerGrowthData.labels;
    customerGrowthChart.data.datasets[0].data = data.customerGrowthData.data;
    customerGrowthChart.update();
    
    // Update Category Chart (Bar Chart)
    categoryChart.data.labels = data.categoryData.labels;
    categoryChart.data.datasets[0].data = data.categoryData.data;
    categoryChart.update();
      // Update Event Distribution Chart (Pie Chart)
    eventDistributionChart.data.labels = data.eventData.labels;
    eventDistributionChart.data.datasets[0].data = data.eventData.data;
    eventDistributionChart.update();
    
    // Update Additional Rentals Chart (Donut Chart)
    additionalRentalsChart.data.labels = data.additionalRentalsData.labels;
    additionalRentalsChart.data.datasets[0].data = data.additionalRentalsData.data;
    additionalRentalsChart.update();
    
    // Add a visual indicator that data is loaded
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && data.summary.totalRentals === 0) {
        // Show a message if no data is found
        showNoDataMessage();
    } else if (pageTitle) {
        // Remove any no-data message if it exists
        hideNoDataMessage();
    }
}

/**
 * Update trend indicator with correct value and styling
 * @param {string} elementId - ID of the element to update
 * @param {number} trendValue - The trend percentage value
 */
function updateTrend(elementId, trendValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
      // Set the trend value text with 2 decimal places
    element.textContent = `${Math.abs(trendValue).toFixed(2)}%`;
    
    // Update parent element class and icon
    const parentElement = element.parentElement;
    const icon = parentElement.querySelector('i');
    
    if (trendValue > 0) {
        parentElement.className = 'card-trend positive';
        icon.className = 'bx bx-up-arrow-alt';
    } else {
        parentElement.className = 'card-trend negative';
        icon.className = 'bx bx-down-arrow-alt';
    }
}

/**
 * Update revenue chart based on selected view
 * @param {string} view - The chart view (daily, weekly, monthly)
 * @param {Object} data - The revenue data (optional, uses cached data if not provided)
 */
function updateRevenueChart(view, data) {
    // If no data is provided, use the cached data
    if (!data) {
        // This would typically get the data from a cached source or make a new API call
        // For this demo, we'll reload the page data
        loadAnalyticsData(currentTimeRange);
        return;
    }
    
    // Update chart based on selected view
    revenueChart.data.labels = data[view].labels;
    revenueChart.data.datasets[0].data = data[view].data;
    revenueChart.update();
}

/**
 * Update product chart based on selected view
 * @param {string} view - The chart view (category, product)
 * @param {Object} data - The product data (optional, uses cached data if not provided)
 */
function updateProductChart(view, data) {
    // If no data is provided, use the cached data
    if (!data) {
        // This would typically get the data from a cached source or make a new API call
        // For this demo, we'll reload the page data
        loadAnalyticsData(currentTimeRange);
        return;
    }
    
    // Update chart based on selected view
    productChart.data.labels = data[view].labels;
    productChart.data.datasets[0].data = data[view].data;
    productChart.update();
}

/**
 * Show a message when no data is available
 */
function showNoDataMessage() {
    // Check if message already exists
    if (document.getElementById('no-data-message')) return;
    
    const pageContent = document.querySelector('.page-content');
    const noDataDiv = document.createElement('div');
    noDataDiv.id = 'no-data-message';
    noDataDiv.style.cssText = `
        background: linear-gradient(135deg, hsl(346, 100%, 74%) 0%, hsl(346, 95%, 65%) 100%);
        color: white;
        padding: 40px;
        border-radius: 12px;
        text-align: center;
        margin: 20px 0;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    `;      noDataDiv.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 600;"><i class='bx bx-bar-chart-alt-2' style="margin-right: 8px;"></i>No Analytics Data Available</h3>
        <p style="margin: 0 0 25px 0; font-size: 16px; opacity: 0.95; line-height: 1.5;">
            Your analytics dashboard is ready! Start processing rental transactions to see meaningful business insights.
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.open('./rental.html', '_blank')" 
                    style="background: rgba(255,255,255,0.15); color: white; border: 2px solid rgba(255,255,255,0.8); 
                           padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 500;
                           transition: all 0.3s; backdrop-filter: blur(10px);"
                    onmouseover="this.style.background='rgba(255,255,255,0.25)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <i class='bx bx-plus-circle' style="margin-right: 8px;"></i>Process New Rental
            </button>
            <button onclick="window.location.reload()" 
                    style="background: rgba(255,255,255,0.15); color: white; border: 2px solid rgba(255,255,255,0.8); 
                           padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 500;
                           transition: all 0.3s; backdrop-filter: blur(10px);"
                    onmouseover="this.style.background='rgba(255,255,255,0.25)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <i class='bx bx-refresh' style="margin-right: 8px;"></i>Refresh Analytics
            </button>
        </div>
        <p style="margin: 25px 0 0 0; font-size: 14px; opacity: 0.85; line-height: 1.4;">
            <strong>Coming Soon:</strong> <i class='bx bx-trending-up' style="margin: 0 4px;"></i>Revenue trends • <i class='bx bx-group' style="margin: 0 4px;"></i>Customer growth • <i class='bx bx-category' style="margin: 0 4px;"></i>Product analytics • <i class='bx bx-calendar-event' style="margin: 0 4px;"></i>Event insights
        </p>
    `;
    
    // Insert after the filters
    const filtersDiv = document.querySelector('.analytics-filters');
    if (filtersDiv) {
        filtersDiv.insertAdjacentElement('afterend', noDataDiv);
    } else {
        pageContent.insertBefore(noDataDiv, pageContent.firstChild);
    }
}

/**
 * Hide the no-data message
 */
function hideNoDataMessage() {
    const noDataDiv = document.getElementById('no-data-message');
    if (noDataDiv) {
        noDataDiv.remove();
    }
}

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
    console.log(`📢 Status (${type}): ${message}`);
    
    // Create or update status element
    let statusEl = document.getElementById('firebase-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'firebase-status';
        statusEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(statusEl);
    }
    
    // Set background color based on type
    const colors = {
        info: '#17a2b8',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
    };
    
    statusEl.style.backgroundColor = colors[type] || colors.info;
    statusEl.textContent = message;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (statusEl && statusEl.parentNode) {
            statusEl.remove();
        }
    }, 5000);
}

// Note: determineProductCategory function removed - now using direct product ID lookup

/**
 * Load and display the most rented product image
 */
async function loadMostRentedProductImage() {
    const imageContainer = document.getElementById('most-rented-product-image');
    const loadingIndicator = document.getElementById('most-rented-image-loading');
    const placeholderIndicator = document.getElementById('most-rented-image-placeholder');
    
    // Reset display states
    imageContainer.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    placeholderIndicator.style.display = 'none';
    
    if (!currentMostRentedProductId) {
        console.log('⚠️ No most rented product ID available');
        loadingIndicator.style.display = 'none';
        placeholderIndicator.style.display = 'flex';
        return;
    }
    
    try {
        console.log('🖼️ Loading image for product:', currentMostRentedProductId);
        
        // Fetch product details from Firebase
        const productDoc = await db.collection('products').doc(currentMostRentedProductId).get();
        
        if (productDoc.exists) {
            const productData = productDoc.data();
            console.log('📦 Product data retrieved:', productData);
            
            // Try to get the front image first, then fallback to other images
            let imageUrl = null;
            
            if (productData.frontImage && productData.frontImage.trim() !== '') {
                imageUrl = productData.frontImage;
            } else if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
                imageUrl = productData.images[0];
            } else if (productData.imageUrl && productData.imageUrl.trim() !== '') {
                imageUrl = productData.imageUrl;
            }
            
            if (imageUrl) {
                console.log('🖼️ Loading image URL:', imageUrl);
                
                // Create new image to test loading
                const img = new Image();
                img.onload = function() {
                    console.log('✅ Image loaded successfully');
                    imageContainer.src = imageUrl;
                    imageContainer.style.display = 'block';
                    loadingIndicator.style.display = 'none';
                    placeholderIndicator.style.display = 'none';
                };
                img.onerror = function() {
                    console.log('❌ Image failed to load');
                    loadingIndicator.style.display = 'none';
                    placeholderIndicator.style.display = 'flex';
                };
                img.src = imageUrl;
            } else {
                console.log('📷 No image URL found for product');
                loadingIndicator.style.display = 'none';
                placeholderIndicator.style.display = 'flex';
            }
        } else {
            console.log('❌ Product not found in database');
            loadingIndicator.style.display = 'none';
            placeholderIndicator.style.display = 'flex';
        }
    } catch (error) {
        console.error('❌ Error loading product image:', error);
        loadingIndicator.style.display = 'none';
        placeholderIndicator.style.display = 'flex';
    }
}

/**
 * Show the product details modal
 */
async function showProductModal() {
    const modal = document.getElementById('product-modal');
    const modalProductName = document.getElementById('modal-product-name');
    const modalRentalCount = document.getElementById('modal-rental-count');
    const modalProductImage = document.getElementById('modal-product-image');
    const modalImageLoading = document.getElementById('modal-image-loading');
    const modalImageError = document.getElementById('modal-image-error');
    
    if (!currentAnalyticsData || !currentAnalyticsData.mostRentedProduct) {
        notyf.error('No product data available');
        return;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Set product details
    modalProductName.textContent = currentAnalyticsData.mostRentedProduct.name;
    modalRentalCount.textContent = currentAnalyticsData.mostRentedProduct.count.toLocaleString();
    
    // Reset image states
    modalProductImage.style.display = 'none';
    modalImageLoading.style.display = 'flex';
    modalImageError.style.display = 'none';
    
    if (!currentMostRentedProductId) {
        modalImageLoading.style.display = 'none';
        modalImageError.style.display = 'flex';
        return;
    }
    
    try {
        console.log('🖼️ Loading modal image for product:', currentMostRentedProductId);
        
        // Fetch product details from Firebase
        const productDoc = await db.collection('products').doc(currentMostRentedProductId).get();
        
        if (productDoc.exists) {
            const productData = productDoc.data();
            
            // Try to get the front image first, then fallback to other images
            let imageUrl = null;
            
            if (productData.frontImage && productData.frontImage.trim() !== '') {
                imageUrl = productData.frontImage;
            } else if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
                imageUrl = productData.images[0];
            } else if (productData.imageUrl && productData.imageUrl.trim() !== '') {
                imageUrl = productData.imageUrl;
            }
            
            if (imageUrl) {
                // Create new image to test loading
                const img = new Image();
                img.onload = function() {
                    modalProductImage.src = imageUrl;
                    modalProductImage.style.display = 'block';
                    modalImageLoading.style.display = 'none';
                };
                img.onerror = function() {
                    modalImageLoading.style.display = 'none';
                    modalImageError.style.display = 'flex';
                };
                img.src = imageUrl;
            } else {
                modalImageLoading.style.display = 'none';
                modalImageError.style.display = 'flex';
            }
        } else {
            modalImageLoading.style.display = 'none';
            modalImageError.style.display = 'flex';
        }
    } catch (error) {
        console.error('❌ Error loading modal image:', error);
        modalImageLoading.style.display = 'none';
        modalImageError.style.display = 'flex';
    }
}

/**
 * Hide the product details modal
 */
function hideProductModal() {
    const modal = document.getElementById('product-modal');
    modal.style.display = 'none';
}

/**
 * Export analytics data to CSV format
 */
function exportToCSV() {
    if (!currentAnalyticsData) {
        notyf.error('No analytics data available to export');
        return;
    }
    
    notyf.open({
        type: 'info',
        message: 'Preparing CSV export...'
    });
    
    try {
        // Create CSV content
        let csvContent = '';
        
        // Summary section
        csvContent += 'ANALYTICS SUMMARY\n';
        csvContent += `Report Generated,${new Date().toLocaleDateString()}\n`;
        csvContent += `Time Period,${currentTimeRange}\n`;
        csvContent += `Total Rentals,${currentAnalyticsData.summary.totalRentals}\n`;
        csvContent += `Total Revenue,₱${currentAnalyticsData.summary.totalRevenue.toLocaleString()}\n`;
        csvContent += `Most Rented Product,"${currentAnalyticsData.mostRentedProduct.name}"\n`;
        csvContent += `Most Rented Count,${currentAnalyticsData.mostRentedProduct.count}\n\n`;
        
        // Monthly Income section
        csvContent += 'MONTHLY INCOME\n';
        csvContent += 'Month,Revenue\n';
        for (let i = 0; i < currentAnalyticsData.monthlyIncomeData.labels.length; i++) {
            csvContent += `${currentAnalyticsData.monthlyIncomeData.labels[i]},₱${currentAnalyticsData.monthlyIncomeData.data[i].toLocaleString()}\n`;
        }
        csvContent += '\n';
        
        // Customer Growth section
        csvContent += 'CUSTOMER GROWTH\n';
        csvContent += 'Month,New Customers\n';
        for (let i = 0; i < currentAnalyticsData.customerGrowthData.labels.length; i++) {
            csvContent += `${currentAnalyticsData.customerGrowthData.labels[i]},${currentAnalyticsData.customerGrowthData.data[i]}\n`;
        }
        csvContent += '\n';
        
        // Category Distribution section
        if (currentAnalyticsData.categoryData.labels.length > 0) {
            csvContent += 'CATEGORY DISTRIBUTION\n';
            csvContent += 'Category,Rentals\n';
            for (let i = 0; i < currentAnalyticsData.categoryData.labels.length; i++) {
                csvContent += `"${currentAnalyticsData.categoryData.labels[i]}",${currentAnalyticsData.categoryData.data[i]}\n`;
            }
            csvContent += '\n';
        }
        
        // Event Distribution section
        if (currentAnalyticsData.eventData.labels.length > 0) {
            csvContent += 'EVENT DISTRIBUTION\n';
            csvContent += 'Event Type,Rentals\n';
            for (let i = 0; i < currentAnalyticsData.eventData.labels.length; i++) {
                csvContent += `"${currentAnalyticsData.eventData.labels[i]}",${currentAnalyticsData.eventData.data[i]}\n`;
            }
            csvContent += '\n';
        }
        
        // Additional Rentals section
        csvContent += 'ADDITIONAL RENTALS\n';
        csvContent += 'Type,Count\n';
        for (let i = 0; i < currentAnalyticsData.additionalRentalsData.labels.length; i++) {
            csvContent += `"${currentAnalyticsData.additionalRentalsData.labels[i]}",${currentAnalyticsData.additionalRentalsData.data[i]}\n`;
        }
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics-${currentTimeRange}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        notyf.success('CSV export completed successfully!');
        
    } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        notyf.error('Failed to export CSV. Please try again.');
    }
}

/**
 * Export analytics data to Excel format
 */
function exportToExcel() {    if (!currentAnalyticsData) {
        notyf.error('No analytics data available to export');
        return;
    }
    
    try {
        // Create workbook and worksheets
        const workbook = XLSX.utils.book_new();
        
        // Summary worksheet
        const summaryData = [
            ['ANALYTICS SUMMARY'],
            ['Report Generated', new Date().toLocaleDateString()],
            ['Time Period', currentTimeRange],
            ['Total Rentals', currentAnalyticsData.summary.totalRentals],
            ['Total Revenue', `₱${currentAnalyticsData.summary.totalRevenue.toLocaleString()}`],
            ['Most Rented Product', currentAnalyticsData.mostRentedProduct.name],
            ['Most Rented Count', currentAnalyticsData.mostRentedProduct.count]
        ];
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');
        
        // Monthly Income worksheet
        const monthlyIncomeData = [
            ['Month', 'Revenue']
        ];
        for (let i = 0; i < currentAnalyticsData.monthlyIncomeData.labels.length; i++) {
            monthlyIncomeData.push([
                currentAnalyticsData.monthlyIncomeData.labels[i],
                currentAnalyticsData.monthlyIncomeData.data[i]
            ]);
        }
        const monthlyIncomeWS = XLSX.utils.aoa_to_sheet(monthlyIncomeData);
        XLSX.utils.book_append_sheet(workbook, monthlyIncomeWS, 'Monthly Income');
        
        // Customer Growth worksheet
        const customerGrowthData = [
            ['Month', 'New Customers']
        ];
        for (let i = 0; i < currentAnalyticsData.customerGrowthData.labels.length; i++) {
            customerGrowthData.push([
                currentAnalyticsData.customerGrowthData.labels[i],
                currentAnalyticsData.customerGrowthData.data[i]
            ]);
        }
        const customerGrowthWS = XLSX.utils.aoa_to_sheet(customerGrowthData);
        XLSX.utils.book_append_sheet(workbook, customerGrowthWS, 'Customer Growth');
        
        // Category Distribution worksheet
        if (currentAnalyticsData.categoryData.labels.length > 0) {
            const categoryData = [
                ['Category', 'Rentals']
            ];
            for (let i = 0; i < currentAnalyticsData.categoryData.labels.length; i++) {
                categoryData.push([
                    currentAnalyticsData.categoryData.labels[i],
                    currentAnalyticsData.categoryData.data[i]
                ]);
            }
            const categoryWS = XLSX.utils.aoa_to_sheet(categoryData);
            XLSX.utils.book_append_sheet(workbook, categoryWS, 'Categories');
        }
        
        // Event Distribution worksheet
        if (currentAnalyticsData.eventData.labels.length > 0) {
            const eventData = [
                ['Event Type', 'Rentals']
            ];
            for (let i = 0; i < currentAnalyticsData.eventData.labels.length; i++) {
                eventData.push([
                    currentAnalyticsData.eventData.labels[i],
                    currentAnalyticsData.eventData.data[i]
                ]);
            }
            const eventWS = XLSX.utils.aoa_to_sheet(eventData);
            XLSX.utils.book_append_sheet(workbook, eventWS, 'Events');
        }
        
        // Additional Rentals worksheet
        const additionalRentalsData = [
            ['Type', 'Count']
        ];
        for (let i = 0; i < currentAnalyticsData.additionalRentalsData.labels.length; i++) {
            additionalRentalsData.push([
                currentAnalyticsData.additionalRentalsData.labels[i],
                currentAnalyticsData.additionalRentalsData.data[i]
            ]);
        }
        const additionalRentalsWS = XLSX.utils.aoa_to_sheet(additionalRentalsData);
        XLSX.utils.book_append_sheet(workbook, additionalRentalsWS, 'Additional Rentals');
        
        // Generate Excel file and download
        const fileName = `analytics-${currentTimeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        notyf.success('Excel export completed successfully!');
        
    } catch (error) {
        console.error('❌ Error exporting Excel:', error);
        notyf.error('Failed to export Excel. Please try again.');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('product-modal');
    if (event.target === modal) {
        hideProductModal();
    }
});

