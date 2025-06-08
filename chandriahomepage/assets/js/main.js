/*=============== STICKY HEADER & MOBILE MENU ===============*/
// Handle sticky header behavior on scroll
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Mobile hamburger menu functionality
// Only initialize if nav-bar.js hasn't already handled it
document.addEventListener('DOMContentLoaded', function() {
  if (!window.mobileNavInitialized) {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNavMenu = document.querySelector('.mobile-nav-menu');
    const body = document.body;

    if (hamburgerMenu && mobileNavMenu) {
      hamburgerMenu.addEventListener('click', () => {
        hamburgerMenu.classList.toggle('active');
        mobileNavMenu.classList.toggle('show');
        body.classList.toggle('nav-open');
      });

      // Close menu when clicking mobile nav links
      document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
          hamburgerMenu.classList.remove('active');
          mobileNavMenu.classList.remove('show');
          body.classList.remove('nav-open');
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!hamburgerMenu.contains(e.target) && !mobileNavMenu.contains(e.target)) {
          hamburgerMenu.classList.remove('active');
          mobileNavMenu.classList.remove('show');
          body.classList.remove('nav-open');
        }
      });
    }
  }
});

/*=============== SMOOTH SCROLLING FOR NAVIGATION ===============*/
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerHeight = document.querySelector('.header').offsetHeight;
      const targetPosition = target.offsetTop - headerHeight - 20;
      
      // Update active navigation state
      updateActiveNavigation(this.getAttribute('href'));
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

/*=============== NAVIGATION ACTIVE STATE MANAGEMENT ===============*/
function updateActiveNavigation(targetHash) {
  // Remove active-link class from all navigation links
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active-link');
  });
  
  // Add active-link class to the clicked navigation link
  document.querySelectorAll(`a[href="${targetHash}"]`).forEach(link => {
    if (link.classList.contains('nav-link') || link.classList.contains('mobile-nav-link')) {
      link.classList.add('active-link');
    }
  });
}

/*=============== SCROLL SPY FOR NAVIGATION ===============*/
// Update navigation based on scroll position
function handleScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"], .mobile-nav-link[href^="#"]');
  
  let current = '';
  const scrollPosition = window.scrollY + 100; // Offset for header
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      current = '#' + section.getAttribute('id');
    }
  });
  
  // Update active state based on current section
  if (current) {
    navLinks.forEach(link => {
      link.classList.remove('active-link');
      if (link.getAttribute('href') === current) {
        link.classList.add('active-link');
      }
    });
  }
}

// Initialize scroll spy
window.addEventListener('scroll', handleScrollSpy);
window.addEventListener('load', handleScrollSpy);

/*=============== IMAGE GALLERY ===============*/
function imgGallery(){
  const mainImg = document.querySelector('.details-img'),
  smallImg = document.querySelectorAll('.details-small-img');

  smallImg.forEach((img) => {
    img.addEventListener('click', function(){
      mainImg.src = this.src;
    })
  })
}
imgGallery();

/*=============== SWIPER CATEGORIES ===============*/
var swiperCategories = new Swiper(".categories-container", {
    spaceBetween: 24,
    loop: true,
    loopedSlides: 18, // Total number of slides (6 categories x 3 sets)
    centeredSlides: true, // Center slides to show partial on both sides
    slideToClickedSlide: true, // Allow clicking on partial slides to navigate
    grabCursor: true, // Show grab cursor for better UX
    effect: 'slide', // Explicitly set slide effect (no fade)
    speed: 600, // Smooth transition speed
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    navigation: {
      nextEl: ".custom-next-btn",
      prevEl: ".custom-prev-btn",
    },

    breakpoints: {
        320: {
          slidesPerView: 1.2, // Show partial slides on mobile
          spaceBetween: 15,
          centeredSlides: true,
        },
        480: {
          slidesPerView: 1.5, // Show more partial slides on larger mobile
          spaceBetween: 18,
          centeredSlides: true,
        },
        640: {
          slidesPerView: 2.3, // Show partial slides on both sides
          spaceBetween: 20,
          centeredSlides: true,
        },
        768: {
          slidesPerView: 3.3, // Show partial slides on both sides
          spaceBetween: 30,
          centeredSlides: true,
        },
        1024: {
          slidesPerView: 4.3, // Show partial slides on both sides
          spaceBetween: 35,
          centeredSlides: true,
        },
        1400: {
          slidesPerView: 5.3, // Show partial slides on both sides
          spaceBetween: 24,
          centeredSlides: true,
        },
      }
  });

