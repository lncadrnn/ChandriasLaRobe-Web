/**
 * Details page mobile enhancements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Only run on mobile devices
  if (window.innerWidth <= 768) {
    initMobileImageGallery();
    initStickyAddToCart();
  }
  
  // Re-initialize on resize
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      initMobileImageGallery();
      initStickyAddToCart();
    } else {
      removeStickyAddToCart();
    }
  });
});

/**
 * Initialize mobile-friendly image gallery with swipe support
 */
function initMobileImageGallery() {
  const mainImg = document.querySelector('.details-img');
  const smallImgs = document.querySelectorAll('.details-small-img');
  
  if (!mainImg || smallImgs.length === 0) return;
  
  // Set active state for the first small image
  smallImgs[0].classList.add('active');
  
  // Handle image switching on tap
  smallImgs.forEach(img => {
    img.addEventListener('click', function() {
      // Update main image
      mainImg.src = this.src;
      
      // Update active state
      smallImgs.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      // Add a little animation
      mainImg.style.opacity = '0.8';
      setTimeout(() => {
        mainImg.style.opacity = '1';
      }, 100);
    });
  });
  
  // Add swipe gestures for main image
  let touchstartX = 0;
  let touchendX = 0;
  
  mainImg.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
  });
  
  mainImg.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
  });
  
  function handleGesture() {
    const threshold = 50;
    
    if (touchendX < touchstartX - threshold) {
      // Swipe left - next image
      let activeIndex = -1;
      smallImgs.forEach((img, index) => {
        if (img.classList.contains('active')) activeIndex = index;
      });
      
      if (activeIndex < smallImgs.length - 1) {
        smallImgs[activeIndex + 1].click();
      }
    }
    
    if (touchendX > touchstartX + threshold) {
      // Swipe right - previous image
      let activeIndex = -1;
      smallImgs.forEach((img, index) => {
        if (img.classList.contains('active')) activeIndex = index;
      });
      
      if (activeIndex > 0) {
        smallImgs[activeIndex - 1].click();
      }
    }
  }
}

/**
 * Create a sticky add to cart button for better UX on mobile
 */
function initStickyAddToCart() {
  // Check if sticky bar already exists
  if (document.querySelector('.mobile-sticky-cart')) return;
  
  const addToCartBtn = document.querySelector('#details-add-to-cart');
  const quantityInput = document.querySelector('#details-quantity');
  
  if (!addToCartBtn) return;
  
  // Create sticky bar
  const stickyBar = document.createElement('div');
  stickyBar.className = 'mobile-sticky-cart';
  
  // Create content
  const stickyQuantity = document.createElement('input');
  stickyQuantity.type = 'number';
  stickyQuantity.className = 'mobile-sticky-quantity';
  stickyQuantity.min = '1';
  stickyQuantity.value = quantityInput ? quantityInput.value : '1';
  
  const stickyButton = document.createElement('button');
  stickyButton.className = 'mobile-sticky-button';
  stickyButton.textContent = addToCartBtn.textContent;
  
  // Add elements to bar
  stickyBar.appendChild(stickyQuantity);
  stickyBar.appendChild(stickyButton);
  
  // Add bar to page
  document.body.appendChild(stickyBar);
  
  // Sync quantity values
  if (quantityInput) {
    quantityInput.addEventListener('change', () => {
      stickyQuantity.value = quantityInput.value;
    });
    
    stickyQuantity.addEventListener('change', () => {
      quantityInput.value = stickyQuantity.value;
    });
  }
  
  // Handle button click
  stickyButton.addEventListener('click', () => {
    addToCartBtn.click();
  });
  
  // Add sticky bar styles
  const style = document.createElement('style');
  style.innerHTML = `
    .mobile-sticky-cart {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--body-color);
      padding: 12px 16px;
      display: flex;
      gap: 10px;
      box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.1);
      z-index: 100;
      transform: translateY(100%);
      animation: slideUp 0.3s forwards;
    }
    
    @keyframes slideUp {
      to { transform: translateY(0); }
    }
    
    .mobile-sticky-quantity {
      width: 70px;
      height: 48px;
      padding: 0 0.5rem;
      border: 1px solid rgba(var(--title-color-rgb), 0.2);
      border-radius: 8px;
      font-weight: 500;
      text-align: center;
    }
    
    .mobile-sticky-button {
      flex: 1;
      height: 48px;
      background-color: var(--first-color);
      color: var(--body-color);
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      cursor: pointer;
    }
    
    /* Add some padding to the bottom of the page so content isn't hidden behind the sticky bar */
    .main {
      padding-bottom: 80px;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Remove sticky add to cart when not on mobile
 */
function removeStickyAddToCart() {
  const stickyBar = document.querySelector('.mobile-sticky-cart');
  if (stickyBar) {
    stickyBar.remove();
  }
}
