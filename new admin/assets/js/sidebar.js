// =============== SIDEBAR FUNCTIONALITY ===============
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const mainContent = document.getElementById('mainContent');
      // Initialize sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    const toggleIcon = toggleBtn.querySelector('i');
    
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        toggleIcon.className = 'bx bx-chevron-right';
    } else {
        toggleIcon.className = 'bx bx-chevron-left';
    }
    
    // =============== INITIALIZE ACTIVE NAV STATE ===============
    function initializeActiveNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            const navItem = link.closest('.nav-item');
            
            // Remove active class from all items first
            navItem.classList.remove('active');
            
            // Add active class to current page
            if (linkHref === currentPage || 
                (currentPage === '' && linkHref === 'index.html') ||
                (currentPage === 'index.html' && linkHref === 'index.html')) {
                navItem.classList.add('active');
            }
        });
    }
    
    // Initialize active navigation state
    initializeActiveNav();
    
    // Toggle sidebar function
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        // Update arrow icon direction
        if (isCollapsed) {
            toggleIcon.className = 'bx bx-chevron-right';
        } else {
            toggleIcon.className = 'bx bx-chevron-left';
        }
        
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('sidebarToggle', {
            detail: { isCollapsed }
        }));
    }
    
    // Toggle button click handler
    toggleBtn.addEventListener('click', toggleSidebar);
    
    // =============== NAVIGATION FUNCTIONALITY ===============
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Set active navigation item
    function setActiveNav(clickedLink) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item's parent
        const navItem = clickedLink.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    }
      // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only prevent default for placeholder links
            if (href === '#') {
                e.preventDefault();
                setActiveNav(this);
                
                // Update page title and content for demo links
                const navText = this.querySelector('.nav-text').textContent;
                updatePageContent(navText);
            } else if (href && href.includes('.html')) {
                // Allow actual navigation to HTML pages
                // Set active state and let the browser navigate
                setActiveNav(this);
                // Don't prevent default - let navigation happen naturally
            }
        });
    });
    
    // =============== PAGE CONTENT UPDATES ===============
    function updatePageContent(pageName) {
        const pageTitle = document.querySelector('.page-title');
        const pageSubtitle = document.querySelector('.page-subtitle');
        
        if (pageTitle) {
            pageTitle.textContent = pageName;
        }
        
        if (pageSubtitle) {
            const subtitles = {
                'Dashboard': "Welcome back! Here's what's happening today.",
                'Inventory': 'Manage your product inventory and stock levels.',
                'Calendar': 'View and manage appointments and schedules.',
                'Rental': 'Process new rentals and manage existing ones.',
                'Rental History': 'View rental history and customer records.',
                'Settings': 'Configure system settings and preferences.'
            };
            
            pageSubtitle.textContent = subtitles[pageName] || 'Manage your business operations.';
        }
        
        // Update dashboard cards based on selected page
        updateDashboardCards(pageName);
    }
    
    // =============== DYNAMIC DASHBOARD CARDS ===============
    function updateDashboardCards(pageName) {
        const cardsContainer = document.querySelector('.dashboard-cards');
        if (!cardsContainer) return;
        
        const cardConfigs = {
            'Dashboard': [
                { icon: 'bxs-package', title: 'Active Rentals', number: '24', subtitle: 'Items currently rented' },
                { icon: 'bxs-calendar', title: 'Appointments', number: '8', subtitle: 'Scheduled for today' },
                { icon: 'bxs-t-shirt', title: 'Total Products', number: '156', subtitle: 'Available in inventory' },
                { icon: 'bx-dollar', title: 'Revenue', number: '₱45,000', subtitle: 'This month' }
            ],
            'Inventory': [
                { icon: 'bxs-t-shirt', title: 'Total Items', number: '156', subtitle: 'In inventory' },
                { icon: 'bx-trending-up', title: 'Available', number: '142', subtitle: 'Ready to rent' },
                { icon: 'bx-trending-down', title: 'Rented Out', number: '14', subtitle: 'Currently with customers' },
                { icon: 'bx-error', title: 'Low Stock', number: '3', subtitle: 'Need restocking' }
            ],
            'Calendar': [
                { icon: 'bxs-calendar', title: 'Today', number: '8', subtitle: 'Appointments scheduled' },
                { icon: 'bx-calendar-week', title: 'This Week', number: '32', subtitle: 'Total appointments' },
                { icon: 'bx-calendar-check', title: 'Completed', number: '156', subtitle: 'This month' },
                { icon: 'bx-calendar-plus', title: 'Pending', number: '12', subtitle: 'Awaiting confirmation' }
            ],
            'Rental': [
                { icon: 'bxs-package', title: 'Active Rentals', number: '24', subtitle: 'Currently out' },
                { icon: 'bx-package', title: 'Due Today', number: '4', subtitle: 'Returns expected' },
                { icon: 'bx-check-circle', title: 'Completed', number: '89', subtitle: 'This month' },
                { icon: 'bx-time', title: 'Overdue', number: '2', subtitle: 'Need follow-up' }
            ],
            'Rental History': [
                { icon: 'bx-history', title: 'Total Rentals', number: '1,245', subtitle: 'All time' },
                { icon: 'bxs-user', title: 'Customers', number: '342', subtitle: 'Unique customers' },
                { icon: 'bx-dollar', title: 'Revenue', number: '₱245,000', subtitle: 'Total earned' },
                { icon: 'bx-star', title: 'Avg Rating', number: '4.8', subtitle: 'Customer satisfaction' }
            ],
            'Settings': [
                { icon: 'bxs-cog', title: 'System Status', number: 'Online', subtitle: 'All systems operational' },
                { icon: 'bx-shield', title: 'Security', number: 'Secure', subtitle: 'Last scan: Today' },
                { icon: 'bx-data', title: 'Storage', number: '67%', subtitle: 'Database usage' },
                { icon: 'bx-time', title: 'Uptime', number: '99.9%', subtitle: 'Last 30 days' }
            ]
        };
        
        const configs = cardConfigs[pageName] || cardConfigs['Dashboard'];
        
        cardsContainer.innerHTML = configs.map(config => `
            <div class="card">
                <div class="card-icon">
                    <i class='bx ${config.icon}'></i>
                </div>
                <div class="card-content">
                    <h3>${config.title}</h3>
                    <p class="card-number">${config.number}</p>
                    <span class="card-subtitle">${config.subtitle}</span>
                </div>
            </div>
        `).join('');
    }
    
    // =============== MOBILE RESPONSIVENESS ===============
    function handleMobileView() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Close sidebar on mobile by default
            sidebar.classList.add('collapsed');
            
            // Add mobile-specific toggle behavior
            toggleBtn.addEventListener('click', function() {
                sidebar.classList.toggle('mobile-open');
            });
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(e) {
                if (isMobile && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            });
        }
    }
    
    // =============== SEARCH FUNCTIONALITY ===============
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = e.target.value.toLowerCase().trim();
            
            searchTimeout = setTimeout(() => {
                if (query) {
                    performSearch(query);
                } else {
                    clearSearchResults();
                }
            }, 300);
        });
    }
    
    function performSearch(query) {
        // Implement search functionality here
        console.log('Searching for:', query);
        
        // Example: highlight matching navigation items
        navLinks.forEach(link => {
            const text = link.querySelector('.nav-text').textContent.toLowerCase();
            const navItem = link.closest('.nav-item');
            
            if (text.includes(query)) {
                navItem.style.opacity = '1';
                navItem.style.transform = 'scale(1.02)';
            } else {
                navItem.style.opacity = '0.5';
                navItem.style.transform = 'scale(1)';
            }
        });
    }
    
    function clearSearchResults() {
        navLinks.forEach(link => {
            const navItem = link.closest('.nav-item');
            navItem.style.opacity = '1';
            navItem.style.transform = 'scale(1)';
        });
    }
    
    // =============== NOTIFICATION FUNCTIONALITY ===============
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            // Toggle notification panel (implement as needed)
            console.log('Notifications clicked');
            
            // Example: animate the badge
            const badge = this.querySelector('.notification-badge');
            if (badge) {
                badge.style.animation = 'pulse 0.3s ease-in-out';
                setTimeout(() => {
                    badge.style.animation = '';
                }, 300);
            }
        });
    }
    
    // =============== USER MENU FUNCTIONALITY ===============
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', function() {
            // Toggle user dropdown menu (implement as needed)
            console.log('User menu clicked');
        });
    }
    
    // =============== LOGOUT FUNCTIONALITY ===============
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Implement logout functionality
            if (confirm('Are you sure you want to logout?')) {
                console.log('Logging out...');
                // Redirect to login page or clear session
                // window.location.href = 'login.html';
            }
        });
    }
    
    // =============== KEYBOARD SHORTCUTS ===============
    document.addEventListener('keydown', function(e) {
        // Ctrl + B to toggle sidebar
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
        
        // Ctrl + / to focus search
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    // =============== WINDOW RESIZE HANDLER ===============
    window.addEventListener('resize', function() {
        handleMobileView();
    });
    
    // =============== INITIALIZATION ===============
    // Initialize mobile view handling
    handleMobileView();
    
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    // Console welcome message
    console.log('🎉 Chandria\'s La Robe Admin Dashboard Loaded Successfully!');
    console.log('💡 Tip: Use Ctrl+B to toggle sidebar, Ctrl+/ to focus search');
});

// =============== UTILITY FUNCTIONS ===============
// Function to animate elements
function animateElement(element, animation) {
    element.style.animation = animation;
    element.addEventListener('animationend', function() {
        element.style.animation = '';
    }, { once: true });
}

// Function to show toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Basic toast styling
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease'
    });
    
    // Type-specific styling
    const colors = {
        info: 'hsl(346, 100%, 74%)',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c'
    };
    
    toast.style.background = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Function to format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// =============== DATE/TIME FUNCTIONALITY ===============
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    const formattedDateTime = now.toLocaleDateString('en-US', options);
    const dateTimeElement = document.getElementById('currentDateTime');
    
    if (dateTimeElement) {
        dateTimeElement.textContent = formattedDateTime;
    }
}

// Initialize date/time
updateDateTime();

// Update every second
setInterval(updateDateTime, 1000);

// Export functions for global use
window.showToast = showToast;
window.formatNumber = formatNumber;
window.animateElement = animateElement;
window.updateDateTime = updateDateTime;
