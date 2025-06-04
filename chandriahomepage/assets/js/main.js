/*=============== SHOW MENU ===============*/

/*===== Menu Show =====*/
/* Validate if constant exists */

/*===== Hide Show =====*/
/* Validate if constant exists */

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
const tabs = document.querySelectorAll('[data-target]'),
  tabContents = document.querySelectorAll('[content]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = document.querySelector(tab.dataset.target);
       tabContents.forEach((tabContent) => {
        tabContent.classList.remove('active-tab');
     });

     target.classList.add('active-tab');

      tabs.forEach((tab) => {
       tab.classList.remove('active-tab');
   });
      tab.classList.add('active-tab');

    });
  });