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

/*=============== SMOOTH SCROLLING FOR NAVIGATION ===============*/
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerHeight = document.querySelector('.header').offsetHeight;
      const targetPosition = target.offsetTop - headerHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

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
    loopedSlides: 6, // Total number of slides
    centeredSlides: true, // Center slides to show partial on both sides
    slideToClickedSlide: true, // Allow clicking on partial slides to navigate
    grabCursor: true, // Show grab cursor for better UX
    effect: 'slide', // Explicitly set slide effect (no fade)
    speed: 400, // Smooth transition speed
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
  
  // Show modal on page load (can be controlled based on user preferences)
  const hasSeenModal = localStorage.getItem('hasSeenWelcomeModal');
  
  if (!hasSeenModal) {
    // Show modal after a brief delay for better UX
    setTimeout(() => {
      if (welcomeModal) {
        welcomeModal.classList.remove('hidden');
      }
    }, 1000);
  } else {
    // Hide modal if user has seen it before
    if (welcomeModal) {
      welcomeModal.classList.add('hidden');
    }
  }
  
  // Close modal functionality
  if (closeWelcomeModal && welcomeModal) {
    closeWelcomeModal.addEventListener('click', () => {
      welcomeModal.classList.add('hidden');
      localStorage.setItem('hasSeenWelcomeModal', 'true');
    });
  }
  
  // Close modal when clicking outside
  if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) {
        welcomeModal.classList.add('hidden');
        localStorage.setItem('hasSeenWelcomeModal', 'true');
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && welcomeModal && !welcomeModal.classList.contains('hidden')) {
      welcomeModal.classList.add('hidden');
      localStorage.setItem('hasSeenWelcomeModal', 'true');
    }
  });
  
  // Modal action buttons functionality
  const modalButtons = document.querySelectorAll('.modal-btn');
  modalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('hasSeenWelcomeModal', 'true');
    });
  });
});