/*=============== SWIPER PRODUCTS ===============*/

var swiperProducts = new Swiper(".fresh-container", {
  spaceBetween: 24,
  loop:true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },

  breakpoints: {
      640: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 4,
        spaceBetween: 40,
      },
      1400: {
        slidesPerView: 4,
        spaceBetween: 24,
      },
    }
});

/*=============== PRODUCTS TABS ===============*/
const tabs = document.querySelectorAll('[data-tab]'),
  tabContents = document.querySelectorAll('.product-tab-content');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Remove active class from all tabs and contents
    tabs.forEach((t) => t.classList.remove('active-tab'));
    tabContents.forEach((content) => content.classList.remove('active-tab'));
    
    // Add active class to clicked tab
    tab.classList.add('active-tab');
    
    // Show corresponding content
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
      targetContent.classList.add('active-tab');
    }
  });
});

/*=============== INTERSECTION OBSERVER FOR ANIMATIONS ===============*/
// Intersection Observer for scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, observerOptions);

// Observe elements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const elementsToObserve = document.querySelectorAll(
    '.section-header, .hero-content, .category-card, .policy-item, .product-item'
  );
  
  elementsToObserve.forEach(el => {
    observer.observe(el);
  });
});

/*=============== PERFORMANCE MONITORING ===============*/
// Log performance metrics for debugging
if (window.performance && window.performance.timing) {
  window.addEventListener('load', () => {
    const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
    console.log(`Page load time: ${loadTime}ms`);
  });
}

/*=============== WELCOME MODAL ===============*/
// Welcome Modal functionality
document.addEventListener('DOMContentLoaded', () => {
  const welcomeModal = document.getElementById('welcomeModal');
  const closeWelcomeModal = document.getElementById('closeWelcomeModal');
  
  // Only show modal on homepage (index.html)
  const isHomepage = window.location.pathname === '/' || 
                     window.location.pathname.endsWith('/index.html') || 
                     window.location.pathname === '/index.html' ||
                     window.location.pathname.includes('index.html');
  
  // Check if user has already seen the welcome modal
  const hasSeenWelcomeModal = localStorage.getItem('hasSeenWelcomeModal') === 'true';
  
  // Function to prevent background scrolling
  function preventBackgroundScroll(prevent = true) {
    if (prevent) {
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px'; // Compensate for scrollbar width
    } else {
      // Restore background scrolling
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }
  
  // Function to close modal
  function closeModal() {
    if (welcomeModal) {
      welcomeModal.classList.add('hidden');
      preventBackgroundScroll(false); // Restore scrolling
      // Mark that user has seen the welcome modal
      localStorage.setItem('hasSeenWelcomeModal', 'true');
    }
  }
  
  if (welcomeModal && isHomepage && !hasSeenWelcomeModal) {
    // Show modal after a brief delay for better UX on first visit only
    setTimeout(() => {
      welcomeModal.classList.remove('hidden');
      preventBackgroundScroll(true); // Prevent background scrolling
    }, 1000);
  } else if (welcomeModal) {
    // Ensure modal is hidden on other pages or if already seen
    welcomeModal.classList.add('hidden');
  }
  
  // Close modal functionality
  if (closeWelcomeModal && welcomeModal) {
    closeWelcomeModal.addEventListener('click', () => {
      closeModal();
    });
  }
  
  // Close modal when clicking outside
  if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) {
        closeModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && welcomeModal && !welcomeModal.classList.contains('hidden')) {
      closeModal();
    }
  });
  
  // Modal action buttons functionality - close modal when any action button is clicked
  const modalButtons = document.querySelectorAll('.modal-btn');
  modalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
    });
  });
});