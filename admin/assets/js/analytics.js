/**
 * Analytics Dashboard JavaScript
 * Responsible for loading and visualizing business analytics data
 */

// Firebase Configuration and Initialization
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let revenueChart, productChart, statusChart, retentionChart;
let currentTimeRange = '30days';
let selectedChartViews = {
    revenue: 'daily',
    product: 'category'
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Revenue',
                data: [],
                backgroundColor: 'rgba(255, 105, 180, 0.2)',
                borderColor: 'hsl(346, 100%, 74%)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'hsl(346, 100%, 74%)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
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
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(255, 105, 180, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += '₱' + context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            }
                            return label;
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
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    // Product Chart
    const productCtx = document.getElementById('product-chart').getContext('2d');
    productChart = new Chart(productCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Revenue',
                data: [],
                backgroundColor: [
                    'rgba(255, 105, 180, 0.7)',
                    'rgba(255, 105, 180, 0.6)',
                    'rgba(255, 105, 180, 0.5)',
                    'rgba(255, 105, 180, 0.4)',
                    'rgba(255, 105, 180, 0.3)'
                ],
                borderColor: [
                    'rgba(255, 105, 180, 1)',
                    'rgba(255, 105, 180, 0.9)',
                    'rgba(255, 105, 180, 0.8)',
                    'rgba(255, 105, 180, 0.7)',
                    'rgba(255, 105, 180, 0.6)'
                ],
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
                    borderColor: 'rgba(255, 105, 180, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += '₱' + context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            }
                            return label;
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
    });
    
    // Status Chart
    const statusCtx = document.getElementById('status-chart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Ongoing', 'Upcoming', 'Cancelled'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#28a745', // Success - Completed
                    '#17a2b8', // Info - Ongoing
                    '#ffc107', // Warning - Upcoming
                    '#dc3545'  // Danger - Cancelled
                ],
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
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
                            const label = context.label;
                            const value = context.raw;
                            const percentage = ((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Retention Chart
    const retentionCtx = document.getElementById('retention-chart').getContext('2d');
    retentionChart = new Chart(retentionCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'New Customers',
                data: [],
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: '#28a745',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            },
            {
                label: 'Returning Customers',
                data: [],
                backgroundColor: 'rgba(23, 162, 184, 0.2)',
                borderColor: '#17a2b8',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: '#17a2b8',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    padding: 12
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
                        precision: 0
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
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            loadAnalyticsData(selectedPeriod);
        }
    });
    
    // Apply custom date range
    const applyDateRangeBtn = document.getElementById('apply-date-range');
    applyDateRangeBtn.addEventListener('click', function() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (startDate && endDate) {
            loadAnalyticsData('custom', {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
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
                loadAnalyticsData('custom', {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                });
            } else {
                alert('Please select both start and end dates');
            }
        } else {
            loadAnalyticsData(currentTimeRange);
        }
    });
    
    // Chart view toggles for Revenue Chart
    const revenueChartViewBtns = document.querySelectorAll('.revenue-chart-container .chart-view-btn');
    revenueChartViewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            selectedChartViews.revenue = view;
            
            // Update active button
            revenueChartViewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart data based on view
            updateRevenueChart(view);
        });
    });
    
    // Chart view toggles for Product Chart
    const productChartViewBtns = document.querySelectorAll('.product-chart-container .chart-view-btn');
    productChartViewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            selectedChartViews.product = view;
            
            // Update active button
            productChartViewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart data based on view
            updateProductChart(view);
        });
    });
}

/**
 * Load analytics data based on selected time period
 * @param {string} timePeriod - Time period to load data for
 * @param {Object} customDates - Custom date range (for 'custom' time period)
 */
function loadAnalyticsData(timePeriod, customDates = null) {
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
    }
    
    // For demo purposes, we'll generate mock data
    // In a real application, you would fetch this data from Firebase
    const analyticsData = generateMockAnalyticsData(startDate, endDate);
    
    // Update UI with the data
    updateAnalyticsUI(analyticsData);
    
    // Hide action spinner after data is loaded
    if (actionSpinner) {
        setTimeout(() => {
            actionSpinner.style.display = 'none';
        }, 500);
    }
}

/**
 * Generate mock analytics data for demonstration
 * In a real app, this would be replaced with actual data from Firebase
 * @param {Date} startDate - Start date for data generation
 * @param {Date} endDate - End date for data generation
 * @returns {Object} - Generated analytics data
 */
