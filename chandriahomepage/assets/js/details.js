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