import {
    onAuthStateChanged,
    auth,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion
} from "./sdk/chandrias-sdk.js";

$(document).ready(async function () {
  const productId = localStorage.getItem("selectedProductId");
  if (!productId) {
    alert("No product selected.");
    return;
  }

  const docRef = doc(chandriaDB, "products", productId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    // Image previews
    $('.frontImage').attr("src", data.frontImageUrl);
    $('.backImage').attr("src", data.backImageUrl);

    // Text and values
    $('#product-name').text(data.name);
    $('#product-price').text(`₱ ${data.price}`);
    $('#product-description').text(data.description);
    $('#product-code').text(data.code);
    $('#product-color').css("background-color", data.color);

    // Update breadcrumb with actual product info
    $('#breadcrumb-category').text(data.category || 'Gown');
    $('#breadcrumb-product-name').text(data.name || 'Product Name');

    // Sizes
    const sizeList = $('#product-sizes');
    sizeList.empty();
    $.each(data.size, function (size, qty) {
      sizeList.append(`<li><a href="#" class="size-link">${size}</a></li>`);
    });

    // Stock
    const totalStock = Object.values(data.size).reduce((a, b) => a + b, 0);
    $('#product-stock').text(`${totalStock} in stocks`);
  } else {
    alert("Product not found.");
  }

  // NOTYF INITIALIZATION for notifications
  const notyf = new Notyf({
    position: {
      x: "center",
      y: "top"
    }
  });
  // AUTHENTICATION MODAL FUNCTIONS (Matching shop.js implementation)
  function showAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.classList.add('show');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  function hideAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.classList.remove('show');
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

  // Authentication modal event listeners
  $(document).on('click', '#auth-modal-close, #auth-modal-cancel', function() {
    hideAuthModal();
  });

  $(document).on('click', '#auth-modal-login', function() {
    window.location.href = './user_authentication.html';
  });

  // Close modal when clicking outside
  $(document).on('click', '#auth-modal', function(e) {
    if (e.target === this) {
      hideAuthModal();
    }
  });

  // Close modal on escape key
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
      hideAuthModal();
    }
  });

  // Make showAuthModal globally accessible
  window.showAuthModal = showAuthModal;

  // Size selection functionality
  $(document).on('click', '.size-link', function(e) {
    e.preventDefault();
    $('.size-link').removeClass('size-active');
    $(this).addClass('size-active');
  });
  // Add to Cart functionality
  $('#details-add-to-cart').on('click', async function(e) {
    e.preventDefault();
      const user = auth.currentUser;
    if (!user) {
      // Show authentication modal
      if (typeof window.showAuthModal === 'function') {
        window.showAuthModal();
      } else {
        alert("Please log in to add items to cart.");
      }
      return;
    }

    const button = $(this);
    const quantity = parseInt($('#details-quantity').val(), 10) || 1;
    const selectedSize = $('.size-active').text().trim();
    const productId = localStorage.getItem("selectedProductId");

    if (!selectedSize) {
      alert("Please select a size.");
      return;
    }

    if (quantity < 1) {
      alert("Please enter a valid quantity.");
      return;
    }

    // Disable button and show loading state
    button.prop('disabled', true).text('Adding...');

    try {
      const userRef = doc(chandriaDB, "userAccounts", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        alert("User account not found.");
        return;
      }

      const data = userSnap.data();
      const currentCart = data.added_to_cart || [];

      // Check if the same product with the same size is already in the cart
      const index = currentCart.findIndex(
        item => item.productId === productId && item.size === selectedSize
      );

      if (index !== -1) {
        // If found, update the quantity of that item
        currentCart[index].quantity = quantity;
        await updateDoc(userRef, { added_to_cart: currentCart });
        notyf.success("Cart item updated successfully.");
      } else {
        // If not found, add a new item to the cart
        await updateDoc(userRef, {
          added_to_cart: arrayUnion({
            productId,
            size: selectedSize,
            quantity
          })
        });
        notyf.success("Added successfully to cart!");
      }

      // Update cart count
      await updateCartCount();
      
    } catch (error) {
      console.error("Error updating cart: ", error);
      notyf.error("An error occurred. Please try again.");
    } finally {
      // Re-enable button
      button.prop('disabled', false).text('Add to Rent List');
    }
  });

  // Update cart count on auth state change
  onAuthStateChanged(auth, async user => {
    await updateCartCount();
  });

  // Cart count function
  async function updateCartCount() {
    const user = auth.currentUser;

    if (!user) {
      $("#cart-count").text("0");
      return;
    }

    try {
      const userRef = doc(chandriaDB, "userAccounts", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const cartItems = data.added_to_cart || [];
        const totalCount = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
        $("#cart-count").text(totalCount);
      }
    } catch (error) {
      console.error("Error fetching cart count: ", error);
      $("#cart-count").text("0");
    }
  }
});