function generateMockAnalyticsData(startDate, endDate) {
    // Calculate date difference in days
    const dateDiff = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000));
    
    // Generate daily revenue data
    const dailyRevenue = [];
    const dailyLabels = [];
    let totalRevenue = 0;
    
    for (let i = 0; i <= dateDiff; i++) {
        const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyLabels.push(formattedDate);
        
        // Generate random revenue (between 5000 and 25000)
        const revenue = Math.floor(Math.random() * 20000) + 5000;
        dailyRevenue.push(revenue);
        totalRevenue += revenue;
    }
    
    // Generate weekly and monthly aggregated data
    const weeklyRevenue = aggregateData(dailyRevenue, 7);
    const weeklyLabels = aggregateLabels(dailyLabels, 7);
    
    const monthlyRevenue = aggregateData(dailyRevenue, 30);
    const monthlyLabels = aggregateLabels(dailyLabels, 30);
    
    // Generate product data
    const productCategories = ['Wedding Gowns', 'Formal Dresses', 'Evening Gowns', 'Accessories', 'Other'];
    const productCategoryRevenue = productCategories.map(() => Math.floor(Math.random() * 50000) + 10000);
    
    const products = [
        'Classic White Wedding Gown', 
        'Lace Formal Dress', 
        'Sequin Evening Gown', 
        'Pearl Accessory Set', 
        'Vintage Bridal Veil'
    ];
    const productRevenue = products.map(() => Math.floor(Math.random() * 30000) + 5000);
    
    // Generate rental status data
    const statusCounts = {
        completed: Math.floor(Math.random() * 50) + 30,
        ongoing: Math.floor(Math.random() * 20) + 10,
        upcoming: Math.floor(Math.random() * 30) + 20,
        cancelled: Math.floor(Math.random() * 10) + 5
    };
    
    const totalRentals = statusCounts.completed + statusCounts.ongoing + statusCounts.upcoming + statusCounts.cancelled;
    
    // Generate customer retention data
    const retentionLabels = [];
    const newCustomers = [];
    const returningCustomers = [];
    
    // For weekly data points
    const weeksCount = Math.ceil(dateDiff / 7);
    for (let i = 0; i < weeksCount; i++) {
        const weekStart = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
        const weekEnd = new Date(Math.min(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000), endDate.getTime()));
        
        const formattedDate = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        retentionLabels.push(formattedDate);
        
        newCustomers.push(Math.floor(Math.random() * 15) + 5);
        returningCustomers.push(Math.floor(Math.random() * 10) + 10);
    }
    
    const totalNewCustomers = newCustomers.reduce((sum, val) => sum + val, 0);
    const totalReturningCustomers = returningCustomers.reduce((sum, val) => sum + val, 0);
    const totalCustomers = totalNewCustomers + totalReturningCustomers;
    
    return {
        summary: {
            totalRevenue,
            totalRentals,
            avgRentalValue: Math.floor(totalRevenue / totalRentals),
            conversionRate: Math.floor(Math.random() * 30) + 20
        },
        trends: {
            revenueTrend: Math.floor(Math.random() * 30) - 10, // Between -10% and +20%
            rentalsTrend: Math.floor(Math.random() * 25) - 5,  // Between -5% and +20%
            conversionTrend: Math.floor(Math.random() * 20) - 15, // Between -15% and +5%
            avgValueTrend: Math.floor(Math.random() * 15) + 5  // Between +5% and +20%
        },
        revenueData: {
            daily: {
                labels: dailyLabels,
                data: dailyRevenue
            },
            weekly: {
                labels: weeklyLabels,
                data: weeklyRevenue
            },
            monthly: {
                labels: monthlyLabels,
                data: monthlyRevenue
            }
        },
        productData: {
            category: {
                labels: productCategories,
                data: productCategoryRevenue
            },
            product: {
                labels: products,
                data: productRevenue
            }
        },
        statusData: {
            labels: ['Completed', 'Ongoing', 'Upcoming', 'Cancelled'],
            data: [statusCounts.completed, statusCounts.ongoing, statusCounts.upcoming, statusCounts.cancelled]
        },
        customerData: {
            new: totalNewCustomers,
            returning: totalReturningCustomers,
            total: totalCustomers,
            retentionRate: Math.floor((totalReturningCustomers / totalCustomers) * 100),
            timeSeries: {
                labels: retentionLabels,
                newData: newCustomers,
                returningData: returningCustomers
            }
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
    // Update summary metrics
    document.getElementById('total-revenue').textContent = data.summary.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('total-rentals').textContent = data.summary.totalRentals.toLocaleString();
    document.getElementById('conversion-rate').textContent = data.summary.conversionRate.toLocaleString();
    document.getElementById('avg-rental-value').textContent = data.summary.avgRentalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    // Update trend percentages
    updateTrend('revenue-trend', data.trends.revenueTrend);
    updateTrend('rentals-trend', data.trends.rentalsTrend);
    updateTrend('conversion-trend', data.trends.conversionTrend);
    updateTrend('avg-value-trend', data.trends.avgValueTrend);
    
    // Update charts with initial views
    updateRevenueChart(selectedChartViews.revenue, data.revenueData);
    updateProductChart(selectedChartViews.product, data.productData);
    
    // Update status chart
    statusChart.data.datasets[0].data = data.statusData.data;
    statusChart.update();
    
    // Update retention metrics
    document.getElementById('new-customers').textContent = data.customerData.new.toLocaleString();
    document.getElementById('returning-customers').textContent = data.customerData.returning.toLocaleString();
    document.getElementById('retention-rate').textContent = data.customerData.retentionRate.toLocaleString();
    
    const newPct = Math.round((data.customerData.new / data.customerData.total) * 100);
    const returningPct = Math.round((data.customerData.returning / data.customerData.total) * 100);
    
    document.getElementById('new-customers-pct').textContent = newPct;
    document.getElementById('returning-customers-pct').textContent = returningPct;
    
    // Update retention chart
    retentionChart.data.labels = data.customerData.timeSeries.labels;
    retentionChart.data.datasets[0].data = data.customerData.timeSeries.newData;
    retentionChart.data.datasets[1].data = data.customerData.timeSeries.returningData;
    retentionChart.update();
}

/**
 * Update trend indicator with correct value and styling
 * @param {string} elementId - ID of the element to update
 * @param {number} trendValue - The trend percentage value
 */
function updateTrend(elementId, trendValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Set the trend value text
    element.textContent = `${Math.abs(trendValue)}%`;
    
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
