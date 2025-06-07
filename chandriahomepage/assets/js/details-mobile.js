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
  const decreaseBtn = document.querySelector('.quantity-btn.decrease');
  const increaseBtn = document.querySelector('.quantity-btn.increase');
  
  if (!addToCartBtn) return;
  
  // Create sticky bar
  const stickyBar = document.createElement('div');
  stickyBar.className = 'mobile-sticky-cart';
  
  // Create quantity container
  const quantityContainer = document.createElement('div');
  quantityContainer.className = 'mobile-quantity-container';
  
  // Create decrease button
  const stickyDecreaseBtn = document.createElement('button');
  stickyDecreaseBtn.className = 'mobile-quantity-btn decrease';
  stickyDecreaseBtn.textContent = '−';
  stickyDecreaseBtn.type = 'button';
  
  // Create quantity input
  const stickyQuantity = document.createElement('input');
  stickyQuantity.type = 'number';
  stickyQuantity.className = 'mobile-sticky-quantity';
  stickyQuantity.min = '1';
  stickyQuantity.value = quantityInput ? quantityInput.value : '1';
  stickyQuantity.readOnly = true;
  
  // Create increase button
  const stickyIncreaseBtn = document.createElement('button');
  stickyIncreaseBtn.className = 'mobile-quantity-btn increase';
  stickyIncreaseBtn.textContent = '+';
  stickyIncreaseBtn.type = 'button';
  
  // Create add to booking button
  const stickyButton = document.createElement('button');
  stickyButton.className = 'mobile-sticky-button';
  stickyButton.textContent = 'Add to Booking';
  
  // Add elements to quantity container
  quantityContainer.appendChild(stickyDecreaseBtn);
  quantityContainer.appendChild(stickyQuantity);
  quantityContainer.appendChild(stickyIncreaseBtn);
  
  // Add elements to sticky bar
  stickyBar.appendChild(quantityContainer);
  stickyBar.appendChild(stickyButton);
  
  // Add bar to page
  document.body.appendChild(stickyBar);
  
  // Sync quantity values
  if (quantityInput) {
    quantityInput.addEventListener('change', () => {
      stickyQuantity.value = quantityInput.value;
    });
  }
    // Handle quantity button clicks with stock validation
  stickyDecreaseBtn.addEventListener('click', () => {
    if (decreaseBtn) {
      decreaseBtn.click();
      stickyQuantity.value = quantityInput.value;
    }
  });
  
  stickyIncreaseBtn.addEventListener('click', () => {
    const selectedSize = document.querySelector('.size-active');
    const currentValue = parseInt(stickyQuantity.value) || 1;
    
    if (selectedSize) {
      const maxStock = parseInt(selectedSize.dataset.stock) || 0;
      
      if (currentValue < maxStock) {
        if (increaseBtn) {
          increaseBtn.click();
          stickyQuantity.value = quantityInput.value;
        }
      } else {
        // Show error notification for mobile
        if (typeof notyf !== 'undefined') {
          notyf.error(`Maximum available stock for this size is ${maxStock}`);
        }
      }
    } else {
      // Fallback if no size is selected
      if (increaseBtn) {
        increaseBtn.click();
        stickyQuantity.value = quantityInput.value;
      }
    }
  });
  
  // Handle add to booking button click
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
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      transform: translateY(100%);
      animation: slideUp 0.3s forwards;
      border-top: 1px solid rgba(var(--title-color-rgb), 0.1);
    }
    
    @keyframes slideUp {
      to { transform: translateY(0); }
    }
    
    .mobile-quantity-container {
      display: flex;
      align-items: center;
      gap: 0;
      background: var(--container-color);
      border-radius: 8px;
      border: 2px solid #ff7eb4;
      overflow: hidden;
    }
    
    .mobile-quantity-btn {
      width: 32px;
      height: 40px;
      background: var(--body-color);
      border: none;
      color: var(--title-color);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .mobile-quantity-btn:hover {
      background: #ff7eb4;
      color: white;
    }
    
    .mobile-quantity-btn.decrease {
      border-right: 1px solid rgba(var(--title-color-rgb), 0.1);
    }
    
    .mobile-quantity-btn.increase {
      border-left: 1px solid rgba(var(--title-color-rgb), 0.1);
    }
    
    .mobile-sticky-quantity {
      width: 50px;
      height: 40px;
      border: none;
      background: var(--body-color);
      color: var(--title-color);
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      outline: none;
      -webkit-appearance: textfield;
      -moz-appearance: textfield;
      appearance: textfield;
    }
    
    .mobile-sticky-quantity::-webkit-outer-spin-button,
    .mobile-sticky-quantity::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    .mobile-sticky-button {
      flex: 1;
      height: 44px;
      background: #ff7eb4;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.5px;
    }
    
    .mobile-sticky-button:hover {
      background: #ff4da6;
      transform: translateY(-1px);
    }
    
    .mobile-sticky-button:active {
      transform: translateY(0);
    }
    
    /* Add padding to main content to prevent overlap */
    @media screen and (max-width: 768px) {
      .main {
        padding-bottom: 70px !important;
      }
    }
    
    /* Hide the original details-action on mobile when sticky bar is active */
    @media screen and (max-width: 768px) {
      .details-action {
        display: none !important;
      }
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
