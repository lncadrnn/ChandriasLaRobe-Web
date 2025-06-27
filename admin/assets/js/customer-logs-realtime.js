// Customer Logs Real-time Update System
// Handles immediate UI updates without page refresh

// Initialize Notyf globally
window.notyf = new Notyf({
    duration: 4000,
    position: {
        x: 'center',
        y: 'top'
    },
    dismissible: true
});

// Function to show rental cancelled notification
function showRentalCancelledNotification() {
    window.notyf.error({
        message: 'Rental Cancelled Successfully!',
        duration: 5000,
        background: '#ef4444',
        icon: {
            className: 'bx bx-check-circle',
            tagName: 'i',
            color: 'white'
        }
    });
}

// Real-time update system for immediate UI changes
window.realTimeUpdater = {
    // Force immediate re-render of the current view
    updateView: function() {
        console.log('🔄 RealTimeUpdater: Updating view, currentView:', window.currentView);
        
        // Get the current view from the active view button if window.currentView is not set
        let currentView = window.currentView;
        if (!currentView) {
            const activeViewBtn = document.querySelector('.view-btn.active');
            currentView = activeViewBtn ? activeViewBtn.getAttribute('data-view') : 'cards';
            console.log('🔄 RealTimeUpdater: Detected view from DOM:', currentView);
        }
        
        if (currentView === 'cards') {
            if (window.renderTransactionCards) {
                console.log('🔄 RealTimeUpdater: Calling renderTransactionCards()');
                window.renderTransactionCards();
            } else {
                console.warn('⚠️ RealTimeUpdater: renderTransactionCards function not found');
            }
        } else {
            if (window.renderTransactionTable) {
                console.log('🔄 RealTimeUpdater: Calling renderTransactionTable()');
                window.renderTransactionTable();
            } else {
                console.warn('⚠️ RealTimeUpdater: renderTransactionTable function not found');
            }
        }
        // Update transaction counts
        this.updateTransactionCounts();
    },

    // Update transaction counts in real-time
    updateTransactionCounts: function() {
        const count = window.filteredTransactions ? window.filteredTransactions.length : 0;
        const countElement = document.getElementById('transaction-count');
        const countElementMobile = document.getElementById('transaction-count-mobile');
        
        console.log('🔄 RealTimeUpdater: Updating transaction count to:', count);
        
        if (countElement) countElement.textContent = count;
        if (countElementMobile) countElementMobile.textContent = count;
    },

    // Force update local data and re-render (like renderAppointments in dashboard)
    forceUpdate: function() {
        console.log('🔄 RealTimeUpdater: Force updating...');
        
        // Trigger a re-filter to ensure consistency (similar to renderAppointments)
        if (window.filterTransactions) {
            console.log('🔄 RealTimeUpdater: Calling filterTransactions()');
            window.filterTransactions();
        } else {
            console.warn('⚠️ RealTimeUpdater: filterTransactions function not found');
        }
        
        // Force view update
        this.updateView();
        
        // Update global references
        if (window.allTransactions) {
            window.filteredTransactions = window.allTransactions.slice();
            console.log('🔄 RealTimeUpdater: Updated filteredTransactions array');
        }
    },

    // Update specific transaction in real-time
    updateTransaction: function(transactionId, updates) {
        console.log('🔄 RealTimeUpdater: Updating transaction:', transactionId, updates);
        
        // Update in allTransactions
        if (window.allTransactions) {
            const index = window.allTransactions.findIndex(t => t.id === transactionId);
            if (index !== -1) {
                Object.assign(window.allTransactions[index], updates);
                console.log('🔄 RealTimeUpdater: Updated in allTransactions');
            } else {
                console.warn('⚠️ RealTimeUpdater: Transaction not found in allTransactions');
            }
        }
        
        // Update in filteredTransactions
        if (window.filteredTransactions) {
            const filteredIndex = window.filteredTransactions.findIndex(t => t.id === transactionId);
            if (filteredIndex !== -1) {
                Object.assign(window.filteredTransactions[filteredIndex], updates);
                console.log('🔄 RealTimeUpdater: Updated in filteredTransactions');
            } else {
                console.warn('⚠️ RealTimeUpdater: Transaction not found in filteredTransactions');
            }
        }
        
        // Force immediate UI update
        this.updateView();
    },

    // Remove transaction from view in real-time
    removeTransaction: function(transactionId) {
        console.log('🔄 RealTimeUpdater: Removing transaction:', transactionId);
        
        // Remove from allTransactions
        if (window.allTransactions) {
            const originalLength = window.allTransactions.length;
            window.allTransactions = window.allTransactions.filter(t => t.id !== transactionId);
            console.log('🔄 RealTimeUpdater: Removed from allTransactions, count change:', originalLength, '->', window.allTransactions.length);
        }
        
        // Remove from filteredTransactions
        if (window.filteredTransactions) {
            const originalLength = window.filteredTransactions.length;
            window.filteredTransactions = window.filteredTransactions.filter(t => t.id !== transactionId);
            console.log('🔄 RealTimeUpdater: Removed from filteredTransactions, count change:', originalLength, '->', window.filteredTransactions.length);
        }
        
        // Force immediate UI update
        this.updateView();
    }
};

// Enhanced notification system with real-time updates
window.showSuccessNotification = function(message, updateCallback) {
    window.notyf.success({
        message: message,
        duration: 4000,
        background: '#28a745',
        icon: {
            className: 'bx bx-check-circle',
            tagName: 'i',
            color: 'white'
        }
    });
    
    // Execute update callback for real-time changes
    if (updateCallback && typeof updateCallback === 'function') {
        setTimeout(updateCallback, 100); // Small delay to ensure smooth transition
    }
};

window.showErrorNotification = function(message) {
    window.notyf.error({
        message: message,
        duration: 5000,
        background: '#ef4444',
        icon: {
            className: 'bx bx-x-circle',
            tagName: 'i',
            color: 'white'
        }
    });
};

// Override the existing notification function to include real-time updates
window.showRentalCancelledNotification = function() {
    console.log('🔔 RealTimeUpdater: Showing rental cancelled notification');
    
    window.notyf.error({
        message: 'Rental Cancelled Successfully!',
        duration: 5000,
        background: '#ef4444',
        icon: {
            className: 'bx bx-check-circle',
            tagName: 'i',
            color: 'white'
        }
    });
    
    // Force real-time UI update immediately (like dashboard does with renderAppointments)
    console.log('🔄 RealTimeUpdater: Triggering immediate UI update after cancellation');
    
    // Call the main render functions directly (similar to dashboard approach)
    if (window.renderTransactionCards && window.renderTransactionTable) {
        // Get current view
        let currentView = window.currentView;
        if (!currentView) {
            const activeViewBtn = document.querySelector('.view-btn.active');
            currentView = activeViewBtn ? activeViewBtn.getAttribute('data-view') : 'cards';
        }
        
        if (currentView === 'cards') {
            console.log('🔄 RealTimeUpdater: Direct call to renderTransactionCards');
            window.renderTransactionCards();
        } else {
            console.log('🔄 RealTimeUpdater: Direct call to renderTransactionTable');
            window.renderTransactionTable();
        }
    } else {
        console.warn('⚠️ RealTimeUpdater: Render functions not available, using updater fallback');
        if (window.realTimeUpdater) {
            window.realTimeUpdater.forceUpdate();
        }
    }
};

// Real-time event handlers for immediate UI feedback
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 RealTimeUpdater: DOM loaded, initializing...');
    
    // Debug: Check if required functions are available
    console.log('🔍 RealTimeUpdater: Checking function availability:', {
        renderTransactionCards: typeof window.renderTransactionCards,
        renderTransactionTable: typeof window.renderTransactionTable,
        filterTransactions: typeof window.filterTransactions,
        allTransactions: !!window.allTransactions,
        filteredTransactions: !!window.filteredTransactions,
        currentView: window.currentView
    });
    
    // Override any existing functions to include real-time updates
    const originalConfirmCancelRental = window.confirmCancelRental;
    if (originalConfirmCancelRental) {
        console.log('🔄 RealTimeUpdater: Overriding confirmCancelRental function');
        window.confirmCancelRental = function() {
            console.log('🔔 RealTimeUpdater: confirmCancelRental called');
            originalConfirmCancelRental.call(this);
            // Ensure UI updates immediately
            setTimeout(() => {
                console.log('🔄 RealTimeUpdater: Post-cancel UI update triggered');
                if (window.realTimeUpdater) {
                    window.realTimeUpdater.forceUpdate();
                }
            }, 500);
        };
    } else {
        console.warn('⚠️ RealTimeUpdater: confirmCancelRental function not found for override');
    }
    
    // Add a test function for debugging
    window.testRealTimeUpdate = function() {
        console.log('🧪 Testing real-time update system...');
        if (window.realTimeUpdater) {
            window.realTimeUpdater.updateView();
        }
    };
    
    console.log('✅ RealTimeUpdater: Initialization complete');
});

// Auto-refresh mechanism for real-time sync (optional - can be disabled)
window.autoRefreshEnabled = false; // Set to true if you want periodic auto-refresh

if (window.autoRefreshEnabled) {
    setInterval(() => {
        if (window.realTimeUpdater && !document.querySelector('.modal-overlay.show')) {
            // Only auto-refresh if no modals are open
            window.realTimeUpdater.forceUpdate();
        }
    }, 30000); // Refresh every 30 seconds
}

// Export the main function for global access
window.showRentalCancelledNotification = showRentalCancelledNotification;
